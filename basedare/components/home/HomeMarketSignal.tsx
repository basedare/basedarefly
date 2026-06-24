'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Briefcase, MapPin, Radio, Users } from 'lucide-react';

import { cloneActiveVenueFallbacks, type ActiveVenueCard } from '@/lib/home-active-venues';
import { buildCreatorMissionActivationHref } from '@/lib/mission-routing';

type CreatorFromApi = {
  tag: string;
  completedDares: number;
  tags?: string[];
  stats?: {
    approved: number;
    live: number;
    acceptRate: number;
  };
  businessMetrics?: {
    venueReach: number;
    firstMarks: number;
  };
  trust?: {
    score: number;
  };
};

type ReadyCreatorSignal = {
  key: string;
  name: string;
  area: string;
  availability: string;
  metric: string;
  inviteHref: string;
};

type ActiveVenueResponse = {
  success: boolean;
  data?: {
    venues?: ActiveVenueCard[];
  };
};

type CreatorsResponse = {
  success: boolean;
  data?: CreatorFromApi[];
};

// Placeholder creators shown before the live /api/creators data hydrates.
// Kept strictly to the CREATOR role — captains live in the hero CTA, and scouts
// aren't a self-serve role yet — so the chips never mislabel a role.
const fallbackCreators: ReadyCreatorSignal[] = [
  {
    key: 'proof-creators',
    name: 'Proof creators',
    area: 'Area shared after invite',
    availability: 'Mission-ready',
    metric: 'Proof, receipt, recap',
    inviteHref: buildCreatorMissionActivationHref({
      creator: '@proof-creator',
      source: 'home-market-signal',
      city: 'Area shared after invite',
      skills: ['UGC', 'Fast clips', 'Check-ins'],
    }),
  },
  {
    key: 'recap-creators',
    name: 'Recap creators',
    area: 'Siargao / city pilots',
    availability: 'Available tonight',
    metric: 'Clips + venue recaps',
    inviteHref: buildCreatorMissionActivationHref({
      creator: '@recap-creator',
      source: 'home-market-signal',
      city: 'Siargao / city pilots',
      skills: ['Recap', 'Fast clips', 'Proof'],
    }),
  },
  {
    key: 'first-spark-creators',
    name: 'First-spark creators',
    area: 'Local radius',
    availability: 'Open this week',
    metric: 'Activate a new venue',
    inviteHref: buildCreatorMissionActivationHref({
      creator: '@first-spark',
      source: 'home-market-signal',
      city: 'Local radius',
      skills: ['First spark', 'Check-ins', 'Proof'],
    }),
  },
];

function normalizeTag(tag: string) {
  return tag.startsWith('@') ? tag : `@${tag}`;
}

function getAreaLabel(creator: CreatorFromApi) {
  const tags = creator.tags?.map((tag) => tag.toLowerCase()) ?? [];
  const area = tags.find((tag) =>
    ['siargao', 'general luna', 'catangnan', 'sydney', 'bondi', 'manila', 'bali'].some((known) => tag.includes(known))
  );

  if (area) return area.replace(/\b\w/g, (letter) => letter.toUpperCase());
  if ((creator.businessMetrics?.venueReach ?? 0) > 0) return 'Venue circuit';
  return 'Area shared after invite';
}

function getSkills(creator: CreatorFromApi) {
  const tags = creator.tags?.map((tag) => tag.toLowerCase()) ?? [];
  const skills = new Set<string>();

  tags.forEach((tag) => {
    if (tag.includes('food') || tag.includes('cafe') || tag.includes('coffee')) skills.add('Food');
    if (tag.includes('beach') || tag.includes('surf')) skills.add('Beach');
    if (tag.includes('night') || tag.includes('bar')) skills.add('Nightlife');
    if (tag.includes('event')) skills.add('Events');
  });

  if ((creator.businessMetrics?.venueReach ?? 0) > 0) skills.add('Venue scout');
  if ((creator.businessMetrics?.firstMarks ?? 0) > 0) skills.add('First spark');
  if ((creator.stats?.acceptRate ?? 0) >= 70) skills.add('Reliable');
  skills.add('Proof');

  return Array.from(skills).slice(0, 3);
}

