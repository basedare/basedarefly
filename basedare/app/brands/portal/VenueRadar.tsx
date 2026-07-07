// Extracted verbatim from page.tsx (Phase A structural split — no behavior changes).
// All state lives in the page shell; props are threaded with their original names.
import type { Dispatch, RefObject, SetStateAction } from 'react';
import Link from 'next/link';
import { CreditCard, MapPin, MessageSquare, PlayCircle, Target, Users, X } from 'lucide-react';
import {
  buildVenueCreatorChatHref,
  formatCompactAudience,
  formatVenueRadarLocation,
  getVenueRadarClaimTone,
  type BrandVenueRadarItem,
  type ComposerPrefill,
  type VenueRadarFilter as VenueRadarFilterValue,
} from './activation-packages';

type VenueRadarProps = {
  closeVenueRadarInspect: () => void;
  filteredVenueRadar: BrandVenueRadarItem[];
  inspectVenueRadar: (venue: BrandVenueRadarItem) => void;
  openCampaignComposerForVenue: (venue: BrandVenueRadarItem, prefillInput?: string | null | ComposerPrefill) => void;
  selectedVenueRadar: BrandVenueRadarItem | null;
  setVenueRadarFilter: Dispatch<SetStateAction<VenueRadarFilterValue>>;
  venueRadarFilter: VenueRadarFilterValue;
  venueRadarSectionRef: RefObject<HTMLDivElement | null>;
};

