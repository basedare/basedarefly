'use client';

import { useState } from "react";
import ChatSidebar from "./ChatSidebar";

const BETS = [
  { user: "@MrBeast", action: "staked", amount: "$50,000", target: "Eat a Scorpion", status: "live" },
  { user: "@xQc", action: "failed", amount: "-$10,000", target: "Silent Stream", status: "failed" },
  { user: "@KaiCenat", action: "won", amount: "+$24,000", target: "No Laugh Challenge", status: "won" },
  { user: "@Speed", action: "staked", amount: "$500", target: "Bark at strangers", status: "live" },
  { user: "@Pokimane", action: "staked", amount: "$1,000", target: "Cosplay", status: "live" },
  { user: "@Trainwreck", action: "staked", amount: "$100,000", target: "Open Cases", status: "live" },
];

export default function ConveyorBar() {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [selectedDare, setSelectedDare] = useState<any>(null);

  const handleBetClick = (bet: typeof BETS[0]) => {
    // Transform bet data to match ChatSidebar's expected dare structure
    const dare = {
      title: bet.target,
      streamer_name: bet.user.replace('@', ''),
      stake_amount: bet.amount.replace(/[^0-9]/g, ''), // Extract numeric value
      status: bet.status === 'live' ? 'accepted' : bet.status,
      user: bet.user,
      action: bet.action,
      target: bet.target,
    };
    setSelectedDare(dare);
    setIsChatOpen(true);
  };

  return (
    <>
      {/* UPDATES:
         1. mb-12: Adds 48px gap below to stop overlapping "CONTROL" text.
         2. Glassmorphism: bg-white/5 + backdrop-blur-xl (Matches Navbar).
         3. Borders: Added border-y for definition.
      */}
      <div className="relative w-full h-14 bg-white/5 backdrop-blur-xl border-y border-white/10 z-30 overflow-hidden flex items-center mb-12 shadow-lg">
        
        {/* Shadow Gradients (Fade edges) */}
        <div className="absolute left-0 top-0 h-full w-32 bg-gradient-to-r from-[#020204] to-transparent z-10 pointer-events-none"></div>
        <div className="absolute right-0 top-0 h-full w-32 bg-gradient-to-l from-[#020204] to-transparent z-10 pointer-events-none"></div>

        {/* The Scrolling Track */}
        <div className="flex animate-scroll whitespace-nowrap min-w-max items-center">
          {/* Tripled list for smooth infinite loop */}
          {[...BETS, ...BETS, ...BETS].map((bet, i) => (
            <button 
              key={i} 
              onClick={() => handleBetClick(bet)}
              className="inline-flex items-center gap-3 mx-6 px-4 py-1.5 rounded-full border border-white/5 bg-black/20 hover:bg-white/10 hover:border-[#FACC15]/50 transition-all group"
            >
              {/* Status Dot */}
              <div className={`w-2 h-2 rounded-full shadow-[0_0_8px_currentColor] ${
                  bet.status === 'live' ? 'bg-[#FACC15] text-[#FACC15] animate-pulse' : 
                  bet.status === 'failed' ? 'bg-red-500 text-red-500' : 'bg-green-500 text-green-500'
              }`}></div>
              
              <span className="text-xs font-bold text-gray-300 group-hover:text-white transition-colors tracking-wide">
                {bet.user}
              </span>
              
              <span className="text-xs text-gray-500 font-mono uppercase">
                {bet.action}
              </span>
              
              <span className={`text-xs font-black tracking-wider ${
                  bet.status === 'failed' ? 'text-red-500' : 'text-[#FACC15] drop-shadow-sm'
              }`}>
                {bet.amount}
              </span>
              
              <span className="text-xs text-gray-500 truncate max-w-[120px] hidden sm:block border-l border-white/10 pl-3">
                {bet.target}
              </span>
            </button>
          ))}
        </div>
      </div>

      <ChatSidebar 
        dare={selectedDare} 
        isOpen={isChatOpen} 
        onClose={() => {
          setIsChatOpen(false);
          setSelectedDare(null);
        }} 
      />
    </>
  );
}
