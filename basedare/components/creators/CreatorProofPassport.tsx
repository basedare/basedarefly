import Link from 'next/link';
import { ArrowRight, MapPin, ShieldCheck, Sparkles, Trophy } from 'lucide-react';

type CreatorProofPassportProps = {
  displayHandle: string;
  trust: {
    level: number;
    label: string;
    score: number;
    summary: string;
  } | null | undefined;
  stats: {
    approved: number;
    completed: number;
    totalEarned: number;
  } | null | undefined;
  businessMetrics: {
    venueReach: number;
    firstSparkRate: number;
  } | null | undefined;
  reviews: {
    count: number;
    averageRating: number | null;
  } | null | undefined;
  contribution: {
    totalMarks: number;
    firstMarks: number;
    uniqueVenues: number;
    lastMarkedAt: string | null;
    topVenue: {
      slug: string;
      name: string;
      city: string | null;
      count: number;
    } | null;
  } | null | undefined;
  inviteMissionHref: string;
};

function formatCompactNumber(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 10_000) return `${Math.round(value / 1_000)}K`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return String(Math.max(0, Math.round(value)));
}

function formatLastMove(value: string | null | undefined) {
  if (!value) return 'No movement yet';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return 'No movement yet';

  return date.toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
  });
}

export default function CreatorProofPassport({
  displayHandle,
  trust,
  stats,
  businessMetrics,
  reviews,
  contribution,
  inviteMissionHref,
}: CreatorProofPassportProps) {
  const topVenue = contribution?.topVenue ?? null;
  const rating = reviews?.averageRating ? reviews.averageRating.toFixed(1) : '--';
  const metrics = [
    {
      label: 'Approved proof',
      value: formatCompactNumber(stats?.approved ?? 0),
      detail: `${stats?.completed ?? 0} settled`,
      className: 'text-[#f9e27a]',
    },
    {
      label: 'Venue reach',
      value: formatCompactNumber(businessMetrics?.venueReach ?? contribution?.uniqueVenues ?? 0),
      detail: 'places touched',
      className: 'text-cyan-100',
    },
    {
      label: 'First sparks',
      value: formatCompactNumber(contribution?.firstMarks ?? 0),
      detail: `${businessMetrics?.firstSparkRate ?? 0}% first-mark rate`,
      className: 'text-fuchsia-100',
    },
    {
      label: 'Business rating',
      value: rating,
      detail: `${reviews?.count ?? 0} reviews`,
      className: 'text-emerald-100',
    },
  ];

  return (
    <section className="relative overflow-hidden rounded-[30px] border border-[#f5c518]/16 bg-[radial-gradient(circle_at_12%_0%,rgba(245,197,24,0.14),transparent_34%),radial-gradient(circle_at_92%_18%,rgba(34,211,238,0.1),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.07),rgba(8,8,16,0.94)_58%,rgba(5,5,10,0.98))] p-5 shadow-[0_24px_70px_rgba(0,0,0,0.34),inset_0_1px_0_rgba(255,255,255,0.11),inset_0_-18px_24px_rgba(0,0,0,0.26)] sm:p-6">
      <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-[#f8dd72]/36 to-transparent" />
      <div className="relative grid gap-5 lg:grid-cols-[0.9fr_1.1fr] lg:items-stretch">
        <div className="flex flex-col justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#f5c518]/25 bg-[#f5c518]/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.24em] text-[#f8dd72]">
              <ShieldCheck className="h-4 w-4" />
              Verified record
            </div>
            <h2 className="mt-4 text-2xl font-black tracking-[-0.04em] text-white sm:text-3xl">
              Verified action history.
            </h2>
            <p className="mt-2 text-sm font-bold leading-6 text-white/58">
              {displayHandle} is ranked by proof, places, and completed action - not follower count.
            </p>
          </div>

          <div className="rounded-[22px] border border-white/10 bg-black/28 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),inset_0_-12px_18px_rgba(0,0,0,0.22)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/38">Trust level</p>
                <p className="mt-1 text-3xl font-black text-white">
                  {trust?.label ?? 'Fresh'} <span className="text-[#f8dd72]">L{trust?.level ?? 0}</span>
                </p>
              </div>
              <div className="rounded-full border border-cyan-300/18 bg-cyan-400/[0.08] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-cyan-100">
                {trust?.score ?? 0}/100
              </div>
            </div>
            <p className="mt-3 text-sm leading-6 text-white/54">{trust?.summary ?? 'Your first verified proof starts this record.'}</p>
          </div>
        </div>

        <div className="grid gap-3">
          <div className="grid gap-3 sm:grid-cols-2">
            {metrics.map((metric) => (
              <div
                key={metric.label}
                className="rounded-[22px] border border-white/10 bg-white/[0.04] px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),inset_0_-10px_16px_rgba(0,0,0,0.2)]"
              >
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/34">{metric.label}</p>
                <p className={`mt-2 text-2xl font-black ${metric.className}`}>{metric.value}</p>
                <p className="mt-1 text-[11px] font-bold text-white/44">{metric.detail}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <Link
              href={topVenue ? `/map?place=${encodeURIComponent(topVenue.slug)}&source=creator-passport` : '/map?source=creator-passport'}
              className="group rounded-[22px] border border-cyan-300/14 bg-cyan-400/[0.06] px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition hover:border-cyan-200/30"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-cyan-100/72">
                  <MapPin className="h-4 w-4" />
                  Strongest venue
                </span>
                <ArrowRight className="h-4 w-4 text-white/36 transition group-hover:translate-x-1 group-hover:text-white/70" />
              </div>
              <p className="mt-2 text-lg font-black text-white">{topVenue?.name ?? 'Venue slot open'}</p>
              <p className="mt-1 text-xs font-bold text-white/46">
                {topVenue
                  ? `${topVenue.count} verified ${topVenue.count === 1 ? 'mark' : 'marks'}${topVenue.city ? ` in ${topVenue.city}` : ''}`
                  : 'Launch a venue dare to start the trail.'}
              </p>
            </Link>

            <div className="grid min-w-[12rem] gap-3">
              <div className="rounded-[20px] border border-white/10 bg-black/22 px-4 py-3">
                <p className="text-[9px] font-black uppercase tracking-[0.18em] text-white/34">Last move</p>
                <p className="mt-1 text-sm font-black text-white">{formatLastMove(contribution?.lastMarkedAt)}</p>
              </div>
              <div className="rounded-[20px] border border-white/10 bg-black/22 px-4 py-3">
                <p className="text-[9px] font-black uppercase tracking-[0.18em] text-white/34">Earned</p>
                <p className="mt-1 text-sm font-black text-emerald-100">${formatCompactNumber(stats?.totalEarned ?? 0)}</p>
              </div>
            </div>
          </div>

          <Link
            href={inviteMissionHref}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-[#f5c518]/28 bg-[linear-gradient(180deg,rgba(255,225,87,0.26)_0%,rgba(122,73,0,0.24)_100%)] px-5 text-xs font-black uppercase tracking-[0.16em] text-[#f8dd72] shadow-[0_16px_28px_rgba(0,0,0,0.24),inset_0_1px_0_rgba(255,255,255,0.12),inset_0_-5px_0_rgba(0,0,0,0.2)] transition hover:-translate-y-[1px] hover:border-[#f8dd72]/46"
          >
            <Trophy className="h-4 w-4" />
            Route a paid dare
            <Sparkles className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
