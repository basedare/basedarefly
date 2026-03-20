import Link from 'next/link';
import { ArrowRight, RadioTower, Waves } from 'lucide-react';
import { getFeaturedVenues } from '@/lib/venues';

export default async function VenueBeaconStrip() {
  let venues = [];

  try {
    venues = await getFeaturedVenues(4);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown venue fetch error';
    console.error('[MAP] Venue beacon strip unavailable:', message);
    return null;
  }

  if (venues.length === 0) {
    return null;
  }

  return (
    <section className="mx-auto mt-10 w-full max-w-6xl px-4 sm:px-6 md:px-10">
      <div className="relative overflow-hidden rounded-[34px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06)_0%,rgba(9,7,19,0.96)_14%,rgba(5,4,14,0.97)_100%)] px-5 py-6 shadow-[0_24px_90px_rgba(0,0,0,0.5),0_0_34px_rgba(168,85,247,0.08),inset_0_1px_0_rgba(255,255,255,0.1),inset_0_-18px_24px_rgba(0,0,0,0.24)] sm:px-6">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_0%,rgba(192,132,252,0.12),transparent_34%),radial-gradient(circle_at_88%_100%,rgba(34,211,238,0.1),transparent_36%),linear-gradient(180deg,rgba(255,255,255,0.05)_0%,transparent_32%,transparent_72%,rgba(0,0,0,0.26)_100%)]" />
        <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/26 to-transparent" />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="relative">
            <p className="text-[11px] font-semibold uppercase tracking-[0.34em] text-fuchsia-300/75">Venue Layer</p>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-white">Live Venue Beacons</h2>
            <p className="mt-2 max-w-2xl text-sm text-white/55">
              The first partner venues are now part of BaseDare’s real-world memory layer. Each one can accumulate presence, activity, and local legend over time.
            </p>
          </div>
          <Link
            href="/venues/siargao-beach-club"
            className="inline-flex items-center gap-2 self-start rounded-full border border-fuchsia-400/30 bg-[linear-gradient(180deg,rgba(217,70,239,0.18)_0%,rgba(91,33,182,0.08)_100%)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-fuchsia-100 shadow-[0_12px_20px_rgba(0,0,0,0.22),inset_0_1px_0_rgba(255,255,255,0.12),inset_0_-10px_14px_rgba(0,0,0,0.2)] transition hover:-translate-y-[1px] hover:border-fuchsia-300/50 hover:bg-fuchsia-500/18"
          >
            Open pilot venue
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {venues.map((venue) => (
            <Link
              key={venue.id}
              href={`/venues/${venue.slug}`}
              className="group relative overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06)_0%,rgba(255,255,255,0.02)_12%,rgba(10,10,16,0.94)_100%)] p-5 shadow-[0_18px_30px_rgba(0,0,0,0.22),inset_0_1px_0_rgba(255,255,255,0.08),inset_0_-12px_18px_rgba(0,0,0,0.24)] transition hover:-translate-y-[2px] hover:border-fuchsia-400/35 hover:bg-fuchsia-500/[0.06]"
            >
              <div className="pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-white/22 to-transparent" />
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-bold text-white">{venue.name}</p>
                  <p className="mt-1 text-sm text-white/50">{venue.city}, {venue.country}</p>
                </div>
                <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] shadow-[0_10px_18px_rgba(0,0,0,0.16),inset_0_1px_0_rgba(255,255,255,0.08)] ${
                  venue.liveSession?.status === 'LIVE'
                    ? 'border-emerald-500/20 bg-[linear-gradient(180deg,rgba(16,185,129,0.16)_0%,rgba(6,20,15,0.92)_100%)] text-emerald-300'
                    : 'border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05)_0%,rgba(10,10,14,0.92)_100%)] text-white/55'
                }`}>
                  <RadioTower className="h-3.5 w-3.5" />
                  {venue.liveSession?.status ?? 'OFFLINE'}
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                {venue.categories.slice(0, 3).map((category) => (
                  <span
                    key={category}
                    className="rounded-full border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05)_0%,rgba(0,0,0,0.24)_100%)] px-3 py-1.5 text-[11px] uppercase tracking-[0.22em] text-white/55 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
                  >
                    {category}
                  </span>
                ))}
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-[20px] border border-white/8 bg-[linear-gradient(180deg,rgba(6,8,14,0.82)_0%,rgba(0,0,0,0.26)_100%)] px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.07),inset_0_-10px_14px_rgba(0,0,0,0.22)]">
                  <p className="text-[10px] uppercase tracking-[0.24em] text-white/35">Check-Ins</p>
                  <p className="mt-2 text-xl font-black text-white">{venue.memorySummary?.checkInCount ?? 0}</p>
                </div>
                <div className="rounded-[20px] border border-white/8 bg-[linear-gradient(180deg,rgba(6,8,14,0.82)_0%,rgba(0,0,0,0.26)_100%)] px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.07),inset_0_-10px_14px_rgba(0,0,0,0.22)]">
                  <p className="text-[10px] uppercase tracking-[0.24em] text-white/35">Visitors</p>
                  <p className="mt-2 text-xl font-black text-white">{venue.memorySummary?.uniqueVisitorCount ?? 0}</p>
                </div>
              </div>

              <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-cyan-400/16 bg-cyan-500/[0.06] px-3 py-1.5 text-sm text-cyan-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                <Waves className="h-4 w-4" />
                {venue.liveSession?.campaignLabel ?? 'Venue memory online'}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
