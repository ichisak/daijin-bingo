import React, { useState } from 'react';
import { SoloBingo } from './components/SoloBingo';
import { VersusBingo } from './components/VersusBingo';
import { TimelineGame } from './components/TimelineGame';

type GameMode = 'menu' | 'solo-bingo' | 'vs-bingo' | 'timeline';

export const App: React.FC = () => {
  const [mode, setMode] = useState<GameMode>('menu');

  // メニューに戻るための関数
  const backToMenu = () => setMode('menu');

  if (mode === 'menu') {
    return (
      <div style={{
        height: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        background: 'linear-gradient(135deg, #1a2a6c, #b21f1f, #fdbb2d)',
        color: 'white', fontFamily: 'sans-serif'
      }}>
        <h1 style={{ fontSize: '4rem', marginBottom: '40px', textShadow: '2px 2px 10px rgba(0,0,0,0.5)' }}>
          歴代内閣総理大臣で遊ぼう
        </h1>
        
        <div style={{ display: 'grid', gap: '20px', width: '300px' }}>
          <MenuButton onClick={() => setMode('solo-bingo')} label="一人で遊ぶビンゴ" sub="知識で高得点を狙え！" color="#4CAF50" />
          <MenuButton onClick={() => setMode('vs-bingo')} label="2人対戦ビンゴ" sub="カードを奪い合え！" color="#2196F3" />
          <MenuButton onClick={() => setMode('timeline')} label="並べ替えゲーム" sub="歴史の順序を当てろ！" color="#FF9800" />
        </div>
      </div>
    );
  }

  return (
    <>
      <button 
        onClick={backToMenu}
        style={{ position: 'fixed', top: 10, left: 10, zIndex: 1000, padding: '5px 15px', cursor: 'pointer' }}
      >
        ← メニューへ戻る
      </button>
      {mode === 'solo-bingo' && <SoloBingo />}
      {mode === 'vs-bingo' && <VersusBingo />}
      {mode === 'timeline' && <TimelineGame />}
    </>
  );
};

// メニューボタン用サブコンポーネント
const MenuButton: React.FC<{ onClick: () => void, label: string, sub: string, color: string }> = ({ onClick, label, sub, color }) => (
  <button onClick={onClick} style={{
    padding: '20px', fontSize: '1.2rem', fontWeight: 'bold', cursor: 'pointer',
    backgroundColor: color, color: 'white', border: 'none', borderRadius: '12px',
    boxShadow: '0 4px 0 rgba(0,0,0,0.2)', transition: 'transform 0.1s'
  }}
  onMouseDown={(e) => e.currentTarget.style.transform = 'translateY(4px)'}
  onMouseUp={(e) => e.currentTarget.style.transform = 'translateY(0)'}
  >
    {label}
    <div style={{ fontSize: '0.8rem', fontWeight: 'normal', marginTop: '5px', opacity: 0.9 }}>{sub}</div>
  </button>
);

export default App;