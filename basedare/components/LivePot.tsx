'use client';

import { useEffect, useState, useRef } from 'react';

export default function LivePot() {
  const [offsetY, setOffsetY] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    // ... (Your existing scroll logic) ...
    const updatePosition = () => {
      const footer = document.getElementById('site-footer');
      if (!footer) return;

      const footerRect = footer.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      
      const distanceToBottom = windowHeight - footerRect.top;
      
      if (distanceToBottom > 0) {
        setOffsetY(-distanceToBottom); 
      } else {
        setOffsetY(0);
      }
    };

    const onScroll = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(updatePosition);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    updatePosition();

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <div 
      className="
        fixed z-40 will-change-transform origin-bottom-right
        bottom-4 right-2 scale-75
        md:bottom-6 md:right-6 md:scale-100
      "
      style={{ 
        transform: `translateY(${offsetY}px)`,
        transition: 'transform 400ms cubic-bezier(0.16, 1, 0.3, 1)' 
      }} 
    >
      {/* SAFARI BATTLE ARMOR:
        1. overflow-hidden: Basic clipping
        2. isolate: New stacking context
        3. translateZ(0): Force GPU compositing layer
        4. WebkitMaskImage: The nuclear option to cut the blur
      */}
      <div 
        className="
          bg-black/90 border border-purple-500/30 p-4 rounded-2xl 
          backdrop-blur-md shadow-2xl 
          overflow-hidden isolate [transform:translateZ(0)]
        "
        style={{
          WebkitBackdropFilter: 'blur(12px)',
          WebkitMaskImage: '-webkit-radial-gradient(white, black)', // The final fix
        }}
      >
         <div className="text-white font-mono text-sm flex items-center gap-2">
            <span className="text-purple-400 animate-pulse">●</span> LIVE POT
         </div>
      </div>
    </div>
  );
}


