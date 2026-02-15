import React, { useState } from 'react';
import { DndContext, DragOverlay } from '@dnd-kit/core';
import { Card } from './Card'; // 既存のCardコンポーネントを再利用

export const VersusBingo: React.FC = () => {
  // --- 対戦用のState ---
  const [turn, setTurn] = useState<'A' | 'B'>('A');
  const [slotsA, setSlotsA] = useState<(any | null)[]>(Array(25).fill(null));
  const [slotsB, setSlotsB] = useState<(any | null)[]>(Array(25).fill(null));
  const [isStarted, setIsStarted] = useState(false);

  return (
    <div style={{
      height: '100vh', width: '100vw', display: 'flex', flexDirection: 'column',
      backgroundColor: '#2c3e50', color: 'white', overflow: 'hidden'
    }}>
      {/* 上部：ターン表示・ステータス */}
      <div style={{ height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1a252f', gap: '50px' }}>
        <div style={{ fontSize: '1.5rem', color: turn === 'A' ? '#4CAF50' : '#888', fontWeight: 'bold', borderBottom: turn === 'A' ? '3px solid #4CAF50' : 'none' }}>
          PLAYER A
        </div>
        <div style={{ fontSize: '1.2rem', padding: '5px 20px', background: '#e74c3c', borderRadius: '20px' }}>
          VS
        </div>
        <div style={{ fontSize: '1.5rem', color: turn === 'B' ? '#2196F3' : '#888', fontWeight: 'bold', borderBottom: turn === 'B' ? '3px solid #2196F3' : 'none' }}>
          PLAYER B
        </div>
      </div>

      <DndContext>
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 350px 1fr', gap: '10px', padding: '10px' }}>
          
          {/* 左：Player A のエリア */}
          <div style={{ background: 'rgba(76, 175, 80, 0.1)', borderRadius: '15px', padding: '10px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <h3>Player A の盤面</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '5px', width: '100%', aspectRatio: '1/1' }}>
              {slotsA.map((_, i) => (
                <div key={i} style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '5px', border: '1px dashed #666' }}></div>
              ))}
            </div>
          </div>

          {/* 中央：共通カードプール（ここで奪い合い！） */}
          <div style={{ background: '#fff', color: '#333', borderRadius: '15px', padding: '10px', display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ textAlign: 'center', margin: '0 0 10px 0' }}>総理大臣リスト</h3>
            <div style={{ flex: 1, overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '5px' }}>
              {/* ここにドラフト用のカードを並べる */}
              <p style={{ gridColumn: 'span 2', textAlign: 'center', color: '#999' }}>カード読み込み中...</p>
            </div>
          </div>

          {/* 右：Player B のエリア */}
          <div style={{ background: 'rgba(33, 150, 243, 0.1)', borderRadius: '15px', padding: '10px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <h3>Player B の盤面</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '5px', width: '100%', aspectRatio: '1/1' }}>
              {slotsB.map((_, i) => (
                <div key={i} style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '5px', border: '1px dashed #666' }}></div>
              ))}
            </div>
          </div>

        </div>
      </DndContext>
    </div>
  );
};