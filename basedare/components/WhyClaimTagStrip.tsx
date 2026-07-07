'use client';

import Link from 'next/link';
import { ArrowRight, Crown, Flag, MessagesSquare, Receipt } from 'lucide-react';

const softCardClass =
  'relative overflow-hidden rounded-[26px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(255,255,255,0.06)_0%,rgba(255,255,255,0.02)_12%,rgba(10,10,18,0.92)_100%)] shadow-[0_18px_30px_rgba(0,0,0,0.22),inset_0_1px_0_rgba(255,255,255,0.08),inset_0_-12px_18px_rgba(0,0,0,0.22)]';

const insetDentClass =
  'bd-dent-surface bd-dent-surface--soft rounded-[20px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(4,5,10,0.72)_0%,rgba(11,11,18,0.92)_100%)]';

const HOOKS = [
  {
    title: 'The unfakeable receipt',
    body: 'Your first verified check-in prints a serial-numbered thermal receipt — "TOTAL HUMANS VERIFIED: 1. THIS RECEIPT CANNOT BE FAKED. NOT EVEN BY AI." Sixty seconds from tapping connect.',
    icon: Receipt,
    tone: 'text-[#f8dd72] border-[#f5c518]/20 bg-[#f5c518]/[0.08]',
  },
  {
    title: 'The land grab',
    body: 'The first human to prove presence at a venue owns its FIRST PROOF mark permanently — and short @baretags go first, forever. Venues and good names are finite. Nobody joining later can take either.',
    icon: Flag,
    tone: 'text-fuchsia-100 border-fuchsia-400/18 bg-fuchsia-500/[0.08]',
  },
  {
    title: 'Crossed-paths DMs',
    body: 'You can only message people you verifiably shared a venue with — same place, same window, both proven. No cold DMs, no bots, no catfish. The anti-Tinder.',
    icon: MessagesSquare,
    tone: 'text-cyan-100 border-cyan-400/18 bg-cyan-500/[0.08]',
  },
  {
    title: 'Status that compounds',
    body: 'Out-prove everyone at a venue over 30 days and wear the Mayor 👑 crown on the map until someone takes it back. Streaks, points, low receipt serials — reputation earned with your feet.',
    icon: Crown,
    tone: 'text-emerald-200 border-emerald-400/18 bg-emerald-500/[0.08]',
  },
];

export default function WhyClaimTagStrip() {
  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <div className="inline-flex items-center gap-2 rounded-full border border-[#f5c518]/24 bg-[#f5c518]/[0.09] px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-[#f8dd72] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
          <Flag className="h-4 w-4" />
          Why Claim Your @Baretag
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-500/[0.08] px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-emerald-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
          #HumanOnly
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {HOOKS.map((hook) => {
          const Icon = hook.icon;

          return (
            <div key={hook.title} className={`${softCardClass} p-6`}>
              <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/18 to-transparent" />
              <div className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] shadow-[0_12px_20px_rgba(0,0,0,0.16),inset_0_1px_0_rgba(255,255,255,0.08)] ${hook.tone}`}>
                <Icon className="h-4 w-4" />
                The hook
              </div>
              <h2 className="mt-5 text-2xl font-black italic text-white">{hook.title}</h2>
              <div className={`${insetDentClass} mt-5 px-4 py-4`}>
                <p className="text-sm leading-6 text-white/68 md:text-[15px]">{hook.body}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className={`${insetDentClass} mt-6 flex flex-col gap-4 px-5 py-5 md:flex-row md:items-center md:justify-between`}>
        <p className="max-w-2xl text-sm leading-6 text-white/64">
          In 2026, a provably real human doing a provably real thing is the rarest content on the
          internet. Every check-in, dare, and receipt on the grid is exactly that — and the earliest
          tags own the map&apos;s history.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            href="/claim-tag"
            className="inline-flex items-center justify-center gap-2 rounded-full border border-[#f5c518]/24 bg-[linear-gradient(180deg,rgba(245,197,24,0.16)_0%,rgba(74,52,6,0.16)_100%)] px-5 py-3 text-xs font-black uppercase tracking-[0.16em] text-[#fff1ba] shadow-[0_14px_24px_rgba(0,0,0,0.22),inset_0_1px_0_rgba(255,255,255,0.08)] transition hover:-translate-y-[1px] hover:border-[#f5c518]/38"
          >
            Claim your @baretag
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/map"
            className="inline-flex items-center justify-center gap-2 rounded-full border border-white/12 bg-white/[0.05] px-5 py-3 text-xs font-black uppercase tracking-[0.16em] text-white/78 shadow-[0_14px_24px_rgba(0,0,0,0.22),inset_0_1px_0_rgba(255,255,255,0.08)] transition hover:-translate-y-[1px] hover:border-white/24 hover:text-white"
          >
            Open the map
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
