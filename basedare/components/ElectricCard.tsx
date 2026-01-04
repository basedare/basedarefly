'use client';

import React, { useId, useMemo } from 'react';

type CardProps = {
  badge: string;
  title: string;
  description: string;
  className?: string;
  variant?: "swirl" | "hue";
  color?: string;
};

export default function ElectricCard({
  badge,
  title,
  description,
  className = "",
  variant = "swirl",
  color = "#FACC15", // Brand Gold
}: CardProps) {
  const id = useId().replace(/:/g, "");
  // Parse description: "50000 BD | @xQc"
  const [bounty, streamer] = description.includes('|') 
    ? description.split('|').map(s => s.trim()) 
    : [description, ''];

  // Premium filter IDs
  const filterIds = useMemo(() => {
    const key = Math.random().toString(36).slice(2, 8);
    return {
      swirl: `swirl-${key}`,
      hue: `hue-${key}`,
    };
  }, []);

  const filterURL = variant === "hue" ? `url(#${filterIds.hue})` : `url(#${filterIds.swirl})`;

  return (
    // 1. PREMIUM ELECTRIC CARD WRAPPER
    <div className={`relative group w-[280px] h-[420px] ${className} z-0 hover:z-50 perspective-1000`}>
      
      {/* Premium SVG Filters - Swirl/Hue variants */}
      <svg className="absolute w-0 h-0 overflow-hidden" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <defs>
          {/* SWIRL - Premium displacement + traveling turbulence */}
          <filter id={filterIds.swirl} colorInterpolationFilters="sRGB" x="-20%" y="-20%" width="140%" height="140%">
            <feTurbulence type="turbulence" baseFrequency="0.02" numOctaves="10" result="noise1" seed="1" />
            <feOffset in="noise1" dx="0" dy="0" result="offsetNoise1">
              <animate attributeName="dy" values="700; 0" dur="6s" repeatCount="indefinite" calcMode="linear" />
            </feOffset>
            <feTurbulence type="turbulence" baseFrequency="0.02" numOctaves="10" result="noise2" seed="1" />
            <feOffset in="noise2" dx="0" dy="0" result="offsetNoise2">
              <animate attributeName="dy" values="0; -700" dur="6s" repeatCount="indefinite" calcMode="linear" />
            </feOffset>
            <feTurbulence type="turbulence" baseFrequency="0.02" numOctaves="10" result="noise3" seed="2" />
            <feOffset in="noise3" dx="0" dy="0" result="offsetNoise3">
              <animate attributeName="dx" values="490; 0" dur="6s" repeatCount="indefinite" calcMode="linear" />
            </feOffset>
            <feTurbulence type="turbulence" baseFrequency="0.02" numOctaves="10" result="noise4" seed="2" />
            <feOffset in="noise4" dx="0" dy="0" result="offsetNoise4">
              <animate attributeName="dx" values="0; -490" dur="6s" repeatCount="indefinite" calcMode="linear" />
            </feOffset>
            <feComposite in="offsetNoise1" in2="offsetNoise2" result="part1" />
            <feComposite in="offsetNoise3" in2="offsetNoise4" result="part2" />
            <feBlend in="part1" in2="part2" mode="color-dodge" result="combinedNoise" />
            <feDisplacementMap in="SourceGraphic" in2="combinedNoise" scale="30" xChannelSelector="R" yChannelSelector="B" />
          </filter>

          {/* HUE - Cyberpunk rainbow effect */}
          <filter id={filterIds.hue} colorInterpolationFilters="sRGB" x="-20%" y="-20%" width="140%" height="140%">
            <feTurbulence type="turbulence" baseFrequency="0.02" numOctaves="7" />
            <feColorMatrix type="hueRotate" result="pt1">
              <animate attributeName="values" values="0;360;" dur=".6s" repeatCount="indefinite" calcMode="paced" />
            </feColorMatrix>
            <feComposite />
            <feTurbulence type="turbulence" baseFrequency="0.03" numOctaves="7" seed="5" />
            <feColorMatrix type="hueRotate" result="pt2">
              <animate attributeName="values" values="0; 333; 199; 286; 64; 168; 256; 157; 360;" dur="5s" repeatCount="indefinite" calcMode="paced" />
            </feColorMatrix>
            <feBlend in="pt1" in2="pt2" mode="normal" result="combinedNoise" />
            <feDisplacementMap in="SourceGraphic" scale="30" xChannelSelector="R" yChannelSelector="B" />
          </filter>
        </defs>
      </svg>

      {/* Premium Glow Layers - Only on hover */}
      <div className="absolute -inset-[20px] z-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500">
        <div className="absolute inset-0 rounded-3xl border-2 border-[#FACC15]/40 blur-xl group-hover:opacity-100" style={{ filter: 'none' }} />
        <div className="absolute inset-0 rounded-3xl border border-[#A855F7]/60 blur-2xl group-hover:opacity-100" />
      </div>

      {/* 2. CARD BODY - Premium Liquid Glass */}
      <div 
        className="relative w-full h-full z-10 transition-all duration-500 group-hover:-translate-y-6 group-hover:scale-[1.02]"
        style={{ 
          transition: 'transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)'
        }}
      >
        {/* Normal border - always visible, no filter */}
        <div 
          className="absolute inset-0 rounded-2xl border-2 pointer-events-none transition-all duration-500"
          style={{
            borderColor: color,
            filter: 'none',
            opacity: 1,
            zIndex: 1
          }}
        />
        
        {/* Filtered border - ONLY on hover */}
        <div 
          className="absolute inset-0 rounded-2xl border-2 pointer-events-none transition-all duration-500 opacity-0 group-hover:opacity-100"
          style={{
            borderColor: color,
            filter: filterURL,
            zIndex: 2
          }}
        />
        
        {/* Card content - NO filter, always stable and readable */}
        <div className="relative w-full h-full rounded-2xl overflow-hidden flex flex-col shadow-2xl group-hover:shadow-[0_20px_60px_-10px_rgba(250,204,21,0.6),0_0_40px_-5px_rgba(168,85,247,0.4)]"
          style={{
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, transparent 50%), #020204',
            backdropFilter: 'blur(20px) saturate(180%)',
            boxShadow: `
              0 0 40px -10px ${color}40,
              inset 0 1px 1px rgba(255, 255, 255, 0.1),
              inset 0 -1px 1px rgba(0, 0, 0, 0.3)
            `,
            transition: 'box-shadow 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
            zIndex: 10,
            filter: 'none', // Explicitly no filter on content
            margin: '2px' // Space for border to show
          }}
        >
          
          {/* Top Glass Section - Premium Liquid Glass Effect */}
          <div className="relative h-[65%] p-6 flex flex-col items-center justify-center text-center bg-black/40 backdrop-blur-xl bg-gradient-to-b from-white/10 to-transparent">
            <div className="w-14 h-14 mb-4 rounded-full bg-black border-2 border-[#FFD700] shadow-[0_0_15px_rgba(255,215,0,0.4)] flex items-center justify-center">
              <span className="text-[10px] font-black text-[#FFD700] tracking-tighter">{`{BD}`}</span>
            </div>
            
            {/* Title with wrapping fixed */}
            <h3 className="text-2xl font-black uppercase text-white leading-tight tracking-tighter mb-3 drop-shadow-md break-words w-full px-2">
              {title}
            </h3>
            
            <div className="text-purple-300 text-[9px] font-mono uppercase tracking-widest mb-1">Countdown</div>
            <div className="px-4 py-1 rounded-full bg-purple-900/40 border border-purple-500/30 text-lg font-mono font-bold text-white shadow-[0_0_10px_rgba(168,85,247,0.5)]">
              {badge}
            </div>
          </div>

          {/* Bottom Honey/Gold Section - Solid Opaque */}
          <div 
            className="absolute bottom-0 left-0 right-0 h-[35%] border-t border-[#FFD700]/50 overflow-hidden opacity-100"
            style={{ background: 'linear-gradient(to top, #8B4513 0%, #B8860B 50%, #FFD700 100%)' }}
          >
            <div className="absolute inset-0 opacity-20 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] mix-blend-overlay" />
            <div className="absolute top-0 left-0 right-0 h-4 bg-[#FFD700] blur-md opacity-80" />
            
            <div className="relative h-full flex flex-col items-center justify-center p-4">
              <p className="text-[10px] text-[#422006] font-black uppercase tracking-[0.3em] mb-1">BOUNTY LOCKED</p>
              <p className="text-3xl font-black text-white drop-shadow-md tracking-tighter">
                {bounty}
              </p>
              <p className="text-xs font-mono text-[#422006] mt-1 font-bold uppercase opacity-80">
                {streamer}
              </p>
            </div>
          </div>

          {/* Gloss Reflections */}
          <div className="absolute inset-0 rounded-2xl border border-white/10 pointer-events-none" />
          <div className="absolute top-0 right-0 w-3/4 h-full bg-gradient-to-l from-white/5 to-transparent skew-x-12 pointer-events-none" />
        </div>
      </div>
    </div>
  );
}