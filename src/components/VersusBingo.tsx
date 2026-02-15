import React, { useState, useMemo, useRef } from 'react';
import { DndContext, DragEndEvent, DragOverlay, useDroppable, useDraggable } from '@dnd-kit/core';
import { Card } from './Card';
import data from '../data/prime_ministers.json';
import confetti from 'canvas-confetti';

// --- 型定義 ---
type PM = {
  id: number;
  name: string;
  start_date: string;
  end_date: string;
  image: string;
  totalDays: number;
  point: number;
  isGet?: boolean;
};

type BingoResult = {
  lineCount: number;
  baseScore: number;
  bonusPoints: number;
  multiplier: number;
  total: number;
};

// --- ポイント計算ロジック ---
const calculatePoint = (days: number) => {
  if (days < 60) return 1000;
  if (days < 365) return 500;
  if (days < 1095) return 100;
  if (days < 1800) return 50;
  return 30;
};

// --- サブコンポーネント ---
const Slot: React.FC<{ id: string; card: PM | null; isHit: boolean; player: 'A' | 'B' }> = ({ id, card, isHit, player }) => {
  const { isOver, setNodeRef } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      style={{
        width: '100%', 
        aspectRatio: '1/1', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: isHit ? 'rgba(255, 235, 59, 0.4)' : (isOver ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.05)'),
        border: isHit ? '3px solid #fbc02d' : (isOver ? '2px solid #4caf50' : '1px dashed #666'),
        borderRadius: '8px', 
        position: 'relative', 
        transition: '0.3s',
        minHeight: '50px',
      }}
    >
      {card && (
        <DraggableCard
            dragId={`in-slot-${id}-${card.id}`} 
            card={card} 
            isInSlot={true} 
            player={player} 
        />
        )}
      {isHit && 
        <div style={{ 
            backgroundColor: 'rgba(255, 215, 0, 0.9)',
            color: '#000',
            fontWeight: 'bold',
            padding: '2px 6px',
            borderRadius: '4px',
            fontSize: '0.7rem',
            boxShadow: '0 0 4px rgba(0,0,0,0.3)'
        }}>GET</div>
        }
    </div>
  );
};

const DraggableCard: React.FC<{ 
    card: PM; 
    isInSlot?: boolean; 
    player?: 'A' | 'B',
    dragId?: string; 
}> = ({ card, isInSlot, player, dragId}) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: dragId || (isInSlot ? `in-slot-${player}-${card.id}` : `pool-${card.id}`),
    data: { card },
  });

  return (
    <div ref={setNodeRef} {...listeners} {...attributes} style={{
      transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
      cursor: 'grab', width: '100%', height: '100%', zIndex: isDragging ? 999 : 1, opacity: isDragging ? 0.3 : 1, touchAction: 'none',
    }}>
      <Card {...card} />
    </div>
  );
};

const PlayerBoard = ({ idPrefix, slots, title, isActive, color, hitNames, player }: any) => (
  <div style={{ 
    flex: 1, background: 'rgba(255,255,255,0.05)', borderRadius: '15px', padding: '15px',
    border: isActive ? `3px solid ${color}` : '3px solid transparent', display: 'flex', flexDirection: 'column'
  }}>
    <h3 style={{ textAlign: 'center', color: isActive ? color : '#888', marginTop: 0 }}>{title}</h3>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px' }}>
      {slots.map((card: any, i: number) => (
        <Slot key={i} id={`${idPrefix}-${i}`} card={card} isHit={card && hitNames.includes(card.name)} player={player} />
      ))}
    </div>
  </div>
);

