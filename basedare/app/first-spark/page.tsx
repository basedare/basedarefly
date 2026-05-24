import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, CreditCard, QrCode, ReceiptText, Sparkles, Users } from 'lucide-react';

import SquircleLink from '@/components/ui/SquircleLink';
import SparkReceiptPreview from '@/components/activations/SparkReceiptPreview';
import ActivationFunnelTracker from '../activations/ActivationFunnelTracker';
import ActivationIntakeForm from '../activations/ActivationIntakeForm';

export const metadata: Metadata = {
  title: 'Run First Spark | BaseDare',
  description:
    'Run one BaseDare paid venue pilot with creator or guest routing, QR proof, one venue perk, and a recap receipt.',
};

const raisedPanelClass =
  'relative overflow-hidden rounded-[32px] border border-white/[0.09] bg-[linear-gradient(180deg,rgba(255,255,255,0.07)_0%,rgba(255,255,255,0.025)_14%,rgba(10,9,18,0.93)_58%,rgba(7,6,14,0.98)_100%)] shadow-[0_28px_90px_rgba(0,0,0,0.46),0_0_28px_rgba(168,85,247,0.08),inset_0_1px_0_rgba(255,255,255,0.1),inset_0_-18px_24px_rgba(0,0,0,0.24)]';
const insetCardClass =
  'rounded-[22px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(4,5,10,0.72)_0%,rgba(11,11,18,0.92)_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.06),inset_0_-10px_16px_rgba(0,0,0,0.26)]';

type FirstSparkPageProps = {
  searchParams: Promise<{
    creator?: string;
    streamer?: string;
    venue?: string;
    venueName?: string;
    venueId?: string;
    venueSlug?: string;
    city?: string;
    source?: string;
    budgetRange?: string;
    packageId?: string;
    goal?: string;
    buyerType?: string;
    auditBrief?: string;
    missionType?: string;
    missionTitle?: string;
    creatorSlots?: string;
    payout?: string;
    timeWindow?: string;
    proofRequired?: string;
    contentRequired?: string;
    guestMission?: string;
    perkLabel?: string;
  }>;
};

