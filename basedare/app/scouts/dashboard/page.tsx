'use client';

import type { CSSProperties } from 'react';
import { useEffect, useMemo, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  DollarSign,
  MapPin,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Star,
  Trophy,
  Users,
} from 'lucide-react';

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

const raisedPanelClass =
  'relative overflow-hidden rounded-[32px] border border-white/[0.1] bg-[linear-gradient(180deg,rgba(255,255,255,0.08)_0%,rgba(255,255,255,0.028)_14%,rgba(10,10,13,0.94)_58%,rgba(4,4,6,0.99)_100%)] shadow-[0_36px_110px_rgba(0,0,0,0.55),0_10px_22px_rgba(255,255,255,0.035),inset_0_1px_0_rgba(255,255,255,0.12),inset_0_-20px_28px_rgba(0,0,0,0.28)]';

const softCardClass =
  'relative overflow-hidden rounded-[26px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(255,255,255,0.065)_0%,rgba(255,255,255,0.02)_12%,rgba(10,10,13,0.95)_100%)] shadow-[0_22px_42px_rgba(0,0,0,0.34),0_1px_0_rgba(255,255,255,0.04),inset_0_1px_0_rgba(255,255,255,0.09),inset_0_-14px_20px_rgba(0,0,0,0.25)]';

const insetCardClass =
  'rounded-[22px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(4,5,8,0.74)_0%,rgba(11,11,14,0.94)_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.06),inset_0_-10px_16px_rgba(0,0,0,0.26)]';

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