function mapCreators(creators: CreatorFromApi[]) {
  return [...creators]
    .sort((left, right) => {
      const liveDelta = (right.stats?.live ?? 0) - (left.stats?.live ?? 0);
      if (liveDelta !== 0) return liveDelta;
      const venueDelta = (right.businessMetrics?.venueReach ?? 0) - (left.businessMetrics?.venueReach ?? 0);
      if (venueDelta !== 0) return venueDelta;
      return (right.trust?.score ?? 0) - (left.trust?.score ?? 0);
    })
    .slice(0, 3)
    .map((creator): ReadyCreatorSignal => {
      const tag = normalizeTag(creator.tag);
      const liveCount = creator.stats?.live ?? 0;
      const approved = creator.stats?.approved ?? creator.completedDares;
      const area = getAreaLabel(creator);

      return {
        key: tag,
        name: tag,
        area,
        availability: liveCount > 0 ? 'Ready now' : approved > 0 ? 'Available tonight' : 'Open this week',
        metric:
          (creator.businessMetrics?.venueReach ?? 0) > 0
            ? `${creator.businessMetrics?.venueReach ?? 0} venues marked`
            : `${approved} proofs accepted`,
        inviteHref: buildCreatorMissionActivationHref({
          creator: tag,
          source: 'home-market-signal',
          city: area,
          skills: getSkills(creator),
        }),
      };
    });
}

type HomeMarketSignalProps = {
  variant?: 'standalone' | 'embedded';
};

