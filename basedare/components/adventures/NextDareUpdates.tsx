'use client';
import { useEffect, useState, type FormEvent } from 'react';
import { RETENTION_CONSENT, RETENTION_TOPICS, type RetentionTopic } from '@/lib/retention-policy';
export default function NextDareUpdates({ activityId, runId }: { activityId: string; runId: string }) {
  const [available, setAvailable] = useState(false), [email, setEmail] = useState(''), [topics, setTopics] = useState<RetentionTopic[]>([]), [consent, setConsent] = useState(false), [busy, setBusy] = useState(false), [message, setMessage] = useState('');
  useEffect(() => {
    const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 5000);
    void fetch('/api/updates/subscribe', { signal: controller.signal, cache: 'no-store' }).then(r => r.ok ? r.json() : null).then(b => { if (!controller.signal.aborted) setAvailable(b?.available === true); }).catch(() => {}).finally(() => clearTimeout(timer));
    return () => { controller.abort(); clearTimeout(timer); };
  }, []);
  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setMessage('');
    try {
      const response = await fetch('/api/updates/subscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, topics, consent, version: RETENTION_CONSENT, activityId, runId }), signal: AbortSignal.timeout(15000) });
      const body = await response.json(); if (!response.ok || !body.success) throw Error(body.error ?? 'Could not request confirmation. Try later.');
      setMessage(body.message); setEmail(''); setConsent(false);
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not request confirmation. Try later.'); }
    finally { setBusy(false); }
  }
  if (!available) return null;
  return <details className="bd-well mt-4 p-4">
    <summary className="min-h-11 cursor-pointer py-2 text-base font-bold text-cyan-100">Get your next dare · optional</summary>
    <p className="mt-2 text-sm leading-6 text-white/70">A little inspiration for your next free afternoon. Choose the occasional emails you’d enjoy. Skip this and keep playing whenever you like.</p>
    <form onSubmit={submit} className="mt-4 space-y-4">
      <label className="block text-sm">Email<input type="email" autoComplete="email" required maxLength={254} value={email} onChange={e => setEmail(e.target.value)} className="bd-well mt-2 min-h-12 w-full px-3 text-base" /></label>
      <fieldset><legend className="mb-2 text-sm font-bold">What would you like?</legend>{Object.entries(RETENTION_TOPICS).map(([key, label]) => <label key={key} className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" checked={topics.includes(key as RetentionTopic)} onChange={e => setTopics(t => e.target.checked ? [...t, key as RetentionTopic] : t.filter(v => v !== key))} />{label}</label>)}</fieldset>
      <label className="flex min-h-11 items-start gap-3 text-sm leading-6"><input type="checkbox" required checked={consent} onChange={e => setConsent(e.target.checked)} className="mt-1" />I want BaseDare emails about these topics. I can unsubscribe at any time. This is separate from saving my adventure.</label>
      <button className="bd-action bd-action--gold min-h-12 !text-sm" disabled={busy || !consent || !topics.length}>{busy ? 'Requesting…' : 'Send my confirmation'}</button>
      <p role="status" className="text-sm leading-6 text-white/70">{message || 'Nothing starts until you confirm by email. No cash or opportunity is guaranteed.'}</p>
    </form>
  </details>;
}
