'use client';

import React from 'react';

type CardProps = {
  badge: string;
  title: string;
  description: string;
  className?: string;
};

export default function PurpleTornHoloCard({
  badge,
  title,
  description,
  className = "",
}: CardProps) {
  const [bounty, streamer] = description.includes('|') 
    ? description.split('|').map(s => s.trim())
    : [description, ''];

  return (
    <div className={`relative group w-[280px] ${className}`}>
      
      {/* 1. STATIONARY HITBOX (Prevents Glitch) */}
      <div className="relative w-full aspect-[63/88] group cursor-pointer perspective-1000"> 
        
        {/* === HOVER EFFECTS: THE TORN ELECTRICITY === */}
        <div className="absolute -inset-[15px] rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-0">
          
          {/* A. The "Torn" Purple Edge Mask */}
          {/* This creates the jagged silhouette using SVG noise as a mask */}
          <div 
            className="absolute inset-0"
            style={{
              background: 'conic-gradient(from 0deg, #A855F7, #C084FC, #A855F7)',
              maskImage: `
                radial-gradient(circle at 50% 50%, black 60%, transparent 68%),
                url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='1.5' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E")
              `,
              maskComposite: 'intersect',
              maskSize: '100% 100%, 150px 150px',
              filter: 'blur(2px) contrast(5)', // Hardens the edges to look torn
              opacity: 0.8
            }}
          />

          {/* B. The Rainbow Holo Foil (Underneath the tear) */}
          <div className="absolute inset-0 rounded-3xl opacity-60 mix-blend-screen">
            <div 
              className="absolute inset-0 animate-holo-shift"
              style={{
                background: `
                  repeating-linear-gradient(45deg, transparent 0, transparent 2px, rgba(255,255,255,0.1) 3px, transparent 4px),
                  radial-gradient(circle at 50% 50%, rgba(168,85,247,0.8), rgba(255,0,255,0.5), rgba(0,255,255,0.5), transparent 70%)
                `,
                backgroundSize: '200% 200%',
                filter: 'contrast(1.2) brightness(1.2)'
              }}
            />
          </div>

          {/* C. Violent Lightning Arcs (Pseudo-elements) */}
          {/* These are the jagged lines shooting out */}
          <svg className="absolute inset-0 w-full h-full overflow-visible">
             <defs>
                <filter id="lightning-glow" x="-50%" y="-50%" width="200%" height="200%">
                   <feGaussianBlur stdDeviation="2" result="blur" />
                   <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
             </defs>
             <path 
                d="M 10,10 Q 50,-20 90,10 T 170,10" 
                fill="none" 
                stroke="#C084FC" 
                strokeWidth="2"
                filter="url(#lightning-glow)"
                className="opacity-0 group-hover:opacity-100 animate-pulse"
                style={{ animationDuration: '0.2s' }}
             />
             <path 
                d="M 10,200 Q -20,150 10,100" 
                fill="none" 
                stroke="#A855F7" 
                strokeWidth="2"
                filter="url(#lightning-glow)"
                className="opacity-0 group-hover:opacity-100 animate-pulse"
                style={{ animationDuration: '0.3s', animationDelay: '0.1s' }}
             />
          </svg>

        </div>

        {/* === THE CARD BODY (Stable) === */}
        <div className="relative z-10 w-full h-full bg-black/80 backdrop-blur-xl border-2 border-white/10 rounded-[24px] overflow-hidden flex flex-col p-6 transition-all duration-300 group-hover:-translate-y-3 group-hover:border-purple-500/50 group-hover:shadow-[0_20px_60px_rgba(168,85,247,0.4)]">
          
          {/* Logo Badge */}
          <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-black border-2 border-[#FFD700] flex items-center justify-center shadow-[0_0_20px_rgba(255,215,0,0.3)]">
            <span className="text-[#FFD700] font-black text-[10px] tracking-wider">{`{BD}`}</span>
          </div>

          {/* Title */}
          <h3 className="text-3xl font-black uppercase text-white text-center leading-none tracking-tighter mb-4 drop-shadow-md">
            {title}
          </h3>

          {/* Timer Badge */}
          <div className="mx-auto px-4 py-1.5 rounded-full bg-purple-900/30 border border-purple-500/30 mb-8">
            <span className="text-sm font-mono font-bold text-purple-300 tracking-widest">{badge}</span>
          </div>

          {/* Bounty Section (Bottom Gradient) */}
          <div className="mt-auto relative rounded-xl overflow-hidden p-4 text-center border-t border-white/5">
            <div className="absolute inset-0 bg-gradient-to-b from-[#FFD700]/10 to-purple-900/20 opacity-60" />
            <p className="relative z-10 text-[10px] text-amber-200/70 uppercase tracking-[0.3em] mb-1">BOUNTY</p>
            <p className="relative z-10 text-4xl font-black text-white tracking-tighter drop-shadow-lg">{bounty}</p>
            <p className="relative z-10 text-xs font-mono text-gray-400 mt-1 uppercase">{streamer}</p>
          </div>

        </div>

      </div>
      
      <style jsx>{`
        @keyframes holo-shift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .animate-holo-shift {
          animation: holo-shift 3s ease infinite;
        }
      `}</style>
    </div>
  );
}