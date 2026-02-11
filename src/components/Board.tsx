import React, { useState, useMemo } from 'react';
import { DndContext, DragEndEvent, DragOverlay, useDroppable } from '@dnd-kit/core';
import { useDraggable } from '@dnd-kit/core';
import { Card } from './Card';
import data from '../data/prime_ministers.json';

const imageBasePath = "/images/prime_ministers/";

// --- 型定義 ---
type Term = { start: string; end: string };
type PM = {
  id: number;
  name: string;
  start_date: string;
  end_date: string;
  terms?: Term[];
  image_url: string;
  image: string;
  isGet?: boolean;
};

type HistoryItem = {
  date: string;
  names: string[];
};

// --- サブコンポーネント: Slot ---
const Slot: React.FC<{ id: string; card: PM | null }> = ({ id, card }) => {
  const { isOver, setNodeRef } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      style={{
        width: '100%',
        height: '100%',
        minHeight: 0,
        minWidth: 0,
        border: isOver ? '2px solid #4caf50' : '1px dashed #ccc',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f9f9f9',
        position: 'relative',
        borderRadius: '8px',
        transition: 'filter 0.5s ease',
        overflow: 'hidden',
        padding: '2px',
        boxSizing: 'border-box',
        filter: (card && card.isGet) ? 'brightness(0.7) sepia(0.5) hue-rotate(-50deg)' : 'none',
      }}
    >
      {card && (
        <>
        {/* Cardをコンテナいっぱいに広げる */}
          <div style={{ width: '100%', height: '100%' }}>
          <Card {...card} />
          </div>
          {card.isGet && (
            <div style={{
              position: 'absolute', top: 4, right: 4, backgroundColor: 'rgba(255, 215, 0, 0.9)',
              color: '#000', fontWeight: 'bold', padding: '2px 6px', borderRadius: '4px',
              fontSize: '0.7rem', zIndex: 10, boxShadow: '0 0 4px rgba(0,0,0,0.3)'
            }}>GET</div>
          )}
        </>
      )}
    </div>
  );
};

// --- サブコンポーネント: DraggableCard ---
const DraggableCard: React.FC<{ card: PM }> = ({ card }) => {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: `card-${card.id}`,
    data: { card },
  });
  return (
    <div
      ref={setNodeRef} {...listeners} {...attributes}
      style={{
        transform: transform ? `translate(${transform.x}px, ${transform.y}px)` : undefined,
        cursor: 'grab', 
        margin: '2px', 
        border: '1px solid #ccc', 
        borderRadius: '8px',
        background: '#fff', 
        boxShadow: '0 2px 5px rgba(0,0,0,0.1)', 
        userSelect: 'none',
        width: 'calc(100% - 4px)',
        height: '110px', // 左カラムでのカードの高さを見やすく固定
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box',
      }}
    >
      <Card {...card} />
    </div>
  );
};

