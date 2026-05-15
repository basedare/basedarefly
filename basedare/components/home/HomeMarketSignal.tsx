'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
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
  const [venues, setVenues] = useState<ActiveVenueCard[]>(() => cloneActiveVenueFallbacks().slice(0, 3));
  const [creators, setCreators] = useState<ReadyCreatorSignal[]>(fallbackCreators);

  useEffect(() => {
    const controller = new AbortController();
    const abortId = window.setTimeout(() => controller.abort(), 2200);
    const warmupId = window.setTimeout(() => {
      void Promise.allSettled([
        fetch('/api/venues/active', { cache: 'no-store', signal: controller.signal })
          .then((response) => response.json() as Promise<ActiveVenueResponse>)
          .then((data) => {
            if (data.success && data.data?.venues?.length) {
              setVenues(data.data.venues.slice(0, 3));
            }
          }),
        fetch('/api/creators', { cache: 'no-store', signal: controller.signal })
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
  }, []);

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
    <section id="live-market" className="w-full px-4 pb-10 md:px-6 md:pb-14">
      <div className="mx-auto w-full max-w-[1680px] overflow-hidden rounded-[1.35rem] border border-white/[0.075] bg-[linear-gradient(145deg,rgba(10,17,26,0.42),rgba(8,7,18,0.68))] px-3 py-3 shadow-[8px_12px_34px_rgba(0,0,0,0.24),inset_0_1px_0_rgba(255,255,255,0.055)] backdrop-blur-xl md:px-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-cyan-200/14 bg-cyan-300/[0.06] text-cyan-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.075)]">
              <Radio className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/45">
                  Live grid
                </p>
                <span className="rounded-full border border-emerald-200/16 bg-emerald-300/[0.07] px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-emerald-100/72">
                  {liveVenues} venues
                </span>
                <span className="rounded-full border border-[#f5c518]/18 bg-[#f5c518]/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-[#f9e27a]/80">
                  {readyCreators} creators
                </span>
              </div>
              <p className="mt-1 truncate text-xs font-bold text-white/42 md:text-sm">
                Venues, creators, and guest loops stay one tap away.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:flex sm:shrink-0">
            <Link
              href="/map?source=home-market-signal"
              prefetch={false}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-center text-[10px] font-black uppercase tracking-[0.14em] text-white/70 transition hover:border-cyan-300/28 hover:text-cyan-100"
            >
              <MapPin className="h-3.5 w-3.5" />
              Map
            </Link>
            <Link
              href="/captains?source=home-market-signal"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-[#f5c518]/24 bg-[#f5c518]/10 px-4 py-2 text-center text-[10px] font-black uppercase tracking-[0.14em] text-[#f9e27a] transition hover:border-[#f5c518]/45"
            >
              <Briefcase className="h-3.5 w-3.5" />
              Captains
            </Link>
          </div>
        </div>

        <div className="mt-3 flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {quietSignals.map((signal) => (
            <Link
              key={signal.key}
              href={signal.href}
              prefetch={false}
              className="inline-flex min-h-10 min-w-[9.5rem] items-center justify-between gap-3 rounded-full border border-white/[0.075] bg-black/24 px-3 py-2.5 transition hover:border-cyan-200/18 hover:bg-white/[0.045] md:min-w-[11rem]"
            >
              <span className="min-w-0">
                <span className="block truncate text-[11px] font-black text-white/82">{signal.label}</span>
                <span className="block truncate text-[9px] font-bold uppercase tracking-[0.13em] text-white/35">{signal.meta}</span>
              </span>
              <ArrowRight className="h-3.5 w-3.5 shrink-0 text-white/28" />
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
