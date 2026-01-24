'use client';
import React, { useRef, useState, useCallback, useEffect } from 'react';

interface ViewToggleProps {
  view: 'FAN' | 'BUSINESS';
  setView: (view: 'FAN' | 'BUSINESS') => void;
}

export default function ViewToggle({ view, setView }: ViewToggleProps) {
  const isControl = view === 'BUSINESS';

  return (
    <>
      {/* ============================================
          DESKTOP - Original Premium Neumorphic Switch
          ============================================ */}
      <div className="hidden md:block fixed top-24 right-6 z-[90]">
        <div className="relative flex items-center gap-4">
          {/* CHAOS Label */}
          <span className={`text-xs font-black uppercase tracking-widest transition-all duration-500 ${
            !isControl ? 'text-purple-400 drop-shadow-[0_0_8px_rgba(168,85,247,0.8)]' : 'text-zinc-600'
          }`}>
            CHAOS
          </span>

          {/* The Switch Track */}
          <button
            onClick={() => setView(isControl ? 'FAN' : 'BUSINESS')}
            className="relative cursor-pointer flex items-center w-[180px] h-[72px] rounded-full focus:outline-none"
            style={{
              background: 'linear-gradient(145deg, #0a0a0f, #15151f)',
              boxShadow: `
                inset 4px 4px 8px rgba(0, 0, 0, 0.8),
                inset -4px -4px 8px rgba(40, 40, 60, 0.4),
                0 0 20px rgba(0, 0, 0, 0.5)
              `
            }}
            aria-label={isControl ? 'Switch to Chaos mode' : 'Switch to Control mode'}
          >
            {/* Left Indicator (CHAOS/Purple) */}
            <div
              className="absolute left-[8%] w-[36%] h-[55%] rounded-l-full overflow-hidden transition-all duration-500"
              style={{
                background: !isControl
                  ? 'linear-gradient(180deg, #E9D5FF 10%, #C084FC 30%, #A855F7 60%, #9333EA 75%, #7C3AED)'
                  : 'linear-gradient(180deg, #1a1a2e, #0f0f1a 60%, #1a1a2e)',
                boxShadow: !isControl
                  ? 'inset 0 0 2px rgba(168, 85, 247, 0.6), inset 0 0 8px rgba(168, 85, 247, 0.4), 0 0 20px rgba(168, 85, 247, 0.5)'
                  : 'inset 0 0 10px rgba(0, 0, 0, 0.9), inset 8px 8px 12px rgba(0, 0, 0, 0.8)'
              }}
            >
              <div
                className="absolute inset-0 opacity-30"
                style={{
                  backgroundImage: `url("data:image/svg+xml;base64,PHN2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHdpZHRoPScyMDAnIGhlaWdodD0nMjAwJz48ZmlsdGVyIGlkPSduJyB4PScwJyB5PScwJz48ZmVUdXJidWxlbmNlIHR5cGU9J2ZyYWN0YWxOb2lzZScgYmFzZUZyZXF1ZW5jeT0nMC43JyBudW1PY3RhdmVzPSczJyBzdGl0Y2hUaWxlcz0nc3RpdGNoJy8+PC9maWx0ZXI+PHJlY3Qgd2lkdGg9JzIwMCcgaGVpZ2h0PScyMDAnIGZpbHRlcj0ndXJsKCNuKScgb3BhY2l0eT0nMC41Jy8+PC9zdmc+")`
                }}
              />
            </div>

            {/* Right Indicator (CONTROL/Gold) */}
            <div
              className="absolute right-[8%] w-[36%] h-[55%] rounded-r-full overflow-hidden transition-all duration-500"
              style={{
                background: isControl
                  ? 'linear-gradient(180deg, #FEF9C3 10%, #FDE047 30%, #FACC15 60%, #EAB308 75%, #CA8A04)'
                  : 'linear-gradient(180deg, #1a1a2e, #0f0f1a 60%, #1a1a2e)',
                boxShadow: isControl
                  ? 'inset 0 0 2px rgba(250, 204, 21, 0.6), inset 0 0 8px rgba(250, 204, 21, 0.4), 0 0 20px rgba(250, 204, 21, 0.5)'
                  : 'inset 0 0 10px rgba(0, 0, 0, 0.9), inset -8px 8px 12px rgba(0, 0, 0, 0.8)'
              }}
            >
              <div
                className="absolute inset-0 opacity-30"
                style={{
                  backgroundImage: `url("data:image/svg+xml;base64,PHN2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHdpZHRoPScyMDAnIGhlaWdodD0nMjAwJz48ZmlsdGVyIGlkPSduJyB4PScwJyB5PScwJz48ZmVUdXJidWxlbmNlIHR5cGU9J2ZyYWN0YWxOb2lzZScgYmFzZUZyZXF1ZW5jeT0nMC43JyBudW1PY3RhdmVzPSczJyBzdGl0Y2hUaWxlcz0nc3RpdGNoJy8+PC9maWx0ZXI+PHJlY3Qgd2lkdGg9JzIwMCcgaGVpZ2h0PScyMDAnIGZpbHRlcj0ndXJsKCNuKScgb3BhY2l0eT0nMC41Jy8+PC9zdmc+")`
                }}
              />
            </div>

            {/* The Sliding Button */}
            <div
              className="absolute z-10 w-[50%] h-[75%] rounded-full transition-all duration-500 ease-[cubic-bezier(1,0,1,1)]"
              style={{
                left: isControl ? '45%' : '5%',
                background: 'linear-gradient(160deg, #e8e8f0 40%, #a0a0b0 70%)',
                boxShadow: `
                  2px 2px 4px rgba(0, 0, 0, 0.6),
                  4px 4px 8px rgba(0, 0, 0, 0.4),
                  8px 12px 16px rgba(0, 0, 0, 0.5),
                  inset 0 2px 4px rgba(255, 255, 255, 0.4)
                `
              }}
            >
              <div
                className="absolute left-[8%] top-[12%] w-[38%] h-[76%] rounded-full"
                style={{
                  background: 'linear-gradient(-50deg, #f0f0f5 20%, #c8c8d0 80%)',
                  boxShadow: 'inset 1px 1px 3px rgba(255, 255, 255, 0.8)'
                }}
              />
              <div
                className="absolute right-[8%] top-[12%] w-[38%] h-[76%] rounded-full"
                style={{
                  background: 'linear-gradient(-50deg, #f0f0f5 20%, #b8b8c5 80%)',
                  boxShadow: 'inset 1px 1px 2px rgba(255, 255, 255, 0.6)'
                }}
              />
            </div>
          </button>

          {/* CONTROL Label */}
          <span className={`text-xs font-black uppercase tracking-widest transition-all duration-500 ${
            isControl ? 'text-zinc-900' : 'text-zinc-600'
          }`}>
            CONTROL
          </span>
        </div>
      </div>

      {/* ============================================
          MOBILE - Compact iOS-style Slider
          ============================================ */}
      <MobileSlider view={view} setView={setView} isControl={isControl} />
    </>
  );
}

