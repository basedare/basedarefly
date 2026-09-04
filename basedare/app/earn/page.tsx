import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, BriefcaseBusiness, CheckCircle2, Plus, Radio } from 'lucide-react';

import GradualBlurOverlay from '@/components/GradualBlurOverlay';
import LiquidBackground from '@/components/LiquidBackground';
import { MissionAlertForm } from '@/components/creator-entry/MissionAlertForm';
import { CreatorMissionCard } from '@/components/creators/CreatorMissionCard';
import {
  controlHairline,
  controlInset,
  controlMicroLabel,
  controlPanel,
} from '@/components/control/tokens';
import { getCreatorMissions } from '@/lib/creator-missions-server';
import { getMarket } from '@/lib/markets';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Paid Missions | BaseDare',
  description: 'Pick a real-world mission, do the work, submit it, and get paid when your work is approved.',
  alternates: { canonical: '/earn' },
};

const LOOP = [
  ['1', 'Pick'],
  ['2', 'Do the work'],
  ['3', 'Submit'],
  ['4', 'Get paid'],
] as const;

export default async function EarnPage({
  searchParams,
}: {
  searchParams: Promise<{ alerts?: string; city?: string }>;
}) {
  const { alerts, city } = await searchParams;
  const missions = await getCreatorMissions();
  const missionAlertCity = getMarket(city)?.name ?? city;
  const showAlerts = missions.length === 0 || alerts === '1';
  const alertsQuery = new URLSearchParams({ alerts: '1' });
  if (city) alertsQuery.set('city', city);

  return (
    <main className="relative min-h-screen overflow-hidden bg-transparent px-4 pb-24 pt-7 text-white sm:px-6 md:pt-11">
      <LiquidBackground performanceMode="quiet" veilOpacity={0.72} />
      <div className="pointer-events-none fixed inset-0 z-10 hidden md:block"><GradualBlurOverlay /></div>
      <div className="pointer-events-none absolute inset-0 z-[1] bg-[radial-gradient(circle_at_16%_8%,rgba(34,211,238,0.1),transparent_31%),radial-gradient(circle_at_84%_12%,rgba(250,204,21,0.1),transparent_34%)]" />

      <div className="relative z-20 mx-auto max-w-6xl">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 px-1">
          <Link
            href="/map"
            className="inline-flex min-h-10 items-center gap-2 rounded-full border border-white/10 bg-black/24 px-4 text-[10px] font-black uppercase tracking-[0.14em] text-white/58 transition hover:border-white/20 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to map
          </Link>
          <Link
            href="/create"
            className="inline-flex min-h-10 items-center gap-2 rounded-full border border-yellow-200/18 bg-yellow-300/[0.07] px-4 text-[10px] font-black uppercase tracking-[0.14em] text-yellow-100 transition hover:bg-yellow-300/[0.12]"
          >
            <Plus className="h-4 w-4" aria-hidden="true" /> Create a paid mission
          </Link>
        </div>
        <section className={`${controlPanel} px-6 py-9 sm:px-10 md:py-11`}>
          <div className={controlHairline} />
          <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <p className={`${controlMicroLabel} text-cyan-100/62`}>Paid missions</p>
              <h1 className="mt-3 max-w-4xl text-4xl font-black leading-[0.96] text-white sm:text-6xl">
                Pick a mission. Make it real. Get paid.
              </h1>
              <p className="mt-4 max-w-2xl text-sm font-semibold leading-6 text-white/55 sm:text-base">
                Check a place, capture a moment, or create something for a venue or brand. Once your work is approved, you get paid.
              </p>
            </div>
            <Link
              href="/action-center"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-white/12 bg-white/[0.04] px-5 text-[10px] font-black uppercase tracking-[0.15em] text-white/72 transition hover:border-white/24 hover:text-white"
            >
              <BriefcaseBusiness className="h-4 w-4 text-yellow-200" aria-hidden="true" />
              My work
            </Link>
          </div>

          <div className="mt-7 grid grid-cols-2 gap-2 sm:grid-cols-4">
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
              <h2 className="mt-4 text-2xl font-black text-white">No open paid missions right now</h2>
              <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-white/48">
                BaseDare does not show fake jobs to make the page look busy. Check back after the next funded brief goes live.
              </p>
              <div className="mt-5 flex flex-col justify-center gap-3 sm:flex-row">
                <Link
                  href="#mission-alerts"
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-yellow-200/18 bg-yellow-300/[0.07] px-5 text-[10px] font-black uppercase tracking-[0.14em] text-yellow-100"
                >
                  Get mission alerts <ArrowRight className="h-4 w-4" aria-hidden="true" />
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

        {showAlerts ? <section
          id="mission-alerts"
          className={`${controlPanel} mt-8 scroll-mt-28 p-6 sm:p-8`}
          aria-labelledby="mission-alerts-heading"
        >
          <div className={controlHairline} />
          <div className="grid gap-7 lg:grid-cols-[0.82fr_1.18fr] lg:items-start">
            <div>
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-200/16 bg-cyan-300/[0.06] text-cyan-100">
                <Radio className="h-5 w-5" aria-hidden="true" />
              </span>
              <p className={`${controlMicroLabel} mt-5`}>Mission alerts</p>
              <h2 id="mission-alerts-heading" className="mt-2 text-3xl font-black leading-tight text-white">
                Hear when real work opens.
              </h2>
              <p className="mt-3 max-w-md text-sm font-semibold leading-6 text-white/50">
                Leave one contact and your city. No wallet, public profile, follower count or creator application required.
              </p>
            </div>
            <MissionAlertForm defaultCity={missionAlertCity} autoFocus={alerts === '1'} />
          </div>
        </section> : (
          <p className="mt-7 text-center text-sm text-white/48">
            Nothing here suits you?{' '}
            <Link href={`/earn?${alertsQuery.toString()}#mission-alerts`} className="text-cyan-100 underline underline-offset-4">
              Get mission alerts
            </Link>
          </p>
        )}
      </div>
    </main>
  );
}
