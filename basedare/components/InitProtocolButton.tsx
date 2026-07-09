'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useIgnition } from '@/app/context/IgnitionContext';
import { useFeedback } from '@/hooks/useFeedback';
import { cn } from '@/lib/utils';
import SquircleButton from '@/components/ui/SquircleButton';
import { useRef, type ButtonHTMLAttributes, type ReactNode } from 'react';

interface InitProtocolButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onClick' | 'children'> {
  className?: string;
  buttonClassName?: string;
  onClick?: () => void;
  active?: boolean;
  idleLabel?: string;
  activeLabel?: string;
  height?: number;
  variant?: 'squircle' | 'liquid';
  stableHover?: boolean;
  children?: ReactNode;
  activeContent?: ReactNode;
}

export default function InitProtocolButton({
  className,
  buttonClassName,
  onClick,
  active,
  idleLabel = 'INITIATE',
  activeLabel = 'IGNITING...',
  height = 48,
  variant = 'squircle',
  stableHover = false,
  children,
  activeContent,
  disabled,
  type = 'button',
}: InitProtocolButtonProps) {
  const { ignitionActive, startCharge, releaseCharge, cancelCharge } = useIgnition();
  const { sound } = useFeedback();
  const isActive = !disabled && (active ?? ignitionActive);
  const liquidRadius = height / 2;
  const pressedRef = useRef(false);
  const committedRef = useRef(0);

  // Commit = release the hold into the burst. The synthesized `fund` voice owns
  // the sound; releaseCharge fires the launch haptic + energy field, scaled by
  // how long the button was held.
  const commit = () => {
    if (disabled) return;
    committedRef.current = typeof performance !== 'undefined' ? performance.now() : 0;
    sound('fund');
    releaseCharge();
    if (onClick) onClick();
  };

  const handlePointerDown = () => {
    if (disabled) return;
    pressedRef.current = true;
    startCharge();
  };
  const handlePointerUp = () => {
    if (!pressedRef.current) return;
    pressedRef.current = false;
    commit();
  };
  const handlePointerLeave = () => {
    if (!pressedRef.current) return;
    pressedRef.current = false;
    cancelCharge();
  };
  // Fallback for keyboard (Enter/Space) — no pointer sequence precedes it.
  const handleClick = () => {
    const now = typeof performance !== 'undefined' ? performance.now() : 0;
    // Swallow the synthetic click that trails a touch pointerup (already committed).
    if (now - committedRef.current < 600) return;
    commit();
  };

  // A gold aura that swells with the hold charge (reads the live --bd-charge).
  // DOM order (aura before the button) keeps it behind the face; the halo shows
  // around the edges and grows as you hold.
  const chargeAura = !disabled ? (
    <span
      className="pointer-events-none absolute inset-[-10px] rounded-full bg-[radial-gradient(circle,rgba(245,197,24,0.55)_0%,rgba(249,115,22,0.22)_45%,transparent_72%)] blur-md"
      style={{ opacity: 'var(--bd-charge, 0)', transform: 'scale(calc(1 + var(--bd-charge, 0) * 0.35))' }}
      aria-hidden="true"
    />
  ) : null;

  if (variant === 'liquid') {
    return (
      <div
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerLeave}
        onPointerCancel={handlePointerLeave}
        className={cn(
          'relative isolate group overflow-hidden p-[1.5px] transition-all duration-500',
          disabled && 'opacity-60 saturate-50',
          className
        )}
        style={{ minHeight: `${height}px`, borderRadius: `${liquidRadius + 1.5}px` }}
      >
        <div
          className={cn(
            'absolute inset-[-100%] transition-all duration-500',
            isActive
              ? 'bg-[conic-gradient(from_0deg,#78350f_0%,#facc15_25%,#78350f_50%,#facc15_75%,#78350f_100%)] animate-[spin_3s_linear_infinite]'
              : 'bg-[conic-gradient(from_0deg,#1a1a1a_0%,#737373_20%,#fff_25%,#737373_30%,#1a1a1a_50%,#737373_70%,#fff_75%,#737373_80%,#1a1a1a_100%)] group-hover:animate-[spin_3s_linear_infinite]'
          )}
          aria-hidden="true"
        />

        <AnimatePresence>
          {isActive && (
            <motion.span
              initial={{ scale: 0.86, opacity: 0.72 }}
              animate={{ scale: 2.4, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.78, ease: 'easeOut' }}
              className="pointer-events-none absolute inset-[-12px] rounded-full border border-[#f5c518]/55 shadow-[0_0_34px_rgba(245,197,24,0.35)]"
              aria-hidden="true"
            />
          )}
        </AnimatePresence>

        <motion.button
          whileTap={{ scale: disabled ? 1 : 0.985 }}
          onClick={handleClick}
          type={type}
          disabled={disabled}
          className={cn(
            'relative flex h-full min-h-[48px] w-full items-center justify-center overflow-hidden bg-[#050505] px-8 py-4 backdrop-blur-3xl',
            buttonClassName
          )}
          style={{ minHeight: `${height}px`, borderRadius: `${liquidRadius}px` }}
        >
          <div className="absolute inset-0 rounded-[inherit] bg-gradient-to-tr from-white/10 via-transparent to-white/5 pointer-events-none" />

          {isActive ? (
            activeContent ?? (
              <span className="relative z-10 font-black uppercase tracking-[0.12em] text-[0.95rem] text-yellow-400">
                {activeLabel}
              </span>
            )
          ) : children ? (
            <div className="relative z-10">{children}</div>
          ) : (
            <span className="relative z-10 font-black uppercase tracking-[0.12em] text-[0.95rem] text-white transition-all duration-500 group-hover:tracking-[0.16em]">
              {idleLabel}
            </span>
          )}

          <AnimatePresence>
            {isActive && (
              <motion.div
                initial={{ scale: 0.8, opacity: 1 }}
                animate={{ scale: 3, opacity: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                className="absolute inset-0 rounded-[inherit] bg-yellow-400/30 pointer-events-none z-0"
              />
            )}
          </AnimatePresence>

          <div
            className={cn(
              'absolute inset-0 rounded-[inherit] bg-yellow-500/5 transition-opacity duration-500',
              isActive ? 'opacity-100' : 'opacity-0'
            )}
          />
        </motion.button>

        <div
          className={cn(
            'absolute inset-0 rounded-[inherit] transition-opacity duration-700 pointer-events-none',
            isActive
              ? 'shadow-[0_0_60px_rgba(250,204,21,0.4),inset_0_0_20px_rgba(250,204,21,0.2)] opacity-100'
              : 'opacity-0'
          )}
          aria-hidden="true"
        />
      </div>
    );
  }

  return (
    <div
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerLeave}
      onPointerCancel={handlePointerLeave}
      className={cn('relative overflow-visible', disabled && 'saturate-50', className)}
    >
      {chargeAura}
      <SquircleButton
        tone="yellow"
        label={isActive ? activeLabel : idleLabel}
        fullWidth
        height={height}
        active={isActive}
        stableHover={stableHover}
        disabled={disabled}
        onClick={handleClick}
        type={type}
        className="w-full"
        buttonClassName={buttonClassName}
      >
        {isActive ? (
          activeContent ?? (
            <span className="relative z-10 font-black uppercase tracking-[0.08em] text-[0.95rem] text-black/82">
              {activeLabel}
            </span>
          )
        ) : children ? (
          <div className="relative z-10">{children}</div>
        ) : (
          <span className="relative z-10 font-black uppercase tracking-[0.08em] text-[0.95rem] text-black/82">
            {idleLabel}
          </span>
        )}
      </SquircleButton>
      <AnimatePresence>
        {isActive && (
          <>
            {/* Core flash — a hot bloom punching out from the button face. */}
            <motion.span
              initial={{ scale: 0.6, opacity: 0.9 }}
              animate={{ scale: 1.9, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="pointer-events-none absolute inset-[-6px] rounded-full bg-[radial-gradient(circle,rgba(255,244,186,0.85)_0%,rgba(245,197,24,0.4)_38%,transparent_70%)] mix-blend-screen"
              aria-hidden="true"
            />
            <motion.span
              initial={{ scale: 0.7, opacity: 0.8 }}
              animate={{ scale: 2.1, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.72, ease: 'easeOut' }}
              className="pointer-events-none absolute inset-[-8px] rounded-full border-2 border-[#f5c518]/60 shadow-[0_0_30px_rgba(245,197,24,0.45)]"
              aria-hidden="true"
            />
            <motion.span
              initial={{ scale: 0.82, opacity: 0.5 }}
              animate={{ scale: 2.9, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.92, delay: 0.08, ease: 'easeOut' }}
              className="pointer-events-none absolute inset-[-14px] rounded-full border border-[#f8dd72]/40"
              aria-hidden="true"
            />
            <motion.span
              initial={{ scale: 0.9, opacity: 0.32 }}
              animate={{ scale: 3.7, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.08, delay: 0.16, ease: 'easeOut' }}
              className="pointer-events-none absolute inset-[-20px] rounded-full border border-[#f8dd72]/25"
              aria-hidden="true"
            />
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
