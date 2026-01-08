'use client';

import React from 'react';
import { motion } from 'framer-motion';
// ONLY THIS LINE CHANGED: Adding /app to find the folder
import { useIgnition } from '@/app/context/IgnitionContext';

interface InitProtocolButtonProps {
  className?: string;
  onClick?: () => void;
}

export default function InitProtocolButton({ className, onClick }: InitProtocolButtonProps) {
  const { ignitionActive, triggerIgnition } = useIgnition();

  const handleAction = () => {
    // 1. Fire the global reactor ignition (Haptics + Background)
    triggerIgnition();
    
    // 2. Fire any additional click logic (like opening a modal)
    if (onClick) onClick();
  };

  return (
    <motion.button
      whileTap={{ scale: 0.96 }}
      animate={{ 
        scale: ignitionActive ? 1.05 : 1,
        boxShadow: ignitionActive 
          ? '0 0 50px rgba(250, 204, 21, 0.6), inset 0 0 20px rgba(250, 204, 21, 0.4)' 
          : '0 0 0px rgba(250, 204, 21, 0)'
      }}
      transition={{ type: "spring", stiffness: 400, damping: 12 }}
      onClick={handleAction}
      className={`
        relative px-10 py-5 bg-black border-2 border-purple-500/40 rounded-2xl 
        overflow-hidden group transition-colors duration-300
        ${ignitionActive ? 'border-yellow-400/80' : 'hover:border-purple-400'}
        ${className}
      `}
    >
      {/* GLOWING TEXT */}
      <span className={`
        relative z-10 font-black italic uppercase tracking-tighter text-xl
        transition-colors duration-300
        ${ignitionActive ? 'text-yellow-400' : 'text-white'}
      `}>
        {ignitionActive ? "IGNITING..." : "INITIATE PROTOCOL"}
      </span>

      {/* THE KINETIC SHOCKWAVE */}
      {ignitionActive && (
        <motion.div
          initial={{ scale: 0.8, opacity: 1 }}
          animate={{ scale: 2.5, opacity: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="absolute inset-0 rounded-full bg-yellow-400/40 pointer-events-none z-0"
        />
      )}

      {/* AMBER SCANLINE PULSE */}
      <div className={`
        absolute inset-0 bg-gradient-to-b from-transparent via-yellow-500/10 to-transparent 
        -translate-y-full group-hover:translate-y-full transition-transform duration-1000
        ${ignitionActive ? 'opacity-100' : 'opacity-0'}
      `} />
    </motion.button>
  );
}