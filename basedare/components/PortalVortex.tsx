'use client';

import React from 'react';

export default function PortalVortex() {
  return (
    // Fixed centering + underneath cards as background vortex
    <div className="fixed inset-0 pointer-events-none z-10 flex items-center justify-center">
      <div 
        className="relative w-[650px] h-[650px]"
        style={{ 
          transform: 'rotateX(75deg)',
          transformStyle: 'preserve-3d' 
        }}
      >
        <div className="relative w-full h-full rounded-full flex items-center justify-center overflow-visible">
          
          {/* 1. PRIMARY SPINNING VORTEX - Realistic Event Horizon (Yellow & Purple) */}
          <div 
            className="absolute inset-[-20%] z-0 opacity-95 mix-blend-color-dodge pointer-events-none rounded-full"
            style={{
              backgroundImage: `conic-gradient(from 0deg, transparent 0deg, #FACC15 90deg, transparent 180deg, #A855F7 270deg, transparent 360deg)`,
              animation: "spinVortex 8s linear infinite",
              filter: "blur(35px)",
              transform: 'scale(1.5)'
            }}
          />

          {/* 2. COUNTER-VORTEX LAYER - Creates Realistic Rotation (Yellow & Purple) */}
          <div 
            className="absolute inset-[-20%] z-0 opacity-70 mix-blend-screen pointer-events-none rounded-full"
            style={{
              backgroundImage: `conic-gradient(from 0deg, #A855F7, #FACC15, transparent)`,
              animation: "spinVortex 15s linear infinite reverse",
              filter: "blur(45px)",
              transform: 'scale(1.8)'
            }}
          />

          {/* 3. SWIRLING LIQUID - Yellow & Purple Only */}
          <div className="absolute inset-0 rounded-full animate-spin-slow mix-blend-screen opacity-90">
            <div 
              className="w-full h-full rounded-full"
              style={{
                background: 'conic-gradient(from 0deg, #FACC15, #a855f7, #000000, #FACC15)',
                filter: 'blur(40px)',
                boxShadow: '0 0 60px rgba(168, 85, 247, 0.4), 0 0 40px rgba(250, 204, 21, 0.3)'
              }}
            />
          </div>

          {/* 4. EVENT HORIZON - Black Hole Core with Rotating Center */}
          <div className="absolute inset-20 rounded-full bg-black shadow-[inset_0_0_40px_rgba(168,85,247,0.8)] overflow-hidden">
            {/* Rotating Center - Inspired by LivePotBubble */}
            <div 
              className="absolute inset-0 rounded-full opacity-60 mix-blend-color-dodge"
              style={{
                backgroundImage: `conic-gradient(from 0deg, transparent 0deg, #FACC15 90deg, transparent 180deg, #A855F7 270deg, transparent 360deg)`,
                animation: "spinVortex 6s linear infinite",
                filter: "blur(8px)"
              }}
            />
            {/* Counter-rotating inner layer */}
            <div 
              className="absolute inset-[10%] rounded-full opacity-40 mix-blend-screen"
              style={{
                backgroundImage: `conic-gradient(from 0deg, #A855F7, #FACC15, transparent)`,
                animation: "spinVortex 10s linear infinite reverse",
                filter: "blur(12px)"
              }}
            />
          </div>

          {/* 5. SHIMMERING HOLO EFFECT - Sparkles & Twinkle (Yellow & Purple) */}
          <div 
            className="absolute inset-0 rounded-full z-[5] pointer-events-none opacity-75"
            style={{
              backgroundImage: `url("https://assets.codepen.io/13471/sparkles.gif"), 
                               url(https://assets.codepen.io/13471/holo.png), 
                               linear-gradient(125deg, rgba(250, 204, 21, 0.25) 15%, rgba(250, 204, 21, 0.35) 30%, rgba(168, 85, 247, 0.3) 40%, rgba(168, 85, 247, 0.4) 60%, rgba(250, 204, 21, 0.25) 70%, rgba(168, 85, 247, 0.5) 85%)`,
              backgroundPosition: '50% 50%',
              backgroundSize: '160%',
              backgroundBlendMode: 'overlay',
              mixBlendMode: 'color-dodge',
              filter: 'brightness(1.2) contrast(1.25)',
              animation: 'holoSparkle 12s ease infinite'
            }}
          />

          {/* 6. HOLO GRADIENT SHIMMER - Yellow & Purple Only */}
          <div 
            className="absolute inset-0 rounded-full z-[3] pointer-events-none opacity-60"
            style={{
              backgroundImage: `linear-gradient(
                115deg,
                transparent 0%,
                #FACC15 25%,
                transparent 47%,
                transparent 53%,
                #A855F7 75%,
                transparent 100%
              )`,
              backgroundPosition: '50% 50%',
              backgroundSize: '300% 300%',
              mixBlendMode: 'color-dodge',
              filter: 'brightness(0.5) contrast(1)',
              animation: 'holoGradient 12s ease infinite'
            }}
          />

          {/* 7. 3D RINGS - Yellow & Purple Only */}
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full border"
              style={{
                inset: `${5 + i * 10}%`,
                borderWidth: '2px',
                borderStyle: i % 2 === 0 ? 'dashed' : 'solid',
                borderColor: i % 2 === 0 ? 'rgba(250, 204, 21, 0.3)' : 'rgba(168, 85, 247, 0.3)',
                animation: `spin ${8 + i * 3}s linear infinite ${i % 2 === 0 ? 'reverse' : 'normal'}`,
                transform: `translateZ(${i * 5}px)`,
                boxShadow: `0 0 ${10 + i * 5}px ${i % 2 === 0 ? 'rgba(250, 204, 21, 0.3)' : 'rgba(168, 85, 247, 0.3)'}`
              }}
            />
          ))}

          {/* 8. LIGHTNING RIM - Enhanced */}
          <div className="absolute inset-[-10px] rounded-full border-[6px] border-purple-500/40 blur-sm animate-pulse" />
          
          {/* 9. VERTICAL LIGHT BEAM */}
          <div 
            className="absolute bottom-1/2 left-1/2 -translate-x-1/2 w-[80%] h-[400px] bg-gradient-to-t from-purple-500/20 to-transparent blur-2xl"
            style={{ 
              transform: 'rotateX(-75deg) translateY(-50%)',
              transformOrigin: 'bottom center'
            }} 
          />

          {/* 10. ROTATING GAS/DUST PARTICLES - Spiral Layers */}
          {/* Outer Dust Ring 1 */}
          <div 
            className="absolute inset-[-30%] rounded-full z-[2] pointer-events-none opacity-70"
            style={{
              background: `radial-gradient(circle at 30% 30%, rgba(250, 204, 21, 0.4) 0%, transparent 50%),
                           radial-gradient(circle at 70% 70%, rgba(168, 85, 247, 0.4) 0%, transparent 50%),
                           radial-gradient(circle at 50% 20%, rgba(250, 204, 21, 0.3) 0%, transparent 40%),
                           radial-gradient(circle at 20% 80%, rgba(168, 85, 247, 0.3) 0%, transparent 40%)`,
              animation: "rotateDust 20s linear infinite",
              filter: "blur(15px)"
            }}
          />

          {/* Outer Dust Ring 2 - Counter-rotating */}
          <div 
            className="absolute inset-[-25%] rounded-full z-[2] pointer-events-none opacity-60"
            style={{
              background: `radial-gradient(circle at 60% 40%, rgba(168, 85, 247, 0.5) 0%, transparent 45%),
                           radial-gradient(circle at 40% 60%, rgba(250, 204, 21, 0.5) 0%, transparent 45%),
                           radial-gradient(circle at 80% 30%, rgba(250, 204, 21, 0.4) 0%, transparent 35%),
                           radial-gradient(circle at 30% 70%, rgba(168, 85, 247, 0.4) 0%, transparent 35%)`,
              animation: "rotateDust 25s linear infinite reverse",
              filter: "blur(12px)"
            }}
          />

          {/* Mid Dust Ring - Spiral Inward */}
          <div 
            className="absolute inset-[-15%] rounded-full z-[2] pointer-events-none opacity-80"
            style={{
              background: `conic-gradient(from 0deg, 
                           transparent 0deg,
                           rgba(250, 204, 21, 0.3) 30deg,
                           transparent 60deg,
                           rgba(168, 85, 247, 0.3) 90deg,
                           transparent 120deg,
                           rgba(250, 204, 21, 0.2) 150deg,
                           transparent 180deg,
                           rgba(168, 85, 247, 0.2) 210deg,
                           transparent 240deg,
                           rgba(250, 204, 21, 0.3) 270deg,
                           transparent 300deg,
                           rgba(168, 85, 247, 0.3) 330deg,
                           transparent 360deg)`,
              animation: "rotateDust 12s linear infinite",
              filter: "blur(8px)",
              maskImage: "radial-gradient(circle, transparent 30%, black 70%)",
              WebkitMaskImage: "radial-gradient(circle, transparent 30%, black 70%)"
            }}
          />

          {/* Inner Dust Spiral - Fast rotation */}
          <div 
            className="absolute inset-[10%] rounded-full z-[2] pointer-events-none opacity-90"
            style={{
              background: `conic-gradient(from 45deg, 
                           transparent 0deg,
                           rgba(250, 204, 21, 0.4) 45deg,
                           transparent 90deg,
                           rgba(168, 85, 247, 0.4) 135deg,
                           transparent 180deg,
                           rgba(250, 204, 21, 0.3) 225deg,
                           transparent 270deg,
                           rgba(168, 85, 247, 0.3) 315deg,
                           transparent 360deg)`,
              animation: "rotateDust 8s linear infinite reverse",
              filter: "blur(6px)",
              maskImage: "radial-gradient(circle, transparent 40%, black 80%)",
              WebkitMaskImage: "radial-gradient(circle, transparent 40%, black 80%)"
            }}
          />

          {/* Particle Streams - Multiple spiraling streams */}
          {[...Array(8)].map((_, i) => {
            const angle = (i / 8) * 360;
            const delay = i * 0.3;
            const duration = 10 + i * 0.5;
            return (
              <div
                key={`particle-${i}`}
                className="absolute top-1/2 left-1/2 pointer-events-none z-[2]"
                style={{
                  width: '200px',
                  height: '4px',
                  background: `linear-gradient(90deg, 
                    transparent 0%,
                    ${i % 2 === 0 ? 'rgba(250, 204, 21, 0.6)' : 'rgba(168, 85, 247, 0.6)'} 30%,
                    ${i % 2 === 0 ? 'rgba(250, 204, 21, 0.8)' : 'rgba(168, 85, 247, 0.8)'} 50%,
                    ${i % 2 === 0 ? 'rgba(250, 204, 21, 0.4)' : 'rgba(168, 85, 247, 0.4)'} 70%,
                    transparent 100%)`,
                  transformOrigin: '0 50%',
                  animation: `spiralInward${i} ${duration}s linear infinite`,
                  animationDelay: `${delay}s`,
                  filter: 'blur(2px)',
                  opacity: 0.7
                }}
              />
            );
          })}
        </div>
      </div>

      <style jsx>{`
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 10s linear infinite;
        }
        
        @keyframes spinVortex {
          from { transform: rotate(0deg) scale(1.5); }
          to { transform: rotate(360deg) scale(1.5); }
        }
        
        @keyframes holoSparkle {
          0%, 100% {
            opacity: 0.75;
            background-position: 50% 50%;
            filter: brightness(1.2) contrast(1.25);
          }
          5%, 8% {
            opacity: 1;
            background-position: 40% 40%;
            filter: brightness(0.8) contrast(1.2);
          }
          13%, 16% {
            opacity: 0.5;
            background-position: 50% 50%;
            filter: brightness(1.2) contrast(0.8);
          }
          35%, 38% {
            opacity: 1;
            background-position: 60% 60%;
            filter: brightness(1) contrast(1);
          }
          55% {
            opacity: 0.33;
            background-position: 45% 45%;
            filter: brightness(1.2) contrast(1.25);
          }
        }
        
        @keyframes holoGradient {
          0%, 100% {
            opacity: 0.5;
            background-position: 50% 50%;
            filter: brightness(0.5) contrast(1);
          }
          5%, 9% {
            background-position: 100% 100%;
            opacity: 1;
            filter: brightness(0.75) contrast(1.25);
          }
          13%, 17% {
            background-position: 0% 0%;
            opacity: 0.88;
          }
          35%, 39% {
            background-position: 100% 100%;
            opacity: 1;
            filter: brightness(0.5) contrast(1);
          }
          55% {
            background-position: 0% 0%;
            opacity: 1;
            filter: brightness(0.75) contrast(1.25);
          }
        }
        
        @keyframes rotateDust {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        ${[...Array(8)].map((_, i) => {
          const angle = (i / 8) * 360;
          return `
            @keyframes spiralInward${i} {
              0% {
                transform: rotate(${angle}deg) translateX(200px) scale(1);
                opacity: 0.8;
              }
              50% {
                opacity: 1;
              }
              100% {
                transform: rotate(${angle + 360}deg) translateX(50px) scale(0.3);
                opacity: 0;
              }
            }
          `;
        }).join('')}
      `}</style>
    </div>
  );
}