// --- メインコンポーネント: Board ---
export const Board: React.FC<{ isStarted: boolean; setIsStarted: (v: boolean) => void }> = ({ isStarted, setIsStarted }) => {
  const [slots, setSlots] = useState<(PM | null)[]>(Array(25).fill(null));
  const [currentDate, setCurrentDate] = useState<string | null>(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [activeCard, setActiveCard] = useState<PM | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]); // 履歴用State

  const uniquePrimeMinisters = useMemo(() => {
    const map = new Map<string, any>();
    data.forEach((pm) => { if (!map.has(pm.name)) map.set(pm.name, pm); });
    return Array.from(map.values()).map((pm, i) => ({
      ...pm,
      id: i,
      image: imageBasePath + pm.image_url,
    }));
  }, []);

  const getRandomDate = () => {
    const start = new Date('1885-12-22').getTime();
    const end = new Date().getTime();
    const d = new Date(start + Math.random() * (end - start));
    return d.toISOString().slice(0, 10);
  };

  const isDateInRange = (dateStr: string, start: string, end: string) => {
    const d = new Date(dateStr);
    const s = new Date(start);
    const e = (end === '現職' || !end) ? new Date() : new Date(end);
    
    // 時刻を 00:00:00 に揃えて日付のみで比較
    d.setHours(0,0,0,0);
    s.setHours(0,0,0,0);
    e.setHours(0,0,0,0);
    
    return d >= s && d <= e;
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveCard(null);
    if (isStarted) return;
    const { active, over } = event;
    if (!over || !String(over.id).startsWith('slot-')) return;
    const slotIndex = parseInt(String(over.id).split('-')[1], 10);
    const draggedCard = active.data.current?.card;
    if (!draggedCard || slots.some((c, idx) => c?.id === draggedCard.id && idx !== slotIndex)) return;

    setSlots(prev => {
      const next = [...prev];
      const existingIdx = prev.findIndex(c => c?.id === draggedCard.id);
      if (existingIdx >= 0) next[existingIdx] = next[slotIndex];
      next[slotIndex] = draggedCard;
      return next;
    });
  };

  const randomPlacement = () => {
    if (isStarted) return;
    setSlots([...uniquePrimeMinisters].sort(() => Math.random() - 0.5).slice(0, 25));
  };

  const checkBingo = (currentSlots: (PM | null)[]) => {
    const lines = [
      [0,1,2,3,4],[5,6,7,8,9],[10,11,12,13,14],[15,16,17,18,19],[20,21,22,23,24],
      [0,5,10,15,20],[1,6,11,16,21],[2,7,12,17,22],[3,8,13,18,23],[4,9,14,19,24],
      [0,6,12,18,24],[4,8,12,16,20]
    ];
    return lines.some(line => line.every(idx => currentSlots[idx]?.isGet));
  };

  const startRoulette = () => {
    if (isSpinning) return;
    setIsSpinning(true);
    let ticks = 0;
    const spinInterval = setInterval(() => {
      const tempDate = getRandomDate();
      setCurrentDate(tempDate);
      
      if (++ticks > 30) {
        clearInterval(spinInterval);
        setIsSpinning(false);

        const finalDate = tempDate;  //確定した日付
        setCurrentDate(finalDate);
        
        // 1.該当する総理の名前を特定（履歴用）
        const hitNames = Array.from(new Set(
          data.filter((pm: any) => isDateInRange(finalDate, pm.start_date, pm.end_date))
              .map((pm: any) => pm.name)
        ));

        // 2.履歴更新(SetSlotsの外で実行して２重登録を防止)
        setHistory(prev => [{ date: finalDate, names: hitNames.length ? hitNames : ["該当なし"] }, ...prev]);

        // 3.盤面のスロット更新
        setSlots(prev => {
          const next = prev.map(card => {
            if (!card || card.isGet) return card;
            // 盤面のカード名が、今回の「当たり名前リスト」に含まれているか判定
            const isHit = hitNames.includes(card.name);
            return isHit ? { ...card, isGet: true } : card;
          });
          if (checkBingo(next)) setTimeout(() => alert("🎉 BINGO!"), 300);
          return next;
        });
      }
    },60);
  };

