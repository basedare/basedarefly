'use client';

import Link from 'next/link';
import { List, Map } from 'lucide-react';
import { useDiscovery } from '@/components/DiscoveryProvider';
import { readDiscovery } from '@/lib/discovery-context';
import { PARTICIPATION_FILTERS } from '@/lib/participation-filter';
import { worldPulseModeQuery, type WorldPulseMode } from '@/lib/world-pulse';

export default function DiscoveryViews({ active, queryString, filters = false }: {
  active: 'now' | 'list'; queryString?: string; filters?: boolean;
}) {
  const { area: context } = useDiscovery();
  const source = new URLSearchParams(queryString);
  const area = queryString === undefined ? context : readDiscovery(source);
  function href(path: string, patch: Record<string, string> = {}) {
    const query = new URLSearchParams(source);
    const values = { lat: String(area.lat), lng: String(area.lng), radiusKm: String(area.radiusKm), mode: worldPulseModeQuery(area.mode), participation: area.participation, areaLabel: area.label, ...(area.timeZone ? { timeZone: area.timeZone } : {}), ...patch };
    Object.entries(values).forEach(([key, value]) => query.set(key, value));
    if (path === '/map') query.set('pulse', values.mode);
    return `${path}?${query}`;
  }
  const tab = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-transparent px-4 text-xs font-bold text-white/65 transition hover:bg-white/5 focus-visible:outline focus-visible:outline-cyan-200';
  const selected = '!border-cyan-200/20 bg-cyan-200/10 !text-cyan-50';
  return <div className="mt-5 space-y-3">
    <nav aria-label="Browse this area" className="flex flex-wrap items-center gap-2">
      <span className="mr-auto text-xs text-white/60">{active === 'now' ? 'Explore this area' : `${area.label} · within ${area.radiusKm} km`}</span>
      <div className="bd-segmented flex"><Link href={href('/map')} className={tab}><Map size={15} aria-hidden="true" />Map</Link><Link href={href('/board')} aria-current={active === 'list' ? 'page' : undefined} className={`${tab} ${active === 'list' ? selected : ''}`}><List size={15} aria-hidden="true" />List view</Link></div>
    </nav>
    {filters ? <>
      <nav aria-label="Activity type" className="bd-segmented grid grid-cols-2 sm:grid-cols-4">{PARTICIPATION_FILTERS.map((filter) => <Link key={filter.id} href={href('/board', { participation: filter.id })} aria-current={area.participation === filter.id ? 'true' : undefined} className={`${tab} ${area.participation === filter.id ? selected : ''}`}>{filter.label}</Link>)}</nav>
      <nav aria-label="Activity time" className="bd-segmented grid grid-cols-4">{[['NOW', 'Now'], ['NEXT_2H', 'Next 2h'], ['TONIGHT', 'Tonight'], ['ALL', 'All']].map(([id, label]) => <Link key={id} href={href('/board', { mode: worldPulseModeQuery(id as WorldPulseMode) })} aria-current={area.mode === id ? 'true' : undefined} className={`${tab} !px-2 ${area.mode === id ? selected : ''}`}>{label}</Link>)}</nav>
    </> : null}
  </div>;
}
