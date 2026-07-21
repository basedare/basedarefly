'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useAccount } from 'wagmi';
import { Compass, Loader2, MapPin, ShieldCheck } from 'lucide-react';

/**
 * Historical venue-sourcing attribution. Public self-signup and automatic scout
 * commission are paused; this surface must not imply a current payment right.
 */

type ScoutVenue = {
  venueId: string;
  slug: string;
  name: string;
  city: string | null;
  isDiscovery: boolean;
  isActive: boolean;
};

export default function ScoutVenuesPanel() {
  const { address, isConnected } = useAccount();
  const { data: list = [], isLoading: loading } = useQuery({
    queryKey: ['scout-venues', address],
    enabled: Boolean(address),
    queryFn: async (): Promise<ScoutVenue[]> => {
      const res = await fetch(`/api/scouts/venues?wallet=${address}`);
      const payload = await res.json();
      return payload?.success ? (payload.data.venues as ScoutVenue[]) : [];
    },
  });

  if (!isConnected) return null;
  return (
    <div className="relative overflow-hidden rounded-[28px] border border-[#f5c518]/22 bg-[linear-gradient(180deg,rgba(245,197,24,0.08)_0%,rgba(13,10,22,0.92)_100%)] p-5 shadow-[0_24px_60px_rgba(0,0,0,0.34),inset_0_1px_0_rgba(255,255,255,0.1)] sm:p-6">
      <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-[#f8dd72]/40 to-transparent" />
      <div className="relative flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex items-center gap-2 rounded-full border border-[#f5c518]/24 bg-[#f5c518]/[0.1] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.22em] text-[#f8dd72]">
          <Compass className="h-4 w-4" />
          Venue sourcing pilot
        </div>
        {loading ? <Loader2 className="h-4 w-4 animate-spin text-white/50" /> : null}
      </div>

      <div className="relative mt-4 flex gap-3 rounded-2xl border border-amber-200/14 bg-amber-200/[0.045] px-4 py-4 text-sm font-semibold leading-6 text-white/58">
        <ShieldCheck className="mt-1 h-4 w-4 shrink-0 text-amber-100/75" />
        <p>Public venue scouting is paused. Finding or checking in at a venue does not claim ownership or create automatic rake. Any paid sourcing work needs an explicit, approved agreement.</p>
      </div>

      <div className="relative mt-4 grid gap-2">
        {list.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-5 text-sm font-semibold leading-6 text-white/56">
            Can you make an authorized venue introduction or support local fieldwork?{' '}
            <Link href="/hosts?source=venue-sourcing-pilot" className="font-black text-[#f8dd72] underline-offset-2 hover:underline">
              Apply as a Local Partner
            </Link>
            . Ordinary contributors should use paid missions on the map.
          </div>
        ) : (
          list.map((venue) => (
            <Link
              key={venue.venueId}
              href={`/venues/${encodeURIComponent(venue.slug)}`}
              className="group flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.03] px-3.5 py-3 transition hover:border-[#f5c518]/24 hover:bg-white/[0.05]"
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-[#f5c518]/20 bg-[#f5c518]/[0.09] text-[#f8dd72]">
                <MapPin className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-black text-white">{venue.name}</span>
                <span className="mt-0.5 flex flex-wrap items-center gap-1.5">
                  {venue.isDiscovery ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-cyan-300/22 bg-cyan-400/[0.1] px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.14em] text-cyan-100">
                      Historical source
                    </span>
                  ) : null}
                  {venue.isActive ? (
                    <span className="inline-flex items-center rounded-full border border-emerald-300/22 bg-emerald-400/[0.1] px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.14em] text-emerald-100">
                      Historical active role
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-full border border-white/12 bg-white/[0.04] px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.14em] text-white/40">
                      No active role
                    </span>
                  )}
                  {venue.city ? <span className="truncate text-[10px] font-semibold text-white/40">{venue.city}</span> : null}
                </span>
              </span>
              <span className="shrink-0 text-[9px] font-black uppercase tracking-[0.14em] text-white/32">Attribution only</span>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
