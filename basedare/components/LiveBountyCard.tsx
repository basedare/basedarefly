'use client';
import React from "react";
import { Users, Zap } from "lucide-react";

interface LiveCardProps { 
  streamer: string; 
  dare: string; 
  bounty: string; 
  time: string; 
  viewers: string; 
  emoji: string; 
  imgUrl: string; 
}

export default function LiveBountyCard({ streamer, dare, bounty, time, viewers, emoji, imgUrl }: LiveCardProps) { 
  return (
    <div className="relative w-full aspect-[3/4] rounded-2xl overflow-hidden group cursor-pointer border border-white/10 hover:border-white/30 transition-all duration-300">
      
      {/* 1. BACKGROUND IMAGE (Zoom on Hover) */}
      <div className="absolute inset-0">
        <img 
          src={imgUrl} 
          alt={streamer} 
          className="w-full h-full object-cover opacity-60 group-hover:opacity-40 group-hover:scale-110 transition-all duration-700 ease-out"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
      </div>

      {/* 2. THE EMOJI WATERMARK */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[120px] opacity-10 grayscale group-hover:grayscale-0 group-hover:opacity-30 group-hover:scale-125 transition-all duration-500 pointer-events-none select-none filter blur-sm">
        {emoji}
      </div>

      {/* 3. LIVE STATUS BADGE */}
      <div className="absolute top-4 left-4 flex items-center gap-2 bg-red-500/20 backdrop-blur-md border border-red-500/30 px-3 py-1 rounded-full z-20">
        <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse shadow-[0_0_10px_red]" />
        <span className="text-[10px] font-black text-red-500 tracking-widest uppercase">LIVE</span>
      </div>

      {/* 4. VIEWER COUNT */}
      <div className="absolute top-4 right-4 flex items-center gap-1.5 text-gray-400 bg-black/40 backdrop-blur-md px-2 py-1 rounded-lg border border-white/5 z-20">
        <Users className="w-3 h-3" />
        <span className="text-[10px] font-mono font-bold">{viewers}</span>
      </div>

      {/* 5. INFO STACK (Bottom) */}
      <div className="absolute bottom-0 left-0 right-0 p-6 flex flex-col justify-end z-20">
        
        {/* Streamer ID */}
        <div className="flex items-center gap-2 mb-1">
           <span className="text-cyan-400 text-xs font-bold uppercase tracking-wide">{streamer}</span>
           <Zap className="w-3 h-3 text-yellow-500 fill-current" />
        </div>

        {/* Dare Title */}
        <h3 className="text-2xl font-black text-white italic uppercase leading-none mb-4 drop-shadow-lg">
          {dare}
        </h3>

        {/* The Bounty Bar */}
        <div className="relative h-14 bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 flex items-center justify-between px-4 overflow-hidden group-hover:border-[#FFD700]/50 transition-colors">
           {/* Liquid Gold Progress Background (Visual flair) */}
           <div className="absolute inset-0 bg-gradient-to-r from-[#FFD700]/10 to-transparent w-3/4 skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out" />
           
           <div className="relative z-10 flex flex-col">
              <span className="text-[9px] text-gray-400 font-mono uppercase tracking-widest">CURRENT POT</span>
              <span className="text-[#FFD700] text-xl font-black tracking-tight drop-shadow-[0_0_15px_rgba(255,215,0,0.3)]">
                {bounty}
              </span>
           </div>
           <div className="relative z-10 text-right">
              <div className="text-[9px] text-gray-500 font-mono uppercase">TIME LEFT</div>
              <div className="text-white font-mono font-bold text-sm">{time}</div>
           </div>
        </div>
      </div>
    </div>
  );
}

