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
        className="absolute inset-0 z-[3] h-full w-full pointer-events-none"
        style={{
          background: '#000000',
          opacity: 0.10,
        }}
      />
    </>
  );
}


