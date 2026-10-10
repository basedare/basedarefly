'use client';
import ShareAdventure from './ShareAdventure';
import SharedAdventures from './SharedAdventures';
import Link from '@/components/DiscoveryLink';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ArrowLeft, Check, Compass, MapPin, Sparkles } from 'lucide-react';
import PlanShareButton from '@/components/community/PlanShareButton';
import { useAdventureProgress } from '@/hooks/useAdventureProgress';
import { activeAdventure, adventureHref, completeAdventure, updateAdventureStep } from '@/lib/adventure-progress';
import { ACTIVITY_SUGGESTIONS, SIARGAO_ACTIVITY_AREA, suggestionsForArea, type ActivityArea } from '@/lib/home-activities';
import { trackClientEvent } from '@/lib/analytics';

const panel = 'rounded-[1.7rem] border border-white/10 bg-[linear-gradient(145deg,rgba(39,26,64,0.85),rgba(7,8,16,0.98))] p-5 shadow-[0_16px_40px_rgba(0,0,0,0.25),inset_0_1px_0_rgba(255,255,255,0.06)] sm:p-7';
const button = 'bd-action';

export default function AdventureHub({ activityId }: { activityId?: string }) {
  const query = useSearchParams();
  const placeSlug = query.get('place') ?? undefined;
  const viewingShared = Boolean(query.get('post') || query.get('shared') === 'public' || query.get('shared') === 'mine');
  const [area, setArea] = useState<ActivityArea>(SIARGAO_ACTIVITY_AREA);
  const [placeState, setPlaceState] = useState<'none' | 'loading' | 'ready' | 'failed'>('none');
  const [minutes, setMinutes] = useState(60);
  const [company, setCompany] = useState<'solo' | 'friends'>('solo');
  const [now, setNow] = useState(() => new Date());
  const [message, setMessage] = useState('');
  const { progress, change, ready, storageUnavailable } = useAdventureProgress();
  const lat = query.get('lat'); const lng = query.get('lng');
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    if (!placeSlug) {
      const valid = lat !== null && lng !== null && Number.isFinite(Number(lat)) && Math.abs(Number(lat)) <= 90 && Number.isFinite(Number(lng)) && Math.abs(Number(lng)) <= 180;
      setArea(valid ? { lat: Number(lat), lng: Number(lng), label: 'Selected map area' } : SIARGAO_ACTIVITY_AREA);
      setPlaceState('none'); return;
    }
    setPlaceState('loading');
    void fetch('/api/venues/' + encodeURIComponent(placeSlug), { signal: controller.signal })
      .then(async (r) => { const body = await r.json(); if (!r.ok || !body.data?.venue) throw new Error(); return body.data.venue; })
      .then((venue) => {
        if (controller.signal.aborted) return;
        setArea({ lat: venue.latitude, lng: venue.longitude, label: venue.name, timeZone: venue.timezone || undefined });
        setPlaceState('ready');
      }).catch(() => { if (!controller.signal.aborted) setPlaceState('failed'); });
    return () => controller.abort();
  }, [placeSlug, lat, lng]);
  const activity = ACTIVITY_SUGGESTIONS.find((a) => a.id === activityId);
  const eligible = suggestionsForArea(area, now);
  const run = activeAdventure(progress, now.getTime());
  const sameArea = (saved: { placeSlug?: string; area: ActivityArea }) => saved.placeSlug === placeSlug && (placeSlug || (saved.area.lat === area.lat && saved.area.lng === area.lng));
  const current = run && run.activityId === activityId && sameArea(run) ? run : null;
  const completed = progress.runs.filter((r) => r.completedAt);
  const latestCompleted = completed.find((r) => r.activityId === activityId && sameArea(r));
  const placeReady = !placeSlug || placeState === 'ready';
  const canStart = Boolean(activity && eligible.some((a) => a.id === activity.id) && placeReady);
  const mapHref = placeSlug && placeReady ? '/map?place=' + encodeURIComponent(placeSlug) : `/map?lat=${area.lat}&lng=${area.lng}`;
  const href = (id?: string) => adventureHref(id, placeReady ? placeSlug : undefined, area);
  function start() {
    if (!activity || !canStart) return;
    const startedAt = Date.now();
    change((previous) => ({ runs: [{ runId: crypto.randomUUID(), activityId: activity.id, startedAt, steps: [], area, placeSlug: placeReady ? placeSlug : undefined },
      ...previous.runs.filter((r) => r.completedAt)].slice(0, 30) }));
    setMessage('Adventure started. Your steps are saved as you go.');
    trackClientEvent('adventure_started', { activity_id: activity.id, company, source: 'adventures' });
  }
  return <main className="relative min-h-screen overflow-hidden bd-page-top bg-transparent px-4 pb-32 text-white sm:px-6">
    <div className="pointer-events-none absolute inset-0 z-[1] bg-[radial-gradient(circle_at_18%_10%,rgba(34,211,238,0.06),transparent_32%),radial-gradient(circle_at_82%_18%,rgba(168,85,247,0.08),transparent_36%)]" aria-hidden="true" />
    <div className="relative z-10 mx-auto max-w-3xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <Link href={activity ? href() : '/'} className="inline-flex min-h-11 items-center gap-2 text-xs font-bold text-white/65"><ArrowLeft size={16} />{activity ? 'All adventures' : 'Home'}</Link>
        <Link href={mapHref} className={button}><MapPin size={15} />Open map</Link>
      </div>
      <p className="bd-page-kicker mb-3">Explore · play · go together</p>
      <h1 className="bd-page-title">{activity?.title ?? (viewingShared ? 'Adventures worth sharing.' : 'Make a little adventure.')}</h1>
      <p className="bd-page-copy mt-4">{activity?.summary ?? (viewingShared ? 'See what people made, then try an adventure yourself.' : 'Free things to try, on your own or with friends. Pick one and go at your own pace.')}</p>
      <p className="mt-3 flex items-center gap-2 text-xs text-cyan-100"><MapPin size={14} />{placeState === 'loading' ? 'Finding this place…' : placeState === 'failed' ? 'Place details unavailable — go back to the map and try again.' : area.label}</p>
      {!activity && !viewingShared ? <>
        <div className="my-6 flex flex-wrap items-center gap-3">
          <label className="text-xs text-white/60">Time available <select aria-label="Time available" value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} className="ml-2 min-h-11 rounded-xl border border-white/15 bg-[#141222] px-3 text-white"><option value={10}>10 minutes</option><option value={15}>15 minutes</option><option value={30}>30 minutes</option><option value={60}>Any time</option></select></label>
          <label className="text-xs text-white/60">Going <select aria-label="Going" value={company} onChange={(e) => setCompany(e.target.value as 'solo' | 'friends')} className="ml-2 min-h-11 rounded-xl border border-white/15 bg-[#141222] px-3 text-white"><option value="solo">Solo</option><option value="friends">With friends</option></select></label>
          <span className="text-xs text-emerald-100">All free · no purchase required</span>
        </div>
        {run ? <Link href={adventureHref(run.activityId, run.placeSlug, run.area)} className={panel + ' mb-5 block border-yellow-200/25'}><p className="text-xs text-yellow-200">Continue your adventure · {run.steps.length} steps done</p><p className="mt-2 font-bold">{ACTIVITY_SUGGESTIONS.find((a) => a.id === run.activityId)?.title} →</p></Link> : null}
        <div className="grid gap-4 sm:grid-cols-2">{eligible.filter((a) => a.minutes <= minutes).map((a, index) => <article key={a.id} className={panel}>
          <p className="text-[10px] font-black uppercase tracking-widest text-violet-200">{index === 0 ? 'A good next move' : 'Another idea'} · free activity</p>
          <h2 className="mt-3 text-xl font-black">{a.title}</h2><p className="mt-3 text-sm leading-6 text-white/60">{a.summary}</p>
          <p className="mt-4 text-xs text-cyan-100">{a.minutes} min · {a.daylight ? 'Daylight activity' : a.evening ? 'Evening activity' : 'Fits any time'}</p>
          <p className="mt-2 text-xs text-white/50">{company === 'friends' ? 'Each choose a detail, then compare what you noticed.' : 'Go at your own pace. Sharing is optional.'}</p>
          <Link href={href(a.id)} className={button + ' mt-5 w-full'}>See the adventure →</Link>
        </article>)}</div>
      </> : activity ? <section className={panel + ' mt-6'}>
        <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs font-bold text-violet-100"><span>Free activity</span><span>About {activity.minutes} minutes</span><span>Solo or with friends</span></div>
        <p className="mt-4 text-sm text-white/60">Free to try. Save the experience in your journal; this activity has no cash or venue reward.</p>
        {!canStart && !current ? <p className="mt-4 rounded-xl border border-amber-200/20 bg-amber-200/5 p-3 text-sm text-amber-100">{!placeReady ? 'Confirm the place before starting.' : 'This activity doesn’t fit the local time right now. Choose another adventure or come back at a suitable time.'}</p> : null}
        {current && !canStart ? <p className="mt-4 text-sm text-amber-100">The activity window has changed. Stop if conditions no longer suit it; your progress is still saved.</p> : null}
        {current ? <p className="mt-4 text-sm text-violet-100">Tap each numbered circle as you finish a step.</p> : null}
        <ol className="my-6 space-y-3">{activity.steps.map((step, index) => <li key={step} className="flex items-start gap-3 rounded-2xl border border-white/10 bg-black/20 p-4">
          <button aria-label={`Step ${index + 1}: ${step}`} aria-pressed={(current ?? latestCompleted)?.steps.includes(index) ?? false} disabled={!current} onClick={() => current && change((previous) => updateAdventureStep(previous, current.runId, index))} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-violet-200/25 text-violet-100 disabled:opacity-45">{(current ?? latestCompleted)?.steps.includes(index) ? <Check size={18} /> : index + 1}</button><p className="pt-2 text-sm leading-6 text-white/80">{step}</p>
        </li>)}</ol>
        {current ? <button className={button + ' w-full border-yellow-200/30 text-yellow-100'} disabled={current.steps.length !== activity.steps.length} onClick={() => {
          change((previous) => completeAdventure(previous, current.runId)); setMessage('You did it. This adventure is now in your adventure journal.');
          trackClientEvent('adventure_completed', { activity_id: activity.id, completion_kind: 'self_reported' });
        }}>I finished this adventure</button> : <button className={button + ' w-full border-yellow-200/30 text-yellow-100'} disabled={!ready || !canStart} onClick={start}>{run ? 'Switch to this adventure' : latestCompleted ? 'Do this again' : 'Start this adventure'}</button>}
        {run && !current ? <p className="mt-2 text-xs text-white/45">Switching replaces your unfinished adventure. Completed adventures stay in your journal.</p> : null}
        {latestCompleted && !current ? <p className="mt-4 flex items-center gap-2 text-sm text-emerald-100"><Sparkles size={17} />Completed · {new Date(latestCompleted.completedAt!).toLocaleDateString()} · self-reported</p> : null}
        {latestCompleted && !current ? <ShareAdventure activityId={activity.id} runId={latestCompleted.runId} placeSlug={placeSlug}/> : null}
        <div className="mt-4 flex flex-wrap gap-3">
          <PlanShareButton href={href(activity.id)} title={activity.title} text={`Want to try this free ${activity.minutes}-minute activity with me? ${activity.title}.`} label="Invite a friend" analyticsSource="adventure" />
          <Link className={button} href={mapHref}>Choose a public spot</Link>
          {placeSlug && placeReady ? <Link className={button} href={`/venues/${encodeURIComponent(placeSlug)}`}>Meet at this place</Link> : null}
        </div>
        {current ? <button className="mt-4 min-h-11 text-xs text-white/50 underline" onClick={() => { change((previous) => ({ runs: previous.runs.filter((r) => r.runId !== current.runId) })); setMessage('Adventure stopped. You can choose another whenever you like.'); }}>Stop this adventure</button> : null}
      </section> : null}
      {message ? <p role="status" className="mt-4 rounded-xl bg-violet-300/10 p-4 text-sm text-violet-100">{message}</p> : null}
      {!activity ? <SharedAdventures/> : null}
      {!viewingShared ? <section className={panel + ' mt-6'} aria-label="Your adventure journal">
        <h2 className="flex items-center gap-2 text-lg font-black"><Compass size={20} className="text-violet-200" />Your adventure journal</h2>
        <p className="mt-2 text-xs leading-5 text-white/50">{storageUnavailable ? 'Browser storage is unavailable. Progress lasts for this visit only.' : 'Saved on this device. Active adventures last 24 hours; your latest 30 completed adventures stay until browser data is cleared.'} This is your own record, not verified attendance or proof.</p>
        {!completed.length ? <p className="mt-4 text-sm text-white/60">Your first completed adventure will appear here.</p> : <ul className="mt-4 space-y-3">{completed.slice(0, 5).map((r) => <li key={r.runId} className="border-t border-white/10 pt-3"><Link href={adventureHref(r.activityId, r.placeSlug, r.area)} className="text-sm font-bold text-white">{ACTIVITY_SUGGESTIONS.find((a) => a.id === r.activityId)?.title} →</Link><p className="mt-1 text-xs text-white/45">{r.area.label} · {new Date(r.completedAt!).toLocaleDateString()} · self-reported</p></li>)}</ul>}
      </section> : null}
      <div className="mt-6 flex flex-wrap gap-4 text-xs font-bold text-cyan-100"><Link className="min-h-11 py-3" href="/now">Find a group plan →</Link><Link className="min-h-11 py-3" href="/earn">Browse paid work →</Link>{activity ? <Link className="min-h-11 py-3" href={href()}>Choose the next adventure →</Link> : null}</div>
    </div>
  </main>;
}
