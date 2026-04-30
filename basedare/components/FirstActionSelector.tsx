'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

type RoleRoute = {
  id: string;
  title: string;
  audience: string;
  emoji: string;
  href: string;
  move: string;
  accent: string;
  edgeColor: string;
  glowColor: string;
  lineColor: string;
};

const ROLE_ROUTES: RoleRoute[] = [
  {
    id: '01',
    title: 'Create a dare',
    audience: 'Funders',
    emoji: '💸',
    href: '/create',
    move: 'Brief • Fund • Launch',
    accent: 'border-[#f0b90b]/18 bg-[#f0b90b]/[0.08] text-[#ffe27a]',
    edgeColor: 'rgba(245,197,24,0.3)',
    glowColor: 'rgba(245,197,24,0.16)',
    lineColor: 'rgba(245,197,24,0.64)',
  },
  {
    id: '02',
    title: 'Complete dares',
    audience: 'Creators',
    emoji: '📍',
    href: '/map',
    move: 'Scan • Claim • Submit',
    accent: 'border-cyan-300/18 bg-cyan-500/[0.08] text-cyan-100',
    edgeColor: 'rgba(103,232,249,0.26)',
    glowColor: 'rgba(34,211,238,0.14)',
    lineColor: 'rgba(103,232,249,0.58)',
  },
  {
    id: '03',
    title: 'Respond to a target',
    audience: 'Invited creators',
    emoji: '🎯',
    href: '/dashboard',
    move: 'Review • Accept • Deliver',
    accent: 'border-fuchsia-300/18 bg-fuchsia-500/[0.08] text-fuchsia-100',
    edgeColor: 'rgba(244,114,182,0.26)',
    glowColor: 'rgba(244,114,182,0.13)',
    lineColor: 'rgba(244,114,182,0.58)',
  },
  {
    id: '04',
    title: 'Run an activation',
    audience: 'Venues and brands',
    emoji: '🏁',
    href: '/brands/portal',
    move: 'Pick venue • Set spend • Launch',
    accent: 'border-[#f5c518]/24 bg-[#f5c518]/[0.09] text-[#ffe27a]',
    edgeColor: 'rgba(192,132,252,0.3)',
    glowColor: 'rgba(168,85,247,0.16)',
    lineColor: 'rgba(192,132,252,0.62)',
  },
];

export default function FirstActionSelector() {
  return (
    <section className="relative z-30 mx-auto mt-10 w-full max-w-[980px] px-4 md:mt-12 md:px-0">
      <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(160deg,rgba(24,20,42,0.4),rgba(8,9,18,0.95))] px-4 py-5 shadow-[14px_18px_48px_rgba(0,0,0,0.36),-8px_-8px_20px_rgba(255,255,255,0.03),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl md:px-5 md:py-6">
        <div className="pointer-events-none absolute right-4 top-[-2px] z-20 hidden xl:block">
          <Image
            src="/assets/honey-drip.png"
            alt=""
            width={148}
            height={82}
            className="h-auto w-[118px] select-none opacity-[0.96] [filter:drop-shadow(0_14px_24px_rgba(0,0,0,0.38))_drop-shadow(0_6px_16px_rgba(232,183,38,0.16))]"
          />
        </div>

        <div className="mb-6 flex flex-col items-center">
          <div className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[#f5c518]/70">
            Four Ways In
          </div>
          <h2
            className="mt-3 font-black italic uppercase tracking-[0.2em] text-lg md:text-xl"
            style={{
              color: '#c084fc',
              textShadow:
                '0 0 10px rgba(168,85,247,0.6), 0 0 30px rgba(168,85,247,0.3), 0 0 60px rgba(168,85,247,0.15)',
            }}
          >
            Pick Your First Move
          </h2>
          <div className="bd-purple-pulse-line mt-3 h-px w-32" />
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          {ROLE_ROUTES.map((route) => (
            <div
              key={route.id}
              className="group relative overflow-hidden rounded-[28px] border bg-[linear-gradient(180deg,rgba(255,255,255,0.03)_0%,rgba(10,10,18,0.92)_16%,rgba(7,8,15,0.99)_100%)] p-4 transition duration-200 hover:-translate-y-[1px]"
              style={{
                borderColor: route.edgeColor,
                boxShadow: `0 16px 28px rgba(0,0,0,0.18), 0 0 24px ${route.glowColor}, inset 0 1px 0 rgba(255,255,255,0.06), inset 0 -12px 18px rgba(0,0,0,0.22)`,
              }}
            >
              <div
                className="pointer-events-none absolute inset-x-5 top-0 h-px"
                style={{ background: `linear-gradient(90deg, transparent, ${route.lineColor}, transparent)` }}
              />
              <div className="flex items-start justify-between gap-3">
                <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] ${route.accent}`}>
                  <span aria-hidden="true">{route.emoji}</span>
                  {route.audience}
                </div>
                <div className="flex items-center gap-2">
                  <div className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.22em] text-white/34 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                    {route.id}
                  </div>
                </div>
              </div>

              <div className="mt-3 text-[1.34rem] font-black leading-none text-white">
                {route.title}
              </div>

              <div className="mt-3 rounded-[22px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(5,6,12,0.78)_0%,rgba(10,10,16,0.98)_100%)] px-4 py-3 shadow-[inset_10px_10px_18px_rgba(0,0,0,0.36),inset_-4px_-4px_10px_rgba(255,255,255,0.02),inset_0_1px_0_rgba(255,255,255,0.04)]">
                <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/30">
                  First move
                </div>
                <div className="mt-1 text-[14px] font-semibold text-white/88">{route.move}</div>
              </div>

              <Link
                href={route.href}
                className="relative mt-3 inline-flex w-full items-center justify-between overflow-hidden rounded-[18px] border border-white/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.08)_0%,rgba(16,16,28,0.18)_100%)] px-4 py-3 text-[11px] font-black uppercase tracking-[0.18em] text-white/88 shadow-[0_12px_20px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.08),inset_0_-10px_14px_rgba(0,0,0,0.16)] transition hover:-translate-y-[1px] hover:border-white/20 hover:bg-[linear-gradient(180deg,rgba(255,255,255,0.1)_0%,rgba(16,16,28,0.24)_100%)]"
              >
                <span>Open route</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          ))}
        </div>

        <div className="mt-4 flex items-center justify-center">
          <Link
            href="/trust"
            className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/48 transition hover:text-[#f8dd72]"
          >
            Need trust details?
            <span className="text-white/72">How escrow works</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </section>
  );
}
