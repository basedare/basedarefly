'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  MapContainer,
  Marker,
  Polyline,
  TileLayer,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import { CRS, divIcon, latLng, type LatLngExpression, type Map as LeafletMap } from 'leaflet';
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Flame,
  Loader2,
  LocateFixed,
  MapPin,
  Minus,
  Plus,
  Search,
  Sparkles,
  X,
  Zap,
} from 'lucide-react';
import { useAccount } from 'wagmi';
import MapCrosshair from '@/app/map/MapCrosshair';
import CosmicButton from '@/components/ui/CosmicButton';
import CreatePlaceChallengeButton from '@/components/place-challenges/CreatePlaceChallengeButton';
import TagPlaceButton from '@/components/place-tags/TagPlaceButton';
import SentinelBadge from '@/components/SentinelBadge';

type SearchResult = {
  id: string;
  externalPlaceId: string;
  placeSource: string;
  placeId?: string;
  slug?: string;
  name: string;
  displayName: string;
  address: string | null;
  city: string | null;
  country: string | null;
  latitude: number;
  longitude: number;
  activeDareCount?: number;
  approvedCount?: number;
  lastTaggedAt?: string | null;
};

type NearbyPlace = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  city: string | null;
  country: string | null;
  latitude: number;
  longitude: number;
  categories: string[];
  distanceDisplay: string;
  tagSummary: {
    approvedCount: number;
    heatScore: number;
    lastTaggedAt: string | null;
  };
  activeDareCount: number;
};

type SelectedPlace = {
  placeId?: string;
  slug?: string;
  name: string;
  address?: string | null;
  city?: string | null;
  country?: string | null;
  latitude: number;
  longitude: number;
  categories?: string[] | null;
  placeSource?: string | null;
  externalPlaceId?: string | null;
  approvedCount?: number;
  heatScore?: number;
  lastTaggedAt?: string | null;
  activeDareCount?: number;
};

type NearbyResponse = {
  success: boolean;
  data?: {
    venues: NearbyPlace[];
  };
};

type SearchResponse = {
  success: boolean;
  data?: {
    results: SearchResult[];
  };
};

type NearbyDare = {
  id: string;
  shortId: string | null;
  title: string;
  bounty: number;
  status: string;
  locationLabel: string | null;
  distanceKm: number;
  distanceDisplay: string;
  expiresAt: string | null;
  createdAt: string;
  streamerHandle: string | null;
  isOpenBounty: boolean;
  requireSentinel: boolean;
  sentinelVerified: boolean;
  venueSlug: string | null;
};

type NearbyDaresResponse = {
  success: boolean;
  data?: {
    dares: NearbyDare[];
  };
};

type FootprintMark = {
  id: string;
  creatorTag: string | null;
  firstMark: boolean;
  submittedAt: string;
  venue: {
    id: string;
    slug: string;
    name: string;
    address: string | null;
    city: string | null;
    country: string | null;
    latitude: number;
    longitude: number;
    categories: string[];
  };
};

type FootprintStats = {
  totalMarks: number;
  firstMarks: number;
  uniqueVenues: number;
  lastMarkedAt: string | null;
  topVenue: {
    id: string;
    slug: string;
    name: string;
    city: string | null;
    country: string | null;
    count: number;
  } | null;
};

type FootprintResponse = {
  success: boolean;
  data?: {
    marks: FootprintMark[];
    stats?: FootprintStats;
  };
};

type MapCreatorOpportunity = {
  id: string;
  shortId: string;
  title: string;
  description: string | null;
  payoutAmount: number;
  payoutCurrency: 'USDC';
  matchScore: number;
  matchReasons: string[];
  status: string;
  venue: {
    id: string;
    slug: string;
    name: string;
    city: string | null;
    country: string | null;
  } | null;
  linkedDare: {
    id: string;
    shortId: string | null;
    status: string;
    streamerHandle?: string | null;
    targetWalletAddress?: string | null;
    claimRequestWallet?: string | null;
    claimRequestStatus?: string | null;
  } | null;
  affinity?: {
    venueMarks: number;
    firstMarksAtVenue: number;
    cityMarks: number;
  };
  claimable?: boolean;
  shortlisted: boolean;
};

type CreatorCampaignsResponse = {
  success: boolean;
  data?: {
    campaigns: MapCreatorOpportunity[];
  };
};

type PlaceTagItem = {
  id: string;
  creatorTag: string | null;
  walletAddress: string;
  caption: string | null;
  vibeTags: string[];
  proofMediaUrl: string;
  proofType: string;
  source?: string | null;
  firstMark: boolean;
  submittedAt: string;
};

type PlaceTagsResponse = {
  success: boolean;
  data?: {
    approvedCount: number;
    heatScore: number;
    tags: PlaceTagItem[];
  };
};

type VenueDetailResponse = {
  success: boolean;
  data?: {
    venue: {
      id: string;
      slug: string;
      name: string;
      address: string | null;
      city: string | null;
      country: string | null;
      latitude: number;
      longitude: number;
      categories: string[];
      tagSummary: {
        approvedCount: number;
        heatScore: number;
        lastTaggedAt: string | null;
      };
      activeDares: Array<{
        id: string;
        shortId: string;
        title: string;
        missionMode: string;
        bounty: number;
        status: string;
        streamerHandle: string | null;
        expiresAt: string | null;
        createdAt: string;
        campaignTitle: string | null;
        brandName: string | null;
        requireSentinel: boolean;
        sentinelVerified: boolean;
        targetWalletAddress: string | null;
        claimedBy: string | null;
        claimRequestTag: string | null;
        claimRequestedAt: string | null;
        claimRequestStatus: string | null;
      }>;
      paidActivationCount: number;
      featuredPaidActivation: {
        id: string;
        shortId: string;
        title: string;
        missionMode: string;
        bounty: number;
        status: string;
        streamerHandle: string | null;
        expiresAt: string | null;
        createdAt: string;
        campaignTitle: string | null;
        brandName: string | null;
        requireSentinel: boolean;
        sentinelVerified: boolean;
        targetWalletAddress: string | null;
        claimedBy: string | null;
        claimRequestTag: string | null;
        claimRequestedAt: string | null;
        claimRequestStatus: string | null;
      } | null;
    };
  };
};

type PendingPlaceTagItem = {
  tagId: string;
  status: string;
  placeId: string;
  creatorTag: string | null;
  caption: string | null;
  vibeTags: string[];
  proofMediaUrl: string | null;
  proofType: 'IMAGE' | 'VIDEO';
  submittedAt: string;
  firstMark: boolean;
};

type SelectedPlaceActiveDare = {
  id: string;
  shortId: string;
  title: string;
  missionMode: string;
  bounty: number;
  status: string;
  streamerHandle: string | null;
  expiresAt: string | null;
  createdAt: string;
  campaignTitle: string | null;
  brandName: string | null;
  requireSentinel: boolean;
  sentinelVerified: boolean;
  targetWalletAddress: string | null;
  claimedBy: string | null;
  claimRequestTag: string | null;
  claimRequestedAt: string | null;
  claimRequestStatus: string | null;
};

type PulseState = 'blazing' | 'igniting' | 'simmering' | 'cold';
type PulseFilter = 'all' | 'blazing' | 'igniting' | 'simmering' | 'unmarked';
type MapPreset = 'classic' | 'noir';
type PlaceVisualState = 'unmarked' | 'pending' | 'first-mark' | 'active' | 'hot';
type CeremonyState =
  | {
      kind: 'pending' | 'first-spark' | 'alive-upgrade';
      title: string;
      body: string;
    }
  | null;
type NearbyDareFilter = 'all' | 'open' | 'sentinel' | 'high';
type ClusteredNearbyMarker =
  | {
      kind: 'place';
      key: string;
      place: NearbyPlace;
    }
  | {
      kind: 'cluster';
      key: string;
      latitude: number;
      longitude: number;
      count: number;
      pulse: PulseState;
      visualState: PlaceVisualState;
      matched: boolean;
      challengeLiveCount: number;
    };

const markerIconCache = new Map<string, ReturnType<typeof divIcon>>();
const footprintMarkerIconCache = new Map<string, ReturnType<typeof divIcon>>();
const placeClusterIconCache = new Map<string, ReturnType<typeof divIcon>>();

const MAP_PRESET_OPTIONS: Array<{
  value: MapPreset;
  label: string;
  accentClass: string;
}> = [
  {
    value: 'classic',
    label: 'Classic',
    accentClass:
      'data-[active=true]:border-[#f5c518]/38 data-[active=true]:bg-[#f5c518]/[0.12] data-[active=true]:text-[#f8dd72]',
  },
  {
    value: 'noir',
    label: 'Noir',
    accentClass:
      'data-[active=true]:border-white/25 data-[active=true]:bg-white/[0.08] data-[active=true]:text-white',
  },
];

const DEFAULT_CENTER: [number, number] = [-33.8688, 151.2093];
const DEFAULT_ZOOM = 12;
const PROXIMITY_REVEAL_METERS = 100;
const PROXIMITY_GHOST_METERS = 500;

function getRadiusMetersForZoom(zoom: number) {
  if (zoom >= 15) return 2000;
  if (zoom >= 13) return 5000;
  if (zoom >= 11) return 10000;
  return 20000;
}

function getDareRadiusKmForZoom(zoom: number) {
  if (zoom >= 15) return 2;
  if (zoom >= 13) return 5;
  if (zoom >= 11) return 10;
  return 20;
}

function getClusterCellSize(zoom: number) {
  if (zoom >= 15) return 0;
  if (zoom >= 14) return 54;
  if (zoom >= 13) return 62;
  if (zoom >= 12) return 72;
  return 84;
}

function getPulse(approvedCount: number, lastTaggedAt: string | null): PulseState {
  if (!lastTaggedAt || approvedCount <= 0) return 'cold';

  const diffMs = Date.now() - new Date(lastTaggedAt).getTime();
  const diffMinutes = diffMs / (1000 * 60);

  if (diffMinutes <= 60 && approvedCount >= 3) return 'blazing';
  if (diffMinutes <= 180) return 'igniting';
  if (diffMinutes <= 1440) return 'simmering';
  return 'cold';
}

function getActivationStateCopy(dare: SelectedPlaceActiveDare) {
  if (dare.claimRequestStatus === 'PENDING') {
    return {
      label: dare.claimRequestTag ? `claim pending · ${dare.claimRequestTag}` : 'claim pending',
      className:
        'border-amber-300/18 bg-amber-500/[0.08] text-amber-100',
    };
  }

  if (dare.claimedBy || dare.targetWalletAddress) {
    return {
      label: dare.streamerHandle ? `creator locked · ${dare.streamerHandle}` : 'creator locked',
      className:
        'border-emerald-300/18 bg-emerald-500/[0.08] text-emerald-100',
    };
  }

  return {
    label: dare.streamerHandle ? `target live · ${dare.streamerHandle}` : 'open target',
    className:
      'border-white/10 bg-white/[0.04] text-white/45',
  };
}

function getLastSparkLabel(lastTaggedAt: string | null) {
  if (!lastTaggedAt) return 'No sparks yet';

  const diffMs = Date.now() - new Date(lastTaggedAt).getTime();
  const diffMinutes = Math.max(1, Math.round(diffMs / (1000 * 60)));

  if (diffMinutes < 60) return `Last spark ${diffMinutes}m ago`;

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `Last spark ${diffHours}h ago`;

  const diffDays = Math.round(diffHours / 24);
  return `Last spark ${diffDays}d ago`;
}

function formatCoordinateLabel(latitude: number, longitude: number) {
  return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
}

function calculateDistanceMeters(
  startLatitude: number,
  startLongitude: number,
  endLatitude: number,
  endLongitude: number
) {
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const earthRadiusMeters = 6371000;
  const latDelta = toRadians(endLatitude - startLatitude);
  const lngDelta = toRadians(endLongitude - startLongitude);
  const startLat = toRadians(startLatitude);
  const endLat = toRadians(endLatitude);

  const haversine =
    Math.sin(latDelta / 2) * Math.sin(latDelta / 2) +
    Math.sin(lngDelta / 2) *
      Math.sin(lngDelta / 2) *
      Math.cos(startLat) *
      Math.cos(endLat);

  return Math.round(
    earthRadiusMeters * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine))
  );
}

function formatDistanceMeters(distanceMeters: number) {
  if (distanceMeters < 1000) {
    return `${distanceMeters}m away`;
  }

  return `${(distanceMeters / 1000).toFixed(1)}km away`;
}

function getExpiryLabel(expiresAt: string | null) {
  if (!expiresAt) return 'no expiry';

  const diffMs = new Date(expiresAt).getTime() - Date.now();
  if (diffMs <= 0) return 'ending now';

  const diffMinutes = Math.max(1, Math.round(diffMs / (1000 * 60)));
  if (diffMinutes < 60) return `ends in ${diffMinutes}m`;

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `ends in ${diffHours}h`;

  const diffDays = Math.round(diffHours / 24);
  return `ends in ${diffDays}d`;
}

function getSparkBadge(approvedCount: number) {
  if (approvedCount <= 0) return '!';
  if (approvedCount > 9) return '9+';
  return String(approvedCount);
}

function getPlaceVisualState({
  approvedCount,
  lastTaggedAt,
  pendingCount = 0,
}: {
  approvedCount: number;
  lastTaggedAt: string | null;
  pendingCount?: number;
}): PlaceVisualState {
  if (pendingCount > 0 && approvedCount <= 0) return 'pending';
  if (approvedCount <= 0) return 'unmarked';
  if (approvedCount === 1) return 'first-mark';

  const pulse = getPulse(approvedCount, lastTaggedAt);
  if (pulse === 'blazing') return 'hot';
  return 'active';
}

function getPlaceVisualCopy(state: PlaceVisualState) {
  switch (state) {
    case 'pending':
      return {
        label: 'Contested',
        description: 'A fresh mark is waiting for referee review before this venue can wake up.',
      };
    case 'first-mark':
      return {
        label: 'First Spark',
        description: 'This place just crossed from empty pin to real venue memory.',
      };
    case 'active':
      return {
        label: 'Memory Building',
        description: 'Verified marks are stacking and the venue is starting to feel owned.',
      };
    case 'hot':
      return {
        label: 'Legendary',
        description: 'Recent verified activity is dense enough that the venue story is now obvious.',
      };
    case 'unmarked':
    default:
      return {
        label: 'Dormant',
        description: 'No approved marks yet. The venue exists, but its memory layer is still empty.',
      };
  }
}

function getVenueTransformationState({
  approvedCount,
  heatScore,
  pendingCount,
  lastTaggedAt,
}: {
  approvedCount: number;
  heatScore: number;
  pendingCount: number;
  lastTaggedAt: string | null;
}) {
  const pulse = getPulse(approvedCount, lastTaggedAt);

  if (approvedCount <= 0 && pendingCount > 0) {
    return {
      label: 'Contested',
      description: 'A first mark is in review. One approval turns this from a dormant coordinate into a real BaseDare venue.',
      level: 1,
      className: 'border-amber-300/28 bg-amber-500/[0.10] text-amber-100',
      activeBarClass: 'from-amber-300 to-[#f5c518] shadow-[0_0_16px_rgba(251,191,36,0.18)]',
    };
  }

  if (approvedCount <= 0) {
    return {
      label: 'Dormant',
      description: 'The map knows this place exists, but nobody has anchored a verified memory here yet.',
      level: 1,
      className: 'border-white/12 bg-white/[0.04] text-white/62',
      activeBarClass: 'from-white/70 to-white/35',
    };
  }

  if (approvedCount === 1) {
    return {
      label: 'Awakening',
      description: 'One verified spark is enough to make the venue real. Now it needs repetition to feel alive.',
      level: 2,
      className: 'border-[#f5c518]/30 bg-[#f5c518]/[0.10] text-[#f8dd72]',
      activeBarClass: 'from-[#f5c518] to-[#f8dd72] shadow-[0_0_16px_rgba(245,197,24,0.18)]',
    };
  }

  if (approvedCount >= 8 || heatScore >= 60 || pulse === 'blazing') {
    return {
      label: 'Legendary',
      description: 'This place has enough verified activity and heat to read like a true local legend node.',
      level: 5,
      className: 'border-rose-300/30 bg-rose-500/[0.10] text-rose-100',
      activeBarClass: 'from-rose-300 via-[#f5c518] to-cyan-200 shadow-[0_0_18px_rgba(251,113,133,0.24)]',
    };
  }

  if (approvedCount >= 4 || heatScore >= 24 || pulse === 'igniting') {
    return {
      label: 'Established',
      description: 'The venue has enough recurring proof that its memory layer now changes how the place feels.',
      level: 4,
      className: 'border-cyan-300/30 bg-cyan-500/[0.10] text-cyan-100',
      activeBarClass: 'from-cyan-300 to-sky-200 shadow-[0_0_16px_rgba(34,211,238,0.22)]',
    };
  }

  return {
    label: 'Building Memory',
    description: 'The place is warming up. More verified marks will push it from interesting to undeniable.',
    level: 3,
    className: 'border-[#b87fff]/30 bg-[#b87fff]/[0.10] text-[#edd8ff]',
    activeBarClass: 'from-[#b87fff] to-fuchsia-200 shadow-[0_0_16px_rgba(184,127,255,0.18)]',
  };
}

function getPulseLegendPalette(pulse: PulseState) {
  switch (pulse) {
    case 'blazing':
      return {
        activeCount: 4,
        activeClass: 'from-rose-300 to-amber-200 shadow-[0_0_18px_rgba(251,113,133,0.32)]',
      };
    case 'igniting':
      return {
        activeCount: 3,
        activeClass: 'from-cyan-300 to-sky-200 shadow-[0_0_16px_rgba(34,211,238,0.28)]',
      };
    case 'simmering':
      return {
        activeCount: 2,
        activeClass: 'from-[#f5c518] to-[#f8dd72] shadow-[0_0_14px_rgba(245,197,24,0.24)]',
      };
    case 'cold':
    default:
      return {
        activeCount: 1,
        activeClass: 'from-white/60 to-white/30 shadow-none',
      };
  }
}

function renderPulseLegend(
  pulse: PulseState,
  options?: {
    compact?: boolean;
  }
) {
  const compact = options?.compact ?? false;
  const palette = getPulseLegendPalette(pulse);
  const barClass = compact ? 'h-2 w-6 rounded-full' : 'h-3 w-10 rounded-full';

  return (
    <div className={compact ? 'inline-flex items-center gap-1.5' : 'inline-flex items-center gap-2'}>
      {Array.from({ length: 4 }).map((_, index) => {
        const active = index < palette.activeCount;
        return (
          <span
            key={`${pulse}-${index}`}
            className={`${barClass} border border-white/10 transition ${
              active
                ? `bg-gradient-to-r ${palette.activeClass}`
                : 'bg-white/[0.04] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]'
            }`}
            aria-hidden="true"
          />
        );
      })}
    </div>
  );
}

function createPeebearMarkerIcon({
  pulse,
  approvedCount,
  heatScore,
  active,
  visualState,
  challengeLiveCount,
  matched = false,
}: {
  pulse: PulseState;
  approvedCount: number;
  heatScore: number;
  active: boolean;
  visualState: PlaceVisualState;
  challengeLiveCount: number;
  matched?: boolean;
}) {
  const badge = getSparkBadge(approvedCount);
  const showRipple = pulse !== 'cold' || visualState === 'pending' || visualState === 'first-mark';
  const showCount = approvedCount > 0;
  const showPulseChip = heatScore > 0;
  const hasChallengeLive = challengeLiveCount > 0;
  const stateLabel =
    visualState === 'first-mark'
      ? 'FIRST'
      : visualState === 'pending'
        ? 'PENDING'
        : visualState === 'hot'
          ? 'HOT'
          : visualState === 'active'
            ? 'ALIVE'
            : 'OPEN';
  const liveLabel =
    challengeLiveCount > 1 ? `LIVE ${challengeLiveCount > 9 ? '9+' : challengeLiveCount}` : 'LIVE';
  const cacheKey = `${pulse}:${visualState}:${active ? 'active' : 'idle'}:${matched ? 'matched' : 'neutral'}:${hasChallengeLive ? `challenge-${Math.min(challengeLiveCount, 9)}` : 'standard'}:${badge}:${Math.min(heatScore, 999)}`;

  const cachedIcon = markerIconCache.get(cacheKey);
  if (cachedIcon) {
    return cachedIcon;
  }

  const icon = divIcon({
    className: 'peebear-leaflet-icon',
    iconSize: [92, 132],
    iconAnchor: [44, 68],
    popupAnchor: [0, -54],
    html: `
      <div class="peebear-marker peebear-marker--${pulse} peebear-marker--${visualState} ${active ? 'is-active' : ''} ${hasChallengeLive ? 'has-challenge-live' : ''} ${matched ? 'is-matched' : ''}">
        ${showRipple ? `<span class="peebear-ripple peebear-ripple--${visualState === 'pending' ? 'pending' : pulse}"></span>` : ''}
        ${hasChallengeLive ? `<span class="peebear-challenge-aura" aria-hidden="true"></span><span class="peebear-challenge-ring" aria-hidden="true"></span><span class="peebear-challenge-pill">${liveLabel}</span>` : ''}
        ${matched ? `<span class="peebear-match-badge">MATCH</span>` : ''}
        ${showCount ? `<span class="peebear-count peebear-count--${visualState === 'first-mark' ? 'first-mark' : pulse}">${badge}</span>` : ''}
        <div class="peebear-core map-pin-marker map-pin-marker--${visualState} peebear-core--${pulse} peebear-core--${visualState}">
          <img src="/assets/peebear-head.png" alt="PeeBear pin" class="peebear-head" />
        </div>
        <div class="peebear-meta">
          ${showPulseChip ? `<span class="peebear-pulse-pill peebear-pulse-pill--${pulse}">PULSE ${Math.min(heatScore, 99)}</span>` : ''}
          <span class="peebear-state peebear-state--${visualState}">${stateLabel}</span>
        </div>
        <div class="peebear-shadow"></div>
      </div>
    `,
  });

  markerIconCache.set(cacheKey, icon);
  return icon;
}

