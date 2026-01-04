'use client';

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';

interface Dare {
  id: string;
  description: string;
  stake_amount: number;
  streamer_name?: string;
  status: string;
  video_url?: string;
  expiry_timer?: string;
  image_url?: string;
}

interface PeeBearConveyorProps {
  dares?: Dare[];
}

// Helper function to format bounty
const formatBounty = (amount: number): string => {
  if (amount >= 1000) {
    return `$${(amount / 1000).toFixed(1)}K`;
  }
  return `$${amount}`;
};

export default function PeeBearConveyor({ dares = [] }: PeeBearConveyorProps = {}) {
  // Map dares to display format
  const displayItems = useMemo(() => {
    if (dares.length === 0) {
      // Default items if no data
      return [
        "LOADING DARES... ($0)",
      ];
    }
    
    return dares.map((dare) => {
      const title = dare.description?.toUpperCase() || "UNKNOWN DARE";
      const bounty = formatBounty(dare.stake_amount || 0);
      return `${title} (${bounty})`;
    });
  }, [dares]);

  // Create infinite scroll effect by duplicating items
  const infiniteItems = useMemo(() => {
    // Duplicate items multiple times for seamless loop
    return [...displayItems, ...displayItems, ...displayItems, ...displayItems];
  }, [displayItems]);

  // Calculate total width for seamless loop
  const itemWidth = 300; // Approximate width per item
  const totalWidth = infiniteItems.length * itemWidth;

  return (
    <div className="w-full overflow-hidden backdrop-blur-md bg-black/10 border-y border-white/10 py-3 relative">
      <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-transparent to-black/50 z-10 pointer-events-none" />
      <motion.div 
        className="flex whitespace-nowrap gap-8"
        animate={{ x: [0, -totalWidth / 2] }}
        transition={{ 
          repeat: Infinity, 
          duration: infiniteItems.length * 2, 
          ease: "linear" 
        }}
      >
        {infiniteItems.map((item, i) => (
          <div key={`${i}-${item}`} className="flex items-center gap-2 flex-shrink-0">
            <span className="text-[#FFD700] text-xl">⚡</span>
            <span className="text-purple-300 font-mono font-bold uppercase tracking-widest text-sm">
              {item}
            </span>
          </div>
        ))}
      </motion.div>
    </div>
  );
}



