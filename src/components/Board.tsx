import React, { useState, useMemo } from 'react';
import { DndContext, DragEndEvent, DragOverlay, useDroppable } from '@dnd-kit/core';
import { useDraggable } from '@dnd-kit/core';
import { Card } from './Card';
import data from '../data/prime_ministers.json';

const imageBasePath = "/images/prime_ministers/";

type SlotProps = {
  id: string;
  card: any | null;
};

const Slot: React.FC<SlotProps> = ({ id, card }) => {
  // useDroppableを導入してドロップ対象に
  const { isOver, setNodeRef } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}  // これがないとドロップ対象にならない
      id={id}
      style={{
        width: '120px',
        height: '140px',
        border: isOver ? '2px solid #4caf50' : '1px dashed #ccc',  // ドラッグオーバー時は枠を強調
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f9f9f9',
        position: 'relative',
        borderRadius: '8px',
        transition: 'border 0.2s ease',
      }}
    >
      {card && (
        <>
          <Card {...card} />
          {card.isGet && (
            <div style={{
              position: 'absolute',
              top: 4,
              right: 4,
              backgroundColor: 'rgba(255, 215, 0, 0.85)',
              color: '#000',
              fontWeight: 'bold',
              padding: '2px 6px',
              borderRadius: '4px',
              fontSize: '0.75rem',
              pointerEvents: 'none',
              userSelect: 'none',
              boxShadow: '0 0 4px rgba(0,0,0,0.3)',
            }}>GET</div>
          )}
        </>
      )}
    </div>
  );
};

type DraggableCardProps = {
  card: any;
};

const DraggableCard: React.FC<DraggableCardProps> = ({ card }) => {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: `card-${card.id}`,
    data: { card },
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={{
        transform: transform ? `translate(${transform.x}px, ${transform.y}px)` : undefined,
        cursor: 'grab',
        margin: '4px',
        border: '1px solid #ccc',
        borderRadius: '8px',
        background: '#fff',
        boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
        userSelect: 'none',
      }}
    >
      <Card {...card} />
    </div>
  );
};

