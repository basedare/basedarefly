'use client';

import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import ElectricCard from "./ElectricCard";
import PortalVortex from "./PortalVortex";

// Radians per second (consistent regardless of frame rate)
const ROTATION_SPEED = 0.15;

// MOCK_DARES preserved as fallback only
const MOCK_DARES = [
  { id: '1', description: "EAT REAPER CHIP", stake_amount: 5000, streamer_name: "@KaiCenat", expiry_timer: "01:20s" },
  { id: '2', description: "SHAVE EYEBROW", stake_amount: 2500, streamer_name: "@Speed", expiry_timer: "12:00m" },
  { id: '3', description: "CALL YOUR EX", stake_amount: 10000, streamer_name: "@Adin", expiry_timer: "00:30s" },
  { id: '4', description: "TATTOO FACE", stake_amount: 100000, streamer_name: "@Steve", expiry_timer: "24:00h" },
  { id: '5', description: "DRINK LAKE WATER", stake_amount: 1000, streamer_name: "@Beast", expiry_timer: "05:00m" },
  { id: '6', description: "DELETE CHANNEL", stake_amount: 1000000, streamer_name: "@Pewds", expiry_timer: "PERM" },
];

interface HeroProps {
  dares?: any[];
  onCardClick?: (dare: any) => void;
}

export default function HeroEllipticalStream({ dares = [], onCardClick }: HeroProps) {
  // --- SURGICAL DATA MAPPING START ---
  // Ensure we use real dares if they exist, otherwise use MOCK_DARES
  const rawItems = dares.length > 0 ? dares : MOCK_DARES;
  
  // Transform real data into the format ElectricCard expects
  const items = rawItems.slice(0, 6).map((dare, index) => ({
    id: dare.id || index.toString(),
    // Logic: use title/task_name for real data, fall back to description for mocks
    displayTitle: dare.title || dare.task_name || dare.description || "Untitled Dare",
    displayBounty: dare.stake_amount || dare.bounty || dare.amount || 0,
    displayStreamer: dare.streamer_name || dare.target_streamer || "@Anon",
    displayTimer: dare.expiry_timer || "24H"
  }));
  // --- SURGICAL DATA MAPPING END ---

  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const timeRef = useRef(0);
  const lastFrameTimeRef = useRef(0);
  const requestRef = useRef<number>(0);
  const [isMobile, setIsMobile] = useState(false);

  const radiiRef = useRef({ x: 550, y: 50, z: 70 });
  
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const handleResize = () => {
      const isMobile = window.innerWidth < 768;
      radiiRef.current = {
        x: isMobile ? 180 : 550,
        y: isMobile ? 20 : 50,
        z: isMobile ? 30 : 70
      };
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const animate = (currentTime: number) => {
    // Initialize on first frame
    if (lastFrameTimeRef.current === 0) {
      lastFrameTimeRef.current = currentTime;
    }

    // Delta time in seconds for consistent speed regardless of frame rate
    const deltaTime = (currentTime - lastFrameTimeRef.current) / 1000;
    lastFrameTimeRef.current = currentTime;

    // Update rotation based on elapsed time (not frame count)
    timeRef.current += ROTATION_SPEED * deltaTime;

    items.forEach((_, index) => {
      const el = cardRefs.current[index];
      if (!el) return;

      const offset = (index / items.length) * (Math.PI * 2);
      const angle = timeRef.current + offset;

      const { x: rx, y: ry, z: rz } = radiiRef.current;

      // Round to 2 decimal places to prevent sub-pixel jitter
      const x = Math.round(Math.cos(angle) * rx * 100) / 100;
      const y = Math.round(Math.sin(angle) * ry * 100) / 100;
      const z = Math.round(Math.sin(angle) * rz * 100) / 100;

      const scale = Math.round(Math.max(0.7, (z + 1000) / 1000) * 1000) / 1000;
      const zIndex = Math.round(z) + 50;

      el.style.transform = `translate3d(${x}px, ${y}px, ${z}px) scale(${scale})`;
      el.style.zIndex = zIndex.toString();
    });

    requestRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    lastFrameTimeRef.current = 0;
    requestRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(requestRef.current);
  }, [items]);

  return (
    <div className="relative w-full h-[500px] sm:h-[600px] md:h-[800px] flex items-center justify-center perspective-[1200px] overflow-hidden">
      
      <PortalVortex />

      <div className="absolute top-1/2 left-1/2 w-0 h-0">
        {items.map((dare, index) => (
          <div
            key={dare.id}
            ref={(el) => { cardRefs.current[index] = el }}
            className="absolute pointer-events-auto will-change-transform"
            style={{ transform: `translate3d(0px, 0px, -100px) scale(0)` }}
          >
            <div 
              className="-translate-x-1/2 -translate-y-1/2 cursor-pointer"
              onClick={() => onCardClick && onCardClick(dare)}
            >
              <ElectricCard
                badge={dare.displayTimer}
                title={dare.displayTitle}
                description={`${dare.displayBounty} USDC | ${dare.displayStreamer}`}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="absolute top-0 left-0 w-full h-full pointer-events-none flex items-center justify-center" style={{ marginTop: '-100px' }}>
        <div className="relative w-[90%] max-w-[350px] h-auto md:w-[800px] md:h-[800px] md:max-w-none z-[50]">
            {/* Optimized glow - smaller blur, GPU accelerated */}
            <div
              className="absolute inset-[10%] bg-purple-600/20 rounded-full animate-pulse"
              style={{
                filter: 'blur(40px)',
                transform: 'translateZ(0)',
                willChange: 'opacity'
              }}
            />

            {/* PeeBear with bottom fade mask - creates illusion of dipping into vortex */}
            <motion.img
              src="/assets/peebear-head.png"
              alt="BaseDare God"
              className="w-full h-full object-contain relative z-10"
              style={{
                filter: 'drop-shadow(0 0 30px rgba(168,85,247,0.6))',
                transform: 'translateZ(0)',
                willChange: 'transform',
                maskImage: 'linear-gradient(to bottom, black 0%, black 65%, transparent 95%)',
                WebkitMaskImage: 'linear-gradient(to bottom, black 0%, black 65%, transparent 95%)',
              }}
              animate={{ y: isMobile ? [0, -8, 0] : [0, -12, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            />
        </div>
      </div>

      {/* Event horizon overlay - renders ABOVE PeeBear to complete the dipping illusion */}
      <div
        className="absolute top-0 left-0 w-full h-full pointer-events-none flex items-center justify-center z-[60]"
        style={{ marginTop: '120px' }}
      >
        <div
          className="w-[180px] h-[180px] md:w-[280px] md:h-[280px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(0,0,0,1) 0%, rgba(0,0,0,0.95) 40%, rgba(0,0,0,0.7) 60%, transparent 75%)',
            transform: 'rotateX(75deg)',
            boxShadow: 'inset 0 0 60px rgba(168,85,247,0.4), 0 0 40px rgba(0,0,0,0.8)',
          }}
        />
      </div>
    </div>
  );
}