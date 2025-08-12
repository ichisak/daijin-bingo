type CardProps = {
  name: string;
  image: string;
  isGet?: boolean; 
};

export const Card: React.FC<CardProps> = ({ name, image, isGet }) => (
  <div style={{ position: 'relative', width: '100px', textAlign: 'center' }}>
    <img src={image} alt={name} style={{ width: '100%', borderRadius: '8px' }} />
    <div>{name}</div>
    {isGet && (
      <div
        style={{
          position: 'absolute',
          top: 4,
          right: 4,
          backgroundColor: 'rgba(255,0,0,0.8)',
          color: 'white',
          padding: '2px 6px',
          borderRadius: '4px',
          fontWeight: 'bold',
          fontSize: '0.75rem',
          pointerEvents: 'none',
          userSelect: 'none',
        }}
      >
        GET
      </div>
    )}
  </div>
);
