'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useIgnition } from '@/app/context/IgnitionContext';
import { useFeedback } from '@/hooks/useFeedback';
import { cn } from '@/lib/utils';
import SquircleButton from '@/components/ui/SquircleButton';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

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
  children,
  activeContent,
  disabled,
  type = 'button',
}: InitProtocolButtonProps) {
  const { ignitionActive, triggerIgnition } = useIgnition();
  const { trigger } = useFeedback();
  const isActive = !disabled && (active ?? ignitionActive);
  const liquidRadius = height / 2;

  const handleAction = () => {
    if (disabled) return;
    trigger('fund');
    triggerIgnition();
    if (onClick) onClick();
  };

  if (variant === 'liquid') {
    return (
      <div
        className={cn(
          'relative group overflow-hidden p-[1.5px] transition-all duration-500',
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

        <motion.button
          whileTap={{ scale: disabled ? 1 : 0.985 }}
          onClick={handleAction}
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
    <SquircleButton
      tone="yellow"
      label={isActive ? activeLabel : idleLabel}
      fullWidth
      height={height}
      active={isActive}
      disabled={disabled}
      onClick={handleAction}
      type={type}
      className={cn(disabled && 'saturate-50', className)}
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
  );
}
