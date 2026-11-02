'use client';
import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { ACTIVITY_SUGGESTIONS } from '@/lib/home-activities';
import { ACQUISITION_CHANNELS, acquisitionTarget } from '@/lib/acquisition-policy';
type Channel = keyof typeof ACQUISITION_CHANNELS;
export default function AcquisitionKit({ authenticate, headers }: { authenticate: () => Promise<boolean>; headers: Record<string, string> }) {
  const [activityId, setActivity] = useState('wave-or-ex');
  const [channel, setChannel] = useState<Channel>('x');
  const [slug, setSlug] = useState(''); const [creator, setCreator] = useState('');
  const [campaign, setCampaign] = useState('chain-reaction-v1');
  const [permission, setPermission] = useState(false);
  const [result, setResult] = useState(''); const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  const input = 'bd-well mt-2 min-h-12 w-full px-3 text-base';
  async function create(event: FormEvent) {
    event.preventDefault(); setResult(''); setError('');
    if (!(await authenticate())) return setError('Operator sign-in required.');
    setBusy(true);
    try {
      const acquisition = { activityId, channel, permissionConfirmed: true as const };
      const target = acquisitionTarget(acquisition);
      const r = await fetch('/api/admin/creator-attribution', { method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ slug, creatorCode: creator, contentCode: slug, campaignCode: campaign, ...target, acquisition }), signal: AbortSignal.timeout(10000) });
      const b = await r.json(); if (!r.ok || !b.success) throw Error(b.error || 'Could not prepare this link.');
      setResult(b.data.publicPath);
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not save the link.'); }
    finally { setBusy(false); }
  }
  return <section className="bd-surface mt-6 p-5 sm:p-7">
    <h2 className="text-2xl font-black">Chain Reaction · one challenge, your people</h2>
    <p className="mt-3 text-sm leading-6 text-white/65">Prepare a separate tracked link for each real post, consenting creator or permitted QR placement. It opens the actual free challenge. Creating a link does not post, invite anyone or establish a venue partnership.</p>
    <form onSubmit={create} className="mt-5 grid gap-4 sm:grid-cols-2">
      <label>Challenge<select value={activityId} onChange={e => { setActivity(e.target.value); setResult(''); }} className={input}>{ACTIVITY_SUGGESTIONS.map(a => <option value={a.id} key={a.id}>{a.title}</option>)}</select></label>
      <label>Channel<select value={channel} onChange={e => { setChannel(e.target.value as Channel); setPermission(false); setResult(''); }} className={input}>{Object.entries(ACQUISITION_CHANNELS).map(([key, label]) => <option value={key} key={key}>{label}</option>)}</select></label>
      <label>Unique link code<input required maxLength={64} pattern="[a-z0-9_-]+" value={slug} onChange={e => { setSlug(e.target.value); setResult(''); }} className={input} placeholder="Your post’s unique code" /></label>
      <label>Actual creator or owned account code<input required maxLength={64} value={creator} onChange={e => { setCreator(e.target.value); setResult(''); }} className={input} placeholder="A real, consenting account" /></label>
      <label>Campaign<input required maxLength={64} value={campaign} onChange={e => { setCampaign(e.target.value); setResult(''); }} className={input} /></label>
      <label className="flex items-center gap-3 text-sm leading-6"><input required type="checkbox" checked={permission} onChange={e => setPermission(e.target.checked)} />I control this channel or have permission for this creator / placement.</label>
      <button disabled={busy || !permission} className="bd-action bd-action--gold min-h-12 !text-sm">{busy ? 'Saving…' : 'Prepare tracked challenge link'}</button>
    </form>
    {result ? <div role="status" className="bd-well mt-4 p-4"><p className="text-sm font-bold text-amber-100">Saved. Review before sharing.</p><a href={result} className="mt-2 inline-block min-h-11 break-all py-2 text-cyan-100">{result}</a><button className="bd-action ml-3 min-h-11 !text-sm" onClick={async () => { try { await navigator.clipboard.writeText(new URL(result, location.origin).href); } catch { setError('Copy is unavailable. Select the link above.'); } }}>Copy link</button></div> : null}
    {error ? <p role="status" className="mt-3 text-sm text-amber-100">{error}</p> : null}
    <Link href="/admin/creator-drop-queue" className="mt-4 inline-flex min-h-11 items-center text-sm font-bold text-cyan-100">Record real creator invitations & follow-up →</Link>
  </section>;
}
