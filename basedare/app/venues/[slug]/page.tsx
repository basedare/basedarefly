import type { Session } from 'next-auth';
import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { notFound } from 'next/navigation';
import { ArrowRight, BarChart3, Clock3, Flame, MapPin, ShieldCheck, Waves } from 'lucide-react';
import { authOptions } from '@/lib/auth-options';
import { getVenueDetailBySlug } from '@/lib/venues';
import {
  buildActivationReplayComposerHref,
  buildRepeatActivationComposerHref,
  buildVenueActivationIntakeHref,
  buildVenueChallengeCreateHref,
  buildVenueCreatorRouteComposerHref,
} from '@/lib/venue-launch';
import VenuePageShell from '../VenuePageShell';
import ClaimVenueButton from '@/components/venues/ClaimVenueButton';
import VenueMarkButton from '@/components/venues/VenueMarkButton';
import SquircleLink from '@/components/ui/SquircleLink';

const raisedPanelClass =
  'relative overflow-hidden rounded-[30px] border border-white/[0.09] bg-[linear-gradient(180deg,rgba(255,255,255,0.07)_0%,rgba(255,255,255,0.025)_14%,rgba(10,9,18,0.9)_58%,rgba(7,6,14,0.96)_100%)] shadow-[0_28px_90px_rgba(0,0,0,0.4),0_0_28px_rgba(168,85,247,0.07),inset_0_1px_0_rgba(255,255,255,0.1),inset_0_-18px_24px_rgba(0,0,0,0.24)]';

const softCardClass =
  'relative overflow-hidden rounded-[26px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(255,255,255,0.06)_0%,rgba(255,255,255,0.02)_12%,rgba(10,10,18,0.92)_100%)] shadow-[0_18px_30px_rgba(0,0,0,0.22),inset_0_1px_0_rgba(255,255,255,0.08),inset_0_-12px_18px_rgba(0,0,0,0.22)]';

const insetCardClass =
  'rounded-[22px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(4,5,10,0.72)_0%,rgba(11,11,18,0.92)_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.06),inset_0_-10px_16px_rgba(0,0,0,0.26)]';

function getVenueActivationState(dare: {
  streamerHandle: string | null;
  targetWalletAddress: string | null;
  claimedBy: string | null;
  claimRequestTag: string | null;
  claimRequestStatus: string | null;
}) {
  if (dare.claimRequestStatus === 'PENDING') {
    return {
      label: dare.claimRequestTag ? `pending ${dare.claimRequestTag}` : 'creator pending',
      className: 'border-amber-400/18 bg-amber-500/[0.08] text-amber-200',
    };
  }

  if (dare.claimedBy || dare.targetWalletAddress) {
    return {
      label: dare.streamerHandle ? `claimed by ${dare.streamerHandle}` : 'creator attached',
      className: 'border-emerald-400/18 bg-emerald-500/[0.08] text-emerald-200',
    };
  }

  return {
    label: dare.streamerHandle ? `target ${dare.streamerHandle}` : 'open challenge',
    className: 'border-white/10 bg-white/[0.04] text-white/48',
  };
}

