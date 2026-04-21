import { notFound } from 'next/navigation';
import { Activity, ArrowRight, BarChart3, Flame, MapPin, Users, Waves } from 'lucide-react';
import { getVenueDetailBySlug } from '@/lib/venues';
import {
  buildRepeatActivationComposerHref,
  buildVenueCreatorRouteComposerHref,
} from '@/lib/venue-launch';
import VenuePageShell from '../../VenuePageShell';
import VenueReportActions from './VenueReportActions';
import VenueReportTrackedLink from './VenueReportTrackedLink';
import VenueReportClaimButton from './VenueReportClaimButton';

const raisedPanelClass =
  'relative overflow-hidden rounded-[30px] border border-white/[0.09] bg-[linear-gradient(180deg,rgba(255,255,255,0.07)_0%,rgba(255,255,255,0.025)_14%,rgba(10,9,18,0.9)_58%,rgba(7,6,14,0.96)_100%)] shadow-[0_28px_90px_rgba(0,0,0,0.4),0_0_28px_rgba(168,85,247,0.07),inset_0_1px_0_rgba(255,255,255,0.1),inset_0_-18px_24px_rgba(0,0,0,0.24)]';

const softCardClass =
  'relative overflow-hidden rounded-[26px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(255,255,255,0.06)_0%,rgba(255,255,255,0.02)_12%,rgba(10,10,18,0.92)_100%)] shadow-[0_18px_30px_rgba(0,0,0,0.22),inset_0_1px_0_rgba(255,255,255,0.08),inset_0_-12px_18px_rgba(0,0,0,0.22)]';

const insetCardClass =
  'rounded-[22px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(4,5,10,0.72)_0%,rgba(11,11,18,0.92)_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.06),inset_0_-10px_16px_rgba(0,0,0,0.26)]';

function formatSignedDelta(value: number) {
  if (value > 0) return `+${value}`;
  return `${value}`;
}

type ReportAudience = 'venue' | 'sponsor';

