import type { Metadata } from 'next';
import { ArrowRight, Coins, Radio, Sparkles, Users } from 'lucide-react';

import { OnboardingLink } from '@/components/onboarding/OnboardingLink';
import {
  controlHairline,
  controlInset,
  controlMicroLabel,
  controlPanel,
  controlSoftCard,
} from '@/components/control/tokens';

export const metadata: Metadata = {
  title: 'Create Something | BaseDare',
  description: 'Create a paid Dare, free Community Spark, or social Rally.',
  alternates: { canonical: '/start' },
};

const START_OPTIONS = [
  {
    title: 'Create a paid Dare',
    description: 'Set a useful real-world task, reward and proof rule before it goes live.',
    href: '/create?sparkType=paid&source=start',
    cta: 'Create the Dare',
    icon: Coins,
    accent: 'border-yellow-200/24 bg-yellow-300/[0.09] text-yellow-100',
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
    title: 'Start a Rally',
    description: 'Choose a place and time, set the crew size, then share the live plan.',
    href: '/community/rally/new',
    cta: 'Build the crew',
    icon: Users,
    accent: 'border-cyan-200/24 bg-cyan-300/[0.08] text-cyan-100',
  },
] as const;

export default function StartPage() {
  return (
    <main className="relative min-h-[calc(100svh-6rem)] overflow-hidden px-4 py-6 text-white sm:px-6 md:py-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_8%,rgba(34,211,238,0.12),transparent_32%),radial-gradient(circle_at_82%_12%,rgba(168,85,247,0.14),transparent_34%)]" />
      <div className="relative mx-auto flex min-h-[calc(100svh-9rem)] max-w-5xl flex-col justify-center md:min-h-[calc(100svh-10rem)]">
        <section className={`${controlPanel} px-6 py-8 text-center sm:px-10 md:py-10`}>
          <div className={controlHairline} />
          <p className={controlMicroLabel}>Create</p>
          <h1 className="mx-auto mt-3 max-w-3xl text-4xl font-black leading-[0.96] text-white sm:text-5xl">
            What do you want to put on the map?
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-sm font-semibold leading-6 text-white/55 sm:text-base">
            Paid Dare, free Spark or social Rally. Pick one lane and BaseDare keeps the rest out of the way.
          </p>
        </section>

        <section className="mt-5 grid gap-4 md:grid-cols-3" aria-label="Ways to start">
          {START_OPTIONS.map((option) => (
            <OnboardingLink
              key={option.title}
              href={option.href}
              intent="create"
              placement="path-card"
              className={`${controlSoftCard} group flex min-h-60 flex-col p-6 transition hover:-translate-y-0.5 hover:border-white/16`}
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

        <nav
          aria-label="Quick ways to explore BaseDare"
          className={`${controlInset} mx-auto mt-5 grid w-full max-w-xl grid-cols-2 gap-2 p-2`}
        >
          <OnboardingLink
            href="/map?source=start"
            intent="explore"
            placement="path-card"
            className="group inline-flex min-h-12 items-center justify-center gap-2 rounded-[16px] border border-yellow-200/14 bg-yellow-300/[0.06] px-3 text-[10px] font-black uppercase tracking-[0.12em] text-yellow-100 transition hover:border-yellow-200/28 hover:bg-yellow-300/[0.1]"
          >
            <Sparkles className="h-4 w-4 text-cyan-100" aria-hidden="true" />
            Ask PeeBear
          </OnboardingLink>
          <OnboardingLink
            href="/now"
            intent="explore"
            placement="path-card"
            className="group inline-flex min-h-12 items-center justify-center gap-2 rounded-[16px] border border-cyan-200/14 bg-cyan-300/[0.05] px-3 text-[10px] font-black uppercase tracking-[0.12em] text-cyan-50 transition hover:border-cyan-200/28 hover:bg-cyan-300/[0.09]"
          >
            <Radio className="h-4 w-4" aria-hidden="true" />
            <span className="sm:hidden">See what&apos;s on</span>
            <span className="hidden sm:inline">See what&apos;s happening now</span>
          </OnboardingLink>
        </nav>
      </div>
    </main>
  );
}
