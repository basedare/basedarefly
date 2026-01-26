'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface PeeBearOrbProps {
  onRoarChange?: (isRoaring: boolean) => void;
  onLightningRoar?: (isRoaring: boolean) => void;
}

/**
 * PeeBearOrb - MGM Lion-style roaring animation
 * Crossfades between calm (OrbLiquid) and roaring (BurstingOrb) states
 * Lightning triggers every 2-3 roars for dramatic effect
 */
export default function PeeBearOrb({ onRoarChange, onLightningRoar }: PeeBearOrbProps) {
  const [isRoaring, setIsRoaring] = useState(false);
  const roarCountRef = useRef(0);
  const nextLightningRoarRef = useRef(2); // First lightning on 2nd roar

  // Notify parent of roar state changes
  useEffect(() => {
    onRoarChange?.(isRoaring);
  }, [isRoaring, onRoarChange]);

  // Roar cycle: calm for 4s, then roar for 1.5s, repeat
  useEffect(() => {
    const roarCycle = () => {
      roarCountRef.current += 1;

      // Check if this roar should trigger lightning
      const shouldTriggerLightning = roarCountRef.current >= nextLightningRoarRef.current;

      if (shouldTriggerLightning) {
        // Reset counter and set next lightning to 2-3 roars away
        roarCountRef.current = 0;
        nextLightningRoarRef.current = Math.random() < 0.5 ? 2 : 3;
        onLightningRoar?.(true);
      }

      // Start roar animation (always happens)
      setIsRoaring(true);

      // End roar after 1.5s
      setTimeout(() => {
        setIsRoaring(false);
        if (shouldTriggerLightning) {
          onLightningRoar?.(false);
        }
      }, 1500);
    };

    // Initial delay before first roar
    const initialDelay = setTimeout(() => {
      roarCycle();
    }, 3000);

    // Set up repeating cycle
    const interval = setInterval(() => {
      roarCycle();
    }, 6000); // Every 6 seconds

    return () => {
      clearTimeout(initialDelay);
      clearInterval(interval);
    };
  }, [onLightningRoar]);

  return (
    <div className="relative w-[220px] h-[220px] flex items-center justify-center">
      {/* Ambient glow - pulses during roar */}
      <motion.div
        className="absolute inset-0 rounded-full"
        animate={{
          scale: isRoaring ? 1.3 : 1.1,
          opacity: isRoaring ? 0.6 : 0.3,
        }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        style={{
          background: 'radial-gradient(circle, rgba(168, 85, 247, 0.5) 0%, rgba(250, 204, 21, 0.2) 50%, transparent 70%)',
          filter: 'blur(30px)',
        }}
      />

      {/* Glass shine overlay - moves across the orb */}
      <motion.div
        className="absolute inset-0 rounded-full pointer-events-none z-20 overflow-hidden"
        style={{
          background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.15) 45%, rgba(255,255,255,0.05) 50%, transparent 55%)',
          backgroundSize: '200% 200%',
        }}
        animate={{
          backgroundPosition: ['0% 0%', '200% 200%'],
        }}
        transition={{
          duration: 3,
          ease: 'linear',
          repeat: Infinity,
          repeatDelay: 2,
        }}
      />

      {/* Calm state - OrbLiquid */}
      <AnimatePresence>
        {!isRoaring && (
          <motion.div
            key="calm"
            className="absolute inset-0 flex items-center justify-center"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ duration: 0.4, ease: 'easeInOut' }}
          >
            <motion.img
              src="/assets/OrbLiquid.png"
              alt="PeeBear"
              className="w-full h-full object-contain drop-shadow-2xl"
              animate={{
                scale: [1, 1.02, 1],
                y: [0, -4, 0],
              }}
              transition={{
                duration: 4,
                ease: 'easeInOut',
                repeat: Infinity,
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Roaring state - BurstingOrb */}
      <AnimatePresence>
        {isRoaring && (
          <motion.div
            key="roar"
            className="absolute inset-0 flex items-center justify-center"
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 1, scale: 1.08 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          >
            <motion.img
              src="/assets/BurstingOrb.png"
              alt="PeeBear Roaring"
              className="w-full h-full object-contain drop-shadow-2xl"
              animate={{
                x: [0, -2, 2, -1, 1, 0],
                y: [0, 1, -1, 1, 0],
              }}
              transition={{
                duration: 0.3,
                ease: 'easeInOut',
                repeat: 3,
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Roar flash effect */}
      <AnimatePresence>
        {isRoaring && (
          <motion.div
            className="absolute inset-0 rounded-full pointer-events-none z-10"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.4, 0] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            style={{
              background: 'radial-gradient(circle, rgba(250, 204, 21, 0.6) 0%, transparent 60%)',
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
