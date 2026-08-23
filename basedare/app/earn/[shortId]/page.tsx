import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Clock3, FileCheck2, MapPin, ShieldCheck, Sparkles, WalletCards } from 'lucide-react';

import GradualBlurOverlay from '@/components/GradualBlurOverlay';
import LiquidBackground from '@/components/LiquidBackground';
import { CreatorMissionAcceptClient } from '@/components/creators/CreatorMissionAcceptClient';
import { CreatorMissionShareButton } from '@/components/creators/CreatorMissionShareButton';
import {
  controlHairline,
  controlInset,
  controlMicroLabel,
  controlPanel,
} from '@/components/control/tokens';
import { getCreatorMissionByShortId } from '@/lib/creator-missions-server';

export const dynamic = 'force-dynamic';

type MissionPageProps = {
  params: Promise<{ shortId: string }>;
};

function formatUsdc(value: number) {
  return value.toLocaleString('en-US', { maximumFractionDigits: 2 });
}

function formatDeadline(expiresAt: Date | null) {
  if (!expiresAt) return 'No fixed deadline';
  return new Intl.DateTimeFormat('en', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  }).format(expiresAt);
}

export async function generateMetadata({ params }: MissionPageProps): Promise<Metadata> {
  const { shortId } = await params;
  const mission = await getCreatorMissionByShortId(shortId);
  if (!mission) return { title: 'Creator Mission | BaseDare' };
  return {
    title: `${mission.title} | BaseDare Creator Mission`,
    description: `${mission.typeLabel}. ${formatUsdc(mission.creatorPayout)} USDC after approval.`,
    alternates: { canonical: `/earn/${encodeURIComponent(mission.shortId)}` },
  };
}

