'use client';

import Link from 'next/link';
import { ArrowRight, Camera, MapPin } from 'lucide-react';
import { BUSINESS_REQUESTS, businessRequestHref, type BusinessRequestKind } from '@/lib/business-request';
import { MANAGED_FIELD_SPRINT } from '@/lib/financial-canon';
import { usePaymentReadiness } from '@/hooks/usePaymentReadiness';

export default function BusinessRequestOptions() {
  const payment = usePaymentReadiness();
  return <div className="mt-6 text-left">
    <div className="grid gap-3 sm:grid-cols-2">
      {(['content-brief', 'activity-brief'] as BusinessRequestKind[]).map((kind) => {
        const Icon = kind === 'content-brief' ? Camera : MapPin;
        return <Link key={kind} href={businessRequestHref(kind)} className="bd-card group p-5 transition hover:border-amber-200/35 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-100">
          <Icon className="text-amber-100" size={22} aria-hidden="true" />
          <h2 className="mt-3 text-lg font-black text-white">{BUSINESS_REQUESTS[kind].title}</h2>
          <p className="mt-2 text-sm leading-6 text-white/70">{kind === 'content-brief' ? 'Request a specific photo or video, with a clear brief and usage permissions.' : 'Fund a useful challenge with an agreed action, evidence and reward.'}</p>
          <span className="mt-4 inline-flex min-h-11 items-center gap-2 text-sm font-bold text-amber-100">Describe your brief <ArrowRight size={16} aria-hidden="true" /></span>
        </Link>;
      })}
    </div>
    <p className="mt-4 text-sm leading-6 text-white/65">No account needed to enquire. We agree on scope, availability, rights and price before any payment. No guaranteed views, sales or foot traffic.</p>
    <div className="bd-well mt-4 p-4 text-sm leading-6 text-white/70" role="status">
      {payment.state === 'ready' ? 'Payment checks passed. Each job still needs agreed terms and confirmed reward funding before launch.' : payment.state === 'checking' ? 'Checking paid-task availability. You can still send a brief without payment.' : <>Paid tasks are temporarily unavailable. You can send a brief for review; it does not start work or reserve contributors. <button type="button" onClick={payment.refresh} className="inline-flex min-h-11 items-center font-bold text-cyan-100 underline">Check again</button></>}
    </div>
    <details className="mt-4 border-t border-white/10 pt-2">
      <summary className="flex min-h-11 cursor-pointer items-center text-sm font-bold text-white/75">Need independent on-site checks?</summary>
      <p className="mt-2 text-sm leading-6 text-white/65">The Verified Field Sprint answers one bounded question with {MANAGED_FIELD_SPRINT.assignedContributorCount} independent checks and a receipt. ${MANAGED_FIELD_SPRINT.invoiceTotalUsd.toLocaleString()} total: ${MANAGED_FIELD_SPRINT.serviceFeeUsd.toLocaleString()} service + ${MANAGED_FIELD_SPRINT.grossRewardPoolUsd} reward pool. Expected delivery: {MANAGED_FIELD_SPRINT.durationDaysMin}–{MANAGED_FIELD_SPRINT.durationDaysMax} days after confirmation. Promotional reuse rights are separate.</p>
      <div className="mt-3 flex flex-wrap gap-3"><Link className="bd-action !text-sm" href="/activations?source=buyer-workspace&missionType=field-mission">Request on-site checks</Link><Link className="inline-flex min-h-11 items-center text-sm font-bold text-cyan-100 underline" href="/field-sprints/example">View example receipt</Link></div>
    </details>
  </div>;
}
