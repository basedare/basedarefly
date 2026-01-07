"use client";

import React from "react";
import { motion } from "framer-motion";

export const BaseDareLogo = ({ className = "" }: { className?: string }) => {
  return (
    <motion.div 
      className={`relative flex items-center justify-center ${className}`}
      whileHover="hover"
      initial="initial"
    >
      {/* 1. THE CONTAINER: Apple-style Glass Squircle */}
      <div className="relative w-10 h-10 md:w-12 md:h-12 rounded-xl bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-md border border-white/10 shadow-lg overflow-hidden group">
        
        {/* Subtle inner gradient wash (Purple to Amber) */}
        <div className="absolute inset-0 bg-gradient-to-tr from-purple-500/10 via-transparent to-amber-500/10 opacity-50" />
        
        {/* The Glass Shine (Apple Polish) */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent opacity-50 pointer-events-none" />

        {/* 2. THE GLYPH: The X and The Bolt */}
        <div className="absolute inset-0 flex items-center justify-center">
          <svg 
            viewBox="0 0 24 24" 
            fill="none" 
            xmlns="http://www.w3.org/2000/svg"
            className="w-6 h-6 md:w-7 md:h-7"
          >
            {/* PATH A: The Purple 'Base' (The Back Stroke of the X) */}
            <motion.path
              d="M19 5L5 19"
              stroke="url(#purple_gradient)"
              strokeWidth="2.5"
              strokeLinecap="round"
              className="drop-shadow-[0_0_8px_rgba(168,85,247,0.5)]"
              variants={{
                initial: { pathLength: 1, opacity: 0.8 },
                hover: { opacity: 1 }
              }}
            />

            {/* PATH B: The Amber 'Energy' (The Lightning Bolt forming the front of the X) */}
            {/* This is a Z-shape that crosses the first line to form the X */}
            <motion.path
              d="M16 3L10 13H14L8 21" 
              stroke="url(#amber_gradient)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="drop-shadow-[0_0_10px_rgba(251,191,36,0.8)]"
              variants={{
                initial: { pathLength: 1, strokeDashoffset: 0 },
                hover: { 
                  strokeDasharray: 30, // Create a flowing effect
                  strokeDashoffset: [0, 60],
                  transition: { duration: 0.6, ease: "linear", repeat: Infinity }
                }
              }}
            />
            
            {/* Gradients Definitions */}
            <defs>
              <linearGradient id="purple_gradient" x1="5" y1="19" x2="19" y2="5" gradientUnits="userSpaceOnUse">
                <stop stopColor="#A855F7" /> {/* Purple-500 */}
                <stop offset="1" stopColor="#6366F1" /> {/* Indigo-500 */}
              </linearGradient>
              <linearGradient id="amber_gradient" x1="16" y1="3" x2="8" y2="21" gradientUnits="userSpaceOnUse">
                <stop stopColor="#FBBF24" /> {/* Amber-400 */}
                <stop offset="1" stopColor="#F59E0B" /> {/* Amber-500 */}
              </linearGradient>
            </defs>
          </svg>
        </div>
      </div>

      {/* 3. THE TEXT (Optional: Can be hidden on mobile) */}
      <div className="ml-3 hidden md:flex flex-col justify-center">
        <span className="text-sm font-bold text-white tracking-widest leading-none">
          BASE
        </span>
        <span className="text-[10px] font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-amber-400 tracking-[0.2em] leading-tight">
          DARE
        </span>
      </div>
    </motion.div>
  );
};


