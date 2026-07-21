'use client';

import { useState } from 'react';
import type { FormEvent } from 'react';
import { CheckCircle2, Loader2, MessageSquareText } from 'lucide-react';

import {
  ACTIVATION_CLOSE_ROOM_DECISIONS,
  type ActivationCloseRoomDecision,
  FIRST_NODE_TERMS_VERSION,
} from '@/lib/first-node-conversion';
import { MANAGED_FIELD_SPRINT_BUDGET_RANGE } from '@/lib/financial-canon';

const decisionLabels: Record<ActivationCloseRoomDecision, string> = {
  APPROVE_SCOPE: 'Approve scope',
  NEEDS_INFO: 'Ask a question',
  CORRECT_SCOPE: 'Correct scope',
  DECLINE: 'Decline',
};

const inputClass = 'w-full rounded-[16px] border border-white/10 bg-black/30 px-3.5 py-3 text-sm font-semibold text-white outline-none placeholder:text-white/24 focus:border-cyan-300/35';
const labelClass = 'mb-1.5 block text-[9px] font-black uppercase tracking-[0.2em] text-white/38';

export default function CloseRoomDecisionForm({ token }: { token: string }) {
  const [decision, setDecision] = useState<ActivationCloseRoomDecision>('APPROVE_SCOPE');
  const [contactName, setContactName] = useState('');
  const [email, setEmail] = useState('');
  const [responderRole, setResponderRole] = useState('manager');
  const [authority, setAuthority] = useState('authorized_to_approve');
  const [channel, setChannel] = useState('close_room');
  const [message, setMessage] = useState('');
  const [timeline, setTimeline] = useState('this_month');
  const [paymentPreference, setPaymentPreference] = useState('discuss');
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ status: string; responseId: string | null } | null>(null);
  const needsContact = decision === 'APPROVE_SCOPE' || decision === 'NEEDS_INFO';

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      if (decision === 'APPROVE_SCOPE' && !confirmed) {
        throw new Error('Confirm the approval boundary first.');
      }
      const response = await fetch(`/api/activation-close-room/${encodeURIComponent(token)}/response`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId: crypto.randomUUID(),
          decision,
          contactName: contactName.trim(),
          responderRole,
          authority,
          channel,
          email: email.trim().toLowerCase(),
          message: message.trim() || null,
          budgetRange: MANAGED_FIELD_SPRINT_BUDGET_RANGE,
          timeline,
          paymentPreference,
          termsVersion: decision === 'APPROVE_SCOPE' ? FIRST_NODE_TERMS_VERSION : null,
        }),
      });
      const payload = await response.json().catch(() => null) as {
        success?: boolean;
        error?: string;
        data?: { status?: string; responseId?: string | null };
      } | null;
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || 'Could not record the decision.');
      }
      setResult({
        status: payload.data?.status || 'RECORDED',
        responseId: payload.data?.responseId ?? null,
      });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Could not record the decision.');
    } finally {
      setSubmitting(false);
    }
  }

  if (result) {
    return (
      <div id="buyer-response" className="rounded-[24px] border border-emerald-300/18 bg-emerald-300/[0.065] p-5">
        <CheckCircle2 className="h-7 w-7 text-emerald-200" />
        <h3 className="mt-3 text-xl font-black text-white">Decision recorded.</h3>
        <p className="mt-2 text-sm leading-6 text-white/56">
          Current intake state: {result.status.replace(/_/g, ' ').toLowerCase()}. Scope approval does not confirm payment or launch a mission.
        </p>
        {result.responseId ? <p className="mt-2 font-mono text-[9px] text-white/32">Response {result.responseId}</p> : null}
      </div>
    );
  }

  return (
    <form id="buyer-response" onSubmit={submit} className="rounded-[24px] border border-white/[0.09] bg-black/30 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-cyan-100/64">
        <MessageSquareText className="h-4 w-4" />
        Authorized response
      </div>
      <h3 className="mt-3 text-xl font-black text-white">Close the loop here.</h3>
      <p className="mt-2 text-xs leading-5 text-white/46">No account or wallet. Payment and launch remain separate human-approved gates.</p>

      <div className="mt-4 grid grid-cols-2 gap-2">
        {ACTIVATION_CLOSE_ROOM_DECISIONS.map((value) => (
          <button key={value} type="button" onClick={() => setDecision(value)} className={`rounded-[16px] border px-3 py-2.5 text-[10px] font-black uppercase tracking-[0.13em] transition ${decision === value ? 'border-cyan-300/28 bg-cyan-300/[0.1] text-cyan-100' : 'border-white/[0.08] bg-white/[0.025] text-white/48 hover:text-white/72'}`}>
            {decisionLabels[value]}
          </button>
        ))}
      </div>

      <div className="mt-4 grid gap-3">
        {needsContact ? (
          <>
            <div><label className={labelClass}>Name</label><input required value={contactName} onChange={(event) => setContactName(event.target.value)} className={inputClass} /></div>
            <div><label className={labelClass}>Work email</label><input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} className={inputClass} /></div>
          </>
        ) : null}
        <div className="grid gap-3 sm:grid-cols-2">
          <div><label className={labelClass}>Role</label><select value={responderRole} onChange={(event) => setResponderRole(event.target.value)} className={inputClass}><option value="owner">Owner</option><option value="manager">Manager</option><option value="authorized_agent">Authorized agent</option><option value="staff">Staff</option></select></div>
          <div><label className={labelClass}>Authority</label><select value={authority} onChange={(event) => setAuthority(event.target.value)} className={inputClass}><option value="authorized_to_approve">Can approve scope</option><option value="decision_maker">Decision maker</option><option value="authorized_to_discuss">Can discuss only</option><option value="needs_owner_approval">Needs owner approval</option></select></div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div><label className={labelClass}>Timing</label><select value={timeline} onChange={(event) => setTimeline(event.target.value)} className={inputClass}><option value="this_week">This week</option><option value="this_month">This month</option><option value="next_90_days">Next 90 days</option><option value="exploring">Exploring</option></select></div>
          <div><label className={labelClass}>Payment path</label><select value={paymentPreference} onChange={(event) => setPaymentPreference(event.target.value)} className={inputClass}><option value="discuss">Discuss first</option><option value="invoice">Invoice</option><option value="usdc">USDC</option><option value="card">Card</option></select></div>
        </div>
        <div><label className={labelClass}>{decision === 'CORRECT_SCOPE' ? 'Correction' : decision === 'NEEDS_INFO' ? 'Question' : 'Optional note'}</label><textarea required={decision === 'CORRECT_SCOPE' || decision === 'NEEDS_INFO'} value={message} onChange={(event) => setMessage(event.target.value)} className={`${inputClass} min-h-24 resize-y`} /></div>
        <div><label className={labelClass}>Response channel</label><select value={channel} onChange={(event) => setChannel(event.target.value)} className={inputClass}><option value="close_room">Close room</option><option value="in_person">In person follow-up</option><option value="whatsapp">WhatsApp</option><option value="email">Email</option></select></div>
        {decision === 'APPROVE_SCOPE' ? (
          <label className="flex gap-3 rounded-[17px] border border-amber-300/15 bg-amber-300/[0.05] p-3 text-xs leading-5 text-white/54">
            <input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} className="mt-1" />
            <span>I approve this bounded scope for payment discussion. This does not confirm funding, launch, results, or commercial media rights.</span>
          </label>
        ) : null}
      </div>

      {error ? <p className="mt-3 text-sm font-semibold text-rose-200">{error}</p> : null}
      <button type="submit" disabled={submitting} className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-[17px] border border-cyan-300/25 bg-cyan-300/[0.12] px-4 text-xs font-black uppercase tracking-[0.15em] text-cyan-100 transition hover:bg-cyan-300/[0.17] disabled:opacity-55">
        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        Record decision
      </button>
    </form>
  );
}
