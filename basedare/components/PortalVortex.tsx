'use client';

import React, { useMemo } from 'react';

// Generate random number in range
const random = (min: number, max: number) => Math.random() * (max - min) + min;

// Color palettes for light streams
const COLOR_PALETTES = [
  ['rgba(168, 85, 247, 0)', 'rgba(168, 85, 247, 0.7)', 'rgba(139, 92, 246, 1)', 'rgba(168, 85, 247, 0.7)', 'rgba(168, 85, 247, 0)'],
  ['rgba(255, 215, 0, 0)', 'rgba(255, 215, 0, 0.7)', 'rgba(251, 191, 36, 1)', 'rgba(255, 215, 0, 0.7)', 'rgba(255, 215, 0, 0)'],
  ['rgba(250, 204, 21, 0)', 'rgba(250, 204, 21, 0.6)', 'rgba(234, 179, 8, 1)', 'rgba(250, 204, 21, 0.6)', 'rgba(250, 204, 21, 0)'],
];

export default function PortalVortex() {
  // Generate light streams for accretion disc
  const streams = useMemo(() =>
    Array.from({ length: 80 }, (_, i) => {
      const colorPalette = COLOR_PALETTES[Math.floor(random(0, COLOR_PALETTES.length))];
      return {
        id: i,
        angle: random(0, 360),
        startRadius: random(320, 480),
        duration: random(2, 4.5),
        delay: random(0, 3),
        gradient: `linear-gradient(90deg, ${colorPalette.join(', ')})`,
        width: random(60, 150),
        height: random(2, 3),
      };
    }),
    []
  );

  return (
    // Fixed centering + underneath cards as background vortex
    // Added 'will-change-transform' to force GPU layer promotion (Fixes flashing)
    <div className="fixed inset-0 pointer-events-none z-0 flex items-center justify-center overflow-hidden">
      <div
        className="relative w-[650px] h-[650px] will-change-transform"
        style={{
          transform: 'rotateX(75deg) translateZ(0)',
          transformStyle: 'preserve-3d',
          backfaceVisibility: 'hidden',
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

      {/* ============================================
          ACCRETION DISC - Thin layer BENEATH the vortex
          Light streams being sucked INTO the center
          ============================================ */}
      <div
        className="absolute w-[950px] h-[950px] will-change-transform"
        style={{
          transform: 'rotateX(75deg) translateZ(-50px)',
          transformStyle: 'preserve-3d',
          marginTop: '60px'
        }}
      >
        {/* Light streams radiating inward */}
        {streams.map((stream) => (
          <div
            key={stream.id}
            className="accretion-stream"
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              width: `${stream.width}px`,
              height: `${stream.height}px`,
              background: stream.gradient,
              borderRadius: '2px',
              transformOrigin: 'left center',
              transform: `rotate(${stream.angle}deg) translateX(${stream.startRadius}px)`,
              animation: `suckInward ${stream.duration}s ${stream.delay}s linear infinite`,
              opacity: 0,
              filter: 'blur(0.5px)',
            }}
          />
        ))}

        {/* Thin glowing ring beneath */}
        <div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[200px] h-[200px] rounded-full"
          style={{
            boxShadow: '0 0 40px 15px rgba(168, 85, 247, 0.2), 0 0 80px 30px rgba(255, 215, 0, 0.1)',
          }}
        />
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
        @keyframes suckInward {
          0% {
            opacity: 0;
            transform: rotate(var(--angle, 0deg)) translateX(var(--start, 400px)) scaleX(1);
          }
          15% {
            opacity: 0.9;
          }
          85% {
            opacity: 0.7;
          }
          100% {
            opacity: 0;
            transform: rotate(var(--angle, 0deg)) translateX(80px) scaleX(0.2);
          }
        }
        .accretion-stream {
          --angle: 0deg;
          --start: 400px;
        }
      `}</style>
    </div>
  );
}
