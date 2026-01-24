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

// Sample dares for when API returns empty - matches desktop featured dares
const SAMPLE_DARES = [
  { id: '1', description: "LICK A CACTUS", stake_amount: 50000, streamer_name: "@KaiCenat", status: "active" },
  { id: '2', description: "CALL MOM & CONFESS", stake_amount: 25000, streamer_name: "@Speed", status: "active" },
  { id: '3', description: "TATTOO VIEWER'S NAME", stake_amount: 100000, streamer_name: "@xQc", status: "active" },
  { id: '4', description: "EAT CAT FOOD ON CAM", stake_amount: 10000, streamer_name: "@Adin", status: "active" },
  { id: '5', description: "DM YOUR EX 'I MISS U'", stake_amount: 15000, streamer_name: "@Poki", status: "active" },
  { id: '6', description: "SHAVE HEAD BALD", stake_amount: 250000, streamer_name: "@Ludwig", status: "active" },
];

// Helper function to format bounty
const formatBounty = (amount: number): string => {
  if (amount >= 1000) {
    return `$${(amount / 1000).toFixed(1)}K`;
  }
  return `$${amount}`;
};

export default function PeeBearConveyor({ dares = [] }: PeeBearConveyorProps = {}) {
  // Use sample dares when API returns empty
  const activeDares = dares.length > 0 ? dares : SAMPLE_DARES;

  // Map dares to display format
  const displayItems = useMemo(() => {
    return activeDares.map((dare) => {
      const title = dare.description?.toUpperCase() || "UNKNOWN DARE";
      const bounty = formatBounty(dare.stake_amount || 0);
      const streamer = dare.streamer_name || "@Anon";
      return `${title} (${bounty}) ${streamer}`;
    });
  }, [activeDares]);

  // Create infinite scroll effect by duplicating items
  const infiniteItems = useMemo(() => {
    // Duplicate items multiple times for seamless loop
    return [...displayItems, ...displayItems, ...displayItems, ...displayItems];
  }, [displayItems]);

  // Calculate total width for seamless loop
  const itemWidth = 300; // Approximate width per item
  const totalWidth = infiniteItems.length * itemWidth;

  return (
    <div className="w-full overflow-hidden backdrop-blur-md bg-black/30 border-y border-purple-500/20 py-4 relative">
      {/* Edge fade gradients */}
      <div className="absolute inset-0 bg-gradient-to-r from-black via-transparent to-black z-10 pointer-events-none" />

      {/* Subtle glow accent */}
      <div className="absolute inset-0 bg-gradient-to-b from-purple-500/5 to-transparent pointer-events-none" />

      <motion.div
        className="flex whitespace-nowrap gap-6"
        style={{ willChange: 'transform', backfaceVisibility: 'hidden' }}
        animate={{ x: [0, -totalWidth / 2] }}
        transition={{
          repeat: Infinity,
          duration: infiniteItems.length * 1.5, // Slightly faster for mobile
          ease: "linear",
          type: "tween"
        }}
      >
        {infiniteItems.map((item, i) => (
          <div key={`${i}-${item}`} className="flex items-center gap-2 flex-shrink-0 px-2">
            <span className="text-[#FFD700] text-lg">⚡</span>
            <span className="text-purple-300 font-mono font-bold uppercase tracking-wider text-xs">
              {item}
            </span>
          </div>
        ))}
      </motion.div>
    </div>
  );
}



