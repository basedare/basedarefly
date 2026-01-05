'use client';

import React from 'react';
import { Crosshair, Crown } from 'lucide-react';
import MoltenBountyCard from './MoltenBountyCard';

// Updated Data: Swapped "BD" for "USDC"
const LIVE_TARGETS = [
  // --- PREMIUM TARGETS ---
  { 
    id: 101, 
    dare: "EAT THE REAPER", 
    bounty: "5,000 USDC", // Changed from 50,000 BD
    time: "02:00h left", 
    streamer: "@KaiCenat",
    imgUrl: "/assets/KAICENAT.jpeg", 
    emoji: "🌶️", 
    isVulnerable: false,
    minLevel: 0
  },
  { 
    id: 102, 
    dare: "SKYDIVING IRL", 
    bounty: "12,000 USDC", 
    time: "EXPIRED", 
    streamer: "@IShowSpeed", 
    imgUrl: "/assets/Ishowspeed.jpg",
    emoji: "🪂",
    isVulnerable: true,
    minLevel: 0
  },
  { 
    id: 103, 
    dare: "CALL YOUR EX", 
    bounty: "500 USDC", 
    time: "00:30m left", 
    streamer: "@AdinRoss",
    imgUrl: "/assets/adinross.png",
    emoji: "💔",
    isVulnerable: false,
    minLevel: 0
  },
  
  // --- OPEN DARES ---
  { 
    id: 201, 
    dare: "CHUG A COKE (NO BURP)", 
    bounty: "50 USDC", 
    time: "OPEN BOUNTY", 
    streamer: "OPEN TO ALL",
    imgUrl: "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=800",
    emoji: "🥤", 
    isVulnerable: false,
    minLevel: 0
  },
  { 
    id: 202, 
    dare: "EAT A CHEESEBURGER IN 1 BITE", 
    bounty: "150 USDC", 
    time: "OPEN BOUNTY", 
    streamer: "OPEN TO ALL",
    imgUrl: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800",
    emoji: "🍔", 
    isVulnerable: false,
    minLevel: 0
  },

  // --- NFT LOCKED DARES ---
  { 
    id: 301, 
    dare: "SHAVE HEAD LIVE", 
    bounty: "LOCKED", 
    time: "LOCKED", 
    streamer: "???", 
    imgUrl: "https://images.unsplash.com/photo-1599351431202-1e0f0137899a?auto=format&fit=crop&w=800",
    emoji: "🔒", 
    isVulnerable: false,
    minLevel: 5 
  },
  { 
    id: 302, 
    dare: "TATTOO LOGO ON FACE", 
    bounty: "LOCKED", 
    time: "LOCKED", 
    streamer: "???", 
    imgUrl: "https://images.unsplash.com/photo-1562962230-16bc46364924?auto=format&fit=crop&w=800",
    emoji: "🔒", 
    isVulnerable: false,
    minLevel: 10 
  },
];

export default function LiveBounties() {
  const userLevel = 1;

  return (
    <section className="py-24 container mx-auto px-6 relative z-10">
        {/* HEADER */}
        <div className="flex items-end justify-between mb-12 border-b border-white/10 pb-6">
          <div>
            <h2 className="text-4xl md:text-5xl font-black text-white flex items-center gap-3 mb-2">
              <Crosshair className="text-[#FFD700] animate-pulse w-8 h-8 md:w-12 md:h-12" />
              <span className="italic tracking-tighter">LIVE <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FFD700] to-orange-600">BOUNTIES</span></span>
            </h2>
            <p className="text-gray-400 font-mono text-sm uppercase tracking-widest">
               CURRENT ACCESS: <span className="text-gray-500 font-bold">PLEB TIER</span>
            </p>
          </div>
        </div>
        
        {/* BOUNTY GRID */}
        <div className="grid md:grid-cols-3 gap-8 perspective-container">
           {LIVE_TARGETS.map((target) => {
             const isLocked = target.minLevel > userLevel;

             return (
               <div key={target.id} className="relative cursor-pointer group">
                  
                  {isLocked && (
                    <div className="absolute inset-0 z-50 bg-[#050505]/90 backdrop-blur-md flex flex-col items-center justify-center rounded-3xl border border-[#FFD700]/20 transition-all duration-300 group-hover:scale-[1.02]">
                        <div className="w-16 h-16 rounded-full bg-[#FFD700]/10 flex items-center justify-center mb-4 border border-[#FFD700] shadow-[0_0_30px_rgba(255,215,0,0.3)] animate-pulse">
                            <Crown className="w-8 h-8 text-[#FFD700]" />
                        </div>
                        <h3 className="text-3xl font-black text-white italic uppercase tracking-tighter">
                            RESTRICTED
                        </h3>
                        <div className="mt-4 px-4 py-2 bg-[#FFD700] text-black font-black font-mono text-xs rounded uppercase tracking-widest hover:bg-white transition-colors cursor-pointer">
                            MINT GENESIS PASS
                        </div>
                        <p className="text-[10px] text-gray-500 font-mono mt-3 uppercase tracking-widest">
                            High Value Target // Level {target.minLevel}+
                        </p>
                    </div>
                  )}

                  <MoltenBountyCard 
                      dare={target.dare}
                      bounty={target.bounty}
                      time={target.time}
                      streamer={target.streamer}
                      imgUrl={target.imgUrl}
                      emoji={target.emoji}
                      isVulnerable={target.isVulnerable}
                  />
               </div>
             );
           })}
        </div>
    </section>
  );
}
