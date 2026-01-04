'use client';

import React, { useId } from 'react';

type CardProps = {
  badge: string;
  title: string;
  description: string;
  className?: string;
};

export default function PurpleCrackleHoloCard({
  badge,
  title,
  description,
  className = "",
}: CardProps) {
  // Unique ID ensures filters don't clash if you have multiple cards on screen
  const id = useId().replace(/:/g, "");
  const [bounty, streamer] = description.includes('|') ? description.split('|').map(s => s.trim()) : [description, ''];

  return (
    // 1. THE HITBOX (Stationary & Invisible Wrapper)
    // This keeps the hover state active even when the inner card moves.
    <div className={`relative group w-[260px] aspect-[2/3] ${className} z-0 hover:z-50 perspective-1000`}>
      
      {/* 2. THE VISIBLE CARD CONTAINER (Moves on Hover) */}
      <div className="relative w-full h-full transition-all duration-300 ease-out group-hover:-translate-y-4 group-hover:scale-105">
        
        {/* === LAYER A: SUPER SAIYAN AURA (Behind) === */}
        <div className="absolute inset-0 z-[-1] rounded-[24px] bg-purple-600/0 group-hover:bg-purple-600/40 blur-2xl transition-all duration-200 group-hover:scale-110 group-hover:opacity-100 animate-pulse" />
        
        {/* === LAYER B: THE ELECTRIC FORCEFIELD (The Crackle) === */}
        {/* Only visible on hover. Sits slightly outside the card border. */}
        <div className="absolute -inset-[12px] z-50 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-100">
          <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <defs>
              {/* FILTER 1: THE CORE BOLT (Thick, Violent) */}
              <filter id={`core-${id}`} x="-50%" y="-50%" width="200%" height="200%">
                <feTurbulence type="fractalNoise" baseFrequency="1.2" numOctaves="4" stitchTiles="stitch" result="noise">
                   {/* This animation creates the "frying" effect */}
                   <animate attributeName="seed" from="0" to="100" dur="0.3s" repeatCount="indefinite" />
                </feTurbulence>
                <feDisplacementMap in="SourceGraphic" in2="noise" scale="5" xChannelSelector="R" yChannelSelector="G" />
                <feGaussianBlur stdDeviation="0.5" />
                <feComponentTransfer>
                    <feFuncA type="linear" slope="3" /> 
                </feComponentTransfer>
              </filter>

              {/* FILTER 2: THE ARCS (Thin, Chaotic, Fast) */}
              <filter id={`sparks-${id}`} x="-50%" y="-50%" width="200%" height="200%">
                <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" seed="5" result="noise">
                   <animate attributeName="seed" from="0" to="100" dur="0.2s" repeatCount="indefinite" />
                </feTurbulence>
                <feDisplacementMap in="SourceGraphic" in2="noise" scale="12" xChannelSelector="R" yChannelSelector="G" />
              </filter>
            </defs>

            {/* The Border Rectangles applied with the filters */}
            {/* Core Purple Bolt */}
            <rect 
              x="6" y="6" width="88" height="88" rx="12" 
              fill="none" 
              stroke="#A855F7" 
              strokeWidth="3"
              filter={`url(#core-${id})`}
              strokeOpacity="1"
              className="drop-shadow-[0_0_10px_#A855F7]"
            />

            {/* White Hot Arcs */}
            <rect 
              x="4" y="4" width="92" height="92" rx="12" 
              fill="none" 
              stroke="#E9D5FF" 
              strokeWidth="1.5"
              filter={`url(#sparks-${id})`}
              strokeOpacity="0.8"
              className="drop-shadow-[0_0_5px_#fff]"
            />
          </svg>
        </div>

        {/* === LAYER C: THE CARD BODY (Clean Glass) === */}
        {/* This layer DOES NOT distort. It sits below the electricity. */}
        <div className="relative z-10 w-full h-full bg-black/80 backdrop-blur-xl border border-white/10 rounded-[20px] overflow-hidden flex flex-col shadow-2xl group-hover:border-[#A855F7]/80 transition-colors duration-300">
            
            {/* Holographic Sheen (Hover Only) */}
            <div 
                className="absolute inset-0 z-20 opacity-0 group-hover:opacity-30 transition-opacity duration-500 pointer-events-none mix-blend-color-dodge"
                style={{
                    backgroundImage: `linear-gradient(115deg, transparent 0%, transparent 40%, rgba(168, 85, 247, 0.8) 45%, rgba(255, 255, 255, 0.4) 50%, rgba(168, 85, 247, 0.8) 55%, transparent 60%, transparent 100%)`,
                    backgroundSize: '200% 200%',
                }}
            />

            {/* Content Top */}
            <div className="relative h-[65%] p-5 flex flex-col items-center justify-center text-center bg-gradient-to-b from-white/5 to-transparent">
                <div className="w-10 h-10 mb-3 rounded-full bg-black border border-[#FFD700]/30 flex items-center justify-center shadow-lg">
                   <span className="text-[8px] font-black text-[#FFD700] tracking-tighter">{`{BD}`}</span>
                </div>
                <h3 className="text-2xl font-black uppercase text-white leading-none tracking-tighter mb-2 drop-shadow-md z-10">
                  {title}
                </h3>
                <div className="inline-block px-2 py-0.5 rounded-full bg-purple-900/30 border border-purple-500/20 z-10">
                  <span className="text-[9px] font-mono text-purple-300 tracking-widest">{badge}</span>
                </div>
            </div>

            {/* Content Bottom */}
            <div className="h-[35%] bg-[#121212] border-t border-white/10 p-4 flex flex-col justify-center items-center relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 to-transparent opacity-50" />
                <p className="relative z-10 text-[9px] text-gray-500 uppercase tracking-[0.2em] mb-1">BOUNTY LOCKED</p>
                <p className="relative z-10 text-3xl font-black text-white tracking-tighter drop-shadow-[0_0_10px_rgba(168,85,247,0.5)]">
                    {bounty}
                </p>
                <p className="relative z-10 text-[10px] font-mono text-gray-400 mt-1 uppercase">
                    {streamer}
                </p>
            </div>
        </div>

      </div>
    </div>
  );
}