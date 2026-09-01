'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { ArrowRight, Loader2, MapPin, Radio, Search, Users } from 'lucide-react';
import PremiumDareCard, { PremiumDareCardStatus, SentinelSkeleton } from './PremiumDareCard';
import CommunityActivityCard from '@/components/community/CommunityActivityCard';
import { getLocalPostMapHref, type LocalPostType } from '@/lib/community-around-policy';
import { useGeolocation } from '@/hooks/useGeolocation';
import { cloneActiveVenueFallbacks } from '@/lib/home-active-venues';
import { triggerHaptic } from '@/lib/mobile-haptics';
import './PremiumBentoGrid.css';

const FILTERS = [
  { key: 'ALL', label: 'ALL' },
  { key: 'OPEN BOUNTIES', label: 'IRL' },
  { key: 'STREAMERS', label: 'ONLINE' },
  { key: 'NEARBY', label: 'NEARBY' },
  { key: 'VENUES', label: 'VENUES' },
  { key: 'EXPIRED', label: 'PAST' },
] as const;
type Filter = (typeof FILTERS)[number]['key'];
type MobileFilter = 'ALL' | 'PLAY' | 'MEET' | 'LOCAL';

const MOBILE_FILTERS: { key: MobileFilter; label: string }[] = [
  { key: 'ALL', label: 'ALL' },
  { key: 'PLAY', label: 'PLAY' },
  { key: 'MEET', label: 'MEET' },
  { key: 'LOCAL', label: 'LOCAL' },
];

interface NearbyDare {
  id: string;
  shortId: string | null;
  title: string;
  bounty: number;
  status: string;
  locationLabel: string | null;
  distanceKm: number;
  distanceDisplay: string;
  expiresAt: string | null;
  streamerHandle: string | null;
  isOpenBounty: boolean;
  requireSentinel?: boolean;
  sentinelVerified?: boolean;
}

type Dare = {
  id: string;
  description: string;
  stake_amount: number;
  streamer_name?: string;
  status?: string;
  image_url?: string;
  video_url?: string;
  expires_at?: string | null;
  short_id?: string;
  require_sentinel?: boolean;
  sentinel_verified?: boolean;
  mission_tag?: string | null;
  is_community_spark?: boolean;
  location_label?: string | null;
  venue_id?: string | null;
};

type MeetupActivity = {
  id: string;
  title: string;
  type: string;
  placeLabel: string;
  startTime: string;
  note: string | null;
  creator: { tag: string; pfpUrl: string | null } | null;
};

type LocalActivity = {
  id: string;
  title: string;
  postType: LocalPostType;
  category: string;
  venueSlug: string;
  venueName: string;
  city: string;
  notes: string;
  sourceUrl: string;
  startsAt: string | null;
  submittedBy: string;
};

type PremiumBentoGridProps = {
  dares: Dare[];
};

const DARE_EMOJIS: Record<string, string> = {
  reaper: '🌶️',
  pepper: '🌶️',
  spicy: '🌶️',
  hot: '🌶️',
  skydiving: '🪂',
  skydive: '🪂',
  jump: '🪂',
  call: '💔',
  ex: '💔',
  phone: '💔',
  coke: '🥤',
  soda: '🥤',
  drink: '🥤',
  burger: '🍔',
  cheeseburger: '🍔',
  eat: '🍔',
  food: '🍔',
  dance: '🎯',
  read: '🎯',
  mail: '🎯',
  shave: '💈',
  head: '💈',
  tattoo: '🎨',
};

function getDareEmoji(description: string): string {
  const normalized = description.toLowerCase();
  for (const [keyword, emoji] of Object.entries(DARE_EMOJIS)) {
    if (normalized.includes(keyword)) return emoji;
  }
  return '⚡';
}

