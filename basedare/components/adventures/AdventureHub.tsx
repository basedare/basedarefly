"use client";

import dynamic from 'next/dynamic';
import Link from '@/components/DiscoveryLink';
import { useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, ChevronDown, Compass, MapPin } from 'lucide-react';
import AdventurePicker from './AdventurePicker';
import AdventurePassportEntry from './AdventurePassportEntry';
import FeaturedSiargaoChallenge from './FeaturedSiargaoChallenge';
import SiargaoVerdict from './SiargaoVerdict';
import { SIARGAO_CHALLENGE_ID, SIARGAO_CHALLENGE_AREA, SIARGAO_VERDICTS, inSiargaoChallengeArea, siargaoCampaignOpen, type SiargaoVerdict as Verdict } from '@/lib/siargao-challenge';
import { personalAdventureInvite } from '@/lib/adventure-passport';
import PlanShareButton from '@/components/community/PlanShareButton';
import { useDiscovery } from '@/components/DiscoveryProvider';
import { useAdventureProgress } from '@/hooks/useAdventureProgress';
import { useRecommendationClock } from '@/hooks/useRecommendationClock';
import { activeAdventure, adventureHref, completeAdventure, updateAdventureStep, updateAdventureVerdict } from '@/lib/adventure-progress';
import { adventureArea } from '@/lib/adventure-discovery';
import { ACTIVITY_SUGGESTIONS, suggestionsForArea, matchingAdventureSuggestions, readAdventurePreferences, type ActivityArea } from '@/lib/home-activities';
import { trackClientEvent } from '@/lib/analytics';

const PersonalCompletionCard = dynamic(() => import('./PersonalCompletionCard'), { loading: () => <p role="status" className="mt-4 text-sm text-white/65">Opening your memory…</p> });
const SharedAdventures = dynamic(() => import('./SharedAdventures'), { loading: () => <p role="status" className="mt-5 text-sm text-white/65">Opening shared adventures…</p> });
const ShareAdventure = dynamic(() => import('./ShareAdventure'), { loading: () => <p role="status" className="mt-5 text-sm text-white/65">Opening sharing…</p> });
const panel = 'bd-surface p-5 sm:p-7';

