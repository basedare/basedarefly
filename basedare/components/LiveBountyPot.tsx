// components/LiveBountyPot.tsx (SYNCHRONIZED WITH HOLOBUTTON)
'use client';

import { motion } from 'framer-motion';
import { useGlobalPot } from '@/hooks/useGlobalPot';

interface LiveBountyPotProps {
  className?: string;
}

export default function LiveBountyPot({ className }: LiveBountyPotProps = {}) {
  const { balance, isLoading } = useGlobalPot();
  return (
    <motion.div
      className={`relative w-64 h-64 sm:w-72 sm:h-72 md:w-80 md:h-80 lg:w-96 lg:h-96 rounded-full border-4 border-purple-500/50 bg-black/60 shadow-[0_0_60px_rgba(168,85,247,0.8)] backdrop-blur-sm overflow-hidden flex items-center justify-center ${className || ''}`}
      initial={{ scale: 0.85, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 100, damping: 18 }}
    >
      {/* 1. Dark Void Base */}
      <div
        className="absolute inset-0"
        style={{
          background: "rgba(4, 7, 18, 0.6)",
          backdropFilter: "blur(30px) saturate(180%)",
        }}
      />

      {/* 2. Deep Purple Ambient Glow */}
      <div
        className="absolute inset-0"
        style={{
          background: "radial-gradient(circle at center, #A855F7 0%, #6B21A8 50%, transparent 80%)",
          opacity: 0.4,
          filter: "blur(60px)",
        }}
      />

      {/* 3. Cosmic Dust / Holo Conic Spin (SYNCHRONIZED COLOR & ROTATION) */}
      <div
        className="absolute inset-0 opacity-90 mix-blend-color-dodge pointer-events-none"
        style={{
          // HoloButton's primary conic gradient (Purple -> Honey)
          backgroundImage: `conic-gradient(from 0deg, transparent 0deg, #A855F7 90deg, transparent 180deg, #FACC15 270deg, transparent 360deg)`,
          filter: "blur(4px)",
          transform: "scale(1.5)",
          // HoloButton's primary rotation animation: spinGlobe 10s linear infinite
          animation: "spinGlobe 10s linear infinite", // Assuming spinGlobe is defined in global CSS
        }}
      />

      {/* 4. Liquid Distortion Layer */}
      <div
        className="absolute inset-0 opacity-30 mix-blend-overlay pointer-events-none"
        style={{ filter: "url(#orb-liquid)" }}
      >
        {/* Counter-rotation for liquid: spin-slow 20s linear infinite reverse */}
        <div className="w-full h-full bg-gradient-to-tr from-transparent via-white/20 to-transparent animate-spin-slow" />
      </div>

      {/* 5. Spherical Shading + Glass Depth */}
      <div className="absolute inset-0 rounded-full pointer-events-none shadow-[inset_-15px_-15px_50px_rgba(0,0,0,0.8), inset_8px_8px_30px_rgba(255,255,255,0.2)]" />

      {/* Specular Highlights */}
      <div className="absolute top-6 left-10 w-32 h-16 bg-white/15 rounded-full blur-2xl -rotate-12 pointer-events-none" />
      <div className="absolute top-10 left-12 w-6 h-3 bg-white rounded-full blur-[1px] -rotate-45 pointer-events-none" />

      {/* 6. Toxic Honey Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-yellow-500/25 mix-blend-color-dodge pointer-events-none" />

      {/* Pot Content (Adjusted Sizing) */}
      <div className="relative z-10 text-center px-8"> {/* Added horizontal padding (px-8) */}
        <p className="text-xl md:text-2xl uppercase tracking-widest text-purple-300 mb-6 drop-shadow-2xl">
          Creator Rewards Pool
        </p>
        <p
          className="text-6xl md:text-7xl font-extrabold text-[#FACC15] drop-shadow-2xl" // Slightly reduced font size for fitting (md:text-7xl)
          style={{ textShadow: '0 0 60px rgba(250,204,21,0.9)' }}
        >
          {isLoading ? "Loading..." : balance}
        </p>
      </div>

      {/* Hidden SVG Filter for Liquid Effect (Unchanged) */}
      <svg className="absolute w-0 h-0">
        <defs>
          <filter id="orb-liquid">
            <feTurbulence type="fractalNoise" baseFrequency="0.015" numOctaves="4" result="noise">
              <animate attributeName="baseFrequency" dur="20s" values="0.015;0.008;0.015" repeatCount="indefinite" />
            </feTurbulence>
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="35" />
          </filter>
        </defs>
      </svg>
    </motion.div>
  );
}
