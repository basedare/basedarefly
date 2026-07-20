'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { ArrowRight, CheckCircle2, Loader2, MessageSquareText } from 'lucide-react';

import {
  FIRST_NODE_TERMS_VERSION,
  type FirstNodeResponseType,
} from '@/lib/first-node-conversion';
import { getVenueReportSessionKey } from '@/lib/venue-report-client';
import {
  getActivationFunnelAttribution,
  getActivationFunnelSessionKey,
} from '@/lib/activation-funnel-client';

const responseOptions: Array<{ value: FirstNodeResponseType; label: string; detail: string }> = [
  { value: 'REQUEST_PILOT', label: 'Request a pilot', detail: 'Open the scoped approval and funding room.' },
  { value: 'CORRECT_REPORT', label: 'Correct this brief', detail: 'Tell BaseDare what is wrong or stale.' },
  { value: 'ASK_QUESTION', label: 'Ask a question', detail: 'Request one missing detail before deciding.' },
  { value: 'DECLINE', label: 'Not interested', detail: 'Close the loop without a sales chase.' },
];

function uuid() {
  return crypto.randomUUID();
}

const inputClass = 'w-full rounded-[16px] border border-white/10 bg-black/32 px-3.5 py-3 text-sm font-semibold text-white outline-none transition placeholder:text-white/24 focus:border-cyan-300/35';
const labelClass = 'mb-1.5 block text-[9px] font-black uppercase tracking-[0.2em] text-white/38';

