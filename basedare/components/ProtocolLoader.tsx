'use client';
import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Zap } from "lucide-react";

interface LoaderProps {
  onComplete: () => void;
  variant?: 'fullscreen' | 'overlay';
}

export default function ProtocolLoader({ onComplete, variant = 'fullscreen' }: LoaderProps) {
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [isShattering, setIsShattering] = useState(false);
  const isOverlay = variant === 'overlay';

  const handleCompletion = React.useCallback(() => {
    setIsShattering(true);
    setTimeout(() => onComplete(), isOverlay ? 500 : 1000);
  }, [isOverlay, onComplete]);

  useEffect(() => {
    // Progress Simulation (Linear but organic)
    const interval = setInterval(() => {
      setLoadingProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          handleCompletion();
          return 100;
        }
        const next = prev + Math.random() * 8 + 2;
        if (next >= 100) {
          clearInterval(interval);
          handleCompletion();
          return 100;
        }
        return next; // Aggressive loading speed
      });
    }, 100);

    return () => clearInterval(interval);
  }, [handleCompletion]);

  return (
    <motion.div
      className={
        isOverlay
          ? `chain-init-overlay ${isShattering ? 'complete' : ''}`
          : `fixed inset-0 z-[999] flex flex-col items-center justify-center bg-[#020202] overflow-hidden ${
              isShattering ? "pointer-events-none" : ""
            }`
      }
      animate={
        isOverlay
          ? isShattering
            ? { opacity: 0, y: 8, filter: "blur(8px)" }
            : { opacity: 1, y: 0, filter: "blur(0px)" }
          : isShattering
            ? { opacity: 0, scale: 1.5, filter: "blur(20px)" }
            : { opacity: 1, scale: 1, filter: "blur(0px)" }
      }
      transition={{ duration: isOverlay ? 0.45 : 0.8, ease: "easeInOut" }}
      aria-live="polite"
      aria-label="Chain initialization in progress"
    >
      {!isOverlay ? (
        <>
          {/* A. Background Noise & Gradient */}
          <div className="absolute inset-0 opacity-20 mix-blend-overlay pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
          <div className="absolute inset-0 opacity-80" style={{ background: 'radial-gradient(circle, rgba(168, 85, 247, 0.2) 0%, rgba(0, 0, 0, 1) 50%, rgba(0, 0, 0, 1) 100%)' }} />

          {/* B. Pulsing Core (The Heartbeat) */}
          <motion.div
            animate={{ scale: [0.8, 1.2, 0.8], opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="absolute w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[100px]"
          />
        </>
      ) : null}

      {/* C. The Orbital Loader - Money vs Death */}
      <div className={`relative flex items-center justify-center ${isOverlay ? 'chain-init-rings' : 'w-96 h-96'}`}>
        
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

      {isOverlay ? (
        <div className="chain-init-meta">
          <span className="chain-init-label">Connecting...</span>
          <span className="chain-init-progress">{Math.round(loadingProgress)}%</span>
        </div>
      ) : (
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
      )}

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
        .chain-init-overlay {
          position: fixed;
          bottom: 24px;
          right: 24px;
          z-index: 9999;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 16px 8px 8px;
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(10, 8, 20, 0.85);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          box-shadow:
            0 16px 36px rgba(0, 0, 0, 0.4),
            0 0 18px rgba(168, 85, 247, 0.14),
            inset 0 1px 0 rgba(255,255,255,0.08);
        }
        .chain-init-rings {
          width: 36px;
          height: 36px;
          flex-shrink: 0;
          transform: scale(0.15);
          transform-origin: center;
        }
        .chain-init-meta {
          display: flex;
          align-items: baseline;
          gap: 8px;
          white-space: nowrap;
        }
        .chain-init-label {
          color: rgba(255,255,255,0.65);
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }
        .chain-init-progress {
          color: rgba(245, 197, 24, 0.75);
          font-size: 10px;
          font-family: var(--font-alpha), monospace;
          letter-spacing: 0.12em;
        }
        @media (max-width: 480px) {
          .chain-init-overlay {
            top: 78px;
            bottom: auto;
            right: auto;
            left: 50%;
            translate: -50% 0;
          }
        }
      `}</style>
    </motion.div>
  );
}
