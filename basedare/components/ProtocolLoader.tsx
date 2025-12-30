'use client';
import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Zap } from "lucide-react";

interface LoaderProps {
  onComplete: () => void;
}

export default function ProtocolLoader({ onComplete }: LoaderProps) {
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [isShattering, setIsShattering] = useState(false);

  const handleCompletion = () => {
    setIsShattering(true);
    // Wait for shatter animation to finish before unmounting
    setTimeout(() => onComplete(), 1000); 
  };

  useEffect(() => {
    // Progress Simulation (Linear but organic)
    const interval = setInterval(() => {
      setLoadingProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          handleCompletion();
          return 100;
        }
        return prev + Math.random() * 8 + 2; // Aggressive loading speed
      });
    }, 100);

    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div
      className={`fixed inset-0 z-[999] flex flex-col items-center justify-center bg-[#020202] overflow-hidden ${
        isShattering ? "pointer-events-none" : ""
      }`}
      animate={isShattering ? { opacity: 0, scale: 1.5, filter: "blur(20px)" } : { opacity: 1, scale: 1, filter: "blur(0px)" }}
      transition={{ duration: 0.8, ease: "easeInOut" }}
    >
      {/* A. Background Noise & Gradient */}
      <div className="absolute inset-0 opacity-20 mix-blend-overlay pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
      <div className="absolute inset-0 opacity-80" style={{ background: 'radial-gradient(circle, rgba(168, 85, 247, 0.2) 0%, rgba(0, 0, 0, 1) 50%, rgba(0, 0, 0, 1) 100%)' }} />

      {/* B. Pulsing Core (The Heartbeat) */}
      <motion.div
        animate={{ scale: [0.8, 1.2, 0.8], opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        className="absolute w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[100px]"
      />

      {/* C. The Orbital Loader - Money vs Death */}
      <div className="relative w-96 h-96 flex items-center justify-center">
        
        {/* 1. OUTER RING + DOLLAR (Gold - Risk/Money) */}
        {/* Spins Clockwise */}
        <div className="absolute inset-0 animate-spin-slow">
          <div className="w-full h-full rounded-full border-4 border-[#FFD700]/30 border-t-[#FFD700] border-r-transparent shadow-[0_0_20px_rgba(255,215,0,0.4)]"></div>
          {/* The $ Icon positioned on the ring */}
          <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[#FFD700] text-4xl font-black drop-shadow-[0_0_10px_rgba(255,215,0,0.8)] rotate-12">
            $
          </div>
        </div>
        
        {/* 2. INNER RING + SKULL (Purple - Death) */}
        {/* Spins Counter-Clockwise */}
        <div className="absolute inset-16 animate-spin-reverse-slow">
          <div className="w-full h-full rounded-full border-4 border-purple-500/30 border-b-purple-500 border-l-transparent shadow-[0_0_20px_rgba(168,85,247,0.4)]"></div>
          {/* The Skull positioned on the ring */}
          <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-4xl grayscale-[0.2] drop-shadow-[0_0_10px_rgba(168,85,247,0.8)] -rotate-12">
            💀
          </div>
        </div>

        {/* 3. CORE PROTOCOL (Static Center - The Zap) */}
        <div className="relative z-10 w-24 h-24 text-white animate-pulse">
          <Zap className="w-full h-full text-[#FFD700] fill-[#FFD700]/20 drop-shadow-[0_0_20px_rgba(255,215,0,0.6)]" />
        </div>
      </div>

      {/* D. Status Text & Bar */}
      <div className="absolute bottom-20 flex flex-col items-center gap-4 w-full px-12 max-w-lg">
        <motion.div
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="text-[#FFD700] font-black text-xl tracking-[0.2em] uppercase font-mono"
        >
          {loadingProgress < 100 ? "INITIALIZING PROTOCOL..." : "ACCESS GRANTED"}
        </motion.div>
        
        {/* Progress Bar Container */}
        <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden backdrop-blur-sm">
          <motion.div
            className="h-full bg-gradient-to-r from-purple-500 via-cyan-400 to-[#FFD700]"
            initial={{ width: "0%" }}
            animate={{ width: `${loadingProgress}%` }}
            transition={{ type: "spring", stiffness: 50, damping: 20 }}
          />
        </div>
        
        {/* Percentage Number */}
        <div className="flex justify-between w-full text-[10px] text-gray-500 font-mono">
            <span>VERIFYING CHAIN</span>
            <span>{Math.round(loadingProgress)}%</span>
        </div>
      </div>

      {/* E. Animation Styles */}
      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes spin-reverse {
          from { transform: rotate(0deg); }
          to { transform: rotate(-360deg); }
        }
        .animate-spin-slow {
          animation: spin 3s linear infinite;
        }
        .animate-spin-reverse-slow {
          animation: spin-reverse 4s linear infinite;
        }
      `}</style>
    </motion.div>
  );
}