function formatUsd(value: number): string {
  if (value >= 1000) return `$${Math.round(value / 100) / 10}k`;
  return `$${Math.round(value)}`;
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
    { value: 'venue', label: 'Venue Proven' },
    { value: 'reviewed', label: 'Reviewed' },
  ];

  const sortOptions: Array<{ value: SortMode; label: string }> = [
    { value: 'trust', label: 'Best Fit' },
    { value: 'venue', label: 'Venue Reach' },
    { value: 'reviews', label: 'Reviews' },
    { value: 'earned', label: 'Earned' },
    { value: 'dares', label: 'Dares' },
  ];

  const summaryMetrics: Array<{ label: string; value: string; icon: LucideIcon }> = [
    { label: 'Creators', value: creators.length.toString(), icon: Users },
    { label: 'Verified', value: verifiedCount.toString(), icon: BadgeCheck },
    { label: 'Avg trust', value: `${averageTrust}`, icon: ShieldCheck },
    { label: 'Venue proven', value: venueProvenCount.toString(), icon: MapPin },
  ];

  return (
    <main className="fixed inset-0 z-[100] overflow-y-auto bg-[#030305] px-4 py-10 text-white contrast-110 [perspective:1400px] sm:px-6 md:grayscale md:saturate-0 md:contrast-125 lg:py-12">
      <style jsx global>{`
        @keyframes creator-radar-sweep {
          0% {
            transform: rotate(0deg);
            opacity: 0.62;
          }
          50% {
            opacity: 0.92;
          }
          100% {
            transform: rotate(360deg);
            opacity: 0.62;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .creator-radar-sweep {
            animation: none !important;
          }
        }
      `}</style>
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.12)_1px,transparent_0)] [background-size:112px_112px]" />
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(circle_at_15%_8%,rgba(255,255,255,0.12),transparent_30%),radial-gradient(circle_at_88%_18%,rgba(255,255,255,0.08),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.025),rgba(0,0,0,0.74))]" />
      <div className="pointer-events-none fixed inset-x-0 top-0 z-0 h-36 border-b border-white/[0.06] bg-black/70 md:bg-black/55 md:backdrop-blur-2xl" />
      <div
        className="pointer-events-none fixed left-1/2 top-20 z-0 hidden h-[420px] w-[860px] rounded-full border border-white/[0.055] bg-[radial-gradient(circle,rgba(255,255,255,0.07),transparent_58%)] shadow-[0_0_120px_rgba(255,255,255,0.07)] md:block"
        style={{ transform: 'translateX(-50%) rotateX(68deg)' }}
      />
      <div
        className="pointer-events-none fixed left-1/2 top-44 z-0 hidden h-[240px] w-[640px] rounded-full border border-white/[0.04] md:block"
        style={{ transform: 'translateX(-50%) rotateX(68deg)' }}
      />

      <div className="relative z-20 mx-auto max-w-7xl">
        <div className="mb-5 flex items-center justify-between gap-3">
          <Link
            href="/?mode=control"
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.045] px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-white/64 transition hover:bg-white/[0.08] hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Control
          </Link>
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

        <section className={`${raisedPanelClass} px-5 py-7 sm:px-8 lg:px-10 lg:py-10`}>
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.08),transparent_32%,rgba(0,0,0,0.28)_100%)]" />
          <div className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-white/35 to-transparent" />
          <div className="pointer-events-none absolute -right-16 -top-20 hidden h-56 w-56 rounded-full border border-white/[0.08] bg-white/[0.03] blur-[1px] md:block" />
          <div className="relative grid gap-8 lg:grid-cols-[0.92fr_1.08fr] lg:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/14 bg-white/[0.06] px-4 py-2 text-[11px] font-black uppercase tracking-[0.24em] text-white/72">
                <SlidersHorizontal className="h-4 w-4" />
                Control Creator Layer
              </div>
              <h1 className="mt-5 max-w-4xl text-4xl font-black uppercase italic leading-[0.92] tracking-[-0.07em] text-white sm:text-6xl lg:text-7xl">
                Creator Radar
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-white/62 sm:text-lg">
                Creator routing for venues and brands. See who is proven, reliable, and ready to move
                people into real places.
              </p>
            </div>

            <div className="relative [perspective:1100px]">
              <div className="pointer-events-none absolute -inset-4 rounded-[38px] bg-white/[0.035] blur-2xl" />
              <div className="relative grid gap-4 md:grid-cols-[0.82fr_1fr] lg:grid-cols-1 xl:grid-cols-[0.82fr_1fr]">
                <div
                  className={`${insetCardClass} hidden min-h-[230px] p-4 md:block`}
                  style={{ transform: 'rotateX(8deg) rotateY(-9deg)' }}
                >
                  <div className="relative h-full min-h-[198px] overflow-hidden rounded-[24px] border border-white/[0.08] bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.12),rgba(255,255,255,0.035)_30%,rgba(0,0,0,0.66)_70%)] shadow-[inset_0_0_40px_rgba(255,255,255,0.05)]">
                    <div className="absolute inset-6 rounded-full border border-white/[0.13]" />
                    <div className="absolute inset-12 rounded-full border border-white/[0.1]" />
                    <div className="absolute inset-[4.6rem] rounded-full border border-white/[0.08]" />
                    <div className="absolute left-1/2 top-1/2 h-px w-[46%] origin-left bg-gradient-to-r from-white/70 to-transparent creator-radar-sweep" style={{ animation: 'creator-radar-sweep 7s linear infinite' }} />
                    <div className="absolute left-[28%] top-[38%] h-2.5 w-2.5 rounded-full bg-white shadow-[0_0_22px_rgba(255,255,255,0.85)]" />
                    <div className="absolute right-[30%] top-[30%] h-2 w-2 rounded-full bg-white/80 shadow-[0_0_16px_rgba(255,255,255,0.7)]" />
                    <div className="absolute bottom-[29%] right-[42%] h-1.5 w-1.5 rounded-full bg-white/70 shadow-[0_0_14px_rgba(255,255,255,0.65)]" />
                    <div className="absolute bottom-4 left-4 right-4 rounded-2xl border border-white/[0.09] bg-black/38 px-4 py-3 backdrop-blur">
                      <div className="text-[9px] font-black uppercase tracking-[0.24em] text-white/42">Signal depth</div>
                      <div className="mt-1 text-lg font-black text-white">{venueProvenCount} venue proven</div>
                    </div>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {summaryMetrics.map(({ label, value, icon: Icon }) => (
                    <div key={label} className={`${insetCardClass} px-4 py-4 transition duration-300 md:hover:-translate-y-0.5 md:hover:border-white/14`}>
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-white/38">
                            {label}
                          </div>
                          <div className="mt-2 text-3xl font-black text-white">{value}</div>
                        </div>
                        <Icon className="h-5 w-5 text-white/42" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className={`${softCardClass} mt-6 p-4 sm:p-5`}>
          <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/24 to-transparent" />
          <div className="relative grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
            <label className={`${insetCardClass} flex items-center gap-3 px-4 py-3`}>
              <Search className="h-4 w-4 shrink-0 text-white/42" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="w-full bg-transparent text-sm font-bold text-white outline-none placeholder:text-white/28"
                placeholder="Search creator, niche, vibe, or tag"
              />
            </label>

            <div className="flex flex-wrap gap-2">
              {filters.map((filter) => (
                <button
                  key={filter.value}
                  type="button"
                  onClick={() => setFilterMode(filter.value)}
                  className={`rounded-full border px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] transition ${
                    filterMode === filter.value
                      ? 'border-white/34 bg-white/14 text-white'
                      : 'border-white/10 bg-white/[0.035] text-white/46 hover:text-white'
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>

          <div className="relative mt-4 flex flex-wrap gap-2">
            {sortOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setSortMode(option.value)}
                className={`rounded-full border px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] transition ${
                  sortMode === option.value
                    ? 'border-white/28 bg-white/12 text-white'
                    : 'border-white/10 bg-black/20 text-white/42 hover:text-white'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </section>

        <section className="mt-6">
          {loading ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map((item) => (
                <div key={item} className={`${softCardClass} h-[330px] animate-pulse`} />
              ))}
            </div>
          ) : visibleCreators.length === 0 ? (
            <div className={`${raisedPanelClass} px-5 py-12 text-center sm:px-8`}>
              <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl border border-white/12 bg-white/[0.06]">
                <Sparkles className="h-7 w-7 text-white/64" />
              </div>
              <h2 className="mt-5 text-3xl font-black tracking-[-0.04em] text-white">
                Creator graph is warming up.
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-white/54">
                No matching creators are available for this filter yet. Start with a public creator list,
                route an activation request, or invite a specific operator into the grid.
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
                  className="inline-flex items-center justify-center rounded-full border border-white/18 bg-white text-black px-5 py-3 text-xs font-black uppercase tracking-[0.18em] transition hover:bg-white/86"
                >
                  Run First Spark
                </Link>
                <Link
                  href="/contact?topic=creator-routing"
                  className="inline-flex items-center justify-center rounded-full border border-white/12 bg-white/[0.035] px-5 py-3 text-xs font-black uppercase tracking-[0.18em] text-white/58 transition hover:text-white"
                >
                  Invite creator
                </Link>
              </div>
            </div>
          ) : (
            <>
              <div className="mb-4 flex items-center justify-between gap-4 px-1 text-[11px] font-mono uppercase tracking-[0.18em] text-white/38">
                <span>{visibleCreators.length} visible creators</span>
                <span className="hidden sm:inline">Sorted for venue / brand fit</span>
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
                    { label: 'Trust', value: creator.trust?.score ?? 0, icon: ShieldCheck },
                    { label: 'Reviews', value: reviewLabel, icon: Star },
                    { label: 'Dares', value: creator.completedDares, icon: Trophy },
                    { label: 'Earned', value: formatUsd(creator.totalEarned), icon: DollarSign },
                    { label: 'Venue reach', value: creator.businessMetrics?.venueReach ?? 0, icon: MapPin },
                    { label: 'First marks', value: creator.businessMetrics?.firstMarks ?? 0, icon: CheckCircle2 },
                  ];

                  return (
                    <article
                      key={creator.tag}
                      className={`${softCardClass} group flex min-h-[360px] flex-col p-5 transition duration-300 md:hover:-translate-y-1 md:hover:rotate-[0.25deg] md:hover:border-white/16 md:hover:shadow-[0_34px_78px_rgba(0,0,0,0.5),0_1px_0_rgba(255,255,255,0.08),inset_0_1px_0_rgba(255,255,255,0.12)]`}
                    >
                      <div className="pointer-events-none absolute -bottom-8 left-8 right-8 h-16 rounded-full bg-white/[0.055] blur-2xl transition duration-300 group-hover:bg-white/[0.08]" />
                      <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/24 to-transparent" />
                      <div className="pointer-events-none absolute right-4 top-4 rounded-full border border-white/10 bg-white/[0.055] px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-white/42 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                        Fit {creatorScore(creator)}
                      </div>
                      <div className="relative flex items-start gap-4">
                        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-[22px] border border-white/14 bg-white/[0.06] shadow-[0_18px_34px_rgba(0,0,0,0.42),inset_0_1px_0_rgba(255,255,255,0.12)] transition duration-300 group-hover:-translate-y-0.5">
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
                          <p className="mt-1 text-xs font-black uppercase tracking-[0.18em] text-white/36">
                            {creator.trust?.label ?? 'Unranked'} · venue ready
                          </p>
                        </div>
                      </div>

                      <div className="relative mt-5 grid grid-cols-2 gap-3">
                        {cardMetrics.map(({ label, value, icon: Icon }) => (
                          <div key={label} className={`${insetCardClass} px-3 py-3 transition duration-300 group-hover:border-white/12`}>
                            <div className="flex items-center justify-between gap-2">
                              <div className="text-[9px] font-black uppercase tracking-[0.18em] text-white/34">
                                {label}
                              </div>
                              <Icon className="h-3.5 w-3.5 text-white/34" />
                            </div>
                            <div className="mt-1 text-lg font-black text-white">{value}</div>
                          </div>
                        ))}
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        {(creator.tags?.length ? creator.tags : ['creator']).slice(0, 4).map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full border border-white/10 bg-white/[0.035] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-white/42"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>

                      <div className="mt-auto grid gap-2 pt-5 sm:grid-cols-2">
                        <Link
                          href={buildBidHref(creator)}
                          className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/18 bg-white px-4 text-[11px] font-black uppercase tracking-[0.14em] text-black shadow-[0_13px_22px_rgba(255,255,255,0.08),inset_0_1px_0_rgba(255,255,255,0.7),inset_0_-10px_14px_rgba(0,0,0,0.12)] transition hover:bg-white/86"
                        >
                          Message / bid
                        </Link>
                        <Link
                          href={buildCreateHref(creator)}
                          className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/12 bg-white/[0.055] px-4 text-[11px] font-black uppercase tracking-[0.14em] text-white/76 shadow-[inset_0_1px_0_rgba(255,255,255,0.1),inset_0_-10px_14px_rgba(0,0,0,0.25)] transition hover:bg-white/[0.09] hover:text-white"
                        >
                          Fund direct dare
                        </Link>
                        <Link
                          href={`/creator/${plainTag}`}
                          className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/10 bg-black/24 px-4 text-[11px] font-black uppercase tracking-[0.14em] text-white/52 transition hover:text-white sm:col-span-2"
                        >
                          View profile
                          <ArrowRight className="ml-2 h-3.5 w-3.5" />
                        </Link>
                      </div>
                    </article>
                  );
                })}
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