function formatVenueLogbookDate(value: string) {
  const date = new Date(value);
  const now = new Date();
  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();

  if (sameDay) {
    return `today · ${date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
  }

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const wasYesterday =
    date.getFullYear() === yesterday.getFullYear() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getDate() === yesterday.getDate();

  if (wasYesterday) {
    return 'yesterday';
  }

  return date.toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
  });
}

function getLogbookSourceLabel(source?: string | null) {
  switch (source) {
    case 'DARE_COMPLETION':
      return 'verified dare';
    case 'DIRECT_TAG':
      return 'place mark';
    default:
      return 'venue memory';
  }
}

function getReviewSlaClass(tone: string) {
  switch (tone) {
    case 'overdue':
      return 'border-rose-400/18 bg-rose-500/[0.08] text-rose-100';
    case 'due':
      return 'border-[#f5c518]/18 bg-[#f5c518]/[0.08] text-[#f8dd72]';
    case 'fresh':
      return 'border-cyan-300/14 bg-cyan-500/[0.06] text-cyan-100';
    default:
      return 'border-emerald-300/14 bg-emerald-500/[0.06] text-emerald-100';
  }
}

function getReviewSlaFillClass(tone: string) {
  switch (tone) {
    case 'overdue':
      return 'bg-rose-300';
    case 'due':
      return 'bg-[#f8dd72]';
    case 'fresh':
      return 'bg-cyan-300';
    default:
      return 'bg-emerald-300';
  }
}

function getPulseState(heatScore: number) {
  if (heatScore >= 45) {
    return { label: 'Hot', className: 'text-rose-200', accentClassName: 'border-rose-400/18 bg-rose-500/[0.08] text-rose-100' };
  }
  if (heatScore >= 20) {
    return { label: 'Alive', className: 'text-emerald-200', accentClassName: 'border-emerald-400/18 bg-emerald-500/[0.08] text-emerald-100' };
  }
  if (heatScore > 0) {
    return { label: 'Simmering', className: 'text-amber-200', accentClassName: 'border-amber-400/18 bg-amber-500/[0.08] text-amber-100' };
  }
  return { label: 'Dormant', className: 'text-white/62', accentClassName: 'border-white/10 bg-white/[0.04] text-white/62' };
}

function getPulseMeterShellClass(label: string) {
  switch (label) {
    case 'Hot':
      return 'border-rose-300/18 bg-rose-500/[0.075] text-rose-100';
    case 'Alive':
      return 'border-emerald-300/18 bg-emerald-500/[0.075] text-emerald-100';
    case 'Simmering':
      return 'border-[#f5c518]/20 bg-[#f5c518]/[0.075] text-[#f8dd72]';
    default:
      return 'border-white/10 bg-white/[0.035] text-white/58';
  }
}

function getPulseMeterFillClass(label: string) {
  switch (label) {
    case 'Hot':
      return 'bg-[linear-gradient(90deg,rgba(251,113,133,0.72)_0%,rgba(236,72,153,0.68)_58%,rgba(245,197,24,0.64)_100%)] shadow-[0_0_22px_rgba(251,113,133,0.32),inset_0_1px_0_rgba(255,255,255,0.22)]';
    case 'Alive':
      return 'bg-[linear-gradient(90deg,rgba(52,211,153,0.72)_0%,rgba(34,211,238,0.62)_100%)] shadow-[0_0_22px_rgba(52,211,153,0.26),inset_0_1px_0_rgba(255,255,255,0.22)]';
    case 'Simmering':
      return 'bg-[linear-gradient(90deg,rgba(245,197,24,0.78)_0%,rgba(248,221,114,0.72)_62%,rgba(34,211,238,0.48)_100%)] shadow-[0_0_24px_rgba(245,197,24,0.3),inset_0_1px_0_rgba(255,255,255,0.24)]';
    default:
      return 'bg-[linear-gradient(90deg,rgba(255,255,255,0.24)_0%,rgba(255,255,255,0.1)_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.14)]';
  }
}

function formatCompactAudience(value: number | null) {
  if (typeof value !== 'number' || value <= 0) return 'Building';
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M+`;
  if (value >= 10_000) return `${Math.round(value / 1_000)}K+`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K+`;
  return `${value}+`;
}

function formatCompactVenueMetric(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 10_000) return `${Math.round(value / 1_000)}K`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return String(value);
}

function formatMetricDelta(value: number) {
  if (value > 0) return `+${formatCompactVenueMetric(value)}`;
  if (value < 0) return `-${formatCompactVenueMetric(Math.abs(value))}`;
  return 'flat';
}

function getMetricDeltaClass(value: number) {
  if (value > 0) return 'border-emerald-400/18 bg-emerald-500/[0.08] text-emerald-100';
  if (value < 0) return 'border-rose-400/18 bg-rose-500/[0.08] text-rose-100';
  return 'border-white/10 bg-white/[0.04] text-white/48';
}

export default async function VenueDetailPage(
  {
    params,
    searchParams,
  }: {
    params: Promise<{ slug: string }>;
    searchParams: Promise<{ source?: string; dare?: string }>;
  }
) {
  const { slug } = await params;
  const resolvedSearchParams = await searchParams;
  const session = (await getServerSession(authOptions)) as (Session & {
    walletAddress?: string;
    user?: Session['user'] & { walletAddress?: string };
  }) | null;
  const creatorWalletAddress =
    session?.walletAddress?.trim().toLowerCase() ??
    session?.user?.walletAddress?.trim().toLowerCase() ??
    null;
  const venue = await getVenueDetailBySlug(slug, creatorWalletAddress);

  if (!venue) {
    notFound();
  }

  const venueProfile = venue.profile;
  const totalActiveChallengeFunding = venue.activeDares.reduce((sum, dare) => sum + dare.bounty, 0);
  const paidActivationCount = venue.activeDares.filter((dare) => Boolean(dare.brandName)).length;
  const pendingActivationCount = venue.activeDares.filter((dare) => dare.claimRequestStatus === 'PENDING').length;
  const claimedActivationCount = venue.activeDares.filter((dare) => Boolean(dare.claimedBy || dare.targetWalletAddress)).length;
  const featuredPaidActivationState = venue.featuredPaidActivation
    ? getVenueActivationState(venue.featuredPaidActivation)
    : null;
  const focusedDareShortId = resolvedSearchParams?.dare;
  const isCreatorContext = resolvedSearchParams?.source === 'creator';
  const focusedActivation =
    (focusedDareShortId && venue.activeDares.find((dare) => dare.shortId === focusedDareShortId)) ||
    (venue.featuredPaidActivation?.shortId === focusedDareShortId ? venue.featuredPaidActivation : null);
  const focusedActivationState = focusedActivation ? getVenueActivationState(focusedActivation) : null;
  const hasPendingOwnVenueMark = venue.timelineMoments.some(
    (moment) => moment.kind === 'PLACE_MARK' && moment.status === 'PENDING' && moment.isOwn
  );
  const showFeaturedPaidActivation =
    Boolean(venue.featuredPaidActivation) && venue.featuredPaidActivation?.shortId !== focusedActivation?.shortId;
  const featuredPaidActivation = showFeaturedPaidActivation ? venue.featuredPaidActivation : null;
  const mapHref = `/map?place=${encodeURIComponent(venue.slug)}${
    isCreatorContext ? `&source=creator&matches=1${focusedDareShortId ? `&dare=${encodeURIComponent(focusedDareShortId)}` : ''}` : ''
  }`;
  const fundChallengeHref = buildVenueChallengeCreateHref({
    venueId: venue.id,
    venueSlug: venue.slug,
    venueName: venue.name,
    payout: 60,
  });
  const activateVenueHref = buildVenueActivationIntakeHref({
    venueId: venue.id,
    venueSlug: venue.slug,
    venueName: venue.name,
    city: venue.city,
    payout: 120,
    goal: 'foot_traffic',
    buyerType: 'venue',
    packageId: 'pilot-drop',
    source: 'venue',
  });
  const venueReportHref = `/venues/${encodeURIComponent(venue.slug)}/report`;
  const creatorContribution = venue.creatorContribution;
  const currentPulseState = getPulseState(venue.tagSummary.heatScore);
  const pulseMeterProgress = Math.min(
    100,
    Math.max(venue.tagSummary.heatScore > 0 ? 18 : 7, venue.tagSummary.heatScore)
  );
  const previousPulseState = getPulseState(Math.max(0, venue.tagSummary.heatScore - (creatorContribution?.pulseContribution ?? 0)));
  const creatorShiftedPulseState =
    Boolean(creatorContribution?.pulseContribution) && previousPulseState.label !== currentPulseState.label;
  const venueOpsMetrics = venue.commandCenter.metrics;
  const repeatActivationHref = buildRepeatActivationComposerHref({ venue });
  const featuredActivationReplayHref = featuredPaidActivation
    ? buildActivationReplayComposerHref({ venue, activation: featuredPaidActivation })
    : null;
  const topCreatorRoutes = venue.topCreators.slice(0, 3).map((creator) => ({
    ...creator,
    href: buildVenueCreatorRouteComposerHref({
      venue,
      creatorTag: creator.creatorTag,
    }),
  }));
  const bestCreatorRoute = topCreatorRoutes[0] ?? null;
  const last7DayWindow = venue.roiSnapshot.windows.last7Days;
  const memoryLiftCards = [
    {
      label: 'Check-ins',
      value: last7DayWindow.checkIns,
      delta: last7DayWindow.checkInsDelta,
    },
    {
      label: 'Visitors',
      value: last7DayWindow.uniqueVisitors,
      delta: last7DayWindow.uniqueVisitorsDelta,
    },
    {
      label: 'Proofs',
      value: last7DayWindow.proofs,
      delta: last7DayWindow.proofsDelta,
    },
    {
      label: 'Outcomes',
      value: last7DayWindow.verifiedOutcomes,
      delta: last7DayWindow.verifiedOutcomesDelta,
    },
  ];
  const memorySparklineBuckets = venue.memoryHistory.slice(0, 7).reverse();
  const maxMemorySparklineValue = Math.max(
    1,
    ...memorySparklineBuckets.map(
      (bucket) => bucket.checkInCount + bucket.proofCount + bucket.completedDareCount
    )
  );
  const memorySparklineLabel =
    memorySparklineBuckets.length > 0
      ? `${formatVenueLogbookDate(memorySparklineBuckets[0].bucketStartAt)} to ${formatVenueLogbookDate(memorySparklineBuckets[memorySparklineBuckets.length - 1].bucketStartAt)}`
      : 'Waiting for first venue memory';
  const memorySparklineSlots = Array.from({ length: 7 }, (_, index) => {
    const bucketIndex = index - (7 - memorySparklineBuckets.length);
    const bucket = bucketIndex >= 0 ? memorySparklineBuckets[bucketIndex] : null;
    const value = bucket
      ? bucket.checkInCount + bucket.proofCount + bucket.completedDareCount
      : 0;

    return {
      id: bucket?.bucketStartAt ?? `empty-memory-${index}`,
      bucket,
      value,
      height: bucket ? Math.max(16, Math.round((Math.max(1, value) / maxMemorySparklineValue) * 58)) : 12,
    };
  });
  const repeatSignalHref = repeatActivationHref ?? fundChallengeHref;
  const repeatSignalCta = venue.activationInsight.repeatReady ? 'Repeat winner' : 'Create signal';
  const handshakeStatusLabel =
    venue.liveSession?.status === 'LIVE'
      ? 'Live'
      : venue.commandCenter.consoleUrl
        ? 'Console ready'
        : 'Claim to unlock';
  const handshakeHref =
    venue.commandCenter.consoleUrl ?? (venue.commandCenter.claimState === 'unclaimed' ? venueReportHref : mapHref);
  const handshakeCta = venue.commandCenter.consoleUrl
    ? 'Open console'
    : venue.commandCenter.claimState === 'unclaimed'
      ? 'Start claim'
      : 'Open map';

  return (
    <VenuePageShell mapHref={mapHref}>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(168,85,247,0.12),transparent_28%),radial-gradient(circle_at_15%_75%,rgba(34,211,238,0.08),transparent_24%),radial-gradient(circle_at_90%_85%,rgba(250,204,21,0.06),transparent_22%)]" />
      <main className="relative mx-auto max-w-6xl px-4 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-6 sm:px-6 sm:pt-10 lg:px-8">
        <section className="space-y-6">
          <div className={`${raisedPanelClass} px-5 py-6 sm:px-8 sm:py-8`}>
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_0%,rgba(168,85,247,0.12),transparent_32%),radial-gradient(circle_at_88%_100%,rgba(34,211,238,0.1),transparent_36%),linear-gradient(180deg,rgba(255,255,255,0.05)_0%,transparent_32%,transparent_72%,rgba(0,0,0,0.24)_100%)]" />
            <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/26 to-transparent" />
            <div className="relative">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                <div className="max-w-3xl">
                  <div className="inline-flex items-center gap-2 rounded-full border border-fuchsia-400/25 bg-[linear-gradient(180deg,rgba(217,70,239,0.16)_0%,rgba(88,28,135,0.08)_100%)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-fuchsia-100 shadow-[0_12px_24px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.12),inset_0_-10px_14px_rgba(0,0,0,0.22)]">
                    <ShieldCheck className="h-4 w-4" />
                    {venue.isPartner ? 'Partner Venue' : 'Venue Beacon'}
                  </div>
                  <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-end">
                    <div className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-[28px] border border-white/12 bg-[linear-gradient(145deg,rgba(255,255,255,0.1)_0%,rgba(255,255,255,0.035)_38%,rgba(8,8,16,0.92)_100%)] text-3xl shadow-[0_24px_48px_rgba(0,0,0,0.28),inset_0_1px_0_rgba(255,255,255,0.12),inset_0_-16px_24px_rgba(0,0,0,0.24)]">
                      {venueProfile.profileImageUrl ? (
                        <img src={venueProfile.profileImageUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <span aria-hidden="true">{venueProfile.primaryLegend.emoji}</span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#f8dd72]">{venueProfile.tagline}</p>
                      <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-5xl">{venue.name}</h1>
                    </div>
                  </div>
                  <p className="mt-3 max-w-2xl text-sm leading-6 text-white/68 sm:mt-4 sm:text-base">{venueProfile.bio}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {venueProfile.legends.map((legend) => (
                      <span
                        key={`${venue.slug}:${legend.key}`}
                        className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.045] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/62 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
                      >
                        <span aria-hidden="true">{legend.emoji}</span>
                        {legend.label}
                      </span>
                    ))}
                  </div>
                  <div className="mt-5 flex flex-wrap items-center gap-3 text-sm text-white/55">
                    <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                      <MapPin className="h-4 w-4 text-amber-300" />
                      {venue.address ? `${venue.address}, ` : ''}{venue.city}, {venue.country}
                    </span>
                    <span className="inline-flex items-center gap-2 rounded-full border border-cyan-400/14 bg-cyan-500/[0.06] px-3 py-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                      <Waves className="h-4 w-4 text-cyan-300" />
                      {venue.liveSession?.campaignLabel ?? 'Venue check-in live'}
                    </span>
                  </div>
                </div>

                <div className="grid min-w-0 gap-3 sm:min-w-[280px] sm:grid-cols-2 lg:grid-cols-1">
                  <div className={`${softCardClass} px-5 py-5`}>
                    <div className="pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-white/22 to-transparent" />
                    <p className="text-xs uppercase tracking-[0.25em] text-white/40">Next move</p>
                    <h2 className="mt-2 text-2xl font-black text-white">Leave a mark here</h2>
                    <p className="mt-2 text-sm leading-6 text-white/58">
                      Verified marks are the fastest way to make this place feel alive. Funded challenges can stack on top.
                    </p>
                    <div className="mt-5 grid gap-2">
                      <VenueMarkButton
                        placeId={venue.id}
                        placeName={venue.name}
                        latitude={venue.latitude}
                        longitude={venue.longitude}
                        address={venue.address}
                        city={venue.city}
                        country={venue.country}
                        buttonLabel="Leave mark"
                        buttonVariant="jelly"
                      />
                      <SquircleLink
                        href={fundChallengeHref}
                        label="Fund dare"
                        tone="yellow"
                        fullWidth
                        height={44}
                        labelClassName="text-[0.78rem] tracking-[0.1em] sm:text-[0.84rem]"
                      >
                        Fund dare
                        <ArrowRight className="h-4 w-4" />
                      </SquircleLink>
                      <SquircleLink
                        href={activateVenueHref}
                        label="Activate"
                        tone="purple"
                        fullWidth
                        height={44}
                        labelClassName="text-[0.78rem] tracking-[0.1em] sm:text-[0.84rem]"
                      >
                        Activate
                      </SquircleLink>
                    </div>
                  </div>
                  <div className={`${softCardClass} hidden px-5 py-4 md:block`}>
                    <div className="pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-white/22 to-transparent" />
                    <p className="text-xs uppercase tracking-[0.25em] text-white/40">Owner / ops</p>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-lg font-bold">
                        {venue.commandCenter.consoleUrl
                          ? 'Console ready'
                          : venue.commandCenter.claimState === 'pending'
                            ? 'Claim pending'
                            : 'Claim this venue'}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-white/58">{venue.commandCenter.summary}</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Link
                        href={venueReportHref}
                        className="inline-flex items-center gap-2 rounded-full border border-cyan-400/24 bg-cyan-500/[0.1] px-4 py-2 text-sm font-semibold text-cyan-100 shadow-[0_12px_22px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.08)] transition hover:-translate-y-[1px] hover:border-cyan-300/38 hover:bg-cyan-500/[0.14]"
                      >
                        <BarChart3 className="h-4 w-4" />
                        Report
                      </Link>
                      {repeatActivationHref ? (
                        <Link
                          href={repeatActivationHref}
                          className="inline-flex items-center gap-2 rounded-full border border-amber-400/24 bg-amber-500/[0.1] px-4 py-2 text-sm font-semibold text-amber-100 shadow-[0_12px_22px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.08)] transition hover:-translate-y-[1px] hover:border-amber-300/38 hover:bg-amber-500/[0.14]"
                        >
                          Re-run Activation
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      ) : null}
                      {venue.commandCenter.consoleUrl ? (
                        <Link
                          href={venue.commandCenter.consoleUrl}
                          className="inline-flex items-center gap-2 rounded-full border border-fuchsia-400/24 bg-fuchsia-500/[0.1] px-4 py-2 text-sm font-semibold text-fuchsia-100 shadow-[0_12px_22px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.08)] transition hover:-translate-y-[1px] hover:border-fuchsia-300/38 hover:bg-fuchsia-500/[0.14]"
                        >
                          Open Console
                          <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                        </Link>
                      ) : (
                        <ClaimVenueButton
                          venueSlug={venue.slug}
                          venueName={venue.name}
                          pending={venue.commandCenter.claimState === 'pending'}
                          className="inline-flex items-center justify-center gap-2 rounded-full border border-fuchsia-400/24 bg-fuchsia-500/[0.1] px-4 py-2 text-sm font-semibold text-fuchsia-100 shadow-[0_12px_22px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.08)] transition hover:-translate-y-[1px] hover:border-fuchsia-300/38 hover:bg-fuchsia-500/[0.14]"
                          pendingClassName="inline-flex items-center justify-center rounded-full border border-amber-300/24 bg-amber-500/[0.08] px-4 py-2 text-sm font-semibold text-amber-100"
                          requireAuthClassName="inline-flex items-center justify-center rounded-full border border-fuchsia-400/24 bg-fuchsia-500/[0.1] px-4 py-2 text-sm font-semibold text-fuchsia-100 shadow-[0_12px_22px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.08)] transition hover:-translate-y-[1px] hover:border-fuchsia-300/38 hover:bg-fuchsia-500/[0.14]"
                        />
                      )}
                      <Link
                        href={venue.commandCenter.contactUrl}
                        className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-white/72 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition hover:-translate-y-[1px] hover:border-white/18 hover:bg-white/[0.08] hover:text-white"
                      >
                        {venue.commandCenter.contactLabel}
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
                <div className={`${insetCardClass} px-4 py-4`}>
                  <p className="text-[11px] uppercase tracking-[0.22em] text-white/35">Live challenges</p>
                  <p className="mt-2 text-2xl font-black">{venue.activeDares.length}</p>
                </div>
                <div className={`${insetCardClass} px-4 py-4`}>
                  <p className="text-[11px] uppercase tracking-[0.22em] text-white/35">Live funding</p>
                  <p className="mt-2 text-2xl font-black">${totalActiveChallengeFunding.toFixed(0)}</p>
                </div>
                <div className={`${insetCardClass} px-4 py-4`}>
                  <p className="text-[11px] uppercase tracking-[0.22em] text-white/35">Heat</p>
                  <p className={`mt-2 text-2xl font-black ${currentPulseState.className}`}>{venue.tagSummary.heatScore}</p>
                </div>
                <div className={`${insetCardClass} px-4 py-4`}>
                  <p className="text-[11px] uppercase tracking-[0.22em] text-white/35">Verified marks</p>
                  <p className="mt-2 text-2xl font-black">{venue.tagSummary.approvedCount}</p>
                </div>
              </div>
            </div>
          </div>

          <div className={`${raisedPanelClass} px-4 py-4 sm:px-5 sm:py-5`}>
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_0%_0%,rgba(245,197,24,0.10),transparent_30%),radial-gradient(circle_at_95%_20%,rgba(34,211,238,0.10),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.035)_0%,transparent_42%,rgba(0,0,0,0.18)_100%)]" />
            <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/24 to-transparent" />
            <div className="relative grid gap-3 lg:grid-cols-[1.05fr_1.25fr_0.9fr]">
              <div className={`${insetCardClass} px-4 py-4`}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.24em] text-white/35">Place memory</p>
                    <p className={`mt-2 text-3xl font-black ${currentPulseState.className}`}>
                      {currentPulseState.label}
                    </p>
                  </div>
                  <div
                    className={`w-full rounded-[18px] border px-3 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),inset_0_-10px_16px_rgba(0,0,0,0.22)] sm:w-auto sm:min-w-[8.6rem] ${getPulseMeterShellClass(currentPulseState.label)}`}
                    aria-label={`Venue pulse ${venue.tagSummary.heatScore}`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[9px] font-black uppercase tracking-[0.22em] opacity-72">Pulse</span>
                      <strong className="text-xs font-black">{venue.tagSummary.heatScore}</strong>
                    </div>
                    <div className="mt-2" style={{ perspective: '720px' }}>
                      <div
                        className="relative h-5 overflow-visible"
                        style={{
                          transform: 'rotateX(58deg)',
                          transformOrigin: '50% 70%',
                          transformStyle: 'preserve-3d',
                        }}
                      >
                        <div className="absolute inset-x-0 bottom-0 h-4 rounded-[10px] bg-white/[0.11] shadow-[inset_0_1px_0_rgba(255,255,255,0.12),inset_0_-8px_10px_rgba(0,0,0,0.36)]" />
                        <div
                          className={`absolute bottom-0 left-0 h-4 rounded-[10px] ${getPulseMeterFillClass(currentPulseState.label)}`}
                          style={{ width: `${pulseMeterProgress}%` }}
                        />
                        <div className="absolute left-2 right-2 top-1 h-1 rounded-full bg-white/45 opacity-70" />
                        <div className="absolute inset-x-1 bottom-[-0.38rem] h-2 rounded-[999px] bg-black/40 blur-[3px]" />
                      </div>
                    </div>
                  </div>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-white/62">
                  {venue.activationInsight.summary}
                </p>
                <div className="mt-5 grid grid-cols-7 gap-2" aria-label={`Venue memory activity from ${memorySparklineLabel}`}>
                  {memorySparklineSlots.map((slot) => (
                    <div
                      key={slot.id}
                      className="flex h-20 items-end justify-center [perspective:720px]"
                      title={
                        slot.bucket
                          ? `${formatVenueLogbookDate(slot.bucket.bucketStartAt)} · ${slot.value} signal${slot.value === 1 ? '' : 's'}`
                          : 'No venue memory yet'
                      }
                    >
                      <span
                        className="relative block w-full max-w-[2.4rem] rounded-[12px]"
                        style={{
                          height: slot.height,
                          transform: 'rotateX(58deg)',
                          transformOrigin: '50% 78%',
                          transformStyle: 'preserve-3d',
                        }}
                      >
                        <span
                          className={`absolute inset-0 rounded-[12px] border ${
                            slot.bucket
                              ? 'border-cyan-200/18 bg-[linear-gradient(180deg,rgba(34,211,238,0.74)_0%,rgba(184,127,255,0.44)_66%,rgba(255,255,255,0.08)_100%)] shadow-[0_0_18px_rgba(34,211,238,0.18),inset_0_1px_0_rgba(255,255,255,0.24),inset_0_-10px_14px_rgba(16,8,40,0.36)]'
                              : 'border-white/8 bg-white/[0.035] shadow-[inset_0_1px_0_rgba(255,255,255,0.06),inset_0_-8px_12px_rgba(0,0,0,0.24)]'
                          }`}
                        />
                        <span className="absolute inset-x-1.5 top-1 h-1 rounded-full bg-white/45 opacity-70" />
                        <span className="absolute inset-x-1 bottom-[-0.4rem] h-2 rounded-full bg-black/45 blur-[4px]" />
                      </span>
                    </div>
                  ))}
                </div>
                <p className="mt-2 text-[10px] uppercase tracking-[0.18em] text-white/35">
                  {memorySparklineLabel}
                </p>
              </div>

              <div className={`${insetCardClass} px-4 py-4`}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.24em] text-white/35">7-day lift</p>
                    <p className="mt-2 text-xl font-black text-white">
                      {venue.activationInsight.timeframeLabel}
                    </p>
                  </div>
                  <Link
                    href={repeatSignalHref}
                    className="inline-flex w-fit items-center gap-2 rounded-full border border-[#f5c518]/24 bg-[#f5c518]/[0.1] px-3.5 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#f8dd72] shadow-[0_12px_22px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.08)] transition hover:-translate-y-[1px] hover:border-[#f5c518]/38 hover:bg-[#f5c518]/[0.14]"
                  >
                    {repeatSignalCta}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {memoryLiftCards.map((item) => (
                    <div
                      key={item.label}
                      className="rounded-[18px] border border-white/8 bg-white/[0.035] px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
                    >
                      <p className="text-[10px] uppercase tracking-[0.18em] text-white/34">{item.label}</p>
                      <div className="mt-2 flex items-end justify-between gap-2">
                        <p className="text-xl font-black text-white">{formatCompactVenueMetric(item.value)}</p>
                        <span className={`rounded-full border px-2 py-0.5 text-[9px] uppercase tracking-[0.14em] ${getMetricDeltaClass(item.delta)}`}>
                          {formatMetricDelta(item.delta)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                {venue.activationInsight.reasons.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {venue.activationInsight.reasons.slice(0, 3).map((reason) => (
                      <span
                        key={reason}
                        className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] text-white/48"
                      >
                        {reason}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className={`${insetCardClass} px-4 py-4`}>
                <p className="text-[11px] uppercase tracking-[0.24em] text-white/35">Fast route</p>
                {bestCreatorRoute ? (
                  <>
                    <div className="mt-3 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-2xl font-black text-white">{bestCreatorRoute.creatorTag}</p>
                        <p className="mt-1 text-xs uppercase tracking-[0.18em] text-cyan-100/72">
                          {bestCreatorRoute.trustLabel} · L{bestCreatorRoute.trustLevel}
                        </p>
                      </div>
                      <span className="rounded-full border border-cyan-400/18 bg-cyan-500/[0.08] px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] text-cyan-100">
                        {bestCreatorRoute.trustScore} trust
                      </span>
                    </div>
                    <p className="mt-3 text-sm leading-relaxed text-white/62">
                      {bestCreatorRoute.marksHere} mark{bestCreatorRoute.marksHere === 1 ? '' : 's'} here,
                      {' '}{bestCreatorRoute.firstMarksHere} first spark{bestCreatorRoute.firstMarksHere === 1 ? '' : 's'},
                      {' '}${Math.round(bestCreatorRoute.totalEarned)} earned.
                    </p>
                    <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
                      <Link
                        href={bestCreatorRoute.href}
                        className="inline-flex items-center justify-center gap-2 rounded-full border border-fuchsia-400/24 bg-fuchsia-500/[0.1] px-4 py-2 text-sm font-semibold text-fuchsia-100 shadow-[0_12px_22px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.08)] transition hover:-translate-y-[1px] hover:border-fuchsia-300/38 hover:bg-fuchsia-500/[0.14]"
                      >
                        Route creator
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                      <Link
                        href={handshakeHref}
                        className="inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-white/72 transition hover:-translate-y-[1px] hover:border-white/18 hover:bg-white/[0.08]"
                      >
                        {handshakeCta}
                      </Link>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="mt-3 text-2xl font-black text-white">No local legend yet</p>
                    <p className="mt-2 text-sm leading-relaxed text-white/62">
                      Fund the next challenge and the creator-routing layer starts ranking who can own this place.
                    </p>
                    <div className="mt-4">
                      <SquircleLink
                        href={fundChallengeHref}
                        label="Fund dare"
                        tone="yellow"
                        fullWidth
                        height={44}
                        labelClassName="text-[0.72rem] tracking-[0.1em]"
                      >
                        Fund dare
                        <ArrowRight className="h-4 w-4" />
                      </SquircleLink>
                    </div>
                  </>
                )}
                <div className="mt-4 rounded-[18px] border border-white/8 bg-black/20 px-3 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[10px] uppercase tracking-[0.2em] text-white/34">Secure Handshake</span>
                    <span className="rounded-full border border-emerald-400/18 bg-emerald-500/[0.08] px-2 py-0.5 text-[9px] uppercase tracking-[0.16em] text-emerald-100">
                      {handshakeStatusLabel}
                    </span>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-white/52">
                    QR + GPS presence rail · {venue.checkInRadiusMeters}m radius · {venue.qrRotationSeconds}s rotation.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="relative grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
            <div className="space-y-6">
              <div className={`${softCardClass} p-5 sm:p-6`}>
                <div className="pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-white/22 to-transparent" />
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.25em] text-white/40">Active Challenges</p>
                    <h2 className="mt-2 text-xl font-bold sm:text-2xl">Fund a challenge here</h2>
                    <p className="mt-3 hidden max-w-2xl text-sm text-white/60 sm:block">
                      This is the public money layer. Challenges can run here whether the venue is activated or not.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 sm:gap-3">
                    <div className="rounded-full border border-[#f5c518]/20 bg-[#f5c518]/[0.08] px-4 py-2 text-sm text-[#f8dd72] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                      {venue.activeDares.length} live
                    </div>
                    <div className="rounded-full border border-emerald-400/18 bg-emerald-500/[0.08] px-4 py-2 text-sm text-emerald-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                      ${totalActiveChallengeFunding.toFixed(0)} funded
                    </div>
                    {venue.activeDares.length === 0 ? (
                      <div className="rounded-full border border-fuchsia-400/18 bg-fuchsia-500/[0.08] px-4 py-2 text-sm text-fuchsia-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                        first challenge open
                      </div>
                    ) : null}
                    {paidActivationCount > 0 ? (
                      <div className="rounded-full border border-cyan-400/18 bg-cyan-500/[0.08] px-4 py-2 text-sm text-cyan-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                        {paidActivationCount} paid activations
                      </div>
                    ) : null}
                    {pendingActivationCount > 0 ? (
                      <div className="rounded-full border border-amber-400/18 bg-amber-500/[0.08] px-4 py-2 text-sm text-amber-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                        {pendingActivationCount} creator pending
                      </div>
                    ) : claimedActivationCount > 0 ? (
                      <div className="rounded-full border border-emerald-400/18 bg-emerald-500/[0.08] px-4 py-2 text-sm text-emerald-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                        {claimedActivationCount} creator attached
                      </div>
                    ) : null}
                    <div className="w-full max-w-xs sm:w-48">
                      <SquircleLink
                        href={fundChallengeHref}
                        label="Fund dare"
                        tone="yellow"
                        fullWidth
                        height={48}
                        labelClassName="text-[0.74rem] tracking-[0.1em]"
                      >
                        Fund dare
                      </SquircleLink>
                    </div>
                  </div>
                </div>
                {isCreatorContext && focusedActivation ? (
                  <div className={`${insetCardClass} mt-5 px-4 py-5`}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.24em] text-cyan-100/82">
                        <Flame className="h-3.5 w-3.5 text-cyan-200" />
                        You Match Here
                      </div>
                      <span className="rounded-full border border-cyan-300/18 bg-cyan-500/[0.08] px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-cyan-100">
                        creator view
                      </span>
                    </div>
                    <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="text-2xl font-black text-white">{focusedActivation.title}</p>
                        <p className="mt-2 text-sm text-white/62">
                          This is the live challenge your dashboard pointed you to at this venue.
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <span className="rounded-full border border-[#f5c518]/18 bg-[#f5c518]/[0.08] px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-[#f8dd72]">
                            ${focusedActivation.bounty.toFixed(0)} USDC
                          </span>
                          {focusedActivationState ? (
                            <span className={`rounded-full px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] ${focusedActivationState.className}`}>
                              {focusedActivationState.label}
                            </span>
                          ) : null}
                          {focusedActivation.expiresAt ? (
                            <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-white/48">
                              ends {new Date(focusedActivation.expiresAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Link
                          href={`/dare/${focusedActivation.shortId}`}
                          className="rounded-full border border-cyan-300/18 bg-cyan-500/[0.08] px-4 py-2 text-sm font-semibold text-cyan-100 shadow-[0_12px_22px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.08)] transition hover:-translate-y-[1px] hover:border-cyan-300/34 hover:bg-cyan-500/[0.14]"
                        >
                          {focusedActivation.claimedBy || focusedActivation.targetWalletAddress || focusedActivation.claimRequestStatus === 'PENDING'
                            ? 'Open brief'
                            : 'Claim now'}
                        </Link>
                        <Link
                          href={mapHref}
                          className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-white/75 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition hover:-translate-y-[1px] hover:border-white/18 hover:bg-white/[0.08]"
                        >
                          View on map
                        </Link>
                      </div>
                    </div>
                  </div>
                ) : null}
                {creatorContribution ? (
                  <div className={`${insetCardClass} mt-5 px-4 py-5`}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.24em] text-fuchsia-100/82">
                        <Flame className="h-3.5 w-3.5 text-fuchsia-200" />
                        Your Legacy At This Place
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] ${currentPulseState.accentClassName}`}>
                        {currentPulseState.label} now
                      </span>
                    </div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                      <div className={`${softCardClass} p-4`}>
                        <p className="text-[11px] uppercase tracking-[0.22em] text-white/38">Verified Marks</p>
                        <p className="mt-2 text-2xl font-black text-white">{creatorContribution.totalMarksHere}</p>
                        <p className="mt-2 text-xs leading-relaxed text-white/52">
                          You&apos;ve left {creatorContribution.totalMarksHere} verified mark{creatorContribution.totalMarksHere === 1 ? '' : 's'} here.
                        </p>
                      </div>
                      <div className={`${softCardClass} p-4`}>
                        <p className="text-[11px] uppercase tracking-[0.22em] text-white/38">Verified Wins</p>
                        <p className="mt-2 text-2xl font-black text-[#f8dd72]">{creatorContribution.totalWinsHere}</p>
                        <p className="mt-2 text-xs leading-relaxed text-white/52">
                          Your challenge completions are part of this venue&apos;s permanent proof trail.
                        </p>
                      </div>
                      <div className={`${softCardClass} p-4`}>
                        <p className="text-[11px] uppercase tracking-[0.22em] text-white/38">Pulse Added</p>
                        <p className="mt-2 text-2xl font-black text-fuchsia-100">+{creatorContribution.pulseContribution}</p>
                        <p className="mt-2 text-xs leading-relaxed text-white/52">
                          {creatorShiftedPulseState
                            ? `Your wins helped move this venue from ${previousPulseState.label} to ${currentPulseState.label}.`
                            : `Your marks account for ${Math.round(creatorContribution.shareOfVenuePulse * 100)}% of the venue's current pulse.`}
                        </p>
                      </div>
                      <div className={`${softCardClass} p-4`}>
                        <p className="text-[11px] uppercase tracking-[0.22em] text-white/38">Local Signal</p>
                        <p className="mt-2 text-lg font-black text-white">
                          {creatorContribution.firstMarksHere > 0 ? 'First mark won' : creatorContribution.isTopLocalSignal ? 'Top local signal' : 'Repeat presence'}
                        </p>
                        <p className="mt-2 text-xs leading-relaxed text-white/52">
                          {creatorContribution.firstMarksHere > 0
                            ? `You created ${creatorContribution.firstMarksHere} first mark${creatorContribution.firstMarksHere === 1 ? '' : 's'} here.`
                            : creatorContribution.isTopLocalSignal
                              ? 'You currently have the strongest visible footprint at this venue.'
                              : `Last active ${creatorContribution.lastMarkedAt ? formatVenueLogbookDate(creatorContribution.lastMarkedAt) : 'recently'}.`}
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <span className="rounded-full border border-fuchsia-400/18 bg-fuchsia-500/[0.08] px-3 py-1.5 text-[10px] uppercase tracking-[0.2em] text-fuchsia-100">
                        {creatorContribution.creatorTag ?? 'your identity'} wrote part of this venue
                      </span>
                      {creatorContribution.firstMarksHere > 0 ? (
                        <span className="rounded-full border border-amber-400/18 bg-amber-500/[0.08] px-3 py-1.5 text-[10px] uppercase tracking-[0.2em] text-amber-200">
                          first mark legacy
                        </span>
                      ) : null}
                      {creatorContribution.isTopLocalSignal ? (
                        <span className="rounded-full border border-cyan-400/18 bg-cyan-500/[0.08] px-3 py-1.5 text-[10px] uppercase tracking-[0.2em] text-cyan-100">
                          strongest footprint here
                        </span>
                      ) : null}
                    </div>
                  </div>
                ) : null}
                {featuredPaidActivation ? (
                  <div className={`${insetCardClass} mt-5 px-4 py-5`}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.24em] text-rose-100/80">
                        <Flame className="h-3.5 w-3.5 text-rose-300" />
                        Money Live Here
                      </div>
                      <span className="rounded-full border border-rose-300/18 bg-rose-500/[0.08] px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-rose-100">
                        paid activation
                      </span>
                    </div>
                    <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="text-2xl font-black text-white">{featuredPaidActivation.title}</p>
                        <p className="mt-2 text-sm text-white/62">
                          {featuredPaidActivation.brandName ?? 'Brand-backed'} activation live at this venue right now.
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <span className="rounded-full border border-[#f5c518]/18 bg-[#f5c518]/[0.08] px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-[#f8dd72]">
                            ${featuredPaidActivation.bounty.toFixed(0)} USDC
                          </span>
                          {featuredPaidActivationState ? (
                            <span className={`rounded-full px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] ${featuredPaidActivationState.className}`}>
                              {featuredPaidActivationState.label}
                            </span>
                          ) : null}
                          {featuredPaidActivation.expiresAt ? (
                            <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-white/48">
                              ends {new Date(featuredPaidActivation.expiresAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Link
                          href={`/dare/${featuredPaidActivation.shortId}`}
                          className="rounded-full border border-rose-300/18 bg-rose-500/[0.08] px-4 py-2 text-sm font-semibold text-rose-100 shadow-[0_12px_22px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.08)] transition hover:-translate-y-[1px] hover:border-rose-300/34 hover:bg-rose-500/[0.14]"
                        >
                          {featuredPaidActivation.claimedBy || featuredPaidActivation.targetWalletAddress || featuredPaidActivation.claimRequestStatus === 'PENDING'
                            ? 'Open brief'
                            : 'Claim now'}
                        </Link>
                        {featuredActivationReplayHref ? (
                          <Link
                            href={featuredActivationReplayHref}
                            className="rounded-full border border-amber-400/24 bg-amber-500/[0.1] px-4 py-2 text-sm font-semibold text-amber-100 shadow-[0_12px_22px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.08)] transition hover:-translate-y-[1px] hover:border-amber-300/38 hover:bg-amber-500/[0.14]"
                          >
                            Re-run brief
                          </Link>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ) : null}
                <div className="mt-5 space-y-3">
                  {venue.activeDares.length > 0 ? (
                    venue.activeDares.map((dare) => {
                      const activationState = getVenueActivationState(dare);
                      const isFocusedActivation = dare.shortId === focusedDareShortId;

                      return (
                      <Link
                        key={dare.id}
                        href={`/dare/${dare.shortId}`}
                        className={`${insetCardClass} group flex items-start justify-between gap-4 px-4 py-4 transition hover:border-[#f5c518]/25 hover:bg-[#f5c518]/[0.05] ${
                          isFocusedActivation ? 'border-cyan-300/24 bg-cyan-500/[0.06]' : ''
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full border border-[#f5c518]/18 bg-[#f5c518]/[0.08] px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-[#f8dd72]">
                              ${dare.bounty.toFixed(0)} USDC
                            </span>
                            {dare.brandName ? (
                              <span className="rounded-full border border-cyan-400/18 bg-cyan-500/[0.08] px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-cyan-100">
                                {dare.brandName}
                              </span>
                            ) : null}
                            {dare.brandName ? (
                              <span className="rounded-full border border-fuchsia-300/18 bg-fuchsia-500/[0.08] px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-fuchsia-100">
                                paid activation
                              </span>
                            ) : null}
                            {isFocusedActivation ? (
                              <span className="rounded-full border border-cyan-300/18 bg-cyan-500/[0.08] px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-cyan-100">
                                your match
                              </span>
                            ) : null}
                            <span className={`rounded-full px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] ${activationState.className}`}>
                              {activationState.label}
                            </span>
                            {dare.expiresAt ? (
                              <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-white/48">
                                ends {new Date(dare.expiresAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-3 text-lg font-bold text-white">{dare.title}</p>
                          <p className="mt-2 text-sm text-white/55">
                            {dare.missionMode} mission anchored to this place{dare.streamerHandle ? ` for ${dare.streamerHandle}` : ''}.
                          </p>
                          {dare.campaignTitle ? (
                            <p className="mt-2 text-xs uppercase tracking-[0.2em] text-cyan-200/70">
                              Campaign: {dare.campaignTitle}
                            </p>
                          ) : null}
                        </div>
                        <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-white/35 transition group-hover:translate-x-1 group-hover:text-white/70" />
                      </Link>
                      );
                    })
                  ) : (
                    <div className={`${insetCardClass} px-4 py-5`}>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full border border-[#f5c518]/20 bg-[#f5c518]/[0.08] px-2.5 py-1 text-[10px] uppercase tracking-[0.2em] text-[#f8dd72]">
                          First challenge open
                        </span>
                        {venue.tagSummary.approvedCount > 0 ? (
                          <span className="rounded-full border border-fuchsia-400/18 bg-fuchsia-500/[0.08] px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-fuchsia-100">
                            {venue.tagSummary.approvedCount} verified mark{venue.tagSummary.approvedCount === 1 ? '' : 's'} already here
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-3 text-sm text-white/78">
                        This place already has map presence. It just needs the first funded mission.
                      </p>
                      <p className="mt-2 text-sm text-white/58">
                        Fund the first challenge and turn passive venue memory into a live participation surface.
                      </p>
                      <div className="mt-4 max-w-xs">
                        <SquircleLink
                          href={fundChallengeHref}
                          label="Start dare"
                          tone="yellow"
                          fullWidth
                          height={46}
                          labelClassName="text-[0.7rem] tracking-[0.1em] sm:text-[0.76rem]"
                        >
                          Start dare
                          <ArrowRight className="h-4 w-4" />
                        </SquircleLink>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className={`${softCardClass} hidden p-6 md:block`}>
                <div className="pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-white/22 to-transparent" />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.25em] text-white/40">Venue Memory</p>
                    <h2 className="mt-2 text-2xl font-bold">Today’s signal at this venue</h2>
                  </div>
                  <div className="rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-sm text-white/65 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                    {venue.memorySummary?.bucketType ?? 'DAY'}
                  </div>
                </div>
                <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <div className={`${insetCardClass} px-4 py-4`}>
                    <p className="text-xs uppercase tracking-[0.24em] text-white/35">Check-Ins</p>
                    <p className="mt-2 text-2xl font-black">{venue.memorySummary?.checkInCount ?? 0}</p>
                  </div>
                  <div className={`${insetCardClass} px-4 py-4`}>
                    <p className="text-xs uppercase tracking-[0.24em] text-white/35">Unique Visitors</p>
                    <p className="mt-2 text-2xl font-black">{venue.memorySummary?.uniqueVisitorCount ?? 0}</p>
                  </div>
                  <div className={`${insetCardClass} px-4 py-4`}>
                    <p className="text-xs uppercase tracking-[0.24em] text-white/35">Venue Dares</p>
                    <p className="mt-2 text-2xl font-black">{venue.memorySummary?.dareCount ?? 0}</p>
                  </div>
                  <div className={`${insetCardClass} px-4 py-4`}>
                    <p className="text-xs uppercase tracking-[0.24em] text-white/35">Top Creator</p>
                    <p className="mt-2 text-lg font-bold">{venue.memorySummary?.topCreatorTag ?? 'Waiting...'}</p>
                  </div>
                </div>
              </div>

              <div className={`${softCardClass} hidden p-6 md:block`}>
                <div className="pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-white/22 to-transparent" />
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.25em] text-white/40">Top Creators For This Venue</p>
                    <h2 className="mt-2 text-2xl font-bold">Route proven people into this place faster</h2>
                    <p className="mt-3 max-w-2xl text-sm text-white/60">
                      These creators already have signal here. Use them as the fastest path from venue momentum to a funded challenge or activation.
                    </p>
                  </div>
                  <Link
                    href={`/brands/portal?venue=${encodeURIComponent(venue.slug)}&compose=1`}
                    className="inline-flex items-center gap-2 self-start rounded-full border border-fuchsia-400/24 bg-fuchsia-500/[0.1] px-4 py-2 text-sm font-semibold text-fuchsia-100 shadow-[0_12px_22px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.08)] transition hover:-translate-y-[1px] hover:border-fuchsia-300/38 hover:bg-fuchsia-500/[0.14]"
                  >
                    Launch here
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>

                {topCreatorRoutes.length === 0 ? (
                  <div className={`${insetCardClass} mt-5 px-4 py-5`}>
                    <p className="text-sm text-white/78">
                      No strong venue-fit creator yet. Fund the next challenge and this recommendation layer will start filling itself in.
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Link
                        href={fundChallengeHref}
                        className="inline-flex items-center gap-2 rounded-full border border-fuchsia-400/24 bg-fuchsia-500/[0.1] px-4 py-2 text-sm font-semibold text-fuchsia-100 shadow-[0_12px_22px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.08)] transition hover:-translate-y-[1px] hover:border-fuchsia-300/38 hover:bg-fuchsia-500/[0.14]"
                      >
                        Fund dare
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                      <Link
                        href={mapHref}
                        className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-white/72 transition hover:-translate-y-[1px] hover:border-white/18 hover:bg-white/[0.08] hover:text-white"
                      >
                        Open on map
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="mt-5 grid gap-3 xl:grid-cols-2">
                    {topCreatorRoutes.map((creator) => (
                      <div
                        key={`${creator.walletAddress}-${creator.creatorTag}`}
                        className={`${insetCardClass} flex h-full min-w-0 flex-col overflow-hidden px-4 py-4`}
                      >
                        <div className="flex min-w-0 items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="truncate text-lg font-bold text-white">{creator.creatorTag}</div>
                            <div className="mt-1 flex min-w-0 flex-wrap items-center gap-2 text-[10px] uppercase tracking-[0.16em] text-white/42">
                              <span>{creator.trustLabel} L{creator.trustLevel}</span>
                              <span className="rounded-full border border-cyan-400/18 bg-cyan-500/[0.08] px-2 py-0.5 text-cyan-100">
                                {creator.trustScore} trust
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 grid grid-cols-3 gap-2">
                          <div className="min-w-0 rounded-[16px] border border-white/10 bg-white/[0.03] px-2 py-2">
                            <div className="text-lg font-black text-white">{creator.marksHere}</div>
                            <div className="truncate text-[10px] uppercase tracking-[0.12em] text-white/42">Marks</div>
                          </div>
                          <div className="min-w-0 rounded-[16px] border border-white/10 bg-white/[0.03] px-2 py-2">
                            <div className="text-lg font-black text-[#f8dd72]">{creator.firstMarksHere}</div>
                            <div className="truncate text-[10px] uppercase tracking-[0.12em] text-white/42">First</div>
                          </div>
                          <div className="min-w-0 rounded-[16px] border border-white/10 bg-white/[0.03] px-2 py-2">
                            <div className="text-lg font-black text-emerald-100">${Math.round(creator.totalEarned)}</div>
                            <div className="truncate text-[10px] uppercase tracking-[0.12em] text-white/42">Earned</div>
                          </div>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2">
                          <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] text-white/58">
                            {creator.completedDares} wins total
                          </span>
                          <span className="rounded-full border border-cyan-400/18 bg-cyan-500/[0.08] px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] text-cyan-100">
                            {formatCompactAudience(creator.followerCount)} audience
                          </span>
                        </div>

                        <div className="mt-4 grid gap-2 sm:grid-cols-2">
                          <Link
                            href={creator.href}
                            className="inline-flex min-w-0 items-center justify-center gap-2 rounded-full border border-fuchsia-400/24 bg-fuchsia-500/[0.1] px-3 py-2 text-sm font-semibold text-fuchsia-100 shadow-[0_12px_22px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.08)] transition hover:-translate-y-[1px] hover:border-fuchsia-300/38 hover:bg-fuchsia-500/[0.14]"
                          >
                            Route
                            <ArrowRight className="h-4 w-4" />
                          </Link>
                          <Link
                            href={`/creator/${encodeURIComponent(creator.creatorTag)}`}
                            className="inline-flex min-w-0 items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-sm font-semibold text-white/72 transition hover:-translate-y-[1px] hover:border-white/18 hover:bg-white/[0.08] hover:text-white"
                          >
                            Profile
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className={`${softCardClass} p-6`}>
                <div className="pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-white/22 to-transparent" />
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.25em] text-white/40">Venue Logbook</p>
                    <h2 className="mt-2 text-2xl font-bold">Verified history at this place</h2>
                    <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/58">
                      Every approved mark becomes part of this venue&apos;s public memory trail. The best places should
                      feel inhabited before you even arrive.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <div className="rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-sm text-white/65 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                      {venue.tagSummary.approvedCount} verified mark{venue.tagSummary.approvedCount === 1 ? '' : 's'}
                    </div>
                    <div className="rounded-full border border-fuchsia-400/18 bg-fuchsia-500/[0.08] px-4 py-2 text-sm text-fuchsia-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                      Pulse {venue.tagSummary.heatScore}
                    </div>
                  </div>
                </div>
                <div className="mt-5 space-y-3">
                  {venue.tagSummary.approvedCount === 0 ? (
                    <div className="rounded-[18px] border border-[#f5c518]/18 bg-[#f5c518]/[0.08] px-4 py-3 text-sm text-[#f8dd72] shadow-[0_14px_28px_rgba(0,0,0,0.14),inset_0_1px_0_rgba(255,255,255,0.08)]">
                      {hasPendingOwnVenueMark
                        ? 'Your first mark is under referee review. Once approved, it becomes the venue opening legend.'
                        : 'First mark open. The first approved memory here becomes the venue opening legend.'}
                    </div>
                  ) : null}
                  {venue.timelineMoments.length > 0 ? (
                    <div className="max-h-[34rem] space-y-3 overflow-y-auto pr-1">
                      {venue.timelineMoments.map((moment) => {
                        const timelineCard = (
                          <>
                            <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-[20px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05)_0%,rgba(8,10,18,0.96)_100%)] shadow-[0_14px_28px_rgba(0,0,0,0.16),inset_0_1px_0_rgba(255,255,255,0.06)] sm:h-28 sm:w-28">
                              {moment.mediaUrl && moment.mediaType === 'IMAGE' ? (
                                <div
                                  className="absolute inset-0 bg-cover bg-center"
                                  style={{ backgroundImage: `url(${moment.mediaUrl})` }}
                                />
                              ) : (
                                <div className={`absolute inset-0 ${
                                  moment.kind === 'DARE_COMPLETION'
                                    ? 'bg-[radial-gradient(circle_at_28%_18%,rgba(245,197,24,0.26),transparent_34%),radial-gradient(circle_at_80%_85%,rgba(34,211,238,0.16),transparent_36%),linear-gradient(180deg,rgba(255,255,255,0.04)_0%,rgba(6,7,14,0.96)_100%)]'
                                    : 'bg-[radial-gradient(circle_at_30%_20%,rgba(168,85,247,0.22),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.04)_0%,rgba(6,7,14,0.96)_100%)]'
                                }`} />
                              )}
                              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                              {moment.rewardUsd ? (
                                <div className="absolute left-2 top-2 rounded-full border border-[#f5c518]/28 bg-[#f5c518]/[0.14] px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.16em] text-[#f8dd72] backdrop-blur-sm">
                                  ${moment.rewardUsd.toFixed(0)}
                                </div>
                              ) : null}
                              <div className="absolute bottom-2 left-2 rounded-full border border-white/10 bg-black/40 px-2 py-0.5 text-[9px] uppercase tracking-[0.18em] text-white/70 backdrop-blur-sm">
                                {moment.kind === 'DARE_COMPLETION'
                                  ? moment.mediaType === 'VIDEO'
                                    ? 'reward video'
                                    : 'reward proof'
                                  : moment.mediaType === 'VIDEO'
                                    ? 'video proof'
                                    : 'image proof'}
                              </div>
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <p className="truncate font-semibold text-white">{moment.creatorLabel}</p>
                                    <span className={`rounded-full border px-2 py-1 text-[10px] uppercase tracking-[0.18em] ${
                                      moment.status === 'PENDING'
                                        ? 'border-cyan-300/18 bg-cyan-500/[0.08] text-cyan-100'
                                        : moment.kind === 'DARE_COMPLETION'
                                          ? 'border-[#f5c518]/22 bg-[#f5c518]/[0.08] text-[#f8dd72]'
                                          : 'border-white/10 bg-white/[0.04] text-white/42'
                                    }`}>
                                      {moment.sourceLabel}
                                    </span>
                                    {moment.isOwn ? (
                                      <span className="rounded-full border border-fuchsia-400/18 bg-fuchsia-500/[0.08] px-2 py-1 text-[10px] uppercase tracking-[0.22em] text-fuchsia-100">
                                        {moment.kind === 'DARE_COMPLETION' ? 'your win' : 'your mark'}
                                      </span>
                                    ) : null}
                                  </div>
                                  <p className="mt-2 text-base font-bold leading-snug text-white">
                                    {moment.title}
                                  </p>
                                  <p className="mt-1.5 text-sm leading-relaxed text-white/64">
                                    {moment.body}
                                  </p>
                                  {moment.reviewSla ? (
                                    <div className={`mt-3 rounded-[18px] border px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] ${getReviewSlaClass(moment.reviewSla.tone)}`}>
                                      <div className="flex flex-wrap items-center justify-between gap-2">
                                        <span className="text-[10px] font-black uppercase tracking-[0.2em]">
                                          {moment.reviewSla.label}
                                        </span>
                                        <span className="text-[10px] font-semibold uppercase tracking-[0.16em] opacity-72">
                                          {moment.reviewSla.elapsedLabel} · {moment.reviewSla.dueLabel}
                                        </span>
                                      </div>
                                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-black/28 shadow-[inset_0_1px_2px_rgba(0,0,0,0.38)]">
                                        <div
                                          className={`h-full rounded-full ${getReviewSlaFillClass(moment.reviewSla.tone)}`}
                                          style={{ width: `${moment.reviewSla.progress}%` }}
                                        />
                                      </div>
                                    </div>
                                  ) : null}
                                </div>
                                <div className="text-left sm:text-right">
                                  <p className="text-[11px] uppercase tracking-[0.22em] text-white/36">
                                    {formatVenueLogbookDate(moment.occurredAt)}
                                  </p>
                                  {moment.shortId ? (
                                    <span className="mt-2 inline-flex items-center gap-1 rounded-full border border-cyan-300/18 bg-cyan-500/[0.08] px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] text-cyan-100">
                                      Open dare
                                      <ArrowRight className="h-3 w-3" />
                                    </span>
                                  ) : null}
                                </div>
                              </div>
                              {moment.badges.length > 0 ? (
                                <div className="mt-3 flex flex-wrap gap-2">
                                  {moment.badges.slice(0, 4).map((badge) => (
                                    <span
                                      key={`${moment.id}-${badge}`}
                                      className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-white/48"
                                    >
                                      {badge}
                                    </span>
                                  ))}
                                </div>
                              ) : null}
                            </div>
                          </>
                        );
                        const cardClassName = `${insetCardClass} group flex items-start gap-4 px-4 py-4 transition ${
                          moment.status === 'PENDING'
                            ? 'border-cyan-300/18 bg-[linear-gradient(180deg,rgba(34,211,238,0.09)_0%,rgba(10,10,18,0.92)_100%)] shadow-[0_18px_32px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.08),inset_0_-12px_18px_rgba(8,145,178,0.12)]'
                            : moment.kind === 'DARE_COMPLETION'
                              ? 'border-[#f5c518]/18 bg-[linear-gradient(180deg,rgba(245,197,24,0.08)_0%,rgba(10,10,18,0.92)_100%)] hover:border-[#f5c518]/30 hover:bg-[#f5c518]/[0.08]'
                              : moment.isOwn
                                ? 'border-fuchsia-400/18 bg-[linear-gradient(180deg,rgba(168,85,247,0.08)_0%,rgba(10,10,18,0.92)_100%)] shadow-[0_18px_32px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.08),inset_0_-12px_18px_rgba(88,28,135,0.18)]'
                                : 'hover:border-white/14 hover:bg-white/[0.035]'
                        }`;

                        return moment.shortId ? (
                          <Link key={moment.id} href={`/dare/${moment.shortId}`} className={cardClassName}>
                            {timelineCard}
                          </Link>
                        ) : (
                          <div key={moment.id} className={cardClassName}>
                            {timelineCard}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className={`${insetCardClass} px-4 py-5`}>
                      <p className="text-sm text-white/58">
                        No verified marks yet. The first approved tag here will start the place-memory timeline.
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <div className="w-full max-w-xs">
                          <VenueMarkButton
                            placeId={venue.id}
                            placeName={venue.name}
                            latitude={venue.latitude}
                            longitude={venue.longitude}
                            address={venue.address}
                            city={venue.city}
                            country={venue.country}
                            buttonLabel="Leave first mark"
                            buttonVariant="jelly"
                          />
                        </div>
                        <SquircleLink
                          href={fundChallengeHref}
                          label="Start dare"
                          tone="yellow"
                          height={46}
                          labelClassName="text-[0.7rem] tracking-[0.1em]"
                        >
                          Start dare
                          <ArrowRight className="h-4 w-4" />
                        </SquircleLink>
                        <Link
                          href={mapHref}
                          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-white/72 transition hover:-translate-y-[1px] hover:border-white/18 hover:bg-white/[0.08] hover:text-white"
                        >
                          Open on map
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              </div>

            </div>

            <div className="hidden space-y-6 lg:block">
              <div className={`${softCardClass} p-6`}>
                <div className="pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-white/22 to-transparent" />
                <div className="flex items-center gap-2">
                  <Clock3 className="h-4 w-4 text-amber-300" />
                  <p className="text-xs uppercase tracking-[0.25em] text-white/40">Venue ops</p>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className={`${insetCardClass} px-4 py-4`}>
                    <span className="text-xs uppercase tracking-[0.2em] text-white/35">Session</span>
                    <p className={`mt-2 font-semibold ${
                      venue.liveSession?.status === 'LIVE' ? 'text-emerald-300' : 'text-white/65'
                    }`}>
                      {venue.liveSession?.status ?? 'OFFLINE'}
                    </p>
                  </div>
                  <div className={`${insetCardClass} px-4 py-4`}>
                    <span className="text-xs uppercase tracking-[0.2em] text-white/35">Scans/hr</span>
                    <p className="mt-2 font-semibold">{venueOpsMetrics.scansLastHour ?? 'Pilot'}</p>
                  </div>
                  <div className={`${insetCardClass} px-4 py-4`}>
                    <span className="text-xs uppercase tracking-[0.2em] text-white/35">QR mode</span>
                    <p className="mt-2 font-semibold">{venue.qrMode}</p>
                  </div>
                  <div className={`${insetCardClass} px-4 py-4`}>
                    <span className="text-xs uppercase tracking-[0.2em] text-white/35">Rotation</span>
                    <p className="mt-2 font-semibold">{venue.qrRotationSeconds}s</p>
                  </div>
                </div>
                <div className="mt-4 space-y-3">
                  <div className={`${insetCardClass} flex items-center justify-between px-4 py-4`}>
                    <span className="text-sm text-white/55">Last check-in</span>
                    <span className="font-semibold">
                      {venue.liveSession?.lastCheckInAt
                        ? new Date(venue.liveSession.lastCheckInAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
                        : 'None yet'}
                    </span>
                  </div>
                  {venue.recentCheckIns.length > 0 ? (
                    venue.recentCheckIns.slice(0, 3).map((checkIn) => (
                      <div
                        key={`${checkIn.walletAddress}-${checkIn.scannedAt}`}
                        className={`${insetCardClass} px-4 py-4`}
                      >
                        <div className="flex items-center justify-between gap-4">
                          <p className="font-semibold text-white">{checkIn.tag ?? checkIn.walletAddress.slice(0, 10)}</p>
                          <p className="text-sm text-white/50">
                            {new Date(checkIn.scannedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                          </p>
                        </div>
                        <p className="mt-1 text-xs uppercase tracking-[0.24em] text-white/35">{checkIn.proofLevel}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-white/55">No public check-ins yet. Ops will light up once the venue runs a live session.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </VenuePageShell>
  );
}
