export default function CosmicLayer() {
  return (
    <>
      <div className="bg" />
      <div className="star-field">
        <div className="layer" />
        <div className="layer" />
        <div className="layer" />
      </div>
      {/* Additional 10% black overlay */}
      <div 
        className="fixed inset-0 w-full h-full pointer-events-none"
        style={{
          background: '#000000',
          opacity: 0.10,
          zIndex: -48,
        }}
      />
    </>
  );
}



