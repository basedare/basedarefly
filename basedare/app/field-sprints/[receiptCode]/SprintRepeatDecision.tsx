'use client';

import { CheckCircle2, Loader2 } from 'lucide-react';
import { useState, type FormEvent } from 'react';

import {
  FIELD_SPRINT_REPEAT_TERMS_VERSION,
  type FieldSprintRepeatDecision,
} from '@/lib/verified-field-sprint-policy';

const DECISIONS: Array<{ id: FieldSprintRepeatDecision; label: string; detail: string }> = [
  { id: 'REPEAT', label: 'Repeat', detail: 'Run the same bounded question again.' },
  { id: 'ADJUST', label: 'Adjust', detail: 'Change the question or observation window.' },
  { id: 'ASK', label: 'Ask BaseDare', detail: 'Discuss the evidence or the next test.' },
  { id: 'STOP', label: 'Stop', detail: 'Record that no follow-up is wanted.' },
];

export default function SprintRepeatDecision({ receiptCode, originalQuestion }: { receiptCode: string; originalQuestion: string }) {
  const [decision, setDecision] = useState<FieldSprintRepeatDecision>('REPEAT');
  const [contactName, setContactName] = useState('');
  const [email, setEmail] = useState('');
  const [nextQuestion, setNextQuestion] = useState(originalQuestion);
  const [note, setNote] = useState('');
  const [requestId] = useState(() => crypto.randomUUID());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/field-sprints/${encodeURIComponent(receiptCode)}/decision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId,
          decision,
          contactName: contactName.trim() || null,
          email: email.trim().toLowerCase() || null,
          nextQuestion: decision === 'ADJUST' ? nextQuestion.trim() : null,
          note: note.trim() || null,
          termsVersion: FIELD_SPRINT_REPEAT_TERMS_VERSION,
        }),
      });
      const payload = await response.json().catch(() => null) as { success?: boolean; error?: string } | null;
      if (!response.ok || !payload?.success) throw new Error(payload?.error || 'Could not record the decision.');
      setSaved(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not record the decision.');
    } finally {
      setBusy(false);
    }
  }

  if (saved) return <div className="rounded-2xl border border-emerald-300/20 bg-emerald-300/[0.07] p-5"><CheckCircle2 className="h-6 w-6 text-emerald-200" /><h3 className="mt-3 text-xl font-black">Decision recorded.</h3><p className="mt-2 text-sm text-white/50">This does not confirm funding or launch another Sprint. BaseDare will reply if you requested a follow-up.</p></div>;

  const needsReply = decision !== 'STOP';
  return <form onSubmit={submit} className="space-y-4">
    <div className="grid gap-2 sm:grid-cols-4">{DECISIONS.map((option) => <button key={option.id} type="button" onClick={() => setDecision(option.id)} className={`rounded-xl border p-3 text-left ${decision === option.id ? 'border-[#ffe36a]/45 bg-[#ffe36a]/10' : 'border-white/10 bg-black/25'}`}><b className="text-sm">{option.label}</b><span className="mt-1 block text-[10px] leading-4 text-white/40">{option.detail}</span></button>)}</div>
    {needsReply ? <div className="grid gap-3 sm:grid-cols-2"><Field label="Name" value={contactName} onChange={setContactName} required /><Field label="Reply email" value={email} onChange={setEmail} required type="email" /></div> : null}
    {decision === 'ADJUST' ? <label className="block"><span className="text-[9px] font-black uppercase tracking-[0.14em] text-white/40">Adjusted field question</span><textarea value={nextQuestion} onChange={(event) => setNextQuestion(event.target.value)} required className="mt-2 min-h-20 w-full rounded-xl border border-white/10 bg-black/35 p-3 text-sm" /></label> : null}
    <label className="block"><span className="text-[9px] font-black uppercase tracking-[0.14em] text-white/40">Note {decision === 'STOP' ? '(optional)' : ''}</span><textarea value={note} onChange={(event) => setNote(event.target.value)} className="mt-2 min-h-16 w-full rounded-xl border border-white/10 bg-black/35 p-3 text-sm" /></label>
    {error ? <p className="text-sm text-red-200">{error}</p> : null}
    <button disabled={busy} className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#f5c518] px-5 text-[10px] font-black uppercase tracking-[0.14em] text-black disabled:opacity-50">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}Record {decision.toLowerCase()}</button>
    <p className="text-[10px] leading-4 text-white/30">A repeat or adjustment is a buyer request only. It does not approve scope, confirm payment, fund rewards, or launch missions.</p>
  </form>;
}

function Field({ label, value, onChange, required, type = 'text' }: { label: string; value: string; onChange: (value: string) => void; required?: boolean; type?: string }) {
  return <label><span className="text-[9px] font-black uppercase tracking-[0.14em] text-white/40">{label}</span><input type={type} value={value} onChange={(event) => onChange(event.target.value)} required={required} className="mt-2 h-11 w-full rounded-xl border border-white/10 bg-black/35 px-3 text-sm" /></label>;
}
