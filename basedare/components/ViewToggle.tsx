'use client';
import React from 'react';
import { useRouter } from 'next/navigation';

interface ViewToggleProps {
  view: 'FAN' | 'BUSINESS';
  setView: (view: 'FAN' | 'BUSINESS') => void;
}

export default function ViewToggle({ view, setView }: ViewToggleProps) {
  const router = useRouter();
  const isControl = view === 'BUSINESS';

  return (
    <div className="fixed top-24 right-6 z-[90]">
      {/* Premium Cutout Container - Liquid Glass with Notch */}
      <div 
        className="relative px-6 py-3 backdrop-blur-xl bg-black/30 border border-white/10 rounded-2xl"
        style={{
          clipPath: 'polygon(0% 0%, calc(100% - 20px) 0%, 100% 20px, 100% 100%, 20px 100%, 0% calc(100% - 20px))',
          boxShadow: `
            0 0 20px -5px rgba(168, 85, 247, 0.3),
            inset 0 1px 1px rgba(255, 255, 255, 0.1),
            inset 0 -1px 1px rgba(0, 0, 0, 0.3)
          `
        }}
      >
        {/* Inner glow */}
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
        
        {/* Content */}
        <div className="relative flex items-center gap-3">
          {/* Labels */}
          <span className={`text-[10px] font-black uppercase tracking-widest transition-colors ${
            !isControl ? 'text-purple-400' : 'text-gray-500'
          }`}>
            CHAOS
          </span>

          {/* Premium Neon Toggle Switch */}
          <button
            onClick={() => {
              if (!isControl) {
                // Switching to Control mode - show mode selection
                setView('BUSINESS');
              } else {
                setView('FAN');
              }
            }}
            className="relative w-14 h-7 focus:outline-none"
            aria-label={isControl ? 'Switch to Chaos mode' : 'Switch to Control mode'}
          >
            {/* Track */}
            <div
              className={`absolute inset-0 rounded-full transition-all duration-300 ${
                isControl
                  ? 'bg-gradient-to-r from-[#A855F7] via-[#C084FC] to-[#FACC15] shadow-[0_0_20px_rgba(168,85,247,0.6),inset_0_0_10px_rgba(250,204,21,0.2)]'
                  : 'bg-black/40 border border-white/10 shadow-[inset_0_0_10px_rgba(168,85,247,0.1)]'
              }`}
            />

            {/* Thumb/Slider */}
            <div
              className={`absolute top-0.5 left-0.5 w-6 h-6 rounded-full transition-all duration-300 ease-out transform ${
                isControl ? 'translate-x-7' : 'translate-x-0'
              } ${
                isControl
                  ? 'bg-white shadow-[0_0_15px_rgba(255,255,255,0.8),0_0_30px_rgba(250,204,21,0.4)]'
                  : 'bg-white/20 border border-white/30 shadow-[0_0_8px_rgba(168,85,247,0.3)]'
              }`}
            >
              {/* Inner glow for ON state */}
              {isControl && (
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white to-yellow-200/50 blur-sm opacity-60" />
              )}
            </div>

            {/* Animated glow ring when ON */}
            {isControl && (
              <div className="absolute inset-0 rounded-full animate-ping opacity-20">
                <div className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-500 to-yellow-500" />
              </div>
            )}
          </button>

          {/* Labels */}
          <span className={`text-[10px] font-black uppercase tracking-widest transition-colors ${
            isControl ? 'text-yellow-400' : 'text-gray-500'
          }`}>
            CONTROL
          </span>
        </div>

        {/* Corner accent - Premium cutout detail */}
        <div 
          className="absolute top-0 right-0 w-6 h-6 pointer-events-none"
          style={{
            clipPath: 'polygon(100% 0%, 100% 100%, 0% 100%)',
            background: 'linear-gradient(135deg, rgba(250, 204, 21, 0.2), transparent)',
            borderLeft: '1px solid rgba(250, 204, 21, 0.3)',
            borderBottom: '1px solid rgba(250, 204, 21, 0.3)'
          }}
        />
        <div 
          className="absolute bottom-0 left-0 w-6 h-6 pointer-events-none"
          style={{
            clipPath: 'polygon(0% 0%, 100% 0%, 0% 100%)',
            background: 'linear-gradient(315deg, rgba(168, 85, 247, 0.2), transparent)',
            borderRight: '1px solid rgba(168, 85, 247, 0.3)',
            borderTop: '1px solid rgba(168, 85, 247, 0.3)'
          }}
        />
      </div>
    </div>
  );
}