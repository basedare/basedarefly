'use client';

import { useEffect, useState } from 'react';
import Link from '@/components/DiscoveryLink';
import { formatPhp, formatUsdc } from '@/lib/basecash-shared';
import HomeGridRadar, { type RadarDare } from '@/components/home/HomeGridRadar';
import ViewToggle from '@/components/ViewToggle';
import type { DareLoopCategory } from '@/lib/dare-loop-presentation';

type Availability = {
  available: true;
  listedCount: number;
  listedRewardUsdc: number;
  phpPerUsdc: number;
  dares: RadarDare[];
};
export type HomeDareAvailabilityResult = Availability | 'unavailable' | null;

/** The homepage shares one current funded inventory between its existing surfaces. */
export function useHomeDareAvailability() {
  const [result, setResult] = useState<HomeDareAvailabilityResult>(null);
  useEffect(() => {
    let controller: AbortController | undefined;
    let disposed = false;
    const refresh = async () => {
      controller?.abort();
      const current = new AbortController();
      controller = current;
      const timeout = window.setTimeout(() => current.abort(), 9000);
      try {
        const response = await fetch('/api/dares/available', { cache: 'no-store', signal: current.signal });
        const data = await response.json() as Availability;
        if (!response.ok || !data.available || !Number.isFinite(data.listedRewardUsdc) || !Number.isFinite(data.phpPerUsdc) || !Array.isArray(data.dares)) throw new Error('Rewards unavailable');
        if (!disposed && controller === current) setResult(data);
      } catch {
        if (!disposed && controller === current) setResult('unavailable');
      } finally {
        window.clearTimeout(timeout);
      }
    };
    const onVisible = () => { if (document.visibilityState === 'visible') void refresh(); };
    void refresh();
    const timer = window.setInterval(onVisible, 60_000);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      disposed = true;
      controller?.abort();
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);
  return result;
}

export default function HomeDareAvailability({ result, presentation = 'discovery' }: { result: HomeDareAvailabilityResult; presentation?: 'summary' | 'discovery' }) {
  const [category, setCategory] = useState<'ALL' | DareLoopCategory>('ALL');
  const [view, setView] = useState<'map' | 'list'>('map');

  const available = result !== null && result !== 'unavailable';
  const visibleDares = available ? result.dares.filter(dare => category === 'ALL' || dare.category === category) : [];
  if (presentation === 'summary') {
    return (
      <p aria-live="polite" className="mx-auto mt-3 min-h-5 max-w-lg text-xs font-semibold leading-5 text-white/65">
        {available ? <><strong className="text-yellow-200">{result.listedCount > 0 ? `≈ ${formatPhp(result.listedRewardUsdc * result.phpPerUsdc)}` : formatPhp(0)}</strong> in listed rewards · {result.listedCount} open {result.listedCount === 1 ? 'paid dare' : 'paid dares'} · {result.dares.reduce((sum, dare) => sum + dare.remainingSlots, 0)} paid slots</> : result === 'unavailable' ? 'Live rewards couldn’t refresh. Browse dares to check again.' : 'Checking live dare rewards…'}
      </p>
    );
  }
  return (
    <section aria-label="Open paid dares" className="mx-auto mt-3 w-full max-w-3xl text-left">
      <div aria-live="polite" className="rounded-[20px] border border-yellow-200/20 bg-[linear-gradient(145deg,rgba(245,197,24,0.09),rgba(12,9,22,0.86))] px-4 py-3 shadow-[0_12px_34px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.08)]">
        {available ? (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-yellow-100/80">Funded dare rewards listed</p>
              <p className="mt-1 text-3xl font-black text-[#f5c518]">{result.listedCount > 0 ? '≈ ' : ''}{formatPhp(result.listedRewardUsdc * result.phpPerUsdc)}</p>
              <p className="text-xs text-white/60">{formatUsdc(result.listedRewardUsdc)}{result.listedCount > 0 ? ' · estimated peso value, after fees' : ''}</p>
            </div>
            <Link href="/earn" prefetch={false} className="text-sm font-bold text-yellow-100 underline underline-offset-4">
              {result.listedCount} open {result.listedCount === 1 ? 'dare' : 'dares'} · {result.dares.reduce((sum, dare) => sum + dare.remainingSlots, 0)} paid slots →
            </Link>
          </div>
        ) : (
          <p className="text-sm font-semibold text-white/75">{result === 'unavailable' ? 'Couldn’t check available rewards. Open the dare list to try again.' : 'Checking available dare rewards…'}</p>
        )}
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-center gap-x-3 gap-y-1" aria-label="Dare categories">
        <button type="button" aria-pressed={category === 'ALL'} onClick={() => setCategory('ALL')} className={`min-h-11 rounded-full px-3 text-xs font-black uppercase ${category === 'ALL' ? 'border border-yellow-200/30 bg-yellow-100/10 text-yellow-100' : 'text-white/55'}`}>All dares</button>
        <ViewToggle categoryMode allSelected={category === 'ALL'} view={category === 'CONTROL' ? 'BUSINESS' : 'FAN'} setView={next => setCategory(next === 'BUSINESS' ? 'CONTROL' : 'CHAOS')} />
      </div>
      <div className="mt-3 flex justify-center gap-1 rounded-full border border-white/10 bg-black/30 p-1 text-xs" aria-label="Dare view">
        {(['map','list'] as const).map(value => <button key={value} type="button" aria-pressed={view === value} onClick={() => setView(value)} className={`min-h-10 flex-1 rounded-full font-bold ${view === value ? 'bg-purple-500/25 text-white' : 'text-white/60'}`}>{value === 'map' ? 'Map' : 'List'}</button>)}
      </div>
      {view === 'map' ? <HomeGridRadar hero dares={visibleDares} phpPerUsdc={available ? result.phpPerUsdc : undefined} fundingKnown={available} className="mt-3 flex justify-center" /> : null}
      <div className="mt-4 flex items-center justify-between gap-3 px-1">
        <h2 className="text-lg font-black uppercase italic text-white">{category === 'ALL' ? 'Active dares' : `${category} dares`}</h2>
        <Link href="/earn" prefetch={false} className="min-h-11 content-center text-xs font-bold text-yellow-100 underline underline-offset-4">See all →</Link>
      </div>
      {available && visibleDares.length > 0 ? (
        <ul className="mt-1 grid gap-2 sm:grid-cols-3">
          {(view === 'map' ? visibleDares.slice(0, 3) : visibleDares).map(dare => (
            <li key={dare.shortId}>
              <Link href={`/earn/${encodeURIComponent(dare.shortId)}`} prefetch={false} className="flex h-full flex-col gap-2 rounded-[20px] border border-yellow-200/15 bg-[linear-gradient(145deg,rgba(245,197,24,0.09),rgba(12,9,22,0.86))] p-4 hover:border-yellow-200/30">
                <strong className="text-xl font-black text-yellow-200">≈ {formatPhp(dare.creatorPayout * result.phpPerUsdc)} <span className="block text-[10px] font-semibold text-white/60">{formatUsdc(dare.creatorPayout)} after approval</span></strong>
                <span className={`text-[10px] font-black tracking-widest ${dare.category === 'CHAOS' ? 'text-purple-300' : 'text-yellow-200'}`}>{dare.category}{dare.isMystery ? ' · MYSTERY DROP' : ''}</span>
                <span className="text-sm font-black leading-5 text-white">{dare.title}</span><span className="text-xs text-white/60">{dare.locationLabel} · {dare.remainingSlots} slot</span>
                <span className="mt-auto pt-1 text-xs font-bold text-yellow-100">Do this →</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : <p className="rounded-xl border border-white/10 bg-black/30 p-4 text-sm text-white/60">{available ? category === 'ALL' ? 'No open funded dares are listed right now. Watch this space for the next drop.' : `No open funded ${category} dares are listed right now.` : result === 'unavailable' ? 'Dares are temporarily unavailable. Try the full map or refresh.' : 'Loading active dares…'}</p>}
    </section>
  );
}