// --- メインコンポーネント ---
export const VersusBingo: React.FC = () => {
  const [turn, setTurn] = useState<'A' | 'B'>('A');
  // 状態管理をAとBで分ける
  const [slotsA, setSlotsA] = useState<(PM | null)[]>(Array(25).fill(null));
  const [slotsB, setSlotsB] = useState<(PM | null)[]>(Array(25).fill(null));
  const [isReadyA, setIsReadyA] = useState(false);
  const [isReadyB, setIsReadyB] = useState(false);
  // 現在どちらのプレイヤーの編集/ターンか (例: 'A' or 'B')
  const [activePlayer, setActivePlayer] = useState<'A' | 'B'>('A');

  const [activeCard, setActiveCard] = useState<PM | null>(null);
  const [isBattleMode, setIsBattleMode] = useState(false);
  const [currentDate, setCurrentDate] = useState<string>("1885-12-22");
  const [isSpinning, setIsSpinning] = useState(false);
  const [hitNames, setHitNames] = useState<string[]>([]);
  const [firstBingoPlayer, setFirstBingoPlayer] = useState<'A' | 'B' | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // 日付範囲チェック
  const isDateInRange = (dateStr: string, start: string, end: string) => {
    const d = new Date(dateStr).getTime();
    const s = new Date(start).getTime();
    const e = (end === '現職' || !end) ? new Date().getTime() : new Date(end).getTime();
    return d >= s && d <= e;
  };

  // ビンゴ判定
  const getBingoLines = (slots: (PM | null)[], currentHitNames: string[]) => {
    const lines = [
      [0,1,2,3,4],[5,6,7,8,9],[10,11,12,13,14],[15,16,17,18,19],[20,21,22,23,24],
      [0,5,10,15,20],[1,6,11,16,21],[2,7,12,17,22],[3,8,13,18,23],[4,9,14,19,24],
      [0,6,12,18,24],[4,8,12,16,20]
    ];
    return lines.filter(line => line.every(idx => slots[idx] && currentHitNames.includes(slots[idx]!.name)));
  };

  // スコア計算
  const calculateResult = (slots: (PM | null)[], player: 'A' | 'B'): BingoResult => {
    const lines = getBingoLines(slots, hitNames);
    const lineCount = lines.length;
    if (lineCount === 0) return { lineCount: 0, baseScore: 0, bonusPoints: 0, multiplier: 1, total: 0 };

    const winningIndices = new Set<number>();
    lines.forEach(line => line.forEach(idx => winningIndices.add(idx)));
    let baseScore = 0;
    winningIndices.forEach(idx => { baseScore += slots[idx]?.point || 0; });

    const multiplier = lineCount >= 3 ? 3 : lineCount === 2 ? 2 : 1;
    const bonusPoints = (firstBingoPlayer === player) ? 1500 : 0;

    return { lineCount, baseScore, bonusPoints, multiplier, total: (baseScore * multiplier) + bonusPoints };
  };

  const resultA = useMemo(() => calculateResult(slotsA, 'A'), [slotsA, hitNames, firstBingoPlayer]);
  const resultB = useMemo(() => calculateResult(slotsB, 'B'), [slotsB, hitNames, firstBingoPlayer]);

  // startRoulette 関数
  const startRoulette = () => {
    setIsSpinning(true);
    timerRef.current = setInterval(() => {
      // 1885年から現在までのランダムな日付を生成
      const start = new Date(1885, 11, 22).getTime();
      const end = new Date().getTime();
      const randomDate = new Date(start + Math.random() * (end - start));
      setCurrentDate(randomDate.toISOString().slice(0, 10));
    }, 50);
  };


  // データ準備
  const allPMs = useMemo(() => {
    const imageBasePath = "/images/prime_ministers/";
    const pmMap = new Map<string, any>();
    data.forEach((pm) => {
      const start = new Date(pm.start_date).getTime();
      const end = (pm.end_date === '現職' || !pm.end_date) ? new Date().getTime() : new Date(pm.end_date).getTime();
      const days = Math.floor((end - start) / (1000 * 60 * 60 * 24));
      
      if (!pmMap.has(pm.name)) {
        pmMap.set(pm.name, { ...pm, totalDays: days, image: imageBasePath + pm.image_url, point: calculatePoint(days) });
      }
    });
    return Array.from(pmMap.values()).map((pm, i) => ({ ...pm, id: i }));
  }, []);

  const availablePMs = allPMs.filter(pm => !slotsA.some(s => s?.name === pm.name) && !slotsB.some(s => s?.name === pm.name));
  const isDraftFinished = slotsA.every(s => s !== null) && slotsB.every(s => s !== null);

  // スロット停止時の処理
  const stopHistorySpin = () => {
    if (!isSpinning) return;
    setIsSpinning(false);
    if (timerRef.current) clearInterval(timerRef.current);

    const hitInThisTurn = data.filter(pm => isDateInRange(currentDate, pm.start_date, pm.end_date)).map(pm => pm.name);
    
    if (hitInThisTurn.length > 0) {
      const newHitNames = Array.from(new Set([...hitNames, ...hitInThisTurn]));
      setHitNames(newHitNames);

      // 先着ボーナス判定
      if (!firstBingoPlayer) {
        const isABingo = getBingoLines(slotsA, newHitNames).length > 0;
        const isBBingo = getBingoLines(slotsB, newHitNames).length > 0;
        if (isABingo && isBBingo) setFirstBingoPlayer(null); // 同時（稀）
        else if (isABingo) setFirstBingoPlayer('A');
        else if (isBBingo) setFirstBingoPlayer('B');
      }
    }
  };
  

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveCard(null);
    const { active, over } = event;
    if (!over) return;

    const draggedCard = active.data.current?.card as PM;
    const overId = String(over.id);

    if (overId.startsWith('slot')) {
        const isOverA = overId.startsWith('slotA');
        const isOverB = overId.startsWith('slotB');
        const targetIdx = parseInt(overId.split('-')[1], 10);

        // 自分のターンで、かつ自分のボードに対してのみ操作可能
        if ((activePlayer === 'A' && isOverA) || (activePlayer === 'B' && isOverB)) {
            const setTargetSlots = activePlayer === 'A' ? setSlotsA : setSlotsB;

            setTargetSlots((prev) => {
                const next = [...prev];
                const sourceIdx = prev.findIndex((c) => c?.id === draggedCard.id);
     
                if (sourceIdx !== -1) {
                // 【盤面内移動】入れ替えロジック
                const temp = next[targetIdx];
                next[targetIdx] = draggedCard;
                next[sourceIdx] = temp; // 空ならnullが入る
                } else {
                if (next[targetIdx] === null) {
                    next[targetIdx] = draggedCard
                }   
            }
            return next;
            });
        }
    }
};

