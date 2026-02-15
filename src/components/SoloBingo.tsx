import React, { useState, useMemo } from 'react';
import { DndContext, DragEndEvent, DragOverlay, useDroppable } from '@dnd-kit/core';
import { useDraggable } from '@dnd-kit/core';
import { Card } from './Card';
import data from '../data/prime_ministers.json';
import { stringify } from 'querystring';
import confetti from 'canvas-confetti';

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
  point?: number;
  totalDays?: number;
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
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f9f9f9',
        border: isOver ? '2px solid #4caf50' : '1px dashed #ccc',
        borderRadius: '8px',
        position: 'relative',
        boxSizing: 'border-box',
        overflow: 'hidden',
        padding: '2px',
      }}
    >
      {card && (
        <>
          <DraggableCard card={card} />
          {card.isGet && (
            <div style={{
              position: 'absolute',
              top: 4,
              right: 4,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-end',
              gap: '2px',
              zIndex: 10
            }}>
              <div style={{
                backgroundColor: 'rgba(255, 215, 0, 0.9)',
                color: '#000',
                fontWeight: 'bold',
                padding: '2px 6px',
                borderRadius: '4px',
                fontSize: '0.7rem',
                boxShadow: '0 0 4px rgba(0,0,0,0.3)'
              }}>
                GET
              </div>
              <div style={{
                backgroundColor: '#e67e22',
                color: '#fff',
                fontWeight: 'bold',
                padding: '1px 5px',
                borderRadius: '4px',
                fontSize: '0.65rem'
              }}>
                +{card.point}pt
              </div>
            </div>
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
        width: '100%',
        height: '100%', // 左カラムでのカードの高さを見やすく固定
        minHeight: '110px', //左カラムで潰れないように最低高さを確保
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box',
        zIndex: transform ? 999:1, //ドラッグ中に前に出す
      }}
    >
      <Card {...card} />
    </div>
  );
};

//在位日数に応じたポイント計算
const calculatePoint = (days: number) => {
  if (days < 100) return 500;   // 100日未満（超レア：東久邇宮など）
  if (days < 300) return 300;   // 300日未満（レア：羽田孜など）
  if (days < 1000) return 100;  // 1000日未満（普通）
  return 50;                    // それ以上（大御所：安倍、佐藤など）
};


