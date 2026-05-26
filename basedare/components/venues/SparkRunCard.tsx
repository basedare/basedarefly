import Link from 'next/link';
import { ArrowRight, BadgeCheck, Clock3, MapPin, ReceiptText, Sparkles, TicketCheck, Users } from 'lucide-react';
import type { SparkRun, SparkRunMomentumState, SparkRunStepState } from '@/lib/spark-run';

type SparkRunCardProps = {
  sparkRun: SparkRun;
  className?: string;
};

const stateTone: Record<SparkRunMomentumState, string> = {
  cold: 'border-white/12 bg-white/[0.05] text-white/62',
  sparked: 'border-fuchsia-300/22 bg-fuchsia-500/[0.09] text-fuchsia-100',
  warming: 'border-[#f5c518]/28 bg-[#f5c518]/[0.1] text-[#f8dd72]',
  live: 'border-cyan-300/24 bg-cyan-500/[0.1] text-cyan-100',
  packed: 'border-[#f5c518]/32 bg-[#f5c518]/[0.14] text-[#f8dd72]',
  proven: 'border-emerald-300/24 bg-emerald-500/[0.1] text-emerald-100',
};

const stepTone: Record<SparkRunStepState, string> = {
  done: 'border-emerald-300/18 bg-emerald-500/[0.08] text-emerald-100',
  active: 'border-[#f5c518]/26 bg-[#f5c518]/[0.1] text-[#f8dd72]',
  next: 'border-white/10 bg-white/[0.035] text-white/48',
};

function formatCompact(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 10_000) return `${Math.round(value / 1_000)}K`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return String(Math.max(0, Math.round(value)));
}

