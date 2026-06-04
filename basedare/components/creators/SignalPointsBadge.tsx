import { Zap, ShieldCheck } from 'lucide-react';

import { cn } from '@/lib/utils';

/**
 * Signal Points badge (reputation only — no token/cash value).
 */

type SignalPointsBadgeProps = {
  points: number;
  routeReady?: boolean;
  className?: string;
};

export function SignalPointsBadge({ points, routeReady = false, className }: SignalPointsBadgeProps) {
  return (
    <div className={cn('inline-flex items-center gap-2', className)}>
      <span className="inline-flex items-center gap-1.5 rounded-full border border-yellow-300/30 bg-yellow-300/[0.1] px-3 py-1.5 text-xs font-black uppercase tracking-[0.16em] text-yellow-100">
        <Zap className="h-3.5 w-3.5" />
        {points.toLocaleString()} Signal
      </span>
      {routeReady ? (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300/30 bg-emerald-400/[0.1] px-3 py-1.5 text-xs font-black uppercase tracking-[0.16em] text-emerald-100">
          <ShieldCheck className="h-3.5 w-3.5" />
          Route-ready
        </span>
      ) : null}
    </div>
  );
}

export default SignalPointsBadge;