function createFootprintMarkerIcon({
  firstMark,
  latest,
}: {
  firstMark: boolean;
  latest: boolean;
}) {
  const cacheKey = `${firstMark ? 'first' : 'mark'}:${latest ? 'latest' : 'history'}`;
  const cachedIcon = footprintMarkerIconCache.get(cacheKey);
  if (cachedIcon) {
    return cachedIcon;
  }

  const icon = divIcon({
    className: 'peebear-footprint-icon',
    iconSize: [108, 44],
    iconAnchor: [54, 22],
    popupAnchor: [0, -18],
    html: `
      <div class="peebear-footprint ${firstMark ? 'is-first' : ''} ${latest ? 'is-latest' : ''}">
        <span class="peebear-footprint-dot"></span>
        <span class="peebear-footprint-label">${firstMark ? 'YOUR WIN' : 'YOUR MARK'}</span>
      </div>
    `,
  });

  footprintMarkerIconCache.set(cacheKey, icon);
  return icon;
}

function createPlaceClusterIcon({
  count,
  pulse,
  visualState,
  matched,
  challengeLiveCount,
}: {
  count: number;
  pulse: PulseState;
  visualState: PlaceVisualState;
  matched: boolean;
  challengeLiveCount: number;
}) {
  const cacheKey = `${count > 9 ? '9+' : count}:${pulse}:${visualState}:${matched ? 'matched' : 'neutral'}:${challengeLiveCount > 0 ? 'live' : 'quiet'}`;
  const cachedIcon = placeClusterIconCache.get(cacheKey);
  if (cachedIcon) {
    return cachedIcon;
  }

  const icon = divIcon({
    className: 'place-cluster-leaflet-icon',
    iconSize: [88, 88],
    iconAnchor: [44, 44],
    popupAnchor: [0, -28],
    html: `
      <div class="place-cluster-marker place-cluster-marker--${pulse} place-cluster-marker--${visualState} ${matched ? 'is-matched' : ''} ${challengeLiveCount > 0 ? 'has-live' : ''}">
        <span class="place-cluster-aura"></span>
        ${matched ? '<span class="place-cluster-match">MATCH</span>' : ''}
        ${challengeLiveCount > 0 ? `<span class="place-cluster-live">${challengeLiveCount > 9 ? '9+' : challengeLiveCount} LIVE</span>` : ''}
        <span class="place-cluster-core">
          <span class="place-cluster-count">${count > 99 ? '99+' : count}</span>
          <span class="place-cluster-label">${count > 4 ? 'HUB' : 'NODE'}</span>
        </span>
        <span class="place-cluster-shadow"></span>
      </div>
    `,
  });

  placeClusterIconCache.set(cacheKey, icon);
  return icon;
}

function renderProofPreview(tag: PlaceTagItem, options?: { compact?: boolean }) {
  const compact = options?.compact ?? false;
  const sizeClass = compact ? 'h-16 w-16 rounded-[14px]' : 'h-20 w-20 rounded-[16px] md:h-22 md:w-22';

  if (tag.source === 'SEEDED_MEMORY') {
    return (
      <div className={`relative shrink-0 overflow-hidden border border-white/10 bg-[linear-gradient(180deg,rgba(245,197,24,0.14)_0%,rgba(184,127,255,0.12)_45%,rgba(7,9,18,0.96)_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] ${sizeClass}`}>
        <Image
          src="/assets/peebear-head.png"
          alt="PeeBear memory mark"
          fill
          sizes="96px"
          className="object-contain p-1.5"
          unoptimized
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.16),transparent_30%),linear-gradient(180deg,transparent_0%,rgba(0,0,0,0.08)_48%,rgba(0,0,0,0.28)_100%)]" />
      </div>
    );
  }

  if (tag.proofType === 'VIDEO') {
    return (
      <div className={`relative shrink-0 overflow-hidden border border-white/10 bg-black/30 ${sizeClass}`}>
        <video
          src={tag.proofMediaUrl}
          className="h-full w-full object-cover"
          muted
          playsInline
          preload="metadata"
        />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,transparent_0%,rgba(0,0,0,0.08)_48%,rgba(0,0,0,0.34)_100%)]" />
        <div className="absolute bottom-2 left-2 rounded-full border border-white/12 bg-black/45 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/78">
          Video
        </div>
      </div>
    );
  }

  return (
      <div className={`relative shrink-0 overflow-hidden border border-white/10 bg-black/30 ${sizeClass}`}>
        <Image
          src={tag.proofMediaUrl}
          alt={tag.caption || 'Place tag proof'}
        fill
        sizes="96px"
        className="object-cover"
        unoptimized
      />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,transparent_0%,rgba(0,0,0,0.08)_48%,rgba(0,0,0,0.24)_100%)]" />
      <div className="absolute bottom-2 left-2 rounded-full border border-white/12 bg-black/45 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/78">
        Image
      </div>
    </div>
  );
}

function MapController({
  targetCenter,
  targetZoom,
  onReady,
  onViewportChange,
  onMapClick,
}: {
  targetCenter: LatLngExpression | null;
  targetZoom: number | null;
  onReady: (map: LeafletMap) => void;
  onViewportChange: (latitude: number, longitude: number, zoom: number) => void;
  onMapClick: (latitude: number, longitude: number) => void;
}) {
  const map = useMap();

  useEffect(() => {
    onReady(map);
    const center = map.getCenter();
    onViewportChange(center.lat, center.lng, map.getZoom());
  }, [map, onReady, onViewportChange]);

  useEffect(() => {
    if (!targetCenter || targetZoom === null) return;
    map.flyTo(targetCenter, targetZoom, { duration: 0.9 });
  }, [map, targetCenter, targetZoom]);

  useMapEvents({
    moveend() {
      const center = map.getCenter();
      onViewportChange(center.lat, center.lng, map.getZoom());
    },
    click(event) {
      onMapClick(event.latlng.lat, event.latlng.lng);
    },
  });

  return null;
}

