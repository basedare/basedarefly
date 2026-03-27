import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Activity, ArrowRight, Clock3, MapPin, ShieldCheck, Waves } from 'lucide-react';
import { getVenueDetailBySlug } from '@/lib/venues';
import VenuePageShell from '../VenuePageShell';

const raisedPanelClass =
  'relative overflow-hidden rounded-[30px] border border-white/[0.09] bg-[linear-gradient(180deg,rgba(255,255,255,0.07)_0%,rgba(255,255,255,0.025)_14%,rgba(10,9,18,0.9)_58%,rgba(7,6,14,0.96)_100%)] shadow-[0_28px_90px_rgba(0,0,0,0.4),0_0_28px_rgba(168,85,247,0.07),inset_0_1px_0_rgba(255,255,255,0.1),inset_0_-18px_24px_rgba(0,0,0,0.24)]';

const softCardClass =
  'relative overflow-hidden rounded-[26px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(255,255,255,0.06)_0%,rgba(255,255,255,0.02)_12%,rgba(10,10,18,0.92)_100%)] shadow-[0_18px_30px_rgba(0,0,0,0.22),inset_0_1px_0_rgba(255,255,255,0.08),inset_0_-12px_18px_rgba(0,0,0,0.22)]';

const insetCardClass =
  'rounded-[22px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(4,5,10,0.72)_0%,rgba(11,11,18,0.92)_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.06),inset_0_-10px_16px_rgba(0,0,0,0.26)]';