export default function FirstNodeVenueResponse({
  venueId,
  venueSlug,
  venueName,
  city,
  audience,
  pilotQuestion,
}: {
  venueId: string;
  venueSlug: string;
  venueName: string;
  city: string | null;
  audience: 'venue' | 'sponsor';
  pilotQuestion: string;
}) {
  const [responseType, setResponseType] = useState<FirstNodeResponseType>('REQUEST_PILOT');
  const [contactName, setContactName] = useState('');
  const [email, setEmail] = useState('');
  const [responderRole, setResponderRole] = useState('manager');
  const [authority, setAuthority] = useState('authorized_to_discuss');
  const [channel, setChannel] = useState('in_person');
  const [message, setMessage] = useState('');
  const [timeline, setTimeline] = useState('this_month');
  const [paymentPreference, setPaymentPreference] = useState('discuss');
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ closeRoomHref: string | null; responseId: string | null } | null>(null);
  const needsContact = responseType === 'REQUEST_PILOT' || responseType === 'ASK_QUESTION';
  const needsMessage = responseType === 'CORRECT_REPORT' || responseType === 'ASK_QUESTION';

  const activationAttribution = useMemo(() => ({
    source: 'venue-report-first-node',
    routedSource: 'venue-report-first-node',
    venueId,
    venueSlug,
    venueName,
    packageId: 'pilot-drop',
    budgetRange: '500_1500',
    goal: 'foot_traffic',
    buyerType: 'venue',
    offerId: 'first-spark',
  }), [venueId, venueName, venueSlug]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      let activationLeadId: string | null = null;
      let closeRoomHref: string | null = null;

      if (responseType === 'REQUEST_PILOT') {
        if (!confirmed) throw new Error('Confirm the pilot boundary before requesting it.');
        const intakeResponse = await fetch('/api/activation-intake', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            company: venueName.slice(0, 140),
            contactName: contactName.trim(),
            email: email.trim().toLowerCase(),
            buyerType: 'venue',
            city: (city || 'General Luna').slice(0, 140),
            venue: venueName.slice(0, 180),
            budgetRange: '500_1500',
            timeline,
            goal: 'foot_traffic',
            packageId: 'pilot-drop',
            notes: [
              `First-node pilot question: ${pilotQuestion}`,
              message.trim() ? `Venue note: ${message.trim()}` : null,
              `Responder role: ${responderRole}.`,
              `Authority: ${authority}.`,
              `Payment preference: ${paymentPreference}.`,
              'This request is not approval, funding, launch, or a venue partnership claim.',
            ].filter(Boolean).join('\n'),
            routedVenueId: venueId,
            routedVenueSlug: venueSlug,
            routedSource: 'venue-report-first-node',
            routedMissionType: 'first-node-question',
            routedMissionTitle: pilotQuestion.slice(0, 180),
            routedProofRequired: 'Accepted place evidence tied to the agreed venue, window, and mission.',
            offerId: 'first-spark',
            funnelSessionKey: getActivationFunnelSessionKey(),
            activationAttribution: getActivationFunnelAttribution(activationAttribution),
            brandMemory: {
              originStory: `${venueName} is evaluating one bounded BaseDare field question.`,
              audience: 'the venue and the next local visitor',
              vibe: 'useful, bounded, proof-backed',
              avoid: 'guaranteed traffic, vague exposure, or an unfunded launch',
              rituals: '',
              desiredFeeling: 'A clear repeat, adjust, or stop decision.',
            },
          }),
        });
        const intakePayload = await intakeResponse.json().catch(() => null) as {
          success?: boolean;
          error?: string;
          data?: { id?: string; closeRoomHref?: string };
        } | null;
        if (!intakeResponse.ok || !intakePayload?.success) {
          throw new Error(intakePayload?.error || 'Could not open the pilot room.');
        }
        activationLeadId = intakePayload.data?.id ?? null;
        closeRoomHref = intakePayload.data?.closeRoomHref ?? null;
      }

      const reportResponse = await fetch(`/api/venues/${encodeURIComponent(venueSlug)}/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'decision-response',
          audience,
          requestId: uuid(),
          responseType,
          sessionKey: getVenueReportSessionKey(venueSlug, audience),
          responderRole: responderRole || null,
          authority: authority || null,
          channel,
          contactName: contactName.trim() || null,
          email: email.trim().toLowerCase() || null,
          contactRoute: email.trim().toLowerCase() || null,
          message: message.trim() || null,
          budgetRange: responseType === 'REQUEST_PILOT' ? '500_1500' : null,
          timeline: responseType === 'REQUEST_PILOT' ? timeline : null,
          paymentPreference: responseType === 'REQUEST_PILOT' ? paymentPreference : null,
          termsVersion: responseType === 'REQUEST_PILOT' ? FIRST_NODE_TERMS_VERSION : null,
          activationLeadId,
        }),
      });
      const responsePayload = await reportResponse.json().catch(() => null) as {
        success?: boolean;
        error?: string;
        response?: { responseId?: string | null };
      } | null;
      if (!reportResponse.ok || !responsePayload?.success) {
        throw new Error(responsePayload?.error || 'Could not record the venue response.');
      }

      setResult({ closeRoomHref, responseId: responsePayload.response?.responseId ?? null });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Could not record the response.');
    } finally {
      setSubmitting(false);
    }
  }

  if (result) {
    return (
      <div className="self-start rounded-[26px] border border-emerald-300/18 bg-emerald-300/[0.065] p-5">
        <CheckCircle2 className="h-8 w-8 text-emerald-200" />
        <h3 className="mt-3 text-2xl font-black text-white">Response recorded.</h3>
        <p className="mt-2 text-sm leading-6 text-white/58">
          {result.closeRoomHref
            ? 'The scoped close room is ready. The pilot is still unfunded and cannot launch until approval and payment are confirmed.'
            : 'BaseDare recorded the correction, question, or decline without creating an account.'}
        </p>
        {result.closeRoomHref ? (
          <Link href={result.closeRoomHref} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-full border border-yellow-300/25 bg-yellow-300 px-5 text-xs font-black uppercase tracking-[0.16em] text-black">
            Open secure close room
            <ArrowRight className="h-4 w-4" />
          </Link>
        ) : null}
        {result.responseId ? <p className="mt-3 font-mono text-[9px] text-white/34">Response {result.responseId}</p> : null}
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="self-start rounded-[26px] border border-white/[0.09] bg-black/36 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.07)]">
      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.22em] text-white/50">
        <MessageSquareText className="h-4 w-4 text-cyan-200" />
        Venue response
      </div>
      <h3 className="mt-3 text-2xl font-black text-white">One clear next move.</h3>
      <p className="mt-2 text-sm leading-6 text-white/50">No account or wallet. An authorized person can request the pilot; anyone can flag a correction.</p>

      <div className="mt-4 grid gap-2">
        {responseOptions.map((option) => (
          <button key={option.value} type="button" onClick={() => setResponseType(option.value)} className={`rounded-[18px] border px-4 py-3 text-left transition ${responseType === option.value ? 'border-cyan-300/28 bg-cyan-300/[0.09]' : 'border-white/[0.08] bg-white/[0.025] hover:bg-white/[0.05]'}`}>
            <span className="block text-sm font-black text-white">{option.label}</span>
            <span className="mt-1 block text-xs leading-5 text-white/42">{option.detail}</span>
          </button>
        ))}
      </div>

      <div className="mt-4 grid gap-3">
        {needsContact ? (
          <>
            <div><label className={labelClass}>Your name</label><input required value={contactName} onChange={(event) => setContactName(event.target.value)} className={inputClass} /></div>
            <div><label className={labelClass}>Work email</label><input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} className={inputClass} /></div>
          </>
        ) : null}
        <div className="grid gap-3 sm:grid-cols-2">
          <div><label className={labelClass}>Role</label><select value={responderRole} onChange={(event) => setResponderRole(event.target.value)} className={inputClass}><option value="owner">Owner</option><option value="manager">Manager</option><option value="staff">Staff</option><option value="authorized_agent">Authorized agent</option><option value="visitor">Visitor</option></select></div>
          <div><label className={labelClass}>Contact channel</label><select value={channel} onChange={(event) => setChannel(event.target.value)} className={inputClass}><option value="in_person">In person</option><option value="whatsapp">WhatsApp</option><option value="instagram">Instagram</option><option value="email">Email</option><option value="other">Other</option></select></div>
        </div>
        {responseType === 'REQUEST_PILOT' ? (
          <>
            <div><label className={labelClass}>Authority</label><select value={authority} onChange={(event) => setAuthority(event.target.value)} className={inputClass}><option value="authorized_to_discuss">Authorized to discuss</option><option value="authorized_to_approve">Authorized to approve scope</option><option value="decision_maker">Decision maker</option><option value="needs_owner_approval">Needs owner approval</option></select></div>
            <div className="grid gap-3 sm:grid-cols-2"><div><label className={labelClass}>Timing</label><select value={timeline} onChange={(event) => setTimeline(event.target.value)} className={inputClass}><option value="this_week">This week</option><option value="this_month">This month</option><option value="next_90_days">Next 90 days</option><option value="exploring">Exploring</option></select></div><div><label className={labelClass}>Payment path</label><select value={paymentPreference} onChange={(event) => setPaymentPreference(event.target.value)} className={inputClass}><option value="discuss">Discuss first</option><option value="invoice">Invoice</option><option value="usdc">USDC</option><option value="card">Card</option></select></div></div>
          </>
        ) : null}
        {needsMessage || responseType === 'REQUEST_PILOT' ? <div><label className={labelClass}>{responseType === 'CORRECT_REPORT' ? 'Correction' : responseType === 'ASK_QUESTION' ? 'Question' : 'Optional note'}</label><textarea required={needsMessage} value={message} onChange={(event) => setMessage(event.target.value)} className={`${inputClass} min-h-24 resize-y`} /></div> : null}
        {responseType === 'REQUEST_PILOT' ? (
          <label className="flex gap-3 rounded-[18px] border border-amber-300/15 bg-amber-300/[0.05] p-3 text-xs leading-5 text-white/54">
            <input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} className="mt-1" />
            <span>I understand this opens an approval room. It does not fund, launch, guarantee outcomes, or create a partnership.</span>
          </label>
        ) : null}
      </div>

      {error ? <p className="mt-3 text-sm font-semibold text-rose-200">{error}</p> : null}
      <button type="submit" disabled={submitting} className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-[18px] border border-cyan-300/25 bg-cyan-300/[0.12] px-5 text-xs font-black uppercase tracking-[0.16em] text-cyan-100 transition hover:bg-cyan-300/[0.17] disabled:opacity-55">
        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {responseType === 'REQUEST_PILOT' ? 'Request scoped pilot' : 'Send response'}
      </button>
    </form>
  );
}
