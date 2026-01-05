'use client';

import React from 'react';

export default function PortalVortex() {
  return (
    // Fixed centering + underneath cards as background vortex
    // Added 'will-change-transform' to force GPU layer promotion (Fixes flashing)
    <div className="fixed inset-0 pointer-events-none z-0 flex items-center justify-center overflow-hidden">
      <div 
        className="relative w-[650px] h-[650px] will-change-transform"
        style={{ 
          transform: 'rotateX(75deg)',
          transformStyle: 'preserve-3d' 
        }}
      >
        <div className="relative w-full h-full rounded-full flex items-center justify-center overflow-visible">
          
          {/* 1. PRIMARY SPINNING VORTEX - Realistic Event Horizon (Yellow & Purple) */}
          <div 
            className="absolute inset-[-20%] z-0 opacity-95 mix-blend-screen pointer-events-none rounded-full"
            style={{
              backgroundImage: `conic-gradient(from 0deg, transparent 0deg, #FACC15 90deg, transparent 180deg, #A855F7 270deg, transparent 360deg)`,
              animation: "spinVortex 12s linear infinite", // Slowed down slightly for stability
              filter: "blur(20px)", // Reduced from 35px to 20px for mobile performance
              transform: 'scale(1.5)'
            }}
          />

          {/* 2. COUNTER-VORTEX LAYER */}
          <div 
            className="absolute inset-[-20%] z-0 opacity-70 mix-blend-screen pointer-events-none rounded-full"
            style={{
              backgroundImage: `conic-gradient(from 0deg, #A855F7, #FACC15, transparent)`,
              animation: "spinVortex 20s linear infinite reverse",
              filter: "blur(25px)", // Reduced from 45px
              transform: 'scale(1.8)'
            }}
          />

          {/* 3. CORE GLOW */}
          <div className="absolute inset-0 rounded-full animate-spin-slow mix-blend-screen opacity-90">
            <div 
              className="w-full h-full rounded-full"
              style={{
                background: 'conic-gradient(from 0deg, #FACC15, #a855f7, #000000, #FACC15)',
                filter: 'blur(30px)',
              }}
            />
          </div>

          {/* 4. EVENT HORIZON - Black Hole Core */}
          <div className="absolute inset-20 rounded-full bg-black shadow-[inset_0_0_40px_rgba(168,85,247,0.8)] overflow-hidden">
            <div 
              className="absolute inset-0 rounded-full opacity-60 mix-blend-color-dodge"
              style={{
                backgroundImage: `conic-gradient(from 0deg, transparent 0deg, #FACC15 90deg, transparent 180deg, #A855F7 270deg, transparent 360deg)`,
                animation: "spinVortex 8s linear infinite",
                filter: "blur(8px)"
              }}
            />
          </div>

          {/* 5. VERTICAL BEAM */}
          <div 
            className="absolute bottom-1/2 left-1/2 -translate-x-1/2 w-[80%] h-[400px] bg-gradient-to-t from-purple-500/20 to-transparent blur-2xl"
            style={{ 
              transform: 'rotateX(-75deg) translateY(-50%)',
              transformOrigin: 'bottom center',
              pointerEvents: 'none'
            }} 
          />

        </div>
      </div>

      <style jsx>{`
        @keyframes spinVortex {
          from { transform: rotate(0deg) scale(1.5); }
          to { transform: rotate(360deg) scale(1.5); }
        }
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 15s linear infinite;
        }
      `}</style>
    </div>
  );
}
