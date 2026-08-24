import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowRight,
  BadgeCheck,
  CircleDollarSign,
  MapPin,
  Play,
  Plus,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react';

import GradualBlurOverlay from '@/components/GradualBlurOverlay';
import LiquidBackground from '@/components/LiquidBackground';
import {
  controlHairline,
  controlInset,
  controlMicroLabel,
  controlPanel,
  controlSoftCard,
} from '@/components/control/tokens';

export const metadata: Metadata = {
  title: 'How BaseDare Works',
  description: 'See what is happening, join with one clear action, and go together in the real world.',
  alternates: { canonical: '/how-it-works' },
};

const MAIN_STEPS = [
  {
    title: 'See what is happening',
    description: 'Open NOW for live plans or use the map to explore places around you.',
    icon: MapPin,
    accent: 'border-cyan-200/22 bg-cyan-300/[0.08] text-cyan-100',
  },
  {
    title: 'Join with one tap',
    description: 'Choose one plan. The main button tells you exactly what to do next.',
    icon: Play,
    accent: 'border-violet-200/22 bg-violet-300/[0.08] text-violet-100',
  },
  {
    title: 'Go together',
    description: 'Your joined activity stays in My Next Move so the plan is easy to reopen and share.',
    icon: Users,
    accent: 'border-emerald-200/22 bg-emerald-300/[0.08] text-emerald-100',
  },
] as const;

const ACTIONS = [
  ['Join crew', 'A group is filling up.'],
  ["I'm in", 'You are joining a social Rally.'],
  ['Going', 'You are attending an event.'],
  ['Play', 'It is a free Community Spark.'],
  ['Claim', 'It is a paid Dare with proof rules.'],
  ['Meet here', 'Turn a place into a shared plan.'],
] as const;

const DEEPER_PATHS = [
  {
    title: 'Playing for fun',
    body: 'Choose a free Spark or social plan. Keep it safe, public and within your ability. Some activities invite a short photo or clip, but fun is the point.',
    icon: Sparkles,
  },
  {
    title: 'Starting something',
    body: 'Pick Rally, Spark or paid Dare. BaseDare asks only for the place, time, people and rules that format actually needs.',
    icon: Plus,
  },
  {
    title: 'Earning from a Dare',
    body: 'Paid Dares lock the task, reward and proof rule before anyone claims them. Approved evidence creates a receipt and can release the reward.',
    icon: CircleDollarSign,
  },
  {
    title: 'Funding useful activity',
    body: 'Places, sponsors and communities can fund one bounded real-world question. BaseDare verifies the result and attaches the receipt to the place.',
    icon: BadgeCheck,
  },
] as const;

