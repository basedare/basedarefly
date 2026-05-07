import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  CheckCircle2,
  Clock3,
  Film,
  Flame,
  MapPin,
  QrCode,
  ShieldCheck,
  Sparkles,
  Trophy,
  Users,
  Wallet,
  Waves,
} from 'lucide-react';
import { getVenueDetailBySlug } from '@/lib/venues';
import {
  buildRepeatActivationComposerHref,
  buildVenueActivationIntakeHref,
  buildVenueChallengeCreateHref,
} from '@/lib/venue-launch';
import type { VenueDetail, VenueTimelineMoment } from '@/lib/venue-types';
import VenuePageShell from '../../VenuePageShell';
import VenueReportTrackedLink from '../report/VenueReportTrackedLink';
import VenueRecapActions from './VenueRecapActions';

const raisedPanelClass =
  'relative overflow-hidden rounded-[30px] border border-white/[0.09] bg-[linear-gradient(180deg,rgba(255,255,255,0.07)_0%,rgba(255,255,255,0.025)_14%,rgba(10,9,18,0.9)_58%,rgba(7,6,14,0.96)_100%)] shadow-[0_28px_90px_rgba(0,0,0,0.4),0_0_28px_rgba(168,85,247,0.07),inset_0_1px_0_rgba(255,255,255,0.1),inset_0_-18px_24px_rgba(0,0,0,0.24)]';

const softCardClass =
  'relative overflow-hidden rounded-[26px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(255,255,255,0.06)_0%,rgba(255,255,255,0.02)_12%,rgba(10,10,18,0.92)_100%)] shadow-[0_18px_30px_rgba(0,0,0,0.22),inset_0_1px_0_rgba(255,255,255,0.08),inset_0_-12px_18px_rgba(0,0,0,0.22)]';

const insetCardClass =
  'rounded-[22px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(4,5,10,0.72)_0%,rgba(11,11,18,0.92)_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.06),inset_0_-10px_16px_rgba(0,0,0,0.26)]';

type RecapStatus = 'verified' | 'active' | 'armed';

function formatCompactMetric(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 10_000) return `${Math.round(value / 1_000)}K`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return String(Math.max(0, Math.round(value)));
}

function formatCurrency(value: number) {
  return `$${Math.max(0, Math.round(value)).toLocaleString()}`;
}

function formatRecapDate(value: string | null | undefined) {
  if (!value) return 'Not recorded';

  return new Date(value).toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatRecapTime(value: string | null | undefined) {
  if (!value) return 'Waiting';

  return new Date(value).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function getRecapStatus(input: {
  verifiedOutcomes: number;
  proofs: number;
  checkIns: number;
  activeDares: number;
}): RecapStatus {
  if (input.verifiedOutcomes > 0 || input.proofs > 0) return 'verified';
  if (input.checkIns > 0 || input.activeDares > 0) return 'active';
  return 'armed';
}

function getRecapStatusCopy(status: RecapStatus) {
  switch (status) {
    case 'verified':
      return {
        label: 'Verified Activity',
        title: 'The room produced proof.',
        detail:
          'There is enough signal to send the buyer a receipt and ask for the next activation while the venue memory is warm.',
        className: 'border-emerald-400/22 bg-emerald-500/[0.1] text-emerald-100',
      };
    case 'active':
      return {
        label: 'Live Activation',
        title: 'The signal is moving.',
        detail:
          'The venue has active rails. The strongest next step is to collect one proof moment and turn this into a repeatable receipt.',
        className: 'border-cyan-400/22 bg-cyan-500/[0.1] text-cyan-100',
      };
    case 'armed':
    default:
      return {
        label: 'Ready To Spark',
        title: 'The activation loop is armed.',
        detail:
          'The venue page, map presence, funding path, and proof rail are ready. One funded drop can start the receipt.',
        className: 'border-[#f5c518]/24 bg-[#f5c518]/[0.1] text-[#f8dd72]',
      };
  }
}

function buildContactHref(input: {
  topic: string;
  venue: VenueDetail;
  intent: string;
}) {
  const params = new URLSearchParams({
    topic: input.topic,
    venue: input.venue.name,
    venueSlug: input.venue.slug,
    source: 'venue-recap',
    intent: input.intent,
  });
  if (input.venue.city) params.set('city', input.venue.city);
  return `/contact?${params.toString()}`;
}

function buildSponsorVenueHref(venue: VenueDetail) {
  const params = new URLSearchParams({
    venue: venue.slug,
    compose: '1',
    source: 'venue-recap',
    objective: `Sponsor a BaseDare activation at ${venue.name}. Bring people into the room, capture proof, and leave a receipt the venue can repost.`,
  });
  return `/brands/portal?${params.toString()}`;
}

function getMomentTone(moment: VenueTimelineMoment) {
  if (moment.kind === 'DARE_COMPLETION') {
    return 'border-[#f5c518]/18 bg-[#f5c518]/[0.08] text-[#f8dd72]';
  }
  if (moment.status === 'PENDING') {
    return 'border-cyan-300/18 bg-cyan-500/[0.08] text-cyan-100';
  }
  return 'border-fuchsia-300/18 bg-fuchsia-500/[0.08] text-fuchsia-100';
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug } = await params;
  const venueLabel = slug
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
  const title = `${venueLabel || 'Venue'} Spark Receipt | BaseDare`;
  const description = `Verified venue activity, proof moments, creator output, and next activation rails for ${venueLabel || 'this BaseDare venue'}.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `https://basedare.xyz/venues/${slug}/recap`,
      siteName: 'BaseDare',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
    alternates: {
      canonical: `/venues/${slug}/recap`,
    },
  };
}