return (
    <div style={{
      height: '100vh',
      width: '100vw', 
      display: 'flex', 
      flexDirection: 'column',
      backgroundColor: '#f5f5f5',
      overflow: 'hidden', // 全体スクロールは絶対禁止
      position: 'fixed',
      top: 0,
      left: 0
    }}>
      {/* 1. ヘッダー (高さ固定) */}
      <div style={{
        height: '50px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px',
        flexShrink: 0,
        background: '#fff',
        borderBottom: '1px solid #ddd',
        zIndex: 100
      }}>
        {!isStarted && (
          <>
            <button onClick={randomPlacement} style={{ padding: '6px 12px', cursor: 'pointer' }}>ランダム配置</button>
            <button onClick={() => window.confirm('開始しますか？') && setIsStarted(true)} style={{ padding: '6px 12px', cursor: 'pointer', fontWeight: 'bold' }}>
              配置確定
            </button>
          </>
        )}
        {isStarted && <h2 style={{ margin: 0, fontSize: '1.1rem' }}>総理大臣ビンゴ 開催中！</h2>}
      </div>

      <DndContext onDragEnd={handleDragEnd} onDragStart={(e) => setActiveCard(e.active.data.current?.card)}>
        <div style={{
          flex: 1, 
          display: 'grid', 
          gridTemplateColumns: '400px 1fr 280px', // 左を400pxに固定
          gap: '16px', 
          padding: '20px', 
          overflow: 'hidden', // ここも重要
          height: 'calc(100vh - 50px)', // ヘッダーを除いた全高
          boxSizing: 'border-box'
        }}>
          
          {/* 2. 左カラム: カード一覧 (400px固定) */}
          <div style={{
            height: '100%', 
            display: 'flex',
            flexDirection: 'column',
            background: '#fff', 
            border: '1px solid #ccc', 
            borderRadius: '8px', 
            overflow: 'hidden',
            opacity: isStarted ? 0.4 : 1 
          }}>
            <div style={{ 
              flex: 1, 
              overflowY: 'auto', // ここでスクロールさせる
              padding: '12px',
              display: 'grid', 
              gridTemplateColumns: 'repeat(3, 1fr)', // 3列
              gap: '8px', 
              alignContent: 'start'
            }}>
              {uniquePrimeMinisters.filter(pm => !slots.some(s => s?.id === pm.id)).map(pm => <DraggableCard key={pm.id} card={pm} />)}
            </div>
          </div>

          {/* 3. 中央盤面: アスペクト比を維持しつつ最大高さを制限 */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100%',
            minHeight: 0, // Flexの子要素が縮めるようにする
            overflow: 'hidden',
            padding: '0 10px'
          }}>
            <div style={{
              // 画面の高さ（ヘッダーと余白を引いた分）を上限にする
              height: 'min(calc(100vh - 150px), 100%)', // 画面高さから150px引いた値か、親の100%の小さい方
              aspectRatio: '1/1', 
              maxHeight: 'calc(100vh - 120px)',
              maxWidth: 'calc(100vh - 120px)',
              display: 'grid', 
              gridTemplateColumns: 'repeat(5, 1fr)',
              gap: '8px', 
              background: '#ddd', 
              padding: '10px', 
              borderRadius: '12px',
              boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
              boxSizing: 'border-box'
            }}>
              {slots.map((card, idx) => <Slot key={idx} id={`slot-${idx}`} card={card} />)}
            </div>
          </div>

          {/* 4. 右カラム: ルーレット & 履歴 */}
          <div style={{
            height: '100%', 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '12px',
            overflow: 'hidden',
            minHeight: 0
          }}>
            {isStarted ? (
              <>
                {/* ルーレット部分 (高さ固定) */}
                <div style={{ 
                  flexShrink: 0,
                  border: '2px solid #333', 
                  borderRadius: 12, 
                  padding: '16px', 
                  background: '#fff', 
                  textAlign: 'center'
                }}>
                  <h3 style={{ margin: '0 0 8px', fontSize: '0.9rem' }}>ルーレット</h3>
                  <div style={{ fontSize: '1.2rem', padding: '10px', background: '#f0f0f0', borderRadius: '6px', fontWeight: 'bold' }}>
                    {currentDate || "----/--/--"}
                  </div>
                  <button onClick={startRoulette} disabled={isSpinning} style={{ width: '100%', marginTop: '12px', padding: '10px', cursor: 'pointer', backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold' }}>
                    {isSpinning ? '回転中...' : '回す'}
                  </button>
                </div>

                {/* 履歴エリア (残りの高さを埋めてスクロール) */}
                <div style={{ 
                  flex: 1, 
                  display: 'flex', 
                  flexDirection: 'column', 
                  background: '#fff', 
                  border: '1px solid #ccc', 
                  borderRadius: '12px', 
                  overflow: 'hidden',
                  minHeight: 0 // これがないとはみ出す
                }}>
                  <div style={{ background: '#eee', padding: '8px', fontSize: '0.8rem', fontWeight: 'bold', borderBottom: '1px solid #ccc' }}>履歴</div>
                  <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
                    {history.map((h, i) => (
                      <div key={`${h.date}-${i}`} style={{ fontSize: '0.8rem', padding: '6px 0', borderBottom: '1px solid #eee' }}>
                        <div style={{ color: '#888', fontSize: '0.7rem' }}>{h.date}</div>
                        <div style={{ fontWeight: 'bold' }}>{h.names.join(', ')}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999', border: '2px dashed #ccc', borderRadius: '12px', textAlign: 'center', padding: '20px' }}>
                配置を確定すると<br/>ルーレットが起動します
              </div>
            )}
          </div>
        </div>
        
        {/* ドラッグ中の影 */}
        <DragOverlay>
          {activeCard ? (
            <div style={{ width: '100px', opacity: 0.8 }}><Card {...activeCard} /></div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
};