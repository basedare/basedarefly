import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  BadgeCheck,
  ClipboardCheck,
  FileCheck2,
  MapPinned,
  Megaphone,
  Radio,
  ShieldCheck,
} from 'lucide-react';

import GradualBlurOverlay from '@/components/GradualBlurOverlay';
import LiquidBackground from '@/components/LiquidBackground';
import { BASEDARE_CORE_POSITIONING, SPRINT_LAUNCH_PACKETS } from '@/lib/sprint-launch-pack';

export const metadata: Metadata = {
  title: 'Sprint Launch Pack · BaseDare Admin',
  robots: {
    index: false,
    follow: false,
  },
};

const packetIcons = {
  'creator-starter-pack': Megaphone,
  'sprint-operator-checklist': ClipboardCheck,
  'venue-field-station-packet': MapPinned,
  'receipt-close': FileCheck2,
} as const;

const packetTones = {
  'creator-starter-pack': 'border-cyan-300/25 bg-cyan-400/[0.08] text-cyan-100',
  'sprint-operator-checklist': 'border-yellow-300/25 bg-yellow-300/[0.08] text-yellow-100',
  'venue-field-station-packet': 'border-emerald-300/25 bg-emerald-300/[0.08] text-emerald-100',
  'receipt-close': 'border-fuchsia-300/25 bg-fuchsia-300/[0.08] text-fuchsia-100',
} as const;

function StepPill({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-white/50">
      {children}
    </span>
  );
}

export default function SprintLaunchPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#03040a] px-4 py-10 text-white sm:px-6 lg:px-10">
      <LiquidBackground performanceMode="quiet" veilOpacity={0.7} />
      <GradualBlurOverlay intensity="light" />

      <section className="relative z-10 mx-auto flex max-w-7xl flex-col gap-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link
            href="/admin"
            className="inline-flex rounded-full border border-white/10 bg-white/5 px-4 py-2 text-[11px] font-black uppercase tracking-[0.22em] text-white/70 transition hover:border-white/25 hover:text-white"
          >
            Back to admin
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/admin/creator-drops"
              className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-cyan-100 transition hover:bg-cyan-300 hover:text-black"
            >
              Creator drops
            </Link>
            <Link
              href="/admin/mission-control"
              className="rounded-full border border-yellow-300/20 bg-yellow-300/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-yellow-100 transition hover:bg-yellow-300 hover:text-black"
            >
              Mission control
            </Link>
          </div>
        </div>

        <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-black/45 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_24px_90px_rgba(0,0,0,0.55)]">
          <div className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[1.12fr_0.88fr] lg:p-10">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-yellow-300/25 bg-yellow-300/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.24em] text-yellow-100">
                <Radio className="h-3.5 w-3.5" />
                Sprint launch pack
              </div>
              <h1 className="mt-5 max-w-4xl text-4xl font-black uppercase italic tracking-[-0.05em] sm:text-6xl lg:text-7xl">
                {BASEDARE_CORE_POSITIONING.recommendedLine}
              </h1>
              <p className="mt-5 max-w-2xl text-lg font-bold leading-relaxed text-white/68">
                {BASEDARE_CORE_POSITIONING.supportingLine}
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                <StepPill>Playable map</StepPill>
                <StepPill>Creator missions</StepPill>
                <StepPill>Verified receipts</StepPill>
                <StepPill>Place memory</StepPill>
              </div>
            </div>

            <div className="rounded-[1.6rem] border border-cyan-300/15 bg-cyan-300/[0.055] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
              <div className="flex items-center gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-2xl border border-cyan-300/20 bg-cyan-300/10 text-cyan-100">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-100/70">Core</p>
                  <h2 className="text-xl font-black text-white">What BaseDare is</h2>
                </div>
              </div>
              <p className="mt-4 text-sm font-bold leading-relaxed text-white/68">
                {BASEDARE_CORE_POSITIONING.core}
              </p>
              <div className="mt-5 rounded-2xl border border-white/10 bg-black/35 p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/35">Loop</p>
                <p className="mt-2 text-sm font-black text-white">{BASEDARE_CORE_POSITIONING.shortLoop}</p>
              </div>
              <div className="mt-5 rounded-2xl border border-red-300/20 bg-red-500/10 p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-red-100/70">Avoid this line</p>
                <p className="mt-2 text-sm font-bold text-red-50/80">{BASEDARE_CORE_POSITIONING.oldLine}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-2">
          {SPRINT_LAUNCH_PACKETS.map((packet) => {
            const Icon = packetIcons[packet.id];
            return (
              <article
                key={packet.id}
                className="rounded-[1.8rem] border border-white/10 bg-black/48 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className={`grid h-12 w-12 place-items-center rounded-2xl border ${packetTones[packet.id]}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/35">{packet.eyebrow}</p>
                      <h2 className="mt-1 text-2xl font-black text-white">{packet.title}</h2>
                    </div>
                  </div>
                  <Link
                    href={packet.nextActionHref}
                    className="inline-flex items-center gap-2 rounded-full border border-yellow-300/25 bg-yellow-300/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-yellow-100 transition hover:bg-yellow-300 hover:text-black"
                  >
                    {packet.nextActionLabel}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>

                <p className="mt-4 text-base font-black leading-relaxed text-white">
                  {packet.plainEnglish}
                </p>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/35">Owner</p>
                    <p className="mt-2 text-sm font-bold text-white/72">{packet.owner}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/35">Outcome</p>
                    <p className="mt-2 text-sm font-bold text-white/72">{packet.outcome}</p>
                  </div>
                </div>

                <div className="mt-4 rounded-2xl border border-white/10 bg-black/35 p-4">
                  <p className="mb-3 text-[10px] font-black uppercase tracking-[0.22em] text-white/35">Checklist</p>
                  <ol className="space-y-2">
                    {packet.checklist.map((item, index) => (
                      <li key={item} className="flex gap-3 text-sm font-bold leading-relaxed text-white/70">
                        <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border border-cyan-300/20 bg-cyan-300/10 text-[10px] font-black text-cyan-100">
                          {index + 1}
                        </span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ol>
                </div>

                <div className="mt-4 grid gap-3">
                  {packet.scripts.map((script) => (
                    <div key={script.label} className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
                      <div className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-yellow-100/65">
                        <BadgeCheck className="h-3.5 w-3.5" />
                        {script.label}
                      </div>
                      <p className="text-sm font-bold leading-relaxed text-white/72">{script.copy}</p>
                    </div>
                  ))}
                </div>
              </article>
            );
          })}
        </section>
      </section>
    </main>
  );
}
