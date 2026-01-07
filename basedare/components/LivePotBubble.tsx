// components/LivePotBubble.tsx (PURPLE AMBIENT GLOW RESTORED + BULLETPROOF BASKETBALL BOUNCE)
'use client';

import { motion } from 'framer-motion';
import { useEffect, useState, useRef } from 'react';

interface LivePotBubbleProps {
  className?: string;
}

export default function LivePotBubble({ className }: LivePotBubbleProps = {}) {
  const [translateY, setTranslateY] = useState(0); // Combined offset + bounce
  const [triggerBounce, setTriggerBounce] = useState(false);
  const potRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const prevDistance = useRef<number>(0); // Track previous to detect entry

  // --- THE ELEVATOR SCRIPT (GPU-Accelerated + Basketball Bounce - Bulletproof) ---
  useEffect(() => {
    const updatePosition = () => {
      const footer = document.getElementById('site-footer');
      const pot = potRef.current;
      if (!footer || !pot) return;

      const footerRect = footer.getBoundingClientRect();
      const potHeight = pot.offsetHeight;
      const gap = 24; // Desired space above footer
      const windowHeight = window.innerHeight;

      const distanceToFooterTop = windowHeight - footerRect.top; // Positive when footer entering

      // Detect collision entry (scrolling down into danger zone)
      if (distanceToFooterTop > prevDistance.current && distanceToFooterTop > 0) {
        if (distanceToFooterTop > potHeight + gap) {
          // Deep collision imminent → trigger bounce once
          if (!triggerBounce) {
            setTriggerBounce(true);
            setTimeout(() => setTriggerBounce(false), 1200); // Match animation duration
          }
        }
      }
      prevDistance.current = distanceToFooterTop;

      if (distanceToFooterTop > potHeight + gap) {
        // Park safely above footer (stop it from going lower)
        setTranslateY(-(potHeight + gap));
      } else if (distanceToFooterTop > 0) {
        // Partial overlap → lift just enough (smooth glide in)
        setTranslateY(-distanceToFooterTop);
      } else {
        // No collision → normal position
        setTranslateY(0);
      }
    };

    const onScroll = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(updatePosition);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    updatePosition();

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [triggerBounce]);
  // ---------------------------

  return (
    // Orb Container: Size increased to w-44 h-44, transparent base, and crucial overflow-hidden
    <motion.div
      ref={potRef}
      className={`fixed bottom-6 right-6 w-44 h-44 
                  rounded-full flex flex-col justify-center items-center p-2 z-40 
                  border-2 border-purple-500/50 backdrop-blur-sm overflow-hidden 
                  shadow-[0_0_20px_rgba(168,85,247,0.4)]
                  will-change-transform origin-bottom
                  ${className || ''}`}
      style={{ 
        // 1. GPU Acceleration: Use transform instead of bottom
        transform: `translateY(${translateY}px)`,
        // 2. The Physics Curve: Disable transition during bounce for smooth animation
        transition: triggerBounce ? 'none' : 'transform 300ms cubic-bezier(0.16, 1, 0.3, 1)'
      }}
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ type: 'spring', stiffness: 150, delay: 0.5 }}
      whileHover={{ 
        scale: 1.08,
        transition: { 
          type: "spring", 
          stiffness: 200, 
          damping: 15,
          duration: 0.6
        } 
      }}
    >
      
      {/* 1. PRIMARY SPINNING VORTEX (z-0) */}
      <div 
        className="absolute inset-[-100%] z-0 opacity-95 mix-blend-color-dodge pointer-events-none rounded-full"
        style={{
          backgroundImage: `conic-gradient(from 0deg, transparent 0deg, #A855F7 90deg, transparent 180deg, #FACC15 270deg, transparent 360deg)`,
          animation: "spinGlobe 10s linear infinite",
          filter: "blur(4px)",
          transform: 'scale(1.8)'
        }}
      />

      {/* 2. COUNTER-VORTEX LAYER (z-0) */}
      <div 
        className="absolute inset-[-100%] z-0 opacity-60 mix-blend-screen pointer-events-none rounded-full"
        style={{
          backgroundImage: `conic-gradient(from 0deg, #FACC15, #A855F7, transparent)`,
          animation: "spinGlobe 20s linear infinite reverse",
          filter: "blur(8px)",
          transform: 'scale(2)'
        }}
      />
      
      {/* 3. DEEP PURPLE AMBIENT GLOW (NEW LAYER) */}
      {/* This layer provides the soft, sexy purple background glow that permeates the orb. */}
      <div 
        className="absolute inset-0 z-0 pointer-events-none rounded-full"
        style={{
          background: "radial-gradient(circle at center, #A855F7 0%, #6B21A8 50%, transparent 80%)",
          opacity: 0.25, // Subtle opacity
          filter: "blur(30px)", // Soft, wide blur
        }}
      />

      {/* 4. INNER PULSE GLOW (z-10) */}
      <motion.div
        className="absolute inset-0 rounded-full pointer-events-none z-10"
        animate={{ boxShadow: ["0 0 10px rgba(168,85,247,0.3)", "0 0 20px rgba(168,85,247,0.6)", "0 0 10px rgba(168,85,247,0.3)"] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* 5. SPHERICAL SHADING (Enhanced 3D Depth) */}
      <div className="absolute inset-0 rounded-full pointer-events-none z-[15] shadow-[inset_-12px_-12px_30px_rgba(0,0,0,0.95),_inset_6px_6px_20px_rgba(255,255,255,0.15),_inset_0_-20px_40px_rgba(168,85,247,0.2)]" />
      
      {/* 6. SPECULAR HIGHLIGHTS (Enhanced Glossy Reflections) */}
      {/* Primary highlight */}
      <div className="absolute top-6 left-8 w-16 h-8 bg-white/25 rounded-full blur-lg -rotate-12 pointer-events-none z-[25]" />
      {/* Secondary smaller highlight */}
      <div className="absolute top-8 left-10 w-8 h-4 bg-white/30 rounded-full blur-sm -rotate-12 pointer-events-none z-[26]" />
      {/* Tertiary edge highlight */}
      <div className="absolute top-12 left-14 w-6 h-3 bg-white/40 rounded-full blur-[2px] -rotate-45 pointer-events-none z-[27]" />
      
      {/* 7. THE LIQUID GLASS SURFACE (The Transparent Blur) */}
      <div 
        className="absolute inset-0 z-20 rounded-full pointer-events-none"
        style={{
          backdropFilter: 'blur(8px) saturate(180%)',
          background: 'rgba(0, 0, 0, 0.2)', 
          boxShadow: 'inset 0 0 0 1px rgba(255, 255, 255, 0.1)',
        }}
      />
      
      {/* 8. Content (Highest Z-index) */}
      <div className={`absolute inset-0 z-30 flex flex-col justify-center items-center text-center p-2 ${triggerBounce ? 'animate-basketball-bounce' : ''}`}>
        <div className="text-xs font-semibold text-purple-300 uppercase tracking-widest drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">LIVE POT</div>
        <div className="live-pot-value text-3xl font-extrabold drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">$86,227</div> 
      </div>
    </motion.div>
  );
}