export default function HowItWorksPage() {
  return (
    <main className="relative min-h-screen overflow-hidden px-4 pb-24 pt-8 text-white sm:px-6 md:pt-12">
      <LiquidBackground />
      <div className="pointer-events-none fixed inset-0 z-10 hidden md:block"><GradualBlurOverlay /></div>
      <div className="pointer-events-none absolute inset-0 z-[1] bg-[radial-gradient(circle_at_14%_6%,rgba(34,211,238,0.12),transparent_30%),radial-gradient(circle_at_84%_16%,rgba(168,85,247,0.14),transparent_34%)]" />

      <div className="relative z-20 mx-auto max-w-6xl">
        <section className={`${controlPanel} px-6 py-10 text-center sm:px-10 md:py-14`}>
          <div className={controlHairline} />
          <p className={controlMicroLabel}>How BaseDare works</p>
          <h1 className="mx-auto mt-4 max-w-4xl text-4xl font-black leading-[0.96] sm:text-6xl md:text-7xl">
            See what&apos;s happening.<br /><span className="text-yellow-300">Join in. Go together.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base font-semibold leading-7 text-white/58 md:text-lg">
            The map is the feed. Every useful action stays attached to a real place and time.
          </p>
          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href="/now" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-yellow-300 px-6 text-[11px] font-black uppercase tracking-[0.15em] text-black transition hover:bg-yellow-200">
              See what is happening <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link href="/map?source=how-it-works" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-white/12 bg-white/[0.045] px-6 text-[11px] font-black uppercase tracking-[0.15em] text-white/70 transition hover:border-white/22 hover:text-white">
              Explore the map
            </Link>
          </div>
        </section>

        <section className="mt-5 grid gap-4 md:grid-cols-3" aria-label="BaseDare in three steps">
          {MAIN_STEPS.map((step, index) => (
            <article key={step.title} className={`${controlSoftCard} p-6`}>
              <div className={controlHairline} />
              <div className="flex items-center justify-between gap-3">
                <span className={`grid h-11 w-11 place-items-center rounded-2xl border ${step.accent}`}><step.icon className="h-5 w-5" aria-hidden="true" /></span>
                <span className="text-xs font-black text-white/22">0{index + 1}</span>
              </div>
              <h2 className="mt-5 text-xl font-black text-white">{step.title}</h2>
              <p className="mt-3 text-sm font-semibold leading-6 text-white/48">{step.description}</p>
            </article>
          ))}
        </section>

        <section className={`${controlPanel} mt-5 p-6 sm:p-8`} aria-labelledby="buttons-mean">
          <div className={controlHairline} />
          <p className={controlMicroLabel}>One interaction model</p>
          <h2 id="buttons-mean" className="mt-3 text-2xl font-black text-white sm:text-3xl">Different words. The same clear decision.</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-white/45">The wording changes because boats, events and paid Dares have different rules underneath. You still get one main action.</p>
          <div className="mt-6 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {ACTIONS.map(([label, meaning]) => (
              <div key={label} className={`${controlInset} flex items-center gap-3 p-4`}>
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-yellow-300 text-black"><ArrowRight className="h-4 w-4" aria-hidden="true" /></span>
                <span><strong className="block text-sm text-white">{label}</strong><span className="mt-1 block text-xs text-white/40">{meaning}</span></span>
              </div>
            ))}
          </div>
        </section>

        <section className={`${controlPanel} mt-5 p-6 sm:p-8`} aria-labelledby="details-if-needed">
          <div className={controlHairline} />
          <p className={controlMicroLabel}>Only if you need it</p>
          <h2 id="details-if-needed" className="mt-3 text-2xl font-black text-white sm:text-3xl">Choose the part you care about.</h2>
          <div className="mt-6 space-y-2">
            {DEEPER_PATHS.map((path) => (
              <details key={path.title} className="group rounded-2xl border border-white/9 bg-black/24 px-5 py-4">
                <summary className="flex cursor-pointer list-none items-center gap-3 font-black text-white/78">
                  <path.icon className="h-4 w-4 shrink-0 text-yellow-200" aria-hidden="true" />
                  <span className="flex-1">{path.title}</span>
                  <Plus className="h-4 w-4 text-white/35 transition group-open:rotate-45" aria-hidden="true" />
                </summary>
                <p className="mt-3 pl-7 text-sm leading-6 text-white/46">{path.body}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="mt-5 flex flex-col items-start gap-4 rounded-[1.6rem] border border-cyan-200/16 bg-cyan-300/[0.055] p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="flex gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-cyan-100" aria-hidden="true" />
            <div><h2 className="text-sm font-black text-white">Browse first. Trust increases only when needed.</h2><p className="mt-1 max-w-2xl text-xs leading-5 text-white/43">Free plans stay lightweight. Paid or proof-backed actions can ask for identity, location, media or a venue handshake because a real receipt depends on it.</p></div>
          </div>
          <Link href="/now?source=how-it-works-start" className="inline-flex shrink-0 items-center gap-2 rounded-full border border-cyan-200/20 bg-cyan-300/[0.08] px-4 py-2.5 text-[10px] font-black uppercase tracking-[0.14em] text-cyan-100">See live plans <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
        </section>
      </div>
    </main>
  );
}
