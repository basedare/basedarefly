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
  color = "#FACC15",
}: CardProps) {
  // Safe logic to split description if it contains a pipe |
  const [bounty, streamer] = description.includes('|') 
    ? description.split('|').map(s => s.trim()) 
    : [description, ''];

  return (
    <div className={`relative group w-[240px] h-[320px] ${className} perspective-1000`}>
      
      {/* 1. OUTER GLOW (Pulsing) */}
      <div className="absolute -inset-1 bg-gradient-to-r from-[#FFD700] to-[#A855F7] rounded-2xl opacity-50 group-hover:opacity-100 blur transition duration-500" />

      {/* 2. CARD BODY */}
      <div className="relative w-full h-full bg-black rounded-xl overflow-hidden border border-white/10 flex flex-col">
        
        {/* Top Section: Glass */}
        <div className="relative h-[65%] p-4 flex flex-col items-center justify-center text-center bg-white/5 backdrop-blur-md">
           <div className="px-3 py-1 rounded-full bg-purple-900/50 border border-purple-500/30 text-white font-mono text-xs font-bold mb-3 shadow-[0_0_10px_rgba(168,85,247,0.4)]">
             {badge}
           </div>
           <h3 className="text-xl font-black text-white uppercase italic leading-none tracking-tighter drop-shadow-md">
             {title}
           </h3>
        </div>

        {/* Bottom Section: Gold/Honey Block */}
        <div className="relative h-[35%] bg-gradient-to-t from-yellow-700 to-[#FFD700] flex flex-col items-center justify-center p-2 border-t border-[#FFD700]">
           <p className="text-[10px] text-black font-black uppercase tracking-widest opacity-60">BOUNTY LOCKED</p>
           <p className="text-2xl font-black text-black tracking-tighter">{bounty}</p>
           <p className="text-xs font-mono font-bold text-black/70">{streamer}</p>
        </div>

      </div>
    </div>
  );
}
