'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import dynamic from 'next/dynamic';

// Lazy load Lightning to avoid SSR issues with WebGL
const Lightning = dynamic(() => import('./Lightning'), { ssr: false });

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

  // Skip on home page - it has its own PeeBear-triggered lightning
  const isHomePage = pathname === '/';

  // Check if we're on mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Lightning flash cycle - every 9 seconds, flash for 0.8s
  useEffect(() => {
    // Skip if not mobile or if on home page
    if (!isMobile || isHomePage) return;

    const triggerFlash = () => {
      setIsFlashing(true);
      setTimeout(() => setIsFlashing(false), 800);
    };

    // Initial delay before first flash (randomize a bit)
    const initialDelay = setTimeout(() => {
      triggerFlash();
    }, 5000 + Math.random() * 2000);

    // Repeating flash every 9 seconds
    const interval = setInterval(() => {
      triggerFlash();
    }, 9000);

    return () => {
      clearTimeout(initialDelay);
      clearInterval(interval);
    };
  }, [isMobile, isHomePage]);

  // Don't render on desktop or home page
  if (!isMobile || isHomePage) return null;

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