export default async function VenueReportPage(
  {
    params,
    searchParams,
  }: {
    params: Promise<{ slug: string }>;
    searchParams: Promise<{ audience?: string }>;
  }
) {
  const { slug } = await params;
  const resolvedSearchParams = await searchParams;
  const audience: ReportAudience =
    resolvedSearchParams?.audience === 'sponsor' ? 'sponsor' : 'venue';
  const venue = await getVenueDetailBySlug(slug);

  if (!venue) {
    notFound();
  }

  const repeatActivationHref = buildRepeatActivationComposerHref({ venue });
  const freshActivationHref = `/brands/portal?venue=${encodeURIComponent(venue.slug)}&compose=1`;
  const bestCreatorRouteHref = venue.roiSnapshot.bestCreator
    ? buildVenueCreatorRouteComposerHref({
        venue,
        creatorTag: venue.roiSnapshot.bestCreator.creatorTag,
      })
    : null;
  const claimHandoffHref = (() => {
    const params = new URLSearchParams({
      topic: 'venue-claim',
      venue: venue.name,
      venueSlug: venue.slug,
      source: 'venue-report',
      audience,
      intent: 'claim',
    });
    if (venue.city) params.set('city', venue.city);
    return `/contact?${params.toString()}`;
  })();
  const activationHandoffHref = (() => {
    const params = new URLSearchParams({
      topic: 'venue-partnership',
      venue: venue.name,
      venueSlug: venue.slug,
      source: 'venue-report',
      audience,
      intent: 'activation',
    });
    if (venue.city) params.set('city', venue.city);
    return `/contact?${params.toString()}`;
  })();
  const reportSummary =
    audience === 'sponsor'
      ? `${venue.name} is showing a repeatable venue signal. Over the last 7 days it produced ${venue.roiSnapshot.windows.last7Days.verifiedOutcomes} verified outcomes and ${venue.roiSnapshot.windows.last7Days.uniqueVisitors} unique visitors, with ${formatSignedDelta(venue.roiSnapshot.windows.last7Days.uniqueVisitorsDelta)} visitor delta versus the previous window.`
      : venue.roiSnapshot.summary;
  const reportSubject =
    audience === 'sponsor' ? `${venue.name} sponsor-ready activation brief` : `${venue.name} venue activation report`;
  const forwardableBrief =
    audience === 'sponsor'
      ? [
          `${venue.name} is one of the stronger activation venues in the current BaseDare network.`,
          `Last 7 days: ${venue.roiSnapshot.windows.last7Days.verifiedOutcomes} verified outcomes, ${venue.roiSnapshot.windows.last7Days.uniqueVisitors} unique visitors, ${venue.roiSnapshot.windows.last7Days.checkIns} check-ins.`,
          `Last 30 days: ${venue.roiSnapshot.windows.last30Days.verifiedOutcomes} verified outcomes and ${venue.roiSnapshot.windows.last30Days.uniqueVisitors} unique visitors.`,
          `Best proving creator: ${venue.roiSnapshot.bestCreator?.creatorTag ?? 'still emerging'}.`,
          `Recommended move: repeat the winning activation pattern while the venue signal is warm.`,
        ].join('\n')
      : [
          `${venue.name} is showing measurable activation lift on BaseDare.`,
          `Last 7 days: ${venue.roiSnapshot.windows.last7Days.verifiedOutcomes} verified outcomes, ${venue.roiSnapshot.windows.last7Days.uniqueVisitors} unique visitors, ${venue.roiSnapshot.windows.last7Days.checkIns} check-ins.`,
          `Last 30 days: ${venue.roiSnapshot.windows.last30Days.verifiedOutcomes} verified outcomes and ${venue.roiSnapshot.windows.last30Days.uniqueVisitors} unique visitors.`,
          `Top proving creator: ${venue.roiSnapshot.bestCreator?.creatorTag ?? 'still emerging'}.`,
          `Recommended move: repeat the winning activation or route the strongest creator back into venue.`,
        ].join('\n');
  const reportLabel =
    audience === 'sponsor' ? 'Sponsor Report Card' : 'Venue Report Card';
  const reportHeading =
    audience === 'sponsor'
      ? 'Why this venue is worth activating next'
      : 'What changed after activation';
  const repeatLabel =
    audience === 'sponsor' ? 'Launch sponsor-ready repeat' : 'Repeat winning activation';
  const creatorRouteLabel =
    audience === 'sponsor' ? 'Route best creator into venue' : 'Route top creator';

  return (
    <VenuePageShell mapHref={`/venues/${encodeURIComponent(venue.slug)}`}>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(168,85,247,0.12),transparent_28%),radial-gradient(circle_at_15%_75%,rgba(34,211,238,0.08),transparent_24%),radial-gradient(circle_at_90%_85%,rgba(250,204,21,0.06),transparent_22%)]" />
      <main className="relative mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <section className="space-y-6">
          <div className={`${raisedPanelClass} px-6 py-8 sm:px-8`}>
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_0%,rgba(168,85,247,0.12),transparent_32%),radial-gradient(circle_at_88%_100%,rgba(34,211,238,0.1),transparent_36%),linear-gradient(180deg,rgba(255,255,255,0.05)_0%,transparent_32%,transparent_72%,rgba(0,0,0,0.24)_100%)]" />
            <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/26 to-transparent" />
            <div className="relative flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-3xl">
                <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/24 bg-cyan-500/[0.1] px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-cyan-100 shadow-[0_12px_24px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.12)]">
                  <BarChart3 className="h-4 w-4" />
                  {reportLabel}
                </div>
                <h1 className="mt-5 text-4xl font-black tracking-tight sm:text-5xl">{venue.name}</h1>
                <p className="mt-4 max-w-2xl text-base text-white/68">{reportSummary}</p>
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
                </div>
                <div className="mt-5">
                  <VenueReportActions
                    venueSlug={venue.slug}
                    shareSubject={reportSubject}
                    shareBody={forwardableBrief}
                    audience={audience}
                  />
                </div>
              </div>

              <div className="grid min-w-[260px] gap-3 sm:grid-cols-2 lg:grid-cols-1">
                <div className={`${softCardClass} px-5 py-4`}>
                  <div className="pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-white/22 to-transparent" />
                  <p className="text-xs uppercase tracking-[0.25em] text-white/40">Best Repeat Candidate</p>
                  <div className="mt-2 text-lg font-bold text-white">
                    {venue.activationInsight.bestActivation?.title ?? 'Still forming'}
                  </div>
                  <p className="mt-2 text-sm text-white/58">{venue.activationInsight.summary}</p>
                </div>
                <div className={`${softCardClass} px-5 py-4`}>
                  <div className="pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-white/22 to-transparent" />
                  <p className="text-xs uppercase tracking-[0.25em] text-white/40">Strongest Creator Signal</p>
                  <div className="mt-2 text-lg font-bold text-white">
                    {venue.roiSnapshot.bestCreator?.creatorTag ?? 'No clear leader yet'}
                  </div>
                  <p className="mt-2 text-sm text-white/58">
                    {venue.roiSnapshot.bestCreator
                      ? `${venue.roiSnapshot.bestCreator.trustLabel} level ${venue.roiSnapshot.bestCreator.trustLevel} · ${venue.roiSnapshot.bestCreator.marksHere} marks here`
                      : 'One more proven venue activation will make the strongest operator much clearer.'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-6">
              <div className={`${softCardClass} p-6`}>
                <div className="pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-white/22 to-transparent" />
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.25em] text-white/40">ROI Windows</p>
                    <h2 className="mt-2 text-2xl font-bold">{reportHeading}</h2>
                  </div>
                  <div className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[10px] uppercase tracking-[0.18em] text-white/58">
                    Shareable snapshot
                  </div>
                </div>

                <div className="mt-5 grid gap-4 xl:grid-cols-2">
                  {[venue.roiSnapshot.windows.last7Days, venue.roiSnapshot.windows.last30Days].map((window) => (
                    <div key={window.label} className={`${insetCardClass} px-4 py-4`}>
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-[11px] uppercase tracking-[0.2em] text-white/42">{window.label}</div>
                        <div className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] text-white/58">
                          vs previous window
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-3">
                        <div className="rounded-[16px] border border-white/10 bg-white/[0.03] px-3 py-3">
                          <div className="text-[10px] uppercase tracking-[0.16em] text-white/36">Verified outcomes</div>
                          <div className="mt-2 text-2xl font-black text-white">{window.verifiedOutcomes}</div>
                          <div className="mt-1 text-xs text-white/48">{formatSignedDelta(window.verifiedOutcomesDelta)} delta</div>
                        </div>
                        <div className="rounded-[16px] border border-white/10 bg-white/[0.03] px-3 py-3">
                          <div className="text-[10px] uppercase tracking-[0.16em] text-white/36">Unique visitors</div>
                          <div className="mt-2 text-2xl font-black text-cyan-100">{window.uniqueVisitors}</div>
                          <div className="mt-1 text-xs text-white/48">{formatSignedDelta(window.uniqueVisitorsDelta)} delta</div>
                        </div>
                        <div className="rounded-[16px] border border-white/10 bg-white/[0.03] px-3 py-3">
                          <div className="text-[10px] uppercase tracking-[0.16em] text-white/36">Check-ins</div>
                          <div className="mt-2 text-2xl font-black text-emerald-100">{window.checkIns}</div>
                          <div className="mt-1 text-xs text-white/48">{formatSignedDelta(window.checkInsDelta)} delta</div>
                        </div>
                        <div className="rounded-[16px] border border-white/10 bg-white/[0.03] px-3 py-3">
                          <div className="text-[10px] uppercase tracking-[0.16em] text-white/36">Proofs</div>
                          <div className="mt-2 text-2xl font-black text-[#f8dd72]">{window.proofs}</div>
                          <div className="mt-1 text-xs text-white/48">{formatSignedDelta(window.proofsDelta)} delta</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className={`${softCardClass} p-6`}>
                <div className="pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-white/22 to-transparent" />
                <p className="text-xs uppercase tracking-[0.25em] text-white/40">Why This Venue Matters</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {venue.activationInsight.reasons.map((reason) => (
                    <span
                      key={reason}
                      className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/60"
                    >
                      {reason}
                    </span>
                  ))}
                </div>
              </div>

              <div className={`${softCardClass} p-6`}>
                <div className="pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-white/22 to-transparent" />
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.25em] text-white/40">Forwardable Snapshot</p>
                    <h2 className="mt-2 text-2xl font-bold">Send the venue story without rewriting it</h2>
                  </div>
                  <div className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[10px] uppercase tracking-[0.16em] text-white/58">
                    Email / DM ready
                  </div>
                </div>
                <div className={`${insetCardClass} mt-5 px-4 py-4`}>
                  <div className="text-[10px] uppercase tracking-[0.18em] text-white/36">{reportSubject}</div>
                  <pre className="mt-3 whitespace-pre-wrap font-sans text-sm leading-6 text-white/68">
                    {forwardableBrief}
                  </pre>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className={`${softCardClass} p-6`}>
                <div className="pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-white/22 to-transparent" />
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.25em] text-white/40">Pipeline Outcome</p>
                    <h2 className="mt-2 text-2xl font-bold">Did this report move the venue forward?</h2>
                  </div>
                  <div className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[10px] uppercase tracking-[0.16em] text-white/58">
                    {venue.reportPipeline.lastTouchedAt
                      ? `Last touch ${new Date(venue.reportPipeline.lastTouchedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}`
                      : 'Waiting for first move'}
                  </div>
                </div>
                <p className="mt-3 text-sm text-white/58">{venue.reportPipeline.summary}</p>
                <div className="mt-4 grid grid-cols-3 gap-3">
                  <div className={`${insetCardClass} px-4 py-3`}>
                    <div className="text-[10px] uppercase tracking-[0.16em] text-white/36">Opens</div>
                    <div className="mt-2 text-2xl font-black text-white">{venue.reportPipeline.opens}</div>
                  </div>
                  <div className={`${insetCardClass} px-4 py-3`}>
                    <div className="text-[10px] uppercase tracking-[0.16em] text-white/36">Shares</div>
                    <div className="mt-2 text-2xl font-black text-cyan-100">{venue.reportPipeline.shares}</div>
                  </div>
                  <div className={`${insetCardClass} px-4 py-3`}>
                    <div className="text-[10px] uppercase tracking-[0.16em] text-white/36">Contacts</div>
                    <div className="mt-2 text-2xl font-black text-emerald-100">{venue.reportPipeline.contacts}</div>
                  </div>
                </div>
                <div className="mt-5 flex flex-wrap gap-2">
                  {[
                    { label: 'Shared', stage: venue.reportPipeline.stages.shared },
                    { label: 'Contacted', stage: venue.reportPipeline.stages.contacted },
                    { label: 'Claim started', stage: venue.reportPipeline.stages.claimStarted },
                    { label: 'Activation launched', stage: venue.reportPipeline.stages.activationLaunched },
                    { label: 'Repeat launched', stage: venue.reportPipeline.stages.repeatLaunched },
                  ].map(({ label, stage }) => (
                    <span
                      key={label}
                      className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${
                        stage.active
                          ? 'border-emerald-400/22 bg-emerald-500/[0.12] text-emerald-100'
                          : 'border-white/10 bg-white/[0.04] text-white/46'
                      }`}
                    >
                      {label}
                    </span>
                  ))}
                </div>
              </div>

              {venue.roiSnapshot.bestCreator ? (
                <div className={`${softCardClass} p-6`}>
                  <div className="pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-white/22 to-transparent" />
                  <p className="text-xs uppercase tracking-[0.25em] text-white/40">Top Proving Creator</p>
                  <h2 className="mt-2 text-2xl font-bold">{venue.roiSnapshot.bestCreator.creatorTag}</h2>
                  <p className="mt-2 text-sm text-white/58">
                    This creator currently has the strongest venue-specific proof signal and is the cleanest operator to route back into the next activation here.
                  </p>
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className={`${insetCardClass} px-4 py-4`}>
                      <div className="text-[10px] uppercase tracking-[0.18em] text-white/36">Marks here</div>
                      <div className="mt-2 text-2xl font-black text-white">{venue.roiSnapshot.bestCreator.marksHere}</div>
                    </div>
                    <div className={`${insetCardClass} px-4 py-4`}>
                      <div className="text-[10px] uppercase tracking-[0.18em] text-white/36">First sparks</div>
                      <div className="mt-2 text-2xl font-black text-[#f8dd72]">{venue.roiSnapshot.bestCreator.firstMarksHere}</div>
                    </div>
                    <div className={`${insetCardClass} px-4 py-4`}>
                      <div className="text-[10px] uppercase tracking-[0.18em] text-white/36">Wins total</div>
                      <div className="mt-2 text-2xl font-black text-cyan-100">{venue.roiSnapshot.bestCreator.completedDares}</div>
                    </div>
                    <div className={`${insetCardClass} px-4 py-4`}>
                      <div className="text-[10px] uppercase tracking-[0.18em] text-white/36">Earned</div>
                      <div className="mt-2 text-2xl font-black text-emerald-100">${Math.round(venue.roiSnapshot.bestCreator.totalEarned)}</div>
                    </div>
                  </div>
                </div>
              ) : null}

              <div className={`${softCardClass} p-6`}>
                <div className="pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-white/22 to-transparent" />
                <p className="text-xs uppercase tracking-[0.25em] text-white/40">Recommended Next Move</p>
                <h2 className="mt-2 text-2xl font-bold">Turn this report into the next activation</h2>
                <p className="mt-2 text-sm text-white/58">
                  The strongest next move is to repeat the winner or route the proving creator back into this venue while the signal is still warm.
                </p>

                <div className="mt-5 flex flex-wrap gap-3">
                  <VenueReportTrackedLink
                    href={freshActivationHref}
                    venueSlug={venue.slug}
                    audience={audience}
                    eventType="ACTIVATION_LAUNCHED"
                    className="inline-flex items-center gap-2 rounded-full border border-fuchsia-400/24 bg-fuchsia-500/[0.1] px-4 py-2 text-sm font-semibold text-fuchsia-100 shadow-[0_12px_22px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.08)] transition hover:-translate-y-[1px] hover:border-fuchsia-300/38 hover:bg-fuchsia-500/[0.14]"
                  >
                    <ArrowRight className="h-4 w-4" />
                    Launch fresh activation
                  </VenueReportTrackedLink>
                  {repeatActivationHref ? (
                    <VenueReportTrackedLink
                      href={repeatActivationHref}
                      venueSlug={venue.slug}
                      audience={audience}
                      eventType="REPEAT_LAUNCHED"
                      className="inline-flex items-center gap-2 rounded-full border border-amber-400/24 bg-amber-500/[0.1] px-4 py-2 text-sm font-semibold text-amber-100 shadow-[0_12px_22px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.08)] transition hover:-translate-y-[1px] hover:border-amber-300/38 hover:bg-amber-500/[0.14]"
                    >
                      <Flame className="h-4 w-4" />
                      {repeatLabel}
                    </VenueReportTrackedLink>
                  ) : null}
                  {bestCreatorRouteHref ? (
                    <VenueReportTrackedLink
                      href={bestCreatorRouteHref}
                      venueSlug={venue.slug}
                      audience={audience}
                      className="inline-flex items-center gap-2 rounded-full border border-cyan-400/24 bg-cyan-500/[0.1] px-4 py-2 text-sm font-semibold text-cyan-100 shadow-[0_12px_22px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.08)] transition hover:-translate-y-[1px] hover:border-cyan-300/38 hover:bg-cyan-500/[0.14]"
                    >
                      <Users className="h-4 w-4" />
                      {creatorRouteLabel}
                    </VenueReportTrackedLink>
                  ) : null}
                  <VenueReportTrackedLink
                    href={activationHandoffHref}
                    venueSlug={venue.slug}
                    audience={audience}
                    className="inline-flex items-center gap-2 rounded-full border border-cyan-400/24 bg-cyan-500/[0.1] px-4 py-2 text-sm font-semibold text-cyan-100 shadow-[0_12px_22px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.08)] transition hover:-translate-y-[1px] hover:border-cyan-300/38 hover:bg-cyan-500/[0.14]"
                  >
                    <Waves className="h-4 w-4" />
                    Talk activation
                  </VenueReportTrackedLink>
                  {venue.commandCenter.claimState === 'unclaimed' ? (
                    <VenueReportClaimButton
                      venueSlug={venue.slug}
                      venueName={venue.name}
                      audience={audience}
                      className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-white/76 shadow-[0_12px_22px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.08)] transition hover:-translate-y-[1px] hover:border-white/18 hover:bg-white/[0.08] hover:text-white"
                      requireAuthClassName="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-white/76 shadow-[0_12px_22px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.08)] transition hover:-translate-y-[1px] hover:border-white/18 hover:bg-white/[0.08] hover:text-white"
                      pendingClassName="inline-flex items-center gap-2 rounded-full border border-amber-400/24 bg-amber-500/[0.08] px-4 py-2 text-sm font-semibold text-amber-100 shadow-[0_12px_22px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.08)]"
                    />
                  ) : (
                    <VenueReportTrackedLink
                      href={claimHandoffHref}
                      venueSlug={venue.slug}
                      audience={audience}
                      className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-white/76 shadow-[0_12px_22px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.08)] transition hover:-translate-y-[1px] hover:border-white/18 hover:bg-white/[0.08] hover:text-white"
                    >
                      <Activity className="h-4 w-4" />
                      Claim handoff
                    </VenueReportTrackedLink>
                  )}
                  <VenueReportTrackedLink
                    href={venue.commandCenter.consoleUrl ?? `/venues/${encodeURIComponent(venue.slug)}/console`}
                    venueSlug={venue.slug}
                    audience={audience}
                    className="inline-flex items-center gap-2 rounded-full border border-fuchsia-400/24 bg-fuchsia-500/[0.1] px-4 py-2 text-sm font-semibold text-fuchsia-100 shadow-[0_12px_22px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.08)] transition hover:-translate-y-[1px] hover:border-fuchsia-300/38 hover:bg-fuchsia-500/[0.14]"
                  >
                    <ArrowRight className="h-4 w-4" />
                    Open command console
                  </VenueReportTrackedLink>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </VenuePageShell>
  );
}
