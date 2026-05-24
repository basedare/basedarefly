import Link from 'next/link';
import { ArrowRight, CheckCircle2, QrCode, ReceiptText, RotateCcw, ShieldCheck } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

type ReceiptMetric = {
  label: string;
  value: string;
  detail: string;
};

type SparkReceiptPreviewProps = {
  venueName?: string | null;
  city?: string | null;
  budgetLabel?: string | null;
  receiptId?: string | null;
  proofLogic?: string | null;
  repeatMetric?: string | null;
  ctaHref?: string | null;
  ctaLabel?: string;
  compact?: boolean;
};

const defaultMetrics: ReceiptMetric[] = [
  { label: 'Check-ins', value: '25', detail: 'QR or nearby proof' },
  { label: 'Proofs', value: '8', detail: 'Reviewed submissions' },
  { label: 'Creators', value: '3', detail: 'Routed local output' },
  { label: 'Decision', value: 'Repeat', detail: 'Fund or stop with proof' },
];

const proofSteps: Array<{ label: string; icon: LucideIcon }> = [
  { label: 'Route approved', icon: CheckCircle2 },
  { label: 'QR / nearby signal captured', icon: QrCode },
  { label: 'Repeat decision written', icon: RotateCcw },
];

export default function SparkReceiptPreview({
  venueName,
  city,
  budgetLabel,
  receiptId,
  proofLogic,
  repeatMetric,
  ctaHref,
  ctaLabel = 'Run First Spark',
  compact = false,
}: SparkReceiptPreviewProps) {
  const target = venueName || 'Selected venue';
  const location = city || 'Local market';
  const code = receiptId || 'BD-SPARK-001';
  const scope = budgetLabel || '$500-$1.5k pilot';
  const proofLine =
    proofLogic || 'QR check-in, creator proof, venue context, and a timestamped recap are reviewed together.';
  const repeatLine =
    repeatMetric || 'Repeat only if the receipt shows real output worth compounding.';
  const isInternalCta = Boolean(ctaHref && (ctaHref.startsWith('/') || ctaHref.startsWith('#')));
  const ctaClassName =
    'inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-full border border-yellow-200/25 bg-yellow-300 px-5 text-xs font-black uppercase tracking-[0.14em] text-black shadow-[0_7px_0_rgba(118,74,0,0.68),inset_0_1px_0_rgba(255,255,255,0.55)] transition hover:-translate-y-0.5';

  return (
    <article className="relative overflow-hidden rounded-[30px] border border-yellow-200/14 bg-[radial-gradient(circle_at_16%_0%,rgba(250,204,21,0.16),transparent_30%),radial-gradient(circle_at_86%_8%,rgba(168,85,247,0.16),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.07),rgba(7,6,14,0.92)_38%,rgba(2,3,7,0.98)_100%)] p-4 shadow-[0_24px_80px_rgba(0,0,0,0.38),inset_0_1px_0_rgba(255,255,255,0.12),inset_0_-18px_24px_rgba(0,0,0,0.28)] sm:p-5">
      <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-yellow-100/50 to-transparent" />
      <div className="pointer-events-none absolute -right-20 -top-24 h-56 w-56 rounded-full bg-purple-400/10 blur-3xl" />
      <div className="relative flex flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-yellow-200/18 bg-yellow-300/[0.09] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-yellow-100/82">
              <ReceiptText className="h-4 w-4" />
              Spark Receipt
            </div>
            <h3 className="mt-4 text-2xl font-black uppercase italic leading-tight text-white sm:text-3xl">
              Proof night recap
            </h3>
            <p className="mt-2 max-w-2xl text-sm font-bold leading-6 text-white/58">
              The buyer gets a simple receipt: what happened, what proof landed, and whether the next activation is worth repeating.
            </p>
          </div>
          <div className="rounded-[20px] border border-white/10 bg-black/28 px-4 py-3 text-right shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/34">Receipt</p>
            <p className="mt-1 text-sm font-black text-yellow-100">{code}</p>
          </div>
        </div>

        <div className="grid gap-3 lg:grid-cols-[1fr_0.72fr]">
          <div className="rounded-[24px] border border-white/[0.08] bg-black/30 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),inset_0_-10px_18px_rgba(0,0,0,0.25)]">
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                ['Venue', target],
                ['Market', location],
                ['Scope', scope],
              ].map(([label, value]) => (
                <div key={label} className="rounded-[18px] border border-white/[0.07] bg-white/[0.035] px-3 py-3">
                  <p className="text-[9px] font-black uppercase tracking-[0.18em] text-cyan-100/50">{label}</p>
                  <p className="mt-1 truncate text-sm font-black text-white/82" title={value}>{value}</p>
                </div>
              ))}
            </div>

            <div className={`mt-4 grid gap-3 ${compact ? 'sm:grid-cols-2' : 'sm:grid-cols-4'}`}>
              {defaultMetrics.map((metric) => (
                <div key={metric.label} className="rounded-[18px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(255,255,255,0.055),rgba(255,255,255,0.018))] px-3 py-3">
                  <p className="text-[9px] font-black uppercase tracking-[0.18em] text-white/35">{metric.label}</p>
                  <p className="mt-2 text-2xl font-black text-white">{metric.value}</p>
                  <p className="mt-1 text-[11px] font-bold leading-4 text-white/42">{metric.detail}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[24px] border border-cyan-200/12 bg-cyan-300/[0.045] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),inset_0_-10px_18px_rgba(0,0,0,0.22)]">
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-cyan-100/68">
              <ShieldCheck className="h-4 w-4" />
              Proof standard
            </div>
            <p className="mt-3 text-sm font-bold leading-6 text-white/62">{proofLine}</p>
            <div className="mt-4 grid gap-2">
              {proofSteps.map(({ label, icon: TimelineIcon }) => {
                return (
                  <div key={label} className="flex items-center gap-3 rounded-[16px] border border-white/[0.07] bg-black/22 px-3 py-2.5">
                    <TimelineIcon className="h-4 w-4 text-yellow-100/72" />
                    <span className="text-xs font-black uppercase tracking-[0.14em] text-white/58">{label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 rounded-[24px] border border-emerald-200/12 bg-emerald-300/[0.055] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-100/66">Next decision</p>
            <p className="mt-1 text-sm font-bold leading-6 text-white/66">{repeatLine}</p>
          </div>
          {ctaHref && isInternalCta ? (
            <Link
              href={ctaHref}
              className={ctaClassName}
            >
              {ctaLabel}
              <ArrowRight className="h-4 w-4" />
            </Link>
          ) : ctaHref ? (
            <a href={ctaHref} className={ctaClassName}>
              {ctaLabel}
              <ArrowRight className="h-4 w-4" />
            </a>
          ) : null}
        </div>
      </div>
    </article>
  );
}
