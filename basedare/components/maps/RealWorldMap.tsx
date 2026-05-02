'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import maplibregl, {
  type GeoJSONSource,
  type LayerSpecification,
  type Map as MapLibreMap,
  type MapLayerMouseEvent,
  type Marker as MapLibreMarker,
  type PositionAnchor,
} from 'maplibre-gl';
import type { Feature, FeatureCollection, LineString, Point, Polygon } from 'geojson';
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
  RotateCcw,
  RotateCw,
  Search,
  Sparkles,
  X,
  Zap,
} from 'lucide-react';
import { useAccount } from 'wagmi';
import { calculateDistance } from '@/lib/geo';
import { getDareLifecycleModel } from '@/lib/dare-lifecycle';
import { triggerHaptic } from '@/lib/mobile-haptics';
import { SIGNAL_ROOM_URL } from '@/lib/signal-room';
import type { VenueLegend, VenueProfileSummary } from '@/lib/venue-types';
import { buildVenueActivationIntakeHref, buildVenueChallengeCreateHref } from '@/lib/venue-launch';
import MapCrosshair from '@/app/map/MapCrosshair';
import CosmicButton from '@/components/ui/CosmicButton';
import SquircleLink from '@/components/ui/SquircleLink';
import CreatePlaceChallengeButton from '@/components/place-challenges/CreatePlaceChallengeButton';
import TagPlaceButton from '@/components/place-tags/TagPlaceButton';
import SentinelBadge from '@/components/SentinelBadge';
import ClaimVenueButton from '@/components/venues/ClaimVenueButton';

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

type VenueCommandCenter = {
  status: 'live' | 'claimable';
  claimState: 'unclaimed' | 'pending' | 'claimed';
  label: string;
  summary: string;
  sponsorReady: boolean;
  activeCampaignCount: number;
  consoleUrl: string | null;
  contactUrl: string;
  contactLabel: string;
  operatorTag: string | null;
  metrics: {
    approvedMarks: number;
    activeChallenges: number;
    paidActivations: number;
    totalLiveFundingUsd: number;
    uniqueVisitorsToday: number | null;
    scansLastHour: number | null;
  };
};

type VenueMapMode = {
  id: 'classic' | 'noir' | 'ar';
  status: 'live' | 'planned';
  label: string;
  description: string;
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
  commandCenter?: VenueCommandCenter;
  mapModes?: VenueMapMode[];
  profile?: VenueProfileSummary;
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
  commandCenter?: VenueCommandCenter;
  mapModes?: VenueMapMode[];
  profile?: VenueProfileSummary;
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

type ResolvePlaceResponse = {
  success: boolean;
  error?: string;
  data?: {
    created: boolean;
    place: {
      id: string;
      slug: string;
      name: string;
      address: string | null;
      city: string | null;
      country: string | null;
      latitude: number;
      longitude: number;
    };
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
      profile: VenueProfileSummary;
      tagSummary: {
        approvedCount: number;
        heatScore: number;
        lastTaggedAt: string | null;
      };
      commandCenter: VenueCommandCenter;
      mapModes: VenueMapMode[];
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
type PulseFilter = 'all' | 'blazing' | 'igniting' | 'simmering' | 'verified' | 'unmarked';
type MapPreset = 'classic' | 'noir';
type MapVenueFocus = 'all' | 'live' | 'matched' | 'footprint';
type PlaceVisualState = 'unmarked' | 'pending' | 'first-mark' | 'active' | 'hot';
type VenueCommandCardTone = 'gold' | 'cyan' | 'purple';
type SelectedCommandAction = 'fund' | 'venue';
type CeremonyState =
  | {
      kind: 'pending' | 'first-spark' | 'alive-upgrade';
      title: string;
      body: string;
    }
  | null;
type NearbyDareFilter = 'all' | 'open' | 'sentinel' | 'high';
type HappeningTone = 'gold' | 'cyan' | 'purple' | 'rose';
type HappeningWindow = {
  key: 'morning' | 'day' | 'sunset' | 'late';
  label: string;
  dateLabel: string;
  prompt: string;
};
type MapHappening = {
  id: string;
  kind: 'live-dare' | 'local-event' | 'first-spark' | 'venue-memory' | 'tourist-route';
  eyebrow: string;
  title: string;
  detail: string;
  timingLabel: string;
  distanceLabel: string | null;
  rewardLabel: string | null;
  actionLabel: string;
  href: string | null;
  place: NearbyPlace | null;
  tone: HappeningTone;
};
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

const markerIconCache = new Map<string, string>();
const footprintMarkerIconCache = new Map<string, string>();
const placeClusterIconCache = new Map<string, string>();

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
const DEFAULT_MAP_BEARING = -18;
const DEFAULT_MAP_PITCH = 62;
const OPENFREEMAP_LIBERTY_STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty';
const MAPLIBRE_VENUE_SOURCE_ID = 'basedare-venue-signals';
const MAPLIBRE_CHAOS_SOURCE_ID = 'basedare-chaos-zones';
const MAPLIBRE_FOOTPRINT_SOURCE_ID = 'basedare-footprint-trail';
const MAPLIBRE_SELECTED_SOURCE_ID = 'basedare-selected-signal';
const MAPLIBRE_USER_SOURCE_ID = 'basedare-user-position';
const MAPLIBRE_LIVE_SIGNAL_HALO_LAYER_ID = 'basedare-live-signal-halo';
const MAPLIBRE_ACTIVATED_PLINTH_LAYER_ID = 'basedare-activated-venue-plinth';
const MAPLIBRE_PROOF_NODE_LAYER_ID = 'basedare-proof-nodes';
const MAPLIBRE_SIGNAL_LABEL_LAYER_ID = 'basedare-signal-labels';
const MAPLIBRE_INTERACTIVE_SIGNAL_LAYER_IDS = [
  MAPLIBRE_SIGNAL_LABEL_LAYER_ID,
  MAPLIBRE_ACTIVATED_PLINTH_LAYER_ID,
  MAPLIBRE_PROOF_NODE_LAYER_ID,
  MAPLIBRE_LIVE_SIGNAL_HALO_LAYER_ID,
];
const CURRENT_LOCATION_CENTERED_ICON_PATH = '/assets/current-location-bear-pin.png';
const DEFAULT_VENUE_MAP_MODES: VenueMapMode[] = [
  {
    id: 'classic',
    status: 'live',
    label: 'Classic',
    description: 'Primary tactical venue map mode.',
  },
  {
    id: 'noir',
    status: 'live',
    label: 'Noir',
    description: 'Lower-noise venue reconnaissance mode.',
  },
  {
    id: 'ar',
    status: 'planned',
    label: 'AR',
    description: 'LocAR venue overlays are planned for this map layer.',
  },
];
const PROXIMITY_REVEAL_METERS = 100;
const PROXIMITY_GHOST_METERS = 500;
const currentLocationIconCache = new Map<string, string>();

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

function projectLatLngToWorldPoint(latitude: number, longitude: number, zoom: number) {
  const sin = Math.sin((latitude * Math.PI) / 180);
  const scale = 256 * 2 ** zoom;

  return {
    x: ((longitude + 180) / 360) * scale,
    y: (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * scale,
  };
}

function createMarkerElement(html: string, className: string) {
  const element = document.createElement('div');
  element.className = className;
  element.innerHTML = html;
  return element;
}

function emptyPointCollection(): FeatureCollection<Point> {
  return {
    type: 'FeatureCollection',
    features: [],
  };
}

function emptyPolygonCollection(): FeatureCollection<Polygon> {
  return {
    type: 'FeatureCollection',
    features: [],
  };
}

function emptyLineCollection(): FeatureCollection<LineString> {
  return {
    type: 'FeatureCollection',
    features: [],
  };
}

function setGeoJsonSourceData(
  map: MapLibreMap,
  sourceId: string,
  data: FeatureCollection<Point | Polygon | LineString>
) {
  const source = map.getSource(sourceId) as GeoJSONSource | undefined;
  source?.setData(data);
}

function getMapLibreFirstSymbolLayerId(map: MapLibreMap) {
  return map.getStyle().layers?.find((layer) => layer.type === 'symbol')?.id;
}

function getMapLibreVectorSourceId(map: MapLibreMap) {
  const sources = map.getStyle().sources as Record<string, { type?: string }> | undefined;
  if (!sources) return null;

  return (
    Object.entries(sources).find(
      ([sourceId, source]) =>
        source.type === 'vector' &&
        (sourceId.includes('openmaptiles') ||
          sourceId.includes('openfreemap') ||
          sourceId.includes('versatiles') ||
          sourceId.includes('osm'))
    )?.[0] ??
    Object.entries(sources).find(([, source]) => source.type === 'vector')?.[0] ??
    null
  );
}

function createCirclePolygonFeature({
  latitude,
  longitude,
  radiusMeters,
  properties,
}: {
  latitude: number;
  longitude: number;
  radiusMeters: number;
  properties: Record<string, string | number | boolean | null>;
}): Feature<Polygon> {
  const steps = 48;
  const latitudeRadians = (latitude * Math.PI) / 180;
  const metersPerDegreeLatitude = 111_320;
  const metersPerDegreeLongitude = Math.max(1, 111_320 * Math.cos(latitudeRadians));
  const coordinates: Array<[number, number]> = [];

  for (let index = 0; index <= steps; index += 1) {
    const angle = (index / steps) * Math.PI * 2;
    const dx = Math.cos(angle) * radiusMeters;
    const dy = Math.sin(angle) * radiusMeters;
    coordinates.push([
      longitude + dx / metersPerDegreeLongitude,
      latitude + dy / metersPerDegreeLatitude,
    ]);
  }

  return {
    type: 'Feature',
    properties,
    geometry: {
      type: 'Polygon',
      coordinates: [coordinates],
    },
  };
}

function getMapLibrePulseColor(pulse: PulseState, visualState: PlaceVisualState) {
  if (visualState === 'hot' || pulse === 'blazing') return '#ff2d55';
  if (visualState === 'active' || pulse === 'igniting') return '#22d3ee';
  if (visualState === 'first-mark' || pulse === 'simmering') return '#f8dd72';
  if (visualState === 'pending') return '#f59e0b';
  return '#b87fff';
}

function getMapLibreSignalLabel({
  activeDareCount,
  approvedCount,
  matched,
  visualState,
}: {
  activeDareCount: number;
  approvedCount: number;
  matched: boolean;
  visualState: PlaceVisualState;
}) {
  if (activeDareCount > 1) return `${activeDareCount} live`;
  if (activeDareCount === 1) return 'live dare';
  if (matched) return 'matched';
  if (approvedCount > 1) return `${approvedCount} marks`;
  if (approvedCount === 1) return 'first mark';
  if (visualState === 'pending') return 'pending';
  return 'wake spot';
}

function getChaosLevelForPlace(place: NearbyPlace) {
  const approvedCount = place.tagSummary.approvedCount;
  const heatScore = place.tagSummary.heatScore;
  const liveSignal = place.activeDareCount * 22;
  const memorySignal = approvedCount * 7;

  return Math.min(100, Math.max(8, heatScore + liveSignal + memorySignal));
}

function buildVenueSignalCollection({
  places,
  matchedVenueIndex,
  showMatchedLayer,
  selectedPlace,
}: {
  places: NearbyPlace[];
  matchedVenueIndex: Map<string, unknown>;
  showMatchedLayer: boolean;
  selectedPlace: SelectedPlace | null;
}): FeatureCollection<Point> {
  return {
    type: 'FeatureCollection',
    features: places.map((place): Feature<Point> => {
      const visualState = getPlaceVisualState({
        approvedCount: place.tagSummary.approvedCount,
        lastTaggedAt: place.tagSummary.lastTaggedAt,
      });
      const pulse = getPulse(place.tagSummary.approvedCount, place.tagSummary.lastTaggedAt);
      const matched = showMatchedLayer && matchedVenueIndex.has(place.slug);
      const selected =
        Boolean(selectedPlace?.placeId && selectedPlace.placeId === place.id) ||
        Boolean(selectedPlace?.slug && selectedPlace.slug === place.slug);
      const chaosLevel = getChaosLevelForPlace(place);

      return {
        type: 'Feature',
        properties: {
          id: place.id,
          slug: place.slug,
          name: place.name,
          pulse,
          visualState,
          approvedCount: place.tagSummary.approvedCount,
          heatScore: place.tagSummary.heatScore,
          activeDareCount: place.activeDareCount,
          liveSignal: place.activeDareCount > 0 ? Math.min(9, place.activeDareCount) : 0,
          chaosLevel,
          matched,
          selected,
          activated: isVenueActivated(place.commandCenter),
          pulseColor: getMapLibrePulseColor(pulse, visualState),
          signalLabel: getMapLibreSignalLabel({
            activeDareCount: place.activeDareCount,
            approvedCount: place.tagSummary.approvedCount,
            matched,
            visualState,
          }),
        },
        geometry: {
          type: 'Point',
          coordinates: [place.longitude, place.latitude],
        },
      };
    }),
  };
}

function buildChaosZoneCollection({
  places,
  matchedVenueIndex,
  showMatchedLayer,
}: {
  places: NearbyPlace[];
  matchedVenueIndex: Map<string, unknown>;
  showMatchedLayer: boolean;
}): FeatureCollection<Polygon> {
  return {
    type: 'FeatureCollection',
    features: places
      .map((place) => {
        const visualState = getPlaceVisualState({
          approvedCount: place.tagSummary.approvedCount,
          lastTaggedAt: place.tagSummary.lastTaggedAt,
        });
        const pulse = getPulse(place.tagSummary.approvedCount, place.tagSummary.lastTaggedAt);
        const matched = showMatchedLayer && matchedVenueIndex.has(place.slug);
        const chaosLevel = getChaosLevelForPlace(place);
        const hasZone =
          chaosLevel >= 22 ||
          place.activeDareCount > 0 ||
          matched ||
          visualState === 'hot' ||
          visualState === 'active';

        if (!hasZone) return null;

        return createCirclePolygonFeature({
          latitude: place.latitude,
          longitude: place.longitude,
          radiusMeters: Math.min(720, 130 + chaosLevel * 5.8 + place.activeDareCount * 90),
          properties: {
            id: place.id,
            slug: place.slug,
            pulse,
            visualState,
            matched,
            chaosLevel,
            activeDareCount: place.activeDareCount,
            pulseColor: getMapLibrePulseColor(pulse, visualState),
          },
        });
      })
      .filter((feature): feature is Feature<Polygon> => Boolean(feature)),
  };
}

function buildSelectedSignalCollection(selectedPlace: SelectedPlace | null): FeatureCollection<Point> {
  if (!selectedPlace) return emptyPointCollection();

  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: {
          id: selectedPlace.placeId ?? selectedPlace.slug ?? 'dropped-pin',
          name: selectedPlace.name,
          activeDareCount: selectedPlace.activeDareCount ?? 0,
          heatScore: selectedPlace.heatScore ?? 0,
        },
        geometry: {
          type: 'Point',
          coordinates: [selectedPlace.longitude, selectedPlace.latitude],
        },
      },
    ],
  };
}

function buildUserPositionCollection(
  userLocation: { latitude: number; longitude: number } | null
): FeatureCollection<Point> {
  if (!userLocation) return emptyPointCollection();

  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: {
          id: 'current-user',
        },
        geometry: {
          type: 'Point',
          coordinates: [userLocation.longitude, userLocation.latitude],
        },
      },
    ],
  };
}

function buildFootprintLineCollection({
  marks,
  enabled,
}: {
  marks: FootprintMark[];
  enabled: boolean;
}): FeatureCollection<LineString> {
  if (!enabled || marks.length < 2) return emptyLineCollection();

  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: {
          id: 'creator-footprint',
        },
        geometry: {
          type: 'LineString',
          coordinates: marks.map((mark) => [mark.venue.longitude, mark.venue.latitude]),
        },
      },
    ],
  };
}

function tuneMapLibreBaseStyle(map: MapLibreMap, preset: MapPreset) {
  const layers = map.getStyle().layers ?? [];
  const muted = preset === 'noir';

  layers.forEach((layer) => {
    try {
      if (layer.type === 'background') {
        map.setPaintProperty(layer.id, 'background-color', muted ? '#030407' : '#040611');
        return;
      }

      const layerId = layer.id.toLowerCase();

      if (layer.type === 'fill') {
        if (layerId.includes('water')) {
          map.setPaintProperty(layer.id, 'fill-color', muted ? '#05070d' : '#052638');
          map.setPaintProperty(layer.id, 'fill-opacity', muted ? 0.78 : 0.96);
          map.setPaintProperty(layer.id, 'fill-outline-color', muted ? '#10131a' : 'rgba(103,232,249,0.22)');
          return;
        }

        if (layerId.includes('park') || layerId.includes('landcover') || layerId.includes('wood')) {
          map.setPaintProperty(layer.id, 'fill-color', muted ? '#080a09' : '#0d1b16');
          map.setPaintProperty(layer.id, 'fill-opacity', muted ? 0.42 : 0.62);
          return;
        }

        if (
          layerId.includes('landuse') ||
          layerId.includes('residential') ||
          layerId.includes('commercial') ||
          layerId.includes('industrial')
        ) {
          map.setPaintProperty(layer.id, 'fill-color', muted ? '#090a10' : '#101526');
          map.setPaintProperty(layer.id, 'fill-opacity', muted ? 0.58 : 0.82);
          return;
        }

        map.setPaintProperty(layer.id, 'fill-color', muted ? '#08090f' : '#0d1221');
        map.setPaintProperty(layer.id, 'fill-opacity', muted ? 0.56 : 0.76);
      }

      if (layer.type === 'line') {
        if (
          layerId.includes('water') ||
          layerId.includes('river') ||
          layerId.includes('stream') ||
          layerId.includes('canal')
        ) {
          map.setPaintProperty(layer.id, 'line-color', muted ? '#1f2937' : '#38bdf8');
          map.setPaintProperty(layer.id, 'line-opacity', muted ? 0.34 : 0.42);
          return;
        }

        const roadColor = muted ? '#2a2d38' : '#33405f';
        const arterialColor = muted ? '#393b45' : '#6d5aa6';
        map.setPaintProperty(
          layer.id,
          'line-color',
          layerId.includes('major') || layerId.includes('primary') || layerId.includes('motorway')
            ? arterialColor
            : roadColor
        );
        map.setPaintProperty(layer.id, 'line-opacity', muted ? 0.46 : 0.68);
      }

      if (layer.type === 'symbol') {
        if (layerId.includes('place') || layerId.includes('label') || layerId.includes('name')) {
          map.setPaintProperty(layer.id, 'text-color', muted ? '#e6e8ee' : '#d9d6ff');
          map.setPaintProperty(layer.id, 'text-halo-color', muted ? '#030407' : '#070611');
          map.setPaintProperty(layer.id, 'text-halo-width', 1.2);
        }

        if (layerId.includes('poi')) {
          map.setPaintProperty(layer.id, 'text-opacity', muted ? 0.32 : 0.42);
          map.setPaintProperty(layer.id, 'icon-opacity', muted ? 0.18 : 0.26);
        }
      }
    } catch {
      // Some OpenFreeMap layers intentionally omit paint properties; skip those safely.
    }
  });
}

function ensureMapLibreSource(map: MapLibreMap, sourceId: string, data: FeatureCollection<Point | Polygon | LineString>) {
  if (map.getSource(sourceId)) return;

  map.addSource(sourceId, {
    type: 'geojson',
    data,
  });
}

function addMapLibreLayer(map: MapLibreMap, layer: LayerSpecification, beforeId?: string) {
  if (map.getLayer(layer.id)) return;
  map.addLayer(layer, beforeId);
}

function ensureMapLibreDareLayers(map: MapLibreMap, preset: MapPreset) {
  tuneMapLibreBaseStyle(map, preset);

  ensureMapLibreSource(map, MAPLIBRE_CHAOS_SOURCE_ID, emptyPolygonCollection());
  ensureMapLibreSource(map, MAPLIBRE_VENUE_SOURCE_ID, emptyPointCollection());
  ensureMapLibreSource(map, MAPLIBRE_SELECTED_SOURCE_ID, emptyPointCollection());
  ensureMapLibreSource(map, MAPLIBRE_USER_SOURCE_ID, emptyPointCollection());
  ensureMapLibreSource(map, MAPLIBRE_FOOTPRINT_SOURCE_ID, emptyLineCollection());

  const firstSymbolLayerId = getMapLibreFirstSymbolLayerId(map);

  const vectorSourceId = getMapLibreVectorSourceId(map);
  if (vectorSourceId) {
    try {
      addMapLibreLayer(
        map,
        {
          id: 'basedare-3d-city-mass',
          type: 'fill-extrusion',
          source: vectorSourceId,
          'source-layer': 'building',
          minzoom: 13,
          paint: {
            'fill-extrusion-color': [
              'interpolate',
              ['linear'],
              ['zoom'],
              13,
              preset === 'noir' ? '#11131a' : '#1a1d34',
              16,
              preset === 'noir' ? '#272936' : '#3a315c',
            ],
            'fill-extrusion-height': [
              'interpolate',
              ['linear'],
              ['zoom'],
              13,
              0,
              15,
              ['to-number', ['coalesce', ['get', 'render_height'], ['get', 'height'], 28]],
            ],
            'fill-extrusion-base': ['to-number', ['coalesce', ['get', 'render_min_height'], ['get', 'min_height'], 0]],
            'fill-extrusion-opacity': preset === 'noir' ? 0.42 : 0.64,
            'fill-extrusion-vertical-gradient': true,
          },
        },
        firstSymbolLayerId
      );
    } catch {
      // OpenFreeMap-compatible styles do not all expose building vectors under the same source-layer.
    }
  }

  addMapLibreLayer(
    map,
    {
      id: 'basedare-chaos-zones-fill',
      type: 'fill',
      source: MAPLIBRE_CHAOS_SOURCE_ID,
      paint: {
        'fill-color': [
          'match',
          ['get', 'visualState'],
          'hot',
          '#ff2d55',
          'active',
          '#22d3ee',
          'first-mark',
          '#f8dd72',
          'pending',
          '#f59e0b',
          '#b87fff',
        ],
        'fill-opacity': [
          'interpolate',
          ['linear'],
          ['get', 'chaosLevel'],
          0,
          0.02,
          35,
          preset === 'noir' ? 0.08 : 0.13,
          100,
          preset === 'noir' ? 0.16 : 0.24,
        ],
      },
    },
    firstSymbolLayerId
  );

  addMapLibreLayer(
    map,
    {
      id: 'basedare-chaos-zones-edge',
      type: 'line',
      source: MAPLIBRE_CHAOS_SOURCE_ID,
      paint: {
        'line-color': [
          'match',
          ['get', 'visualState'],
          'hot',
          '#ff6f91',
          'active',
          '#67e8f9',
          'first-mark',
          '#f8dd72',
          'pending',
          '#fbbf24',
          '#c084fc',
        ],
        'line-width': ['interpolate', ['linear'], ['zoom'], 10, 0.6, 15, 1.8],
        'line-opacity': ['interpolate', ['linear'], ['get', 'chaosLevel'], 0, 0.08, 100, 0.42],
        'line-blur': 1.6,
      },
    },
    firstSymbolLayerId
  );

  addMapLibreLayer(
    map,
    {
      id: 'basedare-live-heat',
      type: 'heatmap',
      source: MAPLIBRE_VENUE_SOURCE_ID,
      maxzoom: 16,
      paint: {
        'heatmap-weight': [
          'interpolate',
          ['linear'],
          ['get', 'chaosLevel'],
          0,
          0.04,
          100,
          1,
        ],
        'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 10, 0.7, 15, 1.8],
        'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 10, 18, 15, 46],
        'heatmap-opacity': preset === 'noir' ? 0.34 : 0.48,
        'heatmap-color': [
          'interpolate',
          ['linear'],
          ['heatmap-density'],
          0,
          'rgba(0,0,0,0)',
          0.18,
          'rgba(184,127,255,0.18)',
          0.42,
          'rgba(34,211,238,0.34)',
          0.72,
          'rgba(245,197,24,0.42)',
          1,
          'rgba(255,45,85,0.58)',
        ],
      },
    },
    firstSymbolLayerId
  );

  addMapLibreLayer(
    map,
    {
      id: MAPLIBRE_LIVE_SIGNAL_HALO_LAYER_ID,
      type: 'circle',
      source: MAPLIBRE_VENUE_SOURCE_ID,
      paint: {
        'circle-pitch-alignment': 'map',
        'circle-radius': [
          'interpolate',
          ['linear'],
          ['zoom'],
          10,
          ['+', 12, ['*', ['get', 'liveSignal'], 3]],
          15,
          ['+', 26, ['*', ['get', 'liveSignal'], 7]],
        ],
        'circle-color': [
          'match',
          ['get', 'visualState'],
          'hot',
          '#ff2d55',
          'active',
          '#22d3ee',
          'first-mark',
          '#f8dd72',
          'pending',
          '#f59e0b',
          '#b87fff',
        ],
        'circle-opacity': [
          'interpolate',
          ['linear'],
          ['get', 'chaosLevel'],
          0,
          0.06,
          100,
          preset === 'noir' ? 0.22 : 0.34,
        ],
        'circle-blur': 0.74,
        'circle-stroke-width': ['case', ['>', ['get', 'activeDareCount'], 0], 1.2, 0],
        'circle-stroke-color': '#f8dd72',
        'circle-stroke-opacity': ['case', ['>', ['get', 'activeDareCount'], 0], 0.32, 0],
      },
    },
    firstSymbolLayerId
  );

  addMapLibreLayer(
    map,
    {
      id: MAPLIBRE_ACTIVATED_PLINTH_LAYER_ID,
      type: 'circle',
      source: MAPLIBRE_VENUE_SOURCE_ID,
      filter: ['==', ['get', 'activated'], true],
      paint: {
        'circle-pitch-alignment': 'map',
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 18, 13, 32, 16, 58],
        'circle-color': '#22d3ee',
        'circle-opacity': preset === 'noir' ? 0.16 : 0.24,
        'circle-blur': 0.34,
        'circle-stroke-width': ['interpolate', ['linear'], ['zoom'], 10, 1.2, 16, 3],
        'circle-stroke-color': '#67e8f9',
        'circle-stroke-opacity': 0.68,
      },
    },
    firstSymbolLayerId
  );

  addMapLibreLayer(
    map,
    {
      id: MAPLIBRE_PROOF_NODE_LAYER_ID,
      type: 'circle',
      source: MAPLIBRE_VENUE_SOURCE_ID,
      paint: {
        'circle-pitch-alignment': 'map',
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 2.5, 15, 7],
        'circle-color': [
          'case',
          ['>', ['get', 'approvedCount'], 0],
          '#f8dd72',
          ['>', ['get', 'activeDareCount'], 0],
          '#22d3ee',
          '#b87fff',
        ],
        'circle-opacity': ['case', ['>', ['get', 'approvedCount'], 0], 0.9, 0.34],
        'circle-stroke-width': 1,
        'circle-stroke-color': 'rgba(255,255,255,0.72)',
        'circle-stroke-opacity': 0.42,
      },
    },
    firstSymbolLayerId
  );

  addMapLibreLayer(map, {
    id: MAPLIBRE_SIGNAL_LABEL_LAYER_ID,
    type: 'symbol',
    source: MAPLIBRE_VENUE_SOURCE_ID,
    minzoom: 12.25,
    filter: [
      'any',
      ['>', ['get', 'activeDareCount'], 0],
      ['>', ['get', 'approvedCount'], 0],
      ['==', ['get', 'matched'], true],
      ['==', ['get', 'selected'], true],
    ],
    layout: {
      'text-field': ['upcase', ['get', 'signalLabel']],
      'text-size': ['interpolate', ['linear'], ['zoom'], 12, 8.5, 16, 11.5],
      'text-letter-spacing': 0.08,
      'text-offset': [0, 1.9],
      'text-anchor': 'top',
      'text-allow-overlap': false,
      'text-ignore-placement': false,
      'text-optional': true,
    },
    paint: {
      'text-color': [
        'case',
        ['>', ['get', 'activeDareCount'], 0],
        '#f8dd72',
        ['==', ['get', 'matched'], true],
        '#67e8f9',
        '#f4e8ff',
      ],
      'text-opacity': ['interpolate', ['linear'], ['zoom'], 12, 0, 13.25, 0.86, 16, 1],
      'text-halo-color': 'rgba(2,4,10,0.92)',
      'text-halo-width': 1.4,
      'text-halo-blur': 0.6,
    },
  });

  addMapLibreLayer(
    map,
    {
      id: 'basedare-selected-pulse',
      type: 'circle',
      source: MAPLIBRE_SELECTED_SOURCE_ID,
      paint: {
        'circle-pitch-alignment': 'map',
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 34, 16, 92],
        'circle-color': '#f8dd72',
        'circle-opacity': 0.2,
        'circle-blur': 0.82,
        'circle-stroke-width': 2,
        'circle-stroke-color': '#f8dd72',
        'circle-stroke-opacity': 0.34,
      },
    },
    firstSymbolLayerId
  );

  addMapLibreLayer(
    map,
    {
      id: 'basedare-footprint-line',
      type: 'line',
      source: MAPLIBRE_FOOTPRINT_SOURCE_ID,
      paint: {
        'line-color': '#b87fff',
        'line-width': ['interpolate', ['linear'], ['zoom'], 10, 1.6, 15, 3],
        'line-opacity': 0.44,
        'line-blur': 1.2,
        'line-dasharray': [1.6, 2.4],
      },
    },
    firstSymbolLayerId
  );

  addMapLibreLayer(
    map,
    {
      id: 'basedare-user-aura',
      type: 'circle',
      source: MAPLIBRE_USER_SOURCE_ID,
      paint: {
        'circle-pitch-alignment': 'map',
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 26, 15, 58],
        'circle-color': '#22d3ee',
        'circle-opacity': 0.18,
        'circle-blur': 0.68,
      },
    },
    firstSymbolLayerId
  );
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