function normalizeStatus(status?: string): PremiumDareCardStatus {
  if (!status) return 'live';
  const s = status.toLowerCase();
  if (s === 'restricted') return 'restricted';
  if (s === 'open') return 'open';
  if (s === 'verified') return 'completed';
  if (s === 'pending') return 'pending_verification';
  if (s === 'expired' || s === 'failed' || s === 'completed') return 'expired';
  return 'live';
}

function calculateTimeRemaining(expiresAt: string | null | undefined, nowMs: number): { display: string; secondsLeft: number } {
  if (!expiresAt) return { display: '24h left', secondsLeft: 86400 };

  const expiry = new Date(expiresAt).getTime();
  const diff = expiry - nowMs;

  if (diff <= 0) return { display: 'EXPIRED', secondsLeft: 0 };

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 0) {
    return { display: `${hours}h ${minutes}m left`, secondsLeft: Math.floor(diff / 1000) };
  } else if (minutes > 0) {
    return { display: `${minutes}m left`, secondsLeft: Math.floor(diff / 1000) };
  } else {
    return { display: 'Ending soon', secondsLeft: Math.floor(diff / 1000) };
  }
}

export default function PremiumBentoGrid({ dares }: PremiumBentoGridProps) {
  const [filter, setFilter] = useState<Filter>('ALL');
  const [mobileFilter, setMobileFilter] = useState<MobileFilter>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [meetups, setMeetups] = useState<MeetupActivity[]>([]);
  const [localActivities, setLocalActivities] = useState<LocalActivity[]>([]);
  const [communityLoading, setCommunityLoading] = useState(true);

  // Nearby dares state
  const [nearbyDares, setNearbyDares] = useState<NearbyDare[]>([]);
  const [nearbyLoading, setNearbyLoading] = useState(false);
  const [nearbyError, setNearbyError] = useState<string | null>(null);
  const { coordinates, loading: geoLoading, error: geoError, requestLocation } = useGeolocation();
  const venueDiscoveryLinks = useMemo(() => cloneActiveVenueFallbacks().slice(0, 3), []);

  useEffect(() => {
    const intervalId = window.setInterval(() => setNowMs(Date.now()), 60_000);
    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void Promise.all([
      fetch('/api/meetups', { signal: controller.signal, cache: 'no-store' }),
      fetch('/api/local-signals?limit=8', { signal: controller.signal }),
    ])
      .then(async ([meetupResponse, localResponse]) => {
        const [meetupPayload, localPayload] = await Promise.all([
          meetupResponse.json(),
          localResponse.json(),
        ]);
        if (meetupResponse.ok && meetupPayload?.success && Array.isArray(meetupPayload.data)) {
          setMeetups(meetupPayload.data);
        }
        if (localResponse.ok && localPayload?.success && Array.isArray(localPayload.data?.signals)) {
          setLocalActivities(localPayload.data.signals);
        }
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        console.error('[LIVE_AROUND] Community activity failed:', error);
      })
      .finally(() => {
        if (!controller.signal.aborted) setCommunityLoading(false);
      });
    return () => controller.abort();
  }, []);

  // Fetch nearby dares when we have coordinates and NEARBY filter is active
  const fetchNearbyDares = useCallback(async (lat: number, lng: number) => {
    setNearbyLoading(true);
    setNearbyError(null);
    try {
      const response = await fetch(`/api/dares/nearby?lat=${lat}&lng=${lng}&radius=25`);
      const data = await response.json();
      if (data.success) {
        setNearbyDares(data.data.dares);
      } else {
        setNearbyError(data.error || 'Failed to fetch nearby dares');
      }
    } catch {
      setNearbyError('Failed to fetch nearby dares');
    } finally {
      setNearbyLoading(false);
    }
  }, []);

  // Auto-fetch nearby dares when coordinates are available and NEARBY filter is selected
  useEffect(() => {
    if (filter === 'NEARBY' && coordinates) {
      fetchNearbyDares(coordinates.lat, coordinates.lng);
    }
  }, [filter, coordinates, fetchNearbyDares]);

  // Request location when NEARBY filter is selected
  useEffect(() => {
    if (filter === 'NEARBY' && !coordinates && !geoLoading && !geoError) {
      requestLocation();
    }
  }, [filter, coordinates, geoLoading, geoError, requestLocation]);

  type Card = {
      id: string;
      shortId: string;
      dare: string;
      bounty: number;
      streamer: string;
      streamerImage?: string;
      emoji: string;
      status: PremiumDareCardStatus;
      timeRemaining?: string;
      expiresAt?: string | null;
      isOpenBounty: boolean;
      isNearby?: boolean;
      distanceKm?: number;
      distanceDisplay?: string;
      locationLabel?: string | null;
      requireSentinel?: boolean;
      sentinelVerified?: boolean;
      isCommunitySpark?: boolean;
  };

  const cards = useMemo<Card[]>(() => {
    // Real dares from the database only — no hardcoded streamer/prank targets.
    const mapped = dares.map((d) => {
      const normalizedStatus = normalizeStatus(d.status);

      const streamerName = d.streamer_name || '';
      const streamerImage = d.image_url || undefined;

      // Calculate real time remaining from expiresAt
      const timeInfo = calculateTimeRemaining(d.expires_at, nowMs);
      const isExpired = timeInfo.secondsLeft <= 0;

      // Check if this is an open bounty (no streamer, @open, or @everyone)
      const isOpenTarget = !streamerName.trim() ||
        streamerName.toLowerCase() === '@open' ||
        streamerName.toLowerCase() === 'open' ||
        streamerName.toLowerCase() === '@everyone' ||
        streamerName.toLowerCase() === 'everyone';

      // Override status to expired if time ran out
      let status: PremiumDareCardStatus =
        normalizedStatus === 'live' && isOpenTarget ? 'open' : normalizedStatus;

      if (isExpired && status === 'live') {
        status = 'expired';
      }

      return {
        id: d.id,
        shortId: d.short_id || d.id.slice(0, 8),
        dare: d.description,
        bounty: d.stake_amount,
        streamer: streamerName,
        streamerImage,
        emoji: getDareEmoji(d.description),
        status,
        timeRemaining: status === 'live' || status === 'open' ? timeInfo.display : (isExpired ? 'EXPIRED' : undefined),
        expiresAt: d.expires_at,
        isOpenBounty: isOpenTarget || status === 'open',
        requireSentinel: d.require_sentinel ?? false,
        sentinelVerified: d.sentinel_verified ?? false,
        isCommunitySpark: d.is_community_spark ?? (d.stake_amount <= 0 && d.mission_tag === 'community'),
        locationLabel: d.location_label,
      };
    });

    return mapped;
  }, [dares, nowMs]);

  // Convert nearby dares to Card format
  const nearbyCards = useMemo<Card[]>(() => {
    return nearbyDares.map((d) => ({
      id: d.id,
      shortId: d.shortId || d.id.slice(0, 8),
      dare: d.title,
      bounty: d.bounty,
      streamer: d.streamerHandle || 'NEARBY',
      emoji: '📍',
      status: d.isOpenBounty ? 'open' as const : 'live' as const,
      timeRemaining: d.distanceDisplay,
      expiresAt: d.expiresAt,
      isOpenBounty: d.isOpenBounty,
      isNearby: true,
      distanceKm: d.distanceKm,
      distanceDisplay: d.distanceDisplay,
      locationLabel: d.locationLabel,
      requireSentinel: d.requireSentinel ?? false,
      sentinelVerified: d.sentinelVerified ?? false,
      isCommunitySpark: false,
    }));
  }, [nearbyDares]);

  const filteredCards = useMemo(() => {
    // For NEARBY filter, return nearby cards
    if (filter === 'NEARBY') {
      const q = searchQuery.trim().toLowerCase();
      if (q.length === 0) return nearbyCards;
      return nearbyCards.filter((card) =>
        card.dare.toLowerCase().includes(q) ||
        (card.locationLabel?.toLowerCase().includes(q) ?? false)
      );
    }

    const q = searchQuery.trim().toLowerCase();
    return cards.filter((card) => {
      const matchesSearch =
        q.length === 0 ||
        card.dare.toLowerCase().includes(q) ||
        (card.streamer ? card.streamer.toLowerCase().includes(q) : false);

      if (!matchesSearch) return false;

      // Check if card is expired
      const isExpired = card.status === 'expired';

      // EXPIRED filter: only show expired cards
      if (filter === 'EXPIRED') return isExpired;

      // All other filters: EXCLUDE expired cards by default
      if (isExpired) return false;

      if (filter === 'VENUES') return card.isOpenBounty || card.isNearby || Boolean(card.locationLabel);

      // Genesis / restricted inventory is hidden from the home-page rail for now.
      if (card.status === 'restricted') return false;

      if (filter === 'ALL') return true;
      if (filter === 'STREAMERS') return Boolean(card.streamer && card.streamer.trim().length > 0);
      if (filter === 'OPEN BOUNTIES') return card.status === 'open';
      return true;
    });
  }, [cards, nearbyCards, filter, searchQuery]);

  const mobileDareCards = useMemo(
    () => cards.filter((card) => card.status !== 'expired' && card.status !== 'restricted').slice(0, 8),
    [cards]
  );
  const showMobileDares = mobileFilter === 'ALL' || mobileFilter === 'PLAY';
  const showMobileMeetups = mobileFilter === 'ALL' || mobileFilter === 'MEET';
  const showMobileLocal = mobileFilter === 'ALL' || mobileFilter === 'LOCAL';
  const mobileRailRef = useRef<HTMLDivElement | null>(null);
  const mobileRailSettleTimerRef = useRef<number | null>(null);
  const mobileRailInteractingRef = useRef(false);
  const mobileRailSettledIndexRef = useRef(0);
  const [mobileRailIndex, setMobileRailIndex] = useState(0);
  const [mobileRailCount, setMobileRailCount] = useState(0);
  const [mobileRailHasNext, setMobileRailHasNext] = useState(false);

  const measureMobileRail = useCallback(() => {
    const rail = mobileRailRef.current;
    if (!rail) return { index: 0, count: 0, hasNext: false };

    const cards = Array.from(rail.children) as HTMLElement[];
    const count = cards.length;
    const center = rail.scrollLeft + rail.clientWidth / 2;
    let index = 0;
    let closestDistance = Number.POSITIVE_INFINITY;

    cards.forEach((card, cardIndex) => {
      const cardCenter = card.offsetLeft + card.clientWidth / 2;
      const distance = Math.abs(cardCenter - center);
      if (distance < closestDistance) {
        closestDistance = distance;
        index = cardIndex;
      }
    });

    return {
      index,
      count,
      hasNext: count > 1 && rail.scrollLeft < rail.scrollWidth - rail.clientWidth - 8,
    };
  }, []);

  const syncMobileRail = useCallback((settled: boolean) => {
    const next = measureMobileRail();
    setMobileRailCount(next.count);
    setMobileRailHasNext(next.hasNext);

    if (!settled) return;

    setMobileRailIndex(next.index);
    if (
      mobileRailInteractingRef.current &&
      next.index !== mobileRailSettledIndexRef.current
    ) {
      triggerHaptic('selection');
    }
    mobileRailSettledIndexRef.current = next.index;
    mobileRailInteractingRef.current = false;
  }, [measureMobileRail]);

  const handleMobileRailScroll = useCallback(() => {
    syncMobileRail(false);
    if (mobileRailSettleTimerRef.current) {
      window.clearTimeout(mobileRailSettleTimerRef.current);
    }
    mobileRailSettleTimerRef.current = window.setTimeout(() => {
      syncMobileRail(true);
    }, 120);
  }, [syncMobileRail]);

  const showNextMobileCard = useCallback(() => {
    const rail = mobileRailRef.current;
    if (!rail) return;
    const cards = Array.from(rail.children) as HTMLElement[];
    const nextIndex = Math.min(mobileRailSettledIndexRef.current + 1, cards.length - 1);
    const nextCard = cards[nextIndex];
    if (!nextCard || nextIndex === mobileRailSettledIndexRef.current) return;

    mobileRailInteractingRef.current = false;
    mobileRailSettledIndexRef.current = nextIndex;
    setMobileRailIndex(nextIndex);
    triggerHaptic('selection');
    rail.scrollTo({ left: nextCard.offsetLeft, behavior: 'smooth' });
  }, []);

  useEffect(() => {
    const rail = mobileRailRef.current;
    if (!rail) return;

    rail.scrollTo({ left: 0, behavior: 'instant' as ScrollBehavior });
    mobileRailSettledIndexRef.current = 0;
    setMobileRailIndex(0);

    const frame = window.requestAnimationFrame(() => syncMobileRail(true));
    const resizeObserver = new ResizeObserver(() => syncMobileRail(false));
    resizeObserver.observe(rail);

    return () => {
      window.cancelAnimationFrame(frame);
      resizeObserver.disconnect();
    };
  }, [mobileFilter, mobileDareCards.length, meetups.length, localActivities.length, communityLoading, syncMobileRail]);

  useEffect(() => {
    return () => {
      if (mobileRailSettleTimerRef.current) {
        window.clearTimeout(mobileRailSettleTimerRef.current);
      }
    };
  }, []);

  return (
    <div className="w-full flex flex-col items-center">
      <section className="live-around-mobile w-full" aria-label="Live Around You">
        <div className="live-around-mobile__filters" role="group" aria-label="Filter nearby activity">
          {MOBILE_FILTERS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => {
                if (mobileFilter === tab.key) return;
                triggerHaptic('selection');
                setMobileFilter(tab.key);
              }}
              className={`live-around-mobile__filter ${mobileFilter === tab.key ? 'live-around-mobile__filter--active' : ''}`}
              aria-pressed={mobileFilter === tab.key}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="live-around-mobile__rail-shell" data-has-next={mobileRailHasNext ? 'true' : 'false'}>
          <div
            ref={mobileRailRef}
            className="live-around-mobile__rail"
            aria-live="polite"
            onPointerDown={() => {
              mobileRailInteractingRef.current = true;
            }}
            onScroll={handleMobileRailScroll}
          >
          {communityLoading && mobileFilter !== 'PLAY'
            ? Array.from({ length: 2 }).map((_, index) => <SentinelSkeleton key={`community-${index}`} />)
            : null}
          {showMobileDares
            ? mobileDareCards.map((card) => (
                <PremiumDareCard
                  key={`mobile-dare-${card.id}`}
                  shortId={card.shortId}
                  dare={card.dare}
                  bounty={card.bounty}
                  streamer={card.streamer}
                  streamerImage={card.streamerImage}
                  emoji={card.emoji}
                  status={card.status}
                  timeRemaining={card.timeRemaining}
                  expiresAt={card.expiresAt}
                  isOpenBounty={card.isOpenBounty}
                  isNearby={card.isNearby}
                  distanceDisplay={card.distanceDisplay}
                  locationLabel={card.locationLabel}
                  requireSentinel={card.requireSentinel}
                  sentinelVerified={card.sentinelVerified}
                  isCommunitySpark={card.isCommunitySpark}
                  nowMs={nowMs}
                />
              ))
            : null}
          {showMobileMeetups
            ? meetups.slice(0, 5).map((meetup) => (
                <CommunityActivityCard
                  key={`meetup-${meetup.id}`}
                  kind="meetup"
                  title={meetup.title}
                  place={meetup.placeLabel}
                  startsAt={meetup.startTime}
                  note={meetup.note}
                  author={meetup.creator?.tag ? `@${meetup.creator.tag.replace(/^@/, '')}` : null}
                  href={`/map?meetupId=${encodeURIComponent(meetup.id)}&source=live-around`}
                />
              ))
            : null}
          {showMobileLocal
            ? localActivities.slice(0, 6).map((activity) => (
                <CommunityActivityCard
                  key={`local-${activity.id}`}
                  kind={activity.postType === 'ask' ? 'ask' : activity.postType === 'offer' ? 'offer' : 'hang'}
                  title={activity.title}
                  place={activity.venueName || activity.city}
                  startsAt={activity.startsAt}
                  note={activity.notes}
                  author={activity.submittedBy}
                  href={getLocalPostMapHref(activity)}
                />
              ))
            : null}
          {!communityLoading &&
          ((mobileFilter === 'MEET' && meetups.length === 0) ||
            (mobileFilter === 'LOCAL' && localActivities.length === 0) ||
            (mobileFilter === 'PLAY' && mobileDareCards.length === 0)) ? (
            <Link href="/community" prefetch={false} className="live-around-mobile__empty">
              <Users className="h-6 w-6 text-cyan-200" aria-hidden="true" />
              <strong>Start the first local move</strong>
              <span>Post a meetup, Ask, or Offer around a real place.</span>
            </Link>
          ) : null}
          </div>
          <button
            type="button"
            className="live-around-mobile__next"
            onClick={showNextMobileCard}
            disabled={!mobileRailHasNext}
            aria-label="Show the next nearby activity"
          >
            <ArrowRight aria-hidden="true" />
          </button>
        </div>

        <div className="live-around-mobile__footer">
          <p className="live-around-mobile__swipe-hint" aria-live="polite">
            <span>{mobileRailCount > 0 ? `${mobileRailIndex + 1} / ${mobileRailCount}` : 'Live'}</span>
            {mobileRailHasNext ? 'Swipe for more' : 'Caught up nearby'}
            {mobileRailHasNext ? <ArrowRight aria-hidden="true" /> : null}
          </p>
          <Link href="/community" prefetch={false} className="whitespace-nowrap text-[10px] font-black uppercase tracking-[0.14em] text-cyan-200">
            Community hub →
          </Link>
        </div>
      </section>

      <div className="live-around-desktop-only premium-bounties-controls-wrap relative w-full max-w-[1400px] mb-10">
        <div className="premium-filter-row premium-bounties-controls flex flex-col md:flex-row items-stretch md:items-center justify-between w-full px-3 md:px-4 py-3 gap-4">
          {/* Horizontally scrollable filter buttons on mobile */}
          <div className="overflow-x-auto scrollbar-hide -mx-6 px-6 md:mx-0 md:px-0">
            <div className="premium-filter-shell flex gap-2 p-1.5 w-max md:w-auto">
              {FILTERS.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => {
                    setFilter(tab.key);
                  }}
                  className={`premium-filter-chip ${
                    tab.key === 'ALL' ? 'premium-filter-chip--all' : ''
                  } ${
                    filter === tab.key ? 'premium-filter-chip--active' : ''
                  } px-4 md:px-5 py-2.5 rounded-[2.25rem] font-mono text-[9px] tracking-[0.15em] md:tracking-[0.2em] uppercase transition-all duration-300 whitespace-nowrap`}
                  aria-pressed={filter === tab.key}
                >
                  <span
                    className={`premium-filter-chip__label ${
                      filter === tab.key ? 'premium-filter-chip__label--active' : ''
                    }`}
                  >
                    {tab.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="premium-search premium-search-shell bd-dent-surface bd-dent-surface--soft relative group w-full md:w-auto md:min-w-[320px] rounded-[1.35rem] px-2 py-2">
            <div className="premium-search-shell__inner relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 group-focus-within:text-[#FACC15] transition-colors" />
              <input
                type="text"
                placeholder="SEARCH TARGET OR DARE..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="premium-search-input w-full bg-transparent rounded-[1.05rem] py-3 pl-12 pr-4 text-[10px] font-mono tracking-widest text-white placeholder:text-white/30 focus:outline-none transition-all"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="premium-bounty-discovery-rail mb-8 grid w-full max-w-[1400px] gap-2 px-1 sm:grid-cols-2 lg:grid-cols-4">
        <Link
          href="/map?source=active-bounties"
          prefetch={false}
          className="premium-venue-discovery-card premium-venue-discovery-card--map group"
        >
          <span className="premium-venue-discovery-icon">
            <Radio className="h-3.5 w-3.5" />
          </span>
          <span className="min-w-0">
            <span className="premium-venue-discovery-label">Live venue map</span>
            <span className="premium-venue-discovery-meta">Meetups + Sparks nearby</span>
          </span>
          <ArrowRight className="premium-venue-discovery-arrow" />
        </Link>
        {venueDiscoveryLinks.map((venue) => (
          <Link
            key={venue.slug}
            href={`${venue.primaryHref}&room=1`}
            prefetch={false}
            className="premium-venue-discovery-card group"
          >
            <span className="premium-venue-discovery-icon">
              <MapPin className="h-3.5 w-3.5" />
            </span>
            <span className="min-w-0">
              <span className="premium-venue-discovery-label">{venue.name}</span>
              <span className="premium-venue-discovery-meta">Open place room</span>
            </span>
            <ArrowRight className="premium-venue-discovery-arrow" />
          </Link>
        ))}
      </div>

      <section className="live-around-desktop-community mb-8 w-full max-w-[1400px]" aria-label="Community around you">
        <div className="mb-3 flex items-end justify-between gap-4 px-1">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-200/58">Community around you</p>
            <p className="mt-1 text-sm font-black text-white/80">Meetups, hangs, and useful local posts</p>
          </div>
          <Link href="/community" prefetch={false} className="text-[10px] font-black uppercase tracking-[0.13em] text-cyan-200/78 hover:text-cyan-100">
            Open hub →
          </Link>
        </div>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {meetups.slice(0, 2).map((meetup) => (
            <CommunityActivityCard
              key={`desktop-meetup-${meetup.id}`}
              kind="meetup"
              title={meetup.title}
              place={meetup.placeLabel}
              startsAt={meetup.startTime}
              note={meetup.note}
              author={meetup.creator?.tag ? `@${meetup.creator.tag.replace(/^@/, '')}` : null}
              href={`/map?meetupId=${encodeURIComponent(meetup.id)}&source=live-around`}
            />
          ))}
          {localActivities.slice(0, Math.max(1, 3 - Math.min(meetups.length, 2))).map((activity) => (
            <CommunityActivityCard
              key={`desktop-local-${activity.id}`}
              kind={activity.postType === 'ask' ? 'ask' : activity.postType === 'offer' ? 'offer' : 'hang'}
              title={activity.title}
              place={activity.venueName || activity.city}
              startsAt={activity.startsAt}
              note={activity.notes}
              author={activity.submittedBy}
              href={getLocalPostMapHref(activity)}
            />
          ))}
        </div>
      </section>

      {/* NEARBY filter special states */}
      {filter === 'NEARBY' && (geoLoading || nearbyLoading) && (
        <div className="live-around-desktop-only w-full max-w-[1400px] px-6 mb-8">
          <div className="bd-dent-surface bd-dent-surface--soft flex items-center justify-center gap-3 p-6 border border-white/[0.06] rounded-2xl">
            <Loader2 className="w-5 h-5 text-[#FACC15] animate-spin" />
            <span className="text-sm text-gray-400 font-mono">
              {geoLoading ? 'Getting your location...' : 'Finding nearby dares...'}
            </span>
          </div>
        </div>
      )}

      {filter === 'NEARBY' && geoError && (
        <div className="live-around-desktop-only w-full max-w-[1400px] px-6 mb-8">
          <div className="bd-dent-surface bd-dent-surface--soft flex flex-col items-center gap-3 p-6 border border-red-500/20 rounded-2xl">
            <MapPin className="w-8 h-8 text-red-400" />
            <p className="text-sm text-red-400 text-center">{geoError}</p>
            <button
              onClick={requestLocation}
              className="px-4 py-2 bg-[#FACC15] text-black font-bold text-xs uppercase tracking-wider rounded-lg hover:bg-[#FDE047] transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      )}

      {filter === 'NEARBY' && nearbyError && !geoError && (
        <div className="live-around-desktop-only w-full max-w-[1400px] px-6 mb-8">
          <div className="bd-dent-surface bd-dent-surface--soft p-4 border border-red-500/20 rounded-xl text-center">
            <p className="text-sm text-red-400">{nearbyError}</p>
          </div>
        </div>
      )}

      {filter === 'NEARBY' && coordinates && !nearbyLoading && nearbyDares.length === 0 && !nearbyError && (
        <div className="live-around-desktop-only w-full max-w-[1400px] px-6 mb-8">
          <div className="bd-dent-surface bd-dent-surface--soft flex flex-col items-center gap-3 p-8 border border-white/[0.06] rounded-2xl">
            <MapPin className="w-10 h-10 text-gray-500" />
            <p className="text-lg font-bold text-white">No nearby bounty yet</p>
            <p className="text-sm text-gray-400 text-center">
              Open the venue map and add the first useful update in your area.
            </p>
          </div>
        </div>
      )}

      {filter !== 'NEARBY' && filteredCards.length === 0 ? (
        <div className="live-around-desktop-only w-full max-w-[1400px] px-6 mb-8">
          <div className="bd-dent-surface bd-dent-surface--soft flex flex-col items-center gap-3 rounded-2xl border border-white/[0.06] p-8 text-center">
            <MapPin className="h-10 w-10 text-white/40" />
            <p className="text-lg font-black text-white">First dares are forming in Siargao</p>
            <p className="max-w-md text-sm text-white/50">
              Fund a useful mission or join as a contributor — real arrivals, useful updates, and paid work.
            </p>
            <div className="mt-2 flex flex-wrap justify-center gap-2">
              <Link href="/first-spark" prefetch={false} className="inline-flex min-h-10 items-center rounded-full border border-yellow-300/30 bg-yellow-300 px-4 text-[11px] font-black uppercase tracking-[0.14em] text-black transition hover:bg-yellow-200">
                Run a venue dare
              </Link>
              <Link href="/creators/signup" prefetch={false} className="inline-flex min-h-10 items-center rounded-full border border-white/14 bg-white/[0.05] px-4 text-[11px] font-black uppercase tracking-[0.14em] text-white/76 transition hover:bg-white/[0.09] hover:text-white">
                Join as a creator
              </Link>
            </div>
          </div>
        </div>
      ) : null}

      <div className="premium-bento-grid premium-bento-stage">
        {filter === 'NEARBY' && (geoLoading || nearbyLoading)
          ? Array.from({ length: 6 }).map((_, i) => <SentinelSkeleton key={i} />)
          : filteredCards.map((card) => (
              <PremiumDareCard
                key={card.id}
                shortId={card.shortId}
                dare={card.dare}
                bounty={card.bounty}
                streamer={card.streamer}
                streamerImage={card.streamerImage}
                emoji={card.emoji}
                status={card.status}
                timeRemaining={card.timeRemaining}
                expiresAt={card.expiresAt}
                isOpenBounty={card.isOpenBounty}
                isNearby={card.isNearby}
                distanceDisplay={card.distanceDisplay}
                locationLabel={card.locationLabel}
                requireSentinel={card.requireSentinel}
                sentinelVerified={card.sentinelVerified}
                isCommunitySpark={card.isCommunitySpark}
                nowMs={nowMs}
              />
            ))}
      </div>

    </div>
  );
}
