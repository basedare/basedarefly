'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSocialAction } from '@/hooks/useSocialAction';
import { linkPersonalJournal, unlinkPersonalJournal } from '@/hooks/useAdventureProgress';
import { EMPTY_ADVENTURES, type AdventureProgress } from '@/lib/adventure-progress';
import { eligibleFrame, mergePersonalProgress, PASSPORT_FRAMES, type PassportEvidenceSnapshot, type PassportFrame } from '@/lib/passport-progression';
import { trackClientEvent } from '@/lib/analytics';
import PassportStamp from './PassportStamp';

type SavedJournal = { revision: number; progress: AdventureProgress; updatedAt: string };
type AccountData = { journal: SavedJournal | null; evidence: PassportEvidenceSnapshot };
const evidenceLabel = { personal: 'Personal · self-reported', visit: 'Confirmed visit · QR + GPS', contribution: 'Approved contribution', crew: 'Crew-reported · two accounts' };
const frames: Record<PassportFrame, string> = { classic: 'Classic', story: 'Storyteller violet', pathfinder: 'Pathfinder mint', local: 'Helpful Local gold' };
const borders: Record<PassportFrame, string> = { classic: 'border-white/15', story: 'border-violet-300/60', pathfinder: 'border-emerald-200/60', local: 'border-amber-200/60' };

