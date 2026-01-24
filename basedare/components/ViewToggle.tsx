'use client';
import React, { useState } from 'react';

interface ViewToggleProps {
  view: 'FAN' | 'BUSINESS';
  setView: (view: 'FAN' | 'BUSINESS') => void;
}

export default function ViewToggle({ view, setView }: ViewToggleProps) {
  const isControl = view === 'BUSINESS';
  const [isPressed, setIsPressed] = useState(false);

  // Haptic feedback helper
  const triggerHaptic = () => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(15);
    }
  };

  // Mobile switch handler - uses prop setView for consistency with desktop
  const handleMobileSwitch = () => {
    try {
      const newView = isControl ? 'FAN' : 'BUSINESS';
      console.log('[ViewToggle] MOBILE CLICK DETECTED - switching to', newView);
      console.log('[ViewToggle] Current isControl:', isControl, 'view prop:', view);

      // Click confirmed working - removed debug alert

      // Use the same setView as desktop (handleViewChange from page.tsx)
      setView(newView);
      console.log('[ViewToggle] setView called with', newView);
      triggerHaptic();
    } catch (error) {
      console.error('[ViewToggle] ERROR in handleMobileSwitch:', error);
    }
  };

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
          MOBILE - Tap Target Wrapper + Visual Button
          ============================================ */}
      <div
        className="md:hidden fixed top-[72px] right-1 z-[9999] touch-manipulation select-none cursor-pointer"
        style={{
          // Large invisible tap area - less top padding, more bottom to align tap with visual
          padding: '8px 16px 24px 16px',
          WebkitTapHighlightColor: 'transparent',
        }}
        onClick={() => {
          triggerHaptic();
          handleMobileSwitch();
        }}
        onMouseDown={() => setIsPressed(true)}
        onMouseUp={() => setIsPressed(false)}
        onMouseLeave={() => setIsPressed(false)}
        onTouchStart={() => setIsPressed(true)}
        onTouchEnd={() => setIsPressed(false)}
      >
        {/* Visual Button - Smaller */}
        <div
          className="rounded-xl font-bold text-[10px] uppercase tracking-wide transition-all duration-100 flex items-center justify-center gap-1.5"
          style={{
            padding: '10px 14px',
            transform: isPressed ? 'scale(0.96)' : 'scale(1)',
            background: isControl
              ? 'linear-gradient(175deg, #ffffff 0%, #f0f0f0 20%, #d8d8d8 45%, #c5c5c5 55%, #e0e0e0 80%, #f5f5f5 100%)'
              : 'linear-gradient(175deg, #3a3a42 0%, #28282e 20%, #1a1a1e 45%, #151518 55%, #222226 80%, #2e2e34 100%)',
            color: isControl ? '#1a1a1a' : '#ffffff',
            boxShadow: isPressed
              ? isControl
                ? 'inset 0 2px 4px rgba(0,0,0,0.15), 0 1px 2px rgba(0,0,0,0.1)'
                : 'inset 0 2px 4px rgba(0,0,0,0.4), 0 1px 2px rgba(0,0,0,0.2)'
              : isControl
                ? 'inset 0 1px 2px rgba(255,255,255,0.9), 0 4px 12px rgba(0,0,0,0.15)'
                : 'inset 0 1px 2px rgba(255,255,255,0.1), 0 4px 12px rgba(0,0,0,0.4)',
          }}
        >
          {isControl ? (
            <>
              <span style={{ color: '#A855F7' }}>◀</span>
              <span>CHAOS</span>
            </>
          ) : (
            <>
              <span>CONTROL</span>
              <span style={{ color: '#FACC15' }}>▶</span>
            </>
          )}
        </div>
      </div>
    </>
  );
}