export default async function VenueRecapPage(
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const venue = await getVenueDetailBySlug(slug);

  if (!venue) {
    notFound();
  }

  const audience = 'venue' as const;
  const mapHref = `/map?place=${encodeURIComponent(venue.slug)}`;
  const reportHref = `/venues/${encodeURIComponent(venue.slug)}/report?audience=venue`;
  const venueHref = `/venues/${encodeURIComponent(venue.slug)}`;
  const fundNextDropHref = buildVenueChallengeCreateHref({
    venueId: venue.id,
    venueSlug: venue.slug,
    venueName: venue.name,
    payout: 60,
    source: 'venue',
  });
  const runAnotherSparkHref =
    buildRepeatActivationComposerHref({ venue }) ??
    buildVenueActivationIntakeHref({
      venueId: venue.id,
      venueSlug: venue.slug,
      venueName: venue.name,
      city: venue.city,
      payout: 120,
      goal: 'foot_traffic',
      buyerType: 'venue',
      packageId: 'pilot-drop',
      offerId: 'first-spark',
      source: 'venue',
    });
  const upgradeVenueMemoryHref = buildContactHref({
    topic: 'venue-memory',
    venue,
    intent: 'upgrade',
  });
  const sponsorVenueHref = buildSponsorVenueHref(venue);
  const consoleHref = venue.commandCenter.consoleUrl ?? `/venues/${encodeURIComponent(venue.slug)}/console`;

  const last7DayWindow = venue.roiSnapshot.windows.last7Days;
  const verifiedOutcomes = last7DayWindow.verifiedOutcomes;
  const checkIns = last7DayWindow.checkIns || venue.memorySummary?.checkInCount || venue.recentCheckIns.length;
  const uniqueVisitors = last7DayWindow.uniqueVisitors || venue.memorySummary?.uniqueVisitorCount || venue.recentCheckIns.length;
  const proofMoments = venue.timelineMoments.filter(
    (moment) => moment.kind === 'DARE_COMPLETION' || Boolean(moment.mediaUrl)
  );
  const completedMoments = venue.timelineMoments.filter((moment) => moment.kind === 'DARE_COMPLETION');
  const markMoments = venue.timelineMoments.filter((moment) => moment.kind === 'PLACE_MARK');
  const mediaMoments = venue.timelineMoments.filter((moment) => Boolean(moment.mediaUrl)).slice(0, 4);
  const timelineMoments = venue.timelineMoments.slice(0, 6);
  const proofCount = Math.max(last7DayWindow.proofs, proofMoments.length);
  const activeFunding = venue.activeDares.reduce((sum, dare) => sum + dare.bounty, 0);
  const completedFunding = completedMoments.reduce((sum, moment) => sum + (moment.rewardUsd ?? 0), 0);
  const totalFundingVisible = activeFunding + completedFunding;
  const recapStatus = getRecapStatus({
    verifiedOutcomes,
    proofs: proofCount,
    checkIns,
    activeDares: venue.activeDares.length,
  });
  const statusCopy = getRecapStatusCopy(recapStatus);
  const bestCreator = venue.roiSnapshot.bestCreator;
  const activationTitle =
    venue.featuredPaidActivation?.title ??
    venue.activationInsight.bestActivation?.title ??
    `${venue.name} First Spark`;
  const recapSubject = `${venue.name} BaseDare Spark Receipt`;
  const recapBrief = [
    `${venue.name} has a BaseDare Spark Receipt.`,
    `Last 7 days: ${verifiedOutcomes} verified outcomes, ${uniqueVisitors} unique visitors, ${checkIns} check-ins, ${proofCount} proof moment${proofCount === 1 ? '' : 's'}.`,
    `Visible funding: ${formatCurrency(totalFundingVisible)} across active drops and completed reward proof.`,
    `Top proving creator: ${bestCreator?.creatorTag ?? 'still emerging'}.`,
    `Recommended next move: run another Spark, upgrade Venue Memory, or sponsor the next venue night.`,
  ].join('\n');

  const metricCards = [
    {
      label: 'Verified visits',
      value: uniqueVisitors,
      detail: `${checkIns} check-in${checkIns === 1 ? '' : 's'} captured`,
      tone: 'text-cyan-100',
    },
    {
      label: 'Proof moments',
      value: proofCount,
      detail: `${completedMoments.length} reward proof${completedMoments.length === 1 ? '' : 's'}`,
      tone: 'text-[#f8dd72]',
    },
    {
      label: 'Creator output',
      value: markMoments.length + completedMoments.length,
      detail: `${markMoments.length} mark${markMoments.length === 1 ? '' : 's'} in memory`,
      tone: 'text-fuchsia-100',
    },
    {
      label: 'Visible funding',
      value: totalFundingVisible,
      detail: `${venue.activeDares.length} live drop${venue.activeDares.length === 1 ? '' : 's'}`,
      tone: 'text-emerald-100',
      currency: true,
    },
  ];

  const deliveredLoop = [
    {
      label: 'Venue Page',
      title: 'Live place memory',
      detail: `${venue.name} has a public venue node with map presence, creator marks, and a replayable story surface.`,
      complete: true,
      icon: <MapPin className="h-4 w-4" />,
    },
    {
      label: 'Secure Handshake',
      title: venue.liveSession?.status === 'LIVE' ? 'QR rail live' : 'QR rail ready',
      detail: `BaseDare Secure Handshakes support QR + GPS presence inside ${venue.checkInRadiusMeters}m with ${venue.qrRotationSeconds}s rotation.`,
      complete: Boolean(venue.liveSession) || venue.commandCenter.status === 'live',
      icon: <QrCode className="h-4 w-4" />,
    },
    {
      label: 'Funded Drop',
      title: venue.activeDares.length > 0 ? `${venue.activeDares.length} money route${venue.activeDares.length === 1 ? '' : 's'}` : 'First drop open',
      detail: venue.activeDares[0]
        ? `${venue.activeDares[0].title} is the current funded reason to show up.`
        : 'The next buyer can fund the first drop and own the cleanest signal at this venue.',
      complete: venue.activeDares.length > 0,
      icon: <Wallet className="h-4 w-4" />,
    },
    {
      label: 'Proof Trail',
      title: proofCount > 0 ? `${proofCount} proof signal${proofCount === 1 ? '' : 's'}` : 'Waiting for proof',
      detail: proofCount > 0
        ? 'Proof is visible enough to send the buyer a concrete recap instead of a vague campaign update.'
        : 'One completed dare, mark, or scan will give this activation its first proof relic.',
      complete: proofCount > 0,
      icon: <BadgeCheck className="h-4 w-4" />,
    },
  ];

  const closeCards = [
    {
      label: 'Run another Spark',
      title: venue.activationInsight.repeatReady ? 'Repeat the proven pattern' : 'Start the first paid pilot',
      detail: venue.activationInsight.repeatReady
        ? 'Use the best existing venue signal and run it again with cleaner creator routing.'
        : 'Launch a 7-day First Spark so the venue sees people, proof, and a clean recap.',
      href: runAnotherSparkHref,
      intent: 'repeat' as const,
      className: 'border-[#f5c518]/24 bg-[#f5c518]/[0.12] text-[#f8dd72]',
      icon: <Flame className="h-4 w-4" />,
    },
    {
      label: 'Upgrade Venue Memory',
      title: 'Turn the pilot into owned venue history',
      detail: 'Claim the QR console, proof archive, recurring activations, and featured map placement after value is visible.',
      href: upgradeVenueMemoryHref,
      intent: 'activation' as const,
      className: 'border-cyan-400/24 bg-cyan-500/[0.1] text-cyan-100',
      icon: <ShieldCheck className="h-4 w-4" />,
    },
    {
      label: 'Sponsor this venue',
      title: 'Put brand money behind the next night',
      detail: 'Route a sponsor into the venue while the receipt gives them proof that this place can move people.',
      href: sponsorVenueHref,
      intent: 'activation' as const,
      className: 'border-fuchsia-400/24 bg-fuchsia-500/[0.1] text-fuchsia-100',
      icon: <Sparkles className="h-4 w-4" />,
    },
  ];

  return (
    <VenuePageShell mapHref={venueHref}>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(168,85,247,0.12),transparent_28%),radial-gradient(circle_at_12%_72%,rgba(34,211,238,0.08),transparent_24%),radial-gradient(circle_at_90%_86%,rgba(250,204,21,0.06),transparent_22%)]" />
      <main className="relative mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <section className="space-y-6">
          <div className={`${raisedPanelClass} px-5 py-7 sm:px-8 sm:py-8`}>
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_0%,rgba(245,197,24,0.13),transparent_30%),radial-gradient(circle_at_88%_8%,rgba(34,211,238,0.1),transparent_35%),radial-gradient(circle_at_72%_100%,rgba(168,85,247,0.12),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.045)_0%,transparent_36%,rgba(0,0,0,0.24)_100%)]" />
            <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-yellow-100/34 to-transparent" />
            <div className="relative grid gap-7 lg:grid-cols-[1fr_0.72fr] lg:items-start">
              <div>
                <div className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] shadow-[0_12px_24px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.12)] ${statusCopy.className}`}>
                  <CheckCircle2 className="h-4 w-4" />
                  Spark Receipt
                </div>
                <h1 className="mt-5 max-w-4xl text-4xl font-black tracking-tight sm:text-5xl">
                  What happened at {venue.name}
                </h1>
                <p className="mt-4 max-w-2xl text-base leading-7 text-white/68">
                  {statusCopy.title} This page is the forwardable proof object: people in the room, money on the table, creator output, and the next commercial move.
                </p>
                <div className="mt-5 flex flex-wrap items-center gap-3 text-sm text-white/55">
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                    <MapPin className="h-4 w-4 text-amber-300" />
                    {venue.address ? `${venue.address}, ` : ''}{venue.city}, {venue.country}
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full border border-cyan-400/14 bg-cyan-500/[0.06] px-3 py-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                    <Waves className="h-4 w-4 text-cyan-300" />
                    {venue.liveSession?.campaignLabel ?? 'Venue memory layer'}
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full border border-amber-400/16 bg-amber-500/[0.06] px-3 py-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                    <Clock3 className="h-4 w-4 text-amber-200" />
                    {formatRecapDate(venue.memorySummary?.bucketStartAt ?? venue.activeDares[0]?.createdAt)}
                  </span>
                </div>
                <div className="mt-5">
                  <VenueRecapActions
                    venueSlug={venue.slug}
                    shareSubject={recapSubject}
                    shareBody={recapBrief}
                    audience={audience}
                  />
                </div>
              </div>

              <div className={`${softCardClass} px-5 py-5`}>
                <div className="pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-white/22 to-transparent" />
                <p className="text-xs uppercase tracking-[0.25em] text-white/40">{statusCopy.label}</p>
                <h2 className="mt-2 text-2xl font-black text-white">{activationTitle}</h2>
                <p className="mt-3 text-sm leading-6 text-white/58">{statusCopy.detail}</p>
                <div className="mt-5 grid gap-2">
                  <VenueReportTrackedLink
                    href={runAnotherSparkHref}
                    venueSlug={venue.slug}
                    audience={audience}
                    intent="repeat"
                    className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-[#f5c518]/24 bg-[#f5c518]/[0.12] px-4 py-3 text-xs font-black uppercase tracking-[0.16em] text-[#f8dd72] shadow-[0_16px_28px_rgba(0,0,0,0.22),inset_0_1px_0_rgba(255,255,255,0.1)] transition hover:-translate-y-[1px] hover:border-[#f5c518]/42 hover:bg-[#f5c518]/[0.17]"
                  >
                    Run another Spark
                    <ArrowRight className="h-4 w-4" />
                  </VenueReportTrackedLink>
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                    <Link
                      href={fundNextDropHref}
                      className="inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-white/72 transition hover:-translate-y-[1px] hover:border-white/18 hover:bg-white/[0.08] hover:text-white"
                    >
                      Fund drop
                    </Link>
                    <Link
                      href={mapHref}
                      className="inline-flex items-center justify-center gap-2 rounded-full border border-cyan-400/18 bg-cyan-500/[0.08] px-4 py-2 text-sm font-semibold text-cyan-100 transition hover:-translate-y-[1px] hover:border-cyan-300/34 hover:bg-cyan-500/[0.12]"
                    >
                      Open map
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {metricCards.map((metric) => (
              <div key={metric.label} className={`${softCardClass} px-4 py-4`}>
                <div className="pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                <p className="text-[11px] uppercase tracking-[0.22em] text-white/36">{metric.label}</p>
                <p className={`mt-3 text-3xl font-black ${metric.tone}`}>
                  {metric.currency ? formatCurrency(metric.value) : formatCompactMetric(metric.value)}
                </p>
                <p className="mt-2 text-sm leading-5 text-white/52">{metric.detail}</p>
              </div>
            ))}
          </div>

          <div className={`${raisedPanelClass} px-5 py-6 sm:px-7`}>
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_8%_0%,rgba(34,211,238,0.12),transparent_34%),radial-gradient(circle_at_92%_12%,rgba(245,197,24,0.1),transparent_32%),linear-gradient(180deg,rgba(255,255,255,0.04)_0%,transparent_42%,rgba(0,0,0,0.24)_100%)]" />
            <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-cyan-100/34 to-transparent" />
            <div className="relative">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.28em] text-cyan-100/58">
                    Activation Loop Delivered
                  </p>
                  <h2 className="mt-2 text-2xl font-black tracking-[-0.035em] text-white sm:text-3xl">
                    Not an impression report. A proof receipt.
                  </h2>
                </div>
                <Link
                  href={reportHref}
                  className="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/[0.045] px-4 py-2 text-sm font-semibold text-white/72 transition hover:-translate-y-[1px] hover:border-white/18 hover:bg-white/[0.08] hover:text-white"
                >
                  Open report card
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {deliveredLoop.map((item) => (
                  <div key={item.label} className={`${insetCardClass} flex min-h-[13rem] flex-col px-4 py-4`}>
                    <div className="flex items-start justify-between gap-3">
                      <span className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${
                        item.complete
                          ? 'border-emerald-400/18 bg-emerald-500/[0.08] text-emerald-100'
                          : 'border-white/10 bg-white/[0.04] text-white/48'
                      }`}>
                        {item.icon}
                        {item.label}
                      </span>
                      <CheckCircle2 className={`h-4 w-4 ${item.complete ? 'text-emerald-200' : 'text-white/22'}`} />
                    </div>
                    <p className="mt-4 text-xl font-black text-white">{item.title}</p>
                    <p className="mt-2 flex-1 text-sm leading-relaxed text-white/58">{item.detail}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.12fr_0.88fr]">
            <div className="space-y-6">
              <div className={`${softCardClass} p-6`}>
                <div className="pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-white/22 to-transparent" />
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.25em] text-white/40">Proof Timeline</p>
                    <h2 className="mt-2 text-2xl font-bold">What the venue can point to</h2>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-white/58">
                      The strongest receipts have timestamped presence, a visible creator action, and a proof object the venue can reuse.
                    </p>
                  </div>
                  <span className="w-fit rounded-full border border-[#f5c518]/18 bg-[#f5c518]/[0.08] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-[#f8dd72]">
                    {timelineMoments.length} moments
                  </span>
                </div>

                <div className="mt-5 space-y-3">
                  {timelineMoments.length > 0 ? (
                    timelineMoments.map((moment) => {
                      const card = (
                        <div className={`${insetCardClass} group flex items-start gap-4 px-4 py-4 transition hover:border-white/14 hover:bg-white/[0.035]`}>
                          <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-[20px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05)_0%,rgba(8,10,18,0.96)_100%)] shadow-[0_14px_28px_rgba(0,0,0,0.16),inset_0_1px_0_rgba(255,255,255,0.06)] sm:h-24 sm:w-24">
                            {moment.mediaUrl && moment.mediaType === 'IMAGE' ? (
                              <div
                                className="absolute inset-0 bg-cover bg-center"
                                style={{ backgroundImage: `url(${moment.mediaUrl})` }}
                              />
                            ) : (
                              <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_20%,rgba(245,197,24,0.24),transparent_34%),radial-gradient(circle_at_80%_85%,rgba(34,211,238,0.16),transparent_36%),linear-gradient(180deg,rgba(255,255,255,0.04)_0%,rgba(6,7,14,0.96)_100%)]" />
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/68 via-transparent to-transparent" />
                            <div className="absolute bottom-2 left-2 rounded-full border border-white/10 bg-black/46 px-2 py-0.5 text-[9px] uppercase tracking-[0.16em] text-white/70 backdrop-blur-sm">
                              {moment.kind === 'DARE_COMPLETION' ? 'reward proof' : 'venue mark'}
                            </div>
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className={`rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] ${getMomentTone(moment)}`}>
                                {moment.sourceLabel}
                              </span>
                              {moment.rewardUsd ? (
                                <span className="rounded-full border border-[#f5c518]/18 bg-[#f5c518]/[0.08] px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-[#f8dd72]">
                                  {formatCurrency(moment.rewardUsd)}
                                </span>
                              ) : null}
                              <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-white/42">
                                {formatRecapDate(moment.occurredAt)}
                              </span>
                            </div>
                            <p className="mt-3 text-lg font-bold text-white">{moment.title}</p>
                            <p className="mt-1.5 text-sm leading-6 text-white/62">{moment.body}</p>
                            <p className="mt-2 text-xs uppercase tracking-[0.18em] text-white/36">
                              {moment.creatorLabel}
                            </p>
                          </div>
                          {moment.shortId ? (
                            <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-white/32 transition group-hover:translate-x-1 group-hover:text-white/68" />
                          ) : null}
                        </div>
                      );

                      return moment.shortId ? (
                        <Link key={moment.id} href={`/dare/${moment.shortId}`}>
                          {card}
                        </Link>
                      ) : (
                        <div key={moment.id}>{card}</div>
                      );
                    })
                  ) : (
                    <div className={`${insetCardClass} px-4 py-5`}>
                      <p className="text-sm leading-6 text-white/58">
                        No public proof moment has landed yet. Fund the first drop or run the venue QR console to create the first receipt object.
                      </p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <Link
                          href={fundNextDropHref}
                          className="inline-flex items-center gap-2 rounded-full border border-[#f5c518]/24 bg-[#f5c518]/[0.1] px-4 py-2 text-sm font-semibold text-[#f8dd72] transition hover:-translate-y-[1px] hover:border-[#f5c518]/38 hover:bg-[#f5c518]/[0.14]"
                        >
                          Fund first drop
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                        <Link
                          href={consoleHref}
                          className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-500/[0.08] px-4 py-2 text-sm font-semibold text-cyan-100 transition hover:-translate-y-[1px] hover:border-cyan-300/34 hover:bg-cyan-500/[0.12]"
                        >
                          Open console
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className={`${softCardClass} p-6`}>
                <div className="pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-white/22 to-transparent" />
                <div className="flex items-center gap-2">
                  <Film className="h-4 w-4 text-fuchsia-200" />
                  <p className="text-xs uppercase tracking-[0.25em] text-white/40">Media Output</p>
                </div>
                <h2 className="mt-2 text-2xl font-bold">Reusable venue moments</h2>
                <p className="mt-2 text-sm leading-6 text-white/58">
                  Clips and proof marks are the venue&apos;s reusable output. This is what makes the activation feel less like an ad buy and more like a story.
                </p>

                <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                  {mediaMoments.length > 0 ? (
                    mediaMoments.map((moment) => (
                      <div key={`media-${moment.id}`} className={`${insetCardClass} overflow-hidden`}>
                        <div className="relative h-40 overflow-hidden border-b border-white/10 bg-black/30">
                          {moment.mediaUrl && moment.mediaType === 'IMAGE' ? (
                            <div
                              className="absolute inset-0 bg-cover bg-center"
                              style={{ backgroundImage: `url(${moment.mediaUrl})` }}
                            />
                          ) : (
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_22%_18%,rgba(168,85,247,0.24),transparent_36%),radial-gradient(circle_at_84%_82%,rgba(34,211,238,0.18),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.04)_0%,rgba(6,7,14,0.96)_100%)]" />
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/72 via-transparent to-transparent" />
                          <div className="absolute bottom-3 left-3 rounded-full border border-white/10 bg-black/44 px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] text-white/70 backdrop-blur-sm">
                            {moment.mediaType === 'VIDEO' ? 'video proof' : 'image proof'}
                          </div>
                        </div>
                        <div className="px-4 py-4">
                          <p className="text-sm font-bold text-white">{moment.title}</p>
                          <p className="mt-1 text-xs uppercase tracking-[0.18em] text-white/38">
                            {moment.creatorLabel} · {formatRecapDate(moment.occurredAt)}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className={`${insetCardClass} px-4 py-5`}>
                      <p className="text-sm leading-6 text-white/58">
                        No reusable media is attached yet. The recap still works as a proof rail, but the next Spark should force one clear content deliverable.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className={`${softCardClass} p-6`}>
                <div className="pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-white/22 to-transparent" />
                <div className="flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-[#f8dd72]" />
                  <p className="text-xs uppercase tracking-[0.25em] text-white/40">Creator Signal</p>
                </div>
                <h2 className="mt-2 text-2xl font-bold">
                  {bestCreator?.creatorTag ?? 'Local legend still forming'}
                </h2>
                <p className="mt-2 text-sm leading-6 text-white/58">
                  {bestCreator
                    ? `${bestCreator.creatorTag} currently has the strongest venue-specific proof signal: ${bestCreator.marksHere} marks here, ${bestCreator.completedDares} completed dares, and ${formatCurrency(bestCreator.totalEarned)} earned.`
                    : 'One more proof moment will make the strongest creator route easier to sell to the venue or sponsor.'}
                </p>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className={`${insetCardClass} px-4 py-4`}>
                    <p className="text-[10px] uppercase tracking-[0.18em] text-white/36">Top creator</p>
                    <p className="mt-2 truncate text-lg font-black text-white">{bestCreator?.creatorTag ?? 'Emerging'}</p>
                  </div>
                  <div className={`${insetCardClass} px-4 py-4`}>
                    <p className="text-[10px] uppercase tracking-[0.18em] text-white/36">Trust</p>
                    <p className="mt-2 text-lg font-black text-cyan-100">
                      {bestCreator ? `${bestCreator.trustLabel} L${bestCreator.trustLevel}` : 'Building'}
                    </p>
                  </div>
                </div>
              </div>

              <div className={`${softCardClass} p-6`}>
                <div className="pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-white/22 to-transparent" />
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-cyan-200" />
                  <p className="text-xs uppercase tracking-[0.25em] text-white/40">Ops Snapshot</p>
                </div>
                <div className="mt-4 space-y-3">
                  <div className={`${insetCardClass} flex items-center justify-between gap-4 px-4 py-4`}>
                    <span className="text-sm text-white/55">Last check-in</span>
                    <span className="font-semibold text-white">{formatRecapTime(venue.liveSession?.lastCheckInAt)}</span>
                  </div>
                  <div className={`${insetCardClass} flex items-center justify-between gap-4 px-4 py-4`}>
                    <span className="text-sm text-white/55">QR session</span>
                    <span className="font-semibold text-white">{venue.liveSession?.status ?? 'Ready'}</span>
                  </div>
                  <div className={`${insetCardClass} flex items-center justify-between gap-4 px-4 py-4`}>
                    <span className="text-sm text-white/55">Scans last hour</span>
                    <span className="font-semibold text-white">{venue.liveStats.scansLastHour}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className={`${raisedPanelClass} px-5 py-6 sm:px-7`}>
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_0%,rgba(245,197,24,0.13),transparent_34%),radial-gradient(circle_at_92%_20%,rgba(168,85,247,0.12),transparent_32%),linear-gradient(180deg,rgba(255,255,255,0.04)_0%,transparent_42%,rgba(0,0,0,0.24)_100%)]" />
            <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-yellow-100/35 to-transparent" />
            <div className="relative">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.28em] text-[#f8dd72]/70">
                    Close The Loop
                  </p>
                  <h2 className="mt-2 text-2xl font-black tracking-[-0.035em] text-white sm:text-3xl">
                    The receipt should sell the next move.
                  </h2>
                </div>
                <span className="w-fit rounded-full border border-white/10 bg-white/[0.045] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-white/52">
                  pilot to paid ladder
                </span>
              </div>

              <div className="mt-5 grid gap-4 lg:grid-cols-3">
                {closeCards.map((card) => (
                  <div key={card.label} className={`${insetCardClass} flex min-h-[18rem] flex-col px-5 py-5`}>
                    <span className={`inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] ${card.className}`}>
                      {card.icon}
                      {card.label}
                    </span>
                    <h3 className="mt-4 text-xl font-black text-white">{card.title}</h3>
                    <p className="mt-2 flex-1 text-sm leading-6 text-white/58">{card.detail}</p>
                    <VenueReportTrackedLink
                      href={card.href}
                      venueSlug={venue.slug}
                      audience={audience}
                      intent={card.intent}
                      className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-4 py-3 text-xs font-black uppercase tracking-[0.16em] text-white/76 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition hover:-translate-y-[1px] hover:border-white/18 hover:bg-white/[0.08] hover:text-white"
                    >
                      Open rail
                      <ArrowRight className="h-4 w-4" />
                    </VenueReportTrackedLink>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap justify-center gap-2 pb-4">
            <Link
              href={venueHref}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-white/72 transition hover:-translate-y-[1px] hover:border-white/18 hover:bg-white/[0.08] hover:text-white"
            >
              Venue page
            </Link>
            <Link
              href={reportHref}
              className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-500/[0.08] px-4 py-2 text-sm font-semibold text-cyan-100 transition hover:-translate-y-[1px] hover:border-cyan-300/34 hover:bg-cyan-500/[0.12]"
            >
              <BarChart3 className="h-4 w-4" />
              Report card
            </Link>
            <Link
              href={consoleHref}
              className="inline-flex items-center gap-2 rounded-full border border-fuchsia-400/20 bg-fuchsia-500/[0.08] px-4 py-2 text-sm font-semibold text-fuchsia-100 transition hover:-translate-y-[1px] hover:border-fuchsia-300/34 hover:bg-fuchsia-500/[0.12]"
            >
              Command console
            </Link>
          </div>
        </section>
      </main>
    </VenuePageShell>
  );
}