// Separate component for mobile slider with drag support
function MobileSlider({ view, setView, isControl }: { view: 'FAN' | 'BUSINESS'; setView: (v: 'FAN' | 'BUSINESS') => void; isControl: boolean }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const hasDraggedRef = useRef(false);
  const startXRef = useRef(0);
  const startPosRef = useRef(0);
  const currentPosRef = useRef(isControl ? 1 : 0);
  const [renderPos, setRenderPos] = useState(isControl ? 1 : 0);

  useEffect(() => {
    const newPos = isControl ? 1 : 0;
    currentPosRef.current = newPos;
    setRenderPos(newPos);
  }, [isControl]);

  const handleStart = useCallback((clientX: number) => {
    setIsDragging(true);
    hasDraggedRef.current = false;
    startXRef.current = clientX;
    startPosRef.current = currentPosRef.current;
  }, []);

  const handleMove = useCallback((clientX: number) => {
    if (!isDragging || !trackRef.current) return;
    const deltaX = clientX - startXRef.current;
    if (Math.abs(deltaX) > 5) hasDraggedRef.current = true;
    const trackWidth = trackRef.current.offsetWidth;
    const maxTravel = trackWidth - 28 - 6;
    let newPos = startPosRef.current + (deltaX / maxTravel);
    newPos = Math.max(0, Math.min(1, newPos));
    currentPosRef.current = newPos;
    setRenderPos(newPos);
  }, [isDragging]);

  const handleEnd = useCallback(() => {
    if (!isDragging) return;
    setIsDragging(false);
    if (hasDraggedRef.current) {
      if (currentPosRef.current > 0.5) {
        setView('BUSINESS');
        currentPosRef.current = 1;
        setRenderPos(1);
      } else {
        setView('FAN');
        currentPosRef.current = 0;
        setRenderPos(0);
      }
    } else {
      const newView = isControl ? 'FAN' : 'BUSINESS';
      setView(newView);
      const newPos = newView === 'BUSINESS' ? 1 : 0;
      currentPosRef.current = newPos;
      setRenderPos(newPos);
    }
    hasDraggedRef.current = false;
  }, [isDragging, isControl, setView]);

  const thumbLeft = 3 + renderPos * 38;

  return (
    <div className="md:hidden fixed top-20 right-4 z-[80]">
      <div className="flex items-center gap-2">
        <span className={`text-[10px] font-bold uppercase tracking-wider transition-all duration-300 ${
          !isControl ? 'text-[#A855F7]' : 'text-zinc-500'
        }`}>
          Chaos
        </span>

        <div
          ref={trackRef}
          className="relative w-[72px] h-[32px] rounded-full cursor-pointer select-none touch-none"
          style={{
            background: isControl ? 'rgba(250, 204, 21, 0.25)' : 'rgba(168, 85, 247, 0.25)',
            boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2), 0 1px 2px rgba(0,0,0,0.1)',
            border: '1px solid rgba(255,255,255,0.1)',
            transition: isDragging ? 'none' : 'background 0.3s ease',
          }}
          onMouseDown={(e) => { e.preventDefault(); handleStart(e.clientX); }}
          onMouseMove={(e) => handleMove(e.clientX)}
          onMouseUp={handleEnd}
          onMouseLeave={() => { if (isDragging) handleEnd(); }}
          onTouchStart={(e) => handleStart(e.touches[0].clientX)}
          onTouchMove={(e) => { e.preventDefault(); handleMove(e.touches[0].clientX); }}
          onTouchEnd={handleEnd}
        >
          <div
            className="absolute top-[3px] w-[26px] h-[26px] rounded-full pointer-events-none"
            style={{
              left: `${thumbLeft}px`,
              transition: isDragging ? 'none' : 'left 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
              background: 'linear-gradient(145deg, #ffffff 0%, #f0f0f0 100%)',
              boxShadow: '0 2px 6px rgba(0,0,0,0.25), 0 1px 2px rgba(0,0,0,0.15)',
            }}
          >
            <div className="absolute inset-[1px] rounded-full" style={{
              background: 'linear-gradient(180deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0) 60%)',
            }} />
          </div>
        </div>

        <span className={`text-[10px] font-bold uppercase tracking-wider transition-all duration-300 ${
          isControl ? 'text-[#FACC15]' : 'text-zinc-500'
        }`}>
          Control
        </span>
      </div>
    </div>
  );
}
