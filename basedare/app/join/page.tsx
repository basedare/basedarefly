import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowRight,
  BadgeCheck,
  Coins,
  Fingerprint,
  MapPin,
  Plus,
  Sparkles,
  UserRound,
  Users,
} from 'lucide-react';

import GradualBlurOverlay from '@/components/GradualBlurOverlay';
import LiquidBackground from '@/components/LiquidBackground';
import { OnboardingLink } from '@/components/onboarding/OnboardingLink';
import {
  controlHairline,
  controlInset,
  controlMicroLabel,
  controlPanel,
  controlSoftCard,
} from '@/components/control/tokens';

export const metadata: Metadata = {
  title: 'Join BaseDare — Explore, Play, Meet & Earn',
  description:
    'Open the map, discover real places, join local challenges, meet people and sometimes earn rewards.',
  alternates: { canonical: '/join' },
};

const START_PATHS = [
  {
    title: 'Explore nearby',
    description: 'See interesting places, live activity and challenges around you.',
    href: '/map',
    intent: 'explore',
    cta: 'Open the map',
    icon: MapPin,
    accent: 'border-cyan-300/25 bg-cyan-400/[0.08] text-cyan-100',
  },
  {
    title: 'Join the fun',
    description: 'Pick a free Spark, a social activity, a route or a rewarded Dare.',
    href: '/map',
    intent: 'join',
    cta: 'Find something to do',
    icon: Users,
    accent: 'border-fuchsia-300/25 bg-fuchsia-400/[0.08] text-fuchsia-100',
  },
  {
    title: 'Create a challenge',
    description: 'Start a free community activity or fund a reward for someone nearby.',
    href: '/create',
    intent: 'create',
    cta: 'Create something',
    icon: Plus,
    accent: 'border-yellow-300/25 bg-yellow-400/[0.09] text-yellow-100',
  },
  {
    title: 'Build your profile',
    description: 'Keep your points, receipts, completed challenges and local reputation together.',
    href: '/dashboard',
    intent: 'profile',
    cta: 'See my profile',
    icon: UserRound,
    accent: 'border-emerald-300/25 bg-emerald-400/[0.08] text-emerald-100',
  },
] as const;

const WORDS = [
  {
    word: 'Spark',
    meaning: 'A free community challenge or verified mark left at a real place.',
    icon: Sparkles,
  },
  {
    word: 'Dare',
    meaning: 'A challenge that may include points, reputation or a money reward.',
    icon: Coins,
  },
  {
    word: 'Pulse',
    meaning: 'A quick read on how active and recently verified a place feels.',
    icon: BadgeCheck,
  },
  {
    word: 'BareTag',
    meaning: 'An optional public handle that carries your reputation and receipts. You don’t need one to explore or complete open paid missions; some identity-based social features may ask for one.',
    icon: Fingerprint,
  },
] as const;

export default function JoinBaseDarePage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-transparent px-4 pb-24 pt-28 sm:px-6 md:pt-32">
      <LiquidBackground />
      <div className="pointer-events-none fixed inset-0 z-10 hidden md:block">
        <GradualBlurOverlay />
      </div>
      <div className="pointer-events-none absolute inset-0 z-[1]">
        <div className="absolute left-[-8rem] top-20 h-80 w-80 rounded-full bg-purple-500/16 blur-[120px]" />
        <div className="absolute right-[-8rem] top-52 h-80 w-80 rounded-full bg-cyan-400/10 blur-[120px]" />
        <div className="absolute bottom-0 left-1/2 h-80 w-[34rem] -translate-x-1/2 rounded-full bg-yellow-400/[0.08] blur-[140px]" />
      </div>

      <div className="relative z-20 mx-auto max-w-6xl">
        <section className={`${controlPanel} px-6 py-10 text-center sm:px-10 md:py-14`}>
          <div className={controlHairline} />
          <p className="text-[10px] font-black uppercase tracking-[0.26em] text-yellow-200/72">
            Start here
          </p>
          <h1 className="mx-auto mt-4 max-w-4xl text-4xl font-black italic tracking-[-0.045em] text-white sm:text-5xl md:text-7xl">
            THE MAP IS MORE FUN
            <span className="block text-[#f5c518]">WHEN YOU JOIN IN.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base font-semibold leading-7 text-white/68 md:text-lg">
            Discover real places, find things to do, join local challenges, meet people and sometimes earn rewards.
          </p>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-white/42">
            You can explore without a wallet. Sign in only when you want to join, create, save progress or get paid.
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <OnboardingLink
              href="/map"
              intent="explore"
              placement="hero"
              cosmic={{ variant: 'gold', size: 'lg' }}
            >
              <MapPin className="h-5 w-5" />
              Open the map
            </OnboardingLink>
            <OnboardingLink
              href="/how-it-works"
              intent="learn"
              placement="hero"
              className="inline-flex min-h-12 w-full items-center justify-center rounded-2xl border border-white/12 bg-white/[0.05] px-6 text-sm font-black text-white/78 transition hover:border-white/22 hover:text-white sm:w-auto"
            >
              How it works
            </OnboardingLink>
          </div>
        </section>

        <section className="mt-6 grid gap-4 sm:grid-cols-2">
          {START_PATHS.map((path) => (
            <OnboardingLink
              key={path.title}
              href={path.href}
              intent={path.intent}
              placement="path-card"
              className={`${controlSoftCard} group flex min-h-[220px] flex-col p-6 transition hover:-translate-y-0.5 hover:border-white/16`}
            >
              <div className={controlHairline} />
              <span className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl border ${path.accent}`}>
                <path.icon className="h-5 w-5" />
              </span>
              <h2 className="mt-5 text-2xl font-black italic tracking-[-0.025em] text-white">
                {path.title}
              </h2>
              <p className="mt-2 max-w-md text-sm font-semibold leading-6 text-white/56">
                {path.description}
              </p>
              <span className="mt-auto inline-flex items-center gap-2 pt-6 text-[11px] font-black uppercase tracking-[0.16em] text-yellow-200/88">
                {path.cta}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </span>
            </OnboardingLink>
          ))}
        </section>

        <section className={`${controlPanel} mt-6 p-6 sm:p-8`}>
          <div className={controlHairline} />
          <p className={controlMicroLabel}>A few useful words</p>
          <h2 className="mt-3 text-2xl font-black italic text-white sm:text-3xl">
            BaseDare without the jargon
          </h2>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {WORDS.map((item) => (
              <div key={item.word} className={`${controlInset} p-5`}>
                <div className="flex items-center gap-3">
                  <item.icon className="h-5 w-5 text-yellow-300" />
                  <h3 className="text-base font-black text-white">{item.word}</h3>
                </div>
                <p className="mt-3 text-sm leading-6 text-white/52">{item.meaning}</p>
              </div>
            ))}
          </div>

          <div className="mt-5 flex flex-col items-start justify-between gap-3 rounded-2xl border border-yellow-200/18 bg-yellow-400/[0.06] px-5 py-4 sm:flex-row sm:items-center">
            <p className="max-w-xl text-sm font-semibold leading-6 text-white/64">
              Optional: claim a <span className="text-white">BareTag</span> when you want a public identity that carries your reputation and receipts. You don’t need one to explore or complete open paid missions; some identity-based social features may ask for one.
            </p>
            <Link
              href="/claim-tag"
              className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-yellow-200/35 bg-yellow-400/[0.1] px-4 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-yellow-100 transition hover:border-yellow-200/55 hover:text-white"
            >
              Secure your BareTag
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
