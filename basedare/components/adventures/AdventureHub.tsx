'use client';
import AdventurePreferenceControls from './AdventurePreferenceControls';
import ShareAdventure from './ShareAdventure';
import SharedAdventures from './SharedAdventures';
import AdventurePassport from './AdventurePassport';
import Link from '@/components/DiscoveryLink';
import { useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Check, MapPin, Sparkles } from 'lucide-react';
import PlanShareButton from '@/components/community/PlanShareButton';
import { useAdventureProgress } from '@/hooks/useAdventureProgress';
import { activeAdventure, adventureHref, completeAdventure, updateAdventureStep } from '@/lib/adventure-progress';
import { ACTIVITY_SUGGESTIONS, SIARGAO_ACTIVITY_AREA, suggestionsForArea, matchingAdventureSuggestions, readAdventurePreferences, type ActivityArea } from '@/lib/home-activities';
import { trackClientEvent } from '@/lib/analytics';
import PersonalCompletionCard from './PersonalCompletionCard';

const panel = 'bd-surface p-5 sm:p-7';
const button = 'bd-action';

export default function AdventureHub({ activityId }: { activityId?: string }) {
  const query = useSearchParams();
  const invitationSource = query.get('from');
  const trackedInvitation = useRef<string | null>(null);
  useEffect(() => {
    if (invitationSource !== 'passport' || !activityId || !ACTIVITY_SUGGESTIONS.some((activity) => activity.id === activityId) || trackedInvitation.current === activityId) return;
    trackedInvitation.current = activityId;
    trackClientEvent('adventure_invite_opened', { activity_id: activityId, source: 'passport_completion' });
  }, [activityId, invitationSource]);
  const placeSlug = query.get('place') ?? undefined;
  const viewingShared = Boolean(query.get('post') || query.get('shared') === 'public' || query.get('shared') === 'mine');
  const [area, setArea] = useState<ActivityArea>(SIARGAO_ACTIVITY_AREA);
  const [placeState, setPlaceState] = useState<'none' | 'loading' | 'ready' | 'failed'>('none');
  const [preferences, setPreferences] = useState(() => readAdventurePreferences(query));
  const preferenceMinutes = query.get('minutes');
  const preferenceMood = query.get('mood');
  useEffect(() => {
    setPreferences(readAdventurePreferences(new URLSearchParams({ minutes: preferenceMinutes ?? '', mood: preferenceMood ?? '' })));
  }, [preferenceMinutes, preferenceMood]);
  const [company, setCompany] = useState<'solo' | 'friends'>('solo');
  const [now, setNow] = useState(() => new Date());
  const [message, setMessage] = useState('');
  const { progress, change, ready } = useAdventureProgress();
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
  const matches = matchingAdventureSuggestions(area, now, preferences);
  const run = activeAdventure(progress, now.getTime());
  const sameArea = (saved: { placeSlug?: string; area: ActivityArea }) => saved.placeSlug === placeSlug && (placeSlug || (Math.round(saved.area.lat * 1000) === Math.round(area.lat * 1000) && Math.round(saved.area.lng * 1000) === Math.round(area.lng * 1000)));
  const current = run && run.activityId === activityId && sameArea(run) ? run : null;
  const completed = progress.runs.filter((r) => r.completedAt);
  const latestCompleted = completed.find((r) => r.activityId === activityId && sameArea(r));
  const placeReady = !placeSlug || placeState === 'ready';
  const canStart = Boolean(activity && eligible.some((a) => a.id === activity.id) && placeReady);
  const mapHref = placeSlug && placeReady ? '/map?place=' + encodeURIComponent(placeSlug) : `/map?lat=${area.lat}&lng=${area.lng}`;
  const href = (id?: string) => adventureHref(id, placeReady ? placeSlug : undefined, area, preferences);
  function start() {
    if (!activity || !canStart) return;
    const startedAt = Date.now();
    change((previous) => ({ runs: [{ runId: crypto.randomUUID(), activityId: activity.id, startedAt, steps: [], area, placeSlug: placeReady ? placeSlug : undefined },
      ...previous.runs.filter((r) => r.completedAt)].slice(0, 30) }));
    setMessage('Adventure started. Your steps are saved as you go.');
    trackClientEvent('adventure_started', { activity_id: activity.id, company, source: query.get('from') === 'passport' ? 'passport_invite' : 'adventures' });
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
      {activity && query.get('from') === 'passport' ? <p className="bd-well mt-5 p-4 text-sm leading-6 text-violet-100">Someone shared this adventure. Try it at your own pace, solo or with friends. Your progress starts with your own attempt.</p> : null}
      <p className="mt-3 flex items-center gap-2 text-xs text-cyan-100"><MapPin size={14} />{placeState === 'loading' ? 'Finding this place…' : placeState === 'failed' ? 'Place details unavailable — go back to the map and try again.' : area.label}</p>
      {!activity && !viewingShared ? <>
        <div className="mt-6"><AdventurePreferenceControls value={preferences} onChange={(next) => {
          setPreferences(next);
          trackClientEvent('adventure_preferences_changed', { ...next, source: 'adventures' });
        }} /></div>
        <div className="my-4 flex flex-wrap items-center gap-3">
          <label className="text-xs text-white/60">Going <select aria-label="Going" value={company} onChange={(e) => setCompany(e.target.value as 'solo' | 'friends')} className="ml-2 min-h-11 rounded-xl border border-white/15 bg-[#141222] px-3 text-white"><option value="solo">Solo</option><option value="friends">With friends</option></select></label>
          <span className="text-xs text-emerald-100">All free · no purchase required</span>
        </div>
        <p role="status" className="mb-4 text-xs leading-5 text-white/55">{matches.length ? `${matches.length} ${matches.length === 1 ? 'idea fits' : 'ideas fit'} · activity time excludes travel` : 'No ideas fit right now. Try another mood or a little more time.'}</p>
        {run ? <Link href={adventureHref(run.activityId, run.placeSlug, run.area)} className={panel + ' mb-5 block border-yellow-200/25'}><p className="text-xs text-yellow-200">Continue your adventure · {run.steps.length} steps done</p><p className="mt-2 font-bold">{ACTIVITY_SUGGESTIONS.find((a) => a.id === run.activityId)?.title} →</p></Link> : null}
        <div className="grid gap-4 sm:grid-cols-2">{matches.map((a, index) => <article key={a.id} className={panel}>
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
        {latestCompleted && !current ? <PersonalCompletionCard run={latestCompleted} /> : null}
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
      {!viewingShared ? <div className="mt-6"><AdventurePassport compact={Boolean(activity)} /></div> : null}
      <div className="mt-6 flex flex-wrap gap-4 text-xs font-bold text-cyan-100"><Link className="min-h-11 py-3" href="/now">Find a group plan →</Link><Link className="min-h-11 py-3" href="/earn">Browse paid work →</Link>{activity ? <Link className="min-h-11 py-3" href={href()}>Choose the next adventure →</Link> : null}</div>
    </div>
  </main>;
}
