'use client';
import React from 'react';

export default function LiquidBackground() {
  return (
    <div className="fixed inset-0 z-[-50] bg-black pointer-events-none overflow-hidden">
      
      {/* 1. Deep Base */}
      <div className="absolute inset-0 bg-black" />

      {/* 2. The Liquid Oil SVG Filter (3% Opacity as requested) */}
      <div className="absolute -inset-[100%] w-[300%] h-[300%] opacity-[0.03] mix-blend-color-dodge animate-grain">
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

      {/* 3. Vignette to focus the eye on your Galaxy */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,1)_100%)]" />

      <style jsx>{`
        @keyframes grain {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(-5%, -5%); }
        }
        .animate-grain {
          animation: grain 20s infinite ease-in-out;
        }
      `}</style>
    </div>
  );
}
