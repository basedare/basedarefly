import Link from 'next/link';
import { ArrowRight, BadgeCheck, QrCode, ReceiptText, RotateCcw, TicketCheck, Users } from 'lucide-react';
import type { FirstSparkWindowSummary } from '@/lib/venue-types';

type SparkReceiptCardProps = {
  venueName: string;
  city?: string | null;
  activation: FirstSparkWindowSummary | null;
  checkIns: number;
  proofs: number;
  redemptions: number;
  creatorCount: number;
  fundingUsd: number;
  href: string;
  ctaLabel?: string;
  compact?: boolean;
  className?: string;
};

function formatCompact(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 10_000) return `${Math.round(value / 1_000)}K`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return String(Math.max(0, Math.round(value)));
}

function getReceiptState(input: {
  activation: FirstSparkWindowSummary | null;
  checkIns: number;
  proofs: number;
  redemptions: number;
}) {
  if (input.activation?.state === 'proven' || input.proofs > 0 || input.redemptions > 0) {
    return {
      label: 'Receipt ready',
      headline: 'Proof you can sell again.',
      detail: 'Send the venue a clean recap: people, proof, perks, and the next repeat move.',
      className: 'border-emerald-300/24 bg-emerald-400/[0.1] text-emerald-100',
    };
  }

  if (input.activation?.state === 'live' || input.checkIns > 0) {
    return {
      label: 'Collect proof',
      headline: 'The window is moving.',
      detail: 'One clear clip, QR check-in, or redeemed perk turns this into a buyer-ready receipt.',
      className: 'border-cyan-300/24 bg-cyan-400/[0.1] text-cyan-100',
    };
  }

  if (input.activation?.state === 'heating') {
    return {
      label: 'Heating',
      headline: 'Window is armed.',
      detail: 'The offer is visible. Route people in, capture check-ins, then package the proof.',
      className: 'border-[#f5c518]/26 bg-[#f5c518]/[0.1] text-[#f8dd72]',
    };
  }

  return {
    label: 'Receipt slot',
    headline: 'Start the first receipt.',
    detail: 'Pick a slow hour, add one perk, and turn the outcome into a repeatable proof object.',
    className: 'border-white/12 bg-white/[0.05] text-white/62',
  };
}

export default function SparkReceiptCard({
  venueName,
  city,
  activation,
  checkIns,
  proofs,
  redemptions,
  creatorCount,
  fundingUsd,
  href,
  ctaLabel = 'Open receipt',
  compact = false,
  className = '',
}: SparkReceiptCardProps) {
  const state = getReceiptState({ activation, checkIns, proofs, redemptions });
  const targetCheckIns = activation?.targetCheckIns ?? 20;
  const progress = Math.min(100, Math.round((checkIns / Math.max(1, targetCheckIns)) * 100));
  const metrics = [
    { label: 'Check-ins', value: formatCompact(checkIns), icon: QrCode },
    { label: 'Proofs', value: formatCompact(proofs), icon: BadgeCheck },
    { label: 'Perks', value: formatCompact(redemptions), icon: TicketCheck },
    { label: 'Creators', value: formatCompact(creatorCount), icon: Users },
  ];

  return (
    <article
      className={`relative overflow-hidden rounded-[30px] border border-[#f5c518]/16 bg-[radial-gradient(circle_at_14%_0%,rgba(245,197,24,0.16),transparent_34%),radial-gradient(circle_at_88%_18%,rgba(168,85,247,0.13),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.07),rgba(9,8,16,0.94)_58%,rgba(5,5,10,0.98))] p-5 text-white shadow-[0_24px_70px_rgba(0,0,0,0.36),inset_0_1px_0_rgba(255,255,255,0.11),inset_0_-18px_24px_rgba(0,0,0,0.28)] ${className}`}
    >
      <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-[#f8dd72]/38 to-transparent" />
      <div className="relative">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#f5c518]/22 bg-[#f5c518]/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-[#f8dd72]">
              <ReceiptText className="h-4 w-4" />
              Spark Receipt
            </div>
            <h3 className={`${compact ? 'mt-3 text-xl' : 'mt-4 text-2xl sm:text-3xl'} font-black tracking-[-0.04em] text-white`}>
              {state.headline}
            </h3>
            <p className="mt-1 text-[10px] font-black uppercase tracking-[0.2em] text-cyan-100/56">{venueName}</p>
            <p className="mt-2 max-w-2xl text-sm font-bold leading-6 text-white/56">{state.detail}</p>
          </div>
          <span className={`rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] ${state.className}`}>
            {state.label}
          </span>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          <div className="rounded-[18px] border border-white/10 bg-black/24 px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] sm:col-span-2">
            <p className="text-[9px] font-black uppercase tracking-[0.18em] text-white/34">Window</p>
            <p className="mt-1 truncate text-sm font-black text-white" title={activation?.windowLabel ?? 'Pick slow hour'}>
              {activation?.windowLabel ?? 'Pick slow hour'} - {activation?.perkLabel ?? 'one simple perk'}
            </p>
          </div>
          <div className="rounded-[18px] border border-white/10 bg-black/24 px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
            <p className="text-[9px] font-black uppercase tracking-[0.18em] text-white/34">Market</p>
            <p className="mt-1 truncate text-sm font-black text-cyan-100" title={city ?? 'Local'}>
              {city ?? 'Local'}
            </p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {metrics.map((metric) => {
            const MetricIcon = metric.icon;
            return (
              <div key={metric.label} className="rounded-[18px] border border-white/10 bg-white/[0.04] px-3 py-3">
                <MetricIcon className="h-4 w-4 text-[#f8dd72]/76" />
                <p className="mt-2 text-2xl font-black text-white">{metric.value}</p>
                <p className="mt-1 text-[9px] font-black uppercase tracking-[0.16em] text-white/36">{metric.label}</p>
              </div>
            );
          })}
        </div>

        <div className="mt-4 rounded-[18px] border border-white/10 bg-black/24 px-3 py-3">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[10px] font-black uppercase tracking-[0.18em] text-white/42">
              {activation?.targetLabel ?? `${targetCheckIns} check-ins`}
            </span>
            <span className="font-mono text-[10px] font-black text-white/58">{progress}%</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/[0.06] shadow-[inset_0_1px_4px_rgba(0,0,0,0.45)]">
            <div
              className="h-full rounded-full bg-[linear-gradient(90deg,#6feaff,#f5c518,#b66bff)] shadow-[0_0_16px_rgba(245,197,24,0.32)]"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300/14 bg-emerald-400/[0.06] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-emerald-100/80">
            <RotateCcw className="h-3.5 w-3.5" />
            ${formatCompact(fundingUsd)} visible funding
          </div>
          <Link
            href={href}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-[#f5c518]/28 bg-[linear-gradient(180deg,rgba(255,225,87,0.25)_0%,rgba(122,73,0,0.24)_100%)] px-5 text-xs font-black uppercase tracking-[0.16em] text-[#f8dd72] shadow-[0_14px_24px_rgba(0,0,0,0.24),inset_0_1px_0_rgba(255,255,255,0.12),inset_0_-5px_0_rgba(0,0,0,0.22)] transition hover:-translate-y-[1px] hover:border-[#f8dd72]/46"
          >
            {ctaLabel}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </article>
  );
}
