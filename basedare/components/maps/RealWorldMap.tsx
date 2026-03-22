'use client';

import Image from 'next/image';
import Link from 'next/link';
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
  Flame,
  Loader2,
  LocateFixed,
  MapPin,
  Minus,
  Plus,
  Search,
  Sparkles,
} from 'lucide-react';
import MapCrosshair from '@/app/map/MapCrosshair';
import TagPlaceButton from '@/components/place-tags/TagPlaceButton';

type SearchResult = {
  id: string;
  externalPlaceId: string;
  placeSource: string;
  name: string;
  displayName: string;
  address: string | null;
  city: string | null;
  country: string | null;
  latitude: number;
  longitude: number;
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
  distanceDisplay: string;
  tagSummary: {
    approvedCount: number;
    heatScore: number;
    lastTaggedAt: string | null;
  };
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
  placeSource?: string | null;
  externalPlaceId?: string | null;
  approvedCount?: number;
  heatScore?: number;
  lastTaggedAt?: string | null;
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

type PulseState = 'blazing' | 'igniting' | 'simmering' | 'cold';
type PulseFilter = 'all' | 'blazing' | 'igniting' | 'simmering' | 'unmarked';

const DEFAULT_CENTER: LatLngExpression = [-33.8688, 151.2093];
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

function getSparkBadge(approvedCount: number) {
  if (approvedCount <= 0) return '!';
  if (approvedCount > 9) return '9+';
  return String(approvedCount);
}

function createPeebearMarkerIcon({
  pulse,
  approvedCount,
  active,
}: {
  pulse: PulseState;
  approvedCount: number;
  active: boolean;
}) {
  const badge = getSparkBadge(approvedCount);
  const showRipple = pulse !== 'cold';

  return divIcon({
    className: 'peebear-leaflet-icon',
    iconSize: [72, 82],
    iconAnchor: [36, 56],
    popupAnchor: [0, -48],
    html: `
      <div class="peebear-marker peebear-marker--${pulse} ${active ? 'is-active' : ''}">
        ${showRipple ? `<span class="peebear-ripple peebear-ripple--${pulse}"></span>` : ''}
        <div class="peebear-core peebear-core--${pulse}">
          <img src="/assets/peebear-head.png" alt="PeeBear pin" class="peebear-head" />
          <span class="peebear-badge peebear-badge--${pulse}">${badge}</span>
        </div>
        <div class="peebear-shadow"></div>
      </div>
    `,
  });
}

function renderProofPreview(tag: PlaceTagItem) {
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
  const [pendingPlaceTags, setPendingPlaceTags] = useState<PendingPlaceTagItem[]>([]);
  const [pulseFilter, setPulseFilter] = useState<PulseFilter>('all');
  const [locationStatus, setLocationStatus] = useState<'idle' | 'ready' | 'denied'>('idle');

  const requestApproximateLocation = useCallback(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setLocationStatus('denied');
      setLocating(false);
      return () => undefined;
    }

    let cancelled = false;

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (cancelled) return;
        setTargetCenter([position.coords.latitude, position.coords.longitude]);
        setTargetZoom(14);
        setLocating(false);
        setLocationStatus('ready');
      },
      () => {
        if (cancelled) return;
        setLocating(false);
        setLocationStatus('denied');
      },
      { enableHighAccuracy: true, maximumAge: 30000, timeout: 8000 }
    );

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => requestApproximateLocation(), [requestApproximateLocation]);

  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (trimmed.length < 2) {
      setSearchResults([]);
      setSearching(false);
      return;
    }

    const timeout = setTimeout(async () => {
      try {
        setSearching(true);
        const response = await fetch(`/api/places/search?q=${encodeURIComponent(trimmed)}`);
        const payload = (await response.json()) as SearchResponse;

        if (!response.ok || !payload.success || !payload.data?.results) {
          throw new Error('Failed to search places');
        }

        setSearchResults(payload.data.results);
      } catch (error) {
        console.error('[REAL_WORLD_MAP] Search failed:', error);
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 350);

    return () => clearTimeout(timeout);
  }, [searchQuery]);

  const fetchNearbyPlaces = useCallback(async (latitude: number, longitude: number, zoom: number) => {
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

      setNearbyPlaces(payload.data.venues);
    } catch (error) {
      console.error('[REAL_WORLD_MAP] Nearby places failed:', error);
    }
  }, []);

  const handleMapReady = useCallback((map: LeafletMap) => {
    mapInstanceRef.current = map;
    setMapReady(true);
  }, []);

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

        setSelectedPlaceTags(payload.data.tags);
        setPendingPlaceTags((current) =>
          current.filter(
            (pendingTag) =>
              pendingTag.placeId !== placeId ||
              !payload.data?.tags.some((approvedTag) => approvedTag.id === pendingTag.tagId)
          )
        );
        setSelectedPlace((current) =>
          current?.placeId === placeId
            ? {
                ...current,
                approvedCount: payload.data?.approvedCount ?? current.approvedCount,
                heatScore: payload.data?.heatScore ?? current.heatScore,
                lastTaggedAt:
                  payload.data?.tags[0]?.submittedAt ?? current.lastTaggedAt ?? null,
              }
            : current
        );
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
      setSelectedPlaceTags([]);
      setSelectedPlaceTagsLoading(false);
      setSelectedPlaceTagsError(null);
      setPendingPlaceTags([]);
      return;
    }

    const controller = new AbortController();
    void loadSelectedPlaceTags(placeId, controller.signal);

    return () => controller.abort();
  }, [loadSelectedPlaceTags, selectedPlace?.placeId]);

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

  return (
    <section className="relative z-20 px-4 pb-16 pt-8 sm:px-6 md:px-10">
      <div className="mx-auto max-w-7xl">
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

        <div className="relative overflow-hidden rounded-[38px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05)_0%,rgba(9,7,19,0.96)_18%,rgba(5,4,14,0.98)_100%)] shadow-[0_30px_120px_rgba(0,0,0,0.58),0_0_42px_rgba(34,211,238,0.08),inset_0_1px_0_rgba(255,255,255,0.1),inset_0_-18px_24px_rgba(0,0,0,0.26)]">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_0%,rgba(168,85,247,0.12),transparent_28%),radial-gradient(circle_at_85%_100%,rgba(34,211,238,0.12),transparent_30%)]" />

          <div className="relative z-20 flex flex-col gap-4 border-b border-white/8 px-4 py-4 sm:px-5">
            <div className="relative w-full max-w-xl">
              <div className="flex items-center gap-3 rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06)_0%,rgba(8,9,16,0.94)_100%)] px-4 py-3 shadow-[0_16px_28px_rgba(0,0,0,0.26),inset_0_1px_0_rgba(255,255,255,0.09)]">
                <Search className="h-4 w-4 text-cyan-200" />
                <input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
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
                        setSearchQuery(result.name);
                        setSearchResults([]);
                        setSelectedPlace({
                          name: result.name,
                          address: result.address,
                          city: result.city,
                          country: result.country,
                          latitude: result.latitude,
                          longitude: result.longitude,
                          placeSource: result.placeSource,
                          externalPlaceId: result.externalPlaceId,
                        });
                        setTargetCenter([result.latitude, result.longitude]);
                        setTargetZoom(15);
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

            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.24em] text-white/45">
                <div className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-2">
                  click the map to drop a pin
                </div>
                <div className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-2">
                  {locating
                    ? 'locating you...'
                    : locationStatus === 'ready'
                      ? 'opened near you'
                      : 'using open map data'}
                </div>
                <div className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-2">
                  showing {filteredNearbyPlaces.length} / {nearbyPlaces.length}
                </div>
                {locationStatus === 'denied' ? (
                  <div className="rounded-full border border-amber-300/18 bg-amber-500/[0.08] px-3 py-2 text-amber-100/80">
                    location blocked
                  </div>
                ) : null}
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={requestApproximateLocation}
                  disabled={locating}
                  className="inline-flex items-center gap-2 rounded-full border border-cyan-300/22 bg-cyan-500/[0.08] px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-cyan-100 shadow-[0_10px_18px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.06)] transition hover:-translate-y-[1px] hover:border-cyan-200/35 hover:bg-cyan-500/[0.14] disabled:cursor-wait disabled:opacity-70"
                >
                  {locating ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <LocateFixed className="h-3.5 w-3.5" />
                  )}
                  <span>{locating ? 'Locating...' : 'Locate Me'}</span>
                </button>
                {filterOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    data-active={pulseFilter === option.value}
                    onClick={() => setPulseFilter(option.value)}
                    className={`inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/52 shadow-[0_10px_18px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.06)] transition hover:-translate-y-[1px] hover:border-white/18 hover:text-white ${option.accentClass}`}
                  >
                    <span>{option.label}</span>
                    <span className="rounded-full border border-white/10 bg-black/20 px-2 py-0.5 text-[10px] text-white/62">
                      {filterCounts[option.value]}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div ref={mapViewportRef} className="basedare-leaflet-map relative h-[68vh] min-h-[560px] overflow-hidden">
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
                const isActive = selectedPlace?.placeId === place.id;
                return (
                  <Marker
                    key={place.id}
                    position={[place.latitude, place.longitude]}
                    icon={createPeebearMarkerIcon({
                      pulse,
                      approvedCount: place.tagSummary.approvedCount,
                      active: isActive,
                    })}
                    zIndexOffset={isActive ? 600 : 240}
                    eventHandlers={{
                      click: () => {
                        setSelectedPlace({
                          placeId: place.id,
                          slug: place.slug,
                          name: place.name,
                          address: [place.city, place.country].filter(Boolean).join(', ') || place.description,
                          city: place.city,
                          country: place.country,
                          latitude: place.latitude,
                          longitude: place.longitude,
                          approvedCount: place.tagSummary.approvedCount,
                          heatScore: place.tagSummary.heatScore,
                          lastTaggedAt: place.tagSummary.lastTaggedAt,
                        });
                        setTargetCenter([place.latitude, place.longitude]);
                        setTargetZoom(15);
                      },
                    }}
                  />
                );
              })}
            </MapContainer>

            <div className="pointer-events-none absolute inset-0 z-[2] bg-[radial-gradient(ellipse_45%_38%_at_24%_18%,rgba(245,197,24,0.08)_0%,transparent_58%),radial-gradient(ellipse_34%_40%_at_78%_72%,rgba(34,211,238,0.08)_0%,transparent_62%),radial-gradient(ellipse_28%_36%_at_54%_44%,rgba(168,85,247,0.09)_0%,transparent_66%)]" />
            <div className="network-mesh pointer-events-none absolute inset-0 z-[3] opacity-[0.12]" />
            <div className="network-links pointer-events-none absolute inset-0 z-[4] opacity-[0.16]" />
            <div className="starfield pointer-events-none absolute inset-0 z-[5] opacity-[0.22]" />
            <div className="scanlines pointer-events-none absolute inset-0 z-[6] opacity-[0.06]" />
            <div className="glass-haze pointer-events-none absolute inset-0 z-[7]" />
            <div className="absolute left-5 top-5 z-[9] hidden md:flex flex-col gap-2">
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
            <div className="pointer-events-none absolute right-5 top-5 z-[8] hidden md:flex items-center gap-3 rounded-full border border-[rgba(107,33,255,0.28)] bg-[linear-gradient(180deg,rgba(255,255,255,0.08)_0%,rgba(11,10,22,0.9)_100%)] px-4 py-2 shadow-[0_16px_30px_rgba(0,0,0,0.32),inset_0_1px_0_rgba(255,255,255,0.08)]">
              <span className="h-2.5 w-2.5 rounded-full bg-[#22d3ee] shadow-[0_0_12px_rgba(34,211,238,0.85)]" />
              <div>
                <p className="text-[10px] uppercase tracking-[0.24em] text-white/38">Tag Mode</p>
                <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#f5c518]">
                  Spray the grid
                </p>
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
              <div className="absolute inset-x-4 bottom-4 z-30 md:right-4 md:left-auto md:w-[420px]">
                <div className="overflow-hidden rounded-[30px] border border-white/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.08)_0%,rgba(255,255,255,0.02)_10%,rgba(7,9,18,0.96)_58%,rgba(5,6,14,0.98)_100%)] p-5 shadow-[0_30px_100px_rgba(0,0,0,0.55),0_0_34px_rgba(34,211,238,0.08),inset_0_1px_0_rgba(255,255,255,0.1),inset_0_-14px_24px_rgba(0,0,0,0.24)]">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-500/[0.08] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.25em] text-cyan-200">
                        <Sparkles className="h-3.5 w-3.5" />
                        {selectedPlace.placeId ? 'Selected place' : 'Dropped pin'}
                      </div>
                      <h3 className="mt-3 text-xl font-black text-white">{selectedPlace.name}</h3>
                      <p className="mt-2 text-sm text-white/55">
                        {selectedPlace.address || formatCoordinateLabel(selectedPlace.latitude, selectedPlace.longitude)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedPlace(null)}
                      className="rounded-full border border-white/12 bg-white/[0.05] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/60 transition hover:text-white"
                    >
                      close
                    </button>
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-3">
                    <div className="rounded-[20px] border border-white/8 bg-[linear-gradient(180deg,rgba(6,8,14,0.82)_0%,rgba(0,0,0,0.26)_100%)] px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.07),inset_0_-10px_14px_rgba(0,0,0,0.22)]">
                      <p className="text-[10px] uppercase tracking-[0.24em] text-white/35">Pulse</p>
                      <p className="mt-2 text-lg font-black text-white">{selectedPulse}</p>
                    </div>
                    <div className="rounded-[20px] border border-white/8 bg-[linear-gradient(180deg,rgba(6,8,14,0.82)_0%,rgba(0,0,0,0.26)_100%)] px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.07),inset_0_-10px_14px_rgba(0,0,0,0.22)]">
                      <p className="text-[10px] uppercase tracking-[0.24em] text-white/35">Sparks</p>
                      <p className="mt-2 text-lg font-black text-white">{selectedPlace.approvedCount ?? 0}</p>
                    </div>
                    <div className="rounded-[20px] border border-white/8 bg-[linear-gradient(180deg,rgba(6,8,14,0.82)_0%,rgba(0,0,0,0.26)_100%)] px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.07),inset_0_-10px_14px_rgba(0,0,0,0.22)]">
                      <p className="text-[10px] uppercase tracking-[0.24em] text-white/35">Heat</p>
                      <p className="mt-2 text-lg font-black text-white">{selectedPlace.heatScore ?? 0}</p>
                    </div>
                  </div>

                  <div className="mt-4 rounded-[22px] border border-white/10 bg-white/[0.04] px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.07)]">
                    <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.24em] text-white/40">
                      <Flame className="h-3.5 w-3.5 text-cyan-200" />
                      Crossed Paths
                    </div>
                    <p className="mt-2 text-sm text-white/70">
                      {selectedPlace.approvedCount
                        ? `${selectedPlace.approvedCount} approved marks have already hit this spot.`
                        : 'No sparks yet. Be the first to leave a verified mark here.'}
                    </p>
                    <p className="mt-2 text-xs text-white/42">{selectedLastSpark}</p>
                  </div>

                  {selectedPendingPlaceTags.length > 0 ? (
                    <div className="mt-4 rounded-[22px] border border-amber-400/18 bg-amber-500/[0.06] px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                      <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.24em] text-amber-200/80">
                        <Loader2 className="h-3.5 w-3.5" />
                        Pending Marks
                      </div>
                      <div className="mt-3 space-y-3">
                        {selectedPendingPlaceTags.slice(0, 3).map((tag) => (
                          <div
                            key={tag.tagId}
                            className="rounded-[18px] border border-amber-300/12 bg-black/16 px-3 py-3"
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

                  <div className="mt-4 rounded-[22px] border border-white/10 bg-white/[0.04] px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.07)]">
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
                            className="rounded-[18px] border border-white/8 bg-[linear-gradient(180deg,rgba(7,10,16,0.92)_0%,rgba(6,6,12,0.86)_100%)] px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
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
                                <p className="mt-2 text-sm text-white/62">
                                  {tag.caption || 'Verified mark submitted without a caption.'}
                                </p>
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
                    ) : (
                      <p className="mt-3 text-sm text-white/55">
                        No approved marks are live here yet. First verified mark wins the story.
                      </p>
                    )}
                  </div>

                  <div className="mt-4 flex flex-wrap gap-3">
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
                          placeSource: current?.placeSource ?? selectedPlace.placeSource ?? null,
                          externalPlaceId:
                            current?.externalPlaceId ?? selectedPlace.externalPlaceId ?? null,
                          approvedCount: current?.approvedCount ?? 0,
                          heatScore: current?.heatScore ?? 0,
                          lastTaggedAt: current?.lastTaggedAt ?? null,
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
                      }}
                      buttonClassName="inline-flex items-center justify-center gap-2 rounded-full border border-cyan-400/24 bg-cyan-500/[0.08] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-100 shadow-[0_10px_18px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.08),inset_0_-10px_14px_rgba(0,0,0,0.18)] transition hover:-translate-y-[1px] hover:border-cyan-300/45 hover:bg-cyan-500/[0.13]"
                    />

                    {selectedPlace.slug ? (
                      <Link
                        href={`/venues/${selectedPlace.slug}`}
                        className="inline-flex items-center justify-center gap-2 rounded-full border border-fuchsia-400/26 bg-[linear-gradient(180deg,rgba(217,70,239,0.18)_0%,rgba(91,33,182,0.08)_100%)] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-fuchsia-100 shadow-[0_10px_18px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.1),inset_0_-10px_14px_rgba(0,0,0,0.2)] transition hover:-translate-y-[1px] hover:border-fuchsia-300/45 hover:bg-fuchsia-500/18"
                      >
                        Open place page
                      </Link>
                    ) : null}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <style jsx>{`
        .scanlines {
          background: repeating-linear-gradient(
            0deg,
            transparent,
            transparent 2px,
            rgba(0, 0, 0, 0.1) 2px,
            rgba(0, 0, 0, 0.1) 4px
          );
        }

        .network-mesh {
          background-image:
            linear-gradient(rgba(129, 103, 255, 0.24) 1px, transparent 1px),
            linear-gradient(90deg, rgba(129, 103, 255, 0.24) 1px, transparent 1px);
          background-size: 96px 96px, 96px 96px;
        }

        .network-links {
          background-image:
            linear-gradient(32deg, transparent 48%, rgba(153, 126, 255, 0.18) 50%, transparent 52%),
            linear-gradient(-32deg, transparent 48%, rgba(87, 164, 255, 0.14) 50%, transparent 52%),
            linear-gradient(74deg, transparent 48%, rgba(137, 95, 255, 0.14) 50%, transparent 52%);
          background-size: 220px 220px, 240px 240px, 280px 280px;
          background-position: 0 0, 30px 40px, 90px 60px;
        }

        .starfield {
          background-image:
            radial-gradient(circle at 12% 15%, rgba(255, 255, 255, 0.82) 0 2px, transparent 3px),
            radial-gradient(circle at 70% 20%, rgba(181, 203, 255, 0.58) 0 2px, transparent 3px),
            radial-gradient(circle at 23% 62%, rgba(170, 130, 255, 0.68) 0 2px, transparent 3px),
            radial-gradient(circle at 78% 70%, rgba(255, 255, 255, 0.5) 0 2px, transparent 3px),
            radial-gradient(circle at 40% 44%, rgba(156, 199, 255, 0.42) 0 3px, transparent 4px),
            radial-gradient(circle at 88% 45%, rgba(160, 120, 255, 0.45) 0 2px, transparent 3px);
        }

        .glass-haze {
          background:
            linear-gradient(180deg, rgba(255, 255, 255, 0.025) 0%, rgba(255, 255, 255, 0) 28%),
            radial-gradient(120% 100% at 50% 0%, rgba(255, 255, 255, 0.035) 0%, transparent 58%);
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
          width: 72px;
          height: 82px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: flex-start;
        }

        .basedare-leaflet-map :global(.peebear-core) {
          position: relative;
          display: flex;
          height: 54px;
          width: 54px;
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

        .basedare-leaflet-map :global(.peebear-marker.is-active .peebear-core) {
          box-shadow:
            0 0 0 4px rgba(245, 197, 24, 0.42),
            0 0 34px rgba(245, 197, 24, 0.32),
            0 18px 30px rgba(0, 0, 0, 0.5),
            inset 0 1px 0 rgba(255, 255, 255, 0.12),
            inset 0 -12px 16px rgba(0, 0, 0, 0.24);
        }

        .basedare-leaflet-map :global(.peebear-head) {
          position: relative;
          z-index: 1;
          width: 80%;
          height: 80%;
          object-fit: contain;
          filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.24));
          user-select: none;
          -webkit-user-drag: none;
        }

        .basedare-leaflet-map :global(.peebear-badge) {
          position: absolute;
          right: -4px;
          top: -4px;
          z-index: 2;
          display: flex;
          min-width: 20px;
          height: 20px;
          align-items: center;
          justify-content: center;
          border-radius: 9999px;
          border: 2px solid #0d0018;
          padding: 0 4px;
          font-size: 9px;
          font-weight: 800;
          line-height: 1;
          color: #0d0018;
          letter-spacing: 0.02em;
        }

        .basedare-leaflet-map :global(.peebear-badge--blazing) {
          background: #ff2d55;
          color: #fff1f4;
        }

        .basedare-leaflet-map :global(.peebear-badge--igniting) {
          background: #22d3ee;
          color: #04151b;
        }

        .basedare-leaflet-map :global(.peebear-badge--simmering) {
          background: #f5c518;
          color: #1c1400;
        }

        .basedare-leaflet-map :global(.peebear-badge--cold) {
          background: rgba(255, 255, 255, 0.92);
          color: #0d0018;
        }

        .basedare-leaflet-map :global(.peebear-ripple) {
          position: absolute;
          left: 50%;
          top: 27px;
          width: 54px;
          height: 54px;
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

        .basedare-leaflet-map :global(.peebear-shadow) {
          margin-top: 5px;
          height: 5px;
          width: 18px;
          border-radius: 9999px;
          background: rgba(0, 0, 0, 0.62);
          filter: blur(2px);
        }

        .basedare-leaflet-map :global(.leaflet-tile-pane) {
          filter: brightness(0.42) saturate(0.88) contrast(1.14) hue-rotate(8deg);
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
