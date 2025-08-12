import React, { useState } from 'react';
import { Board } from './components/Board';

export const App: React.FC = () => {
  // ルーレット開始状態を管理するstate
  const [isStarted, setIsStarted] = useState(false);

  return (
    <div style={{ padding: '20px' }}>
      <h1>大臣ビンゴ</h1>
      {/* Boardに状態とsetterを渡す */}
      <Board isStarted={isStarted} setIsStarted={setIsStarted} />
    </div>
  );
};

export default App;