'use client';
import React, { useEffect, useRef, useMemo } from 'react';
import { motion, useTime, useTransform } from 'framer-motion';
import Image from 'next/image';

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

// PHYSICS CONSTANTS - Slower, majestic rotation
const ORBIT_RADIUS = 450; // Increased radius for better spacing
const ROTATION_DURATION = 75000; // 75 seconds for full orbit (majestic)

interface OrbitingDaresProps {
  dares?: Dare[];
  setActiveChat?: (card: any) => void;
}

interface Card {
  id: string;
  dare: string;
  bounty: string;
  time: string;
  streamer: string;
  original: Dare | null;
}

// Helper function to format bounty
const formatBounty = (amount: number): string => {
  if (amount >= 1000) {
    return `${(amount / 1000).toFixed(1)}K`;
  }
  return `${amount}`;
};

// Helper function to format time from expiry_timer or default
const formatTime = (expiryTimer?: string): string => {
  if (!expiryTimer) return "24:00h";
  try {
    const expiry = new Date(expiryTimer);
    const now = new Date();
    const diff = expiry.getTime() - now.getTime();
    if (diff <= 0) return "EXPIRED";
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}:${minutes.toString().padStart(2, '0')}h`;
  } catch {
    return expiryTimer;
  }
};

export default function OrbitingDares({ dares = [], setActiveChat }: OrbitingDaresProps = {}) {
  // Map dares to card format
  const CARDS = useMemo((): Card[] => {
    if (dares.length === 0) {
      return [
        { id: '1', dare: "LOADING...", bounty: "0", time: "00:00h", streamer: "@BaseDare", original: null },
        { id: '2', dare: "LOADING...", bounty: "0", time: "00:00h", streamer: "@BaseDare", original: null },
        { id: '3', dare: "LOADING...", bounty: "0", time: "00:00h", streamer: "@BaseDare", original: null },
        { id: '4', dare: "LOADING...", bounty: "0", time: "00:00h", streamer: "@BaseDare", original: null },
        { id: '5', dare: "LOADING...", bounty: "0", time: "00:00h", streamer: "@BaseDare", original: null },
      ];
    }
    
    const mapped: Card[] = dares.slice(0, 8).map((dare) => ({
      id: dare.id,
      dare: dare.description?.toUpperCase() || "UNKNOWN DARE",
      bounty: formatBounty(dare.stake_amount || 0),
      time: formatTime(dare.expiry_timer),
      streamer: dare.streamer_name ? `@${dare.streamer_name.replace(/[@$]/g, '')}` : "@Unknown",
      original: dare,
    }));
    
    while (mapped.length < 5) {
      mapped.push({
        id: `placeholder-${mapped.length}`,
        dare: "MORE DARES COMING...",
        bounty: "0",
        time: "00:00h",
        streamer: "@BaseDare",
        original: null,
      });
    }
    
    return mapped;
  }, [dares]);

  // Framer Motion rotation
  const time = useTime();
  const rotateY = useTransform(time, [0, ROTATION_DURATION], [0, 360], { clamp: false });
  const rotateYReverse = useTransform(rotateY, (value) => -value);

  return (
    <div className="relative w-full h-[600px] flex items-center justify-center overflow-hidden perspective-[2000px]">
      {/* Rotating container with preserve-3d */}
      <motion.div
        className="relative w-[900px] h-[900px] flex items-center justify-center"
        style={{
          rotateY: rotateY,
          transformStyle: 'preserve-3d',
        }}
      >
        {/* PeeBear Head (centered, counter-rotates to stay facing forward) */}
        <motion.div
          className="absolute w-[154px] h-[154px] md:w-[230px] md:h-[230px] z-[50]"
          style={{
            rotateY: rotateYReverse,
            z: 0,
          }}
          animate={{ y: [-15, 15, -15], scale: [1, 1.02, 1] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        >
          <div className="absolute inset-0 bg-yellow-500/10 blur-[80px] rounded-full animate-pulse" />
          <Image
            src="/assets/peebear-head.png"
            alt="PeeBear Mascot"
            fill
            className="object-contain drop-shadow-[0_0_50px_rgba(234,179,8,0.4)]"
            priority
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        </motion.div>

        {/* Orbiting Cards */}
        {CARDS.map((card, index) => {
          const angle = (index / CARDS.length) * 360;

          return (
            <div
              key={card.id}
              className="absolute top-1/2 left-1/2 -mt-32 -ml-32"
              style={{
                transform: `rotateY(${angle}deg) translateZ(${ORBIT_RADIUS}px)`,
                transformStyle: 'preserve-3d',
              }}
            >
              <motion.div
                style={{
                  rotateY: rotateYReverse,
                }}
                className="w-64 h-80"
              >
                {/* Frosted Glass Card */}
                <motion.div
                  whileHover={{ scale: 1.05, y: -10, z: 20 }}
                  onClick={() => setActiveChat?.(card.original || card)}
                  className="relative w-full h-full cursor-pointer group"
                  style={{
                    transformStyle: 'preserve-3d',
                  }}
                >
                  <div className="absolute inset-0 rounded-3xl bg-white/8 backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.1)] overflow-hidden">
                    {/* Subtle inner gradient tint */}
                    <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/5 via-transparent to-purple-500/5 opacity-50" />
                    
                    {/* Content */}
                    <div className="relative z-10 h-full flex flex-col justify-between p-6 text-white">
                      {/* Header */}
                      <div className="flex justify-between items-start mb-4">
                        <span className="text-[10px] font-mono text-white/60 font-bold tracking-widest uppercase">
                          DARE #{index + 1}
                        </span>
                        <span className="px-3 py-1 text-[9px] font-black uppercase tracking-widest border border-yellow-500/30 bg-yellow-500/10 text-yellow-400 rounded-full">
                          LIVE
                        </span>
                      </div>

                      {/* Dare Text */}
                      <div className="flex-grow flex items-center mb-6">
                        <h3 className="text-xl font-black italic uppercase leading-tight drop-shadow-lg line-clamp-3">
                          {card.dare}
                        </h3>
                      </div>

                      {/* Footer */}
                      <div className="space-y-4 pt-4 border-t border-white/10">
                        {/* Bounty */}
                        <div className="flex justify-between items-baseline">
                          <span className="text-[10px] font-mono text-white/50 uppercase tracking-widest">
                            BOUNTY
                          </span>
                          <div className="flex items-baseline gap-1">
                            <span className="text-3xl font-black text-yellow-400 tracking-tighter drop-shadow-[0_0_10px_rgba(250,204,21,0.3)]">
                              ${card.bounty}
                            </span>
                            <span className="text-xs font-bold text-white/60">USDC</span>
                          </div>
                        </div>

                        {/* Streamer & Time */}
                        <div className="flex justify-between items-center text-[10px] font-mono">
                          <span className="text-white/70">{card.streamer}</span>
                          <span className="text-white/50 border border-white/10 px-2 py-1 rounded">
                            {card.time}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Hover glow effect */}
                    <div className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-br from-yellow-500/10 via-purple-500/10 to-transparent pointer-events-none" />
                  </div>
                </motion.div>
              </motion.div>
            </div>
          );
        })}
      </motion.div>
    </div>
  );
}