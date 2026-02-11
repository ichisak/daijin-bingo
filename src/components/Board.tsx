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
  const { isOver, setNodeRef } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      id={id}
      style={{
        width: '100%',
        border: isOver ? '2px solid #4caf50' : '1px dashed #ccc',
        display: 'flex',
        aspectRatio: '5 / 6',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f9f9f9',
        position: 'relative',
        borderRadius: '8px',
        transition: 'filter 0.5s ease',
        // cardが存在する場合のみfilterを適用するように修正
        filter: (card && card.isGet) ? 'brightness(0.7) sepia(0.5) hue-rotate(-50deg)' : 'none',
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
              zIndex: 10,
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
  const [activeCard, setActiveCard] = useState<any | null>(null);

  const uniquePrimeMinisters = useMemo(() => {
    const map = new Map<string, any>();
    data.forEach((pm) => {
      if (!map.has(pm.name)) {
        map.set(pm.name, pm);
      }
    });
    return Array.from(map.values()).map((pm, i) => ({
      ...pm,
      id: i,
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
    const s = new Date(start.replace(/\./g, '-'));
    const e = end === '現職' ? new Date() : new Date(end.replace(/\./g, '-'));
    return d >= s && d <= e;
  };

  const handleDragStart = (event: any) => {
    const card = event.active.data.current.card;
    setActiveCard(card);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveCard(null);
    if (isStarted) return;
    const { active, over } = event;
    if (!over?.id) return;
    const overIdStr = String(over.id);
    if (!overIdStr.startsWith('slot-')) return;
    const slotIndex = parseInt(overIdStr.split('-')[1], 10);
    const draggedCard = active?.data?.current?.card;
    if (!draggedCard) return;

    const isAlreadyPlaced = slots.some((c, idx) => c?.id === draggedCard.id && idx !== slotIndex);
    if (isAlreadyPlaced) return;

    const newSlots = [...slots];
    const existingIndex = slots.findIndex(c => c?.id === draggedCard.id);
    if (existingIndex === slotIndex) return;

    if (existingIndex >= 0) {
      newSlots[existingIndex] = newSlots[slotIndex];
      newSlots[slotIndex] = draggedCard;
    } else {
      newSlots[slotIndex] = draggedCard;
    }
    setSlots(newSlots);
  };

  const randomPlacement = () => {
    if (isStarted) return;
    const shuffled = [...uniquePrimeMinisters]
      .sort(() => Math.random() - 0.5)
      .slice(0, 25);
    setSlots(shuffled);
  };

  const handleConfirmStart = () => {
    if (window.confirm('ビンゴを開始しますか？')) {
      setIsStarted(true);
    }
  };

  const checkBingo = (currentSlots: (any | null)[]) => {
    const lines = [
      [0, 1, 2, 3, 4], [5, 6, 7, 8, 9], [10, 11, 12, 13, 14], [15, 16, 17, 18, 19], [20, 21, 22, 23, 24],
      [0, 5, 10, 15, 20], [1, 6, 11, 16, 21], [2, 7, 12, 17, 22], [3, 8, 13, 18, 23], [4, 9, 14, 19, 24],
      [0, 6, 12, 18, 24], [4, 8, 12, 16, 20]
    ];
    return lines.some(line => line.every(idx => currentSlots[idx] && currentSlots[idx].isGet));
  };

  const startRoulette = () => {
    if (isSpinning) return;
    setIsSpinning(true);
    let ticks = 0;
    const totalTicks = 40;

    const spinInterval = setInterval(() => {
      const tempDate = getRandomDate();
      setCurrentDate(tempDate);
      ticks++;

      if (ticks > totalTicks) {
        clearInterval(spinInterval);
        setIsSpinning(false);
        const finalDate = getRandomDate();
        setCurrentDate(finalDate);

        setSlots(prevSlots => {
          const newSlots = prevSlots.map(card => {
            if (!card || card.isGet) return card;
            const isHit = card.terms ? 
              card.terms.some((t: any) => isDateInRange(finalDate, t.start, t.end)) :
              isDateInRange(finalDate, card.start_date, card.end_date);
            return isHit ? { ...card, isGet: true } : card;
          });
          if (checkBingo(newSlots)) {
            setTimeout(() => alert("🎉 BINGO! 素晴らしい！"), 300);
          }
          return newSlots;
        });
      }
    }, 50);
  };

  return (
    <div style={{ height: '100vh', width: '100vw', display: 'flex', flexDirection: 'column', backgroundColor: '#f5f5f5', overflow: 'hidden', position: 'fixed', top: 0, left: 0 }}>
      <div style={{ height: '50px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', padding: '0 16px', flexShrink: 0 }}>
        {!isStarted && (
          <>
            <button onClick={randomPlacement} style={{ padding: '6px 12px', fontWeight: 'bold', cursor: 'pointer' }}>ランダム配置</button>
            <button onClick={handleConfirmStart} style={{ padding: '6px 12px', fontWeight: 'bold', cursor: 'pointer' }}>配置確定</button>
          </>
        )}
      </div>

      <DndContext onDragEnd={handleDragEnd} onDragStart={handleDragStart}>
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr auto 240px', gap: '16px', padding: '0 16px 16px 16px', overflow: 'hidden', alignItems: 'center' }}>
          <div style={{ height: '100%', overflowX: 'hidden', overflowY: 'auto', background: '#fff', border: '1px solid #ccc', borderRadius: '8px', padding: '12px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: '12px', alignContent: 'start', opacity: isStarted ? 0.5 : 1, pointerEvents: isStarted ? 'none' : 'auto' }}>
            {uniquePrimeMinisters
              .filter(pm => !slots.some(s => s?.id === pm.id))
              .map((pm) => <DraggableCard key={pm.id} card={pm} />)}
          </div>

          <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 10px' }}>
            <div style={{ width: 'min(76vh, 48vw)', aspectRatio: '1 / 1', display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gridTemplateRows: 'repeat(5, 1fr)', gap: '8px', background: '#eee', padding: '10px', borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
              {slots.map((card, idx) => (
                <div key={idx} style={{ width: '100%', height: '100%' }}>
                  <Slot id={`slot-${idx}`} card={card} />
                </div>
              ))}
            </div>
          </div>

          <div style={{ height: '100%', width: '240px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            {isStarted ? (
              <div style={{ border: '2px solid #333', borderRadius: 8, padding: '24px 12px', background: '#fff', textAlign: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                <h3 style={{ marginTop: 0 }}>ルーレット</h3>
                <div style={{ fontSize: '1.2rem', margin: '20px 0', padding: '10px', background: '#f0f0f0', border: '1px solid #ccc', borderRadius: '4px', fontWeight: 'bold' }}>
                  {currentDate || "----/--/--"}
                </div>
                <button onClick={startRoulette} disabled={isSpinning} style={{ width: '100%', padding: '12px', fontWeight: 'bold', background: isSpinning ? '#ccc' : '#4CAF50', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                  {isSpinning ? '回転中...' : '回す'}
                </button>
              </div>
            ) : (
              <div style={{ color: '#888', textAlign: 'center' }}>配置を確定するとルーレットが出現します</div>
            )}
          </div>
        </div>

        <DragOverlay>
          {activeCard ? (
            <div style={{ width: '100px', opacity: 0.9 }}>
              <Card {...activeCard} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
};