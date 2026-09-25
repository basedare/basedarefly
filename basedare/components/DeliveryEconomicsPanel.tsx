'use client';

import { useState } from 'react';
import { DELIVERY_ENTRY_KINDS, type DeliveryEntryKind, type summarizeDeliveryEconomics } from '@/lib/delivery-economics';

type Summary = ReturnType<typeof summarizeDeliveryEconomics> & { paidRepeatPurchases: number | null };
export default function DeliveryEconomicsPanel({ sprintId, request }: {
  sprintId: string; request: (method: 'GET' | 'PATCH', body?: unknown) => Promise<unknown>;
}) {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [kind, setKind] = useState<DeliveryEntryKind>('DELIVERY_COST');
  const [amount, setAmount] = useState('');
  const [minutes, setMinutes] = useState('');
  const [note, setNote] = useState('');
  const [requestId, setRequestId] = useState(() => crypto.randomUUID());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function run(save: boolean) {
    setBusy(true); setError('');
    try {
      const result = await request(save ? 'PATCH' : 'GET', save ? {
        action: 'RECORD_ECONOMICS', sprintId, requestId, kind,
        amountUsd: kind === 'RECONCILED' ? 0 : Number(amount),
        minutes: ['DELIVERY_COST', 'ACQUISITION_COST', 'REVISION'].includes(kind) ? Number(minutes) : 0, note,
      } : undefined) as Summary;
      setSummary(result);
      if (save) { setRequestId(crypto.randomUUID()); setNote(''); setAmount(''); setMinutes(''); }
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not load delivery economics.'); }
    finally { setBusy(false); }
  }
  return <details className="mt-4 rounded-2xl border border-white/10 bg-black/25 p-4" onToggle={(event) => { if (event.currentTarget.open && !summary && !busy) void run(false); }}>
    <summary className="cursor-pointer text-sm font-bold">Delivery economics</summary>
    <p className="mt-3 text-xs leading-5 text-white/50">Record actual additional costs, including operator labour at your chosen rate. Existing mission review costs are already included. Refund entries document money returned; they do not transfer funds. Repeat requests are interest, not repeat sales. Later paid deliveries count completed Sprints funded after this receipt by the same buyer wallet, excluding fully refunded service fees.</p>
    {summary ? <div className="mt-3 grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">{[
      ['Cash collected', summary.fundingRecorded ? `$${summary.cashCollectedUsd.toFixed(2)}` : 'Not confirmed'],
      ['Contributor payouts', `$${summary.contributorPayoutUsd.toFixed(2)}`], ['Reward liability', `$${summary.rewardLiabilityUsd.toFixed(2)}`],
      ['Earned revenue', `$${summary.earnedRevenueUsd.toFixed(2)}`], ['Refunds', `$${summary.refundsUsd.toFixed(2)}`],
      ['Recorded costs', `$${summary.recordedCostUsd.toFixed(2)}`], ['Operator time', `${summary.operatorMinutes} min`],
      ['Contribution', summary.contributionUsd === null ? 'Awaiting reconciliation' : `$${summary.contributionUsd.toFixed(2)}`],
      ['Revisions', summary.revisionRounds], ['Repeat / adjust requests', summary.repeatRequests],
      ['Later paid deliveries', summary.paidRepeatPurchases ?? 'Buyer wallet / closed receipt needed'],
    ].map(([label, value]) => <div key={label} className="rounded-xl bg-white/5 p-3"><span className="block text-white/45">{label}</span><b className="mt-1 block">{value}</b></div>)}</div> : null}
    {summary?.costCeilingExceeded ? <p className="mt-3 text-xs text-amber-200">Recorded costs exceed the $650 target. The overrun is retained; review scope and pricing before another sale.</p> : null}
    <div className="mt-4 grid gap-3 sm:grid-cols-3">
      <label className="text-xs">Entry<select value={kind} disabled={busy} onChange={(e) => { setKind(e.target.value as DeliveryEntryKind); setRequestId(crypto.randomUUID()); }} className="mt-1 w-full rounded-lg bg-black p-2">{DELIVERY_ENTRY_KINDS.map((v) => <option key={v} value={v}>{v.replaceAll('_', ' ').toLowerCase()}</option>)}</select></label>
      {kind !== 'RECONCILED' ? <label className="text-xs">Amount (USD)<input type="number" min="0" step="0.01" value={amount} disabled={busy} onChange={(e) => { setAmount(e.target.value); setRequestId(crypto.randomUUID()); }} className="mt-1 w-full rounded-lg bg-black p-2" /></label> : null}
      {['DELIVERY_COST', 'ACQUISITION_COST', 'REVISION'].includes(kind) ? <label className="text-xs">Additional minutes<input type="number" min="0" step="1" value={minutes} disabled={busy} onChange={(e) => { setMinutes(e.target.value); setRequestId(crypto.randomUUID()); }} className="mt-1 w-full rounded-lg bg-black p-2" /></label> : null}
      <label className="text-xs sm:col-span-3">Reference / explanation<textarea minLength={8} maxLength={1000} value={note} disabled={busy} onChange={(e) => { setNote(e.target.value); setRequestId(crypto.randomUUID()); }} className="mt-1 w-full rounded-lg bg-black p-2" placeholder={kind === 'RECONCILED' ? 'Confirm all costs, labour, replacements and refunds are recorded.' : 'Receipt reference, labour rate, revision reason or refund reference'} /></label>
    </div>
    {error ? <p role="alert" className="mt-2 text-sm text-red-200">{error}</p> : null}
    <button type="button" disabled={busy || note.trim().length < 8 || (kind !== 'RECONCILED' && amount === '')} onClick={() => void run(true)} className="mt-3 rounded-xl border border-cyan-200/20 bg-cyan-300/10 px-4 py-2 text-xs font-bold disabled:opacity-40">{busy ? 'Saving…' : kind === 'RECONCILED' ? 'Confirm complete cost record' : 'Record entry'}</button>
  </details>;
}
