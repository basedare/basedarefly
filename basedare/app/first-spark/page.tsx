import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Clock3, CreditCard, MapPin, QrCode, ReceiptText, Sparkles, Users } from 'lucide-react';

import SquircleLink from '@/components/ui/SquircleLink';
import SparkReceiptPreview from '@/components/activations/SparkReceiptPreview';
import ActivationFunnelTracker from '../activations/ActivationFunnelTracker';
import ActivationIntakeForm from '../activations/ActivationIntakeForm';

export const metadata: Metadata = {
  title: 'Run First Spark | BaseDare',
  description:
    'Pick a slow venue window, add one perk, route people through QR proof, and get a Spark Receipt.',
};

const raisedPanelClass =
  'relative overflow-hidden rounded-[32px] border border-white/[0.09] bg-[linear-gradient(180deg,rgba(255,255,255,0.07)_0%,rgba(255,255,255,0.025)_14%,rgba(10,9,18,0.93)_58%,rgba(7,6,14,0.98)_100%)] shadow-[0_28px_90px_rgba(0,0,0,0.46),0_0_28px_rgba(168,85,247,0.08),inset_0_1px_0_rgba(255,255,255,0.1),inset_0_-18px_24px_rgba(0,0,0,0.24)]';
const insetCardClass =
  'rounded-[22px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(4,5,10,0.72)_0%,rgba(11,11,18,0.92)_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.06),inset_0_-10px_16px_rgba(0,0,0,0.26)]';

type FirstSparkVenueRoute = {
  slug: string;
  name: string;
  city: string;
  window: string;
  target: string;
  perk: string;
  baseline: string;
  missionTitle: string;
  tone: 'gold' | 'purple' | 'cyan';
};

const firstSparkVenueRoutes: FirstSparkVenueRoute[] = [
  {
    slug: 'hideaway',
    name: 'Hideaway',
    city: 'General Luna',
    window: 'Tue 7-9 PM',
    target: '20 verified check-ins',
    perk: 'First 20 unlock a house perk',
    baseline: 'Quiet midweek window',
    missionTitle: 'Hideaway Dead Window Rescue',
    tone: 'gold',
  },
  {
    slug: 'siargao-beach-club',
    name: 'Siargao Beach Club',
    city: 'General Luna',
    window: 'Sunset 5-7 PM',
    target: '30 verified check-ins',
    perk: 'Happy-hour unlock',
    baseline: 'Before-nightlife bridge',
    missionTitle: 'Beach Club Sunset Spark',
    tone: 'cyan',
  },
  {
    slug: 'gaya-rooftop-space',
    name: 'GAYA Rooftop Space',
    city: 'General Luna',
    window: 'Brunch or sunset',
    target: '18 verified check-ins',
    perk: 'Rooftop guest perk',
    baseline: 'Rooftop proof loop',
    missionTitle: 'GAYA Rooftop Spark Window',
    tone: 'purple',
  },
];

function buildFirstSparkRouteHref(route: FirstSparkVenueRoute) {
  const params = new URLSearchParams({
    venue: route.name,
    venueName: route.name,
    venueSlug: route.slug,
    city: route.city,
    source: 'first-spark-route',
    buyerType: 'venue',
    budgetRange: '500_1500',
    packageId: 'first-spark-window',
    goal: 'foot_traffic',
    missionType: 'dead-window',
    missionTitle: route.missionTitle,
    timeWindow: route.window,
    perkLabel: route.perk,
    deadWindowTime: route.window,
    deadWindowCheckInTarget: route.target,
    deadWindowPerk: route.perk,
    deadWindowBaseline: route.baseline,
    proofRequired: 'QR check-in plus proof clip',
    contentRequired: 'Spark Receipt recap',
    guestMission: `${route.name}: check in during ${route.window}, redeem the perk, and submit proof.`,
  });

  return `/first-spark?${params.toString()}#pilot-request`;
}

