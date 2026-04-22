'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ArrowRight,
  Clock3,
  Shield,
  ShieldCheck,
  Sparkles,
  Users,
  Zap,
  Wallet,
} from 'lucide-react';
import GradualBlurOverlay from '@/components/GradualBlurOverlay';
import LiquidBackground from '@/components/LiquidBackground';

const raisedPanelClass =
  'relative overflow-hidden rounded-[30px] border border-white/[0.09] bg-[linear-gradient(180deg,rgba(255,255,255,0.07)_0%,rgba(255,255,255,0.025)_14%,rgba(10,9,18,0.9)_58%,rgba(7,6,14,0.96)_100%)] shadow-[0_28px_90px_rgba(0,0,0,0.4),0_0_28px_rgba(168,85,247,0.07),inset_0_1px_0_rgba(255,255,255,0.1),inset_0_-18px_24px_rgba(0,0,0,0.24)]';

const softCardClass =
  'relative overflow-hidden rounded-[26px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(255,255,255,0.06)_0%,rgba(255,255,255,0.02)_12%,rgba(10,10,18,0.92)_100%)] shadow-[0_18px_30px_rgba(0,0,0,0.22),inset_0_1px_0_rgba(255,255,255,0.08),inset_0_-12px_18px_rgba(0,0,0,0.22)]';

const insetDentClass =
  'bd-dent-surface bd-dent-surface--soft rounded-[20px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(4,5,10,0.72)_0%,rgba(11,11,18,0.92)_100%)]';

const TRUST_CARDS = [
  {
    title: 'Escrow stays reserved',
    body: 'When a dare is funded, the money is locked for that mission. It does not disappear just because the creator is still deciding or review is still happening.',
    icon: Shield,
    tone: 'text-[#f8dd72] border-[#f5c518]/20 bg-[#f5c518]/[0.08]',
  },
  {
    title: 'Proof gets checked',
    body: 'Submitted proof does not instantly trigger payout. It moves through review first, so fake, weak, or incomplete submissions can be stopped before settlement.',
    icon: ShieldCheck,
    tone: 'text-fuchsia-100 border-fuchsia-400/18 bg-fuchsia-500/[0.08]',
  },
  {
    title: 'Queued is not lost',
    body: 'If a dare says payout queued, it means approval is done and settlement is processing. The creator is through review. The worker still needs to clear the transaction.',
    icon: Wallet,
    tone: 'text-emerald-200 border-emerald-400/18 bg-emerald-500/[0.08]',
  },
  {
    title: 'Expired has a path',
    body: 'If nobody accepts, claims, or completes the dare in time, the protocol moves it toward the refund path instead of leaving money trapped forever.',
    icon: Clock3,
    tone: 'text-cyan-100 border-cyan-400/18 bg-cyan-500/[0.08]',
  },
];

const FLOW = [
  'Fund or target the dare',
  'Creator accepts or claims it',
  'Proof is submitted and reviewed',
  'Approved missions settle from escrow',
];

const PROTOCOL_CARDS = [
  {
    title: 'Atomic settlement',
    body: 'Every dare is a real onchain mission. Money is locked first, then released only after the protocol sees a valid completion path.',
    icon: Zap,
    tone: 'text-purple-300 border-purple-400/18 bg-purple-500/[0.08]',
  },
  {
    title: 'Verifiable truth',
    body: 'Proof is reviewed before payout. The point is not instant vibes. The point is making sure the mission actually happened before money moves.',
    icon: Shield,
    tone: 'text-cyan-100 border-cyan-400/18 bg-cyan-500/[0.08]',
  },
  {
    title: 'Social liquidity',
    body: 'Creators, venues, and brands build compounding trust through completions, first sparks, reviews, and place memory instead of empty clout.',
    icon: Users,
    tone: 'text-[#f8dd72] border-[#f5c518]/20 bg-[#f5c518]/[0.08]',
  },
];

