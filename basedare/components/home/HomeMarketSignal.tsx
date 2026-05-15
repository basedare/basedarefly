'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Briefcase, MapPin, Radio } from 'lucide-react';

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

const fallbackCreators: ReadyCreatorSignal[] = [
  {
    key: 'founding-captains',
    name: 'Founding captains',
    area: 'Siargao / city pilots',
    availability: 'Apply now',
    metric: 'Captain intake open',
    inviteHref: '/captains?source=home-market-signal',
  },
  {
    key: 'venue-scouts',
    name: 'Venue scouts',
    area: 'Local radius',
    availability: 'Open this week',
    metric: 'Mark places first',
    inviteHref: buildCreatorMissionActivationHref({
      creator: '@venue-scout',
      source: 'home-market-signal',
      city: 'Local radius',
      skills: ['Venue scout', 'First spark', 'QR proof'],
    }),
  },
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

export default function HomeMarketSignal() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const [venues, setVenues] = useState<ActiveVenueCard[]>(() => cloneActiveVenueFallbacks().slice(0, 3));
  const [creators, setCreators] = useState<ReadyCreatorSignal[]>(fallbackCreators);
  const [shouldHydrate, setShouldHydrate] = useState(false);

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
      label: venue.name,
      meta: venue.checkInsToday > 0 ? `${venue.checkInsToday} check-ins` : venue.activityLabel,
      href: venue.primaryHref,
    })),
    ...creators.slice(0, 2).map((creator) => ({
      key: `creator-${creator.key}`,
      label: creator.name,
      meta: creator.availability,
      href: creator.inviteHref,
    })),
  ];

  return (
    <section ref={sectionRef} id="live-market" className="w-full scroll-mt-32 px-4 pb-12 md:px-6 md:pb-16">
      <div className="relative mx-auto w-full max-w-[1680px] overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(160deg,rgba(30,22,52,0.28),rgba(8,9,18,0.9))] px-4 py-7 shadow-[14px_18px_48px_rgba(0,0,0,0.34),-8px_-8px_20px_rgba(255,255,255,0.025),inset_0_1px_0_rgba(255,255,255,0.075)] backdrop-blur-xl md:px-6 md:py-9">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_0%,rgba(34,211,238,0.10),transparent_34%),radial-gradient(circle_at_88%_18%,rgba(245,197,24,0.08),transparent_32%)]" />
        <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/24 to-transparent" />

        <div className="relative flex flex-col gap-5">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-200/18 bg-cyan-300/[0.07] px-3 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-cyan-100/78">
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
              Places and people ready for proof.
            </h3>
            <p className="mt-3 max-w-2xl text-sm font-bold leading-6 text-white/48">
              Captains are vetted local creators/operators who scout venues, start proof loops, and route paid missions.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:flex sm:shrink-0">
            <Link
              href="/map?source=home-market-signal"
              prefetch={false}
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.055] px-4 py-3 text-center text-[10px] font-black uppercase tracking-[0.14em] text-white/76 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition hover:border-cyan-300/28 hover:text-cyan-100 sm:min-w-[9.5rem]"
            >
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              Open map
            </Link>
            <Link
              href="/captains?source=home-market-signal"
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full border border-[#f5c518]/28 bg-[#f5c518]/10 px-4 py-3 text-center text-[10px] font-black uppercase tracking-[0.12em] text-[#f9e27a] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_14px_24px_rgba(245,197,24,0.08)] transition hover:border-[#f5c518]/45 sm:min-w-[11.5rem]"
            >
              <Briefcase className="h-3.5 w-3.5 shrink-0" />
              Apply captain
            </Link>
          </div>
        </div>

        <div className="relative mt-6 grid gap-3 lg:grid-cols-[0.78fr_1.22fr]">
          <div className="grid grid-cols-2 gap-2 rounded-[1.35rem] border border-white/[0.075] bg-black/24 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.055)]">
            <div className="rounded-2xl border border-emerald-200/12 bg-emerald-300/[0.045] px-3 py-3">
              <span className="block text-2xl font-black text-white">{liveVenues}</span>
              <span className="block text-[9px] font-black uppercase tracking-[0.18em] text-emerald-100/62">active venues</span>
            </div>
            <div className="rounded-2xl border border-[#f5c518]/16 bg-[#f5c518]/[0.07] px-3 py-3">
              <span className="block text-2xl font-black text-white">{readyCreators}</span>
              <span className="block text-[9px] font-black uppercase tracking-[0.18em] text-[#f9e27a]/68">ready creators</span>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {quietSignals.map((signal) => (
              <Link
                key={signal.key}
                href={signal.href}
                prefetch={false}
                className="group flex min-h-[5.25rem] items-center justify-between gap-3 rounded-[1.35rem] border border-white/[0.075] bg-black/24 px-4 py-3 transition hover:border-cyan-200/18 hover:bg-white/[0.045]"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-black text-white/86">{signal.label}</span>
                  <span className="mt-1 block truncate text-[10px] font-bold uppercase tracking-[0.14em] text-white/34">{signal.meta}</span>
                </span>
                <ArrowRight className="h-4 w-4 shrink-0 text-white/28 transition group-hover:translate-x-0.5 group-hover:text-cyan-100/70" />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
