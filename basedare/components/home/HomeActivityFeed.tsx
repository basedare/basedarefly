'use client';

import SharedAdventures from '@/components/adventures/SharedAdventures';
import Link from '@/components/DiscoveryLink';
import { useDiscovery } from '@/components/DiscoveryProvider';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowRight, Check, LocateFixed, MapPin, RefreshCw, Sparkles } from 'lucide-react';
import { useGeolocation } from '@/hooks/useGeolocation';
import { trackClientEvent } from '@/lib/analytics';
import type { LivePlanSnapshot } from '@/lib/live-plans';
import { ACTIVITY_SUGGESTIONS, SIARGAO_ACTIVITY_AREA, homePlanTime, suggestionsForArea, visibleHomePlans, visibleHomePosts, type ActivityArea, type ActivityFilter, type HomeLocalPost } from '@/lib/home-activities';
import { useAdventureProgress } from '@/hooks/useAdventureProgress';
import { activeAdventure, adventureHref } from '@/lib/adventure-progress';
import '@/components/PremiumBentoGrid.css';
import ActivityRail from './ActivityRail';

const OPEN_KEY = 'basedare:home-activity-open:v1';
const cardClass = 'flex min-w-0 flex-col rounded-[1.55rem] border border-white/10 bg-[linear-gradient(145deg,rgba(36,26,59,0.8),rgba(6,7,14,0.98))] p-5 shadow-[0_12px_28px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.06)]';
const actionClass = 'mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-4 text-xs font-black text-white hover:bg-white/10';
const labels = { boat: 'Boat crew', meetup: 'Community plan', venue_event: 'Published event', community_spark: 'Free dare', paid_dare: 'Paid dare' };

function recordOpen(id: string, kind: string, planId?: string) {
  trackClientEvent('home_activity_opened', { activity_id: id, activity_kind: kind, plan_id: planId, plan_type: planId ? kind : undefined, source: 'home' });
  try { sessionStorage.setItem(OPEN_KEY, JSON.stringify({ id, at: Date.now() })); } catch { /* Optional attribution. */ }
}

