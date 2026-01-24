'use client';

import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import ElectricCard from "./ElectricCard";
import PortalVortex from "./PortalVortex";

const SPEED = 0.005;

// Featured dares - attention grabbing examples
const FEATURED_DARES = [
  { id: '1', description: "LICK A CACTUS", stake_amount: 50000, streamer_name: "@KaiCenat", expiry_timer: "🔥 HOT" },
  { id: '2', description: "CALL MOM & CONFESS", stake_amount: 25000, streamer_name: "@Speed", expiry_timer: "😈 LIVE" },
  { id: '3', description: "TATTOO VIEWER'S NAME", stake_amount: 100000, streamer_name: "@xQc", expiry_timer: "💀 PERM" },
  { id: '4', description: "EAT CAT FOOD ON CAM", stake_amount: 10000, streamer_name: "@Adin", expiry_timer: "🤮 NOW" },
  { id: '5', description: "DM YOUR EX 'I MISS U'", stake_amount: 15000, streamer_name: "@Poki", expiry_timer: "💔 YOLO" },
  { id: '6', description: "SHAVE HEAD BALD", stake_amount: 250000, streamer_name: "@Ludwig", expiry_timer: "✂️ GONE" },
];

interface HeroProps {
  dares?: any[];
  onCardClick?: (dare: any) => void;
}

export default function HeroEllipticalStream({ dares = [], onCardClick }: HeroProps) {
  const items = (dares.length > 0 ? dares : FEATURED_DARES).slice(0, 6);
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

      {/* 1. PORTAL VORTEX - Background Layer */}
      <PortalVortex />

      {/* 2. ORBITING CARDS - Cards orbit AROUND the bear head */}
      <div className="absolute top-1/2 left-1/2 w-0 h-0">
        {items.map((dare, index) => (
          <div
            key={dare.id || index}
            ref={(el) => { cardRefs.current[index] = el }}
            className="absolute pointer-events-auto"
            style={{
              transform: `translate3d(0px, 0px, -100px) scale(0)`,
              willChange: 'transform',
              backfaceVisibility: 'hidden',
            }}
          >
            <div
              className="-translate-x-1/2 -translate-y-1/2 cursor-pointer"
              onClick={() => onCardClick && onCardClick(dare)}
            >
              <ElectricCard
                badge={dare.expiry_timer || "24H"}
                title={dare.description || dare.title}
                description={`${dare.stake_amount} USDC | ${dare.streamer_name || "@Anon"}`}
              />
            </div>
          </div>
        ))}
      </div>

      {/* 3. PEEBEAR HEAD - Center with z-50 so cards orbit around it */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none flex items-center justify-center" style={{ marginTop: '-100px' }}>
        <div className="relative w-[90%] max-w-[350px] h-auto md:w-[800px] md:h-[800px] md:max-w-none z-[50]">
          {/* Glow effect */}
          <div
            className="absolute inset-[10%] bg-purple-600/20 rounded-full"
            style={{
              filter: 'blur(40px)',
              transform: 'translateZ(0)',
              opacity: 0.6,
            }}
          />

          {/* PeeBear with floating animation */}
          <motion.img
            src="/assets/peebear-head.png"
            alt="BaseDare God"
            width={800}
            height={800}
            className="w-full h-full object-contain relative z-10"
            style={{
              filter: 'drop-shadow(0 0 30px rgba(168,85,247,0.6))',
              transform: 'translateZ(0)',
              willChange: 'transform',
              backfaceVisibility: 'hidden',
              maskImage: 'linear-gradient(to bottom, black 0%, black 65%, transparent 95%)',
              WebkitMaskImage: 'linear-gradient(to bottom, black 0%, black 65%, transparent 95%)',
            }}
            animate={{ y: isMobile ? [0, -8, 0] : [0, -12, 0] }}
            transition={{
              duration: 6,
              repeat: Infinity,
              ease: "easeInOut",
              type: "tween"
            }}
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
