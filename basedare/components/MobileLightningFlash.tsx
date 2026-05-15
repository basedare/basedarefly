'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import dynamic from 'next/dynamic';
import { getClientPerformanceHints, runAfterPageIdle, shouldPreferLightweightClient } from '@/lib/client-performance';

// Lazy load Lightning to avoid SSR issues with WebGL
const Lightning = dynamic(() => import('./Lightning'), { ssr: false });
const ENABLE_PERIODIC_MOBILE_LIGHTNING = process.env.NEXT_PUBLIC_ENABLE_MOBILE_LIGHTNING === 'true';

/**
 * MobileLightningFlash - Periodic lightning effect for mobile pages
 * Triggers a brief lightning flash every 9 seconds
 * Only visible on mobile (md:hidden)
 * EXCLUDES home page (/) which has its own PeeBear-triggered lightning
 */
export default function MobileLightningFlash() {
  const pathname = usePathname();
  const [isFlashing, setIsFlashing] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [canFlash, setCanFlash] = useState(false);

  // Skip on home page - it has its own PeeBear-triggered lightning
  const isHomePage = pathname === '/';

  // Check if we're on mobile
  useEffect(() => {
    const checkMobile = () => {
      const hints = getClientPerformanceHints();
      const nextIsMobile = hints.isMobileViewport;
      setIsMobile(nextIsMobile);
      setCanFlash(
        ENABLE_PERIODIC_MOBILE_LIGHTNING &&
          nextIsMobile &&
          !hints.prefersReducedMotion &&
          !hints.saveData &&
          !hints.slowConnection &&
          !hints.isLowMemory
      );
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Lightning flash cycle: opt-in and idle-gated so mobile pages do not
  // create surprise WebGL contexts while the route is still warming.
  useEffect(() => {
    if (!canFlash || isHomePage || shouldPreferLightweightClient()) return;

    let flashTimeout: ReturnType<typeof setTimeout> | null = null;
    let initialDelay: ReturnType<typeof setTimeout> | null = null;
    let interval: ReturnType<typeof setInterval> | null = null;
    const triggerFlash = () => {
      if (document.visibilityState === 'hidden') return;
      setIsFlashing(true);
      flashTimeout = setTimeout(() => setIsFlashing(false), 650);
    };

    const cancelIdle = runAfterPageIdle(() => {
      initialDelay = setTimeout(() => {
        triggerFlash();
      }, 9000 + Math.random() * 4000);

      interval = setInterval(() => {
        triggerFlash();
      }, 30000);
    }, 7000);

    return () => {
      cancelIdle();
      if (flashTimeout) clearTimeout(flashTimeout);
      if (initialDelay) clearTimeout(initialDelay);
      if (interval) clearInterval(interval);
    };
  }, [canFlash, isHomePage]);

  // Don't render on desktop or home page
  if (!isMobile || !canFlash || isHomePage) return null;

  return (
    <AnimatePresence>
      {isFlashing && (
        <motion.div
          className="fixed inset-0 z-[2] pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.5 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
        >
          <Lightning
            hue={270}
            xOffset={0}
            speed={2.5}
            intensity={1.5}
            size={1.0}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