export default function HomeActivityFeed() {
  const { area, updateArea } = useDiscovery();
  const setArea = useCallback((value: ActivityArea) => updateArea(value), [updateArea]);
  const filter = area.participation.toUpperCase() as ActivityFilter;
  const setFilter = (value: ActivityFilter) => updateArea({ participation: value.toLowerCase() as typeof area.participation });
  const [snapshot, setSnapshot] = useState<{ areaKey: string; data: LivePlanSnapshot } | null>(null);
  const [failed, setFailed] = useState(false);
  const [localPosts, setLocalPosts] = useState<{ areaKey: string; posts: HomeLocalPost[] } | null>(null);
  const [postsFailed, setPostsFailed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(0);
  const [now, setNow] = useState(() => new Date());
  const [rotation, setRotation] = useState(0);
  const [expanded, setExpanded] = useState<string | null>(null);
  const { progress } = useAdventureProgress();
  const { coordinates, requestLocation, loading: locating, error: locationError } = useGeolocation({ maximumAge: 0, cacheTimeMs: 0 });
  const requestedLocation = useRef(false);
  const [areaNotice, setAreaNotice] = useState('');
  const [showLocationError, setShowLocationError] = useState(false);
  const siargaoSelected = area.lat === SIARGAO_ACTIVITY_AREA.lat && area.lng === SIARGAO_ACTIVITY_AREA.lng;
  const areaKey = `${area.lat}:${area.lng}:${area.radiusKm}`;
  const data = snapshot?.areaKey === areaKey ? snapshot.data : null;
  const effectiveArea = { ...area, timeZone: data?.window.tz ?? area.timeZone };

  useEffect(() => {
    if (requestedLocation.current && coordinates && !locating && !locationError) {
      setArea({ lat: Math.round(coordinates.lat * 1000) / 1000, lng: Math.round(coordinates.lng * 1000) / 1000, label: 'Near my location' });
      requestedLocation.current = false;
      setAreaNotice('Showing activities near your location.');
    }
  }, [coordinates, locating, locationError, setArea]);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 12000);
    setLoading(true);
    setFailed(false);
    setPostsFailed(false);
    let disposed = false;
    const query = new URLSearchParams({ lat: String(area.lat), lng: String(area.lng), radiusKm: String(area.radiusKm), horizonHours: '72', limit: '40' });
    const localQuery = new URLSearchParams({ lat: String(area.lat), lng: String(area.lng), radiusKm: String(area.radiusKm), limit: '8' });
    const get = async (url: string) => {
        const response = await fetch(url, { cache: 'no-store', signal: controller.signal });
        const body = await response.json();
        if (!response.ok || !body.success) throw new Error('Feed unavailable');
        return body;
    };
    void Promise.allSettled([get(`/api/live-plans?${query}`), get(`/api/local-signals?${localQuery}`)])
      .then(([plans, posts]) => {
        if (disposed) return;
        if (plans.status === 'fulfilled' && Array.isArray(plans.value.data?.plans)) setSnapshot({ areaKey, data: plans.value.data });
        else { setFailed(true); setSnapshot(null); }
        if (posts.status === 'fulfilled' && Array.isArray(posts.value.data?.signals)) {
          setLocalPosts({ areaKey, posts: posts.value.data.signals });
          setPostsFailed(Boolean(posts.value.warning));
        } else { setPostsFailed(true); setLocalPosts(null); }
      })
      .finally(() => { window.clearTimeout(timeout); if (!disposed) setLoading(false); });
    return () => { disposed = true; window.clearTimeout(timeout); controller.abort(); };
  }, [area.lat, area.lng, area.radiusKm, areaKey, refresh]);

  useEffect(() => {
    const restore = () => {
      try {
        const opened = JSON.parse(sessionStorage.getItem(OPEN_KEY) ?? 'null');
        if (opened && typeof opened.id === 'string' && Number.isFinite(opened.at) && Date.now() - opened.at < 24 * 3600000) {
          trackClientEvent('home_activity_returned', { activity_id: opened.id, source: 'home' });
        }
        sessionStorage.removeItem(OPEN_KEY);
      } catch { /* Storage is optional; activities stay usable. */ }
    };
    const returnToPage = () => {
      if (document.visibilityState !== 'visible') return;
      restore(); setNow(new Date()); setRefresh((value) => value + 1);
    };
    restore();
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') { setNow(new Date()); setRefresh((value) => value + 1); }
    }, 60000);
    document.addEventListener('visibilitychange', returnToPage);
    window.addEventListener('pageshow', returnToPage);
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', returnToPage); window.removeEventListener('pageshow', returnToPage); };
  }, []);

  const live = visibleHomePlans(data?.plans ?? [], effectiveArea, now, filter).slice(0, 6);
  const posts = filter === 'ALL' || filter === 'MEET' ? visibleHomePosts(localPosts?.areaKey === areaKey ? localPosts.posts : [], now, area.radiusKm)
    .filter((post) => !live.some((plan) => plan.title.toLowerCase() === post.title.toLowerCase() && plan.place.venueSlug === post.venueSlug)) : [];
  const ideas = filter === 'ALL' || filter === 'PLAY' ? suggestionsForArea(effectiveArea, now, rotation).slice(0, Math.max(3 - live.length - posts.length, 1)) : [];
  const active = activeAdventure(progress, now.getTime());
  const activeIdea = ACTIVITY_SUGGESTIONS.find((item) => item.id === active?.activityId);
  const mapHref = `/map?lat=${area.lat}&lng=${area.lng}&source=home-activity`;

  return <section className="mx-auto w-full max-w-[1400px]" aria-label="Find your next move">
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <div><p className="text-sm font-bold text-white/80">Open BaseDare and find your next move.</p><p className="mt-1 flex items-center gap-1 text-xs text-cyan-100/60"><MapPin size={13} />{area.label} · within {area.radiusKm} km</p></div>
      <div className="flex flex-wrap gap-2 text-xs">
        <button type="button" aria-pressed={siargaoSelected} className={`premium-filter-chip home-area-button rounded-full gap-2 px-4 ${siargaoSelected ? 'premium-filter-chip--active' : ''}`} onClick={() => {
          requestedLocation.current = false;
          setShowLocationError(false);
          setArea(SIARGAO_ACTIVITY_AREA);
          setAreaNotice('Showing General Luna, Siargao. Choose Play, Meet or Earn below.');
        }}>{siargaoSelected ? <Check size={15} /> : <MapPin size={15} />}{siargaoSelected ? 'Siargao selected' : 'Browse Siargao'}</button>
        <button type="button" className="premium-filter-chip home-area-button rounded-full gap-2 px-4" disabled={locating} onClick={() => {
          requestedLocation.current = true;
          setShowLocationError(true);
          setAreaNotice('');
          requestLocation();
        }}><LocateFixed size={15} />{locating ? 'Locating…' : 'Use my location'}</button>
      </div>
    </div>
    {showLocationError && locationError ? <p role="status" className="mb-3 text-xs text-amber-100/70">{locationError} Still browsing {area.label}.</p> : null}
    {areaNotice ? <p role="status" className="mb-3 text-xs text-cyan-100/80">{areaNotice}</p> : null}
    <div className="premium-bounties-controls relative mb-5 flex flex-wrap items-center justify-between gap-2 p-2 md:p-3">
      <div className="premium-filter-shell flex gap-1 p-1" role="group" aria-label="Activity filters">
        {(['ALL', 'PLAY', 'MEET', 'EARN'] as const).map((item) => <button key={item} aria-pressed={filter === item} onClick={() => setFilter(item)} className={`premium-filter-chip rounded-full px-3 text-[10px] font-black tracking-widest md:px-4 ${filter === item ? 'premium-filter-chip--active text-yellow-200' : ''}`}>{item}</button>)}
      </div>
      <Link href={mapHref} className="inline-flex min-h-11 items-center gap-2 px-3 text-xs font-bold text-cyan-100">Open map <ArrowRight size={14} /></Link>
    </div>
    {failed ? <p role="status" className="mb-4 text-xs text-amber-100/70">Live activities couldn’t refresh. These suggestions are still available. <button className="min-h-11 underline" onClick={() => setRefresh((v) => v + 1)}>Try again</button></p>
      : loading ? <p role="status" className="mb-4 text-xs text-white/50">Checking local activities…</p> : null}
    {postsFailed ? <p className="mb-3 text-xs text-white/50">Community updates couldn’t refresh. Any published schedule below still needs checking with the venue.</p> : null}
    {activeIdea && active ? <div className="mb-5 rounded-2xl border border-yellow-200/20 bg-yellow-300/[0.05] p-4">
      <p className="text-[10px] font-black uppercase tracking-widest text-yellow-100">Your adventure · {active.steps.length}/{activeIdea.steps.length} steps</p>
      <p className="mt-2 font-bold text-white">{activeIdea.title}</p>
      <p className="mt-1 text-xs text-white/50">Personal progress · free activity · no payment or verified points.</p>
      <Link className="mt-2 inline-flex min-h-11 items-center text-xs font-bold text-cyan-100" href={adventureHref(active.activityId, active.placeSlug, active.area)}>Continue your adventure →</Link>
    </div> : null}
    {!loading && !failed && !live.length && !posts.length && filter !== 'ALL' && filter !== 'PLAY' ? <p className="mb-4 text-sm text-white/60">{filter === 'EARN' ? 'No available paid missions in this area right now.' : 'No published group plans in this area right now.'} <Link href="/adventures" className="ml-2 underline text-cyan-100">Try a free activity instead →</Link></p> : null}
    {ideas.length ? <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
      <p className="flex items-center gap-2 text-xs text-white/50"><Sparkles size={14} />Suggested dares are free to try · no hosted event or cash reward</p>
      <button className="inline-flex min-h-11 items-center gap-2 text-xs font-bold text-white/70" onClick={() => setRotation((v) => v + 1)}><RefreshCw size={13} />Give me another idea</button>
    </div> : null}
    <ActivityRail key={[filter, ...live.map((p) => p.id), ...posts.map((p) => p.id), ...ideas.map((p) => p.id)].join(':')} count={live.length + posts.length + ideas.length}>{live.map((plan) => <article key={plan.id} className={cardClass}>
      <p className="text-[10px] font-black uppercase tracking-widest text-yellow-100/80">{labels[plan.type]}</p>
      <h4 className="mt-3 text-xl font-black leading-tight text-white">{plan.title}</h4>
      <p className="mt-3 text-xs text-cyan-100/75">{plan.place.label}</p>
      <p className="mt-2 text-xs text-white/60">{homePlanTime(plan, now, effectiveArea.timeZone)}</p>
      {plan.summary ? <p className="mt-3 line-clamp-3 text-sm text-white/60">{plan.summary}</p> : null}
      <p className="mt-3 text-[11px] text-white/45">{plan.trust.sourceLabel || plan.trust.label}</p>
      {plan.type === 'paid_dare' && plan.value?.rewardUsdc != null ? <p className="mt-2 text-sm font-bold text-yellow-100">{plan.value.rewardUsdc} USDC · see payout and requirements</p> : null}
      <div className="mt-auto"><Link href={plan.action.href} onClick={() => recordOpen(plan.id, plan.type, plan.sourceId)} className={`${actionClass} w-full`}>See {plan.type === 'paid_dare' ? 'mission' : 'details'} <ArrowRight size={14} /></Link></div>
    </article>)}{posts.map((post) => <article key={`post:${post.id}`} className={cardClass}>
      <p className="text-[10px] font-black uppercase tracking-widest text-emerald-100/80">Community post</p>
      <h4 className="mt-3 text-xl font-black text-white">{post.title}</h4>
      <p className="mt-3 text-xs text-cyan-100/70">{post.venueName || post.city}</p>
      {post.startsAt ? <p className="mt-2 text-xs text-white/60">{new Intl.DateTimeFormat('en', { timeZone: effectiveArea.timeZone ?? 'UTC', weekday: 'short', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' }).format(new Date(post.startsAt))}</p> : null}
      <p className="mt-3 line-clamp-3 text-sm text-white/60">{post.notes}</p>
      <p className="mt-3 text-[11px] text-white/45">{post.sourceAttribution}</p>
      <Link className={actionClass} href={post.venueSlug ? `/map?place=${encodeURIComponent(post.venueSlug)}&source=home-activity` : '/community'} onClick={() => recordOpen(post.id, 'local_post')}>See place and details <ArrowRight size={14} /></Link>
    </article>)}{ideas.map((idea) => <article key={idea.id} className={cardClass}>
      <p className="text-[10px] font-black uppercase tracking-widest text-violet-200/80">Free activity · {idea.minutes} min</p>
      <h4 className="mt-3 text-xl font-black leading-tight text-white">{idea.title}</h4>
      <p className="mt-3 text-sm text-white/60">{idea.summary}</p>
      <div className="mt-auto">{expanded === idea.id ? <div className="mt-4">
        <ol className="list-inside list-decimal space-y-3 text-sm text-white/70">{idea.steps.map((step) => <li key={step}>{step}</li>)}</ol>
        <Link href={mapHref} onClick={() => recordOpen(idea.id, 'suggestion_map')} className="mt-3 inline-flex min-h-11 items-center text-xs font-bold text-cyan-100">Explore places on the map →</Link>
        <Link className={`${actionClass} w-full`} href={adventureHref(idea.id, undefined, effectiveArea)}>{active?.activityId === idea.id ? 'Continue adventure' : 'Open this adventure'} <ArrowRight size={14} /></Link>
      </div> : <button className={`${actionClass} w-full`} onClick={() => { setExpanded(idea.id); recordOpen(idea.id, 'suggestion'); }}>Try this dare <ArrowRight size={14} /></button>}</div>
    </article>)}</ActivityRail>
    <div className="mt-5 flex flex-wrap gap-x-5 text-xs font-bold text-white/55">
      <Link className="min-h-11 py-3" href={adventureHref(undefined, undefined, effectiveArea)}>Free adventures & your journal →</Link>
      <Link className="min-h-11 py-3" href="/community">Community posts →</Link>
      <Link className="min-h-11 py-3" href="/earn">All paid missions →</Link>
      <Link className="min-h-11 py-3" href="/community/rally/new">Start a meetup →</Link>
    </div>
  <SharedAdventures compact/>
</section>;
}
