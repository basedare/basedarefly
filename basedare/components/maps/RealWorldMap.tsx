'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  MapContainer,
  Marker,
  TileLayer,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import { divIcon, type LatLngExpression, type Map as LeafletMap } from 'leaflet';
import {
  ArrowLeft,
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
import MapCrosshair from '@/app/map/MapCrosshair';
import CreatePlaceChallengeButton from '@/components/place-challenges/CreatePlaceChallengeButton';
import TagPlaceButton from '@/components/place-tags/TagPlaceButton';

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
  targetWalletAddress: string | null;
  claimedBy: string | null;
  claimRequestTag: string | null;
  claimRequestedAt: string | null;
  claimRequestStatus: string | null;
};

type PulseState = 'blazing' | 'igniting' | 'simmering' | 'cold';
type PulseFilter = 'all' | 'blazing' | 'igniting' | 'simmering' | 'unmarked';
type MapPreset = 'classic' | 'crt' | 'heat' | 'noir' | 'night';
type PlaceVisualState = 'unmarked' | 'pending' | 'first-mark' | 'active' | 'hot';
type CeremonyState =
  | {
      kind: 'pending' | 'first-spark' | 'alive-upgrade';
      title: string;
      body: string;
    }
  | null;

const markerIconCache = new Map<string, ReturnType<typeof divIcon>>();

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
    value: 'crt',
    label: 'CRT',
    accentClass:
      'data-[active=true]:border-[#b87fff]/40 data-[active=true]:bg-[#b87fff]/[0.12] data-[active=true]:text-[#e5c7ff]',
  },
  {
    value: 'heat',
    label: 'Heat',
    accentClass:
      'data-[active=true]:border-rose-300/45 data-[active=true]:bg-rose-500/[0.14] data-[active=true]:text-rose-100',
  },
  {
    value: 'noir',
    label: 'Noir',
    accentClass:
      'data-[active=true]:border-white/25 data-[active=true]:bg-white/[0.08] data-[active=true]:text-white',
  },
  {
    value: 'night',
    label: 'Night',
    accentClass:
      'data-[active=true]:border-cyan-300/38 data-[active=true]:bg-cyan-500/[0.12] data-[active=true]:text-cyan-100',
  },
];

const DEFAULT_CENTER: [number, number] = [-33.8688, 151.2093];
const DEFAULT_ZOOM = 12;

