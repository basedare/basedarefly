import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Activity, ArrowRight, Clock3, MapPin, ShieldCheck, Waves } from 'lucide-react';
import { getVenueDetailBySlug } from '@/lib/venues';

export default async function VenueDetailPage(
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const venue = await getVenueDetailBySlug(slug);

  if (!venue) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-[#05010c] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(168,85,247,0.16),_transparent_35%),radial-gradient(circle_at_bottom,_rgba(34,197,94,0.10),_transparent_28%)] pointer-events-none" />
      <div className="relative mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <section className="overflow-hidden rounded-[34px] border border-white/10 bg-[linear-gradient(180deg,rgba(11,8,21,0.98),rgba(6,4,14,0.97))] shadow-[0_30px_120px_rgba(0,0,0,0.65)]">
          <div className="border-b border-white/10 px-6 py-8 sm:px-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-3xl">
                <div className="inline-flex items-center gap-2 rounded-full border border-fuchsia-400/25 bg-fuchsia-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-fuchsia-200">
                  <ShieldCheck className="h-4 w-4" />
                  {venue.isPartner ? 'Partner Venue' : 'Venue Beacon'}
                </div>
                <h1 className="mt-5 text-4xl font-black tracking-tight sm:text-5xl">{venue.name}</h1>
                <p className="mt-4 max-w-2xl text-base text-white/65">{venue.description ?? 'This venue is now part of the BaseDare memory layer.'}</p>
                <div className="mt-5 flex flex-wrap items-center gap-4 text-sm text-white/55">
                  <span className="inline-flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-amber-300" />
                    {venue.address ? `${venue.address}, ` : ''}{venue.city}, {venue.country}
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <Waves className="h-4 w-4 text-cyan-300" />
                    {venue.liveSession?.campaignLabel ?? 'Venue check-in live'}
                  </span>
                </div>
              </div>

              <div className="grid min-w-[260px] gap-3 sm:grid-cols-2 lg:grid-cols-1">
                <Link
                  href={venue.consoleUrl}
                  className="group rounded-2xl border border-white/10 bg-white/5 px-5 py-4 transition hover:border-fuchsia-400/40 hover:bg-fuchsia-500/10"
                >
                  <p className="text-xs uppercase tracking-[0.25em] text-white/40">Venue Console</p>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-lg font-bold">Open live QR console</span>
                    <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                  </div>
                </Link>
                <div className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4">
                  <p className="text-xs uppercase tracking-[0.25em] text-white/40">Check-In Radius</p>
                  <div className="mt-2 text-lg font-bold">{venue.checkInRadiusMeters}m</div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-6 px-6 py-6 sm:px-8 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5">
                  <p className="text-xs uppercase tracking-[0.25em] text-white/40">Scans Last Hour</p>
                  <div className="mt-3 inline-flex items-center gap-3">
                    <Activity className="h-5 w-5 text-emerald-300" />
                    <span className="text-3xl font-black">{venue.liveStats.scansLastHour}</span>
                  </div>
                </div>
                <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5">
                  <p className="text-xs uppercase tracking-[0.25em] text-white/40">Unique Visitors Today</p>
                  <div className="mt-3 text-3xl font-black">{venue.liveStats.uniqueVisitorsToday}</div>
                </div>
                <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5">
                  <p className="text-xs uppercase tracking-[0.25em] text-white/40">Active Dares</p>
                  <div className="mt-3 text-3xl font-black">{venue.liveStats.activeDares}</div>
                </div>
              </div>

              <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.25em] text-white/40">Venue Memory</p>
                    <h2 className="mt-2 text-2xl font-bold">Today’s signal at this venue</h2>
                  </div>
                  <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/65">
                    {venue.memorySummary?.bucketType ?? 'DAY'}
                  </div>
                </div>
                <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-2xl border border-white/8 bg-black/20 px-4 py-4">
                    <p className="text-xs uppercase tracking-[0.24em] text-white/35">Check-Ins</p>
                    <p className="mt-2 text-2xl font-black">{venue.memorySummary?.checkInCount ?? 0}</p>
                  </div>
                  <div className="rounded-2xl border border-white/8 bg-black/20 px-4 py-4">
                    <p className="text-xs uppercase tracking-[0.24em] text-white/35">Unique Visitors</p>
                    <p className="mt-2 text-2xl font-black">{venue.memorySummary?.uniqueVisitorCount ?? 0}</p>
                  </div>
                  <div className="rounded-2xl border border-white/8 bg-black/20 px-4 py-4">
                    <p className="text-xs uppercase tracking-[0.24em] text-white/35">Venue Dares</p>
                    <p className="mt-2 text-2xl font-black">{venue.memorySummary?.dareCount ?? 0}</p>
                  </div>
                  <div className="rounded-2xl border border-white/8 bg-black/20 px-4 py-4">
                    <p className="text-xs uppercase tracking-[0.24em] text-white/35">Top Creator</p>
                    <p className="mt-2 text-lg font-bold">{venue.memorySummary?.topCreatorTag ?? 'Waiting...'}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-6">
                <p className="text-xs uppercase tracking-[0.25em] text-white/40">Live Dares</p>
                <div className="mt-5 space-y-3">
                  {venue.activeDares.length > 0 ? (
                    venue.activeDares.map((dare) => (
                      <Link
                        key={dare.id}
                        href={`/dare/${dare.shortId}`}
                        className="flex items-center justify-between rounded-2xl border border-white/8 bg-black/20 px-4 py-4 transition hover:border-fuchsia-400/35 hover:bg-fuchsia-500/5"
                      >
                        <div>
                          <p className="font-semibold text-white">{dare.title}</p>
                          <p className="mt-1 text-sm text-white/50">
                            {dare.missionMode} · {dare.streamerHandle ?? 'Open venue dare'}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-black text-emerald-300">${dare.bounty.toFixed(0)}</p>
                          <p className="mt-1 text-xs uppercase tracking-[0.25em] text-white/35">{dare.status}</p>
                        </div>
                      </Link>
                    ))
                  ) : (
                    <p className="text-sm text-white/55">No active dares tied to this venue yet.</p>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-6">
                <p className="text-xs uppercase tracking-[0.25em] text-white/40">Handshake Status</p>
                <div className="mt-4 space-y-3">
                  <div className="flex items-center justify-between rounded-2xl border border-white/8 bg-black/20 px-4 py-4">
                    <span className="text-sm text-white/55">Mode</span>
                    <span className="font-semibold">{venue.qrMode}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl border border-white/8 bg-black/20 px-4 py-4">
                    <span className="text-sm text-white/55">Rotation</span>
                    <span className="font-semibold">{venue.qrRotationSeconds}s</span>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl border border-white/8 bg-black/20 px-4 py-4">
                    <span className="text-sm text-white/55">Session</span>
                    <span className={`font-semibold ${
                      venue.liveSession?.status === 'LIVE' ? 'text-emerald-300' : 'text-white/65'
                    }`}>
                      {venue.liveSession?.status ?? 'OFFLINE'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl border border-white/8 bg-black/20 px-4 py-4">
                    <span className="text-sm text-white/55">Last Check-In</span>
                    <span className="font-semibold">
                      {venue.liveSession?.lastCheckInAt
                        ? new Date(venue.liveSession.lastCheckInAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
                        : 'None yet'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-6">
                <div className="flex items-center gap-2">
                  <Clock3 className="h-4 w-4 text-amber-300" />
                  <p className="text-xs uppercase tracking-[0.25em] text-white/40">Recent Presence</p>
                </div>
                <div className="mt-4 space-y-3">
                  {venue.recentCheckIns.length > 0 ? (
                    venue.recentCheckIns.map((checkIn) => (
                      <div
                        key={`${checkIn.walletAddress}-${checkIn.scannedAt}`}
                        className="rounded-2xl border border-white/8 bg-black/20 px-4 py-4"
                      >
                        <div className="flex items-center justify-between gap-4">
                          <p className="font-semibold text-white">{checkIn.tag ?? checkIn.walletAddress.slice(0, 10)}</p>
                          <p className="text-sm text-white/50">
                            {new Date(checkIn.scannedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                          </p>
                        </div>
                        <p className="mt-1 text-xs uppercase tracking-[0.24em] text-white/35">{checkIn.proofLevel}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-white/55">This venue has not logged any public check-ins yet.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
