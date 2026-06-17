'use client';

import type { CSSProperties } from 'react';
import { useEffect, useMemo, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import Link from 'next/link';
import {
  ArrowRight,
  BadgeCheck,
  MapPin,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Star,
  Trophy,
  Users,
} from 'lucide-react';

import { ControlChrome } from '@/components/control/ControlChrome';
import { ControlStatRow, type ControlStatItem } from '@/components/control/ControlStat';
import { ControlChip } from '@/components/control/ControlChip';
import { controlPanel, controlInset, controlSoftCard } from '@/components/control/tokens';
import ScoutVenuesPanel from '@/components/scouts/ScoutVenuesPanel';

type Creator = {
  tag: string;
  totalEarned: number;
  completedDares: number;
  status: string;
  tags?: string[];
  pfpUrl?: string | null;
  pfpScale?: number | null;
  pfpOffsetX?: number | null;
  pfpOffsetY?: number | null;
  reviews?: {
    count: number;
    averageRating: number | null;
  };
  trust?: {
    level: number;
    label: string;
    score: number;
  };
  stats?: {
    approved: number;
    payoutQueued: number;
    live: number;
    acceptRate: number;
  };
  businessMetrics?: {
    venueReach: number;
    firstMarks: number;
  };
};

type FilterMode = 'all' | 'verified' | 'venue' | 'reviewed';
type SortMode = 'trust' | 'venue' | 'reviews' | 'earned' | 'dares';

function plainCreatorTag(tag: string): string {
  return tag.replace(/^@/, '').trim().toLowerCase();
}

function displayCreatorTag(tag: string): string {
  const trimmed = tag.trim();
  return trimmed.startsWith('@') ? trimmed : `@${trimmed}`;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function getAvatarStyle(creator: Creator): CSSProperties {
  const scale = clamp(creator.pfpScale ?? 1, 1, 2.5);
  const offsetX = clamp(creator.pfpOffsetX ?? 50, 0, 100);
  const offsetY = clamp(creator.pfpOffsetY ?? 50, 0, 100);

  return {
    objectPosition: `${offsetX}% ${offsetY}%`,
    transform: `scale(${scale})`,
    transformOrigin: 'center center',
  };
}

function buildCreateHref(creator: Creator): string {
  const params = new URLSearchParams({
    streamer: displayCreatorTag(creator.tag),
    source: 'control',
  });
  return `/create?${params.toString()}`;
}

function buildBidHref(creator: Creator): string {
  const creatorTag = displayCreatorTag(creator.tag);
  const params = new URLSearchParams({
    creator: creatorTag,
    subject: `Creator route: ${creatorTag}`,
    message: `Saw your Creator Radar profile on BaseDare. Are you open to a paid venue or brand activation? Send your location, availability, and strongest content style.`,
    source: 'creator-radar',
  });
  return `/chat?${params.toString()}`;
}

function creatorScore(creator: Creator): number {
  return (
    (creator.trust?.score ?? 0) +
    (creator.businessMetrics?.venueReach ?? 0) * 9 +
    (creator.businessMetrics?.firstMarks ?? 0) * 6 +
    (creator.reviews?.count ?? 0) * 3 +
    Math.min(creator.completedDares, 20) * 2
  );
}

export default function CreatorRadarPage() {
  const [creators, setCreators] = useState<Creator[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [sortMode, setSortMode] = useState<SortMode>('trust');

  useEffect(() => {
    let cancelled = false;

    async function loadCreators() {
      try {
        const response = await fetch('/api/creators', { cache: 'no-store' });
        const payload = await response.json();

        if (!cancelled && payload.success) {
          setCreators(payload.data ?? []);
        }
      } catch (error) {
        console.error('Failed to load creator radar', error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadCreators();

    return () => {
      cancelled = true;
    };
  }, []);

  const visibleCreators = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    const filtered = creators.filter((creator) => {
      const tag = creator.tag.toLowerCase();
      const tags = creator.tags?.map((item) => item.toLowerCase()) ?? [];
      const matchesQuery =
        !normalizedQuery ||
        tag.includes(normalizedQuery) ||
        tags.some((item) => item.includes(normalizedQuery));

      if (!matchesQuery) return false;
      if (filterMode === 'verified') return creator.status === 'VERIFIED';
      if (filterMode === 'venue') return (creator.businessMetrics?.venueReach ?? 0) > 0;
      if (filterMode === 'reviewed') return (creator.reviews?.count ?? 0) > 0;
      return true;
    });

    return [...filtered].sort((left, right) => {
      if (sortMode === 'venue') {
        return (
          (right.businessMetrics?.venueReach ?? 0) - (left.businessMetrics?.venueReach ?? 0) ||
          creatorScore(right) - creatorScore(left)
        );
      }

      if (sortMode === 'reviews') {
        return (
          (right.reviews?.count ?? 0) - (left.reviews?.count ?? 0) ||
          (right.reviews?.averageRating ?? 0) - (left.reviews?.averageRating ?? 0)
        );
      }

      if (sortMode === 'earned') {
        return right.totalEarned - left.totalEarned || creatorScore(right) - creatorScore(left);
      }

      if (sortMode === 'dares') {
        return right.completedDares - left.completedDares || creatorScore(right) - creatorScore(left);
      }

      return creatorScore(right) - creatorScore(left);
    });
  }, [creators, filterMode, query, sortMode]);

  const verifiedCount = creators.filter((creator) => creator.status === 'VERIFIED').length;
  const venueProvenCount = creators.filter((creator) => (creator.businessMetrics?.venueReach ?? 0) > 0).length;
  const averageTrust =
    creators.length > 0
      ? Math.round(creators.reduce((total, creator) => total + (creator.trust?.score ?? 0), 0) / creators.length)
      : 0;

  const filters: Array<{ value: FilterMode; label: string }> = [
    { value: 'all', label: 'All' },
    { value: 'verified', label: 'Verified' },
    { value: 'venue', label: 'Venue-ready' },
    { value: 'reviewed', label: 'Reviewed' },
  ];

  const sortOptions: Array<{ value: SortMode; label: string }> = [
    { value: 'trust', label: 'Best Fit' },
    { value: 'venue', label: 'Venue Reach' },
    { value: 'reviews', label: 'Reviews' },
  ];

  const summaryMetrics: ControlStatItem[] = [
    { label: 'Creators', value: creators.length, icon: Users },
    { label: 'Verified', value: verifiedCount, icon: BadgeCheck },
    { label: 'Avg fit', value: averageTrust, icon: ShieldCheck },
    { label: 'Venue-ready', value: venueProvenCount, icon: MapPin },
  ];

  const routingSteps: Array<{ label: string; detail: string; icon: LucideIcon }> = [
    { label: '1. Search', detail: 'Find the creator', icon: Search },
    { label: '2. Filter', detail: 'Check venue signal', icon: SlidersHorizontal },
    { label: '3. Fit', detail: 'Rank reliability', icon: ShieldCheck },
    { label: '4. Route', detail: 'Message or fund', icon: ArrowRight },
  ];

  return (
    <ControlChrome
      title="Creator Radar"
      subtitle="Creator route control"
      badge="Scout Portal"
      maxWidthClass="max-w-7xl"
      action={
        <div className="flex items-center gap-2">
          <Link
            href="/creators"
            className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/[0.035] px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-white/52 transition hover:text-white sm:inline-flex"
          >
            Public creators
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/scouts"
            className="hidden items-center gap-2 rounded-full border border-yellow-300/20 bg-yellow-300/[0.06] px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-yellow-100/72 transition hover:border-yellow-300/35 hover:text-yellow-100 sm:inline-flex"
          >
            Scout Army
            <Users className="h-4 w-4" />
          </Link>
        </div>
      }
    >
      {/* Compact hero */}
      <section className={`${controlPanel} px-5 py-6 sm:px-8 lg:px-10 lg:py-7`}>
        <div className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-white/35 to-transparent" />
        <div className="relative grid gap-5 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
          <div>
            <div className="text-[11px] font-black uppercase tracking-[0.28em] text-cyan-100/70">
              For sponsors, venues, and scouts
            </div>
            <h1 className="mt-2 max-w-4xl text-3xl font-black leading-[0.95] tracking-[-0.045em] text-white sm:text-5xl">
              Route reliable creators
            </h1>
            <p className="mt-3 max-w-2xl text-sm font-bold leading-6 text-white/62 sm:text-base">
              Search the creator graph, rank mission fit, and move the best creator into a paid venue route.
            </p>
          </div>

          <div className="hidden grid-cols-2 gap-2 text-sm md:grid">
            {routingSteps.map(({ label, detail, icon: Icon }) => (
              <div key={label} className={`${controlInset} px-3 py-3`}>
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-yellow-100/78" />
                  <div className="font-black text-white">{label}</div>
                </div>
                <div className="mt-1 text-xs font-bold text-white/50">{detail}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <ControlStatRow items={summaryMetrics} columnsClass="grid-cols-2 sm:grid-cols-4" />

      <ScoutVenuesPanel />

      {/* Toolbar: search + filters + sort */}
      <section className={`${controlPanel} p-4 sm:p-5`}>
        <div className="relative grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <label className={`${controlInset} flex items-center gap-3 px-4 py-3`}>
            <Search className="h-4 w-4 shrink-0 text-white/58" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="w-full bg-transparent text-sm font-bold text-white outline-none placeholder:text-white/44"
              placeholder="Search creator, niche, vibe, or tag"
            />
          </label>

          <div className="flex flex-wrap gap-2">
            {filters.map((filter) => (
              <ControlChip
                key={filter.value}
                label={filter.label}
                active={filterMode === filter.value}
                onClick={() => setFilterMode(filter.value)}
              />
            ))}
          </div>
        </div>

        <div className="relative mt-4 flex flex-wrap items-center gap-2">
          <span className="mr-1 text-[10px] font-black uppercase tracking-[0.2em] text-white/34">Sort</span>
          {sortOptions.map((option) => (
            <ControlChip
              key={option.value}
              label={option.label}
              active={sortMode === option.value}
              onClick={() => setSortMode(option.value)}
            />
          ))}
        </div>
      </section>

      {/* Creator grid */}
      <section>
        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((item) => (
              <div key={item} className={`${controlSoftCard} h-[320px] animate-pulse`} />
            ))}
          </div>
        ) : visibleCreators.length === 0 ? (
          <div className={`${controlPanel} px-5 py-12 text-center sm:px-8`}>
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl border border-white/12 bg-white/[0.06]">
              <Sparkles className="h-7 w-7 text-white/64" />
            </div>
            <h2 className="mt-5 text-3xl font-black tracking-[-0.04em] text-white">
              Creator graph is warming up.
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-white/54">
              No matching creators for this filter yet. Open the public list or route a First Spark.
            </p>
            <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                href="/creators"
                className="inline-flex items-center justify-center rounded-full border border-white/12 bg-white/[0.06] px-5 py-3 text-xs font-black uppercase tracking-[0.18em] text-white/72 transition hover:text-white"
              >
                Open public creators
              </Link>
              <Link
                href="/first-spark?source=creator-radar#pilot-request"
                className="inline-flex items-center justify-center rounded-full border border-yellow-300/30 bg-yellow-300 px-5 py-3 text-xs font-black uppercase tracking-[0.18em] text-black transition hover:bg-yellow-200"
              >
                Run First Spark
              </Link>
            </div>
          </div>
        ) : (
          <>
            <div className="mb-4 flex items-center justify-between gap-4 px-1 text-[11px] font-mono uppercase tracking-[0.18em] text-white/54">
              <span>{visibleCreators.length} visible creators</span>
              <span className="hidden sm:inline">Sorted for mission fit</span>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {visibleCreators.map((creator) => {
                const plainTag = plainCreatorTag(creator.tag);
                const displayTag = displayCreatorTag(creator.tag);
                const averageRating = creator.reviews?.averageRating ?? null;
                const reviewLabel =
                  averageRating !== null
                    ? `${averageRating.toFixed(1)} / ${creator.reviews?.count ?? 0}`
                    : `${creator.reviews?.count ?? 0} reviews`;
                const cardMetrics: Array<{ label: string; value: string | number; icon: LucideIcon }> = [
                  { label: 'Fit', value: creatorScore(creator), icon: ShieldCheck },
                  { label: 'Reviews', value: reviewLabel, icon: Star },
                  { label: 'Venues', value: creator.businessMetrics?.venueReach ?? 0, icon: MapPin },
                  { label: 'Proofs', value: creator.completedDares, icon: Trophy },
                ];

                return (
                  <article
                    key={creator.tag}
                    className={`${controlSoftCard} flex min-h-[340px] flex-col p-5 transition duration-200 hover:-translate-y-0.5 hover:border-white/16`}
                  >
                    <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/22 to-transparent" />
                    <div className="relative flex items-start gap-4">
                      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-[22px] border border-white/12 bg-white/[0.06] shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]">
                        {creator.pfpUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element -- user avatars can live on configurable media gateways.
                          <img
                            src={creator.pfpUrl}
                            alt={displayTag}
                            className="h-full w-full object-cover"
                            style={getAvatarStyle(creator)}
                          />
                        ) : (
                          <div className="grid h-full w-full place-items-center text-2xl font-black text-white/70">
                            {displayTag.replace('@', '').slice(0, 1).toUpperCase()}
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h2 className="max-w-[calc(100%-4rem)] truncate text-2xl font-black tracking-[-0.04em] text-white">
                            {displayTag}
                          </h2>
                          {creator.status === 'VERIFIED' ? <BadgeCheck className="h-4 w-4 shrink-0 text-white/72" /> : null}
                        </div>
                        <p className="mt-1 text-xs font-black uppercase tracking-[0.18em] text-white/52">
                          {creator.trust?.label ?? 'Unranked'} · venue ready
                        </p>
                      </div>
                    </div>

                    <div className="relative mt-5 grid grid-cols-2 gap-3">
                      {cardMetrics.map(({ label, value, icon: Icon }) => (
                        <div key={label} className={`${controlInset} px-3 py-3`}>
                          <div className="flex items-center justify-between gap-2">
                            <div className="text-[9px] font-black uppercase tracking-[0.18em] text-white/52">
                              {label}
                            </div>
                            <Icon className="h-3.5 w-3.5 text-white/48" />
                          </div>
                          <div className="mt-1 text-lg font-black text-white">{value}</div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-auto grid grid-cols-2 gap-2 pt-5">
                      <Link
                        href={buildBidHref(creator)}
                        className="inline-flex min-h-11 items-center justify-center rounded-full border border-yellow-300/30 bg-yellow-300 px-4 text-[11px] font-black uppercase tracking-[0.14em] text-black transition hover:bg-yellow-200"
                      >
                        Message
                      </Link>
                      <Link
                        href={buildCreateHref(creator)}
                        className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/12 bg-white/[0.055] px-4 text-[11px] font-black uppercase tracking-[0.14em] text-white/76 transition hover:bg-white/[0.09] hover:text-white"
                      >
                        Fund dare
                      </Link>
                      <Link
                        href={`/creator/${plainTag}`}
                        className="col-span-2 inline-flex min-h-9 items-center justify-center gap-2 text-[11px] font-black uppercase tracking-[0.16em] text-white/56 transition hover:text-white"
                      >
                        View profile
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          </>
        )}
      </section>
    </ControlChrome>
  );
}
