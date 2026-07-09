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
  const completionStartedRef = React.useRef(false);
  const completionTimeoutRef = React.useRef<number | null>(null);
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
    if (completionStartedRef.current) {
      return;
    }

    completionStartedRef.current = true;
    setIsShattering(true);
    completionTimeoutRef.current = window.setTimeout(() => onComplete(), isOverlay ? 380 : 650);
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

  useEffect(() => {
    return () => {
      if (completionTimeoutRef.current !== null) {
        window.clearTimeout(completionTimeoutRef.current);
      }
    };
  }, []);

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
          {/* Deep-space field — purple core, gold underglow, vignette. No green (reserved for live presence). */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(124,58,237,0.2)_0%,rgba(88,28,135,0.06)_26%,#05040a_60%,#020103_100%)]" />
          <div className="absolute inset-x-0 bottom-0 h-1/3 bg-[radial-gradient(circle_at_50%_120%,rgba(255,196,0,0.06),transparent_60%)]" />
          <div className="absolute inset-0 shadow-[inset_0_0_200px_70px_rgba(0,0,0,0.72)]" />
          <div className="absolute inset-x-0 top-0 h-px bg-white/6" />

          <motion.div
            animate={{ scale: [0.96, 1.05, 0.96], opacity: [0.14, 0.24, 0.14] }}
            transition={{ duration: 3.4, repeat: Infinity, ease: "easeInOut" }}
            className="absolute h-[300px] w-[300px] rounded-full bg-purple-600/20 blur-[90px] sm:h-[440px] sm:w-[440px] sm:blur-[120px]"
          />
        </>
      ) : null}

      <div className={`relative flex items-center justify-center ${isOverlay ? 'chain-init-rings' : 'h-[320px] w-[320px] sm:h-[360px] sm:w-[360px]'}`}>
        {isOverlay ? (
          <>
            <div className="absolute inset-0 animate-spin-slow">
              <div className="h-full w-full rounded-full border-[3px] border-[#FFD700]/22 border-t-[#FFD700]/85 border-r-transparent shadow-[0_0_22px_rgba(255,215,0,0.22)]"></div>
              <div className="absolute -top-5 left-1/2 -translate-x-1/2 rotate-12 text-3xl font-black text-[#FFD700] drop-shadow-[0_0_10px_rgba(255,215,0,0.5)] sm:text-4xl">
                $
              </div>
            </div>
            <div className="absolute inset-16 animate-spin-reverse-slow">
              <div className="h-full w-full rounded-full border-[3px] border-purple-500/24 border-b-purple-400/80 border-l-transparent shadow-[0_0_22px_rgba(168,85,247,0.22)]"></div>
            </div>
            <div className="relative z-10 flex h-20 w-20 items-center justify-center rounded-full border border-[#FFD700]/25 bg-[radial-gradient(circle_at_50%_30%,rgba(255,215,0,0.18)_0%,rgba(255,215,0,0.04)_38%,rgba(0,0,0,0.12)_100%)] text-white shadow-[0_0_28px_rgba(255,215,0,0.18)]">
              <Zap className="h-10 w-10 text-[#FFD700] fill-[#FFD700]/10 drop-shadow-[0_0_18px_rgba(255,215,0,0.35)]" />
            </div>
          </>
        ) : (
          <>
            {/* Outer orbit — gold comet: a conic-gradient trail with a glowing leading node. */}
            <div className="absolute inset-0 rounded-full border border-[#FFD700]/10" />
            <div className="absolute inset-0 bd-orbit-cw">
              <div
                className="absolute inset-0 rounded-full"
                style={{
                  background:
                    'conic-gradient(from 0deg, rgba(255,215,0,0) 0deg, rgba(255,215,0,0) 262deg, rgba(255,215,0,0.45) 338deg, rgba(255,236,150,0.95) 359deg, rgba(255,215,0,0) 360deg)',
                  WebkitMaskImage:
                    'radial-gradient(farthest-side, transparent calc(100% - 2.5px), #000 calc(100% - 2.5px))',
                  maskImage:
                    'radial-gradient(farthest-side, transparent calc(100% - 2.5px), #000 calc(100% - 2.5px))',
                }}
              />
              <div className="absolute -top-[5px] left-1/2 h-2.5 w-2.5 -translate-x-1/2 rounded-full bg-[#FFECA0] shadow-[0_0_8px_2px_rgba(255,215,0,0.7),0_0_22px_7px_rgba(255,215,0,0.32)]" />
            </div>

            {/* Inner orbit — purple comet, counter-rotating. */}
            <div className="absolute inset-[18%] rounded-full border border-purple-400/10" />
            <div className="absolute inset-[18%] bd-orbit-ccw">
              <div
                className="absolute inset-0 rounded-full"
                style={{
                  background:
                    'conic-gradient(from 0deg, rgba(168,85,247,0) 0deg, rgba(168,85,247,0) 262deg, rgba(168,85,247,0.45) 338deg, rgba(216,180,254,0.95) 359deg, rgba(168,85,247,0) 360deg)',
                  WebkitMaskImage:
                    'radial-gradient(farthest-side, transparent calc(100% - 2.5px), #000 calc(100% - 2.5px))',
                  maskImage:
                    'radial-gradient(farthest-side, transparent calc(100% - 2.5px), #000 calc(100% - 2.5px))',
                }}
              />
              <div className="absolute -top-[4px] left-1/2 h-2 w-2 -translate-x-1/2 rounded-full bg-[#E9D5FF] shadow-[0_0_8px_2px_rgba(168,85,247,0.7),0_0_20px_6px_rgba(168,85,247,0.32)]" />
            </div>

            {/* Recessed inner disc for depth. */}
            <div className="absolute inset-[34%] rounded-full border border-white/6 bg-[radial-gradient(circle_at_50%_38%,rgba(255,255,255,0.06)_0%,rgba(255,255,255,0.015)_36%,rgba(8,7,14,0.96)_80%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_0_50px_rgba(0,0,0,0.4)]" />

            {/* Center medallion — glass with a breathing gold pulse. */}
            <motion.div
              animate={{ scale: [1, 1.045, 1] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
              className="relative z-10 flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-full border border-[#FFD700]/30 bg-[radial-gradient(circle_at_50%_32%,rgba(255,215,0,0.16)_0%,rgba(255,215,0,0.03)_44%,rgba(0,0,0,0.2)_100%)] shadow-[0_0_32px_rgba(255,215,0,0.16),inset_0_1px_0_rgba(255,255,255,0.12)] sm:h-20 sm:w-20"
            >
              <Zap className="h-9 w-9 text-[#FFD700] fill-[#FFD700]/15 drop-shadow-[0_0_12px_rgba(255,215,0,0.42)] sm:h-11 sm:w-11" />
            </motion.div>
          </>
        )}
      </div>

      {isOverlay ? (
        <div className="chain-init-meta">
          <span className="chain-init-label">Connecting...</span>
          <span className="chain-init-progress">{Math.round(loadingProgress)}%</span>
        </div>
      ) : (
        <div className="absolute bottom-[14vh] flex w-full max-w-sm flex-col items-center gap-3.5 px-8">
          <div className="text-[10px] font-black uppercase tracking-[0.42em] text-white/40">
            BaseDare Protocol
          </div>
          <motion.div
            animate={{ opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 1.8, repeat: Infinity }}
            className="text-center font-mono text-base font-black uppercase tracking-[0.3em] text-[#FFE9A0] sm:text-lg"
            style={{ textShadow: "0 0 18px rgba(255,215,0,0.28)" }}
          >
            {statusLabel}
          </motion.div>

          <div className="relative h-[3px] w-full overflow-hidden rounded-full bg-white/[0.07]">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-purple-500 via-cyan-400 to-[#FFD700]"
              initial={{ width: "0%" }}
              animate={{ width: `${loadingProgress}%` }}
              transition={{ ease: "easeOut", duration: 0.18 }}
              style={{ boxShadow: "0 0 12px rgba(255,215,0,0.45)" }}
            />
          </div>

          <div className="flex w-full items-center justify-between font-mono text-[9px] uppercase tracking-[0.3em] text-white/32">
            <span>Signal Locked</span>
            <span className="tabular-nums text-white/50">{Math.round(loadingProgress)}%</span>
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
        .bd-orbit-cw {
          animation: spin 7s linear infinite;
          will-change: transform;
        }
        .bd-orbit-ccw {
          animation: spin-reverse 10s linear infinite;
          will-change: transform;
        }
        @media (prefers-reduced-motion: reduce) {
          .bd-orbit-cw,
          .bd-orbit-ccw,
          .animate-spin-slow,
          .animate-spin-reverse-slow {
            animation: none;
          }
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
