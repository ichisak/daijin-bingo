type CardProps = {
  name: string;
  image: string;
};

export const Card: React.FC<CardProps> = ({ name, image }) => (
  <div style={{ 
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    height: '100%', 
    textAlign: 'center',
    padding: '2px', // 少し余白を設ける
    boxSizing: 'border-box',
    overflow: 'hidden',
    justifyContent: 'space-between' // 画像と名前を上下に分ける
  }}>
    {/* 画像エリア: 最大でも80%までに制限 */}
    <div style={{ 
      height: '80%', 
      width: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 0 // 縮小を許可
    }}>
      <img 
        src={image} 
        alt={name} 
        style={{ 
          maxWidth: '100%', 
          maxHeight: '100%', 
          objectFit: 'contain', 
          borderRadius: '4px' 
        }} 
      />
    </div>

    {/* 名前エリア: 20%の領域を確保 */}
    <div style={{ 
      height: '20%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: 'min(1.5vh, 11px)', // 画面の高さに連動しつつ、最大11px
      fontWeight: 'bold',
      lineHeight: '1.1',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      width: '100%'
    }}>
      {name}
    </div>
  </div>
);