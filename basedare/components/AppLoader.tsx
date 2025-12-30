"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface AppLoaderProps {
  isVisible: boolean;
}

export default function AppLoader({ isVisible }: AppLoaderProps) {
  const [progress, setProgress] = useState(0);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  // Hydration-safe reduced motion check
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
    
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    if (!isVisible) return;
    
    const interval = setInterval(() => {
      setProgress(prev => Math.min(prev + Math.random() * 15 + 5, 100));
    }, 100);

    return () => clearInterval(interval);
  }, [isVisible]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          key="app-loader"
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="fixed inset-0 z-[9999] bg-background flex flex-col items-center justify-center"
        >
          <motion.img
            src="/bear-mascot.png" // Using local asset
            alt="BaseDare"
            className="w-32 h-32 mb-8 object-contain"
            animate={prefersReducedMotion ? {} : { rotate: 360, scale: [1, 1.1, 1] }}
            transition={prefersReducedMotion ? {} : { rotate: { duration: 2, repeat: Infinity, ease: "linear" }, scale: { duration: 1, repeat: Infinity } }}
          />
          <motion.h1
            className="text-2xl md:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500 mb-4"
            animate={prefersReducedMotion ? {} : { opacity: [0.5, 1, 0.5] }}
            transition={prefersReducedMotion ? {} : { duration: 1.5, repeat: Infinity }}
          >
            Daring the Base...
          </motion.h1>
          <div className="w-64 h-2 bg-gray-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-yellow-400 to-orange-500 transition-all duration-100"
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
          <p className="text-gray-500 text-sm mt-4">{Math.min(Math.round(progress), 100)}%</p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}


