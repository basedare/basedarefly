import type { Session } from 'next-auth';
import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { notFound } from 'next/navigation';
import { Activity, ArrowRight, Clock3, Flame, MapPin, ShieldCheck, Waves } from 'lucide-react';
import { authOptions } from '@/lib/auth-options';
import { getVenueDetailBySlug } from '@/lib/venues';
import {
  buildActivationReplayComposerHref,
  buildRepeatActivationComposerHref,
  buildVenueCreatorRouteComposerHref,
} from '@/lib/venue-launch';
import VenuePageShell from '../VenuePageShell';
import ClaimVenueButton from '@/components/venues/ClaimVenueButton';

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

function formatCompactAudience(value: number | null) {
  if (typeof value !== 'number' || value <= 0) return 'Building';
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M+`;
  if (value >= 10_000) return `${Math.round(value / 1_000)}K+`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K+`;
  return `${value}+`;
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
  const showFeaturedPaidActivation =
    Boolean(venue.featuredPaidActivation) && venue.featuredPaidActivation?.shortId !== focusedActivation?.shortId;
  const featuredPaidActivation = showFeaturedPaidActivation ? venue.featuredPaidActivation : null;
  const mapHref = `/map?place=${encodeURIComponent(venue.slug)}${
    isCreatorContext ? `&source=creator&matches=1${focusedDareShortId ? `&dare=${encodeURIComponent(focusedDareShortId)}` : ''}` : ''
  }`;
  const creatorContribution = venue.creatorContribution;
  const currentPulseState = getPulseState(venue.tagSummary.heatScore);
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

  return (
    <VenuePageShell mapHref={mapHref}>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(168,85,247,0.12),transparent_28%),radial-gradient(circle_at_15%_75%,rgba(34,211,238,0.08),transparent_24%),radial-gradient(circle_at_90%_85%,rgba(250,204,21,0.06),transparent_22%)]" />
      <main className="relative mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <section className="space-y-6">
          <div className={`${raisedPanelClass} px-6 py-8 sm:px-8`}>
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_0%,rgba(168,85,247,0.12),transparent_32%),radial-gradient(circle_at_88%_100%,rgba(34,211,238,0.1),transparent_36%),linear-gradient(180deg,rgba(255,255,255,0.05)_0%,transparent_32%,transparent_72%,rgba(0,0,0,0.24)_100%)]" />
            <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/26 to-transparent" />
            <div className="relative">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                <div className="max-w-3xl">
                  <div className="inline-flex items-center gap-2 rounded-full border border-fuchsia-400/25 bg-[linear-gradient(180deg,rgba(217,70,239,0.16)_0%,rgba(88,28,135,0.08)_100%)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-fuchsia-100 shadow-[0_12px_24px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.12),inset_0_-10px_14px_rgba(0,0,0,0.22)]">
                    <ShieldCheck className="h-4 w-4" />
                    {venue.isPartner ? 'Partner Venue' : 'Venue Beacon'}
                  </div>
                  <h1 className="mt-5 text-4xl font-black tracking-tight sm:text-5xl">{venue.name}</h1>
                  <p className="mt-4 max-w-2xl text-base text-white/68">{venue.description ?? 'This venue is now part of the BaseDare memory layer.'}</p>
                  <div className="mt-5 flex flex-wrap items-center gap-4 text-sm text-white/55">
                    <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                      <MapPin className="h-4 w-4 text-amber-300" />
                      {venue.address ? `${venue.address}, ` : ''}{venue.city}, {venue.country}
                    </span>
                    <span className="inline-flex items-center gap-2 rounded-full border border-cyan-400/14 bg-cyan-500/[0.06] px-3 py-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                      <Waves className="h-4 w-4 text-cyan-300" />
                      {venue.liveSession?.campaignLabel ?? 'Venue check-in live'}
                    </span>
                    <span className="inline-flex items-center gap-2 rounded-full border border-amber-400/16 bg-amber-500/[0.06] px-3 py-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                      <Activity className="h-4 w-4 text-amber-200" />
                      Heat {venue.tagSummary.heatScore}
                    </span>
                    <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                      <ShieldCheck className="h-4 w-4 text-fuchsia-200" />
                      {venue.tagSummary.approvedCount} marks
                    </span>
                  </div>
                </div>

                <div className="grid min-w-[260px] gap-3 sm:grid-cols-2 lg:grid-cols-1">
                  <div className={`${softCardClass} px-5 py-4`}>
                    <div className="pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-white/22 to-transparent" />
                    <p className="text-xs uppercase tracking-[0.25em] text-white/40">Venue Command Center</p>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-lg font-bold">
                        {venue.commandCenter.consoleUrl
                          ? 'Open live QR console'
                          : venue.commandCenter.claimState === 'pending'
                            ? 'Claim pending'
                            : 'Claim this venue'}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-white/58">{venue.commandCenter.summary}</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {venue.commandCenter.consoleUrl ? (
                        <Link
                          href={`/brands/portal?venue=${encodeURIComponent(venue.slug)}&compose=1`}
                          className="inline-flex items-center gap-2 rounded-full border border-cyan-400/24 bg-cyan-500/[0.1] px-4 py-2 text-sm font-semibold text-cyan-100 shadow-[0_12px_22px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.08)] transition hover:-translate-y-[1px] hover:border-cyan-300/38 hover:bg-cyan-500/[0.14]"
                        >
                          Launch Activation
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      ) : null}
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
                  <div className={`${softCardClass} px-5 py-4`}>
                    <div className="pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-white/22 to-transparent" />
                    <p className="text-xs uppercase tracking-[0.25em] text-white/40">Ops Snapshot</p>
                    <div className="mt-2 grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-white/40">Visitors</p>
                        <p className="mt-1 text-lg font-bold">
                          {venueOpsMetrics.uniqueVisitorsToday ?? 'Pilot'}
                        </p>
                      </div>
                      <div>
                        <p className="text-white/40">Live funding</p>
                        <p className="mt-1 text-lg font-bold">${venueOpsMetrics.totalLiveFundingUsd.toFixed(0)}</p>
                      </div>
                      <div>
                        <p className="text-white/40">Marks</p>
                        <p className="mt-1 text-lg font-bold">{venueOpsMetrics.approvedMarks}</p>
                      </div>
                      <div>
                        <p className="text-white/40">Scans/hr</p>
                        <p className="mt-1 text-lg font-bold">{venueOpsMetrics.scansLastHour ?? 'Pilot'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="relative grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className={`${softCardClass} p-5`}>
                  <div className="pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                  <p className="text-xs uppercase tracking-[0.25em] text-white/40">Scans Last Hour</p>
                  <div className="mt-3 inline-flex items-center gap-3">
                    <Activity className="h-5 w-5 text-emerald-300" />
                    <span className="text-3xl font-black">{venue.liveStats.scansLastHour}</span>
                  </div>
                </div>
                <div className={`${softCardClass} p-5`}>
                  <div className="pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                  <p className="text-xs uppercase tracking-[0.25em] text-white/40">Unique Visitors Today</p>
                  <div className="mt-3 text-3xl font-black">{venue.liveStats.uniqueVisitorsToday}</div>
                </div>
                <div className={`${softCardClass} p-5`}>
                  <div className="pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                  <p className="text-xs uppercase tracking-[0.25em] text-white/40">Active Dares</p>
                  <div className="mt-3 text-3xl font-black">{venue.liveStats.activeDares}</div>
                </div>
              </div>

              <div className={`${softCardClass} p-6`}>
                <div className="pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-white/22 to-transparent" />
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.25em] text-white/40">Active Challenges</p>
                    <h2 className="mt-2 text-2xl font-bold">Funded missions live at this place</h2>
                    <p className="mt-3 max-w-2xl text-sm text-white/60">
                      This is where the place turns into a real attention market. Open challenges here can become permanent memory once someone completes and verifies them.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <div className="rounded-full border border-[#f5c518]/20 bg-[#f5c518]/[0.08] px-4 py-2 text-sm text-[#f8dd72] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                      {venue.activeDares.length} live
                    </div>
                    <div className="rounded-full border border-emerald-400/18 bg-emerald-500/[0.08] px-4 py-2 text-sm text-emerald-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                      ${totalActiveChallengeFunding.toFixed(0)} funded
                    </div>
                    {venue.activeDares.length === 0 ? (
                      <div className="rounded-full border border-fuchsia-400/18 bg-fuchsia-500/[0.08] px-4 py-2 text-sm text-fuchsia-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                        first activation open
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
                    <Link
                      href={mapHref}
                      className="rounded-full border border-fuchsia-400/24 bg-fuchsia-500/[0.1] px-4 py-2 text-sm font-semibold text-fuchsia-100 shadow-[0_12px_22px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.08)] transition hover:-translate-y-[1px] hover:border-fuchsia-300/38 hover:bg-fuchsia-500/[0.14]"
                    >
                      Open on map to create challenge
                    </Link>
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
                          This is the live activation your dashboard pointed you to at this venue.
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
                          First activation open
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
                        Open this place on the map to fund the first challenge and turn passive venue memory into a live participation surface.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className={`${softCardClass} p-6`}>
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

              <div className={`${softCardClass} p-6`}>
                <div className="pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-white/22 to-transparent" />
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.25em] text-white/40">Top Creators For This Venue</p>
                    <h2 className="mt-2 text-2xl font-bold">Route proven people into this place faster</h2>
                    <p className="mt-3 max-w-2xl text-sm text-white/60">
                      These creators already have signal here. Use them as the fastest path from venue momentum to a funded activation.
                    </p>
                  </div>
                  <Link
                    href={`/brands/portal?venue=${encodeURIComponent(venue.slug)}&compose=1`}
                    className="inline-flex items-center gap-2 self-start rounded-full border border-fuchsia-400/24 bg-fuchsia-500/[0.1] px-4 py-2 text-sm font-semibold text-fuchsia-100 shadow-[0_12px_22px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.08)] transition hover:-translate-y-[1px] hover:border-fuchsia-300/38 hover:bg-fuchsia-500/[0.14]"
                  >
                    Launch with venue prefilled
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>

                {topCreatorRoutes.length === 0 ? (
                  <div className={`${insetCardClass} mt-5 px-4 py-5`}>
                    <p className="text-sm text-white/78">
                      No strong venue-fit creator yet. Launch the next activation and this recommendation layer will start filling itself in.
                    </p>
                  </div>
                ) : (
                  <div className="mt-5 grid gap-3 xl:grid-cols-3">
                    {topCreatorRoutes.map((creator) => (
                      <div
                        key={`${creator.walletAddress}-${creator.creatorTag}`}
                        className={`${insetCardClass} flex h-full flex-col px-4 py-4`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-lg font-bold text-white">{creator.creatorTag}</div>
                            <div className="mt-1 text-[11px] uppercase tracking-[0.18em] text-white/42">
                              {creator.trustLabel} level {creator.trustLevel}
                            </div>
                          </div>
                          <div className="rounded-full border border-cyan-400/18 bg-cyan-500/[0.08] px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] text-cyan-100">
                            {creator.trustScore} trust
                          </div>
                        </div>

                        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                          <div className="rounded-[16px] border border-white/10 bg-white/[0.03] px-2 py-2">
                            <div className="text-lg font-black text-white">{creator.marksHere}</div>
                            <div className="text-[10px] uppercase tracking-[0.16em] text-white/42">Marks</div>
                          </div>
                          <div className="rounded-[16px] border border-white/10 bg-white/[0.03] px-2 py-2">
                            <div className="text-lg font-black text-[#f8dd72]">{creator.firstMarksHere}</div>
                            <div className="text-[10px] uppercase tracking-[0.16em] text-white/42">First sparks</div>
                          </div>
                          <div className="rounded-[16px] border border-white/10 bg-white/[0.03] px-2 py-2">
                            <div className="text-lg font-black text-emerald-100">${Math.round(creator.totalEarned)}</div>
                            <div className="text-[10px] uppercase tracking-[0.16em] text-white/42">Earned</div>
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

                        <div className="mt-4 flex flex-wrap gap-2">
                          <Link
                            href={creator.href}
                            className="inline-flex items-center gap-2 rounded-full border border-fuchsia-400/24 bg-fuchsia-500/[0.1] px-4 py-2 text-sm font-semibold text-fuchsia-100 shadow-[0_12px_22px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.08)] transition hover:-translate-y-[1px] hover:border-fuchsia-300/38 hover:bg-fuchsia-500/[0.14]"
                          >
                            Route creator
                            <ArrowRight className="h-4 w-4" />
                          </Link>
                          <Link
                            href={`/creator/${encodeURIComponent(creator.creatorTag)}`}
                            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-white/72 transition hover:-translate-y-[1px] hover:border-white/18 hover:bg-white/[0.08] hover:text-white"
                          >
                            View profile
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
                      First mark open. The first approved memory here becomes the venue&apos;s opening legend.
                    </div>
                  ) : null}
                  {venue.recentTags.length > 0 ? (
                    <div className="max-h-[34rem] space-y-3 overflow-y-auto pr-1">
                      {venue.recentTags.map((tag) => (
                        <div
                          key={tag.id}
                          className={`${insetCardClass} flex items-start gap-4 px-4 py-4 ${
                            tag.isOwn
                              ? 'border-fuchsia-400/18 bg-[linear-gradient(180deg,rgba(168,85,247,0.08)_0%,rgba(10,10,18,0.92)_100%)] shadow-[0_18px_32px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.08),inset_0_-12px_18px_rgba(88,28,135,0.18)]'
                              : ''
                          }`}
                        >
                          <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-[18px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05)_0%,rgba(8,10,18,0.96)_100%)] shadow-[0_14px_28px_rgba(0,0,0,0.16),inset_0_1px_0_rgba(255,255,255,0.06)]">
                            {tag.proofType === 'IMAGE' ? (
                              <div
                                className="absolute inset-0 bg-cover bg-center"
                                style={{ backgroundImage: `url(${tag.proofMediaUrl})` }}
                              />
                            ) : (
                              <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(168,85,247,0.22),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.04)_0%,rgba(6,7,14,0.96)_100%)]" />
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                            <div className="absolute bottom-2 left-2 rounded-full border border-white/10 bg-black/40 px-2 py-0.5 text-[9px] uppercase tracking-[0.18em] text-white/70 backdrop-blur-sm">
                              {tag.proofType === 'VIDEO' ? 'video proof' : 'image proof'}
                            </div>
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="truncate font-semibold text-white">
                                    {tag.creatorTag ?? `${tag.walletAddress.slice(0, 6)}...${tag.walletAddress.slice(-4)}`}
                                  </p>
                                  <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-white/42">
                                    {getLogbookSourceLabel(tag.source)}
                                  </span>
                                  {tag.isOwn ? (
                                    <span className="rounded-full border border-fuchsia-400/18 bg-fuchsia-500/[0.08] px-2 py-1 text-[10px] uppercase tracking-[0.22em] text-fuchsia-100">
                                      your mark
                                    </span>
                                  ) : null}
                                  {tag.firstMark ? (
                                    <span className="rounded-full border border-amber-400/18 bg-amber-500/[0.08] px-2 py-1 text-[10px] uppercase tracking-[0.22em] text-amber-200">
                                      first mark
                                    </span>
                                  ) : null}
                                </div>
                                <p className="mt-2 text-sm leading-relaxed text-white/64">
                                  {tag.caption ?? 'Verified place mark submitted through BaseDare.'}
                                </p>
                              </div>
                              <div className="text-left sm:text-right">
                                <p className="text-[11px] uppercase tracking-[0.22em] text-white/36">
                                  {formatVenueLogbookDate(tag.submittedAt)}
                                </p>
                              </div>
                            </div>
                            {tag.vibeTags.length > 0 ? (
                              <div className="mt-3 flex flex-wrap gap-2">
                                {tag.vibeTags.slice(0, 4).map((vibeTag) => (
                                  <span
                                    key={vibeTag}
                                    className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-white/48"
                                  >
                                    #{vibeTag}
                                  </span>
                                ))}
                              </div>
                            ) : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className={`${insetCardClass} px-4 py-5`}>
                      <p className="text-sm text-white/58">
                        No verified marks yet. The first approved tag here will start the place-memory timeline.
                      </p>
                    </div>
                  )}
                </div>
              </div>

            </div>

            <div className="space-y-6">
              <div className={`${softCardClass} p-6`}>
                <div className="pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-white/22 to-transparent" />
                <p className="text-xs uppercase tracking-[0.25em] text-white/40">Handshake Status</p>
                <div className="mt-4 space-y-3">
                  <div className={`${insetCardClass} flex items-center justify-between px-4 py-4`}>
                    <span className="text-sm text-white/55">Mode</span>
                    <span className="font-semibold">{venue.qrMode}</span>
                  </div>
                  <div className={`${insetCardClass} flex items-center justify-between px-4 py-4`}>
                    <span className="text-sm text-white/55">Rotation</span>
                    <span className="font-semibold">{venue.qrRotationSeconds}s</span>
                  </div>
                  <div className={`${insetCardClass} flex items-center justify-between px-4 py-4`}>
                    <span className="text-sm text-white/55">Session</span>
                    <span className={`font-semibold ${
                      venue.liveSession?.status === 'LIVE' ? 'text-emerald-300' : 'text-white/65'
                    }`}>
                      {venue.liveSession?.status ?? 'OFFLINE'}
                    </span>
                  </div>
                  <div className={`${insetCardClass} flex items-center justify-between px-4 py-4`}>
                    <span className="text-sm text-white/55">Last Check-In</span>
                    <span className="font-semibold">
                      {venue.liveSession?.lastCheckInAt
                        ? new Date(venue.liveSession.lastCheckInAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
                        : 'None yet'}
                    </span>
                  </div>
                </div>
              </div>

              <div className={`${softCardClass} p-6`}>
                <div className="pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-white/22 to-transparent" />
                <div className="flex items-center gap-2">
                  <Clock3 className="h-4 w-4 text-amber-300" />
                  <p className="text-xs uppercase tracking-[0.25em] text-white/40">Recent Presence</p>
                </div>
                <div className="mt-4 space-y-3">
                  {venue.recentCheckIns.length > 0 ? (
                    venue.recentCheckIns.map((checkIn) => (
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
                    <p className="text-sm text-white/55">This venue has not logged any public check-ins yet.</p>
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
