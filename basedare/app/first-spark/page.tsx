import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, CreditCard, MapPin, QrCode, ReceiptText, Users } from 'lucide-react';

import SquircleLink from '@/components/ui/SquircleLink';
import { ControlChrome } from '@/components/control/ControlChrome';
import { ControlPanel } from '@/components/control/ControlPanel';
import { controlPanel, controlInset } from '@/components/control/tokens';
import ActivationFunnelTracker from '../activations/ActivationFunnelTracker';
import ActivationIntakeForm from '../activations/ActivationIntakeForm';

export const metadata: Metadata = {
  title: 'Run a Mission Night | BaseDare',
  description:
    'Pick a slow venue window, add one perk, route people through QR proof, and get a Spark Receipt.',
};

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
    from?: string;
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
  const cameFromHome = resolvedSearchParams.from === 'home';
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

  const pilotSteps = [
    {
      icon: <Users className="h-5 w-5" />,
      label: '1. Window',
      detail: hasRoutedVenue ? routedVenue || routedCity || 'Selected venue' : 'Choose the slow slot',
    },
    {
      icon: <QrCode className="h-5 w-5" />,
      label: '2. Perk',
      detail: 'Give people a reason',
    },
    {
      icon: <ReceiptText className="h-5 w-5" />,
      label: '3. Proof',
      detail: 'QR proof plus clip',
    },
    {
      icon: <CreditCard className="h-5 w-5" />,
      label: '4. Receipt',
      detail: 'Proof, signal, next move',
    },
  ];

  return (
    <ControlChrome
      title="First Spark"
      subtitle="Dead-window pilot control"
      badge="Pilot Portal"
      backHref={cameFromHome ? '/' : '/?mode=control'}
      backLabel={cameFromHome ? 'Home' : 'Control'}
      action={
        <Link
          href="/admin/mission-control"
          className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/[0.035] px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-white/52 transition hover:text-white sm:inline-flex"
        >
          Mission Control
          <ArrowRight className="h-4 w-4" />
        </Link>
      }
    >
      <ActivationFunnelTracker />

      {!hasPrefilledRoute ? (
        <>
          {/* 1. Hero + paid pilot loop */}
          <section className={`${controlPanel} px-5 py-6 sm:px-7 lg:px-8 lg:py-7`}>
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(245,197,24,0.09),transparent_34%,rgba(168,85,247,0.09)_100%)]" />
            <div className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-white/35 to-transparent" />
            <div className="relative grid gap-5 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
              <div>
                <div className="text-[11px] font-black uppercase tracking-[0.28em] text-cyan-100/70">
                  First Spark pilot — for venues with one quiet slot
                </div>
                <h1 className="mt-2 max-w-3xl text-3xl font-black leading-[0.95] tracking-[-0.045em] text-white sm:text-5xl">
                  Run a Mission Night
                </h1>
                <p className="mt-3 max-w-2xl text-sm font-bold leading-6 text-white/62 sm:text-base">
                  Pick the quiet slot. Add one perk. BaseDare routes people, proves arrivals, and sends the Spark Receipt.
                </p>
                <div className="mt-5 flex flex-col gap-3 sm:flex-row">
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

              <div className="hidden grid-cols-2 gap-2 text-sm md:grid">
                {pilotSteps.map((step) => (
                  <div key={step.label} className={`${controlInset} px-3 py-3`}>
                    <div className="flex items-center gap-2">
                      <span className="text-yellow-100/78">{step.icon}</span>
                      <div className="font-black text-white">{step.label}</div>
                    </div>
                    <div className="mt-1 text-xs font-bold text-white/50">{step.detail}</div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* 2. Paid pilot snapshot */}
          <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {pilotSnapshot.map(([label, value], index) => (
              <article
                key={label}
                className={`${controlInset} px-4 py-4 ${
                  index === 0
                    ? 'border-yellow-300/18 bg-yellow-300/[0.08]'
                    : index === 1
                      ? 'border-cyan-300/18 bg-cyan-400/[0.07]'
                      : index === 2
                        ? 'border-purple-300/20 bg-purple-500/[0.08]'
                        : 'border-emerald-300/18 bg-emerald-400/[0.07]'
                }`}
              >
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/48">{label}</p>
                <p className="mt-2 truncate text-xl font-black text-white">{value}</p>
              </article>
            ))}
          </section>

          {/* 3. Venue route picker */}
          <section id="venue-routes" className={`${controlPanel} scroll-mt-32 p-5 sm:p-6 lg:p-7`}>
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
        </>
      ) : null}

      {/* 4. Intake form */}
      <ControlPanel id="pilot-request" className="mx-auto w-full max-w-3xl scroll-mt-32">
        {!hasPrefilledRoute ? (
          <div className="mb-5 rounded-[24px] border border-white/[0.08] bg-white/[0.035] px-4 py-4">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-yellow-100/70">Request the pilot</p>
            <p className="mt-2 text-sm leading-6 text-white/58">
              Venue, city, contact, slow window. We turn it into the route.
            </p>
          </div>
        ) : null}
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
      </ControlPanel>
    </ControlChrome>
  );
}
