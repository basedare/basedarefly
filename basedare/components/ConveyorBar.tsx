'use client';

import { useState, useEffect } from "react";
import ChatSidebar from "./ChatSidebar";

export default function ConveyorBar() {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [selectedDare, setSelectedDare] = useState<any>(null);
  const [dares, setDares] = useState<any[]>([]);

  // Fetch dares from API on mount
  useEffect(() => {
    const fetchDares = async () => {
      try {
        const response = await fetch('/api/dares');
        const result = await response.json();
        if (result.success && result.data) {
          setDares(result.data);
        }
      } catch (error) {
        console.error('Error fetching dares:', error);
        setDares([]); // Fallback to empty array on error
      }
    };

    fetchDares();
  }, []);

  const handleBetClick = (dare: any) => {
    // Transform dare data to match ChatSidebar's expected structure
    const transformedDare = {
      title: dare.title,
      streamer_name: dare.streamer_name || dare.streamer || '',
      stake_amount: dare.stake_amount || dare.stakeAmount || 0,
      status: dare.status === 'VERIFIED' || dare.status === 'PENDING' ? 'accepted' : dare.status?.toLowerCase(),
      user: dare.streamer_name ? `@${dare.streamer_name}` : '',
      action: 'funded',
      target: dare.title,
      ...dare,
    };
    setSelectedDare(transformedDare);
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
          {dares.length > 0 ? (
            [...dares, ...dares, ...dares].map((dare, i) => {
              const status = dare.status === 'VERIFIED' || dare.status === 'PENDING' ? 'live' : dare.status?.toLowerCase() || 'live';
              const amount = `$${dare.stake_amount || dare.stakeAmount || 0}`;
              const user = dare.streamer_name ? `@${dare.streamer_name}` : `@${dare.streamer || 'unknown'}`;
              
              return (
                <button 
                  key={`${dare.id || i}-${i}`} 
                  onClick={() => handleBetClick(dare)}
                  className="inline-flex items-center gap-3 mx-6 px-4 py-1.5 rounded-full border border-white/5 bg-black/20 hover:bg-white/10 hover:border-[#FACC15]/50 transition-all group"
                >
                  {/* Status Dot */}
                  <div className={`w-2 h-2 rounded-full shadow-[0_0_8px_currentColor] ${
                      status === 'live' || status === 'verified' || status === 'pending' ? 'bg-[#FACC15] text-[#FACC15] animate-pulse' : 
                      status === 'failed' ? 'bg-red-500 text-red-500' : 'bg-green-500 text-green-500'
                  }`}></div>
                  
                  <span className="text-xs font-bold text-gray-300 group-hover:text-white transition-colors tracking-wide">
                    {user}
                  </span>
                  
                  <span className="text-xs text-gray-500 font-mono uppercase">
                    staked
                  </span>
                  
                  <span className={`text-xs font-black tracking-wider ${
                      status === 'failed' ? 'text-red-500' : 'text-[#FACC15] drop-shadow-sm'
                  }`}>
                    {amount}
                  </span>
                  
                  <span className="text-xs text-gray-500 truncate max-w-[120px] hidden sm:block border-l border-white/10 pl-3">
                    {dare.title}
                  </span>
                </button>
              );
            })
          ) : (
            <div className="text-xs text-gray-500 font-mono px-6">Loading dares...</div>
          )}
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
