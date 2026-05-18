import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, BadgeDollarSign, CheckCircle2 } from 'lucide-react';

import ActivationFunnelTracker from './ActivationFunnelTracker';
import ActivationIntakeForm from './ActivationIntakeForm';
import SquircleLink from '@/components/ui/SquircleLink';

export const metadata: Metadata = {
  title: 'Start an Activation | BaseDare',
  description:
    'Start a simple BaseDare venue, creator, or guest mission with one place, one action, one proof path, and one reply route.',
};

const raisedPanelClass =
  'relative overflow-hidden rounded-[32px] border border-white/[0.09] bg-[linear-gradient(180deg,rgba(255,255,255,0.07)_0%,rgba(255,255,255,0.025)_14%,rgba(10,9,18,0.93)_58%,rgba(7,6,14,0.98)_100%)] shadow-[0_28px_90px_rgba(0,0,0,0.46),0_0_28px_rgba(168,85,247,0.08),inset_0_1px_0_rgba(255,255,255,0.1),inset_0_-18px_24px_rgba(0,0,0,0.24)]';
const insetCardClass =
  'rounded-[22px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(4,5,10,0.72)_0%,rgba(11,11,18,0.92)_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.06),inset_0_-10px_16px_rgba(0,0,0,0.26)]';

type ActivationsPageProps = {
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
    offer?: string;
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

export default async function ActivationsPage({ searchParams }: ActivationsPageProps) {
  const resolvedSearchParams = await searchParams;
  const routedCreator = resolvedSearchParams.creator || resolvedSearchParams.streamer || null;
  const routedVenue = resolvedSearchParams.venueName || resolvedSearchParams.venue || null;
  const routedVenueId = resolvedSearchParams.venueId || null;
  const routedVenueSlug = resolvedSearchParams.venueSlug || null;
  const routedCity = resolvedSearchParams.city || null;
  const routedSource = resolvedSearchParams.source || null;
  const routedOfferId = resolvedSearchParams.offer === 'first-spark' ? 'first-spark' : null;
  const isFirstSparkOffer = routedOfferId === 'first-spark';
  const isVenueGuestMissionRoute =
    routedSource === 'venue-guest-mission' || resolvedSearchParams.missionType === 'guest';
  const hasRoutedContext = Boolean(
    routedCreator ||
      routedVenue ||
      routedVenueId ||
      routedVenueSlug ||
      routedCity ||
      routedSource ||
      isFirstSparkOffer ||
      resolvedSearchParams.auditBrief ||
      resolvedSearchParams.missionType ||
      resolvedSearchParams.missionTitle ||
      resolvedSearchParams.guestMission ||
      resolvedSearchParams.perkLabel
  );

  const heroEyebrow = isVenueGuestMissionRoute
    ? 'Guest Mission'
    : isFirstSparkOffer
      ? 'First Spark Pilot'
      : 'Activation Route';
  const heroTitle = isVenueGuestMissionRoute
    ? 'Launch a guest loop.'
    : isFirstSparkOffer
      ? 'Run First Spark.'
      : 'Start an activation.';
  const heroDetail = isVenueGuestMissionRoute
    ? 'Confirm the venue, guest action, perk, and reply path. Keep the loop light enough that people can join fast.'
    : isFirstSparkOffer
      ? 'One venue, one night, one proof path, one recap. BaseDare handles setup; the venue gives one simple perk.'
      : 'Tell BaseDare where the mission should happen, what should be proved, and where to reply.';
  const primaryLabel = isVenueGuestMissionRoute
    ? 'Confirm Guest Mission'
    : isFirstSparkOffer
      ? 'Run First Spark'
      : 'Start Activation';
  const intakeHeading = hasRoutedContext ? 'Confirm the route.' : 'Give us the basics.';
  const intakeDetail = hasRoutedContext
    ? 'Most fields are prefilled from the page you came from. Check the essentials and send it.'
    : 'One place, one action, and one clear contact is enough to start.';
  const nextSteps = isVenueGuestMissionRoute
    ? [
        ['1', 'Place', routedVenue || 'Venue'],
        ['2', 'Action', resolvedSearchParams.guestMission || 'Guest check-in'],
        ['3', 'Reply', 'BaseDare routes it'],
      ]
    : isFirstSparkOffer
      ? [
          ['1', 'Venue', routedVenue || routedCity || 'One local place'],
          ['2', 'Perk', resolvedSearchParams.perkLabel || 'Simple reward'],
          ['3', 'Launch', 'Proof + recap'],
        ]
    : [
        ['1', 'Place', routedVenue || routedCity || 'Venue or city'],
        ['2', 'Proof', resolvedSearchParams.proofRequired || 'What gets verified'],
        ['3', 'Reply', 'BaseDare reviews it'],
      ];

  return (
    <main className="fixed inset-0 z-[100] overflow-y-auto bg-[#030305] px-4 py-8 sm:px-6 lg:py-10">
      <ActivationFunnelTracker />
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.11)_1px,transparent_0)] [background-size:112px_112px]" />
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(circle_at_20%_0%,rgba(255,255,255,0.08),transparent_32%),radial-gradient(circle_at_82%_12%,rgba(255,255,255,0.06),transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.04)_0%,rgba(0,0,0,0)_26%,rgba(0,0,0,0.82)_100%)]" />
      <div className="pointer-events-none fixed inset-x-0 top-0 z-0 h-36 border-b border-white/[0.06] bg-black/70 md:bg-black/55 md:backdrop-blur-2xl" />

      <div className="relative z-20 mx-auto max-w-5xl">
        <div className="mb-5 flex items-center justify-between gap-3">
          <Link
            href="/?mode=control"
            data-activation-track="back-to-control"
            data-activation-channel="header"
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.045] px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-white/64 transition hover:bg-white/[0.08] hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Control
          </Link>
          <Link
            href={routedVenueSlug ? `/venues/${encodeURIComponent(routedVenueSlug)}` : '/brands/portal'}
            data-activation-track={routedVenueSlug ? 'back-to-venue' : 'open-brand-portal-header'}
            data-activation-channel="header"
            className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/[0.035] px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-white/52 transition hover:text-white sm:inline-flex"
          >
            {routedVenueSlug ? 'Venue Page' : 'Brand Portal'}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <section className={`${raisedPanelClass} px-5 py-7 sm:px-7 lg:px-8 lg:py-8`}>
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.08),transparent_32%,rgba(0,0,0,0.22)_100%)]" />
          <div className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-white/35 to-transparent" />
          <div className="relative grid gap-6 lg:grid-cols-[1fr_0.74fr] lg:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-yellow-200/20 bg-yellow-300/[0.08] px-4 py-2 text-[11px] font-black uppercase tracking-[0.24em] text-yellow-100">
                <BadgeDollarSign className="h-4 w-4" />
                {heroEyebrow}
              </div>
              <h1 className="mt-5 max-w-3xl text-4xl font-black uppercase italic leading-[0.92] tracking-[-0.065em] text-white sm:text-5xl lg:text-6xl">
                {heroTitle}
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-white/64">{heroDetail}</p>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <div
                  className="w-full sm:w-[248px]"
                  data-activation-track="launch-grid-activation"
                  data-activation-channel="hero"
                >
                  <SquircleLink href="#activation-intake" tone="yellow" label={primaryLabel} fullWidth height={44}>
                    <span className="flex items-center justify-center gap-2 text-[0.78rem] tracking-[0.08em] text-[#15120c]">
                      {primaryLabel}
                      <ArrowRight className="h-4 w-4" />
                    </span>
                  </SquircleLink>
                </div>
                <Link
                  href={routedVenueSlug ? `/venues/${encodeURIComponent(routedVenueSlug)}` : '/map'}
                  data-activation-track={routedVenueSlug ? 'back-to-venue-hero' : 'open-map-hero'}
                  data-activation-channel="hero"
                  className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] px-6 text-sm font-black uppercase tracking-[0.18em] text-white/70 transition hover:bg-white/[0.08] hover:text-white"
                >
                  {routedVenueSlug ? 'Open Venue' : 'Open Map'}
                </Link>
              </div>
            </div>

            <div className={`${insetCardClass} p-4`}>
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.22em] text-cyan-100/70">
                <CheckCircle2 className="h-4 w-4" />
                What happens next
              </div>
              <div className="mt-4 grid gap-2">
                {nextSteps.map(([number, label, value]) => (
                  <div
                    key={`${number}-${label}`}
                    className="flex items-center gap-3 rounded-[18px] border border-white/[0.08] bg-white/[0.035] px-3 py-3"
                  >
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-white/10 bg-white/[0.05] text-xs font-black text-white">
                      {number}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[9px] font-black uppercase tracking-[0.2em] text-white/34">
                        {label}
                      </span>
                      <span className="block truncate text-sm font-black text-white/76">{value}</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="activation-intake" className="mt-6">
          <div className={`${raisedPanelClass} mx-auto max-w-3xl p-5 sm:p-6`}>
            <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/24 to-transparent" />
            <div className="relative mb-5 rounded-[24px] border border-white/[0.08] bg-white/[0.035] px-4 py-4">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-yellow-100/70">
                {intakeHeading}
              </p>
              <p className="mt-2 text-sm leading-6 text-white/58">{intakeDetail}</p>
            </div>
            <div className="relative">
              <ActivationIntakeForm
                routedCreator={routedCreator}
                routedVenue={routedVenue}
                routedVenueId={routedVenueId}
                routedVenueSlug={routedVenueSlug}
                routedCity={routedCity}
                routedSource={routedSource}
                routedBudgetRange={resolvedSearchParams.budgetRange || null}
                routedPackageId={resolvedSearchParams.packageId || null}
                routedGoal={resolvedSearchParams.goal || null}
                routedBuyerType={resolvedSearchParams.buyerType || null}
                routedOfferId={routedOfferId}
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
          </div>
        </section>
      </div>
    </main>
  );
}
