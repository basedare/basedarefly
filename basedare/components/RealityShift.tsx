'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';

interface RealityShiftProps {
  trigger: boolean;
  onComplete?: () => void;
}

/**
 * RealityShift - Control → Chaos transition
 * White VHS static → CRT TV turning OFF (collapse to line) → void
 * Mobile optimized: uses CSS transforms (GPU accelerated)
 */
export default function RealityShift({ trigger, onComplete }: RealityShiftProps) {
  const [isAnimating, setIsAnimating] = useState(false);
  const [phase, setPhase] = useState<'idle' | 'static' | 'collapse' | 'line' | 'dot' | 'void'>('idle');
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile on mount
  useEffect(() => {
    setIsMobile(window.innerWidth < 768);
  }, []);

  useEffect(() => {
    if (trigger && !isAnimating) {
      setIsAnimating(true);
      setPhase('static');

      // Slightly faster on mobile for snappier feel
      const timings = isMobile
        ? { collapse: 150, line: 280, dot: 400, void: 520, end: 650 }
        : { collapse: 200, line: 350, dot: 500, void: 650, end: 800 };

      setTimeout(() => setPhase('collapse'), timings.collapse);
      setTimeout(() => setPhase('line'), timings.line);
      setTimeout(() => setPhase('dot'), timings.dot);
      setTimeout(() => setPhase('void'), timings.void);
      setTimeout(() => {
        setPhase('idle');
        setIsAnimating(false);
        onComplete?.();
      }, timings.end);
    }
  }, [trigger, isAnimating, onComplete, isMobile]);

  return (
    <AnimatePresence>
      {isAnimating && (
        <>
          {/* White base - the Control world */}
          <motion.div
            className="fixed inset-0 z-[9994] pointer-events-none bg-white"
            initial={{ opacity: 1 }}
            animate={{
              opacity: phase === 'static' || phase === 'collapse' ? 1 :
                       phase === 'line' || phase === 'dot' || phase === 'void' ? 0 : 0,
            }}
            transition={{ duration: 0.1 }}
          />

          {/* VHS Static overlay - white/grey noise (simplified on mobile) */}
          <motion.div
            className="fixed inset-0 z-[9997] pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{
              opacity: phase === 'static' ? (isMobile ? 0.5 : [0, 0.7, 0.5, 0.8, 0.6]) :
                       phase === 'collapse' ? (isMobile ? 0.2 : [0.6, 0.3]) : 0,
            }}
            transition={{ duration: phase === 'static' ? 0.15 : 0.1 }}
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='${isMobile ? 2 : 4}' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
              backgroundSize: isMobile ? '200px 200px' : '150px 150px',
              mixBlendMode: 'multiply',
            }}
          />

          {/* VHS tracking distortion */}
          <motion.div
            className="fixed inset-0 z-[9996] pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{
              opacity: phase === 'static' ? 0.4 :
                       phase === 'collapse' ? 0.2 : 0,
            }}
            transition={{ duration: 0.1 }}
            style={{
              backgroundImage: 'repeating-linear-gradient(0deg, transparent 0px, transparent 3px, rgba(0,0,0,0.05) 3px, rgba(0,0,0,0.05) 6px)',
            }}
          />

          {/* CRT Collapse - screen compressing to center */}
          <motion.div
            className="fixed left-0 right-0 z-[9998] pointer-events-none bg-white overflow-hidden"
            style={{
              top: '50%',
              transformOrigin: 'center',
            }}
            initial={{ height: '100vh', y: '-50%' }}
            animate={{
              height: phase === 'static' ? '100vh' :
                      phase === 'collapse' ? '20vh' :
                      phase === 'line' ? '3px' :
                      phase === 'dot' || phase === 'void' ? '3px' : '100vh',
              y: '-50%',
              opacity: phase === 'void' ? 0 : 1,
            }}
            transition={{
              duration: phase === 'collapse' ? 0.15 :
                        phase === 'line' ? 0.12 :
                        phase === 'dot' ? 0.1 : 0.05,
              ease: [0.4, 0, 1, 1],
            }}
          >
            {/* Static inside the collapsing screen - lighter on mobile */}
            {!isMobile && (
              <div
                className="absolute inset-0"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
                  backgroundSize: '100px 100px',
                  opacity: 0.3,
                }}
              />
            )}
          </motion.div>

          {/* The horizontal line glow */}
          <motion.div
            className="fixed left-0 right-0 z-[9999] pointer-events-none"
            style={{
              top: '50%',
              transform: 'translateY(-50%)',
              height: '3px',
            }}
            initial={{ opacity: 0, scaleX: 1 }}
            animate={{
              opacity: phase === 'line' ? 1 :
                       phase === 'dot' ? 1 :
                       phase === 'void' ? 0 : 0,
              scaleX: phase === 'line' ? 1 :
                      phase === 'dot' ? 0 :
                      phase === 'void' ? 0 : 1,
              boxShadow: phase === 'line' || phase === 'dot' ?
                '0 0 20px 5px rgba(255,255,255,0.8), 0 0 40px 10px rgba(255,255,255,0.4)' :
                '0 0 0 0 transparent',
            }}
            transition={{
              duration: phase === 'dot' ? 0.15 : 0.1,
              ease: 'easeIn',
            }}
          >
            <div className="w-full h-full bg-white" />
          </motion.div>

          {/* Black void rising */}
          <motion.div
            className="fixed inset-0 z-[9993] pointer-events-none bg-black"
            initial={{ opacity: 0 }}
            animate={{
              opacity: phase === 'collapse' ? 0.2 :
                       phase === 'line' ? 0.6 :
                       phase === 'dot' ? 0.9 :
                       phase === 'void' ? [1, 0] : 0,
            }}
            transition={{
              duration: phase === 'void' ? 0.15 : 0.1,
            }}
          />

          {/* Purple chaos bleed at the end */}
          <motion.div
            className="fixed inset-0 z-[9992] pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{
              opacity: phase === 'void' ? [0, 0.5, 0] : 0,
            }}
            transition={{ duration: 0.2 }}
            style={{
              background: 'radial-gradient(circle at center, rgba(168,85,247,0.4) 0%, transparent 60%)',
            }}
          />
        </>
      )}
    </AnimatePresence>
  );
}
