'use client';

type SentinelBadgeProps = {
  requireSentinel?: boolean | null;
  sentinelVerified?: boolean | null;
  className?: string;
};

export default function SentinelBadge({
  requireSentinel,
  sentinelVerified,
  className = '',
}: SentinelBadgeProps) {
  if (!requireSentinel) {
    return null;
  }

  const toneClass = sentinelVerified
    ? 'border-emerald-400/30 bg-emerald-500/12 text-emerald-200'
    : 'border-amber-400/30 bg-amber-500/12 text-amber-100';
  const tooltip = sentinelVerified
    ? 'Passed Sentinel review.'
    : 'Extra verification requested before payout.';

  return (
    <span
      title={tooltip}
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${toneClass} ${className}`.trim()}
    >
      {sentinelVerified ? 'Sentinel Verified' : 'Sentinel Requested'}
    </span>
  );
}
