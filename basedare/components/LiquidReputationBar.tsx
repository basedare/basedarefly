'use client';
import React from "react";
import { motion } from "framer-motion";

interface LiquidBarProps {
  value: number; // 0 to 100
  color?: string; // Hex or tailwind class
  label?: string;
  rank?: number;
}

export default function LiquidReputationBar({ value, color = "#A855F7", label, rank }: LiquidBarProps) {
  // Unique ID to avoid conflicts if used multiple times
  const filterId = `goo-effect-${React.useId().replace(/:/g, "")}`;

  return (
    <div className="relative w-full">
      {/* FILTER DEFINITION */}
      <svg className="absolute w-0 h-0" aria-hidden="true">
        <defs>
          <filter id={filterId}>
            <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur" />
            <feColorMatrix
              in="blur"
              mode="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7"
              result="goo"
            />
            <feComposite in="SourceGraphic" in2="goo" operator="atop" />
          </filter>
        </defs>
      </svg>

      {/* LIQUID CONTAINER */}
      <div 
        className="relative h-6 w-full bg-white/5 rounded-full overflow-hidden border border-white/10"
        style={{ filter: `url(#${filterId})` }}
      >
        {/* 1. THE MAIN BAR */}
        <motion.div
          className="absolute top-0 left-0 h-full rounded-full z-10"
          initial={{ width: "0%" }}
          whileInView={{ width: `${value}%` }}
          transition={{ duration: 1.5, ease: "circOut", delay: rank ? rank * 0.1 : 0 }}
          style={{ backgroundColor: color }}
        >
          {/* LIQUID SHINE */}
          <div className="absolute top-0 left-0 w-full h-1/2 bg-white/30 rounded-full" />
        </motion.div>

        {/* 2. THE DRIPPING PARTICLES */}
        <motion.div
          className="absolute top-1/2 -translate-y-1/2 h-4 w-4 rounded-full z-0"
          style={{ backgroundColor: color, left: `${value - 5}%` }}
          animate={{ 
            x: [0, 20, 0], 
            scale: [1, 0.5, 1],
            opacity: [1, 0, 1] 
          }}
          transition={{ 
            duration: 2, 
            repeat: Infinity, 
            ease: "easeInOut",
            delay: Math.random() 
          }}
        />
        <motion.div
          className="absolute top-1/2 -translate-y-1/2 h-3 w-3 rounded-full z-0"
          style={{ backgroundColor: color, left: `${value - 2}%` }}
          animate={{ 
            x: [0, 10, 0], 
            y: [0, 5, 0] 
          }}
          transition={{ 
            duration: 1.5, 
            repeat: Infinity, 
            ease: "easeInOut" 
          }}
        />
      </div>
    </div>
  );
}



