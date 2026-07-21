import { notFound } from 'next/navigation';

import SprintRepeatDecision from './SprintRepeatDecision';
import { buildVerifiedFieldSprintReceipt } from '@/lib/verified-field-sprint-server';

export const dynamic = 'force-dynamic';

export default async function FieldSprintReceiptPage({ params }: { params: Promise<{ receiptCode: string }> }) {
  const { receiptCode } = await params;
  const receipt = await buildVerifiedFieldSprintReceipt(receiptCode);
  if (!receipt) notFound();

  return <main className="min-h-screen bg-[#07070b] px-4 py-16 text-white sm:px-6">
    <div className="mx-auto max-w-5xl">
      <header className="rounded-3xl border border-[#ffe36a]/20 bg-gradient-to-br from-[#251d09]/70 to-[#101018] p-7">
        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#ffe36a]">Verified Field Sprint · Receipt</p>
        <h1 className="mt-3 text-3xl font-black sm:text-5xl">{receipt.question}</h1>
        <p className="mt-4 text-sm text-white/50">{receipt.buyer.organization || receipt.buyer.name} · {receipt.area} · completed {receipt.completedAt ? new Date(receipt.completedAt).toLocaleDateString() : '—'}</p>
        <div className="mt-6 grid gap-3 sm:grid-cols-3"><Metric label="Managed service" value="$2,000" /><Metric label="Reward pool" value="$500" /><Metric label="Independent checks" value="4" /></div>
      </header>

      {receipt.summary ? <section className="mt-6 grid gap-4 md:grid-cols-2">
        <Panel title="Observed answers"><div className="grid grid-cols-4 gap-2">{Object.entries(receipt.summary.distribution).map(([key, value]) => <Metric key={key} label={key} value={String(value)} />)}</div><p className="mt-4 text-xs leading-5 text-white/40">{receipt.summary.receiptMeaning}</p></Panel>
        <Panel title="Evidence and delivery"><dl className="grid grid-cols-2 gap-3 text-sm"><Item label="High / medium / low" value={`${receipt.summary.evidenceQuality.HIGH} / ${receipt.summary.evidenceQuality.MEDIUM} / ${receipt.summary.evidenceQuality.LOW}`} /><Item label="Contributor payouts" value={`$${receipt.summary.contributorPayoutUsd}`} /><Item label="Median verification" value={`${receipt.summary.medianVerificationMinutes ?? '—'} min`} /><Item label="Review cost" value={`$${receipt.summary.reviewCostUsd}`} /></dl></Panel>
      </section> : null}

      <section className="mt-6 grid gap-3 md:grid-cols-2">{receipt.missions.map((mission) => <article key={mission.ordinal} className="rounded-2xl border border-white/10 bg-white/[0.035] p-5">
        <div className="flex items-center justify-between"><p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#62efff]">Independent check {mission.ordinal}</p><b>{mission.outcome?.kind ?? mission.status}</b></div>
        <h2 className="mt-3 text-xl font-black">{mission.place}</h2>
        <p className="mt-3 text-sm leading-6 text-white/60">{mission.outcome?.summary ?? 'No accepted observation.'}</p>
        <div className="mt-4 grid grid-cols-2 gap-2"><Metric label="Evidence" value={mission.evidenceQuality ?? '—'} /><Metric label="Freshness" value={mission.evidenceFreshnessHours === null ? '—' : `${mission.evidenceFreshnessHours}h`} /><Metric label="Contributor paid" value={mission.contributorPayoutUsd === null ? '—' : `$${mission.contributorPayoutUsd}`} /><Metric label="Refresh by" value={mission.refreshAt ? new Date(mission.refreshAt).toLocaleString() : '—'} /></div>
        {mission.evidenceReference ? <div className="mt-3 rounded-xl border border-white/8 bg-black/25 p-3 text-[10px] text-white/45"><b className="text-white/70">Evidence {mission.evidenceReference.reference}</b><span className="mt-1 block">{mission.evidenceReference.evidenceDecision ?? 'decision unavailable'} · proximity {mission.evidenceReference.proximityDecision ?? 'not public'} · {mission.evidenceReference.settledOnChain ? 'settled' : 'not settled'}</span>{mission.evidenceReference.publicDareHref ? <a href={mission.evidenceReference.publicDareHref} className="mt-2 inline-block text-[#8cf5ff] underline-offset-4 hover:underline">Open public mission receipt</a> : null}</div> : null}
        {mission.escrowHistory.length > 1 ? <div className="mt-3 rounded-xl border border-amber-300/18 bg-amber-300/[0.06] p-3"><b className="text-xs text-amber-100">Replacement disclosed</b>{mission.escrowHistory.map((attempt) => <p key={attempt.sequence} className="mt-2 text-[10px] leading-4 text-white/48">#{attempt.sequence} {attempt.kind.toLowerCase()} · {attempt.replacementKind?.toLowerCase() ?? 'original'} · {attempt.evidenceReference?.reference ?? 'no evidence reference'}{attempt.replacementReason ? ` · ${attempt.replacementReason}` : ''}{attempt.fundingTreatment ? ` · ${attempt.fundingTreatment.toLowerCase().replaceAll('_', ' ')}` : ''}</p>)}</div> : null}
      </article>)}</section>

      <Panel title="Field Station acquisition — reported separately" className="mt-6"><div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{Object.entries(receipt.fieldStationAcquisition.counts).map(([key, value]) => <Metric key={key} label={key.replaceAll('_', ' ')} value={String(value)} />)}</div><p className="mt-4 text-xs leading-5 text-white/40">{receipt.fieldStationAcquisition.meaning}</p></Panel>

      <section className="mt-6 grid gap-4 md:grid-cols-2">
        <Panel title="Rights boundary"><dl className="space-y-3 text-xs leading-5"><Item label="BaseDare display" value={receipt.rights.baseDareDisplay} /><Item label="Buyer use" value={receipt.rights.buyerUse} /><Item label="Sponsor commercial reuse" value={receipt.rights.sponsorCommercialReuse} /></dl><p className="mt-3 text-xs leading-5 text-amber-100/65">{receipt.rights.sponsorCommercialReuseMeaning}</p></Panel>
        <Panel title="Method and privacy"><p className="text-xs leading-5 text-white/55">{receipt.method.evidenceBoundary}</p><p className="mt-2 text-xs leading-5 text-white/55">{receipt.method.privacyBoundary}</p><p className="mt-2 text-xs leading-5 text-white/55">{receipt.method.negativeTruth}</p></Panel>
      </section>

      <Panel title="What this receipt does not claim" className="mt-6"><ul className="space-y-2 text-xs leading-5 text-white/50">{receipt.limitations.map((limitation) => <li key={limitation}>— {limitation}</li>)}</ul></Panel>

      <Panel title="What should happen next?" className="mt-6"><div id="repeat-decision"><SprintRepeatDecision receiptCode={receipt.receiptCode} originalQuestion={receipt.question} /></div></Panel>
      <p className="mt-5 text-center text-[10px] uppercase tracking-[0.16em] text-white/25">{receipt.receiptCode} · Four accepted observations, preserved disagreement, disclosed replacements.</p>
    </div>
  </main>;
}

function Panel({ title, children, className = '' }: { title: string; children: React.ReactNode; className?: string }) { return <section className={`rounded-2xl border border-white/10 bg-white/[0.035] p-5 ${className}`}><h2 className="mb-4 text-lg font-black">{title}</h2>{children}</section>; }
function Metric({ label, value }: { label: string; value: string }) { return <div className="rounded-xl border border-white/8 bg-black/30 p-3"><b className="text-xl">{value}</b><p className="mt-1 text-[8px] font-black uppercase tracking-[0.12em] text-white/35">{label}</p></div>; }
function Item({ label, value }: { label: string; value: string }) { return <div><dt className="text-[9px] font-black uppercase tracking-[0.12em] text-white/35">{label}</dt><dd className="mt-1 font-bold">{value}</dd></div>; }
