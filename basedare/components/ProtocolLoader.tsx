'use client';
import React, { useEffect, useMemo, useState } from "react";
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
  const durationMs = isOverlay ? 1100 : 1800;
  const fullscreenMotion = isShattering
    ? { opacity: 0, scale: 1.018 }
    : { opacity: 1, scale: 1 };

  const statusLabel = useMemo(() => {
    if (loadingProgress < 26) return 'LOCKING SIGNAL';
    if (loadingProgress < 58) return 'SYNCING VENUES';
    if (loadingProgress < 86) return 'ARMING PROTOCOL';
    return 'ACCESS GRANTED';
  }, [loadingProgress]);

  const handleCompletion = React.useCallback(() => {
    setIsShattering(true);
    setTimeout(() => onComplete(), isOverlay ? 380 : 650);
  }, [isOverlay, onComplete]);

  useEffect(() => {
    const startedAt = performance.now();
    let rafId = 0;

    const tick = (now: number) => {
      const elapsed = now - startedAt;
      const progress = Math.min(elapsed / durationMs, 1);
      const eased = 1 - Math.pow(1 - progress, 2.6);
      const next = Math.min(100, eased * 100);

      setLoadingProgress(next);

      if (progress >= 1) {
        handleCompletion();
        return;
      }

      rafId = window.requestAnimationFrame(tick);
    };

    rafId = window.requestAnimationFrame(tick);

    return () => window.cancelAnimationFrame(rafId);
  }, [durationMs, handleCompletion]);

  return (
    <motion.div
      className={
        isOverlay
          ? `chain-init-overlay ${isShattering ? 'complete' : ''}`
          : `fixed inset-0 z-[10020] flex flex-col items-center justify-center bg-[#020202] overflow-hidden ${
              isShattering ? "pointer-events-none" : ""
            }`
      }
      animate={
        isOverlay
          ? isShattering
            ? { opacity: 0, y: 8, filter: "blur(8px)" }
            : { opacity: 1, y: 0, filter: "blur(0px)" }
          : fullscreenMotion
      }
      transition={{ duration: isOverlay ? 0.35 : 0.45, ease: "easeInOut" }}
      style={
        isOverlay
          ? undefined
          : {
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
              willChange: 'opacity, transform',
            }
      }
      aria-live="polite"
      aria-label="Chain initialization in progress"
    >
      {!isOverlay ? (
        <>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_38%,rgba(168,85,247,0.22)_0%,rgba(34,197,94,0.05)_18%,rgba(0,0,0,0.94)_56%,#020202_100%)]" />
          <div className="absolute inset-x-0 top-0 h-px bg-white/8" />

          <motion.div
            animate={{ scale: [0.94, 1.06, 0.94], opacity: [0.16, 0.28, 0.16] }}
            transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
            className="absolute h-[280px] w-[280px] rounded-full bg-purple-600/20 blur-[64px] sm:h-[420px] sm:w-[420px] sm:blur-[100px]"
          />
        </>
      ) : null}

      <div className={`relative flex items-center justify-center ${isOverlay ? 'chain-init-rings' : 'h-[320px] w-[320px] sm:h-[360px] sm:w-[360px]'}`}>
        
        <div className="absolute inset-0 animate-spin-slow">
          <div className="h-full w-full rounded-full border-[3px] border-[#FFD700]/22 border-t-[#FFD700]/85 border-r-transparent shadow-[0_0_22px_rgba(255,215,0,0.22)]"></div>
          <div className="absolute -top-5 left-1/2 -translate-x-1/2 rotate-12 text-3xl font-black text-[#FFD700] drop-shadow-[0_0_10px_rgba(255,215,0,0.5)] sm:text-4xl">
            $
          </div>
        </div>
        
        <div className="absolute inset-16 animate-spin-reverse-slow">
          <div className="h-full w-full rounded-full border-[3px] border-purple-500/24 border-b-purple-400/80 border-l-transparent shadow-[0_0_22px_rgba(168,85,247,0.22)]"></div>
          <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 -rotate-12 text-3xl grayscale-[0.12] drop-shadow-[0_0_10px_rgba(168,85,247,0.48)] sm:text-4xl">
            💀
          </div>
        </div>

        <div className="absolute inset-[22%] rounded-full border border-white/8 bg-[radial-gradient(circle_at_50%_40%,rgba(255,255,255,0.08)_0%,rgba(255,255,255,0.02)_35%,rgba(10,10,14,0.96)_78%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_0_40px_rgba(0,0,0,0.3)]" />

        <div className="relative z-10 flex h-20 w-20 items-center justify-center rounded-full border border-[#FFD700]/25 bg-[radial-gradient(circle_at_50%_30%,rgba(255,215,0,0.18)_0%,rgba(255,215,0,0.04)_38%,rgba(0,0,0,0.12)_100%)] text-white shadow-[0_0_28px_rgba(255,215,0,0.18)] sm:h-24 sm:w-24">
          <Zap className="h-10 w-10 text-[#FFD700] fill-[#FFD700]/10 drop-shadow-[0_0_18px_rgba(255,215,0,0.35)] sm:h-12 sm:w-12" />
        </div>
      </div>

      {isOverlay ? (
        <div className="chain-init-meta">
          <span className="chain-init-label">Connecting...</span>
          <span className="chain-init-progress">{Math.round(loadingProgress)}%</span>
        </div>
      ) : (
        <div className="absolute bottom-[14vh] flex w-full max-w-md flex-col items-center gap-3 px-8">
          <div className="text-[11px] font-black uppercase tracking-[0.34em] text-white/45">
            BaseDare Protocol
          </div>
          <motion.div
            animate={{ opacity: [0.62, 1, 0.62] }}
            transition={{ duration: 1.6, repeat: Infinity }}
            className="text-center font-mono text-lg font-black uppercase tracking-[0.24em] text-[#FFD700] sm:text-xl"
          >
            {statusLabel}
          </motion.div>
          
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/8 backdrop-blur-sm">
            <motion.div
              className="h-full bg-gradient-to-r from-purple-500 via-cyan-400 to-[#FFD700]"
              initial={{ width: "0%" }}
              animate={{ width: `${loadingProgress}%` }}
              transition={{ ease: "easeOut", duration: 0.18 }}
            />
          </div>
          
          <div className="flex w-full items-center justify-between font-mono text-[10px] uppercase tracking-[0.22em] text-white/38">
              <span>Signal Locked</span>
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
          top: 18px;
          right: 18px;
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
            right: auto;
            left: 50%;
            translate: -50% 0;
            z-index: 10010;
            backdrop-filter: blur(8px);
            -webkit-backdrop-filter: blur(8px);
          }
        }
      `}</style>
    </motion.div>
  );
}