export default async function VenueDetailPage(
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const venue = await getVenueDetailBySlug(slug);

  if (!venue) {
    notFound();
  }

  const totalActiveChallengeFunding = venue.activeDares.reduce((sum, dare) => sum + dare.bounty, 0);

  return (
    <VenuePageShell mapHref={`/map?place=${encodeURIComponent(venue.slug)}`}>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(168,85,247,0.12),transparent_28%),radial-gradient(circle_at_15%_75%,rgba(34,211,238,0.08),transparent_24%),radial-gradient(circle_at_90%_85%,rgba(250,204,21,0.06),transparent_22%)]" />
      <main className="relative mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <section className="space-y-6">
          <div className={`${raisedPanelClass} px-6 py-8 sm:px-8`}>
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_0%,rgba(168,85,247,0.12),transparent_32%),radial-gradient(circle_at_88%_100%,rgba(34,211,238,0.1),transparent_36%),linear-gradient(180deg,rgba(255,255,255,0.05)_0%,transparent_32%,transparent_72%,rgba(0,0,0,0.24)_100%)]" />
            <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/26 to-transparent" />
            <div className="relative">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                <div className="max-w-3xl">
                  <div className="inline-flex items-center gap-2 rounded-full border border-fuchsia-400/25 bg-[linear-gradient(180deg,rgba(217,70,239,0.16)_0%,rgba(88,28,135,0.08)_100%)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-fuchsia-100 shadow-[0_12px_24px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.12),inset_0_-10px_14px_rgba(0,0,0,0.22)]">
                    <ShieldCheck className="h-4 w-4" />
                    {venue.isPartner ? 'Partner Venue' : 'Venue Beacon'}
                  </div>
                  <h1 className="mt-5 text-4xl font-black tracking-tight sm:text-5xl">{venue.name}</h1>
                  <p className="mt-4 max-w-2xl text-base text-white/68">{venue.description ?? 'This venue is now part of the BaseDare memory layer.'}</p>
                  <div className="mt-5 flex flex-wrap items-center gap-4 text-sm text-white/55">
                    <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                      <MapPin className="h-4 w-4 text-amber-300" />
                      {venue.address ? `${venue.address}, ` : ''}{venue.city}, {venue.country}
                    </span>
                    <span className="inline-flex items-center gap-2 rounded-full border border-cyan-400/14 bg-cyan-500/[0.06] px-3 py-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                      <Waves className="h-4 w-4 text-cyan-300" />
                      {venue.liveSession?.campaignLabel ?? 'Venue check-in live'}
                    </span>
                    <span className="inline-flex items-center gap-2 rounded-full border border-amber-400/16 bg-amber-500/[0.06] px-3 py-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                      <Activity className="h-4 w-4 text-amber-200" />
                      Heat {venue.tagSummary.heatScore}
                    </span>
                    <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                      <ShieldCheck className="h-4 w-4 text-fuchsia-200" />
                      {venue.tagSummary.approvedCount} marks
                    </span>
                  </div>
                </div>

                <div className="grid min-w-[260px] gap-3 sm:grid-cols-2 lg:grid-cols-1">
                  <Link
                    href={venue.consoleUrl}
                    className={`${softCardClass} group px-5 py-4 transition hover:-translate-y-[1px] hover:border-fuchsia-400/40 hover:bg-fuchsia-500/10`}
                  >
                    <div className="pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-white/22 to-transparent" />
                    <p className="text-xs uppercase tracking-[0.25em] text-white/40">Venue Console</p>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-lg font-bold">Open live QR console</span>
                      <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                    </div>
                  </Link>
                  <div className={`${softCardClass} px-5 py-4`}>
                    <div className="pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-white/22 to-transparent" />
                    <p className="text-xs uppercase tracking-[0.25em] text-white/40">Check-In Radius</p>
                    <div className="mt-2 text-lg font-bold">{venue.checkInRadiusMeters}m</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="relative grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className={`${softCardClass} p-5`}>
                  <div className="pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                  <p className="text-xs uppercase tracking-[0.25em] text-white/40">Scans Last Hour</p>
                  <div className="mt-3 inline-flex items-center gap-3">
                    <Activity className="h-5 w-5 text-emerald-300" />
                    <span className="text-3xl font-black">{venue.liveStats.scansLastHour}</span>
                  </div>
                </div>
                <div className={`${softCardClass} p-5`}>
                  <div className="pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                  <p className="text-xs uppercase tracking-[0.25em] text-white/40">Unique Visitors Today</p>
                  <div className="mt-3 text-3xl font-black">{venue.liveStats.uniqueVisitorsToday}</div>
                </div>
                <div className={`${softCardClass} p-5`}>
                  <div className="pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                  <p className="text-xs uppercase tracking-[0.25em] text-white/40">Active Dares</p>
                  <div className="mt-3 text-3xl font-black">{venue.liveStats.activeDares}</div>
                </div>
              </div>

              <div className={`${softCardClass} p-6`}>
                <div className="pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-white/22 to-transparent" />
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.25em] text-white/40">Active Challenges</p>
                    <h2 className="mt-2 text-2xl font-bold">Funded missions live at this place</h2>
                    <p className="mt-3 max-w-2xl text-sm text-white/60">
                      This is where the place turns into a real attention market. Open challenges here can become permanent memory once someone completes and verifies them.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <div className="rounded-full border border-[#f5c518]/20 bg-[#f5c518]/[0.08] px-4 py-2 text-sm text-[#f8dd72] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                      {venue.activeDares.length} live
                    </div>
                    <div className="rounded-full border border-emerald-400/18 bg-emerald-500/[0.08] px-4 py-2 text-sm text-emerald-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                      ${totalActiveChallengeFunding.toFixed(0)} funded
                    </div>
                    <Link
                      href={`/map?place=${encodeURIComponent(venue.slug)}`}
                      className="rounded-full border border-fuchsia-400/24 bg-fuchsia-500/[0.1] px-4 py-2 text-sm font-semibold text-fuchsia-100 shadow-[0_12px_22px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.08)] transition hover:-translate-y-[1px] hover:border-fuchsia-300/38 hover:bg-fuchsia-500/[0.14]"
                    >
                      Open on map to create challenge
                    </Link>
                  </div>
                </div>
                <div className="mt-5 space-y-3">
                  {venue.activeDares.length > 0 ? (
                    venue.activeDares.map((dare) => (
                      <Link
                        key={dare.id}
                        href={`/dare/${dare.shortId}`}
                        className={`${insetCardClass} group flex items-start justify-between gap-4 px-4 py-4 transition hover:border-[#f5c518]/25 hover:bg-[#f5c518]/[0.05]`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full border border-[#f5c518]/18 bg-[#f5c518]/[0.08] px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-[#f8dd72]">
                              ${dare.bounty.toFixed(0)} USDC
                            </span>
                            {dare.brandName ? (
                              <span className="rounded-full border border-cyan-400/18 bg-cyan-500/[0.08] px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-cyan-100">
                                {dare.brandName}
                              </span>
                            ) : null}
                            <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-white/48">
                              {dare.streamerHandle ? `target ${dare.streamerHandle}` : 'open challenge'}
                            </span>
                            {dare.expiresAt ? (
                              <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-white/48">
                                ends {new Date(dare.expiresAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-3 text-lg font-bold text-white">{dare.title}</p>
                          <p className="mt-2 text-sm text-white/55">
                            {dare.missionMode} mission anchored to this place{dare.streamerHandle ? ` for ${dare.streamerHandle}` : ''}.
                          </p>
                          {dare.campaignTitle ? (
                            <p className="mt-2 text-xs uppercase tracking-[0.2em] text-cyan-200/70">
                              Campaign: {dare.campaignTitle}
                            </p>
                          ) : null}
                        </div>
                        <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-white/35 transition group-hover:translate-x-1 group-hover:text-white/70" />
                      </Link>
                    ))
                  ) : (
                    <div className={`${insetCardClass} px-4 py-5`}>
                      <p className="text-sm text-white/58">
                        No live challenges here yet. Open this place on the map to fund the first mission and turn it into a stronger participation surface.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className={`${softCardClass} p-6`}>
                <div className="pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-white/22 to-transparent" />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.25em] text-white/40">Venue Memory</p>
                    <h2 className="mt-2 text-2xl font-bold">Today’s signal at this venue</h2>
                  </div>
                  <div className="rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-sm text-white/65 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                    {venue.memorySummary?.bucketType ?? 'DAY'}
                  </div>
                </div>
                <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <div className={`${insetCardClass} px-4 py-4`}>
                    <p className="text-xs uppercase tracking-[0.24em] text-white/35">Check-Ins</p>
                    <p className="mt-2 text-2xl font-black">{venue.memorySummary?.checkInCount ?? 0}</p>
                  </div>
                  <div className={`${insetCardClass} px-4 py-4`}>
                    <p className="text-xs uppercase tracking-[0.24em] text-white/35">Unique Visitors</p>
                    <p className="mt-2 text-2xl font-black">{venue.memorySummary?.uniqueVisitorCount ?? 0}</p>
                  </div>
                  <div className={`${insetCardClass} px-4 py-4`}>
                    <p className="text-xs uppercase tracking-[0.24em] text-white/35">Venue Dares</p>
                    <p className="mt-2 text-2xl font-black">{venue.memorySummary?.dareCount ?? 0}</p>
                  </div>
                  <div className={`${insetCardClass} px-4 py-4`}>
                    <p className="text-xs uppercase tracking-[0.24em] text-white/35">Top Creator</p>
                    <p className="mt-2 text-lg font-bold">{venue.memorySummary?.topCreatorTag ?? 'Waiting...'}</p>
                  </div>
                </div>
              </div>

              <div className={`${softCardClass} p-6`}>
                <div className="pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-white/22 to-transparent" />
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.25em] text-white/40">Creator Marks</p>
                    <h2 className="mt-2 text-2xl font-bold">Recent tags at this place</h2>
                  </div>
                  <div className="rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-sm text-white/65 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                    Heat {venue.tagSummary.heatScore}
                  </div>
                </div>
                <div className="mt-5 space-y-3">
                  {venue.recentTags.length > 0 ? (
                    venue.recentTags.map((tag) => (
                      <div
                        key={tag.id}
                        className={`${insetCardClass} flex items-start justify-between gap-4 px-4 py-4`}
                      >
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-semibold text-white">
                              {tag.creatorTag ?? `${tag.walletAddress.slice(0, 6)}...${tag.walletAddress.slice(-4)}`}
                            </p>
                            {tag.firstMark ? (
                              <span className="rounded-full border border-amber-400/18 bg-amber-500/[0.08] px-2 py-1 text-[10px] uppercase tracking-[0.22em] text-amber-200">
                                first mark
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-2 text-sm text-white/60">
                            {tag.caption ?? 'Verified place mark submitted through BaseDare.'}
                          </p>
                          {tag.vibeTags.length > 0 ? (
                            <div className="mt-3 flex flex-wrap gap-2">
                              {tag.vibeTags.slice(0, 4).map((vibeTag) => (
                                <span
                                  key={vibeTag}
                                  className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-white/48"
                                >
                                  #{vibeTag}
                                </span>
                              ))}
                            </div>
                          ) : null}
                        </div>
                        <div className="text-right">
                          <p className="text-xs uppercase tracking-[0.22em] text-white/35">{tag.proofType}</p>
                          <p className="mt-2 text-sm text-white/55">
                            {new Date(tag.submittedAt).toLocaleDateString([], {
                              month: 'short',
                              day: 'numeric',
                            })}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className={`${insetCardClass} px-4 py-5`}>
                      <p className="text-sm text-white/58">
                        No verified marks yet. The first approved tag here will start the place-memory timeline.
                      </p>
                    </div>
                  )}
                </div>
              </div>

            </div>

            <div className="space-y-6">
              <div className={`${softCardClass} p-6`}>
                <div className="pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-white/22 to-transparent" />
                <p className="text-xs uppercase tracking-[0.25em] text-white/40">Handshake Status</p>
                <div className="mt-4 space-y-3">
                  <div className={`${insetCardClass} flex items-center justify-between px-4 py-4`}>
                    <span className="text-sm text-white/55">Mode</span>
                    <span className="font-semibold">{venue.qrMode}</span>
                  </div>
                  <div className={`${insetCardClass} flex items-center justify-between px-4 py-4`}>
                    <span className="text-sm text-white/55">Rotation</span>
                    <span className="font-semibold">{venue.qrRotationSeconds}s</span>
                  </div>
                  <div className={`${insetCardClass} flex items-center justify-between px-4 py-4`}>
                    <span className="text-sm text-white/55">Session</span>
                    <span className={`font-semibold ${
                      venue.liveSession?.status === 'LIVE' ? 'text-emerald-300' : 'text-white/65'
                    }`}>
                      {venue.liveSession?.status ?? 'OFFLINE'}
                    </span>
                  </div>
                  <div className={`${insetCardClass} flex items-center justify-between px-4 py-4`}>
                    <span className="text-sm text-white/55">Last Check-In</span>
                    <span className="font-semibold">
                      {venue.liveSession?.lastCheckInAt
                        ? new Date(venue.liveSession.lastCheckInAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
                        : 'None yet'}
                    </span>
                  </div>
                </div>
              </div>

              <div className={`${softCardClass} p-6`}>
                <div className="pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-white/22 to-transparent" />
                <div className="flex items-center gap-2">
                  <Clock3 className="h-4 w-4 text-amber-300" />
                  <p className="text-xs uppercase tracking-[0.25em] text-white/40">Recent Presence</p>
                </div>
                <div className="mt-4 space-y-3">
                  {venue.recentCheckIns.length > 0 ? (
                    venue.recentCheckIns.map((checkIn) => (
                      <div
                        key={`${checkIn.walletAddress}-${checkIn.scannedAt}`}
                        className={`${insetCardClass} px-4 py-4`}
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
      </main>
    </VenuePageShell>
  );
}