export const Board: React.FC<{ isStarted: boolean; setIsStarted: React.Dispatch<React.SetStateAction<boolean>> }> = ({ isStarted, setIsStarted }) => {
  const [slots, setSlots] = useState<(any | null)[]>(Array(25).fill(null));
  const [currentDate, setCurrentDate] = useState<string | null>(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [activeCard, setActiveCard] = useState<any | null>(null); // DragOverlay用に現在ドラッグ中カード管理

  const uniquePrimeMinisters = useMemo(() => {
    const map = new Map<string, any>();
    data.forEach((pm) => {
      if (!map.has(pm.name)) {
        map.set(pm.name, pm);
      }
    });
    return Array.from(map.values()).map((pm, i) => ({
      ...pm,
      id: i, // idをここで付与（0始まり）
      image: imageBasePath + pm.image_url,
    }));
  }, []);

  const startDate = useMemo(() => new Date('1885-12-22'), []);
  const endDate = useMemo(() => new Date(), []);

  const getRandomDate = () => {
    const diff = endDate.getTime() - startDate.getTime();
    const offset = Math.floor(Math.random() * diff);
    const d = new Date(startDate.getTime() + offset);
    return d.toISOString().slice(0, 10);
  };

  const isDateInRange = (dateStr: string, start: string, end: string) => {
    const d = new Date(dateStr);
    const s = new Date(start);
    const e = new Date(end);
    return d >= s && d <= e;
  };

  // ドラッグ開始時にドラッグ中カードを記憶
  const handleDragStart = (event: any) => {
    const card = event.active.data.current.card;
    setActiveCard(card);
  };

  // ドラッグ終了時処理
  const handleDragEnd = (event: DragEndEvent) => {
    setActiveCard(null);

    if (isStarted) return;

    const { active, over } = event;
    if (!over?.id) return;

    const overIdStr = String(over.id);
    if (!overIdStr.startsWith('slot-')) return;

    const slotIndex = parseInt(overIdStr.split('-')[1], 10);
    const activeCard = active?.data?.current?.card;
    if (!activeCard) return;

    // 盤面にすでに同じカードがあるかチェック
    const isAlreadyPlaced = slots.some((c, idx) => c?.id === activeCard.id && idx !== slotIndex);
    if (isAlreadyPlaced) {
      // 同じカードが既に他のスロットにあるので置けない
      return;
    }

    const newSlots = [...slots];
    const existingIndex = slots.findIndex(c => c?.id === activeCard.id);

    if (existingIndex === slotIndex) return;

    const targetCard = newSlots[slotIndex];

    if (existingIndex >= 0) {
      newSlots[existingIndex] = targetCard ?? null;
      newSlots[slotIndex] = activeCard;
    } else {
      newSlots[slotIndex] = activeCard;
    }

    setSlots(newSlots);
  };

  // ランダム配置
  const randomPlacement = () => {
    if (isStarted) return;

    const newSlots: (any | null)[] = Array(25).fill(null);

    // uniquePrimeMinisters はすでに画像ついてるのでそのままシャッフル
    const shuffled = [...uniquePrimeMinisters]
      .map(value => ({ value, sort: Math.random() }))
      .sort((a, b) => a.sort - b.sort)
      .map(({ value }) => value);

    for (let i = 0; i < 25; i++) {
      if (i < shuffled.length) {
        newSlots[i] = shuffled[i];
      }
    }

    setSlots(newSlots);
  };

  const handleConfirmStart = () => {
    if (window.confirm('ビンゴを開始しますか？')) {
      setIsStarted(true);
    }
  };

  // ルーレット開始
  const startRoulette = () => {
    if (isSpinning) return;

    setIsSpinning(true);

    let ticks = 0;
    const totalTicks = 60;

    const spinInterval = setInterval(() => {
      ticks++;
      if (ticks > totalTicks) {
        clearInterval(spinInterval);
        setIsSpinning(false);
        return;
      }
      const nextDate = getRandomDate();
      setCurrentDate(nextDate);
    }, 50 + ticks * 10);
  };

  return (
    <>
      {/* 上カラム：ボタン類を横幅いっぱいに */}
      <div style={{ marginBottom: 16, width: '100%', textAlign: 'center' }}>
        {!isStarted && (
          <>
            <button
              onClick={randomPlacement}
              style={{ marginRight: 12, padding: '8px 16px', fontWeight: 'bold' }}
            >
              ランダム配置
            </button>
            <button
              onClick={handleConfirmStart}
              style={{ padding: '8px 16px', fontWeight: 'bold' }}
            >
              配置確定
            </button>
          </>
        )}
      </div>

      <DndContext onDragEnd={handleDragEnd} onDragStart={handleDragStart}>
        {/* 横並び3カラム */}
        <div style={{
          display: 'flex',
          gap: '24px',
          justifyContent: 'center',
          alignItems: 'stretch',
        }}>
          {/* 左カラムカードリスト */}
          <div
            style={{
              width: 500,
              maxHeight: '80vh',
              overflowY: 'auto',
              border: '1px solid #ccc',
              padding: '8px',
              background: '#fff',
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '8px',
              pointerEvents: isStarted ? 'none' : 'auto',
              opacity: isStarted ? 0.6 : 1,
              overflowX: 'hidden',
            }}
          >
            {uniquePrimeMinisters
              .filter(pm => !slots.some(s => s?.id === pm.id))
              .map((pm) => (
                <DraggableCard
                  key={pm.id}
                  card={pm}
                />
              ))}
          </div>

          {/* 真ん中ビンゴ盤面 */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(5, 120px)',
              gap: '16px',
              background: '#f0f0f0',
              padding: '12px',
              borderRadius: '8px',
              maxHeight: '80vh',
              overflowY: 'auto',
            }}
          >
            {slots.map((card, idx) => {
              if (!card) return <Slot key={idx} id={`slot-${idx}`} card={null} />;
              const getFlag = currentDate && isDateInRange(currentDate, card.start_date, card.end_date);
              return <Slot key={idx} id={`slot-${idx}`} card={{ ...card, isGet: getFlag }} />;
            })}
          </div>

          {/* 右カラムルーレット */}
          {isStarted && (
            <div
              style={{
                width: 240,
                flexShrink: 0,
                border: '2px solid #333',
                borderRadius: 8,
                padding: 20,
                background: '#fff',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '12px',
              }}
            >
              <h2>ルーレット</h2>
              <div style={{ fontSize: '1.5rem', minHeight: '2rem' }}>
                {currentDate || "----"}
              </div>
              <button
                onClick={startRoulette}
                disabled={isSpinning}
                style={{
                  padding: '8px 16px',
                  fontWeight: 'bold',
                  background: isSpinning ? '#ccc' : '#4CAF50',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: isSpinning ? 'not-allowed' : 'pointer'
                }}
              >
                {isSpinning ? '回転中...' : '回す'}
              </button>
            </div>
          )}
        </div>

        {/* ドラッグ中のカードを画面上に表示 */}
        <DragOverlay>
          {activeCard ? <Card {...activeCard} /> : null}
        </DragOverlay>
      </DndContext>
    </>
  );
};
