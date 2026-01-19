'use client';

import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import ElectricCard from "./ElectricCard";
import PortalVortex from "./PortalVortex";

const SPEED = 0.005;

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

  const animate = () => {
    timeRef.current += SPEED;
    
    items.forEach((_, index) => {
      const el = cardRefs.current[index];
      if (!el) return;

      const offset = (index / items.length) * (Math.PI * 2);
      const angle = timeRef.current + offset;

      const { x: rx, y: ry, z: rz } = radiiRef.current;

      const x = Math.cos(angle) * rx;
      const y = Math.sin(angle) * ry;
      const z = Math.sin(angle) * rz;

      const scale = Math.max(0.7, (z + 1000) / 1000);
      const zIndex = Math.round(z) + 50;

      el.style.transform = `translate3d(${x}px, ${y}px, ${z}px) scale(${scale})`;
      el.style.zIndex = zIndex.toString();
    });

    requestRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
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
        <div className="relative w-[90%] max-w-[350px] h-auto md:w-[1200px] md:h-[1200px] md:max-w-none z-[50]">
            <div className="absolute inset-0 bg-purple-600/30 blur-[60px] animate-pulse" />
            
            <motion.img 
              src="/assets/peebear-head.png" 
              alt="BaseDare God" 
              className="w-full h-full object-contain drop-shadow-[0_0_40px_rgba(168,85,247,0.8)] relative z-10"
              animate={{ y: isMobile ? [0, -8, 10, 0] : [0, -15, 20, 0] }}
              transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
            />
        </div>
      </div>
    </div>
  );
}