function getPulseMeaning({
  pulse,
  approvedCount,
  heatScore,
  activeDareCount,
}: {
  pulse: PulseState;
  approvedCount: number;
  heatScore: number;
  activeDareCount: number;
}) {
  if (pulse === 'blazing') {
    return {
      label: 'Blazing',
      description: `This venue is hot right now: ${approvedCount} verified sparks, heat ${heatScore}, and enough recent movement to feel active before you even arrive.`,
    };
  }

  if (pulse === 'igniting') {
    return {
      label: 'Igniting',
      description: `Momentum is real here. Verified marks are stacking, heat is climbing, and ${activeDareCount > 0 ? 'live challenges are helping it move' : 'another activation could push it into the hot tier'}.`,
    };
  }

  if (pulse === 'simmering') {
    return {
      label: 'Simmering',
      description: `This venue has signal, but it still needs repetition. A few more verified sparks will make the story obvious.`,
    };
  }

  return {
    label: 'Dormant',
    description: `The venue exists on the map, but no strong public memory loop is active yet. First mark or first challenge wins the story.`,
  };
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

function isVenueActivated(commandCenter?: VenueCommandCenter | null) {
  if (!commandCenter) return false;

  return (
    commandCenter.status === 'live' ||
    commandCenter.activeCampaignCount > 0 ||
    commandCenter.metrics.paidActivations > 0 ||
    commandCenter.metrics.totalLiveFundingUsd > 0
  );
}

function getVenueActivationMarkerLabel(commandCenter?: VenueCommandCenter | null) {
  if (!commandCenter) return 'OPEN';
  if (isVenueActivated(commandCenter)) return 'ACTIVATED';
  if (commandCenter.sponsorReady) return 'READY';
  if (commandCenter.claimState === 'claimed') return 'CLAIMED';
  return 'CLAIMABLE';
}

function getVenueActivationActionCopy(commandCenter: VenueCommandCenter) {
  if (isVenueActivated(commandCenter)) {
    return {
      label: 'Repeat activation',
      detail: 'Fund another creator moment here',
    };
  }

  return {
    label: 'Activate venue',
    detail: 'Make this pin visibly sponsored',
  };
}

function formatMapUsd(amount: number) {
  return amount.toLocaleString(undefined, {
    maximumFractionDigits: amount >= 10 ? 0 : 2,
  });
}

function getHappeningWindow(date: Date): HappeningWindow {
  const hour = date.getHours();
  const dateLabel = date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  if (hour >= 5 && hour < 11) {
    return {
      key: 'morning',
      label: 'Morning',
      dateLabel,
      prompt: 'Surf checks, coffee stops, and first-light proof.',
    };
  }

  if (hour >= 11 && hour < 17) {
    return {
      key: 'day',
      label: 'Today',
      dateLabel,
      prompt: 'Food, beach routes, local errands, and walkable discoveries.',
    };
  }

  if (hour >= 17 && hour < 21) {
    return {
      key: 'sunset',
      label: 'Sunset',
      dateLabel,
      prompt: 'Golden-hour routes, boardwalks, and venues waking up.',
    };
  }

  return {
    key: 'late',
    label: 'Tonight',
    dateLabel,
    prompt: 'Bars, music, late food, and nightlife signals.',
  };
}

function getVenueTimeFitScore(place: NearbyPlace, windowKey: HappeningWindow['key']) {
  const categoryText = [...place.categories, ...(place.profile?.legends.map((legend) => legend.label) ?? [])]
    .join(' ')
    .toLowerCase();

  if (windowKey === 'morning') {
    if (/(surf|beach|boardwalk|coffee|cafe|breakfast|wellness|yoga)/.test(categoryText)) return 24;
  }

  if (windowKey === 'day') {
    if (/(food|restaurant|cafe|coffee|landmark|beach|surf|retail|tourism|walk)/.test(categoryText)) return 18;
  }

  if (windowKey === 'sunset') {
    if (/(beach|surf|boardwalk|dock|water|bar|restaurant|view|sunset)/.test(categoryText)) return 26;
  }

  if (windowKey === 'late') {
    if (/(nightlife|bar|music|club|food|restaurant|sports)/.test(categoryText)) return 28;
  }

  return 0;
}

function getVenueHappeningCopy(place: NearbyPlace, window: HappeningWindow) {
  const categoryText = [...place.categories, ...(place.profile?.legends.map((legend) => legend.label) ?? [])]
    .join(' ')
    .toLowerCase();
  const approvedCount = place.tagSummary.approvedCount;

  if (place.activeDareCount > 0) {
    return {
      kind: 'venue-memory' as const,
      eyebrow: 'Live venue',
      title: `${place.activeDareCount} mission${place.activeDareCount === 1 ? '' : 's'} moving at ${place.name}`,
      detail: 'There is already money or proof activity here. This is the clearest user path right now.',
      actionLabel: 'View',
      tone: 'cyan' as HappeningTone,
    };
  }

  if (approvedCount <= 0) {
    return {
      kind: 'first-spark' as const,
      eyebrow: 'First mark open',
      title: `Be first at ${place.name}`,
      detail: 'No verified memory is anchored yet. A tourist or local can own the first story here.',
      actionLabel: 'Mark',
      tone: 'purple' as HappeningTone,
    };
  }

  if (window.key === 'morning' && /(surf|beach|coffee|cafe|boardwalk)/.test(categoryText)) {
    return {
      kind: 'tourist-route' as const,
      eyebrow: 'Morning route',
      title: `Start at ${place.name}`,
      detail: 'Good fit for a quick condition check, coffee stop, or first-light clip.',
      actionLabel: 'Open',
      tone: 'cyan' as HappeningTone,
    };
  }

  if (window.key === 'sunset' && /(beach|surf|dock|boardwalk|bar|view)/.test(categoryText)) {
    return {
      kind: 'tourist-route' as const,
      eyebrow: 'Sunset move',
      title: `${place.name} should be checked now`,
      detail: 'This is the right kind of venue for golden-hour proof and easy tourist discovery.',
      actionLabel: 'Open',
      tone: 'gold' as HappeningTone,
    };
  }

  if (window.key === 'late' && /(nightlife|bar|music|club|sports|food)/.test(categoryText)) {
    return {
      kind: 'tourist-route' as const,
      eyebrow: 'Tonight',
      title: `${place.name} has night signal`,
      detail: 'Good candidate for “what should we do now?” traffic, creator clips, and late venue memory.',
      actionLabel: 'Open',
      tone: 'rose' as HappeningTone,
    };
  }

  return {
    kind: 'venue-memory' as const,
    eyebrow: approvedCount > 1 ? 'Local memory' : 'First spark',
    title: `${place.name} is worth checking`,
    detail:
      approvedCount > 1
        ? `${approvedCount} verified sparks already exist here. New users can see the story and add to it.`
        : 'One verified spark exists here. Another mark can make the venue feel alive.',
    actionLabel: 'Open',
    tone: approvedCount > 1 ? ('gold' as HappeningTone) : ('purple' as HappeningTone),
  };
}

type LocalEventTemplate = {
  id: string;
  windows: HappeningWindow['key'][];
  placePatterns: RegExp[];
  eyebrow: string;
  title: (placeName: string) => string;
  detail: string;
  actionLabel: string;
  tone: HappeningTone;
};

const LOCAL_SIARGAO_EVENT_TEMPLATES: LocalEventTemplate[] = [
  {
    id: 'cloud9-surf-check',
    windows: ['morning', 'day'],
    placePatterns: [/cloud\s*9/i, /surf/i, /boardwalk/i, /beach/i],
    eyebrow: 'Local event',
    title: (placeName) => `Surf check around ${placeName}`,
    detail:
      'Tourists usually need local word-of-mouth for wave, lesson, and boardwalk energy. Surface it here as a simple first stop.',
    actionLabel: 'Open spot',
    tone: 'cyan',
  },
  {
    id: 'catangnan-coffee-food',
    windows: ['morning', 'day'],
    placePatterns: [/cat\s*&?\s*gun/i, /catangnan/i, /coffee/i, /cafe/i, /food/i],
    eyebrow: 'Food route',
    title: (placeName) => `Coffee, food, and local check-in at ${placeName}`,
    detail:
      'A low-friction “what do we do now?” stop for tourists before beach, surf, or nightlife plans.',
    actionLabel: 'Open spot',
    tone: 'gold',
  },
  {
    id: 'general-luna-sunset',
    windows: ['sunset'],
    placePatterns: [/cloud\s*9/i, /boardwalk/i, /dock/i, /hideaway/i, /beach/i, /bar/i],
    eyebrow: 'Sunset happening',
    title: (placeName) => `Sunset session near ${placeName}`,
    detail:
      'Golden-hour plans are where tourists most often ask around. This gives them a visible route instead of guessing.',
    actionLabel: 'Open spot',
    tone: 'gold',
  },
  {
    id: 'general-luna-nightlife',
    windows: ['late'],
    placePatterns: [/nightlife/i, /music/i, /bar/i, /sports/i, /beach-club/i, /hideaway/i, /cat\s*&?\s*gun/i],
    eyebrow: 'Tonight',
    title: (placeName) => `Night signal around ${placeName}`,
    detail:
      'Bars, games, music, and late food should feel discoverable from the grid, not hidden in local group chats.',
    actionLabel: 'Open spot',
    tone: 'rose',
  },
];

function getPlaceSearchText(place: NearbyPlace) {
  return [
    place.name,
    place.description ?? '',
    place.city ?? '',
    place.country ?? '',
    ...place.categories,
    ...(place.profile?.legends.map((legend) => legend.label) ?? []),
  ]
    .join(' ')
    .toLowerCase();
}

function isSiargaoAreaPlace(place: NearbyPlace) {
  const text = getPlaceSearchText(place);
  return (
    text.includes('siargao') ||
    text.includes('general luna') ||
    text.includes('catangnan') ||
    (place.latitude > 9.65 && place.latitude < 9.9 && place.longitude > 126.05 && place.longitude < 126.25)
  );
}

function findBestLocalEventPlace(input: {
  places: NearbyPlace[];
  template: LocalEventTemplate;
  origin: { latitude: number; longitude: number } | null;
  excludedSlugs: Set<string>;
}) {
  const candidates = input.places
    .filter((place) => !input.excludedSlugs.has(place.slug))
    .map((place) => {
      const text = getPlaceSearchText(place);
      const patternScore = input.template.placePatterns.reduce(
        (score, pattern) => score + (pattern.test(text) ? 18 : 0),
        0
      );
      const distanceKm = input.origin
        ? calculateDistance(input.origin.latitude, input.origin.longitude, place.latitude, place.longitude)
        : null;
      const score =
        patternScore +
        place.activeDareCount * 14 +
        place.tagSummary.approvedCount * 7 +
        place.tagSummary.heatScore -
        (distanceKm ? Math.min(distanceKm * 3, 22) : 0);

      return { place, distanceKm, score };
    })
    .filter((candidate) => candidate.score > 0)
    .sort((a, b) => b.score - a.score);

  return candidates[0] ?? null;
}

function getLocalEventHappenings(input: {
  places: NearbyPlace[];
  window: HappeningWindow;
  origin: { latitude: number; longitude: number } | null;
  excludedSlugs: Set<string>;
}) {
  const isSiargaoArea = input.places.some(isSiargaoAreaPlace);
  if (!isSiargaoArea) return [];

  const usedSlugs = new Set(input.excludedSlugs);
  const localEvents: MapHappening[] = [];

  LOCAL_SIARGAO_EVENT_TEMPLATES
    .filter((template) => template.windows.includes(input.window.key))
    .forEach((template) => {
      if (localEvents.length >= 2) return;

      const best = findBestLocalEventPlace({
        places: input.places,
        template,
        origin: input.origin,
        excludedSlugs: usedSlugs,
      });
      if (!best) return;

      usedSlugs.add(best.place.slug);
      localEvents.push({
        id: `local-event:${template.id}:${best.place.id}`,
        kind: 'local-event',
        eyebrow: template.eyebrow,
        title: template.title(best.place.name),
        detail: template.detail,
        timingLabel: input.window.label,
        distanceLabel:
          best.distanceKm !== null
            ? formatDistanceMeters(Math.round(best.distanceKm * 1000))
            : best.place.distanceDisplay || null,
        rewardLabel: 'Local plan',
        actionLabel: template.actionLabel,
        href: null,
        place: best.place,
        tone: template.tone,
      });
    });

  if (localEvents.length < 2 && SIGNAL_ROOM_URL) {
    localEvents.push({
      id: `local-event:signal-room:${input.window.key}`,
      kind: 'local-event',
      eyebrow: 'Local board',
      title: 'Ask what is actually happening now',
      detail:
        'Use the Signal Room for live local tips, public activations, venue signals, and quick operator routing.',
      timingLabel: input.window.label,
      distanceLabel: 'Siargao',
      rewardLabel: 'Public feed',
      actionLabel: 'Signal Room',
      href: SIGNAL_ROOM_URL,
      place: null,
      tone: 'purple',
    });
  }

  return localEvents;
}

function getHappeningToneClasses(tone: HappeningTone) {
  switch (tone) {
    case 'cyan':
      return {
        dot: 'bg-cyan-300 shadow-[0_0_12px_rgba(34,211,238,0.45)]',
        chip: 'border-cyan-300/18 bg-cyan-500/[0.08] text-cyan-100',
        action: 'border-cyan-300/22 bg-cyan-500/[0.08] text-cyan-100 hover:border-cyan-300/38 hover:bg-cyan-500/[0.14]',
      };
    case 'purple':
      return {
        dot: 'bg-[#b87fff] shadow-[0_0_12px_rgba(184,127,255,0.45)]',
        chip: 'border-[#b87fff]/20 bg-[#b87fff]/[0.08] text-[#edd8ff]',
        action: 'border-[#b87fff]/22 bg-[#b87fff]/[0.08] text-[#edd8ff] hover:border-[#b87fff]/38 hover:bg-[#b87fff]/[0.14]',
      };
    case 'rose':
      return {
        dot: 'bg-rose-300 shadow-[0_0_12px_rgba(251,113,133,0.45)]',
        chip: 'border-rose-300/18 bg-rose-500/[0.08] text-rose-100',
        action: 'border-rose-300/22 bg-rose-500/[0.08] text-rose-100 hover:border-rose-300/38 hover:bg-rose-500/[0.14]',
      };
    case 'gold':
    default:
      return {
        dot: 'bg-[#f5c518] shadow-[0_0_12px_rgba(245,197,24,0.45)]',
        chip: 'border-[#f5c518]/18 bg-[#f5c518]/[0.08] text-[#f8dd72]',
        action: 'border-[#f5c518]/22 bg-[#f5c518]/[0.08] text-[#f8dd72] hover:border-[#f5c518]/38 hover:bg-[#f5c518]/[0.14]',
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

function escapeMarkerAttribute(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function createPeebearMarkerHtml({
  pulse,
  approvedCount,
  heatScore,
  active,
  visualState,
  challengeLiveCount,
  matched = false,
  compact = false,
  activated = false,
  activationLabel,
  legends,
}: {
  pulse: PulseState;
  approvedCount: number;
  heatScore: number;
  active: boolean;
  visualState: PlaceVisualState;
  challengeLiveCount: number;
  matched?: boolean;
  compact?: boolean;
  activated?: boolean;
  activationLabel?: string;
  legends?: VenueLegend[];
}) {
  const badge = getSparkBadge(approvedCount);
  const showRipple = !compact && (pulse !== 'cold' || visualState === 'pending' || visualState === 'first-mark');
  const showCount = approvedCount > 0;
  const showPulseChip = !compact && heatScore > 0;
  const hasChallengeLive = challengeLiveCount > 0;
  const showChallengeLiveChrome = hasChallengeLive && !compact;
  const showMatchBadge = matched && !compact;
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
  const activationBadgeLabel = activationLabel ?? 'ACTIVATED';
  const liveLabel =
    challengeLiveCount > 1 ? `LIVE ${challengeLiveCount > 9 ? '9+' : challengeLiveCount}` : 'LIVE';
  const showActivatedMarkerChrome = activated && (!compact || active);
  const visibleLegends = (legends ?? []).slice(0, compact ? 2 : 3);
  const legendKey = visibleLegends.map((legend) => legend.key).join(',');
  const cacheKey = `${pulse}:${visualState}:${active ? 'active' : 'idle'}:${matched ? 'matched' : 'neutral'}:${compact ? 'compact' : 'full'}:${showActivatedMarkerChrome ? `activated-${activationBadgeLabel}` : activated ? 'activated-compact' : 'standard-venue'}:${hasChallengeLive ? `challenge-${Math.min(challengeLiveCount, 9)}` : 'standard'}:${badge}:${Math.min(heatScore, 999)}:${legendKey}`;

  const cachedHtml = markerIconCache.get(cacheKey);
  if (cachedHtml) {
    return cachedHtml;
  }

  const html = `
    <div class="peebear-marker peebear-marker--${pulse} peebear-marker--${visualState} ${active ? 'is-active' : ''} ${showChallengeLiveChrome ? 'has-challenge-live' : ''} ${matched ? 'is-matched' : ''} ${compact ? 'is-compact' : ''} ${activated ? 'is-activated-venue' : ''}">
      ${showRipple ? `<span class="peebear-ripple peebear-ripple--${visualState === 'pending' ? 'pending' : pulse}"></span>` : ''}
      ${showChallengeLiveChrome ? `<span class="peebear-challenge-aura" aria-hidden="true"></span><span class="peebear-challenge-ring" aria-hidden="true"></span><span class="peebear-challenge-pill">${liveLabel}</span>` : ''}
      ${showMatchBadge ? `<span class="peebear-match-badge">MATCH</span>` : ''}
      ${showCount ? `<span class="peebear-count peebear-count--${visualState === 'first-mark' ? 'first-mark' : pulse}">${badge}</span>` : ''}
      ${
        visibleLegends.length > 0
          ? `<span class="venue-legend-stack" aria-label="Venue type">${visibleLegends
              .map(
                (legend) =>
                  `<span class="venue-legend-chip venue-legend-chip--${escapeMarkerAttribute(legend.key)}" title="${escapeMarkerAttribute(legend.label)}">${legend.emoji}</span>`
              )
              .join('')}</span>`
          : ''
      }
      ${showActivatedMarkerChrome ? `<span class="venue-building-badge" aria-hidden="true"><span class="venue-building-roof"></span><span class="venue-building-body"><span></span><span></span><span></span></span><span class="venue-building-base"></span></span>` : ''}
      ${showActivatedMarkerChrome && !compact ? `<span class="venue-activation-pill">${activationBadgeLabel}</span>` : ''}
      <div class="peebear-core map-pin-marker map-pin-marker--${visualState} peebear-core--${pulse} peebear-core--${visualState}">
        <img src="/assets/peebear-head.png" alt="PeeBear pin" class="peebear-head" />
      </div>
      <div class="peebear-meta">
        ${showPulseChip ? `<span class="peebear-pulse-pill peebear-pulse-pill--${pulse}">PULSE ${Math.min(heatScore, 99)}</span>` : ''}
        <span class="peebear-state peebear-state--${visualState}">${stateLabel}</span>
      </div>
      <div class="peebear-shadow"></div>
    </div>
  `;

  markerIconCache.set(cacheKey, html);
  return html;
}

function createCurrentLocationMarkerHtml({
  centered,
  heading,
}: {
  centered: boolean;
  heading: number | null;
}) {
  const headingBucket = heading === null ? 'none' : String(Math.round(heading / 5) * 5);
  const cacheKey = `${centered ? 'centered' : 'dot'}:${headingBucket}`;
  const cachedHtml = currentLocationIconCache.get(cacheKey);
  if (cachedHtml) {
    return cachedHtml;
  }

  const html = `
    <div class="current-location-marker ${centered ? 'is-centered' : 'is-dot'}">
      ${heading !== null ? `<span class="current-location-heading" style="transform: translateX(-50%) rotate(${heading}deg);"></span>` : ''}
      <span class="current-location-pulse"></span>
      ${
        centered
          ? `<img src="${CURRENT_LOCATION_CENTERED_ICON_PATH}" alt="Current location" class="current-location-bear" />`
          : `<span class="current-location-dot-ring"></span><span class="current-location-dot-core"></span>`
      }
    </div>
  `;

  currentLocationIconCache.set(cacheKey, html);
  return html;
}

function createFootprintMarkerHtml({
  firstMark,
  latest,
}: {
  firstMark: boolean;
  latest: boolean;
}) {
  const cacheKey = `${firstMark ? 'first' : 'mark'}:${latest ? 'latest' : 'history'}`;
  const cachedHtml = footprintMarkerIconCache.get(cacheKey);
  if (cachedHtml) {
    return cachedHtml;
  }

  const html = `
    <div class="peebear-footprint ${firstMark ? 'is-first' : ''} ${latest ? 'is-latest' : ''}">
      <span class="peebear-footprint-dot"></span>
      <span class="peebear-footprint-label">${firstMark ? 'YOUR WIN' : 'YOUR MARK'}</span>
    </div>
  `;

  footprintMarkerIconCache.set(cacheKey, html);
  return html;
}

function createPlaceClusterMarkerHtml({
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
  const cachedHtml = placeClusterIconCache.get(cacheKey);
  if (cachedHtml) {
    return cachedHtml;
  }

  const html = `
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
  `;

  placeClusterIconCache.set(cacheKey, html);
  return html;
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

export default function RealWorldMap() {
  const { address, isConnected } = useAccount();
  const router = useRouter();
  const searchParams = useSearchParams();
  const mapViewportRef = useRef<HTMLDivElement | null>(null);
  const mapCanvasRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<MapLibreMap | null>(null);
  const mapMarkersRef = useRef<MapLibreMarker[]>([]);
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
  const [userHeading, setUserHeading] = useState<number | null>(null);
  const [footprintMarks, setFootprintMarks] = useState<FootprintMark[]>([]);
  const [footprintStats, setFootprintStats] = useState<FootprintStats | null>(null);
  const [creatorOpportunities, setCreatorOpportunities] = useState<MapCreatorOpportunity[]>([]);
  const [showFootprintLayer, setShowFootprintLayer] = useState(false);
  const [showMatchedLayer, setShowMatchedLayer] = useState(false);
  const [targetCenter, setTargetCenter] = useState<[number, number] | null>(null);
  const [targetZoom, setTargetZoom] = useState<number | null>(null);
  const [mapZoom, setMapZoom] = useState(DEFAULT_ZOOM);
  const [mapBearing, setMapBearing] = useState(DEFAULT_MAP_BEARING);
  const [mapPitch, setMapPitch] = useState(DEFAULT_MAP_PITCH);
  const [selectedPlaceTags, setSelectedPlaceTags] = useState<PlaceTagItem[]>([]);
  const [selectedPlaceTagsLoading, setSelectedPlaceTagsLoading] = useState(false);
  const [selectedPlaceTagsError, setSelectedPlaceTagsError] = useState<string | null>(null);
  const [selectedPlaceActiveDares, setSelectedPlaceActiveDares] = useState<SelectedPlaceActiveDare[]>([]);
  const [selectedPlaceActiveDaresLoading, setSelectedPlaceActiveDaresLoading] = useState(false);
  const [selectedPlaceFeaturedPaidActivation, setSelectedPlaceFeaturedPaidActivation] = useState<SelectedPlaceActiveDare | null>(null);
  const [pendingPlaceTags, setPendingPlaceTags] = useState<PendingPlaceTagItem[]>([]);
  const [pulseFilter, setPulseFilter] = useState<PulseFilter>('all');
  const [mapVenueFocus, setMapVenueFocus] = useState<MapVenueFocus>('all');
  const [nearbyDareFilter, setNearbyDareFilter] = useState<NearbyDareFilter>('all');
  const [nearbyDareRadiusKm, setNearbyDareRadiusKm] = useState(5);
  const [nearbyDarePanelCollapsed, setNearbyDarePanelCollapsed] = useState(false);
  const [pendingCommandAction, setPendingCommandAction] = useState<SelectedCommandAction | null>(null);
  const [mapPreset, setMapPreset] = useState<MapPreset>('classic');
  const [isMobileViewport, setIsMobileViewport] = useState(false);
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
  const lastPushLocationSyncRef = useRef<{
    latitude: number;
    longitude: number;
    radiusKm: number;
    syncedAt: number;
  } | null>(null);
  const skipNextSearchRef = useRef(false);
  const skipNextMapClickRef = useRef(false);
  const autoLocateModeRef = useRef<'idle' | 'auto' | 'manual'>('idle');
  const autoLocateFallbackAppliedRef = useRef(false);
  const lastAutoFocusedFilterRef = useRef<string | null>(null);
  const hasUserLocation = Boolean(userLocation);

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
    if (typeof window === 'undefined') {
      return undefined;
    }

    const mediaQuery = window.matchMedia('(max-width: 767px)');
    const syncViewportMode = (event?: MediaQueryListEvent) => {
      setIsMobileViewport(event ? event.matches : mediaQuery.matches);
    };

    syncViewportMode();

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', syncViewportMode);
      return () => mediaQuery.removeEventListener('change', syncViewportMode);
    }

    mediaQuery.addListener(syncViewportMode);
    return () => mediaQuery.removeListener(syncViewportMode);
  }, []);

  useEffect(() => {
    if (!isMobileViewport) {
      return;
    }

    setNearbyDarePanelCollapsed(true);
  }, [isMobileViewport]);

  useEffect(() => {
    if (!isMobileViewport || !selectedPlace) {
      return;
    }

    setNearbyDarePanelCollapsed(true);
  }, [isMobileViewport, selectedPlace]);

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
      setMapVenueFocus((current) =>
        current === 'matched' || current === 'footprint' ? 'all' : current
      );
      return;
    }

    const shouldFocusMatches = showMatchesParam || isCreatorSource || Boolean(deepLinkedDareShortId);
    setShowFootprintLayer(showTraceParam && !shouldFocusMatches);
    setShowMatchedLayer(shouldFocusMatches);
    setMapVenueFocus(shouldFocusMatches ? 'matched' : showTraceParam ? 'footprint' : 'all');
  }, [deepLinkedDareShortId, isConnected, isCreatorSource, showMatchesParam, showTraceParam]);

  useEffect(() => {
    pendingPlaceTagsRef.current = pendingPlaceTags;
  }, [pendingPlaceTags]);

  const requestApproximateLocation = useCallback(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setLocating(false);
      triggerHaptic('warning');
      return () => undefined;
    }

    let cancelled = false;

    autoLocateModeRef.current = mapReady ? 'manual' : 'auto';
    setLocating(true);
    triggerHaptic('selection');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (cancelled) return;
        setUserLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setUserHeading(Number.isFinite(position.coords.heading) ? position.coords.heading : null);
        setTargetCenter([position.coords.latitude, position.coords.longitude]);
        setTargetZoom(14);
        setLocating(false);
        triggerHaptic('success');
      },
      () => {
        if (cancelled) return;
        setLocating(false);
        triggerHaptic('warning');
      },
      { enableHighAccuracy: true, maximumAge: 30000, timeout: 8000 }
    );

    return () => {
      cancelled = true;
    };
  }, [mapReady]);

  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation || !hasUserLocation) {
      return undefined;
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setUserLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setUserHeading(Number.isFinite(position.coords.heading) ? position.coords.heading : null);
      },
      () => undefined,
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 12000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [hasUserLocation]);

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
          commandCenter: venue.commandCenter,
          mapModes: venue.mapModes,
          profile: venue.profile,
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

  useEffect(() => {
    if (!address || !userLocation || typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    const lastSync = lastPushLocationSyncRef.current;
    const now = Date.now();
    if (lastSync) {
      const movedKm = calculateDistance(
        lastSync.latitude,
        lastSync.longitude,
        userLocation.latitude,
        userLocation.longitude
      );

      if (movedKm < 0.35 && Math.abs(lastSync.radiusKm - nearbyDareRadiusKm) < 0.5 && now - lastSync.syncedAt < 1000 * 60 * 5) {
        return;
      }
    }

    let cancelled = false;

    const syncNearbyPushZone = async () => {
      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();

        if (!subscription) {
          return;
        }

        const response = await fetch('/api/push/subscriptions', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            wallet: address,
            endpoint: subscription.endpoint,
            location: {
              latitude: userLocation.latitude,
              longitude: userLocation.longitude,
              radiusKm: nearbyDareRadiusKm,
            },
          }),
        });

        if (!response.ok || cancelled) {
          return;
        }

        lastPushLocationSyncRef.current = {
          latitude: userLocation.latitude,
          longitude: userLocation.longitude,
          radiusKm: nearbyDareRadiusKm,
          syncedAt: now,
        };
      } catch (error) {
        if (!cancelled) {
          console.error('[REAL_WORLD_MAP] Failed to sync nearby push zone:', error);
        }
      }
    };

    void syncNearbyPushZone();

    return () => {
      cancelled = true;
    };
  }, [address, nearbyDareRadiusKm, userLocation]);

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
    triggerHaptic('selection');
    setSelectedPlace({
      name: 'Dropped pin',
      address: `Custom spot · ${formatCoordinateLabel(latitude, longitude)}`,
      latitude,
      longitude,
      placeSource: 'MAP_DROP',
      mapModes: DEFAULT_VENUE_MAP_MODES,
    });
  }, []);

  const handleViewportChangeRef = useRef(handleViewportChange);
  const handleMapClickRef = useRef(handleMapClick);
  const mapPresetRef = useRef(mapPreset);

  useEffect(() => {
    handleViewportChangeRef.current = handleViewportChange;
  }, [handleViewportChange]);

  useEffect(() => {
    handleMapClickRef.current = handleMapClick;
  }, [handleMapClick]);

  useEffect(() => {
    mapPresetRef.current = mapPreset;
  }, [mapPreset]);

  useEffect(() => {
    const container = mapCanvasRef.current;
    if (!container || mapInstanceRef.current) return undefined;

    const map = new maplibregl.Map({
      container,
      style: OPENFREEMAP_LIBERTY_STYLE_URL,
      center: [DEFAULT_CENTER[1], DEFAULT_CENTER[0]],
      zoom: DEFAULT_ZOOM,
      pitch: DEFAULT_MAP_PITCH,
      bearing: DEFAULT_MAP_BEARING,
      attributionControl: { compact: true },
      dragRotate: true,
      touchZoomRotate: true,
      maxPitch: 75,
    });

    mapInstanceRef.current = map;
    map.dragRotate.enable();
    map.touchZoomRotate.enableRotation();

    const syncViewport = () => {
      const center = map.getCenter();
      setMapBearing(map.getBearing());
      setMapPitch(map.getPitch());
      handleViewportChangeRef.current(center.lat, center.lng, map.getZoom());
    };

    const handleLoad = () => {
      ensureMapLibreDareLayers(map, mapPresetRef.current);
      syncViewport();
      setMapReady(true);
    };

    const handleStyleData = () => {
      if (!map.isStyleLoaded()) return;
      ensureMapLibreDareLayers(map, mapPresetRef.current);
    };

    const handleClick = (event: maplibregl.MapMouseEvent) => {
      if (skipNextMapClickRef.current) {
        skipNextMapClickRef.current = false;
        return;
      }

      handleMapClickRef.current(event.lngLat.lat, event.lngLat.lng);
    };

    map.on('load', handleLoad);
    map.on('styledata', handleStyleData);
    map.on('moveend', syncViewport);
    map.on('click', handleClick);

    return () => {
      map.off('load', handleLoad);
      map.off('styledata', handleStyleData);
      map.off('moveend', syncViewport);
      map.off('click', handleClick);
      mapMarkersRef.current.forEach((marker) => marker.remove());
      mapMarkersRef.current = [];
      map.remove();
      mapInstanceRef.current = null;
      setMapReady(false);
    };
  }, []);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapReady) return;

    ensureMapLibreDareLayers(map, mapPreset);
  }, [mapPreset, mapReady]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapReady || !targetCenter) return;

    map.flyTo({
      center: [targetCenter[1], targetCenter[0]],
      zoom: targetZoom ?? map.getZoom(),
      pitch: isMobileViewport ? 54 : DEFAULT_MAP_PITCH,
      bearing: map.getBearing() || DEFAULT_MAP_BEARING,
      duration: 900,
      essential: true,
    });
  }, [isMobileViewport, mapReady, targetCenter, targetZoom]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    const container = mapViewportRef.current;
    if (!map || !mapReady || !container) return undefined;

    const resizeMap = () => {
      map.resize();
    };

    resizeMap();
    const animationFrameId = window.requestAnimationFrame(resizeMap);
    const settleTimeoutId = window.setTimeout(resizeMap, 320);
    const resizeObserver = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resizeMap) : null;
    resizeObserver?.observe(container);
    window.addEventListener('resize', resizeMap);
    window.addEventListener('orientationchange', resizeMap);

    return () => {
      window.cancelAnimationFrame(animationFrameId);
      window.clearTimeout(settleTimeoutId);
      resizeObserver?.disconnect();
      window.removeEventListener('resize', resizeMap);
      window.removeEventListener('orientationchange', resizeMap);
    };
  }, [isMobileViewport, mapReady]);

  const focusExistingPlace = useCallback((place: NearbyPlace) => {
    triggerHaptic('selection');
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
      commandCenter: place.commandCenter,
      mapModes: place.mapModes ?? DEFAULT_VENUE_MAP_MODES,
      profile: place.profile,
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
            commandCenter: venue.commandCenter,
            mapModes: venue.mapModes,
            profile: venue.profile,
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

  const isUserCentered = useMemo(() => {
    if (!userLocation || !viewportCenter) {
      return false;
    }

    const thresholdMeters = mapZoom >= 15 ? 55 : mapZoom >= 14 ? 90 : 140;
    return (
      calculateDistanceMeters(
        userLocation.latitude,
        userLocation.longitude,
        viewportCenter.latitude,
        viewportCenter.longitude
      ) <= thresholdMeters
    );
  }, [mapZoom, userLocation, viewportCenter]);

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

  const nearbyDaresInRange = useMemo(
    () => nearbyDares.filter((dare) => dare.distanceKm <= nearbyDareRadiusKm),
    [nearbyDareRadiusKm, nearbyDares]
  );
  const liveVenueSlugSet = useMemo(() => {
    const slugs = new Set<string>();
    nearbyDaresInRange.forEach((dare) => {
      if (dare.venueSlug) {
        slugs.add(dare.venueSlug);
      }
    });
    return slugs;
  }, [nearbyDaresInRange]);
  const footprintVenueIndex = useMemo(() => {
    const ids = new Set<string>();
    const slugs = new Set<string>();

    footprintMarks.forEach((mark) => {
      ids.add(mark.venue.id);
      slugs.add(mark.venue.slug);
    });

    return { ids, slugs };
  }, [footprintMarks]);
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
  const filteredNearbyPlaces = useMemo(() => {
    return nearbyPlaces.filter((place) => {
      const pulseMatches =
        pulseFilter === 'all' ||
        (pulseFilter === 'verified' && place.tagSummary.approvedCount > 0) ||
        (pulseFilter === 'unmarked' && place.tagSummary.approvedCount <= 0) ||
        getPulse(place.tagSummary.approvedCount, place.tagSummary.lastTaggedAt) === pulseFilter;

      if (!pulseMatches) return false;

      if (mapVenueFocus === 'live') {
        return place.activeDareCount > 0 || liveVenueSlugSet.has(place.slug);
      }

      if (mapVenueFocus === 'matched') {
        return matchedVenueIndex.has(place.slug);
      }

      if (mapVenueFocus === 'footprint') {
        return footprintVenueIndex.ids.has(place.id) || footprintVenueIndex.slugs.has(place.slug);
      }

      return true;
    });
  }, [footprintVenueIndex, liveVenueSlugSet, mapVenueFocus, matchedVenueIndex, nearbyPlaces, pulseFilter]);
  const activeMapFilterLabel = useMemo(() => {
    if (mapVenueFocus === 'live') return 'Live venues';
    if (mapVenueFocus === 'matched') return 'Matched for you';
    if (mapVenueFocus === 'footprint') return 'My footprint';
    if (pulseFilter === 'verified') return 'Verified venues';
    if (pulseFilter === 'unmarked') return 'Open first sparks';
    if (pulseFilter === 'blazing') return 'Blazing venues';
    if (pulseFilter === 'igniting') return 'Igniting venues';
    if (pulseFilter === 'simmering') return 'Simmering venues';
    return 'All venues';
  }, [mapVenueFocus, pulseFilter]);
  const activeMapFilterIsScoped = mapVenueFocus !== 'all' || pulseFilter !== 'all';
  const visibleMatchedVenueCount = useMemo(
    () => nearbyPlaces.filter((place) => matchedVenueIndex.has(place.slug)).length,
    [matchedVenueIndex, nearbyPlaces]
  );

  const nearbyPlaceBySlug = useMemo(() => {
    const index = new Map<string, NearbyPlace>();
    nearbyPlaces.forEach((place) => {
      index.set(place.slug, place);
    });
    return index;
  }, [nearbyPlaces]);

  useEffect(() => {
    if (!mapReady || !activeMapFilterIsScoped || filteredNearbyPlaces.length !== 1) {
      return;
    }

    const [place] = filteredNearbyPlaces;
    const focusKey = `${mapVenueFocus}:${pulseFilter}:${place.id}`;
    if (lastAutoFocusedFilterRef.current === focusKey) {
      return;
    }

    lastAutoFocusedFilterRef.current = focusKey;
    setTargetCenter([place.latitude, place.longitude]);
    setTargetZoom(Math.max(Math.round(mapZoom), 15));
  }, [activeMapFilterIsScoped, filteredNearbyPlaces, mapReady, mapVenueFocus, mapZoom, pulseFilter]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapReady || !map.isStyleLoaded()) return;

    const activeLayerIds = MAPLIBRE_INTERACTIVE_SIGNAL_LAYER_IDS.filter((layerId) => map.getLayer(layerId));
    if (activeLayerIds.length === 0) return;

    const handleSignalClick = (event: MapLayerMouseEvent) => {
      const slug = event.features?.[0]?.properties?.slug;
      if (typeof slug !== 'string') return;

      const place = nearbyPlaceBySlug.get(slug);
      if (!place) return;

      skipNextMapClickRef.current = true;
      window.setTimeout(() => {
        skipNextMapClickRef.current = false;
      }, 0);
      focusExistingPlace(place);
    };
    const handleSignalEnter = () => {
      map.getCanvas().style.cursor = 'pointer';
    };
    const handleSignalLeave = () => {
      map.getCanvas().style.cursor = '';
    };

    activeLayerIds.forEach((layerId) => {
      map.on('click', layerId, handleSignalClick);
      map.on('mouseenter', layerId, handleSignalEnter);
      map.on('mouseleave', layerId, handleSignalLeave);
    });

    return () => {
      activeLayerIds.forEach((layerId) => {
        map.off('click', layerId, handleSignalClick);
        map.off('mouseenter', layerId, handleSignalEnter);
        map.off('mouseleave', layerId, handleSignalLeave);
      });
    };
  }, [focusExistingPlace, mapReady, nearbyPlaceBySlug]);

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
  const happeningWindow = useMemo(() => getHappeningWindow(new Date()), []);
  const mapHappenings = useMemo<MapHappening[]>(() => {
    const items: MapHappening[] = [];
    const liveVenueSlugs = new Set<string>();
    const origin = userLocation ?? viewportCenter;

    nearbyDareFeed.slice(0, 3).forEach((dare) => {
      if (dare.venueSlug) {
        liveVenueSlugs.add(dare.venueSlug);
      }

      const place = dare.venueSlug ? nearbyPlaceBySlug.get(dare.venueSlug) ?? null : null;

      items.push({
        id: `live-dare:${dare.id}`,
        kind: 'live-dare',
        eyebrow: dare.isOpenBounty ? 'Open money' : 'Live mission',
        title: dare.title,
        detail: place
          ? `${place.name} is active right now. Tourists can follow the proof trail instead of guessing what to do.`
          : dare.locationLabel
            ? `Active near ${dare.locationLabel}.`
            : 'A live dare is moving nearby.',
        timingLabel: happeningWindow.label,
        distanceLabel: dare.distanceDisplay,
        rewardLabel: `${formatMapUsd(dare.bounty)} USDC`,
        actionLabel: 'Open Dare',
        href: dare.shortId ? `/dare/${dare.shortId}` : '/dares',
        place,
        tone: dare.bounty >= 100 ? 'gold' : 'cyan',
      });
    });

    getLocalEventHappenings({
      places: nearbyPlaces,
      window: happeningWindow,
      origin,
      excludedSlugs: liveVenueSlugs,
    }).forEach((event) => {
      if (items.length >= 5) return;
      if (event.place) {
        liveVenueSlugs.add(event.place.slug);
      }
      items.push(event);
    });

    const scoredPlaces = nearbyPlaces
      .filter((place) => !liveVenueSlugs.has(place.slug))
      .map((place) => {
        const distanceKm = origin
          ? calculateDistance(origin.latitude, origin.longitude, place.latitude, place.longitude)
          : null;
        const activityScore =
          place.activeDareCount * 46 +
          place.tagSummary.approvedCount * 12 +
          place.tagSummary.heatScore +
          getVenueTimeFitScore(place, happeningWindow.key) -
          (distanceKm ? Math.min(distanceKm * 4, 28) : 0);

        return { place, distanceKm, activityScore };
      })
      .sort((a, b) => b.activityScore - a.activityScore);

    scoredPlaces.slice(0, 6).forEach(({ place, distanceKm }) => {
      if (items.length >= 5) return;

      const copy = getVenueHappeningCopy(place, happeningWindow);
      items.push({
        id: `${copy.kind}:${place.id}`,
        kind: copy.kind,
        eyebrow: copy.eyebrow,
        title: copy.title,
        detail: copy.detail,
        timingLabel: happeningWindow.label,
        distanceLabel:
          distanceKm !== null
            ? formatDistanceMeters(Math.round(distanceKm * 1000))
            : place.distanceDisplay || null,
        rewardLabel:
          place.activeDareCount > 0
            ? `${place.activeDareCount} live`
            : place.tagSummary.approvedCount > 0
              ? `${place.tagSummary.approvedCount} spark${place.tagSummary.approvedCount === 1 ? '' : 's'}`
              : 'First story',
        actionLabel: copy.actionLabel,
        href: null,
        place,
        tone: copy.tone,
      });
    });

    return items.slice(0, 5);
  }, [happeningWindow, nearbyDareFeed, nearbyPlaceBySlug, nearbyPlaces, userLocation, viewportCenter]);
  const showNearbyDarePanel = nearbyDaresLoading || mapHappenings.length > 0;

  const filterCounts = useMemo(() => {
    const counts: Record<PulseFilter, number> = {
      all: nearbyPlaces.length,
      blazing: 0,
      igniting: 0,
      simmering: 0,
      verified: 0,
      unmarked: 0,
    };

    nearbyPlaces.forEach((place) => {
      const approvedCount = place.tagSummary.approvedCount;
      if (approvedCount <= 0) {
        counts.unmarked += 1;
        return;
      }

      counts.verified += 1;
      const pulse = getPulse(approvedCount, place.tagSummary.lastTaggedAt);
      if (pulse === 'blazing' || pulse === 'igniting' || pulse === 'simmering') {
        counts[pulse] += 1;
      }
    });

    return counts;
  }, [nearbyPlaces]);

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
      const point = projectLatLngToWorldPoint(place.latitude, place.longitude, roundedZoom);
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
      value: 'verified',
      label: 'Verified',
      accentClass: 'data-[active=true]:border-emerald-300/45 data-[active=true]:bg-emerald-500/[0.14] data-[active=true]:text-emerald-100',
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
  const compactMarkerZoomThreshold = isMobileViewport ? 15 : 14;
  const showNearbyDareTray = showNearbyDarePanel && !(isMobileViewport && Boolean(selectedPlace));
  const selectedPlacePanelWrapClass = isMobileViewport
    ? 'selected-place-panel-wrap absolute inset-x-2 bottom-2 z-30'
    : 'selected-place-panel-wrap absolute bottom-4 left-1/2 z-30 w-[min(calc(100%-1rem),28rem)] -translate-x-1/2 md:left-auto md:translate-x-0';
  const selectedCommandCenter = selectedPlace?.commandCenter ?? null;
  const selectedMapModes = selectedPlace?.mapModes ?? DEFAULT_VENUE_MAP_MODES;
  const selectedVenueProfile = selectedPlace?.profile ?? null;
  const selectedVenueActivated = isVenueActivated(selectedCommandCenter);
  const selectedActivationActionCopy = selectedCommandCenter
    ? getVenueActivationActionCopy(selectedCommandCenter)
    : null;
  const selectedActivationHref =
    selectedCommandCenter && selectedPlace?.slug
      ? buildVenueActivationIntakeHref({
          venueId: selectedPlace.placeId,
          venueSlug: selectedPlace.slug,
          venueName: selectedPlace.name,
          city: selectedPlace.city,
          payout: 120,
          buyerType: 'venue',
          goal: 'foot_traffic',
          packageId: 'pilot-drop',
          source: 'map',
        })
      : null;
  const selectedVenueHref = selectedPlace?.slug
    ? `/venues/${selectedPlace.slug}${
        isCreatorSource
          ? `?source=creator${deepLinkedDareShortId ? `&dare=${encodeURIComponent(deepLinkedDareShortId)}` : ''}`
          : ''
      }`
    : null;
  const selectedFundDareHref =
    selectedPlace?.slug
      ? buildVenueChallengeCreateHref({
          venueId: selectedPlace.placeId,
          venueSlug: selectedPlace.slug,
          venueName: selectedPlace.name,
          source: 'map',
        })
      : null;
  const resolveSelectedPlaceForCommand = useCallback(async () => {
    if (!selectedPlace) {
      throw new Error('No place selected');
    }

    if (selectedPlace.placeId && selectedPlace.slug) {
      return {
        id: selectedPlace.placeId,
        slug: selectedPlace.slug,
        name: selectedPlace.name,
        address: selectedPlace.address ?? null,
        city: selectedPlace.city ?? null,
        country: selectedPlace.country ?? null,
        latitude: selectedPlace.latitude,
        longitude: selectedPlace.longitude,
      };
    }

    const response = await fetch('/api/places/resolve-or-create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: selectedPlace.name,
        latitude: selectedPlace.latitude,
        longitude: selectedPlace.longitude,
        address: selectedPlace.address ?? null,
        city: selectedPlace.city ?? null,
        country: selectedPlace.country ?? null,
        placeSource: selectedPlace.placeSource ?? null,
        externalPlaceId: selectedPlace.externalPlaceId ?? null,
      }),
    });

    const payload = (await response.json().catch(() => null)) as ResolvePlaceResponse | null;
    if (!response.ok || !payload?.success || !payload.data?.place) {
      throw new Error(payload?.error || 'Failed to route this place into BaseDare');
    }

    const resolvedPlace = payload.data.place;
    setSelectedPlace((current) =>
      current
        ? {
            ...current,
            placeId: resolvedPlace.id,
            slug: resolvedPlace.slug,
            name: resolvedPlace.name,
            address: resolvedPlace.address ?? current.address ?? null,
            city: resolvedPlace.city ?? current.city ?? null,
            country: resolvedPlace.country ?? current.country ?? null,
            latitude: resolvedPlace.latitude,
            longitude: resolvedPlace.longitude,
          }
        : current
    );
    setTargetCenter([resolvedPlace.latitude, resolvedPlace.longitude]);
    setTargetZoom(15);

    return resolvedPlace;
  }, [selectedPlace]);

  const handleSelectedCommandAction = useCallback(
    async (action: SelectedCommandAction) => {
      if (!selectedPlace || pendingCommandAction) return;

      triggerHaptic('selection');
      setPendingCommandAction(action);

      try {
        if (action === 'fund' && selectedFundDareHref) {
          router.push(selectedFundDareHref);
          return;
        }

        if (action === 'venue' && selectedVenueHref) {
          router.push(selectedVenueHref);
          return;
        }

        const resolvedPlace = await resolveSelectedPlaceForCommand();
        const href =
          action === 'fund'
            ? buildVenueChallengeCreateHref({
                venueId: resolvedPlace.id,
                venueSlug: resolvedPlace.slug,
                venueName: resolvedPlace.name,
                source: 'map',
              })
            : `/venues/${resolvedPlace.slug}`;

        router.push(href);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unable to route this place yet.';
        setCeremonyState({
          kind: 'pending',
          title: 'Route failed',
          body: message,
        });
      } finally {
        setPendingCommandAction(null);
      }
    },
    [
      pendingCommandAction,
      resolveSelectedPlaceForCommand,
      router,
      selectedFundDareHref,
      selectedPlace,
      selectedVenueHref,
    ]
  );
  const showSelectedVisualBadge = !firstMarkState;
  const selectedPulseMeaning = useMemo(
    () =>
      getPulseMeaning({
        pulse: selectedPulse,
        approvedCount: selectedPlace?.approvedCount ?? 0,
        heatScore: selectedPlace?.heatScore ?? 0,
        activeDareCount: selectedPlace?.activeDareCount ?? 0,
      }),
    [selectedPlace, selectedPulse]
  );
  const selectedVenueWhyNow = useMemo(() => {
    const reasons: string[] = [];

    if ((selectedPlace?.activeDareCount ?? 0) > 0) {
      reasons.push(`${selectedPlace?.activeDareCount} live ${selectedPlace?.activeDareCount === 1 ? 'challenge is' : 'challenges are'} active here right now.`);
    }

    if ((selectedPlace?.approvedCount ?? 0) > 0) {
      reasons.push(`${selectedPlace?.approvedCount} verified ${selectedPlace?.approvedCount === 1 ? 'spark is' : 'sparks are'} already anchored here.`);
    }

    if (selectedPlaceMatch && showMatchedLayer) {
      reasons.push('Your creator history already fits this venue, so the grid is routing you toward a stronger hit rate here.');
    }

    if (selectedCommandCenter?.sponsorReady) {
      reasons.push('This venue is sponsor-ready, so a brand can launch here without starting from zero.');
    } else if (selectedCommandCenter?.claimState === 'unclaimed') {
      reasons.push('This venue is still claimable, which means the first operator here can shape the command layer.');
    }

    if (!reasons.length) {
      reasons.push('This is still an open story. A first verified spark or a first funded activation can define what this venue becomes.');
    }

    return reasons.slice(0, 3);
  }, [selectedCommandCenter, selectedPlace, selectedPlaceMatch, showMatchedLayer]);
  const selectedVenueNextMove = useMemo(() => {
    if ((selectedPlace?.activeDareCount ?? 0) > 0) {
      return proximityAccess.canReveal
        ? 'Open the live challenge here now.'
        : `Travel within ${PROXIMITY_REVEAL_METERS}m to unlock the full live brief.`;
    }

    if ((selectedPlace?.approvedCount ?? 0) <= 0) {
      return 'Launch the first activation or land the first verified mark to wake this place up.';
    }

    if (selectedPlaceMatch && showMatchedLayer) {
      return 'Use your existing fit here: route yourself in, or open the venue and chase the live signal.';
    }

    return 'Open the venue card for the three real moves: mark, fund, or inspect the command view.';
  }, [proximityAccess.canReveal, selectedPlace, selectedPlaceMatch, showMatchedLayer]);
  const selectedPrimaryAction = useMemo(() => {
    if ((selectedPlace?.activeDareCount ?? 0) > 0) {
      const liveDareHref =
        proximityAccess.canReveal && selectedPlaceActiveDares[0]?.shortId
          ? `/dare/${selectedPlaceActiveDares[0].shortId}`
          : null;

      return {
        label: proximityAccess.canReveal ? 'Open the live challenge' : 'Move closer to unlock',
        detail: proximityAccess.canReveal
          ? 'A funded mission is already active here.'
          : `Full brief unlocks inside ${PROXIMITY_REVEAL_METERS}m.`,
        tone: 'gold' as const,
        href: liveDareHref,
        actionLabel: liveDareHref ? 'Open brief' : null,
        resolveAction: null as SelectedCommandAction | null,
      };
    }

    if ((selectedPlace?.approvedCount ?? 0) <= 0) {
      return {
        label: 'Wake this venue up',
        detail: 'Mark it or fund the first challenge.',
        tone: 'purple' as const,
        href: selectedVenueHref,
        actionLabel: selectedVenueHref ? 'Open venue' : 'Open',
        resolveAction: selectedVenueHref ? null : 'venue' as SelectedCommandAction,
      };
    }

    const commandHref = selectedCommandCenter
      ? selectedActivationHref ??
        selectedCommandCenter.consoleUrl ??
        selectedCommandCenter.contactUrl ??
        selectedVenueHref
      : selectedVenueHref;

    return {
      label: selectedCommandCenter ? 'Run venue playbook' : 'Build the next signal',
      detail: selectedCommandCenter
        ? 'Open rewards, proof memory, routing, and repeat plays.'
        : 'Add a mark or fund a challenge to make the memory loop obvious.',
      tone: 'cyan' as const,
      href: commandHref,
      actionLabel: selectedCommandCenter ? 'Open' : 'Open venue',
      resolveAction: commandHref ? null : 'venue' as SelectedCommandAction,
    };
  }, [proximityAccess.canReveal, selectedActivationHref, selectedCommandCenter, selectedPlace, selectedPlaceActiveDares, selectedVenueHref]);
  const selectedVenueCommandCards = useMemo(() => {
    const rewardTotal = selectedPlaceActiveDares.reduce((total, dare) => total + dare.bounty, 0);
    const primaryActivation =
      focusedCreatorActivation ?? featuredPaidActivation ?? visibleActiveDares[0] ?? null;
    const rewardHref =
      primaryActivation?.shortId && proximityAccess.canReveal
        ? `/dare/${primaryActivation.shortId}`
        : selectedFundDareHref ?? selectedVenueHref;
    const latestProof = selectedPlaceTags[0] ?? null;
    const proofActor = latestProof
      ? latestProof.creatorTag
        ? `@${latestProof.creatorTag}`
        : `${latestProof.walletAddress.slice(0, 6)}...${latestProof.walletAddress.slice(-4)}`
      : null;
    const proofDetail = latestProof
      ? `${proofActor} left proof ${getLastSparkLabel(latestProof.submittedAt).replace('Last spark ', '')}.`
      : selectedPendingPlaceTags.length > 0
        ? `${selectedPendingPlaceTags.length} mark${selectedPendingPlaceTags.length === 1 ? '' : 's'} waiting for referee review.`
        : 'No approved proof yet. First mark owns the story.';
    const matchActive = Boolean(selectedPlaceMatch && showMatchedLayer);

    return [
      {
        id: 'reward',
        eyebrow: selectedPlaceActiveDares.length > 0 ? 'Live reward' : 'Reward slot',
        value: selectedPlaceActiveDares.length > 0 ? `${formatMapUsd(rewardTotal)} USDC` : 'Fund',
        detail: primaryActivation
          ? proximityAccess.canReveal
            ? primaryActivation.title
            : `Brief unlocks inside ${PROXIMITY_REVEAL_METERS}m.`
          : 'Fund the first challenge here.',
        meta:
          selectedPlaceActiveDares.length > 0
            ? `${selectedPlaceActiveDares.length} active`
            : 'first activation',
        href: rewardHref,
        actionLabel: primaryActivation?.shortId && proximityAccess.canReveal ? 'Open brief' : rewardHref ? 'Fund dare' : 'Fund',
        resolveAction: rewardHref ? null : 'fund' as SelectedCommandAction,
        tone: 'gold' as VenueCommandCardTone,
      },
      {
        id: 'proof',
        eyebrow: 'Proof memory',
        value: `${selectedPlace?.approvedCount ?? 0} spark${(selectedPlace?.approvedCount ?? 0) === 1 ? '' : 's'}`,
        detail: proofDetail,
        meta:
          selectedPendingPlaceTags.length > 0
            ? `${selectedPendingPlaceTags.length} pending`
            : selectedPlace?.lastTaggedAt
              ? getLastSparkLabel(selectedPlace.lastTaggedAt)
              : 'unclaimed story',
        href: selectedVenueHref,
        actionLabel: selectedVenueHref ? 'Open memory' : 'Open',
        resolveAction: selectedVenueHref ? null : 'venue' as SelectedCommandAction,
        tone: 'cyan' as VenueCommandCardTone,
      },
      {
        id: 'match',
        eyebrow: matchActive ? 'Creator fit' : 'Routing',
        value: matchActive
          ? `${selectedPlaceMatch?.bestScore ?? 0}% fit`
          : isConnected
            ? `${visibleMatchedVenueCount} nearby`
            : 'Connect',
        detail: matchActive
          ? selectedPlaceMatch?.reasons[0] ?? 'Your creator history already fits this venue.'
          : isConnected
            ? 'Enable matched signals to route yourself toward better venues.'
            : 'Connect wallet to reveal creator-fit routing.',
        meta: matchActive
          ? `${selectedPlaceMatch?.campaignCount ?? 0} live`
          : showMatchedLayer
            ? 'scanning'
            : 'match layer',
        href:
          matchActive && selectedPlaceMatch?.dareShortId
            ? `/dare/${selectedPlaceMatch.dareShortId}`
            : selectedVenueHref,
        actionLabel: matchActive ? 'Open match' : selectedVenueHref ? 'Open venue' : 'Open',
        resolveAction: matchActive || selectedVenueHref ? null : 'venue' as SelectedCommandAction,
        tone: 'purple' as VenueCommandCardTone,
      },
    ];
  }, [
    featuredPaidActivation,
    focusedCreatorActivation,
    isConnected,
    proximityAccess.canReveal,
    selectedPendingPlaceTags.length,
    selectedPlace,
    selectedPlaceActiveDares,
    selectedPlaceMatch,
    selectedFundDareHref,
    selectedVenueHref,
    selectedPlaceTags,
    showMatchedLayer,
    visibleMatchedVenueCount,
    visibleActiveDares,
  ]);
  const signalRailOptions = useMemo(
    () => [
      {
        id: 'live',
        label: 'Live',
        count: nearbyDareCounts.all,
        detail: `${nearbyDareRadiusKm}km`,
        active: mapVenueFocus === 'live',
        disabled: false,
        className:
          'data-[active=true]:border-[#f5c518]/42 data-[active=true]:bg-[#f5c518]/[0.13] data-[active=true]:text-[#f8dd72]',
        onClick: () => {
          setNearbyDareFilter('all');
          setNearbyDarePanelCollapsed(false);
          setPulseFilter('all');
          setShowMatchedLayer(false);
          setShowFootprintLayer(false);
          setMapVenueFocus((current) => (current === 'live' ? 'all' : 'live'));
          triggerHaptic('selection');
        },
      },
      {
        id: 'hot',
        label: 'Hot',
        count: filterCounts.blazing,
        detail: 'venues',
        active: pulseFilter === 'blazing',
        disabled: false,
        className:
          'data-[active=true]:border-rose-300/45 data-[active=true]:bg-rose-500/[0.14] data-[active=true]:text-rose-100',
        onClick: () => {
          setMapVenueFocus('all');
          setShowMatchedLayer(false);
          setShowFootprintLayer(false);
          setPulseFilter('blazing');
          triggerHaptic('selection');
        },
      },
      {
        id: 'verified',
        label: 'Verified',
        count: filterCounts.verified,
        detail: 'proof',
        active: pulseFilter === 'verified',
        disabled: false,
        className:
          'data-[active=true]:border-emerald-300/45 data-[active=true]:bg-emerald-500/[0.14] data-[active=true]:text-emerald-100',
        onClick: () => {
          setMapVenueFocus('all');
          setShowMatchedLayer(false);
          setShowFootprintLayer(false);
          setPulseFilter('verified');
          triggerHaptic('selection');
        },
      },
      {
        id: 'open',
        label: 'Open',
        count: filterCounts.unmarked,
        detail: 'firsts',
        active: pulseFilter === 'unmarked',
        disabled: false,
        className:
          'data-[active=true]:border-fuchsia-300/45 data-[active=true]:bg-fuchsia-500/[0.14] data-[active=true]:text-fuchsia-100',
        onClick: () => {
          setMapVenueFocus('all');
          setShowMatchedLayer(false);
          setShowFootprintLayer(false);
          setPulseFilter('unmarked');
          triggerHaptic('selection');
        },
      },
      {
        id: 'matched',
        label: 'Matched',
        count: visibleMatchedVenueCount,
        detail: isConnected ? 'you' : 'login',
        active: mapVenueFocus === 'matched',
        disabled: !isConnected || visibleMatchedVenueCount === 0,
        className:
          'data-[active=true]:border-cyan-300/45 data-[active=true]:bg-cyan-500/[0.14] data-[active=true]:text-cyan-100',
        onClick: () => {
          if (!isConnected || visibleMatchedVenueCount === 0) {
            triggerHaptic('warning');
            return;
          }

          setPulseFilter('all');
          setShowFootprintLayer(false);
          setShowMatchedLayer(mapVenueFocus !== 'matched');
          setMapVenueFocus((current) => (current === 'matched' ? 'all' : 'matched'));
          triggerHaptic('selection');
        },
      },
    ],
    [
      filterCounts.blazing,
      filterCounts.unmarked,
      filterCounts.verified,
      isConnected,
      mapVenueFocus,
      nearbyDareCounts.all,
      nearbyDareRadiusKm,
      pulseFilter,
      visibleMatchedVenueCount,
    ]
  );

  const easeMapCamera = useCallback(
    ({
      bearingDelta = 0,
      pitchDelta = 0,
      reset = false,
    }: {
      bearingDelta?: number;
      pitchDelta?: number;
      reset?: boolean;
    }) => {
      const map = mapInstanceRef.current;
      if (!map) return;

      const minPitch = 28;
      const maxPitch = isMobileViewport ? 64 : 74;
      const nextPitch = reset
        ? isMobileViewport
          ? 54
          : DEFAULT_MAP_PITCH
        : Math.min(maxPitch, Math.max(minPitch, map.getPitch() + pitchDelta));
      const nextBearing = reset ? 0 : map.getBearing() + bearingDelta;
      const center = selectedPlace ? ([selectedPlace.longitude, selectedPlace.latitude] as [number, number]) : map.getCenter();

      setMapBearing(nextBearing);
      setMapPitch(nextPitch);
      map.easeTo({
        center,
        bearing: nextBearing,
        pitch: nextPitch,
        duration: reset ? 680 : 520,
        essential: true,
      });
      triggerHaptic('selection');
    },
    [isMobileViewport, selectedPlace]
  );

  const mapCameraBearingLabel = `${Math.round(((mapBearing % 360) + 360) % 360)} deg`;
  const mapCameraPitchLabel = `${Math.round(mapPitch)} deg`;

  const selectedPlaceMarkerHtml = useMemo(() => {
    if (!selectedPlace) {
      return null;
    }

    return createPeebearMarkerHtml({
      pulse: selectedPulse,
      approvedCount: selectedPlace.approvedCount ?? 0,
      heatScore: selectedPlace.heatScore ?? 0,
      active: true,
      visualState: selectedVisualState,
      challengeLiveCount: selectedPlace.activeDareCount ?? 0,
      matched: Boolean(showMatchedLayer && selectedPlaceMatch),
      activated: selectedVenueActivated,
      activationLabel: getVenueActivationMarkerLabel(selectedCommandCenter),
      legends: selectedVenueProfile?.legends,
    });
  }, [selectedCommandCenter, selectedPlace, selectedPlaceMatch, selectedPulse, selectedVenueActivated, selectedVenueProfile?.legends, selectedVisualState, showMatchedLayer]);
  const currentLocationMarkerHtml = useMemo(
    () => createCurrentLocationMarkerHtml({ centered: isUserCentered, heading: userHeading }),
    [isUserCentered, userHeading]
  );

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapReady || !map.isStyleLoaded()) return;

    setGeoJsonSourceData(
      map,
      MAPLIBRE_VENUE_SOURCE_ID,
      buildVenueSignalCollection({
        places: filteredNearbyPlaces,
        matchedVenueIndex,
        showMatchedLayer,
        selectedPlace,
      })
    );
    setGeoJsonSourceData(
      map,
      MAPLIBRE_CHAOS_SOURCE_ID,
      buildChaosZoneCollection({
        places: filteredNearbyPlaces,
        matchedVenueIndex,
        showMatchedLayer,
      })
    );
    setGeoJsonSourceData(map, MAPLIBRE_SELECTED_SOURCE_ID, buildSelectedSignalCollection(selectedPlace));
    setGeoJsonSourceData(map, MAPLIBRE_USER_SOURCE_ID, buildUserPositionCollection(userLocation));
    setGeoJsonSourceData(
      map,
      MAPLIBRE_FOOTPRINT_SOURCE_ID,
      buildFootprintLineCollection({
        marks: footprintMarks,
        enabled: showFootprintLayer,
      })
    );
  }, [
    filteredNearbyPlaces,
    footprintMarks,
    mapReady,
    matchedVenueIndex,
    selectedPlace,
    showFootprintLayer,
    showMatchedLayer,
    userLocation,
  ]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapReady) return;

    mapMarkersRef.current.forEach((marker) => marker.remove());
    mapMarkersRef.current = [];
    const nextMarkers: MapLibreMarker[] = [];

    const addMarker = ({
      latitude,
      longitude,
      html,
      className,
      anchor,
      onClick,
    }: {
      latitude: number;
      longitude: number;
      html: string;
      className: string;
      anchor: PositionAnchor;
      onClick: () => void;
    }) => {
      const element = createMarkerElement(html, className);
      element.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        onClick();
      });

      const marker = new maplibregl.Marker({
        element,
        anchor,
        pitchAlignment: 'viewport',
        rotationAlignment: 'viewport',
        subpixelPositioning: true,
      })
        .setLngLat([longitude, latitude])
        .addTo(map);

      nextMarkers.push(marker);
    };

    clusteredNearbyMarkers.forEach((marker) => {
      if (marker.kind === 'cluster') {
        addMarker({
          latitude: marker.latitude,
          longitude: marker.longitude,
          html: createPlaceClusterMarkerHtml({
            count: marker.count,
            pulse: marker.pulse,
            visualState: marker.visualState,
            matched: marker.matched,
            challengeLiveCount: marker.challengeLiveCount,
          }),
          className: 'basedare-maplibre-marker basedare-maplibre-marker--cluster',
          anchor: 'center',
          onClick: () => {
            setTargetCenter([marker.latitude, marker.longitude]);
            setTargetZoom(Math.min(Math.max(Math.round(mapZoom) + 2, 14), 16));
          },
        });
        return;
      }

      const place = marker.place;
      const pulse = getPulse(place.tagSummary.approvedCount, place.tagSummary.lastTaggedAt);
      const visualState = getPlaceVisualState({
        approvedCount: place.tagSummary.approvedCount,
        lastTaggedAt: place.tagSummary.lastTaggedAt,
      });
      const isActive = selectedPlace?.placeId === place.id;
      const isMatchedVenue = showMatchedLayer && matchedVenueIndex.has(place.slug);
      const activatedVenue = isVenueActivated(place.commandCenter);
      const compact = !isActive && (mapZoom < compactMarkerZoomThreshold || activatedVenue);

      addMarker({
        latitude: place.latitude,
        longitude: place.longitude,
        html: createPeebearMarkerHtml({
          pulse,
          approvedCount: place.tagSummary.approvedCount,
          heatScore: place.tagSummary.heatScore,
          active: isActive,
          visualState,
          challengeLiveCount: place.activeDareCount,
          matched: isMatchedVenue,
          compact,
          activated: activatedVenue,
          activationLabel: getVenueActivationMarkerLabel(place.commandCenter),
          legends: place.profile?.legends,
        }),
        className: 'basedare-maplibre-marker basedare-maplibre-marker--venue',
        anchor: 'bottom',
        onClick: () => focusExistingPlace(place),
      });
    });

    if (showFootprintLayer) {
      footprintMarks.forEach((mark, index) => {
        addMarker({
          latitude: mark.venue.latitude,
          longitude: mark.venue.longitude,
          html: createFootprintMarkerHtml({
            firstMark: mark.firstMark,
            latest: index === footprintMarks.length - 1,
          }),
          className: 'basedare-maplibre-marker basedare-maplibre-marker--footprint',
          anchor: 'center',
          onClick: () => {
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
        });
      });
    }

    if (userLocation) {
      addMarker({
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        html: currentLocationMarkerHtml,
        className: 'basedare-maplibre-marker basedare-maplibre-marker--user',
        anchor: isUserCentered ? 'bottom' : 'center',
        onClick: () => {
          setTargetCenter([userLocation.latitude, userLocation.longitude]);
          setTargetZoom(Math.max(Math.round(mapZoom), 14));
        },
      });
    }

    if (selectedPlace && selectedPlaceNeedsDedicatedMarker && selectedPlaceMarkerHtml) {
      addMarker({
        latitude: selectedPlace.latitude,
        longitude: selectedPlace.longitude,
        html: selectedPlaceMarkerHtml,
        className: 'basedare-maplibre-marker basedare-maplibre-marker--selected',
        anchor: 'bottom',
        onClick: () => {
          setTargetCenter([selectedPlace.latitude, selectedPlace.longitude]);
          setTargetZoom(15);
        },
      });
    }

    mapMarkersRef.current = nextMarkers;

    return () => {
      nextMarkers.forEach((marker) => marker.remove());
    };
  }, [
    clusteredNearbyMarkers,
    compactMarkerZoomThreshold,
    currentLocationMarkerHtml,
    focusExistingPlace,
    footprintMarks,
    isUserCentered,
    mapReady,
    mapZoom,
    matchedVenueIndex,
    selectedPlace,
    selectedPlaceMarkerHtml,
    selectedPlaceNeedsDedicatedMarker,
    showFootprintLayer,
    showMatchedLayer,
    userLocation,
  ]);

  const mapPanelShellClass =
    'map-panel-shell relative overflow-hidden rounded-[32px] border border-white/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.09)_0%,rgba(255,255,255,0.04)_8%,rgba(8,10,18,0.955)_28%,rgba(5,6,14,0.99)_100%)] shadow-[0_28px_84px_rgba(0,0,0,0.5),0_0_28px_rgba(34,211,238,0.06),0_0_54px_rgba(168,85,247,0.06),inset_0_1px_0_rgba(255,255,255,0.14),inset_0_-16px_22px_rgba(0,0,0,0.22)] md:h-full md:rounded-[36px]';
  const mapPanelMetricClass =
    'rounded-[22px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06)_0%,rgba(11,13,22,0.94)_22%,rgba(6,7,14,0.99)_100%)] px-4 py-3 shadow-[0_16px_30px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.08),inset_0_-12px_18px_rgba(0,0,0,0.22)]';
  const mapPanelSectionClass =
    'map-panel-section bd-dent-surface bd-dent-surface--soft rounded-[24px] border border-white/[0.075] bg-[linear-gradient(180deg,rgba(4,5,12,0.84)_0%,rgba(9,10,19,0.94)_48%,rgba(3,4,10,0.985)_100%)] px-4 py-4 shadow-[inset_8px_10px_22px_rgba(0,0,0,0.34),inset_-5px_-6px_14px_rgba(255,255,255,0.035),inset_0_1px_0_rgba(255,255,255,0.045),inset_0_-16px_22px_rgba(0,0,0,0.34)]';
  const mapPanelInsetChipClass =
    'rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[10px] uppercase tracking-[0.18em] text-white/52 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),inset_0_-8px_12px_rgba(0,0,0,0.14)]';
  const selectedCommandStripClassName = `map-command-strip mt-3 ${
    selectedPrimaryAction.tone === 'gold'
      ? 'map-command-strip--gold'
      : selectedPrimaryAction.tone === 'purple'
        ? 'map-command-strip--purple'
        : 'map-command-strip--cyan'
  }`;
  const selectedCommandStripContent = (
    <>
      <div className="map-command-strip-copy min-w-0">
        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/45">
          Primary move
        </p>
        <p className="mt-1 text-sm font-black uppercase tracking-[0.08em] text-white">
          {selectedPrimaryAction.label}
        </p>
        <p className="mt-1 text-xs leading-relaxed text-white/60">
          {selectedPrimaryAction.detail}
        </p>
        {selectedPrimaryAction.href && selectedPrimaryAction.actionLabel ? (
          <div className="map-command-strip-action-row">
            <Link
              href={selectedPrimaryAction.href}
              className={`map-command-strip-jelly-button map-command-strip-jelly-button--${selectedPrimaryAction.tone}`}
              aria-label={`${selectedPrimaryAction.actionLabel} for ${selectedPlace?.name ?? 'this venue'}`}
            >
              <span className="map-command-strip-jelly-label">
                {selectedPrimaryAction.actionLabel}
                <ArrowLeft className="h-3 w-3 rotate-180" />
              </span>
            </Link>
          </div>
        ) : selectedPrimaryAction.resolveAction && selectedPrimaryAction.actionLabel ? (
          <div className="map-command-strip-action-row">
            <button
              type="button"
              onClick={() => void handleSelectedCommandAction(selectedPrimaryAction.resolveAction!)}
              disabled={pendingCommandAction === selectedPrimaryAction.resolveAction}
              className={`map-command-strip-jelly-button map-command-strip-jelly-button--${selectedPrimaryAction.tone}`}
              aria-label={`${selectedPrimaryAction.actionLabel} for ${selectedPlace?.name ?? 'this venue'}`}
            >
              <span className="map-command-strip-jelly-label">
                {pendingCommandAction === selectedPrimaryAction.resolveAction ? 'Routing' : selectedPrimaryAction.actionLabel}
                <ArrowLeft className="h-3 w-3 rotate-180" />
              </span>
            </button>
          </div>
        ) : null}
      </div>
      {!selectedPrimaryAction.actionLabel ? (
        <div className="map-command-strip-side">
          <span className="map-command-strip-orb" aria-hidden="true">
            <span />
          </span>
        </div>
      ) : null}
    </>
  );

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
                          mapModes: DEFAULT_VENUE_MAP_MODES,
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
                <div className="map-signal-rail">
                  <div className="map-signal-rail-label">
                    <span className="h-px w-4 rounded-full bg-cyan-200/70" />
                    <span>Signals</span>
                  </div>
                  <div className="map-signal-rail-scroll">
                    {signalRailOptions.map((option) => (
                      <button
                        key={`map-signal:${option.id}`}
                        type="button"
                        data-active={option.active}
                        disabled={option.disabled}
                        onClick={option.onClick}
                        className={`map-signal-pill ${option.className}`}
                      >
                        <span className="map-signal-pill-count">{option.count}</span>
                        <span className="map-signal-pill-main">
                          <span>{option.label}</span>
                          <span>{option.detail}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {filterOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      data-active={pulseFilter === option.value}
                      onClick={() => {
                        setMapVenueFocus('all');
                        setShowMatchedLayer(false);
                        setShowFootprintLayer(false);
                        setPulseFilter(option.value);
                        triggerHaptic('selection');
                      }}
                      className={`inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/52 shadow-[0_10px_18px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.06)] transition hover:-translate-y-[1px] hover:border-white/18 hover:text-white ${option.accentClass}`}
                    >
                      <span>{option.label}</span>
                      <span className="rounded-full border border-white/10 bg-black/20 px-2 py-0.5 text-[10px] text-white/62">
                        {filterCounts[option.value]}
                      </span>
                    </button>
                  ))}
                </div>

                <div className="map-active-filter-strip">
                  <div className="min-w-0">
                    <p className="text-[9px] font-black uppercase tracking-[0.24em] text-white/34">
                      Map focus
                    </p>
                    <p className="mt-1 text-[11px] font-black uppercase tracking-[0.18em] text-white/72">
                      {activeMapFilterLabel}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-white/58">
                      {filteredNearbyPlaces.length}/{nearbyPlaces.length}
                    </span>
                    {activeMapFilterIsScoped ? (
                      <button
                        type="button"
                        onClick={() => {
                          setMapVenueFocus('all');
                          setShowMatchedLayer(false);
                          setShowFootprintLayer(false);
                          setPulseFilter('all');
                          triggerHaptic('selection');
                        }}
                        className="rounded-full border border-white/12 bg-white/[0.055] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-white/66 transition hover:border-white/20 hover:text-white"
                      >
                        Clear
                      </button>
                    ) : null}
                  </div>
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
                      data-active={mapVenueFocus === 'footprint'}
                      onClick={() => {
                        const nextFocus = mapVenueFocus === 'footprint' ? 'all' : 'footprint';
                        setPulseFilter('all');
                        setMapVenueFocus(nextFocus);
                        setShowMatchedLayer(false);
                        setShowFootprintLayer(nextFocus === 'footprint');
                        triggerHaptic('selection');
                      }}
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
                      data-active={mapVenueFocus === 'matched'}
                      disabled={visibleMatchedVenueCount === 0}
                      onClick={() => {
                        if (visibleMatchedVenueCount === 0) {
                          triggerHaptic('warning');
                          return;
                        }

                        const nextFocus = mapVenueFocus === 'matched' ? 'all' : 'matched';
                        setPulseFilter('all');
                        setMapVenueFocus(nextFocus);
                        setShowFootprintLayer(false);
                        setShowMatchedLayer(nextFocus === 'matched');
                        triggerHaptic('selection');
                      }}
                      className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/52 shadow-[0_10px_18px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.06)] transition hover:-translate-y-[1px] hover:border-white/18 hover:text-white disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 data-[active=true]:border-cyan-300/46 data-[active=true]:bg-cyan-500/[0.14] data-[active=true]:text-cyan-100"
                    >
                      <span className="h-2 w-2 rounded-full bg-cyan-300" />
                      <span>Matched For You</span>
                      <span className="rounded-full border border-white/10 bg-black/20 px-2 py-0.5 text-[10px] text-white/62">
                        {visibleMatchedVenueCount}
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
            className={`map-container-wrapper basedare-maplibre-map basedare-maplibre-map--${mapPreset} relative overflow-hidden ${isImmersiveMobile ? 'h-[calc(100dvh-172px)] min-h-0' : 'h-[68vh] min-h-[560px]'}`}
          >
            <div
              ref={mapCanvasRef}
              className="absolute inset-0 z-0"
              aria-label="BaseDare MapLibre 3D city grid"
            />
            <div className="maplibre-depth-vignette pointer-events-none absolute inset-0 z-[1]" />
            <div className="map-engine-badge pointer-events-none absolute right-4 top-4 z-[10] hidden rounded-full border border-cyan-200/18 bg-[linear-gradient(180deg,rgba(34,211,238,0.13)_0%,rgba(8,10,20,0.82)_100%)] px-3.5 py-2 text-[9px] font-black uppercase tracking-[0.22em] text-cyan-100 shadow-[0_16px_34px_rgba(0,0,0,0.32),0_0_22px_rgba(34,211,238,0.12),inset_0_1px_0_rgba(255,255,255,0.1)] backdrop-blur md:block">
              MapLibre 3D Grid · Live Chaos Layer
            </div>

            <div className="preset-atmosphere pointer-events-none absolute inset-0 z-[2]" />
            <div className="network-mesh pointer-events-none absolute inset-0 z-[3]" />
            <div className="network-links pointer-events-none absolute inset-0 z-[4]" />
            <div className="starfield pointer-events-none absolute inset-0 z-[5]" />
            <div className="scanlines pointer-events-none absolute inset-0 z-[6]" />
            <div className="glass-haze pointer-events-none absolute inset-0 z-[7]" />
            {!selectedPlace ? (
              <>
                <div className="map-activation-legend pointer-events-none absolute bottom-5 right-5 z-[10] hidden w-[16.5rem] rounded-[26px] border border-white/12 bg-[radial-gradient(circle_at_8%_0%,rgba(34,211,238,0.16),transparent_36%),radial-gradient(circle_at_94%_18%,rgba(245,197,24,0.12),transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.09)_0%,rgba(12,13,24,0.9)_26%,rgba(5,6,13,0.965)_100%)] px-3.5 py-3.5 shadow-[0_24px_58px_rgba(0,0,0,0.44),0_0_28px_rgba(34,211,238,0.08),inset_0_1px_0_rgba(255,255,255,0.11),inset_0_-14px_22px_rgba(0,0,0,0.2)] backdrop-blur-xl md:block">
                  <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-cyan-100/42 to-transparent" />
                  <div className="flex items-center justify-between gap-3 px-1">
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-[0.26em] text-cyan-100/55">
                        Signal legend
                      </p>
                      <p className="mt-1 text-[10px] font-bold text-white/38">Read the venue layer fast</p>
                    </div>
                    <span className="rounded-full border border-white/10 bg-white/[0.045] px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.18em] text-white/48 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                      Live grid
                    </span>
                  </div>
                  <div className="mt-3 space-y-2">
                    <div className="map-legend-row map-legend-row--activated">
                      <span className="map-legend-icon-well map-legend-icon-well--activated" aria-hidden="true">
                        <span className="legend-building-mini" aria-hidden="true">
                          <span className="legend-building-mini-roof" />
                          <span className="legend-building-mini-body" />
                        </span>
                      </span>
                      <div className="min-w-0">
                        <p className="map-legend-title text-[#f8dd72]">Activated venue</p>
                        <p className="map-legend-detail">Paid command layer visible</p>
                      </div>
                    </div>
                    <div className="map-legend-row map-legend-row--live">
                      <span className="map-legend-icon-well map-legend-icon-well--live" aria-hidden="true">
                        <span className="legend-live-dot" aria-hidden="true" />
                      </span>
                      <div className="min-w-0">
                        <p className="map-legend-title text-cyan-100">Live challenge</p>
                        <p className="map-legend-detail">Open money is moving</p>
                      </div>
                    </div>
                    <div className="map-legend-row map-legend-row--open">
                      <span className="map-legend-icon-well map-legend-icon-well--open" aria-hidden="true">
                        <span className="legend-open-dot" aria-hidden="true" />
                      </span>
                      <div className="min-w-0">
                        <p className="map-legend-title text-white/78">Open venue</p>
                        <p className="map-legend-detail">Claim or fund the first move</p>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            ) : null}
            {showFootprintLayer && footprintMarks.length > 0 ? (
              <div
                className={`pointer-events-none absolute left-3 z-[10] rounded-full border border-[#b87fff]/28 bg-[linear-gradient(180deg,rgba(184,127,255,0.18)_0%,rgba(16,10,28,0.88)_100%)] px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[0.18em] text-[#e5c7ff] shadow-[0_10px_18px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.08)] md:left-5 md:text-[10px] ${showNearbyDareTray ? nearbyDarePanelCollapsed ? 'bottom-[4.75rem] md:bottom-[6.4rem]' : 'bottom-[16.25rem] md:bottom-[18.9rem]' : 'bottom-3 md:bottom-5'}`}
              >
                Your trace · {footprintMarks.length} verified marks
              </div>
            ) : null}
            {showNearbyDareTray ? (
              <div className={`nearby-dare-tray absolute z-[10] overflow-hidden border border-[#f5c518]/18 bg-[linear-gradient(180deg,rgba(255,255,255,0.08)_0%,rgba(10,12,22,0.94)_18%,rgba(5,6,12,0.985)_100%)] shadow-[0_20px_40px_rgba(0,0,0,0.34),0_0_22px_rgba(245,197,24,0.08),inset_0_1px_0_rgba(255,255,255,0.08),inset_0_-16px_20px_rgba(0,0,0,0.22)] ${isMobileViewport ? 'bottom-3 left-3 right-3 rounded-[20px]' : 'bottom-5 left-5 right-auto max-w-[23rem] rounded-[24px]'}`}>
                {isMobileViewport && nearbyDarePanelCollapsed ? (
                  <button
                    type="button"
                    onClick={() => setNearbyDarePanelCollapsed(false)}
                    className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
                    aria-label="Expand nearby mission tray"
                  >
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#f5c518]">
                        Happening Around You
                      </p>
                      <p className="mt-1 truncate text-[11px] text-white/52">
                        {nearbyDaresLoading
                          ? 'Scanning the local grid...'
                          : mapHappenings.length > 0
                            ? `${mapHappenings.length} things · ${happeningWindow.label}`
                            : `No happenings surfaced within ${nearbyDareRadiusKm}km`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="rounded-full border border-[#f5c518]/20 bg-[#f5c518]/[0.08] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#f8dd72]">
                        {nearbyDaresLoading ? 'scanning' : `${mapHappenings.length} things`}
                      </div>
                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white/58">
                        <ChevronUp className="h-4 w-4" />
                      </span>
                    </div>
                  </button>
                ) : (
                <>
                <div className="border-b border-white/8 px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#f5c518]">
                        Happening Around You
                      </p>
                      <p className="mt-1 text-[11px] text-white/55">
                        {userLocation ? happeningWindow.prompt : `${happeningWindow.dateLabel} · ${happeningWindow.prompt}`}
                      </p>
                    </div>
                    <div className="rounded-full border border-[#f5c518]/20 bg-[#f5c518]/[0.08] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#f8dd72]">
                      {nearbyDaresLoading ? 'scanning' : `${mapHappenings.length} things`}
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-2">
                    {nearbyDareCounts.all > 0 ? (
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
                    ) : (
                      <div className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/48">
                        Tourist mode · events, venues + proof openings
                      </div>
                    )}
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
                <div className={`nearby-dare-tray-list px-2 py-2 ${isMobileViewport ? 'max-h-[34dvh] overflow-y-auto' : ''}`}>
                  {nearbyDaresLoading ? (
                    <div className="px-3 py-5 text-center text-[11px] uppercase tracking-[0.18em] text-white/45">
                      Scanning the local grid...
                    </div>
                  ) : (
                    mapHappenings.length > 0 ? (
                    mapHappenings.map((happening) => {
                      const toneClasses = getHappeningToneClasses(happening.tone);
                      const isExternalHappeningHref = happening.href?.startsWith('http');

                      return (
                        <div
                          key={`map-happening:${happening.id}`}
                          className="flex items-center justify-between gap-3 rounded-[18px] border border-transparent px-3 py-2 transition hover:border-white/10 hover:bg-white/[0.04]"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start gap-2">
                              <span className={`mt-1 inline-flex h-2.5 w-2.5 shrink-0 rounded-full ${toneClasses.dot}`} />
                              <div className="min-w-0">
                                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/36">
                                  {happening.eyebrow}
                                </p>
                                <p className="mt-0.5 line-clamp-2 text-[13px] font-semibold leading-snug text-white">
                                  {happening.title}
                                </p>
                                <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-white/48">
                                  {happening.detail}
                                </p>
                              </div>
                            </div>
                            <div className="mt-2 flex flex-wrap items-center gap-2 pl-[18px]">
                              <div className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${toneClasses.chip}`}>
                                {happening.timingLabel}
                              </div>
                              {happening.distanceLabel ? (
                                <div className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/62">
                                  {happening.distanceLabel}
                                </div>
                              ) : null}
                              {happening.rewardLabel ? (
                                <div className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/62">
                                  {happening.rewardLabel}
                                </div>
                              ) : null}
                            </div>
                          </div>
                          <div className="flex shrink-0 flex-col items-end gap-2">
                            {happening.place ? (
                              <button
                                type="button"
                                onClick={() => focusExistingPlace(happening.place!)}
                                className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/72 transition hover:border-white/16 hover:text-white"
                              >
                                Venue
                              </button>
                            ) : null}
                            {happening.href && isExternalHappeningHref ? (
                              <a
                                href={happening.href}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] transition ${toneClasses.action}`}
                              >
                                {happening.actionLabel}
                              </a>
                            ) : happening.href ? (
                              <Link
                                href={happening.href}
                                className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] transition ${toneClasses.action}`}
                              >
                                {happening.actionLabel}
                              </Link>
                            ) : happening.place ? (
                              <button
                                type="button"
                                onClick={() => focusExistingPlace(happening.place!)}
                                className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] transition ${toneClasses.action}`}
                              >
                                {happening.actionLabel}
                              </button>
                            ) : null}
                          </div>
                        </div>
                      );
                    })
                    ) : (
                      <div className="px-3 py-5 text-center text-[11px] uppercase tracking-[0.18em] text-white/45">
                        No happenings surfaced in {nearbyDareRadiusKm}km yet. Move the map or drop the first mark.
                      </div>
                    )
                  )}
                </div>
                ) : (
                  <div className="px-4 py-3 text-[11px] text-white/48">
                    {nearbyDaresLoading
                      ? 'Scanning the local grid...'
                      : mapHappenings.length > 0
                        ? `${mapHappenings[0].title}`
                        : `No happenings surfaced within ${nearbyDareRadiusKm}km`}
                  </div>
                )}
                </>
                )}
              </div>
            ) : null}
            <div className="absolute left-3 top-3 z-[9] flex flex-col gap-2 md:left-5 md:top-6">
              <button
                type="button"
                onClick={requestApproximateLocation}
                disabled={locating}
                className={`flex h-10 w-10 items-center justify-center rounded-full border text-cyan-100 shadow-[0_14px_26px_rgba(0,0,0,0.32),inset_0_1px_0_rgba(255,255,255,0.08)] transition hover:-translate-y-[1px] disabled:cursor-wait disabled:opacity-70 md:h-11 md:w-11 ${
                  isUserCentered
                    ? 'border-cyan-200/40 bg-[linear-gradient(180deg,rgba(34,211,238,0.22)_0%,rgba(10,16,28,0.94)_100%)] shadow-[0_14px_26px_rgba(0,0,0,0.32),0_0_18px_rgba(34,211,238,0.18),inset_0_1px_0_rgba(255,255,255,0.1)]'
                    : 'border-cyan-300/24 bg-[linear-gradient(180deg,rgba(34,211,238,0.16)_0%,rgba(8,12,20,0.92)_100%)] hover:border-cyan-200/38 hover:bg-cyan-500/[0.16]'
                }`}
                aria-label={
                  locating
                    ? 'Locating current position'
                    : hasUserLocation
                      ? 'Re-center map on my location'
                      : 'Locate me on the map'
                }
                title={
                  locating
                    ? 'Locating...'
                    : hasUserLocation
                      ? 'Re-center on me'
                      : 'Locate me'
                }
              >
                {locating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <LocateFixed className="h-4 w-4" />
                )}
              </button>
              <div className="overflow-hidden rounded-[20px] border border-white/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.08)_0%,rgba(10,10,20,0.92)_100%)] shadow-[0_14px_30px_rgba(0,0,0,0.34),inset_0_1px_0_rgba(255,255,255,0.08)] md:rounded-[22px]">
                <button
                  type="button"
                  onClick={() => mapInstanceRef.current?.zoomIn()}
                  className="flex h-10 w-10 items-center justify-center border-b border-white/10 text-white/82 transition hover:bg-white/[0.08] hover:text-white md:h-11 md:w-11"
                  aria-label="Zoom in"
                  title="Zoom in"
                >
                  <Plus className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => mapInstanceRef.current?.zoomOut()}
                  className="flex h-10 w-10 items-center justify-center text-white/82 transition hover:bg-white/[0.08] hover:text-white md:h-11 md:w-11"
                  aria-label="Zoom out"
                  title="Zoom out"
                >
                  <Minus className="h-4 w-4" />
                </button>
              </div>
              <div className="overflow-hidden rounded-[20px] border border-cyan-200/14 bg-[linear-gradient(180deg,rgba(190,249,255,0.1)_0%,rgba(8,12,22,0.94)_100%)] shadow-[0_16px_34px_rgba(0,0,0,0.38),0_0_22px_rgba(34,211,238,0.08),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur md:rounded-[22px]">
                <div className="hidden items-center justify-between border-b border-white/10 px-2 py-1 text-[7px] font-black uppercase tracking-[0.16em] text-cyan-100/70 md:flex">
                  <span>3D</span>
                  <span>{mapCameraPitchLabel}</span>
                </div>
                <div className="grid grid-cols-2">
                  <button
                    type="button"
                    onClick={() => easeMapCamera({ bearingDelta: -28 })}
                    className="flex h-9 w-10 items-center justify-center border-b border-r border-white/10 text-cyan-100/82 transition hover:bg-cyan-300/[0.12] hover:text-white md:h-10 md:w-11"
                    aria-label="Orbit map left"
                    title="Orbit left"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => easeMapCamera({ bearingDelta: 28 })}
                    className="flex h-9 w-10 items-center justify-center border-b border-white/10 text-cyan-100/82 transition hover:bg-cyan-300/[0.12] hover:text-white md:h-10 md:w-11"
                    aria-label="Orbit map right"
                    title="Orbit right"
                  >
                    <RotateCw className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => easeMapCamera({ pitchDelta: -10 })}
                    className="flex h-9 w-10 items-center justify-center border-r border-white/10 text-white/78 transition hover:bg-white/[0.08] hover:text-white md:h-10 md:w-11"
                    aria-label="Tilt map down"
                    title="Tilt down"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => easeMapCamera({ pitchDelta: 10 })}
                    className="flex h-9 w-10 items-center justify-center text-white/78 transition hover:bg-white/[0.08] hover:text-white md:h-10 md:w-11"
                    aria-label="Tilt map up"
                    title="Tilt up"
                  >
                    <ChevronUp className="h-4 w-4" />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => easeMapCamera({ reset: true })}
                  className="flex h-8 w-full items-center justify-center gap-1 border-t border-white/10 px-2 text-[8px] font-black uppercase tracking-[0.14em] text-cyan-100/70 transition hover:bg-cyan-300/[0.12] hover:text-cyan-50 md:h-9"
                  aria-label="Reset map camera north"
                  title={`Reset camera north · ${mapCameraBearingLabel}`}
                >
                  <span>North</span>
                  <span className="hidden text-white/36 md:inline">{mapCameraBearingLabel}</span>
                </button>
              </div>
            </div>
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
              <div className={selectedPlacePanelWrapClass}>
                <div className={`${mapPanelShellClass} place-panel-popup`}>
                  <div className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-white/24 to-transparent" />
                  <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_16%_0%,rgba(34,211,238,0.13),transparent_26%),radial-gradient(circle_at_85%_100%,rgba(168,85,247,0.12),transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.04)_0%,transparent_32%,transparent_72%,rgba(0,0,0,0.16)_100%)]" />
                  <div className="pointer-events-none absolute inset-[1px] rounded-[31px] border border-white/6 md:rounded-[35px]" />
                  <div className={`flex flex-col overflow-hidden ${isMobileViewport ? 'max-h-[82dvh]' : 'max-h-[52dvh] md:h-full md:max-h-none'}`}>
                  <div className="sticky top-0 z-10 rounded-t-[32px] border-b border-white/8 bg-[rgba(7,9,18,0.9)] px-4 pb-3 pt-3 backdrop-blur-xl md:rounded-t-[36px] md:border-b-0 md:bg-[linear-gradient(180deg,rgba(255,255,255,0.055)_0%,rgba(7,9,18,0.88)_40%,rgba(7,9,18,0.62)_100%)] md:px-5 md:pb-4 md:pt-4">
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
                      <h3 className="text-[1.55rem] font-black leading-[0.94] tracking-tight text-white md:text-[2.05rem]">
                        {selectedPlace.name}
                      </h3>
                      {selectedVenueProfile ? (
                        <div className="mt-3 flex items-start gap-3 rounded-[22px] border border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.075)_0%,rgba(255,255,255,0.025)_46%,rgba(7,9,18,0.72)_100%)] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),inset_0_-12px_18px_rgba(0,0,0,0.2)]">
                          <div className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-[18px] border border-white/12 bg-black/35 text-xl shadow-[0_12px_24px_rgba(0,0,0,0.22),inset_0_1px_0_rgba(255,255,255,0.1)]">
                            {selectedVenueProfile.profileImageUrl ? (
                              <img
                                src={selectedVenueProfile.profileImageUrl}
                                alt=""
                                className="h-full w-full object-cover"
                                loading="lazy"
                              />
                            ) : (
                              <span aria-hidden="true">{selectedVenueProfile.primaryLegend.emoji}</span>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#f8dd72]">
                              {selectedVenueProfile.tagline}
                            </p>
                            <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-white/62">
                              {selectedVenueProfile.bio}
                            </p>
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {selectedVenueProfile.legends.map((legend) => (
                                <span
                                  key={`${selectedPlace.name}:${legend.key}`}
                                  className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.045] px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.18em] text-white/62"
                                >
                                  <span aria-hidden="true">{legend.emoji}</span>
                                  {legend.label}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      ) : null}
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        {firstMarkState ? (
                          <span
                            className={`rounded-full border px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.22em] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] ${firstMarkState.className}`}
                          >
                            {firstMarkState.label}
                          </span>
                        ) : null}
                        {showSelectedVisualBadge ? (
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
                        ) : null}
                        {proximityAccess.label ? (
                          <span className="rounded-full border border-white/12 bg-white/[0.05] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/62 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                            {proximityAccess.label}
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-3 flex items-start gap-2 rounded-[18px] border border-white/10 bg-white/[0.045] px-3 py-2 text-sm leading-relaxed text-white/64 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                        <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cyan-200/80" />
                        <span className="line-clamp-2 min-w-0">
                          {selectedPlace.address || formatCoordinateLabel(selectedPlace.latitude, selectedPlace.longitude)}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic('selection');
                        setSelectedPlace(null);
                      }}
                      className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.08)_0%,rgba(8,9,16,0.82)_100%)] text-white/70 shadow-[0_12px_24px_rgba(0,0,0,0.24),inset_0_1px_0_rgba(255,255,255,0.1),inset_0_-10px_16px_rgba(0,0,0,0.2)] transition hover:-translate-y-[1px] hover:border-white/18 hover:text-white"
                      aria-label="Close place panel"
                      title="Close place panel"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  </div>

                  <div
                    className="selected-place-panel-content min-h-0 flex-1 overflow-y-auto px-4 pb-4 md:px-5 md:pb-6"
                    style={isMobileViewport ? { paddingBottom: 'calc(env(safe-area-inset-bottom) + 7.5rem)' } : undefined}
                  >

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

                  <div className="map-command-console">
                    <div className="map-command-console-header">
                      <div>
                        <p>Command layer</p>
                        <h4>Pick the next move</h4>
                      </div>
                      <span>
                        {selectedVenueCommandCards.filter((card) => card.href || card.resolveAction).length} actions
                      </span>
                    </div>

                    <div className={`${selectedCommandStripClassName} map-command-strip--primary`}>
                      {selectedCommandStripContent}
                    </div>

                    <div className="map-command-actions">
                      {selectedVenueCommandCards.map((card) => {
                        const isResolving = Boolean(card.resolveAction && pendingCommandAction === card.resolveAction);
                        const actionTitle = isResolving ? 'Routing' : card.actionLabel ?? card.value;
                        const rowTitle =
                          card.id === 'reward' && card.value === 'Fund' ? 'First challenge slot' : card.value;
                        const cardContent = (
                          <>
                            <span
                              className={`map-command-action-dot map-command-action-dot--${card.tone}`}
                              aria-hidden="true"
                            />
                            <div className="map-command-action-copy">
                              <div className="map-command-action-top">
                                <span>{card.eyebrow}</span>
                                <span>{card.meta}</span>
                              </div>
                              <p className="map-command-action-title">{rowTitle}</p>
                              <p className="map-command-action-detail">{card.detail}</p>
                            </div>
                            <span className="map-command-action-button">
                              {actionTitle}
                              {card.href ? <ArrowLeft className="h-3 w-3 rotate-180" /> : null}
                            </span>
                          </>
                        );
                        const className = `map-command-action map-command-action--${card.tone} ${
                          card.href || card.resolveAction ? 'map-command-action--clickable' : 'map-command-action--static'
                        }`;

                        return card.href ? (
                          <Link
                            key={`venue-command-${card.id}`}
                            href={card.href}
                            className={className}
                            aria-label={`${actionTitle} ${card.eyebrow} for ${selectedPlace.name}`}
                          >
                            {cardContent}
                          </Link>
                        ) : card.resolveAction ? (
                          <button
                            key={`venue-command-${card.id}`}
                            type="button"
                            onClick={() => void handleSelectedCommandAction(card.resolveAction!)}
                            disabled={Boolean(pendingCommandAction)}
                            className={className}
                            aria-label={`${card.actionLabel ?? card.value} ${card.eyebrow} for ${selectedPlace.name}`}
                          >
                            {cardContent}
                          </button>
                        ) : (
                          <div key={`venue-command-${card.id}`} className={className}>
                            {cardContent}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="map-mobile-stats mt-4 grid grid-cols-2 gap-3">
                    <div className={`${mapPanelMetricClass} stat-card bd-dent-surface bd-dent-surface--soft`}>
                      <p className="text-[10px] uppercase tracking-[0.24em] text-white/35">Sparks</p>
                      <p className="mt-2 text-[1.65rem] font-black leading-none text-white">{selectedPlace.approvedCount ?? 0}</p>
                    </div>
                    <div className={`${mapPanelMetricClass} stat-card bd-dent-surface bd-dent-surface--soft`}>
                      <p className="text-[10px] uppercase tracking-[0.24em] text-white/35">Heat</p>
                      <p className="mt-2 text-[1.65rem] font-black leading-none text-white">{selectedPlace.heatScore ?? 0}</p>
                      <p className="mt-1 text-[10px] uppercase tracking-[0.18em] text-white/42">{selectedPulseMeaning.label}</p>
                    </div>
                  </div>

                  <div className={`map-mobile-priority mt-4 ${mapPanelSectionClass}`}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.24em] text-white/40">
                        <Flame className="h-3.5 w-3.5 text-[#f5c518]" />
                        Why this venue
                      </div>
                      <span className={mapPanelInsetChipClass}>{selectedPulseMeaning.label}</span>
                    </div>
                    <p className="map-mobile-trim mt-3 text-sm leading-relaxed text-white/76">
                      {selectedPulseMeaning.description}
                    </p>
                    <div className="map-mobile-reasons mt-3 space-y-2">
                      {selectedVenueWhyNow.map((reason, index) => (
                        <div
                          key={`venue-why-${index}`}
                          className="rounded-[18px] border border-white/8 bg-white/[0.03] px-3 py-2.5 text-sm text-white/68 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
                        >
                          {reason}
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 rounded-[18px] border border-cyan-300/16 bg-cyan-500/[0.06] px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                      <p className="text-[10px] uppercase tracking-[0.2em] text-cyan-100/72">Next move</p>
                      <p className="mt-1.5 text-sm text-white/78">{selectedVenueNextMove}</p>
                    </div>
                  </div>

                  <div className={`map-mobile-secondary mt-4 ${mapPanelSectionClass}`}>
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

                  {selectedCommandCenter ? (
                    <div className={`map-mobile-secondary mt-4 ${mapPanelSectionClass}`}>
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.24em] text-white/40">
                          <LocateFixed className="h-3.5 w-3.5 text-cyan-200" />
                          Venue Ops
                        </div>
                        <span
                          className={`rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] ${
                            selectedCommandCenter.status === 'live'
                              ? 'border-cyan-300/20 bg-cyan-500/[0.08] text-cyan-100'
                              : 'border-[#f5c518]/22 bg-[#f5c518]/[0.08] text-[#f8dd72]'
                          }`}
                        >
                          {selectedCommandCenter.label}
                        </span>
                      </div>
                      <p className="mt-3 text-sm leading-relaxed text-white/74">
                        {selectedCommandCenter.summary}
                      </p>
                      {selectedActivationActionCopy ? (
                        <Link
                          href={selectedActivationHref ?? selectedCommandCenter.contactUrl}
                          className={`mt-3 flex items-center justify-between gap-3 rounded-[20px] border px-3.5 py-3 text-left transition hover:-translate-y-[1px] ${
                            selectedVenueActivated
                              ? 'border-[#f5c518]/24 bg-[linear-gradient(180deg,rgba(245,197,24,0.12)_0%,rgba(70,43,7,0.14)_100%)] shadow-[0_14px_28px_rgba(0,0,0,0.22),0_0_18px_rgba(245,197,24,0.08),inset_0_1px_0_rgba(255,255,255,0.08)] hover:border-[#f5c518]/38'
                              : 'border-cyan-300/20 bg-[linear-gradient(180deg,rgba(34,211,238,0.11)_0%,rgba(8,14,22,0.78)_100%)] shadow-[0_14px_28px_rgba(0,0,0,0.22),0_0_18px_rgba(34,211,238,0.06),inset_0_1px_0_rgba(255,255,255,0.08)] hover:border-cyan-300/34'
                          }`}
                        >
                          <span className="min-w-0">
                            <span className={`block text-[10px] font-semibold uppercase tracking-[0.22em] ${
                              selectedVenueActivated ? 'text-[#f8dd72]' : 'text-cyan-100'
                            }`}>
                              {selectedActivationActionCopy.label}
                            </span>
                            <span className="mt-1 block text-xs font-medium text-white/58">
                              {selectedActivationActionCopy.detail}
                            </span>
                          </span>
                          <span className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border ${
                            selectedVenueActivated
                              ? 'border-[#f5c518]/28 bg-[#f5c518]/[0.10] text-[#f8dd72]'
                              : 'border-cyan-300/24 bg-cyan-500/[0.10] text-cyan-100'
                          }`}>
                            <ArrowLeft className="h-3.5 w-3.5 rotate-180" />
                          </span>
                        </Link>
                      ) : null}
                      <div className="mt-3 flex flex-wrap gap-2.5">
                        <span className={mapPanelInsetChipClass}>
                          {selectedCommandCenter.sponsorReady ? 'Sponsor-ready' : 'Unclaimed venue'}
                        </span>
                        <span className={mapPanelInsetChipClass}>
                          {selectedCommandCenter.activeCampaignCount} campaign{selectedCommandCenter.activeCampaignCount === 1 ? '' : 's'}
                        </span>
                        {selectedMapModes.map((mode) => (
                          <span
                            key={`mode-${mode.id}`}
                            className={`rounded-full border px-3 py-1.5 text-[10px] uppercase tracking-[0.18em] ${
                              mode.status === 'live'
                                ? 'border-white/10 bg-white/[0.04] text-white/60'
                                : 'border-fuchsia-300/18 bg-fuchsia-500/[0.08] text-fuchsia-100/80'
                            }`}
                            title={mode.description}
                          >
                            {mode.label} {mode.status === 'planned' ? 'soon' : 'live'}
                          </span>
                        ))}
                      </div>
                      <div className="mt-4 grid grid-cols-2 gap-2.5">
                        <div className={`${mapPanelMetricClass} px-3 py-3`}>
                          <p className="text-[10px] uppercase tracking-[0.18em] text-white/34">Visitors Today</p>
                          <p className="mt-2 text-xl font-black text-white">
                            {selectedCommandCenter.metrics.uniqueVisitorsToday ?? 'Pilot'}
                          </p>
                        </div>
                        <div className={`${mapPanelMetricClass} px-3 py-3`}>
                          <p className="text-[10px] uppercase tracking-[0.18em] text-white/34">Live Funding</p>
                          <p className="mt-2 text-xl font-black text-white">
                            ${selectedCommandCenter.metrics.totalLiveFundingUsd.toFixed(0)}
                          </p>
                        </div>
                        <div className={`${mapPanelMetricClass} px-3 py-3`}>
                          <p className="text-[10px] uppercase tracking-[0.18em] text-white/34">Verified Marks</p>
                          <p className="mt-2 text-xl font-black text-white">{selectedCommandCenter.metrics.approvedMarks}</p>
                        </div>
                        <div className={`${mapPanelMetricClass} px-3 py-3`}>
                          <p className="text-[10px] uppercase tracking-[0.18em] text-white/34">Paid Activations</p>
                          <p className="mt-2 text-xl font-black text-white">{selectedCommandCenter.metrics.paidActivations}</p>
                        </div>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2.5">
                        {selectedCommandCenter.consoleUrl ? (
                          <Link
                            href={selectedCommandCenter.consoleUrl}
                            className="inline-flex items-center gap-2 rounded-full border border-cyan-300/24 bg-cyan-500/[0.08] px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-100 transition hover:border-cyan-300/36 hover:bg-cyan-500/[0.12]"
                          >
                            Open Console
                            <ArrowLeft className="h-3 w-3 rotate-180" />
                          </Link>
                        ) : null}
                        {selectedCommandCenter.claimState !== 'claimed' ? (
                          <ClaimVenueButton
                            venueSlug={selectedPlace?.slug ?? ''}
                            venueName={selectedPlace?.name ?? 'this venue'}
                            pending={selectedCommandCenter.claimState === 'pending'}
                            className="inline-flex items-center gap-2 rounded-full border border-fuchsia-300/24 bg-fuchsia-500/[0.1] px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-fuchsia-100 transition hover:border-fuchsia-300/40 hover:bg-fuchsia-500/[0.14]"
                            pendingClassName="inline-flex items-center gap-2 rounded-full border border-amber-300/24 bg-amber-500/[0.08] px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-100"
                            requireAuthClassName="inline-flex items-center gap-2 rounded-full border border-fuchsia-300/24 bg-fuchsia-500/[0.1] px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-fuchsia-100 transition hover:border-fuchsia-300/40 hover:bg-fuchsia-500/[0.14]"
                            onClaimSubmitted={(claimRequestTag) => {
                              setSelectedPlace((current) =>
                                current
                                  ? {
                                      ...current,
                                      commandCenter: current.commandCenter
                                        ? {
                                            ...current.commandCenter,
                                            claimState: 'pending',
                                            label: 'Claim pending',
                                            summary: claimRequestTag
                                              ? `${claimRequestTag} has requested control of this venue. Once approved, the command center can graduate into QR operations and sponsored dares.`
                                              : 'A venue claim request is pending moderator review.',
                                            contactLabel: 'Claim pending',
                                            operatorTag: claimRequestTag,
                                          }
                                        : current.commandCenter,
                                    }
                                  : current
                              );
                            }}
                          />
                        ) : null}
                        <Link
                          href={selectedCommandCenter.contactUrl}
                          className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] transition ${
                            selectedCommandCenter.status === 'live'
                              ? 'border-[#f5c518]/24 bg-[#f5c518]/[0.08] text-[#f8dd72] hover:border-[#f5c518]/40 hover:bg-[#f5c518]/[0.12]'
                              : 'border-white/10 bg-white/[0.04] text-white/70 hover:border-white/18 hover:bg-white/[0.08] hover:text-white'
                          }`}
                        >
                          {selectedCommandCenter.contactLabel}
                          <ArrowLeft className="h-3 w-3 rotate-180" />
                        </Link>
                      </div>
                    </div>
                  ) : null}

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

                  <div className={`crossed-paths-section map-mobile-secondary bd-dent-surface mt-4 ${mapPanelSectionClass}`}>
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
                          const lifecycle = getDareLifecycleModel({
                            status: dare.status,
                            streamerHandle: dare.streamerHandle,
                            targetWalletAddress: dare.targetWalletAddress,
                            claimRequestStatus: dare.claimRequestStatus,
                            claimedBy: dare.claimedBy,
                            createdAt: dare.createdAt,
                            expiresAt: dare.expiresAt,
                          });
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
                                  <span className={`rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] ${lifecycle.statusTone}`}>
                                    {lifecycle.currentStatusLabel}
                                  </span>
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
                                <div className="mt-2 rounded-[16px] border border-white/8 bg-black/20 px-3 py-2.5">
                                  <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-white/34">
                                    What happens next
                                  </p>
                                  <p className="mt-1.5 line-clamp-2 text-[12px] leading-5 text-white/62">
                                    {lifecycle.nextActionCopy}
                                  </p>
                                </div>
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

                  <div
                    className={`venue-action-rail mt-3 grid gap-2 sm:mt-4 sm:gap-3 ${
                      selectedPlace.slug ? 'grid-cols-[0.86fr_1fr_1.18fr]' : 'grid-cols-2'
                    }`}
                  >
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
                      buttonVariant="jelly"
                      buttonClassName="map-jelly-action"
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
                      buttonVariant="jelly"
                      buttonClassName="map-jelly-action"
                    />

                    {selectedPlace.slug ? (
                      <SquircleLink
                        href={`/venues/${selectedPlace.slug}${
                          isCreatorSource
                            ? `?source=creator${deepLinkedDareShortId ? `&dare=${encodeURIComponent(deepLinkedDareShortId)}` : ''}`
                            : ''
                        }`}
                        tone="purple"
                        label="Open venue"
                        fullWidth
                        height={44}
                        className="map-jelly-action"
                        labelClassName="text-[0.62rem] tracking-[0.06em] sm:text-[0.76rem]"
                      >
                        <span className="map-jelly-action-label">Open venue</span>
                      </SquircleLink>
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

        @media (max-width: 767px) {
          .selected-place-panel-wrap {
            bottom: calc(0.75rem + env(safe-area-inset-bottom));
            max-height: min(82dvh, calc(100% - 1.5rem));
          }

          .selected-place-panel-content {
            padding-bottom: calc(env(safe-area-inset-bottom) + 7.5rem) !important;
            scroll-padding-bottom: calc(env(safe-area-inset-bottom) + 7.5rem);
            -webkit-overflow-scrolling: touch;
            overscroll-behavior-y: auto;
            touch-action: pan-y;
          }

          .nearby-dare-tray-list {
            -webkit-overflow-scrolling: touch;
            overscroll-behavior-y: auto;
            touch-action: pan-y;
          }

          .map-signal-rail {
            align-items: flex-start;
            gap: 0.4rem;
          }

          .map-signal-rail-label {
            padding-top: 0.68rem;
            font-size: 8px;
            letter-spacing: 0.2em;
          }

          .map-signal-rail-scroll {
            margin-right: -1rem;
            padding-right: 1rem;
          }

          .map-signal-pill {
            min-width: 6.35rem;
            padding: 0.42rem 0.62rem 0.42rem 0.42rem;
          }

          .map-signal-pill-count {
            min-width: 1.85rem;
            height: 1.85rem;
            font-size: 0.72rem;
          }

          .map-active-filter-strip {
            width: 100%;
          }

          .map-command-strip {
            margin-top: 0.85rem;
            border-radius: 1.15rem;
            padding: 0.82rem 0.82rem 0.82rem 0.9rem;
          }

          .map-command-strip-side {
            gap: 0.42rem;
          }

          .map-command-strip-cta {
            display: inline-flex;
            padding: 0.38rem 0.52rem;
            font-size: 0.52rem;
          }

          .map-command-strip-orb {
            display: none;
          }

          .map-venue-command-grid {
            display: flex;
            margin-right: -1rem;
            overflow-x: auto;
            padding-right: 1rem;
            padding-bottom: 0.3rem;
            scroll-snap-type: x proximity;
            scrollbar-width: none;
            -webkit-overflow-scrolling: touch;
          }

          .map-venue-command-grid::-webkit-scrollbar {
            display: none;
          }

          .map-venue-command-card {
            display: flex;
            min-width: 8.35rem;
            min-height: 8.1rem;
            flex-direction: column;
            align-items: stretch;
            scroll-snap-align: start;
            padding: 0.78rem;
          }

          .map-venue-command-card-value {
            font-size: 1.06rem;
          }

          .map-mobile-priority {
            margin-top: 0.75rem;
            padding: 0.9rem !important;
          }

          .venue-action-rail {
            position: relative;
            right: auto;
            bottom: auto;
            left: auto;
            z-index: 8;
            margin-top: 1rem;
            padding: 0.42rem;
            border: 1px solid rgba(255, 255, 255, 0.12);
            border-radius: 1.15rem;
            background:
              linear-gradient(180deg, rgba(14, 16, 28, 0.86), rgba(5, 6, 13, 0.96)),
              radial-gradient(circle at 18% 0%, rgba(34, 211, 238, 0.12), transparent 36%),
              radial-gradient(circle at 82% 0%, rgba(245, 197, 24, 0.12), transparent 34%);
            box-shadow:
              0 18px 46px rgba(0, 0, 0, 0.52),
              0 0 28px rgba(6, 182, 212, 0.08),
              inset 0 1px 0 rgba(255, 255, 255, 0.1),
              inset 0 -10px 18px rgba(0, 0, 0, 0.34);
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
            backface-visibility: hidden;
            touch-action: manipulation;
            transform: translateZ(0);
            will-change: transform;
          }

          .venue-action-rail::before {
            content: '';
            position: absolute;
            inset: 5px 18% auto;
            height: 2px;
            border-radius: 999px;
            background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.36), transparent);
            opacity: 0.75;
            pointer-events: none;
          }

          .venue-action-rail :global(.map-jelly-action) {
            transform: translateZ(0);
          }
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

        .map-signal-rail {
          display: flex;
          align-items: center;
          gap: 0.65rem;
          max-width: 100%;
        }

        .map-signal-rail-label {
          display: inline-flex;
          flex: 0 0 auto;
          align-items: center;
          gap: 0.5rem;
          padding-inline: 0.35rem;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.28em;
          text-transform: uppercase;
          color: rgba(202, 248, 255, 0.78);
        }

        .map-signal-rail-scroll {
          display: flex;
          min-width: 0;
          gap: 0.5rem;
          overflow-x: auto;
          padding: 0.15rem 0.15rem 0.35rem;
          scrollbar-width: none;
          -webkit-overflow-scrolling: touch;
        }

        .map-signal-rail-scroll::-webkit-scrollbar {
          display: none;
        }

        .map-active-filter-strip {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.85rem;
          width: fit-content;
          max-width: 100%;
          border-radius: 1.1rem;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background:
            radial-gradient(circle at 12% 0%, rgba(34, 211, 238, 0.12), transparent 34%),
            linear-gradient(180deg, rgba(255, 255, 255, 0.055), rgba(6, 8, 16, 0.9));
          padding: 0.58rem 0.68rem 0.58rem 0.75rem;
          box-shadow:
            0 12px 24px rgba(0, 0, 0, 0.2),
            inset 0 1px 0 rgba(255, 255, 255, 0.08),
            inset 0 -10px 16px rgba(0, 0, 0, 0.2);
        }

        .map-signal-pill {
          position: relative;
          isolation: isolate;
          display: inline-flex;
          min-width: 7.25rem;
          flex: 0 0 auto;
          align-items: center;
          gap: 0.55rem;
          overflow: hidden;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background:
            radial-gradient(circle at 18% 0%, rgba(255, 255, 255, 0.12), transparent 36%),
            linear-gradient(180deg, rgba(255, 255, 255, 0.055), rgba(6, 8, 16, 0.9));
          padding: 0.48rem 0.72rem 0.48rem 0.5rem;
          color: rgba(255, 255, 255, 0.58);
          box-shadow:
            0 12px 22px rgba(0, 0, 0, 0.22),
            inset 0 1px 0 rgba(255, 255, 255, 0.08),
            inset 0 -10px 16px rgba(0, 0, 0, 0.2);
          transition:
            transform 180ms ease,
            border-color 180ms ease,
            background 180ms ease,
            color 180ms ease;
        }

        .map-signal-pill::before {
          content: '';
          position: absolute;
          inset: 1px 1px auto;
          height: 48%;
          border-radius: inherit;
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.09), transparent);
          opacity: 0.72;
          pointer-events: none;
        }

        .map-signal-pill:hover:not(:disabled) {
          transform: translateY(-1px);
          border-color: rgba(255, 255, 255, 0.18);
          color: white;
        }

        .map-signal-pill:disabled {
          cursor: not-allowed;
          opacity: 0.48;
        }

        .map-signal-pill-count {
          position: relative;
          z-index: 1;
          display: inline-flex;
          min-width: 2.1rem;
          height: 2.1rem;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(0, 0, 0, 0.26);
          color: white;
          font-size: 0.82rem;
          font-weight: 950;
          letter-spacing: -0.04em;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08);
        }

        .map-signal-pill-main {
          position: relative;
          z-index: 1;
          display: flex;
          min-width: 0;
          flex-direction: column;
          align-items: flex-start;
          gap: 0.12rem;
          white-space: nowrap;
        }

        .map-signal-pill-main span:first-child {
          font-size: 0.66rem;
          font-weight: 900;
          letter-spacing: 0.18em;
          text-transform: uppercase;
        }

        .map-signal-pill-main span:last-child {
          font-size: 0.58rem;
          font-weight: 800;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: rgba(255, 255, 255, 0.38);
        }

        .map-command-strip {
          position: relative;
          isolation: isolate;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          overflow: hidden;
          border-radius: 1.35rem;
          border: 1px solid rgba(255, 255, 255, 0.14);
          padding: 0.95rem 0.95rem 0.95rem 1rem;
          color: inherit;
          text-decoration: none;
          box-shadow:
            0 18px 38px rgba(0, 0, 0, 0.24),
            inset 0 1px 0 rgba(255, 255, 255, 0.08),
            inset 0 -14px 20px rgba(0, 0, 0, 0.2);
          transition:
            transform 180ms ease,
            border-color 180ms ease,
            box-shadow 180ms ease,
            filter 180ms ease;
        }

        .map-command-strip--clickable:hover {
          transform: translateY(-1px);
          filter: saturate(1.08);
          box-shadow:
            0 22px 44px rgba(0, 0, 0, 0.3),
            inset 0 1px 0 rgba(255, 255, 255, 0.1),
            inset 0 -14px 20px rgba(0, 0, 0, 0.2);
        }

        .map-command-strip--clickable:focus-visible {
          outline: 2px solid rgba(245, 197, 24, 0.72);
          outline-offset: 3px;
        }

        .map-command-strip::before {
          content: '';
          position: absolute;
          inset: 1px 1px auto;
          height: 46%;
          border-radius: inherit;
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.07), transparent);
          pointer-events: none;
        }

        .map-command-strip--gold {
          border-color: rgba(245, 197, 24, 0.24);
          background:
            radial-gradient(circle at 86% 20%, rgba(245, 197, 24, 0.18), transparent 34%),
            linear-gradient(180deg, rgba(245, 197, 24, 0.12), rgba(10, 9, 16, 0.94));
        }

        .map-command-strip--purple {
          border-color: rgba(184, 127, 255, 0.26);
          background:
            radial-gradient(circle at 86% 20%, rgba(184, 127, 255, 0.2), transparent 34%),
            linear-gradient(180deg, rgba(184, 127, 255, 0.13), rgba(10, 9, 16, 0.94));
        }

        .map-command-strip--cyan {
          border-color: rgba(34, 211, 238, 0.24);
          background:
            radial-gradient(circle at 86% 20%, rgba(34, 211, 238, 0.18), transparent 34%),
            linear-gradient(180deg, rgba(34, 211, 238, 0.11), rgba(10, 9, 16, 0.94));
        }

        .map-command-strip-orb {
          position: relative;
          flex: 0 0 auto;
          display: flex;
          height: 3.15rem;
          width: 3.15rem;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.14);
          background:
            radial-gradient(circle at 38% 28%, rgba(255, 255, 255, 0.28), transparent 34%),
            radial-gradient(circle, rgba(255, 255, 255, 0.08), rgba(5, 6, 12, 0.92));
          box-shadow:
            0 12px 24px rgba(0, 0, 0, 0.28),
            inset 0 1px 0 rgba(255, 255, 255, 0.12);
        }

        .map-command-strip-side {
          position: relative;
          z-index: 1;
          display: flex;
          flex: 0 0 auto;
          align-items: center;
          gap: 0.55rem;
        }

        .map-command-strip-copy {
          position: relative;
          z-index: 1;
        }

        .map-command-strip-cta {
          display: inline-flex;
          align-items: center;
          gap: 0.32rem;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.2);
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.14), rgba(255, 255, 255, 0.055));
          padding: 0.42rem 0.58rem;
          color: rgba(255, 255, 255, 0.86);
          font-size: 0.56rem;
          font-weight: 850;
          letter-spacing: 0.13em;
          line-height: 1;
          text-transform: uppercase;
          white-space: nowrap;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.07);
        }

        .map-command-strip-action-row {
          display: flex;
          margin-top: 0.72rem;
        }

        .map-command-strip-jelly-button {
          appearance: none;
          position: relative;
          isolation: isolate;
          z-index: 1;
          display: inline-flex;
          min-height: 2.32rem;
          width: 5.7rem;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.24);
          color: white;
          text-decoration: none;
          box-shadow:
            0 9px 17px rgba(0, 0, 0, 0.22),
            inset 0 1px 0 rgba(255, 255, 255, 0.22),
            inset 0 -9px 12px rgba(0, 0, 0, 0.18);
          transition:
            transform 160ms ease,
            border-color 160ms ease,
            filter 160ms ease,
            box-shadow 160ms ease;
        }

        .map-command-strip-jelly-button::before {
          content: '';
          position: absolute;
          inset: 0.18rem 0.72rem auto;
          height: 0.24rem;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.5);
          opacity: 0.48;
          pointer-events: none;
        }

        .map-command-strip-jelly-button::after {
          content: '';
          position: absolute;
          inset: auto 0.46rem 0.2rem;
          height: 0.34rem;
          border-radius: 999px;
          background: rgba(0, 0, 0, 0.18);
          filter: blur(4px);
          opacity: 0.26;
          pointer-events: none;
        }

        .map-command-strip-jelly-button:hover {
          transform: translateY(-1px);
          filter: saturate(1.08);
          border-color: rgba(255, 255, 255, 0.34);
        }

        .map-command-strip-jelly-button:focus-visible {
          outline: 2px solid rgba(245, 197, 24, 0.72);
          outline-offset: 3px;
        }

        .map-command-strip-jelly-button--gold {
          color: #15120c;
          border-color: rgba(255, 236, 153, 0.58);
          background:
            radial-gradient(circle at 50% 0%, rgba(255, 255, 255, 0.6), transparent 38%),
            linear-gradient(180deg, rgba(255, 230, 126, 0.98), rgba(245, 197, 24, 0.92) 54%, rgba(138, 90, 0, 0.98));
          box-shadow:
            0 10px 18px rgba(0, 0, 0, 0.23),
            0 0 14px rgba(245, 197, 24, 0.14),
            inset 0 1px 0 rgba(255, 255, 255, 0.38),
            inset 0 -10px 14px rgba(138, 90, 0, 0.24);
        }

        .map-command-strip-jelly-button--cyan {
          border-color: rgba(125, 249, 255, 0.48);
          background:
            radial-gradient(circle at 50% 0%, rgba(255, 255, 255, 0.5), transparent 38%),
            linear-gradient(180deg, rgba(103, 232, 249, 0.96), rgba(20, 184, 166, 0.86) 54%, rgba(12, 74, 110, 0.98));
          box-shadow:
            0 10px 18px rgba(0, 0, 0, 0.23),
            0 0 14px rgba(34, 211, 238, 0.14),
            inset 0 1px 0 rgba(255, 255, 255, 0.32),
            inset 0 -10px 14px rgba(8, 47, 73, 0.27);
        }

        .map-command-strip-jelly-button--purple {
          border-color: rgba(245, 208, 254, 0.5);
          background:
            radial-gradient(circle at 50% 0%, rgba(255, 255, 255, 0.52), transparent 38%),
            linear-gradient(180deg, rgba(217, 70, 239, 0.96), rgba(147, 51, 234, 0.88) 54%, rgba(67, 20, 108, 0.98));
          box-shadow:
            0 10px 18px rgba(0, 0, 0, 0.23),
            0 0 14px rgba(217, 70, 239, 0.14),
            inset 0 1px 0 rgba(255, 255, 255, 0.32),
            inset 0 -10px 14px rgba(59, 7, 100, 0.29);
        }

        .map-command-strip-jelly-label {
          position: relative;
          z-index: 1;
          display: inline-flex;
          min-width: 0;
          align-items: center;
          justify-content: center;
          gap: 0.36rem;
          overflow: hidden;
          text-overflow: ellipsis;
          color: inherit;
          font-size: 0.62rem;
          font-weight: 950;
          letter-spacing: 0.12em;
          line-height: 1;
          text-transform: uppercase;
          white-space: nowrap;
        }

        button.map-command-strip-jelly-button {
          cursor: pointer;
          font: inherit;
        }

        button.map-command-strip-jelly-button:disabled {
          cursor: wait;
          filter: saturate(0.82);
          opacity: 0.76;
        }

        .map-command-strip-orb span {
          height: 1.1rem;
          width: 1.1rem;
          border-radius: 999px;
          background: #f5c518;
          box-shadow:
            0 0 0 7px rgba(245, 197, 24, 0.1),
            0 0 22px rgba(245, 197, 24, 0.32);
        }

        .map-command-strip--purple .map-command-strip-orb span {
          background: #b87fff;
          box-shadow:
            0 0 0 7px rgba(184, 127, 255, 0.1),
            0 0 22px rgba(184, 127, 255, 0.32);
        }

        .map-command-strip--cyan .map-command-strip-orb span {
          background: #67e8f9;
          box-shadow:
            0 0 0 7px rgba(34, 211, 238, 0.1),
            0 0 22px rgba(34, 211, 238, 0.32);
        }

        .map-command-console {
          position: relative;
          isolation: isolate;
          margin-top: 0.95rem;
          overflow: hidden;
          border-radius: 1.45rem;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background:
            radial-gradient(circle at 12% 0%, rgba(34, 211, 238, 0.1), transparent 30%),
            radial-gradient(circle at 92% 18%, rgba(184, 127, 255, 0.12), transparent 34%),
            linear-gradient(180deg, rgba(255, 255, 255, 0.055), rgba(6, 8, 16, 0.94));
          padding: 0.72rem;
          box-shadow:
            0 20px 42px rgba(0, 0, 0, 0.22),
            inset 0 1px 0 rgba(255, 255, 255, 0.08),
            inset 0 -16px 24px rgba(0, 0, 0, 0.22);
        }

        .map-command-console::before {
          content: '';
          position: absolute;
          inset: 1px 1px auto;
          height: 38%;
          border-radius: inherit;
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.07), transparent);
          pointer-events: none;
        }

        .map-command-console-header {
          position: relative;
          z-index: 1;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.85rem;
          padding: 0.15rem 0.18rem 0;
        }

        .map-command-console-header p {
          color: rgba(103, 232, 249, 0.72);
          font-size: 0.56rem;
          font-weight: 900;
          letter-spacing: 0.22em;
          line-height: 1;
          text-transform: uppercase;
        }

        .map-command-console-header h4 {
          margin-top: 0.34rem;
          color: rgba(255, 255, 255, 0.94);
          font-size: 0.92rem;
          font-weight: 950;
          letter-spacing: -0.02em;
          line-height: 1;
        }

        .map-command-console-header > span {
          flex: 0 0 auto;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.13);
          background: rgba(255, 255, 255, 0.055);
          padding: 0.38rem 0.54rem;
          color: rgba(255, 255, 255, 0.52);
          font-size: 0.55rem;
          font-weight: 850;
          letter-spacing: 0.14em;
          line-height: 1;
          text-transform: uppercase;
          white-space: nowrap;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.07);
        }

        .map-command-console .map-command-strip {
          margin-top: 0.7rem;
        }

        .map-command-actions {
          position: relative;
          z-index: 1;
          display: grid;
          gap: 0.52rem;
          margin-top: 0.62rem;
        }

        .map-command-action {
          appearance: none;
          position: relative;
          isolation: isolate;
          display: grid;
          width: 100%;
          grid-template-columns: auto minmax(0, 1fr) auto;
          align-items: center;
          gap: 0.68rem;
          overflow: hidden;
          border-radius: 1rem;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background:
            radial-gradient(circle at 12% 0%, rgba(255, 255, 255, 0.09), transparent 34%),
            linear-gradient(180deg, rgba(255, 255, 255, 0.052), rgba(4, 6, 13, 0.92));
          padding: 0.72rem;
          color: white;
          font: inherit;
          text-align: left;
          text-decoration: none;
          box-shadow:
            0 12px 26px rgba(0, 0, 0, 0.18),
            inset 0 1px 0 rgba(255, 255, 255, 0.07),
            inset 0 -12px 18px rgba(0, 0, 0, 0.18);
          transition:
            transform 180ms ease,
            border-color 180ms ease,
            box-shadow 180ms ease,
            filter 180ms ease;
        }

        .map-command-action::before {
          content: '';
          position: absolute;
          inset: 1px 1px auto;
          height: 46%;
          border-radius: inherit;
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.06), transparent);
          pointer-events: none;
        }

        .map-command-action--clickable {
          cursor: pointer;
        }

        button.map-command-action:disabled {
          cursor: wait;
          filter: saturate(0.78);
          opacity: 0.78;
        }

        .map-command-action--static {
          opacity: 0.72;
        }

        .map-command-action--gold {
          border-color: rgba(245, 197, 24, 0.2);
          background:
            radial-gradient(circle at 10% 0%, rgba(245, 197, 24, 0.14), transparent 36%),
            linear-gradient(180deg, rgba(245, 197, 24, 0.075), rgba(5, 6, 13, 0.94));
        }

        .map-command-action--cyan {
          border-color: rgba(34, 211, 238, 0.19);
          background:
            radial-gradient(circle at 10% 0%, rgba(34, 211, 238, 0.13), transparent 36%),
            linear-gradient(180deg, rgba(34, 211, 238, 0.07), rgba(5, 6, 13, 0.94));
        }

        .map-command-action--purple {
          border-color: rgba(184, 127, 255, 0.21);
          background:
            radial-gradient(circle at 10% 0%, rgba(184, 127, 255, 0.14), transparent 36%),
            linear-gradient(180deg, rgba(184, 127, 255, 0.075), rgba(5, 6, 13, 0.94));
        }

        a.map-command-action:hover,
        button.map-command-action:hover:not(:disabled) {
          transform: translateY(-1px);
          border-color: rgba(255, 255, 255, 0.2);
          filter: saturate(1.08);
          box-shadow:
            0 16px 32px rgba(0, 0, 0, 0.26),
            inset 0 1px 0 rgba(255, 255, 255, 0.1),
            inset 0 -12px 18px rgba(0, 0, 0, 0.18);
        }

        a.map-command-action:focus-visible,
        button.map-command-action:focus-visible {
          outline: 2px solid rgba(245, 197, 24, 0.72);
          outline-offset: 3px;
        }

        .map-command-action-dot {
          position: relative;
          z-index: 1;
          height: 0.72rem;
          width: 0.72rem;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.28);
          box-shadow:
            0 0 0 5px rgba(255, 255, 255, 0.035),
            0 0 18px rgba(255, 255, 255, 0.16);
        }

        .map-command-action-dot--gold {
          background: #f5c518;
          box-shadow:
            0 0 0 5px rgba(245, 197, 24, 0.09),
            0 0 20px rgba(245, 197, 24, 0.34);
        }

        .map-command-action-dot--cyan {
          background: #67e8f9;
          box-shadow:
            0 0 0 5px rgba(34, 211, 238, 0.09),
            0 0 20px rgba(34, 211, 238, 0.34);
        }

        .map-command-action-dot--purple {
          background: #b87fff;
          box-shadow:
            0 0 0 5px rgba(184, 127, 255, 0.1),
            0 0 20px rgba(184, 127, 255, 0.34);
        }

        .map-command-action-copy {
          position: relative;
          z-index: 1;
          min-width: 0;
        }

        .map-command-action-top {
          display: flex;
          min-width: 0;
          align-items: center;
          justify-content: space-between;
          gap: 0.58rem;
          color: rgba(255, 255, 255, 0.42);
          font-size: 0.52rem;
          font-weight: 850;
          letter-spacing: 0.14em;
          line-height: 1;
          text-transform: uppercase;
        }

        .map-command-action-top span:last-child {
          max-width: 7rem;
          overflow: hidden;
          text-align: right;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .map-command-action-title {
          display: flex;
          min-width: 0;
          align-items: center;
          gap: 0.44rem;
          margin-top: 0.38rem;
          color: rgba(255, 255, 255, 0.94);
          font-size: 0.95rem;
          font-weight: 950;
          letter-spacing: -0.015em;
          line-height: 1.02;
        }

        .map-command-action-title > span {
          flex: 0 0 auto;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(255, 255, 255, 0.055);
          padding: 0.25rem 0.42rem;
          color: rgba(255, 255, 255, 0.58);
          font-size: 0.53rem;
          font-weight: 850;
          letter-spacing: 0.08em;
          line-height: 1;
          text-transform: uppercase;
          white-space: nowrap;
        }

        .map-command-action-detail {
          display: -webkit-box;
          margin-top: 0.3rem;
          overflow: hidden;
          -webkit-box-orient: vertical;
          -webkit-line-clamp: 1;
          color: rgba(255, 255, 255, 0.58);
          font-size: 0.66rem;
          line-height: 1.38;
        }

        .map-command-action-button {
          position: relative;
          z-index: 1;
          display: inline-flex;
          width: fit-content;
          align-items: center;
          justify-content: center;
          gap: 0.3rem;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.18);
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.14), rgba(255, 255, 255, 0.055));
          padding: 0.4rem 0.56rem;
          color: rgba(255, 255, 255, 0.86);
          font-size: 0.54rem;
          font-weight: 850;
          letter-spacing: 0.13em;
          line-height: 1;
          text-transform: uppercase;
          white-space: nowrap;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.07);
        }

        .map-venue-command-grid {
          display: grid;
          grid-template-columns: minmax(0, 1fr);
          gap: 0.55rem;
        }

        .map-venue-command-card {
          position: relative;
          isolation: isolate;
          display: grid;
          min-height: auto;
          grid-template-columns: minmax(0, 1fr) auto;
          grid-template-areas:
            'top action'
            'value action'
            'detail action';
          column-gap: 0.8rem;
          row-gap: 0.36rem;
          align-items: center;
          overflow: hidden;
          border-radius: 1rem;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background:
            radial-gradient(circle at 20% 0%, rgba(255, 255, 255, 0.11), transparent 34%),
            linear-gradient(180deg, rgba(255, 255, 255, 0.055), rgba(6, 8, 16, 0.92));
          padding: 0.72rem 0.78rem;
          color: white;
          text-decoration: none;
          box-shadow:
            0 14px 30px rgba(0, 0, 0, 0.2),
            inset 0 1px 0 rgba(255, 255, 255, 0.08),
            inset 0 -14px 20px rgba(0, 0, 0, 0.2);
          transition:
            transform 180ms ease,
            border-color 180ms ease,
            box-shadow 180ms ease;
        }

        .map-venue-command-card--clickable {
          cursor: pointer;
        }

        .map-venue-command-card--static {
          opacity: 0.72;
        }

        .map-venue-command-card::before {
          content: '';
          position: absolute;
          inset: 1px 1px auto;
          height: 48%;
          border-radius: inherit;
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.075), transparent);
          opacity: 0.85;
          pointer-events: none;
        }

        a.map-venue-command-card:hover {
          transform: translateY(-1px);
          border-color: rgba(255, 255, 255, 0.2);
          box-shadow:
            0 18px 34px rgba(0, 0, 0, 0.26),
            inset 0 1px 0 rgba(255, 255, 255, 0.1),
            inset 0 -14px 20px rgba(0, 0, 0, 0.2);
        }

        a.map-venue-command-card:focus-visible {
          outline: 2px solid rgba(245, 197, 24, 0.72);
          outline-offset: 3px;
        }

        .map-venue-command-card--gold {
          border-color: rgba(245, 197, 24, 0.2);
          background:
            radial-gradient(circle at 78% 10%, rgba(245, 197, 24, 0.2), transparent 36%),
            linear-gradient(180deg, rgba(245, 197, 24, 0.11), rgba(8, 8, 15, 0.94));
        }

        .map-venue-command-card--cyan {
          border-color: rgba(34, 211, 238, 0.2);
          background:
            radial-gradient(circle at 78% 10%, rgba(34, 211, 238, 0.18), transparent 36%),
            linear-gradient(180deg, rgba(34, 211, 238, 0.1), rgba(8, 8, 15, 0.94));
        }

        .map-venue-command-card--purple {
          border-color: rgba(184, 127, 255, 0.22);
          background:
            radial-gradient(circle at 78% 10%, rgba(184, 127, 255, 0.18), transparent 36%),
            linear-gradient(180deg, rgba(184, 127, 255, 0.11), rgba(8, 8, 15, 0.94));
        }

        .map-venue-command-card-top {
          position: relative;
          z-index: 1;
          grid-area: top;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.5rem;
          color: rgba(255, 255, 255, 0.44);
          font-size: 0.53rem;
          font-weight: 850;
          letter-spacing: 0.14em;
          text-transform: uppercase;
        }

        .map-venue-command-card-top span:last-child {
          max-width: 4.8rem;
          overflow: hidden;
          text-align: right;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .map-venue-command-card-value {
          position: relative;
          z-index: 1;
          grid-area: value;
          margin-top: 0;
          font-size: 1.02rem;
          font-weight: 950;
          letter-spacing: -0.025em;
          line-height: 0.95;
          color: white;
        }

        .map-venue-command-card-detail {
          position: relative;
          z-index: 1;
          grid-area: detail;
          display: -webkit-box;
          margin-top: 0;
          overflow: hidden;
          -webkit-box-orient: vertical;
          -webkit-line-clamp: 1;
          color: rgba(255, 255, 255, 0.6);
          font-size: 0.68rem;
          line-height: 1.42;
        }

        .map-venue-command-card-action {
          position: relative;
          z-index: 1;
          grid-area: action;
          display: inline-flex;
          margin-top: 0;
          width: fit-content;
          align-items: center;
          gap: 0.3rem;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.18);
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.13), rgba(255, 255, 255, 0.055));
          padding: 0.38rem 0.55rem;
          color: rgba(255, 255, 255, 0.86);
          font-size: 0.56rem;
          font-weight: 850;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06);
        }

        @media (max-width: 767px) {
          .map-command-console {
            margin-top: 0.82rem;
            border-radius: 1.25rem;
            padding: 0.62rem;
          }

          .map-command-console-header {
            padding: 0.12rem 0.12rem 0;
          }

          .map-command-console-header h4 {
            font-size: 0.86rem;
          }

          .map-command-console-header > span {
            padding: 0.34rem 0.46rem;
            font-size: 0.5rem;
          }

          .map-command-strip {
            flex-direction: column;
            align-items: stretch;
            gap: 0.72rem;
            margin-top: 0.85rem;
            border-radius: 1.15rem;
            padding: 0.82rem 0.82rem 0.82rem 0.9rem;
          }

          .map-command-strip-copy {
            width: 100%;
          }

          .map-command-strip-side {
            width: 100%;
            gap: 0.42rem;
            justify-content: flex-start;
          }

          .map-command-strip-cta {
            display: inline-flex;
            padding: 0.38rem 0.52rem;
            font-size: 0.52rem;
          }

          .map-command-strip-action-row {
            margin-top: 0.68rem;
          }

          .map-command-strip-jelly-button {
            width: 5.55rem;
            min-height: 2.25rem;
          }

          .map-command-strip-orb {
            display: none;
          }

          .map-command-console .map-command-strip {
            margin-top: 0.62rem;
          }

          .map-command-actions {
            gap: 0.5rem;
            margin-top: 0.56rem;
          }

          .map-command-action {
            grid-template-columns: auto minmax(0, 1fr);
            align-items: start;
            gap: 0.56rem;
            border-radius: 0.95rem;
            padding: 0.66rem;
          }

          .map-command-action-detail {
            -webkit-line-clamp: 2;
          }

          .map-command-action-button {
            grid-column: 2;
            justify-self: start;
            margin-top: -0.18rem;
            padding: 0.36rem 0.5rem;
            font-size: 0.5rem;
          }

          .map-venue-command-grid {
            display: flex;
            margin-right: -1rem;
            overflow-x: auto;
            padding-right: 1rem;
            padding-bottom: 0.3rem;
            scroll-snap-type: x proximity;
            scrollbar-width: none;
            -webkit-overflow-scrolling: touch;
          }

          .map-venue-command-grid::-webkit-scrollbar {
            display: none;
          }

          .map-venue-command-card {
            display: flex;
            min-width: 8.35rem;
            min-height: 8.1rem;
            flex-direction: column;
            align-items: stretch;
            scroll-snap-align: start;
            padding: 0.78rem;
          }

          .map-venue-command-card-value {
            font-size: 1.06rem;
          }

          .map-venue-command-card-detail {
            -webkit-line-clamp: 2;
          }

          .map-venue-command-card-action {
            margin-top: auto;
          }
        }

        .map-activation-legend {
          position: absolute;
          right: 1.25rem;
          bottom: 1.25rem;
          left: auto;
          top: auto;
          transform-origin: 100% 100%;
          animation: mapLegendSettle 260ms ease-out;
        }

        @media (min-width: 768px) {
          .nearby-dare-tray {
            position: absolute;
            left: 1.25rem !important;
            right: auto !important;
            bottom: 1.25rem !important;
            top: auto !important;
            max-width: min(23rem, calc(100% - 18rem));
          }

          .map-activation-legend {
            right: 1.25rem !important;
            bottom: 1.25rem !important;
            left: auto !important;
            top: auto !important;
          }
        }

        @media (min-width: 768px) and (max-width: 1120px) {
          .map-activation-legend {
            display: none;
          }

          .nearby-dare-tray {
            max-width: 22rem;
          }
        }

        .map-mobile-legend {
          transform-origin: 50% 0%;
          animation: mapLegendSettle 220ms ease-out;
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
        }

        .map-legend-row {
          position: relative;
          display: flex;
          align-items: center;
          gap: 0.72rem;
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, 0.085);
          border-radius: 18px;
          padding: 0.62rem 0.68rem;
          background:
            linear-gradient(180deg, rgba(255, 255, 255, 0.055), rgba(255, 255, 255, 0.018) 38%, rgba(4, 5, 12, 0.56));
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.07),
            inset 0 -8px 14px rgba(0, 0, 0, 0.18),
            0 12px 22px rgba(0, 0, 0, 0.14);
        }

        .map-legend-row::before {
          content: '';
          position: absolute;
          inset: 0;
          pointer-events: none;
          opacity: 0.74;
        }

        .map-legend-row--activated::before {
          background: radial-gradient(circle at 8% 12%, rgba(245, 197, 24, 0.15), transparent 42%);
        }

        .map-legend-row--live::before {
          background: radial-gradient(circle at 8% 12%, rgba(34, 211, 238, 0.16), transparent 42%);
        }

        .map-legend-row--open::before {
          background: radial-gradient(circle at 8% 12%, rgba(255, 255, 255, 0.08), transparent 42%);
        }

        .map-legend-icon-well {
          position: relative;
          z-index: 1;
          display: grid;
          height: 2.35rem;
          width: 2.35rem;
          flex: 0 0 auto;
          place-items: center;
          border-radius: 15px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.08), rgba(0, 0, 0, 0.18));
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.08),
            inset 0 -8px 12px rgba(0, 0, 0, 0.18);
        }

        .map-legend-icon-well--activated {
          border-color: rgba(245, 197, 24, 0.22);
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.08),
            inset 0 -8px 12px rgba(0, 0, 0, 0.18),
            0 0 18px rgba(245, 197, 24, 0.1);
        }

        .map-legend-icon-well--live {
          border-color: rgba(34, 211, 238, 0.22);
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.08),
            inset 0 -8px 12px rgba(0, 0, 0, 0.18),
            0 0 18px rgba(34, 211, 238, 0.1);
        }

        .map-legend-title {
          position: relative;
          z-index: 1;
          font-size: 0.66rem;
          font-weight: 950;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          line-height: 1.1;
        }

        .map-legend-detail {
          position: relative;
          z-index: 1;
          margin-top: 0.18rem;
          font-size: 0.63rem;
          font-weight: 700;
          color: rgba(255, 255, 255, 0.42);
          line-height: 1.2;
        }

        .legend-building-mini {
          position: relative;
          display: inline-flex;
          height: 28px;
          width: 28px;
          flex: 0 0 auto;
          filter: drop-shadow(0 8px 10px rgba(0, 0, 0, 0.38)) drop-shadow(0 0 10px rgba(34, 211, 238, 0.2));
        }

        .legend-building-mini--tight {
          height: 18px;
          width: 18px;
          transform: scale(0.72);
          transform-origin: center;
          margin: -3px -2px;
        }

        .legend-building-mini-roof {
          position: absolute;
          left: 4px;
          top: 1px;
          width: 20px;
          height: 13px;
          clip-path: polygon(50% 0%, 100% 45%, 100% 64%, 0% 64%, 0% 45%);
          background: linear-gradient(135deg, #d8fbff 0%, #67e8f9 52%, #5b21b6 100%);
        }

        .legend-building-mini-body {
          position: absolute;
          left: 6px;
          top: 11px;
          width: 16px;
          height: 14px;
          border-radius: 4px;
          border: 1px solid rgba(103, 232, 249, 0.46);
          background:
            linear-gradient(90deg, transparent 30%, rgba(190, 249, 255, 0.9) 30% 43%, transparent 43% 57%, rgba(34, 211, 238, 0.9) 57% 70%, transparent 70%),
            linear-gradient(180deg, rgba(17, 34, 54, 0.96), rgba(7, 10, 18, 0.98));
          box-shadow: 0 0 12px rgba(34, 211, 238, 0.2);
        }

        .legend-live-dot,
        .legend-open-dot {
          display: inline-flex;
          height: 16px;
          width: 16px;
          flex: 0 0 auto;
          border-radius: 9999px;
          border: 2px solid rgba(5, 6, 12, 0.88);
        }

        .legend-live-dot {
          background: #f5c518;
          box-shadow:
            0 0 0 3px rgba(245, 197, 24, 0.12),
            0 0 18px rgba(245, 197, 24, 0.34);
        }

        .legend-open-dot {
          background: #161322;
          box-shadow:
            0 0 0 3px rgba(255, 255, 255, 0.08),
            inset 0 1px 0 rgba(255, 255, 255, 0.1);
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

        @media (max-width: 767px) {
          .map-panel-shell {
            transform-origin: 50% 100%;
          }

          .place-panel-popup {
            box-shadow:
              0 18px 44px rgba(0, 0, 0, 0.54),
              0 0 20px rgba(34, 211, 238, 0.04),
              inset 0 1px 0 rgba(255, 255, 255, 0.1),
              inset 0 -12px 18px rgba(0, 0, 0, 0.2);
          }
        }

        :global(.map-action-button) {
          position: relative;
          isolation: isolate;
          display: inline-flex;
          min-height: 50px;
          width: 100%;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 0.2rem;
          overflow: hidden;
          border-radius: 16px;
          border: 1px solid rgba(255, 255, 255, 0.18);
          padding: 0.5rem 0.35rem 0.46rem;
          text-align: center;
          font-size: 7.8px;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          text-shadow: 0 1px 0 rgba(0, 0, 0, 0.35);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
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
            linear-gradient(180deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.02) 22%, rgba(0, 0, 0, 0.18) 100%);
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.12),
            inset 0 -10px 16px rgba(0, 0, 0, 0.24);
          pointer-events: none;
        }

        :global(.map-action-button::after) {
          display: none;
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
          max-width: 4.8rem;
          text-wrap: balance;
          line-height: 1.02;
        }

        :global(.map-action-button--cyan) {
          color: #defcff;
          border-color: rgba(34, 211, 238, 0.3);
          background:
            radial-gradient(circle at 50% 0%, rgba(180, 247, 255, 0.18), transparent 36%),
            linear-gradient(180deg, rgba(59, 218, 242, 0.28) 0%, rgba(10, 74, 96, 0.9) 44%, rgba(5, 20, 34, 0.99) 100%);
          box-shadow:
            0 16px 28px rgba(0, 0, 0, 0.28),
            0 0 18px rgba(34, 211, 238, 0.12),
            inset 0 1px 0 rgba(255, 255, 255, 0.14),
            inset 0 -20px 24px rgba(0, 0, 0, 0.3);
        }

        :global(.map-action-button--cyan:hover) {
          border-color: rgba(186, 252, 255, 0.54);
          box-shadow:
            0 18px 32px rgba(0, 0, 0, 0.28),
            0 0 22px rgba(34, 211, 238, 0.16),
            inset 0 1px 0 rgba(255, 255, 255, 0.14),
            inset 0 -20px 24px rgba(0, 0, 0, 0.3);
        }

        :global(.map-action-button--gold) {
          color: #fff0bc;
          border-color: rgba(245, 197, 24, 0.32);
          background:
            radial-gradient(circle at 50% 0%, rgba(255, 240, 182, 0.18), transparent 36%),
            linear-gradient(180deg, rgba(255, 209, 67, 0.3) 0%, rgba(130, 80, 16, 0.9) 48%, rgba(39, 23, 5, 0.99) 100%);
          box-shadow:
            0 16px 28px rgba(0, 0, 0, 0.28),
            0 0 18px rgba(245, 197, 24, 0.12),
            inset 0 1px 0 rgba(255, 255, 255, 0.14),
            inset 0 -20px 24px rgba(0, 0, 0, 0.3);
        }

        :global(.map-action-button--gold:hover) {
          border-color: rgba(248, 221, 114, 0.56);
          box-shadow:
            0 18px 32px rgba(0, 0, 0, 0.28),
            0 0 22px rgba(245, 197, 24, 0.16),
            inset 0 1px 0 rgba(255, 255, 255, 0.14),
            inset 0 -20px 24px rgba(0, 0, 0, 0.3);
        }

        :global(.map-action-button--violet) {
          color: #fdeaff;
          border-color: rgba(217, 70, 239, 0.34);
          background:
            radial-gradient(circle at 50% 0%, rgba(247, 193, 255, 0.18), transparent 36%),
            linear-gradient(180deg, rgba(224, 97, 242, 0.3) 0%, rgba(142, 46, 202, 0.84) 48%, rgba(63, 21, 104, 0.99) 100%);
          box-shadow:
            0 16px 28px rgba(0, 0, 0, 0.28),
            0 0 22px rgba(217, 70, 239, 0.14),
            inset 0 1px 0 rgba(255, 255, 255, 0.16),
            inset 0 -20px 24px rgba(29, 8, 52, 0.34);
        }

        :global(.map-action-button--violet:hover) {
          border-color: rgba(245, 208, 254, 0.58);
          box-shadow:
            0 18px 32px rgba(0, 0, 0, 0.3),
            0 0 26px rgba(217, 70, 239, 0.18),
            inset 0 1px 0 rgba(255, 255, 255, 0.16),
            inset 0 -20px 24px rgba(29, 8, 52, 0.36);
        }

        .venue-action-rail :global(.map-jelly-action) {
          min-width: 0;
          width: 100%;
        }

        .venue-action-rail :global(.map-jelly-action > svg) {
          display: block;
        }

        .venue-action-rail :global(.map-jelly-action > div) {
          padding-left: 0.36rem !important;
          padding-right: 0.36rem !important;
        }

        .venue-action-rail :global(.map-jelly-action > div svg) {
          display: none !important;
        }

        .venue-action-rail :global(.map-jelly-action-label) {
          max-width: 100%;
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          font-size: clamp(0.58rem, 0.74vw, 0.68rem) !important;
          letter-spacing: 0.045em !important;
          line-height: 1;
        }

        @media (min-width: 1180px) {
          .venue-action-rail :global(.map-jelly-action-label) {
            font-size: 0.72rem !important;
            letter-spacing: 0.065em !important;
          }
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

        @media (max-width: 767px) {
          .venue-action-rail :global(.map-action-button) {
            min-height: 48px;
            border-radius: 14px;
            padding: 0.44rem 0.28rem 0.4rem;
            font-size: 7.5px;
            letter-spacing: 0.09em;
            touch-action: manipulation;
            box-shadow:
              0 10px 18px rgba(0, 0, 0, 0.28),
              inset 0 1px 0 rgba(255, 255, 255, 0.13),
              inset 0 -12px 18px rgba(0, 0, 0, 0.28);
          }

          .venue-action-rail :global(.map-action-button span) {
            max-width: 4.55rem;
            line-height: 1.05;
          }

          .venue-action-rail :global(.map-action-button svg) {
            display: none;
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

        .basedare-maplibre-map {
          --tile-filter: brightness(0.46) saturate(0.92) contrast(1.18) hue-rotate(12deg) sepia(0.12);
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

        .basedare-maplibre-map[data-map-preset='crt'] {
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

        .basedare-maplibre-map[data-map-preset='heat'] {
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

        .basedare-maplibre-map[data-map-preset='noir'] {
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

        .basedare-maplibre-map[data-map-preset='night'] {
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

        @keyframes currentLocationPulse {
          0%,
          100% {
            transform: scale(0.96);
            opacity: 0.62;
          }
          50% {
            transform: scale(1.08);
            opacity: 0.9;
          }
        }

        @keyframes currentLocationBob {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-2px);
          }
        }

        .basedare-maplibre-map :global(.maplibregl-map),
        .basedare-maplibre-map :global(.maplibregl-canvas-container),
        .basedare-maplibre-map :global(.maplibregl-canvas) {
          height: 100%;
          width: 100%;
          border-radius: 17px;
          background:
            radial-gradient(circle at 30% 20%, rgba(17, 30, 49, 0.9) 0%, rgba(5, 8, 18, 1) 70%);
          cursor: crosshair;
          font-family: inherit;
        }

        .basedare-maplibre-map :global(.maplibregl-canvas) {
          display: block !important;
          visibility: visible !important;
          filter: brightness(0.78) saturate(1.32) contrast(1.18) hue-rotate(14deg);
          outline: none;
        }

        .basedare-maplibre-map[data-map-preset='noir'] :global(.maplibregl-canvas) {
          filter: brightness(0.48) saturate(0.42) contrast(1.38);
        }

        .maplibre-depth-vignette {
          background:
            radial-gradient(ellipse 80% 62% at 50% 36%, transparent 0%, rgba(2, 4, 10, 0.06) 56%, rgba(0, 0, 0, 0.46) 100%),
            linear-gradient(180deg, rgba(7, 4, 20, 0.13) 0%, transparent 22%, rgba(0, 0, 0, 0.16) 100%);
        }

        .basedare-maplibre-map :global(.maplibregl-marker) {
          z-index: 8;
          will-change: transform;
        }

        .basedare-maplibre-map :global(.basedare-maplibre-marker) {
          border: 0;
          background: transparent;
          cursor: pointer;
          transform-origin: 50% 100%;
          transition: filter 180ms ease;
        }

        .basedare-maplibre-map :global(.basedare-maplibre-marker:hover) {
          filter:
            drop-shadow(0 0 18px rgba(245, 197, 24, 0.18))
            drop-shadow(0 0 24px rgba(34, 211, 238, 0.12));
        }

        .basedare-maplibre-map :global(.basedare-maplibre-marker--cluster) {
          transform-origin: 50% 50%;
        }

        .basedare-maplibre-map :global(.maplibregl-ctrl-bottom-left),
        .basedare-maplibre-map :global(.maplibregl-ctrl-bottom-right) {
          z-index: 9;
        }

        .basedare-maplibre-map :global(.maplibregl-ctrl-attrib) {
          border: 1px solid rgba(107, 33, 255, 0.2);
          border-radius: 999px;
          background:
            linear-gradient(180deg, rgba(255, 255, 255, 0.07), rgba(6, 7, 15, 0.88)) !important;
          color: rgba(255, 255, 255, 0.54);
          box-shadow:
            0 12px 22px rgba(0, 0, 0, 0.24),
            inset 0 1px 0 rgba(255, 255, 255, 0.08);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
        }

        .basedare-maplibre-map :global(.maplibregl-ctrl-attrib a) {
          color: rgba(248, 221, 114, 0.78);
        }

        .basedare-maplibre-map :global(.maplibregl-canvas),
        .basedare-maplibre-map :global(.maplibregl-control-container) {
          z-index: 1;
        }

        .basedare-maplibre-map :global(.peebear-maplibre-icon) {
          background: transparent;
          border: 0;
        }

        .basedare-maplibre-map :global(.current-location-maplibre-icon) {
          background: transparent;
          border: 0;
        }

        .basedare-maplibre-map :global(.place-cluster-maplibre-icon) {
          background: transparent;
          border: 0;
        }

        .basedare-maplibre-map :global(.current-location-marker) {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .basedare-maplibre-map :global(.current-location-marker.is-dot) {
          width: 56px;
          height: 56px;
        }

        .basedare-maplibre-map :global(.current-location-marker.is-centered) {
          width: 72px;
          height: 88px;
        }

        .basedare-maplibre-map :global(.current-location-pulse) {
          position: absolute;
          inset: 10px;
          border-radius: 9999px;
          background: radial-gradient(circle, rgba(34, 211, 238, 0.22) 0%, rgba(184, 127, 255, 0.12) 48%, transparent 74%);
          filter: blur(8px);
          animation: currentLocationPulse 2.4s ease-in-out infinite;
        }

        .basedare-maplibre-map :global(.current-location-heading) {
          position: absolute;
          left: 50%;
          bottom: 50%;
          z-index: 0;
          width: 0;
          height: 0;
          border-left: 10px solid transparent;
          border-right: 10px solid transparent;
          border-top: 52px solid rgba(95, 230, 255, 0.24);
          filter: drop-shadow(0 0 12px rgba(95, 230, 255, 0.18));
          transform-origin: 50% calc(100% - 6px);
          opacity: 0.82;
        }

        .basedare-maplibre-map :global(.current-location-dot-ring) {
          position: absolute;
          z-index: 1;
          width: 30px;
          height: 30px;
          border-radius: 9999px;
          border: 2px solid rgba(190, 249, 255, 0.85);
          background: radial-gradient(circle at 35% 30%, rgba(255, 255, 255, 0.4) 0%, rgba(34, 211, 238, 0.18) 40%, rgba(7, 13, 22, 0.94) 100%);
          box-shadow:
            0 0 0 6px rgba(34, 211, 238, 0.14),
            0 0 18px rgba(34, 211, 238, 0.28),
            inset 0 1px 0 rgba(255, 255, 255, 0.18);
        }

        .basedare-maplibre-map :global(.current-location-dot-core) {
          position: absolute;
          z-index: 2;
          width: 14px;
          height: 14px;
          border-radius: 9999px;
          background: radial-gradient(circle at 35% 30%, rgba(255, 255, 255, 0.92) 0%, #9ff5ff 38%, #36d8ff 100%);
          box-shadow: 0 0 12px rgba(95, 230, 255, 0.4);
        }

        .basedare-maplibre-map :global(.current-location-bear) {
          position: relative;
          z-index: 2;
          display: block;
          width: 72px;
          height: 88px;
          object-fit: contain;
          filter:
            drop-shadow(0 16px 24px rgba(0, 0, 0, 0.34))
            drop-shadow(0 0 16px rgba(184, 127, 255, 0.24));
          animation: currentLocationBob 2.8s ease-in-out infinite;
          user-select: none;
          -webkit-user-drag: none;
        }

        .basedare-maplibre-map :global(.place-cluster-marker) {
          position: relative;
          width: 88px;
          height: 88px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .basedare-maplibre-map :global(.place-cluster-aura) {
          position: absolute;
          inset: 10px;
          border-radius: 9999px;
          background:
            radial-gradient(circle, rgba(245, 197, 24, 0.22) 0%, rgba(184, 127, 255, 0.12) 45%, transparent 76%);
          filter: blur(7px);
          opacity: 0.95;
        }

        .basedare-maplibre-map :global(.place-cluster-core) {
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

        .basedare-maplibre-map :global(.place-cluster-count) {
          font-size: 22px;
          font-weight: 900;
          line-height: 1;
          letter-spacing: -0.04em;
          color: rgba(255, 255, 255, 0.98);
          text-shadow: 0 4px 16px rgba(0, 0, 0, 0.42);
        }

        .basedare-maplibre-map :global(.place-cluster-label) {
          font-size: 8px;
          font-weight: 900;
          line-height: 1;
          letter-spacing: 0.22em;
          color: rgba(255, 255, 255, 0.6);
        }

        .basedare-maplibre-map :global(.place-cluster-shadow) {
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

        .basedare-maplibre-map :global(.place-cluster-match) {
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

        .basedare-maplibre-map :global(.place-cluster-live) {
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

        .basedare-maplibre-map :global(.place-cluster-marker--blazing .place-cluster-core) {
          border-color: rgba(255, 95, 130, 0.74);
          box-shadow:
            0 0 0 4px rgba(255, 45, 85, 0.12),
            0 0 24px rgba(255, 45, 85, 0.24),
            0 18px 28px rgba(0, 0, 0, 0.38),
            inset 0 1px 0 rgba(255, 255, 255, 0.14),
            inset 0 -12px 18px rgba(0, 0, 0, 0.24);
        }

        .basedare-maplibre-map :global(.place-cluster-marker--igniting .place-cluster-core) {
          border-color: rgba(34, 211, 238, 0.72);
          box-shadow:
            0 0 0 4px rgba(34, 211, 238, 0.12),
            0 0 22px rgba(34, 211, 238, 0.22),
            0 18px 28px rgba(0, 0, 0, 0.38),
            inset 0 1px 0 rgba(255, 255, 255, 0.14),
            inset 0 -12px 18px rgba(0, 0, 0, 0.24);
        }

        .basedare-maplibre-map :global(.place-cluster-marker--simmering .place-cluster-core),
        .basedare-maplibre-map :global(.place-cluster-marker--first-mark .place-cluster-core) {
          border-color: rgba(245, 197, 24, 0.74);
          box-shadow:
            0 0 0 4px rgba(245, 197, 24, 0.12),
            0 0 22px rgba(245, 197, 24, 0.2),
            0 18px 28px rgba(0, 0, 0, 0.38),
            inset 0 1px 0 rgba(255, 255, 255, 0.14),
            inset 0 -12px 18px rgba(0, 0, 0, 0.24);
        }

        .basedare-maplibre-map :global(.place-cluster-marker--pending .place-cluster-core) {
          border-color: rgba(251, 191, 36, 0.74);
          box-shadow:
            0 0 0 4px rgba(251, 191, 36, 0.12),
            0 0 22px rgba(251, 191, 36, 0.2),
            0 18px 28px rgba(0, 0, 0, 0.38),
            inset 0 1px 0 rgba(255, 255, 255, 0.14),
            inset 0 -12px 18px rgba(0, 0, 0, 0.24);
        }

        .basedare-maplibre-map :global(.place-cluster-marker.is-matched .place-cluster-core) {
          box-shadow:
            0 0 0 4px rgba(34, 211, 238, 0.12),
            0 0 24px rgba(34, 211, 238, 0.18),
            0 18px 28px rgba(0, 0, 0, 0.38),
            inset 0 1px 0 rgba(255, 255, 255, 0.14),
            inset 0 -12px 18px rgba(0, 0, 0, 0.24);
        }

        .basedare-maplibre-map :global(.peebear-marker) {
          position: relative;
          width: 92px;
          height: 132px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: flex-start;
        }

        .basedare-maplibre-map :global(.peebear-marker.is-compact) {
          width: 76px;
          height: 92px;
        }

        .basedare-maplibre-map :global(.peebear-marker.is-activated-venue) {
          height: 148px;
        }

        .basedare-maplibre-map :global(.peebear-marker.is-activated-venue.is-compact) {
          height: 112px;
        }

        .basedare-maplibre-map :global(.venue-legend-stack) {
          position: absolute;
          left: 50%;
          top: 31px;
          z-index: 8;
          display: flex;
          flex-direction: column;
          gap: 3px;
          transform: translateX(26px);
          pointer-events: none;
        }

        .basedare-maplibre-map :global(.venue-legend-chip) {
          display: inline-flex;
          height: 21px;
          min-width: 21px;
          align-items: center;
          justify-content: center;
          border-radius: 9999px;
          border: 1px solid rgba(255, 255, 255, 0.18);
          background:
            radial-gradient(circle at 34% 20%, rgba(255, 255, 255, 0.2), transparent 52%),
            linear-gradient(180deg, rgba(19, 22, 35, 0.94), rgba(5, 6, 12, 0.94));
          box-shadow:
            0 8px 18px rgba(0, 0, 0, 0.36),
            0 0 16px rgba(245, 197, 24, 0.12),
            inset 0 1px 0 rgba(255, 255, 255, 0.16),
            inset 0 -6px 9px rgba(0, 0, 0, 0.22);
          font-size: 11px;
          line-height: 1;
          backdrop-filter: blur(10px);
        }

        .basedare-maplibre-map :global(.peebear-marker.is-compact .venue-legend-stack) {
          top: 25px;
          gap: 2px;
          transform: translateX(22px) scale(0.9);
          transform-origin: top left;
        }

        .basedare-maplibre-map :global(.peebear-marker.is-activated-venue .venue-legend-stack) {
          top: 50px;
          transform: translateX(27px);
        }

        .basedare-maplibre-map :global(.peebear-marker.is-activated-venue.is-compact .venue-legend-stack) {
          top: 42px;
          transform: translateX(24px) scale(0.86);
          transform-origin: top left;
        }

        .basedare-maplibre-map :global(.peebear-marker.is-activated-venue .peebear-core) {
          margin-top: 46px;
          border-color: rgba(103, 232, 249, 0.74);
          background:
            radial-gradient(circle at 38% 28%, rgba(255, 255, 255, 0.18) 0%, transparent 54%),
            radial-gradient(circle at 60% 86%, rgba(34, 211, 238, 0.2) 0%, transparent 46%),
            linear-gradient(180deg, rgba(13, 29, 47, 0.98), rgba(7, 9, 18, 0.99));
          box-shadow:
            0 0 0 3px rgba(34, 211, 238, 0.16),
            0 0 24px rgba(34, 211, 238, 0.3),
            0 0 34px rgba(184, 127, 255, 0.12),
            0 16px 28px rgba(0, 0, 0, 0.46),
            inset 0 1px 0 rgba(255, 255, 255, 0.12),
            inset 0 -12px 16px rgba(0, 0, 0, 0.26);
        }

        .basedare-maplibre-map :global(.peebear-marker.is-activated-venue.is-compact .peebear-core) {
          margin-top: 38px;
          height: 50px;
          width: 50px;
        }

        .basedare-maplibre-map :global(.venue-building-badge) {
          position: absolute;
          left: 50%;
          top: 4px;
          z-index: 5;
          display: flex;
          height: 46px;
          width: 46px;
          transform: translateX(-50%);
          transform-style: preserve-3d;
          filter: drop-shadow(0 12px 14px rgba(0, 0, 0, 0.45)) drop-shadow(0 0 14px rgba(34, 211, 238, 0.32));
          pointer-events: none;
          transition: transform 180ms ease, filter 180ms ease;
        }

        .basedare-maplibre-map :global(.venue-building-roof) {
          position: absolute;
          left: 6px;
          top: 2px;
          width: 34px;
          height: 22px;
          clip-path: polygon(50% 0%, 100% 44%, 100% 64%, 0% 64%, 0% 44%);
          border-radius: 4px 4px 2px 2px;
          background:
            linear-gradient(135deg, rgba(216, 251, 255, 0.98) 0%, rgba(103, 232, 249, 0.98) 46%, rgba(91, 33, 182, 0.98) 100%);
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.5),
            inset 0 -5px 8px rgba(18, 18, 70, 0.28);
        }

        .basedare-maplibre-map :global(.venue-building-body) {
          position: absolute;
          left: 9px;
          top: 18px;
          display: grid;
          width: 28px;
          height: 23px;
          grid-template-columns: repeat(3, 1fr);
          gap: 3px;
          border-radius: 7px 7px 5px 5px;
          border: 1px solid rgba(103, 232, 249, 0.48);
          background:
            radial-gradient(circle at 50% 0%, rgba(34, 211, 238, 0.18), transparent 54%),
            linear-gradient(180deg, rgba(15, 34, 54, 0.96), rgba(7, 10, 18, 0.98));
          padding: 6px 4px 4px;
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.12),
            inset 0 -8px 10px rgba(0, 0, 0, 0.3),
            0 0 0 2px rgba(34, 211, 238, 0.12);
        }

        .basedare-maplibre-map :global(.venue-building-body span) {
          border-radius: 2px;
          background:
            linear-gradient(180deg, rgba(216, 251, 255, 0.98), rgba(34, 211, 238, 0.82));
          box-shadow: 0 0 8px rgba(34, 211, 238, 0.36);
        }

        .basedare-maplibre-map :global(.venue-building-base) {
          position: absolute;
          left: 5px;
          bottom: 2px;
          width: 36px;
          height: 5px;
          border-radius: 9999px;
          background: linear-gradient(90deg, rgba(12, 43, 57, 0.24), rgba(103, 232, 249, 0.82), rgba(91, 33, 182, 0.24));
          box-shadow: 0 0 12px rgba(34, 211, 238, 0.28);
        }

        .basedare-maplibre-map :global(.venue-activation-pill) {
          position: absolute;
          left: 50%;
          top: 68px;
          z-index: 6;
          transform: translateX(-50%);
          border-radius: 9999px;
          border: 1px solid rgba(103, 232, 249, 0.42);
          background:
            linear-gradient(180deg, rgba(190, 249, 255, 0.18), rgba(34, 211, 238, 0.08)),
            linear-gradient(180deg, rgba(7, 24, 38, 0.96), rgba(5, 8, 14, 0.98));
          padding: 3px 8px;
          font-size: 6.5px;
          font-weight: 900;
          line-height: 1;
          letter-spacing: 0.16em;
          color: #d8fbff;
          white-space: nowrap;
          box-shadow:
            0 10px 18px rgba(0, 0, 0, 0.3),
            0 0 16px rgba(34, 211, 238, 0.18),
            inset 0 1px 0 rgba(255, 255, 255, 0.1);
          opacity: 0;
          transition: opacity 160ms ease, transform 160ms ease;
        }

        .basedare-maplibre-map :global(.peebear-marker.is-activated-venue:hover .venue-activation-pill),
        .basedare-maplibre-map :global(.peebear-marker.is-activated-venue.is-active .venue-activation-pill) {
          opacity: 1;
          transform: translateX(-50%) translateY(-2px);
        }

        .basedare-maplibre-map :global(.peebear-marker.is-activated-venue .peebear-count) {
          left: auto;
          right: 5px;
          top: 0;
          z-index: 7;
          transform: scale(0.84);
        }

        .basedare-maplibre-map :global(.peebear-marker.is-activated-venue.is-compact .peebear-count) {
          right: -2px;
          top: 0;
          transform: scale(0.74);
        }

        .basedare-maplibre-map :global(.peebear-marker.is-activated-venue.is-compact .venue-building-badge) {
          top: 5px;
          transform: translateX(-50%) scale(0.86);
        }

        .basedare-maplibre-map :global(.peebear-marker.is-activated-venue:hover .venue-building-badge),
        .basedare-maplibre-map :global(.peebear-marker.is-activated-venue.is-active .venue-building-badge) {
          transform: translateX(-50%) translateY(-3px) scale(1.04);
          filter: drop-shadow(0 16px 16px rgba(0, 0, 0, 0.5)) drop-shadow(0 0 20px rgba(34, 211, 238, 0.44));
        }

        .basedare-maplibre-map :global(.peebear-match-badge) {
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

        .basedare-maplibre-map :global(.peebear-challenge-aura) {
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

        .basedare-maplibre-map :global(.peebear-challenge-ring) {
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

        .basedare-maplibre-map :global(.peebear-challenge-pill) {
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

        .basedare-maplibre-map :global(.peebear-meta) {
          margin-top: 6px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
        }

        .basedare-maplibre-map :global(.peebear-marker.is-compact .peebear-meta),
        .basedare-maplibre-map :global(.peebear-marker.is-compact .peebear-match-badge),
        .basedare-maplibre-map :global(.peebear-marker.is-compact .peebear-challenge-aura),
        .basedare-maplibre-map :global(.peebear-marker.is-compact .peebear-challenge-ring),
        .basedare-maplibre-map :global(.peebear-marker.is-compact .peebear-challenge-pill),
        .basedare-maplibre-map :global(.peebear-marker.is-compact .peebear-ripple) {
          display: none;
        }

        .basedare-maplibre-map :global(.peebear-pulse-pill) {
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

        .basedare-maplibre-map :global(.peebear-pulse-pill--blazing) {
          border-color: rgba(255, 95, 130, 0.44);
          color: #fff1f4;
          box-shadow:
            0 0 0 2px rgba(255, 45, 85, 0.12),
            0 12px 18px rgba(0, 0, 0, 0.34),
            inset 0 1px 0 rgba(255, 255, 255, 0.08);
        }

        .basedare-maplibre-map :global(.peebear-pulse-pill--igniting) {
          border-color: rgba(34, 211, 238, 0.42);
          color: #d8fbff;
          box-shadow:
            0 0 0 2px rgba(34, 211, 238, 0.11),
            0 12px 18px rgba(0, 0, 0, 0.34),
            inset 0 1px 0 rgba(255, 255, 255, 0.08);
        }

        .basedare-maplibre-map :global(.peebear-pulse-pill--simmering) {
          border-color: rgba(245, 197, 24, 0.46);
          color: #fff2b7;
          box-shadow:
            0 0 0 2px rgba(245, 197, 24, 0.11),
            0 12px 18px rgba(0, 0, 0, 0.34),
            inset 0 1px 0 rgba(255, 255, 255, 0.08);
        }

        .basedare-maplibre-map :global(.peebear-pulse-pill--cold) {
          border-color: rgba(255, 255, 255, 0.16);
          color: rgba(255, 255, 255, 0.78);
        }

        .basedare-maplibre-map :global(.peebear-state) {
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

        .basedare-maplibre-map :global(.peebear-state--pending) {
          border-color: rgba(251, 191, 36, 0.28);
          color: rgba(254, 240, 138, 0.9);
        }

        .basedare-maplibre-map :global(.peebear-state--first-mark) {
          border-color: rgba(245, 197, 24, 0.35);
          color: rgba(248, 221, 114, 0.94);
        }

        .basedare-maplibre-map :global(.peebear-state--active) {
          border-color: rgba(34, 211, 238, 0.28);
          color: rgba(165, 243, 252, 0.88);
        }

        .basedare-maplibre-map :global(.peebear-state--hot) {
          border-color: rgba(251, 113, 133, 0.34);
          color: rgba(255, 228, 230, 0.92);
        }

        .basedare-maplibre-map :global(.peebear-state--unmarked) {
          border-color: rgba(245, 197, 24, 0.24);
          color: rgba(248, 221, 114, 0.9);
        }

        .basedare-maplibre-map :global(.peebear-core) {
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

        .basedare-maplibre-map :global(.peebear-marker.is-compact .peebear-core) {
          height: 54px;
          width: 54px;
          box-shadow:
            0 12px 22px rgba(0, 0, 0, 0.48),
            0 0 0 2px rgba(255, 255, 255, 0.06),
            inset 0 1px 0 rgba(255, 255, 255, 0.08),
            inset 0 -10px 14px rgba(0, 0, 0, 0.22);
          animation: none;
        }

        .basedare-maplibre-map :global(.map-pin-marker) {
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

        .basedare-maplibre-map :global(.map-pin-marker--active) {
          box-shadow:
            5px 5px 12px rgba(0, 0, 0, 0.85),
            -3px -3px 8px rgba(255, 255, 255, 0.07),
            0 0 0 3px rgba(245, 197, 24, 0.7),
            0 0 20px rgba(245, 197, 24, 0.3);
        }

        .basedare-maplibre-map :global(.map-pin-marker--unmarked) {
          box-shadow:
            5px 5px 12px rgba(0, 0, 0, 0.85),
            -3px -3px 8px rgba(255, 255, 255, 0.07),
            0 0 0 3px rgba(34, 211, 238, 0.4);
        }

        .basedare-maplibre-map :global(.peebear-marker.is-active .map-pin-marker) {
          transform: scale(1.1) translateY(-3px);
          box-shadow:
            8px 10px 20px rgba(0, 0, 0, 0.9),
            -3px -3px 8px rgba(255, 255, 255, 0.08),
            0 0 0 3px rgba(245, 197, 24, 0.9),
            0 0 30px rgba(245, 197, 24, 0.45);
        }

        .basedare-maplibre-map :global(.peebear-core--blazing) {
          border-color: rgba(255, 95, 130, 0.75);
          box-shadow:
            0 0 0 3px rgba(255, 45, 85, 0.18),
            0 0 26px rgba(255, 45, 85, 0.32),
            0 14px 26px rgba(0, 0, 0, 0.44),
            inset 0 1px 0 rgba(255, 255, 255, 0.1),
            inset 0 -12px 16px rgba(0, 0, 0, 0.24);
        }

        .basedare-maplibre-map :global(.peebear-core--igniting) {
          border-color: rgba(34, 211, 238, 0.72);
          box-shadow:
            0 0 0 3px rgba(34, 211, 238, 0.16),
            0 0 24px rgba(34, 211, 238, 0.26),
            0 14px 26px rgba(0, 0, 0, 0.44),
            inset 0 1px 0 rgba(255, 255, 255, 0.1),
            inset 0 -12px 16px rgba(0, 0, 0, 0.24);
        }

        .basedare-maplibre-map :global(.peebear-core--simmering) {
          border-color: rgba(245, 197, 24, 0.72);
          box-shadow:
            0 0 0 3px rgba(245, 197, 24, 0.14),
            0 0 22px rgba(245, 197, 24, 0.24),
            0 14px 26px rgba(0, 0, 0, 0.44),
            inset 0 1px 0 rgba(255, 255, 255, 0.1),
            inset 0 -12px 16px rgba(0, 0, 0, 0.24);
        }

        .basedare-maplibre-map :global(.peebear-core--cold) {
          border-color: rgba(255, 255, 255, 0.22);
          filter: saturate(0.82);
        }

        .basedare-maplibre-map :global(.peebear-core--unmarked) {
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

        .basedare-maplibre-map :global(.peebear-core--pending) {
          border-color: rgba(251, 191, 36, 0.7);
          box-shadow:
            0 0 0 3px rgba(251, 191, 36, 0.12),
            0 0 20px rgba(251, 191, 36, 0.18),
            0 14px 26px rgba(0, 0, 0, 0.44),
            inset 0 1px 0 rgba(255, 255, 255, 0.1),
            inset 0 -12px 16px rgba(0, 0, 0, 0.24);
        }

        .basedare-maplibre-map :global(.peebear-core--first-mark) {
          border-color: rgba(245, 197, 24, 0.84);
          box-shadow:
            0 0 0 3px rgba(245, 197, 24, 0.18),
            0 0 28px rgba(245, 197, 24, 0.28),
            0 14px 26px rgba(0, 0, 0, 0.44),
            inset 0 1px 0 rgba(255, 255, 255, 0.1),
            inset 0 -12px 16px rgba(0, 0, 0, 0.24);
        }

        .basedare-maplibre-map :global(.peebear-core--active) {
          box-shadow:
            4px 6px 14px rgba(0, 0, 0, 0.78),
            -2px -2px 6px rgba(255, 255, 255, 0.06),
            0 0 0 2px rgba(34, 211, 238, 0.52),
            0 0 18px rgba(34, 211, 238, 0.24),
            0 14px 26px rgba(0, 0, 0, 0.44),
            inset 0 1px 0 rgba(255, 255, 255, 0.1),
            inset 0 -12px 16px rgba(0, 0, 0, 0.24);
        }

        .basedare-maplibre-map :global(.peebear-core--hot) {
          box-shadow:
            0 0 0 4px rgba(255, 45, 85, 0.22),
            0 0 34px rgba(255, 45, 85, 0.34),
            0 16px 30px rgba(0, 0, 0, 0.48),
            inset 0 1px 0 rgba(255, 255, 255, 0.1),
            inset 0 -12px 16px rgba(0, 0, 0, 0.24);
        }

        .basedare-maplibre-map :global(.peebear-marker.is-active .peebear-core) {
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

        .basedare-maplibre-map :global(.peebear-marker.is-matched .peebear-core) {
          box-shadow:
            0 0 0 3px rgba(34, 211, 238, 0.16),
            0 0 22px rgba(34, 211, 238, 0.22),
            0 12px 24px rgba(0, 0, 0, 0.44),
            inset 0 1px 0 rgba(255, 255, 255, 0.1),
            inset 0 -12px 16px rgba(0, 0, 0, 0.24);
        }

        .basedare-maplibre-map :global(.peebear-marker.is-matched .peebear-state) {
          border-color: rgba(34, 211, 238, 0.2);
          color: rgba(202, 248, 255, 0.92);
        }

        .basedare-maplibre-map :global(.peebear-marker.has-challenge-live.is-active .peebear-challenge-ring) {
          border-color: rgba(248, 221, 114, 0.92);
          box-shadow:
            0 0 0 5px rgba(245, 197, 24, 0.18),
            0 0 0 10px rgba(245, 197, 24, 0.08),
            0 0 28px rgba(245, 197, 24, 0.34),
            inset 0 0 20px rgba(245, 197, 24, 0.1);
        }

        .basedare-maplibre-map :global(.peebear-marker.has-challenge-live.is-active .peebear-challenge-pill) {
          box-shadow:
            0 10px 18px rgba(0, 0, 0, 0.3),
            0 0 22px rgba(245, 197, 24, 0.24),
            inset 0 1px 0 rgba(255, 255, 255, 0.12);
        }

        .basedare-maplibre-map :global(.peebear-head) {
          position: relative;
          z-index: 1;
          width: 88%;
          height: 88%;
          object-fit: contain;
          filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.24));
          user-select: none;
          -webkit-user-drag: none;
        }

        .basedare-maplibre-map :global(.peebear-footprint) {
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

        .basedare-maplibre-map :global(.peebear-footprint.is-first) {
          border-color: rgba(245, 197, 24, 0.28);
          background:
            linear-gradient(180deg, rgba(245, 197, 24, 0.18), rgba(27, 18, 6, 0.92)),
            linear-gradient(180deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0));
          box-shadow:
            0 12px 22px rgba(0, 0, 0, 0.28),
            0 0 18px rgba(245, 197, 24, 0.14),
            inset 0 1px 0 rgba(255, 255, 255, 0.08);
        }

        .basedare-maplibre-map :global(.peebear-footprint.is-latest) {
          transform: scale(1.04);
        }

        .basedare-maplibre-map :global(.peebear-footprint-dot) {
          display: inline-flex;
          height: 9px;
          width: 9px;
          border-radius: 9999px;
          background: #d8b4fe;
          box-shadow: 0 0 0 3px rgba(184, 127, 255, 0.12), 0 0 12px rgba(184, 127, 255, 0.26);
        }

        .basedare-maplibre-map :global(.peebear-footprint.is-first .peebear-footprint-dot) {
          background: #f5c518;
          box-shadow: 0 0 0 3px rgba(245, 197, 24, 0.12), 0 0 12px rgba(245, 197, 24, 0.26);
        }

        .basedare-maplibre-map :global(.peebear-footprint-label) {
          font-size: 7px;
          font-weight: 900;
          line-height: 1;
          letter-spacing: 0.17em;
          color: rgba(237, 216, 255, 0.96);
        }

        .basedare-maplibre-map :global(.peebear-footprint.is-first .peebear-footprint-label) {
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

        @keyframes mapLegendSettle {
          from {
            opacity: 0;
            transform: translateY(8px) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .basedare-maplibre-map :global(.peebear-count) {
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

        .basedare-maplibre-map :global(.peebear-marker.is-compact .peebear-count) {
          top: -10px;
          min-width: 24px;
          height: 22px;
          padding: 0 7px;
          font-size: 11px;
          box-shadow:
            0 8px 14px rgba(0, 0, 0, 0.24),
            inset 0 1px 0 rgba(255, 255, 255, 0.08);
        }

        .basedare-maplibre-map :global(.peebear-count--blazing) {
          border-color: rgba(255, 95, 130, 0.8);
          color: #fff1f4;
          box-shadow:
            0 0 0 2px rgba(255, 45, 85, 0.18),
            0 12px 22px rgba(0, 0, 0, 0.3),
            inset 0 1px 0 rgba(255, 255, 255, 0.08);
        }

        .basedare-maplibre-map :global(.peebear-count--igniting) {
          border-color: rgba(34, 211, 238, 0.8);
          color: #d8fbff;
          box-shadow:
            0 0 0 2px rgba(34, 211, 238, 0.16),
            0 12px 22px rgba(0, 0, 0, 0.3),
            inset 0 1px 0 rgba(255, 255, 255, 0.08);
        }

        .basedare-maplibre-map :global(.peebear-count--simmering) {
          border-color: rgba(245, 197, 24, 0.82);
          color: #fff2b7;
          box-shadow:
            0 0 0 2px rgba(245, 197, 24, 0.14),
            0 12px 22px rgba(0, 0, 0, 0.3),
            inset 0 1px 0 rgba(255, 255, 255, 0.08);
        }

        .basedare-maplibre-map :global(.peebear-count--cold) {
          border-color: rgba(255, 255, 255, 0.22);
          color: rgba(255, 255, 255, 0.92);
        }

        .basedare-maplibre-map :global(.peebear-count--first-mark) {
          border-color: rgba(245, 197, 24, 0.9);
          color: #fff2b7;
          box-shadow:
            0 0 0 2px rgba(245, 197, 24, 0.18),
            0 12px 22px rgba(0, 0, 0, 0.3),
            inset 0 1px 0 rgba(255, 255, 255, 0.08);
        }

        .basedare-maplibre-map :global(.peebear-ripple) {
          position: absolute;
          left: 50%;
          top: 30px;
          width: 60px;
          height: 60px;
          border-radius: 9999px;
          transform: translate(-50%, -50%);
          animation: peebearRipple 2s infinite;
        }

        .basedare-maplibre-map :global(.peebear-ripple--blazing) {
          border: 1.5px solid rgba(255, 45, 85, 0.88);
        }

        @media (max-width: 767px) {
          .basedare-maplibre-map {
            --mesh-opacity: 0.06;
            --links-opacity: 0.08;
            --star-opacity: 0.12;
            --scan-opacity: 0.03;
            --haze-opacity: 0.72;
          }

          .basedare-maplibre-map[data-map-preset='crt'] {
            --mesh-opacity: 0.08;
            --links-opacity: 0.1;
            --star-opacity: 0.1;
            --scan-opacity: 0.07;
            --haze-opacity: 0.7;
          }

          .basedare-maplibre-map[data-map-preset='heat'] {
            --mesh-opacity: 0.06;
            --links-opacity: 0.08;
            --star-opacity: 0.11;
            --scan-opacity: 0.03;
            --haze-opacity: 0.76;
          }

          .basedare-maplibre-map[data-map-preset='night'] {
            --mesh-opacity: 0.06;
            --links-opacity: 0.08;
            --star-opacity: 0.14;
            --scan-opacity: 0.02;
            --haze-opacity: 0.66;
          }

          .basedare-maplibre-map :global(.place-cluster-aura),
          .basedare-maplibre-map :global(.peebear-challenge-aura) {
            filter: blur(4px);
            opacity: 0.7;
          }

          .basedare-maplibre-map :global(.place-cluster-core) {
            box-shadow:
              0 14px 22px rgba(0, 0, 0, 0.3),
              0 0 0 2px rgba(255, 255, 255, 0.04),
              inset 0 1px 0 rgba(255, 255, 255, 0.12),
              inset 0 -10px 14px rgba(0, 0, 0, 0.2);
          }
        }

        .basedare-maplibre-map :global(.peebear-ripple--igniting) {
          border: 1.5px solid rgba(34, 211, 238, 0.84);
        }

        .basedare-maplibre-map :global(.peebear-ripple--simmering) {
          border: 1.5px solid rgba(245, 197, 24, 0.84);
        }

        .basedare-maplibre-map :global(.peebear-ripple--pending) {
          border: 1.5px dashed rgba(251, 191, 36, 0.76);
        }

        .basedare-maplibre-map :global(.peebear-shadow) {
          margin-top: 5px;
          height: 5px;
          width: 18px;
          border-radius: 9999px;
          background: rgba(0, 0, 0, 0.62);
          filter: blur(2px);
        }

        .basedare-maplibre-map :global(.maplibregl-ctrl-group),
        .basedare-maplibre-map :global(.maplibregl-ctrl-attrib) {
          border: 1px solid rgba(107, 33, 255, 0.24);
          border-radius: 16px;
          background:
            linear-gradient(180deg, rgba(255, 255, 255, 0.07), rgba(6, 7, 15, 0.94)) !important;
          box-shadow:
            0 16px 28px rgba(0, 0, 0, 0.26),
            inset 0 1px 0 rgba(255, 255, 255, 0.08);
          overflow: hidden;
        }

        .basedare-maplibre-map :global(.maplibregl-ctrl-group a),
        .basedare-maplibre-map :global(.maplibregl-ctrl-attrib a),
        .basedare-maplibre-map :global(.maplibregl-ctrl-attrib) {
          color: rgba(255, 255, 255, 0.62) !important;
        }

        .basedare-maplibre-map :global(.maplibregl-ctrl-group a) {
          border-bottom-color: rgba(255, 255, 255, 0.06) !important;
          background: transparent !important;
        }

        .basedare-maplibre-map :global(.maplibregl-ctrl-group a:hover) {
          color: #f5c518 !important;
          background: rgba(255, 255, 255, 0.05) !important;
        }
      `}</style>
    </section>
  );
}
