'use client';

import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { Search, MapPin, Loader2 } from 'lucide-react';
import PremiumDareCard, { PremiumDareCardStatus, SentinelSkeleton } from './PremiumDareCard';
import ProofViewer from './ProofViewer';
import { useGeolocation } from '@/hooks/useGeolocation';
import './PremiumBentoGrid.css';

const FILTERS = ['ALL', 'STREAMERS', 'OPEN BOUNTIES', 'NEARBY', 'LOCKED', 'EXPIRED'] as const;
type Filter = (typeof FILTERS)[number];

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
};

type PremiumBentoGridProps = {
  dares: Dare[];
};

const STREAMER_IMAGES: Record<string, string> = {
  kaicenat: '/assets/KAICENAT.jpeg',
  'kai cenat': '/assets/KAICENAT.jpeg',
  '@kaicenat': '/assets/KAICENAT.jpeg',
  adinross: '/assets/adinross.png',
  'adin ross': '/assets/adinross.png',
  '@adinross': '/assets/adinross.png',
  ishowspeed: '/assets/Ishowspeed.jpg',
  '1showspeed': '/assets/Ishowspeed.jpg',
  '@ishowspeed': '/assets/Ishowspeed.jpg',
  speed: '/assets/Ishowspeed.jpg',
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

// LIVE TARGETS - Featured bounties with real streamers
const LIVE_TARGETS = [
  {
    id: 'live-101',
    dare: 'EAT THE REAPER',
    bounty: 5000,
    time: '02:00h left',
    streamer: '@KaiCenat',
    imgUrl: '/assets/KAICENAT.jpeg',
    emoji: '🌶️',
    isVulnerable: false,
    status: 'live' as const,
  },
  {
    id: 'live-102',
    dare: 'SKYDIVING IRL',
    bounty: 12000,
    time: 'EXPIRED',
    streamer: '@IShowSpeed',
    imgUrl: '/assets/Ishowspeed.jpg',
    emoji: '🪂',
    isVulnerable: true,
    status: 'expired' as const,
  },
  {
    id: 'live-103',
    dare: 'CALL YOUR EX',
    bounty: 500,
    time: '00:30m left',
    streamer: '@AdinRoss',
    imgUrl: '/assets/adinross.png',
    emoji: '💔',
    isVulnerable: false,
    status: 'live' as const,
  },
];

function getStreamerImage(streamerName?: string): string | undefined {
  if (!streamerName) return undefined;
  const normalized = streamerName.toLowerCase().trim();
  return STREAMER_IMAGES[normalized];
}

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

function calculateTimeRemaining(expiresAt?: string | null): { display: string; secondsLeft: number } {
  if (!expiresAt) return { display: '24h left', secondsLeft: 86400 };

  const now = Date.now();
  const expiry = new Date(expiresAt).getTime();
  const diff = expiry - now;

  if (diff <= 0) return { display: 'EXPIRED', secondsLeft: 0 };

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  if (hours > 0) {
    return { display: `${hours}h ${minutes}m left`, secondsLeft: Math.floor(diff / 1000) };
  } else if (minutes > 0) {
    return { display: `${minutes}m ${seconds}s left`, secondsLeft: Math.floor(diff / 1000) };
  } else {
    return { display: `${seconds}s left`, secondsLeft: Math.floor(diff / 1000) };
  }
}

export default function PremiumBentoGrid({ dares }: PremiumBentoGridProps) {
  const [filter, setFilter] = useState<Filter>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [proofUrl, setProofUrl] = useState<string | null>(null);
  const loadingTimeoutRef = useRef<number | null>(null);

  // Nearby dares state
  const [nearbyDares, setNearbyDares] = useState<NearbyDare[]>([]);
  const [nearbyLoading, setNearbyLoading] = useState(false);
  const [nearbyError, setNearbyError] = useState<string | null>(null);
  const { coordinates, loading: geoLoading, error: geoError, requestLocation } = useGeolocation();

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

  useEffect(() => {
    return () => {
      if (loadingTimeoutRef.current != null) window.clearTimeout(loadingTimeoutRef.current);
    };
  }, []);

  const triggerLoading = () => {
    setIsLoading(true);
    if (loadingTimeoutRef.current != null) window.clearTimeout(loadingTimeoutRef.current);
    loadingTimeoutRef.current = window.setTimeout(() => setIsLoading(false), 600);
  };

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
      proofUrl?: string;
      isNearby?: boolean;
      distanceKm?: number;
      distanceDisplay?: string;
      locationLabel?: string | null;
  };

  const cards = useMemo<Card[]>(() => {
    // Map LIVE_TARGETS (featured streamers) first
    const liveTargetCards: Card[] = LIVE_TARGETS.map((target) => ({
      id: target.id,
      shortId: target.id,
      dare: target.dare,
      bounty: target.bounty,
      streamer: target.streamer,
      streamerImage: target.imgUrl,
      emoji: target.emoji,
      status: target.status,
      timeRemaining: target.status === 'live' ? target.time : target.status === 'expired' ? 'EXPIRED' : undefined,
      isOpenBounty: false,
      proofUrl: undefined,
    }));

    // Map incoming dares from database
    const mapped = dares.map((d) => {
      const normalizedStatus = normalizeStatus(d.status);

      const streamerName = d.streamer_name || '';
      const streamerImage = getStreamerImage(streamerName) || d.image_url;
      const proof = d.video_url;

      // Calculate real time remaining from expiresAt
      const timeInfo = calculateTimeRemaining(d.expires_at);
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
        proofUrl: proof,
      };
    });

    // Open bounties - available to anyone
    const openDefaults: Card[] = [
      {
        id: 'open-1',
        shortId: 'open-1',
        dare: 'CHUG A COKE (NO BURP)',
        bounty: 50,
        streamer: 'OPEN TO ALL',
        streamerImage: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=800',
        emoji: '🥤',
        status: 'open',
        timeRemaining: 'OPEN BOUNTY',
        isOpenBounty: true,
        proofUrl: undefined,
      },
      {
        id: 'open-2',
        shortId: 'open-2',
        dare: 'EAT A CHEESEBURGER IN 1 BITE',
        bounty: 150,
        streamer: 'OPEN TO ALL',
        streamerImage: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800',
        emoji: '🍔',
        status: 'open',
        timeRemaining: 'OPEN BOUNTY',
        isOpenBounty: true,
        proofUrl: undefined,
      },
    ];

    // Locked/Restricted bounties - require Genesis Pass
    const locked: Card[] = [
      {
        id: 'locked-1',
        shortId: 'locked-1',
        dare: 'SHAVE HEAD LIVE',
        bounty: 0,
        streamer: '???',
        streamerImage: 'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?auto=format&fit=crop&w=800',
        emoji: '🔒',
        status: 'restricted' as const,
        timeRemaining: 'LOCKED',
        isOpenBounty: false,
        proofUrl: undefined,
      },
      {
        id: 'locked-2',
        shortId: 'locked-2',
        dare: 'TATTOO LOGO ON FACE',
        bounty: 0,
        streamer: '???',
        streamerImage: 'https://images.unsplash.com/photo-1562962230-16bc46364924?auto=format&fit=crop&w=800',
        emoji: '🔒',
        status: 'restricted' as const,
        timeRemaining: 'LOCKED',
        isOpenBounty: false,
        proofUrl: undefined,
      },
    ];

    return [...liveTargetCards, ...mapped, ...openDefaults, ...locked];
  }, [dares]);

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

      if (filter === 'ALL') return true;
      if (filter === 'STREAMERS') return Boolean(card.streamer && card.streamer.trim().length > 0);
      if (filter === 'OPEN BOUNTIES') return card.status === 'open';
      if (filter === 'LOCKED') return card.status === 'restricted';
      return true;
    });
  }, [cards, nearbyCards, filter, searchQuery]);

  return (
    <div className="w-full flex flex-col items-center">
      <div className="premium-filter-row flex flex-col md:flex-row items-stretch md:items-center justify-between w-full max-w-[1400px] mb-12 px-6 gap-4">
        {/* Horizontally scrollable filter buttons on mobile */}
        <div className="overflow-x-auto scrollbar-hide -mx-6 px-6 md:mx-0 md:px-0">
          <div className="flex gap-1.5 p-1.5 bg-white/[0.03] backdrop-blur-2xl border border-white/[0.08] rounded-2xl glass-highlight w-max md:w-auto">
            {FILTERS.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => {
                  triggerLoading();
                  setFilter(cat);
                }}
                className={`px-4 md:px-5 py-2.5 rounded-xl font-mono text-[9px] tracking-[0.15em] md:tracking-[0.2em] uppercase transition-all duration-300 whitespace-nowrap ${
                  filter === cat
                    ? 'bg-[#FACC15]/90 text-black font-black shadow-[0_0_20px_rgba(250,204,21,0.3)]'
                    : 'text-white/40 hover:text-white/70 hover:bg-white/[0.05]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="premium-search relative group w-full md:w-auto md:min-w-[300px]">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 group-focus-within:text-[#FACC15] transition-colors" />
          <input
            type="text"
            placeholder="SEARCH TARGET OR DARE..."
            value={searchQuery}
            onChange={(e) => {
              triggerLoading();
              setSearchQuery(e.target.value);
            }}
            className="premium-search-input w-full bg-white/[0.03] border border-white/[0.08] rounded-xl py-3 pl-12 pr-4 text-[10px] font-mono tracking-widest text-white placeholder:text-white/30 focus:outline-none focus:border-[#FACC15]/40 focus:bg-white/[0.05] transition-all backdrop-blur-2xl"
          />
        </div>
      </div>

      {/* NEARBY filter special states */}
      {filter === 'NEARBY' && (geoLoading || nearbyLoading) && (
        <div className="w-full max-w-[1400px] px-6 mb-8">
          <div className="flex items-center justify-center gap-3 p-6 bg-white/[0.03] backdrop-blur-2xl border border-white/[0.08] rounded-2xl">
            <Loader2 className="w-5 h-5 text-[#FACC15] animate-spin" />
            <span className="text-sm text-gray-400 font-mono">
              {geoLoading ? 'Getting your location...' : 'Finding nearby dares...'}
            </span>
          </div>
        </div>
      )}

      {filter === 'NEARBY' && geoError && (
        <div className="w-full max-w-[1400px] px-6 mb-8">
          <div className="flex flex-col items-center gap-3 p-6 bg-red-500/10 backdrop-blur-2xl border border-red-500/20 rounded-2xl">
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
        <div className="w-full max-w-[1400px] px-6 mb-8">
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-center">
            <p className="text-sm text-red-400">{nearbyError}</p>
          </div>
        </div>
      )}

      {filter === 'NEARBY' && coordinates && !nearbyLoading && nearbyDares.length === 0 && !nearbyError && (
        <div className="w-full max-w-[1400px] px-6 mb-8">
          <div className="flex flex-col items-center gap-3 p-8 bg-white/[0.03] backdrop-blur-2xl border border-white/[0.08] rounded-2xl">
            <MapPin className="w-10 h-10 text-gray-500" />
            <p className="text-lg font-bold text-white">No nearby dares found</p>
            <p className="text-sm text-gray-400 text-center">
              Be the first to create a dare in your area!
            </p>
          </div>
        </div>
      )}

      <div className="premium-bento-grid">
        {isLoading || (filter === 'NEARBY' && (geoLoading || nearbyLoading))
          ? Array.from({ length: 6 }).map((_, i) => <SentinelSkeleton key={i} />)
          : filteredCards.map((card) => (
              <PremiumDareCard
                key={card.id}
                id={card.id}
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
                proofUrl={card.proofUrl}
                onViewProof={(url) => setProofUrl(url)}
                isNearby={card.isNearby}
                distanceDisplay={card.distanceDisplay}
                locationLabel={card.locationLabel}
              />
            ))}
      </div>

      {proofUrl ? <ProofViewer videoUrl={proofUrl} onClose={() => setProofUrl(null)} /> : null}
    </div>
  );
}
