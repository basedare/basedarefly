import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, BadgeCheck, MapPin, Sparkles, Star } from 'lucide-react';
import { controlPanel, controlInset } from '@/components/control/tokens';
import { getMarket } from '@/lib/markets';
import FoundingCreatorForm from '@/components/creators/FoundingCreatorForm';

export const metadata: Metadata = {
  title: 'Creator Sign Up — BaseDare',
  description:
    'Become a Founding Creator on BaseDare. Show up, post it, bring people, and get paid for verified arrivals. Put your scene on the map.',
  openGraph: {
    title: 'Become a Founding Creator — BaseDare',
    description:
      'Show up. Post it. Bring people. Get paid for verified arrivals. Put your scene on the map.',
    url: 'https://www.basedare.xyz/creators/signup',
    siteName: 'BaseDare',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Become a Founding Creator — BaseDare',
    description:
      'Show up. Post it. Bring people. Get paid for verified arrivals.',
  },
  alternates: { canonical: '/creators/signup' },
};

const PERKS = [
  {
    icon: BadgeCheck,
    title: 'Paid for verified arrivals',
    body: 'Not likes — real people who showed up because of you. Proven by QR + GPS, paid in USDC.',
  },
  {
    icon: MapPin,
    title: 'Put your scene on the map',
    body: 'Your dares become the signal others follow. You own the scene, not a feed.',
  },
  {
    icon: Star,
    title: 'First in line as we grow',
    body: 'Founding creators get early access and rank — reputation that compounds before anyone else arrives.',
  },
];

const STEPS = [
  'Claim your tag and tune your radar.',
  'Take a dare — show up and post it.',
  'We verify who came from you. You get paid.',
];

export default async function CreatorSignupPage({
  searchParams,
}: {
  searchParams: Promise<{ city?: string }>;
}) {
  const { city } = await searchParams;
  const market = getMarket(city);
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#030305] px-4 py-14 text-white sm:px-6 lg:py-20">
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(circle_at_1px_1px,rgba(185,127,255,0.1)_1px,transparent_0)] [background-size:112px_112px]" />
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(circle_at_14%_8%,rgba(255,213,74,0.12),transparent_34%),radial-gradient(circle_at_82%_8%,rgba(154,82,255,0.16),transparent_30%),linear-gradient(180deg,#05040a_0%,#07020f_48%,#000_100%)]" />

      <section className="relative z-10 mx-auto flex w-full max-w-3xl flex-col gap-8">
        {/* Hero */}
        <header className="text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-yellow-300/25 bg-yellow-300/[0.08] px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.22em] text-yellow-100">
            <Sparkles className="h-3.5 w-3.5" />
            {market ? `${market.name} · ${market.status}` : 'BaseDare · Founding Creators'}
          </span>
          <h1 className="mt-5 text-4xl font-black italic uppercase tracking-[-0.04em] text-white sm:text-5xl">
            Become a <span className="text-[#f5c518]">Founding Creator</span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base font-bold leading-7 text-white/64">
            Show up. Post it. Bring people. Get paid. You&apos;re not staff — you&apos;re the
            reason it happens.
          </p>
          {market && !market.live ? (
            <p className="mx-auto mt-3 max-w-md text-sm font-bold leading-6 text-emerald-200/80">
              {market.name} is scouting — claim your passport now and you&apos;re first in line when it opens.
            </p>
          ) : null}
          {market?.live ? (
            <p className="mx-auto mt-3 max-w-md text-sm font-bold leading-6 text-white/64">
              <span className="text-[#f5c518]">Founding cohort: {market.name}.</span> For creators who can start something real, not just post ads.
            </p>
          ) : null}
          <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a
              href="#join"
              className="inline-flex min-h-12 items-center gap-2 rounded-full border border-yellow-300/30 bg-yellow-300 px-7 text-sm font-black uppercase tracking-[0.16em] text-black transition hover:bg-yellow-200"
            >
              Join as a founding creator
              <ArrowRight className="h-4 w-4" />
            </a>
            <Link
              href="/map"
              className="inline-flex min-h-12 items-center gap-2 rounded-full border border-white/12 bg-white/[0.05] px-6 text-sm font-black uppercase tracking-[0.14em] text-white/72 transition hover:bg-white/[0.09] hover:text-white"
            >
              Explore the grid
            </Link>
          </div>
        </header>

        {/* Intake — the primary action; no wallet required */}
        <div id="join" className={`${controlPanel} scroll-mt-24 p-6 sm:p-7`}>
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#f5c518]/70">Join the list</p>
          <h2 className="mt-2 text-2xl font-black italic uppercase tracking-[-0.02em] text-white">
            Tell us who you are
          </h2>
          <p className="mt-1.5 text-sm font-bold leading-6 text-white/56">
            No wallet needed yet — this just gets you on the founding creator list.
          </p>
          <div className="mt-6">
            <FoundingCreatorForm defaultCity={market ? market.name : 'Siargao / General Luna'} />
          </div>
        </div>

        {/* Perks */}
        <div className="grid gap-3 sm:grid-cols-3">
          {PERKS.map((perk) => {
            const Icon = perk.icon;
            return (
              <div key={perk.title} className={`${controlInset} p-5`}>
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-yellow-300/24 bg-yellow-300/[0.1] text-[#f5c518]">
                  <Icon className="h-5 w-5" />
                </span>
                <h3 className="mt-3 text-sm font-black uppercase tracking-[0.04em] text-white">
                  {perk.title}
                </h3>
                <p className="mt-1.5 text-sm font-bold leading-6 text-white/56">{perk.body}</p>
              </div>
            );
          })}
        </div>

        {/* How it works */}
        <div className={`${controlPanel} p-6 sm:p-7`}>
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/40">How it works</p>
          <ol className="mt-4 flex flex-col gap-3">
            {STEPS.map((step, index) => (
              <li key={step} className="flex items-start gap-3">
                <span className="inline-flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border border-yellow-300/30 bg-yellow-300/[0.12] text-xs font-black text-[#f5c518]">
                  {index + 1}
                </span>
                <span className="pt-0.5 text-sm font-bold leading-6 text-white/74">{step}</span>
              </li>
            ))}
          </ol>
          <Link
            href="/creators/onboard"
            className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-full border border-yellow-300/30 bg-yellow-300 px-6 text-xs font-black uppercase tracking-[0.16em] text-black transition hover:bg-yellow-200"
          >
            Claim your tag
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <p className="text-center text-[11px] font-black uppercase tracking-[0.18em] text-white/40">
          Run a venue instead?{' '}
          <Link href="/first-spark" className="text-cyan-100/80 underline-offset-4 hover:underline">
            Light up your venue →
          </Link>
        </p>
      </section>
    </main>
  );
}
