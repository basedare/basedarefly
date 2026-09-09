'use client';

import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import ElectricCard from "./ElectricCard";
import PortalVortex from "./PortalVortex";
import { HOME_ACTIVITY_EXAMPLES } from '@/lib/home-activity-examples';

const ORBIT_DURATION_MS = 60_000;

// The curated orbit explains participation; real inventory lives in Live Around You.
interface HeroDare {
  id: string;
  short_id?: string;
  description?: string;
  title?: string;
  stake_amount: number;
  streamer_name?: string | null;
  expiry_timer?: string;
  example?: boolean;
  valueLabel?: string;
  participationLabel?: string;
  href?: string;
}

interface HeroProps {
  dares?: HeroDare[];
  onCardClick?: (dare: HeroDare) => void;
}

export default function HeroEllipticalStream({ dares = [], onCardClick }: HeroProps) {
  const items: HeroDare[] = (dares.length > 0 ? dares : HOME_ACTIVITY_EXAMPLES).slice(0, 6);
  const itemCount = items.length;
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

  useEffect(() => {
    let lastFrameAt: number | null = null;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const positionCards = () => {
      for (let index = 0; index < itemCount; index += 1) {
        const el = cardRefs.current[index];
        if (!el) continue;

        const offset = (index / itemCount) * (Math.PI * 2);
        const angle = timeRef.current + offset;
        const { x: rx, y: ry, z: rz } = radiiRef.current;
        const x = Math.cos(angle) * rx;
        const y = Math.sin(angle) * ry;
        const z = Math.sin(angle) * rz;
        const scale = Math.max(0.7, (z + 1000) / 1000);

        el.style.transform = `translate3d(${x}px, ${y}px, ${z}px) scale(${scale})`;
        el.style.zIndex = (Math.round(z) + 50).toString();
      }
    };

    if (reduceMotion) {
      positionCards();
      return undefined;
    }

    const animate = (frameAt: number) => {
      if (lastFrameAt !== null) {
        const elapsed = Math.min(frameAt - lastFrameAt, 64);
        timeRef.current += (elapsed / ORBIT_DURATION_MS) * Math.PI * 2;
      }
      lastFrameAt = frameAt;
      positionCards();
      requestRef.current = requestAnimationFrame(animate);
    };

    requestRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(requestRef.current);
  }, [itemCount]);

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
            <Link
              href={dare.example ? dare.href ?? '/how-it-works' : dares.length > 0 && dare.short_id
                ? `/dare/${encodeURIComponent(dare.short_id)}`
                : '/map?source=home-orbit'}
              className="block -translate-x-1/2 -translate-y-1/2 cursor-pointer"
              onClick={() => onCardClick && onCardClick(dare)}
              aria-label={dare.example ? `Example: ${dare.description}. See how it works` : `Open ${dare.description || dare.title}`}
            >
              <ElectricCard
                badge={dare.expiry_timer || "24H"}
                title={dare.description || dare.title || "OPEN MISSION"}
                description={dare.example ? `${dare.valueLabel} | ${dare.participationLabel}` : `${dare.stake_amount} USDC | ${dare.streamer_name || "@Anon"}`}
                rewardLabel={dare.example ? 'HOW YOU TAKE PART' : undefined}
              />
            </Link>
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
            src="/assets/peebear-head.webp"
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