export default function SparkRunCard({ sparkRun, className = '' }: SparkRunCardProps) {
  const metrics = [
    { label: 'Check-ins', mobileLabel: 'Check', value: `${formatCompact(sparkRun.checkIns)}/${formatCompact(sparkRun.targetCheckIns)}`, icon: MapPin },
    { label: 'Proofs', mobileLabel: 'Proof', value: formatCompact(sparkRun.proofs), icon: BadgeCheck },
    { label: 'Perks', mobileLabel: 'Perks', value: formatCompact(sparkRun.redemptions), icon: TicketCheck },
    { label: 'Creators', mobileLabel: 'Crew', value: formatCompact(sparkRun.creatorCount), icon: Users },
  ];

  return (
    <article
      className={`relative overflow-hidden rounded-[32px] border border-[#f5c518]/18 bg-[radial-gradient(circle_at_8%_0%,rgba(245,197,24,0.17),transparent_34%),radial-gradient(circle_at_86%_18%,rgba(168,85,247,0.16),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.075)_0%,rgba(13,10,22,0.94)_58%,rgba(5,5,10,0.98)_100%)] p-4 text-white shadow-[0_28px_84px_rgba(0,0,0,0.38),0_0_28px_rgba(168,85,247,0.08),inset_0_1px_0_rgba(255,255,255,0.12),inset_0_-18px_28px_rgba(0,0,0,0.3)] sm:p-6 ${className}`}
    >
      <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-[#f8dd72]/42 to-transparent" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_14%_95%,rgba(34,211,238,0.08),transparent_32%),linear-gradient(90deg,rgba(255,255,255,0.025),transparent_34%,rgba(255,255,255,0.018))]" />

      <div className="relative grid gap-5 lg:grid-cols-[0.92fr_1.08fr] lg:items-stretch">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#f5c518]/24 bg-[#f5c518]/[0.1] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.22em] text-[#f8dd72]">
              <Sparkles className="h-4 w-4" />
              First Spark Run
            </span>
            <span className={`inline-flex rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] ${stateTone[sparkRun.state]}`}>
              {sparkRun.stateLabel}
            </span>
          </div>

          <h2 className="mt-4 text-2xl font-black tracking-[-0.045em] text-white sm:text-4xl sm:tracking-[-0.055em]">
            Fill a slow hour. Get proof.
          </h2>
          <p className="mt-2 text-sm font-bold leading-6 text-white/58">{sparkRun.stateDetail}</p>

          <div className="mt-4 grid gap-2">
            <div className="flex min-w-0 items-center gap-2 rounded-[18px] border border-white/10 bg-black/28 px-3 py-2.5 text-sm font-black text-white/78 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
              <Clock3 className="h-4 w-4 shrink-0 text-[#f8dd72]" />
              <span className="truncate">{sparkRun.windowLabel}</span>
            </div>
            <div className="flex min-w-0 items-center gap-2 rounded-[18px] border border-white/10 bg-black/28 px-3 py-2.5 text-sm font-black text-white/78 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
              <TicketCheck className="h-4 w-4 shrink-0 text-fuchsia-100" />
              <span className="truncate">{sparkRun.offerLabel}</span>
            </div>
          </div>
        </div>

        <div className="grid gap-4">
          <div className="grid grid-cols-4 gap-2">
            {metrics.map((metric) => {
              const MetricIcon = metric.icon;
              return (
                <div key={metric.label} className="rounded-[17px] border border-white/10 bg-white/[0.04] px-2 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),inset_0_-10px_14px_rgba(0,0,0,0.18)] sm:rounded-[19px] sm:px-3 sm:py-3">
                  <MetricIcon className="h-4 w-4 text-[#f8dd72]/82" />
                  <p className="mt-2 text-base font-black text-white sm:text-xl">{metric.value}</p>
                  <p className="mt-1 text-[8px] font-black uppercase tracking-[0.1em] text-white/36 sm:text-[9px] sm:tracking-[0.16em]">
                    <span className="sm:hidden">{metric.mobileLabel}</span>
                    <span className="hidden sm:inline">{metric.label}</span>
                  </p>
                </div>
              );
            })}
          </div>

          <div className="rounded-[20px] border border-white/10 bg-black/24 px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[10px] font-black uppercase tracking-[0.18em] text-white/42">{sparkRun.targetLabel}</span>
              <span className="font-mono text-[10px] font-black text-white/58">{sparkRun.progress}%</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/[0.06] shadow-[inset_0_1px_4px_rgba(0,0,0,0.45)]">
              <div
                className="h-full rounded-full bg-[linear-gradient(90deg,#8c4dff,#f5c518)] shadow-[0_0_18px_rgba(245,197,24,0.34)]"
                style={{ width: `${sparkRun.progress}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {sparkRun.steps.map((step) => (
              <div key={step.label} className={`rounded-[16px] border px-2 py-2.5 sm:rounded-[18px] sm:px-3 sm:py-3 ${stepTone[step.state]}`}>
                <p className="text-[8px] font-black uppercase tracking-[0.1em] opacity-70 sm:text-[9px] sm:tracking-[0.16em]">{step.label}</p>
                <p className="mt-1 truncate text-[11px] font-black sm:text-sm" title={step.value}>
                  {step.value}
                </p>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Link
              href={sparkRun.primaryCta.href}
              className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full border border-[#f5c518]/30 bg-[linear-gradient(180deg,rgba(255,225,87,0.28)_0%,rgba(145,89,0,0.26)_100%)] px-5 text-xs font-black uppercase tracking-[0.16em] text-[#f8dd72] shadow-[0_16px_26px_rgba(0,0,0,0.24),inset_0_1px_0_rgba(255,255,255,0.14),inset_0_-5px_0_rgba(0,0,0,0.22)] transition hover:-translate-y-[1px] hover:border-[#f8dd72]/50"
            >
              {sparkRun.primaryCta.label}
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href={sparkRun.secondaryCta.href}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-fuchsia-300/18 bg-fuchsia-500/[0.07] px-5 text-xs font-black uppercase tracking-[0.16em] text-fuchsia-100/82 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition hover:border-fuchsia-200/32 hover:text-white"
            >
              <ReceiptText className="h-4 w-4" />
              {sparkRun.secondaryCta.label}
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}
