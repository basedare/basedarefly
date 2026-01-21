// components/LivePotBubble.tsx (PURPLE AMBIENT GLOW RESTORED + BULLETPROOF BASKETBALL BOUNCE)
'use client';

import { motion } from 'framer-motion';
import { useEffect, useState, useRef } from 'react';
import { useView } from '@/app/context/ViewContext';

interface LivePotBubbleProps {
  className?: string;
}

export default function LivePotBubble({ className }: LivePotBubbleProps = {}) {
  const { isControlMode } = useView(); // Use global context
  const [translateY, setTranslateY] = useState(0);
  const [triggerBounce, setTriggerBounce] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const potRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const prevDistance = useRef<number>(0);

  // Detect mobile for scale
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // THE ELEVATOR SCRIPT (GPU-Accelerated + Basketball Bounce)
  useEffect(() => {
    const updatePosition = () => {
      const footer = document.getElementById('site-footer');
      const pot = potRef.current;
      if (!footer || !pot) return;

      const footerRect = footer.getBoundingClientRect();
      const potHeight = pot.offsetHeight;
      const gap = 24;
      const windowHeight = window.innerHeight;
      const distanceToFooterTop = windowHeight - footerRect.top;

      if (distanceToFooterTop > prevDistance.current && distanceToFooterTop > 0) {
        if (distanceToFooterTop > potHeight + gap) {
          if (!triggerBounce) {
            setTriggerBounce(true);
            setTimeout(() => setTriggerBounce(false), 1200);
          }
        }
      }
      prevDistance.current = distanceToFooterTop;

      if (distanceToFooterTop > potHeight + gap) {
        setTranslateY(-(potHeight + gap));
      } else if (distanceToFooterTop > 0) {
        setTranslateY(-distanceToFooterTop);
      } else {
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
  }, [triggerBounce]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <motion.div
      ref={potRef}
      className={`
        fixed z-40 will-change-transform origin-bottom-right
        rounded-full flex flex-col justify-center items-center p-2
        border-2 backdrop-blur-sm overflow-hidden
        w-44 h-44
        bottom-4 right-2 scale-75
        md:bottom-6 md:right-6 md:scale-100
        ${isControlMode
          ? 'border-zinc-400/50 shadow-[0_0_20px_rgba(120,120,120,0.4)]'
          : 'border-purple-500/50 shadow-[0_0_20px_rgba(168,85,247,0.4)]'
        }
        ${className || ''}
      `}
      style={{
        transform: `translateY(${translateY}px) translateZ(0)`,
        transition: triggerBounce ? 'none' : 'transform 300ms cubic-bezier(0.16, 1, 0.3, 1)',
        // Noir filter for Control mode
        filter: isControlMode ? 'grayscale(1) contrast(1.1) brightness(0.95)' : 'none',
        WebkitFilter: isControlMode ? 'grayscale(1) contrast(1.1) brightness(0.95)' : 'none',
      }}
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ type: 'spring', stiffness: 150, delay: 0.5 }}
      whileHover={{
        scale: 1.08,
        transition: { type: "spring", stiffness: 200, damping: 15, duration: 0.6 }
      }}
    >
      {/* PRIMARY SPINNING VORTEX */}
      <div
        className="absolute inset-[-100%] z-0 opacity-95 mix-blend-color-dodge pointer-events-none rounded-full"
        style={{
          backgroundImage: `conic-gradient(from 0deg, transparent 0deg, #A855F7 90deg, transparent 180deg, #FACC15 270deg, transparent 360deg)`,
          animation: "spinGlobe 10s linear infinite",
          filter: "blur(4px)",
          transform: 'scale(1.8)'
        }}
      />

      {/* COUNTER-VORTEX LAYER */}
      <div
        className="absolute inset-[-100%] z-0 opacity-60 mix-blend-screen pointer-events-none rounded-full"
        style={{
          backgroundImage: `conic-gradient(from 0deg, #FACC15, #A855F7, transparent)`,
          animation: "spinGlobe 20s linear infinite reverse",
          filter: "blur(8px)",
          transform: 'scale(2)'
        }}
      />

      {/* DEEP PURPLE AMBIENT GLOW */}
      <div
        className="absolute inset-0 z-0 pointer-events-none rounded-full"
        style={{
          background: "radial-gradient(circle at center, #A855F7 0%, #6B21A8 50%, transparent 80%)",
          opacity: 0.25,
          filter: "blur(30px)",
        }}
      />

      {/* INNER PULSE GLOW */}
      <motion.div
        className="absolute inset-0 rounded-full pointer-events-none z-10"
        animate={{ boxShadow: ["0 0 10px rgba(168,85,247,0.3)", "0 0 20px rgba(168,85,247,0.6)", "0 0 10px rgba(168,85,247,0.3)"] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* SPHERICAL SHADING */}
      <div className="absolute inset-0 rounded-full pointer-events-none z-[15] shadow-[inset_-12px_-12px_30px_rgba(0,0,0,0.95),_inset_6px_6px_20px_rgba(255,255,255,0.15),_inset_0_-20px_40px_rgba(168,85,247,0.2)]" />

      {/* SPECULAR HIGHLIGHTS */}
      <div className="absolute top-6 left-8 w-16 h-8 bg-white/25 rounded-full blur-lg -rotate-12 pointer-events-none z-[25]" />
      <div className="absolute top-8 left-10 w-8 h-4 bg-white/30 rounded-full blur-sm -rotate-12 pointer-events-none z-[26]" />
      <div className="absolute top-12 left-14 w-6 h-3 bg-white/40 rounded-full blur-[2px] -rotate-45 pointer-events-none z-[27]" />

      {/* LIQUID GLASS SURFACE - Safari fix: explicit webkit prefix + GPU layer */}
      <div
        className="absolute inset-0 z-20 rounded-full pointer-events-none"
        style={{
          WebkitBackdropFilter: 'blur(8px) saturate(180%)',
          backdropFilter: 'blur(8px) saturate(180%)',
          background: 'rgba(0, 0, 0, 0.2)',
          boxShadow: 'inset 0 0 0 1px rgba(255, 255, 255, 0.1)',
          transform: 'translateZ(0)',
          WebkitTransform: 'translateZ(0)',
          isolation: 'isolate',
        }}
      />

      {/* Content */}
      <div className={`absolute inset-0 z-30 flex flex-col justify-center items-center text-center p-2 ${triggerBounce ? 'animate-basketball-bounce' : ''}`}>
        <div className="text-xs font-semibold text-purple-300 uppercase tracking-widest drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">LIVE POT</div>
        <div className="live-pot-value text-3xl font-extrabold drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">$86,227</div>
      </div>
    </motion.div>
  );
}
