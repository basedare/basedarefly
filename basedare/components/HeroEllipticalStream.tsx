'use client';
import OrbitingDares from '@/components/OrbitingDares';

interface HeroEllipticalStreamProps {
  setActiveChat?: (card: any) => void;
}

const HeroEllipticalStream = ({ setActiveChat }: HeroEllipticalStreamProps = {}) => {
  return (
    <div className="relative w-full min-h-[600px] flex flex-col justify-center items-center">
      <div className="hero-container relative z-40 flex flex-col items-center justify-center">
        {/* PeeBear Head */}
        <div className="bear-head-container relative z-[100] pointer-events-none">
          <img 
            src="/assets/peebear-head.png" 
            alt="PeeBear"
            className="w-[380px] h-[380px] drop-shadow-[0_0_140px_rgba(168,85,247,1)]"
          />
        </div>
        
        {/* ORBITING DARES (Treadmill Orbit Engine) */}
        <OrbitingDares setActiveChat={setActiveChat} />
      </div>
    </div>
  );
};

export default HeroEllipticalStream;

