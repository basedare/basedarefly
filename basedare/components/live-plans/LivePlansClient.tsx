'use client';

import Link from 'next/link';
import { Crosshair, Loader2, Map, Plus, RefreshCw, Sparkles } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import LivePlanCard from '@/components/live-plans/LivePlanCard';
import type { LivePlan, LivePlanSnapshot } from '@/lib/live-plans';

const SIARGAO_CENTER = { latitude: 9.803, longitude: 126.159 };
const FILTERS = [
  { id: 'NOW', label: 'Now' },
  { id: 'FORMING', label: 'Needs people' },
  { id: 'TONIGHT', label: 'Tonight' },
  { id: 'ALL', label: 'All' },
] as const;
type Filter = (typeof FILTERS)[number]['id'];

function isSoon(plan: LivePlan, hours: number) {
  if (!plan.startsAt) return true;
  const delta = new Date(plan.startsAt).getTime() - Date.now();
  return delta >= -4 * 60 * 60 * 1000 && delta <= hours * 60 * 60 * 1000;
}

export default function LivePlansClient() {
  const [center, setCenter] = useState(SIARGAO_CENTER);
  const [usingDeviceLocation, setUsingDeviceLocation] = useState(false);
  const [snapshot, setSnapshot] = useState<LivePlanSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('NOW');

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    const query = new URLSearchParams({
      lat: String(center.latitude),
      lng: String(center.longitude),
      radiusKm: '12',
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
  }, [center.latitude, center.longitude]);

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    const interval = window.setInterval(() => void load(), 60_000);
    return () => {
      controller.abort();
      window.clearInterval(interval);
    };
  }, [load]);

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
    if (filter === 'FORMING') return source.filter((plan) => plan.status.forming);
    if (filter === 'TONIGHT') return source.filter((plan) => isSoon(plan, 12));
    if (filter === 'NOW') return source.filter((plan) => isSoon(plan, 4));
    return source;
  }, [filter, snapshot?.plans]);
  const nextMoves = snapshot?.myNextMoves ?? [];

  return (
    <main className="relative min-h-screen overflow-hidden px-4 pb-36 pt-28 text-white sm:px-6 lg:px-10">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_16%_8%,rgba(34,211,238,0.13),transparent_31%),radial-gradient(circle_at_84%_18%,rgba(139,92,246,0.15),transparent_34%)]" />
      <div className="relative mx-auto max-w-7xl">
        <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(150deg,rgba(18,30,47,0.9),rgba(6,7,14,0.97))] p-5 shadow-[0_28px_80px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.09)] sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.24em] text-cyan-200/72"><Sparkles className="h-4 w-4" /> Live Plans</p>
              <h1 className="mt-3 max-w-4xl text-4xl font-black leading-[0.96] sm:text-6xl">See what&apos;s happening. Join in. Go together.</h1>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-white/52">Boats, meetups, venue events, free Sparks and paid Dares—one clear next move at a time.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={useMyLocation} disabled={locating} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-cyan-200/22 bg-cyan-300/[0.08] px-4 text-[10px] font-black uppercase tracking-[0.13em] text-cyan-100 disabled:opacity-50">
                {locating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Crosshair className="h-4 w-4" />}
                {usingDeviceLocation ? 'Near me' : 'Use my area'}
              </button>
              <Link href="/community/rally/new" className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#f5c518] px-5 text-[10px] font-black uppercase tracking-[0.13em] text-[#171006]">
                <Plus className="h-4 w-4" /> Start a Rally
              </Link>
            </div>
          </div>
        </section>

        <div className="mt-5 flex items-center gap-2 overflow-x-auto pb-1" role="group" aria-label="Filter live plans">
          {FILTERS.map((item) => (
            <button key={item.id} type="button" onClick={() => setFilter(item.id)} aria-pressed={filter === item.id} className={`min-h-10 shrink-0 rounded-full border px-4 text-[9px] font-black uppercase tracking-[0.13em] ${filter === item.id ? 'border-[#f5c518]/36 bg-[#f5c518]/[0.11] text-[#fff0a8]' : 'border-white/10 bg-white/[0.035] text-white/44'}`}>
              {item.label}
            </button>
          ))}
          <button type="button" onClick={() => void load()} aria-label="Refresh live plans" className="ml-auto flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.035] text-white/46">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {snapshot ? (
          <div className="mt-4 flex flex-wrap gap-2 text-[9px] font-black uppercase tracking-[0.12em] text-white/42">
            <span className="rounded-full border border-white/9 bg-black/22 px-3 py-1.5">{snapshot.totals.plans} live</span>
            <span className="rounded-full border border-white/9 bg-black/22 px-3 py-1.5">{snapshot.totals.forming} need people</span>
            <span className="rounded-full border border-white/9 bg-black/22 px-3 py-1.5">{snapshot.totals.going} going</span>
          </div>
        ) : null}

        {error ? <p role="status" className="mt-5 rounded-2xl border border-rose-200/18 bg-rose-300/[0.07] p-4 text-sm font-bold text-rose-100">{error}</p> : null}

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

        <div className="mt-8 flex justify-center">
          <Link href="/map?source=live-plans" prefetch={false} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/11 bg-white/[0.045] px-5 text-[10px] font-black uppercase tracking-[0.13em] text-white/64">
            <Map className="h-4 w-4 text-cyan-200" /> Open live map
          </Link>
        </div>
      </div>

      {nextMoves.length ? (
        <aside className="fixed inset-x-3 bottom-3 z-40 mx-auto max-w-2xl rounded-[1.35rem] border border-emerald-200/20 bg-[linear-gradient(150deg,rgba(10,35,30,0.96),rgba(5,8,14,0.98))] p-3 shadow-[0_20px_70px_rgba(0,0,0,0.62),inset_0_1px_0_rgba(255,255,255,0.1)] backdrop-blur-xl" aria-label="My next move">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-emerald-200/18 bg-emerald-300/[0.08] text-emerald-100"><Sparkles className="h-4 w-4" /></span>
            <span className="min-w-0 flex-1">
              <span className="block text-[8px] font-black uppercase tracking-[0.2em] text-emerald-100/58">My next move</span>
              <strong className="mt-1 block truncate text-sm text-white">{nextMoves[0].title} · {nextMoves[0].place.label}</strong>
            </span>
            <Link href={nextMoves[0].action.href} className="inline-flex min-h-10 shrink-0 items-center rounded-full bg-emerald-300 px-4 text-[9px] font-black uppercase tracking-[0.12em] text-[#032018]">Open</Link>
          </div>
        </aside>
      ) : null}
    </main>
  );
}

function UsersIcon() {
  return <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-violet-200/18 bg-violet-300/[0.08] text-violet-100"><Sparkles className="h-6 w-6" /></div>;
}
