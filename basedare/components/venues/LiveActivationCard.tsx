import Link from 'next/link';
import { Clock3, MapPin, RadioTower, ReceiptText, Target, TicketCheck } from 'lucide-react';
import type { FirstSparkWindowState, FirstSparkWindowSummary } from '@/lib/venue-types';

type LiveActivationCardProps = {
  venueName: string;
  activation: FirstSparkWindowSummary | null;
  href?: string;
  ctaLabel?: string;
  compact?: boolean;
  className?: string;
};

const stateCopy: Record<FirstSparkWindowState, { label: string; className: string }> = {
  quiet: {
    label: 'Quiet',
    className: 'border-white/12 bg-white/[0.05] text-white/62',
  },
  heating: {
    label: 'Heating',
    className: 'border-[#f5c518]/28 bg-[#f5c518]/[0.12] text-[#f8dd72]',
  },
  live: {
    label: 'Live',
    className: 'border-cyan-300/28 bg-cyan-400/[0.12] text-cyan-100',
  },
  proven: {
    label: 'Proven',
    className: 'border-emerald-300/28 bg-emerald-400/[0.12] text-emerald-100',
  },
};

function resolveCta(activation: FirstSparkWindowSummary | null) {
  if (!activation) return 'Fund Spark';
  if (activation.state === 'proven') return 'View Receipt';
  if (activation.state === 'live') return 'Check In';
  if (activation.state === 'heating') return 'Go Now';
  return 'Fund Spark';
}

function buildEmptyActivation(): FirstSparkWindowSummary {
  return {
    enabled: false,
    state: 'quiet',
    windowLabel: 'Pick slow hour',
    perkLabel: 'Add one perk',
    targetLabel: '20 check-ins',
    targetCheckIns: 20,
    checkIns: 0,
    proofs: 0,
    redemptions: 0,
    startsAt: null,
    endsAt: null,
    updatedAt: null,
    source: 'derived',
  };
}

export default function LiveActivationCard({
  venueName,
  activation,
  href,
  ctaLabel,
  compact = false,
  className = '',
}: LiveActivationCardProps) {
  const spark = activation ?? buildEmptyActivation();
  const state = stateCopy[spark.state];
  const progress = Math.min(100, Math.round((spark.checkIns / Math.max(1, spark.targetCheckIns)) * 100));
  const actionLabel = ctaLabel ?? resolveCta(activation);

  return (
    <article
      className={`relative overflow-hidden rounded-[28px] border border-white/[0.09] bg-[linear-gradient(180deg,rgba(255,255,255,0.075)_0%,rgba(255,255,255,0.03)_14%,rgba(9,9,16,0.92)_64%,rgba(5,5,10,0.98)_100%)] p-5 text-white shadow-[0_26px_70px_rgba(0,0,0,0.36),inset_0_1px_0_rgba(255,255,255,0.11),inset_0_-18px_28px_rgba(0,0,0,0.32)] ${className}`}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_0%,rgba(245,197,24,0.14),transparent_32%),radial-gradient(circle_at_92%_20%,rgba(34,211,238,0.12),transparent_35%),radial-gradient(circle_at_70%_100%,rgba(168,85,247,0.12),transparent_38%)]" />
      <div className="pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-white/24 to-transparent" />

      <div className="relative">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#f5c518]/22 bg-[#f5c518]/[0.1] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-[#f8dd72] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
              <RadioTower className="h-3.5 w-3.5" />
              First Spark Window
            </div>
            <h3 className={`${compact ? 'mt-3 text-xl' : 'mt-4 text-2xl'} font-black tracking-[-0.04em]`}>
              {venueName}
            </h3>
          </div>
          <span className={`shrink-0 rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] ${state.className}`}>
            {state.label}
          </span>
        </div>

        <div className="mt-4 grid gap-2">
          <div className="flex items-center gap-2 rounded-[18px] border border-white/10 bg-black/28 px-3 py-2.5 text-sm font-bold text-white/78 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
            <Clock3 className="h-4 w-4 shrink-0 text-cyan-100" />
            <span className="truncate">{spark.windowLabel}</span>
          </div>
          <div className="flex items-center gap-2 rounded-[18px] border border-white/10 bg-black/28 px-3 py-2.5 text-sm font-bold text-white/78 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
            <TicketCheck className="h-4 w-4 shrink-0 text-[#f8dd72]" />
            <span className="truncate">{spark.perkLabel}</span>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <div className="rounded-[17px] border border-white/10 bg-white/[0.035] px-3 py-3">
            <p className="text-[9px] font-black uppercase tracking-[0.16em] text-white/36">Check-ins</p>
            <p className="mt-1 text-2xl font-black text-cyan-100">{spark.checkIns}</p>
          </div>
          <div className="rounded-[17px] border border-white/10 bg-white/[0.035] px-3 py-3">
            <p className="text-[9px] font-black uppercase tracking-[0.16em] text-white/36">Proofs</p>
            <p className="mt-1 text-2xl font-black text-white">{spark.proofs}</p>
          </div>
          <div className="rounded-[17px] border border-white/10 bg-white/[0.035] px-3 py-3">
            <p className="text-[9px] font-black uppercase tracking-[0.16em] text-white/36">Perks</p>
            <p className="mt-1 text-2xl font-black text-emerald-100">{spark.redemptions}</p>
          </div>
        </div>

        <div className="mt-4 rounded-[18px] border border-white/10 bg-black/24 px-3 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="inline-flex min-w-0 items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-white/44">
              <Target className="h-3.5 w-3.5 text-[#f8dd72]" />
              <span className="truncate">{spark.targetLabel}</span>
            </div>
            <span className="font-mono text-[10px] font-black text-white/58">{progress}%</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/[0.06] shadow-[inset_0_1px_4px_rgba(0,0,0,0.45)]">
            <div
              className="h-full rounded-full bg-[linear-gradient(90deg,#6feaff,#f5c518,#b66bff)] shadow-[0_0_16px_rgba(245,197,24,0.32)]"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {href ? (
          <Link
            href={href}
            className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-cyan-300/24 bg-[linear-gradient(180deg,rgba(111,234,255,0.22)_0%,rgba(18,70,86,0.34)_100%)] px-4 text-xs font-black uppercase tracking-[0.16em] text-cyan-50 shadow-[0_14px_24px_rgba(0,0,0,0.24),inset_0_1px_0_rgba(255,255,255,0.12),inset_0_-5px_0_rgba(0,0,0,0.22)] transition hover:-translate-y-[1px] hover:border-cyan-100/44"
          >
            <MapPin className="h-4 w-4" />
            {actionLabel}
          </Link>
        ) : (
          <div className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 text-xs font-black uppercase tracking-[0.16em] text-white/54">
            <ReceiptText className="h-4 w-4" />
            {actionLabel}
          </div>
        )}
      </div>
    </article>
  );
}
