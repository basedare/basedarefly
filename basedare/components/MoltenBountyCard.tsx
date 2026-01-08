'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface MoltenBountyCardProps {
  dare: string;
  bounty: string;
  time: string;
  streamer: string;
  viewers?: string;
  emoji?: string;
  imgUrl?: string;
  progress?: number;
  isVulnerable?: boolean;
}

export default function MoltenBountyCard({ 
  dare, 
  bounty, 
  time, 
  streamer, 
  viewers, 
  emoji, 
  imgUrl, 
  progress = 0,
  isVulnerable = false
}: MoltenBountyCardProps) {
  return (
    <div className={`group relative w-full h-[400px] bg-black rounded-3xl overflow-hidden border transition-colors duration-500 ${isVulnerable ? 'border-red-500/50 hover:border-red-500' : 'border-white/10 hover:border-purple-500/50'}`}>
      
      {/* BACKGROUND IMAGE - WITH GRAYSCALE HOVER */}
      <div className="absolute inset-0">
        <img 
          src={imgUrl || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=800"} 
          alt={streamer} 
          className="w-full h-full object-cover opacity-60 group-hover:scale-110 transition-transform duration-700 grayscale group-hover:grayscale-0"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
      </div>

      {/* CONTENT */}
      <div className="absolute inset-0 p-6 flex flex-col justify-between z-10">
        
        {/* Header - LIVE INDICATOR */}
        <div className="flex justify-between items-start">
           <div className="bg-red-500/20 border border-red-500/50 backdrop-blur-md px-3 py-1 rounded-full flex items-center gap-2">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              <span className="text-red-200 text-xs font-bold tracking-wider">LIVE</span>
           </div>
           {viewers && (
             <span className="text-white/60 font-mono text-xs flex items-center gap-1">
               {viewers} <span className="text-red-500">●</span>
             </span>
           )}
        </div>

        {/* EMOJI OVERLAY */}
        {emoji && (
            <div className="absolute top-16 right-6 text-6xl drop-shadow-[0_0_15px_rgba(0,0,0,0.8)] transform group-hover:scale-125 transition-transform duration-300 z-20">
                {emoji}
            </div>
        )}

        {/* Bottom Info Area */}
        <div className="space-y-4">
          <div className="flex justify-between items-end">
             <div>
                <p className="text-purple-400 text-xs font-mono uppercase tracking-widest mb-1">{streamer}</p>
                <h3 className="text-3xl font-black italic text-white leading-none uppercase max-w-[90%] tracking-tighter">
                   {dare}
                </h3>
             </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm font-mono text-gray-400">
               <span className="text-[#FFD700] font-bold">{bounty}</span>
               <span className={isVulnerable ? "text-red-500 animate-pulse font-bold" : ""}>
                 {time} {isVulnerable ? "EXPIRED" : "REMAINING"}
               </span>
            </div>
            
            {/* ACTION AREA: SWITCHES BETWEEN STEAL AND VERIFY */}
            {isVulnerable ? (
                <button className="w-full py-3 bg-red-600 hover:bg-red-500 text-white font-black uppercase tracking-widest rounded-full transition-all hover:scale-[1.02] shadow-lg shadow-red-900/50">
                    STEAL BOUNTY
                </button>
            ) : (
                <div className="space-y-3">
                  <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
                    <motion.div 
                        initial={{ width: 0 }}
                        whileInView={{ width: `${progress}%` }}
                        transition={{ duration: 1.5, ease: "easeOut" }}
                        className="h-full bg-gradient-to-r from-purple-500 to-cyan-500"
                    />
                  </div>
                  {/* ADDED VERIFY REALITY BUTTON */}
                  <button className="w-full py-3 bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white font-black uppercase text-xs rounded-xl transition-all duration-300 shadow-lg hover:shadow-purple-500/50 opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0">
                    VERIFY REALITY
                  </button>
                </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}