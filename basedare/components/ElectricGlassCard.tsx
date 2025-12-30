'use client';
import React from 'react';
import '@/app/styles/HoloCard.css';

interface CardProps {
  dare: string;
  bounty: string;
  time: string;
  streamer: string;
  color?: string; // Optional: if we want different border colors later
  index?: number; // For animation staggering
}

export default function ElectricGlassCard({ dare, bounty, time, streamer, color, index = 0 }: CardProps) {
  return (
    // OUTER GLASS CONTAINER
    <div className="relative w-64 h-80 bg-black/40 backdrop-blur-md rounded-xl border border-white/10 overflow-hidden group transition-all duration-300 hover:border-purple-500/50">
      
      {/* --- HOLO TEXTURE OVERLAY --- */}
      {/* Sits on top of background, behind text */}
      <div 
        className="holo-overlay" 
        style={{ animationDelay: `${index * 1.5}s` }} // Staggers the shine so they don't all flash at once
      />
      
      {/* GLOWING BORDER ACCENT (Existing) */}
      <div className="absolute inset-0 rounded-xl border border-white/5 group-hover:border-purple-400/30 transition-colors" />
      
      {/* CARD CONTENT */}
      <div className="relative z-20 h-full flex flex-col p-6 justify-between">
        
        {/* Header */}
        <div className="flex justify-between items-start">
          <div className="bg-purple-900/30 border border-purple-500/30 px-2 py-1 rounded text-[10px] font-bold text-purple-300 tracking-widest uppercase">
            Active
          </div>
          <div className="text-right">
             <div className="text-gray-400 text-[10px] font-mono">TARGET</div>
             <div className="text-cyan-400 font-bold text-sm tracking-wide">{streamer}</div>
          </div>
        </div>

        {/* Main Dare */}
        <div className="text-center">
            <h3 className="text-2xl font-black text-white italic uppercase leading-none drop-shadow-md">
                {dare}
            </h3>
        </div>

        {/* Footer Info */}
        <div className="space-y-2">
            <div className="flex justify-between items-end border-b border-white/10 pb-2">
                <span className="text-gray-500 text-[10px] font-mono">BOUNTY</span>
                <span className="text-[#FFD700] text-xl font-black tracking-tighter drop-shadow-[0_0_10px_rgba(255,215,0,0.4)]">
                    {bounty}
                </span>
            </div>
            <div className="flex justify-between items-center pt-1">
                 <span className="text-gray-500 text-[10px] font-mono">EXPIRES</span>
                 <span className="text-white text-xs font-mono">{time}</span>
            </div>
        </div>
      </div>
    </div>
  );
}