return (
  <div style={{ 
      height: '100vh', 
      width: '100vw', 
      display: 'flex', 
      flexDirection: 'column', 
      backgroundColor: '#2c3e50', 
      color: 'white', 
      overflow: 'hidden' 
  }}>

    {/* ヘッダー: スコアとターンの視覚化 */}
    <header style={{ 
        height: '60px', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        background: '#1a252f', 
        gap: '50px', 
        flexShrink: 0 
    }}>
        <div style={{ 
            color: activePlayer === 'A' ? '#4CAF50' : '#888', 
            fontWeight: activePlayer === 'A' ? 'bold' : 'normal', 
            borderBottom: activePlayer === 'A' ? '2px solid #4CAF50' : 'none' 
        }}>PLAYER A: {resultA.total}pt</div>
        <div style={{ 
            background: '#e74c3c', 
            padding: '4px 15px', 
            borderRadius: '20px', 
            fontWeight: 'bold' 
        }}>VS</div>
        <div style={{ 
            color: activePlayer === 'B' ? '#2196F3' : '#888', 
            fontWeight: activePlayer === 'B' ? 'bold' : 'normal', 
            borderBottom: activePlayer === 'B' ? '2px solid #2196F3' : 'none' 
        }}>PLAYER B: {resultB.total}pt</div>
    </header>

    <DndContext onDragStart={(e) => setActiveCard(e.active.data.current?.card)} onDragEnd={handleDragEnd}>
        <div style={{ 
            flex: 1, 
            display: 'grid', 
            gridTemplateColumns: '1fr 320px 1fr', 
            gap: '15px', 
            padding: '15px', 
            minHeight: 0 
        }}>
        
          {/* 左盤面: Player A */}
          <PlayerBoard 
            idPrefix="slotA" 
            slots={slotsA} 
            title="Player A" 
            isActive={activePlayer === 'A' && !isBattleMode} 
            color="#4CAF50" 
            hitNames={hitNames} 
            player="A" 
          />
          
          {/* 中央カラム: 操作パネル */}
          <div style={{ 
              background: '#fff', 
              color: '#333', 
              borderRadius: '15px', 
              display: 'flex', 
              flexDirection: 'column', 
              overflow: 'hidden', 
              boxShadow: '0 4px 15px rgba(0,0,0,0.3)' 
          }}>
            {isBattleMode ? (
              /* --- 対戦中モード --- */
              <div style={{ padding: '20px', textAlign: 'center' }}>
                  <h3 style={{ margin: '0 0 10px 0' }}>日付スロット</h3>
                  <div style={{ 
                      fontSize: '1.8rem', 
                      background: '#eee', 
                      padding: '15px', 
                      borderRadius: '10px', 
                      marginBottom: '15px', 
                      fontWeight: 'bold', 
                      fontFamily: 'monospace' 
                  }}>
                  {currentDate}</div>
                  <button 
                      onClick={isSpinning ? stopHistorySpin : startRoulette} 
                      style={{ 
                          width: '100%', 
                          padding: '15px', 
                          background: isSpinning ? '#f44336' : '#4CAF50', 
                          color: 'white', border: 'none', 
                          borderRadius: '8px', 
                          fontWeight: 'bold', 
                          cursor: 'pointer', 
                          fontSize: '1.1rem' 
                      }}>{isSpinning ? 'STOP' : 'SPIN'}
                  </button>
                  {firstBingoPlayer && 
                      <div style={{ 
                          marginTop: '20px', 
                          color: '#e67e22', 
                          fontWeight: 'bold', 
                          animation: 'bounce 1s infinite' 
                      }}>BINGOボーナス: Player {firstBingoPlayer}</div>}        
              </div>
            ) : (
              /* --- 準備中モード --- */
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                  <div style={{ 
                      padding: '15px', 
                      borderBottom: '1px solid #ddd', 
                      textAlign: 'center', 
                      background: activePlayer === 'A' ? '#e8f5e9' : '#e3f2fd'
                  }}>
                      <h3 style={{ margin: '0', color: activePlayer === 'A' ? '#4CAF50' : '#2196F3' }}>
                        PLAYER {activePlayer} のターン
                      </h3>
                      <button 
                        onClick={() => setActivePlayer(activePlayer === 'A' ? 'B' : 'A')}
                        style={{ 
                          width: '100%', padding: '10px', marginTop: '10px',
                          background: activePlayer === 'A' ? '#4CAF50' : '#2196F3', 
                          color: 'white', border: 'none', borderRadius: '6px', 
                          cursor: 'pointer', fontWeight: 'bold' 
                        }}
                      >
                        ターンを終了して交代
                      </button>
                  </div>

                  <div style={{ flex: 1, overflowY: 'auto', padding: '10px' }}>
                      <h4 style={{ fontSize: '0.8rem', textAlign: 'center', margin: '0 0 10px 0' }}>
                        残りのカード ({availablePMs.length})
                      </h4>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        {availablePMs.map(pm => (
                            <DraggableCard key={pm.id} card={pm} />
                        ))}
                      </div>
                  </div>
                  
                  {(slotsA.some(s => s) || slotsB.some(s => s)) && (
                    <button 
                      onClick={() => setIsBattleMode(true)} 
                      style={{ 
                        margin: '15px', padding: '15px', background: '#e74c3c', color: '#fff', 
                        border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' 
                      }}
                    >
                      盤面確定！バトル開始
                    </button>
                  )}
              </div>
            )}
          </div>

          {/* 右盤面: Player B */}
          <PlayerBoard 
            idPrefix="slotB" 
            slots={slotsB} 
            title="Player B" 
            isActive={activePlayer === 'B' && !isBattleMode} 
            color="#2196F3" 
            hitNames={hitNames} 
            player="B" 
          />
        </div>

        {/* ドラッグ中の見た目 */}
        <DragOverlay>
          {activeCard && (
            <div style={{ width: '100px', opacity: 0.9, cursor: 'grabbing' }}>
              <Card {...activeCard} />
            </div>
          )}
        </DragOverlay>
    </DndContext>
  </div>
);
};