export default function TrustPage() {
  const router = useRouter();

  return (
    <div className="relative min-h-screen overflow-hidden bg-transparent">
      <LiquidBackground />
      <div className="pointer-events-none fixed inset-0 z-10 hidden md:block">
        <GradualBlurOverlay />
      </div>

      <section className="relative z-20 mx-auto max-w-6xl px-6 pb-20 pt-24 md:pt-28">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.05] px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-white/72 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition hover:-translate-y-[1px] hover:border-white/22 hover:bg-white/[0.08] hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Go Back
          </button>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-full border border-fuchsia-400/20 bg-fuchsia-500/[0.08] px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-fuchsia-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition hover:-translate-y-[1px] hover:border-fuchsia-300/34 hover:bg-fuchsia-500/[0.12]"
            >
              Back To Grid
            </Link>
            <Link
              href="/faq"
              className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.05] px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-white/68 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition hover:-translate-y-[1px] hover:border-white/22 hover:bg-white/[0.08] hover:text-white"
            >
              FAQ
            </Link>
          </div>
        </div>

        <div className={`${raisedPanelClass} px-6 py-10 md:px-10 md:py-12`}>
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_0%,rgba(168,85,247,0.12),transparent_32%),radial-gradient(circle_at_88%_100%,rgba(34,211,238,0.1),transparent_36%),linear-gradient(180deg,rgba(255,255,255,0.05)_0%,transparent_32%,transparent_72%,rgba(0,0,0,0.24)_100%)]" />
          <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/26 to-transparent" />

          <div className="relative">
            <div className="inline-flex items-center gap-2 rounded-full border border-fuchsia-400/24 bg-fuchsia-500/[0.1] px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-fuchsia-100 shadow-[0_12px_24px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.12)]">
              <Shield className="h-4 w-4 text-fuchsia-300" />
              Trust & Protocol
            </div>

            <div className="mt-6 grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
              <div>
                <h1 className="text-4xl font-black uppercase italic tracking-tight text-white md:text-6xl">
                  BaseDare Runs On
                  <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-b from-[#ffe27a] to-[#c39106]">
                    Escrow, Review,
                  </span>
                  <br />
                  And Real Outcomes
                </h1>
                <p className="mt-5 max-w-2xl text-base leading-7 text-white/62 md:text-lg">
                  BaseDare is a dare economy, but the important part is not chaos for its own sake.
                  It is that funding, proof, payout, and place memory all follow a legible system
                  people can actually trust.
                </p>
              </div>

              <div className={`${insetDentClass} px-5 py-5`}>
                <div className="text-[11px] font-semibold uppercase tracking-[0.26em] text-white/34">
                  The short version
                </div>
                <div className="mt-3 space-y-3">
                  {FLOW.map((item, index) => (
                    <div key={item} className="flex items-center gap-3 text-sm text-white/76">
                      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] text-[11px] font-black text-white/56">
                        {index + 1}
                      </span>
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="relative z-20 mx-auto max-w-6xl px-6 pb-16">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-white/58 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
          <Sparkles className="h-4 w-4 text-[#f5c518]" />
          What BaseDare Is Really Doing
        </div>

        <div className="mb-6 grid gap-6 md:grid-cols-3">
          {PROTOCOL_CARDS.map((card) => {
            const Icon = card.icon;

            return (
              <div key={card.title} className={`${softCardClass} p-6`}>
                <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/18 to-transparent" />
                <div className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] shadow-[0_12px_20px_rgba(0,0,0,0.16),inset_0_1px_0_rgba(255,255,255,0.08)] ${card.tone}`}>
                  <Icon className="h-4 w-4" />
                  Protocol
                </div>
                <h2 className="mt-5 text-2xl font-black italic text-white">{card.title}</h2>
                <div className={`${insetDentClass} mt-5 px-4 py-4`}>
                  <p className="text-sm leading-6 text-white/68 md:text-[15px]">{card.body}</p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {TRUST_CARDS.map((card) => {
            const Icon = card.icon;

            return (
              <div key={card.title} className={`${softCardClass} p-6`}>
                <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/18 to-transparent" />
                <div className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] shadow-[0_12px_20px_rgba(0,0,0,0.16),inset_0_1px_0_rgba(255,255,255,0.08)] ${card.tone}`}>
                  <Icon className="h-4 w-4" />
                  Trust signal
                </div>
                <h2 className="mt-5 text-2xl font-black italic text-white">{card.title}</h2>
                <div className={`${insetDentClass} mt-5 px-4 py-4`}>
                  <p className="text-sm leading-6 text-white/68 md:text-[15px]">{card.body}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="relative z-20 mx-auto max-w-6xl px-6 pb-28">
        <div className={`${softCardClass} p-6 md:p-8`}>
          <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/18 to-transparent" />
          <div className="grid gap-6 lg:grid-cols-[1fr_0.8fr] lg:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-white/60 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                <Sparkles className="h-4 w-4 text-[#f5c518]" />
                Need the practical version?
              </div>
              <h2 className="mt-4 text-3xl font-black uppercase italic text-white">
                Follow The Surface
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-white/60 md:text-base">
                Dare pages now show the lifecycle, review timing, and payout state directly. Use
                this page when you want the full system logic without digging through status badges.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <button
                onClick={() => router.back()}
                className="inline-flex items-center justify-between rounded-[18px] border border-white/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.08)_0%,rgba(25,27,40,0.14)_100%)] px-5 py-4 text-sm font-black uppercase tracking-[0.14em] text-white shadow-[0_16px_28px_rgba(0,0,0,0.22),inset_0_1px_0_rgba(255,255,255,0.08)] transition hover:-translate-y-[1px] hover:border-white/22"
              >
                <span>Go back</span>
                <ArrowLeft className="h-4 w-4" />
              </button>
              <Link
                href="/create"
                className="inline-flex items-center justify-between rounded-[18px] border border-[#f5c518]/22 bg-[linear-gradient(180deg,rgba(245,197,24,0.14)_0%,rgba(74,52,6,0.14)_100%)] px-5 py-4 text-sm font-black uppercase tracking-[0.14em] text-[#fff1ba] shadow-[0_16px_28px_rgba(0,0,0,0.22),inset_0_1px_0_rgba(255,255,255,0.08)] transition hover:-translate-y-[1px] hover:border-[#f5c518]/36"
              >
                <span>Start a dare</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/faq"
                className="inline-flex items-center justify-between rounded-[18px] border border-white/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.08)_0%,rgba(25,27,40,0.14)_100%)] px-5 py-4 text-sm font-black uppercase tracking-[0.14em] text-white shadow-[0_16px_28px_rgba(0,0,0,0.22),inset_0_1px_0_rgba(255,255,255,0.08)] transition hover:-translate-y-[1px] hover:border-white/22"
              >
                <span>Read the FAQ</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
