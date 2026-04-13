'use client';

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
  children,
  activeContent,
  disabled,
  type = 'button',
}: InitProtocolButtonProps) {
  const { ignitionActive, triggerIgnition } = useIgnition();
  const { trigger } = useFeedback();
  const isActive = !disabled && (active ?? ignitionActive);

  const handleAction = () => {
    if (disabled) return;
    trigger('fund');
    triggerIgnition();
    if (onClick) onClick();
  };

  return (
    <SquircleButton
      tone="yellow"
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