function getRadiusMetersForZoom(zoom: number) {
  if (zoom >= 15) return 2000;
  if (zoom >= 13) return 5000;
  if (zoom >= 11) return 10000;
  return 20000;
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
      label: dare.claimRequestTag ? `pending ${dare.claimRequestTag}` : 'creator pending',
      className:
        'border-amber-300/18 bg-amber-500/[0.08] text-amber-100',
    };
  }

  if (dare.claimedBy || dare.targetWalletAddress) {
    return {
      label: dare.streamerHandle ? `claimed by ${dare.streamerHandle}` : 'creator attached',
      className:
        'border-emerald-300/18 bg-emerald-500/[0.08] text-emerald-100',
    };
  }

  return {
    label: dare.streamerHandle ? `target ${dare.streamerHandle}` : 'open',
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
        label: 'Pending',
        description: 'A fresh mark is waiting in the Chaos Inbox.',
      };
    case 'first-mark':
      return {
        label: 'First Spark',
        description: 'This place just got its first verified memory.',
      };
    case 'active':
      return {
        label: 'Alive',
        description: 'Verified marks are stacking and the place is warming up.',
      };
    case 'hot':
      return {
        label: 'Hot',
        description: 'This place is pulsing with recent verified activity.',
      };
    case 'unmarked':
    default:
      return {
        label: 'Unmarked',
        description: 'No approved marks yet. This place is waiting for its first spark.',
      };
  }
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
  active,
  visualState,
  challengeLiveCount,
}: {
  pulse: PulseState;
  approvedCount: number;
  active: boolean;
  visualState: PlaceVisualState;
  challengeLiveCount: number;
}) {
  const badge = getSparkBadge(approvedCount);
  const showRipple = pulse !== 'cold' || visualState === 'pending' || visualState === 'first-mark';
  const showCount = approvedCount > 0;
  const hasChallengeLive = challengeLiveCount > 0;
  const liveLabel =
    challengeLiveCount > 1 ? `LIVE ${challengeLiveCount > 9 ? '9+' : challengeLiveCount}` : 'LIVE';
  const cacheKey = `${pulse}:${visualState}:${active ? 'active' : 'idle'}:${hasChallengeLive ? `challenge-${Math.min(challengeLiveCount, 9)}` : 'standard'}:${badge}`;

  const cachedIcon = markerIconCache.get(cacheKey);
  if (cachedIcon) {
    return cachedIcon;
  }

  const icon = divIcon({
    className: 'peebear-leaflet-icon',
    iconSize: [82, 96],
    iconAnchor: [41, 62],
    popupAnchor: [0, -48],
    html: `
      <div class="peebear-marker peebear-marker--${pulse} peebear-marker--${visualState} ${active ? 'is-active' : ''} ${hasChallengeLive ? 'has-challenge-live' : ''}">
        ${showRipple ? `<span class="peebear-ripple peebear-ripple--${visualState === 'pending' ? 'pending' : pulse}"></span>` : ''}
        ${hasChallengeLive ? `<span class="peebear-challenge-aura" aria-hidden="true"></span><span class="peebear-challenge-ring" aria-hidden="true"></span><span class="peebear-challenge-pill">${liveLabel}</span>` : ''}
        ${showCount ? `<span class="peebear-count peebear-count--${visualState === 'first-mark' ? 'first-mark' : pulse}">${badge}</span>` : ''}
        <div class="peebear-core peebear-core--${pulse} peebear-core--${visualState}">
          <img src="/assets/peebear-head.png" alt="PeeBear pin" class="peebear-head" />
        </div>
        <span class="peebear-state peebear-state--${visualState}">${visualState === 'first-mark' ? 'FIRST' : visualState === 'pending' ? 'PENDING' : visualState === 'hot' ? 'HOT' : visualState === 'active' ? 'ALIVE' : 'UNMARKED'}</span>
        <div class="peebear-shadow"></div>
      </div>
    `,
  });

  markerIconCache.set(cacheKey, icon);
  return icon;
}

