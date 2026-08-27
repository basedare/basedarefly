import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Coins, Map, Radio, Sparkles, Users } from 'lucide-react';

import { OnboardingLink } from '@/components/onboarding/OnboardingLink';
import {
  controlHairline,
  controlInset,
  controlMicroLabel,
  controlPanel,
  controlSoftCard,
} from '@/components/control/tokens';

export const metadata: Metadata = {
  title: 'Start Here | BaseDare',
  description: 'See what is happening, explore the map, or start something with people nearby.',
  alternates: { canonical: '/join' },
};

const START_PATHS = [
  {
    title: 'Do something now',
    description: 'See boats, meetups, events, free Sparks and paid Dares in one place.',
    href: '/now',
    intent: 'join' as const,
    cta: 'See live plans',
    icon: Radio,
    accent: 'border-cyan-300/24 bg-cyan-400/[0.08] text-cyan-100',
  },
  {
    title: 'Explore places',
    description: 'Free-roam the map and open anything that looks interesting.',
    href: '/map?source=join',
    intent: 'explore' as const,
    cta: 'Open the map',
    icon: Map,
    accent: 'border-violet-300/24 bg-violet-400/[0.08] text-violet-100',
  },
  {
    title: 'Start something',
    description: 'Create a Rally, free Spark or paid Dare without learning every tool first.',
    href: '/start',
    intent: 'create' as const,
    cta: 'Choose what to start',
    icon: Sparkles,
    accent: 'border-yellow-300/24 bg-yellow-400/[0.09] text-yellow-100',
  },
] as const;

const STEPS = [
  { title: 'See', detail: 'Find one real thing happening.' },
  { title: 'Join', detail: 'Tap the single main action.' },
  { title: 'Go', detail: 'Reopen it from My Next Move.' },
] as const;

export default function JoinBaseDarePage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-transparent px-4 pb-24 pt-8 sm:px-6 md:pt-12">
      <div className="relative z-20 mx-auto max-w-6xl">
        <section className={`${controlPanel} px-6 py-10 text-center sm:px-10 md:py-14`}>
          <div className={controlHairline} />
          <p className={controlMicroLabel}>Start here</p>
          <h1 className="mx-auto mt-4 max-w-4xl text-4xl font-black leading-[0.96] text-white sm:text-6xl md:text-7xl">
            What do you want to do?
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base font-semibold leading-7 text-white/60 md:text-lg">
            You do not need to understand BaseDare first. Pick one next move.
          </p>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-white/40">
            Browse freely. Sign in only when joining, creating, saving progress or getting paid requires it.
          </p>
        </section>

        <section className="mt-5 grid gap-4 md:grid-cols-3" aria-label="Choose your next move">
          {START_PATHS.map((path) => (
            <OnboardingLink
              key={path.title}
              href={path.href}
              intent={path.intent}
              placement="path-card"
              className={`${controlSoftCard} group flex min-h-64 flex-col p-6 transition hover:-translate-y-0.5 hover:border-white/16`}
            >
              <div className={controlHairline} />
              <span className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl border ${path.accent}`}>
                <path.icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <h2 className="mt-5 text-2xl font-black text-white">{path.title}</h2>
              <p className="mt-3 text-sm font-semibold leading-6 text-white/52">{path.description}</p>
              <span className="mt-auto inline-flex items-center gap-2 pt-7 text-[10px] font-black uppercase tracking-[0.15em] text-yellow-100">
                {path.cta}<ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
              </span>
            </OnboardingLink>
          ))}
        </section>

        <section className={`${controlPanel} mt-5 p-6 sm:p-8`} aria-labelledby="three-moves">
          <div className={controlHairline} />
          <h2 id="three-moves" className="text-xl font-black text-white sm:text-2xl">Three moves. That is the whole loop.</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {STEPS.map((step, index) => (
              <div key={step.title} className={`${controlInset} flex items-start gap-3 p-4`}>
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-yellow-300 text-xs font-black text-black">{index + 1}</span>
                <span><strong className="block text-sm text-white">{step.title}</strong><span className="mt-1 block text-xs leading-5 text-white/42">{step.detail}</span></span>
              </div>
            ))}
          </div>

          <details className="mt-4 rounded-2xl border border-white/9 bg-black/24 px-5 py-4 text-sm text-white/52">
            <summary className="cursor-pointer list-none font-black text-white/72">What are Sparks and Dares?</summary>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <p className="flex gap-3"><Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-emerald-200" /><span><strong className="text-white">Spark:</strong> a free community challenge.</span></p>
              <p className="flex gap-3"><Coins className="mt-0.5 h-4 w-4 shrink-0 text-yellow-200" /><span><strong className="text-white">Dare:</strong> a task that can carry a reward.</span></p>
              <p className="flex gap-3 sm:col-span-2"><Users className="mt-0.5 h-4 w-4 shrink-0 text-cyan-200" /><span><strong className="text-white">Rally:</strong> a time-bound social plan that needs people.</span></p>
            </div>
          </details>

          <div className="mt-5 text-center">
            <Link href="/how-it-works" className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.15em] text-white/48 hover:text-white">More about BaseDare <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
          </div>
        </section>
      </div>
    </main>
  );
}
