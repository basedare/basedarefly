import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Coins, Sparkles, Users } from 'lucide-react';

import { OnboardingLink } from '@/components/onboarding/OnboardingLink';
import {
  controlHairline,
  controlMicroLabel,
  controlPanel,
  controlSoftCard,
} from '@/components/control/tokens';

export const metadata: Metadata = {
  title: 'Start Something | BaseDare',
  description: 'Start a social Rally, create a free Community Spark, or fund a paid Dare.',
  alternates: { canonical: '/start' },
};

const START_OPTIONS = [
  {
    title: 'Start a Rally',
    description: 'Choose a place and time, set the crew size, then share the live plan.',
    href: '/community/rally/new',
    cta: 'Build the crew',
    icon: Users,
    accent: 'border-cyan-200/24 bg-cyan-300/[0.08] text-cyan-100',
  },
  {
    title: 'Create a free Spark',
    description: 'Give people one short, fun activity they can play at a real place.',
    href: '/create?sparkType=community&source=start',
    cta: 'Make it playable',
    icon: Sparkles,
    accent: 'border-emerald-200/24 bg-emerald-300/[0.08] text-emerald-100',
  },
  {
    title: 'Fund a paid Dare',
    description: 'Set a useful real-world task, reward and proof rule before it goes live.',
    href: '/create?sparkType=paid&source=start',
    cta: 'Set the reward',
    icon: Coins,
    accent: 'border-yellow-200/24 bg-yellow-300/[0.09] text-yellow-100',
  },
] as const;

export default function StartPage() {
  return (
    <main className="relative min-h-screen overflow-hidden px-4 pb-24 pt-8 text-white sm:px-6 md:pt-12">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_8%,rgba(34,211,238,0.12),transparent_32%),radial-gradient(circle_at_82%_12%,rgba(168,85,247,0.14),transparent_34%)]" />
      <div className="relative mx-auto max-w-5xl">
        <section className={`${controlPanel} px-6 py-10 text-center sm:px-10 md:py-14`}>
          <div className={controlHairline} />
          <p className={controlMicroLabel}>Start something</p>
          <h1 className="mx-auto mt-4 max-w-3xl text-4xl font-black leading-[0.96] text-white sm:text-6xl">
            What do you want to put on the map?
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-sm font-semibold leading-6 text-white/55 sm:text-base">
            Social plan, free challenge or paid mission. Pick one lane and BaseDare keeps the rest out of the way.
          </p>
        </section>

        <section className="mt-5 grid gap-4 md:grid-cols-3" aria-label="Ways to start">
          {START_OPTIONS.map((option) => (
            <OnboardingLink
              key={option.title}
              href={option.href}
              intent="create"
              placement="path-card"
              className={`${controlSoftCard} group flex min-h-64 flex-col p-6 transition hover:-translate-y-0.5 hover:border-white/16`}
            >
              <div className={controlHairline} />
              <span className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl border ${option.accent}`}>
                <option.icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <h2 className="mt-5 text-2xl font-black text-white">{option.title}</h2>
              <p className="mt-3 text-sm font-semibold leading-6 text-white/52">{option.description}</p>
              <span className="mt-auto inline-flex items-center gap-2 pt-7 text-[10px] font-black uppercase tracking-[0.15em] text-yellow-100">
                {option.cta}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
              </span>
            </OnboardingLink>
          ))}
        </section>

        <p className="mt-6 text-center text-xs font-semibold text-white/36">
          Looking for something instead? <Link href="/now" className="text-cyan-100 underline decoration-cyan-200/25 underline-offset-4">See what is happening now.</Link>
        </p>
      </div>
    </main>
  );
}
