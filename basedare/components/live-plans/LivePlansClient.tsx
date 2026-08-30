'use client';

import Link from 'next/link';
import {
  CircleHelp,
  Crosshair,
  Dices,
  Loader2,
  Map,
  Navigation,
  Plus,
  Radio,
  RefreshCw,
  Share2,
  Sparkles,
  Users,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import LivePlanCard from '@/components/live-plans/LivePlanCard';
import MyNextMoveTray from '@/components/live-plans/MyNextMoveTray';
import {
  LIVE_PLANS_INTRO_KEY,
  LivePlansFirstChoice,
  LivePlansGuideCue,
  type LivePlansGuideStep,
} from '@/components/onboarding/LivePlansGuide';
import type { LivePlanSnapshot } from '@/lib/live-plans';
import { trackClientEvent } from '@/lib/analytics';
import {
  filterWorldPulsePlans,
  getWorldPulseMapHref,
  getWorldPulseMapViewHref,
  getWorldPulseSignal,
  getWorldPulseViewHref,
  pickWorldPulsePlan,
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
  { id: 'SOCIAL', label: 'Social' },
  { id: 'SURPRISE', label: 'Surprise me' },
];

type LivePlansClientProps = {
  initialCenter?: { latitude: number; longitude: number };
  initialMode?: WorldPulseMode;
  initialRadiusKm?: number;
  initialSelectedPlanId?: string | null;
  initialNeedsPeople?: boolean;
};

export default function LivePlansClient({
  initialCenter = SIARGAO_CENTER,
  initialMode = 'NOW',
  initialRadiusKm = 12,
  initialSelectedPlanId = null,
  initialNeedsPeople = false,
}: LivePlansClientProps) {
  const [center, setCenter] = useState(initialCenter);
  const [radiusKm] = useState(initialRadiusKm);
  const [usingDeviceLocation, setUsingDeviceLocation] = useState(false);
  const [snapshot, setSnapshot] = useState<LivePlanSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<WorldPulseMode>(initialMode);
  const [needsPeopleOnly, setNeedsPeopleOnly] = useState(initialNeedsPeople);
  const [pickedPlanId, setPickedPlanId] = useState<string | null>(initialSelectedPlanId);
  const [peebearOpen, setPeebearOpen] = useState(false);
  const [shareStatus, setShareStatus] = useState<string | null>(null);
  const [firstChoiceOpen, setFirstChoiceOpen] = useState(false);
  const [guideStep, setGuideStep] = useState<LivePlansGuideStep | null>(null);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      try {
        if (!window.localStorage.getItem(LIVE_PLANS_INTRO_KEY)) setFirstChoiceOpen(true);
      } catch {
        setFirstChoiceOpen(true);
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

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
    return () => {
      controller.abort();
      window.clearInterval(interval);
    };
  }, [load]);

  useEffect(() => {
    const href = getWorldPulseViewHref({
      mode,
      center,
      radiusKm,
      selectedPlanId: pickedPlanId,
      needsPeople: needsPeopleOnly,
    });
    window.history.replaceState(window.history.state, '', href);
  }, [center, mode, needsPeopleOnly, pickedPlanId, radiusKm]);

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
    const source = snapshot?.plans ?? [];
    const timed = filterWorldPulsePlans(source, mode);
    return needsPeopleOnly ? timed.filter((plan) => plan.status.forming) : timed;
  }, [mode, needsPeopleOnly, snapshot?.plans]);
  const nextMoves = snapshot?.myNextMoves ?? [];
  const pickedPlan = useMemo(
    () => (snapshot?.plans ?? []).find((plan) => plan.id === pickedPlanId) ?? null,
    [pickedPlanId, snapshot?.plans],
  );
  const pickedSignal = pickedPlan ? getWorldPulseSignal(pickedPlan) : null;

  const letPeebearPick = (intent: WorldPulseIntent) => {
    const peebearPick = pickWorldPulsePlan(plans, intent);
    if (!peebearPick) {
      setError(intent === 'SURF'
        ? 'No surf plan matches this time window yet. Try Surprise me.'
        : 'Nothing matching that vibe is live in this time window yet.');
      return;
    }
    trackClientEvent('peebear_live_plan_picked', {
      plan_id: peebearPick.id,
      plan_type: peebearPick.type,
      already_joined: peebearPick.viewer.isNextMove,
      needs_people: peebearPick.status.forming,
      pulse_mode: mode,
      pulse_intent: intent,
    });
    setError(null);
    setPeebearOpen(false);
    setPickedPlanId(peebearPick.id);
    window.requestAnimationFrame(() => {
      document.getElementById('peebear-pick')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  };

  const sharePulse = async () => {
    const relativeHref = getWorldPulseViewHref({
      mode,
      center,
      radiusKm,
      selectedPlanId: pickedPlan?.id,
      needsPeople: needsPeopleOnly,
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
    setFirstChoiceOpen(false);
    setGuideStep(null);
  }, [rememberIntro]);

  const startGuide = useCallback(() => {
    rememberIntro();
    setMode('NOW');
    setNeedsPeopleOnly(false);
    setPickedPlanId(null);
    setPeebearOpen(false);
    setFirstChoiceOpen(false);
    setGuideStep(0);
    scrollToGuideTarget(0);
  }, [rememberIntro, scrollToGuideTarget]);

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

  return (
    <main className="relative min-h-screen overflow-hidden px-4 pb-36 pt-8 text-white sm:px-6 md:pt-12 lg:px-10">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_16%_8%,rgba(34,211,238,0.13),transparent_31%),radial-gradient(circle_at_84%_18%,rgba(139,92,246,0.15),transparent_34%)]" />
      <div className="relative mx-auto max-w-7xl">
        <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(150deg,rgba(18,30,47,0.9),rgba(6,7,14,0.97))] p-5 shadow-[0_28px_80px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.09)] sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.24em] text-cyan-200/72"><Radio className="h-4 w-4" /> World Pulse</p>
              <h1 className="mt-3 max-w-4xl text-4xl font-black leading-[0.96] sm:text-6xl">See the island move. Join what happens next.</h1>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-white/52">Real boats, crews, events, Sparks and paid missions—filtered by what you can actually do.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => setPeebearOpen((current) => !current)} aria-expanded={peebearOpen} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-yellow-200/22 bg-yellow-300/[0.08] px-4 text-[10px] font-black uppercase tracking-[0.13em] text-yellow-100 hover:bg-yellow-300/[0.13]">
                <Dices className="h-4 w-4" /> Poke PeeBear
              </button>
              <button type="button" onClick={startGuide} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/12 bg-white/[0.045] px-4 text-[10px] font-black uppercase tracking-[0.13em] text-white/62 hover:text-white">
                <CircleHelp className="h-4 w-4" /> Show me around
              </button>
              <button type="button" onClick={useMyLocation} disabled={locating} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-cyan-200/22 bg-cyan-300/[0.08] px-4 text-[10px] font-black uppercase tracking-[0.13em] text-cyan-100 disabled:opacity-50">
                {locating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Crosshair className="h-4 w-4" />}
                {usingDeviceLocation ? 'Near me' : 'Use my area'}
              </button>
              <button type="button" onClick={() => void sharePulse()} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-violet-200/20 bg-violet-300/[0.07] px-4 text-[10px] font-black uppercase tracking-[0.13em] text-violet-100">
                <Share2 className="h-4 w-4" /> Share view
              </button>
              <Link href="/community/rally/new" className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#f5c518] px-5 text-[10px] font-black uppercase tracking-[0.13em] text-[#171006]">
                <Plus className="h-4 w-4" /> Start a Rally
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
              <p className="mt-2 px-1 text-[9px] font-bold leading-4 text-white/30">PeeBear only picks from real plans in this time window.</p>
            </div>
          ) : null}
          {shareStatus ? <p role="status" className="mt-4 text-right text-[9px] font-black uppercase tracking-[0.12em] text-cyan-100/60">{shareStatus}</p> : null}
        </section>

        {firstChoiceOpen ? <LivePlansFirstChoice onDoSomethingNow={startGuide} onLeave={closeIntro} /> : null}

        <div id="live-plan-filters" className={`scrollbar-hide scroll-mt-32 mt-5 flex items-center gap-2 overflow-x-auto rounded-2xl pb-1 transition ${guideStep === 0 ? 'ring-2 ring-yellow-300/55 ring-offset-4 ring-offset-black/70' : ''}`} role="group" aria-label="Filter live plans">
          {FILTERS.map((item) => (
            <button key={item.id} type="button" onClick={() => { setMode(item.id); setPickedPlanId(null); setPeebearOpen(false); }} aria-pressed={mode === item.id} className={`min-h-10 shrink-0 rounded-full border px-4 text-[9px] font-black uppercase tracking-[0.13em] ${mode === item.id ? 'border-[#f5c518]/36 bg-[#f5c518]/[0.11] text-[#fff0a8]' : 'border-white/10 bg-white/[0.035] text-white/44'}`}>
              {item.label}
            </button>
          ))}
          <button type="button" onClick={() => { setNeedsPeopleOnly((current) => !current); setPickedPlanId(null); setPeebearOpen(false); }} aria-pressed={needsPeopleOnly} className={`inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full border px-4 text-[9px] font-black uppercase tracking-[0.13em] ${needsPeopleOnly ? 'border-cyan-200/32 bg-cyan-300/[0.1] text-cyan-100' : 'border-white/10 bg-white/[0.035] text-white/44'}`}>
            <Users className="h-3.5 w-3.5" /> Needs people
          </button>
          <button type="button" onClick={() => void load()} aria-label="Refresh live plans" className="ml-auto flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.035] text-white/46">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
        {guideStep === 0 ? <LivePlansGuideCue step={0} onBack={() => undefined} onNext={() => moveGuide('next')} onClose={closeIntro} /> : null}

        {snapshot ? (
          <div className="mt-4 flex flex-wrap gap-2 text-[9px] font-black uppercase tracking-[0.12em] text-white/42">
            <span className="rounded-full border border-white/9 bg-black/22 px-3 py-1.5">{plans.length} live</span>
            <span className="rounded-full border border-white/9 bg-black/22 px-3 py-1.5">{plans.filter((plan) => plan.status.forming).length} need people</span>
            <span className="rounded-full border border-white/9 bg-black/22 px-3 py-1.5">{plans.reduce((sum, plan) => sum + (plan.people?.going ?? 0), 0)} going</span>
            {snapshot.totals.completedTogether7d > 0 ? <span className="rounded-full border border-emerald-200/14 bg-emerald-300/[0.055] px-3 py-1.5 text-emerald-100/65">{snapshot.totals.completedTogether7d} completed together this week</span> : null}
          </div>
        ) : null}

        {error ? <p role="status" className="mt-5 rounded-2xl border border-rose-200/18 bg-rose-300/[0.07] p-4 text-sm font-bold text-rose-100">{error}</p> : null}

        {pickedPlan && pickedSignal ? (
          <section id="peebear-pick" className="scroll-mt-28 mt-6 overflow-hidden rounded-[1.75rem] border border-yellow-200/18 bg-[linear-gradient(135deg,rgba(46,33,7,0.9),rgba(10,16,24,0.96)_48%,rgba(15,9,27,0.96))] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.42),inset_0_1px_0_rgba(255,255,255,0.08)] sm:p-6">
            <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
              <div className="min-w-0">
                <p className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] text-yellow-100/62"><Dices className="h-4 w-4" /> PeeBear picked one</p>
                <h2 className="mt-2 text-2xl font-black leading-tight text-white sm:text-3xl">{pickedPlan.title}</h2>
                <p className="mt-2 text-sm font-bold text-white/52">{pickedPlan.place.label}{pickedPlan.people ? ` · ${pickedPlan.people.going} going${pickedPlan.people.spotsNeeded ? ` · needs ${pickedPlan.people.spotsNeeded}` : ''}` : ''}</p>
                <p className="mt-3 text-[9px] font-black uppercase tracking-[0.15em] text-cyan-100/52">
                  {pickedSignal.label}{pickedSignal.sourceLabel ? ` · ${pickedSignal.sourceLabel}` : ''}
                </p>
              </div>
              <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
                <Link href={pickedPlan.action.href} prefetch={false} className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#f5c518] px-7 text-[10px] font-black uppercase tracking-[0.14em] text-[#171006]">
                  {pickedPlan.action.label}
                </Link>
                <Link href={getWorldPulseMapHref(pickedPlan, mode)} prefetch={false} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-cyan-200/18 bg-cyan-300/[0.065] px-5 text-[10px] font-black uppercase tracking-[0.13em] text-cyan-100">
                  <Navigation className="h-4 w-4" /> Show on map
                </Link>
              </div>
            </div>
          </section>
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
            <section className="mt-6 rounded-[1.75rem] border border-dashed border-white/14 bg-black/24 p-10 text-center">
              <UsersIcon />
              <h2 className="mt-4 text-2xl font-black">Nothing is forming here yet.</h2>
              <p className="mx-auto mt-2 max-w-md text-sm text-white/44">Start something people already want to do, then share the link to fill it.</p>
              <Link href="/community/rally/new" className="mt-5 inline-flex min-h-11 items-center rounded-full bg-[#f5c518] px-5 text-[10px] font-black uppercase tracking-[0.14em] text-[#171006]">Start the first Rally</Link>
            </section>
          )}
        </div>
        {guideStep === 1 ? <LivePlansGuideCue step={1} onBack={() => moveGuide('back')} onNext={() => moveGuide('next')} onClose={closeIntro} /> : null}

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

      <MyNextMoveTray plans={nextMoves} />
    </main>
  );
}

function UsersIcon() {
  return <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-violet-200/18 bg-violet-300/[0.08] text-violet-100"><Sparkles className="h-6 w-6" /></div>;
}