export default function RealWorldMap() {
  const { address, isConnected } = useAccount();
  const searchParams = useSearchParams();
  const mapViewportRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<LeafletMap | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [nearbyPlaces, setNearbyPlaces] = useState<NearbyPlace[]>([]);
  const [nearbyDares, setNearbyDares] = useState<NearbyDare[]>([]);
  const [nearbyDaresLoading, setNearbyDaresLoading] = useState(false);
  const [viewportCenter, setViewportCenter] = useState<{ latitude: number; longitude: number } | null>(null);
  const [selectedPlace, setSelectedPlace] = useState<SelectedPlace | null>(null);
  const [locating, setLocating] = useState(false);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [footprintMarks, setFootprintMarks] = useState<FootprintMark[]>([]);
  const [footprintStats, setFootprintStats] = useState<FootprintStats | null>(null);
  const [creatorOpportunities, setCreatorOpportunities] = useState<MapCreatorOpportunity[]>([]);
  const [showFootprintLayer, setShowFootprintLayer] = useState(false);
  const [showMatchedLayer, setShowMatchedLayer] = useState(false);
  const [targetCenter, setTargetCenter] = useState<LatLngExpression | null>(null);
  const [targetZoom, setTargetZoom] = useState<number | null>(null);
  const [mapZoom, setMapZoom] = useState(DEFAULT_ZOOM);
  const [sprayBurst, setSprayBurst] = useState(false);
  const [selectedPlaceTags, setSelectedPlaceTags] = useState<PlaceTagItem[]>([]);
  const [selectedPlaceTagsLoading, setSelectedPlaceTagsLoading] = useState(false);
  const [selectedPlaceTagsError, setSelectedPlaceTagsError] = useState<string | null>(null);
  const [selectedPlaceActiveDares, setSelectedPlaceActiveDares] = useState<SelectedPlaceActiveDare[]>([]);
  const [selectedPlaceActiveDaresLoading, setSelectedPlaceActiveDaresLoading] = useState(false);
  const [selectedPlaceFeaturedPaidActivation, setSelectedPlaceFeaturedPaidActivation] = useState<SelectedPlaceActiveDare | null>(null);
  const [pendingPlaceTags, setPendingPlaceTags] = useState<PendingPlaceTagItem[]>([]);
  const [pulseFilter, setPulseFilter] = useState<PulseFilter>('all');
  const [nearbyDareFilter, setNearbyDareFilter] = useState<NearbyDareFilter>('all');
  const [nearbyDareRadiusKm, setNearbyDareRadiusKm] = useState(5);
  const [nearbyDarePanelCollapsed, setNearbyDarePanelCollapsed] = useState(false);
  const [mapPreset, setMapPreset] = useState<MapPreset>('classic');
  const isImmersiveMobile = false;
  const [ceremonyState, setCeremonyState] = useState<CeremonyState>(null);
  const [bootstrappedDefaultPins, setBootstrappedDefaultPins] = useState(false);
  const deepLinkedPlaceSlug = searchParams.get('place');
  const controlSource = searchParams.get('source');
  const deepLinkedCampaignId = searchParams.get('campaignId');
  const deepLinkedDareShortId = searchParams.get('dare');
  const showTraceParam = searchParams.get('trace') === '1';
  const showMatchesParam = searchParams.get('matches') === '1';
  const hasDeepLinkedPlace = Boolean(deepLinkedPlaceSlug);
  const isCreatorSource = controlSource === 'creator';
  const showBackToControl = controlSource === 'control' || Boolean(deepLinkedCampaignId);
  const pendingPlaceTagsRef = useRef<PendingPlaceTagItem[]>([]);
  const nearbyFetchIdRef = useRef(0);
  const nearbyDareFetchIdRef = useRef(0);
  const skipNextSearchRef = useRef(false);
  const autoLocateModeRef = useRef<'idle' | 'auto' | 'manual'>('idle');
  const autoLocateFallbackAppliedRef = useRef(false);

  const focusedCreatorActivation = useMemo(() => {
    if (!deepLinkedDareShortId) return null;

    if (selectedPlaceFeaturedPaidActivation?.shortId === deepLinkedDareShortId) {
      return selectedPlaceFeaturedPaidActivation;
    }

    return (
      selectedPlaceActiveDares.find((dare) => dare.shortId === deepLinkedDareShortId) ?? null
    );
  }, [deepLinkedDareShortId, selectedPlaceActiveDares, selectedPlaceFeaturedPaidActivation]);

  const showFeaturedPaidActivation = useMemo(
    () =>
      Boolean(selectedPlaceFeaturedPaidActivation) &&
      selectedPlaceFeaturedPaidActivation?.shortId !== focusedCreatorActivation?.shortId,
    [focusedCreatorActivation?.shortId, selectedPlaceFeaturedPaidActivation]
  );

  const visibleActiveDares = useMemo(() => {
    if (!focusedCreatorActivation) {
      return selectedPlaceActiveDares.slice(0, 3);
    }

    const ordered = [
      focusedCreatorActivation,
      ...selectedPlaceActiveDares.filter((dare) => dare.id !== focusedCreatorActivation.id),
    ];

    return ordered.slice(0, 3);
  }, [focusedCreatorActivation, selectedPlaceActiveDares]);

  const featuredPaidActivation = showFeaturedPaidActivation ? selectedPlaceFeaturedPaidActivation : null;

  useEffect(() => {
    if (!isConnected || !address) {
      setFootprintMarks([]);
      setFootprintStats(null);
      return;
    }

    const controller = new AbortController();

    const loadFootprint = async () => {
      try {
        const response = await fetch(`/api/places/footprint?wallet=${encodeURIComponent(address)}`, {
          signal: controller.signal,
        });
        const payload = (await response.json()) as FootprintResponse;

        if (!response.ok || !payload.success || !payload.data?.marks) {
          throw new Error('Failed to load creator footprint');
        }

        setFootprintMarks(payload.data.marks);
        setFootprintStats(payload.data.stats ?? null);
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        console.error('[REAL_WORLD_MAP] Creator footprint failed:', error);
        setFootprintMarks([]);
        setFootprintStats(null);
      }
    };

    void loadFootprint();

    return () => controller.abort();
  }, [address, isConnected]);

  useEffect(() => {
    if (!isConnected || !address) {
      setCreatorOpportunities([]);
      return;
    }

    const controller = new AbortController();

    const loadCreatorOpportunities = async () => {
      try {
        const response = await fetch(`/api/campaigns/for-creator?wallet=${encodeURIComponent(address)}`, {
          signal: controller.signal,
        });
        const payload = (await response.json()) as CreatorCampaignsResponse;

        if (!response.ok || !payload.success || !payload.data?.campaigns) {
          throw new Error('Failed to load creator opportunity routing');
        }

        setCreatorOpportunities(payload.data.campaigns);
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        console.error('[REAL_WORLD_MAP] Creator opportunity routing failed:', error);
        setCreatorOpportunities([]);
      }
    };

    void loadCreatorOpportunities();

    return () => controller.abort();
  }, [address, isConnected]);

  useEffect(() => {
    if (!isConnected) {
      setShowFootprintLayer(false);
      setShowMatchedLayer(false);
      return;
    }

    setShowFootprintLayer(showTraceParam);
    setShowMatchedLayer(showMatchesParam || isCreatorSource || Boolean(deepLinkedDareShortId));
  }, [deepLinkedDareShortId, isConnected, isCreatorSource, showMatchesParam, showTraceParam]);

  useEffect(() => {
    pendingPlaceTagsRef.current = pendingPlaceTags;
  }, [pendingPlaceTags]);

  const requestApproximateLocation = useCallback(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setLocating(false);
      return () => undefined;
    }

    let cancelled = false;

    autoLocateModeRef.current = mapReady ? 'manual' : 'auto';
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (cancelled) return;
        setUserLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setTargetCenter([position.coords.latitude, position.coords.longitude]);
        setTargetZoom(14);
        setLocating(false);
      },
      () => {
        if (cancelled) return;
        setLocating(false);
      },
      { enableHighAccuracy: true, maximumAge: 30000, timeout: 8000 }
    );

    return () => {
      cancelled = true;
    };
  }, [mapReady]);

  useEffect(() => {
    if (hasDeepLinkedPlace) {
      return;
    }

    if (!bootstrappedDefaultPins) {
      return;
    }

    return requestApproximateLocation();
  }, [bootstrappedDefaultPins, hasDeepLinkedPlace, requestApproximateLocation]);

  useEffect(() => {
    if (!ceremonyState) return;

    const timeout = window.setTimeout(() => setCeremonyState(null), 7000);
    return () => window.clearTimeout(timeout);
  }, [ceremonyState]);

  useEffect(() => {
    if (!deepLinkedPlaceSlug) {
      return;
    }

    const controller = new AbortController();

    const loadDeepLinkedPlace = async () => {
      try {
        const response = await fetch(`/api/venues/${encodeURIComponent(deepLinkedPlaceSlug)}`, {
          signal: controller.signal,
        });
        const payload = (await response.json()) as VenueDetailResponse;

        if (!response.ok || !payload.success || !payload.data?.venue) {
          throw new Error('Failed to load deep-linked place');
        }

        const { venue } = payload.data;
        autoLocateModeRef.current = 'idle';
        autoLocateFallbackAppliedRef.current = true;
        setPulseFilter('all');
        setSelectedPlace({
          placeId: venue.id,
          slug: venue.slug,
          name: venue.name,
          address: venue.address,
          city: venue.city,
          country: venue.country,
          latitude: venue.latitude,
          longitude: venue.longitude,
          categories: venue.categories,
          approvedCount: venue.tagSummary.approvedCount,
          heatScore: venue.tagSummary.heatScore,
          lastTaggedAt: venue.tagSummary.lastTaggedAt,
          activeDareCount: venue.activeDares.length,
        });
        setSelectedPlaceActiveDares(venue.activeDares);
        setTargetCenter([venue.latitude, venue.longitude]);
        setTargetZoom(15);
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }
        console.error('[REAL_WORLD_MAP] Deep link place load failed:', error);
      }
    };

    void loadDeepLinkedPlace();

    return () => controller.abort();
  }, [deepLinkedPlaceSlug]);

  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (skipNextSearchRef.current) {
      skipNextSearchRef.current = false;
      setSearchResults([]);
      setSearching(false);
      return;
    }

    if (trimmed.length < 2) {
      setSearchResults([]);
      setSearching(false);
      return;
    }

    const controller = new AbortController();

    const timeout = setTimeout(async () => {
      try {
        setSearching(true);
        const response = await fetch(`/api/places/search?q=${encodeURIComponent(trimmed)}`, {
          signal: controller.signal,
        });
        const payload = (await response.json()) as SearchResponse;

        if (!response.ok || !payload.success || !payload.data?.results) {
          throw new Error('Failed to search places');
        }

        setSearchResults(payload.data.results);
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }
        console.error('[REAL_WORLD_MAP] Search failed:', error);
        setSearchResults([]);
      } finally {
        if (!controller.signal.aborted) {
          setSearching(false);
        }
      }
    }, 350);

    return () => {
      controller.abort();
      clearTimeout(timeout);
    };
  }, [searchQuery]);

  const fetchNearbyPlaces = useCallback(async (latitude: number, longitude: number, zoom: number) => {
    const requestId = ++nearbyFetchIdRef.current;
    try {
      const radiusMeters = getRadiusMetersForZoom(zoom);
      const url = new URL('/api/venues/nearby', window.location.origin);
      url.searchParams.set('lat', String(latitude));
      url.searchParams.set('lng', String(longitude));
      url.searchParams.set('radiusMeters', String(radiusMeters));
      url.searchParams.set('limit', '24');

      const response = await fetch(url.toString());
      const payload = (await response.json()) as NearbyResponse;

      if (!response.ok || !payload.success || !payload.data?.venues) {
        throw new Error('Failed to load nearby places');
      }

      const nextVenues = payload.data.venues;

      if (
        nextVenues.length === 0 &&
        autoLocateModeRef.current === 'auto' &&
        !autoLocateFallbackAppliedRef.current
      ) {
        autoLocateFallbackAppliedRef.current = true;
        autoLocateModeRef.current = 'idle';
        setTargetCenter(DEFAULT_CENTER);
        setTargetZoom(DEFAULT_ZOOM);
        return;
      }

      if (nextVenues.length > 0) {
        autoLocateModeRef.current = 'idle';
      }

      if (requestId === nearbyFetchIdRef.current) {
        setNearbyPlaces(nextVenues);
      }
    } catch (error) {
      console.error('[REAL_WORLD_MAP] Nearby places failed:', error);
    }
  }, []);

  const fetchNearbyDares = useCallback(async (latitude: number, longitude: number, zoom: number) => {
    const requestId = ++nearbyDareFetchIdRef.current;
    try {
      setNearbyDaresLoading(true);
      const radiusKm = Math.max(getDareRadiusKmForZoom(zoom), nearbyDareRadiusKm);
      const url = new URL('/api/dares/nearby', window.location.origin);
      url.searchParams.set('lat', String(latitude));
      url.searchParams.set('lng', String(longitude));
      url.searchParams.set('radius', String(radiusKm));
      url.searchParams.set('limit', '8');

      const response = await fetch(url.toString());
      const payload = (await response.json()) as NearbyDaresResponse;

      if (!response.ok || !payload.success || !payload.data?.dares) {
        throw new Error('Failed to load nearby dares');
      }

      if (requestId === nearbyDareFetchIdRef.current) {
        setNearbyDares(payload.data.dares);
      }
    } catch (error) {
      console.error('[REAL_WORLD_MAP] Nearby dares failed:', error);
      if (requestId === nearbyDareFetchIdRef.current) {
        setNearbyDares([]);
      }
    } finally {
      if (requestId === nearbyDareFetchIdRef.current) {
        setNearbyDaresLoading(false);
      }
    }
  }, [nearbyDareRadiusKm]);

  useEffect(() => {
    const source = userLocation ?? viewportCenter;
    if (!source) {
      return;
    }

    void fetchNearbyDares(source.latitude, source.longitude, mapZoom);
  }, [fetchNearbyDares, mapZoom, userLocation, viewportCenter]);

  const handleMapReady = useCallback((map: LeafletMap) => {
    mapInstanceRef.current = map;
    setMapReady(true);
  }, []);

  useEffect(() => {
    if (!mapReady || bootstrappedDefaultPins || nearbyPlaces.length > 0 || hasDeepLinkedPlace) {
      return;
    }

    setBootstrappedDefaultPins(true);
    void fetchNearbyPlaces(DEFAULT_CENTER[0], DEFAULT_CENTER[1], DEFAULT_ZOOM);
  }, [bootstrappedDefaultPins, fetchNearbyPlaces, hasDeepLinkedPlace, mapReady, nearbyPlaces.length]);

  const handleViewportChange = useCallback(
    (latitude: number, longitude: number, zoom: number) => {
      setViewportCenter({ latitude, longitude });
      setMapZoom(zoom);
      void fetchNearbyPlaces(latitude, longitude, zoom);
    },
    [fetchNearbyPlaces]
  );

  const handleMapClick = useCallback((latitude: number, longitude: number) => {
    setSelectedPlace({
      name: 'Dropped pin',
      address: `Custom spot · ${formatCoordinateLabel(latitude, longitude)}`,
      latitude,
      longitude,
      placeSource: 'MAP_DROP',
    });
  }, []);

  const focusExistingPlace = useCallback((place: NearbyPlace) => {
    setSelectedPlace({
      placeId: place.id,
      slug: place.slug,
      name: place.name,
      address: [place.city, place.country].filter(Boolean).join(', ') || place.description,
      city: place.city,
      country: place.country,
      latitude: place.latitude,
      longitude: place.longitude,
      categories: place.categories,
      approvedCount: place.tagSummary.approvedCount,
      heatScore: place.tagSummary.heatScore,
      lastTaggedAt: place.tagSummary.lastTaggedAt,
      activeDareCount: place.activeDareCount,
    });
    setTargetCenter([place.latitude, place.longitude]);
    setTargetZoom(15);
  }, []);

  const loadSelectedPlaceVenueDetail = useCallback(
    async (slug: string, signal?: AbortSignal, options?: { silent?: boolean }) => {
      const silent = options?.silent ?? false;

      try {
        if (!silent) {
          setSelectedPlaceActiveDaresLoading(true);
        }

        const response = await fetch(`/api/venues/${encodeURIComponent(slug)}`, { signal });
        const payload = (await response.json()) as VenueDetailResponse;

        if (!response.ok || !payload.success || !payload.data?.venue) {
          throw new Error('Failed to load place detail');
        }

        const { venue } = payload.data;
        setSelectedPlaceActiveDares(venue.activeDares);
        setSelectedPlaceFeaturedPaidActivation(venue.featuredPaidActivation);
        setSelectedPlace((current) => {
          if (!current) return current;
          if (current.slug && current.slug !== slug) return current;

          return {
            ...current,
            placeId: venue.id,
            slug: venue.slug,
            name: venue.name,
            address: venue.address,
            city: venue.city,
            country: venue.country,
            latitude: venue.latitude,
            longitude: venue.longitude,
            categories: venue.categories,
            approvedCount: venue.tagSummary.approvedCount,
            heatScore: venue.tagSummary.heatScore,
            lastTaggedAt: venue.tagSummary.lastTaggedAt,
            activeDareCount: venue.activeDares.length,
          };
        });
      } catch (error) {
        if (signal?.aborted) {
          return;
        }
        console.error('[REAL_WORLD_MAP] Place detail failed:', error);
        setSelectedPlaceActiveDares([]);
        setSelectedPlaceFeaturedPaidActivation(null);
      } finally {
        if (!silent && !signal?.aborted) {
          setSelectedPlaceActiveDaresLoading(false);
        }
      }
    },
    []
  );

  const loadSelectedPlaceTags = useCallback(
    async (placeId: string, signal?: AbortSignal, options?: { silent?: boolean }) => {
      const silent = options?.silent ?? false;

      try {
        if (!silent) {
          setSelectedPlaceTagsLoading(true);
        }
        setSelectedPlaceTagsError(null);

        const response = await fetch(`/api/places/${placeId}/tags`, {
          signal,
        });
        const payload = (await response.json()) as PlaceTagsResponse;

        if (!response.ok || !payload.success || !payload.data) {
          throw new Error('Failed to load place marks');
        }

        const nextApprovedCount = payload.data.approvedCount;
        const nextLastTaggedAt = payload.data.tags[0]?.submittedAt ?? null;

        setSelectedPlaceTags(payload.data.tags);
        setPendingPlaceTags((current) =>
          current.filter(
            (pendingTag) =>
              pendingTag.placeId !== placeId ||
              !payload.data?.tags.some((approvedTag) => approvedTag.id === pendingTag.tagId)
          )
        );
        setSelectedPlace((current) => {
          if (current?.placeId !== placeId) {
            return current;
          }

          const previousApprovedCount = current.approvedCount ?? 0;
          const hadPendingForPlace = pendingPlaceTagsRef.current.some((tag) => tag.placeId === placeId);

          if (nextApprovedCount > previousApprovedCount && hadPendingForPlace) {
            if (previousApprovedCount === 0 && nextApprovedCount === 1) {
              setCeremonyState({
                kind: 'first-spark',
                title: 'First spark unlocked',
                body: `${current.name} just became real place memory. This spot is alive now.`,
              });
            } else {
              setCeremonyState({
                kind: 'alive-upgrade',
                title: 'Place memory upgraded',
                body: `${current.name} just absorbed a new verified mark and its pulse climbed.`,
              });
            }
          }

          return {
            ...current,
            approvedCount: nextApprovedCount ?? current.approvedCount,
            heatScore: payload.data?.heatScore ?? current.heatScore,
            lastTaggedAt: nextLastTaggedAt ?? current.lastTaggedAt ?? null,
          };
        });
      } catch (error) {
        if (signal?.aborted) {
          return;
        }

        console.error('[REAL_WORLD_MAP] Place tags failed:', error);
        setSelectedPlaceTags([]);
        setSelectedPlaceTagsError('Unable to load recent marks right now.');
      } finally {
        if (!signal?.aborted && !silent) {
          setSelectedPlaceTagsLoading(false);
        }
      }
    },
    []
  );

  useEffect(() => {
    const placeId = selectedPlace?.placeId;

    if (!placeId) {
      setSelectedPlaceTags((current) => (current.length > 0 ? [] : current));
      setSelectedPlaceTagsLoading(false);
      setSelectedPlaceTagsError(null);
      setPendingPlaceTags((current) => (current.length > 0 ? [] : current));
      return;
    }

    const controller = new AbortController();
    void loadSelectedPlaceTags(placeId, controller.signal);

    return () => controller.abort();
  }, [loadSelectedPlaceTags, selectedPlace?.placeId]);

  useEffect(() => {
    const slug = selectedPlace?.slug;

    if (!slug) {
      setSelectedPlaceActiveDares((current) => (current.length > 0 ? [] : current));
      setSelectedPlaceFeaturedPaidActivation(null);
      setSelectedPlaceActiveDaresLoading(false);
      return;
    }

    const controller = new AbortController();
    void loadSelectedPlaceVenueDetail(slug, controller.signal, { silent: false });

    return () => controller.abort();
  }, [loadSelectedPlaceVenueDetail, selectedPlace?.slug]);

  const selectedPulse = useMemo(
    () => getPulse(selectedPlace?.approvedCount ?? 0, selectedPlace?.lastTaggedAt ?? null),
    [selectedPlace]
  );

  const selectedLastSpark = useMemo(
    () => getLastSparkLabel(selectedPlace?.lastTaggedAt ?? null),
    [selectedPlace]
  );

  const selectedPendingPlaceTags = useMemo(() => {
    if (!selectedPlace?.placeId) {
      return pendingPlaceTags;
    }

    return pendingPlaceTags.filter((tag) => tag.placeId === selectedPlace.placeId);
  }, [pendingPlaceTags, selectedPlace?.placeId]);

  const selectedVisualState = useMemo(
    () =>
      getPlaceVisualState({
        approvedCount: selectedPlace?.approvedCount ?? 0,
        lastTaggedAt: selectedPlace?.lastTaggedAt ?? null,
        pendingCount: selectedPendingPlaceTags.length,
      }),
    [selectedPendingPlaceTags.length, selectedPlace]
  );
  const selectedVisualCopy = useMemo(
    () => getPlaceVisualCopy(selectedVisualState),
    [selectedVisualState]
  );
  const selectedVenueTransformation = useMemo(
    () =>
      getVenueTransformationState({
        approvedCount: selectedPlace?.approvedCount ?? 0,
        heatScore: selectedPlace?.heatScore ?? 0,
        pendingCount: selectedPendingPlaceTags.length,
        lastTaggedAt: selectedPlace?.lastTaggedAt ?? null,
      }),
    [selectedPendingPlaceTags.length, selectedPlace]
  );

  const selectedPlaceDistanceMeters = useMemo(() => {
    if (!selectedPlace || !userLocation) {
      return null;
    }

    return calculateDistanceMeters(
      userLocation.latitude,
      userLocation.longitude,
      selectedPlace.latitude,
      selectedPlace.longitude
    );
  }, [selectedPlace, userLocation]);

  const firstMarkState = useMemo(() => {
    const approvedCount = selectedPlace?.approvedCount ?? 0;
    const pendingCount = selectedPendingPlaceTags.length;

    if (approvedCount <= 0 && pendingCount > 0) {
      return {
        label: 'First mark contested',
        className:
          'border-amber-300/35 bg-amber-500/[0.12] text-amber-100',
      };
    }

    if (approvedCount <= 0) {
      return {
        label: 'First mark open',
        className:
          'border-[#f5c518]/38 bg-[linear-gradient(180deg,rgba(245,197,24,0.18)_0%,rgba(168,85,247,0.12)_100%)] text-[#f8dd72]',
      };
    }

    if (approvedCount === 1) {
      return {
        label: 'First verified here',
        className:
          'border-[#f5c518]/35 bg-[#f5c518]/[0.12] text-[#f8dd72]',
      };
    }

    return null;
  }, [selectedPendingPlaceTags.length, selectedPlace?.approvedCount]);

  const proximityAccess = useMemo(() => {
    if (isCreatorSource || showBackToControl) {
      return {
        mode: 'unlocked' as const,
        canReveal: true,
        label: null as string | null,
      };
    }

    if (!selectedPlaceActiveDares.length) {
      return {
        mode: 'none' as const,
        canReveal: true,
        label: null as string | null,
      };
    }

    if (!userLocation) {
      return {
        mode: 'needs-location' as const,
        canReveal: false,
        label: 'Locate to start the hunt',
      };
    }

    if (selectedPlaceDistanceMeters !== null && selectedPlaceDistanceMeters <= PROXIMITY_REVEAL_METERS) {
      return {
        mode: 'unlocked' as const,
        canReveal: true,
        label: `Within ${PROXIMITY_REVEAL_METERS}m unlock radius`,
      };
    }

    if (
      selectedPlaceDistanceMeters !== null &&
      selectedPlaceDistanceMeters <= PROXIMITY_GHOST_METERS
    ) {
      return {
        mode: 'travel' as const,
        canReveal: false,
        label: `${formatDistanceMeters(selectedPlaceDistanceMeters)} · travel to unlock`,
      };
    }

    return {
      mode: 'preview' as const,
      canReveal: true,
      label:
        selectedPlaceDistanceMeters !== null ? formatDistanceMeters(selectedPlaceDistanceMeters) : null,
    };
  }, [
    isCreatorSource,
    selectedPlaceActiveDares.length,
    selectedPlaceDistanceMeters,
    showBackToControl,
    userLocation,
  ]);

  useEffect(() => {
    const placeId = selectedPlace?.placeId;
    if (!placeId || selectedPendingPlaceTags.length === 0) {
      return;
    }

    const interval = window.setInterval(() => {
      void loadSelectedPlaceTags(placeId, undefined, { silent: true });
    }, 12000);

    return () => window.clearInterval(interval);
  }, [loadSelectedPlaceTags, selectedPendingPlaceTags.length, selectedPlace?.placeId]);

  const nearbySummary = useMemo(() => {
    const activeCount = nearbyPlaces.filter((place) => place.tagSummary.approvedCount > 0).length;
    return {
      visible: nearbyPlaces.length,
      active: activeCount,
    };
  }, [nearbyPlaces]);

  const filteredNearbyPlaces = useMemo(() => {
    return nearbyPlaces.filter((place) => {
      if (pulseFilter === 'all') return true;
      if (pulseFilter === 'unmarked') return place.tagSummary.approvedCount <= 0;

      return (
        getPulse(place.tagSummary.approvedCount, place.tagSummary.lastTaggedAt) === pulseFilter
      );
    });
  }, [nearbyPlaces, pulseFilter]);

  const nearbyPlaceBySlug = useMemo(() => {
    const index = new Map<string, NearbyPlace>();
    nearbyPlaces.forEach((place) => {
      index.set(place.slug, place);
    });
    return index;
  }, [nearbyPlaces]);

  const nearbyDaresInRange = useMemo(
    () => nearbyDares.filter((dare) => dare.distanceKm <= nearbyDareRadiusKm),
    [nearbyDareRadiusKm, nearbyDares]
  );
  const nearbyDareFeed = useMemo(() => {
    const filtered = nearbyDaresInRange.filter((dare) => {
      if (nearbyDareFilter === 'all') return true;
      if (nearbyDareFilter === 'open') return dare.isOpenBounty;
      if (nearbyDareFilter === 'sentinel') return dare.requireSentinel;
      if (nearbyDareFilter === 'high') return dare.bounty >= 100;
      return true;
    });

    return filtered.slice(0, 4);
  }, [nearbyDareFilter, nearbyDaresInRange]);
  const nearbyDareCounts = useMemo(
    () => ({
      all: nearbyDaresInRange.length,
      open: nearbyDaresInRange.filter((dare) => dare.isOpenBounty).length,
      sentinel: nearbyDaresInRange.filter((dare) => dare.requireSentinel).length,
      high: nearbyDaresInRange.filter((dare) => dare.bounty >= 100).length,
    }),
    [nearbyDaresInRange]
  );
  const showNearbyDarePanel = nearbyDaresLoading || nearbyDares.length > 0;

  const filterCounts = useMemo(() => {
    const counts: Record<PulseFilter, number> = {
      all: nearbyPlaces.length,
      blazing: 0,
      igniting: 0,
      simmering: 0,
      unmarked: 0,
    };

    nearbyPlaces.forEach((place) => {
      const approvedCount = place.tagSummary.approvedCount;
      if (approvedCount <= 0) {
        counts.unmarked += 1;
        return;
      }

      const pulse = getPulse(approvedCount, place.tagSummary.lastTaggedAt);
      if (pulse === 'blazing' || pulse === 'igniting' || pulse === 'simmering') {
        counts[pulse] += 1;
      }
    });

    return counts;
  }, [nearbyPlaces]);

  const footprintTrail = useMemo(
    () =>
      footprintMarks.map((mark) => [mark.venue.latitude, mark.venue.longitude] as [number, number]),
    [footprintMarks]
  );

  const matchedVenueIndex = useMemo(() => {
    const index = new Map<
      string,
      {
        venueId: string;
        venueSlug: string;
        venueName: string;
        bestScore: number;
        reasons: string[];
        campaignCount: number;
        dareShortId: string | null;
      }
    >();

    creatorOpportunities.forEach((opportunity) => {
      if (!opportunity.venue?.slug) return;

      const current = index.get(opportunity.venue.slug);
      if (!current) {
        index.set(opportunity.venue.slug, {
          venueId: opportunity.venue.id,
          venueSlug: opportunity.venue.slug,
          venueName: opportunity.venue.name,
          bestScore: opportunity.matchScore,
          reasons: opportunity.matchReasons.slice(0, 3),
          campaignCount: 1,
          dareShortId: opportunity.linkedDare?.shortId ?? null,
        });
        return;
      }

      current.campaignCount += 1;
      if (opportunity.matchScore > current.bestScore) {
        current.bestScore = opportunity.matchScore;
        current.reasons = opportunity.matchReasons.slice(0, 3);
        current.dareShortId = opportunity.linkedDare?.shortId ?? current.dareShortId;
      }
    });

    return index;
  }, [creatorOpportunities]);

  const clusteredNearbyMarkers = useMemo<ClusteredNearbyMarker[]>(() => {
    if (filteredNearbyPlaces.length <= 1) {
      return filteredNearbyPlaces.map((place) => ({
        kind: 'place',
        key: place.id,
        place,
      }));
    }

    const roundedZoom = Math.max(0, Math.round(mapZoom));
    const cellSize = getClusterCellSize(roundedZoom);

    if (cellSize <= 0) {
      return filteredNearbyPlaces.map((place) => ({
        kind: 'place',
        key: place.id,
        place,
      }));
    }

    const buckets = new Map<string, NearbyPlace[]>();

    filteredNearbyPlaces.forEach((place) => {
      const point = CRS.EPSG3857.latLngToPoint(latLng(place.latitude, place.longitude), roundedZoom);
      const bucketX = Math.floor(point.x / cellSize);
      const bucketY = Math.floor(point.y / cellSize);
      const bucketKey = `${bucketX}:${bucketY}`;
      const existing = buckets.get(bucketKey);
      if (existing) {
        existing.push(place);
      } else {
        buckets.set(bucketKey, [place]);
      }
    });

    const markers: ClusteredNearbyMarker[] = [];

    Array.from(buckets.entries()).forEach(([bucketKey, places]) => {
      if (places.length === 1) {
        markers.push({
          kind: 'place',
          key: places[0].id,
          place: places[0],
        });
        return;
      }

      const dominantPlace = places.reduce((best, current) => {
        const bestScore =
          best.tagSummary.approvedCount * 1000 + best.activeDareCount * 100 + best.tagSummary.heatScore;
        const currentScore =
          current.tagSummary.approvedCount * 1000 + current.activeDareCount * 100 + current.tagSummary.heatScore;
        return currentScore > bestScore ? current : best;
      }, places[0]);
      const latitude = places.reduce((sum, place) => sum + place.latitude, 0) / places.length;
      const longitude = places.reduce((sum, place) => sum + place.longitude, 0) / places.length;
      const challengeLiveCount = places.reduce((sum, place) => sum + place.activeDareCount, 0);
      const matched = Boolean(
        showMatchedLayer && places.some((place) => matchedVenueIndex.has(place.slug))
      );

      markers.push({
        kind: 'cluster',
        key: `cluster:${bucketKey}`,
        latitude,
        longitude,
        count: places.length,
        pulse: getPulse(
          dominantPlace.tagSummary.approvedCount,
          dominantPlace.tagSummary.lastTaggedAt
        ),
        visualState: getPlaceVisualState({
          approvedCount: dominantPlace.tagSummary.approvedCount,
          lastTaggedAt: dominantPlace.tagSummary.lastTaggedAt,
        }),
        matched,
        challengeLiveCount,
      });
    });

    return markers;
  }, [filteredNearbyPlaces, mapZoom, matchedVenueIndex, showMatchedLayer]);

  const selectedPlaceNeedsDedicatedMarker = useMemo(() => {
    if (!selectedPlace) {
      return false;
    }

    return !clusteredNearbyMarkers.some((marker) => {
      if (marker.kind !== 'place') {
        return false;
      }

      const place = marker.place;
      if (selectedPlace.placeId && place.id === selectedPlace.placeId) {
        return true;
      }

      return (
        Math.abs(place.latitude - selectedPlace.latitude) < 0.000001 &&
        Math.abs(place.longitude - selectedPlace.longitude) < 0.000001
      );
    });
  }, [clusteredNearbyMarkers, selectedPlace]);

  const selectedPlaceFootprintStats = useMemo(() => {
    if (!selectedPlace) {
      return null;
    }

    const matchingMarks = footprintMarks.filter((mark) => {
      if (selectedPlace.placeId) {
        return mark.venue.id === selectedPlace.placeId;
      }

      return (
        Math.abs(mark.venue.latitude - selectedPlace.latitude) < 0.000001 &&
        Math.abs(mark.venue.longitude - selectedPlace.longitude) < 0.000001
      );
    });

    if (matchingMarks.length === 0) {
      return null;
    }

    return {
      totalMarks: matchingMarks.length,
      firstMarks: matchingMarks.filter((mark) => mark.firstMark).length,
      lastMarkedAt: matchingMarks[matchingMarks.length - 1]?.submittedAt ?? null,
    };
  }, [footprintMarks, selectedPlace]);

  const selectedPlaceMatch = useMemo(() => {
    if (!selectedPlace?.slug) {
      return null;
    }

    return matchedVenueIndex.get(selectedPlace.slug) ?? null;
  }, [matchedVenueIndex, selectedPlace?.slug]);

  const filterOptions: Array<{
    value: PulseFilter;
    label: string;
    accentClass: string;
  }> = [
    {
      value: 'all',
      label: 'All',
      accentClass: 'data-[active=true]:border-white/25 data-[active=true]:bg-white/[0.1] data-[active=true]:text-white',
    },
    {
      value: 'blazing',
      label: 'Blazing',
      accentClass: 'data-[active=true]:border-rose-300/45 data-[active=true]:bg-rose-500/[0.14] data-[active=true]:text-rose-100',
    },
    {
      value: 'igniting',
      label: 'Igniting',
      accentClass: 'data-[active=true]:border-cyan-300/45 data-[active=true]:bg-cyan-500/[0.14] data-[active=true]:text-cyan-100',
    },
    {
      value: 'simmering',
      label: 'Simmering',
      accentClass: 'data-[active=true]:border-amber-300/45 data-[active=true]:bg-amber-500/[0.14] data-[active=true]:text-amber-100',
    },
    {
      value: 'unmarked',
      label: 'Unmarked',
      accentClass: 'data-[active=true]:border-fuchsia-300/45 data-[active=true]:bg-fuchsia-500/[0.14] data-[active=true]:text-fuchsia-100',
    },
  ];
  const nearbyDareFilterOptions: Array<{
    value: NearbyDareFilter;
    label: string;
    count: number;
    accentClass: string;
  }> = [
    {
      value: 'all',
      label: 'All',
      count: nearbyDareCounts.all,
      accentClass:
        'data-[active=true]:border-white/20 data-[active=true]:bg-white/[0.08] data-[active=true]:text-white',
    },
    {
      value: 'open',
      label: 'Open',
      count: nearbyDareCounts.open,
      accentClass:
        'data-[active=true]:border-cyan-300/42 data-[active=true]:bg-cyan-500/[0.14] data-[active=true]:text-cyan-100',
    },
    {
      value: 'sentinel',
      label: 'Sentinel',
      count: nearbyDareCounts.sentinel,
      accentClass:
        'data-[active=true]:border-amber-300/42 data-[active=true]:bg-amber-500/[0.14] data-[active=true]:text-amber-100',
    },
    {
      value: 'high',
      label: '100+',
      count: nearbyDareCounts.high,
      accentClass:
        'data-[active=true]:border-fuchsia-300/42 data-[active=true]:bg-fuchsia-500/[0.14] data-[active=true]:text-fuchsia-100',
    },
  ];
  const nearbyRadiusOptions = [2, 5, 10, 20];

  const handleSpray = () => {
    setSprayBurst(false);
    window.requestAnimationFrame(() => {
      setSprayBurst(true);
      window.setTimeout(() => setSprayBurst(false), 640);
    });
  };

  const selectedPlaceMarkerIcon = useMemo(() => {
    if (!selectedPlace) {
      return null;
    }

    return createPeebearMarkerIcon({
      pulse: selectedPulse,
      approvedCount: selectedPlace.approvedCount ?? 0,
      heatScore: selectedPlace.heatScore ?? 0,
      active: true,
      visualState: selectedVisualState,
      challengeLiveCount: selectedPlace.activeDareCount ?? 0,
      matched: Boolean(showMatchedLayer && selectedPlaceMatch),
    });
  }, [selectedPlace, selectedPlaceMatch, selectedPulse, selectedVisualState, showMatchedLayer]);

  const mapPanelShellClass =
    'map-panel-shell relative overflow-hidden rounded-[32px] border border-white/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.09)_0%,rgba(255,255,255,0.04)_8%,rgba(8,10,18,0.955)_28%,rgba(5,6,14,0.99)_100%)] shadow-[0_28px_84px_rgba(0,0,0,0.5),0_0_28px_rgba(34,211,238,0.06),0_0_54px_rgba(168,85,247,0.06),inset_0_1px_0_rgba(255,255,255,0.14),inset_0_-16px_22px_rgba(0,0,0,0.22)] md:h-full md:rounded-[36px]';
  const mapPanelMetricClass =
    'rounded-[22px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06)_0%,rgba(11,13,22,0.94)_22%,rgba(6,7,14,0.99)_100%)] px-4 py-3 shadow-[0_16px_30px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.08),inset_0_-12px_18px_rgba(0,0,0,0.22)]';
  const mapPanelSectionClass =
    'map-panel-section rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.055)_0%,rgba(9,11,18,0.93)_18%,rgba(5,6,12,0.985)_100%)] px-4 py-4 shadow-[0_18px_34px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.07),inset_0_-14px_18px_rgba(0,0,0,0.22)]';
  const mapPanelInsetChipClass =
    'rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[10px] uppercase tracking-[0.18em] text-white/52 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),inset_0_-8px_12px_rgba(0,0,0,0.14)]';

  return (
    <section
      className={
        isImmersiveMobile
          ? 'fixed inset-0 z-[90] overflow-hidden bg-[rgba(4,5,14,0.98)] md:relative md:z-20 md:overflow-visible md:bg-transparent'
          : 'relative z-20 px-4 pb-20 pt-10 sm:px-6 sm:pb-24 sm:pt-12 md:px-10 md:pb-24 md:pt-12'
      }
    >
      <div className={isImmersiveMobile ? 'h-full w-full' : 'mx-auto max-w-7xl'}>
        {!isImmersiveMobile ? (
        <header className="relative mb-8 overflow-hidden rounded-[34px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06)_0%,rgba(9,7,19,0.96)_14%,rgba(5,4,14,0.97)_100%)] px-6 py-8 shadow-[0_24px_90px_rgba(0,0,0,0.5),0_0_34px_rgba(168,85,247,0.08),inset_0_1px_0_rgba(255,255,255,0.1),inset_0_-18px_24px_rgba(0,0,0,0.24)] sm:px-7 sm:py-10">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_0%,rgba(192,132,252,0.16),transparent_34%),radial-gradient(circle_at_88%_100%,rgba(34,211,238,0.14),transparent_36%)]" />
          <div className="relative">
            <div className="flex justify-start lg:absolute lg:left-0 lg:top-0">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#f5c518]/35 bg-[linear-gradient(180deg,rgba(250,204,21,0.16)_0%,rgba(250,204,21,0.05)_100%)] px-5 py-2 text-[10px] uppercase tracking-[0.22em] text-[#f5c518] shadow-[0_12px_24px_rgba(0,0,0,0.24),inset_0_1px_0_rgba(255,255,255,0.14),inset_0_-8px_14px_rgba(0,0,0,0.22)]">
                <LocateFixed className="h-3.5 w-3.5" />
                Tag the Grid
              </div>
            </div>

            <div className="mx-auto flex max-w-5xl flex-col items-center text-center">
              <div className="mt-8 inline-flex items-center gap-2 rounded-full border border-[#f5c518]/28 bg-[linear-gradient(180deg,rgba(250,204,21,0.14)_0%,rgba(250,204,21,0.04)_100%)] px-5 py-2 text-[10px] uppercase tracking-[0.24em] text-[#f5c518] shadow-[0_12px_24px_rgba(0,0,0,0.24),inset_0_1px_0_rgba(255,255,255,0.14),inset_0_-8px_14px_rgba(0,0,0,0.22)] sm:mt-2">
                <LocateFixed className="h-3.5 w-3.5" />
                First IRL Web3 Dare Network
              </div>

              <h1 className="mt-6 text-center text-5xl font-black leading-[0.9] tracking-[-0.05em] text-white sm:text-7xl lg:text-8xl">
                <span className="block text-white">The World Is</span>
                <span className="block text-[#f5c518]">Your Dare</span>
                <span className="block text-[#b87fff]">Ground</span>
              </h1>

              <p className="mt-5 max-w-3xl text-base text-white/62 sm:text-lg">
                Real venues. Crypto stakes. On-chain proof. Every pin is a legend.
              </p>

              <div className="mt-7 grid grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:justify-center lg:hidden">
                <div className="bd-dent-surface bd-dent-surface--soft rounded-[22px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05)_0%,rgba(7,10,18,0.94)_100%)] px-4 py-3">
                  <p className="text-[10px] uppercase tracking-[0.24em] text-white/38">Visible Places</p>
                  <p className="mt-2 text-2xl font-black text-white">{nearbySummary.visible}</p>
                </div>
                <div className="bd-dent-surface bd-dent-surface--soft rounded-[22px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05)_0%,rgba(7,10,18,0.94)_100%)] px-4 py-3">
                  <p className="text-[10px] uppercase tracking-[0.24em] text-white/38">Active Sparks</p>
                  <p className="mt-2 text-2xl font-black text-white">{nearbySummary.active}</p>
                </div>
              </div>
            </div>

            <div className="hidden lg:flex lg:absolute lg:right-0 lg:top-0">
              <div className="grid grid-cols-2 gap-3">
                <div className="bd-dent-surface bd-dent-surface--soft rounded-[22px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05)_0%,rgba(7,10,18,0.94)_100%)] px-4 py-3">
                  <p className="text-[10px] uppercase tracking-[0.24em] text-white/38">Visible Places</p>
                  <p className="mt-2 text-2xl font-black text-white">{nearbySummary.visible}</p>
                </div>
                <div className="bd-dent-surface bd-dent-surface--soft rounded-[22px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05)_0%,rgba(7,10,18,0.94)_100%)] px-4 py-3">
                  <p className="text-[10px] uppercase tracking-[0.24em] text-white/38">Active Sparks</p>
                  <p className="mt-2 text-2xl font-black text-white">{nearbySummary.active}</p>
                </div>
              </div>
            </div>
          </div>
        </header>
        ) : null}

        <div
          className={`relative overflow-hidden border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05)_0%,rgba(9,7,19,0.96)_18%,rgba(5,4,14,0.98)_100%)] shadow-[0_30px_120px_rgba(0,0,0,0.58),0_0_42px_rgba(34,211,238,0.08),inset_0_1px_0_rgba(255,255,255,0.1),inset_0_-18px_24px_rgba(0,0,0,0.26)] ${isImmersiveMobile ? 'fixed inset-0 z-[95] rounded-none border-0 shadow-none' : 'rounded-[38px]'}`}
          style={
            isImmersiveMobile
              ? {
                  paddingTop: 'env(safe-area-inset-top)',
                  paddingBottom: 'env(safe-area-inset-bottom)',
                }
              : undefined
          }
        >
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_0%,rgba(168,85,247,0.12),transparent_28%),radial-gradient(circle_at_85%_100%,rgba(34,211,238,0.12),transparent_30%)]" />

          <div className="relative z-20 flex flex-col gap-3 border-b border-white/8 px-4 py-3 sm:px-5 sm:py-3.5">
            <div className="relative w-full max-w-xl">
              <div className="bd-dent-surface bd-dent-surface--soft flex items-center gap-3 rounded-[22px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06)_0%,rgba(8,9,16,0.94)_100%)] px-4 py-2.5">
                <Search className="h-4 w-4 text-cyan-200" />
                <input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  onBlur={() => {
                    window.setTimeout(() => {
                      setSearchResults([]);
                    }, 120);
                  }}
                  placeholder="Search any place or address..."
                  className="w-full bg-transparent text-sm text-white placeholder:text-white/30 focus:outline-none"
                />
                {searching ? <Loader2 className="h-4 w-4 animate-spin text-white/45" /> : null}
              </div>

              {searchResults.length > 0 ? (
                <div className="absolute left-0 right-0 top-[calc(100%+10px)] z-40 overflow-hidden rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(14,16,26,0.98)_0%,rgba(7,8,16,0.98)_100%)] shadow-[0_24px_60px_rgba(0,0,0,0.45)]">
                  {searchResults.map((result) => (
                    <button
                      key={result.id}
                      type="button"
                      onClick={() => {
                        skipNextSearchRef.current = true;
                        setSearchQuery(result.name);
                        setSearchResults([]);
                        setSearching(false);
                        setSelectedPlace({
                          placeId: result.placeId,
                          slug: result.slug,
                          name: result.name,
                          address: result.address,
                          city: result.city,
                          country: result.country,
                          latitude: result.latitude,
                          longitude: result.longitude,
                          categories: undefined,
                          placeSource: result.placeSource,
                          externalPlaceId: result.externalPlaceId,
                          approvedCount:
                            result.placeSource === 'BASEDARE_VENUE'
                              ? (result.approvedCount ?? 0)
                              : undefined,
                          heatScore:
                            result.placeSource === 'BASEDARE_VENUE'
                              ? (result.approvedCount ?? 0)
                              : undefined,
                          lastTaggedAt: result.lastTaggedAt ?? null,
                          activeDareCount: result.activeDareCount ?? 0,
                        });
                        setTargetCenter([result.latitude, result.longitude]);
                        setTargetZoom(15);
                        if (result.slug) {
                          void loadSelectedPlaceVenueDetail(result.slug, undefined, { silent: false });
                        }
                      }}
                      className="flex w-full items-start gap-3 border-b border-white/6 px-4 py-3 text-left transition hover:bg-white/[0.05] last:border-b-0"
                    >
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-cyan-200" />
                      <div>
                        <p className="text-sm font-semibold text-white">{result.name}</p>
                        <p className="mt-1 text-xs text-white/45">{result.displayName}</p>
                      </div>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="flex flex-col gap-2.5 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex flex-col gap-2.5">
                <div className="flex flex-wrap gap-2">
                  {filterOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      data-active={pulseFilter === option.value}
                      onClick={() => setPulseFilter(option.value)}
                      className={`inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/52 shadow-[0_10px_18px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.06)] transition hover:-translate-y-[1px] hover:border-white/18 hover:text-white ${option.accentClass}`}
                    >
                      <span>{option.label}</span>
                      <span className="rounded-full border border-white/10 bg-black/20 px-2 py-0.5 text-[10px] text-white/62">
                        {filterCounts[option.value]}
                      </span>
                    </button>
                  ))}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="inline-flex items-center gap-2 px-1.5 text-[10px] font-semibold uppercase tracking-[0.28em] text-[#f8dd72]/78">
                    <span className="h-px w-4 rounded-full bg-[#f5c518]/70" />
                    <span>View mode</span>
                  </div>
                  {MAP_PRESET_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      data-active={mapPreset === option.value}
                      onClick={() => setMapPreset(option.value)}
                      className={`inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/52 shadow-[0_10px_18px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.06)] transition hover:-translate-y-[1px] hover:border-white/18 hover:text-white ${option.accentClass}`}
                    >
                      <span className={`h-2 w-2 rounded-full ${
                        option.value === 'classic'
                          ? 'bg-[#f5c518]'
                          : 'bg-white/70'
                      }`} />
                      <span>{option.label}</span>
                    </button>
                  ))}
                </div>

                {isConnected ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="inline-flex items-center gap-2 px-1.5 text-[10px] font-semibold uppercase tracking-[0.28em] text-[#e3c8ff]/78">
                      <span className="h-px w-4 rounded-full bg-[#b87fff]/75" />
                      <span>Creator lens</span>
                    </div>
                    <button
                      type="button"
                      data-active={showFootprintLayer}
                      onClick={() => setShowFootprintLayer((current) => !current)}
                      className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/52 shadow-[0_10px_18px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.06)] transition hover:-translate-y-[1px] hover:border-white/18 hover:text-white data-[active=true]:border-[#b87fff]/46 data-[active=true]:bg-[#b87fff]/[0.14] data-[active=true]:text-[#edd8ff]"
                    >
                      <span className="h-2 w-2 rounded-full bg-[#b87fff]" />
                      <span>My Footprint</span>
                      <span className="rounded-full border border-white/10 bg-black/20 px-2 py-0.5 text-[10px] text-white/62">
                        {footprintStats?.totalMarks ?? footprintMarks.length}
                      </span>
                    </button>
                    <button
                      type="button"
                      data-active={showMatchedLayer}
                      onClick={() => setShowMatchedLayer((current) => !current)}
                      className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/52 shadow-[0_10px_18px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.06)] transition hover:-translate-y-[1px] hover:border-white/18 hover:text-white data-[active=true]:border-cyan-300/46 data-[active=true]:bg-cyan-500/[0.14] data-[active=true]:text-cyan-100"
                    >
                      <span className="h-2 w-2 rounded-full bg-cyan-300" />
                      <span>Matched For You</span>
                      <span className="rounded-full border border-white/10 bg-black/20 px-2 py-0.5 text-[10px] text-white/62">
                        {matchedVenueIndex.size}
                      </span>
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <div
            ref={mapViewportRef}
            data-map-preset={mapPreset}
            className={`map-container-wrapper basedare-leaflet-map basedare-leaflet-map--${mapPreset} relative overflow-hidden ${isImmersiveMobile ? 'h-[calc(100dvh-172px)] min-h-0' : 'h-[68vh] min-h-[560px]'}`}
          >
            <MapContainer
              center={DEFAULT_CENTER}
              zoom={DEFAULT_ZOOM}
              zoomControl={false}
              attributionControl={true}
              className="absolute inset-0 z-0"
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              <MapController
                targetCenter={targetCenter}
                targetZoom={targetZoom}
                onReady={handleMapReady}
                onViewportChange={handleViewportChange}
                onMapClick={handleMapClick}
              />

              {clusteredNearbyMarkers.map((marker) => {
                if (marker.kind === 'cluster') {
                  return (
                    <Marker
                      key={marker.key}
                      position={[marker.latitude, marker.longitude]}
                      icon={createPlaceClusterIcon({
                        count: marker.count,
                        pulse: marker.pulse,
                        visualState: marker.visualState,
                        matched: marker.matched,
                        challengeLiveCount: marker.challengeLiveCount,
                      })}
                      zIndexOffset={280}
                      eventHandlers={{
                        click: () => {
                          setTargetCenter([marker.latitude, marker.longitude]);
                          setTargetZoom(Math.min(Math.max(Math.round(mapZoom) + 2, 14), 16));
                        },
                      }}
                    />
                  );
                }

                const place = marker.place;
                const pulse = getPulse(place.tagSummary.approvedCount, place.tagSummary.lastTaggedAt);
                const visualState = getPlaceVisualState({
                  approvedCount: place.tagSummary.approvedCount,
                  lastTaggedAt: place.tagSummary.lastTaggedAt,
                });
                const isActive = selectedPlace?.placeId === place.id;
                const isMatchedVenue = showMatchedLayer && matchedVenueIndex.has(place.slug);

                return (
                  <Marker
                    key={place.id}
                    position={[place.latitude, place.longitude]}
                    icon={createPeebearMarkerIcon({
                      pulse,
                      approvedCount: place.tagSummary.approvedCount,
                      heatScore: place.tagSummary.heatScore,
                      active: isActive,
                      visualState,
                      challengeLiveCount: place.activeDareCount,
                      matched: isMatchedVenue,
                    })}
                    zIndexOffset={isActive ? 600 : 240}
                    eventHandlers={{
                      click: () => focusExistingPlace(place),
                    }}
                  />
                );
              })}

              {showFootprintLayer && footprintTrail.length > 1 ? (
                <Polyline
                  positions={footprintTrail}
                  pathOptions={{
                    color: '#b87fff',
                    weight: 3,
                    opacity: 0.28,
                    dashArray: '8 12',
                    lineCap: 'round',
                    lineJoin: 'round',
                  }}
                />
              ) : null}

              {showFootprintLayer && footprintMarks.map((mark, index) => (
                <Marker
                  key={mark.id}
                  position={[mark.venue.latitude, mark.venue.longitude]}
                  icon={createFootprintMarkerIcon({
                    firstMark: mark.firstMark,
                    latest: index === footprintMarks.length - 1,
                  })}
                  zIndexOffset={index === footprintMarks.length - 1 ? 380 : 260}
                  eventHandlers={{
                    click: () => {
                      focusExistingPlace({
                        id: mark.venue.id,
                        slug: mark.venue.slug,
                        name: mark.venue.name,
                        description: mark.venue.address,
                        city: mark.venue.city,
                        country: mark.venue.country,
                        latitude: mark.venue.latitude,
                        longitude: mark.venue.longitude,
                        categories: mark.venue.categories,
                        distanceDisplay: '',
                        tagSummary: {
                          approvedCount: 0,
                          heatScore: 0,
                          lastTaggedAt: mark.submittedAt,
                        },
                        activeDareCount: 0,
                      });
                    },
                  }}
                />
              ))}

              {selectedPlace && selectedPlaceNeedsDedicatedMarker && selectedPlaceMarkerIcon ? (
                <Marker
                  position={[selectedPlace.latitude, selectedPlace.longitude]}
                  icon={selectedPlaceMarkerIcon}
                  zIndexOffset={720}
                  eventHandlers={{
                    click: () => {
                      setTargetCenter([selectedPlace.latitude, selectedPlace.longitude]);
                      setTargetZoom(15);
                    },
                  }}
                />
              ) : null}
            </MapContainer>

            <div className="preset-atmosphere pointer-events-none absolute inset-0 z-[2]" />
            <div className="network-mesh pointer-events-none absolute inset-0 z-[3]" />
            <div className="network-links pointer-events-none absolute inset-0 z-[4]" />
            <div className="starfield pointer-events-none absolute inset-0 z-[5]" />
            <div className="scanlines pointer-events-none absolute inset-0 z-[6]" />
            <div className="glass-haze pointer-events-none absolute inset-0 z-[7]" />
            {showFootprintLayer && footprintMarks.length > 0 ? (
              <div
                className={`pointer-events-none absolute left-3 z-[10] rounded-full border border-[#b87fff]/28 bg-[linear-gradient(180deg,rgba(184,127,255,0.18)_0%,rgba(16,10,28,0.88)_100%)] px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[0.18em] text-[#e5c7ff] shadow-[0_10px_18px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.08)] md:left-5 md:text-[10px] ${showNearbyDarePanel ? nearbyDarePanelCollapsed ? 'bottom-[4.75rem] md:bottom-[6.4rem]' : 'bottom-[16.25rem] md:bottom-[18.9rem]' : 'bottom-3 md:bottom-5'}`}
              >
                Your trace · {footprintMarks.length} verified marks
              </div>
            ) : null}
            {showNearbyDarePanel ? (
              <div className="absolute bottom-3 left-3 right-3 z-[10] max-w-[23rem] overflow-hidden rounded-[24px] border border-[#f5c518]/18 bg-[linear-gradient(180deg,rgba(255,255,255,0.08)_0%,rgba(10,12,22,0.94)_18%,rgba(5,6,12,0.985)_100%)] shadow-[0_20px_40px_rgba(0,0,0,0.34),0_0_22px_rgba(245,197,24,0.08),inset_0_1px_0_rgba(255,255,255,0.08),inset_0_-16px_20px_rgba(0,0,0,0.22)] md:bottom-5 md:left-5 md:right-auto">
                <div className="border-b border-white/8 px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#f5c518]">
                        Nearby Live Missions
                      </p>
                      <p className="mt-1 text-[11px] text-white/55">
                        {userLocation ? 'Closest live dares around you' : 'Live dares in this map view'}
                      </p>
                    </div>
                    <div className="rounded-full border border-[#f5c518]/20 bg-[#f5c518]/[0.08] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#f8dd72]">
                      {nearbyDaresLoading ? 'scanning' : `${nearbyDareFeed.length} live`}
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <div className="flex flex-wrap gap-2">
                      {nearbyDareFilterOptions.map((option) => (
                        <button
                          key={`nearby-dare-filter:${option.value}`}
                          type="button"
                          data-active={nearbyDareFilter === option.value}
                          onClick={() => setNearbyDareFilter(option.value)}
                          className={`inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/52 transition hover:border-white/16 hover:text-white ${option.accentClass}`}
                        >
                          <span>{option.label}</span>
                          <span className="rounded-full border border-white/10 bg-black/20 px-1.5 py-0.5 text-[9px] text-white/62">
                            {option.count}
                          </span>
                        </button>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => setNearbyDarePanelCollapsed((current) => !current)}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white/58 transition hover:border-white/16 hover:text-white"
                      aria-label={nearbyDarePanelCollapsed ? 'Expand nearby dare panel' : 'Collapse nearby dare panel'}
                    >
                      {nearbyDarePanelCollapsed ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/38">
                      Radius
                    </span>
                    {nearbyRadiusOptions.map((radius) => (
                      <button
                        key={`nearby-radius:${radius}`}
                        type="button"
                        data-active={nearbyDareRadiusKm === radius}
                        onClick={() => setNearbyDareRadiusKm(radius)}
                        className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/52 transition hover:border-white/16 hover:text-white data-[active=true]:border-[#f5c518]/32 data-[active=true]:bg-[#f5c518]/[0.12] data-[active=true]:text-[#f8dd72]"
                      >
                        {radius}km
                      </button>
                    ))}
                  </div>
                </div>
                {!nearbyDarePanelCollapsed ? (
                <div className="px-2 py-2">
                  {nearbyDaresLoading ? (
                    <div className="px-3 py-5 text-center text-[11px] uppercase tracking-[0.18em] text-white/45">
                      Scanning nearby dares...
                    </div>
                  ) : (
                    nearbyDareFeed.length > 0 ? (
                    nearbyDareFeed.map((dare) => {
                      const matchingPlace = dare.venueSlug ? nearbyPlaceBySlug.get(dare.venueSlug) : null;

                      return (
                        <div
                          key={`nearby-dare:${dare.id}`}
                          className="flex items-center justify-between gap-3 rounded-[18px] border border-transparent px-3 py-2 transition hover:border-white/10 hover:bg-white/[0.04]"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start gap-2">
                              <span className="mt-1 inline-flex h-2.5 w-2.5 shrink-0 rounded-full bg-[#f5c518] shadow-[0_0_12px_rgba(245,197,24,0.45)]" />
                              <div className="min-w-0">
                                <p className="truncate text-[13px] font-semibold text-white">{dare.title}</p>
                                <p className="mt-1 truncate text-[11px] text-white/48">
                                  {dare.distanceDisplay}
                                  {dare.locationLabel ? ` · ${dare.locationLabel}` : ''}
                                </p>
                              </div>
                            </div>
                            <div className="mt-2 flex flex-wrap items-center gap-2 pl-[18px]">
                              <div className="rounded-full border border-[#f5c518]/18 bg-[#f5c518]/[0.08] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#f8dd72]">
                                {dare.bounty} USDC
                              </div>
                              {dare.streamerHandle ? (
                                <div className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/62">
                                  {dare.streamerHandle}
                                </div>
                              ) : (
                                <div className="rounded-full border border-cyan-300/18 bg-cyan-500/[0.08] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-cyan-100">
                                  Open
                                </div>
                              )}
                              <SentinelBadge
                                requireSentinel={dare.requireSentinel}
                                sentinelVerified={dare.sentinelVerified}
                              />
                            </div>
                          </div>
                          <div className="flex shrink-0 flex-col items-end gap-2">
                            {matchingPlace ? (
                              <button
                                type="button"
                                onClick={() => focusExistingPlace(matchingPlace)}
                                className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/72 transition hover:border-white/16 hover:text-white"
                              >
                                Venue
                              </button>
                            ) : null}
                            <Link
                              href={dare.shortId ? `/dare/${dare.shortId}` : '/dares'}
                              className="rounded-full border border-[#f5c518]/20 bg-[#f5c518]/[0.08] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#f8dd72] transition hover:border-[#f5c518]/34 hover:bg-[#f5c518]/[0.14]"
                            >
                              Open
                            </Link>
                          </div>
                        </div>
                      );
                    })
                    ) : (
                      <div className="px-3 py-5 text-center text-[11px] uppercase tracking-[0.18em] text-white/45">
                        No nearby dares match this filter in {nearbyDareRadiusKm}km
                      </div>
                    )
                  )}
                </div>
                ) : (
                  <div className="px-4 py-3 text-[11px] text-white/48">
                    {nearbyDaresLoading
                      ? 'Scanning nearby dares...'
                      : nearbyDareFeed.length > 0
                        ? `${nearbyDareFeed[0].title}`
                        : `No nearby dares match this filter in ${nearbyDareRadiusKm}km`}
                  </div>
                )}
              </div>
            ) : null}
            <div className="absolute left-5 top-6 z-[9] hidden md:flex flex-col gap-2">
              <button
                type="button"
                onClick={requestApproximateLocation}
                disabled={locating}
                className="flex h-11 w-11 items-center justify-center rounded-full border border-cyan-300/24 bg-[linear-gradient(180deg,rgba(34,211,238,0.16)_0%,rgba(8,12,20,0.92)_100%)] text-cyan-100 shadow-[0_14px_26px_rgba(0,0,0,0.32),inset_0_1px_0_rgba(255,255,255,0.08)] transition hover:-translate-y-[1px] hover:border-cyan-200/38 hover:bg-cyan-500/[0.16] disabled:cursor-wait disabled:opacity-70"
                aria-label={locating ? 'Locating current position' : 'Center map near my location'}
                title={locating ? 'Locating...' : 'Locate me'}
              >
                {locating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <LocateFixed className="h-4 w-4" />
                )}
              </button>
              <div className="overflow-hidden rounded-[22px] border border-white/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.08)_0%,rgba(10,10,20,0.92)_100%)] shadow-[0_14px_30px_rgba(0,0,0,0.34),inset_0_1px_0_rgba(255,255,255,0.08)]">
                <button
                  type="button"
                  onClick={() => mapInstanceRef.current?.zoomIn()}
                  className="flex h-11 w-11 items-center justify-center border-b border-white/10 text-white/82 transition hover:bg-white/[0.08] hover:text-white"
                  aria-label="Zoom in"
                  title="Zoom in"
                >
                  <Plus className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => mapInstanceRef.current?.zoomOut()}
                  className="flex h-11 w-11 items-center justify-center text-white/82 transition hover:bg-white/[0.08] hover:text-white"
                  aria-label="Zoom out"
                  title="Zoom out"
                >
                  <Minus className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className={`spray-burst ${sprayBurst ? 'bang' : ''}`} />
            <button onClick={handleSpray} className="spray-can hidden md:flex" aria-label="Spray map easter egg">
              <Image
                src="/assets/bare-paint-can.png"
                alt="Bare Paint spray can"
                width={88}
                height={88}
                className="h-auto w-full"
              />
            </button>
            <MapCrosshair
              containerRef={mapViewportRef}
              horizontalColor="rgba(184, 127, 255, 0.82)"
              verticalColor="rgba(245, 197, 24, 0.82)"
            />

            {!mapReady ? (
              <div className="absolute inset-0 z-20 flex items-center justify-center bg-[rgba(3,5,12,0.74)] backdrop-blur-sm">
                <div className="flex flex-col items-center gap-4 text-center">
                  <Loader2 className="h-10 w-10 animate-spin text-cyan-200" />
                  <div>
                    <p className="text-sm uppercase tracking-[0.28em] text-cyan-200/80">Loading grid</p>
                    <p className="mt-2 text-sm text-white/55">Spinning up the first open place-memory canvas.</p>
                  </div>
                </div>
              </div>
            ) : null}

            {selectedPlace ? (
              <div className="selected-place-panel-wrap absolute bottom-4 left-1/2 z-30 w-[min(calc(100%-1rem),24rem)] -translate-x-1/2 md:left-auto md:translate-x-0">
                <div className={`${mapPanelShellClass} place-panel-popup`}>
                  <div className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-white/24 to-transparent" />
                  <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_16%_0%,rgba(34,211,238,0.13),transparent_26%),radial-gradient(circle_at_85%_100%,rgba(168,85,247,0.12),transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.04)_0%,transparent_32%,transparent_72%,rgba(0,0,0,0.16)_100%)]" />
                  <div className="pointer-events-none absolute inset-[1px] rounded-[31px] border border-white/6 md:rounded-[35px]" />
                  <div className="flex max-h-[52dvh] flex-col overflow-hidden md:h-full md:max-h-none">
                  <div className="sticky top-0 z-10 rounded-t-[32px] border-b border-white/8 bg-[rgba(7,9,18,0.9)] px-4 pb-4 pt-3 backdrop-blur-xl md:rounded-t-[36px] md:border-b-0 md:bg-[linear-gradient(180deg,rgba(255,255,255,0.055)_0%,rgba(7,9,18,0.88)_40%,rgba(7,9,18,0.62)_100%)] md:px-5 md:pb-4 md:pt-4">
                    <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-white/15 md:hidden" />
                  <div className="flex items-start justify-between gap-5">
                    <div className="min-w-0 flex-1">
                      {showBackToControl ? (
                        <div className="mb-3">
                          <Link
                            href="/brands/portal"
                            className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.05] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/62 transition hover:border-white/18 hover:bg-white/[0.08] hover:text-white"
                          >
                            <ArrowLeft className="h-3 w-3" />
                            Back to Control
                          </Link>
                        </div>
                      ) : isCreatorSource ? (
                        <div className="mb-3">
                          <Link
                            href="/dashboard"
                            className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.05] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/62 transition hover:border-white/18 hover:bg-white/[0.08] hover:text-white"
                          >
                            <ArrowLeft className="h-3 w-3" />
                            Back to Dashboard
                          </Link>
                        </div>
                      ) : null}
                      <h3 className="max-w-[14rem] text-[1.85rem] font-black leading-[0.94] tracking-tight text-white md:max-w-[16rem] md:text-[2.15rem]">
                        {selectedPlace.name}
                      </h3>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        {firstMarkState ? (
                          <span
                            className={`rounded-full border px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.22em] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] ${firstMarkState.className}`}
                          >
                            {firstMarkState.label}
                          </span>
                        ) : null}
                        <span
                          className={`rounded-full border px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.22em] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] ${
                            selectedVisualState === 'hot'
                              ? 'border-rose-300/35 bg-rose-500/[0.12] text-rose-100'
                              : selectedVisualState === 'active'
                                ? 'border-cyan-300/35 bg-cyan-500/[0.12] text-cyan-100'
                                : selectedVisualState === 'first-mark'
                                  ? 'border-[#f5c518]/35 bg-[#f5c518]/[0.12] text-[#f8dd72]'
                                  : selectedVisualState === 'pending'
                                    ? 'border-amber-300/30 bg-amber-500/[0.12] text-amber-100'
                                    : 'border-white/12 bg-white/[0.05] text-white/60'
                          }`}
                        >
                          {selectedVisualCopy.label}
                        </span>
                        {proximityAccess.label ? (
                          <span className="rounded-full border border-white/12 bg-white/[0.05] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/62 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                            {proximityAccess.label}
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-2.5 max-w-[15rem] text-sm leading-relaxed text-white/58 md:max-w-[17rem]">
                        {selectedPlace.address || formatCoordinateLabel(selectedPlace.latitude, selectedPlace.longitude)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedPlace(null)}
                      className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.08)_0%,rgba(8,9,16,0.82)_100%)] text-white/70 shadow-[0_12px_24px_rgba(0,0,0,0.24),inset_0_1px_0_rgba(255,255,255,0.1),inset_0_-10px_16px_rgba(0,0,0,0.2)] transition hover:-translate-y-[1px] hover:border-white/18 hover:text-white"
                      aria-label="Close place panel"
                      title="Close place panel"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  </div>

                  <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 md:px-5 md:pb-6">

                  {ceremonyState ? (
                    <div
                      className={`map-panel-section mt-1 rounded-[22px] border px-4 py-3.5 shadow-[0_18px_36px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.07)] ${
                        ceremonyState.kind === 'pending'
                          ? 'border-amber-300/18 bg-amber-500/[0.08]'
                          : ceremonyState.kind === 'first-spark'
                            ? 'border-[#f5c518]/24 bg-[linear-gradient(180deg,rgba(245,197,24,0.14)_0%,rgba(168,85,247,0.12)_100%)]'
                            : 'border-cyan-300/22 bg-cyan-500/[0.08]'
                      }`}
                    >
                      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/70">
                        {ceremonyState.title}
                      </p>
                      <p className="mt-2 text-sm text-white/78">{ceremonyState.body}</p>
                    </div>
                  ) : null}

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className={`${mapPanelMetricClass} stat-card bd-dent-surface bd-dent-surface--soft`}>
                      <p className="text-[10px] uppercase tracking-[0.24em] text-white/35">Sparks</p>
                      <p className="mt-2 text-[1.65rem] font-black leading-none text-white">{selectedPlace.approvedCount ?? 0}</p>
                    </div>
                    <div className={`${mapPanelMetricClass} stat-card bd-dent-surface bd-dent-surface--soft`}>
                      <p className="text-[10px] uppercase tracking-[0.24em] text-white/35">Heat</p>
                      <p className="mt-2 text-[1.65rem] font-black leading-none text-white">{selectedPlace.heatScore ?? 0}</p>
                    </div>
                  </div>

                  <div className="map-panel-section mt-4 rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05)_0%,rgba(9,11,20,0.92)_16%,rgba(6,7,12,0.98)_100%)] px-4 py-3.5 shadow-[0_18px_36px_rgba(0,0,0,0.16),inset_0_1px_0_rgba(255,255,255,0.06),inset_0_-14px_18px_rgba(0,0,0,0.18)]">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.24em] text-white/40">
                        <Sparkles className="h-3.5 w-3.5 text-[#f5c518]" />
                        Venue State
                      </div>
                      <span
                        className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] ${selectedVenueTransformation.className}`}
                      >
                        {selectedVenueTransformation.label}
                      </span>
                    </div>
                    <p className="mt-3 text-sm leading-relaxed text-white/74">
                      {selectedVenueTransformation.description}
                    </p>
                    <div className="mt-4 grid grid-cols-5 gap-1.5">
                      {Array.from({ length: 5 }).map((_, index) => {
                        const active = index < selectedVenueTransformation.level;
                        return (
                          <span
                            key={`venue-stage-${index}`}
                            className={`h-2.5 rounded-full border border-white/10 transition ${
                              active
                                ? `bg-gradient-to-r ${selectedVenueTransformation.activeBarClass}`
                                : 'bg-white/[0.04] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]'
                            }`}
                            aria-hidden="true"
                          />
                        );
                      })}
                    </div>
                  </div>

                  {selectedPlaceFootprintStats ? (
                    <div className="map-panel-section mt-4 rounded-[24px] border border-fuchsia-300/18 bg-[linear-gradient(180deg,rgba(168,85,247,0.14)_0%,rgba(10,10,18,0.82)_22%,rgba(5,6,12,0.98)_100%)] px-4 py-3.5 shadow-[0_18px_36px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.07),inset_0_-14px_18px_rgba(0,0,0,0.22)]">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.24em] text-fuchsia-100/82">
                          <Sparkles className="h-3.5 w-3.5 text-fuchsia-200" />
                          Your History Here
                        </div>
                        <span className="rounded-full border border-fuchsia-300/18 bg-fuchsia-500/[0.08] px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-fuchsia-100">
                          personal trace
                        </span>
                      </div>
                      <p className="mt-3 text-sm text-white/72">
                        You&apos;ve left {selectedPlaceFootprintStats.totalMarks} verified {selectedPlaceFootprintStats.totalMarks === 1 ? 'mark' : 'marks'} here
                        {selectedPlaceFootprintStats.firstMarks > 0
                          ? ` and ignited ${selectedPlaceFootprintStats.firstMarks} ${selectedPlaceFootprintStats.firstMarks === 1 ? 'first spark' : 'first sparks'}`
                          : ''}
                        .
                      </p>
                      {selectedPlaceFootprintStats.lastMarkedAt ? (
                        <p className="mt-2 text-[11px] uppercase tracking-[0.18em] text-white/42">
                          Last moved {getLastSparkLabel(selectedPlaceFootprintStats.lastMarkedAt).replace('Last spark ', '')}
                        </p>
                      ) : null}
                    </div>
                  ) : null}

                  {selectedPlaceMatch && showMatchedLayer ? (
                    <div className="map-panel-section mt-4 rounded-[24px] border border-cyan-300/20 bg-[linear-gradient(180deg,rgba(34,211,238,0.12)_0%,rgba(10,10,18,0.82)_20%,rgba(5,6,12,0.98)_100%)] px-4 py-3.5 shadow-[0_18px_36px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.07),inset_0_-14px_18px_rgba(0,0,0,0.22)]">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.24em] text-cyan-100/82">
                          <Sparkles className="h-3.5 w-3.5 text-cyan-200" />
                          Matched For You
                        </div>
                        <span className="rounded-full border border-cyan-300/18 bg-cyan-500/[0.08] px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-cyan-100">
                          {selectedPlaceMatch.campaignCount} live
                        </span>
                      </div>
                      <p className="mt-3 text-sm text-white/76">
                        This venue already fits your creator footprint. The grid is routing you toward a place where your history gives you an edge.
                      </p>
                      {selectedPlaceMatch.reasons.length > 0 ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {selectedPlaceMatch.reasons.map((reason) => (
                            <span
                              key={`${selectedPlaceMatch.venueSlug}-${reason}`}
                              className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] text-white/48"
                            >
                              {reason}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ) : null}

                  {isCreatorSource && focusedCreatorActivation ? (
                    <div className="map-panel-section mt-4 rounded-[24px] border border-cyan-300/20 bg-[linear-gradient(180deg,rgba(34,211,238,0.12)_0%,rgba(10,10,18,0.82)_20%,rgba(5,6,12,0.98)_100%)] px-4 py-3.5 shadow-[0_18px_36px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.07),inset_0_-14px_18px_rgba(0,0,0,0.22)]">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.24em] text-cyan-100/82">
                          <Sparkles className="h-3.5 w-3.5 text-cyan-200" />
                          You Match This Activation
                        </div>
                        <span className="rounded-full border border-cyan-300/18 bg-cyan-500/[0.08] px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-cyan-100">
                          creator view
                        </span>
                      </div>
                      <div className="mt-3 flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p
                            className={`text-lg font-bold text-white transition ${
                              proximityAccess.canReveal ? '' : 'select-none blur-[6px]'
                            }`}
                          >
                            {focusedCreatorActivation.title}
                          </p>
                          <p className="mt-2 text-sm text-white/65">
                            This is the live paid activation your dashboard pointed you to here.
                          </p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <span className="rounded-full border border-[#f5c518]/18 bg-[#f5c518]/[0.08] px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-[#f8dd72]">
                              ${focusedCreatorActivation.bounty} USDC
                            </span>
                            <span className={`rounded-full px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] ${getActivationStateCopy(focusedCreatorActivation).className}`}>
                              {getActivationStateCopy(focusedCreatorActivation).label}
                            </span>
                            {focusedCreatorActivation.expiresAt ? (
                              <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-white/45">
                                {getExpiryLabel(focusedCreatorActivation.expiresAt)}
                              </span>
                            ) : null}
                          </div>
                        </div>
                        {focusedCreatorActivation.shortId ? (
                          !proximityAccess.canReveal ? (
                            <span className="rounded-full border border-[#f5c518]/22 bg-[#f5c518]/[0.08] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#f8dd72]">
                              Travel to unlock
                            </span>
                          ) : focusedCreatorActivation.claimedBy || focusedCreatorActivation.targetWalletAddress || focusedCreatorActivation.claimRequestStatus === 'PENDING' ? (
                            <Link
                              href={`/dare/${focusedCreatorActivation.shortId}`}
                              className="rounded-full border border-cyan-300/18 bg-cyan-500/[0.08] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-100"
                            >
                              Open Brief
                            </Link>
                          ) : (
                            <CosmicButton
                              href={`/dare/${focusedCreatorActivation.shortId}`}
                              variant="gold"
                              size="sm"
                              className="min-w-[120px]"
                            >
                              Claim Now
                            </CosmicButton>
                          )
                        ) : null}
                      </div>
                    </div>
                  ) : null}

                  {featuredPaidActivation ? (
                    <div className="map-panel-section mt-4 rounded-[24px] border border-rose-300/18 bg-[linear-gradient(180deg,rgba(251,113,133,0.12)_0%,rgba(10,10,18,0.82)_20%,rgba(5,6,12,0.98)_100%)] px-4 py-3.5 shadow-[0_18px_36px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.07),inset_0_-14px_18px_rgba(0,0,0,0.22)]">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.24em] text-rose-100/80">
                          <Flame className="h-3.5 w-3.5 text-rose-300" />
                          Money Live Here
                        </div>
                        <span className="rounded-full border border-rose-300/18 bg-rose-500/[0.08] px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-rose-100">
                          paid activation
                        </span>
                      </div>
                      <div className="mt-3 flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p
                            className={`text-lg font-bold text-white transition ${
                              proximityAccess.canReveal ? '' : 'select-none blur-[6px]'
                            }`}
                          >
                            {featuredPaidActivation.title}
                          </p>
                          <p className="mt-2 text-sm text-white/65">
                            {featuredPaidActivation.brandName ?? 'Brand-backed'} activation live at this place.
                          </p>
                          <SentinelBadge
                            requireSentinel={featuredPaidActivation.requireSentinel}
                            sentinelVerified={featuredPaidActivation.sentinelVerified}
                            className="mt-3"
                          />
                          <div className="mt-3 flex flex-wrap gap-2">
                            <span className="rounded-full border border-[#f5c518]/18 bg-[#f5c518]/[0.08] px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-[#f8dd72]">
                              ${featuredPaidActivation.bounty} USDC
                            </span>
                            <span className={`rounded-full px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] ${getActivationStateCopy(featuredPaidActivation).className}`}>
                              {getActivationStateCopy(featuredPaidActivation).label}
                            </span>
                            {featuredPaidActivation.expiresAt ? (
                              <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-white/45">
                                {getExpiryLabel(featuredPaidActivation.expiresAt)}
                              </span>
                            ) : null}
                          </div>
                        </div>
                        {featuredPaidActivation.shortId ? (
                          !proximityAccess.canReveal ? (
                            <span className="rounded-full border border-[#f5c518]/22 bg-[#f5c518]/[0.08] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#f8dd72]">
                              Travel to unlock
                            </span>
                          ) : featuredPaidActivation.claimedBy || featuredPaidActivation.targetWalletAddress || featuredPaidActivation.claimRequestStatus === 'PENDING' ? (
                            <Link
                              href={`/dare/${featuredPaidActivation.shortId}`}
                              className="rounded-full border border-rose-300/18 bg-rose-500/[0.08] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-rose-100"
                            >
                              Open Brief
                            </Link>
                          ) : (
                            <CosmicButton
                              href={`/dare/${featuredPaidActivation.shortId}`}
                              variant="gold"
                              size="sm"
                              className="min-w-[120px]"
                            >
                              Claim Now
                            </CosmicButton>
                          )
                        ) : null}
                      </div>
                    </div>
                  ) : null}

                  <div className={`crossed-paths-section bd-dent-surface mt-4 ${mapPanelSectionClass}`}>
                    <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.24em] text-white/40">
                      <Flame className="h-3.5 w-3.5 text-cyan-200" />
                      Crossed Paths
                    </div>
                    <p className="mt-3 text-sm leading-relaxed text-white/80">{selectedVisualCopy.description}</p>
                    <div className="mt-4 flex flex-wrap gap-2.5">
                      <span className={mapPanelInsetChipClass}>
                        {selectedLastSpark}
                      </span>
                      <span
                        className={`inline-flex items-center ${mapPanelInsetChipClass}`}
                        aria-label={`Pulse level ${selectedPulse}`}
                      >
                        {renderPulseLegend(selectedPulse, { compact: true })}
                      </span>
                      <span className={mapPanelInsetChipClass}>
                        {selectedPlace.approvedCount ?? 0} sparks on record
                      </span>
                    </div>
                  </div>

                  {selectedPendingPlaceTags.length > 0 ? (
                    <div className="map-panel-section mt-4 rounded-[24px] border border-amber-400/18 bg-[linear-gradient(180deg,rgba(251,191,36,0.08)_0%,rgba(10,10,18,0.94)_100%)] px-4 py-3.5 shadow-[0_18px_36px_rgba(0,0,0,0.16),inset_0_1px_0_rgba(255,255,255,0.06)]">
                      <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.24em] text-amber-200/80">
                        <Loader2 className="h-3.5 w-3.5" />
                        Pending Marks
                      </div>
                      <p className="mt-2 text-sm text-white/72">
                        Your mark is pending referee review. Once it clears, this place upgrades automatically.
                      </p>
                      <div className="mt-3 space-y-3">
                        {selectedPendingPlaceTags.slice(0, 3).map((tag) => (
                          <div
                            key={tag.tagId}
                            className="rounded-[20px] border border-amber-300/12 bg-[linear-gradient(180deg,rgba(0,0,0,0.14)_0%,rgba(10,10,18,0.26)_100%)] px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
                          >
                            <div className="flex gap-3">
                              {tag.proofMediaUrl ? (
                                renderProofPreview({
                                  id: tag.tagId,
                                  creatorTag: tag.creatorTag,
                                  walletAddress: 'pending',
                                  caption: tag.caption,
                                  vibeTags: tag.vibeTags,
                                  proofMediaUrl: tag.proofMediaUrl,
                                  proofType: tag.proofType,
                                  firstMark: tag.firstMark,
                                  submittedAt: tag.submittedAt,
                                })
                              ) : null}
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-3">
                                  <p className="truncate text-sm font-semibold text-white">
                                    {tag.creatorTag ? `@${tag.creatorTag}` : 'Your pending mark'}
                                  </p>
                                  <span className="rounded-full border border-amber-300/18 bg-amber-500/[0.1] px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-amber-100">
                                    pending
                                  </span>
                                </div>
                                <p className="mt-2 text-sm text-white/62">
                                  {tag.caption || 'Mark submitted and waiting for referee review.'}
                                </p>
                                {tag.firstMark ? (
                                  <p className="mt-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#f8dd72]">
                                    If approved, this becomes the first spark here.
                                  </p>
                                ) : null}
                                {tag.vibeTags.length > 0 ? (
                                  <div className="mt-2 flex flex-wrap gap-2">
                                    {tag.vibeTags.map((vibeTag) => (
                                      <span
                                        key={vibeTag}
                                        className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-white/45"
                                      >
                                        {vibeTag}
                                      </span>
                                    ))}
                                  </div>
                                ) : null}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  <div className={`active-challenges-section bd-dent-surface mt-4 ${mapPanelSectionClass}`}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.24em] text-white/40">
                        <Zap className="h-3.5 w-3.5 text-[#f8dd72]" />
                        Active Challenges
                      </div>
                      {selectedPlaceActiveDares.length > 0 ? (
                        <div className="flex flex-wrap justify-end gap-2 text-[10px] uppercase tracking-[0.18em]">
                          {selectedPlaceActiveDares.filter((dare) => Boolean(dare.brandName)).length > 0 ? (
                            <span className="rounded-full border border-cyan-400/18 bg-cyan-500/[0.08] px-2.5 py-1 text-cyan-100">
                              {selectedPlaceActiveDares.filter((dare) => Boolean(dare.brandName)).length} paid live
                            </span>
                          ) : null}
                          {selectedPlaceActiveDares.filter((dare) => dare.claimRequestStatus === 'PENDING').length > 0 ? (
                            <span className="rounded-full border border-amber-300/18 bg-amber-500/[0.08] px-2.5 py-1 text-amber-100">
                              {selectedPlaceActiveDares.filter((dare) => dare.claimRequestStatus === 'PENDING').length} pending
                            </span>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                    {selectedPlaceActiveDares.length > 0 && proximityAccess.mode === 'needs-location' ? (
                      <div className="mt-3 rounded-[20px] border border-cyan-300/20 bg-[linear-gradient(180deg,rgba(34,211,238,0.12)_0%,rgba(6,14,24,0.92)_100%)] px-4 py-3.5 shadow-[0_16px_30px_rgba(0,0,0,0.16),inset_0_1px_0_rgba(255,255,255,0.08)]">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-100/82">
                              Unlock the hunt
                            </p>
                            <p className="mt-2 text-sm text-white/72">
                              We can show the bounty here, but you need location on to know when a live activation is close enough to unlock.
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={requestApproximateLocation}
                            className="inline-flex shrink-0 items-center justify-center rounded-full border border-cyan-300/24 bg-[linear-gradient(180deg,rgba(34,211,238,0.16)_0%,rgba(8,12,20,0.92)_100%)] px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-100 shadow-[0_12px_24px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.08)] transition hover:-translate-y-[1px] hover:border-cyan-200/38 hover:bg-cyan-500/[0.16]"
                          >
                            Locate me
                          </button>
                        </div>
                      </div>
                    ) : null}
                    {selectedPlaceActiveDares.length > 0 && proximityAccess.mode === 'travel' ? (
                      <div className="mt-3 rounded-[20px] border border-[#f5c518]/22 bg-[linear-gradient(180deg,rgba(245,197,24,0.14)_0%,rgba(29,20,8,0.92)_100%)] px-4 py-3.5 shadow-[0_16px_30px_rgba(0,0,0,0.16),inset_0_1px_0_rgba(255,255,255,0.08)]">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#f8dd72]">
                          Travel to unlock
                        </p>
                        <p className="mt-2 text-sm text-white/76">
                          You&apos;re close enough to know the money is live here. Move within {PROXIMITY_REVEAL_METERS}m and the full activation brief unlocks.
                        </p>
                      </div>
                    ) : null}
                    {selectedPlaceActiveDares.length > 0 && proximityAccess.mode === 'unlocked' && !isCreatorSource && !showBackToControl ? (
                      <div className="mt-3 rounded-[20px] border border-emerald-300/20 bg-[linear-gradient(180deg,rgba(16,185,129,0.12)_0%,rgba(6,20,15,0.92)_100%)] px-4 py-3.5 shadow-[0_16px_30px_rgba(0,0,0,0.16),inset_0_1px_0_rgba(255,255,255,0.08)]">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-emerald-100/82">
                          Activation unlocked
                        </p>
                        <p className="mt-2 text-sm text-white/72">
                          You&apos;re inside the live radius. Full place challenge details are now visible.
                        </p>
                      </div>
                    ) : null}
                    {selectedPlaceActiveDaresLoading ? (
                      <div className="mt-3 flex items-center gap-2 text-sm text-white/55">
                        <Loader2 className="h-4 w-4 animate-spin text-[#f8dd72]" />
                        Loading place challenges...
                      </div>
                    ) : selectedPlaceActiveDares.length > 0 ? (
                    <div className="mt-3 space-y-3">
                        {visibleActiveDares.map((dare) => {
                          const activationState = getActivationStateCopy(dare);
                          const isFocusedCreatorActivation = dare.shortId === deepLinkedDareShortId;
                          const isMatchedActivation = selectedPlaceMatch?.dareShortId === dare.shortId;

                          return (
                          <div
                            key={dare.id}
                            className={`rounded-[20px] border px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] ${
                              isFocusedCreatorActivation
                                ? 'border-cyan-300/26 bg-[linear-gradient(180deg,rgba(34,211,238,0.11)_0%,rgba(10,10,18,0.16)_100%)]'
                                : 'border-[#f5c518]/14 bg-[linear-gradient(180deg,rgba(245,197,24,0.06)_0%,rgba(10,10,18,0.16)_100%)]'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0 flex-1">
                                <p
                                  className={`text-sm font-semibold text-white transition ${
                                    proximityAccess.canReveal ? '' : 'select-none blur-[5px]'
                                  }`}
                                >
                                  {dare.title}
                                </p>
                                <div className="mt-2 flex flex-wrap gap-2">
                                  <SentinelBadge
                                    requireSentinel={dare.requireSentinel}
                                    sentinelVerified={dare.sentinelVerified}
                                  />
                                  <span className="rounded-full border border-[#f5c518]/18 bg-[#f5c518]/[0.08] px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-[#f8dd72]">
                                    ${dare.bounty} USDC
                                  </span>
                                  {dare.brandName ? (
                                    <span className="rounded-full border border-cyan-400/18 bg-cyan-500/[0.08] px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-cyan-100">
                                      {dare.brandName}
                                    </span>
                                  ) : null}
                                  {dare.brandName ? (
                                    <span className="rounded-full border border-fuchsia-300/18 bg-fuchsia-500/[0.08] px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-fuchsia-100">
                                      paid activation
                                    </span>
                                  ) : null}
                                  {isFocusedCreatorActivation ? (
                                    <span className="rounded-full border border-cyan-300/18 bg-cyan-500/[0.08] px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-cyan-100">
                                      your match
                                    </span>
                                  ) : null}
                                  {!isFocusedCreatorActivation && isMatchedActivation ? (
                                    <span className="rounded-full border border-cyan-300/18 bg-cyan-500/[0.08] px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-cyan-100">
                                      best fit here
                                    </span>
                                  ) : null}
                                  <span className={`rounded-full px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] ${activationState.className}`}>
                                    {activationState.label}
                                  </span>
                                  {dare.expiresAt ? (
                                    <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-white/45">
                                      {getExpiryLabel(dare.expiresAt)}
                                    </span>
                                  ) : null}
                                </div>
                                {dare.campaignTitle ? (
                                  <p className="mt-2 text-[10px] uppercase tracking-[0.18em] text-cyan-200/70">
                                    Campaign: {dare.campaignTitle}
                                  </p>
                                ) : null}
                              </div>
                              {dare.shortId ? (
                                proximityAccess.canReveal ? (
                                  <Link
                                    href={`/dare/${dare.shortId}`}
                                    className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/72"
                                  >
                                    Open
                                  </Link>
                                ) : (
                                  <span className="rounded-full border border-[#f5c518]/22 bg-[#f5c518]/[0.08] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#f8dd72]">
                                    Travel to unlock
                                  </span>
                                )
                              ) : null}
                            </div>
                          </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="mt-3 rounded-[20px] border border-[#f5c518]/16 bg-[linear-gradient(180deg,rgba(245,197,24,0.1)_0%,rgba(18,14,6,0.84)_22%,rgba(6,7,12,0.98)_100%)] px-4 py-4 shadow-[0_18px_30px_rgba(0,0,0,0.16),inset_0_1px_0_rgba(255,255,255,0.06),inset_0_-12px_18px_rgba(0,0,0,0.2)]">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full border border-[#f5c518]/24 bg-[#f5c518]/[0.1] px-2.5 py-1 text-[10px] uppercase tracking-[0.2em] text-[#f8dd72]">
                            First activation open
                          </span>
                          {selectedPlace.approvedCount && selectedPlace.approvedCount > 0 ? (
                            <span className="rounded-full border border-fuchsia-400/18 bg-fuchsia-500/[0.08] px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-fuchsia-100">
                              venue memory already live
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-3 text-sm font-semibold text-white">
                          This place has presence, but no live mission to chase yet.
                        </p>
                        <p className="mt-1.5 text-sm leading-relaxed text-white/62">
                          Fund the first challenge here and turn this venue from a memory node into an active hunting ground.
                        </p>
                      </div>
                    )}
                  </div>

                  <div className={`mt-4 ${mapPanelSectionClass}`}>
                    <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.24em] text-white/40">
                      <Sparkles className="h-3.5 w-3.5 text-[#f5c518]" />
                      Recent Marks
                    </div>
                    {selectedPlaceTagsLoading ? (
                      <div className="mt-3 flex items-center gap-2 text-sm text-white/55">
                        <Loader2 className="h-4 w-4 animate-spin text-cyan-200" />
                        Loading recent place memory...
                      </div>
                    ) : selectedPlaceTagsError ? (
                      <p className="mt-3 text-sm text-rose-200/80">{selectedPlaceTagsError}</p>
                    ) : selectedPlaceTags.length > 0 ? (
                      <div className="mt-3 space-y-2.5">
                        {selectedPlaceTags.slice(0, 3).map((tag) => (
                          <div
                            key={tag.id}
                            className="rounded-[18px] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.04)_0%,rgba(7,10,16,0.92)_16%,rgba(6,6,12,0.9)_100%)] px-2.5 py-2 shadow-[0_14px_24px_rgba(0,0,0,0.12),inset_0_1px_0_rgba(255,255,255,0.05)]"
                          >
                            <div className="flex gap-2.5">
                              {renderProofPreview(tag, { compact: true })}
                              <div className="min-w-0 flex-1">
                                <div className="flex items-start justify-between gap-2">
                                  <p className="truncate text-[13px] font-semibold text-white">
                                    {tag.creatorTag
                                      ? `@${tag.creatorTag}`
                                      : `${tag.walletAddress.slice(0, 6)}...${tag.walletAddress.slice(-4)}`}
                                  </p>
                                  <p className="shrink-0 text-[10px] uppercase tracking-[0.18em] text-white/34">
                                    {getLastSparkLabel(tag.submittedAt)}
                                  </p>
                                </div>
                                {tag.firstMark ? (
                                  <div className="mt-1.5 inline-flex rounded-full border border-[#f5c518]/35 bg-[#f5c518]/[0.12] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.16em] text-[#f8dd72]">
                                    First spark
                                  </div>
                                ) : null}
                                <p className="mt-1.5 line-clamp-2 text-[13px] leading-snug text-white/62">
                                  {tag.caption || 'Verified mark submitted without a caption.'}
                                </p>
                                {tag.vibeTags.length > 0 ? (
                                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                                    {tag.vibeTags.slice(0, 2).map((vibeTag) => (
                                      <span
                                        key={vibeTag}
                                        className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[9px] uppercase tracking-[0.16em] text-white/45"
                                      >
                                        {vibeTag}
                                      </span>
                                    ))}
                                    {tag.vibeTags.length > 2 ? (
                                      <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[9px] uppercase tracking-[0.16em] text-white/38">
                                        +{tag.vibeTags.length - 2}
                                      </span>
                                    ) : null}
                                  </div>
                                ) : null}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-3 text-sm text-white/55">
                        No approved marks are live here yet. First verified mark wins the story.
                      </p>
                    )}
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    <TagPlaceButton
                      placeId={selectedPlace.placeId}
                      placeName={selectedPlace.name}
                      latitude={selectedPlace.latitude}
                      longitude={selectedPlace.longitude}
                      address={selectedPlace.address}
                      city={selectedPlace.city}
                      country={selectedPlace.country}
                      placeSource={selectedPlace.placeSource}
                      externalPlaceId={selectedPlace.externalPlaceId}
                      onPlaceResolved={(place) => {
                        setSelectedPlace((current) => ({
                          placeId: place.id,
                          slug: place.slug,
                          name: place.name,
                          address:
                            place.address ??
                            [place.city, place.country].filter(Boolean).join(', ') ??
                            current?.address ??
                            null,
                          city: place.city,
                          country: place.country,
                          latitude: place.latitude,
                          longitude: place.longitude,
                          categories: current?.categories ?? null,
                          placeSource: current?.placeSource ?? selectedPlace.placeSource ?? null,
                          externalPlaceId:
                            current?.externalPlaceId ?? selectedPlace.externalPlaceId ?? null,
                          approvedCount: current?.approvedCount ?? 0,
                          heatScore: current?.heatScore ?? 0,
                          lastTaggedAt: current?.lastTaggedAt ?? null,
                          activeDareCount: current?.activeDareCount ?? 0,
                        }));
                        setTargetCenter([place.latitude, place.longitude]);
                        setTargetZoom(15);
                      }}
                      onTagSubmitted={(tag) => {
                        setPendingPlaceTags((current) => [
                          {
                            ...tag,
                            placeId: selectedPlace?.placeId ?? tag.placeId,
                          },
                          ...current.filter((item) => item.tagId !== tag.tagId),
                        ]);
                        setCeremonyState({
                          kind: 'pending',
                          title: 'Your mark is pending',
                          body: tag.firstMark
                            ? 'If the proof clears, this place gets its first spark and enters the memory layer.'
                            : 'The proof is now waiting for referee review. If it clears, the place upgrades automatically.',
                        });
                      }}
                      buttonClassName="map-action-button map-action-button--cyan"
                    />

                    <CreatePlaceChallengeButton
                      placeId={selectedPlace.placeId}
                      placeName={selectedPlace.name}
                      latitude={selectedPlace.latitude}
                      longitude={selectedPlace.longitude}
                      address={selectedPlace.address}
                      city={selectedPlace.city}
                      country={selectedPlace.country}
                      categories={selectedPlace.categories}
                      placeSource={selectedPlace.placeSource}
                      externalPlaceId={selectedPlace.externalPlaceId}
                      onPlaceResolved={(place) => {
                        setSelectedPlace((current) => ({
                          placeId: place.id,
                          slug: place.slug,
                          name: place.name,
                          address:
                            place.address ??
                            [place.city, place.country].filter(Boolean).join(', ') ??
                            current?.address ??
                            null,
                          city: place.city,
                          country: place.country,
                          latitude: place.latitude,
                          longitude: place.longitude,
                          categories: current?.categories ?? null,
                          placeSource: current?.placeSource ?? selectedPlace.placeSource ?? null,
                          externalPlaceId:
                            current?.externalPlaceId ?? selectedPlace.externalPlaceId ?? null,
                          approvedCount: current?.approvedCount ?? 0,
                          heatScore: current?.heatScore ?? 0,
                          lastTaggedAt: current?.lastTaggedAt ?? null,
                          activeDareCount: current?.activeDareCount ?? 0,
                        }));
                        setTargetCenter([place.latitude, place.longitude]);
                        setTargetZoom(15);
                      }}
                      onChallengeCreated={({ result }) => {
                        setSelectedPlace((current) =>
                          current
                            ? {
                                ...current,
                                activeDareCount: (current.activeDareCount ?? 0) + 1,
                              }
                            : current
                        );
                        if (selectedPlace.slug) {
                          void loadSelectedPlaceVenueDetail(selectedPlace.slug, undefined, { silent: true });
                        }
                        setCeremonyState({
                          kind: 'alive-upgrade',
                          title: 'Challenge live',
                          body: result.isOpenBounty
                            ? 'This place now has an open bounty attached to it. The next verified completion can turn it into fresh memory.'
                            : 'The challenge is now live here. Once it clears, the place should upgrade with new memory automatically.',
                        });
                      }}
                      buttonClassName="map-action-button map-action-button--gold"
                    />

                    {selectedPlace.slug ? (
                      <Link
                        href={`/venues/${selectedPlace.slug}${
                          isCreatorSource
                            ? `?source=creator${deepLinkedDareShortId ? `&dare=${encodeURIComponent(deepLinkedDareShortId)}` : ''}`
                            : ''
                        }`}
                        className="map-action-button map-action-button--violet"
                      >
                        <span className="max-w-[7.2rem] text-balance leading-[1.02] sm:max-w-none">
                          Open place
                        </span>
                      </Link>
                    ) : null}
                  </div>
                  </div>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <style jsx>{`
        :root {
          --neu-dark: rgba(0, 0, 0, 0.75);
          --neu-light: rgba(255, 255, 255, 0.07);
          --neu-surface: #0e0e1a;
        }

        .selected-place-panel-wrap {
          max-height: calc(100% - 16px);
        }

        @media (min-width: 768px) {
          .selected-place-panel-wrap {
            top: 16px;
            right: 16px;
            bottom: 16px;
            left: auto;
            width: min(340px, calc(100% - 88px));
            max-height: calc(100% - 32px);
          }
        }

        .map-panel-shell {
          transform-origin: 88% 8%;
          will-change: transform, opacity;
          animation: mapPanelRollout 300ms cubic-bezier(0.22, 1, 0.36, 1);
        }

        .map-container-wrapper {
          border-radius: 20px;
          background: var(--neu-surface);
          box-shadow:
            inset 6px 6px 14px rgba(0, 0, 0, 0.8),
            inset -4px -4px 10px rgba(255, 255, 255, 0.05),
            0 2px 4px rgba(255, 255, 255, 0.06),
            0 -2px 4px rgba(0, 0, 0, 0.6);
          outline: 3px solid rgba(255, 255, 255, 0.04);
          outline-offset: -3px;
        }

        .place-panel-popup {
          background: linear-gradient(145deg, #1c1c2e 0%, #14142a 100%);
          box-shadow:
            8px 8px 20px rgba(0, 0, 0, 0.85),
            -4px -4px 12px rgba(255, 255, 255, 0.06),
            12px 12px 30px rgba(0, 0, 0, 0.5),
            -6px -6px 20px rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.04);
          border-top: 1px solid rgba(255, 255, 255, 0.12);
          border-left: 1px solid rgba(255, 255, 255, 0.08);
        }

        :global(.map-action-button) {
          position: relative;
          isolation: isolate;
          display: inline-flex;
          min-height: 118px;
          width: 100%;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 0.62rem;
          overflow: hidden;
          border-radius: 30px;
          border: 1px solid rgba(255, 255, 255, 0.18);
          padding: 1rem 0.88rem 0.9rem;
          text-align: center;
          font-size: 9.5px;
          font-weight: 800;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          text-shadow: 0 1px 0 rgba(0, 0, 0, 0.35);
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
          transition:
            transform 180ms ease,
            box-shadow 180ms ease,
            border-color 180ms ease,
            filter 180ms ease,
            background 180ms ease;
        }

        :global(.map-action-button::before) {
          content: '';
          position: absolute;
          inset: 1px;
          border-radius: inherit;
          background:
            linear-gradient(180deg, rgba(255, 255, 255, 0.14) 0%, rgba(255, 255, 255, 0.03) 26%, rgba(0, 0, 0, 0.22) 100%),
            radial-gradient(circle at 50% -6%, rgba(255, 255, 255, 0.18), transparent 44%);
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.16),
            inset 0 -20px 26px rgba(0, 0, 0, 0.32),
            inset 16px 16px 24px rgba(255, 255, 255, 0.03),
            inset -18px -18px 24px rgba(0, 0, 0, 0.12);
          pointer-events: none;
        }

        :global(.map-action-button::after) {
          content: '';
          position: absolute;
          inset: 8px 18% auto;
          height: 16px;
          border-radius: 999px;
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.42), rgba(255, 255, 255, 0.08) 75%, rgba(255, 255, 255, 0));
          opacity: 0.88;
          filter: blur(1px);
          pointer-events: none;
        }

        :global(.map-action-button > *) {
          position: relative;
          z-index: 1;
        }

        :global(.map-action-button:hover) {
          transform: translateY(-1px);
          filter: saturate(1.06);
        }

        :global(.map-action-button:active) {
          transform: translateY(1px);
          box-shadow:
            inset 0 10px 18px rgba(0, 0, 0, 0.22),
            inset 0 -4px 10px rgba(255, 255, 255, 0.03);
        }

        :global(.map-action-button span) {
          max-width: 6.6rem;
          text-wrap: balance;
          line-height: 1.04;
        }

        :global(.map-action-button--cyan) {
          color: #defcff;
          border-color: rgba(34, 211, 238, 0.3);
          background:
            radial-gradient(circle at 50% 0%, rgba(180, 247, 255, 0.18), transparent 36%),
            linear-gradient(180deg, rgba(59, 218, 242, 0.28) 0%, rgba(10, 74, 96, 0.9) 44%, rgba(5, 20, 34, 0.99) 100%);
          box-shadow:
            0 22px 38px rgba(0, 0, 0, 0.32),
            0 0 26px rgba(34, 211, 238, 0.14),
            inset 0 1px 0 rgba(255, 255, 255, 0.14),
            inset 0 -24px 30px rgba(0, 0, 0, 0.34);
        }

        :global(.map-action-button--cyan:hover) {
          border-color: rgba(186, 252, 255, 0.54);
          box-shadow:
            0 24px 42px rgba(0, 0, 0, 0.32),
            0 0 28px rgba(34, 211, 238, 0.18),
            inset 0 1px 0 rgba(255, 255, 255, 0.14),
            inset 0 -22px 30px rgba(0, 0, 0, 0.34);
        }

        :global(.map-action-button--gold) {
          color: #fff0bc;
          border-color: rgba(245, 197, 24, 0.32);
          background:
            radial-gradient(circle at 50% 0%, rgba(255, 240, 182, 0.18), transparent 36%),
            linear-gradient(180deg, rgba(255, 209, 67, 0.3) 0%, rgba(130, 80, 16, 0.9) 48%, rgba(39, 23, 5, 0.99) 100%);
          box-shadow:
            0 22px 38px rgba(0, 0, 0, 0.32),
            0 0 26px rgba(245, 197, 24, 0.14),
            inset 0 1px 0 rgba(255, 255, 255, 0.14),
            inset 0 -24px 30px rgba(0, 0, 0, 0.34);
        }

        :global(.map-action-button--gold:hover) {
          border-color: rgba(248, 221, 114, 0.56);
          box-shadow:
            0 24px 42px rgba(0, 0, 0, 0.32),
            0 0 30px rgba(245, 197, 24, 0.18),
            inset 0 1px 0 rgba(255, 255, 255, 0.14),
            inset 0 -22px 30px rgba(0, 0, 0, 0.34);
        }

        :global(.map-action-button--violet) {
          color: #fdeaff;
          border-color: rgba(217, 70, 239, 0.34);
          background:
            radial-gradient(circle at 50% 0%, rgba(247, 193, 255, 0.18), transparent 36%),
            linear-gradient(180deg, rgba(224, 97, 242, 0.3) 0%, rgba(142, 46, 202, 0.84) 48%, rgba(63, 21, 104, 0.99) 100%);
          box-shadow:
            0 22px 38px rgba(0, 0, 0, 0.32),
            0 0 30px rgba(217, 70, 239, 0.16),
            inset 0 1px 0 rgba(255, 255, 255, 0.16),
            inset 0 -24px 30px rgba(29, 8, 52, 0.4);
        }

        :global(.map-action-button--violet:hover) {
          border-color: rgba(245, 208, 254, 0.58);
          box-shadow:
            0 24px 42px rgba(0, 0, 0, 0.34),
            0 0 34px rgba(217, 70, 239, 0.2),
            inset 0 1px 0 rgba(255, 255, 255, 0.16),
            inset 0 -24px 32px rgba(29, 8, 52, 0.42);
        }

        @media (min-width: 640px) {
          :global(.map-action-button) {
            min-height: 68px;
            flex-direction: row;
            gap: 0.5rem;
            border-radius: 999px;
            padding: 0.98rem 1rem 0.92rem;
            font-size: 10px;
          }

          :global(.map-action-button span) {
            max-width: none;
            line-height: 1;
          }
        }

        .map-panel-shell::before {
          content: '';
          position: absolute;
          inset: 10px 10px auto;
          height: 56px;
          border-radius: 20px;
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.045), transparent);
          opacity: 0.62;
          pointer-events: none;
        }

        .map-panel-section {
          animation: mapPanelSectionIn 340ms cubic-bezier(0.22, 1, 0.36, 1);
        }

        .map-panel-shell :global(*)::-webkit-scrollbar,
        .map-panel-shell::-webkit-scrollbar {
          width: 0;
          height: 0;
        }

        .map-panel-shell,
        .map-panel-shell > div,
        .map-panel-shell [class*='overflow-y-auto'] {
          scrollbar-width: none;
        }

        @keyframes mapPanelRollout {
          0% {
            opacity: 0;
            transform: translateY(12px) scale(0.965);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes mapPanelSectionIn {
          0% {
            opacity: 0;
            transform: translateY(10px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .basedare-leaflet-map {
          --tile-filter: brightness(0.34) saturate(0.72) contrast(1.22) hue-rotate(14deg) sepia(0.16);
          --preset-atmosphere:
            radial-gradient(ellipse 45% 38% at 24% 18%, rgba(245, 197, 24, 0.1) 0%, transparent 58%),
            radial-gradient(ellipse 34% 40% at 78% 72%, rgba(184, 127, 255, 0.08) 0%, transparent 62%),
            radial-gradient(ellipse 28% 36% at 54% 44%, rgba(168, 85, 247, 0.09) 0%, transparent 66%);
          --mesh-opacity: 0.12;
          --links-opacity: 0.16;
          --star-opacity: 0.22;
          --scan-opacity: 0.06;
          --haze-opacity: 1;
        }

        .basedare-leaflet-map[data-map-preset='crt'] {
          --tile-filter: brightness(0.36) saturate(0.74) contrast(1.34) hue-rotate(6deg) sepia(0.22);
          --preset-atmosphere:
            radial-gradient(ellipse 45% 38% at 24% 18%, rgba(184, 127, 255, 0.14) 0%, transparent 58%),
            radial-gradient(ellipse 34% 40% at 78% 72%, rgba(245, 197, 24, 0.08) 0%, transparent 62%),
            linear-gradient(180deg, rgba(255, 255, 255, 0.02) 0%, transparent 18%, rgba(255, 0, 128, 0.02) 100%);
          --mesh-opacity: 0.16;
          --links-opacity: 0.2;
          --star-opacity: 0.14;
          --scan-opacity: 0.12;
          --haze-opacity: 0.85;
        }

        .basedare-leaflet-map[data-map-preset='heat'] {
          --tile-filter: brightness(0.38) saturate(0.95) contrast(1.3) hue-rotate(-8deg) sepia(0.24);
          --preset-atmosphere:
            radial-gradient(ellipse 48% 42% at 24% 18%, rgba(245, 197, 24, 0.16) 0%, transparent 58%),
            radial-gradient(ellipse 34% 40% at 78% 72%, rgba(251, 113, 133, 0.12) 0%, transparent 62%),
            radial-gradient(ellipse 28% 36% at 54% 44%, rgba(184, 127, 255, 0.08) 0%, transparent 66%);
          --mesh-opacity: 0.1;
          --links-opacity: 0.12;
          --star-opacity: 0.16;
          --scan-opacity: 0.04;
          --haze-opacity: 0.92;
        }

        .basedare-leaflet-map[data-map-preset='noir'] {
          --tile-filter: brightness(0.25) saturate(0.08) contrast(1.4);
          --preset-atmosphere:
            linear-gradient(180deg, rgba(255, 255, 255, 0.015) 0%, transparent 28%),
            radial-gradient(ellipse 40% 34% at 52% 50%, rgba(255, 255, 255, 0.035) 0%, transparent 60%);
          --mesh-opacity: 0.04;
          --links-opacity: 0.05;
          --star-opacity: 0.08;
          --scan-opacity: 0.03;
          --haze-opacity: 0.65;
        }

        .basedare-leaflet-map[data-map-preset='night'] {
          --tile-filter: brightness(0.32) saturate(0.88) contrast(1.28) hue-rotate(32deg);
          --preset-atmosphere:
            radial-gradient(ellipse 42% 38% at 24% 18%, rgba(34, 211, 238, 0.12) 0%, transparent 58%),
            radial-gradient(ellipse 34% 40% at 78% 72%, rgba(184, 127, 255, 0.09) 0%, transparent 62%),
            radial-gradient(ellipse 28% 36% at 54% 44%, rgba(245, 197, 24, 0.08) 0%, transparent 66%);
          --mesh-opacity: 0.1;
          --links-opacity: 0.14;
          --star-opacity: 0.24;
          --scan-opacity: 0.02;
          --haze-opacity: 0.8;
        }

        .preset-atmosphere {
          background: var(--preset-atmosphere);
        }

        .scanlines {
          background: repeating-linear-gradient(
            0deg,
            transparent,
            transparent 2px,
            rgba(0, 0, 0, 0.1) 2px,
            rgba(0, 0, 0, 0.1) 4px
          );
          opacity: var(--scan-opacity);
        }

        .network-mesh {
          background-image:
            linear-gradient(rgba(129, 103, 255, 0.24) 1px, transparent 1px),
            linear-gradient(90deg, rgba(129, 103, 255, 0.24) 1px, transparent 1px);
          background-size: 96px 96px, 96px 96px;
          opacity: var(--mesh-opacity);
        }

        .network-links {
          background-image:
            linear-gradient(32deg, transparent 48%, rgba(153, 126, 255, 0.18) 50%, transparent 52%),
            linear-gradient(-32deg, transparent 48%, rgba(87, 164, 255, 0.14) 50%, transparent 52%),
            linear-gradient(74deg, transparent 48%, rgba(137, 95, 255, 0.14) 50%, transparent 52%);
          background-size: 220px 220px, 240px 240px, 280px 280px;
          background-position: 0 0, 30px 40px, 90px 60px;
          opacity: var(--links-opacity);
        }

        .starfield {
          background-image:
            radial-gradient(circle at 12% 15%, rgba(255, 255, 255, 0.82) 0 2px, transparent 3px),
            radial-gradient(circle at 70% 20%, rgba(181, 203, 255, 0.58) 0 2px, transparent 3px),
            radial-gradient(circle at 23% 62%, rgba(170, 130, 255, 0.68) 0 2px, transparent 3px),
            radial-gradient(circle at 78% 70%, rgba(255, 255, 255, 0.5) 0 2px, transparent 3px),
            radial-gradient(circle at 40% 44%, rgba(156, 199, 255, 0.42) 0 3px, transparent 4px),
            radial-gradient(circle at 88% 45%, rgba(160, 120, 255, 0.45) 0 2px, transparent 3px);
          opacity: var(--star-opacity);
        }

        .glass-haze {
          background:
            linear-gradient(180deg, rgba(255, 255, 255, 0.018) 0%, rgba(255, 255, 255, 0) 24%),
            radial-gradient(120% 100% at 50% 0%, rgba(245, 197, 24, 0.035) 0%, transparent 46%),
            radial-gradient(110% 100% at 50% 100%, rgba(168, 85, 247, 0.045) 0%, transparent 52%);
          opacity: var(--haze-opacity);
        }

        .spray-can {
          position: absolute;
          right: 20px;
          bottom: 22px;
          z-index: 18;
          width: 80px;
          border: none;
          background: transparent;
          padding: 0;
          transform: rotate(-15deg);
          transition: transform 0.3s ease, filter 0.3s ease;
          filter: drop-shadow(0 8px 22px rgba(107, 33, 255, 0.4));
          animation: canFloat 4s ease-in-out infinite;
          align-items: center;
          justify-content: center;
        }

        .spray-can::after {
          content: 'BARE PAINT';
          position: absolute;
          bottom: 110%;
          left: 50%;
          transform: translateX(-50%) rotate(15deg);
          border-radius: 8px;
          border: 1px solid rgba(107, 33, 255, 0.4);
          background: rgba(10, 0, 22, 0.95);
          color: #00ffc8;
          font-size: 9px;
          letter-spacing: 1.5px;
          white-space: nowrap;
          padding: 5px 10px;
          opacity: 0;
          transition: opacity 0.2s ease;
          pointer-events: none;
        }

        .spray-can:hover {
          transform: rotate(18deg) scale(1.1);
          filter: drop-shadow(0 0 24px rgba(0, 255, 200, 0.65));
          animation: none;
        }

        .spray-can:hover::after {
          opacity: 1;
        }

        .spray-can:active {
          transform: rotate(40deg) scale(0.95);
        }

        .spray-burst {
          position: absolute;
          right: 10px;
          bottom: 58px;
          width: 120px;
          height: 120px;
          border-radius: 9999px;
          background: radial-gradient(
            circle,
            rgba(0, 255, 200, 0.55),
            rgba(107, 33, 255, 0.28),
            transparent 70%
          );
          opacity: 0;
          transform: scale(0);
          pointer-events: none;
          z-index: 17;
        }

        .spray-burst.bang {
          animation: sprayBang 0.62s ease-out forwards;
        }

        @keyframes canFloat {
          0%,
          100% {
            transform: rotate(-15deg) translateY(0);
          }
          50% {
            transform: rotate(-12deg) translateY(-8px);
          }
        }

        @keyframes sprayBang {
          0% {
            opacity: 1;
            transform: scale(0.2);
          }
          60% {
            opacity: 0.85;
            transform: scale(1.35);
          }
          100% {
            opacity: 0;
            transform: scale(2);
          }
        }

        @keyframes peebearRipple {
          0% {
            transform: translate(-50%, -50%) scale(0.9);
            opacity: 0.72;
          }
          100% {
            transform: translate(-50%, -50%) scale(2.05);
            opacity: 0;
          }
        }

        @keyframes peebearHover {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-2px);
          }
        }

        @keyframes peebearChallengePulse {
          0%,
          100% {
            transform: translateX(-50%) scale(1);
            opacity: 0.88;
          }
          50% {
            transform: translateX(-50%) scale(1.06);
            opacity: 1;
          }
        }

        .basedare-leaflet-map :global(.leaflet-container) {
          height: 100%;
          width: 100%;
          border-radius: 17px;
          background:
            radial-gradient(circle at 30% 20%, rgba(17, 30, 49, 0.9) 0%, rgba(5, 8, 18, 1) 70%);
          cursor: crosshair;
          font-family: inherit;
        }

        .basedare-leaflet-map :global(.leaflet-pane),
        .basedare-leaflet-map :global(.leaflet-control-container) {
          z-index: 1;
        }

        .basedare-leaflet-map :global(.peebear-leaflet-icon) {
          background: transparent;
          border: 0;
        }

        .basedare-leaflet-map :global(.place-cluster-leaflet-icon) {
          background: transparent;
          border: 0;
        }

        .basedare-leaflet-map :global(.place-cluster-marker) {
          position: relative;
          width: 88px;
          height: 88px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .basedare-leaflet-map :global(.place-cluster-aura) {
          position: absolute;
          inset: 10px;
          border-radius: 9999px;
          background:
            radial-gradient(circle, rgba(245, 197, 24, 0.22) 0%, rgba(184, 127, 255, 0.12) 45%, transparent 76%);
          filter: blur(7px);
          opacity: 0.95;
        }

        .basedare-leaflet-map :global(.place-cluster-core) {
          position: relative;
          z-index: 2;
          display: flex;
          height: 68px;
          width: 68px;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 2px;
          border-radius: 9999px;
          border: 1px solid rgba(255, 255, 255, 0.16);
          background:
            radial-gradient(circle at 32% 24%, rgba(255, 255, 255, 0.22) 0%, transparent 36%),
            linear-gradient(180deg, rgba(255, 255, 255, 0.12) 0%, rgba(255, 255, 255, 0.04) 18%, rgba(16, 18, 31, 0.96) 54%, rgba(7, 8, 17, 0.98) 100%);
          box-shadow:
            0 18px 28px rgba(0, 0, 0, 0.38),
            0 0 0 3px rgba(255, 255, 255, 0.05),
            inset 0 1px 0 rgba(255, 255, 255, 0.14),
            inset 0 -12px 18px rgba(0, 0, 0, 0.24);
        }

        .basedare-leaflet-map :global(.place-cluster-count) {
          font-size: 22px;
          font-weight: 900;
          line-height: 1;
          letter-spacing: -0.04em;
          color: rgba(255, 255, 255, 0.98);
          text-shadow: 0 4px 16px rgba(0, 0, 0, 0.42);
        }

        .basedare-leaflet-map :global(.place-cluster-label) {
          font-size: 8px;
          font-weight: 900;
          line-height: 1;
          letter-spacing: 0.22em;
          color: rgba(255, 255, 255, 0.6);
        }

        .basedare-leaflet-map :global(.place-cluster-shadow) {
          position: absolute;
          bottom: 10px;
          left: 50%;
          z-index: 0;
          width: 48px;
          height: 14px;
          transform: translateX(-50%);
          border-radius: 9999px;
          background: rgba(0, 0, 0, 0.4);
          filter: blur(10px);
        }

        .basedare-leaflet-map :global(.place-cluster-match) {
          position: absolute;
          top: -2px;
          left: 50%;
          z-index: 3;
          transform: translateX(-50%);
          border-radius: 9999px;
          border: 1px solid rgba(34, 211, 238, 0.32);
          background:
            linear-gradient(180deg, rgba(190, 249, 255, 0.16), rgba(34, 211, 238, 0.08)),
            linear-gradient(180deg, rgba(7, 14, 22, 0.95), rgba(5, 10, 18, 0.98));
          padding: 3px 7px;
          font-size: 6px;
          font-weight: 900;
          line-height: 1;
          letter-spacing: 0.18em;
          color: #d8fbff;
          box-shadow:
            0 10px 18px rgba(0, 0, 0, 0.28),
            inset 0 1px 0 rgba(255, 255, 255, 0.1);
          white-space: nowrap;
        }

        .basedare-leaflet-map :global(.place-cluster-live) {
          position: absolute;
          right: 0;
          bottom: 8px;
          z-index: 3;
          border-radius: 9999px;
          border: 1px solid rgba(245, 197, 24, 0.34);
          background:
            linear-gradient(180deg, rgba(255, 233, 157, 0.16), rgba(245, 197, 24, 0.1)),
            linear-gradient(180deg, rgba(58, 38, 8, 0.96), rgba(19, 13, 5, 0.98));
          padding: 4px 7px;
          font-size: 6px;
          font-weight: 900;
          line-height: 1;
          letter-spacing: 0.16em;
          color: rgba(255, 244, 200, 0.94);
          box-shadow:
            0 10px 16px rgba(0, 0, 0, 0.28),
            inset 0 1px 0 rgba(255, 255, 255, 0.1);
          white-space: nowrap;
        }

        .basedare-leaflet-map :global(.place-cluster-marker--blazing .place-cluster-core) {
          border-color: rgba(255, 95, 130, 0.74);
          box-shadow:
            0 0 0 4px rgba(255, 45, 85, 0.12),
            0 0 24px rgba(255, 45, 85, 0.24),
            0 18px 28px rgba(0, 0, 0, 0.38),
            inset 0 1px 0 rgba(255, 255, 255, 0.14),
            inset 0 -12px 18px rgba(0, 0, 0, 0.24);
        }

        .basedare-leaflet-map :global(.place-cluster-marker--igniting .place-cluster-core) {
          border-color: rgba(34, 211, 238, 0.72);
          box-shadow:
            0 0 0 4px rgba(34, 211, 238, 0.12),
            0 0 22px rgba(34, 211, 238, 0.22),
            0 18px 28px rgba(0, 0, 0, 0.38),
            inset 0 1px 0 rgba(255, 255, 255, 0.14),
            inset 0 -12px 18px rgba(0, 0, 0, 0.24);
        }

        .basedare-leaflet-map :global(.place-cluster-marker--simmering .place-cluster-core),
        .basedare-leaflet-map :global(.place-cluster-marker--first-mark .place-cluster-core) {
          border-color: rgba(245, 197, 24, 0.74);
          box-shadow:
            0 0 0 4px rgba(245, 197, 24, 0.12),
            0 0 22px rgba(245, 197, 24, 0.2),
            0 18px 28px rgba(0, 0, 0, 0.38),
            inset 0 1px 0 rgba(255, 255, 255, 0.14),
            inset 0 -12px 18px rgba(0, 0, 0, 0.24);
        }

        .basedare-leaflet-map :global(.place-cluster-marker--pending .place-cluster-core) {
          border-color: rgba(251, 191, 36, 0.74);
          box-shadow:
            0 0 0 4px rgba(251, 191, 36, 0.12),
            0 0 22px rgba(251, 191, 36, 0.2),
            0 18px 28px rgba(0, 0, 0, 0.38),
            inset 0 1px 0 rgba(255, 255, 255, 0.14),
            inset 0 -12px 18px rgba(0, 0, 0, 0.24);
        }

        .basedare-leaflet-map :global(.place-cluster-marker.is-matched .place-cluster-core) {
          box-shadow:
            0 0 0 4px rgba(34, 211, 238, 0.12),
            0 0 24px rgba(34, 211, 238, 0.18),
            0 18px 28px rgba(0, 0, 0, 0.38),
            inset 0 1px 0 rgba(255, 255, 255, 0.14),
            inset 0 -12px 18px rgba(0, 0, 0, 0.24);
        }

        .basedare-leaflet-map :global(.peebear-marker) {
          position: relative;
          width: 92px;
          height: 132px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: flex-start;
        }

        .basedare-leaflet-map :global(.peebear-match-badge) {
          position: absolute;
          left: 50%;
          top: -1px;
          z-index: 4;
          transform: translateX(-50%);
          border-radius: 9999px;
          border: 1px solid rgba(34, 211, 238, 0.34);
          background:
            linear-gradient(180deg, rgba(190, 249, 255, 0.16), rgba(34, 211, 238, 0.08)),
            linear-gradient(180deg, rgba(12, 20, 31, 0.96), rgba(5, 12, 22, 0.98));
          padding: 3px 8px;
          font-size: 6.5px;
          font-weight: 900;
          line-height: 1;
          letter-spacing: 0.18em;
          color: #d8fbff;
          box-shadow:
            0 10px 18px rgba(0, 0, 0, 0.28),
            0 0 20px rgba(34, 211, 238, 0.14),
            inset 0 1px 0 rgba(255, 255, 255, 0.1);
          white-space: nowrap;
        }

        .basedare-leaflet-map :global(.peebear-challenge-aura) {
          position: absolute;
          top: 2px;
          left: 50%;
          z-index: 0;
          width: 84px;
          height: 84px;
          transform: translateX(-50%);
          border-radius: 9999px;
          background:
            radial-gradient(circle, rgba(245, 197, 24, 0.22) 0%, rgba(245, 197, 24, 0.1) 38%, rgba(184, 127, 255, 0.06) 58%, transparent 76%);
          filter: blur(6px);
          opacity: 0.95;
          animation: peebearChallengeAura 2.8s ease-in-out infinite;
        }

        .basedare-leaflet-map :global(.peebear-challenge-ring) {
          position: absolute;
          top: 7px;
          left: 50%;
          z-index: 0;
          width: 76px;
          height: 76px;
          transform: translateX(-50%);
          border-radius: 9999px;
          border: 2px solid rgba(245, 197, 24, 0.74);
          outline: 1px solid rgba(255, 242, 183, 0.14);
          outline-offset: 3px;
          box-shadow:
            0 0 0 4px rgba(245, 197, 24, 0.14),
            0 0 0 9px rgba(245, 197, 24, 0.07),
            0 0 22px rgba(245, 197, 24, 0.28),
            inset 0 0 18px rgba(245, 197, 24, 0.08);
          animation: peebearChallengePulse 2.8s ease-in-out infinite;
        }

        .basedare-leaflet-map :global(.peebear-challenge-pill) {
          position: absolute;
          right: -4px;
          top: 10px;
          z-index: 4;
          border-radius: 9999px;
          border: 1px solid rgba(245, 197, 24, 0.36);
          background:
            linear-gradient(180deg, rgba(255, 233, 157, 0.18), rgba(245, 197, 24, 0.14)),
            linear-gradient(180deg, rgba(76, 48, 10, 0.96), rgba(28, 18, 6, 0.96));
          padding: 3px 8px;
          font-size: 7px;
          font-weight: 900;
          line-height: 1;
          letter-spacing: 0.17em;
          color: rgba(255, 243, 200, 0.98);
          box-shadow:
            0 10px 18px rgba(0, 0, 0, 0.28),
            0 0 18px rgba(245, 197, 24, 0.16),
            inset 0 1px 0 rgba(255, 255, 255, 0.1);
          white-space: nowrap;
        }

        .basedare-leaflet-map :global(.peebear-meta) {
          margin-top: 6px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
        }

        .basedare-leaflet-map :global(.peebear-pulse-pill) {
          position: relative;
          z-index: 4;
          border-radius: 9999px;
          border: 1px solid rgba(255, 255, 255, 0.14);
          background:
            linear-gradient(180deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.02)),
            linear-gradient(180deg, rgba(12, 14, 24, 0.96), rgba(6, 8, 16, 0.98));
          padding: 3px 8px;
          font-size: 6.5px;
          font-weight: 900;
          line-height: 1;
          letter-spacing: 0.18em;
          color: rgba(255, 255, 255, 0.92);
          white-space: nowrap;
          box-shadow:
            0 12px 18px rgba(0, 0, 0, 0.34),
            inset 0 1px 0 rgba(255, 255, 255, 0.08);
        }

        .basedare-leaflet-map :global(.peebear-pulse-pill--blazing) {
          border-color: rgba(255, 95, 130, 0.44);
          color: #fff1f4;
          box-shadow:
            0 0 0 2px rgba(255, 45, 85, 0.12),
            0 12px 18px rgba(0, 0, 0, 0.34),
            inset 0 1px 0 rgba(255, 255, 255, 0.08);
        }

        .basedare-leaflet-map :global(.peebear-pulse-pill--igniting) {
          border-color: rgba(34, 211, 238, 0.42);
          color: #d8fbff;
          box-shadow:
            0 0 0 2px rgba(34, 211, 238, 0.11),
            0 12px 18px rgba(0, 0, 0, 0.34),
            inset 0 1px 0 rgba(255, 255, 255, 0.08);
        }

        .basedare-leaflet-map :global(.peebear-pulse-pill--simmering) {
          border-color: rgba(245, 197, 24, 0.46);
          color: #fff2b7;
          box-shadow:
            0 0 0 2px rgba(245, 197, 24, 0.11),
            0 12px 18px rgba(0, 0, 0, 0.34),
            inset 0 1px 0 rgba(255, 255, 255, 0.08);
        }

        .basedare-leaflet-map :global(.peebear-pulse-pill--cold) {
          border-color: rgba(255, 255, 255, 0.16);
          color: rgba(255, 255, 255, 0.78);
        }

        .basedare-leaflet-map :global(.peebear-state) {
          border-radius: 9999px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(7, 10, 18, 0.82);
          padding: 3px 10px;
          font-size: 8px;
          font-weight: 800;
          line-height: 1;
          letter-spacing: 0.18em;
          color: rgba(255, 255, 255, 0.55);
          box-shadow:
            0 8px 18px rgba(0, 0, 0, 0.24),
            inset 0 1px 0 rgba(255, 255, 255, 0.06);
        }

        .basedare-leaflet-map :global(.peebear-state--pending) {
          border-color: rgba(251, 191, 36, 0.28);
          color: rgba(254, 240, 138, 0.9);
        }

        .basedare-leaflet-map :global(.peebear-state--first-mark) {
          border-color: rgba(245, 197, 24, 0.35);
          color: rgba(248, 221, 114, 0.94);
        }

        .basedare-leaflet-map :global(.peebear-state--active) {
          border-color: rgba(34, 211, 238, 0.28);
          color: rgba(165, 243, 252, 0.88);
        }

        .basedare-leaflet-map :global(.peebear-state--hot) {
          border-color: rgba(251, 113, 133, 0.34);
          color: rgba(255, 228, 230, 0.92);
        }

        .basedare-leaflet-map :global(.peebear-state--unmarked) {
          border-color: rgba(245, 197, 24, 0.24);
          color: rgba(248, 221, 114, 0.9);
        }

        .basedare-leaflet-map :global(.peebear-core) {
          position: relative;
          display: flex;
          height: 60px;
          width: 60px;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          border-radius: 9999px;
          border: 2px solid rgba(255, 255, 255, 0.18);
          background:
            radial-gradient(circle at 35% 35%, rgba(255, 255, 255, 0.16) 0%, transparent 58%),
            linear-gradient(180deg, rgba(28, 22, 42, 0.96), rgba(14, 12, 24, 0.98));
          box-shadow:
            4px 6px 14px rgba(0, 0, 0, 0.78),
            -2px -2px 6px rgba(255, 255, 255, 0.06),
            0 0 0 2px rgba(255, 255, 255, 0.08),
            inset 0 1px 0 rgba(255, 255, 255, 0.1),
            inset 0 -12px 16px rgba(0, 0, 0, 0.24);
          animation: peebearHover 3.2s ease-in-out infinite;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .basedare-leaflet-map :global(.map-pin-marker) {
          background:
            radial-gradient(circle at 35% 30%, rgba(255, 255, 255, 0.18) 0%, transparent 55%),
            radial-gradient(circle at 70% 75%, rgba(0, 0, 0, 0.6) 0%, transparent 50%),
            #1a1428;
          box-shadow:
            5px 5px 12px rgba(0, 0, 0, 0.85),
            -3px -3px 8px rgba(255, 255, 255, 0.07),
            0 0 0 3px rgba(255, 255, 255, 0.06);
          border-radius: 50%;
        }

        .basedare-leaflet-map :global(.map-pin-marker--active) {
          box-shadow:
            5px 5px 12px rgba(0, 0, 0, 0.85),
            -3px -3px 8px rgba(255, 255, 255, 0.07),
            0 0 0 3px rgba(245, 197, 24, 0.7),
            0 0 20px rgba(245, 197, 24, 0.3);
        }

        .basedare-leaflet-map :global(.map-pin-marker--unmarked) {
          box-shadow:
            5px 5px 12px rgba(0, 0, 0, 0.85),
            -3px -3px 8px rgba(255, 255, 255, 0.07),
            0 0 0 3px rgba(34, 211, 238, 0.4);
        }

        .basedare-leaflet-map :global(.peebear-marker.is-active .map-pin-marker) {
          transform: scale(1.1) translateY(-3px);
          box-shadow:
            8px 10px 20px rgba(0, 0, 0, 0.9),
            -3px -3px 8px rgba(255, 255, 255, 0.08),
            0 0 0 3px rgba(245, 197, 24, 0.9),
            0 0 30px rgba(245, 197, 24, 0.45);
        }

        .basedare-leaflet-map :global(.peebear-core--blazing) {
          border-color: rgba(255, 95, 130, 0.75);
          box-shadow:
            0 0 0 3px rgba(255, 45, 85, 0.18),
            0 0 26px rgba(255, 45, 85, 0.32),
            0 14px 26px rgba(0, 0, 0, 0.44),
            inset 0 1px 0 rgba(255, 255, 255, 0.1),
            inset 0 -12px 16px rgba(0, 0, 0, 0.24);
        }

        .basedare-leaflet-map :global(.peebear-core--igniting) {
          border-color: rgba(34, 211, 238, 0.72);
          box-shadow:
            0 0 0 3px rgba(34, 211, 238, 0.16),
            0 0 24px rgba(34, 211, 238, 0.26),
            0 14px 26px rgba(0, 0, 0, 0.44),
            inset 0 1px 0 rgba(255, 255, 255, 0.1),
            inset 0 -12px 16px rgba(0, 0, 0, 0.24);
        }

        .basedare-leaflet-map :global(.peebear-core--simmering) {
          border-color: rgba(245, 197, 24, 0.72);
          box-shadow:
            0 0 0 3px rgba(245, 197, 24, 0.14),
            0 0 22px rgba(245, 197, 24, 0.24),
            0 14px 26px rgba(0, 0, 0, 0.44),
            inset 0 1px 0 rgba(255, 255, 255, 0.1),
            inset 0 -12px 16px rgba(0, 0, 0, 0.24);
        }

        .basedare-leaflet-map :global(.peebear-core--cold) {
          border-color: rgba(255, 255, 255, 0.22);
          filter: saturate(0.82);
        }

        .basedare-leaflet-map :global(.peebear-core--unmarked) {
          border-style: dashed;
          border-color: rgba(245, 197, 24, 0.36);
          box-shadow:
            0 0 0 2px rgba(245, 197, 24, 0.08),
            0 0 18px rgba(245, 197, 24, 0.12),
            0 10px 22px rgba(0, 0, 0, 0.38),
            inset 0 1px 0 rgba(255, 255, 255, 0.08),
            inset 0 -12px 16px rgba(0, 0, 0, 0.22);
          filter: saturate(0.78) brightness(0.97);
        }

        .basedare-leaflet-map :global(.peebear-core--pending) {
          border-color: rgba(251, 191, 36, 0.7);
          box-shadow:
            0 0 0 3px rgba(251, 191, 36, 0.12),
            0 0 20px rgba(251, 191, 36, 0.18),
            0 14px 26px rgba(0, 0, 0, 0.44),
            inset 0 1px 0 rgba(255, 255, 255, 0.1),
            inset 0 -12px 16px rgba(0, 0, 0, 0.24);
        }

        .basedare-leaflet-map :global(.peebear-core--first-mark) {
          border-color: rgba(245, 197, 24, 0.84);
          box-shadow:
            0 0 0 3px rgba(245, 197, 24, 0.18),
            0 0 28px rgba(245, 197, 24, 0.28),
            0 14px 26px rgba(0, 0, 0, 0.44),
            inset 0 1px 0 rgba(255, 255, 255, 0.1),
            inset 0 -12px 16px rgba(0, 0, 0, 0.24);
        }

        .basedare-leaflet-map :global(.peebear-core--active) {
          box-shadow:
            4px 6px 14px rgba(0, 0, 0, 0.78),
            -2px -2px 6px rgba(255, 255, 255, 0.06),
            0 0 0 2px rgba(34, 211, 238, 0.52),
            0 0 18px rgba(34, 211, 238, 0.24),
            0 14px 26px rgba(0, 0, 0, 0.44),
            inset 0 1px 0 rgba(255, 255, 255, 0.1),
            inset 0 -12px 16px rgba(0, 0, 0, 0.24);
        }

        .basedare-leaflet-map :global(.peebear-core--hot) {
          box-shadow:
            0 0 0 4px rgba(255, 45, 85, 0.22),
            0 0 34px rgba(255, 45, 85, 0.34),
            0 16px 30px rgba(0, 0, 0, 0.48),
            inset 0 1px 0 rgba(255, 255, 255, 0.1),
            inset 0 -12px 16px rgba(0, 0, 0, 0.24);
        }

        .basedare-leaflet-map :global(.peebear-marker.is-active .peebear-core) {
          box-shadow:
            6px 8px 16px rgba(0, 0, 0, 0.9),
            -2px -2px 6px rgba(255, 255, 255, 0.08),
            0 0 0 2px rgba(245, 197, 24, 0.8),
            0 0 24px rgba(245, 197, 24, 0.4),
            0 18px 30px rgba(0, 0, 0, 0.5),
            inset 0 1px 0 rgba(255, 255, 255, 0.12),
            inset 0 -12px 16px rgba(0, 0, 0, 0.24);
          transform: scale(1.08) translateY(-2px);
        }

        .basedare-leaflet-map :global(.peebear-marker.is-matched .peebear-core) {
          box-shadow:
            0 0 0 3px rgba(34, 211, 238, 0.16),
            0 0 22px rgba(34, 211, 238, 0.22),
            0 12px 24px rgba(0, 0, 0, 0.44),
            inset 0 1px 0 rgba(255, 255, 255, 0.1),
            inset 0 -12px 16px rgba(0, 0, 0, 0.24);
        }

        .basedare-leaflet-map :global(.peebear-marker.is-matched .peebear-state) {
          border-color: rgba(34, 211, 238, 0.2);
          color: rgba(202, 248, 255, 0.92);
        }

        .basedare-leaflet-map :global(.peebear-marker.has-challenge-live.is-active .peebear-challenge-ring) {
          border-color: rgba(248, 221, 114, 0.92);
          box-shadow:
            0 0 0 5px rgba(245, 197, 24, 0.18),
            0 0 0 10px rgba(245, 197, 24, 0.08),
            0 0 28px rgba(245, 197, 24, 0.34),
            inset 0 0 20px rgba(245, 197, 24, 0.1);
        }

        .basedare-leaflet-map :global(.peebear-marker.has-challenge-live.is-active .peebear-challenge-pill) {
          box-shadow:
            0 10px 18px rgba(0, 0, 0, 0.3),
            0 0 22px rgba(245, 197, 24, 0.24),
            inset 0 1px 0 rgba(255, 255, 255, 0.12);
        }

        .basedare-leaflet-map :global(.peebear-head) {
          position: relative;
          z-index: 1;
          width: 88%;
          height: 88%;
          object-fit: contain;
          filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.24));
          user-select: none;
          -webkit-user-drag: none;
        }

        .basedare-leaflet-map :global(.peebear-footprint) {
          display: inline-flex;
          align-items: center;
          gap: 0.38rem;
          border-radius: 9999px;
          border: 1px solid rgba(184, 127, 255, 0.24);
          background:
            linear-gradient(180deg, rgba(184, 127, 255, 0.18), rgba(10, 8, 24, 0.92)),
            linear-gradient(180deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0));
          padding: 4px 10px;
          box-shadow:
            0 12px 22px rgba(0, 0, 0, 0.28),
            0 0 18px rgba(184, 127, 255, 0.12),
            inset 0 1px 0 rgba(255, 255, 255, 0.08);
          white-space: nowrap;
        }

        .basedare-leaflet-map :global(.peebear-footprint.is-first) {
          border-color: rgba(245, 197, 24, 0.28);
          background:
            linear-gradient(180deg, rgba(245, 197, 24, 0.18), rgba(27, 18, 6, 0.92)),
            linear-gradient(180deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0));
          box-shadow:
            0 12px 22px rgba(0, 0, 0, 0.28),
            0 0 18px rgba(245, 197, 24, 0.14),
            inset 0 1px 0 rgba(255, 255, 255, 0.08);
        }

        .basedare-leaflet-map :global(.peebear-footprint.is-latest) {
          transform: scale(1.04);
        }

        .basedare-leaflet-map :global(.peebear-footprint-dot) {
          display: inline-flex;
          height: 9px;
          width: 9px;
          border-radius: 9999px;
          background: #d8b4fe;
          box-shadow: 0 0 0 3px rgba(184, 127, 255, 0.12), 0 0 12px rgba(184, 127, 255, 0.26);
        }

        .basedare-leaflet-map :global(.peebear-footprint.is-first .peebear-footprint-dot) {
          background: #f5c518;
          box-shadow: 0 0 0 3px rgba(245, 197, 24, 0.12), 0 0 12px rgba(245, 197, 24, 0.26);
        }

        .basedare-leaflet-map :global(.peebear-footprint-label) {
          font-size: 7px;
          font-weight: 900;
          line-height: 1;
          letter-spacing: 0.17em;
          color: rgba(237, 216, 255, 0.96);
        }

        .basedare-leaflet-map :global(.peebear-footprint.is-first .peebear-footprint-label) {
          color: rgba(255, 240, 188, 0.96);
        }

        @keyframes peebearChallengeAura {
          0%,
          100% {
            transform: translateX(-50%) scale(0.98);
            opacity: 0.78;
          }
          50% {
            transform: translateX(-50%) scale(1.04);
            opacity: 1;
          }
        }

        .basedare-leaflet-map :global(.peebear-count) {
          position: absolute;
          left: 50%;
          top: -16px;
          transform: translateX(-50%);
          z-index: 2;
          display: flex;
          min-width: 28px;
          height: 24px;
          align-items: center;
          justify-content: center;
          border-radius: 9999px;
          border: 2px solid rgba(5, 6, 12, 0.98);
          background: rgba(10, 12, 22, 0.96);
          padding: 0 8px;
          font-size: 12px;
          font-weight: 800;
          line-height: 1;
          color: white;
          letter-spacing: 0;
          text-shadow: 0 1px 4px rgba(0, 0, 0, 0.35);
          box-shadow:
            0 10px 18px rgba(0, 0, 0, 0.3),
            inset 0 1px 0 rgba(255, 255, 255, 0.08);
        }

        .basedare-leaflet-map :global(.peebear-count--blazing) {
          border-color: rgba(255, 95, 130, 0.8);
          color: #fff1f4;
          box-shadow:
            0 0 0 2px rgba(255, 45, 85, 0.18),
            0 12px 22px rgba(0, 0, 0, 0.3),
            inset 0 1px 0 rgba(255, 255, 255, 0.08);
        }

        .basedare-leaflet-map :global(.peebear-count--igniting) {
          border-color: rgba(34, 211, 238, 0.8);
          color: #d8fbff;
          box-shadow:
            0 0 0 2px rgba(34, 211, 238, 0.16),
            0 12px 22px rgba(0, 0, 0, 0.3),
            inset 0 1px 0 rgba(255, 255, 255, 0.08);
        }

        .basedare-leaflet-map :global(.peebear-count--simmering) {
          border-color: rgba(245, 197, 24, 0.82);
          color: #fff2b7;
          box-shadow:
            0 0 0 2px rgba(245, 197, 24, 0.14),
            0 12px 22px rgba(0, 0, 0, 0.3),
            inset 0 1px 0 rgba(255, 255, 255, 0.08);
        }

        .basedare-leaflet-map :global(.peebear-count--cold) {
          border-color: rgba(255, 255, 255, 0.22);
          color: rgba(255, 255, 255, 0.92);
        }

        .basedare-leaflet-map :global(.peebear-count--first-mark) {
          border-color: rgba(245, 197, 24, 0.9);
          color: #fff2b7;
          box-shadow:
            0 0 0 2px rgba(245, 197, 24, 0.18),
            0 12px 22px rgba(0, 0, 0, 0.3),
            inset 0 1px 0 rgba(255, 255, 255, 0.08);
        }

        .basedare-leaflet-map :global(.peebear-ripple) {
          position: absolute;
          left: 50%;
          top: 30px;
          width: 60px;
          height: 60px;
          border-radius: 9999px;
          transform: translate(-50%, -50%);
          animation: peebearRipple 2s infinite;
        }

        .basedare-leaflet-map :global(.peebear-ripple--blazing) {
          border: 1.5px solid rgba(255, 45, 85, 0.88);
        }

        .basedare-leaflet-map :global(.peebear-ripple--igniting) {
          border: 1.5px solid rgba(34, 211, 238, 0.84);
        }

        .basedare-leaflet-map :global(.peebear-ripple--simmering) {
          border: 1.5px solid rgba(245, 197, 24, 0.84);
        }

        .basedare-leaflet-map :global(.peebear-ripple--pending) {
          border: 1.5px dashed rgba(251, 191, 36, 0.76);
        }

        .basedare-leaflet-map :global(.peebear-shadow) {
          margin-top: 5px;
          height: 5px;
          width: 18px;
          border-radius: 9999px;
          background: rgba(0, 0, 0, 0.62);
          filter: blur(2px);
        }

        .basedare-leaflet-map :global(.leaflet-tile-pane) {
          filter: var(--tile-filter);
        }

        .basedare-leaflet-map :global(.leaflet-control-zoom),
        .basedare-leaflet-map :global(.leaflet-control-attribution) {
          border: 1px solid rgba(107, 33, 255, 0.24);
          border-radius: 16px;
          background:
            linear-gradient(180deg, rgba(255, 255, 255, 0.07), rgba(6, 7, 15, 0.94)) !important;
          box-shadow:
            0 16px 28px rgba(0, 0, 0, 0.26),
            inset 0 1px 0 rgba(255, 255, 255, 0.08);
          overflow: hidden;
        }

        .basedare-leaflet-map :global(.leaflet-control-zoom a),
        .basedare-leaflet-map :global(.leaflet-control-attribution a),
        .basedare-leaflet-map :global(.leaflet-control-attribution) {
          color: rgba(255, 255, 255, 0.62) !important;
        }

        .basedare-leaflet-map :global(.leaflet-control-zoom a) {
          border-bottom-color: rgba(255, 255, 255, 0.06) !important;
          background: transparent !important;
        }

        .basedare-leaflet-map :global(.leaflet-control-zoom a:hover) {
          color: #f5c518 !important;
          background: rgba(255, 255, 255, 0.05) !important;
        }
      `}</style>
    </section>
  );
}