export default function HomeMarketSignal({ variant = 'standalone' }: HomeMarketSignalProps) {
  const sectionRef = useRef<HTMLElement | null>(null);
  const [venues, setVenues] = useState<ActiveVenueCard[]>(() => cloneActiveVenueFallbacks().slice(0, 3));
  const [creators, setCreators] = useState<ReadyCreatorSignal[]>(fallbackCreators);
  const [shouldHydrate, setShouldHydrate] = useState(false);
  const isEmbedded = variant === 'embedded';

  useEffect(() => {
    const section = sectionRef.current;
    if (!section || shouldHydrate) return undefined;

    if (typeof window.IntersectionObserver === 'undefined') {
      const timeoutId = window.setTimeout(() => setShouldHydrate(true), 1200);
      return () => window.clearTimeout(timeoutId);
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        setShouldHydrate(true);
        observer.disconnect();
      },
      { rootMargin: '480px 0px' }
    );

    observer.observe(section);
    return () => observer.disconnect();
  }, [shouldHydrate]);

  useEffect(() => {
    if (!shouldHydrate) return undefined;

    const controller = new AbortController();
    const abortId = window.setTimeout(() => controller.abort(), 2200);
    const warmupId = window.setTimeout(() => {
      void Promise.allSettled([
        fetch('/api/venues/active', { signal: controller.signal })
          .then((response) => response.json() as Promise<ActiveVenueResponse>)
          .then((data) => {
            if (data.success && data.data?.venues?.length) {
              setVenues(data.data.venues.slice(0, 3));
            }
          }),
        fetch('/api/creators', { signal: controller.signal })
          .then((response) => response.json() as Promise<CreatorsResponse>)
          .then((data) => {
            if (data.success && data.data?.length) {
              setCreators(mapCreators(data.data));
            }
          }),
      ]).finally(() => window.clearTimeout(abortId));
    }, 1500);

    return () => {
      window.clearTimeout(warmupId);
      window.clearTimeout(abortId);
      controller.abort();
    };
  }, [shouldHydrate]);

  const liveVenues = venues.filter((venue) => venue.checkInsToday > 0 || venue.proofCount > 0).length || venues.length;
  const readyCreators = creators.length;
  const quietSignals = [
    ...venues.slice(0, 2).map((venue) => ({
      key: `venue-${venue.slug}`,
      kind: 'venue' as const,
      label: venue.name,
      meta: venue.checkInsToday > 0 ? `${venue.checkInsToday} check-ins` : venue.activityLabel,
      href: venue.primaryHref,
    })),
    ...creators.slice(0, 2).map((creator) => ({
      key: `creator-${creator.key}`,
      kind: 'creator' as const,
      label: creator.name,
      meta: creator.availability,
      href: creator.inviteHref,
    })),
  ];

  return (
    <section
      ref={sectionRef}
      id="live-market"
      className={
        isEmbedded
          ? 'w-full scroll-mt-32 pt-6'
          : 'w-full scroll-mt-32 px-4 pb-12 md:px-6 md:pb-16'
      }
    >
      <div
        className={
          isEmbedded
            ? 'relative w-full overflow-hidden rounded-[1.75rem] border border-white/10 bg-[linear-gradient(156deg,rgba(16,30,38,0.46),rgba(30,20,18,0.34)_52%,rgba(7,8,16,0.93))] px-4 py-6 shadow-[12px_18px_46px_rgba(0,0,0,0.35),-7px_-7px_20px_rgba(255,255,255,0.028),inset_0_1px_0_rgba(255,255,255,0.09),inset_0_-22px_34px_rgba(0,0,0,0.24)] backdrop-blur-xl md:px-6 md:py-7'
            : 'relative mx-auto w-full max-w-[1680px] overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(160deg,rgba(30,22,52,0.28),rgba(8,9,18,0.9))] px-4 py-7 shadow-[14px_18px_48px_rgba(0,0,0,0.34),-8px_-8px_20px_rgba(255,255,255,0.025),inset_0_1px_0_rgba(255,255,255,0.075)] backdrop-blur-xl md:px-6 md:py-9'
        }
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_0%,rgba(34,211,238,0.12),transparent_34%),radial-gradient(circle_at_88%_18%,rgba(245,197,24,0.09),transparent_32%)]" />
        <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/24 to-transparent" />
        {isEmbedded ? (
          <div className="pointer-events-none absolute inset-x-8 -top-px h-16 bg-[linear-gradient(180deg,rgba(184,127,255,0.12),rgba(184,127,255,0))]" />
        ) : null}

        <div className="relative flex flex-col gap-5">
          <div className="mx-auto max-w-5xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-200/18 bg-cyan-300/[0.07] px-3 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-cyan-100/78 shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_10px_20px_rgba(0,0,0,0.2)]">
              <Radio className="h-3.5 w-3.5" />
              Live grid
            </div>
            <h3
              className="active-bounties-neon mt-4 text-2xl font-black uppercase italic leading-tight tracking-tight text-white md:text-4xl"
              style={{
                textShadow:
                  "0 0 16px rgba(34,211,238,0.22), 0 0 28px rgba(245,197,24,0.10)",
              }}
            >
              Venues ready to turn bounties into proof.
            </h3>
            <p className="mx-auto mt-3 max-w-3xl text-sm font-bold leading-6 text-white/48">
              Open venues turn bounties into receipts — check-ins, missions, and proof. Hosts are the
              operators who run them.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:flex sm:shrink-0">
            <Link
              href="/map?source=home-market-signal"
              prefetch={false}
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(12,14,24,0.72))] px-4 py-3 text-center text-[10px] font-black uppercase tracking-[0.14em] text-white/76 shadow-[0_14px_26px_rgba(0,0,0,0.24),inset_0_1px_0_rgba(255,255,255,0.11),inset_0_-10px_16px_rgba(0,0,0,0.18)] transition hover:border-cyan-300/28 hover:text-cyan-100 sm:min-w-[10.5rem]"
            >
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              Open venue map
            </Link>
            <Link
              href="/hosts?source=home-market-signal"
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full border border-[#f5c518]/28 bg-[linear-gradient(180deg,rgba(245,197,24,0.18),rgba(245,197,24,0.07))] px-4 py-3 text-center text-[10px] font-black uppercase tracking-[0.12em] text-[#f9e27a] shadow-[0_14px_24px_rgba(245,197,24,0.08),inset_0_1px_0_rgba(255,255,255,0.11),inset_0_-10px_16px_rgba(0,0,0,0.2)] transition hover:border-[#f5c518]/45 sm:min-w-[11.5rem]"
            >
              <Briefcase className="h-3.5 w-3.5 shrink-0" />
              Become a host
            </Link>
          </div>
        </div>

        <div className="relative mt-6 grid gap-3 lg:grid-cols-[0.78fr_1.22fr]">
          <div className="grid grid-cols-2 gap-2 rounded-[1.35rem] border border-white/[0.075] bg-black/24 p-3 shadow-[inset_6px_6px_14px_rgba(0,0,0,0.36),inset_-3px_-3px_8px_rgba(255,255,255,0.025),inset_0_1px_0_rgba(255,255,255,0.055)]">
            <div className="rounded-2xl border border-emerald-200/12 bg-[linear-gradient(160deg,rgba(52,211,153,0.08),rgba(4,9,12,0.62))] px-3 py-3 shadow-[0_10px_22px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.06)]">
              <span className="block text-2xl font-black text-white">{liveVenues}</span>
              <span className="block text-[9px] font-black uppercase tracking-[0.18em] text-emerald-100/62">active venues</span>
            </div>
            <div className="rounded-2xl border border-[#f5c518]/16 bg-[linear-gradient(160deg,rgba(245,197,24,0.11),rgba(16,12,5,0.7))] px-3 py-3 shadow-[0_10px_22px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.06)]">
              <span className="block text-2xl font-black text-white">{readyCreators}</span>
              <span className="block text-[9px] font-black uppercase tracking-[0.18em] text-[#f9e27a]/68">ready creators</span>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {quietSignals.map((signal) => {
              const isVenue = signal.kind === 'venue';
              const Icon = isVenue ? MapPin : Users;
              return (
                <Link
                  key={signal.key}
                  href={signal.href}
                  prefetch={false}
                  className={`group flex min-h-[5.25rem] items-center gap-3 rounded-[1.35rem] border border-white/[0.075] bg-[linear-gradient(160deg,rgba(255,255,255,0.035),rgba(3,4,10,0.5))] px-3.5 py-3 shadow-[0_10px_24px_rgba(0,0,0,0.22),inset_0_1px_0_rgba(255,255,255,0.055),inset_0_-12px_16px_rgba(0,0,0,0.16)] transition hover:bg-white/[0.045] ${
                    isVenue ? 'hover:border-cyan-200/22' : 'hover:border-[#f5c518]/22'
                  }`}
                >
                  <span
                    className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl border ${
                      isVenue
                        ? 'border-cyan-200/18 bg-cyan-300/[0.08] text-cyan-200/80'
                        : 'border-[#f5c518]/20 bg-[#f5c518]/[0.09] text-[#f9e27a]'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-black text-white/86">{signal.label}</span>
                    <span
                      className={`mt-1 block truncate text-[10px] font-bold uppercase tracking-[0.14em] ${
                        isVenue ? 'text-cyan-100/40' : 'text-[#f9e27a]/45'
                      }`}
                    >
                      {isVenue ? 'Venue' : 'Creator'} · {signal.meta}
                    </span>
                  </span>
                  <ArrowRight
                    className={`h-4 w-4 shrink-0 text-white/28 transition group-hover:translate-x-0.5 ${
                      isVenue ? 'group-hover:text-cyan-100/70' : 'group-hover:text-[#f9e27a]'
                    }`}
                  />
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
