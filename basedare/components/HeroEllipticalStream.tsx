'use client';

import React, { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import ElectricCard from "./ElectricCard";
import PortalVortex from "./PortalVortex";

const SPEED = 0.005;

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
  const items = (dares.length > 0 ? dares : MOCK_DARES).slice(0, 6);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const timeRef = useRef(0);
  const requestRef = useRef<number>(0);
  
  // Adjusted radius for better mobile view
  const radiiRef = useRef({ x: 550, y: 50, z: 70 });

  useEffect(() => {
    const handleResize = () => {
      const isMobile = window.innerWidth < 768;
      radiiRef.current = {
        x: isMobile ? 180 : 550, // Much tighter radius on mobile to prevent overflow
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
    <div className="relative w-full h-[800px] flex items-center justify-center perspective-[1200px] overflow-hidden">
      
      {/* 1. PORTAL VORTEX - Background Layer */}
      <PortalVortex />

      {/* 2. ORBITING CARDS */}
      <div className="absolute top-1/2 left-1/2 w-0 h-0">
        {items.map((dare, index) => (
          <div
            key={dare.id || index}
            ref={(el) => { cardRefs.current[index] = el }}
            className="absolute pointer-events-auto will-change-transform"
            style={{ transform: `translate3d(0px, 0px, -100px) scale(0)` }}
          >
            <div 
              className="-translate-x-1/2 -translate-y-1/2 cursor-pointer"
              onClick={() => onCardClick && onCardClick(dare)}
            >
              <ElectricCard
                badge={dare.expiry_timer || "24H"}
                title={dare.description || dare.title}
                description={`${dare.stake_amount} BD | ${dare.streamer_name || "@Anon"}`}
              />
            </div>
          </div>
        ))}
      </div>

      {/* 3. PEEBEAR HEAD - Center */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none flex items-center justify-center">
        <div className="relative w-64 h-64 md:w-96 md:h-96 z-[50]">
            <div className="absolute inset-0 bg-purple-600/30 blur-[60px] animate-pulse" />
            
            {/* Using standard img for stability instead of motion.img if causing issues */}
            <motion.img 
              src="/assets/peebear-head.png" 
              alt="BaseDare God" 
              className="w-full h-full object-contain drop-shadow-[0_0_40px_rgba(168,85,247,0.8)] relative z-10"
              animate={{ y: [0, -15, 20, 0] }}
              transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
            />
        </div>
      </div>
    </div>
  );
}