export default async function CreatorMissionPage({ params }: MissionPageProps) {
  const { shortId } = await params;
  const mission = await getCreatorMissionByShortId(shortId);
  if (!mission) notFound();

  return (
    <main className="relative min-h-screen overflow-hidden bg-transparent px-4 pb-24 pt-6 text-white sm:px-6 md:pt-10">
      <LiquidBackground performanceMode="quiet" veilOpacity={0.76} />
      <div className="pointer-events-none fixed inset-0 z-10 hidden md:block"><GradualBlurOverlay /></div>
      <div className="pointer-events-none absolute inset-0 z-[1] bg-[radial-gradient(circle_at_20%_10%,rgba(34,211,238,0.1),transparent_32%),radial-gradient(circle_at_78%_15%,rgba(250,204,21,0.11),transparent_35%)]" />

      <div className="relative z-20 mx-auto max-w-5xl">
        <div className="mb-4 flex items-center justify-between gap-3">
          <Link href="/earn" className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.14em] text-white/50 hover:text-white">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Paid missions
          </Link>
          <CreatorMissionShareButton missionId={mission.id} title={mission.title} />
        </div>

        <section className={`${controlPanel} p-5 sm:p-8 md:p-10`}>
          <div className={controlHairline} />
          <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-10">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-cyan-200/18 bg-cyan-300/[0.06] px-3 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-cyan-100">
                  {mission.typeLabel}
                </span>
                <span className="rounded-full border border-emerald-200/16 bg-emerald-300/[0.05] px-3 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-emerald-100">
                  Paid creator mission
                </span>
              </div>

              <h1 className="mt-5 text-4xl font-black leading-[0.98] text-white sm:text-5xl">{mission.title}</h1>
              <div className="mt-5 flex flex-col gap-2 text-sm font-semibold text-white/48 sm:flex-row sm:flex-wrap sm:gap-x-5">
                <span className="flex items-start gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-cyan-200" aria-hidden="true" />{mission.locationLabel}</span>
                <span className="flex items-start gap-2"><Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-violet-200" aria-hidden="true" />{formatDeadline(mission.expiresAt)}</span>
              </div>

              <div className={`${controlInset} mt-7 p-5 sm:p-6`}>
                <p className={controlMicroLabel}>What to make</p>
                <p className="mt-3 text-xl font-black leading-8 text-white">{mission.whatToMake}</p>
                <div className="mt-5 border-t border-white/8 pt-4">
                  <p className="flex items-start gap-2 text-sm font-semibold leading-6 text-white/58">
                    <FileCheck2 className="mt-1 h-4 w-4 shrink-0 text-emerald-200" aria-hidden="true" />
                    <span><strong className="text-white/82">Submit:</strong> {mission.submitLabel}</span>
                  </p>
                </div>
              </div>

              <details className="mt-4 rounded-[22px] border border-white/9 bg-black/24 px-5 py-4 text-sm text-white/52">
                <summary className="cursor-pointer list-none font-black text-white/76">Details, safety &amp; rights</summary>
                <div className="mt-4 space-y-4 leading-6">
                  <p><strong className="text-white/78">Evidence:</strong> {mission.proofDetail}</p>
                  {mission.safety.length > 0 ? (
                    <div>
                      <p className="flex items-center gap-2 font-black text-white/78"><ShieldCheck className="h-4 w-4 text-yellow-200" aria-hidden="true" />Safety</p>
                      <ul className="mt-2 list-disc space-y-1 pl-5">{mission.safety.map((item) => <li key={item}>{item}</li>)}</ul>
                    </div>
                  ) : null}
                  <p>
                    <strong className="text-white/78">Usage:</strong>{' '}
                    {mission.baseDareCanDisplay
                      ? 'BaseDare may display the submitted work as part of the mission and its receipt.'
                      : 'The mission record does not grant BaseDare display rights.'}{' '}
                    Sponsor commercial reuse is not granted by accepting this mission; it requires a separate explicit opt-in.
                  </p>
                </div>
              </details>
            </div>

            <aside className="lg:sticky lg:top-28 lg:self-start">
              <div className="rounded-[26px] border border-yellow-200/18 bg-[linear-gradient(180deg,rgba(255,227,106,0.1),rgba(7,7,12,0.94)_38%)] p-5 shadow-[0_22px_52px_rgba(0,0,0,0.38),inset_0_1px_0_rgba(255,255,255,0.1)] sm:p-6">
                <p className={controlMicroLabel}>You receive</p>
                <p className="mt-2 text-5xl font-black tracking-tight text-yellow-200">{formatUsdc(mission.creatorPayout)}</p>
                <p className="mt-1 text-[10px] font-black uppercase tracking-[0.18em] text-white/38">USDC after approval</p>
                <p className="mt-4 text-xs leading-5 text-white/42">
                  {formatUsdc(mission.grossReward)} USDC reward less the 4% settlement fee.
                </p>

                <div className="my-5 h-px bg-gradient-to-r from-transparent via-white/14 to-transparent" />

                <CreatorMissionAcceptClient
                  missionId={mission.id}
                  shortId={mission.shortId}
                  title={mission.title}
                  isAvailable={mission.isAvailable}
                  initialClaimRequestWallet={mission.claimRequestWallet}
                  initialClaimRequestStatus={mission.claimRequestStatus}
                />
              </div>

              <div className="mt-3 flex items-start gap-2 rounded-2xl border border-white/8 bg-black/22 px-4 py-3 text-xs leading-5 text-white/38">
                <WalletCards className="mt-0.5 h-4 w-4 shrink-0 text-violet-200" aria-hidden="true" />
                <p>Your wallet receives the payout. A public creator profile is optional and can be completed later.</p>
              </div>
            </aside>
          </div>
        </section>

        <div className="mt-5 flex justify-center">
          <Link href="/earn" className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.14em] text-white/45 hover:text-white">
            <Sparkles className="h-4 w-4 text-cyan-200" aria-hidden="true" /> See all creator missions
          </Link>
        </div>
      </div>
    </main>
  );
}
