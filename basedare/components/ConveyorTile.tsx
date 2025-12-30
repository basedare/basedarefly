'use client';

import React from 'react';

// Single tile component extracted from ConveyorBar
const BETS = [
  { user: "@MrBeast", action: "staked", amount: "$50,000", target: "Eat a Scorpion", status: "live" },
  { user: "@xQc", action: "failed", amount: "-$10,000", target: "Silent Stream", status: "failed" },
  { user: "@KaiCenat", action: "won", amount: "+$24,000", target: "No Laugh Challenge", status: "won" },
  { user: "@Speed", action: "staked", amount: "$500", target: "Bark at strangers", status: "live" },
  { user: "@Pokimane", action: "staked", amount: "$1,000", target: "Cosplay", status: "live" },
  { user: "@Trainwreck", action: "staked", amount: "$100,000", target: "Open Cases", status: "live" },
];

interface ConveyorTileProps {
  index?: number;
}

export default function ConveyorTile({ index = 0 }: ConveyorTileProps) {
  const bet = BETS[index % BETS.length];
  
  return (
    <div className="inline-flex items-center gap-3 px-4 py-1.5 rounded-full border border-white/5 bg-black/20 hover:bg-white/10 hover:border-[#FACC15]/50 transition-all group">
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
    </div>
  );
}








