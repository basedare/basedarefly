import type { Metadata } from 'next';
import { BASEDARE_INTRO } from '@/lib/product-copy';
import Link from 'next/link';
import HelpPageAnchor from '@/components/HelpPageAnchor';
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
  controlPanel,
  controlSoftCard,
} from '@/components/control/tokens';

export const metadata: Metadata = {
  title: 'How BaseDare Works',
  description: 'How to start a free adventure, join a meetup, share a photo or video, and take part in funded paid dares on BaseDare.',
  alternates: { canonical: '/how-it-works' },
};

const MAIN_STEPS = [
  {
    title: 'See what is happening',
    description: 'Open Now for nearby plans and ideas, or explore venues on the map.',
    icon: MapPin,
    accent: 'border-cyan-200/22 bg-cyan-300/[0.08] text-cyan-100',
  },
  {
    title: 'Choose your next move',
    description: 'Pick a free adventure, join a meetup or read the requirements for available paid work.',
    icon: Play,
    accent: 'border-violet-200/22 bg-violet-300/[0.08] text-violet-100',
  },
  {
    title: 'Take part',
    description: 'Follow the steps, invite a friend or coordinate with the group. Your next step stays within reach.',
    icon: Users,
    accent: 'border-emerald-200/22 bg-emerald-300/[0.08] text-emerald-100',
  },
] as const;

const DEEPER_PATHS = [
  {
    id: 'playing-for-fun', title: 'Start a free adventure', icon: Sparkles,
    body: 'Open Adventures from Now or the homepage. Choose an idea, press Start this adventure and tick off the steps at your own pace. Mark it finished to save it in your journal on this browser. No sign-in is needed to start. These self-guided ideas do not promise cash, a hosted event or a venue perk.',
    href: '/adventures', action: 'Choose an adventure',
  },
  {
    id: 'meeting-people', title: 'Meet people', icon: Users,
    body: 'Choose Start a meetup on Now, or Meet here on a map pin or venue page. Pick the place and time, sign in and publish your plan. Share its link or invite friends. Open Venue chat on a place’s page to talk nearby or within 24 hours of a confirmed check-in. Chat messages expire after 24 hours. Joining a meetup does not require filming. Check for any separate ticket, transport or venue cost.',
    href: '/community', action: 'Find people and meetups',
  },
  {
    id: 'starting-something', title: 'Share what you made', icon: Plus,
    body: 'After finishing an adventure, sharing is optional. Choose Share what you made, sign in, select a public place and submit a photo or short clip with a caption. Approved posts appear in discovery with a hashtag and a PeeBear pin. Starting or finishing privately does not publish a pin. Posting does not grant a venue advertising rights.',
    href: '/adventures?shared=public', action: 'See shared adventures',
  },
  {
    id: 'earning-from-a-dare', title: 'Earn from a paid dare', icon: CircleDollarSign,
    body: 'Open Earn and choose available funded work. Read the task, reward and reuse rules, request the assignment and wait for confirmation before starting. Submit the required work for review. Approval and payment are separate statuses in My Activity. Posting to your own audience is only required when the task says so. Availability depends on live funding; free adventures and ordinary check-ins do not pay cash.',
    href: '/earn', action: 'See available paid dares',
  },
  {
    id: 'venue-check-ins', title: 'Check in at a venue', icon: ShieldCheck,
    body: 'At enabled venues, scan the rotating QR displayed by staff with your phone camera, sign in and allow a fresh location check. Both the QR and nearby GPS are required for a verified visit. The map’s I’m here option is temporary presence, not a verified check-in. If venue check-in is unavailable, you can still meet up or share an update.',
    href: '/map', action: 'Explore places',
  },
  {
    id: 'funding-activity', title: 'Offer paid work', icon: BadgeCheck,
    body: 'Define the task, place, reward and evidence needed. Payment availability is checked before funding; a draft is not a live paid dare. Content creation, posting and advertising reuse must be agreed explicitly. Venue teams can request management access from the venue page. BaseCash venue credit and spend-local payment pilots have separate rules.',
    href: '/start', action: 'Choose what to create',
  },
] as const;

export default function HowItWorksPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bd-page-top px-4 pb-24 text-white sm:px-6">
      <HelpPageAnchor />
      <LiquidBackground />
      <div className="pointer-events-none fixed inset-0 z-10 hidden md:block"><GradualBlurOverlay /></div>
      <div className="pointer-events-none absolute inset-0 z-[1] bg-[radial-gradient(circle_at_14%_6%,rgba(34,211,238,0.12),transparent_30%),radial-gradient(circle_at_84%_16%,rgba(168,85,247,0.14),transparent_34%)]" />

      <div className="relative z-20 mx-auto max-w-6xl">
        <section className={`${controlPanel} px-6 py-10 text-center sm:px-10 md:py-14`}>
          <div className={controlHairline} />
          <p className="bd-page-kicker">How BaseDare works</p>
          <h1 className="bd-page-title mx-auto mt-4 max-w-4xl">
            Find your next move.<br /><span className="text-yellow-300">Go and do it.</span>
          </h1>
          <p className="bd-page-copy mx-auto mt-5 max-w-2xl">
            {BASEDARE_INTRO}
          </p>
          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href="/now" className="bd-action bd-action--gold min-h-12 px-6">
              See what’s happening now <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link href="/map?source=how-it-works" className="bd-action bd-action--cyan min-h-12 px-6">
              Open map
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

        <section className="mt-6 grid gap-4 md:grid-cols-2" aria-label="Ways to take part">
          {DEEPER_PATHS.map((path) => (
            <article key={path.id} id={path.id} className={`${controlSoftCard} scroll-mt-32 p-6 sm:p-8`}>
              <div className={controlHairline} />
              <h2 className="flex items-center gap-3 text-xl font-black text-white">
                <path.icon className="h-5 w-5 shrink-0 text-yellow-200" aria-hidden="true" />{path.title}
              </h2>
              <p className="mt-4 text-sm leading-7 text-white/70">{path.body}</p>
              <Link href={path.href} className="bd-action mt-5 inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-xs font-bold text-cyan-100">{path.action}<ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
            </article>
          ))}
        </section>

        <section className="mt-5 flex flex-col items-start gap-4 rounded-[1.6rem] border border-cyan-200/16 bg-cyan-300/[0.055] p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="flex gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-cyan-100" aria-hidden="true" />
            <div><h2 className="text-sm font-black text-white">Browse first. Verify when it matters.</h2><p className="mt-1 max-w-2xl text-xs leading-5 text-white/43">Free adventure progress is personal and self-reported. Public uploads are reviewed. Verified visits and paid work have additional checks; they are never implied by pressing Start.</p></div>
          </div>
          <Link href="/now?source=how-it-works-start" className="inline-flex shrink-0 items-center gap-2 rounded-full border border-cyan-200/20 bg-cyan-300/[0.08] px-4 py-2.5 text-[10px] font-black uppercase tracking-[0.14em] text-cyan-100">See live plans <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
        </section>
      </div>
    </main>
  );
}