export default function PassportAccountPanel({ progress, accountLinked, area, onPublicName }: { progress: AdventureProgress; accountLinked: boolean; area: { lat: number; lng: number }; onPublicName: (name: string | null) => void }) {
  const { wallet, headers } = useSocialAction();
  const [data, setData] = useState<AccountData | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'verify' | 'error'>('loading');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [confirmClear, setConfirmClear] = useState(false);
  const [frame, setFrame] = useState<PassportFrame>('classic');
  const generation = useRef(0);
  const currentProgress = useRef(progress);
  useEffect(() => { currentProgress.current = progress; }, [progress]);
  const request = useCallback(async (method: string, body?: unknown, prompt = false) => {
    // Let a human finish wallet verification before starting the network timeout.
    const auth = wallet ? await headers(method === 'GET' ? 'passport:read' : method === 'PUT' ? 'passport:save' : 'passport:delete', prompt) : {};
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 12000);
    try {
      const query = new URLSearchParams({ lat: String(area.lat), lng: String(area.lng) });
      if (wallet) query.set('wallet', wallet);
      const response = await fetch('/api/adventures/passport?' + query, { method, cache: 'no-store', signal: controller.signal, headers: { ...auth, ...(body ? { 'Content-Type': 'application/json' } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
      const result = await response.json();
      if (!response.ok) { const error = new Error(result.error || 'Passport unavailable. Please retry.'); Object.assign(error, { status: response.status }); throw error; }
      return result.data;
    } finally { window.clearTimeout(timer); }
  }, [wallet, headers, area.lat, area.lng]);

  useEffect(() => {
    const version = ++generation.current;
    let active = true;
    void request('GET').then((value: AccountData) => { if (active && generation.current === version) { setData(value); setState('ready'); } })
      .catch((error) => { if (active) { setState(error.status === 401 ? 'verify' : 'error'); setMessage(error.message); } });
    try {
      const saved = localStorage.getItem('basedare:passport-frame:' + (wallet || 'guest'));
      if (PASSPORT_FRAMES.includes(saved as PassportFrame)) setFrame(saved as PassportFrame);
    } catch { /* Optional device preference. */ }
    return () => { active = false; generation.current++; };
  }, [request, wallet]);

  useEffect(() => { onPublicName(state === 'ready' ? data?.evidence.publicName ?? null : null); }, [onPublicName, data?.evidence.publicName, state]);

  async function action(kind: 'load' | 'save' | 'clear' | 'evidence') {
    if (busy) return;
    const version = generation.current;
    setBusy(true); setMessage('');
    try {
      const fresh: AccountData = await request('GET', undefined, true);
      if (version !== generation.current) return;
      if (kind === 'save' && wallet) {
        const merged = mergePersonalProgress(fresh.journal?.progress ?? EMPTY_ADVENTURES, currentProgress.current);
        const saved: SavedJournal = await request('PUT', { wallet, revision: fresh.journal?.revision ?? 0, progress: merged }, true);
        if (version !== generation.current) return;
        // Include any steps taken while the save request was in flight; those remain local until the next save.
        const local = mergePersonalProgress(saved.progress, currentProgress.current);
        linkPersonalJournal(wallet, local);
        setData({ ...fresh, journal: saved });
        setMessage('Account copy saved. New changes stay on this device until you save again.');
        trackClientEvent('passport_account_saved', { run_count: saved.progress.runs.length });
      } else if (kind === 'clear' && wallet) {
        if (fresh.journal) {
          const cleared = await request('DELETE', { wallet, revision: fresh.journal.revision }, true);
          if (version !== generation.current) return;
          setData({ ...fresh, journal: { ...fresh.journal, revision: cleared.revision, progress: EMPTY_ADVENTURES } });
        } else setData(fresh);
        if (accountLinked) linkPersonalJournal(wallet, EMPTY_ADVENTURES);
        setConfirmClear(false);
        setMessage('Account memories cleared. Confirmed visits, contributions and any separate guest-device journal are unchanged.');
      } else {
        if (kind === 'load' && wallet && fresh.journal) {
          // An explicit load restores only this account. A separate guest copy
          // stays untouched; already-linked unsaved work is merged, never lost.
          const loaded = accountLinked ? mergePersonalProgress(fresh.journal.progress, currentProgress.current) : fresh.journal.progress;
          linkPersonalJournal(wallet, loaded);
          setMessage('Account copy loaded on this device. Your separate guest journal is kept. New changes need Save and merge.');
        } else setMessage(kind === 'load' && wallet ? 'No account copy yet. Choose Save and merge when you want to attach this device journal.' : 'Passport evidence refreshed.');
        setData(fresh);
      }
      setState('ready');
    } catch (error) {
      if (version !== generation.current) return;
      setMessage(error instanceof Error ? error.message : 'Could not update your Passport. Your device copy is still available.');
    } finally { if (version === generation.current) setBusy(false); }
  }
  function exportJournal() {
    const url = URL.createObjectURL(new Blob([JSON.stringify({ version: 1, evidence: 'personal_self_reported', progress }, null, 2)], { type: 'application/json' }));
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'basedare-personal-journal.json'; anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  const achievements = data?.evidence.achievements ?? [];
  const selected = eligibleFrame(frame, achievements) ? frame : 'classic';
  return <div className="mt-7 space-y-5 border-t border-white/10 pt-5">
    <div className="bd-well p-4">
      <h3 className="font-black text-white">Keep your Passport across devices</h3>
      <p className="mt-2 text-sm leading-6 text-white/65">Start freely. When you’re ready, save your latest 30 personal runs to your account. Saving merges both copies; it never upgrades them into verified visits. Your area is rounded to roughly 100 metres.</p>
      {!wallet ? <p className="mt-3 text-sm text-violet-100">Use Sign in in the navigation to connect an account. Your device journal remains available.</p> : <p className="mt-3 text-xs leading-5 text-white/65">{accountLinked ? 'This device is using this account’s local journal.' : 'This device is using its guest journal. It is attached only when you choose Save and merge.'} {data?.journal ? 'Account copy last saved ' + new Date(data.journal.updatedAt).toLocaleString() + '.' : ''}</p>}
      <div className="mt-4 flex flex-wrap gap-3">
        {wallet ? <><button className="bd-action !text-xs" disabled={busy} onClick={() => void action('load')}>{busy ? 'Working…' : state === 'verify' ? 'Verify account and load' : 'Load account record'}</button><button className="bd-action bd-action--violet !text-xs" disabled={busy} onClick={() => void action('save')}>Save and merge</button></> : null}
        <button className="bd-action !text-xs" onClick={exportJournal}>Export device journal</button>
        {wallet && accountLinked ? <button className="bd-action !text-xs" onClick={() => { unlinkPersonalJournal(wallet); setMessage('Using the separate guest-device journal. The account copy remains saved.'); }}>Use guest journal</button> : null}
      </div>
      {wallet && data?.journal ? <div className="mt-3">
        {!confirmClear ? <button className="min-h-11 text-xs text-white/60 underline" onClick={() => setConfirmClear(true)}>Clear account memories</button> : <div className="rounded-xl border border-amber-200/30 p-3"><p className="text-xs leading-5 text-amber-100">Clear the account copy and its linked local journal? Export first if you want a backup. A revision counter stays to reject stale writes.</p><div className="mt-2 flex gap-3"><button className="bd-action !text-xs" disabled={busy} onClick={() => void action('clear')}>Clear memories</button><button className="bd-action !text-xs" onClick={() => setConfirmClear(false)}>Keep memories</button></div></div>}
      </div> : null}
      {message ? <p role="status" className="mt-3 text-xs leading-5 text-amber-100">{message}</p> : null}
    </div>
    {state === 'loading' ? <p role="status" className="text-sm text-white/60">Checking Passport evidence…</p> : state !== 'ready' ? <div className="bd-well p-4"><p className="text-sm text-white/65">{state === 'verify' ? 'Your confirmed visits and approved contributions are private until you verify your account.' : 'Evidence is unavailable right now. Your personal journal still works.'}</p><button className="bd-action mt-3 !text-xs" disabled={busy} onClick={() => void action('evidence')}>Retry evidence</button></div> : data ? <>
      <div className={'rounded-2xl border-2 p-4 sm:p-5 ' + borders[selected]}>
        <h3 className="font-black text-white">Earned titles & Passport frames</h3>
        <p className="mt-2 text-xs leading-5 text-white/60">Frames are decorative. They confer no payment eligibility or extra reputation. Evidence is checked when this Passport opens.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">{achievements.map((item) => <div className="bd-card p-3" key={item.id}><div className="flex items-center gap-2"><PassportStamp evidence={item.evidence} earned={Boolean(item.earnedAt)}/><div><h4 className="text-sm font-bold text-white">{item.title}</h4><p className="mt-1 text-xs text-white/60">{item.earnedAt ? 'Earned · ' + new Date(item.earnedAt).toLocaleDateString() : 'To earn'}</p></div></div><p className="mt-2 text-xs font-bold text-violet-100">{evidenceLabel[item.evidence]}</p><p className="mt-2 text-xs leading-5 text-white/65">{item.rule}</p></div>)}</div>
        {!wallet ? <p className="mt-3 text-sm text-white/60">Sign in and verify to check earned titles.</p> : null}
        <label className="mt-4 block text-xs font-bold text-white/75">Passport frame<select className="mt-2 block min-h-11 w-full rounded-xl border border-white/20 bg-[#181222] px-3 text-sm text-white" value={selected} onChange={(event) => { const value = event.target.value as PassportFrame; if (!eligibleFrame(value, achievements)) return; setFrame(value); try { localStorage.setItem('basedare:passport-frame:' + (wallet || 'guest'), value); } catch { /* Optional. */ } }}>{PASSPORT_FRAMES.map((value) => <option key={value} value={value} disabled={!eligibleFrame(value, achievements)}>{frames[value]}{eligibleFrame(value, achievements) ? '' : ' · earn its title first'}</option>)}</select></label>
      </div>
      <div className="bd-well p-4"><h3 className="font-black text-white">Confirmed place stamps</h3><p className="mt-2 text-xs leading-5 text-white/60">One illustrated stamp per active place with a confirmed venue QR + GPS check-in. We check your latest 500 visits. A personal checkbox or approved photo cannot earn these.</p>
        {!data.evidence.stamps.length ? <p className="mt-3 text-sm text-white/65">{wallet ? 'No eligible confirmed visits yet.' : 'Verify your account to see your stamps.'} <Link href="/map" className="text-cyan-100 underline">Find a place</Link> and use its official check-in instructions.</p> : <ul className="mt-4 grid gap-3 sm:grid-cols-2">{data.evidence.stamps.map((stamp) => <li key={stamp.id} className="bd-card p-3"><Link href={'/venues/' + encodeURIComponent(stamp.slug)} className="flex min-h-11 items-center gap-2"><PassportStamp evidence="visit"/><div><h4 className="font-bold text-white">{stamp.name}</h4><p className="mt-1 text-xs text-emerald-100">Confirmed · QR + GPS</p><p className="mt-1 text-xs text-white/60">{new Date(stamp.earnedAt).toLocaleDateString()}</p></div></Link></li>)}</ul>}
      </div>
      <div className="bd-well p-4"><h3 className="font-black text-white">This week, build local memory</h3><p className="mt-2 text-sm text-violet-100">{data.evidence.community.accepted}/{data.evidence.community.target} accepted place updates</p><p className="mt-2 text-xs leading-5 text-white/65">Help document five useful updates near your selected map area (roughly 22 km each way). Counts currently approved, non-seeded contributions reviewed this week, Monday to Sunday in Siargao time. {wallet ? 'You contributed ' + data.evidence.community.yours + '.' : ''} Reviews can change the count. No automatic cash reward.</p><Link href="/map" className="bd-action mt-3 !text-xs">Contribute at a place</Link></div>
      {data.evidence.memories.length ? <div><h3 className="font-black text-white">Contributions & shared outings</h3><ul className="mt-3 space-y-3">{data.evidence.memories.map((memory) => <li key={memory.id} className="bd-card p-4"><Link href={memory.href} className="block min-h-11 font-bold text-white">{memory.title}</Link><p className="text-xs text-violet-100">{evidenceLabel[memory.evidence]} · {memory.place}</p><p className="mt-2 text-xs text-white/60">{new Date(memory.occurredAt).toLocaleDateString()}{memory.evidence === 'crew' ? ' · Both accounts reported attending; this is not GPS-verified.' : ' · Currently approved for public display.'}</p></li>)}</ul></div> : null}
      <div className="bd-well p-4"><h3 className="font-black text-white">Your existing venue offers</h3><p className="mt-2 text-xs leading-5 text-white/60">An eligible venue check-in can allocate an offer under the conditions shown at that place before you start. Titles and personal stamps do not create a new entitlement.</p>
        {!data.evidence.perks.length ? <p className="mt-3 text-sm text-white/65">No unredeemed, unexpired check-in offers to show.</p> : <ul className="mt-3 space-y-3">{data.evidence.perks.map((perk) => <li key={perk.checkInId} className="bd-card p-4"><h4 className="font-bold text-white">{perk.title}</h4><Link className="mt-1 block min-h-11 py-3 text-xs text-cyan-100" href={'/venues/' + encodeURIComponent(perk.slug)}>{perk.place} · view place and terms</Link><p className="text-xs leading-5 text-white/70">{perk.conditions}</p><p className="mt-2 text-xs text-amber-100">Expires {new Date(perk.expiresAt).toLocaleString()} · show staff code {perk.code}</p><p className="mt-2 text-xs text-white/50">Private redemption code. Availability is rechecked on redemption.</p></li>)}</ul>}
      </div>
    </> : null}
  </div>;
}