const routeToneClasses: Record<FirstSparkVenueRoute['tone'], string> = {
  gold: 'border-yellow-300/20 bg-yellow-300/[0.055] text-yellow-100 shadow-[0_0_24px_rgba(245,197,24,0.09),inset_0_1px_0_rgba(255,255,255,0.07)]',
  purple: 'border-purple-300/20 bg-purple-400/[0.07] text-purple-100 shadow-[0_0_24px_rgba(168,85,247,0.11),inset_0_1px_0_rgba(255,255,255,0.07)]',
  cyan: 'border-cyan-200/20 bg-cyan-300/[0.055] text-cyan-100 shadow-[0_0_24px_rgba(34,211,238,0.08),inset_0_1px_0_rgba(255,255,255,0.07)]',
};

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
    deadWindowTime?: string;
    deadWindowCheckInTarget?: string;
    deadWindowPerk?: string;
    deadWindowBaseline?: string;
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
  const hasPrefilledRoute = Boolean(
    routedCreator ||
    routedVenue ||
    routedVenueId ||
    routedVenueSlug ||
    routedCity ||
    (resolvedSearchParams.source && resolvedSearchParams.source !== 'first-spark-page') ||
    resolvedSearchParams.missionTitle ||
    resolvedSearchParams.guestMission ||
    resolvedSearchParams.perkLabel ||
    resolvedSearchParams.timeWindow ||
    resolvedSearchParams.proofRequired ||
    resolvedSearchParams.contentRequired ||
    resolvedSearchParams.deadWindowTime ||
    resolvedSearchParams.deadWindowPerk
  );
  const deadWindowTime = resolvedSearchParams.deadWindowTime || resolvedSearchParams.timeWindow || '';
  const deadWindowCheckInTarget = resolvedSearchParams.deadWindowCheckInTarget || '20 verified check-ins';
  const deadWindowPerk = resolvedSearchParams.deadWindowPerk || resolvedSearchParams.perkLabel || '';
  const deadWindowBaseline = resolvedSearchParams.deadWindowBaseline || '';
  const isDeadWindowRoute = Boolean(
    resolvedSearchParams.missionType === 'dead-window' ||
    resolvedSearchParams.deadWindowTime ||
    resolvedSearchParams.deadWindowCheckInTarget ||
    resolvedSearchParams.deadWindowPerk ||
    resolvedSearchParams.deadWindowBaseline
  );

  const pilotSnapshot = [
    ['Offer', '$500-$1.5k'],
    ['Venue gives', '1 simple perk'],
    ['BaseDare does', 'Route + QR proof'],
    ['Output', 'Spark Receipt'],
  ];

  const routeCards = [
    {
      icon: <Users className="h-5 w-5" />,
      label: '1 / Route',
      title: hasRoutedVenue ? routedVenue || routedCity || 'Selected venue' : 'Pick the window',
      detail: 'Choose the slow slot.',
    },
    {
      icon: <QrCode className="h-5 w-5" />,
      label: '2 / Proof',
      title: 'Add one perk',
      detail: 'Give people a reason.',
    },
    {
      icon: <ReceiptText className="h-5 w-5" />,
      label: '3 / Recap',
      title: 'Get the receipt',
      detail: 'Proof, signal, next move.',
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

        {!hasPrefilledRoute ? (
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
                {hasPrefilledRoute ? 'Review the First Spark route.' : 'Wake up one slow window.'}
              </h1>
              <p className="mt-4 max-w-2xl text-base font-bold leading-7 text-white/62">
                {hasPrefilledRoute
                  ? 'Confirm the essentials. Send the route into the operator queue.'
                  : 'Pick the quiet slot. Add one perk. BaseDare routes people, proves arrivals, and sends the Spark Receipt.'}
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
                  href="#venue-routes"
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
        ) : null}

        {!hasPrefilledRoute ? (
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
        ) : null}

        {!hasPrefilledRoute ? (
        <section id="venue-routes" className={`${raisedPanelClass} scroll-mt-32 p-5 sm:p-6 lg:p-7`}>
          <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-yellow-100/24 to-transparent" />
          <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-yellow-100/70">Start from a venue</p>
              <h2 className="mt-3 text-3xl font-black uppercase italic tracking-[-0.04em] text-white sm:text-4xl">
                Pick the route. Launch the window.
              </h2>
            </div>
            <Link
              href="/map?source=first-spark-route-picker"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-5 text-xs font-black uppercase tracking-[0.16em] text-white/66 transition hover:bg-white/[0.08] hover:text-white"
            >
              <MapPin className="h-4 w-4" />
              Open map
            </Link>
          </div>

          <div className="relative mt-5 grid gap-3 lg:grid-cols-3">
            {firstSparkVenueRoutes.map((route) => (
              <Link
                key={route.slug}
                href={buildFirstSparkRouteHref(route)}
                className={`group rounded-[24px] border p-4 transition hover:-translate-y-0.5 hover:border-white/20 ${routeToneClasses[route.tone]}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[9px] font-black uppercase tracking-[0.2em] opacity-70">{route.window}</p>
                    <h3 className="mt-2 truncate text-xl font-black tracking-[-0.035em] text-white">{route.name}</h3>
                  </div>
                  <span className="rounded-full border border-current/20 bg-black/20 px-3 py-1 text-[9px] font-black uppercase tracking-[0.16em] opacity-80">
                    Route
                  </span>
                </div>
                <div className="mt-4 grid gap-2">
                  {[
                    ['Perk', route.perk],
                    ['Target', route.target],
                    ['Baseline', route.baseline],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-[16px] border border-white/[0.08] bg-black/20 px-3 py-2">
                      <p className="text-[8px] font-black uppercase tracking-[0.18em] text-white/34">{label}</p>
                      <p className="mt-1 truncate text-sm font-black text-white/78">{value}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-4 inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-white/72">
                  Use this route
                  <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                </div>
              </Link>
            ))}
          </div>
        </section>
        ) : null}

        {!hasPrefilledRoute ? (
        <section className={`${raisedPanelClass} p-5 sm:p-6 lg:p-7`}>
          <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-yellow-100/30 to-transparent" />
          <div className="relative grid gap-5 lg:grid-cols-[0.76fr_1fr] lg:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-yellow-200/20 bg-yellow-300/[0.08] px-4 py-2 text-[10px] font-black uppercase tracking-[0.24em] text-yellow-100/76">
                <Clock3 className="h-4 w-4" />
                Dead Window Rescue
              </div>
              <h2 className="mt-4 max-w-xl text-3xl font-black uppercase italic leading-tight text-white sm:text-4xl">
                Pick slow window. Add perk. Get proof.
              </h2>
              <p className="mt-3 max-w-xl text-sm font-bold leading-6 text-white/58">
                One venue. One two-hour test. If it creates movement, repeat it. If not, adjust or stop.
              </p>
              <div className="mt-5 grid gap-2 sm:grid-cols-2">
                {[
                  ['1', 'Slow window'],
                  ['2', 'One perk'],
                  ['3', 'Check-ins'],
                  ['4', 'Receipt'],
                ].map(([step, label]) => (
                  <div key={label} className={`${insetCardClass} px-4 py-3`}>
                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/34">{step}</p>
                    <p className="mt-1 text-sm font-black uppercase tracking-[0.1em] text-white/72">{label}</p>
                  </div>
                ))}
              </div>
            </div>
            <SparkReceiptPreview
              venueName={routedVenue || 'Selected venue'}
              city={routedCity || 'Local market'}
              budgetLabel="$500-$1.5k pilot"
              receiptId="BD-DEAD-WINDOW"
              headline="Dead window receipt"
              summary="Check-ins, proof, baseline, and next move in one buyer-ready receipt."
              proofLogic="QR scans, check-ins, guest or creator proof, and venue notes."
              repeatMetric="Repeat, adjust, or stop based on visible movement."
              metrics={[
                { label: 'Window', value: deadWindowTime || 'Slow slot', detail: 'Buyer picks the exact time' },
                { label: 'Target', value: deadWindowCheckInTarget, detail: 'Verified check-ins' },
                { label: 'Perk', value: deadWindowPerk || 'One reward', detail: 'Reason to go now' },
                { label: 'Decision', value: 'Repeat', detail: 'Scale, adjust, or stop' },
              ]}
              ctaHref="#pilot-request"
              ctaLabel="Rescue a window"
              compact
            />
          </div>
        </section>
        ) : null}

        {!hasPrefilledRoute ? (
        <section className={`${raisedPanelClass} p-5 sm:p-6 lg:p-7`} id="spark-receipt">
          <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/28 to-transparent" />
          <div className="relative grid gap-5 lg:grid-cols-[0.72fr_1fr] lg:items-center">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-yellow-100/70">
                Buyer output
              </p>
              <h2 className="mt-3 max-w-xl text-3xl font-black uppercase italic leading-tight text-white sm:text-4xl">
                Proof first. Repeat second.
              </h2>
              <p className="mt-3 max-w-xl text-sm font-bold leading-6 text-white/58">
                The buyer gets check-ins, proof, spend, clips, and the next move. No fuzzy recap.
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
        ) : null}

        <section id="pilot-request" className={`${raisedPanelClass} mx-auto w-full max-w-3xl scroll-mt-32 p-5 sm:p-6`}>
          <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/24 to-transparent" />
          {!hasPrefilledRoute ? (
          <div className="relative mb-5 rounded-[24px] border border-white/[0.08] bg-white/[0.035] px-4 py-4">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-yellow-100/70">Request the pilot</p>
            <p className="mt-2 text-sm leading-6 text-white/58">
              Venue, city, contact, slow window. We turn it into the route.
            </p>
          </div>
          ) : null}
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
              routedMissionType={resolvedSearchParams.missionType || (resolvedSearchParams.guestMission ? 'guest' : 'dead-window')}
              routedMissionTitle={resolvedSearchParams.missionTitle || 'Dead Window Rescue'}
              routedCreatorSlots={resolvedSearchParams.creatorSlots || null}
              routedPayout={resolvedSearchParams.payout || null}
              routedTimeWindow={deadWindowTime || null}
              routedProofRequired={resolvedSearchParams.proofRequired || null}
              routedContentRequired={resolvedSearchParams.contentRequired || null}
              routedGuestMission={resolvedSearchParams.guestMission || null}
              routedPerkLabel={deadWindowPerk || null}
              routedDeadWindowTime={isDeadWindowRoute && deadWindowTime ? deadWindowTime : null}
              routedDeadWindowCheckInTarget={isDeadWindowRoute ? deadWindowCheckInTarget : null}
              routedDeadWindowPerk={isDeadWindowRoute && deadWindowPerk ? deadWindowPerk : null}
              routedDeadWindowBaseline={isDeadWindowRoute && deadWindowBaseline ? deadWindowBaseline : null}
            />
          </div>
        </section>
      </section>
    </main>
  );
}
