import Link from 'next/link';
import { ArrowRight, Bot, CheckCircle2, QrCode, ReceiptText, Sparkles, Users } from 'lucide-react';
import type { FirstSparkWindowSummary, VenueDetail } from '@/lib/venue-types';

type VenueAutopilotPanelProps = {
  venueName: string;
  activation: FirstSparkWindowSummary | null;
  liveStats: VenueDetail['liveStats'];
  activeDareCount: number;
  topCreatorTag: string | null;
  consoleHref: string;
  receiptHref: string;
  launchHref: string;
  className?: string;
};

function getAutopilotMove(input: {
  activation: FirstSparkWindowSummary | null;
  liveStats: VenueDetail['liveStats'];
  activeDareCount: number;
  topCreatorTag: string | null;
  consoleHref: string;
  receiptHref: string;
  launchHref: string;
}) {
  if (input.activation?.state === 'proven' || input.activation?.proofs || input.activation?.redemptions) {
    return {
      label: 'Repeat sale',
      title: 'Send the receipt. Ask for the repeat.',
      detail: 'Proof exists. The next move is a buyer-facing recap and one sharper repeat window.',
      primaryLabel: 'Open receipt',
      primaryHref: input.receiptHref,
      icon: ReceiptText,
      tone: 'emerald',
    };
  }

  if (input.activation?.state === 'live' || input.liveStats.uniqueVisitorsToday > 0) {
    return {
      label: 'Proof capture',
      title: 'Get one clean proof moment now.',
      detail: 'The window has motion. Capture QR, clip, or perk redemption before the signal goes cold.',
      primaryLabel: 'Open console',
      primaryHref: input.consoleHref,
      icon: QrCode,
      tone: 'cyan',
    };
  }

  if (input.activation?.state === 'heating' || input.activeDareCount > 0) {
    return {
      label: 'Route people',
      title: input.topCreatorTag ? `Route ${input.topCreatorTag}.` : 'Route a creator into the window.',
      detail: 'The offer is armed. Add a creator route and make the check-in target visible.',
      primaryLabel: 'Launch mission',
      primaryHref: input.launchHref,
      icon: Users,
      tone: 'gold',
    };
  }

  return {
    label: 'First move',
    title: 'Start a 90-minute Spark Window.',
    detail: 'Pick the slow hour, add one perk, and let the receipt decide the repeat.',
    primaryLabel: 'Start Spark',
    primaryHref: input.launchHref,
    icon: Sparkles,
    tone: 'purple',
  };
}

function getToneClasses(tone: string) {
  switch (tone) {
    case 'emerald':
      return 'border-emerald-300/22 bg-emerald-400/[0.08] text-emerald-100';
    case 'cyan':
      return 'border-cyan-300/22 bg-cyan-400/[0.08] text-cyan-100';
    case 'gold':
      return 'border-[#f5c518]/26 bg-[#f5c518]/[0.1] text-[#f8dd72]';
    default:
      return 'border-fuchsia-300/22 bg-fuchsia-400/[0.08] text-fuchsia-100';
  }
}

export default function VenueAutopilotPanel({
  venueName,
  activation,
  liveStats,
  activeDareCount,
  topCreatorTag,
  consoleHref,
  receiptHref,
  launchHref,
  className = '',
}: VenueAutopilotPanelProps) {
  const move = getAutopilotMove({
    activation,
    liveStats,
    activeDareCount,
    topCreatorTag,
    consoleHref,
    receiptHref,
    launchHref,
  });
  const MoveIcon = move.icon;
  const toneClassName = getToneClasses(move.tone);

  return (
    <section className={`relative overflow-hidden rounded-[28px] border border-white/[0.09] bg-[radial-gradient(circle_at_12%_0%,rgba(34,211,238,0.12),transparent_32%),radial-gradient(circle_at_88%_12%,rgba(245,197,24,0.12),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.07),rgba(8,8,16,0.94)_62%,rgba(5,5,10,0.98))] p-5 text-white shadow-[0_22px_64px_rgba(0,0,0,0.34),inset_0_1px_0_rgba(255,255,255,0.1),inset_0_-16px_24px_rgba(0,0,0,0.26)] ${className}`}>
      <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-cyan-100/30 to-transparent" />
      <div className="relative grid gap-4 lg:grid-cols-[0.86fr_1.14fr] lg:items-stretch">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-400/[0.08] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.22em] text-cyan-100">
            <Bot className="h-4 w-4" />
            Autopilot
          </div>
          <h3 className="mt-3 text-2xl font-black tracking-[-0.04em] text-white">Recommended next move.</h3>
          <p className="mt-2 text-sm font-bold leading-6 text-white/56">
            BaseDare can recommend and draft. Operators still approve money, outreach, and public claims.
          </p>
        </div>

        <div className="rounded-[24px] border border-white/10 bg-black/26 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),inset_0_-12px_18px_rgba(0,0,0,0.22)]">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] ${toneClassName}`}>
              <MoveIcon className="h-4 w-4" />
              {move.label}
            </span>
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-white/46">
              {venueName}
            </span>
          </div>
          <h4 className="mt-4 text-xl font-black text-white">{move.title}</h4>
          <p className="mt-2 text-sm leading-6 text-white/58">{move.detail}</p>

          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            {[
              { label: 'Check-ins', value: liveStats.uniqueVisitorsToday },
              { label: 'Scans', value: liveStats.scansLastHour },
              { label: 'Live drops', value: activeDareCount },
            ].map((metric) => (
              <div key={metric.label} className="rounded-[18px] border border-white/10 bg-white/[0.035] px-3 py-3">
                <p className="text-[9px] font-black uppercase tracking-[0.16em] text-white/34">{metric.label}</p>
                <p className="mt-1 text-2xl font-black text-white">{metric.value}</p>
              </div>
            ))}
          </div>

          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <Link
              href={move.primaryHref}
              className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full border border-[#f5c518]/28 bg-[linear-gradient(180deg,rgba(255,225,87,0.25)_0%,rgba(122,73,0,0.24)_100%)] px-5 text-xs font-black uppercase tracking-[0.16em] text-[#f8dd72] shadow-[0_14px_24px_rgba(0,0,0,0.24),inset_0_1px_0_rgba(255,255,255,0.12),inset_0_-5px_0_rgba(0,0,0,0.22)] transition hover:-translate-y-[1px] hover:border-[#f8dd72]/46"
            >
              {move.primaryLabel}
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href={consoleHref}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.045] px-5 text-xs font-black uppercase tracking-[0.16em] text-white/62 transition hover:border-white/18 hover:text-white"
            >
              <CheckCircle2 className="h-4 w-4" />
              Review
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