function renderProofPreview(tag: PlaceTagItem) {
  if (tag.source === 'SEEDED_MEMORY') {
    return (
      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-[16px] border border-white/10 bg-[linear-gradient(180deg,rgba(245,197,24,0.14)_0%,rgba(184,127,255,0.12)_45%,rgba(7,9,18,0.96)_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] md:h-22 md:w-22">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.16),transparent_30%),linear-gradient(135deg,transparent_0%,rgba(255,255,255,0.04)_48%,transparent_100%)]" />
        <div className="absolute inset-x-2.5 top-2.5 rounded-[12px] border border-[#f5c518]/20 bg-black/28 px-2 py-2 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
          <div className="text-[8.5px] font-semibold uppercase tracking-[0.2em] text-[#f8dd72]">
            Seeded
          </div>
          <div className="mt-1 text-[8px] uppercase tracking-[0.16em] text-white/56">
            Memory
          </div>
        </div>
      </div>
    );
  }

  if (tag.proofType === 'VIDEO') {
    return (
      <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-[16px] border border-white/10 bg-black/30">
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
    <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-[16px] border border-white/10 bg-black/30">
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
  const searchParams = useSearchParams();
  const mapViewportRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<LeafletMap | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [nearbyPlaces, setNearbyPlaces] = useState<NearbyPlace[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<SelectedPlace | null>(null);
  const [locating, setLocating] = useState(false);
  const [targetCenter, setTargetCenter] = useState<LatLngExpression | null>(null);
  const [targetZoom, setTargetZoom] = useState<number | null>(null);
  const [sprayBurst, setSprayBurst] = useState(false);
  const [selectedPlaceTags, setSelectedPlaceTags] = useState<PlaceTagItem[]>([]);
  const [selectedPlaceTagsLoading, setSelectedPlaceTagsLoading] = useState(false);
  const [selectedPlaceTagsError, setSelectedPlaceTagsError] = useState<string | null>(null);
  const [selectedPlaceActiveDares, setSelectedPlaceActiveDares] = useState<SelectedPlaceActiveDare[]>([]);
  const [selectedPlaceActiveDaresLoading, setSelectedPlaceActiveDaresLoading] = useState(false);
  const [selectedPlaceFeaturedPaidActivation, setSelectedPlaceFeaturedPaidActivation] = useState<SelectedPlaceActiveDare | null>(null);
  const [pendingPlaceTags, setPendingPlaceTags] = useState<PendingPlaceTagItem[]>([]);
  const [pulseFilter, setPulseFilter] = useState<PulseFilter>('all');
  const [mapPreset, setMapPreset] = useState<MapPreset>('classic');
  const isImmersiveMobile = false;
  const [ceremonyState, setCeremonyState] = useState<CeremonyState>(null);
  const [bootstrappedDefaultPins, setBootstrappedDefaultPins] = useState(false);
  const deepLinkedPlaceSlug = searchParams.get('place');
  const controlSource = searchParams.get('source');
  const deepLinkedCampaignId = searchParams.get('campaignId');
  const deepLinkedDareShortId = searchParams.get('dare');
  const hasDeepLinkedPlace = Boolean(deepLinkedPlaceSlug);
  const isCreatorSource = controlSource === 'creator';
  const showBackToControl = controlSource === 'control' || Boolean(deepLinkedCampaignId);
  const pendingPlaceTagsRef = useRef<PendingPlaceTagItem[]>([]);
  const nearbyFetchIdRef = useRef(0);
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

  const selectedPlaceNeedsDedicatedMarker = useMemo(() => {
    if (!selectedPlace) {
      return false;
    }

    return !filteredNearbyPlaces.some((place) => {
      if (selectedPlace.placeId && place.id === selectedPlace.placeId) {
        return true;
      }

      return (
        Math.abs(place.latitude - selectedPlace.latitude) < 0.000001 &&
        Math.abs(place.longitude - selectedPlace.longitude) < 0.000001
      );
    });
  }, [filteredNearbyPlaces, selectedPlace]);

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
      active: true,
      visualState: selectedVisualState,
      challengeLiveCount: selectedPlace.activeDareCount ?? 0,
    });
  }, [selectedPlace, selectedPulse, selectedVisualState]);

  const mapPanelShellClass =
    'map-panel-shell relative overflow-hidden rounded-[32px] border border-white/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.09)_0%,rgba(255,255,255,0.04)_8%,rgba(8,10,18,0.955)_28%,rgba(5,6,14,0.99)_100%)] shadow-[0_28px_84px_rgba(0,0,0,0.5),0_0_28px_rgba(34,211,238,0.06),0_0_54px_rgba(168,85,247,0.06),inset_0_1px_0_rgba(255,255,255,0.14),inset_0_-16px_22px_rgba(0,0,0,0.22)] md:max-h-[min(680px,calc(100dvh-10rem))] md:rounded-[36px]';
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
                Real venues. Crypto stakes. On-chain proof. Every pin is a legend permanently written to the map.
              </p>

              <div className="mt-7 grid grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:justify-center lg:hidden">
                <div className="rounded-[22px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05)_0%,rgba(7,10,18,0.94)_100%)] px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),inset_0_-12px_18px_rgba(0,0,0,0.22)]">
                  <p className="text-[10px] uppercase tracking-[0.24em] text-white/38">Visible Places</p>
                  <p className="mt-2 text-2xl font-black text-white">{nearbySummary.visible}</p>
                </div>
                <div className="rounded-[22px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05)_0%,rgba(7,10,18,0.94)_100%)] px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),inset_0_-12px_18px_rgba(0,0,0,0.22)]">
                  <p className="text-[10px] uppercase tracking-[0.24em] text-white/38">Active Sparks</p>
                  <p className="mt-2 text-2xl font-black text-white">{nearbySummary.active}</p>
                </div>
              </div>
            </div>

            <div className="hidden lg:flex lg:absolute lg:right-0 lg:top-0">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-[22px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05)_0%,rgba(7,10,18,0.94)_100%)] px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),inset_0_-12px_18px_rgba(0,0,0,0.22)]">
                  <p className="text-[10px] uppercase tracking-[0.24em] text-white/38">Visible Places</p>
                  <p className="mt-2 text-2xl font-black text-white">{nearbySummary.visible}</p>
                </div>
                <div className="rounded-[22px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05)_0%,rgba(7,10,18,0.94)_100%)] px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),inset_0_-12px_18px_rgba(0,0,0,0.22)]">
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
              <div className="flex items-center gap-3 rounded-[22px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06)_0%,rgba(8,9,16,0.94)_100%)] px-4 py-2.5 shadow-[0_16px_28px_rgba(0,0,0,0.26),inset_0_1px_0_rgba(255,255,255,0.09)]">
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
                  <div className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/36">
                    View mode
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
                          : option.value === 'crt'
                            ? 'bg-[#b87fff]'
                            : option.value === 'heat'
                              ? 'bg-rose-400'
                              : option.value === 'noir'
                                ? 'bg-white/70'
                                : 'bg-cyan-300'
                      }`} />
                      <span>{option.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div
            ref={mapViewportRef}
            data-map-preset={mapPreset}
            className={`basedare-leaflet-map basedare-leaflet-map--${mapPreset} relative overflow-hidden ${isImmersiveMobile ? 'h-[calc(100dvh-172px)] min-h-0' : 'h-[68vh] min-h-[560px]'}`}
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

              {filteredNearbyPlaces.map((place) => {
                const pulse = getPulse(place.tagSummary.approvedCount, place.tagSummary.lastTaggedAt);
                const visualState = getPlaceVisualState({
                  approvedCount: place.tagSummary.approvedCount,
                  lastTaggedAt: place.tagSummary.lastTaggedAt,
                });
                const isActive = selectedPlace?.placeId === place.id;
                return (
                  <Marker
                    key={place.id}
                    position={[place.latitude, place.longitude]}
                    icon={createPeebearMarkerIcon({
                      pulse,
                      approvedCount: place.tagSummary.approvedCount,
                      active: isActive,
                      visualState,
                      challengeLiveCount: place.activeDareCount,
                    })}
                    zIndexOffset={isActive ? 600 : 240}
                    eventHandlers={{
                      click: () => focusExistingPlace(place),
                    }}
                  />
                );
              })}

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
              <div className="absolute bottom-4 left-1/2 z-30 w-[min(calc(100%-1rem),24rem)] -translate-x-1/2 md:top-24 md:bottom-6 md:left-auto md:right-6 md:w-[360px] md:translate-x-0 lg:w-[372px]">
                <div className={mapPanelShellClass}>
                  <div className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-white/24 to-transparent" />
                  <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_16%_0%,rgba(34,211,238,0.13),transparent_26%),radial-gradient(circle_at_85%_100%,rgba(168,85,247,0.12),transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.04)_0%,transparent_32%,transparent_72%,rgba(0,0,0,0.16)_100%)]" />
                  <div className="pointer-events-none absolute inset-[1px] rounded-[31px] border border-white/6 md:rounded-[35px]" />
                  <div className="flex max-h-[52dvh] flex-col overflow-hidden md:max-h-[min(640px,calc(100dvh-13rem))]">
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
                        {selectedPlaceTags.some((tag) => tag.firstMark) ? (
                          <span className="rounded-full border border-[#f5c518]/35 bg-[#f5c518]/[0.12] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#f8dd72] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                            First mark captured
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
                    <div className={mapPanelMetricClass}>
                      <p className="text-[10px] uppercase tracking-[0.24em] text-white/35">Sparks</p>
                      <p className="mt-2 text-[1.65rem] font-black leading-none text-white">{selectedPlace.approvedCount ?? 0}</p>
                    </div>
                    <div className={mapPanelMetricClass}>
                      <p className="text-[10px] uppercase tracking-[0.24em] text-white/35">Heat</p>
                      <p className="mt-2 text-[1.65rem] font-black leading-none text-white">{selectedPlace.heatScore ?? 0}</p>
                    </div>
                  </div>

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
                          <p className="text-lg font-bold text-white">{focusedCreatorActivation.title}</p>
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
                          <Link
                            href={`/dare/${focusedCreatorActivation.shortId}`}
                            className="rounded-full border border-cyan-300/18 bg-cyan-500/[0.08] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-100"
                          >
                            {focusedCreatorActivation.claimedBy || focusedCreatorActivation.targetWalletAddress || focusedCreatorActivation.claimRequestStatus === 'PENDING'
                              ? 'Open Brief'
                              : 'Claim Now'}
                          </Link>
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
                          <p className="text-lg font-bold text-white">{featuredPaidActivation.title}</p>
                          <p className="mt-2 text-sm text-white/65">
                            {featuredPaidActivation.brandName ?? 'Brand-backed'} activation live at this place.
                          </p>
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
                          <Link
                            href={`/dare/${featuredPaidActivation.shortId}`}
                            className="rounded-full border border-rose-300/18 bg-rose-500/[0.08] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-rose-100"
                          >
                            {featuredPaidActivation.claimedBy || featuredPaidActivation.targetWalletAddress || featuredPaidActivation.claimRequestStatus === 'PENDING'
                              ? 'Open Brief'
                              : 'Claim Now'}
                          </Link>
                        ) : null}
                      </div>
                    </div>
                  ) : null}

                  <div className={`mt-4 ${mapPanelSectionClass}`}>
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

                  <div className={`mt-4 ${mapPanelSectionClass}`}>
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
                                <p className="text-sm font-semibold text-white">{dare.title}</p>
                                <div className="mt-2 flex flex-wrap gap-2">
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
                                <Link
                                  href={`/dare/${dare.shortId}`}
                                  className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/72"
                                >
                                  Open
                                </Link>
                              ) : null}
                            </div>
                          </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="mt-3 text-sm text-white/55">
                        No live challenges here yet. Fund the first one from this place panel.
                      </p>
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
                      <div className="mt-3 space-y-3">
                        {selectedPlaceTags.slice(0, 3).map((tag) => (
                          <div
                            key={tag.id}
                            className="rounded-[20px] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.04)_0%,rgba(7,10,16,0.92)_16%,rgba(6,6,12,0.9)_100%)] px-3 py-2.5 shadow-[0_14px_24px_rgba(0,0,0,0.12),inset_0_1px_0_rgba(255,255,255,0.05)]"
                          >
                            <div className="flex gap-3">
                              {renderProofPreview(tag)}
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-3">
                                  <p className="truncate text-sm font-semibold text-white">
                                    {tag.creatorTag
                                      ? `@${tag.creatorTag}`
                                      : `${tag.walletAddress.slice(0, 6)}...${tag.walletAddress.slice(-4)}`}
                                  </p>
                                  <p className="shrink-0 text-[11px] uppercase tracking-[0.2em] text-white/36">
                                    {getLastSparkLabel(tag.submittedAt)}
                                  </p>
                                </div>
                                {tag.firstMark ? (
                                  <div className="mt-2 inline-flex rounded-full border border-[#f5c518]/35 bg-[#f5c518]/[0.12] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#f8dd72]">
                                    First spark
                                  </div>
                                ) : null}
                                <p className="mt-1.5 text-sm text-white/62">
                                  {tag.caption || 'Verified mark submitted without a caption.'}
                                </p>
                                {tag.vibeTags.length > 0 ? (
                                  <div className="mt-2 flex flex-wrap gap-1.5">
                                    {tag.vibeTags.map((vibeTag) => (
                                      <span
                                        key={vibeTag}
                                        className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-0.5 text-[10px] uppercase tracking-[0.18em] text-white/45"
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
                      buttonClassName="inline-flex min-h-[58px] w-full items-center justify-center gap-2 rounded-full border border-cyan-400/24 bg-[linear-gradient(180deg,rgba(34,211,238,0.16)_0%,rgba(4,28,42,0.72)_100%)] px-4 py-3 text-center text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-100 shadow-[0_14px_26px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.1),inset_0_-12px_16px_rgba(0,0,0,0.2)] transition hover:-translate-y-[1px] hover:border-cyan-300/45 hover:bg-cyan-500/[0.13] sm:text-[11px]"
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
                      buttonClassName="inline-flex min-h-[58px] w-full items-center justify-center gap-2 rounded-full border border-[#f5c518]/28 bg-[linear-gradient(180deg,rgba(245,197,24,0.18)_0%,rgba(59,35,5,0.78)_100%)] px-4 py-3 text-center text-[10px] font-semibold uppercase tracking-[0.18em] text-[#fff0b1] shadow-[0_14px_26px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.1),inset_0_-12px_16px_rgba(0,0,0,0.2)] transition hover:-translate-y-[1px] hover:border-[#f5c518]/55 hover:bg-[#f5c518]/[0.18] sm:text-[11px]"
                    />

                    {selectedPlace.slug ? (
                      <Link
                        href={`/venues/${selectedPlace.slug}${
                          isCreatorSource
                            ? `?source=creator${deepLinkedDareShortId ? `&dare=${encodeURIComponent(deepLinkedDareShortId)}` : ''}`
                            : ''
                        }`}
                        className="inline-flex min-h-[58px] w-full items-center justify-center rounded-full border border-fuchsia-400/26 bg-[linear-gradient(180deg,rgba(217,70,239,0.22)_0%,rgba(91,33,182,0.12)_100%)] px-4 py-3 text-center text-[10px] font-semibold uppercase tracking-[0.16em] text-fuchsia-100 shadow-[0_14px_26px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.1),inset_0_-12px_16px_rgba(0,0,0,0.2)] transition hover:-translate-y-[1px] hover:border-fuchsia-300/45 hover:bg-fuchsia-500/18 sm:text-[11px] xl:tracking-[0.18em]"
                      >
                        <span className="max-w-[8rem] leading-[1.15] sm:max-w-none">
                          Open place page
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
        .map-panel-shell {
          transform-origin: 88% 8%;
          will-change: transform, opacity;
          animation: mapPanelRollout 300ms cubic-bezier(0.22, 1, 0.36, 1);
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

        .basedare-leaflet-map :global(.peebear-marker) {
          position: relative;
          width: 82px;
          height: 96px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: flex-start;
        }

        .basedare-leaflet-map :global(.peebear-challenge-aura) {
          position: absolute;
          top: 2px;
          left: 50%;
          z-index: 0;
          width: 82px;
          height: 82px;
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
          width: 74px;
          height: 74px;
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
          right: -6px;
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

        .basedare-leaflet-map :global(.peebear-state) {
          margin-top: 6px;
          border-radius: 9999px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(7, 10, 18, 0.82);
          padding: 3px 9px;
          font-size: 8.5px;
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
            radial-gradient(circle at 30% 22%, rgba(255, 255, 255, 0.14), transparent 46%),
            linear-gradient(180deg, rgba(16, 18, 34, 0.96), rgba(8, 10, 20, 0.98));
          box-shadow:
            0 12px 24px rgba(0, 0, 0, 0.42),
            inset 0 1px 0 rgba(255, 255, 255, 0.1),
            inset 0 -12px 16px rgba(0, 0, 0, 0.24);
          animation: peebearHover 3.2s ease-in-out infinite;
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
          border-color: rgba(255, 255, 255, 0.18);
          box-shadow:
            0 10px 22px rgba(0, 0, 0, 0.38),
            inset 0 1px 0 rgba(255, 255, 255, 0.08),
            inset 0 -12px 16px rgba(0, 0, 0, 0.22);
          filter: saturate(0.72) brightness(0.94);
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
            0 0 0 3px rgba(34, 211, 238, 0.16),
            0 0 24px rgba(34, 211, 238, 0.26),
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
            0 0 0 4px rgba(245, 197, 24, 0.42),
            0 0 34px rgba(245, 197, 24, 0.32),
            0 18px 30px rgba(0, 0, 0, 0.5),
            inset 0 1px 0 rgba(255, 255, 255, 0.12),
            inset 0 -12px 16px rgba(0, 0, 0, 0.24);
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
