import Link from 'next/link';
import { ArrowRight, RadioTower, Waves } from 'lucide-react';
import { getFeaturedVenues } from '@/lib/venues';

export default async function VenueBeaconStrip() {
  const venues = await getFeaturedVenues(4);

  if (venues.length === 0) {
    return null;
  }

  return (
    <section className="mx-auto mt-10 w-full max-w-6xl px-4 sm:px-6 md:px-10">
      <div className="overflow-hidden rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(9,7,19,0.96),rgba(5,4,14,0.94))] px-5 py-6 shadow-[0_20px_80px_rgba(0,0,0,0.5)] sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.34em] text-fuchsia-300/75">Venue Layer</p>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-white">Live Venue Beacons</h2>
            <p className="mt-2 max-w-2xl text-sm text-white/55">
              The first partner venues are now part of BaseDare’s real-world memory layer. Each one can accumulate presence, activity, and local legend over time.
            </p>
          </div>
          <Link
            href="/venues/siargao-beach-club"
            className="inline-flex items-center gap-2 self-start rounded-full border border-fuchsia-400/30 bg-fuchsia-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-fuchsia-100 transition hover:border-fuchsia-300/50 hover:bg-fuchsia-500/18"
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
              className="group rounded-[26px] border border-white/10 bg-white/[0.03] p-5 transition hover:border-fuchsia-400/35 hover:bg-fuchsia-500/[0.06]"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-bold text-white">{venue.name}</p>
                  <p className="mt-1 text-sm text-white/50">{venue.city}, {venue.country}</p>
                </div>
                <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] ${
                  venue.liveSession?.status === 'LIVE'
                    ? 'bg-emerald-500/10 text-emerald-300'
                    : 'bg-white/8 text-white/55'
                }`}>
                  <RadioTower className="h-3.5 w-3.5" />
                  {venue.liveSession?.status ?? 'OFFLINE'}
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                {venue.categories.slice(0, 3).map((category) => (
                  <span
                    key={category}
                    className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-white/55"
                  >
                    {category}
                  </span>
                ))}
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-white/8 bg-black/20 px-3 py-3">
                  <p className="text-[10px] uppercase tracking-[0.24em] text-white/35">Check-Ins</p>
                  <p className="mt-2 text-xl font-black text-white">{venue.memorySummary?.checkInCount ?? 0}</p>
                </div>
                <div className="rounded-2xl border border-white/8 bg-black/20 px-3 py-3">
                  <p className="text-[10px] uppercase tracking-[0.24em] text-white/35">Visitors</p>
                  <p className="mt-2 text-xl font-black text-white">{venue.memorySummary?.uniqueVisitorCount ?? 0}</p>
                </div>
              </div>

              <div className="mt-4 inline-flex items-center gap-2 text-sm text-cyan-200">
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