// --- メインコンポーネント: SoloBingo ---
export const SoloBingo: React.FC = () =>{
    //内部で管理するように移動
    const[isStarted, setIsStarted ] = useState(false);
    const [slots, setSlots] = useState<(PM | null)[]>(Array(25).fill(null));
    const [currentDate, setCurrentDate] = useState<string | null>(null);
    const [isSpinning, setIsSpinning] = useState(false);
    const [activeCard, setActiveCard] = useState<PM | null>(null);
    const [history, setHistory] = useState<HistoryItem[]>([]); // 履歴用State
    const [isBingo, setIsBingo] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const getWinningIndices = (currentSlots: (PM | null)[]) => {
        const lines = [
            [0,1,2,3,4],[5,6,7,8,9],[10,11,12,13,14],[15,16,17,18,19],[20,21,22,23,24], // 横
            [0,5,10,15,20],[1,6,11,16,21],[2,7,12,17,22],[3,8,13,18,23],[4,9,14,19,24], // 縦
            [0,6,12,18,24],[4,8,12,16,20] // 斜め
        ];
        const winningIndices = new Set<number>();
        lines.forEach(line => {
            if (line.every(idx => currentSlots[idx]?.isGet)) {
                line.forEach(idx => winningIndices.add(idx));
            }
        });
        return winningIndices;
    };

    // 2. 合計スコアの計算（ビンゴしたマスだけを合計する）
    const totalScore = useMemo(() => {
        const winningIndices = getWinningIndices(slots);
        let score = 0;
        winningIndices.forEach(idx => {
            score += slots[idx]?.point || 0;
        });
        return score;
    }, [slots]);


    const uniquePrimeMinisters = useMemo(() => {
        const pmMap = new Map<string, any>();

        data.forEach((pm) => {
        //日数計算
        const start = new Date(pm.start_date).getTime();
        const end = (pm.end_date === '現職' || !pm.end_date || pm.end_date === '2099-12-31') 
                    ? new Date().getTime() 
                    : new Date(pm.end_date).getTime();
        const days = Math.floor((end - start) / (1000 * 60 * 60 * 24));

        if (!pmMap.has(pm.name)){
            pmMap.set(pm.name, {...pm, totalDays: days });
            }else{
            //複数回就任している場合は合算
            const existing = pmMap.get(pm.name);
            pmMap.set(pm.name, { ...existing, totalDays: existing.totalDays + days });
            }
        });

    return Array.from(pmMap.values()).map((pm, i) => {
      const point = calculatePoint(pm.totalDays);
      return {
        ...pm,
        id: i,
        image: imageBasePath + pm.image_url,
        point: point, //カードごとの持ち点
      };
    });
    } , []);

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
        const draggedCard = active.data.current?.card as PM;
        if (!draggedCard) return;

        //1.一覧に戻す
        if (!over){
        setSlots(prev => prev.map(c => c?.id === draggedCard.id ? null : c));
        return;
        }

        //2.盤面へのドロップ
        if (String(over.id).startsWith('slot-')){
        const slotIndex = parseInt(String(over.id).split('-')[1], 10);
        
        setSlots(prev => {
        const next: (PM | null)[] = [...prev];
        const existingIdx = prev.findIndex(c => c?.id === draggedCard.id);
        
        if (existingIdx >= 0) {
            // 盤面内移動：入れ替え
            const targetCard = next[slotIndex];
            next[existingIdx] = targetCard;
            next[slotIndex] = draggedCard;
        }else{
            //新規配置
            next[slotIndex] = draggedCard;
        }
        return next;
        })
    }
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
                    // まずカードが当たったかどうかのフラグを更新    
                    const next = prev.map(card => {
                        if (!card || card.isGet) return card;
                        return hitNames.includes(card.name) ? { ...card, isGet: true } : card;
                    });

                //ビンゴしている列（インデックス）をすべて特定する
                const lines = [
                    [0,1,2,3,4],[5,6,7,8,9],[10,11,12,13,14],[15,16,17,18,19],[20,21,22,23,24], // 横
                    [0,5,10,15,20],[1,6,11,16,21],[2,7,12,17,22],[3,8,13,18,23],[4,9,14,19,24], // 縦
                    [0,6,12,18,24],[4,8,12,16,20] // 斜め
                ];

                const winningIndices = new Set<number>();
                lines.forEach(line => {
                // その列の5枚すべてが isGet かどうか
                    if (line.every(idx => next[idx]?.isGet)) {
                        line.forEach(idx => winningIndices.add(idx)); // ビンゴしたマスの番号を記録
                    }
                });

                // 3. ビンゴしたマス（winningIndices）に含まれるカードの点数だけを合計する
                let newTotalScore = 0;
                winningIndices.forEach(idx => {
                    newTotalScore += next[idx]?.point || 0;
                });


                // 4. ビンゴ判定と演出
                if (winningIndices.size > 0) {
                    confetti({
                        particleCount: 150,
                        spread: 70,
                        origin: { y: 0.6 },
                        zIndex: 10000
                    });

                    setTimeout(() => {
                        setIsBingo(true);
                    }, 500);
                }
            return next;
          });
        }
    }, 60);
};
    
        // デバッグ用：強制ビンゴ関数
        const debugBingo = () => {
        setSlots(prev => {
            const next = [...prev];
            // 左端の一列（0, 5, 10, 15, 20）を強制的にGET状態にする
            [0, 5, 10, 15, 20].forEach(idx => {
            if (next[idx]) {
                next[idx] = { ...next[idx]!, isGet: true };
            } else {
                // もしスロットが空なら、適当なPMを入れてGET状態にする
                next[idx] = { ...uniquePrimeMinisters[idx], isGet: true };
            }
            });

            // ビンゴ判定をキックして演出を出す
            if (checkBingo(next)) {
            confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
            setTimeout(() => setIsBingo(true), 500);
            }
            return next;
            });
        };
        const debugMultipleBingo = () => {
        setSlots(prev => {
            const next = [...prev];
            // テストしたいインデックスの集合
            // 例：0,5,10,15,20 (左縦) + 1,2,3,4 (上横の残り) = ダブルビンゴ
            // さらに 6,12,18,24 を足せば斜めも入ってトリプル！
            const targetIndices = [
            0, 5, 10, 15, 20, // 縦1列目
            1, 2, 3, 4,       // 横1列目
            6, 12, 18, 24     // 斜め（左上から右下）
            ];

            targetIndices.forEach(idx => {
            if (next[idx]) {
                next[idx] = { ...next[idx]!, isGet: true };
            } else {
                // 空のスロットには uniquePrimeMinisters から補充
                // uniquePrimeMinisters[idx] が存在しない場合に備えて fallback
                const pmData = uniquePrimeMinisters[idx] || uniquePrimeMinisters[0];
                next[idx] = { ...pmData, isGet: true };
            }
            });

            // ビンゴ判定
            const winningIndices = getWinningIndices(next);
            if (winningIndices.size > 0) {
            confetti({ particleCount: 200, spread: 100, origin: { y: 0.6 } });
            setTimeout(() => setIsBingo(true), 500);
            }
            return next;
        });
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
        
        {/* デバッグ用ボタン */}
        {process.env.NODE_ENV === 'development' && (
        <button 
            onClick={debugMultipleBingo}
            style={{
            position: 'fixed', bottom: 10, right: 10, opacity: 0.5,
            padding: '5px', fontSize: '0.6rem', zIndex: 10000
            }}
        >
            DEBUG: BINGO
        </button>
        )}


        {!isStarted && (
          <>
            <button onClick={randomPlacement} style={{ padding: '6px 12px', cursor: 'pointer' }}>ランダム配置</button>
            <button 
                onClick={() => setShowConfirm(true)} 
                style={{ padding: '6px 12px', cursor: 'pointer', fontWeight: 'bold' }}
            >
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
              gridTemplateRows: 'repeat(5, 1fr)',
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

        {/* ビンゴ演出オーバーレイ */}
        {isBingo && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', zIndex: 9999,
          animation: 'fadeIn 0.5s ease-out'
          }}>
          <h1 style={{
          fontSize: '6rem', color: '#ffcc00', margin: 0,
          textShadow: '0 0 20px #fff, 0 0 40px #ffcc00',
          animation: 'bounce 1s infinite'
          }}>
            🎉 BINGO! 🎉
          </h1>
            {/* 合計スコアの表示を追加 */}
            <div style={{
            fontSize: '3rem',
            color: '#fff',
            marginBottom: '20px',
            fontWeight: 'bold',
            textShadow: '2px 2px 10px rgba(0,0,0,0.5)'
            }}>
            Total: <span style={{ color: '#ffcc00' }}>{totalScore}</span> pt
            </div>

          {/* スコア計算の内訳エリア */}
          <div style={{
            background: 'rgba(255,255,255,0.1)', 
            borderRadius: '15px',
            padding: '20px', 
            width: '100%', 
            maxWidth: '600px',
            maxHeight: '50vh', 
            overflowY: 'auto', 
            marginBottom: '20px',
            border: '1px solid rgba(255,255,255,0.2)'
            }}>
            <h3 style={{ 
              color: '#fff', 
              borderBottom: '1px solid #555', 
              paddingBottom: '10px', 
              marginTop: 0 
              }}>
                得点内訳
              </h3>
              {slots.map((card, idx) => {
              const winningIndices = getWinningIndices(slots);
              // ビンゴしたマスにあるカードだけを表示
              if (card && winningIndices.has(idx)) {
                return (
                  <div key={idx} style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    color: '#ddd', 
                    padding: '8px 0', 
                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                    fontSize: '1.1rem'
                  }}>
                    <span>{card.name} 
                      <small style={{ fontSize: '0.7rem', color: '#888' }}> ({card.totalDays}日間)</small>
                    </span>
                    <span style={{ fontWeight: 'bold', color: '#ffcc00' }}>
                      +{card.point} pt
                    </span>
                  </div>
                );
              }
              return null;
            })}

          <button 
            onClick={() => window.location.reload()} // 簡単なリセット方法
            style={{
              marginTop: '40px', padding: '15px 40px', fontSize: '1.5rem',
              backgroundColor: '#4CAF50', color: 'white', border: 'none',
              borderRadius: '50px', cursor: 'pointer', fontWeight: 'bold'
            }}
          >
            もう一度遊ぶ
          </button>
          </div>
        </div>
        )}
        {/* アニメーション用のStyleタグ */}
        <style>{`
          @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
          @keyframes bounce {
            0%, 100% { transform: translateY(0) scale(1); }
            50% { transform: translateY(-20px) scale(1.1); }
          }
        `}</style>
      </DndContext>
      {/* 配置確定の確認モーダル */}
        {showConfirm && (
        <div style={{
            position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
            backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', 
            alignItems: 'center', justifyContent: 'center', zIndex: 20000,
        }}>
            <div style={{
            background: '#fff', padding: '30px', borderRadius: '15px',
            textAlign: 'center', boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
            width: '320px'
            }}>
            <h3 style={{ marginTop: 0 }}>準備はいいですか？</h3>
            <p style={{ color: '#666', fontSize: '0.9rem' }}>配置を確定してビンゴを開始します。<br/>開始後は配置を変更できません。</p>
            
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '20px' }}>
                <button 
                onClick={() => setShowConfirm(false)}
                style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid #ccc', cursor: 'pointer' }}
                >
                まだ直す
                </button>
                <button 
                onClick={() => {
                    setShowConfirm(false);
                    setIsStarted(true);
                }}
                style={{ 
                    padding: '10px 20px', borderRadius: '8px', border: 'none', 
                    backgroundColor: '#4CAF50', color: '#fff', fontWeight: 'bold', cursor: 'pointer' 
                }}
                >
                開始する！
                </button>
            </div>
            </div>
        </div>
        )}
    </div>
  );
};