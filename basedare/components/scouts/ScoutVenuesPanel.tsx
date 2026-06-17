'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useAccount } from 'wagmi';
import { Compass, Loader2, MapPin, Sparkles } from 'lucide-react';

/**
 * Scout dashboard — your venues & rake (scout-engine slice 6).
 * Connected-wallet scoped: shows the venues a scout discovered/actively holds and
 * the rake rolled up from the ScoutRakeEvent ledger. Renders nothing until a
 * wallet connects, so it stays out of the way of the creator-radar view.
 */

type ScoutVenue = {
  venueId: string;
  slug: string;
  name: string;
  city: string | null;
  isDiscovery: boolean;
  isActive: boolean;
  totalRake: number;
  vestedRake: number;
  pendingRake: number;
};

function usd(value: number): string {
  return `$${(Number.isFinite(value) ? value : 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

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
  const totalRake = list.reduce((sum, v) => sum + v.totalRake, 0);
  const vestedRake = list.reduce((sum, v) => sum + v.vestedRake, 0);
  const pendingRake = list.reduce((sum, v) => sum + v.pendingRake, 0);

  return (
    <div className="relative overflow-hidden rounded-[28px] border border-[#f5c518]/22 bg-[linear-gradient(180deg,rgba(245,197,24,0.08)_0%,rgba(13,10,22,0.92)_100%)] p-5 shadow-[0_24px_60px_rgba(0,0,0,0.34),inset_0_1px_0_rgba(255,255,255,0.1)] sm:p-6">
      <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-[#f8dd72]/40 to-transparent" />
      <div className="relative flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex items-center gap-2 rounded-full border border-[#f5c518]/24 bg-[#f5c518]/[0.1] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.22em] text-[#f8dd72]">
          <Compass className="h-4 w-4" />
          Your scouted venues
        </div>
        {loading ? <Loader2 className="h-4 w-4 animate-spin text-white/50" /> : null}
      </div>

      <div className="relative mt-4 grid grid-cols-3 gap-2">
        {[
          ['Total rake', usd(totalRake)],
          ['Vested', usd(vestedRake)],
          ['Vesting', usd(pendingRake)],
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-white/10 bg-black/24 px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
            <div className="text-lg font-black text-white sm:text-xl">{value}</div>
            <div className="text-[9px] font-black uppercase tracking-[0.16em] text-white/42">{label}</div>
          </div>
        ))}
      </div>

      <div className="relative mt-4 grid gap-2">
        {list.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-5 text-sm font-semibold leading-6 text-white/56">
            No venues signed up yet. Find an unclaimed venue on the{' '}
            <Link href="/map" className="text-[#f8dd72] underline-offset-2 hover:underline">
              map
            </Link>{' '}
            and sign it up to start earning discovery + active rake.
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
                      <Sparkles className="h-2.5 w-2.5" /> Discovery
                    </span>
                  ) : null}
                  {venue.isActive ? (
                    <span className="inline-flex items-center rounded-full border border-emerald-300/22 bg-emerald-400/[0.1] px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.14em] text-emerald-100">
                      Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-full border border-white/12 bg-white/[0.04] px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.14em] text-white/40">
                      Active rake open
                    </span>
                  )}
                  {venue.city ? <span className="truncate text-[10px] font-semibold text-white/40">{venue.city}</span> : null}
                </span>
              </span>
              <span className="shrink-0 text-right">
                <span className="block text-sm font-black text-white">{usd(venue.totalRake)}</span>
                <span className="block text-[9px] font-black uppercase tracking-[0.14em] text-white/38">rake</span>
              </span>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