export default function VenueRadar({
  closeVenueRadarInspect,
  filteredVenueRadar,
  inspectVenueRadar,
  openCampaignComposerForVenue,
  selectedVenueRadar,
  setVenueRadarFilter,
  venueRadarFilter,
  venueRadarSectionRef,
}: VenueRadarProps) {
  return (
    <>
        <div
          ref={venueRadarSectionRef}
          className="activation-shell mb-6 rounded-[28px] border p-4 backdrop-blur-xl md:mb-8 md:p-5"
        >
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="text-[11px] font-black uppercase tracking-[0.28em] text-cyan-100/70">Venue Radar</div>
              <h2 className="mt-2 text-2xl font-black text-white md:text-3xl">Best venues now</h2>
              <p className="mt-1 hidden max-w-2xl text-sm text-zinc-300/[0.72] md:block">
                Start from a real place. Fund the next proof route where live signal already exists.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {([
                { id: 'hot', label: 'Hot now' },
                { id: 'managed', label: 'My venues' },
                { id: 'claimable', label: 'Needs activation' },
              ] as const).map((filter) => {
                const active = venueRadarFilter === filter.id;
                return (
                  <button
                    key={filter.id}
                    type="button"
                    onClick={() => setVenueRadarFilter(filter.id)}
                    className={`min-h-10 rounded-full border px-4 py-2 text-xs font-black uppercase tracking-[0.12em] transition ${
                      active
                        ? 'activation-raised-purple'
                        : 'border-white/[0.12] bg-white/[0.05] text-zinc-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_10px_22px_rgba(0,0,0,0.2)] hover:border-white/[0.22] hover:bg-white/[0.08]'
                    }`}
                  >
                    {filter.label}
                  </button>
                );
              })}
            </div>
          </div>

          {filteredVenueRadar.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-dashed border-white/[0.15] bg-white/[0.04] px-4 py-5 text-sm text-zinc-300">
              No venues match this view yet. Pick a venue from the map or launch the first activation to create signal.
            </div>
          ) : (
            <div className="mt-5 grid gap-3 lg:grid-cols-3">
              {filteredVenueRadar.slice(0, 6).map((venue, index) => (
                <article
                  key={venue.id}
                  className={`rounded-[24px] border p-4 shadow-[0_22px_58px_rgba(0,0,0,0.34),inset_0_1px_0_rgba(255,255,255,0.08)] transition ${
                    selectedVenueRadar?.id === venue.id
                      ? 'border-[#f5c518]/40 bg-[radial-gradient(circle_at_18%_12%,rgba(255,216,82,0.18),transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.08),rgba(8,8,15,0.92))]'
                      : 'border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.075),rgba(7,7,12,0.88))] hover:border-purple-300/[0.28]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="rounded-full border border-white/[0.12] bg-black/30 px-2 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-300">
                          #{index + 1}
                        </span>
                        <span className={`rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${getVenueRadarClaimTone(venue)}`}>
                          {venue.claimState === 'claimed'
                            ? 'Claimed'
                            : venue.claimState === 'pending'
                              ? 'Claim pending'
                              : 'Unclaimed'}
                        </span>
                      </div>
                      <div className="mt-3 text-lg font-black text-white">{venue.name}</div>
                      <div className="mt-1 flex items-center gap-1 text-xs text-zinc-400">
                        <MapPin className="h-3.5 w-3.5" />
                        <span>{venue.city ?? venue.country ?? 'Venue on the grid'}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[#ffe785]">Score</div>
                      <div className="text-xl font-black text-white">{venue.score}</div>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => inspectVenueRadar(venue)}
                      className="inline-flex min-h-10 items-center gap-2 rounded-full border border-white/[0.15] bg-white/[0.06] px-3 py-2 text-xs font-black uppercase tracking-[0.12em] text-zinc-100 transition hover:border-white/25 hover:bg-white/[0.09]"
                    >
                      <Target className="h-3.5 w-3.5" />
                      Inspect venue
                    </button>
                    <button
                      type="button"
                      onClick={() => openCampaignComposerForVenue(venue)}
                      className="activation-raised-gold inline-flex min-h-10 items-center gap-2 rounded-full border px-3 py-2 text-xs font-black uppercase tracking-[0.12em] transition active:translate-y-[1px]"
                    >
                      <CreditCard className="h-3.5 w-3.5" />
                      Fund here
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}

          {selectedVenueRadar ? (
            <div className="activation-shell relative mt-5 rounded-[28px] border px-4 py-5 text-white">
              <button
                type="button"
                onClick={closeVenueRadarInspect}
                aria-label="Close venue details"
                className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/[0.15] bg-white/[0.06] text-zinc-300 transition hover:border-white/25 hover:bg-white/[0.1] hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="max-w-3xl">
                  <div className="flex flex-wrap items-center gap-2 pr-10">
                    <span className="rounded-full border border-white/[0.15] bg-white/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-200">
                      {selectedVenueRadar.priorityLabel}
                    </span>
                    <span className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-200">
                      {selectedVenueRadar.strategyLabel}
                    </span>
                  </div>
                  <h3 className="mt-3 text-2xl font-semibold">{selectedVenueRadar.name}</h3>
                  <div className="mt-1 flex items-center gap-1 text-sm text-zinc-400">
                    <MapPin className="h-4 w-4" />
                    <span>{formatVenueRadarLocation(selectedVenueRadar)}</span>
                  </div>
                  <p className="mt-4 max-w-2xl text-sm leading-6 text-zinc-300">{selectedVenueRadar.summary}</p>
                </div>

                <div className="hidden rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4 md:block lg:min-w-[220px]">
                  <div className="text-[11px] uppercase tracking-[0.22em] text-zinc-500">Why it ranks</div>
                  <div className="mt-3 space-y-2">
                    {selectedVenueRadar.rankReasons.map((reason) => (
                      <div key={reason} className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-zinc-200">
                        {reason}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-5 hidden gap-3 md:grid md:grid-cols-4">
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">Visitors today</div>
                  <div className="mt-2 text-2xl font-semibold">{selectedVenueRadar.activity.uniqueVisitorsToday}</div>
                  <div className="mt-1 text-xs text-zinc-400">{selectedVenueRadar.activity.scansLastHour} scans last hour</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">Live funding</div>
                  <div className="mt-2 text-2xl font-semibold">${selectedVenueRadar.activity.totalLiveFundingUsd.toLocaleString()}</div>
                  <div className="mt-1 text-xs text-zinc-400">{selectedVenueRadar.activity.activeChallenges} open challenges</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">Past activations</div>
                  <div className="mt-2 text-2xl font-semibold">{selectedVenueRadar.brandHistory.campaigns}</div>
                  <div className="mt-1 text-xs text-zinc-400">{selectedVenueRadar.brandHistory.liveCampaigns} live activations here</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">Verified memory</div>
                  <div className="mt-2 text-2xl font-semibold">{selectedVenueRadar.activity.approvedMarks}</div>
                  <div className="mt-1 text-xs text-zinc-400">{selectedVenueRadar.activity.recentCompletedCount} recent completions</div>
                </div>
              </div>

              <div className="mt-5 grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
                <div className="hidden rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4 md:block">
                  <div className="text-[11px] uppercase tracking-[0.22em] text-zinc-500">Recent creator signal</div>
                  {selectedVenueRadar.recentSignals.length === 0 ? (
                    <div className="mt-3 rounded-xl border border-dashed border-white/10 px-4 py-4 text-sm text-zinc-400">
                      No approved creator memory has been logged here yet. This is still a good venue to seed if the foot traffic signal is rising.
                    </div>
                  ) : (
                    <div className="mt-3 space-y-3">
                      {selectedVenueRadar.recentSignals.map((signal, index) => (
                        <div key={`${signal.creatorTag ?? 'anon'}-${signal.submittedAt}-${index}`} className="rounded-xl border border-white/10 bg-black/20 px-4 py-3">
                          <div className="flex items-center justify-between gap-3">
                            <div className="text-sm font-semibold text-white">{signal.creatorTag ?? 'Anonymous creator'}</div>
                            <div className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">
                              {signal.firstMark ? 'First spark' : 'Venue memory'}
                            </div>
                          </div>
                          <div className="mt-2 text-sm text-zinc-300">
                            {signal.caption || 'Creator left a verified venue signal here.'}
                          </div>
                          {signal.vibeTags.length > 0 ? (
                            <div className="mt-3 flex flex-wrap gap-2">
                              {signal.vibeTags.slice(0, 3).map((tag) => (
                                <span
                                  key={tag}
                                  className="rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-300"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div className="hidden rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4 md:block">
                    <div className="text-[11px] uppercase tracking-[0.22em] text-zinc-500">Top creators for this venue</div>
                    {selectedVenueRadar.topCreators.length === 0 ? (
                      <div className="mt-3 rounded-xl border border-dashed border-white/10 px-4 py-4 text-sm text-zinc-400">
                        No creator has built a strong public venue history here yet. This is still a good place to seed if the venue signal is hot.
                      </div>
                    ) : (
                      <div className="mt-3 space-y-3">
                        {selectedVenueRadar.topCreators.map((creator) => (
                          <div key={`${creator.creatorTag}-${creator.walletAddress}`} className="rounded-xl border border-white/10 bg-black/20 px-4 py-3">
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <div className="text-sm font-semibold text-white">{creator.creatorTag}</div>
                                <div className="mt-1 text-[11px] uppercase tracking-[0.18em] text-zinc-500">
                                  {creator.trustLabel} level {creator.trustLevel}
                                </div>
                              </div>
                              <div className="rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-300">
                                {creator.trustScore} trust
                              </div>
                            </div>
                            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                              <div className="rounded-lg border border-white/10 bg-white/[0.03] px-2 py-2">
                                <div className="text-sm font-semibold text-white">{creator.marksHere}</div>
                                <div className="text-[10px] uppercase tracking-[0.16em] text-zinc-500">Marks here</div>
                              </div>
                              <div className="rounded-lg border border-white/10 bg-white/[0.03] px-2 py-2">
                                <div className="text-sm font-semibold text-white">{creator.completedDares}</div>
                                <div className="text-[10px] uppercase tracking-[0.16em] text-zinc-500">Wins total</div>
                              </div>
                              <div className="rounded-lg border border-white/10 bg-white/[0.03] px-2 py-2">
                                <div className="text-sm font-semibold text-white">${Math.round(creator.totalEarned)}</div>
                                <div className="text-[10px] uppercase tracking-[0.16em] text-zinc-500">Earned</div>
                              </div>
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2">
                              {creator.firstMarksHere > 0 ? (
                                <span className="rounded-full border border-amber-400/20 bg-amber-400/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-100">
                                  {creator.firstMarksHere} first sparks
                                </span>
                              ) : null}
                              {typeof creator.followerCount === 'number' && creator.followerCount > 0 ? (
                                <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-100">
                                  {formatCompactAudience(creator.followerCount)} audience
                                </span>
                              ) : null}
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => openCampaignComposerForVenue(selectedVenueRadar, creator.creatorTag)}
                                className="inline-flex items-center gap-2 rounded-full border border-purple-400/25 bg-purple-500/10 px-3 py-2 text-xs font-semibold text-purple-100 transition hover:border-purple-300 hover:bg-purple-500/[0.15]"
                              >
                                <PlayCircle className="h-3.5 w-3.5" />
                                Route this creator
                              </button>
                              <Link
                                href={buildVenueCreatorChatHref(selectedVenueRadar, creator)}
                                className="inline-flex items-center gap-2 rounded-full border border-white/[0.15] bg-white/[0.06] px-3 py-2 text-xs font-semibold text-zinc-100 transition hover:border-white/25 hover:bg-white/[0.09]"
                              >
                                <MessageSquare className="h-3.5 w-3.5" />
                                Message
                              </Link>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4">
                    <div className="text-[11px] uppercase tracking-[0.22em] text-zinc-500">Next move</div>
                    <div className="mt-3 text-lg font-semibold text-white">
                      {selectedVenueRadar.strategyLabel}
                    </div>
                    <p className="mt-2 text-sm leading-6 text-zinc-300">
                      Fund one mission while the signal is fresh. BaseDare routes the creator and tracks the proof.
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => openCampaignComposerForVenue(selectedVenueRadar)}
                        className="activation-raised-gold inline-flex min-h-11 items-center gap-2 rounded-full border px-4 py-2 text-sm font-black uppercase tracking-[0.1em] transition active:translate-y-[1px]"
                      >
                        <PlayCircle className="h-4 w-4" />
                        Fund activation here
                      </button>
                      <Link
                        href={`/venues/${selectedVenueRadar.slug}`}
                        className="inline-flex items-center gap-2 rounded-full border border-white/[0.15] bg-white/[0.06] px-4 py-2 text-sm font-semibold text-zinc-100 transition hover:border-white/25"
                      >
                        <MapPin className="h-3.5 w-3.5" />
                        View venue
                      </Link>
                      {selectedVenueRadar.consoleUrl ? (
                        <Link
                          href={selectedVenueRadar.consoleUrl}
                          className="activation-raised-cyan inline-flex min-h-11 items-center gap-2 rounded-full border px-4 py-2 text-sm font-black uppercase tracking-[0.1em] transition active:translate-y-[1px]"
                        >
                          <PlayCircle className="h-3.5 w-3.5" />
                          Open console
                        </Link>
                      ) : null}
                      <Link
                        href={selectedVenueRadar.contactUrl}
                        className="inline-flex items-center gap-2 rounded-full border border-emerald-400/25 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-100 transition hover:border-emerald-300/40"
                      >
                        <Users className="h-3.5 w-3.5" />
                        {selectedVenueRadar.contactLabel}
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
    </>
  );
}