export default function AdventureHub({ activityId, invitedVerdict }: { activityId?: string; invitedVerdict?: Verdict }) {
  const query = useSearchParams();
  const { area: savedArea, ready: discoveryReady } = useDiscovery();
  const { progress, change, ready, storageUnavailable, asOf } = useAdventureProgress();
  const clock = useRecommendationClock();
  const now = new Date(Math.max(clock.getTime(), asOf));
  const invitationSource = query.get('from');
  const trackedInvitation = useRef<string | null>(null);
  const trackedLanding = useRef<string | null>(null);
  const isChallenge = activityId === SIARGAO_CHALLENGE_ID;
  useEffect(() => {
    if (!activityId || trackedLanding.current === activityId) return;
    trackedLanding.current = activityId;
    trackClientEvent('adventure_landing_opened', { activity_id: activityId, source: invitedVerdict ? 'verdict_invite' : invitationSource === 'challenge' ? 'challenge_invite' : 'direct' });
    if (invitedVerdict || invitationSource === 'challenge') trackClientEvent('adventure_invite_opened', { activity_id: activityId, source: 'siargao_challenge' });
  }, [activityId, invitedVerdict, invitationSource]);
  useEffect(() => {
    if (invitationSource !== 'passport' || !activityId || !ACTIVITY_SUGGESTIONS.some((activity) => activity.id === activityId) || trackedInvitation.current === activityId) return;
    trackedInvitation.current = activityId;
    trackClientEvent('adventure_invite_opened', { activity_id: activityId, source: 'passport_completion' });
  }, [activityId, invitationSource]);

  const placeSlug = isChallenge ? undefined : query.get('place') ?? undefined;
  const viewingShared = Boolean(query.get('post') || query.get('hashtag') || query.get('shared') === 'public' || query.get('shared') === 'mine');
  const [place, setPlace] = useState<{ slug?: string; area?: ActivityArea; failed?: boolean }>({});
  const [placeRetry, setPlaceRetry] = useState(0);
  const [preferences, setPreferences] = useState(() => readAdventurePreferences(query));
  const preferenceMinutes = query.get('minutes');
  const preferenceMood = query.get('mood');
  useEffect(() => {
    setPreferences(readAdventurePreferences(new URLSearchParams({ minutes: preferenceMinutes ?? '', mood: preferenceMood ?? '' })));
  }, [preferenceMinutes, preferenceMood]);
  const [message, setMessage] = useState('');
  const [memoryRunId, setMemoryRunId] = useState<string | null>(null);

  useEffect(() => {
    if (!placeSlug) return;
    const controller = new AbortController();
    setPlace({ slug: placeSlug });
    const deadline = window.setTimeout(() => {
      controller.abort();
      setPlace({ slug: placeSlug, failed: true });
    }, 8000);
    void fetch('/api/venues/' + encodeURIComponent(placeSlug), { signal: controller.signal })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok || !body.data?.venue) throw new Error();
        return body.data.venue;
      }).then((venue) => {
        if (!controller.signal.aborted) setPlace({ slug: placeSlug, area: {
          lat: venue.latitude, lng: venue.longitude, label: venue.name, timeZone: venue.timezone || undefined,
        } });
      }).catch(() => {
        if (!controller.signal.aborted) setPlace({ slug: placeSlug, failed: true });
      }).finally(() => window.clearTimeout(deadline));
    return () => { window.clearTimeout(deadline); controller.abort(); };
  }, [placeSlug, placeRetry]);

  const resolvedArea = adventureArea(query, savedArea);
  const area = isChallenge ? SIARGAO_CHALLENGE_AREA : placeSlug && place.slug === placeSlug && place.area ? place.area : resolvedArea;
  const placeReady = !placeSlug || (place.slug === placeSlug && Boolean(place.area));
  const placeFailed = placeSlug && place.slug === placeSlug && place.failed;
  const activity = ACTIVITY_SUGGESTIONS.find((item) => item.id === activityId);
  const eligible = suggestionsForArea(area, now);
  const matches = matchingAdventureSuggestions(area, now, preferences);
  const run = ready ? activeAdventure(progress, now.getTime()) : null;
  const featureChallenge = !run && inSiargaoChallengeArea(area) && siargaoCampaignOpen(now);
  const sameArea = (saved: { placeSlug?: string; area: ActivityArea }) => saved.placeSlug === placeSlug && (placeSlug || (Math.round(saved.area.lat * 1000) === Math.round(area.lat * 1000) && Math.round(saved.area.lng * 1000) === Math.round(area.lng * 1000)));
  const current = run && run.activityId === activityId && sameArea(run) ? run : null;
  const latestCompleted = progress.runs.find((saved) => saved.completedAt && saved.activityId === activityId && sameArea(saved));
  const finished = Boolean(latestCompleted && !current);
  const canStart = Boolean(ready && discoveryReady && activity && eligible.some((item) => item.id === activity.id) && placeReady);
  const href = (id?: string) => adventureHref(id, placeReady ? placeSlug : undefined, area, preferences);
  const mapQuery = new URLSearchParams({ lat: String(area.lat), lng: String(area.lng), areaLabel: area.label });
  const mapHref = placeSlug && placeReady ? '/map?place=' + encodeURIComponent(placeSlug) : '/map?' + mapQuery;

  function handleStart() {
    if (!activity || !canStart) return;
    const startedAt = Date.now();
    change((previous) => ({ runs: [{ runId: crypto.randomUUID(), activityId: activity.id, startedAt, steps: [], area, placeSlug: placeReady ? placeSlug : undefined },
      ...previous.runs.filter((saved) => saved.completedAt)].slice(0, 30) }));
    setMessage('You’re off! We’ll save your steps as you go.');
    trackClientEvent('adventure_started', { activity_id: activity.id, source: query.get('from') === 'passport' ? 'passport_invite' : 'adventures' });
  }

  const steps = activity ? <ol className="my-4 space-y-3">{activity.steps.map((step, index) => <li key={step} className="bd-well flex items-start gap-3 p-4">
          <button type="button" aria-label={`Step ${index + 1}: ${step}`} aria-pressed={(current ?? latestCompleted)?.steps.includes(index) ?? false} disabled={!current || (isChallenge && index === 2)} onClick={() => current && change((previous) => updateAdventureStep(previous, current.runId, index))} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-violet-200/25 text-violet-100 disabled:opacity-50">{(current ?? latestCompleted)?.steps.includes(index) ? <Check size={18} aria-hidden="true" /> : index + 1}</button>
          <p className="pt-1.5 text-base leading-7 text-white/80">{step}</p>
        </li>)}</ol> : null;

  const picker = <AdventurePicker matches={matches} preferences={preferences} href={href} onChange={(next) => {
    setPreferences(next);
    trackClientEvent('adventure_preferences_changed', { ...next, source: 'adventures' });
  }} />;
  const passportEntry = <AdventurePassportEntry href={adventureHref('passport', undefined, area)} />;

  return <main className="relative min-h-screen overflow-hidden bd-page-top bg-transparent px-4 pb-32 text-white sm:px-6">
    <div className="bd-page-wash pointer-events-none absolute inset-0 z-[1] bg-[radial-gradient(circle_at_18%_10%,rgba(34,211,238,0.06),transparent_32%),radial-gradient(circle_at_82%_18%,rgba(168,85,247,0.08),transparent_36%)]" aria-hidden="true" />
    <div className="relative z-10 mx-auto max-w-2xl">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <Link href={activity || viewingShared ? href() : '/'} className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-white/65"><ArrowLeft size={16} aria-hidden="true" />{activity || viewingShared ? 'Adventures' : 'Home'}</Link>
        <Link href={mapHref} className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-cyan-100"><MapPin size={16} aria-hidden="true" />Open map</Link>
      </div>
      <p className="text-sm font-bold text-violet-200">Free adventures</p>
      <h1 className="mt-3 text-3xl font-black leading-tight tracking-tight sm:text-5xl">{activity?.title ?? (viewingShared ? 'Adventures worth sharing.' : 'Find your next adventure.')}</h1>
      <p className="mt-3 text-base leading-7 text-white/70">{activity?.summary ?? (viewingShared ? 'See what people made, then try an adventure yourself.' : 'A little time, a bit of curiosity. Let’s find you something worth doing.')}</p>
      <p className="mt-3 flex items-start gap-2 text-sm leading-6 text-cyan-100"><MapPin size={16} className="mt-1 shrink-0" aria-hidden="true" />{!discoveryReady ? 'Finding your area…' : placeFailed ? 'We couldn’t load this place.' : !placeReady ? 'Finding this place…' : area.label}</p>
      {placeFailed ? <button type="button" className="bd-action mt-3 !text-sm" onClick={() => setPlaceRetry((attempt) => attempt + 1)}>Retry place details</button> : null}
      {activity && invitationSource === 'passport' ? <p className="bd-well mt-5 p-4 text-sm leading-6 text-violet-100">You’ve got an adventure to try. Go solo or bring a friend; you’ll save your own progress.</p> : null}
      {isChallenge ? <p className="mt-4 text-sm leading-6 text-white/60">Independent BaseDare challenge. No event ticket, purchase or social post required.</p> : null}
      {isChallenge && invitedVerdict ? <p className="bd-well mt-5 p-4 text-base leading-7 text-violet-100">Someone’s verdict: <strong>{SIARGAO_VERDICTS.find((item) => item.id === invitedVerdict)?.label}.</strong> Yours might be different. Try the challenge and decide for yourself.</p> : null}

      {!activity && !viewingShared ? <div className="mt-6">
        {!ready || !discoveryReady ? <p role="status" className="bd-well p-5 text-base text-white/65">Finding your next move…</p> : <>
          {run ? <section className={panel + ' !border-amber-200/25'} aria-label="Continue your adventure">
            <p className="flex items-center gap-2 text-sm font-bold text-amber-100"><Compass size={18} aria-hidden="true" />Continue your adventure</p>
            <h2 className="mt-4 text-2xl font-black tracking-tight">{ACTIVITY_SUGGESTIONS.find((item) => item.id === run.activityId)?.title}</h2>
            <p className="mt-3 text-sm leading-6 text-white/65">{run.area.label} · {run.steps.length} of {ACTIVITY_SUGGESTIONS.find((item) => item.id === run.activityId)?.steps.length} steps done</p>
            <Link href={adventureHref(run.activityId, run.placeSlug, run.area)} className="bd-action bd-action--gold mt-5 w-full !text-sm">Continue adventure <ArrowRight size={17} aria-hidden="true" /></Link>
          </section> : null}
          {!run && placeReady ? <FeaturedSiargaoChallenge area={area} now={now} /> : null}
          {placeReady ? run ? <details className="mt-4 rounded-2xl border border-white/10 p-4 sm:p-5">
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 text-sm font-bold text-white/75">Find another adventure <ChevronDown size={16} aria-hidden="true" /></summary>
            <p className="my-3 text-sm leading-6 text-white/60">Starting another replaces your unfinished adventure. Your completed memories stay.</p>{picker}
          </details> : featureChallenge ? <details className="mt-4 rounded-2xl border border-white/10 p-4 sm:p-5"><summary className="min-h-11 cursor-pointer py-2 text-sm font-bold text-white/75">Other free adventures</summary><div className="mt-3">{picker}</div></details> : picker : null}
          <Link href={href() + '&shared=public'} className="mt-3 flex min-h-14 items-center justify-between gap-3 px-1 text-sm font-bold text-white/70">Adventures people shared <ArrowRight size={16} aria-hidden="true" /></Link>
        </>}
      </div> : activity ? <section className={panel + ' mt-6'} aria-label="Your adventure steps">
        <p className="text-sm font-semibold text-violet-100">About {activity.minutes} min · Free · Solo or with friends</p>
        {finished && latestCompleted ? <div className="mt-5">
          <h2 className="text-2xl font-black">{isChallenge ? 'Your island. Your verdict.' : 'You did it.'}</h2>
          <p className="mt-3 text-base leading-7 text-white/70">One for the memories. You marked this adventure complete yourself; it isn’t a verified check-in or a cash reward.</p>
          {isChallenge ? <SiargaoVerdict key={latestCompleted.runId} runId={latestCompleted.runId} value={latestCompleted.verdict} finished onChange={() => {}} /> : null}
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href={href()} className="bd-action bd-action--gold w-full !text-sm">Find another adventure <ArrowRight size={17} aria-hidden="true" /></Link>
            {!isChallenge ? <PlanShareButton href={personalAdventureInvite(latestCompleted)} title={activity.title} text={`I tried “${activity.title}”. Want to try it with me?`} label="Invite a friend" analyticsSource="passport_completion" /> : null}
            <Link href="/now?participation=meet" className="bd-action !text-sm">Find a group plan</Link>
          </div>
          <button type="button" className="mt-4 inline-flex min-h-11 items-center gap-2 text-sm font-bold text-white/65" aria-expanded={memoryRunId === latestCompleted.runId} aria-controls="adventure-memory" onClick={() => setMemoryRunId((id) => id === latestCompleted.runId ? null : latestCompleted.runId)}>Your memory · optional <ChevronDown size={16} aria-hidden="true" /></button>
          {memoryRunId === latestCompleted.runId ? <div id="adventure-memory"><PersonalCompletionCard run={latestCompleted} /><div className="mt-3">{passportEntry}</div><ShareAdventure key={latestCompleted.runId} activityId={activity.id} runId={latestCompleted.runId} placeSlug={placeSlug} /></div> : null}
        </div> : null}
        {!canStart && !current && !finished ? <p role="status" className="bd-well mt-4 p-4 text-sm leading-6 text-amber-100">{!ready || !discoveryReady ? 'Opening your progress…' : isChallenge && !siargaoCampaignOpen(now) ? 'This Siargao pilot has ended. Your saved result stays in your memories. Try another free adventure.' : !placeReady ? 'Let’s find this place before you start.' : 'The local time isn’t right for this one. Try another idea, or come back in daylight.'}</p> : null}
        {current && !canStart ? <p className="mt-4 text-sm leading-6 text-amber-100">Time has moved on. Only keep going if the place is still safe and suitable. Your progress is saved.</p> : null}
        {!current && !finished ? <div className="mt-5">
          <p className="text-sm leading-6 text-white/60">{isChallenge ? '30–60 minutes of exploring, plus travel. Start freely; your progress stays in this browser. Come back to tick off each stage.' : 'Go at your own pace. We’ll save your steps as you go. This is a free activity, with no cash or venue reward.'}</p>
          {run ? <p className="mt-3 text-sm leading-6 text-amber-100">Starting this replaces your unfinished adventure. Completed memories stay in your journal.</p> : null}
          <button type="button" className="bd-action bd-action--gold mt-4 w-full !text-sm" disabled={!canStart} onClick={handleStart}>{run ? 'Switch to this adventure' : isChallenge ? 'Take the challenge' : 'Start this adventure'}</button>
        </div> : null}
        {!finished ? <h2 className="mt-7 text-lg font-bold">{current ? 'One step at a time' : 'What you’ll do'}</h2> : null}
        {current ? <p className="mt-2 text-sm leading-6 text-white/65">Tap a numbered circle when you finish that step.</p> : null}
        {finished ? <details className="mt-5 border-t border-white/10 pt-2">
          <summary className="flex min-h-11 cursor-pointer items-center text-sm font-bold text-white/70">See completed steps</summary>
          {steps}
        </details> : steps}
        {isChallenge && current && current.steps.includes(0) && current.steps.includes(1) ? <SiargaoVerdict key={current.runId} runId={current.runId} value={current.verdict} finished={false} onChange={(value) => change((previous) => updateAdventureVerdict(previous, current.runId, value))} /> : null}
        {current ? <button type="button" className="bd-action bd-action--gold mt-5 w-full !text-sm" disabled={current.steps.length !== activity.steps.length || (isChallenge && !current.verdict)} onClick={() => {
          change((previous) => completeAdventure(previous, current.runId));
          setMessage('You did it! This one’s saved in your memories.');
          trackClientEvent('adventure_completed', { activity_id: activity.id, completion_kind: 'self_reported' });
        }}>{isChallenge ? 'Save my verdict' : 'I finished this adventure'}</button> : null}
        <div className="mt-5 flex flex-wrap gap-3">
          {!finished ? <PlanShareButton href={href(activity.id)} title={activity.title} text={`Want to try this free ${activity.minutes}-minute activity with me? ${activity.title}.`} label="Invite a friend" analyticsSource="adventure" /> : null}
          <Link className="bd-action !text-sm" href={mapHref}>Choose a public spot</Link>
          {placeSlug && placeReady ? <Link className="bd-action !text-sm" href={`/venues/${encodeURIComponent(placeSlug)}`}>Meet at this place</Link> : null}
        </div>
        {current ? <button type="button" className="mt-4 min-h-11 text-sm text-white/60 underline" onClick={() => {
          change((previous) => ({ runs: previous.runs.filter((saved) => saved.runId !== current.runId) })); setMessage('Adventure stopped. Choose another whenever you like.');
        }}>Stop this adventure</button> : finished ? <button type="button" className="mt-4 min-h-11 text-sm font-bold text-white/60 underline" disabled={!canStart} onClick={handleStart}>{run ? 'Switch to this adventure' : 'Do this again'}</button> : null}
        {finished && run ? <p className="mt-2 text-sm leading-6 text-amber-100">Switching replaces your unfinished adventure. Completed memories stay.</p> : null}
      </section> : null}
      {message ? <p role="status" className="mt-4 rounded-xl bg-violet-300/10 p-4 text-sm leading-6 text-violet-100">{message}</p> : null}
      {!activity && viewingShared ? <SharedAdventures /> : null}
      {storageUnavailable ? <p role="status" className="mt-4 text-sm leading-6 text-amber-100">Your browser can’t save progress right now. It will only last while this page stays open.</p> : null}
      <nav aria-label="More ways to explore" className="mt-6 flex flex-wrap gap-x-5 gap-y-2 border-t border-white/10 pt-3 text-sm font-bold text-cyan-100">
        <Link className="min-h-11 py-3" href="/now">Find a group plan →</Link>
        <Link className="min-h-11 py-3" href="/earn">Browse paid work →</Link>
        {activity ? <Link className="min-h-11 py-3" href={href()}>Choose another adventure →</Link> : null}
      </nav>
      {!activity ? <div className="mt-4">{passportEntry}</div> : null}
    </div>
  </main>;
}
