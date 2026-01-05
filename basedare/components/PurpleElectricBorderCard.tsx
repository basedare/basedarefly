// components/PurpleElectricBorderCard.tsx
'use client';

import React from 'react';

type CardProps = {
  badge: string;
  title: string;
  description: string;
  className?: string;
};

export default function PurpleElectricBorderCard({
  badge,
  title,
  description,
  className = "",
}: CardProps) {
  return (
    <div className={`relative group w-[220px] ${className}`}>
      {/* MAIN CARD - COMPLETELY STATIC */}
      <div className="relative z-10 bg-black/40 backdrop-blur-md border border-white/10 rounded-2xl p-6 overflow-hidden">
        <div className="text-xs uppercase tracking-wider text-gray-500 mb-2 font-mono">
          {badge}
        </div>
        <h3 className="text-lg font-black uppercase text-white mb-3 tracking-tight">
          {title}
        </h3>
        <p className="text-sm text-gray-400 font-mono">
          {description}
        </p>
      </div>

      {/* HOVER-ONLY PURPLE ELECTRIC BORDER */}
      <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
        {/* Outer Glow */}
        <div className="absolute inset-0 rounded-2xl blur-xl bg-purple-500/20 scale-110" />
        
        {/* Electric Crackle Border */}
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          <defs>
            <filter id="electric-noise" x="-50%" y="-50%" width="200%" height="200%">
              <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="4" stitchTiles="stitch" />
              <feColorMatrix type="saturate" values="0" />
              <feComponentTransfer>
                <feFuncA type="linear" slope="4" intercept="-1" />
              </feComponentTransfer>
              <feDisplacementMap in="SourceGraphic" scale="2" />
            </filter>
          </defs>
          
          <rect
            x="2"
            y="2"
            width="96"
            height="96"
            rx="16"
            fill="none"
            stroke="#A855F7"
            strokeWidth="3"
            filter="url(#electric-noise)"
            opacity="0.8"
            className="animate-pulse"
          />
          
          <rect
            x="0"
            y="0"
            width="100"
            height="100"
            rx="18"
            fill="none"
            stroke="#C084FC"
            strokeWidth="2"
            opacity="0.4"
            className="animate-pulse"
            style={{ animationDelay: '0.2s' }}
          />
        </svg>
      </div>

      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
        .animate-pulse {
          animation: pulse 2s infinite ease-in-out;
        }
      `}</style>
    </div>
  );
}

