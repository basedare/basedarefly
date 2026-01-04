'use client';

import React, { useId } from 'react';

type CardProps = {
  badge: string;
  title: string;
  description: string;
  className?: string;
};

export default function RuggedElectricCard({
  badge,
  title,
  description,
  className = "",
}: CardProps) {
  const id = useId().replace(/:/g, "");
  // Parse description: "50000 BD | @xQc"
  const [bounty, streamer] = description.includes('|') ? description.split('|').map(s => s.trim()) : [description, ''];

  return (
    // 1. HITBOX - Stationary to prevent glitching
    <div className={`relative group w-[280px] h-[400px] ${className} z-0 hover:z-50 perspective-1000`}>
      
      {/* 2. RUGGED ELECTRIC BORDER (Hover Only) */}
      {/* This sits BEHIND the card (-inset) and creates the jagged edges */}
      <div className="absolute -inset-[15px] z-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-100">
        <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          <defs>
            <filter id={`rugged-${id}`} x="-50%" y="-50%" width="200%" height="200%">
              {/* Turbulence = The static noise */}
              <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="4" stitchTiles="stitch" result="noise">
                 {/* Animate seed for crackle speed */}
                 <animate attributeName="seed" from="0" to="100" dur="0.2s" repeatCount="indefinite" />
              </feTurbulence>
              {/* Displacement = The jagged tearing effect */}
              <feDisplacementMap in="SourceGraphic" in2="noise" scale="6" xChannelSelector="R" yChannelSelector="G" />
              <feGaussianBlur stdDeviation="0.5" />
            </filter>
          </defs>

          {/* The Border Stroke */}
          <rect 
            x="5" y="5" width="90" height="90" rx="10" 
            fill="none" 
            stroke="#A855F7" 
            strokeWidth="3"
            filter={`url(#rugged-${id})`}
            className="drop-shadow-[0_0_15px_#A855F7]"
            opacity="1"
          />
        </svg>
      </div>

      {/* 3. THE CARD CONTENT (Restored Glass/Honey Design) */}
      <div className="relative w-full h-full transition-transform duration-300 ease-out group-hover:-translate-y-2">
        
        {/* Container */}
        <div className="relative z-10 w-full h-full bg-black/80 backdrop-blur-xl border border-white/20 rounded-2xl overflow-hidden flex flex-col shadow-[0_0_40px_rgba(0,0,0,0.5)] group-hover:border-[#A855F7]/50 transition-colors">
            
            {/* TOP SECTION: Glass / Info */}
            <div className="relative h-[65%] p-6 flex flex-col items-center justify-center text-center bg-gradient-to-b from-white/10 to-transparent z-10">
                {/* Logo Badge */}
                <div className="w-14 h-14 mb-4 rounded-full bg-black border-2 border-[#FFD700] shadow-[0_0_15px_rgba(255,215,0,0.4)] flex items-center justify-center">
                   <span className="text-[10px] font-black text-[#FFD700] tracking-tighter">{`{BD}`}</span>
                </div>

                {/* Title - Allowed to wrap, adjusted size */}
                <h3 className="text-2xl font-black uppercase text-white leading-tight tracking-tighter mb-3 drop-shadow-md break-words w-full">
                  {title}
                </h3>

                {/* Timer Badge */}
                <div className="text-purple-300 text-[10px] font-mono uppercase tracking-widest mb-1">
                    Countdown
                </div>
                <div className="px-4 py-1 rounded-full bg-purple-900/40 border border-purple-500/30 text-xl font-mono font-bold text-white shadow-[0_0_10px_rgba(168,85,247,0.5)]">
                  {badge}
                </div>
            </div>

            {/* BOTTOM SECTION: Honey/Gold Gradient (Restored from GlassCard3D) */}
            <div className="absolute bottom-0 left-0 right-0 h-[35%] z-20 border-t border-[#FFD700]/50 overflow-hidden"
                 style={{
                   background: 'linear-gradient(to top, #8B4513 0%, #B8860B 50%, #FFD700 100%)'
                 }}
            >
                {/* Noise Texture Overlay */}
                <div className="absolute inset-0 opacity-20 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] mix-blend-overlay" />
                
                {/* Fluid Highlight Top */}
                <div className="absolute top-0 left-0 right-0 h-4 bg-[#FFD700] blur-md opacity-80" />

                <div className="relative z-10 w-full h-full flex flex-col items-center justify-center p-4">
                    <p className="text-[10px] text-[#422006] font-black uppercase tracking-[0.3em] mb-1">
                        BOUNTY LOCKED
                    </p>
                    <p className="text-3xl font-black text-white drop-shadow-md tracking-tighter">
                        {bounty}
                    </p>
                    <p className="text-xs font-mono text-[#422006] mt-1 font-bold uppercase opacity-80">
                        {streamer}
                    </p>
                </div>
            </div>

            {/* 4. GLOSS REFLECTIONS */}
            <div className="absolute inset-0 rounded-2xl border border-white/10 pointer-events-none z-30" />
            <div className="absolute top-0 right-0 w-3/4 h-full bg-gradient-to-l from-white/5 to-transparent skew-x-12 pointer-events-none z-30" />
        </div>

      </div>
    </div>
  );
}
