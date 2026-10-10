'use client';

import Link from '@/components/DiscoveryLink';
import { useDiscovery } from '@/components/DiscoveryProvider';
import { useRecommendationClock } from '@/hooks/useRecommendationClock';
import { assessRecommendation } from '@/lib/recommendation-policy';
import { PARTICIPATION_FILTERS, filterParticipation, type ParticipationFilter } from '@/lib/participation-filter';
import {
  ChevronDown,
  CircleHelp,
  Crosshair,
  Dices,
  Loader2,
  Map,
  Plus,
  Radio,
  RefreshCw,
  Share2,
  Sparkles,
  Users,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import LivePlanCard from '@/components/live-plans/LivePlanCard';
import AdventureSuggestions from '@/components/adventures/AdventureSuggestions';
import { adventureHref } from '@/lib/adventure-progress';
import PeeBearDecisionCard from '@/components/live-plans/PeeBearDecisionCard';
import {
  LIVE_PLANS_INTRO_KEY,
  LivePlansGuideCue,
  type LivePlansGuideStep,
} from '@/components/onboarding/LivePlansGuide';
import type { LivePlanSnapshot } from '@/lib/live-plans';
import { trackClientEvent } from '@/lib/analytics';
import {
  filterWorldPulsePlans,
  worldPulseRecommendationInput,
  worldPulseRecommendationWindow,
  getWorldPulseMapHref,
  getWorldPulseMapViewHref,
  getWorldPulseDecision,
  getWorldPulseSignal,
  getWorldPulseViewHref,
  type WorldPulseDecision,
  type WorldPulseIntent,
  type WorldPulseMode,
} from '@/lib/world-pulse';

const SIARGAO_CENTER = { latitude: 9.803, longitude: 126.159 };
const FILTERS = [
  { id: 'NOW', label: 'Now' },
  { id: 'NEXT_2H', label: 'Next 2h' },
  { id: 'TONIGHT', label: 'Tonight' },
  { id: 'ALL', label: 'All' },
] as const;

const PEEBEAR_VIBES: Array<{ id: WorldPulseIntent; label: string }> = [
  { id: 'SURF', label: 'Surf' },
  { id: 'MEET', label: 'Meet people' },
  { id: 'PLAY', label: 'Play' },
  { id: 'SURPRISE', label: 'Something random' },
];

type PeeBearDecisionState = Pick<WorldPulseDecision, 'intent' | 'sideQuest'> & {
  runnerUpId: string | null;
  nonce: number;
};

type LivePlansClientProps = {
  initialCenter?: { latitude: number; longitude: number };
  initialMode?: WorldPulseMode;
  initialRadiusKm?: number;
  initialSelectedPlanId?: string | null;
  initialNeedsPeople?: boolean;
  initialParticipation?: ParticipationFilter;
};

export default function LivePlansClient({
  initialSelectedPlanId = null,
  initialNeedsPeople = false,
}: LivePlansClientProps) {
  const now = useRecommendationClock();
  const { area, ready: areaReady, updateArea } = useDiscovery();
  const center = useMemo(() => ({ latitude: area.lat, longitude: area.lng }), [area.lat, area.lng]);
  const setCenter = (value: { latitude: number; longitude: number }) => updateArea({ lat: value.latitude, lng: value.longitude, label: 'Selected map area' });
  const radiusKm = area.radiusKm;
  const [usingDeviceLocation, setUsingDeviceLocation] = useState(false);
  const [snapshot, setSnapshot] = useState<LivePlanSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mode = area.mode;
  const setMode = useCallback((mode: WorldPulseMode) => updateArea({ mode }), [updateArea]);
  const [needsPeopleOnly, setNeedsPeopleOnly] = useState(initialNeedsPeople);
  const participation = area.participation;
  const setParticipation = (participation: ParticipationFilter) => updateArea({ participation });
  const [pickedPlanId, setPickedPlanId] = useState<string | null>(initialSelectedPlanId);
  const [peebearOpen, setPeebearOpen] = useState(false);
  const [peebearDecision, setPeebearDecision] = useState<PeeBearDecisionState | null>(null);
  const [shareStatus, setShareStatus] = useState<string | null>(null);
  const [guideStep, setGuideStep] = useState<LivePlansGuideStep | null>(null);

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    const query = new URLSearchParams({
      lat: String(center.latitude),
      lng: String(center.longitude),
      radiusKm: String(radiusKm),
      horizonHours: '72',
      limit: '60',
    });
    try {
      const response = await fetch(`/api/live-plans?${query.toString()}`, {
        cache: 'no-store',
        signal,
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.success || !payload.data) {
        throw new Error(payload?.error || 'Could not load live plans.');
      }
      setSnapshot(payload.data as LivePlanSnapshot);
    } catch (loadError) {
      if (loadError instanceof DOMException && loadError.name === 'AbortError') return;
      setError(loadError instanceof Error ? loadError.message : 'Could not load live plans.');
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [center.latitude, center.longitude, radiusKm]);

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    const interval = window.setInterval(() => void load(), 60_000);
    const refresh = () => { if (document.visibilityState === 'visible') void load(controller.signal); };
    document.addEventListener('visibilitychange', refresh);
    window.addEventListener('basedare:live-plans-updated', refresh);
    return () => {
      controller.abort();
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', refresh);
      window.removeEventListener('basedare:live-plans-updated', refresh);
    };
  }, [load]);

  useEffect(() => {
    if (!areaReady) return;
    const href = getWorldPulseViewHref({
      mode,
      center,
      radiusKm,
      selectedPlanId: pickedPlanId,
      needsPeople: needsPeopleOnly,
      participation,
    });
    window.history.replaceState(window.history.state, '', href);
    window.dispatchEvent(new Event('basedare:plan-area-updated'));
  }, [areaReady, center, mode, needsPeopleOnly, pickedPlanId, radiusKm, participation]);

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      setError('Location is unavailable in this browser.');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCenter({
          latitude: Math.round(position.coords.latitude * 1000) / 1000,
          longitude: Math.round(position.coords.longitude * 1000) / 1000,
        });
        setPickedPlanId(null);
        setPeebearDecision(null);
        setUsingDeviceLocation(true);
        setLocating(false);
      },
      () => {
        setError('Could not use your location. Keeping the current map area.');
        setLocating(false);
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 120_000 },
    );
  };

  const plans = useMemo(() => {
    const source = filterParticipation(snapshot?.plans ?? [], participation);
    const timed = filterWorldPulsePlans(source, mode, now, snapshot?.window.tz);
    return needsPeopleOnly ? timed.filter((plan) => plan.status.forming) : timed;
  }, [mode, needsPeopleOnly, now, snapshot?.plans, snapshot?.window.tz, participation]);
  const pickedPlan = useMemo(
    () => plans.find((plan) => plan.id === pickedPlanId) ?? null,
    [pickedPlanId, plans],
  );
  const pickedSignal = pickedPlan ? getWorldPulseSignal(pickedPlan, now) : null;
  const pickedRunnerUp = useMemo(
    () => plans.find((plan) => plan.id === peebearDecision?.runnerUpId) ?? null,
    [peebearDecision?.runnerUpId, plans],
  );

  const letPeebearPick = (intent: WorldPulseIntent) => {
    if (!snapshot) {
      setError('Plans have not loaded yet. Refresh to check this area.');
      return;
    }
    const decision = getWorldPulseDecision(plans, intent, Math.random, { now, window: worldPulseRecommendationWindow(mode), timeZone: snapshot?.window.tz });
    if (!decision) {
      const emptyMessage = intent === 'SURF'
        ? 'No surf plan fits this time window and daylight. Browse All for later, or try Something random.'
        : intent === 'PLAY'
          ? 'No free Spark matches this time window yet. Try Something random.'
          : intent === 'MEET' || intent === 'SOCIAL'
            ? 'No social plan matches this time window yet. Try Something random.'
            : 'Nothing live matches this time window yet.';
      setError(emptyMessage);
      return;
    }
    trackClientEvent('peebear_live_plan_picked', {
      plan_id: decision.winner.id,
      plan_type: decision.winner.type,
      already_joined: decision.winner.viewer.isNextMove,
      needs_people: decision.winner.status.forming,
      pulse_mode: mode,
      pulse_intent: intent,
      candidate_count: decision.candidates.length,
      runner_up_id: decision.runnerUp?.id ?? null,
    });
    setError(null);
    setPeebearOpen(false);
    setPickedPlanId(decision.winner.id);
    setPeebearDecision((current) => ({
      intent: decision.intent,
      runnerUpId: decision.runnerUp?.id ?? null,
      sideQuest: decision.sideQuest,
      nonce: (current?.nonce ?? 0) + 1,
    }));
    window.requestAnimationFrame(() => {
      document.getElementById('peebear-pick')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  };

  const flipPeebearAgain = () => {
    if (!peebearDecision) return;
    trackClientEvent('peebear_decision_flipped_again', {
      previous_plan_id: pickedPlan?.id ?? null,
      pulse_mode: mode,
      pulse_intent: peebearDecision.intent,
    });
    letPeebearPick(peebearDecision.intent);
  };

  const sharePulse = async () => {
    const relativeHref = getWorldPulseViewHref({
      mode,
      center,
      radiusKm,
      selectedPlanId: pickedPlan?.id,
      needsPeople: needsPeopleOnly,
      participation,
    });
    const url = new URL(relativeHref, window.location.origin).toString();
    const shareData = {
      title: pickedPlan ? `${pickedPlan.title} · BaseDare` : 'BaseDare World Pulse',
      text: pickedPlan
        ? `${pickedPlan.title} at ${pickedPlan.place.label}`
        : 'See what is moving, what needs people, and what you can join next.',
      url,
    };
    try {
      if (navigator.share) await navigator.share(shareData);
      else {
        await navigator.clipboard.writeText(url);
        setShareStatus('Link copied');
      }
      trackClientEvent('world_pulse_view_shared', {
        pulse_mode: mode,
        plan_id: pickedPlan?.id ?? null,
        needs_people_only: needsPeopleOnly,
      });
    } catch (shareError) {
      if (shareError instanceof DOMException && shareError.name === 'AbortError') return;
      setShareStatus('Could not share this view');
    }
  };

  const rememberIntro = useCallback(() => {
    try {
      window.localStorage.setItem(LIVE_PLANS_INTRO_KEY, 'seen');
    } catch {
      // The guide remains dismissible even when private browsing blocks storage.
    }
  }, []);

  const scrollToGuideTarget = useCallback((step: LivePlansGuideStep) => {
    const targetIds = ['live-plan-filters', 'live-plan-list', 'live-plan-next-move'];
    window.requestAnimationFrame(() => {
      document.getElementById(targetIds[step])?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }, []);

  const closeIntro = useCallback(() => {
    rememberIntro();
    setGuideStep(null);
  }, [rememberIntro]);

  const startGuide = useCallback(() => {
    rememberIntro();
    setMode('NOW');
    setNeedsPeopleOnly(false);
    setPickedPlanId(null);
    setPeebearOpen(false);
    setPeebearDecision(null);
    setGuideStep(0);
    scrollToGuideTarget(0);
  }, [rememberIntro, scrollToGuideTarget, setMode]);

  const moveGuide = useCallback((direction: 'back' | 'next') => {
    if (guideStep == null) return;
    if (direction === 'next' && guideStep === 2) {
      rememberIntro();
      setGuideStep(null);
      return;
    }
    const nextStep = Math.max(0, Math.min(2, guideStep + (direction === 'next' ? 1 : -1))) as LivePlansGuideStep;
    setGuideStep(nextStep);
    scrollToGuideTarget(nextStep);
  }, [guideStep, rememberIntro, scrollToGuideTarget]);

  const startAdventureHref = adventureHref(undefined, undefined, area);

  return (
    <main className="relative min-h-screen overflow-hidden bd-page-top px-4 pb-36 text-white sm:px-6 lg:px-10">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_16%_8%,rgba(34,211,238,0.13),transparent_31%),radial-gradient(circle_at_84%_18%,rgba(139,92,246,0.15),transparent_34%)]" />
      <div className="relative mx-auto max-w-7xl">
        <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(150deg,rgba(18,30,47,0.9),rgba(6,7,14,0.97))] p-5 shadow-[0_28px_80px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.09)] sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="bd-page-kicker"><Radio className="h-4 w-4" /> Happening now</p>
              <h1 className="bd-page-title mt-3 max-w-4xl">Find your next move. </h1>
              <p className="mt-3 text-sm text-cyan-100/80">{area.label} · within {radiusKm} km</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => setPeebearOpen((current) => !current)} aria-expanded={peebearOpen} className="bd-action bd-action--gold-quiet">
                <Dices className="h-4 w-4" /> Ask PeeBear
              </button>
              <button type="button" onClick={useMyLocation} disabled={locating} className="bd-action bd-action--cyan">
                {locating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Crosshair className="h-4 w-4" />}
                {usingDeviceLocation ? 'Near me' : 'Use my location'}
              </button>
              <details className="group/options relative">
                <summary className="bd-action cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                  More options <ChevronDown className="h-4 w-4 group-open/options:rotate-180" aria-hidden="true" />
                </summary>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button type="button" onClick={startGuide} className="bd-action">
                    <CircleHelp className="h-4 w-4" /> How it works
                  </button>
                  <button type="button" onClick={() => void sharePulse()} className="bd-action bd-action--violet">
                    <Share2 className="h-4 w-4" /> Share view
                  </button>
                </div>
              </details>
              <Link href="/community/rally/new" className="bd-action bd-action--gold">
                <Plus className="h-4 w-4" /> Start a meetup
              </Link>
              <Link href={startAdventureHref} className="bd-action bd-action--violet">
                <Sparkles className="h-4 w-4" /> Start an adventure
              </Link>
            </div>
          </div>
          {peebearOpen ? (
            <div className="mt-5 rounded-2xl border border-yellow-200/12 bg-black/28 p-3" role="group" aria-label="Choose a vibe for PeeBear">
              <p className="px-1 text-[9px] font-black uppercase tracking-[0.18em] text-yellow-100/52">What are we doing?</p>
              <div className="scrollbar-hide mt-2 flex gap-2 overflow-x-auto">
                {PEEBEAR_VIBES.map((vibe) => (
                  <button key={vibe.id} type="button" onClick={() => letPeebearPick(vibe.id)} className="min-h-11 shrink-0 rounded-full border border-white/10 bg-white/[0.045] px-5 text-[9px] font-black uppercase tracking-[0.13em] text-white/70 hover:border-yellow-200/24 hover:text-yellow-100">
                    {vibe.label}
                  </button>
                ))}
              </div>
              <p className="mt-2 px-1 text-[9px] font-bold leading-4 text-white/30">PeeBear only compares real plans in this time window. Food and drink stay out until venue hours are trustworthy.</p>
            </div>
          ) : null}
          {shareStatus ? <p role="status" className="mt-4 text-right text-[9px] font-black uppercase tracking-[0.12em] text-cyan-100/60">{shareStatus}</p> : null}
        </section>

        <div className="mt-5 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap" role="group" aria-label="Choose an activity type">
          {PARTICIPATION_FILTERS.map((filter) => (
            <button key={filter.id} type="button" aria-pressed={participation === filter.id} onClick={() => { setParticipation(filter.id); setPickedPlanId(null); setPeebearDecision(null); }} className={`min-h-11 rounded-full border px-4 text-[10px] font-black ${participation === filter.id ? 'border-cyan-200/32 bg-cyan-300/[0.1] text-cyan-100' : 'border-white/10 bg-white/[0.035] text-white/55'}`}>{filter.label}</button>
          ))}
        </div>

        <div id="live-plan-filters" className={`scrollbar-hide scroll-mt-32 mt-5 flex items-center gap-2 overflow-x-auto rounded-2xl pb-1 transition ${guideStep === 0 ? 'ring-2 ring-yellow-300/55 ring-offset-4 ring-offset-black/70' : ''}`} role="group" aria-label="Filter live plans">
          {FILTERS.map((item) => (
            <button key={item.id} type="button" onClick={() => { setMode(item.id); setPickedPlanId(null); setPeebearOpen(false); setPeebearDecision(null); }} aria-pressed={mode === item.id} className={`min-h-10 shrink-0 rounded-full border px-4 text-[9px] font-black uppercase tracking-[0.13em] ${mode === item.id ? 'border-[#f5c518]/36 bg-[#f5c518]/[0.11] text-[#fff0a8]' : 'border-white/10 bg-white/[0.035] text-white/44'}`}>
              {item.label}
            </button>
          ))}
          <button type="button" onClick={() => { setNeedsPeopleOnly((current) => !current); setPickedPlanId(null); setPeebearOpen(false); setPeebearDecision(null); }} aria-pressed={needsPeopleOnly} className={`inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full border px-4 text-[9px] font-black uppercase tracking-[0.13em] ${needsPeopleOnly ? 'border-cyan-200/32 bg-cyan-300/[0.1] text-cyan-100' : 'border-white/10 bg-white/[0.035] text-white/44'}`}>
            <Users className="h-3.5 w-3.5" /> Needs people
          </button>
          <button type="button" onClick={() => void load()} aria-label="Refresh live plans" className="ml-auto flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.035] text-white/46">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
        {guideStep === 0 ? <LivePlansGuideCue step={0} onBack={() => undefined} onNext={() => moveGuide('next')} onClose={closeIntro} /> : null}

        {snapshot ? (
          <div className="mt-4 flex flex-wrap gap-2 text-[9px] font-black uppercase tracking-[0.12em] text-white/42">
            <span className="rounded-full border border-white/9 bg-black/22 px-3 py-1.5">{plans.length} matches</span>
            <span className="rounded-full border border-white/9 bg-black/22 px-3 py-1.5">{plans.filter((plan) => plan.status.forming).length} need people</span>
            <span className="rounded-full border border-white/9 bg-black/22 px-3 py-1.5">{plans.reduce((sum, plan) => sum + (plan.people?.going ?? 0), 0)} going</span>
            {snapshot.totals.completedTogether7d > 0 ? <span className="rounded-full border border-emerald-200/14 bg-emerald-300/[0.055] px-3 py-1.5 text-emerald-100/65">{snapshot.totals.completedTogether7d} completed together this week</span> : null}
          </div>
        ) : null}

        {error ? <p role="status" className="mt-5 rounded-2xl border border-rose-200/18 bg-rose-300/[0.07] p-4 text-sm font-bold text-rose-100">{error}</p> : null}

        {pickedPlan && pickedSignal ? (
          <PeeBearDecisionCard
            key={`${pickedPlan.id}:${peebearDecision?.nonce ?? 0}`}
            plan={pickedPlan}
            runnerUp={pickedRunnerUp}
            signal={pickedSignal}
            reason={assessRecommendation(worldPulseRecommendationInput(pickedPlan), { now, window: worldPulseRecommendationWindow(mode), timeZone: snapshot?.window.tz }).reason}
            intent={peebearDecision?.intent ?? null}
            sideQuest={peebearDecision?.sideQuest ?? null}
            onFlipAgain={peebearDecision && pickedRunnerUp ? flipPeebearAgain : undefined}
          />
        ) : null}

        <div id="live-plan-list" className={`scroll-mt-32 rounded-[1.75rem] transition ${guideStep === 1 ? 'ring-2 ring-yellow-300/55 ring-offset-4 ring-offset-black/70' : ''}`}>
          {loading && !snapshot ? (
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => <div key={index} className="h-72 animate-pulse rounded-[1.55rem] border border-white/8 bg-white/[0.035]" />)}
            </div>
          ) : plans.length ? (
            <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-label="Live plans">
              {plans.map((plan) => <LivePlanCard key={plan.id} plan={plan} />)}
            </section>
          ) : (
            <section className={`mt-6 rounded-[1.75rem] border border-dashed border-white/14 bg-black/24 text-center ${participation === 'all' || participation === 'play' ? 'p-5' : 'p-10'}`}>
              {participation !== 'all' && participation !== 'play' ? <UsersIcon /> : null}
              <h2 className="mt-4 text-2xl font-black">{snapshot ? participation === 'earn' ? 'No paid dares in this window.' : participation === 'play' ? 'No free challenges in this window.' : 'No suitable plans in this window.' : 'Plans couldn’t load.'}</h2>
              <p className="mx-auto mt-2 max-w-md text-sm text-white/44">{snapshot ? "Browse another time, start a meetup, or try a free adventure at your own pace." : "Refresh to check what is available in this area."}</p>
              {!snapshot ? <button type="button" onClick={() => void load()} className="mt-4 block mx-auto text-sm font-bold text-cyan-100 underline underline-offset-4">Try again</button> : mode !== 'ALL' ? <button type="button" onClick={() => setMode('ALL')} className="mt-4 block mx-auto text-sm font-bold text-cyan-100 underline underline-offset-4">Browse all plans</button> : null}
              {snapshot && participation !== 'all' ? <button type="button" onClick={() => setParticipation('all')} className="mx-auto mt-4 block min-h-11 text-sm font-bold text-cyan-100">See other activity types</button> : null}
              <Link href={participation === 'meet' ? '/community/rally/new' : startAdventureHref} className="bd-action bd-action--gold mt-5 inline-flex min-h-11 items-center rounded-full bg-[#f5c518] px-5 text-[10px] font-black uppercase tracking-[0.14em] text-[#171006]">{participation === 'meet' ? 'Start a meetup' : 'Try a free adventure'}</Link>
            </section>
          )}
        </div>
        {guideStep === 1 ? <LivePlansGuideCue step={1} onBack={() => moveGuide('back')} onNext={() => moveGuide('next')} onClose={closeIntro} /> : null}
        {participation === 'all' || participation === 'play' ? <AdventureSuggestions area={{ lat: center.latitude, lng: center.longitude, label: center.latitude === SIARGAO_CENTER.latitude && center.longitude === SIARGAO_CENTER.longitude ? 'Siargao' : 'Selected map area', timeZone: snapshot?.window.tz }} /> : null}

        {guideStep === 2 ? (
          <div id="live-plan-next-move" className="scroll-mt-32 mt-6 rounded-[1.4rem] border border-emerald-200/22 bg-emerald-300/[0.07] p-4 ring-2 ring-yellow-300/55 ring-offset-4 ring-offset-black/70">
            <p className="text-[9px] font-black uppercase tracking-[0.18em] text-emerald-100/60">My Next Move</p>
            <p className="mt-2 text-sm font-bold text-white">After you join, your plan stays within reach here.</p>
          </div>
        ) : null}
        {guideStep === 2 ? <LivePlansGuideCue step={2} onBack={() => moveGuide('back')} onNext={() => moveGuide('next')} onClose={closeIntro} /> : null}

        <div className="mt-8 flex justify-center">
          <Link href={pickedPlan ? getWorldPulseMapHref(pickedPlan, mode) : getWorldPulseMapViewHref(center, mode)} prefetch={false} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/11 bg-white/[0.045] px-5 text-[10px] font-black uppercase tracking-[0.13em] text-white/64">
            <Map className="h-4 w-4 text-cyan-200" /> Open live map
          </Link>
        </div>
      </div>

    </main>
  );
}

function UsersIcon() {
  return <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-violet-200/18 bg-violet-300/[0.08] text-violet-100"><Sparkles className="h-6 w-6" /></div>;
}
