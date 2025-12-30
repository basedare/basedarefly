'use client';
import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import HoloCard from '@/components/ui/holo-card';

// Card data for orbiting display
const CARDS = [
  { id: 1, dare: "SHAVE EYEBROW", bounty: "2,500 BD", time: "12:00m", streamer: "@xQc_Warlord" },
  { id: 2, dare: "EAT REAPER", bounty: "5,000 BD", time: "01:20s", streamer: "@Kai_Cenat" },
  { id: 3, dare: "JUMP THE GAP", bounty: "1,000 BD", time: "00:45s", streamer: "@Speed_Official" },
  { id: 4, dare: "DELETE VOD", bounty: "7,500 BD", time: "05:00m", streamer: "@Trainwreck" },
  { id: 5, dare: "CALL YOUR EX", bounty: "10,000 BD", time: "00:30s", streamer: "@Pokimane" },
];

// PHYSICS CONSTANTS (2x Speed)
const RADIUS_X = 320; // Tighter orbit for smaller bear
const RADIUS_Y = 45;
const SPEED = 0.004;

interface OrbitingDaresProps {
  setActiveChat?: (card: typeof CARDS[0]) => void;
}

export default function OrbitingDares({ setActiveChat }: OrbitingDaresProps = {}) {
  const cardsRef = useRef<(HTMLDivElement | null)[]>([]);
  const positionsRef = useRef<Array<{ x: number; y: number; z: number; scale: number; opacity: number; zIndex: number }>>(
    CARDS.map(() => ({ x: 0, y: 0, z: 0, scale: 1, opacity: 1, zIndex: 100 }))
  );
  const requestRef = useRef<number>();
  const timeRef = useRef(0);

  useEffect(() => {
    const animate = () => {
      timeRef.current += SPEED;

      CARDS.forEach((_, index) => {
        // Orbit Logic
        const angle = timeRef.current + (index / CARDS.length) * (2 * Math.PI);
        const x = Math.cos(angle) * RADIUS_X;
        const z = Math.sin(angle) * RADIUS_X;
        const y = Math.sin(angle) * RADIUS_Y;

        // Perspective & Layering
        const scale = (z + 1200) / 1200; // Smoother scale
        const opacity = Math.max(0.4, (z + 600) / 900);
        const zIndex = Math.round(z < 0 ? 50 : 150);

        // Store position for render
        positionsRef.current[index] = { x, y, z, scale, opacity, zIndex };
      });

      // Force re-render by updating refs
      CARDS.forEach((_, index) => {
        const card = cardsRef.current[index];
        if (!card) return;
        const pos = positionsRef.current[index];
        card.style.transform = `translate3d(${pos.x}px, ${pos.y}px, ${pos.z}px) scale(${pos.scale})`;
        card.style.opacity = pos.opacity.toString();
        card.style.zIndex = pos.zIndex.toString();
      });

      requestRef.current = requestAnimationFrame(animate);
    };

    requestRef.current = requestAnimationFrame(animate);
    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, []);

  return (
    <div className="absolute pointer-events-none" style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>
      {/* 2. ORBITING CARDS */}
      {CARDS.map((card, index) => {
        const pos = positionsRef.current[index] || { x: 0, y: 0, z: 0, scale: 1, opacity: 1, zIndex: 100 };
        const { x, y, z, scale, opacity, zIndex } = pos;

        return (
          <div
            key={card.id}
            ref={(el) => {
              cardsRef.current[index] = el;
            }}
            className="absolute pointer-events-auto"
          >
            <div className="-translate-x-1/2 -translate-y-1/2">
              <motion.div
                whileHover={{ scale: 1.1, y: -20, zIndex: 100 }}
                onClick={() => setActiveChat?.(card)}
                className="cursor-pointer"
              >
                <HoloCard
                  title={card.dare}
                  bounty={card.bounty}
                  streamer={card.streamer}
                  time={card.time}
                  className="w-80 h-96 transition-all duration-300 hover:scale-105 hover:z-50"
                />
              </motion.div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
