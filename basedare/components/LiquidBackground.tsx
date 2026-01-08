'use client';
import React from 'react';
// THE ONLY FIX: Pointing to the correct folder
import { useIgnition } from '@/app/context/IgnitionContext';

export default function LiquidBackground() {
  const { ignitionActive } = useIgnition();

  return (
    <div 
      className="fixed inset-0 z-[-50] bg-transparent pointer-events-none overflow-hidden [transform:translateZ(0)] will-change-transform"
      style={{
        filter: ignitionActive 
          ? 'saturate(1.8) brightness(1.2)' 
          : 'saturate(1) brightness(1)',
        transition: ignitionActive 
          ? 'none' 
          : 'filter 0.8s ease-out'
      }}
    >
      
      <div className="absolute inset-0 bg-black/10" />
      
      {/* HIGH-FIDELITY SVG GRAIN LAYER */}
      <div 
        className="absolute -inset-[100%] w-[300%] h-[300%] mix-blend-color-dodge [transform:translateZ(0)] will-change-transform"
        style={{
          opacity: ignitionActive ? 0.15 : 0.03, // Surge on ignition
          animationDuration: ignitionActive ? '30s' : '60s', // Speed double
          animationName: 'grain',
          animationIterationCount: 'infinite',
          animationTimingFunction: 'ease-in-out',
          transition: 'opacity 0.2s ease-out, animation-duration 0.8s ease-out'
        }}
      >
        <svg className='w-full h-full' xmlns='http://www.w3.org/2000/svg'>
          <filter id='noiseFilter'>
            <feTurbulence 
              type='fractalNoise' 
              baseFrequency='0.6' 
              numOctaves='3' 
              stitchTiles='stitch' 
            />
            <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 20 -10" /> 
          </filter>
          <rect width='100%' height='100%' filter='url(#noiseFilter)' />
        </svg>
      </div>

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.3)_100%)]" />

      {/* IGNITION SHOCKWAVE LAYER */}
      {ignitionActive && (
        <div 
          className="absolute inset-0 bg-gradient-radial from-yellow-500/20 via-orange-500/10 to-transparent animate-pulse"
          style={{
            animation: 'ignitionPulse 1.2s ease-out'
          }}
        />
      )}

      <style jsx>{`
        @keyframes grain {
          0%, 100% { transform: translate3d(0, 0, 0); }
          10% { transform: translate3d(-5%, -5%, 0); }
          20% { transform: translate3d(-10%, 5%, 0); }
          30% { transform: translate3d(-15%, -10%, 0); }
          40% { transform: translate3d(-20%, 0%, 0); }
          50% { transform: translate3d(-25%, 5%, 0); }
          60% { transform: translate3d(-20%, -5%, 0); }
          70% { transform: translate3d(-15%, 10%, 0); }
          80% { transform: translate3d(-10%, -10%, 0); }
          90% { transform: translate3d(-5%, 5%, 0); }
        }

        @keyframes ignitionPulse {
          0% { 
            opacity: 0;
            transform: scale(0.8);
          }
          50% { 
            opacity: 1;
            transform: scale(1.1);
          }
          100% { 
            opacity: 0;
            transform: scale(1.3);
          }
        }
      `}</style>
    </div>
  );
}