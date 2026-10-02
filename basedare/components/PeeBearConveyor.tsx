'use client';

import React, { useMemo } from 'react';
import { useVisualActivity } from '@/hooks/useVisualActivity';
import { HOME_ACTIVITY_EXAMPLES } from '@/lib/home-activity-examples';

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
  const { ref, active } = useVisualActivity();
  // Map dares to display format
  const displayItems = useMemo(() => {
    if (!dares.length) return HOME_ACTIVITY_EXAMPLES.map((item) => `${item.expiry_timer} · ${item.description} · ${item.valueLabel}`);
    return dares.map((dare) => {
      const title = dare.description?.toUpperCase() || "UNKNOWN DARE";
      const bounty = formatBounty(dare.stake_amount || 0);
      const streamer = dare.streamer_name || "@Anon";
      const tag = dare.expiry_timer || "";
      return tag ? `${title} ${tag} (${bounty}) ${streamer}` : `${title} (${bounty}) ${streamer}`;
    });
  }, [dares]);

  // Create infinite scroll effect by duplicating items
  const infiniteItems = useMemo(() => {
    // Duplicate items multiple times for seamless loop
    return [...displayItems, ...displayItems, ...displayItems, ...displayItems];
  }, [displayItems]);

  // Calculate total width for seamless loop


  return (
    <div ref={ref} className="w-full overflow-hidden bg-black/30 border-y border-purple-500/20 py-4 relative">
      {/* Edge fade gradients */}
      <div className="absolute inset-0 bg-gradient-to-r from-black via-transparent to-black z-10 pointer-events-none" />

      {/* Subtle glow accent */}
      <div className="absolute inset-0 bg-gradient-to-b from-purple-500/5 to-transparent pointer-events-none" />

      <div
        className="conveyor-track flex w-max whitespace-nowrap gap-6"
        style={{ animationPlayState: active ? 'running' : 'paused' }}      >
        {infiniteItems.map((item, i) => (
          <div key={`${i}-${item}`} className="flex items-center gap-2 flex-shrink-0 px-2">
            <span className="text-[#FFD700] text-lg">⚡</span>
            <span className="text-purple-300 font-mono font-bold uppercase tracking-wider text-xs">
              {item}
            </span>
          </div>
        ))}
      </div>
      <style jsx>{`
        .conveyor-track { animation: conveyor-travel 40s linear infinite; }
        @keyframes conveyor-travel { to { transform: translateX(-50%); } }
        @media (prefers-reduced-motion: reduce) { .conveyor-track { animation: none; } }
      `}</style>
    </div>
  );
}