export default async function FirstSparkPage({ searchParams }: FirstSparkPageProps) {
  const resolvedSearchParams = await searchParams;
  const routedCreator = resolvedSearchParams.creator || resolvedSearchParams.streamer || null;
  const routedVenue = resolvedSearchParams.venueName || resolvedSearchParams.venue || null;
  const routedVenueId = resolvedSearchParams.venueId || null;
  const routedVenueSlug = resolvedSearchParams.venueSlug || null;
  const routedCity = resolvedSearchParams.city || null;
  const routedSource = resolvedSearchParams.source || 'first-spark-page';
  const hasRoutedVenue = Boolean(routedVenue || routedVenueSlug || routedCity);

  const pilotSnapshot = [
    ['Offer', '$500-$1.5k pilot'],
    ['Venue gives', 'One perk'],
    ['BaseDare does', 'Setup + routing'],
    ['Output', 'Proof recap'],
  ];

  const routeCards = [
    {
      icon: <Users className="h-5 w-5" />,
      label: '1 / Route',
      title: hasRoutedVenue ? routedVenue || routedCity || 'Selected venue' : 'One venue',
      detail: 'Pick the place, window, route, and perk.',
    },
    {
      icon: <QrCode className="h-5 w-5" />,
      label: '2 / Proof',
      title: 'QR + check-in path',
      detail: 'Participants scan, check in, and submit proof.',
    },
    {
      icon: <ReceiptText className="h-5 w-5" />,
      label: '3 / Recap',
      title: 'Repeat decision',
      detail: 'The venue gets proof, signal, and a repeat plan.',
    },
  ];

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#030305] px-4 py-8 text-white sm:px-6 lg:px-10 lg:py-10">
      <ActivationFunnelTracker />
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.1)_1px,transparent_0)] [background-size:112px_112px]" />
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(circle_at_22%_0%,rgba(245,197,24,0.1),transparent_30%),radial-gradient(circle_at_86%_10%,rgba(168,85,247,0.12),transparent_32%),linear-gradient(180deg,rgba(255,255,255,0.04)_0%,rgba(0,0,0,0)_30%,rgba(0,0,0,0.84)_100%)]" />

      <section className="relative z-10 mx-auto flex max-w-6xl flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/?mode=control"
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.045] px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-white/64 transition hover:bg-white/[0.08] hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Control
          </Link>
          <Link
            href="/admin/mission-control"
            className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/[0.035] px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-white/52 transition hover:text-white sm:inline-flex"
          >
            Mission Control
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <section className={`${raisedPanelClass} px-5 py-7 sm:px-7 lg:px-8 lg:py-8`}>
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(245,197,24,0.09),transparent_34%,rgba(168,85,247,0.09)_100%)]" />
          <div className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-white/35 to-transparent" />
          <div className="relative grid gap-7 lg:grid-cols-[1fr_0.72fr] lg:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-yellow-200/20 bg-yellow-300/[0.08] px-4 py-2 text-[11px] font-black uppercase tracking-[0.24em] text-yellow-100">
                <Sparkles className="h-4 w-4" />
                First Spark Pilot
              </div>
              <h1 className="mt-5 max-w-3xl text-4xl font-black uppercase italic leading-[0.92] tracking-[-0.065em] text-white sm:text-5xl lg:text-7xl">
                Run one proof night.
              </h1>
              <p className="mt-4 max-w-2xl text-base font-bold leading-7 text-white/62">
                BaseDare sets up the route, QR proof, creators or guests, and recap. The venue approves the plan and provides one simple perk.
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <div className="w-full sm:w-[260px]" data-activation-track="first-spark-primary" data-activation-channel="first-spark-page">
                  <SquircleLink href="#pilot-request" tone="yellow" label="Run First Spark" fullWidth height={46}>
                    <span className="flex items-center justify-center gap-2 text-[0.78rem] tracking-[0.08em] text-[#15120c]">
                      Run First Spark
                      <ArrowRight className="h-4 w-4" />
                    </span>
                  </SquircleLink>
                </div>
                <Link
                  href="/map"
                  className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] px-6 text-sm font-black uppercase tracking-[0.18em] text-white/70 transition hover:bg-white/[0.08] hover:text-white"
                >
                  Pick a venue
                </Link>
              </div>
            </div>

            <div className={`${insetCardClass} p-4`}>
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.22em] text-emerald-100/70">
                <CreditCard className="h-4 w-4" />
                Paid pilot loop
              </div>
              <div className="mt-4 grid gap-2">
                {pilotSnapshot.map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between gap-3 rounded-[18px] border border-white/[0.08] bg-white/[0.035] px-3 py-3">
                    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-white/34">{label}</span>
                    <span className="truncate text-sm font-black text-white/78">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          {routeCards.map((card) => (
            <article key={card.label} className={`${insetCardClass} p-5`}>
              <div className="grid h-11 w-11 place-items-center rounded-2xl border border-yellow-200/16 bg-yellow-300/[0.08] text-yellow-100">
                {card.icon}
              </div>
              <p className="mt-4 text-[10px] font-black uppercase tracking-[0.22em] text-white/36">{card.label}</p>
              <h2 className="mt-1 text-xl font-black tracking-[-0.03em] text-white">{card.title}</h2>
              <p className="mt-2 text-sm font-bold leading-6 text-white/54">{card.detail}</p>
            </article>
          ))}
        </section>

        <section className={`${raisedPanelClass} p-5 sm:p-6 lg:p-7`} id="spark-receipt">
          <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/28 to-transparent" />
          <div className="relative grid gap-5 lg:grid-cols-[0.72fr_1fr] lg:items-center">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-yellow-100/70">
                What the buyer gets
              </p>
              <h2 className="mt-3 max-w-xl text-3xl font-black uppercase italic leading-tight text-white sm:text-4xl">
                The receipt is the product.
              </h2>
              <p className="mt-3 max-w-xl text-sm font-bold leading-6 text-white/58">
                A venue does not need another vague influencer post. It needs a clean record of the route, the proof, the people moved, and the next repeat decision.
              </p>
              <div className="mt-5 flex flex-col gap-3 sm:flex-row lg:flex-col xl:flex-row">
                <Link
                  href="#pilot-request"
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-yellow-300/24 bg-yellow-300 px-5 text-xs font-black uppercase tracking-[0.16em] text-black shadow-[0_7px_0_rgba(118,74,0,0.68),inset_0_1px_0_rgba(255,255,255,0.55)] transition hover:-translate-y-0.5"
                >
                  Request pilot
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/activations"
                  className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] px-5 text-xs font-black uppercase tracking-[0.16em] text-white/66 transition hover:bg-white/[0.08] hover:text-white"
                >
                  Custom activation
                </Link>
              </div>
            </div>
            <SparkReceiptPreview
              venueName={routedVenue || 'Hideaway'}
              city={routedCity || 'Siargao'}
              budgetLabel="$500-$1.5k pilot"
              receiptId="BD-FIRST-SPARK"
              ctaHref="#pilot-request"
              ctaLabel="Start route"
              compact
            />
          </div>
        </section>

        <section id="pilot-request" className={`${raisedPanelClass} mx-auto w-full max-w-3xl p-5 sm:p-6`}>
          <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/24 to-transparent" />
          <div className="relative mb-5 rounded-[24px] border border-white/[0.08] bg-white/[0.035] px-4 py-4">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-yellow-100/70">Request the pilot</p>
            <p className="mt-2 text-sm leading-6 text-white/58">
              Keep it simple. Venue, contact, city, and one note are enough to generate the close room.
            </p>
          </div>
          <div className="relative">
            <ActivationIntakeForm
              routedCreator={routedCreator}
              routedVenue={routedVenue}
              routedVenueId={routedVenueId}
              routedVenueSlug={routedVenueSlug}
              routedCity={routedCity}
              routedSource={routedSource}
              routedBudgetRange={resolvedSearchParams.budgetRange || '500_1500'}
              routedPackageId={resolvedSearchParams.packageId || 'pilot-drop'}
              routedGoal={resolvedSearchParams.goal || 'foot_traffic'}
              routedBuyerType={resolvedSearchParams.buyerType || 'venue'}
              routedOfferId="first-spark"
              routedAuditBrief={resolvedSearchParams.auditBrief || null}
              routedMissionType={resolvedSearchParams.missionType || null}
              routedMissionTitle={resolvedSearchParams.missionTitle || null}
              routedCreatorSlots={resolvedSearchParams.creatorSlots || null}
              routedPayout={resolvedSearchParams.payout || null}
              routedTimeWindow={resolvedSearchParams.timeWindow || null}
              routedProofRequired={resolvedSearchParams.proofRequired || null}
              routedContentRequired={resolvedSearchParams.contentRequired || null}
              routedGuestMission={resolvedSearchParams.guestMission || null}
              routedPerkLabel={resolvedSearchParams.perkLabel || null}
            />
          </div>
        </section>
      </section>
    </main>
  );
}
