type CardProps = {
  name: string;
  image: string;
};

export const Card: React.FC<CardProps> = ({ name, image }) => (
  <div style={{ position: 'relative', width: '100px', textAlign: 'center' }}>
    <img src={image} alt={name} style={{ width: '100%', borderRadius: '8px' }} />
    <div>{name}</div>
  </div>
);
