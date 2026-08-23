import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, BriefcaseBusiness, CheckCircle2, WalletCards } from 'lucide-react';

import GradualBlurOverlay from '@/components/GradualBlurOverlay';
import LiquidBackground from '@/components/LiquidBackground';
import { CreatorMissionCard } from '@/components/creators/CreatorMissionCard';
import {
  controlHairline,
  controlInset,
  controlMicroLabel,
  controlPanel,
} from '@/components/control/tokens';
import { getCreatorMissions } from '@/lib/creator-missions-server';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Paid Creator Missions | BaseDare',
  description: 'Pick a real-world brief, make the content, submit your work, and get paid when approved.',
  alternates: { canonical: '/earn' },
};

const LOOP = [
  ['1', 'Pick a brief'],
  ['2', 'Make the content'],
  ['3', 'Get paid when approved'],
] as const;

export default async function EarnPage() {
  const missions = await getCreatorMissions();

  return (
    <main className="relative min-h-screen overflow-hidden bg-transparent px-4 pb-24 pt-7 text-white sm:px-6 md:pt-11">
      <LiquidBackground performanceMode="quiet" veilOpacity={0.72} />
      <div className="pointer-events-none fixed inset-0 z-10 hidden md:block"><GradualBlurOverlay /></div>
      <div className="pointer-events-none absolute inset-0 z-[1] bg-[radial-gradient(circle_at_16%_8%,rgba(34,211,238,0.1),transparent_31%),radial-gradient(circle_at_84%_12%,rgba(250,204,21,0.1),transparent_34%)]" />

      <div className="relative z-20 mx-auto max-w-6xl">
        <section className={`${controlPanel} px-6 py-9 sm:px-10 md:py-11`}>
          <div className={controlHairline} />
          <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <p className={`${controlMicroLabel} text-cyan-100/62`}>Paid creator missions</p>
              <h1 className="mt-3 max-w-4xl text-4xl font-black leading-[0.96] text-white sm:text-6xl">
                Pick a brief. Make it. Get paid.
              </h1>
              <p className="mt-4 max-w-2xl text-sm font-semibold leading-6 text-white/55 sm:text-base">
                See the work and payout first. Sign in only when you want to accept a mission.
              </p>
            </div>
            <Link
              href="/missions"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-white/12 bg-white/[0.04] px-5 text-[10px] font-black uppercase tracking-[0.15em] text-white/72 transition hover:border-white/24 hover:text-white"
            >
              <BriefcaseBusiness className="h-4 w-4 text-yellow-200" aria-hidden="true" />
              My missions
            </Link>
          </div>

          <div className="mt-7 grid gap-2 sm:grid-cols-3">
            {LOOP.map(([number, label]) => (
              <div key={number} className={`${controlInset} flex items-center gap-3 px-4 py-3`}>
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-yellow-300 text-xs font-black text-black">{number}</span>
                <span className="text-sm font-black text-white/78">{label}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-7" aria-labelledby="open-creator-missions">
          <div className="mb-4 flex items-end justify-between gap-4 px-1">
            <div>
              <p className={controlMicroLabel}>Available now</p>
              <h2 id="open-creator-missions" className="mt-1 text-2xl font-black text-white">
                {missions.length === 1 ? '1 open mission' : `${missions.length} open missions`}
              </h2>
            </div>
            <span className="hidden text-xs font-semibold text-white/35 sm:block">Real rewards only · no sample jobs</span>
          </div>

          {missions.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {missions.map((mission) => <CreatorMissionCard key={mission.id} mission={mission} />)}
            </div>
          ) : (
            <div className={`${controlPanel} px-6 py-10 text-center sm:px-10`}>
              <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-200" aria-hidden="true" />
              <h2 className="mt-4 text-2xl font-black text-white">No open creator missions right now</h2>
              <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-white/48">
                BaseDare does not show fake jobs to make the page look busy. Check back after the next funded brief goes live.
              </p>
              <div className="mt-5 flex flex-col justify-center gap-3 sm:flex-row">
                <Link
                  href="/creators/signup"
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-yellow-200/18 bg-yellow-300/[0.07] px-5 text-[10px] font-black uppercase tracking-[0.14em] text-yellow-100"
                >
                  Join the creator list <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
                <Link
                  href="/now"
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-cyan-200/16 bg-cyan-300/[0.05] px-5 text-[10px] font-black uppercase tracking-[0.14em] text-cyan-50"
                >
                  See what&apos;s happening
                </Link>
              </div>
            </div>
          )}
        </section>

        <section className="mx-auto mt-8 flex max-w-3xl items-start gap-3 rounded-[22px] border border-white/8 bg-black/24 px-5 py-4 text-xs leading-5 text-white/42">
          <WalletCards className="mt-0.5 h-4 w-4 shrink-0 text-violet-200" aria-hidden="true" />
          <p>A creator profile builds after real work. It does not block you from seeing a brief or requesting an open mission.</p>
        </section>
      </div>
    </main>
  );
}
