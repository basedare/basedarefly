import type { Metadata } from 'next';
import Link from 'next/link';
import { ControlChrome } from '@/components/control/ControlChrome';
import { MANAGED_FIELD_SPRINT } from '@/lib/financial-canon';
import ActivationIntakeForm from '../activations/ActivationIntakeForm';
export const metadata: Metadata = { title: 'Plan a venue activity | BaseDare', description: 'Ask BaseDare to help plan an activity at your venue. Review the time, offer and costs before anything goes live.' };

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
  const p = await searchParams;
  return <ControlChrome title="Plan a venue activity" subtitle="First Spark" badge="Venue request" backHref={p.venueSlug ? `/venues/${encodeURIComponent(p.venueSlug)}` : '/'} backLabel={p.venueSlug ? 'Venue' : 'Home'}>
    <div className="mx-auto w-full max-w-3xl space-y-5">
      <section className="rounded-[28px] border border-white/10 bg-black/25 p-5 sm:p-7">
        <h1 className="text-3xl font-black text-white">Give people a reason to visit.</h1>
        <p className="mt-3 text-sm leading-6 text-white/70">Tell us about your venue, the activity and a suitable time. We’ll confirm the plan, price and responsibilities with you before anything goes live.</p>
        <details className="mt-4"><summary className="bd-action cursor-pointer">Other venue tools</summary>
        <p className="mt-3 text-sm leading-6 text-yellow-100/80">Need information checked instead? Our separate on-site check service is ${MANAGED_FIELD_SPRINT.invoiceTotalUsd.toLocaleString()} for {MANAGED_FIELD_SPRINT.assignedContributorCount} independent checks in {MANAGED_FIELD_SPRINT.durationDaysMin}–{MANAGED_FIELD_SPRINT.durationDaysMax} days. <Link href="/brands/portal?compose=1" className="underline">Request on-site checks.</Link></p>
        <p className="mt-3 text-sm leading-6 text-white/60">Already approved to manage this place? Open <strong>Manage venue</strong> on its place page to update details, check-ins and offers.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link className="bd-action" href={p.venueSlug ? `/venues/${encodeURIComponent(p.venueSlug)}#venue-management` : '/map?manage=1'}>Find my venue</Link>
          <Link className="bd-action" href="/create?sparkType=paid">Pay someone to make content</Link>
        </div>
        </details>
      </section>
      <section id="pilot-request" className="scroll-mt-24 rounded-[28px] border border-white/10 bg-black/20 p-4 sm:p-6">
        <ActivationIntakeForm
          routedCreator={p.creator || p.streamer || null}
          routedVenue={p.venueName || p.venue || null}
          routedVenueId={p.venueId || null} routedVenueSlug={p.venueSlug || null}
          routedCity={p.city || null} routedSource={p.source || 'first-spark-page'}
          routedBudgetRange={p.budgetRange || null} routedPackageId={p.packageId || 'local-signal'}
          routedGoal={p.goal || 'foot_traffic'} routedBuyerType={p.buyerType || 'venue'} routedOfferId="first-spark"
          routedAuditBrief={p.auditBrief || null} routedMissionType={p.missionType || 'dead-window'}
          routedMissionTitle={p.missionTitle || 'Venue activity'}
          routedCreatorSlots={p.creatorSlots || null} routedPayout={p.payout || null}
          routedTimeWindow={p.deadWindowTime || p.timeWindow || null}
          routedProofRequired={p.proofRequired || null} routedContentRequired={p.contentRequired || null}
          routedGuestMission={p.guestMission || null} routedPerkLabel={p.deadWindowPerk || p.perkLabel || null}
          routedDeadWindowTime={p.deadWindowTime || p.timeWindow || null}
          routedDeadWindowCheckInTarget={p.deadWindowCheckInTarget || null}
          routedDeadWindowPerk={p.deadWindowPerk || p.perkLabel || null}
          routedDeadWindowBaseline={p.deadWindowBaseline || null}
        />
      </section>
    </div>
  </ControlChrome>;
}
