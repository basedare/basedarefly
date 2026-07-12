'use client';

import 'maplibre-gl/dist/maplibre-gl.css';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import maplibregl, {
  type GeoJSONSource,
  type LayerSpecification,
  type Map as MapLibreMap,
  type MapLayerMouseEvent,
  type Marker as MapLibreMarker,
  type PositionAnchor,
  type StyleSpecification,
} from 'maplibre-gl';
import type { Feature, FeatureCollection, LineString, Point, Polygon } from 'geojson';
import {
  ArrowLeft,
  Bike,
  Camera,
  ChevronDown,
  ChevronUp,
  CreditCard,
  Eye,
  EyeOff,
  Flame,
  ImageIcon,
  Loader2,
  LocateFixed,
  MapPin,
  Maximize2,
  Minimize2,
  Move,
  Minus,
  Navigation,
  Plus,
  RotateCcw,
  RotateCw,
  Save,
  Search,
  Send,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  Users,
  X,
  Zap,
} from 'lucide-react';
import { useAccount, useSignMessage } from 'wagmi';
import { calculateDistance } from '@/lib/geo';
import { getDareLifecycleModel } from '@/lib/dare-lifecycle';
import { triggerHaptic } from '@/lib/mobile-haptics';
import { SIGNAL_ROOM_URL } from '@/lib/signal-room';
import { buildWalletActionAuthHeaders } from '@/lib/wallet-action-auth';
import type { VenueLegend, VenueMemorySummary, VenueProfileSummary, VenueSessionSummary } from '@/lib/venue-types';
import { buildVenueActivationIntakeHref, buildVenueChallengeCreateHref } from '@/lib/venue-launch';
import ProofReel from '@/components/maps/ProofReel';
import ProofMomentSheet from '@/components/maps/ProofMomentSheet';
import MeetupComposerSheet from '@/components/maps/MeetupComposerSheet';
import LayerReelBar from '@/components/maps/LayerReelBar';
import AdventureMapOverlay, {
  type MapAttentionIntent,
  type MapAttentionPlaceSuggestion,
} from '@/components/maps/AdventureMapOverlay';
import {
  useTonightActivity,
  type TonightActivity,
} from '@/components/maps/useTonightActivity';
import {
  createMeetupMarkerHtml,
  meetupPassesLayerFilter,
  MAP_LAYER_FILTERS,
  MAP_LAYER_FILTER_LABELS,
  MEETUP_TYPE_LABELS,
  type MeetupPin,
  type MapLayerFilter,
  type MeetupType,
} from '@/lib/meetups';
import CosmicButton from '@/components/ui/CosmicButton';
import CreatePlaceChallengeButton from '@/components/place-challenges/CreatePlaceChallengeButton';
import TagPlaceButton from '@/components/place-tags/TagPlaceButton';
import SentinelBadge from '@/components/SentinelBadge';
import ClaimVenueButton from '@/components/venues/ClaimVenueButton';
import ReceiptShareCard, { type ReceiptShareTone } from '@/components/ReceiptShareCard';
import HoneyGooAccent from '@/components/HoneyGooAccent';
import MapCrosshair from '@/app/map/MapCrosshair';

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
  categories?: string[];
  activeDareCount?: number;
  approvedCount?: number;
  recentCheckInCount?: number;
  hasActivePerk?: boolean;
  intentLabels?: string[];
  matchReason?: string | null;
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

type VenueReviewSignalState = 'none' | 'needs-review' | 'worth-it' | 'mixed' | 'skip';

type VenueReviewSignal = {
  count: number;
  worthItCount: number;
  skipCount: number;
  worthItRatio: number;
  lastReviewedAt: string | null;
  fresh: boolean;
  state: VenueReviewSignalState;
};

type NearbyPlace = {
  id: string;
  slug: string;
  handle: string | null;
  baseCashEnabled: boolean;
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
  reviewSignal?: VenueReviewSignal;
  commandCenter?: VenueCommandCenter;
  mapModes?: VenueMapMode[];
  profile?: VenueProfileSummary;
  activeDareCount: number;
  checkInCount: number;
  mayor?: { tag: string; proofCount: number } | null;
};

type SelectedPlace = {
  placeId?: string;
  slug?: string;
  handle?: string | null;
  baseCashEnabled?: boolean;
  name: string;
  description?: string | null;
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
  reviewSignal?: VenueReviewSignal;
  activeDareCount?: number;
  commandCenter?: VenueCommandCenter;
  mapModes?: VenueMapMode[];
  profile?: VenueProfileSummary;
  checkInRadiusMeters?: number | null;
  memorySummary?: VenueMemorySummary | null;
  liveSession?: VenueSessionSummary | null;
  checkInCount?: number;
};

type NearbyResponse = {
  success: boolean;
  source?: 'database' | 'fallback' | 'curated-fallback';
  warning?: string;
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

const MAP_INTENT_SEARCH_CHIPS = ['Breakfast', 'Coffee', 'Night', 'Beach', 'Proof'];
const PRIVATE_MAP_SPOTS_STORAGE_KEY = 'basedare.privateMapSpots.v1';
const PRIVATE_MAP_SPOT_LIMIT = 12;
const PRIVATE_MAP_SPOT_LABELS = ['Bike', 'Scooter', 'Bag', 'Meetup'];
const MAP_SHEET_DRAG_TRIGGER_PX = 42;
const MAP_SHEET_DRAG_CLOSE_PX = 132;
const MAP_SHEET_DRAG_MAX_UP_PX = 72;
const MAP_SHEET_DRAG_MAX_DOWN_PX = 190;

type MapSheetDragTarget = 'selected-place' | 'nearby-dare';

type MapSheetDragState = {
  target: MapSheetDragTarget;
  offsetY: number;
};

type MapSheetDragSession = MapSheetDragState & {
  startY: number;
  rawY: number;
  pointerId: number;
  moved: boolean;
};

function clampMapSheetDragOffset(rawY: number) {
  const resistedOffset = rawY < 0 ? rawY * 0.62 : rawY;
  return Math.max(-MAP_SHEET_DRAG_MAX_UP_PX, Math.min(MAP_SHEET_DRAG_MAX_DOWN_PX, resistedOffset));
}

type PrivateMapSpot = {
  id: string;
  label: string;
  note: string;
  latitude: number;
  longitude: number;
  landmark: string | null;
  photoDataUrl: string | null;
  corrected: boolean;
  createdAt: string;
  updatedAt: string;
};

type SaveSpotDraft = {
  label: string;
  note: string;
  latitude: number;
  longitude: number;
  landmark: string | null;
  photoDataUrl: string | null;
  corrected: boolean;
};

function createPrivateMapSpotId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `spot-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function readPrivateSpotPhoto(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(reader.error ?? new Error('Unable to read photo'));
    reader.readAsDataURL(file);
  });
}

function isCuratedFallbackVenueId(placeId?: string | null) {
  return typeof placeId === 'string' && placeId.startsWith('curated:');
}

function loadPrivateMapSpots() {
  if (typeof window === 'undefined') return [];

  try {
    const raw = window.localStorage.getItem(PRIVATE_MAP_SPOTS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as PrivateMapSpot[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((spot) => Number.isFinite(spot.latitude) && Number.isFinite(spot.longitude))
      .slice(0, PRIVATE_MAP_SPOT_LIMIT);
  } catch {
    return [];
  }
}

function persistPrivateMapSpots(spots: PrivateMapSpot[]) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(PRIVATE_MAP_SPOTS_STORAGE_KEY, JSON.stringify(spots.slice(0, PRIVATE_MAP_SPOT_LIMIT)));
}

type ResolvePlaceResponse = {
  success: boolean;
  error?: string;
  data?: {
    created: boolean;
    place: {
      id: string;
      slug: string;
      handle: string | null;
      baseCashEnabled: boolean;
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
  missionTag?: string | null;
  isCommunitySpark?: boolean;
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

type LocalSignal = {
  id: string;
  title: string;
  status: 'NEW' | 'APPROVED' | 'REJECTED';
  category: string;
  venueName: string;
  city: string;
  notes: string;
  sourceUrl: string;
  startsAt: string | null;
  endsAt: string | null;
  latitude: number | null;
  longitude: number | null;
  distanceKm: number | null;
  distanceDisplay: string | null;
  submittedBy: string;
  createdAt: string;
  updatedAt: string;
};

type LocalSignalsResponse = {
  success: boolean;
  data?: {
    signals: LocalSignal[];
    count: number;
  };
};

type LocalSignalDraft = {
  title: string;
  category: string;
  venueName: string;
  city: string;
  startsAt: string;
  notes: string;
};

type VenuePresenceVisibility = 'NEARBY' | 'PUBLIC' | 'PRIVATE';
type VenuePresenceDuration = 30 | 60 | 120;
type VenuePresenceSummary = {
  venueId: string;
  venueSlug: string;
  venueName: string;
  latitude: number;
  longitude: number;
  activeCount: number;
  nearbyCount: number;
  publicCount: number;
  latestSignalAt: string;
  expiresAt: string;
  distanceKm: number | null;
  distanceDisplay: string | null;
};
type VenuePresenceResponse = {
  success: boolean;
  data?: {
    signals: VenuePresenceSummary[];
    count: number;
  };
};
type ActivePresenceSignal = {
  venueId: string;
  venueSlug: string;
  venueName: string;
  visibility: VenuePresenceVisibility;
  durationMinutes: VenuePresenceDuration;
  expiresAt: string;
};
type PresenceReceiptState = {
  title: string;
  detail: string;
  href: string;
  venueName: string;
  timestamp: string;
  tone: ReceiptShareTone;
};
type VenueRoomAccess = {
  unlocked: boolean;
  mode: 'check-in' | 'proximity' | 'locked';
  reason: string;
  ttlHours: number;
  radiusMeters: number;
};
type VenueRoomMessage = {
  id: string;
  walletLabel: string;
  displayName: string;
  avatarUrl: string | null;
  body: string;
  mine: boolean;
  kind: 'message' | 'receipt';
  receiptType: string | null;
  href: string | null;
  tone: string | null;
  createdAt: string;
  expiresAt: string;
};
type VenueRoomPresence = {
  id: string;
  walletLabel: string;
  displayName: string;
  avatarUrl: string | null;
  source: string;
  lastSeenAt: string;
  expiresAt: string;
};
type VenueRoomSnapshot = {
  venue: {
    id: string;
    slug: string;
    name: string;
  };
  access: VenueRoomAccess;
  messages: VenueRoomMessage[];
  whoHere: VenueRoomPresence[];
  viewer: {
    visible: boolean;
  };
};
type VenueRoomResponse = {
  success: boolean;
  error?: string;
  data?: VenueRoomSnapshot;
};
type SpotVaultTimelineKind = 'FIRST_PROOF' | 'PROOF' | 'DARE' | 'MEMORY';
type SpotVaultTimelineTone = 'gold' | 'cyan' | 'emerald' | 'violet';
type SpotVaultReviewVerdict = 'worth_it' | 'skip';
type SpotVaultTimelineItem = {
  id: string;
  kind: SpotVaultTimelineKind;
  title: string;
  body: string;
  actorLabel: string | null;
  sourceLabel: string;
  occurredAt: string;
  mediaUrl: string | null;
  href: string | null;
  badges: string[];
  tone: SpotVaultTimelineTone;
};
type SpotVaultReview = {
  id: string;
  walletLabel: string;
  tag: string | null;
  verdict: SpotVaultReviewVerdict;
  note: string | null;
  confirmations: number;
  createdAt: string;
  updatedAt: string;
  mine: boolean;
};
type SpotVaultSnapshot = {
  venue: {
    id: string;
    slug: string;
    name: string;
  };
  viewer: {
    canLeaveSignal: boolean;
    proofLevel: string | null;
    lastCheckInAt: string | null;
    reason: string;
  };
  stats: {
    checkIns: number;
    qrGpsCheckIns: number;
    uniqueVisitors: number;
    proofs: number;
    firstProofs: number;
    completedDares: number;
  };
  reviews: {
    count: number;
    worthItCount: number;
    skipCount: number;
    worthItRatio: number;
    recent: SpotVaultReview[];
    mine: SpotVaultReview | null;
  };
  timeline: SpotVaultTimelineItem[];
};
type SpotVaultResponse = {
  success: boolean;
  error?: string;
  data?: SpotVaultSnapshot;
};

const LOCAL_SIGNAL_CATEGORIES = [
  'surf',
  'food',
  'music',
  'nightlife',
  'market',
  'wellness',
  'tour',
  'community',
  'other',
] as const;

const ACTIVE_PRESENCE_STORAGE_KEY = 'basedare:active-presence-signal';
const START_PROOF_DOCK_DISMISSED_KEY = 'basedare:map-start-proof-dismissed';
const ADVENTURE_MAP_STORAGE_KEY = 'basedare:adventure-map-enabled-v2';
const MAP_ATTENTION_INTENT_STORAGE_KEY = 'basedare:map-attention-intent-v1';

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
      handle: string | null;
      baseCashEnabled: boolean;
      name: string;
      description: string | null;
      address: string | null;
      city: string | null;
      country: string | null;
      latitude: number;
      longitude: number;
      categories: string[];
      profile: VenueProfileSummary;
      checkInRadiusMeters: number;
      memorySummary: VenueMemorySummary | null;
      liveSession: VenueSessionSummary | null;
      tagSummary: {
        approvedCount: number;
        heatScore: number;
        lastTaggedAt: string | null;
      };
      reviewSignal?: VenueReviewSignal;
      commandCenter: VenueCommandCenter;
      mapModes: VenueMapMode[];
      checkInCount: number;
      activeDares: Array<{
        id: string;
        shortId: string;
        title: string;
        missionMode: string;
        missionTag?: string | null;
        isCommunitySpark?: boolean;
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
        missionTag?: string | null;
        isCommunitySpark?: boolean;
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

type VenueQrPayloadResponse = {
  success: boolean;
  error?: string;
  data?: {
    qrValue: string;
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
  missionTag?: string | null;
  isCommunitySpark?: boolean;
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
type HappeningTone = 'gold' | 'cyan' | 'purple' | 'rose' | 'green';
type SignalLayerKind = 'drop' | 'first' | 'route' | 'relic' | 'intel';
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

const DEFAULT_CENTER: [number, number] = [9.802, 126.1635];
const DEFAULT_ZOOM = 14;
const DEFAULT_DESKTOP_MAP_BEARING = -14;
const DEFAULT_MOBILE_MAP_BEARING = -18;
const DEFAULT_DESKTOP_MAP_PITCH = 22;
const DEFAULT_MOBILE_MAP_PITCH = 54;
const MAX_DESKTOP_MAP_PITCH = 34;
const MAX_MOBILE_MAP_PITCH = 64;
const DEFAULT_MAP_BEARING = DEFAULT_DESKTOP_MAP_BEARING;
const DEFAULT_MAP_PITCH = DEFAULT_DESKTOP_MAP_PITCH;
const OPENFREEMAP_LIBERTY_STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty';
const MAPLIBRE_VENUE_SOURCE_ID = 'basedare-venue-signals';
const MAPLIBRE_CHAOS_SOURCE_ID = 'basedare-chaos-zones';
const MAPLIBRE_FOOTPRINT_SOURCE_ID = 'basedare-footprint-trail';
const MAPLIBRE_SELECTED_SOURCE_ID = 'basedare-selected-signal';
const MAPLIBRE_USER_SOURCE_ID = 'basedare-user-position';
const MAPLIBRE_PRESENCE_SOURCE_ID = 'basedare-signal-presence';
const MAPLIBRE_LIVE_SIGNAL_HALO_LAYER_ID = 'basedare-live-signal-halo';
const MAPLIBRE_ACTIVATED_PLINTH_LAYER_ID = 'basedare-activated-venue-plinth';
const MAPLIBRE_PROOF_NODE_LAYER_ID = 'basedare-proof-nodes';
const MAPLIBRE_SIGNAL_LABEL_LAYER_ID = 'basedare-signal-labels';
const MAPLIBRE_PRESENCE_HALO_LAYER_ID = 'basedare-presence-halo';
const MAPLIBRE_PRESENCE_CORE_LAYER_ID = 'basedare-presence-core';
const MAPLIBRE_PRESENCE_LABEL_LAYER_ID = 'basedare-presence-labels';
const MAPLIBRE_INTERACTIVE_SIGNAL_LAYER_IDS = [
  MAPLIBRE_SIGNAL_LABEL_LAYER_ID,
  MAPLIBRE_ACTIVATED_PLINTH_LAYER_ID,
  MAPLIBRE_PROOF_NODE_LAYER_ID,
  MAPLIBRE_LIVE_SIGNAL_HALO_LAYER_ID,
  MAPLIBRE_PRESENCE_LABEL_LAYER_ID,
  MAPLIBRE_PRESENCE_CORE_LAYER_ID,
  MAPLIBRE_PRESENCE_HALO_LAYER_ID,
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
const MAPLIBRE_ENABLE_BUILDING_EXTRUSIONS = false;
const currentLocationIconCache = new Map<string, string>();
let openFreeMapStylePromise: Promise<StyleSpecification | string> | null = null;

function isUsableMapCoordinate(latitude: number, longitude: number) {
  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180 &&
    (Math.abs(latitude) > 0.05 || Math.abs(longitude) > 0.05)
  );
}

function sanitizeOpenFreeMapStyle(style: StyleSpecification): StyleSpecification {
  return {
    ...style,
    projection: style.projection ?? { type: 'mercator' },
    layers: style.layers?.map((layer) => {
      if (layer.type !== 'symbol' || !layer.layout || !('text-font' in layer.layout)) {
        return layer;
      }

      const layout = layer.layout as Record<string, unknown>;
      const rawFontStack = layout['text-font'];
      const fontStack = Array.isArray(rawFontStack) ? rawFontStack.join(' ') : String(rawFontStack ?? '');
      const textFont = /italic|oblique/i.test(fontStack) ? ['Noto Sans Italic'] : ['Noto Sans Regular'];

      return {
        ...layer,
        layout: {
          ...layout,
          'text-font': textFont,
        },
      } as LayerSpecification;
    }),
  };
}

function getDefaultMapCamera(isMobileViewport: boolean) {
  return {
    bearing: isMobileViewport ? DEFAULT_MOBILE_MAP_BEARING : DEFAULT_DESKTOP_MAP_BEARING,
    pitch: isMobileViewport ? DEFAULT_MOBILE_MAP_PITCH : DEFAULT_DESKTOP_MAP_PITCH,
  };
}

function browserCanStartMapRenderer() {
  if (typeof window === 'undefined') return false;
  return 'WebGLRenderingContext' in window || 'WebGL2RenderingContext' in window;
}

function isDesktopChromiumMapRenderer(isMobileRenderer: boolean) {
  if (isMobileRenderer || typeof navigator === 'undefined') return false;

  const userAgent = navigator.userAgent;
  return (
    /\b(?:HeadlessChrome|Chrome|Chromium)\//.test(userAgent) &&
    !/\b(?:Edg|OPR|SamsungBrowser)\//.test(userAgent)
  );
}

function getStableMapPixelRatio(isMobileRenderer: boolean) {
  if (typeof window === 'undefined') return 1;

  const devicePixelRatio = window.devicePixelRatio || 1;
  if (!isDesktopChromiumMapRenderer(isMobileRenderer)) {
    return devicePixelRatio;
  }

  // Cap at 2, not 1: rendering the canvas at half resolution on retina
  // displays forces Chrome to upscale every frame, which reads as shimmer
  // during pan/zoom — the same hardware runs Safari at full DPR without
  // artifacts. The gesture-time load this cap originally guarded against is
  // now handled by data-map-moving calm-down + the zoom-band declutter.
  return Math.min(devicePixelRatio, 2);
}

// Tile crossfade for desktop Chromium. 0 = hard-pop on zoom (old behavior).
const DESKTOP_CHROMIUM_TILE_FADE_MS = 120;

function loadOpenFreeMapStyle() {
  if (!openFreeMapStylePromise) {
    openFreeMapStylePromise = fetch(OPENFREEMAP_LIBERTY_STYLE_URL)
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`OpenFreeMap style failed with ${response.status}`);
        }

        const style = (await response.json()) as StyleSpecification;
        return sanitizeOpenFreeMapStyle(style);
      })
      .catch((error) => {
        console.error('[REAL_WORLD_MAP] Failed to preload map style:', error);
        return OPENFREEMAP_LIBERTY_STYLE_URL;
      });
  }

  return openFreeMapStylePromise;
}

function getMapStartupErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === 'string' && error.trim()) {
    return error;
  }

  return 'Map renderer could not start in this browser session.';
}

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

type ManagedMapMarker = {
  marker: MapLibreMarker;
  element: HTMLDivElement;
  html: string;
  pendingHtml?: string;
  className: string;
  anchor: PositionAnchor;
  draggable: boolean;
  onClick: () => void;
  onDragEnd?: (latitude: number, longitude: number) => void;
  pointerDownHandler: (event: PointerEvent) => void;
  clickHandler: (event: MouseEvent) => void;
  dragEndHandler?: () => void;
};

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

function getMapLibreFirstLineLayerId(map: MapLibreMap) {
  return map.getStyle().layers?.find((layer) => layer.type === 'line')?.id;
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

function getEmptyVenueReviewSignal(checkInCount = 0): VenueReviewSignal {
  return {
    count: 0,
    worthItCount: 0,
    skipCount: 0,
    worthItRatio: 0,
    lastReviewedAt: null,
    fresh: false,
    state: checkInCount > 0 ? 'needs-review' : 'none',
  };
}

function getVenueReviewSignal(place?: { reviewSignal?: VenueReviewSignal; checkInCount?: number } | null) {
  return place?.reviewSignal ?? getEmptyVenueReviewSignal(place?.checkInCount ?? 0);
}

function getReviewSignalHeatContribution(reviewSignal: VenueReviewSignal) {
  if (reviewSignal.state === 'none') return 0;
  if (reviewSignal.state === 'needs-review') return 5;
  if (reviewSignal.state === 'worth-it') return 18 + Math.min(18, reviewSignal.count * 3);
  if (reviewSignal.state === 'mixed') return 10 + Math.min(12, reviewSignal.count * 2);
  return 4;
}

// Trust ladder — the ONLY thing a pin's color may encode (status, never metrics):
// LIVE DARE (cyan) overrides, then VERIFIED = proof-backed (gold), then
// PRESENCE = soft signal only (purple), then NO PROOF (gray). Mirrors the
// venue panel's ladder exactly; review sentiment belongs in the popup, not
// the pin. Paid-live full cyan stays distinct from the soft meetup ring.
function getTrustColor({
  activeDareCount,
  approvedCount,
  checkInCount,
  reviewCount,
  heatScore,
}: {
  activeDareCount: number;
  approvedCount: number;
  checkInCount: number;
  reviewCount: number;
  heatScore: number;
}) {
  if (activeDareCount > 0) return '#22d3ee';
  if (approvedCount > 0 || checkInCount > 0 || reviewCount > 0) return '#f8dd72';
  if (heatScore > 0) return '#b87fff';
  return '#64748b';
}

// Marker words follow the trust ladder — status + neutral metrics only.
// Review sentiment lives in the venue panel (Spot Vault), never on pins.
function getMapLibreSignalLabel({
  activeDareCount,
  approvedCount,
  matched,
  reviewSignal,
  visualState,
  heatScore,
}: {
  activeDareCount: number;
  approvedCount: number;
  matched: boolean;
  reviewSignal: VenueReviewSignal;
  visualState: PlaceVisualState;
  heatScore: number;
}) {
  if (activeDareCount > 1) return `${activeDareCount} live`;
  if (activeDareCount === 1) return 'live dare';
  if (approvedCount > 1) return `${approvedCount} proofs`;
  if (approvedCount === 1) return 'first proof';
  if (reviewSignal.count > 0) return 'verified';
  if (matched) return 'for you';
  if (visualState === 'pending') return 'pending';
  if (heatScore > 0) return 'presence';
  return 'no proof';
}

// Recency pushes heat toward "popping now": fresh verified activity boosts a
// venue across every chaos-driven layer; long-quiet spots visibly cool off.
function getRecencyHeatBoost(lastTaggedAt: string | null) {
  if (!lastTaggedAt) return 0;
  const hoursSince = (Date.now() - new Date(lastTaggedAt).getTime()) / 3_600_000;
  if (!Number.isFinite(hoursSince) || hoursSince < 0) return 0;
  if (hoursSince <= 1) return 30;
  if (hoursSince <= 6) return 18;
  if (hoursSince <= 24) return 10;
  if (hoursSince <= 72) return 4;
  return 0;
}

function getChaosLevelForPlace(place: NearbyPlace) {
  const approvedCount = place.tagSummary.approvedCount;
  const heatScore = place.tagSummary.heatScore;
  const liveSignal = place.activeDareCount * 22;
  const memorySignal = approvedCount * 7;
  const reviewSignal = getReviewSignalHeatContribution(getVenueReviewSignal(place));
  const recencyBoost = getRecencyHeatBoost(place.tagSummary.lastTaggedAt);
  const hoursSinceLast = place.tagSummary.lastTaggedAt
    ? (Date.now() - new Date(place.tagSummary.lastTaggedAt).getTime()) / 3_600_000
    : Number.POSITIVE_INFINITY;
  // Two quiet weeks with nothing live -> the spot cools instead of glowing forever.
  const staleDamp = place.activeDareCount === 0 && hoursSinceLast > 336 ? 0.7 : 1;

  return Math.min(
    100,
    Math.max(8, Math.round((heatScore + liveSignal + memorySignal + reviewSignal + recencyBoost) * staleDamp))
  );
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
      const reviewSignal = getVenueReviewSignal(place);
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
          reviewCount: reviewSignal.count,
          worthItRatio: reviewSignal.worthItRatio,
          reviewSignalState: reviewSignal.state,
          reviewFresh: reviewSignal.fresh,
          activeDareCount: place.activeDareCount,
          liveSignal: place.activeDareCount > 0 ? Math.min(9, place.activeDareCount) : 0,
          chaosLevel,
          matched,
          selected,
          activated: isVenueActivated(place.commandCenter),
          pulseColor: getTrustColor({
            activeDareCount: place.activeDareCount,
            approvedCount: place.tagSummary.approvedCount,
            checkInCount: place.checkInCount,
            reviewCount: reviewSignal.count,
            heatScore: place.tagSummary.heatScore,
          }),
          signalLabel: getMapLibreSignalLabel({
            activeDareCount: place.activeDareCount,
            approvedCount: place.tagSummary.approvedCount,
            matched,
            reviewSignal,
            visualState,
            heatScore: place.tagSummary.heatScore,
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
        const reviewSignal = getVenueReviewSignal(place);
        const matched = showMatchedLayer && matchedVenueIndex.has(place.slug);
        const chaosLevel = getChaosLevelForPlace(place);
        const hasZone =
          chaosLevel >= 22 ||
          reviewSignal.state === 'worth-it' ||
          reviewSignal.fresh ||
          place.activeDareCount > 0 ||
          matched ||
          visualState === 'hot' ||
          visualState === 'active';

        if (!hasZone) return null;

        return createCirclePolygonFeature({
          latitude: place.latitude,
          longitude: place.longitude,
          radiusMeters: Math.min(380, 130 + chaosLevel * 5.8 + place.activeDareCount * 90),
          properties: {
            id: place.id,
            slug: place.slug,
            pulse,
            visualState,
            matched,
            chaosLevel,
            reviewSignalState: reviewSignal.state,
            reviewFresh: reviewSignal.fresh,
            reviewCount: reviewSignal.count,
            activeDareCount: place.activeDareCount,
            pulseColor: getTrustColor({
              activeDareCount: place.activeDareCount,
              approvedCount: place.tagSummary.approvedCount,
              checkInCount: place.checkInCount,
              reviewCount: reviewSignal.count,
              heatScore: place.tagSummary.heatScore,
            }),
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

function buildPresenceSignalCollection(
  presenceSignals: VenuePresenceSummary[],
  selectedPlace: SelectedPlace | null
): FeatureCollection<Point> {
  if (presenceSignals.length === 0) return emptyPointCollection();

  return {
    type: 'FeatureCollection',
    features: presenceSignals.map((signal): Feature<Point> => {
      const selected =
        Boolean(selectedPlace?.placeId && selectedPlace.placeId === signal.venueId) ||
        Boolean(selectedPlace?.slug && selectedPlace.slug === signal.venueSlug);

      return {
        type: 'Feature',
        properties: {
          id: signal.venueId,
          slug: signal.venueSlug,
          name: signal.venueName,
          activeCount: signal.activeCount,
          publicCount: signal.publicCount,
          nearbyCount: signal.nearbyCount,
          selected,
          label: `${signal.activeCount} here`,
        },
        geometry: {
          type: 'Point',
          coordinates: [signal.longitude, signal.latitude],
        },
      };
    }),
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
        map.setPaintProperty(layer.id, 'background-color', muted ? '#020203' : '#03030a');
        return;
      }

      const layerId = layer.id.toLowerCase();

      if (layer.type === 'fill') {
        if (layerId.includes('water')) {
          map.setPaintProperty(layer.id, 'fill-color', muted ? '#050509' : '#06081d');
          map.setPaintProperty(layer.id, 'fill-opacity', muted ? 0.82 : 0.94);
          map.setPaintProperty(layer.id, 'fill-outline-color', muted ? '#0e0e15' : 'rgba(184,127,255,0.16)');
          return;
        }

        if (layerId.includes('park') || layerId.includes('landcover') || layerId.includes('wood')) {
          map.setPaintProperty(layer.id, 'fill-color', muted ? '#070707' : '#0b0b12');
          map.setPaintProperty(layer.id, 'fill-opacity', muted ? 0.44 : 0.56);
          return;
        }

        if (
          layerId.includes('landuse') ||
          layerId.includes('residential') ||
          layerId.includes('commercial') ||
          layerId.includes('industrial')
        ) {
          map.setPaintProperty(layer.id, 'fill-color', muted ? '#08080d' : '#0d0a19');
          map.setPaintProperty(layer.id, 'fill-opacity', muted ? 0.58 : 0.78);
          return;
        }

        map.setPaintProperty(layer.id, 'fill-color', muted ? '#07080d' : '#090713');
        map.setPaintProperty(layer.id, 'fill-opacity', muted ? 0.58 : 0.74);
      }

      // Liberty's own 3D buildings ship light gray — pull them into the dark
      // cyber palette so the pitched view reads night city, not daylight CAD.
      if (layer.type === 'fill-extrusion') {
        map.setPaintProperty(layer.id, 'fill-extrusion-color', muted ? '#14161f' : '#1c1f36');
        map.setPaintProperty(layer.id, 'fill-extrusion-opacity', 0.92);
        map.setPaintProperty(layer.id, 'fill-extrusion-vertical-gradient', true);
      }

      if (layer.type === 'line') {
        if (
          layerId.includes('water') ||
          layerId.includes('river') ||
          layerId.includes('stream') ||
          layerId.includes('canal')
        ) {
          map.setPaintProperty(layer.id, 'line-color', muted ? '#20202a' : '#2a1f62');
          map.setPaintProperty(layer.id, 'line-opacity', muted ? 0.34 : 0.38);
          return;
        }

        // Arterials run dim gold so the road network reads as the veins of a
        // city you light up — pins stay the brightest gold on the map.
        const roadColor = muted ? '#2b2b33' : '#3d3277';
        const arterialColor = muted ? '#3b3941' : '#c2952c';
        const isArterial =
          layerId.includes('major') || layerId.includes('primary') || layerId.includes('motorway');
        map.setPaintProperty(layer.id, 'line-color', isArterial ? arterialColor : roadColor);
        map.setPaintProperty(layer.id, 'line-opacity', muted ? 0.48 : isArterial ? 0.8 : 0.76);
      }

      if (layer.type === 'symbol') {
        if (layerId.includes('place') || layerId.includes('label') || layerId.includes('name')) {
          map.setPaintProperty(layer.id, 'text-color', muted ? '#e6e8ee' : '#f6f1ff');
          map.setPaintProperty(layer.id, 'text-halo-color', muted ? '#020203' : '#05030b');
          map.setPaintProperty(layer.id, 'text-halo-width', 1.45);
        }

        if (layerId.includes('poi')) {
          map.setPaintProperty(layer.id, 'text-opacity', muted ? 0.32 : 0.38);
          map.setPaintProperty(layer.id, 'icon-opacity', 0);
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

function ensureMapLibreDareLayers(
  map: MapLibreMap,
  preset: MapPreset,
  options: { tuneBaseStyle?: boolean } = {}
) {
  if (options.tuneBaseStyle) {
    tuneMapLibreBaseStyle(map, preset);
    // Night sky + horizon fog: gives the pitched 3D view cinematic depth
    // instead of a hard void behind the coastline.
    try {
      map.setSky({
        'sky-color': preset === 'noir' ? '#04050a' : '#070718',
        'horizon-color': preset === 'noir' ? '#0d0f18' : '#241238',
        'fog-color': preset === 'noir' ? '#05060c' : '#0b0a1c',
        'sky-horizon-blend': 0.5,
        'horizon-fog-blend': 0.5,
        'fog-ground-blend': 0.55,
      });
    } catch {
      // Style variants without sky support skip the treatment.
    }
  }

  ensureMapLibreSource(map, MAPLIBRE_CHAOS_SOURCE_ID, emptyPolygonCollection());
  ensureMapLibreSource(map, MAPLIBRE_VENUE_SOURCE_ID, emptyPointCollection());
  ensureMapLibreSource(map, MAPLIBRE_SELECTED_SOURCE_ID, emptyPointCollection());
  ensureMapLibreSource(map, MAPLIBRE_USER_SOURCE_ID, emptyPointCollection());
  ensureMapLibreSource(map, MAPLIBRE_FOOTPRINT_SOURCE_ID, emptyLineCollection());
  ensureMapLibreSource(map, MAPLIBRE_PRESENCE_SOURCE_ID, emptyPointCollection());

  const firstSymbolLayerId = getMapLibreFirstSymbolLayerId(map);
  const firstLineLayerId = getMapLibreFirstLineLayerId(map);
  const zoneFillBeforeLayerId = firstLineLayerId ?? firstSymbolLayerId;

  const vectorSourceId = MAPLIBRE_ENABLE_BUILDING_EXTRUSIONS ? getMapLibreVectorSourceId(map) : null;
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

  // Separate sea from land: tint water fills dark blue + add a faint coastline stroke.
  try {
    for (const layer of map.getStyle().layers ?? []) {
      const sourceLayer = (layer as { 'source-layer'?: string })['source-layer'];
      if (layer.type === 'fill' && (sourceLayer === 'water' || layer.id.toLowerCase().includes('water'))) {
        map.setPaintProperty(layer.id, 'fill-color', preset === 'noir' ? '#070d16' : '#081019');
      }
    }
    const coastSourceId = getMapLibreVectorSourceId(map);
    if (coastSourceId) {
      addMapLibreLayer(
        map,
        {
          id: 'basedare-coastline',
          type: 'line',
          source: coastSourceId,
          'source-layer': 'water',
          paint: {
            'line-color': 'rgba(148, 170, 200, 0.2)',
            'line-width': 1,
          },
        },
        firstSymbolLayerId
      );
    }
  } catch {
    // Style variants without a water layer skip the treatment.
  }

  addMapLibreLayer(
    map,
    {
      id: 'basedare-chaos-zones-fill',
      type: 'fill',
      source: MAPLIBRE_CHAOS_SOURCE_ID,
      paint: {
        'fill-color': ['get', 'pulseColor'],
        'fill-opacity': [
          'interpolate',
          ['linear'],
          ['get', 'chaosLevel'],
          0,
          0,
          35,
          preset === 'noir' ? 0.003 : 0.005,
          100,
          preset === 'noir' ? 0.007 : 0.011,
        ],
      },
    },
    zoneFillBeforeLayerId
  );

  addMapLibreLayer(
    map,
    {
      id: 'basedare-chaos-zones-edge',
      type: 'line',
      source: MAPLIBRE_CHAOS_SOURCE_ID,
      paint: {
        'line-color': ['get', 'pulseColor'],
        'line-width': ['interpolate', ['linear'], ['zoom'], 10, 1.1, 15, 3.2],
        'line-opacity': ['interpolate', ['linear'], ['get', 'chaosLevel'], 0, 0.52, 100, 0.9],
        'line-blur': 0.05,
        'line-dasharray': [0.8, 1.35],
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
        'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 10, 1.15, 15, 1.9],
        'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 10, 30, 13, 40, 15, 52],
        'heatmap-opacity': [
          'interpolate',
          ['linear'],
          ['zoom'],
          10,
          preset === 'noir' ? 0.44 : 0.55,
          13.5,
          preset === 'noir' ? 0.3 : 0.4,
          15.5,
          preset === 'noir' ? 0.1 : 0.14,
        ],
        'heatmap-color': [
          'interpolate',
          ['linear'],
          ['heatmap-density'],
          0,
          'rgba(0,0,0,0)',
          0.18,
          'rgba(34,211,238,0.16)',
          0.42,
          'rgba(34,211,238,0.3)',
          0.72,
          'rgba(245,197,24,0.42)',
          1,
          'rgba(245,197,24,0.55)',
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
        'circle-color': ['get', 'pulseColor'],
        'circle-opacity': [
          'interpolate',
          ['linear'],
          ['get', 'chaosLevel'],
          0,
          0.018,
          100,
          preset === 'noir' ? 0.075 : 0.12,
        ],
        'circle-blur': 0.52,
        'circle-stroke-width': [
          'case',
          ['>', ['get', 'activeDareCount'], 0],
          1.6,
          ['>', ['get', 'reviewCount'], 0],
          1.1,
          0,
        ],
        'circle-stroke-color': '#f8dd72',
        'circle-stroke-opacity': [
          'case',
          ['>', ['get', 'activeDareCount'], 0],
          0.5,
          ['>', ['get', 'reviewCount'], 0],
          0.38,
          0,
        ],
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
        'circle-opacity': preset === 'noir' ? 0.035 : 0.055,
        'circle-blur': 0.18,
        'circle-stroke-width': ['interpolate', ['linear'], ['zoom'], 10, 1.2, 16, 3],
        'circle-stroke-color': '#9ff5ff',
        'circle-stroke-opacity': 0.76,
      },
    },
    firstSymbolLayerId
  );

  addMapLibreLayer(
    map,
    {
      id: MAPLIBRE_PRESENCE_HALO_LAYER_ID,
      type: 'circle',
      source: MAPLIBRE_PRESENCE_SOURCE_ID,
      paint: {
        'circle-pitch-alignment': 'map',
        'circle-radius': [
          'interpolate',
          ['linear'],
          ['zoom'],
          10,
          ['+', 24, ['*', ['get', 'activeCount'], 6]],
          15,
          ['+', 54, ['*', ['get', 'activeCount'], 14]],
        ],
        'circle-color': [
          'case',
          ['==', ['get', 'selected'], true],
          '#f8dd72',
          '#34d399',
        ],
        'circle-opacity': preset === 'noir' ? 0.12 : 0.16,
        'circle-blur': 0.62,
        'circle-stroke-width': ['case', ['>=', ['get', 'activeCount'], 2], 1.4, 0.8],
        'circle-stroke-color': '#a7f3d0',
        'circle-stroke-opacity': 0.52,
      },
    },
    firstSymbolLayerId
  );

  addMapLibreLayer(
    map,
    {
      id: MAPLIBRE_PRESENCE_CORE_LAYER_ID,
      type: 'circle',
      source: MAPLIBRE_PRESENCE_SOURCE_ID,
      paint: {
        'circle-pitch-alignment': 'map',
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 4.5, 15, 9.5],
        'circle-color': '#34d399',
        'circle-opacity': 0.94,
        'circle-stroke-width': 1.5,
        'circle-stroke-color': 'rgba(236,253,245,0.86)',
        'circle-stroke-opacity': 0.76,
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
        'circle-color': ['get', 'pulseColor'],
        'circle-opacity': [
          'case',
          ['>', ['get', 'approvedCount'], 0],
          0.9,
          ['>', ['get', 'reviewCount'], 0],
          0.78,
          0.34,
        ],
        'circle-stroke-width': 1,
        'circle-stroke-color': 'rgba(255,255,255,0.72)',
        'circle-stroke-opacity': 0.42,
      },
    },
    firstSymbolLayerId
  );

  addMapLibreLayer(map, {
    id: MAPLIBRE_PRESENCE_LABEL_LAYER_ID,
    type: 'symbol',
    source: MAPLIBRE_PRESENCE_SOURCE_ID,
    minzoom: 12.5,
    layout: {
      'text-font': ['Noto Sans Regular'],
      'text-field': ['upcase', ['get', 'label']],
      'text-size': ['interpolate', ['linear'], ['zoom'], 12, 8.5, 16, 11],
      'text-letter-spacing': 0.08,
      'text-offset': [0, -2.3],
      'text-anchor': 'bottom',
      'text-allow-overlap': false,
      'text-ignore-placement': false,
      'text-optional': true,
    },
    paint: {
      'text-color': '#bbf7d0',
      'text-opacity': ['interpolate', ['linear'], ['zoom'], 12, 0, 13.2, 0.9, 16, 1],
      'text-halo-color': 'rgba(2,5,10,0.94)',
      'text-halo-width': 1.4,
      'text-halo-blur': 0.6,
    },
  });

  addMapLibreLayer(map, {
    id: MAPLIBRE_SIGNAL_LABEL_LAYER_ID,
    type: 'symbol',
    source: MAPLIBRE_VENUE_SOURCE_ID,
    minzoom: 12.25,
    filter: [
      'any',
      ['>', ['get', 'activeDareCount'], 0],
      ['>', ['get', 'approvedCount'], 0],
      ['>', ['get', 'reviewCount'], 0],
      ['==', ['get', 'reviewSignalState'], 'needs-review'],
      ['==', ['get', 'matched'], true],
      ['==', ['get', 'selected'], true],
    ],
    layout: {
      'text-font': ['Noto Sans Regular'],
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
      'text-color': ['get', 'pulseColor'],
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
        'circle-opacity': 0.035,
        'circle-blur': 0.38,
        'circle-stroke-width': 2.4,
        'circle-stroke-color': '#f8dd72',
        'circle-stroke-opacity': 0.72,
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

function hasMapLibreDareLayerBundle(map: MapLibreMap) {
  return Boolean(
    map.getSource(MAPLIBRE_CHAOS_SOURCE_ID) &&
      map.getSource(MAPLIBRE_VENUE_SOURCE_ID) &&
      map.getSource(MAPLIBRE_SELECTED_SOURCE_ID) &&
      map.getSource(MAPLIBRE_USER_SOURCE_ID) &&
      map.getSource(MAPLIBRE_FOOTPRINT_SOURCE_ID) &&
      map.getSource(MAPLIBRE_PRESENCE_SOURCE_ID) &&
      MAPLIBRE_INTERACTIVE_SIGNAL_LAYER_IDS.every((layerId) => map.getLayer(layerId))
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

function isCommunityActivation(dare: Pick<SelectedPlaceActiveDare, 'bounty' | 'missionTag' | 'isCommunitySpark'>) {
  return Boolean(dare.isCommunitySpark || (dare.bounty <= 0 && dare.missionTag === 'community'));
}

function getActivationRewardLabel(dare: Pick<SelectedPlaceActiveDare, 'bounty' | 'missionTag' | 'isCommunitySpark'>) {
  return isCommunityActivation(dare) ? 'Community dare' : `${formatMapUsd(dare.bounty)} USDC`;
}

function getLastSparkLabel(lastTaggedAt: string | null) {
  if (!lastTaggedAt) return 'No proof yet';

  const diffMs = Date.now() - new Date(lastTaggedAt).getTime();
  const diffMinutes = Math.max(1, Math.round(diffMs / (1000 * 60)));

  if (diffMinutes < 60) return `Last proof ${diffMinutes}m ago`;

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `Last proof ${diffHours}h ago`;

  const diffDays = Math.round(diffHours / 24);
  return `Last proof ${diffDays}d ago`;
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

function getCompactTimeAgo(value: string | null) {
  if (!value) return 'now';

  const diffMs = Date.now() - new Date(value).getTime();
  if (diffMs <= 0) return 'now';

  const diffMinutes = Math.max(1, Math.round(diffMs / (1000 * 60)));
  if (diffMinutes < 60) return `${diffMinutes}m`;

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h`;

  return `${Math.round(diffHours / 24)}d`;
}

function getRoomInitial(label: string) {
  const trimmed = label.trim().replace(/^@/, '');
  return (trimmed[0] || '?').toUpperCase();
}

function getRoomReceiptTitle(receiptType: string | null) {
  switch (receiptType) {
    case 'check-in':
      return 'Venue check-in receipt';
    case 'presence':
      return 'Presence receipt';
    case 'mark-submitted':
      return 'Mark receipt';
    case 'proof-submitted':
      return 'Proof receipt';
    case 'proof-verified':
      return 'Verified proof receipt';
    case 'payout-queued':
      return 'Payout receipt';
    default:
      return 'BaseDare receipt';
  }
}

function getSpotVaultKindLabel(kind: SpotVaultTimelineKind) {
  switch (kind) {
    case 'FIRST_PROOF':
      return 'First Proof';
    case 'PROOF':
      return 'Proof';
    case 'DARE':
      return 'Dare';
    case 'MEMORY':
      return 'Memory';
    default:
      return 'Signal';
  }
}

function getSpotVaultToneClass(tone: SpotVaultTimelineTone) {
  switch (tone) {
    case 'gold':
      return 'border-[#f5c518]/22 bg-[#f5c518]/[0.08] text-[#f8dd72]';
    case 'cyan':
      return 'border-cyan-300/18 bg-cyan-500/[0.08] text-cyan-100';
    case 'emerald':
      return 'border-emerald-300/18 bg-emerald-500/[0.08] text-emerald-100';
    case 'violet':
      return 'border-violet-300/18 bg-violet-500/[0.08] text-violet-100';
    default:
      return 'border-white/10 bg-white/[0.04] text-white/60';
  }
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
      label: 'Hot',
      description: `This venue is moving now: ${approvedCount} approved proofs, heat ${heatScore}, and recent activity.`,
    };
  }

  if (pulse === 'igniting') {
    return {
      label: 'Active',
      description: `Proofs are stacking here${activeDareCount > 0 ? ', and a live dare is active' : ''}.`,
    };
  }

  if (pulse === 'simmering') {
    return {
      label: 'Started',
      description: 'This venue has approved proof, but still needs more activity.',
    };
  }

  return {
    label: 'No proof yet',
    description: 'No approved proof yet. Take the first photo or fund the first dare.',
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
      description: 'A first proof is in review. One approval makes this venue verified.',
      level: 1,
      className: 'border-amber-300/28 bg-amber-500/[0.10] text-amber-100',
      activeBarClass: 'from-amber-300 to-[#f5c518] shadow-[0_0_16px_rgba(251,191,36,0.18)]',
    };
  }

  if (approvedCount <= 0) {
    return {
      label: 'Dormant',
      description: 'This place is on the map, but nobody has verified proof here yet.',
      level: 1,
      className: 'border-white/12 bg-white/[0.04] text-white/62',
      activeBarClass: 'from-white/70 to-white/35',
    };
  }

  if (approvedCount === 1) {
    return {
      label: 'Awakening',
      description: 'One proof is verified. A few more will make the venue feel active.',
      level: 2,
      className: 'border-[#f5c518]/30 bg-[#f5c518]/[0.10] text-[#f8dd72]',
      activeBarClass: 'from-[#f5c518] to-[#f8dd72] shadow-[0_0_16px_rgba(245,197,24,0.18)]',
    };
  }

  if (approvedCount >= 8 || heatScore >= 60 || pulse === 'blazing') {
    return {
      label: 'Legendary',
      description: 'This place has enough verified activity to stand out.',
      level: 5,
      className: 'border-rose-300/30 bg-rose-500/[0.10] text-rose-100',
      activeBarClass: 'from-rose-300 via-[#f5c518] to-cyan-200 shadow-[0_0_18px_rgba(251,113,133,0.24)]',
    };
  }

  if (approvedCount >= 4 || heatScore >= 24 || pulse === 'igniting') {
    return {
      label: 'Established',
      description: 'The venue has recurring proof and visible activity.',
      level: 4,
      className: 'border-cyan-300/30 bg-cyan-500/[0.10] text-cyan-100',
      activeBarClass: 'from-cyan-300 to-sky-200 shadow-[0_0_16px_rgba(34,211,238,0.22)]',
    };
  }

  return {
    label: 'Proof started',
    description: 'The place is warming up. More verified proof will make it obvious.',
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

function getVenueClusterScore(place: NearbyPlace) {
  return (
    place.activeDareCount * 90 +
    (isVenueActivated(place.commandCenter) ? 70 : 0) +
    (place.commandCenter?.sponsorReady ? 34 : 0) +
    place.tagSummary.approvedCount * 18 +
    place.tagSummary.heatScore
  );
}

function getVenueClusterFitPlaces(places: NearbyPlace[], isMobileViewport: boolean) {
  const validPlaces = places
    .filter((place) => Number.isFinite(place.latitude) && Number.isFinite(place.longitude))
    .sort((a, b) => getVenueClusterScore(b) - getVenueClusterScore(a));

  const activePlaces = validPlaces.filter((place) => getVenueClusterScore(place) > 0);
  const clusterLimit = isMobileViewport ? 10 : 12;
  return (activePlaces.length >= 2 ? activePlaces : validPlaces).slice(0, clusterLimit);
}

function fitMapToVenueCluster(
  map: MapLibreMap,
  places: NearbyPlace[],
  isMobileViewport: boolean,
  options: { duration?: number } = {}
) {
  const fitPlaces = getVenueClusterFitPlaces(places, isMobileViewport);
  if (fitPlaces.length === 0) return false;

  const defaultCamera = getDefaultMapCamera(isMobileViewport);
  const duration = options.duration ?? 900;

  if (fitPlaces.length === 1) {
    const [place] = fitPlaces;
    map.flyTo({
      center: [place.longitude, place.latitude],
      zoom: Math.max(map.getZoom(), isMobileViewport ? 13.8 : 14.4),
      bearing: defaultCamera.bearing,
      pitch: defaultCamera.pitch,
      duration,
      essential: true,
    });
    return true;
  }

  const bounds = new maplibregl.LngLatBounds();
  fitPlaces.forEach((place) => bounds.extend([place.longitude, place.latitude]));
  map.fitBounds(bounds, {
    padding: isMobileViewport
      ? { top: 44, right: 34, bottom: 132, left: 34 }
      : { top: 72, right: 500, bottom: 190, left: 96 },
    maxZoom: isMobileViewport ? 14.85 : 15.15,
    bearing: defaultCamera.bearing,
    pitch: defaultCamera.pitch,
    duration,
    essential: true,
  });

  return true;
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
      label: 'Fund another dare',
      detail: 'Put more money on this venue',
    };
  }

  return {
    label: 'Activate venue',
    detail: 'Put money on this venue',
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
      prompt: 'Coffee, surf, and first stops.',
    };
  }

  if (hour >= 11 && hour < 17) {
    return {
      key: 'day',
      label: 'Today',
      dateLabel,
      prompt: 'Food, beaches, and easy stops.',
    };
  }

  if (hour >= 17 && hour < 21) {
    return {
      key: 'sunset',
      label: 'Sunset',
      dateLabel,
      prompt: 'Sunset spots and places waking up.',
    };
  }

  return {
    key: 'late',
    label: 'Tonight',
    dateLabel,
    prompt: 'Bars, music, and late food.',
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
      eyebrow: 'Live dare',
      title: `${place.activeDareCount} active dare${place.activeDareCount === 1 ? '' : 's'} at ${place.name}`,
      detail: 'There is a funded task here now.',
      actionLabel: 'View',
      tone: 'cyan' as HappeningTone,
    };
  }

  if (approvedCount <= 0) {
    return {
      kind: 'first-spark' as const,
      eyebrow: 'Needs first proof',
      title: `Take first proof at ${place.name}`,
      detail: 'No approved proof yet. A quick photo or video starts the trail.',
      actionLabel: 'Proof',
      tone: 'purple' as HappeningTone,
    };
  }

  if (window.key === 'morning' && /(surf|beach|coffee|cafe|boardwalk)/.test(categoryText)) {
    return {
      kind: 'tourist-route' as const,
      eyebrow: 'Morning pick',
      title: `Start at ${place.name}`,
      detail: 'Good for a quick surf check, coffee stop, or first-light clip.',
      actionLabel: 'Open',
      tone: 'cyan' as HappeningTone,
    };
  }

  if (window.key === 'sunset' && /(beach|surf|dock|boardwalk|bar|view)/.test(categoryText)) {
    return {
      kind: 'tourist-route' as const,
      eyebrow: 'Sunset pick',
      title: `Check ${place.name}`,
      detail: 'Good timing for golden-hour proof and easy discovery.',
      actionLabel: 'Open',
      tone: 'gold' as HappeningTone,
    };
  }

  if (window.key === 'late' && /(nightlife|bar|music|club|sports|food)/.test(categoryText)) {
    return {
      kind: 'tourist-route' as const,
      eyebrow: 'Tonight',
      title: `Check ${place.name} tonight`,
      detail: 'Good fit for late food, music, clips, or quick proof.',
      actionLabel: 'Open',
      tone: 'rose' as HappeningTone,
    };
  }

  return {
    kind: 'venue-memory' as const,
    eyebrow: approvedCount > 1 ? 'Proof trail' : 'First proof',
    title: `Check ${place.name}`,
    detail:
      approvedCount > 1
        ? `${approvedCount} approved proofs already exist.`
        : 'One proof exists. Another one makes the place feel active.',
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
    detail: 'A simple first stop for wave checks, lessons, or boardwalk energy.',
    actionLabel: 'Open',
    tone: 'cyan',
  },
  {
    id: 'catangnan-coffee-food',
    windows: ['morning', 'day'],
    placePatterns: [/cat\s*&?\s*gun/i, /catangnan/i, /coffee/i, /cafe/i, /food/i],
    eyebrow: 'Food route',
    title: (placeName) => `Coffee or food near ${placeName}`,
    detail: 'A quick "what do we do now?" stop before beach, surf, or nightlife.',
    actionLabel: 'Open',
    tone: 'gold',
  },
  {
    id: 'general-luna-sunset',
    windows: ['sunset'],
    placePatterns: [/cloud\s*9/i, /boardwalk/i, /dock/i, /hideaway/i, /beach/i, /bar/i],
    eyebrow: 'Sunset happening',
    title: (placeName) => `Sunset session near ${placeName}`,
    detail: 'A visible sunset plan instead of guessing where to go.',
    actionLabel: 'Open',
    tone: 'gold',
  },
  {
    id: 'general-luna-nightlife',
    windows: ['late'],
    placePatterns: [/nightlife/i, /music/i, /bar/i, /sports/i, /beach-club/i, /hideaway/i, /cat\s*&?\s*gun/i],
    eyebrow: 'Tonight',
    title: (placeName) => `Night signal around ${placeName}`,
    detail: 'Bars, games, music, and late food nearby.',
    actionLabel: 'Open',
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
        rewardLabel: 'Plan',
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
      eyebrow: 'Local tips',
      title: 'Ask locals what is happening',
      detail: 'Live tips, venue notes, and BaseDare plans.',
      timingLabel: input.window.label,
      distanceLabel: 'Siargao',
      rewardLabel: 'Board',
      actionLabel: 'Open board',
      href: SIGNAL_ROOM_URL,
      place: null,
      tone: 'purple',
    });
  }

  return localEvents;
}

function formatSignalTimingLabel(signal: LocalSignal, fallback: string) {
  if (!signal.startsAt) return fallback;
  const date = new Date(signal.startsAt);
  if (Number.isNaN(date.getTime())) return fallback;

  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function getLocalSignalTone(category: string): HappeningTone {
  if (/(surf|wellness|tour)/i.test(category)) return 'cyan';
  if (/(food|market)/i.test(category)) return 'gold';
  if (/(music|nightlife)/i.test(category)) return 'rose';
  return 'purple';
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
    case 'green':
      return {
        dot: 'bg-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.45)]',
        chip: 'border-emerald-300/18 bg-emerald-500/[0.08] text-emerald-100',
        action: 'border-emerald-300/22 bg-emerald-500/[0.08] text-emerald-100 hover:border-emerald-300/38 hover:bg-emerald-500/[0.14]',
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

function getSignalLayerKind(happening: MapHappening): SignalLayerKind {
  if (happening.kind === 'live-dare') return 'drop';
  if (happening.kind === 'first-spark') return 'first';
  if (happening.kind === 'tourist-route') return 'route';
  if (happening.kind === 'venue-memory') return 'relic';
  return 'intel';
}

function getSignalLayerKindMeta(kind: SignalLayerKind) {
  switch (kind) {
    case 'drop':
      return {
        label: 'Dare',
        pluralLabel: 'Dares',
        chipClass: 'border-[#f5c518]/24 bg-[#f5c518]/[0.1] text-[#f8dd72]',
        activeClass: 'border-[#f5c518]/28 bg-[#f5c518]/[0.12] text-[#f8dd72]',
      };
    case 'first':
      return {
        label: 'Proof',
        pluralLabel: 'Proof spots',
        chipClass: 'border-[#b87fff]/24 bg-[#b87fff]/[0.1] text-[#edd8ff]',
        activeClass: 'border-[#b87fff]/28 bg-[#b87fff]/[0.12] text-[#edd8ff]',
      };
    case 'route':
      return {
        label: 'Route',
        pluralLabel: 'Routes',
        chipClass: 'border-cyan-300/22 bg-cyan-500/[0.08] text-cyan-100',
        activeClass: 'border-cyan-300/26 bg-cyan-500/[0.1] text-cyan-100',
      };
    case 'relic':
      return {
        label: 'Proofed',
        pluralLabel: 'Proofed',
        chipClass: 'border-rose-300/20 bg-rose-500/[0.08] text-rose-100',
        activeClass: 'border-rose-300/24 bg-rose-500/[0.1] text-rose-100',
      };
    case 'intel':
    default:
      return {
        label: 'Tip',
        pluralLabel: 'Tips',
        chipClass: 'border-white/12 bg-white/[0.045] text-white/58',
        activeClass: 'border-white/14 bg-white/[0.06] text-white/70',
      };
  }
}

function truncateSignalMissionTitle(value: string) {
  const compact = value.replace(/\s+/g, ' ').trim();
  if (compact.length <= 96) return compact;
  return `${compact.slice(0, 93).trimEnd()}...`;
}

function getSignalFundConfig(happening: MapHappening) {
  const place = happening.place;
  if (!place) return null;

  const kind = getSignalLayerKind(happening);
  const fundCopy: Record<
    SignalLayerKind,
    {
      label: string;
      title: string;
      payout: number;
    }
  > = {
    drop: {
      label: 'Fund',
      title: `Fund another challenge at ${place.name}`,
      payout: 80,
    },
    first: {
      label: 'Fund',
      title: `Fund first proof at ${place.name}`,
      payout: 60,
    },
    route: {
      label: 'Fund',
      title: `Fund a route proof at ${place.name}`,
      payout: 60,
    },
    relic: {
      label: 'Fund',
      title: `Fund the next proof at ${place.name}`,
      payout: 60,
    },
    intel: {
      label: 'Fund',
      title: `Fund this local tip at ${place.name}`,
      payout: 60,
    },
  };
  const copy = fundCopy[kind];

  return {
    label: copy.label,
    href: buildVenueChallengeCreateHref({
      venueId: place.id,
      venueSlug: place.slug,
      venueName: place.name,
      title: truncateSignalMissionTitle(copy.title),
      payout: copy.payout,
      source: 'map',
    }),
  };
}

function escapeMarkerAttribute(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

type AdventureSpriteKind = 'flag' | 'surf' | 'cafe' | 'gathering' | 'rumor';

function getAdventurePlaceSprite({
  challengeLiveCount,
  categories,
}: {
  challengeLiveCount: number;
  categories?: string[] | null;
}): AdventureSpriteKind {
  if (challengeLiveCount > 0) return 'flag';

  const categoryText = (categories ?? []).join(' ').toLowerCase();
  if (/surf|wave|beach|island|coast|water|lagoon|river|rock-pool|dock|boat/.test(categoryText)) {
    return 'surf';
  }
  if (/coffee|cafe|bakery|restaurant|food|eat|kitchen|market/.test(categoryText)) {
    return 'cafe';
  }
  if (/bar|night|music|club|community|gather|hostel|hotel|stay|resort|wellness|yoga|spa/.test(categoryText)) {
    return 'gathering';
  }
  return 'rumor';
}

function getAdventureActivitySprite(activity: TonightActivity): AdventureSpriteKind {
  if (activity.type === 'dare') return 'flag';
  return 'gathering';
}

function createAdventureActivityMarkerHtml(activity: TonightActivity) {
  const rewardLabel = activity.reward?.amountUsdc
    ? `${activity.reward.amountUsdc}`
    : activity.goingCount
      ? `${activity.goingCount}`
      : activity.type === 'meetup'
        ? 'FREE'
        : 'OPEN';

  return `
    <div class="adventure-focal-marker adventure-focal-marker--${activity.type}">
      <span class="adventure-focal-beacon" aria-hidden="true">
        <span class="adventure-sprite adventure-sprite--${getAdventureActivitySprite(activity)}"></span>
      </span>
      <span class="adventure-focal-badge">${escapeMarkerAttribute(rewardLabel)}</span>
      <span class="adventure-focal-shadow" aria-hidden="true"></span>
    </div>
  `;
}

function createAdventureRumorMarkerHtml(signal: LocalSignal) {
  const safeTitle = escapeMarkerAttribute(signal.title || 'Local rumor');
  return `
    <div class="adventure-rumor-marker" title="${safeTitle}">
      <span class="adventure-rumor-fog" aria-hidden="true"></span>
      <span class="adventure-sprite adventure-sprite--rumor" aria-hidden="true"></span>
      <span class="adventure-rumor-label">RUMOR</span>
    </div>
  `;
}

function getMarkerVenueLabel(value?: string | null) {
  const normalized = value?.replace(/\s+/g, ' ').trim();
  if (!normalized) return null;
  return normalized.length > 30 ? `${normalized.slice(0, 27).trim()}...` : normalized;
}

// General Luna's weekly venue-night rotation (founder field intel:
// brain-vault/03-insights/city-signals/siargao-venue-night-map.md). Each venue
// owns a night; the map surfaces the island's real rhythm — never synthetic
// activity. Keyed by Date.getDay() (0 = Sunday).
const VENUE_NIGHT_ROTATION: Record<number, RegExp> = {
  0: /happiness/i,
  1: /mama[\s-]?coco/i,
  2: /barbosa|barrel/i,
  3: /mama[\s-]?coco|barbosa/i,
  4: /bed[\s-]?(?:and|&|n)[\s-]?brew/i,
  5: /barbosa/i,
  6: /harana/i,
};

function isVenueNightTonight(name?: string | null, slug?: string | null) {
  if (typeof window === 'undefined') return false;
  const pattern = VENUE_NIGHT_ROTATION[new Date().getDay()];
  if (!pattern) return false;
  return pattern.test(name ?? '') || pattern.test(slug ?? '');
}

function createPeebearMarkerHtml({
  pulse,
  approvedCount,
  heatScore,
  active,
  visualState,
  challengeLiveCount,
  venueName,
  matched = false,
  compact = false,
  activated = false,
  activationLabel,
  legends,
  categories,
  liveTonight = false,
  mayorTag = null,
}: {
  pulse: PulseState;
  approvedCount: number;
  heatScore: number;
  active: boolean;
  visualState: PlaceVisualState;
  challengeLiveCount: number;
  venueName?: string | null;
  matched?: boolean;
  compact?: boolean;
  activated?: boolean;
  activationLabel?: string;
  legends?: VenueLegend[];
  categories?: string[] | null;
  liveTonight?: boolean;
  mayorTag?: string | null;
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
          ? 'VERIFIED'
          : visualState === 'active'
            ? 'VERIFIED'
            : 'NO PROOF';
  const activationBadgeLabel = activationLabel ?? 'ACTIVATED';
  const safeActivationBadgeLabel = escapeMarkerAttribute(activationBadgeLabel);
  const liveLabel =
    challengeLiveCount > 1 ? `LIVE ${challengeLiveCount > 9 ? '9+' : challengeLiveCount}` : 'LIVE';
  const showActivatedMarkerChrome = activated && (!compact || active);
  // Activated venues keep their legend emojis too — the gold sign says "official",
  // the chips say "what kind of place" at a glance. CSS already positions them.
  const visibleLegends = (legends ?? []).slice(0, compact ? 2 : 3);
  const legendKey = visibleLegends.map((legend) => legend.key).join(',');
  const categoryKey = (categories ?? []).slice(0, 4).join(',');
  const adventureSprite = getAdventurePlaceSprite({ challengeLiveCount, categories });
  const adventureModifier = hasChallengeLive
    ? liveLabel
    : visualState === 'unmarked'
      ? '?'
      : approvedCount > 0
        ? '✓'
        : '';
  const venueLabel = getMarkerVenueLabel(venueName);
  const safeVenueLabel = venueLabel ? escapeMarkerAttribute(venueLabel) : null;
  const safeVenueTitle = venueName ? escapeMarkerAttribute(venueName) : null;
  const safeMayorTag = mayorTag ? escapeMarkerAttribute(mayorTag.replace(/^@/, '').slice(0, 12).toUpperCase()) : null;
  const cacheKey = `${pulse}:${visualState}:${active ? 'active' : 'idle'}:${matched ? 'matched' : 'neutral'}:${compact ? 'compact' : 'full'}:${showActivatedMarkerChrome ? `activated-${safeActivationBadgeLabel}` : activated ? 'activated-compact' : 'standard-venue'}:${hasChallengeLive ? `challenge-${Math.min(challengeLiveCount, 9)}` : 'standard'}:${badge}:${Math.min(heatScore, 999)}:${legendKey}:${categoryKey}:${safeVenueLabel ?? 'no-label'}:${safeMayorTag ?? 'no-mayor'}:${liveTonight ? 'tonight' : 'off-night'}`;

  const cachedHtml = markerIconCache.get(cacheKey);
  if (cachedHtml) {
    return cachedHtml;
  }

  const html = `
    <div class="peebear-marker peebear-marker--${pulse} peebear-marker--${visualState} ${active ? 'is-active' : ''} ${showChallengeLiveChrome ? 'has-challenge-live' : ''} ${matched ? 'is-matched' : ''} ${compact ? 'is-compact' : ''} ${activated ? 'is-activated-venue' : ''} ${liveTonight ? 'is-live-tonight' : ''} ${safeVenueLabel ? 'has-venue-label' : ''}">
      ${
        safeVenueLabel
          ? `<span class="peebear-venue-label ${activated ? 'peebear-venue-label--activated' : ''}" title="${safeVenueTitle ?? safeVenueLabel}"><span class="peebear-venue-label-name">${safeVenueLabel}</span></span>`
          : ''
      }
      ${liveTonight ? `<span class="peebear-tonight-ring" aria-hidden="true"></span>${compact ? '' : '<span class="peebear-tonight-pill">TONIGHT</span>'}` : ''}
      ${showRipple ? `<span class="peebear-ripple peebear-ripple--${visualState === 'pending' ? 'pending' : pulse}"></span>` : ''}
      ${showChallengeLiveChrome ? `<span class="peebear-challenge-aura" aria-hidden="true"></span><span class="peebear-challenge-ring" aria-hidden="true"></span><span class="peebear-challenge-pill">${liveLabel}</span>` : ''}
      ${showMatchBadge ? `<span class="peebear-match-badge">MATCH</span>` : ''}
      ${showCount ? `<span class="peebear-count peebear-count--${visualState === 'first-mark' ? 'first-mark' : pulse}">${badge}</span>` : ''}
      <span class="adventure-place-object adventure-place-object--${visualState} ${hasChallengeLive ? 'has-live-dare' : ''}" aria-hidden="true">
        <span class="adventure-sprite adventure-sprite--${adventureSprite}"></span>
        ${adventureModifier ? `<span class="adventure-place-modifier">${adventureModifier}</span>` : ''}
      </span>
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
      <div class="peebear-core map-pin-marker map-pin-marker--${visualState} peebear-core--${pulse} peebear-core--${visualState}">
        <img src="/assets/peebear-head.webp" alt="PeeBear pin" class="peebear-head" />
      </div>
      <div class="peebear-meta">
        ${safeMayorTag && !compact ? `<span class="peebear-mayor">👑 ${safeMayorTag}</span>` : ''}
        ${showPulseChip ? `<span class="peebear-pulse-pill peebear-pulse-pill--${pulse}">HEAT ${Math.min(heatScore, 99)}</span>` : ''}
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
      <span class="adventure-guide-head" aria-hidden="true">
        <img src="/assets/peebear-head.webp" alt="" />
        <span class="adventure-guide-spark"></span>
      </span>
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
      <span class="peebear-footprint-label">${firstMark ? 'FIRST PROOF' : 'YOUR PROOF'}</span>
    </div>
  `;

  footprintMarkerIconCache.set(cacheKey, html);
  return html;
}

function createPrivateSpotMarkerHtml({
  label,
  hasPhoto,
  active,
}: {
  label: string;
  hasPhoto: boolean;
  active: boolean;
}) {
  const safeLabel = escapeMarkerAttribute(label || 'Spot');
  return `
    <div class="private-spot-marker ${active ? 'is-active' : ''}" style="position:relative;display:flex;flex-direction:column;align-items:center;gap:4px;filter:drop-shadow(0 14px 24px rgba(0,0,0,.42));">
      <span style="max-width:92px;border:1px solid rgba(255,255,255,.16);border-radius:999px;background:linear-gradient(180deg,rgba(8,9,18,.94),rgba(3,4,9,.96));padding:4px 8px;font-size:9px;font-weight:900;letter-spacing:.14em;color:rgba(255,255,255,.84);text-transform:uppercase;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${safeLabel}</span>
      <span style="position:relative;display:grid;width:${active ? 46 : 40}px;height:${active ? 46 : 40}px;place-items:center;border-radius:16px;border:1px solid rgba(255,216,94,.46);background:linear-gradient(180deg,rgba(255,216,94,.24),rgba(9,8,16,.94));box-shadow:inset 0 1px 0 rgba(255,255,255,.18),0 0 ${active ? 28 : 18}px rgba(255,200,0,.26);">
        <span style="font-size:10px;font-weight:900;letter-spacing:.08em;line-height:1;color:rgba(255,255,255,.88);">${hasPhoto ? 'PHOTO' : 'PIN'}</span>
      </span>
      <span style="width:15px;height:7px;border-radius:999px;background:rgba(255,216,94,.34);filter:blur(2px);"></span>
    </div>
  `;
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
        <span class="place-cluster-label">PLACES</span>
      </span>
      <span class="place-cluster-shadow"></span>
    </div>
  `;

  placeClusterIconCache.set(cacheKey, html);
  return html;
}

function renderProofPreview(tag: PlaceTagItem, options?: { compact?: boolean }) {
  const compact = options?.compact ?? false;
  const sizeClass = compact ? 'h-16 w-16 rounded-[11px]' : 'h-20 w-20 rounded-[12px] md:h-22 md:w-22';

  if (tag.source === 'SEEDED_MEMORY') {
    return (
      <div className={`relative shrink-0 overflow-hidden border border-white/10 bg-[linear-gradient(180deg,rgba(245,197,24,0.14)_0%,rgba(184,127,255,0.12)_45%,rgba(7,9,18,0.96)_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] ${sizeClass}`}>
        <Image
          src="/assets/peebear-head.webp"
          alt="PeeBear proof marker"
          fill
          sizes="96px"
          className="object-contain p-1.5"
          unoptimized
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.16),transparent_30%),linear-gradient(180deg,transparent_0%,rgba(0,0,0,0.08)_48%,rgba(0,0,0,0.28)_100%)]" />
      </div>
    );
  }

  if (!tag.proofMediaUrl || !/^(https?:\/\/|\/)/.test(tag.proofMediaUrl)) {
    return (
      <div className={`relative shrink-0 overflow-hidden border border-[#f5c518]/22 bg-[linear-gradient(180deg,rgba(245,197,24,0.16)_0%,rgba(14,12,20,0.96)_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] ${sizeClass}`}>
        <Image
          src="/assets/peebear-head.webp"
          alt="BaseDare verified proof stamp"
          fill
          sizes="96px"
          className="object-contain p-1.5"
          unoptimized
        />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_18%,rgba(255,255,255,0.14),transparent_32%)]" />
      </div>
    );
  }

  if (tag.proofType === 'VIDEO') {
    return (
      <div className={`relative shrink-0 overflow-hidden border border-[#f5c518]/25 bg-black/30 ${sizeClass}`}>
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
      <div className={`relative shrink-0 overflow-hidden border border-[#f5c518]/25 bg-black/30 ${sizeClass}`}>
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
  const { signMessageAsync } = useSignMessage();
  const router = useRouter();
  const searchParams = useSearchParams();
  const mapViewportRef = useRef<HTMLDivElement | null>(null);
  const mapCanvasRef = useRef<HTMLDivElement | null>(null);
  const searchShellRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<MapLibreMap | null>(null);
  const mapMarkersRef = useRef<Map<string, ManagedMapMarker>>(new Map());
  // Free meetup layer (Stage 3) — its OWN marker set, independent of the paid
  // marker set above. Additive; never reads or mutates mapMarkersRef.
  const meetupMarkersRef = useRef<Map<string, MapLibreMarker>>(new Map());
  const mapInteractionQuietTimerRef = useRef<number | null>(null);
  const desktopMapSettlingTimerRef = useRef<number | null>(null);
  const desktopMapSettlingRef = useRef(false);
  const desktopNearbyFetchTimerRef = useRef<number | null>(null);
  const desktopSideDataFetchTimerRef = useRef<number | null>(null);
  const deferredMarkerCleanupTimerRef = useRef<number | null>(null);
  const lastDesktopNearbyFetchRef = useRef<{
    latitude: number;
    longitude: number;
    radiusMeters: number;
    fetchedAt: number;
  } | null>(null);
  const lastDesktopSideDataFetchRef = useRef<{
    latitude: number;
    longitude: number;
    zoomBucket: number;
    fetchedAt: number;
  } | null>(null);
  const lastTargetCameraKeyRef = useRef<string | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [mapRuntimeError, setMapRuntimeError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchPopoverOpen, setSearchPopoverOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [nearbyPlaces, setNearbyPlaces] = useState<NearbyPlace[]>([]);
  const [nearbyDares, setNearbyDares] = useState<NearbyDare[]>([]);
  const [meetups, setMeetups] = useState<MeetupPin[]>([]);
  const [mapLayerFilter, setMapLayerFilter] = useState<MapLayerFilter>('all');
  const [selectedMeetup, setSelectedMeetup] = useState<MeetupPin | null>(null);
  // Guard: a stale "Free Meetups" selection must never keep paid pins hidden
  // once the meetup layer is empty (the filter UI unmounts at 0). Derive the
  // effective filter so the paid layer always returns when there are no meetups.
  const effectiveLayerFilter: MapLayerFilter = meetups.length > 0 ? mapLayerFilter : 'all';
  const [localSignals, setLocalSignals] = useState<LocalSignal[]>([]);
  const [venuePresenceSignals, setVenuePresenceSignals] = useState<VenuePresenceSummary[]>([]);
  const [nearbyDaresLoading, setNearbyDaresLoading] = useState(false);
  const [localSignalsLoading, setLocalSignalsLoading] = useState(false);
  const [venuePresenceLoading, setVenuePresenceLoading] = useState(false);
  const [viewportCenter, setViewportCenter] = useState<{ latitude: number; longitude: number } | null>(null);
  const [selectedPlace, setSelectedPlace] = useState<SelectedPlace | null>(null);
  const [proofAutoOpenKey, setProofAutoOpenKey] = useState<string | null>(null);
  const [selectedPlacePanelExpanded, setSelectedPlacePanelExpanded] = useState(false);
  const [mapSheetDrag, setMapSheetDrag] = useState<MapSheetDragState | null>(null);
  const mapSheetDragRef = useRef<MapSheetDragSession | null>(null);
  const mapSheetSuppressClickRef = useRef(false);
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
  const [proofReelOpen, setProofReelOpen] = useState(false);
  const [meetupComposerOpen, setMeetupComposerOpen] = useState(false);
  const [meetupsRefreshNonce, setMeetupsRefreshNonce] = useState(0);
  // Close venue-scoped overlays whenever the selected venue changes (or the
  // panel closes), so they never auto-open on the next venue with stale state.
  useEffect(() => {
    setProofReelOpen(false);
    setMeetupComposerOpen(false);
  }, [selectedPlace?.placeId, selectedPlace?.slug]);
  const [crossedPathsPeople, setCrossedPathsPeople] = useState<
    { tag: string; pfpUrl: string | null; lastCrossedAt: string }[]
  >([]);
  const selectedMayor = useMemo(() => {
    const slug = selectedPlace?.slug;
    if (!slug) return null;
    return nearbyPlaces.find((place) => place.slug === slug)?.mayor ?? null;
  }, [nearbyPlaces, selectedPlace?.slug]);
  // Verified-overlap discovery for the selected venue. Cookie-session read:
  // signed-out viewers get an empty list and the section simply never shows.
  useEffect(() => {
    const slug = selectedPlace?.slug;
    setCrossedPathsPeople([]);
    if (!slug) return;
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch(`/api/venues/${encodeURIComponent(slug)}/crossed-paths`, { cache: 'no-store' });
        if (!response.ok) return;
        const payload = await response.json();
        if (!cancelled && payload?.success && Array.isArray(payload.data?.people)) {
          setCrossedPathsPeople(payload.data.people);
        }
      } catch {
        // Discovery is additive — a failed fetch just hides the section.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedPlace?.slug]);
  const [selectedPlaceActiveDares, setSelectedPlaceActiveDares] = useState<SelectedPlaceActiveDare[]>([]);
  const [selectedPlaceActiveDaresLoading, setSelectedPlaceActiveDaresLoading] = useState(false);
  const [selectedPlaceFeaturedPaidActivation, setSelectedPlaceFeaturedPaidActivation] = useState<SelectedPlaceActiveDare | null>(null);
  const [pendingPlaceTags, setPendingPlaceTags] = useState<PendingPlaceTagItem[]>([]);
  const [privateMapSpots, setPrivateMapSpots] = useState<PrivateMapSpot[]>([]);
  const [saveSpotDraft, setSaveSpotDraft] = useState<SaveSpotDraft | null>(null);
  const [saveSpotPhotoLoading, setSaveSpotPhotoLoading] = useState(false);
  const [saveSpotState, setSaveSpotState] = useState<{ type: 'info' | 'success' | 'error'; message: string } | null>(null);
  const saveSpotPhotoInputRef = useRef<HTMLInputElement | null>(null);
  const [pulseFilter, setPulseFilter] = useState<PulseFilter>('all');
  const [mapVenueFocus, setMapVenueFocus] = useState<MapVenueFocus>('all');
  const [showAdvancedMapFilters, setShowAdvancedMapFilters] = useState(false);
  const [nearbyDareFilter, setNearbyDareFilter] = useState<NearbyDareFilter>('all');
  const [nearbyDareRadiusKm] = useState(5);
  const [nearbyDarePanelCollapsed, setNearbyDarePanelCollapsed] = useState(true);
  const [showLocalSignalForm, setShowLocalSignalForm] = useState(false);
  const [localSignalDraft, setLocalSignalDraft] = useState<LocalSignalDraft>({
    title: '',
    category: 'other',
    venueName: '',
    city: '',
    startsAt: '',
    notes: '',
  });
  const [localSignalSubmitting, setLocalSignalSubmitting] = useState(false);
  const [localSignalSubmitState, setLocalSignalSubmitState] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const presenceDurationMinutes: VenuePresenceDuration = 60;
  const presenceVisibility: VenuePresenceVisibility = 'NEARBY';
  const [presenceSubmitting, setPresenceSubmitting] = useState(false);
  const [presenceSubmitState, setPresenceSubmitState] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [presenceReceipt, setPresenceReceipt] = useState<PresenceReceiptState | null>(null);
  const [activePresenceSignal, setActivePresenceSignal] = useState<ActivePresenceSignal | null>(null);
  const [checkInLaunching, setCheckInLaunching] = useState(false);
  const [checkInLaunchState, setCheckInLaunchState] = useState<{ type: 'info' | 'error'; message: string } | null>(null);
  const [venueRoomAccess, setVenueRoomAccess] = useState<VenueRoomAccess | null>(null);
  const [venueRoomMessages, setVenueRoomMessages] = useState<VenueRoomMessage[]>([]);
  const [venueRoomWhoHere, setVenueRoomWhoHere] = useState<VenueRoomPresence[]>([]);
  const [venueRoomLoading, setVenueRoomLoading] = useState(false);
  const [venueRoomSending, setVenueRoomSending] = useState(false);
  const [venueRoomPresenceUpdating, setVenueRoomPresenceUpdating] = useState(false);
  const [venueRoomDraft, setVenueRoomDraft] = useState('');
  const [venueRoomVisible, setVenueRoomVisible] = useState(false);
  const [venueRoomExpanded, setVenueRoomExpanded] = useState(false);
  const [venueRoomState, setVenueRoomState] = useState<{ type: 'info' | 'error'; message: string } | null>(null);
  const [spotVault, setSpotVault] = useState<SpotVaultSnapshot | null>(null);
  const [spotVaultLoading, setSpotVaultLoading] = useState(false);
  const [spotVaultError, setSpotVaultError] = useState<string | null>(null);
  const [spotVaultReviewVerdict, setSpotVaultReviewVerdict] = useState<SpotVaultReviewVerdict>('worth_it');
  const [spotVaultReviewNote, setSpotVaultReviewNote] = useState('');
  const [spotVaultReviewSubmitting, setSpotVaultReviewSubmitting] = useState(false);
  const [spotVaultReviewReportingId, setSpotVaultReviewReportingId] = useState<string | null>(null);
  const [spotVaultReviewState, setSpotVaultReviewState] = useState<{ type: 'info' | 'error'; message: string } | null>(null);
  const [pendingCommandAction, setPendingCommandAction] = useState<SelectedCommandAction | null>(null);
  const mapPreset: MapPreset = 'classic';
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [isMapFullscreenMobile, setIsMapFullscreenMobile] = useState(false);
  const [startProofDockDismissed, setStartProofDockDismissed] = useState(false);
  const [adventureMode, setAdventureMode] = useState(false);
  const [adventurePanelOpen, setAdventurePanelOpen] = useState(false);
  const [mapAttentionIntent, setMapAttentionIntent] = useState<MapAttentionIntent | null>(null);
  const [mapAttentionGuideOpen, setMapAttentionGuideOpen] = useState(true);
  const isImmersiveMobile = isMobileViewport && isMapFullscreenMobile;
  const [ceremonyState, setCeremonyState] = useState<CeremonyState>(null);
  const [proofMoment, setProofMoment] = useState<null | {
    tagId: string;
    venueName: string;
    venueSlug: string | null;
    venueHandle: string | null;
    creatorTag: string | null;
    firstMark: boolean;
    submittedAt: string;
  }>(null);
  const [bootstrappedDefaultPins, setBootstrappedDefaultPins] = useState(false);
  const deepLinkedPlaceSlug = searchParams.get('place');
  const deepLinkedSearchQuery = searchParams.get('q') || searchParams.get('search') || searchParams.get('intent');
  const deepLinkedRoomOpen = searchParams.get('room') === '1' || searchParams.get('open') === 'room';
  const deepLinkedMeetupOpen = searchParams.get('meetup') === '1';
  const controlSource = searchParams.get('source');
  const deepLinkedCampaignId = searchParams.get('campaignId');
  const deepLinkedDareShortId = searchParams.get('dare');
  const showTraceParam = searchParams.get('trace') === '1';
  const showMatchesParam = searchParams.get('matches') === '1';
  const adventureCenter = useMemo(
    () =>
      viewportCenter ??
      userLocation ?? {
        latitude: DEFAULT_CENTER[0],
        longitude: DEFAULT_CENTER[1],
      },
    [userLocation, viewportCenter]
  );
  const tonightActivity = useTonightActivity(adventureCenter, mapReady);
  const focalAdventureActivity = tonightActivity.snapshot?.activities[0] ?? null;
  const deepLinkedLocation = useMemo(() => {
    const latitude = Number(searchParams.get('lat'));
    const longitude = Number(searchParams.get('lng'));
    if (isUsableMapCoordinate(latitude, longitude)) {
      return { latitude, longitude };
    }
    return null;
  }, [searchParams]);
  const selectedPlaceIdentity = selectedPlace
    ? selectedPlace.placeId ??
      selectedPlace.slug ??
      `${selectedPlace.latitude.toFixed(5)}:${selectedPlace.longitude.toFixed(5)}`
    : null;
  const selectedResolvedPlaceId =
    selectedPlace?.placeId && !isCuratedFallbackVenueId(selectedPlace.placeId)
      ? selectedPlace.placeId
      : undefined;
  const showStartProofDock = !selectedPlace && !startProofDockDismissed;

  useEffect(() => {
    setPrivateMapSpots(loadPrivateMapSpots());
  }, []);
  const hasDeepLinkedPlace = Boolean(deepLinkedPlaceSlug);
  const isCreatorSource = controlSource === 'creator';
  const showBackToControl = controlSource === 'control' || Boolean(deepLinkedCampaignId);
  const pendingPlaceTagsRef = useRef<PendingPlaceTagItem[]>([]);

  useEffect(() => {
    setCheckInLaunchState(null);
  }, [selectedPlaceIdentity]);
  const nearbyFetchIdRef = useRef(0);
  const nearbyPlacesRef = useRef<NearbyPlace[]>([]);
  const nearbyPlaceFetchCacheRef = useRef<{ key: string; fetchedAt: number } | null>(null);
  const nearbyPlaceFetchInFlightKeyRef = useRef<string | null>(null);
  const nearbyPlaceFetchControllerRef = useRef<AbortController | null>(null);
  const nearbyPlaceFallbackRetryTimerRef = useRef<number | null>(null);
  const nearbyPlaceFallbackRetryStateRef = useRef<{ key: string; attempts: number } | null>(null);
  const fetchNearbyPlacesRef = useRef<(latitude: number, longitude: number, zoom: number) => void>(() => undefined);
  const nearbyDareFetchIdRef = useRef(0);
  const nearbyDareFetchCacheRef = useRef<{ key: string; fetchedAt: number } | null>(null);
  const nearbyDareFetchInFlightKeyRef = useRef<string | null>(null);
  const nearbyDareFetchControllerRef = useRef<AbortController | null>(null);
  const localSignalFetchIdRef = useRef(0);
  const localSignalFetchCacheRef = useRef<{ key: string; fetchedAt: number } | null>(null);
  const localSignalFetchInFlightKeyRef = useRef<string | null>(null);
  const localSignalFetchControllerRef = useRef<AbortController | null>(null);
  const venuePresenceFetchIdRef = useRef(0);
  const venuePresenceFetchCacheRef = useRef<{ key: string; fetchedAt: number } | null>(null);
  const venuePresenceFetchInFlightKeyRef = useRef<string | null>(null);
  const venuePresenceFetchControllerRef = useRef<AbortController | null>(null);
  const lastPushLocationSyncRef = useRef<{
    latitude: number;
    longitude: number;
    radiusKm: number;
    syncedAt: number;
  } | null>(null);
  const skipNextSearchRef = useRef(false);
  const skipNextMapClickRef = useRef(false);
  const skipNextMapClickClearTimerRef = useRef<number | null>(null);
  const deepLinkedSearchAppliedRef = useRef<string | null>(null);
  const deepLinkedLocationAppliedRef = useRef<string | null>(null);
  const autoLocateModeRef = useRef<'idle' | 'auto' | 'manual'>('idle');
  const autoLocateFallbackAppliedRef = useRef(false);
  const hasAutoFitVenueClusterRef = useRef(false);
  const lastEmptyViewportRecoveryKeyRef = useRef<string | null>(null);

  useEffect(() => {
    nearbyPlacesRef.current = nearbyPlaces;
  }, [nearbyPlaces]);

  useEffect(() => {
    return () => {
      if (nearbyPlaceFallbackRetryTimerRef.current !== null) {
        window.clearTimeout(nearbyPlaceFallbackRetryTimerRef.current);
        nearbyPlaceFallbackRetryTimerRef.current = null;
      }
      if (desktopMapSettlingTimerRef.current !== null) {
        window.clearTimeout(desktopMapSettlingTimerRef.current);
        desktopMapSettlingTimerRef.current = null;
      }
      if (desktopNearbyFetchTimerRef.current !== null) {
        window.clearTimeout(desktopNearbyFetchTimerRef.current);
        desktopNearbyFetchTimerRef.current = null;
      }
      if (desktopSideDataFetchTimerRef.current !== null) {
        window.clearTimeout(desktopSideDataFetchTimerRef.current);
        desktopSideDataFetchTimerRef.current = null;
      }
      if (deferredMarkerCleanupTimerRef.current !== null) {
        window.clearTimeout(deferredMarkerCleanupTimerRef.current);
        deferredMarkerCleanupTimerRef.current = null;
      }
      if (skipNextMapClickClearTimerRef.current !== null) {
        window.clearTimeout(skipNextMapClickClearTimerRef.current);
        skipNextMapClickClearTimerRef.current = null;
      }
      nearbyPlaceFetchControllerRef.current?.abort();
      nearbyDareFetchControllerRef.current?.abort();
      localSignalFetchControllerRef.current?.abort();
      venuePresenceFetchControllerRef.current?.abort();
    };
  }, []);

  const markDesktopMapSettling = useCallback((durationMs = 420) => {
    desktopMapSettlingRef.current = true;

    if (desktopMapSettlingTimerRef.current !== null) {
      window.clearTimeout(desktopMapSettlingTimerRef.current);
    }

    desktopMapSettlingTimerRef.current = window.setTimeout(() => {
      desktopMapSettlingRef.current = false;
      desktopMapSettlingTimerRef.current = null;
    }, durationMs);
  }, []);

  const armMapClickSuppression = useCallback((durationMs = 180) => {
    skipNextMapClickRef.current = true;

    if (skipNextMapClickClearTimerRef.current !== null) {
      window.clearTimeout(skipNextMapClickClearTimerRef.current);
    }

    skipNextMapClickClearTimerRef.current = window.setTimeout(() => {
      skipNextMapClickRef.current = false;
      skipNextMapClickClearTimerRef.current = null;
    }, durationMs);
  }, []);

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
    if (typeof window === 'undefined') return;

    setStartProofDockDismissed(window.localStorage.getItem(START_PROOF_DOCK_DISMISSED_KEY) === '1');
    const savedAdventurePreference = window.localStorage.getItem(ADVENTURE_MAP_STORAGE_KEY);
    const adventureEnabled = savedAdventurePreference === '1';
    setAdventureMode(adventureEnabled);
    if (!adventureEnabled) {
      setAdventurePanelOpen(false);
    }
    const savedIntent = window.localStorage.getItem(MAP_ATTENTION_INTENT_STORAGE_KEY);
    if (savedIntent === 'meet' || savedIntent === 'discover' || savedIntent === 'now') {
      setMapAttentionIntent(savedIntent);
    }
  }, []);

  const handleMapAttentionIntentChange = useCallback(
    (intent: MapAttentionIntent | null) => {
      setMapAttentionIntent(intent);
      if (intent === 'discover') {
        setSelectedPlace(null);
        setSelectedMeetup(null);
        setTargetCenter([adventureCenter.latitude, adventureCenter.longitude]);
        setTargetZoom(11);
      }
      if (typeof window !== 'undefined') {
        if (intent) {
          window.localStorage.setItem(MAP_ATTENTION_INTENT_STORAGE_KEY, intent);
        } else {
          window.localStorage.removeItem(MAP_ATTENTION_INTENT_STORAGE_KEY);
        }
      }
      triggerHaptic('selection');
    },
    [adventureCenter.latitude, adventureCenter.longitude]
  );

  const handleAdventureModeToggle = useCallback(() => {
    setAdventureMode((current) => {
      const next = !current;
      if (!next) setAdventurePanelOpen(false);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(ADVENTURE_MAP_STORAGE_KEY, next ? '1' : '0');
      }
      triggerHaptic('selection');
      return next;
    });
  }, []);

  const dismissStartProofDock = useCallback(() => {
    setStartProofDockDismissed(true);

    if (typeof window !== 'undefined') {
      window.localStorage.setItem(START_PROOF_DOCK_DISMISSED_KEY, '1');
    }
  }, []);

  useEffect(() => {
    if (!isMobileViewport) {
      setIsMapFullscreenMobile(false);
      return;
    }

    setNearbyDarePanelCollapsed(true);
  }, [isMobileViewport]);

  useEffect(() => {
    if (typeof document === 'undefined' || !isImmersiveMobile) {
      return undefined;
    }

    const originalBodyOverflow = document.body.style.overflow;
    const originalHtmlOverscroll = document.documentElement.style.overscrollBehavior;

    document.body.style.overflow = 'hidden';
    document.documentElement.style.overscrollBehavior = 'none';

    return () => {
      document.body.style.overflow = originalBodyOverflow;
      document.documentElement.style.overscrollBehavior = originalHtmlOverscroll;
    };
  }, [isImmersiveMobile]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || typeof window === 'undefined') {
      return undefined;
    }

    const resizeMap = () => map.resize();
    const animationFrame = window.requestAnimationFrame(resizeMap);
    const resizeTimeout = window.setTimeout(resizeMap, 340);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.clearTimeout(resizeTimeout);
    };
  }, [isImmersiveMobile, mapReady]);

  useEffect(() => {
    if (!isImmersiveMobile || typeof window === 'undefined') {
      return undefined;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsMapFullscreenMobile(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isImmersiveMobile]);

  useEffect(() => {
    if (!isMobileViewport || !selectedPlace) {
      return;
    }

    setNearbyDarePanelCollapsed(true);
  }, [isMobileViewport, selectedPlace]);

  useEffect(() => {
    if (!selectedPlaceIdentity || !isMobileViewport) {
      setSelectedPlacePanelExpanded(false);
      return;
    }

    setSelectedPlacePanelExpanded(deepLinkedRoomOpen);
  }, [deepLinkedRoomOpen, isMobileViewport, selectedPlaceIdentity]);

  useEffect(() => {
    if (!selectedPlaceIdentity) {
      setVenueRoomExpanded(false);
      return;
    }

    setVenueRoomExpanded(deepLinkedRoomOpen);
  }, [deepLinkedRoomOpen, selectedPlaceIdentity]);

  // Venue-page parity: /map?place=x&meetup=1 lands with the meetup composer
  // open — the venue page's "Start a free meetup here" matches the pin popup.
  useEffect(() => {
    if (!selectedPlaceIdentity || !deepLinkedMeetupOpen) return;
    setMeetupComposerOpen(true);
  }, [deepLinkedMeetupOpen, selectedPlaceIdentity]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      const raw = window.localStorage.getItem(ACTIVE_PRESENCE_STORAGE_KEY);
      if (!raw) return;

      const parsed = JSON.parse(raw) as Partial<ActivePresenceSignal>;
      if (!parsed.venueId || !parsed.venueSlug || !parsed.venueName || !parsed.expiresAt) {
        window.localStorage.removeItem(ACTIVE_PRESENCE_STORAGE_KEY);
        return;
      }

      if (new Date(parsed.expiresAt).getTime() <= Date.now()) {
        window.localStorage.removeItem(ACTIVE_PRESENCE_STORAGE_KEY);
        return;
      }

      setActivePresenceSignal(parsed as ActivePresenceSignal);
    } catch {
      window.localStorage.removeItem(ACTIVE_PRESENCE_STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    if (!activePresenceSignal) {
      return undefined;
    }

    const expiresInMs = new Date(activePresenceSignal.expiresAt).getTime() - Date.now();
    if (expiresInMs <= 0) {
      setActivePresenceSignal(null);
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(ACTIVE_PRESENCE_STORAGE_KEY);
      }
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setActivePresenceSignal(null);
      window.localStorage.removeItem(ACTIVE_PRESENCE_STORAGE_KEY);
    }, expiresInMs);

    return () => window.clearTimeout(timeoutId);
  }, [activePresenceSignal]);

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
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;
        if (!isUsableMapCoordinate(latitude, longitude)) {
          autoLocateModeRef.current = 'idle';
          autoLocateFallbackAppliedRef.current = true;
          setTargetCenter(DEFAULT_CENTER);
          setTargetZoom(DEFAULT_ZOOM);
          setLocating(false);
          triggerHaptic('warning');
          return;
        }
        setUserLocation({
          latitude,
          longitude,
        });
        setUserHeading(Number.isFinite(position.coords.heading) ? position.coords.heading : null);
        setTargetCenter([latitude, longitude]);
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
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;
        if (!isUsableMapCoordinate(latitude, longitude)) return;

        setUserLocation({
          latitude,
          longitude,
        });
        setUserHeading(Number.isFinite(position.coords.heading) ? position.coords.heading : null);
      },
      () => undefined,
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 12000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [hasUserLocation]);

  useEffect(() => {
    if (!deepLinkedLocation || hasDeepLinkedPlace) {
      return;
    }

    const locationKey = `${deepLinkedLocation.latitude.toFixed(6)}:${deepLinkedLocation.longitude.toFixed(6)}`;
    if (deepLinkedLocationAppliedRef.current === locationKey) {
      return;
    }

    deepLinkedLocationAppliedRef.current = locationKey;
    autoLocateModeRef.current = 'idle';
    autoLocateFallbackAppliedRef.current = true;
    setUserLocation(deepLinkedLocation);
    setUserHeading(null);
    setTargetCenter([deepLinkedLocation.latitude, deepLinkedLocation.longitude]);
    setTargetZoom(14);
  }, [deepLinkedLocation, hasDeepLinkedPlace]);

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
          handle: venue.handle,
          baseCashEnabled: venue.baseCashEnabled,
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
          reviewSignal: venue.reviewSignal,
          activeDareCount: venue.activeDares.length,
          checkInCount: venue.checkInCount,
          commandCenter: venue.commandCenter,
          mapModes: venue.mapModes,
          profile: venue.profile,
          checkInRadiusMeters: venue.checkInRadiusMeters,
          memorySummary: venue.memorySummary,
          liveSession: venue.liveSession,
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
    if (deepLinkedPlaceSlug || !deepLinkedSearchQuery) {
      return;
    }

    const trimmed = deepLinkedSearchQuery.trim();
    if (trimmed.length < 2 || deepLinkedSearchAppliedRef.current === trimmed) {
      return;
    }

    deepLinkedSearchAppliedRef.current = trimmed;
    setSearchQuery(trimmed);
    setSearchPopoverOpen(true);
  }, [deepLinkedPlaceSlug, deepLinkedSearchQuery]);

  const closeSearchPopover = useCallback(() => {
    setSearchPopoverOpen(false);
    setSearchResults([]);
    setSearching(false);
  }, []);

  useEffect(() => {
    if (!searchPopoverOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (searchShellRef.current?.contains(target)) return;
      closeSearchPopover();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeSearchPopover();
      }
    };

    document.addEventListener('pointerdown', handlePointerDown, true);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, true);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [closeSearchPopover, searchPopoverOpen]);

  useEffect(() => {
    if (!searchPopoverOpen) return;

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
        const searchOrigin = userLocation ?? viewportCenter;
        const params = new URLSearchParams({ q: trimmed });
        if (searchOrigin) {
          params.set('lat', searchOrigin.latitude.toFixed(6));
          params.set('lon', searchOrigin.longitude.toFixed(6));
        }
        const response = await fetch(`/api/places/search?${params.toString()}`, {
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
  }, [searchPopoverOpen, searchQuery, userLocation, viewportCenter]);

  const fetchNearbyPlaces = useCallback(async (latitude: number, longitude: number, zoom: number) => {
    if (!isUsableMapCoordinate(latitude, longitude)) {
      return;
    }

    const radiusMeters = getRadiusMetersForZoom(zoom);
    const coordinatePrecision =
      typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches ? 3 : 4;
    const requestKey = `${latitude.toFixed(coordinatePrecision)}:${longitude.toFixed(coordinatePrecision)}:${radiusMeters}`;
    const cached = nearbyPlaceFetchCacheRef.current;
    const now = Date.now();

    if (
      nearbyPlaceFetchInFlightKeyRef.current === requestKey ||
      (cached?.key === requestKey && now - cached.fetchedAt < 30_000)
    ) {
      return;
    }

    nearbyPlaceFetchControllerRef.current?.abort();
    const controller = new AbortController();
    nearbyPlaceFetchControllerRef.current = controller;
    nearbyPlaceFetchInFlightKeyRef.current = requestKey;
    const requestId = ++nearbyFetchIdRef.current;

    try {
      const url = new URL('/api/venues/nearby', window.location.origin);
      url.searchParams.set('lat', String(latitude));
      url.searchParams.set('lng', String(longitude));
      url.searchParams.set('radiusMeters', String(radiusMeters));
      url.searchParams.set('limit', '24');

      const response = await fetch(url.toString(), { signal: controller.signal });
      const payload = (await response.json()) as NearbyResponse;

      if (!response.ok || !payload.success || !payload.data?.venues) {
        throw new Error('Failed to load nearby places');
      }

      const responseSource = response.headers.get('X-BaseDare-Data-Source') ?? payload.source ?? 'database';
      const nextVenues = payload.data.venues;

      if (responseSource === 'fallback' && nextVenues.length === 0) {
        console.warn('[REAL_WORLD_MAP] Nearby places fallback ignored:', payload.warning ?? 'fallback response');

        const previousRetryState = nearbyPlaceFallbackRetryStateRef.current;
        const nextAttempt =
          previousRetryState?.key === requestKey ? previousRetryState.attempts + 1 : 1;

        if (
          requestId === nearbyFetchIdRef.current &&
          nearbyPlacesRef.current.length === 0 &&
          nearbyPlaceFallbackRetryTimerRef.current === null &&
          nextAttempt <= 2
        ) {
          nearbyPlaceFallbackRetryStateRef.current = { key: requestKey, attempts: nextAttempt };
          nearbyPlaceFallbackRetryTimerRef.current = window.setTimeout(() => {
            nearbyPlaceFallbackRetryTimerRef.current = null;
            const activeMap = mapInstanceRef.current;
            if (!activeMap) return;

            const center = activeMap.getCenter();
            if (!isUsableMapCoordinate(center.lat, center.lng)) return;
            fetchNearbyPlacesRef.current(center.lat, center.lng, activeMap.getZoom());
          }, 1800);
        }

        return;
      }

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
        if (nearbyPlaceFallbackRetryTimerRef.current !== null) {
          window.clearTimeout(nearbyPlaceFallbackRetryTimerRef.current);
          nearbyPlaceFallbackRetryTimerRef.current = null;
        }
        nearbyPlaceFallbackRetryStateRef.current = null;
        setNearbyPlaces(nextVenues);
        nearbyPlaceFetchCacheRef.current = { key: requestKey, fetchedAt: Date.now() };
      }
    } catch (error) {
      if (controller.signal.aborted) {
        return;
      }
      console.error('[REAL_WORLD_MAP] Nearby places failed:', error);
    } finally {
      if (nearbyPlaceFetchInFlightKeyRef.current === requestKey) {
        nearbyPlaceFetchInFlightKeyRef.current = null;
      }
      if (nearbyPlaceFetchControllerRef.current === controller) {
        nearbyPlaceFetchControllerRef.current = null;
      }
    }
  }, []);

  const fetchNearbyDares = useCallback(async (latitude: number, longitude: number, zoom: number) => {
    const radiusKm = Math.max(getDareRadiusKmForZoom(zoom), nearbyDareRadiusKm);
    const requestKey = `${latitude.toFixed(4)}:${longitude.toFixed(4)}:${radiusKm}`;
    const cached = nearbyDareFetchCacheRef.current;
    const now = Date.now();

    if (
      nearbyDareFetchInFlightKeyRef.current === requestKey ||
      (cached?.key === requestKey && now - cached.fetchedAt < 30_000)
    ) {
      return;
    }

    nearbyDareFetchControllerRef.current?.abort();
    const controller = new AbortController();
    nearbyDareFetchControllerRef.current = controller;
    nearbyDareFetchInFlightKeyRef.current = requestKey;
    const requestId = ++nearbyDareFetchIdRef.current;

    try {
      setNearbyDaresLoading(true);
      const url = new URL('/api/dares/nearby', window.location.origin);
      url.searchParams.set('lat', String(latitude));
      url.searchParams.set('lng', String(longitude));
      url.searchParams.set('radius', String(radiusKm));
      url.searchParams.set('limit', '8');

      const response = await fetch(url.toString(), { signal: controller.signal });
      const payload = (await response.json()) as NearbyDaresResponse;

      if (!response.ok || !payload.success || !payload.data?.dares) {
        throw new Error('Failed to load nearby dares');
      }

      if (requestId === nearbyDareFetchIdRef.current) {
        setNearbyDares(payload.data.dares);
        nearbyDareFetchCacheRef.current = { key: requestKey, fetchedAt: Date.now() };
      }
    } catch (error) {
      if (controller.signal.aborted) {
        return;
      }
      console.error('[REAL_WORLD_MAP] Nearby dares failed:', error);
      if (requestId === nearbyDareFetchIdRef.current) {
        setNearbyDares([]);
      }
    } finally {
      if (nearbyDareFetchInFlightKeyRef.current === requestKey) {
        nearbyDareFetchInFlightKeyRef.current = null;
      }
      if (nearbyDareFetchControllerRef.current === controller) {
        nearbyDareFetchControllerRef.current = null;
      }
      if (requestId === nearbyDareFetchIdRef.current) {
        setNearbyDaresLoading(false);
      }
    }
  }, [nearbyDareRadiusKm]);

  useEffect(() => {
    fetchNearbyPlacesRef.current = fetchNearbyPlaces;
  }, [fetchNearbyPlaces]);

  // ── Free meetup layer (Stage 3): fetch ────────────────────────────────────
  // Open GET (no bearer); same-origin cookies let a signed-in viewer's blocks
  // apply server-side. Failures are swallowed — the free layer must never
  // interrupt or mutate the paid map.
  useEffect(() => {
    if (!mapReady) return;
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch('/api/meetups');
        const payload = (await res.json()) as { success?: boolean; data?: MeetupPin[] };
        if (!cancelled && res.ok && payload.success && Array.isArray(payload.data)) {
          setMeetups(payload.data);
        }
      } catch {
        // Silent by design.
      }
    };
    void load();
    const interval = window.setInterval(load, 180_000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [mapReady, meetupsRefreshNonce]);

  // ── Free meetup layer (Stage 3): marker reconcile ─────────────────────────
  // Reconciles our OWN marker set against the meetups visible for the active
  // layer filter. Lighter community pins (no seal); click opens a read-only
  // React card. Never touches mapMarkersRef, camera, sources, or layers.
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapReady) return;

    const store = meetupMarkersRef.current;
    const visible = meetups.filter((meetup) => meetupPassesLayerFilter(meetup, mapLayerFilter));
    const visibleIds = new Set(visible.map((meetup) => meetup.id));

    for (const [id, marker] of store) {
      if (!visibleIds.has(id)) {
        marker.remove();
        store.delete(id);
      }
    }

    for (const meetup of visible) {
      if (store.has(meetup.id)) continue;
      if (!Number.isFinite(meetup.approxLat) || !Number.isFinite(meetup.approxLng)) continue;
      const element = createMarkerElement(createMeetupMarkerHtml(meetup), 'bd-meetup-marker');
      element.style.pointerEvents = 'auto';
      element.title = `${meetup.title} · ${meetup.placeLabel}`;
      element.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        // Meetup card and the venue sheet are mutually exclusive — closing the
        // venue selection prevents a bottom-sheet collision on mobile.
        setSelectedPlace(null);
        setSelectedMeetup(meetup);
      });
      const marker = new maplibregl.Marker({
        element,
        anchor: 'center',
        pitchAlignment: 'viewport',
        rotationAlignment: 'viewport',
        subpixelPositioning: true,
      })
        .setLngLat([meetup.approxLng, meetup.approxLat])
        .addTo(map);
      store.set(meetup.id, marker);
    }
  }, [meetups, mapLayerFilter, mapReady]);

  // ── Free meetup layer (Stage 3): teardown on unmount ──────────────────────
  useEffect(() => {
    const store = meetupMarkersRef.current;
    return () => {
      for (const [, marker] of store) marker.remove();
      store.clear();
    };
  }, []);

  const scheduleNearbyPlaceFetch = useCallback(
    (latitude: number, longitude: number, zoom: number) => {
      if (isMobileViewport) {
        void fetchNearbyPlaces(latitude, longitude, zoom);
        return;
      }

      const radiusMeters = getRadiusMetersForZoom(zoom);
      const lastFetch = lastDesktopNearbyFetchRef.current;
      const now = Date.now();

      if (lastFetch?.radiusMeters === radiusMeters) {
        const movedMeters = calculateDistanceMeters(
          lastFetch.latitude,
          lastFetch.longitude,
          latitude,
          longitude
        );

        if (movedMeters < 350 && now - lastFetch.fetchedAt < 90_000) {
          return;
        }
      }

      if (desktopNearbyFetchTimerRef.current !== null) {
        window.clearTimeout(desktopNearbyFetchTimerRef.current);
      }

      desktopNearbyFetchTimerRef.current = window.setTimeout(() => {
        desktopNearbyFetchTimerRef.current = null;
        lastDesktopNearbyFetchRef.current = {
          latitude,
          longitude,
          radiusMeters,
          fetchedAt: Date.now(),
        };
        void fetchNearbyPlaces(latitude, longitude, zoom);
      }, 320);
    },
    [fetchNearbyPlaces, isMobileViewport]
  );

  const fetchLocalSignals = useCallback(async (latitude: number, longitude: number) => {
    const radiusKm = Math.max(nearbyDareRadiusKm, 12);
    const requestKey = `${latitude.toFixed(4)}:${longitude.toFixed(4)}:${radiusKm}`;
    const cached = localSignalFetchCacheRef.current;
    const now = Date.now();

    if (
      localSignalFetchInFlightKeyRef.current === requestKey ||
      (cached?.key === requestKey && now - cached.fetchedAt < 30_000)
    ) {
      return;
    }

    localSignalFetchControllerRef.current?.abort();
    const controller = new AbortController();
    localSignalFetchControllerRef.current = controller;
    localSignalFetchInFlightKeyRef.current = requestKey;
    const requestId = ++localSignalFetchIdRef.current;

    try {
      setLocalSignalsLoading(true);
      const url = new URL('/api/local-signals', window.location.origin);
      url.searchParams.set('lat', String(latitude));
      url.searchParams.set('lng', String(longitude));
      url.searchParams.set('radiusKm', String(radiusKm));
      url.searchParams.set('limit', '8');

      const response = await fetch(url.toString(), { signal: controller.signal });
      const payload = (await response.json()) as LocalSignalsResponse;

      if (!response.ok || !payload.success || !payload.data?.signals) {
        throw new Error('Failed to load local signals');
      }

      if (requestId === localSignalFetchIdRef.current) {
        setLocalSignals(payload.data.signals);
        localSignalFetchCacheRef.current = { key: requestKey, fetchedAt: Date.now() };
      }
    } catch (error) {
      if (controller.signal.aborted) {
        return;
      }
      console.error('[REAL_WORLD_MAP] Local signals failed:', error);
      if (requestId === localSignalFetchIdRef.current) {
        setLocalSignals([]);
      }
    } finally {
      if (localSignalFetchInFlightKeyRef.current === requestKey) {
        localSignalFetchInFlightKeyRef.current = null;
      }
      if (localSignalFetchControllerRef.current === controller) {
        localSignalFetchControllerRef.current = null;
      }
      if (requestId === localSignalFetchIdRef.current) {
        setLocalSignalsLoading(false);
      }
    }
  }, [nearbyDareRadiusKm]);

  const fetchVenuePresence = useCallback(async (latitude: number, longitude: number) => {
    const radiusKm = Math.max(nearbyDareRadiusKm, 8);
    const requestKey = `${latitude.toFixed(4)}:${longitude.toFixed(4)}:${radiusKm}`;
    const cached = venuePresenceFetchCacheRef.current;
    const now = Date.now();

    if (
      venuePresenceFetchInFlightKeyRef.current === requestKey ||
      (cached?.key === requestKey && now - cached.fetchedAt < 30_000)
    ) {
      return;
    }

    venuePresenceFetchControllerRef.current?.abort();
    const controller = new AbortController();
    venuePresenceFetchControllerRef.current = controller;
    venuePresenceFetchInFlightKeyRef.current = requestKey;
    const requestId = ++venuePresenceFetchIdRef.current;

    try {
      setVenuePresenceLoading(true);
      const url = new URL('/api/venues/presence', window.location.origin);
      url.searchParams.set('lat', String(latitude));
      url.searchParams.set('lng', String(longitude));
      url.searchParams.set('radiusKm', String(radiusKm));
      url.searchParams.set('limit', '30');

      const response = await fetch(url.toString(), { signal: controller.signal });
      const payload = (await response.json()) as VenuePresenceResponse;

      if (!response.ok || !payload.success || !payload.data?.signals) {
        throw new Error('Failed to load venue presence');
      }

      if (requestId === venuePresenceFetchIdRef.current) {
        setVenuePresenceSignals(payload.data.signals);
        venuePresenceFetchCacheRef.current = { key: requestKey, fetchedAt: Date.now() };
      }
    } catch (error) {
      if (controller.signal.aborted) {
        return;
      }
      console.error('[REAL_WORLD_MAP] Venue presence failed:', error);
      if (requestId === venuePresenceFetchIdRef.current) {
        setVenuePresenceSignals([]);
      }
    } finally {
      if (venuePresenceFetchInFlightKeyRef.current === requestKey) {
        venuePresenceFetchInFlightKeyRef.current = null;
      }
      if (venuePresenceFetchControllerRef.current === controller) {
        venuePresenceFetchControllerRef.current = null;
      }
      if (requestId === venuePresenceFetchIdRef.current) {
        setVenuePresenceLoading(false);
      }
    }
  }, [nearbyDareRadiusKm]);

  const fetchMapSideData = useCallback(
    (latitude: number, longitude: number, zoom: number) => {
      void fetchNearbyDares(latitude, longitude, zoom);
      void fetchLocalSignals(latitude, longitude);
      void fetchVenuePresence(latitude, longitude);
    },
    [fetchLocalSignals, fetchNearbyDares, fetchVenuePresence]
  );

  const scheduleMapSideDataFetch = useCallback(
    (latitude: number, longitude: number, zoom: number) => {
      if (isMobileViewport) {
        fetchMapSideData(latitude, longitude, zoom);
        return;
      }

      const zoomBucket = Math.round(zoom * 2) / 2;
      const lastFetch = lastDesktopSideDataFetchRef.current;
      const now = Date.now();

      if (lastFetch?.zoomBucket === zoomBucket) {
        const movedMeters = calculateDistanceMeters(
          lastFetch.latitude,
          lastFetch.longitude,
          latitude,
          longitude
        );

        if (movedMeters < 300 && now - lastFetch.fetchedAt < 60_000) {
          return;
        }
      }

      if (desktopSideDataFetchTimerRef.current !== null) {
        window.clearTimeout(desktopSideDataFetchTimerRef.current);
      }

      desktopSideDataFetchTimerRef.current = window.setTimeout(() => {
        desktopSideDataFetchTimerRef.current = null;
        lastDesktopSideDataFetchRef.current = {
          latitude,
          longitude,
          zoomBucket,
          fetchedAt: Date.now(),
        };
        fetchMapSideData(latitude, longitude, zoom);
      }, desktopMapSettlingRef.current ? 620 : 360);
    },
    [fetchMapSideData, isMobileViewport]
  );

  const submitLocalSignal = useCallback(async () => {
    const title = localSignalDraft.title.trim();
    if (title.length < 3) {
      setLocalSignalSubmitState({ type: 'error', message: 'Add a short title for what is happening.' });
      triggerHaptic('warning');
      return;
    }

    const source = userLocation ?? viewportCenter;
    setLocalSignalSubmitting(true);
    setLocalSignalSubmitState(null);

    try {
      const startsAt = localSignalDraft.startsAt
        ? new Date(localSignalDraft.startsAt).toISOString()
        : '';
      const response = await fetch('/api/local-signals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          category: localSignalDraft.category,
          venueName: localSignalDraft.venueName.trim(),
          city: localSignalDraft.city.trim(),
          startsAt,
          notes: localSignalDraft.notes.trim(),
          latitude: source?.latitude ?? null,
          longitude: source?.longitude ?? null,
          submittedBy: address || '',
        }),
      });
      const payload = await response.json();

      if (!response.ok || !payload.success) {
        throw new Error(payload.error || 'Failed to submit local signal');
      }

      setLocalSignalDraft({
        title: '',
        category: 'other',
        venueName: '',
        city: '',
        startsAt: '',
        notes: '',
      });
      setLocalSignalSubmitState({
        type: 'success',
        message: 'Signal submitted for review. Approved tips will appear on the map.',
      });
      triggerHaptic('success');
    } catch (error) {
      setLocalSignalSubmitState({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to submit local signal',
      });
      triggerHaptic('warning');
    } finally {
      setLocalSignalSubmitting(false);
    }
  }, [address, localSignalDraft, userLocation, viewportCenter]);

  useEffect(() => {
    const source = userLocation ?? viewportCenter;
    if (!source) {
      return;
    }

    scheduleMapSideDataFetch(source.latitude, source.longitude, mapZoom);
  }, [mapZoom, scheduleMapSideDataFetch, userLocation, viewportCenter]);

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
      if (!isUsableMapCoordinate(latitude, longitude)) {
        return;
      }

      setViewportCenter((current) => {
        if (!current) {
          return { latitude, longitude };
        }

        const movedEnough = isMobileViewport
          ? Math.abs(current.latitude - latitude) >= 0.00005 ||
            Math.abs(current.longitude - longitude) >= 0.00005
          : calculateDistanceMeters(current.latitude, current.longitude, latitude, longitude) >= 180;

        if (!movedEnough) {
          return current;
        }

        return { latitude, longitude };
      });
      setMapZoom((current) => (Math.abs(current - zoom) < 0.01 ? current : zoom));
      scheduleNearbyPlaceFetch(latitude, longitude, zoom);
    },
    [isMobileViewport, scheduleNearbyPlaceFetch]
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

  const getPrivateSpotLandmark = useCallback(
    (latitude: number, longitude: number, fallbackName?: string | null) => {
      const explicitName = fallbackName?.trim();
      if (explicitName && explicitName.toLowerCase() !== 'dropped pin') {
        return explicitName;
      }

      const nearest = nearbyPlaces
        .map((place) => ({
          place,
          distanceKm: calculateDistance(latitude, longitude, place.latitude, place.longitude),
        }))
        .sort((a, b) => a.distanceKm - b.distanceKm)[0];

      if (nearest && nearest.distanceKm <= 0.25) {
        return nearest.place.name;
      }

      return formatCoordinateLabel(latitude, longitude);
    },
    [nearbyPlaces]
  );

  const openSaveSpotDraft = useCallback(
    (source?: SelectedPlace | null) => {
      const map = mapInstanceRef.current;
      const mapCenter = map?.getCenter();
      const latitude = source?.latitude ?? userLocation?.latitude ?? mapCenter?.lat ?? viewportCenter?.latitude ?? DEFAULT_CENTER[0];
      const longitude = source?.longitude ?? userLocation?.longitude ?? mapCenter?.lng ?? viewportCenter?.longitude ?? DEFAULT_CENTER[1];
      const landmark = getPrivateSpotLandmark(latitude, longitude, source?.name ?? null);

      triggerHaptic('selection');
      setSaveSpotDraft({
        label: 'Bike',
        note: '',
        latitude,
        longitude,
        landmark,
        photoDataUrl: null,
        corrected: false,
      });
      setSaveSpotState({
        type: 'info',
        message: 'Add a quick photo. Drag the private pin if GPS needs a tiny correction.',
      });
      setSelectedPlace({
        name: 'Save spot',
        address: `Private pin · ${landmark}`,
        latitude,
        longitude,
        placeSource: 'PRIVATE_SAVE_SPOT',
        mapModes: DEFAULT_VENUE_MAP_MODES,
      });
      setTargetCenter([latitude, longitude]);
      setTargetZoom(Math.max(Math.round(mapZoom), 16));
      setSelectedPlacePanelExpanded(true);
      setNearbyDarePanelCollapsed(true);
    },
    [getPrivateSpotLandmark, mapZoom, userLocation, viewportCenter]
  );

  const handleSaveSpotPhotoChange = useCallback(async (file: File | null) => {
    if (!file) return;

    try {
      setSaveSpotPhotoLoading(true);
      const photoDataUrl = await readPrivateSpotPhoto(file);
      setSaveSpotDraft((current) => (current ? { ...current, photoDataUrl } : current));
      setSaveSpotState({
        type: 'info',
        message: 'Photo attached. Save when the pin looks right.',
      });
      triggerHaptic('success');
    } catch (error) {
      console.error('[REAL_WORLD_MAP] Save spot photo failed:', error);
      setSaveSpotState({ type: 'error', message: 'Could not attach that photo.' });
      triggerHaptic('warning');
    } finally {
      setSaveSpotPhotoLoading(false);
      if (saveSpotPhotoInputRef.current) {
        saveSpotPhotoInputRef.current.value = '';
      }
    }
  }, []);

  const handlePrivateSpotDragEnd = useCallback(
    (latitude: number, longitude: number) => {
      setSaveSpotDraft((current) =>
        current
          ? {
              ...current,
              latitude,
              longitude,
              landmark: getPrivateSpotLandmark(latitude, longitude, null),
              corrected: true,
            }
          : current
      );
      setSelectedPlace((current) =>
        current?.placeSource === 'PRIVATE_SAVE_SPOT'
          ? {
              ...current,
              latitude,
              longitude,
              address: `Private pin · ${formatCoordinateLabel(latitude, longitude)}`,
            }
          : current
      );
      setSaveSpotState({ type: 'info', message: 'Pin corrected. Save the spot when it looks right.' });
    },
    [getPrivateSpotLandmark]
  );

  const handleSavePrivateSpot = useCallback(() => {
    if (!saveSpotDraft) return;

    const now = new Date().toISOString();
    const nextSpot: PrivateMapSpot = {
      id: createPrivateMapSpotId(),
      label: saveSpotDraft.label.trim() || 'Spot',
      note: saveSpotDraft.note.trim(),
      latitude: saveSpotDraft.latitude,
      longitude: saveSpotDraft.longitude,
      landmark: saveSpotDraft.landmark,
      photoDataUrl: saveSpotDraft.photoDataUrl,
      corrected: saveSpotDraft.corrected,
      createdAt: now,
      updatedAt: now,
    };
    const nextSpots = [nextSpot, ...privateMapSpots.filter((spot) => spot.id !== nextSpot.id)].slice(
      0,
      PRIVATE_MAP_SPOT_LIMIT
    );

    setPrivateMapSpots(nextSpots);
    persistPrivateMapSpots(nextSpots);
    setSaveSpotDraft(null);
    setSaveSpotState({ type: 'success', message: `${nextSpot.label} saved privately on this device.` });
    setSelectedPlace({
      name: nextSpot.label,
      address: `Private spot · ${nextSpot.landmark ?? formatCoordinateLabel(nextSpot.latitude, nextSpot.longitude)}`,
      latitude: nextSpot.latitude,
      longitude: nextSpot.longitude,
      placeSource: 'PRIVATE_SAVED_SPOT',
      externalPlaceId: `private:${nextSpot.id}`,
      mapModes: DEFAULT_VENUE_MAP_MODES,
    });
    setTargetCenter([nextSpot.latitude, nextSpot.longitude]);
    setTargetZoom(17);
    triggerHaptic('success');
  }, [privateMapSpots, saveSpotDraft]);

  const focusPrivateSpot = useCallback((spot: PrivateMapSpot) => {
    triggerHaptic('selection');
    setSaveSpotDraft(null);
    setSaveSpotState(null);
    setSelectedPlace({
      name: spot.label,
      address: `Private spot · ${spot.landmark ?? formatCoordinateLabel(spot.latitude, spot.longitude)}`,
      latitude: spot.latitude,
      longitude: spot.longitude,
      placeSource: 'PRIVATE_SAVED_SPOT',
      externalPlaceId: `private:${spot.id}`,
      mapModes: DEFAULT_VENUE_MAP_MODES,
    });
    setTargetCenter([spot.latitude, spot.longitude]);
    setTargetZoom(17);
    setSelectedPlacePanelExpanded(true);
  }, []);

  const deletePrivateSpot = useCallback(
    (spotId: string) => {
      const nextSpots = privateMapSpots.filter((spot) => spot.id !== spotId);
      setPrivateMapSpots(nextSpots);
      persistPrivateMapSpots(nextSpots);
      setSelectedPlace((current) =>
        current?.placeSource === 'PRIVATE_SAVED_SPOT' && current.externalPlaceId === `private:${spotId}`
          ? null
          : current
      );
      triggerHaptic('selection');
    },
    [privateMapSpots]
  );

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

    if (!browserCanStartMapRenderer()) {
      setMapReady(false);
      setMapRuntimeError(
        'This browser could not start the 3D map renderer. Enable hardware acceleration, reload the grid, or open BaseDare in another browser.'
      );
      return undefined;
    }

    let cancelled = false;
    let cleanupMap: (() => void) | null = null;
    const markerRegistry = mapMarkersRef.current;

    const clearMapInteractionQuietTimer = () => {
      if (mapInteractionQuietTimerRef.current === null) return;
      window.clearTimeout(mapInteractionQuietTimerRef.current);
      mapInteractionQuietTimerRef.current = null;
    };

    // data-map-moving drives the gesture calm-down CSS (pause marker animations,
    // hide crosshair/badges). Toggled imperatively on the wrapper instead of via
    // React state: a state flip here re-rendered the entire component at gesture
    // start/end, which itself read as flicker on desktop Chrome.
    const setMapMovingAttribute = (moving: boolean) => {
      const node = mapViewportRef.current;
      if (!node) return;
      if (moving) {
        node.setAttribute('data-map-moving', 'true');
      } else {
        node.removeAttribute('data-map-moving');
      }
    };

    const isMobileRenderer = window.matchMedia('(max-width: 767px)').matches;
    const isDesktopChromiumRenderer = isDesktopChromiumMapRenderer(isMobileRenderer);
    const initialCamera = getDefaultMapCamera(isMobileRenderer);
    const stablePixelRatio = getStableMapPixelRatio(isMobileRenderer);
    const startMap = async () => {
      const mapStyle = await loadOpenFreeMapStyle();
      if (cancelled) return;

      let map: MapLibreMap;
      try {
        map = new maplibregl.Map({
          container,
          style: mapStyle,
          center: [DEFAULT_CENTER[1], DEFAULT_CENTER[0]],
          zoom: DEFAULT_ZOOM,
          pitch: initialCamera.pitch,
          bearing: initialCamera.bearing,
          attributionControl: { compact: true },
          dragRotate: true,
          touchZoomRotate: true,
          // Desktop Chromium is the problem renderer here. Crossfaded tiles add
          // another transient WebGL layer, which makes Chrome more likely to
          // present stale tile regions while the page composites.
          // Desktop Chromium: a short tile crossfade so zoom-level swaps don't
          // hard-pop (reads as flicker). Set to 0 to A/B the old behavior.
          fadeDuration: isMobileRenderer ? 0 : isDesktopChromiumRenderer ? DESKTOP_CHROMIUM_TILE_FADE_MS : 150,
          maxPitch: isMobileRenderer ? MAX_MOBILE_MAP_PITCH : MAX_DESKTOP_MAP_PITCH,
          pixelRatio: stablePixelRatio,
          trackResize: false,
          // Opaque WebGL context. Without alpha:false the canvas composites
          // against the page every repaint (which only happens during pan/zoom),
          // which Chrome desktop renders as flicker. The map is fully opaque
          // anyway (base layer, z-0), so nothing shows through.
          canvasContextAttributes: {
            alpha: false,
            premultipliedAlpha: false,
            antialias: false,
            preserveDrawingBuffer: false,
            failIfMajorPerformanceCaveat: false,
            powerPreference: isDesktopChromiumRenderer ? 'high-performance' : 'default',
          },
        });
      } catch (error) {
        const message = getMapStartupErrorMessage(error);
        console.error('[REAL_WORLD_MAP] MapLibre startup failed:', error);
        setMapReady(false);
        setMapRuntimeError(`Map renderer could not start. ${message}`);
        return;
      }

      if (cancelled) {
        map.remove();
        return;
      }

      mapInstanceRef.current = map;
      if (isDesktopChromiumRenderer) {
        map.repaint = true;
      }
      map.dragRotate.enable();
      map.touchZoomRotate.enableRotation();

      const syncViewport = () => {
        const center = map.getCenter();
        const nextBearing = map.getBearing();
        const nextPitch = map.getPitch();
        setMapBearing((current) => (Math.abs(current - nextBearing) < 0.05 ? current : nextBearing));
        setMapPitch((current) => (Math.abs(current - nextPitch) < 0.05 ? current : nextPitch));
        const zoom = map.getZoom();
        // Zoom band drives label declutter via CSS only (no re-render): far =
        // bears + lit pins speak; mid = lit/warm labels; near = everything.
        // Updated on moveend/load, never per-frame.
        const band = zoom < 14.2 ? 'far' : zoom < 15.8 ? 'mid' : 'near';
        const viewportNode = mapViewportRef.current;
        if (viewportNode && viewportNode.getAttribute('data-zoom-band') !== band) {
          viewportNode.setAttribute('data-zoom-band', band);
        }
        handleViewportChangeRef.current(center.lat, center.lng, zoom);
      };

      let loadHandled = false;
      let styleLayerFrame: number | null = null;

      const ensureStyleLayersSoon = () => {
        if (hasMapLibreDareLayerBundle(map)) return;
        if (styleLayerFrame !== null) return;
        styleLayerFrame = window.requestAnimationFrame(() => {
          styleLayerFrame = null;
          if (cancelled || mapInstanceRef.current !== map || !map.isStyleLoaded()) return;
          if (hasMapLibreDareLayerBundle(map)) return;
          ensureMapLibreDareLayers(map, mapPresetRef.current);
        });
      };

      const handleLoad = () => {
        if (loadHandled) return;
        loadHandled = true;
        ensureMapLibreDareLayers(map, mapPresetRef.current, { tuneBaseStyle: true });
        syncViewport();
        setMapRuntimeError(null);
        setMapReady(true);
      };

      const handleStyleData = () => {
        if (hasMapLibreDareLayerBundle(map)) return;
        ensureStyleLayersSoon();
      };

      const handleMapMotionStart = (event?: { originalEvent?: unknown }) => {
        if (event?.originalEvent) {
          setTargetCenter(null);
          setTargetZoom(null);
          lastTargetCameraKeyRef.current = null;
        }

        clearMapInteractionQuietTimer();
        setMapMovingAttribute(true);

        if (!isMobileRenderer) {
          markDesktopMapSettling(540);
          return;
        }
      };

      const handleMapMotionSettled = () => {
        clearMapInteractionQuietTimer();

        if (!isMobileRenderer) {
          markDesktopMapSettling(260);
          mapInteractionQuietTimerRef.current = window.setTimeout(() => {
            setMapMovingAttribute(false);
            mapInteractionQuietTimerRef.current = null;
          }, 180);
          return;
        }

        mapInteractionQuietTimerRef.current = window.setTimeout(() => {
          setMapMovingAttribute(false);
          mapInteractionQuietTimerRef.current = null;
        }, 140);
      };

      const handleClick = (event: maplibregl.MapMouseEvent) => {
        const clickTarget = event.originalEvent?.target;
        if (
          clickTarget instanceof Element &&
          clickTarget.closest('.basedare-maplibre-marker, .maplibregl-marker')
        ) {
          return;
        }

        if (skipNextMapClickRef.current) {
          skipNextMapClickRef.current = false;
          if (skipNextMapClickClearTimerRef.current !== null) {
            window.clearTimeout(skipNextMapClickClearTimerRef.current);
            skipNextMapClickClearTimerRef.current = null;
          }
          return;
        }

        handleMapClickRef.current(event.lngLat.lat, event.lngLat.lng);
      };

      const handleMapError = (event: { error?: unknown; message?: string }) => {
        const error = event.error;
        const message =
          error instanceof Error
            ? error.message
            : typeof event.message === 'string'
              ? event.message
              : typeof error === 'string'
                ? error
                : '';

        if (/webgl|context|gpu|canvas/i.test(message)) {
          setMapRuntimeError('Map renderer reset. Reload the grid to recover.');
          console.error('[REAL_WORLD_MAP] MapLibre renderer error:', message);
        }
      };

      const missingStyleImages = new Set<string>();
      const handleStyleImageMissing = (event: { id?: string }) => {
        const imageId = event.id;
        if (!imageId || missingStyleImages.has(imageId) || map.hasImage(imageId)) return;

        missingStyleImages.add(imageId);
        try {
          map.addImage(
            imageId,
            {
              width: 1,
              height: 1,
              data: new Uint8Array([0, 0, 0, 0]),
            } as Parameters<MapLibreMap['addImage']>[1]
          );
        } catch {
          // Some base-map POI sprites are optional. A transparent pixel keeps MapLibre quiet.
        }
      };

      const canvas = map.getCanvas();
      const handleContextLost = (event: Event) => {
        event.preventDefault();
        setMapReady(false);
        setMapRuntimeError('Map renderer paused. Reload the grid to recover.');
      };
      const handleContextRestored = () => {
        setMapRuntimeError(null);
        map.resize();
        setMapReady(true);
      };

      map.on('load', handleLoad);
      map.on('style.load', handleLoad);
      map.on('styledata', handleStyleData);
      map.on('movestart', handleMapMotionStart);
      map.on('dragstart', handleMapMotionStart);
      map.on('zoomstart', handleMapMotionStart);
      map.on('rotatestart', handleMapMotionStart);
      map.on('pitchstart', handleMapMotionStart);
      map.on('moveend', syncViewport);
      map.on('moveend', handleMapMotionSettled);
      map.on('idle', handleMapMotionSettled);
      map.on('click', handleClick);
      map.on('error', handleMapError);
      map.on('styleimagemissing', handleStyleImageMissing);
      canvas.addEventListener('webglcontextlost', handleContextLost, false);
      canvas.addEventListener('webglcontextrestored', handleContextRestored, false);

      if (map.loaded() || map.isStyleLoaded()) {
        window.requestAnimationFrame(() => {
          if (!cancelled && mapInstanceRef.current === map) {
            handleLoad();
          }
        });
      }

      cleanupMap = () => {
        clearMapInteractionQuietTimer();
        if (desktopMapSettlingTimerRef.current !== null) {
          window.clearTimeout(desktopMapSettlingTimerRef.current);
          desktopMapSettlingTimerRef.current = null;
        }
        if (desktopNearbyFetchTimerRef.current !== null) {
          window.clearTimeout(desktopNearbyFetchTimerRef.current);
          desktopNearbyFetchTimerRef.current = null;
        }
        if (desktopSideDataFetchTimerRef.current !== null) {
          window.clearTimeout(desktopSideDataFetchTimerRef.current);
          desktopSideDataFetchTimerRef.current = null;
        }
        if (deferredMarkerCleanupTimerRef.current !== null) {
          window.clearTimeout(deferredMarkerCleanupTimerRef.current);
          deferredMarkerCleanupTimerRef.current = null;
        }
        desktopMapSettlingRef.current = false;
        if (styleLayerFrame !== null) {
          window.cancelAnimationFrame(styleLayerFrame);
          styleLayerFrame = null;
        }
        map.off('load', handleLoad);
        map.off('style.load', handleLoad);
        map.off('styledata', handleStyleData);
        map.off('movestart', handleMapMotionStart);
        map.off('dragstart', handleMapMotionStart);
        map.off('zoomstart', handleMapMotionStart);
        map.off('rotatestart', handleMapMotionStart);
        map.off('pitchstart', handleMapMotionStart);
        map.off('moveend', syncViewport);
        map.off('moveend', handleMapMotionSettled);
        map.off('idle', handleMapMotionSettled);
        map.off('click', handleClick);
        map.off('error', handleMapError);
        map.off('styleimagemissing', handleStyleImageMissing);
        canvas.removeEventListener('webglcontextlost', handleContextLost, false);
        canvas.removeEventListener('webglcontextrestored', handleContextRestored, false);
        markerRegistry.forEach(({ marker }) => marker.remove());
        markerRegistry.clear();
        map.remove();
        if (mapInstanceRef.current === map) {
          mapInstanceRef.current = null;
        }
        setMapReady(false);
        setMapMovingAttribute(false);
      };
    };

    void startMap();

    return () => {
      cancelled = true;
      clearMapInteractionQuietTimer();
      cleanupMap?.();
      cleanupMap = null;
      setMapReady(false);
      setMapMovingAttribute(false);
    };
  }, [markDesktopMapSettling]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapReady) return;

    ensureMapLibreDareLayers(map, mapPreset, { tuneBaseStyle: true });
  }, [mapPreset, mapReady]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapReady || !targetCenter) return;
    const selectedOffsetMode = selectedPlaceIdentity ? 'selected' : 'free';
    const targetCameraKey = [
      targetCenter[0].toFixed(5),
      targetCenter[1].toFixed(5),
      targetZoom ?? 'current',
      isMobileViewport ? 'mobile' : 'desktop',
      isMobileViewport && isImmersiveMobile ? (selectedPlacePanelExpanded ? 'expanded' : 'peek') : selectedOffsetMode,
    ].join(':');

    if (lastTargetCameraKeyRef.current === targetCameraKey) {
      return;
    }

    lastTargetCameraKeyRef.current = targetCameraKey;
    const targetCamera = getDefaultMapCamera(isMobileViewport);
    const targetOffset = isMobileViewport
      ? ([
          0,
          isImmersiveMobile
            ? selectedPlacePanelExpanded
              ? -170
              : -118
            : -96,
        ] as [number, number])
      : undefined;

    if (!isMobileViewport) {
      markDesktopMapSettling(520);
      map.stop();
      map.jumpTo({
        center: [targetCenter[1], targetCenter[0]],
        zoom: targetZoom ?? map.getZoom(),
        pitch: targetCamera.pitch,
        bearing: map.getBearing(),
      });
      return;
    }

    map.stop();
    map.flyTo({
      center: [targetCenter[1], targetCenter[0]],
      zoom: targetZoom ?? map.getZoom(),
      pitch: targetCamera.pitch,
      bearing: map.getBearing(),
      duration: 900,
      essential: true,
      ...(targetOffset
        ? { offset: targetOffset }
        : !isMobileViewport && selectedPlaceIdentity
          ? { offset: [-236, 0] as [number, number] }
          : {}),
    });
  }, [
    isImmersiveMobile,
    isMobileViewport,
    mapReady,
    selectedPlaceIdentity,
    selectedPlacePanelExpanded,
    targetCenter,
    targetZoom,
    markDesktopMapSettling,
  ]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    const container = mapViewportRef.current;
    if (!map || !mapReady || !container) return undefined;

    let resizeFrame: number | null = null;
    let lastSize: { width: number; height: number } | null = null;

    const resizeMap = () => {
      if (resizeFrame !== null) return;

      resizeFrame = window.requestAnimationFrame(() => {
        resizeFrame = null;
        if (mapInstanceRef.current !== map) return;

        const bounds = container.getBoundingClientRect();
        const nextSize = {
          width: Math.round(bounds.width),
          height: Math.round(bounds.height),
        };

        if (
          lastSize &&
          Math.abs(lastSize.width - nextSize.width) < 2 &&
          Math.abs(lastSize.height - nextSize.height) < 2
        ) {
          map.triggerRepaint();
          return;
        }

        lastSize = nextSize;
        map.resize();
        map.triggerRepaint();
      });
    };

    resizeMap();
    const settleTimeoutId = window.setTimeout(resizeMap, 320);
    const resizeObserver = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resizeMap) : null;
    resizeObserver?.observe(container);
    window.addEventListener('resize', resizeMap);
    window.addEventListener('scroll', resizeMap, { passive: true });
    window.addEventListener('orientationchange', resizeMap);
    window.visualViewport?.addEventListener('resize', resizeMap);
    window.visualViewport?.addEventListener('scroll', resizeMap);

    return () => {
      if (resizeFrame !== null) {
        window.cancelAnimationFrame(resizeFrame);
      }
      window.clearTimeout(settleTimeoutId);
      resizeObserver?.disconnect();
      window.removeEventListener('resize', resizeMap);
      window.removeEventListener('scroll', resizeMap);
      window.removeEventListener('orientationchange', resizeMap);
      window.visualViewport?.removeEventListener('resize', resizeMap);
      window.visualViewport?.removeEventListener('scroll', resizeMap);
    };
  }, [mapReady]);

  const focusExistingPlace = useCallback((place: NearbyPlace) => {
    triggerHaptic('selection');
    if (!isMobileViewport) {
      markDesktopMapSettling(620);
    }
    setSelectedPlace({
      placeId: place.id,
      slug: place.slug,
      handle: place.handle,
      baseCashEnabled: place.baseCashEnabled,
      name: place.name,
      description: place.description,
      address: [place.city, place.country].filter(Boolean).join(', ') || place.description,
      city: place.city,
      country: place.country,
      latitude: place.latitude,
      longitude: place.longitude,
      categories: place.categories,
      approvedCount: place.tagSummary.approvedCount,
      heatScore: place.tagSummary.heatScore,
      lastTaggedAt: place.tagSummary.lastTaggedAt,
      reviewSignal: place.reviewSignal,
      activeDareCount: place.activeDareCount,
      checkInCount: place.checkInCount,
      commandCenter: place.commandCenter,
      mapModes: place.mapModes ?? DEFAULT_VENUE_MAP_MODES,
      profile: place.profile,
    });
    setTargetCenter([place.latitude, place.longitude]);
    setTargetZoom(15);
  }, [isMobileViewport, markDesktopMapSettling]);

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
            handle: venue.handle,
            baseCashEnabled: venue.baseCashEnabled,
            name: venue.name,
            description: venue.description,
            address: venue.address,
            city: venue.city,
            country: venue.country,
            latitude: venue.latitude,
            longitude: venue.longitude,
            categories: venue.categories,
            approvedCount: venue.tagSummary.approvedCount,
            heatScore: venue.tagSummary.heatScore,
            lastTaggedAt: venue.tagSummary.lastTaggedAt,
            reviewSignal: venue.reviewSignal,
            activeDareCount: venue.activeDares.length,
            checkInCount: venue.checkInCount,
            commandCenter: venue.commandCenter,
            mapModes: venue.mapModes,
            profile: venue.profile,
            checkInRadiusMeters: venue.checkInRadiusMeters,
            memorySummary: venue.memorySummary,
            liveSession: venue.liveSession,
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
          throw new Error('Failed to load place proof');
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
                title: 'First proof approved',
                body: `${current.name} just got its first approved proof.`,
              });
            } else {
              setCeremonyState({
                kind: 'alive-upgrade',
                title: 'Proof approved',
                body: `${current.name} just added a new verified proof.`,
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
        setSelectedPlaceTagsError('Unable to load recent proof right now.');
      } finally {
        if (!signal?.aborted && !silent) {
          setSelectedPlaceTagsLoading(false);
        }
      }
    },
    []
  );

  const applyVenueRoomSnapshot = useCallback((snapshot: VenueRoomSnapshot) => {
    setVenueRoomAccess(snapshot.access);
    setVenueRoomMessages(snapshot.messages);
    setVenueRoomWhoHere(snapshot.whoHere);
    setVenueRoomVisible(snapshot.viewer.visible);
  }, []);

  const loadSelectedVenueRoom = useCallback(
    async (slug: string, signal?: AbortSignal, options?: { silent?: boolean }) => {
      const silent = options?.silent ?? false;

      try {
        if (!silent) {
          setVenueRoomLoading(true);
        }
        setVenueRoomState(null);

        const params = new URLSearchParams({ limit: '20' });
        if (address) {
          params.set('walletAddress', address);
        }
        if (userLocation) {
          params.set('lat', String(userLocation.latitude));
          params.set('lng', String(userLocation.longitude));
        }

        const headers = address
          ? await buildWalletActionAuthHeaders({
              walletAddress: address,
              action: 'venue-room:read',
              resource: `venue:${slug}:room`,
              allowSignPrompt: false,
              signMessageAsync,
            })
          : {};

        const response = await fetch(`/api/venues/${encodeURIComponent(slug)}/room?${params.toString()}`, {
          headers,
          signal,
        });
        const payload = (await response.json().catch(() => null)) as VenueRoomResponse | null;

        if (!response.ok || !payload?.success || !payload.data) {
          throw new Error(payload?.error || 'Unable to load venue room');
        }

        applyVenueRoomSnapshot(payload.data);
      } catch (error) {
        if (signal?.aborted) {
          return;
        }

        console.error('[REAL_WORLD_MAP] Venue room failed:', error);
        setVenueRoomAccess(null);
        setVenueRoomMessages([]);
        setVenueRoomWhoHere([]);
        setVenueRoomVisible(false);
        setVenueRoomState({ type: 'error', message: 'Room unavailable right now.' });
      } finally {
        if (!signal?.aborted && !silent) {
          setVenueRoomLoading(false);
        }
      }
    },
    [address, applyVenueRoomSnapshot, signMessageAsync, userLocation]
  );

  const loadSelectedSpotVault = useCallback(
    async (slug: string, signal?: AbortSignal, options?: { silent?: boolean }) => {
      const silent = options?.silent ?? false;

      try {
        if (!silent) {
          setSpotVaultLoading(true);
        }
        setSpotVaultError(null);

        const params = new URLSearchParams({ limit: '14' });
        if (address) {
          params.set('walletAddress', address);
        }

        const headers = address
          ? await buildWalletActionAuthHeaders({
              walletAddress: address,
              action: 'spot-vault:read',
              resource: `venue:${slug}:vault`,
              allowSignPrompt: false,
              signMessageAsync,
            })
          : {};

        const response = await fetch(`/api/venues/${encodeURIComponent(slug)}/vault?${params.toString()}`, {
          headers,
          signal,
        });
        const payload = (await response.json().catch(() => null)) as SpotVaultResponse | null;

        if (!response.ok || !payload?.success || !payload.data) {
          throw new Error(payload?.error || 'Unable to load spot vault');
        }

        setSpotVault(payload.data);
        setSpotVaultReviewVerdict(payload.data.reviews.mine?.verdict ?? 'worth_it');
        setSpotVaultReviewNote(payload.data.reviews.mine?.note ?? '');
      } catch (error) {
        if (signal?.aborted) {
          return;
        }

        console.error('[REAL_WORLD_MAP] Spot vault failed:', error);
        setSpotVault(null);
        setSpotVaultError('Vault unavailable right now.');
      } finally {
        if (!signal?.aborted && !silent) {
          setSpotVaultLoading(false);
        }
      }
    },
    [address, signMessageAsync]
  );

  const handleSubmitSpotVaultReview = useCallback(async () => {
    const slug = selectedPlace?.slug;

    if (!slug || spotVaultReviewSubmitting) {
      return;
    }

    if (!address || !isConnected) {
      setSpotVaultReviewState({ type: 'error', message: 'Connect your wallet to leave vault signal.' });
      triggerHaptic('warning');
      return;
    }

    if (!spotVault?.viewer.canLeaveSignal) {
      setSpotVaultReviewState({ type: 'error', message: 'Check in here before writing to the vault.' });
      triggerHaptic('warning');
      return;
    }

    setSpotVaultReviewSubmitting(true);
    setSpotVaultReviewState(null);

    try {
      const headers = await buildWalletActionAuthHeaders({
        walletAddress: address,
        action: 'spot-vault:review',
        resource: `venue:${slug}:reviews`,
        allowSignPrompt: true,
        signMessageAsync,
      });

      const response = await fetch(`/api/venues/${encodeURIComponent(slug)}/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: JSON.stringify({
          walletAddress: address,
          verdict: spotVaultReviewVerdict,
          note: spotVaultReviewNote,
        }),
      });
      const payload = (await response.json().catch(() => null)) as SpotVaultResponse | null;

      if (!response.ok || !payload?.success || !payload.data) {
        throw new Error(payload?.error || 'Unable to save vault review');
      }

      setSpotVault(payload.data);
      setSpotVaultReviewVerdict(payload.data.reviews.mine?.verdict ?? spotVaultReviewVerdict);
      setSpotVaultReviewNote(payload.data.reviews.mine?.note ?? '');
      setSpotVaultReviewState({ type: 'info', message: 'Vault signal saved.' });
      triggerHaptic('success');
    } catch (error) {
      setSpotVaultReviewState({
        type: 'error',
        message: error instanceof Error ? error.message : 'Unable to save vault review.',
      });
      triggerHaptic('warning');
    } finally {
      setSpotVaultReviewSubmitting(false);
    }
  }, [
    address,
    isConnected,
    selectedPlace?.slug,
    signMessageAsync,
    spotVault?.viewer.canLeaveSignal,
    spotVaultReviewNote,
    spotVaultReviewSubmitting,
    spotVaultReviewVerdict,
  ]);

  const handleRetractSpotVaultReview = useCallback(async () => {
    const slug = selectedPlace?.slug;

    if (!slug || spotVaultReviewSubmitting) {
      return;
    }

    if (!address || !isConnected) {
      setSpotVaultReviewState({ type: 'error', message: 'Connect your wallet to retract vault signal.' });
      triggerHaptic('warning');
      return;
    }

    setSpotVaultReviewSubmitting(true);
    setSpotVaultReviewState(null);

    try {
      const headers = await buildWalletActionAuthHeaders({
        walletAddress: address,
        action: 'spot-vault:review',
        resource: `venue:${slug}:reviews`,
        allowSignPrompt: true,
        signMessageAsync,
      });

      const response = await fetch(`/api/venues/${encodeURIComponent(slug)}/reviews`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: JSON.stringify({
          walletAddress: address,
        }),
      });
      const payload = (await response.json().catch(() => null)) as SpotVaultResponse | null;

      if (!response.ok || !payload?.success || !payload.data) {
        throw new Error(payload?.error || 'Unable to retract vault review');
      }

      setSpotVault(payload.data);
      setSpotVaultReviewVerdict('worth_it');
      setSpotVaultReviewNote('');
      setSpotVaultReviewState({ type: 'info', message: 'Vault signal retracted.' });
      triggerHaptic('success');
    } catch (error) {
      setSpotVaultReviewState({
        type: 'error',
        message: error instanceof Error ? error.message : 'Unable to retract vault review.',
      });
      triggerHaptic('warning');
    } finally {
      setSpotVaultReviewSubmitting(false);
    }
  }, [address, isConnected, selectedPlace?.slug, signMessageAsync, spotVaultReviewSubmitting]);

  const handleReportSpotVaultReview = useCallback(
    async (reviewId: string, reason: 'spam' | 'abuse' | 'inaccurate' = 'inaccurate') => {
      const slug = selectedPlace?.slug;

      if (!slug || spotVaultReviewReportingId) {
        return;
      }

      if (!address || !isConnected) {
        setSpotVaultReviewState({ type: 'error', message: 'Connect your wallet to flag vault signal.' });
        triggerHaptic('warning');
        return;
      }

      setSpotVaultReviewReportingId(reviewId);
      setSpotVaultReviewState(null);

      try {
        const headers = await buildWalletActionAuthHeaders({
          walletAddress: address,
          action: 'spot-vault:review-report',
          resource: `venue:${slug}:reviews:${reviewId}`,
          allowSignPrompt: true,
          signMessageAsync,
        });

        const response = await fetch(
          `/api/venues/${encodeURIComponent(slug)}/reviews/${encodeURIComponent(reviewId)}/report`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...headers,
            },
            body: JSON.stringify({
              walletAddress: address,
              reason,
            }),
          }
        );
        const payload = (await response.json().catch(() => null)) as SpotVaultResponse | null;

        if (!response.ok || !payload?.success || !payload.data) {
          throw new Error(payload?.error || 'Unable to flag vault signal');
        }

        setSpotVault(payload.data);
        setSpotVaultReviewState({ type: 'info', message: 'Signal flagged for Sentinel review.' });
        triggerHaptic('success');
      } catch (error) {
        setSpotVaultReviewState({
          type: 'error',
          message: error instanceof Error ? error.message : 'Unable to flag vault signal.',
        });
        triggerHaptic('warning');
      } finally {
        setSpotVaultReviewReportingId(null);
      }
    },
    [address, isConnected, selectedPlace?.slug, signMessageAsync, spotVaultReviewReportingId]
  );

  const handlePostVenueRoomMessage = useCallback(async () => {
    const slug = selectedPlace?.slug;
    const body = venueRoomDraft.trim();

    if (!slug || venueRoomSending) {
      return;
    }

    if (!address || !isConnected) {
      setVenueRoomState({ type: 'error', message: 'Connect your wallet to post in this room.' });
      triggerHaptic('warning');
      return;
    }

    if (!body) {
      setVenueRoomState({ type: 'error', message: 'Write something before posting.' });
      triggerHaptic('warning');
      return;
    }

    setVenueRoomSending(true);
    setVenueRoomState(null);

    try {
      const headers = await buildWalletActionAuthHeaders({
        walletAddress: address,
        action: 'venue-room:post',
        resource: `venue:${slug}:room`,
        allowSignPrompt: true,
        signMessageAsync,
      });

      const response = await fetch(`/api/venues/${encodeURIComponent(slug)}/room`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: JSON.stringify({
          walletAddress: address,
          body,
          lat: userLocation?.latitude,
          lng: userLocation?.longitude,
          showInWhoHere: venueRoomVisible,
        }),
      });
      const payload = (await response.json().catch(() => null)) as VenueRoomResponse | null;

      if (!response.ok || !payload?.success || !payload.data) {
        throw new Error(payload?.error || 'Unable to post in this venue room');
      }

      applyVenueRoomSnapshot(payload.data);
      setVenueRoomDraft('');
      setVenueRoomExpanded(true);
      setVenueRoomState({ type: 'info', message: `Posted. Room messages expire in ${payload.data.access.ttlHours}h.` });
      triggerHaptic('success');
    } catch (error) {
      setVenueRoomState({
        type: 'error',
        message: error instanceof Error ? error.message : 'Unable to post in this venue room.',
      });
      triggerHaptic('warning');
    } finally {
      setVenueRoomSending(false);
    }
  }, [
    address,
    applyVenueRoomSnapshot,
    isConnected,
    selectedPlace?.slug,
    signMessageAsync,
    userLocation,
    venueRoomDraft,
    venueRoomSending,
    venueRoomVisible,
  ]);

  const handleToggleVenueRoomVisibility = useCallback(async () => {
    const slug = selectedPlace?.slug;
    const nextVisible = !venueRoomVisible;

    if (!slug || venueRoomPresenceUpdating) {
      return;
    }

    if (!address || !isConnected) {
      setVenueRoomState({ type: 'error', message: 'Connect your wallet to show up here.' });
      triggerHaptic('warning');
      return;
    }

    setVenueRoomPresenceUpdating(true);
    setVenueRoomState(null);

    try {
      const headers = await buildWalletActionAuthHeaders({
        walletAddress: address,
        action: 'venue-room:presence',
        resource: `venue:${slug}:room`,
        allowSignPrompt: true,
        signMessageAsync,
      });

      const response = await fetch(`/api/venues/${encodeURIComponent(slug)}/room/presence`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: JSON.stringify({
          walletAddress: address,
          visible: nextVisible,
          lat: userLocation?.latitude,
          lng: userLocation?.longitude,
        }),
      });
      const payload = (await response.json().catch(() => null)) as VenueRoomResponse | null;

      if (!response.ok || !payload?.success || !payload.data) {
        throw new Error(payload?.error || 'Unable to update room visibility');
      }

      applyVenueRoomSnapshot(payload.data);
      setVenueRoomState({
        type: 'info',
        message: nextVisible ? "You're visible in Who's Here." : "You're hidden from Who's Here.",
      });
      triggerHaptic('success');
    } catch (error) {
      setVenueRoomState({
        type: 'error',
        message: error instanceof Error ? error.message : 'Unable to update room visibility.',
      });
      triggerHaptic('warning');
    } finally {
      setVenueRoomPresenceUpdating(false);
    }
  }, [
    address,
    applyVenueRoomSnapshot,
    isConnected,
    selectedPlace?.slug,
    signMessageAsync,
    userLocation,
    venueRoomPresenceUpdating,
    venueRoomVisible,
  ]);

  useEffect(() => {
    const placeId = selectedPlace?.placeId;

    if (!placeId || isCuratedFallbackVenueId(placeId)) {
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

  useEffect(() => {
    const slug = selectedPlace?.slug;

    if (!slug || isCuratedFallbackVenueId(selectedPlace?.placeId)) {
      setVenueRoomAccess(null);
      setVenueRoomMessages((current) => (current.length > 0 ? [] : current));
      setVenueRoomWhoHere((current) => (current.length > 0 ? [] : current));
      setVenueRoomLoading(false);
      setVenueRoomDraft('');
      setVenueRoomVisible(false);
      setVenueRoomState(null);
      return;
    }

    const controller = new AbortController();
    void loadSelectedVenueRoom(slug, controller.signal);

    return () => controller.abort();
  }, [address, loadSelectedVenueRoom, selectedPlace?.placeId, selectedPlace?.slug, userLocation?.latitude, userLocation?.longitude]);

  useEffect(() => {
    const slug = selectedPlace?.slug;

    if (!slug || isCuratedFallbackVenueId(selectedPlace?.placeId)) {
      setSpotVault(null);
      setSpotVaultLoading(false);
      setSpotVaultError(null);
      setSpotVaultReviewState(null);
      setSpotVaultReviewVerdict('worth_it');
      setSpotVaultReviewNote('');
      setSpotVaultReviewReportingId(null);
      return;
    }

    setSpotVaultReviewState(null);
    setSpotVaultReviewVerdict('worth_it');
    setSpotVaultReviewNote('');
    setSpotVaultReviewReportingId(null);

    const controller = new AbortController();
    void loadSelectedSpotVault(slug, controller.signal);

    return () => controller.abort();
  }, [address, loadSelectedSpotVault, selectedPlace?.placeId, selectedPlace?.slug]);

  useEffect(() => {
    const slug = selectedPlace?.slug;
    if (!slug || isCuratedFallbackVenueId(selectedPlace?.placeId)) return undefined;

    const interval = window.setInterval(() => {
      if (document.visibilityState !== 'visible' || venueRoomSending || venueRoomPresenceUpdating) {
        return;
      }

      void loadSelectedVenueRoom(slug, undefined, { silent: true });
    }, 5000);

    return () => window.clearInterval(interval);
  }, [loadSelectedVenueRoom, selectedPlace?.placeId, selectedPlace?.slug, venueRoomPresenceUpdating, venueRoomSending]);

  const selectedPulse = useMemo(
    () => getPulse(selectedPlace?.approvedCount ?? 0, selectedPlace?.lastTaggedAt ?? null),
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
  const mapAttentionPlaceSuggestions = useMemo<MapAttentionPlaceSuggestion[]>(() => {
    if (!mapAttentionIntent) return [];

    const scorePlace = (place: NearbyPlace) => {
      const categories = place.categories.join(' ').toLowerCase();
      const hasStory = Boolean(place.description?.trim());
      const isSocial = /bar|night|music|club|community|gather|hostel|market|event/.test(categories);
      const isDiscovery = /surf|beach|island|coast|water|lagoon|river|cave|pool|view|nature|trail/.test(categories);
      const proofCount = place.tagSummary.approvedCount;
      const liveScore = place.activeDareCount * 35 + Math.min(24, place.tagSummary.heatScore / 4);
      const socialScore = (isSocial ? 30 : 0) + Math.min(18, place.checkInCount * 2);
      const discoveryScore = (isDiscovery ? 28 : 0) + (hasStory ? 16 : 0) + (proofCount === 0 ? 12 : 0);

      if (mapAttentionIntent === 'meet') return socialScore + liveScore + proofCount;
      if (mapAttentionIntent === 'now') return liveScore + socialScore / 2 + (proofCount > 0 ? 8 : 0);
      return discoveryScore + Math.min(14, proofCount * 2) + liveScore / 3;
    };

    return [...nearbyPlaces]
      .sort((a, b) => scorePlace(b) - scorePlace(a))
      .slice(0, 3)
      .map((place) => {
        const proofCount = place.tagSummary.approvedCount;
        const meta =
          place.activeDareCount > 0
            ? `${place.activeDareCount} live ${place.activeDareCount === 1 ? 'Dare' : 'Dares'}`
            : place.checkInCount > 0
              ? `${place.checkInCount} verified ${place.checkInCount === 1 ? 'visit' : 'visits'}`
              : proofCount > 0
                ? `${proofCount} verified ${proofCount === 1 ? 'Spark' : 'Sparks'}`
                : 'First proof unclaimed';

        return {
          slug: place.slug,
          name: place.name,
          description: place.description ?? (place.categories.slice(0, 2).join(' · ') || 'Nearby place'),
          meta,
          sprite: getAdventurePlaceSprite({
            challengeLiveCount: place.activeDareCount,
            categories: place.categories,
          }),
        };
      });
  }, [mapAttentionIntent, nearbyPlaces]);
  const mapAttentionSuggestedSlugSet = useMemo(
    () => new Set(mapAttentionPlaceSuggestions.map((place) => place.slug)),
    [mapAttentionPlaceSuggestions]
  );
  const latestPrivateMapSpot = privateMapSpots[0] ?? null;
  const selectedPrivateMapSpot = useMemo(() => {
    if (!selectedPlace || selectedPlace.placeSource !== 'PRIVATE_SAVED_SPOT') {
      return null;
    }

    return (
      privateMapSpots.find((spot) => selectedPlace.externalPlaceId === `private:${spot.id}`) ??
      privateMapSpots.find(
        (spot) =>
          Math.abs(spot.latitude - selectedPlace.latitude) < 0.000001 &&
          Math.abs(spot.longitude - selectedPlace.longitude) < 0.000001
      ) ?? null
    );
  }, [privateMapSpots, selectedPlace]);
  const activeMapFilterLabel = useMemo(() => {
    if (mapVenueFocus === 'live') return 'Live now';
    if (mapVenueFocus === 'matched') return 'For you';
    if (mapVenueFocus === 'footprint') return 'My trail';
    if (pulseFilter === 'verified') return 'Verified venues';
    if (pulseFilter === 'unmarked') return 'Needs proof';
    if (pulseFilter === 'blazing') return 'Hot venues';
    if (pulseFilter === 'igniting') return 'Active venues';
    if (pulseFilter === 'simmering') return 'Started venues';
    return 'All venues';
  }, [mapVenueFocus, pulseFilter]);
  const activeMapFilterIsScoped = mapVenueFocus !== 'all' || pulseFilter !== 'all';
  const visibleMatchedVenueCount = useMemo(
    () => nearbyPlaces.filter((place) => matchedVenueIndex.has(place.slug)).length,
    [matchedVenueIndex, nearbyPlaces]
  );
  const refitVisibleVenueCluster = useCallback(
    (duration = 650) => {
      const map = mapInstanceRef.current;
      if (!map || !mapReady || !isMobileViewport) return false;

      const sourcePlaces = filteredNearbyPlaces.length > 0 ? filteredNearbyPlaces : nearbyPlaces;
      return fitMapToVenueCluster(map, sourcePlaces, isMobileViewport, { duration });
    },
    [filteredNearbyPlaces, isMobileViewport, mapReady, nearbyPlaces]
  );
  const closeSelectedPlace = useCallback(() => {
    triggerHaptic('selection');
    setSelectedPlace(null);
    setSelectedPlacePanelExpanded(false);
    setTargetCenter(null);
    setTargetZoom(null);

    if (isMobileViewport && typeof window !== 'undefined') {
      window.requestAnimationFrame(() => {
        refitVisibleVenueCluster(650);
      });
    }
  }, [isMobileViewport, refitVisibleVenueCluster]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (
      !isMobileViewport ||
      !map ||
      !mapReady ||
      hasAutoFitVenueClusterRef.current ||
      selectedPlace ||
      targetCenter ||
      hasDeepLinkedPlace ||
      deepLinkedSearchQuery
    ) {
      return;
    }

    const sourcePlaces = filteredNearbyPlaces.length > 0 ? filteredNearbyPlaces : nearbyPlaces;
    if (fitMapToVenueCluster(map, sourcePlaces, isMobileViewport, { duration: 900 })) {
      hasAutoFitVenueClusterRef.current = true;
    }
  }, [
    deepLinkedSearchQuery,
    filteredNearbyPlaces,
    hasDeepLinkedPlace,
    isMobileViewport,
    mapReady,
    nearbyPlaces,
    selectedPlace,
    targetCenter,
  ]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!isMobileViewport || !map || !mapReady || selectedPlace || !targetCenter) return undefined;

    const sourcePlaces = filteredNearbyPlaces.length > 0 ? filteredNearbyPlaces : nearbyPlaces;
    if (sourcePlaces.length === 0) return undefined;

    const bounds = map.getBounds();
    const visibleVenueCount = sourcePlaces.filter((place) =>
      bounds.contains([place.longitude, place.latitude])
    ).length;
    if (visibleVenueCount > 0) return undefined;

    const center = map.getCenter();
    const recoveryKey = `${sourcePlaces.map((place) => place.id).join(':')}:${center.lat.toFixed(3)}:${center.lng.toFixed(3)}:${Math.round(map.getZoom() * 10)}`;
    if (lastEmptyViewportRecoveryKeyRef.current === recoveryKey) return undefined;
    lastEmptyViewportRecoveryKeyRef.current = recoveryKey;

    const recoveryTimeoutId = window.setTimeout(() => {
      const currentMap = mapInstanceRef.current;
      if (!currentMap || selectedPlace) return;

      const currentBounds = currentMap.getBounds();
      const currentVisibleVenueCount = sourcePlaces.filter((place) =>
        currentBounds.contains([place.longitude, place.latitude])
      ).length;
      if (currentVisibleVenueCount > 0) return;

      if (fitMapToVenueCluster(currentMap, sourcePlaces, isMobileViewport, { duration: 700 })) {
        setTargetCenter(null);
        setTargetZoom(null);
      }
    }, 180);

    return () => window.clearTimeout(recoveryTimeoutId);
  }, [filteredNearbyPlaces, isMobileViewport, mapReady, nearbyPlaces, selectedPlace, targetCenter]);

  const nearbyPlaceBySlug = useMemo(() => {
    const index = new Map<string, NearbyPlace>();
    nearbyPlaces.forEach((place) => {
      index.set(place.slug, place);
    });
    return index;
  }, [nearbyPlaces]);
  const venuePresenceIndex = useMemo(() => {
    const byVenueId = new Map<string, VenuePresenceSummary>();
    const bySlug = new Map<string, VenuePresenceSummary>();

    venuePresenceSignals.forEach((signal) => {
      byVenueId.set(signal.venueId, signal);
      bySlug.set(signal.venueSlug, signal);
    });

    return { byVenueId, bySlug };
  }, [venuePresenceSignals]);
  const activeVenuePresenceCount = useMemo(
    () => venuePresenceSignals.reduce((total, signal) => total + signal.activeCount, 0),
    [venuePresenceSignals]
  );

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
      armMapClickSuppression();
      if (place) {
        focusExistingPlace(place);
        return;
      }

      const presence = venuePresenceIndex.bySlug.get(slug);
      if (!presence) return;

      setSelectedPlace({
        placeId: presence.venueId,
        slug: presence.venueSlug,
        name: presence.venueName,
        address: presence.distanceDisplay ? `Presence signal · ${presence.distanceDisplay}` : 'Presence signal',
        latitude: presence.latitude,
        longitude: presence.longitude,
        approvedCount: 0,
        heatScore: presence.activeCount * 10,
        activeDareCount: 0,
        mapModes: DEFAULT_VENUE_MAP_MODES,
      });
      setTargetCenter([presence.latitude, presence.longitude]);
      setTargetZoom(15);
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
  }, [armMapClickSuppression, focusExistingPlace, mapReady, nearbyPlaceBySlug, venuePresenceIndex]);

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
        eyebrow: dare.isCommunitySpark ? 'Community dare' : dare.isOpenBounty ? 'Open dare' : 'Live dare',
        title: dare.title,
        detail: place
          ? dare.isCommunitySpark
            ? `${place.name} has a free community dare live. Show up, help, and leave proof.`
            : `${place.name} is active right now. Make the proof and take the reward before the window closes.`
          : dare.locationLabel
            ? `Active near ${dare.locationLabel}.`
            : 'A live dare is moving nearby.',
        timingLabel: happeningWindow.label,
        distanceLabel: dare.distanceDisplay,
        rewardLabel: dare.isCommunitySpark ? 'Community' : `${formatMapUsd(dare.bounty)} USDC`,
        actionLabel: 'Open dare',
        href: dare.shortId ? `/dare/${dare.shortId}` : '/board',
        place,
        tone: dare.isCommunitySpark ? 'green' : dare.bounty >= 100 ? 'gold' : 'cyan',
      });
    });

    localSignals.slice(0, 3).forEach((signal) => {
      if (items.length >= 5) return;

      items.push({
        id: `approved-signal:${signal.id}`,
        kind: 'local-event',
        eyebrow: 'Local tip',
        title: signal.title,
        detail:
          signal.notes ||
          (signal.venueName
            ? `${signal.venueName}${signal.city ? ` · ${signal.city}` : ''}`
            : 'A reviewed local happening from BaseDare.'),
        timingLabel: formatSignalTimingLabel(signal, happeningWindow.label),
        distanceLabel: signal.distanceDisplay,
        rewardLabel: signal.category,
        actionLabel: signal.sourceUrl ? 'Source' : 'Open',
        href: signal.sourceUrl || SIGNAL_ROOM_URL,
        place: null,
        tone: getLocalSignalTone(signal.category),
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
              ? `${place.tagSummary.approvedCount} proof${place.tagSummary.approvedCount === 1 ? '' : 's'}`
              : 'First proof',
        actionLabel: copy.actionLabel,
        href: null,
        place,
        tone: copy.tone,
      });
    });

    return items.slice(0, 5);
  }, [happeningWindow, localSignals, nearbyDareFeed, nearbyPlaceBySlug, nearbyPlaces, userLocation, viewportCenter]);
  const featuredMapHappening = mapHappenings[0] ?? null;
  // Snap-style spike surfacing: a venue is "popping" when a dare is live or
  // verified proof landed in the last 6h — ranked by recency-weighted chaos.
  const poppingNowSpike = useMemo(() => {
    const candidates = nearbyPlaces.filter((place) => {
      if (place.activeDareCount > 0) return true;
      if (!place.tagSummary.lastTaggedAt) return false;
      const hoursSince = (Date.now() - new Date(place.tagSummary.lastTaggedAt).getTime()) / 3_600_000;
      return Number.isFinite(hoursSince) && hoursSince >= 0 && hoursSince <= 6;
    });
    if (candidates.length === 0) return null;
    const top = candidates.reduce((best, place) =>
      getChaosLevelForPlace(place) > getChaosLevelForPlace(best) ? place : best
    );
    return {
      place: top,
      label:
        top.activeDareCount > 0
          ? `${top.name} — ${top.activeDareCount > 1 ? `${top.activeDareCount} dares live` : 'live dare'}`
          : `${top.name} — proof ${getLastSparkLabel(top.tagSummary.lastTaggedAt).replace('Last proof ', '')}`,
    };
  }, [nearbyPlaces]);
  const firstProofStartPlace = useMemo(() => {
    const happeningPlace = mapHappenings.find(
      (happening) => happening.place && happening.rewardLabel === 'First proof'
    )?.place;

    if (happeningPlace) {
      return happeningPlace;
    }

    const origin = userLocation ?? viewportCenter;
    const candidates = filteredNearbyPlaces.length > 0 ? filteredNearbyPlaces : nearbyPlaces;
    const unmarked = candidates.filter((place) => place.tagSummary.approvedCount <= 0);
    const pool = unmarked.length > 0 ? unmarked : candidates;

    if (pool.length === 0) {
      return null;
    }

    return [...pool].sort((a, b) => {
      if (!origin) {
        return b.activeDareCount - a.activeDareCount || b.tagSummary.heatScore - a.tagSummary.heatScore;
      }

      const distanceA = calculateDistance(origin.latitude, origin.longitude, a.latitude, a.longitude);
      const distanceB = calculateDistance(origin.latitude, origin.longitude, b.latitude, b.longitude);
      return distanceA - distanceB;
    })[0];
  }, [filteredNearbyPlaces, mapHappenings, nearbyPlaces, userLocation, viewportCenter]);
  const mapSpotlightVenue = useMemo(() => {
    const origin = userLocation ?? viewportCenter;
    const candidates = filteredNearbyPlaces.length > 0 ? filteredNearbyPlaces : nearbyPlaces;

    if (candidates.length === 0) {
      return null;
    }

    const place = [...candidates]
      .map((candidate) => {
        const distanceKm = origin
          ? calculateDistance(origin.latitude, origin.longitude, candidate.latitude, candidate.longitude)
          : null;
        const commandMetrics = candidate.commandCenter?.metrics;
        const proofCount = candidate.tagSummary.approvedCount;
        const score =
          candidate.activeDareCount * 90 +
          (commandMetrics?.paidActivations ?? 0) * 70 +
          (candidate.commandCenter?.sponsorReady ? 36 : 0) +
          proofCount * 18 +
          candidate.tagSummary.heatScore +
          Math.min(commandMetrics?.totalLiveFundingUsd ?? 0, 300) / 10 +
          Math.min(commandMetrics?.uniqueVisitorsToday ?? 0, 20) * 3 +
          Math.min(commandMetrics?.scansLastHour ?? 0, 12) * 4 +
          getVenueTimeFitScore(candidate, happeningWindow.key) -
          (distanceKm ? Math.min(distanceKm * 5, 34) : 0);

        return { place: candidate, score };
      })
      .sort((a, b) => b.score - a.score)[0]?.place;

    if (!place) {
      return null;
    }

    if (place.activeDareCount > 0) {
      return {
        place,
        eyebrow: 'Live venue',
        actionLabel: 'Open venue',
        openProof: false,
      };
    }

    if ((place.commandCenter?.metrics.paidActivations ?? 0) > 0 || place.commandCenter?.sponsorReady) {
      return {
        place,
        eyebrow: 'Featured venue',
        actionLabel: 'Open venue',
        openProof: false,
      };
    }

    if (place.tagSummary.approvedCount > 1) {
      return {
        place,
        eyebrow: 'Top venue',
        actionLabel: 'Open venue',
        openProof: false,
      };
    }

    if (place.tagSummary.approvedCount === 1) {
      return {
        place,
        eyebrow: 'Proof trail',
        actionLabel: 'Open venue',
        openProof: false,
      };
    }

    return {
      place,
      eyebrow: 'Start here',
      actionLabel: 'Take proof',
      openProof: true,
    };
  }, [filteredNearbyPlaces, happeningWindow.key, nearbyPlaces, userLocation, viewportCenter]);
  const handleStartFirstProof = useCallback(() => {
    if (!firstProofStartPlace) {
      setPulseFilter('unmarked');
      setMapVenueFocus('all');
      setShowMatchedLayer(false);
      setShowFootprintLayer(false);
      requestApproximateLocation();
      return;
    }

    focusExistingPlace(firstProofStartPlace);
    setSelectedPlacePanelExpanded(true);
    setNearbyDarePanelCollapsed(true);

    const nextAutoOpenKey = `${firstProofStartPlace.id}:${Date.now()}`;
    setProofAutoOpenKey(nextAutoOpenKey);
    window.setTimeout(() => {
      setProofAutoOpenKey((current) => (current === nextAutoOpenKey ? null : current));
    }, 1200);
  }, [firstProofStartPlace, focusExistingPlace, requestApproximateLocation]);
  const handleMapSpotlightVenueAction = useCallback(() => {
    if (!mapSpotlightVenue?.place) {
      setPulseFilter('unmarked');
      setMapVenueFocus('all');
      setShowMatchedLayer(false);
      setShowFootprintLayer(false);
      requestApproximateLocation();
      return;
    }

    focusExistingPlace(mapSpotlightVenue.place);
    setSelectedPlacePanelExpanded(true);
    setNearbyDarePanelCollapsed(true);

    if (!mapSpotlightVenue.openProof) {
      return;
    }

    const nextAutoOpenKey = `${mapSpotlightVenue.place.id}:${Date.now()}`;
    setProofAutoOpenKey(nextAutoOpenKey);
    window.setTimeout(() => {
      setProofAutoOpenKey((current) => (current === nextAutoOpenKey ? null : current));
    }, 1200);
  }, [focusExistingPlace, mapSpotlightVenue, requestApproximateLocation]);

  const openProofForSelectedPlace = useCallback(() => {
    if (!selectedPlace) {
      handleStartFirstProof();
      return;
    }

    setSelectedPlacePanelExpanded(true);
    const nextAutoOpenKey = `${selectedPlaceIdentity ?? 'selected'}:${Date.now()}`;
    setProofAutoOpenKey(nextAutoOpenKey);
    window.setTimeout(() => {
      setProofAutoOpenKey((current) => (current === nextAutoOpenKey ? null : current));
    }, 1200);
  }, [handleStartFirstProof, selectedPlace, selectedPlaceIdentity]);

  const happeningLoading = nearbyDaresLoading || localSignalsLoading;
  const showNearbyDarePanel = happeningLoading || mapHappenings.length > 0 || showLocalSignalForm;

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

    const activatedPlaces = filteredNearbyPlaces.filter((place) => isVenueActivated(place.commandCenter));
    const clusterablePlaces = filteredNearbyPlaces.filter((place) => !isVenueActivated(place.commandCenter));
    const activatedMarkers = activatedPlaces.map((place): ClusteredNearbyMarker => ({
      kind: 'place',
      key: place.id,
      place,
    }));

    const roundedZoom = Math.max(0, Math.round(mapZoom));
    const cellSize = getClusterCellSize(roundedZoom);

    if (cellSize <= 0 || clusterablePlaces.length <= 1) {
      return [
        ...clusterablePlaces.map((place): ClusteredNearbyMarker => ({
          kind: 'place',
          key: place.id,
          place,
        })),
        ...activatedMarkers,
      ];
    }

    const buckets = new Map<string, NearbyPlace[]>();

    clusterablePlaces.forEach((place) => {
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

    return [...markers, ...activatedMarkers];
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
  const selectedPresenceSummary = useMemo(() => {
    if (!selectedPlace) {
      return null;
    }

    if (selectedPlace.placeId) {
      const byVenueId = venuePresenceIndex.byVenueId.get(selectedPlace.placeId);
      if (byVenueId) return byVenueId;
    }

    return selectedPlace.slug ? venuePresenceIndex.bySlug.get(selectedPlace.slug) ?? null : null;
  }, [selectedPlace, venuePresenceIndex]);
  const activePresenceIsSelectedVenue = Boolean(
    activePresenceSignal &&
      selectedPlace &&
      (activePresenceSignal.venueId === selectedPlace.placeId ||
        activePresenceSignal.venueSlug === selectedPlace.slug) &&
      new Date(activePresenceSignal.expiresAt).getTime() > Date.now()
  );
  const selectedVenueProfile = selectedPlace?.profile ?? null;
  const selectedVenuePhotoItems = useMemo(() => {
    const items: Array<{
      id: string;
      url: string;
      label: string;
      source: string;
    }> = [];
    const seen = new Set<string>();

    const addPhoto = (id: string, url: string | null | undefined, label: string, source: string) => {
      const normalized = url?.trim();
      if (!normalized || seen.has(normalized)) return;
      seen.add(normalized);
      items.push({ id, url: normalized, label, source });
    };

    addPhoto('cover', selectedVenueProfile?.coverImageUrl, 'Venue cover', 'profile');
    addPhoto('profile', selectedVenueProfile?.profileImageUrl, 'Venue photo', 'profile');
    selectedPlaceTags.forEach((tag) => {
      if (tag.proofType !== 'IMAGE') return;
      addPhoto(`tag:${tag.id}`, tag.proofMediaUrl, tag.caption || 'Proof photo', tag.creatorTag ? `@${tag.creatorTag}` : 'proof');
    });

    return items.slice(0, 4);
  }, [selectedPlaceTags, selectedVenueProfile?.coverImageUrl, selectedVenueProfile?.profileImageUrl]);

  const compactMarkerZoomThreshold = isMobileViewport ? 15 : 14;
  const visibleMapIntentChips = isMobileViewport
    ? MAP_INTENT_SEARCH_CHIPS.filter((chip) => chip !== 'Proof').slice(0, 4)
    : MAP_INTENT_SEARCH_CHIPS;
  const mobileMapFilterCount = activeMapFilterIsScoped ? filteredNearbyPlaces.length : nearbyPlaces.length;
  const showNearbyDareTray = showNearbyDarePanel && !(isMobileViewport && Boolean(selectedPlace));
  const hasSaveSpotPanel = Boolean(saveSpotDraft || selectedPrivateMapSpot);
  const showCompactSelectedPlacePanel = Boolean(
    isMobileViewport && selectedPlace && !selectedPlacePanelExpanded && !hasSaveSpotPanel
  );
  const selectedPlacePanelWrapClass = isMobileViewport
    ? `selected-place-panel-wrap absolute inset-x-2 bottom-2 z-30 ${
        showCompactSelectedPlacePanel ? 'selected-place-panel-wrap--compact' : ''
      } ${hasSaveSpotPanel ? 'selected-place-panel-wrap--save-spot' : ''}`
    : 'selected-place-panel-wrap absolute bottom-4 left-1/2 z-30 w-[min(calc(100%-1rem),28rem)] -translate-x-1/2 md:left-auto md:translate-x-0';
  const beginMapSheetDrag = useCallback(
    (target: MapSheetDragTarget, event: ReactPointerEvent<HTMLElement>) => {
      if (!isMobileViewport || (event.pointerType === 'mouse' && event.button !== 0)) {
        return;
      }

      event.currentTarget.setPointerCapture?.(event.pointerId);
      mapSheetDragRef.current = {
        target,
        startY: event.clientY,
        rawY: 0,
        offsetY: 0,
        pointerId: event.pointerId,
        moved: false,
      };
      setMapSheetDrag({ target, offsetY: 0 });
    },
    [isMobileViewport]
  );
  const updateMapSheetDrag = useCallback((target: MapSheetDragTarget, event: ReactPointerEvent<HTMLElement>) => {
    const session = mapSheetDragRef.current;
    if (!session || session.target !== target || session.pointerId !== event.pointerId) {
      return;
    }

    const rawY = event.clientY - session.startY;
    const offsetY = clampMapSheetDragOffset(rawY);
    session.rawY = rawY;
    session.offsetY = offsetY;
    if (Math.abs(rawY) > 6) {
      session.moved = true;
      event.preventDefault();
    }
    setMapSheetDrag({ target, offsetY });
  }, []);
  const finishMapSheetDrag = useCallback(
    (target: MapSheetDragTarget, event: ReactPointerEvent<HTMLElement>) => {
      const session = mapSheetDragRef.current;
      if (!session || session.target !== target || session.pointerId !== event.pointerId) {
        return;
      }

      event.currentTarget.releasePointerCapture?.(event.pointerId);
      mapSheetDragRef.current = null;
      setMapSheetDrag(null);

      if (session.moved) {
        mapSheetSuppressClickRef.current = true;
        window.setTimeout(() => {
          mapSheetSuppressClickRef.current = false;
        }, 250);
      }

      if (Math.abs(session.rawY) < MAP_SHEET_DRAG_TRIGGER_PX) {
        return;
      }

      triggerHaptic('selection');

      if (target === 'nearby-dare') {
        setNearbyDarePanelCollapsed(session.rawY > 0);
        return;
      }

      if (session.rawY < -MAP_SHEET_DRAG_TRIGGER_PX) {
        setSelectedPlacePanelExpanded(true);
        return;
      }

      if (hasSaveSpotPanel) {
        return;
      }

      if (selectedPlacePanelExpanded) {
        setSelectedPlacePanelExpanded(false);
        return;
      }

      if (session.rawY > MAP_SHEET_DRAG_CLOSE_PX) {
        closeSelectedPlace();
      }
    },
    [closeSelectedPlace, hasSaveSpotPanel, selectedPlacePanelExpanded]
  );
  const cancelMapSheetDrag = useCallback((target: MapSheetDragTarget, event: ReactPointerEvent<HTMLElement>) => {
    const session = mapSheetDragRef.current;
    if (!session || session.target !== target || session.pointerId !== event.pointerId) {
      return;
    }

    event.currentTarget.releasePointerCapture?.(event.pointerId);
    mapSheetDragRef.current = null;
    setMapSheetDrag(null);
  }, []);
  const consumeMapSheetDragClick = useCallback(() => {
    if (!mapSheetSuppressClickRef.current) {
      return false;
    }

    mapSheetSuppressClickRef.current = false;
    return true;
  }, []);
  const selectedPlaceSheetDragOffset = mapSheetDrag?.target === 'selected-place' ? mapSheetDrag.offsetY : 0;
  const nearbyDareSheetDragOffset = mapSheetDrag?.target === 'nearby-dare' ? mapSheetDrag.offsetY : 0;
  const selectedPlacePanelDragStyle =
    isMobileViewport && selectedPlaceSheetDragOffset !== 0
      ? { transform: `translate3d(0, ${selectedPlaceSheetDragOffset}px, 0)` }
      : undefined;
  const nearbyDareTrayDragStyle =
    isMobileViewport && nearbyDareSheetDragOffset !== 0
      ? { transform: `translate3d(0, ${nearbyDareSheetDragOffset}px, 0)` }
      : undefined;
  const selectedCommandCenter = selectedPlace?.commandCenter ?? null;
  const selectedMapModes = selectedPlace?.mapModes ?? DEFAULT_VENUE_MAP_MODES;
  const selectedVenueActivated = isVenueActivated(selectedCommandCenter);
  const selectedActivationActionCopy = selectedCommandCenter
    ? getVenueActivationActionCopy(selectedCommandCenter)
    : null;
  const selectedActivationHref =
    selectedCommandCenter && selectedPlace?.slug
      ? buildVenueActivationIntakeHref({
          venueId: selectedResolvedPlaceId,
          venueSlug: selectedPlace.slug,
          venueName: selectedPlace.name,
          city: selectedPlace.city,
          payout: 120,
          buyerType: 'venue',
          goal: 'foot_traffic',
          packageId: 'pilot-drop',
          offerId: 'first-spark',
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
          venueId: selectedResolvedPlaceId,
          venueSlug: selectedPlace.slug,
          venueName: selectedPlace.name,
          source: 'map',
        })
      : null;
  const resolveSelectedPlaceForCommand = useCallback(async () => {
    if (!selectedPlace) {
      throw new Error('No place selected');
    }

    if (
      selectedPlace.placeId &&
      selectedPlace.slug &&
      !isCuratedFallbackVenueId(selectedPlace.placeId)
    ) {
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
            handle: resolvedPlace.handle,
            baseCashEnabled: resolvedPlace.baseCashEnabled,
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

  const handleLaunchVenueCheckIn = useCallback(async () => {
    if (!selectedPlace || checkInLaunching) {
      return;
    }

    triggerHaptic('selection');
    setCheckInLaunching(true);
    setCheckInLaunchState(null);

    try {
      const resolvedPlace =
        selectedPlace.placeId && selectedPlace.slug && !isCuratedFallbackVenueId(selectedPlace.placeId)
          ? {
              id: selectedPlace.placeId,
              slug: selectedPlace.slug,
              name: selectedPlace.name,
            }
          : await resolveSelectedPlaceForCommand();

      const response = await fetch(`/api/venues/id/${encodeURIComponent(resolvedPlace.id)}/qr`, {
        cache: 'no-store',
      });
      const payload = (await response.json().catch(() => null)) as VenueQrPayloadResponse | null;

      if (!response.ok || !payload?.success || !payload.data?.qrValue) {
        throw new Error(
          payload?.error ??
            'This venue needs a live BaseDare QR before trusted check-ins open.'
        );
      }

      const handshakeUrl = new URL(payload.data.qrValue, window.location.origin);
      router.push(`${handshakeUrl.pathname}${handshakeUrl.search}`);
    } catch (error) {
      setCheckInLaunchState({
        type: 'error',
        message:
          error instanceof Error
            ? error.message
            : 'Unable to open this venue check-in right now.',
      });
      triggerHaptic('warning');
    } finally {
      setCheckInLaunching(false);
    }
  }, [checkInLaunching, resolveSelectedPlaceForCommand, router, selectedPlace]);

  const handleSignalPresence = useCallback(async () => {
    if (!selectedPlace || presenceSubmitting) {
      return;
    }

    if (!isConnected || !address) {
      setPresenceSubmitState({ type: 'error', message: 'Connect your wallet to signal presence.' });
      triggerHaptic('warning');
      return;
    }

    if (!userLocation) {
      setPresenceSubmitState({ type: 'error', message: 'Turn on location before signaling this venue.' });
      requestApproximateLocation();
      triggerHaptic('warning');
      return;
    }

    setPresenceSubmitting(true);
    setPresenceSubmitState(null);
    setPresenceReceipt(null);

    try {
      const resolvedPlace = await resolveSelectedPlaceForCommand();
      const authHeaders = await buildWalletActionAuthHeaders({
        walletAddress: address,
        action: 'venue-presence',
        resource: `venue:${resolvedPlace.id}:presence`,
        allowSignPrompt: true,
        signMessageAsync,
      });

      const response = await fetch('/api/venues/presence', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
        body: JSON.stringify({
          venueId: resolvedPlace.id,
          walletAddress: address,
          lat: userLocation.latitude,
          lng: userLocation.longitude,
          durationMinutes: presenceDurationMinutes,
          visibility: presenceVisibility,
        }),
      });
      const payload = (await response.json().catch(() => null)) as
        | {
            success?: boolean;
            error?: string;
            data?: {
              venueId: string;
              venueSlug: string;
              venueName: string;
              visibility: VenuePresenceVisibility;
              durationMinutes: VenuePresenceDuration;
              scannedAt: string;
              expiresAt: string;
            };
          }
        | null;

      if (!response.ok || !payload?.success || !payload.data) {
        throw new Error(payload?.error || 'Unable to signal presence right now.');
      }

      const nextActiveSignal: ActivePresenceSignal = {
        venueId: payload.data.venueId,
        venueSlug: payload.data.venueSlug,
        venueName: payload.data.venueName,
        visibility: payload.data.visibility,
        durationMinutes: payload.data.durationMinutes,
        expiresAt: payload.data.expiresAt,
      };

      setActivePresenceSignal(nextActiveSignal);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(ACTIVE_PRESENCE_STORAGE_KEY, JSON.stringify(nextActiveSignal));
      }
      setPresenceSubmitState({
        type: 'success',
        message: `You're marked here at ${payload.data.venueName}. The map only shows approximate presence.`,
      });
      setPresenceReceipt({
        title: `You're here at ${payload.data.venueName}`,
        detail: `Visible for ${payload.data.durationMinutes}m. Exact location stays private.`,
        href: `/map?place=${encodeURIComponent(payload.data.venueSlug)}&room=1&source=presence`,
        venueName: payload.data.venueName,
        timestamp: payload.data.scannedAt,
        tone: payload.data.visibility === 'PUBLIC' ? 'emerald' : 'cyan',
      });
      void fetchVenuePresence(userLocation.latitude, userLocation.longitude);
      triggerHaptic('success');
    } catch (error) {
      setPresenceSubmitState({
        type: 'error',
        message: error instanceof Error ? error.message : 'Unable to signal presence right now.',
      });
      triggerHaptic('warning');
    } finally {
      setPresenceSubmitting(false);
    }
  }, [
    address,
    fetchVenuePresence,
    isConnected,
    presenceDurationMinutes,
    presenceSubmitting,
    presenceVisibility,
    requestApproximateLocation,
    resolveSelectedPlaceForCommand,
    selectedPlace,
    signMessageAsync,
    userLocation,
  ]);
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
      reasons.push(`${selectedPlace?.activeDareCount} live ${selectedPlace?.activeDareCount === 1 ? 'dare is' : 'dares are'} active here right now.`);
    }

    if ((selectedPlace?.approvedCount ?? 0) > 0) {
      reasons.push(`${selectedPlace?.approvedCount} verified ${selectedPlace?.approvedCount === 1 ? 'proof is' : 'proofs are'} already here.`);
    }

    const reviewSignal = getVenueReviewSignal(selectedPlace);
    if (reviewSignal.count > 0) {
      reasons.push(`${Math.round(reviewSignal.worthItRatio * 100)}% worth-it from ${reviewSignal.count} field ${reviewSignal.count === 1 ? 'note' : 'notes'}.`);
    } else if (reviewSignal.state === 'needs-review') {
      reasons.push('Verified visitors have shown up, but nobody has left a field review yet.');
    }

    if (selectedPlaceMatch && showMatchedLayer) {
      reasons.push('Your creator history already fits this venue.');
    }

    if (selectedCommandCenter?.sponsorReady) {
      reasons.push('This venue is sponsor-ready, so a brand can launch here without starting from zero.');
    } else if (selectedCommandCenter?.claimState === 'unclaimed') {
      reasons.push('This venue is still claimable.');
    }

    if (!reasons.length) {
      reasons.push('This venue still needs its first proof or first funded dare.');
    }

    return reasons.slice(0, 3);
  }, [selectedCommandCenter, selectedPlace, selectedPlaceMatch, showMatchedLayer]);
  const selectedVenueNextMove = useMemo(() => {
    if ((selectedPlace?.activeDareCount ?? 0) > 0) {
      return proximityAccess.canReveal
        ? 'Open the live dare here now.'
        : `Travel within ${PROXIMITY_REVEAL_METERS}m to unlock the full live brief.`;
    }

    if ((selectedPlace?.approvedCount ?? 0) <= 0) {
      return 'Fund the first dare or submit the first proof.';
    }

    if (selectedPlaceMatch && showMatchedLayer) {
      return 'Use your fit here: open the venue or chase the live dare.';
    }

    return 'Open the venue for the three moves: prove, fund, or inspect.';
  }, [proximityAccess.canReveal, selectedPlace, selectedPlaceMatch, showMatchedLayer]);
  const selectedPrimaryAction = useMemo(() => {
    if ((selectedPlace?.activeDareCount ?? 0) > 0) {
      const liveDareHref =
        proximityAccess.canReveal && selectedPlaceActiveDares[0]?.shortId
          ? `/dare/${selectedPlaceActiveDares[0].shortId}`
          : null;

      return {
        label: proximityAccess.canReveal ? 'Open the live dare' : 'Move closer to unlock',
        detail: proximityAccess.canReveal
          ? 'A funded dare is already active here.'
          : `Full brief unlocks inside ${PROXIMITY_REVEAL_METERS}m.`,
        tone: 'gold' as const,
        href: liveDareHref,
        actionLabel: liveDareHref ? 'Open brief' : null,
        resolveAction: null as SelectedCommandAction | null,
      };
    }

    if ((selectedPlace?.approvedCount ?? 0) <= 0) {
      return {
        label: 'Fund the first dare',
        detail: 'Put money on this venue so people have a reason to show up and prove it.',
        tone: 'purple' as const,
        href: selectedFundDareHref,
        actionLabel: selectedFundDareHref ? 'Fund dare' : 'Route + fund',
        resolveAction: selectedFundDareHref ? null : 'fund' as SelectedCommandAction,
      };
    }

    const commandHref = selectedCommandCenter
      ? selectedActivationHref ??
        selectedCommandCenter.consoleUrl ??
        selectedCommandCenter.contactUrl ??
        selectedVenueHref
      : selectedVenueHref;
    const nextSignalHref = selectedCommandCenter ? commandHref : selectedFundDareHref ?? selectedVenueHref;

    return {
      label: selectedCommandCenter ? 'Open venue controls' : 'Fund the next dare',
      detail: selectedCommandCenter
        ? 'Open rewards, proof, routing, and repeat plays.'
        : 'Turn existing proof into a funded dare people can chase tonight.',
      tone: 'cyan' as const,
      href: nextSignalHref,
      actionLabel: selectedCommandCenter ? 'Open' : selectedFundDareHref ? 'Fund dare' : 'Open venue',
      resolveAction: nextSignalHref ? null : 'venue' as SelectedCommandAction,
    };
  }, [proximityAccess.canReveal, selectedActivationHref, selectedCommandCenter, selectedFundDareHref, selectedPlace, selectedPlaceActiveDares, selectedVenueHref]);
  const selectedVenueCommandCards = useMemo(() => {
    const rewardTotal = selectedPlaceActiveDares.reduce((total, dare) => total + dare.bounty, 0);
    const hasCommunityActivation = selectedPlaceActiveDares.some(isCommunityActivation);
    const rewardValue =
      selectedPlaceActiveDares.length === 0
        ? 'Fund'
        : rewardTotal > 0
          ? `${formatMapUsd(rewardTotal)} USDC${hasCommunityActivation ? ' + community' : ''}`
          : 'Community dare';
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
      ? `${proofActor} left proof ${getLastSparkLabel(latestProof.submittedAt).replace('Last proof ', '')}.`
      : selectedPendingPlaceTags.length > 0
        ? `${selectedPendingPlaceTags.length} proof${selectedPendingPlaceTags.length === 1 ? '' : 's'} waiting for review.`
        : 'No approved proof yet. Be first.';
    const matchActive = Boolean(selectedPlaceMatch && showMatchedLayer);

    return [
      {
        id: 'reward',
        eyebrow: selectedPlaceActiveDares.length > 0 ? 'Live reward' : 'Fund slot',
        value: rewardValue,
        detail: primaryActivation
          ? proximityAccess.canReveal
            ? primaryActivation.title
            : `Brief unlocks inside ${PROXIMITY_REVEAL_METERS}m.`
          : 'Fund the first dare here.',
        meta:
          selectedPlaceActiveDares.length > 0
            ? `${selectedPlaceActiveDares.length} active`
            : 'first dare',
        href: rewardHref,
        actionLabel: primaryActivation?.shortId && proximityAccess.canReveal ? 'Open brief' : rewardHref ? 'Fund dare' : 'Fund',
        resolveAction: rewardHref ? null : 'fund' as SelectedCommandAction,
        tone: 'gold' as VenueCommandCardTone,
      },
      {
        id: 'proof',
        eyebrow: 'Proof',
        value: `${selectedPlace?.approvedCount ?? 0} proof${(selectedPlace?.approvedCount ?? 0) === 1 ? '' : 's'}`,
        detail: proofDetail,
        meta:
          selectedPendingPlaceTags.length > 0
            ? `${selectedPendingPlaceTags.length} pending`
            : selectedPlace?.lastTaggedAt
              ? getLastSparkLabel(selectedPlace.lastTaggedAt)
              : 'no proof yet',
        href: selectedVenueHref,
        actionLabel: selectedVenueHref ? 'Open proof' : 'Open',
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
            ? 'Show the venues that best fit you.'
            : 'Connect wallet to reveal creator-fit routing.',
        meta: matchActive
          ? `${selectedPlaceMatch?.campaignCount ?? 0} live`
          : showMatchedLayer
            ? 'scanning'
            : 'for you',
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
  const selectedSignalActionChips = useMemo(
    () => [
      {
        kind: 'drop' as SignalLayerKind,
        label: 'Drop',
        value:
          (selectedPlaceActiveDares.length ?? 0) > 0
            ? `${selectedPlaceActiveDares.length} live`
            : 'fundable',
      },
      {
        kind: 'first' as SignalLayerKind,
        label: 'First',
        value:
          (selectedPlace?.approvedCount ?? 0) > 0
            ? 'claimed'
            : selectedPendingPlaceTags.length > 0
              ? 'review'
              : 'open',
      },
      {
        kind: 'relic' as SignalLayerKind,
        label: 'Relic',
        value:
          selectedPlaceTags.length > 0
            ? `${selectedPlaceTags.length} proof`
            : 'waiting',
      },
    ],
    [selectedPendingPlaceTags.length, selectedPlace?.approvedCount, selectedPlaceActiveDares.length, selectedPlaceTags.length]
  );
  const signalRailOptions = useMemo(
    () => [
      {
        id: 'live',
        label: 'Live now',
        count: nearbyDareCounts.all,
        detail: 'nearby',
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
        id: 'presence',
        label: 'Here Now',
        count: activeVenuePresenceCount,
        detail: venuePresenceLoading ? 'sync' : 'people',
        active: false,
        disabled: activeVenuePresenceCount === 0,
        className:
          'data-[active=true]:border-emerald-300/45 data-[active=true]:bg-emerald-500/[0.14] data-[active=true]:text-emerald-100',
        onClick: () => {
          const signal = venuePresenceSignals[0];
          if (!signal) {
            triggerHaptic('warning');
            return;
          }

          const place = nearbyPlaceBySlug.get(signal.venueSlug);
          if (place) {
            focusExistingPlace(place);
            return;
          }

          setSelectedPlace({
            placeId: signal.venueId,
            slug: signal.venueSlug,
            name: signal.venueName,
            address: signal.distanceDisplay ? `Presence signal · ${signal.distanceDisplay}` : 'Presence signal',
            latitude: signal.latitude,
            longitude: signal.longitude,
            approvedCount: 0,
            heatScore: signal.activeCount * 10,
            activeDareCount: 0,
            mapModes: DEFAULT_VENUE_MAP_MODES,
          });
          setTargetCenter([signal.latitude, signal.longitude]);
          setTargetZoom(15);
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
        label: 'Needs proof',
        count: filterCounts.unmarked,
        detail: 'open',
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
        label: 'For You',
        count: visibleMatchedVenueCount,
        detail: isConnected ? 'match' : 'login',
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
      activeVenuePresenceCount,
      filterCounts.blazing,
      filterCounts.unmarked,
      filterCounts.verified,
      focusExistingPlace,
      isConnected,
      mapVenueFocus,
      nearbyPlaceBySlug,
      nearbyDareCounts.all,
      nearbyDareRadiusKm,
      pulseFilter,
      venuePresenceLoading,
      venuePresenceSignals,
      visibleMatchedVenueCount,
    ]
  );
  const mapStatusRailOptions = useMemo(() => {
    const optionById = new Map(signalRailOptions.map((option) => [option.id, option]));
    const clearFilters = () => {
      setMapVenueFocus('all');
      setShowMatchedLayer(false);
      setShowFootprintLayer(false);
      setPulseFilter('all');
      triggerHaptic('selection');
    };

    return [
      {
        id: 'all',
        label: 'All places',
        count: filterCounts.all,
        detail: 'venues',
        active: !activeMapFilterIsScoped,
        disabled: false,
        className:
          'data-[active=true]:border-white/25 data-[active=true]:bg-white/[0.1] data-[active=true]:text-white',
        onClick: clearFilters,
      },
      optionById.get('live'),
      optionById.get('verified'),
      optionById.get('open'),
    ].filter(Boolean) as Array<(typeof signalRailOptions)[number]>;
  }, [activeMapFilterIsScoped, filterCounts.all, signalRailOptions]);

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

      const minPitch = isMobileViewport ? 24 : 0;
      const maxPitch = isMobileViewport ? MAX_MOBILE_MAP_PITCH : MAX_DESKTOP_MAP_PITCH;
      const defaultCamera = getDefaultMapCamera(isMobileViewport);
      const nextPitch = reset
        ? defaultCamera.pitch
        : Math.min(maxPitch, Math.max(minPitch, map.getPitch() + pitchDelta));
      const nextBearing = reset ? defaultCamera.bearing : map.getBearing() + bearingDelta;
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

  const handleMapFullscreenToggle = useCallback(() => {
    triggerHaptic('selection');
    setNearbyDarePanelCollapsed(true);
    setSelectedPlacePanelExpanded(false);
    setIsMapFullscreenMobile((current) => !current);
  }, []);

  const handleAdventureActivitySelect = useCallback(
    (activity: TonightActivity) => {
      setAdventurePanelOpen(false);
      setTargetCenter([activity.place.lat, activity.place.lng]);
      setTargetZoom(15);
      triggerHaptic('selection');

      if (activity.type === 'meetup') {
        const meetup = meetups.find((candidate) => candidate.id === activity.id) ?? {
          id: activity.id,
          title: activity.title,
          type: 'custom',
          placeLabel: activity.place.label,
          venueId: activity.place.venueId,
          approxLat: activity.place.lat,
          approxLng: activity.place.lng,
          startTime: activity.startsAt ?? new Date().toISOString(),
          note: null,
          happeningNow: activity.startsAt
            ? new Date(activity.startsAt).getTime() <= Date.now() + 30 * 60_000
            : true,
          creator: null,
        } satisfies MeetupPin;
        setSelectedPlace(null);
        setSelectedMeetup(meetup);
        return;
      }

      router.push(activity.href);
    },
    [meetups, router]
  );

  const handleExploreSecrets = useCallback(() => {
    setSelectedPlace(null);
    setSelectedMeetup(null);
    setAdventurePanelOpen(false);
    setPulseFilter('all');
    setMapVenueFocus('all');
    setTargetCenter([adventureCenter.latitude, adventureCenter.longitude]);
    setTargetZoom(Math.max(9, Math.min(11, mapZoom - 2)));
    triggerHaptic('selection');
  }, [adventureCenter.latitude, adventureCenter.longitude, mapZoom]);

  const handleMapAttentionPlaceSelect = useCallback(
    (slug: string) => {
      const place = nearbyPlaceBySlug.get(slug);
      if (!place) {
        triggerHaptic('warning');
        return;
      }
      focusExistingPlace(place);
    },
    [focusExistingPlace, nearbyPlaceBySlug]
  );

  const handleOpenPersonalTrail = useCallback(() => {
    if (footprintMarks.length === 0) {
      setNearbyDarePanelCollapsed(false);
      triggerHaptic('warning');
      return;
    }
    setPulseFilter('all');
    setMapVenueFocus('footprint');
    setShowMatchedLayer(false);
    setShowFootprintLayer(true);
    triggerHaptic('selection');
  }, [footprintMarks.length]);

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
      venueName: selectedPlace.name,
      matched: Boolean(showMatchedLayer && selectedPlaceMatch),
      activated: selectedVenueActivated,
      activationLabel: getVenueActivationMarkerLabel(selectedCommandCenter),
      legends: selectedVenueProfile?.legends,
      categories: selectedPlace.categories,
      liveTonight: isVenueNightTonight(selectedPlace.name, selectedPlace.slug),
      mayorTag: selectedPlace.slug
        ? nearbyPlaces.find((place) => place.slug === selectedPlace.slug)?.mayor?.tag ?? null
        : null,
    });
  }, [nearbyPlaces, selectedCommandCenter, selectedPlace, selectedPlaceMatch, selectedPulse, selectedVenueActivated, selectedVenueProfile?.legends, selectedVisualState, showMatchedLayer]);
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
      MAPLIBRE_PRESENCE_SOURCE_ID,
      buildPresenceSignalCollection(venuePresenceSignals, selectedPlace)
    );
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
    venuePresenceSignals,
  ]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapReady) return;

    const seenMarkerKeys = new Set<string>();

    const addMarker = ({
      key,
      latitude,
      longitude,
      html,
      className,
      anchor,
      onClick,
      draggable = false,
      onDragEnd,
    }: {
      key: string;
      latitude: number;
      longitude: number;
      html: string;
      className: string;
      anchor: PositionAnchor;
      onClick: () => void;
      draggable?: boolean;
      onDragEnd?: (latitude: number, longitude: number) => void;
    }) => {
      seenMarkerKeys.add(key);
      let record = mapMarkersRef.current.get(key);
      const shouldRecreate =
        record &&
        (record.className !== className ||
          record.anchor !== anchor ||
          record.draggable !== draggable);

      if (record && shouldRecreate) {
        record.element.removeEventListener('pointerdown', record.pointerDownHandler);
        record.element.removeEventListener('click', record.clickHandler);
        record.marker.remove();
        mapMarkersRef.current.delete(key);
        record = undefined;
      }

      if (record) {
        record.onClick = onClick;
        record.onDragEnd = onDragEnd;
        record.marker.setLngLat([longitude, latitude]);

        if (record.html !== html) {
          const shouldDeferHtmlUpdate =
            !isMobileViewport &&
            desktopMapSettlingRef.current &&
            !key.startsWith('selected:') &&
            key !== 'user-location';

          if (shouldDeferHtmlUpdate) {
            record.pendingHtml = html;
          } else {
            record.element.innerHTML = html;
            record.html = html;
            record.pendingHtml = undefined;
          }
        }

        return;
      }

      const element = createMarkerElement(html, className);
      element.style.pointerEvents = 'auto';
      const pointerDownHandler = (event: PointerEvent) => {
        event.stopPropagation();
        armMapClickSuppression(360);
      };
      const clickHandler = (event: MouseEvent) => {
        event.preventDefault();
        event.stopPropagation();
        armMapClickSuppression(360);
        mapMarkersRef.current.get(key)?.onClick();
      };
      element.addEventListener('pointerdown', pointerDownHandler);
      element.addEventListener('click', clickHandler);

      const marker = new maplibregl.Marker({
        element,
        anchor,
        pitchAlignment: 'viewport',
        rotationAlignment: 'viewport',
        subpixelPositioning: true,
      })
        .setLngLat([longitude, latitude])
        .addTo(map);

      const nextRecord: ManagedMapMarker = {
        marker,
        element,
        html,
        pendingHtml: undefined,
        className,
        anchor,
        draggable,
        onClick,
        onDragEnd,
        pointerDownHandler,
        clickHandler,
      };

      if (draggable) {
        marker.setDraggable(true);
        nextRecord.dragEndHandler = () => {
          const current = mapMarkersRef.current.get(key);
          if (!current) return;
          const lngLat = current.marker.getLngLat();
          current.onDragEnd?.(lngLat.lat, lngLat.lng);
        };
        marker.on('dragend', nextRecord.dragEndHandler);
      }

      mapMarkersRef.current.set(key, nextRecord);
    };

    privateMapSpots.forEach((spot) => {
      const active =
        Boolean(selectedPlace?.externalPlaceId === `private:${spot.id}`) ||
        Boolean(saveSpotDraft && Math.abs(saveSpotDraft.latitude - spot.latitude) < 0.000001);

      addMarker({
        key: `private:${spot.id}`,
        latitude: spot.latitude,
        longitude: spot.longitude,
        html: createPrivateSpotMarkerHtml({
          label: spot.label,
          hasPhoto: Boolean(spot.photoDataUrl),
          active,
        }),
        className: 'basedare-maplibre-marker basedare-maplibre-marker--private-spot',
        anchor: 'bottom',
        onClick: () => focusPrivateSpot(spot),
      });
    });

    clusteredNearbyMarkers.forEach((marker) => {
      if (marker.kind === 'cluster') {
        addMarker({
          key: `nearby-cluster:${marker.key}`,
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
      const reviewSignal = getVenueReviewSignal(place);
      const isActive = selectedPlace?.placeId === place.id;
      const isMatchedVenue = showMatchedLayer && matchedVenueIndex.has(place.slug);
      const isAttentionPick = mapAttentionSuggestedSlugSet.has(place.slug);
      const activatedVenue = isVenueActivated(place.commandCenter);
      const highSignalVenue =
        activatedVenue ||
        isMatchedVenue ||
        reviewSignal.state !== 'none' ||
        place.activeDareCount > 0 ||
        place.tagSummary.approvedCount > 0 ||
        getVenueClusterScore(place) >= 20;
      const compact = !isActive && !highSignalVenue && mapZoom < compactMarkerZoomThreshold;

      addMarker({
        key: `venue:${place.id}`,
        latitude: place.latitude,
        longitude: place.longitude,
        html: createPeebearMarkerHtml({
          pulse,
          approvedCount: place.tagSummary.approvedCount,
          heatScore: place.tagSummary.heatScore,
          active: isActive,
          visualState,
          challengeLiveCount: place.activeDareCount,
          venueName: place.name,
          matched: isMatchedVenue,
          compact,
          activated: activatedVenue,
          activationLabel: getVenueActivationMarkerLabel(place.commandCenter),
          legends: place.profile?.legends,
          categories: place.categories,
          liveTonight: isVenueNightTonight(place.name, place.slug),
          mayorTag: place.mayor?.tag ?? null,
        }),
        className: `basedare-maplibre-marker basedare-maplibre-marker--venue${
          isAttentionPick ? ' basedare-maplibre-marker--attention-pick' : ''
        }`,
        anchor: 'bottom',
        onClick: () => focusExistingPlace(place),
      });
    });

    if (adventureMode) {
      localSignals
        .filter(
          (signal) =>
            signal.status === 'APPROVED' &&
            Number.isFinite(signal.latitude) &&
            Number.isFinite(signal.longitude)
        )
        .slice(0, 6)
        .forEach((signal) => {
          const latitude = signal.latitude as number;
          const longitude = signal.longitude as number;
          addMarker({
            key: `adventure-rumor:${signal.id}`,
            latitude,
            longitude,
            html: createAdventureRumorMarkerHtml(signal),
            className: 'basedare-maplibre-marker basedare-maplibre-marker--adventure-rumor',
            anchor: 'bottom',
            onClick: () => {
              setSelectedPlace(null);
              setSelectedMeetup(null);
              setTargetCenter([latitude, longitude]);
              setTargetZoom(Math.max(14, Math.round(mapZoom)));
              setNearbyDarePanelCollapsed(false);
              triggerHaptic('selection');
            },
          });
        });
    }

    if (adventureMode && focalAdventureActivity) {
      addMarker({
        key: `adventure-activity:${focalAdventureActivity.type}:${focalAdventureActivity.id}`,
        latitude: focalAdventureActivity.place.lat,
        longitude: focalAdventureActivity.place.lng,
        html: createAdventureActivityMarkerHtml(focalAdventureActivity),
        className: 'basedare-maplibre-marker basedare-maplibre-marker--adventure-activity',
        anchor: 'bottom',
        onClick: () => handleAdventureActivitySelect(focalAdventureActivity),
      });
    }

    if (showFootprintLayer) {
      footprintMarks.forEach((mark, index) => {
        addMarker({
          key: `footprint:${mark.id}:${index}`,
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
              handle: null,
              baseCashEnabled: false,
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
              checkInCount: 0,
            });
          },
        });
      });
    }

    if (userLocation) {
      addMarker({
        key: 'user-location',
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        html: currentLocationMarkerHtml,
        className: 'basedare-maplibre-marker basedare-maplibre-marker--user',
        anchor: isUserCentered ? 'bottom' : 'center',
        onClick: () => {
          setTargetCenter([userLocation.latitude, userLocation.longitude]);
          setTargetZoom(Math.max(Math.round(mapZoom), 14));
          if (adventureMode) setAdventurePanelOpen((current) => !current);
        },
      });
    }

    if (selectedPlace && selectedPlaceNeedsDedicatedMarker && selectedPlaceMarkerHtml) {
      const privateSpotCorrectionMode = Boolean(
        saveSpotDraft && selectedPlace.placeSource === 'PRIVATE_SAVE_SPOT'
      );

      addMarker({
        key: privateSpotCorrectionMode
          ? 'selected:private-save-spot-draft'
          : `selected:${selectedPlace.placeId ?? selectedPlace.externalPlaceId}`,
        latitude: privateSpotCorrectionMode ? saveSpotDraft!.latitude : selectedPlace.latitude,
        longitude: privateSpotCorrectionMode ? saveSpotDraft!.longitude : selectedPlace.longitude,
        html: privateSpotCorrectionMode
          ? createPrivateSpotMarkerHtml({
              label: saveSpotDraft!.label,
              hasPhoto: Boolean(saveSpotDraft!.photoDataUrl),
              active: true,
            })
          : selectedPlaceMarkerHtml,
        className: 'basedare-maplibre-marker basedare-maplibre-marker--selected',
        anchor: 'bottom',
        onClick: () => {
          setTargetCenter([selectedPlace.latitude, selectedPlace.longitude]);
          setTargetZoom(15);
        },
        draggable: privateSpotCorrectionMode,
        onDragEnd: handlePrivateSpotDragEnd,
      });
    }

    const flushDeferredMarkerHtml = () => {
      mapMarkersRef.current.forEach((record) => {
        if (!record.pendingHtml || record.pendingHtml === record.html) {
          record.pendingHtml = undefined;
          return;
        }

        record.element.innerHTML = record.pendingHtml;
        record.html = record.pendingHtml;
        record.pendingHtml = undefined;
      });
    };

    const removeStaleMarkers = () => {
      mapMarkersRef.current.forEach((record, key) => {
        if (seenMarkerKeys.has(key)) return;
        record.element.removeEventListener('pointerdown', record.pointerDownHandler);
        record.element.removeEventListener('click', record.clickHandler);
        record.marker.remove();
        mapMarkersRef.current.delete(key);
      });
    };

    if (!isMobileViewport && desktopMapSettlingRef.current) {
      if (deferredMarkerCleanupTimerRef.current !== null) {
        window.clearTimeout(deferredMarkerCleanupTimerRef.current);
      }

      deferredMarkerCleanupTimerRef.current = window.setTimeout(() => {
        deferredMarkerCleanupTimerRef.current = null;
        flushDeferredMarkerHtml();
        removeStaleMarkers();
      }, 460);
      return;
    }

    flushDeferredMarkerHtml();
    removeStaleMarkers();
  }, [
    adventureMode,
    armMapClickSuppression,
    clusteredNearbyMarkers,
    compactMarkerZoomThreshold,
    currentLocationMarkerHtml,
    focusExistingPlace,
    focalAdventureActivity,
    footprintMarks,
    isMobileViewport,
    isUserCentered,
    mapReady,
    mapZoom,
    matchedVenueIndex,
    privateMapSpots,
    focusPrivateSpot,
    handlePrivateSpotDragEnd,
    handleAdventureActivitySelect,
    localSignals,
    mapAttentionSuggestedSlugSet,
    saveSpotDraft,
    selectedPlace,
    selectedPlaceMarkerHtml,
    selectedPlaceNeedsDedicatedMarker,
    showFootprintLayer,
    showMatchedLayer,
    userLocation,
  ]);

  const mapPanelShellClass =
    'map-panel-shell relative overflow-hidden rounded-[28px] border border-white/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.09)_0%,rgba(255,255,255,0.04)_8%,rgba(8,10,18,0.955)_28%,rgba(5,6,14,0.99)_100%)] shadow-[0_28px_84px_rgba(0,0,0,0.5),0_0_28px_rgba(34,211,238,0.06),0_0_54px_rgba(168,85,247,0.06),inset_0_1px_0_rgba(255,255,255,0.14),inset_0_-16px_22px_rgba(0,0,0,0.22)] md:h-full';
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
  const selectedPlaceIsPrivateSpot =
    selectedPlace?.placeSource === 'PRIVATE_SAVE_SPOT' || selectedPlace?.placeSource === 'PRIVATE_SAVED_SPOT';
  const selectedPlaceBaseCashHref =
    selectedPlace?.slug && selectedPlace.baseCashEnabled
      ? `/venues/${selectedPlace.slug}/basecash?source=map-sheet`
      : null;
  const selectedPlaceHasLiveDare =
    (selectedPlace?.activeDareCount ?? 0) > 0 || selectedPlaceActiveDares.length > 0;
  const selectedPlacePrimaryDareShortId =
    selectedPlaceActiveDares.find((dare) => dare.shortId)?.shortId ?? null;
  // Trust ladder: NO PROOF -> PRESENCE -> VERIFIED (LIVE DARE overrides as the activity state).
  // VERIFIED = proof-backed ONLY (≥1 verified proof/check-in/review). NEVER claimed/operated —
  // that is a separate CLAIMED/HOSTED axis handled by the command-center section.
  const selectedPlaceHasVerifiedTrace =
    (selectedPlace?.approvedCount ?? 0) > 0 ||
    (selectedPlace?.checkInCount ?? selectedPlace?.memorySummary?.checkInCount ?? 0) > 0 ||
    (selectedPlace?.reviewSignal?.count ?? 0) > 0;
  // PRESENCE = real venue with soft/non-proof signal (heat, nearby activity) but no verified trace.
  const selectedPlaceHasPresenceSignal =
    !selectedPlaceHasVerifiedTrace && (selectedPlace?.heatScore ?? 0) > 0;
  const selectedPlaceStateTrustWord = selectedPlaceHasVerifiedTrace
    ? 'VERIFIED'
    : selectedPlaceHasPresenceSignal
      ? 'PRESENCE'
      : 'NO PROOF';
  const selectedPlaceStateActivityWord = selectedPlaceHasLiveDare ? 'LIVE DARE' : 'NO LIVE DARE';
  const selectedPlaceStateHeadline = selectedPlaceHasLiveDare
    ? 'Live dare running here.'
    : selectedPlaceHasVerifiedTrace
      ? 'Verified spot — no live dare yet.'
      : selectedPlaceHasPresenceSignal
        ? 'Has presence — no live dare yet.'
        : 'No verified proof here yet.';
  const selectedPlaceStateSupport = selectedPlaceHasLiveDare
    ? 'Join the dare, or leave proof to keep it warm.'
    : selectedPlaceHasVerifiedTrace
      ? 'Leave proof to keep it warm, or fund the first dare to activate it.'
      : 'Be the first to leave verified proof here, or fund the first dare to activate it.';
  const selectedPlaceStateTone = selectedPlaceHasLiveDare
    ? 'venue-state-card--live'
    : selectedPlaceHasVerifiedTrace
      ? 'venue-state-card--verified'
      : selectedPlaceHasPresenceSignal
        ? 'venue-state-card--presence'
        : 'venue-state-card--noproof';
  const selectedPlaceStateCard =
    selectedPlace && !selectedPlaceIsPrivateSpot ? (
      <div className={`venue-state-card ${selectedPlaceStateTone}`}>
        <span className="venue-state-card__label">
          {selectedPlaceStateTrustWord} · {selectedPlaceStateActivityWord}
        </span>
        <p className="venue-state-card__headline">{selectedPlaceStateHeadline}</p>
        <p className="venue-state-card__support">{selectedPlaceStateSupport}</p>
      </div>
    ) : null;
  const selectedCheckInLive = selectedPlace?.liveSession?.status === 'LIVE';
  const selectedCheckInStatusLabel =
    selectedPlace && selectedPlace.liveSession === undefined && selectedPlaceActiveDaresLoading
      ? 'Checking'
      : selectedCheckInLive
        ? 'Live QR'
        : 'QR required';
  const selectedCheckInCountToday =
    selectedPlace?.memorySummary?.checkInCount ??
    selectedPlace?.commandCenter?.metrics.uniqueVisitorsToday ??
    0;
  const selectedPlaceTakeProofButton =
    selectedPlace && !selectedPlaceIsPrivateSpot ? (
      <TagPlaceButton
        placeId={selectedResolvedPlaceId}
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
            ...(current ?? {}),
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
            handle: current?.handle ?? null,
            baseCashEnabled: current?.baseCashEnabled ?? false,
          }));
          setTargetCenter([place.latitude, place.longitude]);
          setTargetZoom(15);
        }}
        onTagSubmitted={(tag) => {
          // Presence-backed marks return APPROVED — they're already live. Skip
          // the pending overlay and open the full moment sheet: receipt +
          // share + streak tick + crossed-paths tease in one screen.
          if (tag.status === 'APPROVED') {
            void loadSelectedPlaceTags(selectedPlace?.placeId ?? tag.placeId, undefined, { silent: true });
            setProofMoment({
              tagId: tag.tagId,
              venueName: selectedPlace?.name ?? 'This spot',
              venueSlug: selectedPlace?.slug ?? null,
              venueHandle: selectedPlace?.handle ?? null,
              creatorTag: tag.creatorTag,
              firstMark: tag.firstMark,
              submittedAt: tag.submittedAt,
            });
            return;
          }
          setPendingPlaceTags((current) => [
            {
              ...tag,
              placeId: selectedPlace?.placeId ?? tag.placeId,
            },
            ...current.filter((item) => item.tagId !== tag.tagId),
          ]);
          setCeremonyState({
            kind: 'pending',
            title: 'Your proof is pending',
            body: tag.firstMark
              ? 'If the proof clears, this place gets its first verified proof.'
              : 'The proof is waiting for review. If it clears, the venue updates automatically.',
          });
        }}
        buttonVariant="default"
        buttonLabel="Take proof"
        buttonClassName="map-primary-action-button map-primary-action-button--proof"
        autoOpenKey={proofAutoOpenKey}
      />
    ) : null;

  const selectedPlaceFundDareButton =
    selectedPlace && !selectedPlaceIsPrivateSpot ? (
      <CreatePlaceChallengeButton
        placeId={selectedResolvedPlaceId}
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
            ...(current ?? {}),
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
            handle: current?.handle ?? null,
            baseCashEnabled: current?.baseCashEnabled ?? false,
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
              ? 'This place now has an open bounty attached to it. The next verified completion updates the venue.'
              : 'The challenge is now live here. Once it clears, the venue updates automatically.',
          });
        }}
        buttonVariant="default"
        buttonLabel={
          !selectedPlaceHasLiveDare && !selectedPlaceBaseCashHref ? 'Fund the first dare' : 'Fund dare'
        }
        buttonClassName="map-primary-action-button map-primary-action-button--fund"
      />
    ) : null;

  const selectedPlaceBaseCashButton =
    selectedPlace && !selectedPlaceIsPrivateSpot && selectedPlaceBaseCashHref ? (
      <Link
        href={selectedPlaceBaseCashHref}
        className="map-primary-action-button map-primary-action-button--pay"
        aria-label={`Open BaseCash for ${selectedPlace.name}`}
      >
        <CreditCard className="h-4 w-4" />
        <span>BaseCash</span>
      </Link>
    ) : null;

  const selectedPlaceOpenVenueButton =
    selectedPlace && !selectedPlaceIsPrivateSpot && selectedPlace.slug ? (
      <Link
        href={`/venues/${selectedPlace.slug}${
          isCreatorSource
            ? `?source=creator${deepLinkedDareShortId ? `&dare=${encodeURIComponent(deepLinkedDareShortId)}` : ''}`
            : ''
        }`}
        className="map-primary-action-button map-primary-action-button--venue"
        aria-label={`Open venue page for ${selectedPlace.name}`}
      >
        <span>Open venue</span>
      </Link>
    ) : null;

  const selectedPlaceJoinDareButton =
    selectedPlace && !selectedPlaceIsPrivateSpot && selectedPlaceHasLiveDare ? (
      <Link
        href={
          selectedPlacePrimaryDareShortId
            ? `/dare/${selectedPlacePrimaryDareShortId}`
            : selectedPlace.slug
              ? `/venues/${selectedPlace.slug}`
              : '#'
        }
        className="map-primary-action-button map-primary-action-button--proof"
        aria-label={`Join the live dare at ${selectedPlace.name}`}
      >
        <span>Join dare</span>
      </Link>
    ) : null;

  const selectedPlacePrimaryAction = selectedPlaceHasLiveDare
    ? selectedPlaceJoinDareButton
    : selectedPlaceTakeProofButton;

  // The utility rail is a grid, so its column class must match the child count —
  // a hardcoded --four left a lone Fund button sitting in one narrow cell.
  const selectedPlaceUtilityButtonCount =
    (selectedPlaceHasLiveDare && selectedPlaceTakeProofButton ? 1 : 0) +
    (selectedPlaceFundDareButton ? 1 : 0) +
    (selectedPlaceBaseCashButton ? 1 : 0);
  // Verified spot with no live dare and no BaseCash: funding the first dare IS
  // the activation move, so the lone Fund button gets lead-tier prominence.
  const selectedPlaceFundIsActivationCta =
    !selectedPlaceHasLiveDare &&
    selectedPlaceUtilityButtonCount === 1 &&
    Boolean(selectedPlaceFundDareButton);
  const selectedPlaceUtilityRailColumns =
    selectedPlaceUtilityButtonCount >= 3
      ? 'venue-action-rail--three'
      : selectedPlaceUtilityButtonCount === 2
        ? 'venue-action-rail--two'
        : 'venue-action-rail--one';

  const selectedPlaceActionRail =
    selectedPlace && !selectedPlaceIsPrivateSpot ? (
      <div
        className={`venue-action-rail-stack flex flex-col gap-2 mt-3 ${
          showCompactSelectedPlacePanel ? 'venue-action-rail-stack--compact-dock' : ''
        }`}
      >
        <div
          className={`venue-action-rail venue-action-rail--primary venue-action-rail--lead grid ${
            selectedPlaceOpenVenueButton ? 'venue-action-rail--lead-duo' : 'venue-action-rail--two'
          } ${showCompactSelectedPlacePanel ? 'venue-action-rail--compact-dock' : ''}`}
        >
          {selectedPlacePrimaryAction}
          {selectedPlaceOpenVenueButton}
        </div>
        {selectedPlaceHasLiveDare ? null : (
          <p className="venue-cta-hint">Check in with GPS + QR to leave verified proof.</p>
        )}
        <div
          className={`venue-action-rail venue-action-rail--primary venue-action-rail--utility ${selectedPlaceUtilityRailColumns} ${
            selectedPlaceFundIsActivationCta ? 'venue-action-rail--utility-solo' : ''
          } grid ${showCompactSelectedPlacePanel ? 'venue-action-rail--compact-dock' : ''}`}
        >
          {selectedPlaceHasLiveDare ? selectedPlaceTakeProofButton : null}
          {selectedPlaceFundDareButton}
          {selectedPlaceBaseCashButton}
        </div>
        {selectedPlace.slug ? (
          <button
            type="button"
            onClick={() => {
              triggerHaptic('selection');
              setMeetupComposerOpen(true);
            }}
            className="mt-1 w-full rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-white/55 transition hover:border-white/22 hover:text-white/85"
          >
            🤙 Start a free meetup here
          </button>
        ) : null}
      </div>
    ) : null;
  const selectedSaveSpotRail =
    saveSpotDraft || selectedPrivateMapSpot ? (
      <div className="map-panel-section map-save-spot-rail mt-3 rounded-[22px] border border-emerald-300/16 bg-[linear-gradient(180deg,rgba(16,185,129,0.1)_0%,rgba(7,12,15,0.92)_100%)] px-3 py-3 shadow-[0_14px_28px_rgba(0,0,0,0.16),inset_0_1px_0_rgba(255,255,255,0.06),inset_0_-10px_16px_rgba(0,0,0,0.2)]">
        <input
          ref={saveSpotPhotoInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(event) => void handleSaveSpotPhotoChange(event.target.files?.[0] ?? null)}
        />

        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.24em] text-emerald-100/82">
              <Bike className="h-3.5 w-3.5 text-emerald-200" />
              Private Spot
            </div>
            <p className="mt-1.5 text-sm font-semibold text-white">
              {saveSpotDraft ? 'Save something you need to find later.' : 'Saved on this device.'}
            </p>
          </div>
          {saveSpotDraft ? (
            <span className="shrink-0 rounded-full border border-emerald-300/18 bg-emerald-400/[0.08] px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-emerald-100/74">
              Drag pin
            </span>
          ) : null}
        </div>

        {saveSpotDraft ? (
          <div className="map-save-spot-scroll mt-3 space-y-3">
            <div className="flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {PRIVATE_MAP_SPOT_LABELS.map((label) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => setSaveSpotDraft((current) => (current ? { ...current, label } : current))}
                  data-active={saveSpotDraft.label === label}
                  className="shrink-0 rounded-full border border-white/10 bg-white/[0.045] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-white/52 transition hover:border-emerald-200/28 hover:text-emerald-100 data-[active=true]:border-emerald-200/34 data-[active=true]:bg-emerald-300/[0.1] data-[active=true]:text-emerald-50"
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="map-save-spot-fields grid grid-cols-[76px_1fr] gap-2.5 sm:grid-cols-[86px_1fr] sm:gap-3">
              <button
                type="button"
                onClick={() => saveSpotPhotoInputRef.current?.click()}
                disabled={saveSpotPhotoLoading}
                className="map-save-spot-photo relative flex min-h-[76px] items-center justify-center overflow-hidden rounded-[18px] border border-white/10 bg-black/24 text-white/62 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),inset_0_-10px_16px_rgba(0,0,0,0.2)] sm:min-h-[86px]"
                aria-label="Add parking photo"
              >
                {saveSpotDraft.photoDataUrl ? (
                  <img src={saveSpotDraft.photoDataUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
                ) : saveSpotPhotoLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Camera className="h-5 w-5" />
                )}
                <span className="absolute bottom-1.5 left-1.5 rounded-full border border-white/10 bg-black/54 px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.12em] text-white/70">
                  Photo
                </span>
              </button>

              <div className="min-w-0 space-y-2">
                <div className="rounded-[16px] border border-white/8 bg-black/20 px-3 py-2">
                  <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.18em] text-white/36">
                    <Move className="h-3 w-3" />
                    Pin
                  </div>
                  <p className="mt-1 truncate text-xs font-semibold text-white/76">
                    {saveSpotDraft.landmark ?? formatCoordinateLabel(saveSpotDraft.latitude, saveSpotDraft.longitude)}
                  </p>
                </div>
                <input
                  value={saveSpotDraft.note}
                  onChange={(event) =>
                    setSaveSpotDraft((current) =>
                      current ? { ...current, note: event.target.value.slice(0, 80) } : current
                    )
                  }
                  placeholder="Optional clue: by entrance, under palm..."
                  className="w-full rounded-[16px] border border-white/8 bg-black/22 px-3 py-2 text-xs text-white outline-none placeholder:text-white/28 focus:border-emerald-200/28"
                />
              </div>
            </div>

            {saveSpotState ? (
              <p
                className={`text-xs leading-5 ${
                  saveSpotState.type === 'error'
                    ? 'text-rose-200/82'
                    : saveSpotState.type === 'success'
                      ? 'text-emerald-100/80'
                      : 'text-white/48'
                }`}
              >
                {saveSpotState.message}
              </p>
            ) : null}

            <div className="map-save-spot-actions grid grid-cols-[1fr_1fr] gap-2">
              <button
                type="button"
                onClick={() => setSaveSpotDraft(null)}
                className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.045] px-3 text-[10px] font-black uppercase tracking-[0.16em] text-white/58 transition hover:border-white/18 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSavePrivateSpot}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-emerald-200/24 bg-[linear-gradient(180deg,rgba(16,185,129,0.22)_0%,rgba(7,13,13,0.94)_100%)] px-3 text-[10px] font-black uppercase tracking-[0.16em] text-emerald-50 shadow-[0_12px_24px_rgba(0,0,0,0.22),inset_0_1px_0_rgba(255,255,255,0.1)] transition hover:-translate-y-[1px] hover:border-emerald-100/40"
              >
                <Save className="h-3.5 w-3.5" />
                Save
              </button>
            </div>
          </div>
        ) : selectedPrivateMapSpot ? (
          <div className="map-save-spot-scroll mt-3 space-y-3">
            <div className="grid grid-cols-[72px_1fr] gap-3 rounded-[18px] border border-white/8 bg-black/18 p-2.5">
              <div className="relative h-[72px] overflow-hidden rounded-[16px] border border-white/10 bg-white/[0.045]">
                {selectedPrivateMapSpot.photoDataUrl ? (
                  <img src={selectedPrivateMapSpot.photoDataUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-white/40">
                    <ImageIcon className="h-5 w-5" />
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-black text-white">{selectedPrivateMapSpot.label}</p>
                <p className="mt-1 truncate text-xs text-white/50">
                  {selectedPrivateMapSpot.landmark ?? formatCoordinateLabel(selectedPrivateMapSpot.latitude, selectedPrivateMapSpot.longitude)}
                </p>
                {selectedPrivateMapSpot.note ? (
                  <p className="mt-1 line-clamp-2 text-xs text-white/62">{selectedPrivateMapSpot.note}</p>
                ) : null}
                <p className="mt-1 text-[10px] font-black uppercase tracking-[0.14em] text-white/34">
                  {getCompactTimeAgo(selectedPrivateMapSpot.createdAt)} ago
                </p>
              </div>
            </div>

            <div className="grid grid-cols-[1fr_auto] gap-2">
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${selectedPrivateMapSpot.latitude},${selectedPrivateMapSpot.longitude}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-cyan-200/18 bg-cyan-300/[0.075] px-3 text-[10px] font-black uppercase tracking-[0.14em] text-cyan-50 transition hover:border-cyan-100/36"
              >
                <Navigation className="h-3.5 w-3.5" />
                Navigate
              </a>
              <button
                type="button"
                onClick={() => deletePrivateSpot(selectedPrivateMapSpot.id)}
                className="inline-flex min-h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.045] text-white/52 transition hover:border-rose-200/30 hover:text-rose-100"
                aria-label="Delete saved spot"
                title="Delete"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ) : null}
      </div>
    ) : null;
  const selectedPlaceCheckInRail = selectedPlace?.slug && selectedCheckInLive ? (
    <div className="map-panel-section mt-3 rounded-[22px] border border-cyan-300/16 bg-[linear-gradient(180deg,rgba(34,211,238,0.1)_0%,rgba(7,12,18,0.9)_100%)] px-3 py-3 shadow-[0_14px_28px_rgba(0,0,0,0.16),inset_0_1px_0_rgba(255,255,255,0.06),inset_0_-10px_16px_rgba(0,0,0,0.2)]">
      <div className="grid grid-cols-[1fr_auto] items-center gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.24em] text-cyan-100/82">
            <ShieldCheck className="h-3.5 w-3.5 text-cyan-200" />
            Check-In
          </div>
          <p className="mt-1.5 truncate text-sm font-semibold text-white">
            {selectedCheckInLive ? 'Scan the venue QR to check in.' : 'Venue QR is not live yet.'}
          </p>
        </div>
        <span className="rounded-full border border-cyan-300/20 bg-cyan-500/[0.1] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-100">
          {selectedCheckInStatusLabel}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-[1fr_auto] items-center gap-2 rounded-[18px] border border-white/8 bg-black/18 px-3 py-2.5">
        <div className="min-w-0">
          <div className="flex flex-wrap gap-1.5">
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.16em] text-white/52">
              {selectedPlace.checkInRadiusMeters ?? 120}m
            </span>
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.16em] text-white/52">
              {selectedCheckInCountToday} today
            </span>
          </div>
          <p className="mt-1.5 truncate text-xs text-white/54">
            {selectedCheckInLive ? 'Verified check-ins only.' : 'Opens when the venue QR is live.'}
          </p>
        </div>
        <button
          type="button"
          onClick={handleLaunchVenueCheckIn}
          disabled={checkInLaunching}
          className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-full border border-cyan-200/24 bg-[linear-gradient(180deg,rgba(34,211,238,0.2)_0%,rgba(7,14,20,0.94)_100%)] px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-cyan-50 shadow-[0_12px_24px_rgba(0,0,0,0.22),inset_0_1px_0_rgba(255,255,255,0.1),inset_0_-12px_18px_rgba(0,0,0,0.24)] transition hover:-translate-y-[1px] hover:border-cyan-100/42 disabled:cursor-wait disabled:opacity-60 disabled:hover:translate-y-0"
        >
          {checkInLaunching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />}
          {checkInLaunching ? 'Opening' : selectedCheckInLive ? 'Check in' : 'QR'}
        </button>
      </div>

      {checkInLaunchState ? (
        <p
          className={`mt-2 text-xs leading-5 ${
            checkInLaunchState.type === 'error' ? 'text-rose-200/82' : 'text-cyan-100/78'
          }`}
        >
          {checkInLaunchState.message}
        </p>
      ) : null}
    </div>
  ) : null;
  const selectedPresenceActiveCount =
    selectedPresenceSummary?.activeCount ?? (activePresenceIsSelectedVenue ? 1 : 0);
  const selectedPlacePresenceRail = selectedPlace ? (
    <div className="map-panel-section mt-3 rounded-[22px] border border-emerald-300/16 bg-[linear-gradient(180deg,rgba(16,185,129,0.1)_0%,rgba(7,13,13,0.9)_100%)] px-3 py-3 shadow-[0_14px_28px_rgba(0,0,0,0.16),inset_0_1px_0_rgba(255,255,255,0.06),inset_0_-10px_16px_rgba(0,0,0,0.2)]">
      <div className="grid grid-cols-[1fr_auto] items-center gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.24em] text-emerald-100/82">
            <LocateFixed className="h-3.5 w-3.5 text-emerald-200" />
            Who&apos;s Here
          </div>
          <p className="mt-1.5 truncate text-sm font-semibold text-white">
            {activePresenceIsSelectedVenue
              ? `You're here ${getExpiryLabel(activePresenceSignal?.expiresAt ?? null)}.`
              : selectedPresenceActiveCount > 0
                ? `${selectedPresenceActiveCount} nearby now.`
                : 'Show that you are here.'}
          </p>
        </div>
        <span className="rounded-full border border-emerald-300/20 bg-emerald-500/[0.1] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-100">
          {selectedPresenceActiveCount} here
        </span>
      </div>

      <div className="mt-3 grid grid-cols-[1fr_auto] items-center gap-2 rounded-[18px] border border-white/8 bg-black/20 px-3 py-2.5">
        <div className="min-w-0">
          <div className="flex flex-wrap gap-1.5">
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.16em] text-white/52">
              {presenceDurationMinutes}m
            </span>
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.16em] text-white/52">
              {presenceVisibility}
            </span>
          </div>
          <p className="mt-1.5 truncate text-xs text-white/54">
            {userLocation ? 'Approximate only. Exact location stays private.' : 'Location needed to signal.'}
          </p>
        </div>
        <button
          type="button"
          onClick={userLocation ? handleSignalPresence : requestApproximateLocation}
          disabled={presenceSubmitting}
          className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-full border border-emerald-300/24 bg-[linear-gradient(180deg,rgba(16,185,129,0.18)_0%,rgba(8,14,14,0.92)_100%)] px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-emerald-100 shadow-[0_12px_24px_rgba(0,0,0,0.22),inset_0_1px_0_rgba(255,255,255,0.08)] transition hover:-translate-y-[1px] hover:border-emerald-200/40 disabled:cursor-wait disabled:opacity-60 disabled:hover:translate-y-0"
        >
          {presenceSubmitting ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : userLocation ? (
            activePresenceIsSelectedVenue ? 'Refresh' : "I'm here"
          ) : (
            'Locate'
          )}
        </button>
      </div>

      {presenceSubmitState ? (
        <p
          className={`mt-2 text-xs leading-5 ${
            presenceSubmitState.type === 'success' ? 'text-emerald-100/78' : 'text-rose-200/82'
          }`}
        >
          {presenceSubmitState.message}
        </p>
      ) : null}
      {presenceReceipt ? (
        <ReceiptShareCard
          compact
          title={presenceReceipt.title}
          detail={presenceReceipt.detail}
          href={presenceReceipt.href}
          venueName={presenceReceipt.venueName}
          timestamp={presenceReceipt.timestamp}
          tone={presenceReceipt.tone}
          className="mt-3"
        />
      ) : null}
    </div>
  ) : null;
  const venueRoomUnlocked = Boolean(venueRoomAccess?.unlocked);
  const visibleVenueRoomPeople = venueRoomWhoHere.slice(0, venueRoomExpanded ? 8 : 5);
  const visibleVenueRoomMessages = venueRoomMessages.slice(venueRoomExpanded ? -10 : -4);
  const selectedVenueRoomRail = selectedPlace?.slug ? (
    <div
      className={`map-panel-section mt-3 rounded-[22px] border border-violet-300/16 bg-[linear-gradient(180deg,rgba(168,85,247,0.12)_0%,rgba(10,8,18,0.92)_100%)] px-3 py-3 shadow-[0_14px_28px_rgba(0,0,0,0.16),inset_0_1px_0_rgba(255,255,255,0.06),inset_0_-10px_16px_rgba(0,0,0,0.2)] ${
        venueRoomExpanded ? 'ring-1 ring-violet-200/18' : ''
      }`}
    >
      <div className="grid grid-cols-[1fr_auto] items-center gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.24em] text-violet-100/82">
            <Users className="h-3.5 w-3.5 text-violet-200" />
            Local Chat
          </div>
          <p className="mt-1.5 truncate text-sm font-semibold text-white">
            {venueRoomUnlocked ? 'Chat unlocked here.' : 'Check in or get nearby.'}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <span className="rounded-full border border-violet-300/20 bg-violet-500/[0.1] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-violet-100">
            {venueRoomAccess?.ttlHours ?? 24}h
          </span>
          <button
            type="button"
            onClick={() => {
              triggerHaptic('selection');
              setSelectedPlacePanelExpanded(true);
              setVenueRoomExpanded((current) => !current);
            }}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/[0.045] text-white/60 transition hover:border-violet-200/28 hover:text-violet-100"
            aria-label={venueRoomExpanded ? 'Compact venue room' : 'Expand venue room'}
            title={venueRoomExpanded ? 'Compact room' : 'Expand room'}
          >
            {venueRoomExpanded ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      <div className="mt-3 rounded-[18px] border border-white/8 bg-black/20 px-3 py-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <span className="text-[9px] font-black uppercase tracking-[0.18em] text-white/38">In the room</span>
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.14em] text-white/46">
              {venueRoomWhoHere.length}
            </span>
          </div>
          {venueRoomLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin text-violet-100/70" /> : null}
        </div>

        <div className="mt-2 flex min-h-8 items-center gap-1.5 overflow-hidden">
          {venueRoomWhoHere.length > 0 ? (
            visibleVenueRoomPeople.map((person) => (
              <div
                key={person.id}
                className="inline-flex min-w-0 max-w-[7.75rem] items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.045] py-1 pl-1 pr-2 text-[10px] font-semibold text-white/72"
                title={`${person.displayName} · ${getCompactTimeAgo(person.lastSeenAt)} ago`}
              >
                <span className="relative inline-flex h-5 w-5 shrink-0 items-center justify-center overflow-hidden rounded-full border border-violet-200/18 bg-violet-500/[0.14] text-[9px] font-black text-violet-100">
                  {person.avatarUrl ? (
                    <img src={person.avatarUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
                  ) : (
                    getRoomInitial(person.displayName)
                  )}
                </span>
                <span className="truncate">{person.displayName}</span>
              </div>
            ))
          ) : (
            <span className="text-xs text-white/42">No one visible yet.</span>
          )}
        </div>
      </div>

      {venueRoomUnlocked ? (
        <div className="mt-2 space-y-2">
          <div
            className={`space-y-1.5 overflow-y-auto rounded-[18px] border border-white/8 bg-black/18 p-2 ${
              venueRoomExpanded ? 'max-h-[22rem]' : 'max-h-36'
            }`}
          >
            {venueRoomMessages.length > 0 ? (
              visibleVenueRoomMessages.map((message) => {
                if (message.kind === 'receipt') {
                  return (
                    <ReceiptShareCard
                      key={message.id}
                      compact
                      title={getRoomReceiptTitle(message.receiptType)}
                      detail={message.body}
                      href={message.href ?? (selectedPlace?.slug ? `/map?place=${encodeURIComponent(selectedPlace.slug)}&room=1` : '/map')}
                      venueName={selectedPlace?.name ?? null}
                      actorLabel={message.displayName}
                      timestamp={message.createdAt}
                      tone={
                        message.tone === 'emerald' || message.tone === 'gold' || message.tone === 'cyan' || message.tone === 'violet'
                          ? message.tone
                          : 'violet'
                      }
                    />
                  );
                }

                return (
                  <div
                    key={message.id}
                    className={`rounded-[14px] border px-2.5 py-2 ${
                      message.mine
                        ? 'border-violet-300/20 bg-violet-500/[0.1]'
                        : 'border-white/8 bg-white/[0.035]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="min-w-0 truncate text-[10px] font-black uppercase tracking-[0.13em] text-white/58">
                        {message.displayName}
                      </span>
                      <span className="shrink-0 text-[9px] font-semibold uppercase tracking-[0.12em] text-white/30">
                        {getCompactTimeAgo(message.createdAt)}
                      </span>
                    </div>
                    <p className="mt-1 break-words text-xs leading-5 text-white/76">{message.body}</p>
                  </div>
                );
              })
            ) : (
              <div className="rounded-[14px] border border-white/8 bg-white/[0.03] px-3 py-3 text-xs text-white/46">
                Room is quiet.
              </div>
            )}
          </div>

          <div className="grid grid-cols-[1fr_auto] gap-2">
            <textarea
              value={venueRoomDraft}
              onChange={(event) => setVenueRoomDraft(event.target.value.slice(0, 280))}
              rows={venueRoomExpanded ? 3 : 2}
              maxLength={280}
              placeholder="Write a message..."
              className={`resize-none rounded-[16px] border border-white/10 bg-black/28 px-3 py-2 text-xs leading-5 text-white placeholder:text-white/28 outline-none shadow-[inset_0_1px_0_rgba(255,255,255,0.05),inset_0_-10px_16px_rgba(0,0,0,0.2)] focus:border-violet-200/32 ${
                venueRoomExpanded ? 'min-h-[72px]' : 'min-h-[48px]'
              }`}
            />
            <button
              type="button"
              onClick={handlePostVenueRoomMessage}
              disabled={venueRoomSending || !venueRoomDraft.trim()}
              className="inline-flex h-full min-h-12 w-12 shrink-0 items-center justify-center rounded-[16px] border border-violet-300/24 bg-[linear-gradient(180deg,rgba(168,85,247,0.2)_0%,rgba(12,9,20,0.94)_100%)] text-violet-100 shadow-[0_12px_24px_rgba(0,0,0,0.22),inset_0_1px_0_rgba(255,255,255,0.08)] transition hover:-translate-y-[1px] hover:border-violet-200/40 disabled:cursor-wait disabled:opacity-50 disabled:hover:translate-y-0"
              aria-label="Post venue room message"
              title="Post"
            >
              {venueRoomSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </div>

          <button
            type="button"
            onClick={handleToggleVenueRoomVisibility}
            disabled={venueRoomPresenceUpdating}
            data-active={venueRoomVisible}
            className="inline-flex min-h-9 w-full items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.035] px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-white/52 transition hover:border-white/18 hover:text-white data-[active=true]:border-emerald-300/24 data-[active=true]:bg-emerald-500/[0.1] data-[active=true]:text-emerald-100 disabled:cursor-wait disabled:opacity-60"
          >
            {venueRoomPresenceUpdating ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : venueRoomVisible ? (
              <Eye className="h-3.5 w-3.5" />
            ) : (
              <EyeOff className="h-3.5 w-3.5" />
            )}
            {venueRoomVisible ? 'Visible in the room' : 'Hidden from the room'}
          </button>
        </div>
      ) : (
        <div className="mt-2 grid grid-cols-[1fr_auto] items-center gap-2 rounded-[18px] border border-white/8 bg-black/18 px-3 py-2.5">
          <p className="min-w-0 text-xs leading-5 text-white/52">
            {venueRoomAccess?.reason ?? 'Check in or get nearby to open this room.'}
          </p>
          {userLocation ? (
            <button
              type="button"
              onClick={requestApproximateLocation}
              disabled={locating}
              className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-full border border-violet-300/24 bg-violet-500/[0.1] px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-violet-100 transition hover:-translate-y-[1px] hover:border-violet-200/40 disabled:cursor-wait disabled:opacity-60 disabled:hover:translate-y-0"
            >
              {locating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LocateFixed className="h-3.5 w-3.5" />}
              Refresh
            </button>
          ) : null}
        </div>
      )}

      {venueRoomState ? (
        <p className={`mt-2 text-xs leading-5 ${venueRoomState.type === 'error' ? 'text-rose-200/82' : 'text-violet-100/76'}`}>
          {venueRoomState.message}
        </p>
      ) : null}
    </div>
  ) : null;

  const spotVaultWorthItPercent = spotVault?.reviews.count
    ? Math.round(spotVault.reviews.worthItRatio * 100)
    : null;
  const spotVaultReviewActionLabel = spotVault?.reviews.mine ? 'Update signal' : 'Leave signal';
  // One empty-state, not four: when the vault has zero proof/visitors/wins,
  // zero timeline, and zero reviews, the header line carries the message and
  // the zero-count stat grid + "No reviews yet" + "Vault is empty" all hide.
  const spotVaultIsEmpty =
    !spotVaultLoading &&
    !spotVaultError &&
    Boolean(spotVault) &&
    (spotVault?.timeline.length ?? 0) === 0 &&
    (spotVault?.reviews.count ?? 0) === 0 &&
    (spotVault?.stats.proofs ?? selectedPlace?.approvedCount ?? 0) === 0 &&
    (spotVault?.stats.uniqueVisitors ?? 0) === 0 &&
    (spotVault?.stats.completedDares ?? 0) === 0;

  const selectedSpotVaultRail = selectedPlace?.slug ? (
    <div className="map-panel-section mt-3 rounded-[22px] border border-[#f5c518]/16 bg-[linear-gradient(180deg,rgba(245,197,24,0.10)_0%,rgba(12,10,18,0.94)_34%,rgba(6,7,12,0.96)_100%)] px-3 py-3 shadow-[0_14px_28px_rgba(0,0,0,0.16),inset_0_1px_0_rgba(255,255,255,0.06),inset_0_-10px_16px_rgba(0,0,0,0.2)]">
      <div className="grid grid-cols-[1fr_auto] items-center gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.24em] text-[#f8dd72]/82">
            <ShieldCheck className="h-3.5 w-3.5 text-[#f8dd72]" />
            Spot Vault
          </div>
          <p className="mt-1.5 truncate text-sm font-semibold text-white">
            {spotVaultLoading
              ? 'Reading permanent signal...'
              : spotVault?.timeline.length
                ? 'Permanent proof trail.'
                : 'No proof yet — be the first to check in.'}
          </p>
        </div>
        <span className="rounded-full border border-[#f5c518]/22 bg-[#f5c518]/[0.1] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#f8dd72]">
          {spotVault?.timeline.length ?? 0} signal
        </span>
      </div>

      {spotVaultIsEmpty
        ? null
        : (() => {
            const vaultStats = [
              { label: 'Proof', value: spotVault?.stats.proofs ?? selectedPlace.approvedCount ?? 0 },
              { label: 'Visitors', value: spotVault?.stats.uniqueVisitors ?? 0 },
              { label: 'Wins', value: spotVault?.stats.completedDares ?? 0 },
            ].filter((stat) => stat.value > 0);
            if (vaultStats.length === 0) return null;
            return (
              <div
                className={`mt-3 grid gap-2 ${
                  vaultStats.length === 3 ? 'grid-cols-3' : vaultStats.length === 2 ? 'grid-cols-2' : 'grid-cols-1'
                }`}
              >
                {vaultStats.map((stat) => (
                  <div key={stat.label} className="rounded-[16px] border border-white/8 bg-black/20 px-2.5 py-2">
                    <p className="text-[9px] font-black uppercase tracking-[0.16em] text-white/34">{stat.label}</p>
                    <p className="mt-1 text-lg font-black leading-none text-white">{stat.value}</p>
                  </div>
                ))}
              </div>
            );
          })()}

      <div className="mt-2 rounded-[18px] border border-white/8 bg-black/18 px-3 py-2.5">
        <div className="flex items-start justify-between gap-3">
          <p className="min-w-0 text-xs leading-5 text-white/58">
            {spotVault?.viewer.reason ?? 'Open this spot to read the vault. Check in to leave permanent signal later.'}
          </p>
          {spotVault?.viewer.canLeaveSignal ? (
            <span className="shrink-0 rounded-full border border-emerald-300/20 bg-emerald-500/[0.1] px-2 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-emerald-100">
              unlocked
            </span>
          ) : (
            <span className="shrink-0 rounded-full border border-white/10 bg-white/[0.04] px-2 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-white/42">
              read-only
            </span>
          )}
        </div>
      </div>

      {!spotVaultLoading && !spotVaultError && spotVault && (!spotVaultIsEmpty || spotVault.viewer.canLeaveSignal) ? (
        <div className="mt-2 rounded-[18px] border border-white/8 bg-black/18 px-3 py-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/38">Field reviews</p>
              <p className="mt-1 text-sm font-semibold text-white">
                {spotVault.reviews.count > 0
                  ? `${spotVaultWorthItPercent}% worth it`
                  : 'No reviews yet'}
              </p>
            </div>
            <span className="shrink-0 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-white/48">
              {spotVault.reviews.count} note{spotVault.reviews.count === 1 ? '' : 's'}
            </span>
          </div>

          {spotVault.viewer.canLeaveSignal ? (
            <div className="mt-3 rounded-[16px] border border-[#f5c518]/14 bg-[#f5c518]/[0.055] px-2.5 py-2.5">
              <div className="grid grid-cols-2 gap-2">
                {(['worth_it', 'skip'] as const).map((verdict) => {
                  const selected = spotVaultReviewVerdict === verdict;
                  return (
                    <button
                      key={verdict}
                      type="button"
                      onClick={() => {
                        setSpotVaultReviewVerdict(verdict);
                        triggerHaptic('selection');
                      }}
                      className={`rounded-[14px] border px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] transition ${
                        selected
                          ? verdict === 'worth_it'
                            ? 'border-[#f5c518]/48 bg-[#f5c518]/18 text-[#fff1a8] shadow-[0_8px_22px_rgba(245,197,24,0.12)]'
                            : 'border-rose-200/36 bg-rose-500/[0.11] text-rose-100'
                          : 'border-white/10 bg-black/18 text-white/44 hover:border-white/18 hover:text-white/72'
                      }`}
                      disabled={spotVaultReviewSubmitting}
                    >
                      {verdict === 'worth_it' ? '🔥 Worth it' : '💀 Skip'}
                    </button>
                  );
                })}
              </div>
              <textarea
                value={spotVaultReviewNote}
                onChange={(event) => setSpotVaultReviewNote(event.target.value)}
                maxLength={180}
                rows={2}
                placeholder="One clean line for the next explorer..."
                className="mt-2 w-full resize-none rounded-[14px] border border-white/10 bg-black/24 px-3 py-2 text-xs leading-5 text-white/82 outline-none transition placeholder:text-white/30 focus:border-[#f5c518]/34 focus:bg-black/34"
                disabled={spotVaultReviewSubmitting}
              />
              <div className="mt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void handleSubmitSpotVaultReview()}
                  disabled={spotVaultReviewSubmitting}
                  className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-full border border-[#f5c518]/36 bg-[#f5c518] px-4 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-black shadow-[0_10px_26px_rgba(245,197,24,0.18)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-55"
                >
                  {spotVaultReviewSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                  {spotVaultReviewActionLabel}
                </button>
                {spotVault.reviews.mine ? (
                  <button
                    type="button"
                    onClick={() => void handleRetractSpotVaultReview()}
                    disabled={spotVaultReviewSubmitting}
                    className="inline-flex min-h-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] px-3 text-white/48 transition hover:border-rose-200/24 hover:text-rose-100 disabled:cursor-not-allowed disabled:opacity-55"
                    aria-label="Retract vault signal"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                ) : null}
              </div>
              {spotVaultReviewState ? (
                <p className={`mt-2 text-xs leading-5 ${spotVaultReviewState.type === 'error' ? 'text-rose-200/82' : 'text-[#fff1a8]/76'}`}>
                  {spotVaultReviewState.message}
                </p>
              ) : null}
            </div>
          ) : null}

          {spotVault.reviews.recent.length ? (
            <div className="mt-3 space-y-1.5">
              {spotVault.reviews.recent.slice(0, 3).map((review) => (
                <div
                  key={review.id}
                  className="rounded-[14px] border border-white/8 bg-white/[0.035] px-2.5 py-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="min-w-0 truncate text-xs font-semibold text-white/76">
                      {review.walletLabel}
                    </span>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <span className={`rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.12em] ${
                        review.verdict === 'worth_it'
                          ? 'border-[#f5c518]/22 bg-[#f5c518]/[0.1] text-[#fff1a8]'
                          : 'border-rose-200/18 bg-rose-500/[0.08] text-rose-100/80'
                      }`}>
                        {review.verdict === 'worth_it' ? 'Worth it' : 'Skip'}
                      </span>
                      {!review.mine ? (
                        <button
                          type="button"
                          onClick={() => void handleReportSpotVaultReview(review.id)}
                          disabled={Boolean(spotVaultReviewReportingId)}
                          className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-white/10 bg-black/18 text-white/36 transition hover:border-rose-200/24 hover:text-rose-100 disabled:cursor-not-allowed disabled:opacity-45"
                          aria-label="Flag vault review"
                        >
                          {spotVaultReviewReportingId === review.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <ShieldCheck className="h-3 w-3" />
                          )}
                        </button>
                      ) : null}
                    </div>
                  </div>
                  {review.note ? (
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-white/54">{review.note}</p>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}

          {spotVaultReviewState && !spotVault.viewer.canLeaveSignal ? (
            <p className={`mt-2 text-xs leading-5 ${spotVaultReviewState.type === 'error' ? 'text-rose-200/82' : 'text-[#fff1a8]/76'}`}>
              {spotVaultReviewState.message}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="mt-2 space-y-2">
        {spotVaultLoading ? (
          <div className="flex items-center gap-2 rounded-[18px] border border-white/8 bg-white/[0.03] px-3 py-3 text-xs text-white/48">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-[#f8dd72]" />
            Reading the vault...
          </div>
        ) : spotVaultError ? (
          <p className="rounded-[18px] border border-rose-300/14 bg-rose-500/[0.08] px-3 py-3 text-xs leading-5 text-rose-100/78">
            {spotVaultError}
          </p>
        ) : spotVault?.timeline.length ? (
          spotVault.timeline.slice(0, 5).map((item) => (
            <Link
              key={item.id}
              href={item.href ?? `/venues/${selectedPlace.slug}`}
              className="block rounded-[18px] border border-white/8 bg-white/[0.035] px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition hover:border-[#f5c518]/18 hover:bg-white/[0.05]"
            >
              <div className="flex items-start gap-3">
                {item.mediaUrl ? (
                  <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-[14px] border border-white/10 bg-black/30">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.mediaUrl}
                      alt=""
                      loading="lazy"
                      className="h-full w-full object-cover opacity-90"
                    />
                  </div>
                ) : (
                  <span className={`inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] border ${getSpotVaultToneClass(item.tone)}`}>
                    {item.kind === 'DARE' ? (
                      <Zap className="h-4 w-4" />
                    ) : item.kind === 'MEMORY' ? (
                      <Users className="h-4 w-4" />
                    ) : (
                      <Camera className="h-4 w-4" />
                    )}
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="line-clamp-1 text-sm font-semibold text-white">{item.title}</p>
                    <span className="shrink-0 text-[9px] font-semibold uppercase tracking-[0.12em] text-white/30">
                      {getCompactTimeAgo(item.occurredAt)}
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs leading-5 text-white/58">{item.body}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <span className={`rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.14em] ${getSpotVaultToneClass(item.tone)}`}>
                      {getSpotVaultKindLabel(item.kind)}
                    </span>
                    {item.actorLabel ? (
                      <span className="max-w-[8rem] truncate rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.12em] text-white/46">
                        {item.actorLabel}
                      </span>
                    ) : null}
                    {item.badges.slice(0, 2).map((badge) => (
                      <span
                        key={`${item.id}:${badge}`}
                        className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.12em] text-white/40"
                      >
                        {badge}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </Link>
          ))
        ) : spotVaultIsEmpty ? null : (
          <div className="rounded-[18px] border border-white/8 bg-white/[0.03] px-3 py-3">
            <p className="text-sm font-semibold text-white">Vault is empty.</p>
            <p className="mt-1.5 text-xs leading-5 text-white/54">
              First proof or a verified dare turns this spot into a real BaseDare trail.
            </p>
          </div>
        )}
      </div>
    </div>
  ) : null;

  return (
    <section
      className={
        isImmersiveMobile
          ? 'fixed inset-0 z-[90] overflow-hidden bg-[rgba(4,5,14,0.98)] md:relative md:z-20 md:overflow-visible md:bg-transparent'
          : 'map-shell-section relative z-20 px-4 pb-20 pt-4 sm:px-6 sm:pb-24 sm:pt-5'
      }
    >
      <div className={isImmersiveMobile ? 'h-full w-full' : 'map-shell-inner w-full'}>
        {!isImmersiveMobile ? (
          <h1 className="sr-only">BaseDare live map</h1>
        ) : null}

        <div
          onPointerDownCapture={(event) => {
            if (!searchPopoverOpen) return;
            const target = event.target;
            if (target instanceof Node && searchShellRef.current?.contains(target)) return;
            closeSearchPopover();
          }}
          className={`map-shell-frame relative overflow-hidden border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05)_0%,rgba(9,7,19,0.96)_18%,rgba(5,4,14,0.98)_100%)] shadow-[0_30px_120px_rgba(0,0,0,0.58),0_0_42px_rgba(34,211,238,0.08),inset_0_1px_0_rgba(255,255,255,0.1),inset_0_-18px_24px_rgba(0,0,0,0.26)] ${isImmersiveMobile ? 'fixed inset-0 z-[95] flex h-[100dvh] flex-col rounded-none border-0 shadow-none' : 'rounded-[34px]'}`}
          style={
            isImmersiveMobile
              ? {
                  paddingTop: 'env(safe-area-inset-top)',
                  paddingBottom: 'env(safe-area-inset-bottom)',
                  boxSizing: 'border-box',
                }
              : undefined
          }
        >
          {!isImmersiveMobile ? (
            <HoneyGooAccent className="absolute right-7 top-[-2px] z-[32] hidden xl:block" size="sm" />
          ) : null}
          <div className="map-card-ambient pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_0%,rgba(168,85,247,0.12),transparent_28%),radial-gradient(circle_at_85%_100%,rgba(34,211,238,0.12),transparent_30%)]" />

          <div
            className={`map-command-header relative z-20 flex shrink-0 flex-col gap-1.5 border-b border-white/8 ${
              isImmersiveMobile ? 'rounded-none px-3 py-2' : 'rounded-t-[34px] px-3 py-2 sm:px-4 sm:py-2.5'
            }`}
          >
            <div ref={searchShellRef} className="relative w-full max-w-xl">
              <div className="bd-dent-surface bd-dent-surface--soft flex items-center gap-3 rounded-[22px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06)_0%,rgba(8,9,16,0.94)_100%)] px-4 py-2.5">
                <Search className="h-4 w-4 text-cyan-200" />
                <input
                  value={searchQuery}
                  onFocus={() => setSearchPopoverOpen(true)}
                  onChange={(event) => {
                    setSearchQuery(event.target.value);
                    setSearchPopoverOpen(true);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Escape') {
                      event.currentTarget.blur();
                      closeSearchPopover();
                    }
                  }}
                  placeholder="Search breakfast, coffee, beach..."
                  className="min-h-9 w-full bg-transparent text-sm text-white placeholder:text-white/30 focus:outline-none"
                />
                {searching ? <Loader2 className="h-4 w-4 animate-spin text-white/45" /> : null}
              </div>

              {searchPopoverOpen ? (
                <div className="map-intent-row">
                  {visibleMapIntentChips.map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      onMouseDown={(event) => event.preventDefault()}
                      data-active={searchQuery.trim().toLowerCase() === chip.toLowerCase()}
                      onClick={() => {
                        setSearchQuery(chip.toLowerCase());
                        setSearchPopoverOpen(true);
                      }}
                      className="map-intent-chip"
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              ) : null}

              {searchPopoverOpen && searchResults.length > 0 ? (
                <div className="map-search-popover absolute left-0 right-0 top-[calc(100%+10px)] z-40 overflow-hidden rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(14,16,26,0.98)_0%,rgba(7,8,16,0.98)_100%)] shadow-[0_24px_60px_rgba(0,0,0,0.45)]">
                  {searchResults.map((result) => (
                    <button
                      key={result.id}
                      type="button"
                      onClick={() => {
                        skipNextSearchRef.current = true;
                        setSearchQuery(result.name);
                        closeSearchPopover();
                        setSelectedPlace({
                          placeId: result.placeId,
                          slug: result.slug,
                          name: result.name,
                          address: result.address,
                          city: result.city,
                          country: result.country,
                          latitude: result.latitude,
                          longitude: result.longitude,
                          categories: result.categories,
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
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-white">{result.name}</p>
                        {result.matchReason ? (
                          <p className="mt-1 text-[11px] font-black uppercase tracking-[0.12em] text-cyan-100/70">
                            {result.matchReason}
                          </p>
                        ) : null}
                        <p className="mt-1 line-clamp-2 text-xs text-white/45">{result.displayName}</p>
                      </div>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            <div className={`map-top-control-stack ${isImmersiveMobile ? 'hidden' : ''}`}>
              <div className="map-status-rail">
                {isMobileViewport ? (
                  <span className="map-status-pill map-status-pill--summary">
                    <span>{activeMapFilterIsScoped ? activeMapFilterLabel : 'All venues'}</span>
                    <span>{mobileMapFilterCount}</span>
                  </span>
                ) : (
                  mapStatusRailOptions.map((option) => (
                    <button
                      key={`map-status:${option.id}`}
                      type="button"
                      data-active={option.active}
                      disabled={option.disabled}
                      onClick={option.onClick}
                      className={`map-status-pill ${option.className}`}
                    >
                      <span>{option.label}</span>
                      <span>{option.count}</span>
                    </button>
                  ))
                )}
                {isMobileViewport ? (
                  <>
                    <button
                      type="button"
                      data-active={adventureMode}
                      aria-pressed={adventureMode}
                      onClick={handleAdventureModeToggle}
                      className="map-status-pill map-status-pill--adventure"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      <span className="map-status-label">Adventure</span>
                    </button>
                    <button
                      type="button"
                      data-active={adventurePanelOpen}
                      aria-expanded={adventurePanelOpen}
                      onClick={() => {
                        if (!adventureMode) handleAdventureModeToggle();
                        setAdventurePanelOpen((current) => !current);
                        triggerHaptic('selection');
                      }}
                      className="map-status-pill map-status-pill--tonight"
                    >
                      <Flame className="h-3.5 w-3.5" />
                      <span className="map-status-label">Tonight</span>
                      <span>{tonightActivity.snapshot?.totals.activities ?? 0}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (!adventureMode) handleAdventureModeToggle();
                        handleExploreSecrets();
                      }}
                      className="map-status-pill map-status-pill--secrets"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      <span className="map-status-label">Secrets</span>
                    </button>
                    <button
                      type="button"
                      data-active={mapVenueFocus === 'footprint'}
                      onClick={handleOpenPersonalTrail}
                      className="map-status-pill map-status-pill--trail"
                    >
                      <Navigation className="h-3.5 w-3.5" />
                      <span className="map-status-label">Trail</span>
                      <span>{footprintStats?.totalMarks ?? footprintMarks.length}</span>
                    </button>
                  </>
                ) : null}
                <button
                  type="button"
                  data-active={showAdvancedMapFilters}
                  onClick={() => {
                    setShowAdvancedMapFilters((current) => !current);
                    triggerHaptic('selection');
                  }}
                  className="map-status-pill map-status-pill--filters"
                  aria-expanded={showAdvancedMapFilters}
                  aria-label="More map tools and views"
                >
                  <SlidersHorizontal className="h-3.5 w-3.5" />
                  <span>More</span>
                </button>
              </div>

              {showAdvancedMapFilters ? (
                <div className="map-advanced-filter-panel">
                  {isMobileViewport ? (
                    <div className="map-advanced-filter-group">
                      <span className="map-advanced-filter-label">Show places</span>
                      <div className="map-advanced-filter-row">
                        {mapStatusRailOptions.map((option) => (
                          <button
                            key={`mobile-map-filter:${option.id}`}
                            type="button"
                            data-active={option.active}
                            disabled={option.disabled}
                            onClick={() => {
                              option.onClick();
                              setShowAdvancedMapFilters(false);
                            }}
                            className={`map-filter-pill inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/52 shadow-[0_10px_18px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.06)] transition hover:-translate-y-[1px] hover:border-white/18 hover:text-white disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 ${option.className}`}
                          >
                            <span>{option.label}</span>
                            <span className="rounded-full border border-white/10 bg-black/20 px-2 py-0.5 text-[10px] text-white/62">
                              {option.count}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  <div className="map-advanced-filter-group">
                    <span className="map-advanced-filter-label">Add to map</span>
                    <div className="map-advanced-filter-row">
                      <button
                        type="button"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => {
                          triggerHaptic('selection');
                          closeSearchPopover();
                          setSaveSpotDraft(null);
                          setSaveSpotState({ type: 'info', message: 'Search or tap the map to pick a venue.' });
                          setShowAdvancedMapFilters(false);
                        }}
                        className="inline-flex min-h-8 shrink-0 items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.045] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-white/58 transition hover:border-cyan-200/30 hover:text-cyan-100"
                      >
                        <MapPin className="h-3 w-3" />
                        Add place
                      </button>
                      <button
                        type="button"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => {
                          closeSearchPopover();
                          openProofForSelectedPlace();
                          setShowAdvancedMapFilters(false);
                        }}
                        className="inline-flex min-h-8 shrink-0 items-center gap-1.5 rounded-full border border-yellow-200/18 bg-yellow-300/[0.075] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-yellow-100/80 transition hover:border-yellow-100/32 hover:text-yellow-50"
                      >
                        <Sparkles className="h-3 w-3" />
                        Add proof
                      </button>
                      <button
                        type="button"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => {
                          closeSearchPopover();
                          openSaveSpotDraft(selectedPlace);
                          setShowAdvancedMapFilters(false);
                        }}
                        className="inline-flex min-h-8 shrink-0 items-center gap-1.5 rounded-full border border-emerald-200/18 bg-emerald-300/[0.075] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-emerald-100/82 transition hover:border-emerald-100/32 hover:text-emerald-50"
                      >
                        <Bike className="h-3 w-3" />
                        Save spot
                      </button>
                      <button
                        type="button"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => {
                          closeSearchPopover();
                          setShowLocalSignalForm((current) => !current);
                          setNearbyDarePanelCollapsed(false);
                          setShowAdvancedMapFilters(false);
                          triggerHaptic('selection');
                        }}
                        className="inline-flex min-h-8 shrink-0 items-center gap-1.5 rounded-full border border-cyan-200/18 bg-cyan-300/[0.075] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-cyan-100/78 transition hover:border-cyan-100/32 hover:text-cyan-50"
                      >
                        <Sparkles className="h-3 w-3" />
                        {showLocalSignalForm ? 'Close tip' : 'Share tip'}
                      </button>
                      {latestPrivateMapSpot ? (
                        <button
                          type="button"
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => {
                            closeSearchPopover();
                            focusPrivateSpot(latestPrivateMapSpot);
                            setShowAdvancedMapFilters(false);
                          }}
                          className="inline-flex min-h-8 shrink-0 items-center gap-1.5 rounded-full border border-white/10 bg-black/28 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-white/52 transition hover:border-white/18 hover:text-white"
                        >
                          <Navigation className="h-3 w-3" />
                          {latestPrivateMapSpot.label}
                        </button>
                      ) : null}
                    </div>
                  </div>

                  {isConnected ? (
                    <div className="map-advanced-filter-group">
                      <span className="map-advanced-filter-label">Your map</span>
                      <div className="map-advanced-filter-row">
                        <button
                          type="button"
                          data-active={mapVenueFocus === 'footprint'}
                          onClick={() => {
                            const nextFocus = mapVenueFocus === 'footprint' ? 'all' : 'footprint';
                            setPulseFilter('all');
                            setMapVenueFocus(nextFocus);
                            setShowMatchedLayer(false);
                            setShowFootprintLayer(nextFocus === 'footprint');
                            setShowAdvancedMapFilters(false);
                            triggerHaptic('selection');
                          }}
                          className="map-filter-pill inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/52 shadow-[0_10px_18px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.06)] transition hover:-translate-y-[1px] hover:border-white/18 hover:text-white data-[active=true]:border-[#b87fff]/46 data-[active=true]:bg-[#b87fff]/[0.14] data-[active=true]:text-[#edd8ff]"
                        >
                          <span className="h-2 w-2 rounded-full bg-[#b87fff]" />
                          <span>My trail</span>
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
                            setShowAdvancedMapFilters(false);
                            triggerHaptic('selection');
                          }}
                          className="map-filter-pill inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/52 shadow-[0_10px_18px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.06)] transition hover:-translate-y-[1px] hover:border-white/18 hover:text-white disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 data-[active=true]:border-cyan-300/46 data-[active=true]:bg-cyan-500/[0.14] data-[active=true]:text-cyan-100"
                        >
                          <span className="h-2 w-2 rounded-full bg-cyan-300" />
                          <span>For You</span>
                          <span className="rounded-full border border-white/10 bg-black/20 px-2 py-0.5 text-[10px] text-white/62">
                            {visibleMatchedVenueCount}
                          </span>
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>

          <div
            ref={mapViewportRef}
            data-map-preset={mapPreset}
            data-layer-filter={effectiveLayerFilter}
            data-adventure-mode={adventureMode ? 'true' : 'false'}
            data-attention-intent={mapAttentionIntent ?? 'unset'}
            data-attention-guide={
              mapAttentionGuideOpen && !selectedPlace && !selectedMeetup ? 'true' : 'false'
            }
            data-crosshair={!isMobileViewport ? 'true' : undefined}
            className={`map-container-wrapper basedare-maplibre-map basedare-maplibre-map--${mapPreset} relative overflow-hidden ${
              isImmersiveMobile
                ? 'map-container-wrapper--immersive min-h-0 flex-1'
                : 'map-container-wrapper--desktop-shell h-[calc(100dvh-15.25rem)] min-h-[560px]'
            }`}
          >
            <div
              ref={mapCanvasRef}
              className="map-canvas-host absolute inset-0 z-0"
              aria-label="BaseDare MapLibre 3D city grid"
            />
            <div className="maplibre-depth-vignette pointer-events-none absolute inset-0 z-[1]" />
            <div className="adventure-map-atmosphere pointer-events-none absolute inset-0 z-[2]" aria-hidden="true" />

            <AdventureMapOverlay
              enabled={adventureMode}
              panelOpen={adventurePanelOpen}
              loading={tonightActivity.loading}
              error={tonightActivity.error}
              snapshot={tonightActivity.snapshot}
              obscured={Boolean(selectedPlace || selectedMeetup)}
              onToggle={handleAdventureModeToggle}
              onPanelOpenChange={setAdventurePanelOpen}
              onSelectActivity={handleAdventureActivitySelect}
              onExploreSecrets={handleExploreSecrets}
              intent={mapAttentionIntent}
              placeSuggestions={mapAttentionPlaceSuggestions}
              trailCount={footprintStats?.totalMarks ?? footprintMarks.length}
              guideOpen={mapAttentionGuideOpen}
              onIntentChange={handleMapAttentionIntentChange}
              onSelectPlace={handleMapAttentionPlaceSelect}
              onOpenTrail={handleOpenPersonalTrail}
              onGuideOpenChange={setMapAttentionGuideOpen}
            />

            {/* Free meetup layer (Stage 3) — layer filter + legend. Only mounts
                once real meetups exist, so the paid map is untouched until then. */}
            {meetups.length > 0 ? (
              <div className="map-meetup-layer-controls pointer-events-auto absolute left-1/2 top-3 z-[12] flex max-w-[calc(100%-6.5rem)] -translate-x-1/2 flex-col items-center gap-2">
                {isMobileViewport ? (
                  <LayerReelBar
                    options={MAP_LAYER_FILTERS.map((key) => ({ value: key, label: MAP_LAYER_FILTER_LABELS[key] }))}
                    value={mapLayerFilter}
                    onChange={(next) => setMapLayerFilter(next as MapLayerFilter)}
                    onTick={() => triggerHaptic('selection')}
                  />
                ) : (
                <div className="flex flex-wrap items-center gap-1 rounded-full border border-white/12 bg-black/55 p-1 shadow-[0_10px_28px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.07)] backdrop-blur-xl">
                  {MAP_LAYER_FILTERS.map((key) => {
                    const active = mapLayerFilter === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => {
                          setMapLayerFilter(key);
                          triggerHaptic('selection');
                        }}
                        data-active={active}
                        className="inline-flex min-h-8 items-center rounded-full px-3 text-[10px] font-black uppercase tracking-[0.14em] text-white/55 transition hover:text-white/80 data-[active=true]:bg-white/[0.12] data-[active=true]:text-white"
                      >
                        {MAP_LAYER_FILTER_LABELS[key]}
                      </button>
                    );
                  })}
                </div>
                )}
                {/* Legend shows on mobile too — pin colors are the trust
                    vocabulary and phones are where the map actually gets used. */}
                <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 rounded-2xl border border-white/10 bg-black/45 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-white/50 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur md:justify-start md:py-2">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="inline-block h-2.5 w-2.5 rounded-full bg-[linear-gradient(180deg,#fff0a8,#f5c518)]" aria-hidden="true" />
                    Verified dare
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="inline-block h-2.5 w-2.5 rounded-full border border-slate-300/60 bg-slate-800/80" aria-hidden="true" />
                    Free meetup
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="inline-block h-2.5 w-2.5 rounded-full border border-cyan-300/70" aria-hidden="true" />
                    Happening now
                  </span>
                </div>
              </div>
            ) : null}

            {/* Read-only meetup card (Stage 3). JSX auto-escapes all user text.
                RSVP / report live in Stage 4. */}
            {selectedMeetup && !selectedPlace ? (
              <div className="pointer-events-auto absolute bottom-5 left-1/2 z-[13] w-[min(calc(100%-1.5rem),22rem)] -translate-x-1/2 rounded-[24px] border border-white/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(9,10,18,0.95))] p-4 shadow-[0_24px_58px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.1)] backdrop-blur-xl">
                <button
                  type="button"
                  onClick={() => setSelectedMeetup(null)}
                  aria-label="Close meetup"
                  className="absolute -right-3 -top-3 inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/12 bg-black/70 text-white/64 shadow-[0_10px_22px_rgba(0,0,0,0.32),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur transition hover:border-white/22 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-slate-300/30 bg-slate-500/[0.14] px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-slate-200/80">
                    Free meetup · {MEETUP_TYPE_LABELS[selectedMeetup.type as MeetupType] ?? 'Meetup'}
                  </span>
                  {selectedMeetup.happeningNow ? (
                    <span className="rounded-full border border-cyan-300/35 bg-cyan-500/[0.14] px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-cyan-100">
                      Happening now
                    </span>
                  ) : null}
                </div>
                <p className="mt-2 text-base font-black text-white">{selectedMeetup.title}</p>
                <p className="mt-1 text-xs font-semibold text-white/58">
                  {selectedMeetup.placeLabel}
                  {selectedMeetup.happeningNow
                    ? ''
                    : ` · ${new Date(selectedMeetup.startTime).toLocaleString(undefined, {
                        weekday: 'short',
                        hour: 'numeric',
                        minute: '2-digit',
                      })}`}
                </p>
                {selectedMeetup.creator?.tag ? (
                  <p className="mt-1 text-[11px] font-bold text-white/44">by @{selectedMeetup.creator.tag}</p>
                ) : null}
                {selectedMeetup.note ? (
                  <p className="mt-2 text-xs leading-relaxed text-white/62">{selectedMeetup.note}</p>
                ) : null}
                <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/34">
                  Free community meetup · not a paid dare
                </p>
              </div>
            ) : null}
            {isMobileViewport && !mapAttentionGuideOpen ? (
              <button
                type="button"
                onClick={handleMapFullscreenToggle}
                className={`map-fullscreen-toggle ${isImmersiveMobile ? 'map-fullscreen-toggle--active' : ''}`}
                aria-label={isImmersiveMobile ? 'Collapse map' : 'Expand map full screen'}
                title={isImmersiveMobile ? 'Collapse map' : 'Expand map'}
              >
                {isImmersiveMobile ? (
                  <Minimize2 className="h-4 w-4" />
                ) : (
                  <Maximize2 className="h-4 w-4" />
                )}
              </button>
            ) : null}

            <div className="preset-atmosphere pointer-events-none absolute inset-0 z-[2]" />
            <div className="starfield pointer-events-none absolute inset-0 z-[5]" />
            <div className="scanlines pointer-events-none absolute inset-0 z-[6]" />
            <div className="glass-haze pointer-events-none absolute inset-0 z-[7]" />
            {!isMobileViewport ? (
              // Stays mounted during gestures; [data-map-moving='true'] CSS hides
              // it. Unmount/remount per gesture was itself a visible pop.
              <MapCrosshair
                containerRef={mapViewportRef}
                horizontalColor="rgba(184, 127, 255, 0.82)"
                verticalColor="rgba(245, 197, 24, 0.82)"
              />
            ) : null}
            {showStartProofDock ? (
              <>
                <div className="map-activation-legend pointer-events-none absolute bottom-5 right-5 z-[10] hidden w-[16.5rem] rounded-[28px] border border-white/12 bg-[radial-gradient(circle_at_8%_0%,rgba(34,211,238,0.16),transparent_36%),radial-gradient(circle_at_94%_18%,rgba(245,197,24,0.12),transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.09)_0%,rgba(12,13,24,0.9)_26%,rgba(5,6,13,0.965)_100%)] px-3.5 py-3.5 shadow-[0_24px_58px_rgba(0,0,0,0.44),0_0_28px_rgba(34,211,238,0.08),inset_0_1px_0_rgba(255,255,255,0.11),inset_0_-14px_22px_rgba(0,0,0,0.2)] backdrop-blur-xl md:block">
                  <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-cyan-100/42 to-transparent" />
                  <div className="flex items-center justify-between gap-3 px-1">
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-[0.26em] text-cyan-100/55">
                        Map legend
                      </p>
                      <p className="mt-1 text-[10px] font-bold text-white/38">Read pins fast</p>
                    </div>
                    <span className="rounded-full border border-white/10 bg-white/[0.045] px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.18em] text-white/48 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                      Live grid
                    </span>
                  </div>
                  <div className="mt-3 space-y-2">
                    <div className="map-legend-row map-legend-row--activated">
                      <span className="map-legend-icon-well map-legend-icon-well--activated" aria-hidden="true">
                        <span className="legend-venue-sign-mini" aria-hidden="true">
                          <span className="legend-venue-sign-mini-face">NAME</span>
                        </span>
                      </span>
                      <div className="min-w-0">
                        <p className="map-legend-title text-[#f8dd72]">Activated venue</p>
                        <p className="map-legend-detail">Funded venue</p>
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
                <div className="map-first-proof-dock absolute right-3 top-[4.25rem] z-[11] w-[min(calc(100%-1.5rem),21rem)] rounded-[28px] border border-[#f5c518]/22 bg-[radial-gradient(circle_at_12%_0%,rgba(245,197,24,0.18),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.095)_0%,rgba(9,10,18,0.94)_34%,rgba(4,5,11,0.985)_100%)] p-3 shadow-[0_20px_48px_rgba(0,0,0,0.42),0_0_28px_rgba(245,197,24,0.1),inset_0_1px_0_rgba(255,255,255,0.1),inset_0_-12px_18px_rgba(0,0,0,0.24)] backdrop-blur-xl md:right-5 md:top-[4.75rem]">
                  <button
                    type="button"
                    onClick={dismissStartProofDock}
                    aria-label="Hide standout venue"
                    className="absolute -right-3 -top-3 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/12 bg-black/70 text-white/64 shadow-[0_10px_22px_rgba(0,0,0,0.32),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur transition hover:border-white/22 hover:text-white"
                  >
                    <X className="h-4 w-4" />
                  </button>
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[16px] border border-[#f5c518]/26 bg-[#f5c518]/[0.11] text-[#fff3b0] shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]">
                      <Sparkles className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#f8dd72]/78">
                        {mapSpotlightVenue?.eyebrow ?? 'Start here'}
                      </p>
                      <p className="mt-1 truncate text-sm font-black text-white">
                        {mapSpotlightVenue?.place.name ?? firstProofStartPlace?.name ?? 'Find nearby proof'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleMapSpotlightVenueAction}
                      disabled={locating}
                      className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-full border border-[#f5c518]/38 bg-[linear-gradient(180deg,#fff0a8_0%,#f5c518_54%,#8a5a00_100%)] px-3.5 text-[11px] font-black uppercase text-[#171103] shadow-[0_12px_22px_rgba(0,0,0,0.32),inset_0_1px_0_rgba(255,255,255,0.62),inset_0_-10px_14px_rgba(93,52,0,0.28)] transition hover:-translate-y-[1px] disabled:cursor-wait disabled:opacity-70 disabled:hover:translate-y-0"
                    >
                      {locating ? 'Finding' : mapSpotlightVenue?.actionLabel ?? (firstProofStartPlace ? 'Take proof' : 'Locate')}
                    </button>
                  </div>
                </div>
              </>
            ) : null}
            {showFootprintLayer && footprintMarks.length > 0 ? (
              <div
                className={`pointer-events-none absolute left-3 z-[10] rounded-full border border-[#b87fff]/28 bg-[linear-gradient(180deg,rgba(184,127,255,0.18)_0%,rgba(16,10,28,0.88)_100%)] px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[0.18em] text-[#e5c7ff] shadow-[0_10px_18px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.08)] md:left-5 md:text-[10px] ${showNearbyDareTray ? nearbyDarePanelCollapsed ? 'bottom-[4.75rem] md:bottom-[6.4rem]' : 'bottom-[16.25rem] md:bottom-[18.9rem]' : 'bottom-3 md:bottom-5'}`}
              >
                My proofs · {footprintMarks.length} verified
              </div>
            ) : null}
            {showNearbyDareTray ? (
              <div
                className={`nearby-dare-tray ${nearbyDarePanelCollapsed ? 'nearby-dare-tray--collapsed' : 'nearby-dare-tray--expanded'} absolute z-[10] overflow-hidden border border-[#f5c518]/18 bg-[linear-gradient(180deg,rgba(255,255,255,0.08)_0%,rgba(10,12,22,0.94)_18%,rgba(5,6,12,0.985)_100%)] shadow-[0_20px_40px_rgba(0,0,0,0.34),0_0_22px_rgba(245,197,24,0.08),inset_0_1px_0_rgba(255,255,255,0.08),inset_0_-16px_20px_rgba(0,0,0,0.22)] ${isMobileViewport ? 'bottom-3 left-3 right-3 rounded-[28px]' : 'bottom-5 left-5 right-auto max-w-[23rem] rounded-[28px]'}`}
                style={nearbyDareTrayDragStyle}
                data-sheet-dragging={mapSheetDrag?.target === 'nearby-dare' ? 'true' : undefined}
              >
                {nearbyDarePanelCollapsed ? (
                  <button
                    type="button"
                    onPointerDown={(event) => beginMapSheetDrag('nearby-dare', event)}
                    onPointerMove={(event) => updateMapSheetDrag('nearby-dare', event)}
                    onPointerUp={(event) => finishMapSheetDrag('nearby-dare', event)}
                    onPointerCancel={(event) => cancelMapSheetDrag('nearby-dare', event)}
                    onClick={() => {
                      if (consumeMapSheetDragClick()) {
                        return;
                      }
                      setNearbyDarePanelCollapsed(false);
                    }}
                    className="relative flex w-full flex-col gap-2 px-4 pb-3 pt-2 text-left"
                    aria-label="Expand nearby dare tray"
                    aria-expanded={false}
                  >
                    <span className="map-sheet-drag-handle mx-auto flex h-5 w-24 items-center justify-center rounded-full">
                      <span className="map-sheet-drag-bar" />
                    </span>
                    <div className="flex w-full items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#f5c518]">
                          Nearby now
                        </p>
                        <p
                          className={`mt-1 truncate text-[11px] ${
                            poppingNowSpike && !happeningLoading ? 'font-semibold text-[#f8dd72]' : 'text-white/52'
                          }`}
                        >
                          {happeningLoading
                            ? 'Scanning nearby...'
                            : poppingNowSpike
                              ? `⚡ Popping now: ${poppingNowSpike.label}`
                              : featuredMapHappening
                                ? `Best next: ${featuredMapHappening.title}`
                                : 'Move the map or take first proof'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="rounded-full border border-[#f5c518]/20 bg-[#f5c518]/[0.08] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#f8dd72]">
                          {happeningLoading ? 'scanning' : `${mapHappenings.length} nearby`}
                        </div>
                        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white/58">
                          <ChevronUp className="h-4 w-4" />
                        </span>
                      </div>
                    </div>
                  </button>
                ) : (
                <>
                <div className="border-b border-white/8 px-4 py-3">
                  <button
                    type="button"
                    onPointerDown={(event) => beginMapSheetDrag('nearby-dare', event)}
                    onPointerMove={(event) => updateMapSheetDrag('nearby-dare', event)}
                    onPointerUp={(event) => finishMapSheetDrag('nearby-dare', event)}
                    onPointerCancel={(event) => cancelMapSheetDrag('nearby-dare', event)}
                    onClick={() => {
                      if (consumeMapSheetDragClick()) {
                        return;
                      }
                      setNearbyDarePanelCollapsed(true);
                    }}
                    className="map-sheet-drag-handle mx-auto -mt-1 mb-2 flex h-6 w-28 items-center justify-center rounded-full"
                    aria-label="Drag down to collapse nearby tray"
                    aria-expanded={true}
                    title="Drag down to collapse"
                  >
                    <span className="map-sheet-drag-bar" />
                  </button>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#f5c518]">
                        Nearby now
                      </p>
                      <p
                        className={`mt-1 text-[11px] ${
                          poppingNowSpike ? 'font-semibold text-[#f8dd72]' : 'text-white/55'
                        }`}
                      >
                        {poppingNowSpike
                          ? `⚡ Popping now: ${poppingNowSpike.label}`
                          : featuredMapHappening
                            ? `Best next: ${featuredMapHappening.title}`
                            : userLocation
                              ? 'Closest useful moves.'
                              : `${happeningWindow.dateLabel} around the map`}
                      </p>
                    </div>
                    <div className="rounded-full border border-[#f5c518]/20 bg-[#f5c518]/[0.08] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#f8dd72]">
                      {happeningLoading ? 'scanning' : `${mapHappenings.length} nearby`}
                    </div>
                  </div>
                </div>
                {!nearbyDarePanelCollapsed ? (
                <div className="nearby-dare-tray-list px-2 py-2">
                  {showLocalSignalForm ? (
                    <form
                      onSubmit={(event) => {
                        event.preventDefault();
                        void submitLocalSignal();
                      }}
                      className="mb-2 rounded-[22px] border border-cyan-200/16 bg-[radial-gradient(circle_at_12%_0%,rgba(34,211,238,0.14),transparent_38%),linear-gradient(180deg,rgba(255,255,255,0.07)_0%,rgba(5,8,16,0.94)_100%)] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.09),0_14px_28px_rgba(0,0,0,0.24)]"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-[9px] font-black uppercase tracking-[0.22em] text-cyan-100/62">
                            Local tip
                          </p>
                          <p className="mt-1 text-[12px] font-bold leading-snug text-white">
                            Share what is worth doing.
                          </p>
                        </div>
                        <span className="rounded-full border border-white/10 bg-black/24 px-2 py-1 text-[8px] font-black uppercase tracking-[0.16em] text-white/42">
                          Review
                        </span>
                      </div>
                      <div className="mt-3 grid gap-2">
                        <input
                          value={localSignalDraft.title}
                          onChange={(event) =>
                            setLocalSignalDraft((current) => ({ ...current, title: event.target.value }))
                          }
                          placeholder="Tonight: live DJ at..."
                          maxLength={140}
                          className="min-h-10 rounded-[15px] border border-white/10 bg-black/38 px-3 text-[12px] font-bold text-white outline-none transition placeholder:text-white/24 focus:border-cyan-200/30"
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            value={localSignalDraft.venueName}
                            onChange={(event) =>
                              setLocalSignalDraft((current) => ({ ...current, venueName: event.target.value }))
                            }
                            placeholder="Place"
                            maxLength={140}
                            className="min-h-10 rounded-[15px] border border-white/10 bg-black/38 px-3 text-[12px] font-bold text-white outline-none transition placeholder:text-white/24 focus:border-cyan-200/30"
                          />
                          <select
                            value={localSignalDraft.category}
                            onChange={(event) =>
                              setLocalSignalDraft((current) => ({ ...current, category: event.target.value }))
                            }
                            className="min-h-10 rounded-[15px] border border-white/10 bg-black/38 px-3 text-[11px] font-black uppercase tracking-[0.14em] text-white/78 outline-none transition focus:border-cyan-200/30"
                          >
                            {LOCAL_SIGNAL_CATEGORIES.map((category) => (
                              <option key={category} value={category}>
                                {category}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            value={localSignalDraft.city}
                            onChange={(event) =>
                              setLocalSignalDraft((current) => ({ ...current, city: event.target.value }))
                            }
                            placeholder="Area / city"
                            maxLength={120}
                            className="min-h-10 rounded-[15px] border border-white/10 bg-black/38 px-3 text-[12px] font-bold text-white outline-none transition placeholder:text-white/24 focus:border-cyan-200/30"
                          />
                          <input
                            type="datetime-local"
                            value={localSignalDraft.startsAt}
                            onChange={(event) =>
                              setLocalSignalDraft((current) => ({ ...current, startsAt: event.target.value }))
                            }
                            className="min-h-10 rounded-[15px] border border-white/10 bg-black/38 px-3 text-[11px] font-bold text-white/76 outline-none transition focus:border-cyan-200/30"
                          />
                        </div>
                        <textarea
                          value={localSignalDraft.notes}
                          onChange={(event) =>
                            setLocalSignalDraft((current) => ({ ...current, notes: event.target.value }))
                          }
                          placeholder="Why should someone go?"
                          maxLength={700}
                          className="min-h-[70px] resize-none rounded-[15px] border border-white/10 bg-black/38 px-3 py-2 text-[12px] font-bold leading-relaxed text-white outline-none transition placeholder:text-white/24 focus:border-cyan-200/30"
                        />
                        {localSignalSubmitState ? (
                          <p
                            className={`rounded-[14px] border px-3 py-2 text-[11px] font-bold ${
                              localSignalSubmitState.type === 'success'
                                ? 'border-emerald-200/18 bg-emerald-300/[0.08] text-emerald-100/78'
                                : 'border-red-200/18 bg-red-400/[0.08] text-red-100/78'
                            }`}
                          >
                            {localSignalSubmitState.message}
                          </p>
                        ) : null}
                        <button
                          type="submit"
                          disabled={localSignalSubmitting}
                          className="inline-flex min-h-10 items-center justify-center rounded-full border border-cyan-100/20 bg-cyan-300/[0.1] px-4 text-[10px] font-black uppercase tracking-[0.18em] text-cyan-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_12px_24px_rgba(0,0,0,0.22)] transition hover:border-cyan-100/35 disabled:cursor-wait disabled:opacity-55"
                        >
                          {localSignalSubmitting ? 'Submitting...' : 'Submit for review'}
                        </button>
                      </div>
                    </form>
                  ) : null}
                  {happeningLoading ? (
                    <div className="px-3 py-5 text-center text-[11px] uppercase tracking-[0.18em] text-white/45">
                      Scanning nearby...
                    </div>
                  ) : (
                    mapHappenings.length > 0 ? (
                    mapHappenings.map((happening) => {
                      const toneClasses = getHappeningToneClasses(happening.tone);
                      const signalKindMeta = getSignalLayerKindMeta(getSignalLayerKind(happening));
                      const signalFundConfig = getSignalFundConfig(happening);
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
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <span className={`rounded-full border px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.14em] ${signalKindMeta.chipClass}`}>
                                    {signalKindMeta.label}
                                  </span>
                                  <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/36">
                                    {happening.eyebrow}
                                  </span>
                                </div>
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
                                Place
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
                            {signalFundConfig ? (
                              <Link
                                href={signalFundConfig.href}
                                className="rounded-full border border-[#f5c518]/22 bg-[#f5c518]/[0.1] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-[#f8dd72] transition hover:border-[#f5c518]/38 hover:bg-[#f5c518]/[0.16]"
                              >
                                {signalFundConfig.label}
                              </Link>
                            ) : null}
                          </div>
                        </div>
                      );
                    })
                    ) : (
                      <div className="px-3 py-5 text-center text-[11px] uppercase tracking-[0.18em] text-white/45">
                        Nothing nearby yet. Move the map or take first proof.
                      </div>
                    )
                  )}
                </div>
                ) : (
                  <div className="px-4 py-3 text-[11px] text-white/48">
                    {happeningLoading
                      ? 'Scanning nearby...'
                      : mapHappenings.length > 0
                        ? `${mapHappenings[0].title}`
                        : 'No nearby signals yet'}
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
            </div>
            <div className="pointer-events-auto absolute right-5 top-6 z-[15] hidden overflow-hidden rounded-[18px] border border-cyan-100/18 bg-[linear-gradient(180deg,rgba(16,25,36,0.88),rgba(5,8,15,0.94))] shadow-[0_18px_40px_rgba(0,0,0,0.42),0_0_22px_rgba(34,211,238,0.09),inset_0_1px_0_rgba(255,255,255,0.1)] backdrop-blur-xl lg:block">
              <div className="flex items-center justify-between border-b border-white/10 px-2.5 py-1 text-[7px] font-black uppercase tracking-[0.16em] text-cyan-100/72">
                <span>Orbit</span>
                <span>{mapCameraPitchLabel}</span>
              </div>
              <div className="grid grid-cols-2">
                <button type="button" onClick={() => easeMapCamera({ bearingDelta: -28 })} className="grid h-9 w-10 place-items-center border-b border-r border-white/10 text-cyan-100/82 transition hover:bg-cyan-300/[0.12] hover:text-white" aria-label="Orbit map left" title="Orbit left">
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>
                <button type="button" onClick={() => easeMapCamera({ bearingDelta: 28 })} className="grid h-9 w-10 place-items-center border-b border-white/10 text-cyan-100/82 transition hover:bg-cyan-300/[0.12] hover:text-white" aria-label="Orbit map right" title="Orbit right">
                  <RotateCw className="h-3.5 w-3.5" />
                </button>
                <button type="button" onClick={() => easeMapCamera({ pitchDelta: -10 })} className="grid h-9 w-10 place-items-center border-r border-white/10 text-white/76 transition hover:bg-white/[0.08] hover:text-white" aria-label="Tilt map down" title="Tilt down">
                  <ChevronDown className="h-4 w-4" />
                </button>
                <button type="button" onClick={() => easeMapCamera({ pitchDelta: 10 })} className="grid h-9 w-10 place-items-center text-white/76 transition hover:bg-white/[0.08] hover:text-white" aria-label="Tilt map up" title="Tilt up">
                  <ChevronUp className="h-4 w-4" />
                </button>
              </div>
              <button type="button" onClick={() => easeMapCamera({ reset: true })} className="flex h-8 w-full items-center justify-center gap-1 border-t border-white/10 px-2 text-[8px] font-black uppercase tracking-[0.14em] text-cyan-100/68 transition hover:bg-cyan-300/[0.12] hover:text-cyan-50" aria-label="Reset map camera north" title={`Reset camera north · ${mapCameraBearingLabel}`}>
                <span>North</span>
                <span className="text-white/34">{mapCameraBearingLabel}</span>
              </button>
            </div>
            {!mapReady ? (
              <div className="absolute inset-0 z-20 flex items-center justify-center bg-[rgba(3,5,12,0.74)] backdrop-blur-sm">
                <div className="flex flex-col items-center gap-4 text-center">
                  <Loader2 className="h-10 w-10 animate-spin text-cyan-200" />
                  <div>
                    <p className="text-sm uppercase tracking-[0.28em] text-cyan-200/80">Loading grid</p>
                    <p className="mt-2 text-sm text-white/55">Spinning up the map.</p>
                  </div>
                </div>
              </div>
            ) : null}

            {mapRuntimeError ? (
              <div className="absolute inset-0 z-30 flex items-center justify-center bg-[rgba(3,5,12,0.82)]">
                <div className="max-w-sm rounded-[26px] border border-cyan-200/18 bg-[linear-gradient(180deg,rgba(34,211,238,0.12)_0%,rgba(7,9,18,0.94)_100%)] px-5 py-5 text-center shadow-[0_24px_70px_rgba(0,0,0,0.48),inset_0_1px_0_rgba(255,255,255,0.1)]">
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-100/62">Map renderer</p>
                  <p className="mt-3 text-sm font-bold leading-6 text-white/72">{mapRuntimeError}</p>
                  <button
                    type="button"
                    onClick={() => window.location.reload()}
                    className="mt-4 min-h-10 rounded-full border border-cyan-200/24 bg-cyan-300/[0.1] px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-cyan-50 transition hover:border-cyan-100/40"
                  >
                    Reload grid
                  </button>
                </div>
              </div>
            ) : null}

            {selectedPlace ? (
              <div
                className={selectedPlacePanelWrapClass}
                style={selectedPlacePanelDragStyle}
                data-sheet-dragging={mapSheetDrag?.target === 'selected-place' ? 'true' : undefined}
              >
                {showCompactSelectedPlacePanel ? (
                  <div className={`${mapPanelShellClass} selected-place-compact-dock place-panel-popup`}>
                    <div className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-white/24 to-transparent" />
                    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_16%_0%,rgba(34,211,238,0.16),transparent_26%),radial-gradient(circle_at_88%_100%,rgba(168,85,247,0.15),transparent_32%),linear-gradient(180deg,rgba(255,255,255,0.055)_0%,transparent_38%,rgba(0,0,0,0.2)_100%)]" />
                    <div className="pointer-events-none absolute inset-[1px] rounded-[27px] border border-white/6" />
                    <div className="relative z-10 px-3 pb-3 pt-2.5">
                      <button
                        type="button"
                        onPointerDown={(event) => beginMapSheetDrag('selected-place', event)}
                        onPointerMove={(event) => updateMapSheetDrag('selected-place', event)}
                        onPointerUp={(event) => finishMapSheetDrag('selected-place', event)}
                        onPointerCancel={(event) => cancelMapSheetDrag('selected-place', event)}
                        onClick={() => {
                          if (consumeMapSheetDragClick()) {
                            return;
                          }
                          triggerHaptic('selection');
                          setSelectedPlacePanelExpanded(true);
                        }}
                        className="map-sheet-drag-handle mx-auto mb-2 flex h-6 w-28 items-center justify-center rounded-full"
                        aria-label="Drag up for venue details"
                        title="Drag up for venue details"
                      >
                        <span className="map-sheet-drag-bar" />
                      </button>
                      <div className="flex items-start gap-3">
                        <div className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-[18px] border border-cyan-200/18 bg-[linear-gradient(180deg,rgba(34,211,238,0.13),rgba(5,7,15,0.92))] text-xl shadow-[0_14px_26px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.1)]">
                          {selectedVenueProfile?.profileImageUrl ? (
                            <Image
                              src={selectedVenueProfile.profileImageUrl}
                              alt=""
                              fill
                              sizes="44px"
                              className="object-cover"
                              unoptimized
                            />
                          ) : (
                            <span aria-hidden="true">
                              {selectedVenueProfile?.primaryLegend.emoji ?? '*'}
                            </span>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="truncate text-[1.05rem] font-black leading-tight text-white">
                                {selectedPlace.name}
                              </p>
                              {selectedPlace.handle ? (
                                <p className="mt-1 truncate text-[9px] font-black uppercase tracking-[0.18em] text-cyan-100/55">
                                  @{selectedPlace.handle}
                                </p>
                              ) : null}
                            </div>
                            <div className="flex shrink-0 items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  triggerHaptic('selection');
                                  setSelectedPlacePanelExpanded(true);
                                }}
                                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#f5c518]/24 bg-[#f5c518]/[0.09] text-[#f8dd72] shadow-[0_10px_20px_rgba(0,0,0,0.24),inset_0_1px_0_rgba(255,255,255,0.1)]"
                                aria-label="Expand venue details"
                                title="Expand venue details"
                              >
                                <ChevronUp className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={closeSelectedPlace}
                                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/12 bg-white/[0.055] text-white/70 shadow-[0_10px_20px_rgba(0,0,0,0.22),inset_0_1px_0_rgba(255,255,255,0.08)]"
                                aria-label="Close place panel"
                                title="Close place panel"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                          {selectedPlaceStateCard}
                          <div className="mt-2 flex min-w-0 items-center gap-2 rounded-[16px] border border-white/10 bg-white/[0.045] px-2.5 py-1.5 text-[12px] leading-snug text-white/58">
                            <MapPin className="h-3.5 w-3.5 shrink-0 text-cyan-200/80" />
                            <span className="truncate">
                              {selectedPlace.address || formatCoordinateLabel(selectedPlace.latitude, selectedPlace.longitude)}
                            </span>
                          </div>
                        </div>
                      </div>
                      {selectedPlaceActionRail}
                      {selectedSaveSpotRail}
                    </div>
                  </div>
                ) : (
                <div className={`${mapPanelShellClass} place-panel-popup ${hasSaveSpotPanel ? 'place-panel-popup--save-spot' : ''}`}>
                  <div className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-white/24 to-transparent" />
                  <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_16%_0%,rgba(34,211,238,0.13),transparent_26%),radial-gradient(circle_at_85%_100%,rgba(168,85,247,0.12),transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.04)_0%,transparent_32%,transparent_72%,rgba(0,0,0,0.16)_100%)]" />
                  <div className="pointer-events-none absolute inset-[1px] rounded-[27px] border border-white/6" />
                  <div
                    className={`selected-place-panel-stack flex flex-col overflow-hidden ${
                      hasSaveSpotPanel ? 'selected-place-panel-stack--save-spot' : ''
                    } ${
                      isImmersiveMobile
                        ? venueRoomExpanded
                          ? 'max-h-[calc(100dvh-1rem)]'
                          : 'max-h-[58dvh]'
                        : isMobileViewport
                          ? venueRoomExpanded
                            ? 'max-h-[88dvh]'
                            : 'max-h-[82dvh]'
                          : 'max-h-[52dvh] md:h-full md:max-h-none'
                    }`}
                  >
                  <div className="selected-place-panel-header sticky top-0 z-10 shrink-0 overflow-hidden rounded-t-[28px] border-b border-white/8 bg-[rgba(7,9,18,0.9)] px-4 pb-3 pt-3 backdrop-blur-xl md:border-b-0 md:bg-[linear-gradient(180deg,rgba(255,255,255,0.055)_0%,rgba(7,9,18,0.88)_40%,rgba(7,9,18,0.62)_100%)] md:px-5 md:pb-3 md:pt-4">
                    <button
                      type="button"
                      onPointerDown={(event) => beginMapSheetDrag('selected-place', event)}
                      onPointerMove={(event) => updateMapSheetDrag('selected-place', event)}
                      onPointerUp={(event) => finishMapSheetDrag('selected-place', event)}
                      onPointerCancel={(event) => cancelMapSheetDrag('selected-place', event)}
                      onClick={() => {
                        if (consumeMapSheetDragClick()) {
                          return;
                        }
                        if (!hasSaveSpotPanel) {
                          triggerHaptic('selection');
                          setSelectedPlacePanelExpanded(false);
                        }
                      }}
                      className="map-sheet-drag-handle mx-auto mb-2 flex h-6 w-28 items-center justify-center rounded-full md:mb-3 md:hidden"
                      aria-label={hasSaveSpotPanel ? 'Drag venue sheet' : 'Drag down to collapse venue details'}
                      title={hasSaveSpotPanel ? 'Drag sheet' : 'Drag down to collapse'}
                    >
                      <span className="map-sheet-drag-bar" />
                    </button>
                  <div className="flex items-start justify-between gap-3 md:gap-5">
                    <div className="min-w-0 flex-1">
                      {showBackToControl ? (
                        <div className="mb-2 md:mb-3">
                          <Link
                            href="/brands/portal"
                            className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.05] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/62 transition hover:border-white/18 hover:bg-white/[0.08] hover:text-white"
                          >
                            <ArrowLeft className="h-3 w-3" />
                            Back to Control
                          </Link>
                        </div>
                      ) : isCreatorSource ? (
                        <div className="mb-2 md:mb-3">
                          <Link
                            href="/dashboard"
                            className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.05] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/62 transition hover:border-white/18 hover:bg-white/[0.08] hover:text-white"
                          >
                            <ArrowLeft className="h-3 w-3" />
                            Back to Dashboard
                          </Link>
                        </div>
                      ) : null}
                      <h3 className="text-[1.42rem] font-black leading-[0.94] tracking-tight text-white md:text-[2.05rem]">
                        {selectedPlace.name}
                      </h3>
                      {selectedPlace.handle ? (
                        <p className="mt-1 truncate text-[10px] font-black uppercase tracking-[0.2em] text-cyan-100/58 md:text-[11px]">
                          @{selectedPlace.handle}
                        </p>
                      ) : null}
                      {selectedPlaceStateCard}
                      {selectedMayor ? (
                        <div className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-[#f5c518]/30 bg-[#f5c518]/[0.07] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-[#f8dd72]">
                          👑 Mayor @{selectedMayor.tag.replace(/^@/, '')} · {selectedMayor.proofCount} proofs / 30d
                        </div>
                      ) : null}
                      <div className="mt-2 flex items-start gap-2 rounded-[16px] border border-white/10 bg-white/[0.045] px-3 py-2 text-xs leading-snug text-white/64 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] md:mt-3 md:rounded-[18px] md:text-sm md:leading-relaxed">
                        <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cyan-200/80" />
                        <span className="line-clamp-1 min-w-0 md:line-clamp-2">
                          {selectedPlace.address || formatCoordinateLabel(selectedPlace.latitude, selectedPlace.longitude)}
                        </span>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {isImmersiveMobile ? (
                        <button
                          type="button"
                          onClick={() => {
                            triggerHaptic('selection');
                            setSelectedPlacePanelExpanded(false);
                          }}
                          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-cyan-200/18 bg-[linear-gradient(180deg,rgba(34,211,238,0.12)_0%,rgba(8,12,20,0.86)_100%)] text-cyan-100/78 shadow-[0_12px_24px_rgba(0,0,0,0.24),inset_0_1px_0_rgba(255,255,255,0.1),inset_0_-10px_16px_rgba(0,0,0,0.2)] transition hover:-translate-y-[1px] hover:border-cyan-100/32 hover:text-cyan-50"
                          aria-label="Collapse place details"
                          title="Collapse details"
                        >
                          <ChevronDown className="h-4 w-4" />
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={closeSelectedPlace}
                        className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.08)_0%,rgba(8,9,16,0.82)_100%)] text-white/70 shadow-[0_12px_24px_rgba(0,0,0,0.24),inset_0_1px_0_rgba(255,255,255,0.1),inset_0_-10px_16px_rgba(0,0,0,0.2)] transition hover:-translate-y-[1px] hover:border-white/18 hover:text-white"
                        aria-label="Close place panel"
                        title="Close place panel"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  {selectedPlaceActionRail}
                  </div>

                  <div
                    className="selected-place-panel-content min-h-0 flex-1 overflow-y-auto px-4 pb-4 md:px-5 md:pb-6"
                    style={isMobileViewport ? { paddingBottom: 'calc(env(safe-area-inset-bottom) + 1.25rem)' } : undefined}
                  >

                  {adventureMode && selectedPlace.description ? (
                    <div className="map-panel-section mt-1 rounded-[22px] border border-violet-200/14 bg-[radial-gradient(circle_at_92%_0%,rgba(139,92,246,0.16),transparent_34%),linear-gradient(180deg,rgba(34,24,53,0.62),rgba(8,8,17,0.9))] px-4 py-3.5 shadow-[0_18px_34px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.07)]">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-[9px] font-black uppercase tracking-[0.24em] text-violet-100/64">
                          Local lore
                        </p>
                        <span className="rounded-full border border-violet-100/14 bg-violet-300/[0.07] px-2 py-1 text-[8px] font-black uppercase tracking-[0.14em] text-violet-100/66">
                          {(selectedPlace.approvedCount ?? 0) > 0
                            ? `${selectedPlace.approvedCount} verified`
                            : 'First proof unclaimed'}
                        </span>
                      </div>
                      <p className="mt-2 text-sm font-semibold leading-5 text-white/72">
                        {selectedPlace.description}
                      </p>
                    </div>
                  ) : null}

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

                  {selectedSaveSpotRail}

                  {selectedPlaceCheckInRail}

                  {selectedPlacePresenceRail}

                  {selectedVenueRoomRail}

                  {selectedSpotVaultRail}

                  <div className="map-command-console hidden">
                    <div className="map-command-console-header">
                      <div>
                        <p>Command layer</p>
                        <h4>Pick the next move</h4>
                      </div>
                      <span>
                        {selectedVenueCommandCards.filter((card) => card.href || card.resolveAction).length} actions
                      </span>
                    </div>

                    <div className="mt-3 grid grid-cols-3 gap-1.5">
                      {selectedSignalActionChips.map((chip) => {
                        const meta = getSignalLayerKindMeta(chip.kind);

                        return (
                          <div
                            key={`selected-signal-action:${chip.kind}`}
                            className={`rounded-[16px] border px-2.5 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),inset_0_-8px_12px_rgba(0,0,0,0.18)] ${meta.activeClass}`}
                          >
                            <p className="text-[8px] font-black uppercase tracking-[0.18em] opacity-65">{chip.label}</p>
                            <p className="mt-1 truncate text-[11px] font-black uppercase tracking-[0.08em] text-white">
                              {chip.value}
                            </p>
                          </div>
                        );
                      })}
                    </div>

                    <div className={`${selectedCommandStripClassName} map-command-strip--primary`}>
                      {selectedCommandStripContent}
                    </div>

                    <div className="map-command-actions">
                      {selectedVenueCommandCards.map((card) => {
                        const isResolving = Boolean(card.resolveAction && pendingCommandAction === card.resolveAction);
                        const actionTitle = isResolving ? 'Routing' : card.actionLabel ?? card.value;
                        const rowTitle =
                          card.id === 'reward' && card.value === 'Fund' ? 'First drop slot' : card.value;
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
                      <p className="text-[10px] uppercase tracking-[0.24em] text-white/35">Proofs</p>
                      <p className="mt-2 text-[1.65rem] font-black leading-none text-white">{selectedPlace.approvedCount ?? 0}</p>
                    </div>
                    <div className={`${mapPanelMetricClass} stat-card bd-dent-surface bd-dent-surface--soft`}>
                      <p className="text-[10px] uppercase tracking-[0.24em] text-white/35">Heat</p>
                      <p className="mt-2 text-[1.65rem] font-black leading-none text-white">{selectedPlace.heatScore ?? 0}</p>
                      <p className="mt-1 text-[10px] uppercase tracking-[0.18em] text-white/42">{selectedPulseMeaning.label}</p>
                    </div>
                  </div>

                  <div className={`map-mobile-secondary mt-4 ${mapPanelSectionClass}`}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.24em] text-white/40">
                        <Sparkles className="h-3.5 w-3.5 text-cyan-200" />
                        Venue Photos
                      </div>
                      <span className={mapPanelInsetChipClass}>
                        {selectedVenuePhotoItems.length > 0
                          ? `${selectedVenuePhotoItems.length} live`
                          : 'open slots'}
                      </span>
                    </div>
                    {selectedVenuePhotoItems.length > 0 ? (
                      <>
                        <div className="mt-3 grid grid-cols-2 gap-2">
                          {selectedVenuePhotoItems.slice(0, 2).map((photo, index) => (
                          <div
                            key={photo.id}
                            className={`group relative overflow-hidden rounded-[20px] border border-white/10 bg-white/[0.04] shadow-[0_14px_26px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.06)] ${
                              index === 0 ? 'col-span-2 aspect-[16/8]' : 'aspect-[4/3]'
                            }`}
                          >
                            <img
                              src={photo.url}
                              alt=""
                              loading="lazy"
                              className="h-full w-full object-cover opacity-90 transition duration-300 group-hover:scale-[1.03] group-hover:opacity-100"
                            />
                            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,transparent_0%,rgba(0,0,0,0.52)_100%)]" />
                            <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between gap-2">
                              <span className="truncate rounded-full border border-white/12 bg-black/46 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.16em] text-white/78">
                                {photo.label}
                              </span>
                              <span className="shrink-0 rounded-full border border-cyan-200/14 bg-cyan-500/[0.1] px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-cyan-100/78">
                                {photo.source}
                              </span>
                            </div>
                          </div>
                          ))}
                        </div>
                        {selectedPlace.slug ? (
                          <Link
                            href={`/venues/${selectedPlace.slug}`}
                            className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-full border border-cyan-300/18 bg-cyan-500/[0.08] px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-cyan-100 transition hover:-translate-y-[1px] hover:border-cyan-200/34"
                          >
                            View full venue
                            <ArrowLeft className="h-3 w-3 rotate-180" />
                          </Link>
                        ) : null}
                      </>
                    ) : (
                      <div className="mt-3 rounded-[20px] border border-white/8 bg-white/[0.035] px-3 py-3">
                        <p className="text-sm font-semibold text-white">Photo slot open.</p>
                        <p className="mt-1.5 text-xs leading-5 text-white/58">
                          First approved mark can make this venue readable.
                        </p>
                      </div>
                    )}
                  </div>

                  <div className={`hidden map-mobile-priority mt-4 ${mapPanelSectionClass}`}>
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

                  <div className={`hidden map-mobile-secondary mt-4 ${mapPanelSectionClass}`}>
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
                    <div className={`hidden map-mobile-secondary mt-4 ${mapPanelSectionClass}`}>
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
                          <p className="text-[10px] uppercase tracking-[0.18em] text-white/34">Verified Proofs</p>
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
                    <div className="mt-3 flex items-center justify-between gap-3 border-t border-white/[0.07] pt-3">
                      <p className="min-w-0 text-[12px] leading-snug text-white/62">
                        <Sparkles className="mr-1.5 inline h-3 w-3 -translate-y-px text-fuchsia-200/70" />
                        You&apos;ve left{' '}
                        <span className="font-semibold text-white/82">
                          {selectedPlaceFootprintStats.totalMarks} verified {selectedPlaceFootprintStats.totalMarks === 1 ? 'proof' : 'proofs'}
                        </span>{' '}
                        here{selectedPlaceFootprintStats.firstMarks > 0 ? ` · ${selectedPlaceFootprintStats.firstMarks} first` : ''}
                      </p>
                      {selectedPlaceFootprintStats.lastMarkedAt ? (
                        <span className="shrink-0 text-[10px] uppercase tracking-[0.16em] text-white/38">
                          {getLastSparkLabel(selectedPlaceFootprintStats.lastMarkedAt).replace('Last proof ', '')}
                        </span>
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
                            {isCommunityActivation(focusedCreatorActivation)
                              ? 'This is a free community dare your dashboard pointed you to here.'
                              : 'This is the live paid activation your dashboard pointed you to here.'}
                          </p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <span className="rounded-full border border-[#f5c518]/18 bg-[#f5c518]/[0.08] px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-[#f8dd72]">
                              {getActivationRewardLabel(focusedCreatorActivation)}
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
                              {getActivationRewardLabel(featuredPaidActivation)}
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

                  {crossedPathsPeople.length > 0 ? (
                  <div className={`crossed-paths-section map-mobile-secondary bd-dent-surface mt-4 ${mapPanelSectionClass}`}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.24em] text-white/40">
                        <Flame className="h-3.5 w-3.5 text-cyan-200" />
                        Crossed Paths
                      </div>
                      <span className="rounded-full border border-cyan-300/18 bg-cyan-500/[0.08] px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-cyan-100">
                        {crossedPathsPeople.length} verified
                      </span>
                    </div>
                    <p className="mt-2 text-sm leading-snug text-white/62">
                      Checked in here when you were. Wave to open a chat — DMs unlock only through verified overlap.
                    </p>
                    <div className="mt-3 space-y-2">
                      {crossedPathsPeople.slice(0, 5).map((person) => (
                        <div
                          key={person.tag}
                          className="flex items-center justify-between gap-3 rounded-[16px] border border-white/8 bg-black/20 px-3 py-2"
                        >
                          <p className="truncate text-sm font-semibold text-white">@{person.tag.replace(/^@/, '')}</p>
                          <Link
                            href={`/chat?to=${encodeURIComponent(person.tag)}&message=${encodeURIComponent(
                              `👋 We crossed paths at ${selectedPlace.name} — verified.`
                            )}`}
                            className="shrink-0 rounded-full border border-cyan-300/24 bg-cyan-500/[0.1] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-cyan-100 transition hover:bg-cyan-500/[0.18]"
                          >
                            👋 Wave
                          </Link>
                        </div>
                      ))}
                    </div>
                  </div>
                  ) : null}

                  {selectedPendingPlaceTags.length > 0 ? (
                    <div className="map-panel-section mt-4 rounded-[24px] border border-amber-400/18 bg-[linear-gradient(180deg,rgba(251,191,36,0.08)_0%,rgba(10,10,18,0.94)_100%)] px-4 py-3.5 shadow-[0_18px_36px_rgba(0,0,0,0.16),inset_0_1px_0_rgba(255,255,255,0.06)]">
                      <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.24em] text-amber-200/80">
                        <Loader2 className="h-3.5 w-3.5" />
                        Pending Proofs
                      </div>
                      <p className="mt-2 text-sm text-white/72">
                        Your proof is waiting for review. Once it clears, the venue updates automatically.
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
                                    {tag.creatorTag ? `@${tag.creatorTag}` : 'Your pending proof'}
                                  </p>
                                  <span className="rounded-full border border-amber-300/18 bg-amber-500/[0.1] px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-amber-100">
                                    pending
                                  </span>
                                </div>
                                <p className="mt-2 text-sm text-white/62">
                                  {tag.caption || 'Proof submitted and waiting for review.'}
                                </p>
                                {tag.firstMark ? (
                                  <p className="mt-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#f8dd72]">
                                    If approved, this becomes the first proof here.
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

                  {selectedPlaceActiveDaresLoading || selectedPlaceActiveDares.length > 0 ? (
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
                                    {getActivationRewardLabel(dare)}
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
                    ) : null}
                  </div>
                  ) : null}

                  <div className={`mt-4 ${mapPanelSectionClass}`}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.24em] text-white/40">
                        <Sparkles className="h-3.5 w-3.5 text-[#f5c518]" />
                        Recent Proofs
                      </div>
                      {selectedPlaceTags.length > 0 ? (
                        <button
                          type="button"
                          onClick={() => setProofReelOpen(true)}
                          className="inline-flex items-center gap-1.5 rounded-full border border-[#f5c518]/30 bg-[#f5c518]/[0.1] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-[#f8dd72] transition hover:border-[#f5c518]/55 hover:bg-[#f5c518]/[0.16]"
                        >
                          ▶ Reel
                        </button>
                      ) : null}
                    </div>
                    {selectedPlaceTagsLoading ? (
                      <div className="mt-3 flex items-center gap-2 text-sm text-white/55">
                        <Loader2 className="h-4 w-4 animate-spin text-cyan-200" />
                        Loading recent proof...
                      </div>
                    ) : selectedPlaceTagsError ? (
                      <p className="mt-3 text-sm text-rose-200/80">{selectedPlaceTagsError}</p>
                    ) : selectedPlaceTags.length > 0 ? (
                      <div className="mt-2 divide-y divide-white/[0.06]">
                        {selectedPlaceTags.slice(0, 3).map((tag) => (
                          <div
                            key={tag.id}
                            className="px-0.5 py-2.5"
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
                                    First proof
                                  </div>
                                ) : null}
                                <p className="mt-1.5 line-clamp-2 text-[13px] leading-snug text-white/62">
                                  {tag.caption || 'Verified proof submitted without a caption.'}
                                </p>
                                {tag.vibeTags.length > 0 ? (
                                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                                    {tag.vibeTags.filter((vibeTag) => !/first\s*-?\s*proof/i.test(vibeTag)).slice(0, 2).map((vibeTag) => (
                                      <span
                                        key={vibeTag}
                                        className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[9px] uppercase tracking-[0.16em] text-white/45"
                                      >
                                        {vibeTag}
                                      </span>
                                    ))}
                                    {tag.vibeTags.filter((vibeTag) => !/first\s*-?\s*proof/i.test(vibeTag)).length > 2 ? (
                                      <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[9px] uppercase tracking-[0.16em] text-white/38">
                                        +{tag.vibeTags.filter((vibeTag) => !/first\s*-?\s*proof/i.test(vibeTag)).length - 2}
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
                        No approved proof is live here yet. Be first.
                      </p>
                    )}
                  </div>

                  </div>
                  </div>
                </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {proofReelOpen && selectedPlace && selectedPlaceTags.length > 0 ? (
        <ProofReel
          key={selectedPlace.placeId ?? selectedPlace.slug ?? selectedPlace.name}
          venueName={selectedPlace.name}
          venueHandle={selectedPlace.handle}
          items={selectedPlaceTags}
          onClose={() => setProofReelOpen(false)}
        />
      ) : null}

      {proofMoment ? (
        <ProofMomentSheet
          tagId={proofMoment.tagId}
          venueName={proofMoment.venueName}
          venueSlug={proofMoment.venueSlug}
          venueHandle={proofMoment.venueHandle}
          creatorTag={proofMoment.creatorTag}
          walletAddress={address ?? null}
          firstMark={proofMoment.firstMark}
          submittedAt={proofMoment.submittedAt}
          onClose={() => setProofMoment(null)}
        />
      ) : null}

      {meetupComposerOpen && selectedPlace?.slug ? (
        <MeetupComposerSheet
          venueSlug={selectedPlace.slug}
          venueName={selectedPlace.name}
          latitude={selectedPlace.latitude}
          longitude={selectedPlace.longitude}
          onClose={() => setMeetupComposerOpen(false)}
          onCreated={() => {
            setMeetupComposerOpen(false);
            setMeetupsRefreshNonce((nonce) => nonce + 1);
          }}
        />
      ) : null}

      <style jsx>{`
        :root {
          --neu-dark: rgba(0, 0, 0, 0.75);
          --neu-light: rgba(255, 255, 255, 0.07);
          --neu-surface: #0e0e1a;
        }

        .selected-place-panel-wrap {
          max-height: calc(100% - 16px);
        }

        .selected-place-panel-wrap--compact {
          max-height: min(31dvh, 15.5rem);
        }

        .selected-place-compact-dock {
          border-radius: 30px;
          transform-origin: 50% 100%;
        }

        :global(.map-save-spot-rail) {
          display: flex;
          min-height: 0;
          flex-direction: column;
          content-visibility: visible !important;
          contain-intrinsic-size: auto !important;
        }

        :global(.map-save-spot-scroll) {
          min-height: 0;
        }

        :global(.map-save-spot-fields) {
          display: grid;
          grid-template-columns: 76px minmax(0, 1fr);
          gap: 0.625rem;
          align-items: stretch;
        }

        :global(.map-save-spot-photo) {
          min-height: 76px;
        }

        :global(.map-save-spot-actions) {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        @media (min-width: 640px) {
          :global(.map-save-spot-fields) {
            grid-template-columns: 86px minmax(0, 1fr);
            gap: 0.75rem;
          }

          :global(.map-save-spot-photo) {
            min-height: 86px;
          }
        }

        .nearby-dare-tray {
          display: flex;
          max-height: calc(100% - 1.5rem);
          flex-direction: column;
          backdrop-filter: blur(18px);
          -webkit-backdrop-filter: blur(18px);
          transform-origin: 50% 100%;
        }

        .nearby-dare-tray--expanded {
          max-height: min(74dvh, calc(100% - 2rem));
        }

        .nearby-dare-tray-list {
          flex: 1 1 auto;
          min-height: 0;
          max-height: min(42dvh, 24rem);
          overflow-y: auto;
          scrollbar-color: rgba(245, 197, 24, 0.34) transparent;
          scrollbar-width: thin;
          -webkit-overflow-scrolling: touch;
          overscroll-behavior-y: contain;
          touch-action: pan-y;
        }

        .nearby-dare-tray-list::-webkit-scrollbar {
          width: 4px;
        }

        .nearby-dare-tray-list::-webkit-scrollbar-track {
          background: transparent;
        }

        .nearby-dare-tray-list::-webkit-scrollbar-thumb {
          border-radius: 999px;
          background: rgba(245, 197, 24, 0.32);
        }

        .venue-action-rail--primary {
          width: 100%;
          gap: clamp(0.28rem, 1.25vw, 0.5rem);
        }

        .venue-action-rail :global(.map-jelly-action) {
          width: 100% !important;
          min-width: 0;
          justify-self: stretch;
          transform: translateZ(0);
        }

        .venue-action-rail :global(.map-jelly-action > div) {
          padding-right: 0.38rem;
          padding-left: 0.38rem;
        }

        .venue-action-rail :global(.map-jelly-action-label) {
          min-width: 0;
          max-width: 100%;
          gap: 0.22rem;
          overflow: visible;
          font-size: clamp(0.52rem, 2.25vw, 0.68rem);
          letter-spacing: 0.065em;
          line-height: 1;
          white-space: nowrap;
        }

        .venue-action-rail :global(.map-jelly-action-label > svg) {
          display: none !important;
        }

        @media (max-width: 767px) {
          .selected-place-panel-wrap {
            bottom: calc(0.75rem + env(safe-area-inset-bottom));
            max-height: min(82dvh, calc(100% - 1.5rem));
          }

          .selected-place-panel-wrap--save-spot {
            bottom: calc(0.35rem + env(safe-area-inset-bottom));
            max-height: min(92dvh, calc(100% - 0.7rem));
          }

          .selected-place-panel-wrap--compact {
            right: 0.75rem;
            bottom: calc(0.8rem + env(safe-area-inset-bottom));
            left: 0.75rem;
            max-height: min(32dvh, 15.75rem);
          }

          .selected-place-panel-content {
            padding-bottom: calc(env(safe-area-inset-bottom) + 1.25rem) !important;
            scroll-padding-bottom: calc(env(safe-area-inset-bottom) + 1.25rem);
            -webkit-overflow-scrolling: touch;
            overscroll-behavior-y: auto;
            touch-action: pan-y;
          }

          .selected-place-panel-header {
            max-height: min(42dvh, 18.75rem);
          }

          .selected-place-panel-wrap--save-spot .selected-place-panel-header {
            max-height: min(28dvh, 12rem);
          }

          .selected-place-panel-stack--save-spot {
            max-height: min(88dvh, calc(100dvh - 0.75rem)) !important;
          }

          .selected-place-panel-wrap--save-spot .selected-place-panel-content {
            min-height: 0;
          }

          :global(.map-save-spot-rail) {
            max-height: min(62dvh, calc(100dvh - 11rem));
            overflow: hidden;
          }

          :global(.map-save-spot-scroll) {
            flex: 1 1 auto;
            min-height: 0;
            overflow-y: auto;
            padding-right: 0.1rem;
            padding-bottom: calc(env(safe-area-inset-bottom) + 0.4rem);
            overscroll-behavior-y: contain;
            touch-action: pan-y;
            -webkit-overflow-scrolling: touch;
          }

          :global(.map-save-spot-actions) {
            position: sticky;
            bottom: 0;
            z-index: 2;
            margin-right: -0.1rem;
            padding-top: 0.45rem;
            background: linear-gradient(
              180deg,
              rgba(7, 12, 15, 0) 0%,
              rgba(7, 12, 15, 0.92) 34%,
              rgba(7, 12, 15, 0.98) 100%
            );
          }

          .nearby-dare-tray-list {
            max-height: min(54dvh, calc(100dvh - 13rem));
            overflow-y: auto;
          }

          .nearby-dare-tray--expanded {
            right: 0.75rem !important;
            bottom: calc(0.75rem + env(safe-area-inset-bottom)) !important;
            left: 0.75rem !important;
            max-height: min(78dvh, calc(100dvh - 6rem));
            border-radius: 1.55rem 1.55rem 1.25rem 1.25rem !important;
          }

          .map-signal-rail {
            align-items: flex-start;
            flex-wrap: nowrap;
            gap: 0.4rem;
          }

          .map-signal-rail-label {
            padding-top: 0.68rem;
            font-size: 8px;
            letter-spacing: 0.2em;
          }

          .map-signal-rail-scroll {
            margin-right: -1rem;
            flex-wrap: nowrap;
            overflow-x: auto;
            padding-right: 1rem;
          }

          .map-signal-pill {
            min-width: 7.4rem;
            min-height: 2.85rem;
            flex-basis: 7.4rem;
            padding: 0.42rem 0.62rem 0.42rem 0.42rem;
          }

          .map-signal-pill-count {
            min-width: 1.85rem;
            height: 1.85rem;
            font-size: 0.72rem;
          }

          .map-signal-pill-main span:first-child {
            font-size: 0.56rem;
            letter-spacing: 0.08em;
          }

          .map-signal-pill-main span:last-child {
            font-size: 0.5rem;
            letter-spacing: 0.08em;
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

          .venue-action-rail :global(.map-jelly-action-label) {
            font-size: clamp(0.5rem, 2.42vw, 0.64rem);
            letter-spacing: 0.055em;
          }
        }

        @media (min-width: 768px) {
          .selected-place-panel-wrap {
            top: 16px;
            right: 16px;
            bottom: 16px;
            left: auto;
            width: min(472px, calc(100% - 88px));
            max-height: calc(100% - 32px);
          }
        }

        .map-panel-shell {
          transform-origin: 88% 8%;
          will-change: transform, opacity;
          animation: mapPanelRollout 300ms cubic-bezier(0.22, 1, 0.36, 1);
        }

        @media (min-width: 768px) {
          .map-shell-section {
            position: fixed;
            top: 6rem;
            right: 0;
            bottom: 0;
            left: 0;
            z-index: 20;
            overflow: hidden;
            padding: 0 1.5rem 1.25rem;
          }

          .map-shell-inner {
            height: 100%;
          }

          .map-shell-frame {
            display: flex;
            height: 100%;
            flex-direction: column;
          }

          .map-container-wrapper--desktop-shell {
            flex: 1 1 auto;
            width: 100%;
            min-height: 0 !important;
            height: auto !important;
          }
        }

        .map-container-wrapper {
          border-radius: 0 0 34px 34px;
          background: var(--neu-surface);
          background-color: #070817;
          isolation: isolate;
          box-shadow:
            inset 6px 6px 14px rgba(0, 0, 0, 0.8),
            inset -4px -4px 10px rgba(255, 255, 255, 0.05),
            0 2px 4px rgba(255, 255, 255, 0.06),
            0 -2px 4px rgba(0, 0, 0, 0.6);
          outline: 3px solid rgba(255, 255, 255, 0.04);
          outline-offset: -3px;
        }

        .map-container-wrapper--immersive {
          border-radius: 0;
          box-shadow: none;
          outline: 0;
        }

        .map-canvas-host {
          overflow: hidden;
          background:
            radial-gradient(circle at 58% 44%, rgba(42, 24, 78, 0.92) 0%, rgba(8, 5, 22, 1) 54%, rgba(2, 2, 8, 1) 100%);
        }

        @media (min-width: 768px) {
          .map-card-ambient {
            display: none;
          }

          .map-container-wrapper {
            border-radius: 0 0 28px 28px;
            background: #050617 !important;
            box-shadow: none !important;
            outline: 1px solid rgba(255, 255, 255, 0.055);
            outline-offset: -1px;
            contain: layout paint style;
            transform: none !important;
          }
        }

        .map-fullscreen-toggle {
          position: absolute;
          top: calc(0.75rem + env(safe-area-inset-top));
          right: calc(0.75rem + env(safe-area-inset-right));
          z-index: 18;
          display: inline-flex;
          width: 2.75rem;
          height: 2.75rem;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(255, 255, 255, 0.14);
          border-radius: 999px;
          color: rgba(255, 255, 255, 0.82);
          background:
            radial-gradient(circle at 50% 0%, rgba(34, 211, 238, 0.18), transparent 42%),
            linear-gradient(180deg, rgba(255, 255, 255, 0.11), rgba(6, 8, 16, 0.88));
          box-shadow:
            0 16px 34px rgba(0, 0, 0, 0.36),
            0 0 24px rgba(34, 211, 238, 0.1),
            inset 0 1px 0 rgba(255, 255, 255, 0.14),
            inset 0 -10px 16px rgba(0, 0, 0, 0.28);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          transition:
            transform 160ms ease,
            border-color 160ms ease,
            color 160ms ease,
            background 160ms ease;
          touch-action: manipulation;
        }

        .map-fullscreen-toggle:active {
          transform: translateY(1px) scale(0.98);
        }

        .map-fullscreen-toggle--active {
          border-color: rgba(245, 197, 24, 0.34);
          color: #fff0bc;
          background:
            radial-gradient(circle at 50% 0%, rgba(245, 197, 24, 0.2), transparent 42%),
            linear-gradient(180deg, rgba(245, 197, 24, 0.17), rgba(16, 11, 4, 0.9));
          box-shadow:
            0 16px 34px rgba(0, 0, 0, 0.38),
            0 0 24px rgba(245, 197, 24, 0.12),
            inset 0 1px 0 rgba(255, 255, 255, 0.16),
            inset 0 -10px 16px rgba(0, 0, 0, 0.3);
        }

        .map-intent-row {
          display: flex;
          width: 100%;
          gap: 0.32rem;
          overflow-x: auto;
          padding: 0.34rem 0.05rem 0;
          scrollbar-width: none;
          -webkit-overflow-scrolling: touch;
        }

        .map-intent-row::-webkit-scrollbar {
          display: none;
        }

        .map-intent-chip {
          appearance: none;
          display: inline-flex;
          min-height: 2.25rem;
          flex: 0 0 auto;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background:
            radial-gradient(circle at 50% 0%, rgba(255, 255, 255, 0.09), transparent 42%),
            linear-gradient(180deg, rgba(255, 255, 255, 0.055), rgba(6, 8, 16, 0.9));
          padding: 0.34rem 0.58rem;
          color: rgba(255, 255, 255, 0.62);
          font-size: 0.52rem;
          font-weight: 900;
          letter-spacing: 0.16em;
          line-height: 1;
          text-transform: uppercase;
          box-shadow:
            0 8px 16px rgba(0, 0, 0, 0.18),
            inset 0 1px 0 rgba(255, 255, 255, 0.07),
            inset 0 -8px 12px rgba(0, 0, 0, 0.18);
          transition:
            transform 160ms ease,
            border-color 160ms ease,
            color 160ms ease,
            background 160ms ease;
        }

        .map-intent-chip:hover,
        .map-intent-chip[data-active='true'] {
          border-color: rgba(34, 211, 238, 0.32);
          color: rgba(224, 252, 255, 0.95);
          background:
            radial-gradient(circle at 50% 0%, rgba(34, 211, 238, 0.16), transparent 42%),
            linear-gradient(180deg, rgba(34, 211, 238, 0.11), rgba(6, 8, 16, 0.9));
        }

        .map-intent-chip:hover {
          transform: translateY(-1px);
        }

        .map-top-control-stack {
          display: flex;
          width: 100%;
          flex-direction: column;
          gap: 0.38rem;
        }

        .map-status-rail {
          display: flex;
          width: 100%;
          max-width: 48rem;
          flex-wrap: wrap;
          align-items: center;
          gap: 0.34rem;
        }

        .map-status-pill {
          appearance: none;
          position: relative;
          isolation: isolate;
          display: inline-flex;
          min-height: 2.25rem;
          align-items: center;
          justify-content: center;
          gap: 0.38rem;
          overflow: hidden;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background:
            radial-gradient(circle at 50% 0%, rgba(255, 255, 255, 0.1), transparent 42%),
            linear-gradient(180deg, rgba(255, 255, 255, 0.055), rgba(6, 8, 16, 0.9));
          padding: 0.36rem 0.66rem 0.34rem;
          color: rgba(255, 255, 255, 0.58);
          font-size: 0.58rem;
          font-weight: 900;
          letter-spacing: 0.13em;
          line-height: 1;
          text-transform: uppercase;
          box-shadow:
            0 10px 18px rgba(0, 0, 0, 0.2),
            inset 0 1px 0 rgba(255, 255, 255, 0.08),
            inset 0 -9px 14px rgba(0, 0, 0, 0.18);
          transition:
            transform 160ms ease,
            border-color 160ms ease,
            color 160ms ease,
            background 160ms ease;
        }

        .map-status-pill::before {
          content: '';
          position: absolute;
          inset: 1px 1px auto;
          height: 45%;
          border-radius: inherit;
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.08), transparent);
          pointer-events: none;
        }

        .map-status-pill span,
        .map-status-pill svg {
          position: relative;
          z-index: 1;
        }

        .map-status-pill span:last-child:not(:first-child) {
          display: inline-flex;
          min-width: 1.35rem;
          height: 1.35rem;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(0, 0, 0, 0.24);
          color: rgba(255, 255, 255, 0.78);
          font-size: 0.58rem;
          letter-spacing: 0;
        }

        .map-status-pill span.map-status-label {
          min-width: 0;
          height: auto;
          border: 0;
          border-radius: 0;
          background: transparent;
          color: inherit;
          font-size: inherit;
          letter-spacing: inherit;
        }

        .map-status-pill:hover:not(:disabled),
        .map-status-pill[data-active='true'] {
          transform: translateY(-1px);
          border-color: rgba(255, 255, 255, 0.18);
          color: white;
        }

        .map-status-pill:disabled {
          cursor: not-allowed;
          opacity: 0.5;
        }

        .map-status-pill--filters {
          border-color: rgba(34, 211, 238, 0.16);
          color: rgba(202, 248, 255, 0.72);
        }

        .map-status-pill--summary {
          min-width: 0;
          max-width: min(15rem, 58vw);
          pointer-events: none;
        }

        .map-status-pill--summary span:first-child {
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .map-status-pill--filters[data-active='true'] {
          border-color: rgba(34, 211, 238, 0.36);
          background:
            radial-gradient(circle at 50% 0%, rgba(34, 211, 238, 0.15), transparent 42%),
            linear-gradient(180deg, rgba(34, 211, 238, 0.11), rgba(6, 8, 16, 0.9));
          color: rgba(224, 252, 255, 0.96);
        }

        .map-status-pill--adventure[data-active='true'] {
          border-color: rgba(245, 197, 24, 0.38);
          background: linear-gradient(180deg, rgba(245, 197, 24, 0.14), rgba(12, 9, 3, 0.92));
          color: rgba(255, 239, 164, 0.96);
        }

        .map-status-pill--tonight {
          border-color: rgba(34, 211, 238, 0.16);
          color: rgba(207, 250, 254, 0.78);
        }

        .map-status-pill--secrets {
          border-color: rgba(196, 157, 255, 0.2);
          color: rgba(237, 221, 255, 0.8);
        }

        .map-status-pill--trail {
          border-color: rgba(110, 231, 183, 0.18);
          color: rgba(209, 250, 229, 0.8);
        }

        .map-advanced-filter-panel {
          display: grid;
          width: fit-content;
          max-width: 100%;
          gap: 0.52rem;
          border-radius: 1.1rem;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background:
            radial-gradient(circle at 12% 0%, rgba(168, 85, 247, 0.12), transparent 32%),
            linear-gradient(180deg, rgba(255, 255, 255, 0.055), rgba(6, 8, 16, 0.92));
          padding: 0.56rem;
          box-shadow:
            0 16px 32px rgba(0, 0, 0, 0.28),
            inset 0 1px 0 rgba(255, 255, 255, 0.08),
            inset 0 -12px 18px rgba(0, 0, 0, 0.18);
        }

        .map-advanced-filter-group {
          display: flex;
          flex-direction: column;
          gap: 0.32rem;
        }

        .map-advanced-filter-label {
          padding-inline: 0.1rem;
          color: rgba(255, 255, 255, 0.36);
          font-size: 0.54rem;
          font-weight: 900;
          letter-spacing: 0.22em;
          line-height: 1;
          text-transform: uppercase;
        }

        .map-advanced-filter-row {
          display: flex;
          flex-wrap: wrap;
          gap: 0.34rem;
        }

        .map-search-popover {
          max-height: min(54dvh, 26rem);
          overflow-y: auto;
          overscroll-behavior: contain;
          -webkit-overflow-scrolling: touch;
        }

        @media (max-width: 767px) {
          .map-command-header {
            gap: 0.34rem;
            padding-top: 0.5rem !important;
            padding-bottom: 0.46rem !important;
          }

          .map-intent-row {
            display: grid;
            grid-template-columns: repeat(4, minmax(0, 1fr));
            gap: 0.28rem;
            overflow: visible;
            padding-top: 0.26rem;
          }

          .map-intent-chip {
            width: 100%;
            min-height: 2.25rem;
            padding-inline: 0.32rem;
            font-size: 0.46rem;
            letter-spacing: 0.1em;
          }

          .map-top-control-stack {
            gap: 0.24rem;
          }

          .map-status-rail {
            flex-wrap: nowrap;
            overflow-x: auto;
            padding-bottom: 0.1rem;
            scrollbar-width: none;
            -webkit-overflow-scrolling: touch;
          }

          .map-status-rail::-webkit-scrollbar {
            display: none;
          }

          .map-status-pill {
            min-height: 2.25rem;
            flex: 0 0 auto;
            padding-inline: 0.56rem;
            font-size: 0.52rem;
          }

          .map-status-pill--summary {
            flex: 0 0 auto;
            max-width: none;
            justify-content: space-between;
          }

          .map-status-pill--filters {
            margin-left: 0;
          }

          .map-advanced-filter-panel {
            width: 100%;
            max-height: min(32vh, 13.5rem);
            overflow-y: auto;
            -webkit-overflow-scrolling: touch;
          }

          .map-search-popover {
            max-height: min(48dvh, 20rem);
          }
        }

        .map-signal-rail {
          display: flex;
          width: 100%;
          align-items: flex-start;
          flex-wrap: wrap;
          gap: 0.48rem;
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
          flex: 1 1 min(46rem, 100%);
          min-width: 0;
          flex-wrap: wrap;
          gap: 0.42rem;
          overflow: visible;
          padding: 0.1rem 0.1rem 0.2rem;
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
          min-width: 7.35rem;
          min-height: 2.58rem;
          flex: 0 1 clamp(7.35rem, 9vw, 9.65rem);
          align-items: center;
          gap: 0.46rem;
          overflow: hidden;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background:
            radial-gradient(circle at 18% 0%, rgba(255, 255, 255, 0.12), transparent 36%),
            linear-gradient(180deg, rgba(255, 255, 255, 0.055), rgba(6, 8, 16, 0.9));
          padding: 0.38rem 0.64rem 0.36rem 0.4rem;
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
          min-width: 1.74rem;
          height: 1.74rem;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(0, 0, 0, 0.26);
          color: white;
          font-size: 0.72rem;
          font-weight: 950;
          letter-spacing: -0.04em;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08);
        }

        .map-signal-pill-main {
          position: relative;
          z-index: 1;
          display: flex;
          min-width: 0;
          max-width: 100%;
          flex-direction: column;
          align-items: flex-start;
          gap: 0.12rem;
          white-space: normal;
        }

        .map-signal-pill-main span:first-child {
          max-width: 100%;
          font-size: 0.56rem;
          font-weight: 900;
          letter-spacing: 0.1em;
          line-height: 1.02;
          text-transform: uppercase;
        }

        .map-signal-pill-main span:last-child {
          max-width: 100%;
          font-size: 0.48rem;
          font-weight: 800;
          letter-spacing: 0.1em;
          line-height: 1.05;
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
          width: 100%;
          min-width: 6.7rem;
          max-width: 7.8rem;
          align-items: center;
          justify-content: center;
          gap: 0.3rem;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.18);
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.14), rgba(255, 255, 255, 0.055));
          padding: 0.44rem 0.64rem;
          color: rgba(255, 255, 255, 0.86);
          font-size: 0.52rem;
          font-weight: 850;
          letter-spacing: 0.08em;
          line-height: 1.06;
          text-align: center;
          text-transform: uppercase;
          white-space: normal;
          overflow-wrap: normal;
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

        .legend-venue-sign-mini {
          position: relative;
          display: grid;
          height: 28px;
          width: 38px;
          flex: 0 0 auto;
          place-items: center;
          filter: drop-shadow(0 8px 10px rgba(0, 0, 0, 0.38)) drop-shadow(0 0 12px rgba(245, 197, 24, 0.24));
        }

        .legend-venue-sign-mini::after {
          content: '';
          position: absolute;
          left: 7px;
          right: 7px;
          bottom: 0;
          height: 8px;
          border-radius: 0 0 9999px 9999px;
          background: linear-gradient(90deg, rgba(96, 62, 8, 0.2), rgba(248, 221, 114, 0.74), rgba(96, 62, 8, 0.2));
          transform: perspective(36px) rotateX(58deg);
          transform-origin: center top;
        }

        .legend-venue-sign-mini-face {
          position: relative;
          z-index: 1;
          border-radius: 8px 8px 6px 6px;
          border: 1px solid rgba(255, 244, 190, 0.72);
          background:
            linear-gradient(180deg, rgba(255, 246, 183, 0.98), rgba(245, 197, 24, 0.96) 52%, rgba(139, 86, 12, 0.96));
          padding: 5px 7px 4px;
          color: rgba(22, 14, 0, 0.92);
          font-size: 6px;
          font-weight: 950;
          letter-spacing: 0.08em;
          line-height: 1;
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.65),
            inset 0 -6px 8px rgba(74, 42, 0, 0.28),
            0 0 0 2px rgba(245, 197, 24, 0.14);
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

        .map-sheet-drag-handle {
          cursor: grab;
          touch-action: none;
          -webkit-tap-highlight-color: transparent;
        }

        .map-sheet-drag-handle:active {
          cursor: grabbing;
        }

        .map-sheet-drag-bar {
          display: block;
          height: 6px;
          width: 3.6rem;
          border-radius: 9999px;
          background: linear-gradient(90deg, rgba(255, 255, 255, 0.18), rgba(255, 255, 255, 0.34), rgba(255, 255, 255, 0.18));
          box-shadow:
            0 1px 0 rgba(255, 255, 255, 0.08),
            inset 0 1px 0 rgba(255, 255, 255, 0.18);
          transition:
            width 160ms ease,
            background 160ms ease,
            box-shadow 160ms ease;
        }

        .map-sheet-drag-handle:hover .map-sheet-drag-bar,
        .map-sheet-drag-handle:focus-visible .map-sheet-drag-bar {
          width: 4.25rem;
          background: linear-gradient(90deg, rgba(103, 232, 249, 0.32), rgba(255, 255, 255, 0.48), rgba(216, 180, 254, 0.32));
          box-shadow:
            0 0 16px rgba(103, 232, 249, 0.12),
            inset 0 1px 0 rgba(255, 255, 255, 0.28);
        }

        @media (max-width: 767px) {
          .selected-place-panel-wrap,
          .nearby-dare-tray {
            transition: transform 180ms cubic-bezier(0.22, 1, 0.36, 1);
            will-change: transform;
          }

          .selected-place-panel-wrap[data-sheet-dragging='true'],
          .nearby-dare-tray[data-sheet-dragging='true'] {
            transition: none !important;
          }

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

        .venue-action-rail--primary {
          width: calc(100% + 3.75rem);
          max-width: calc(100% + 3.75rem);
        }

        @media (min-width: 768px) {
          .venue-action-rail--primary {
            width: 100%;
            max-width: 100%;
          }
        }

        .venue-action-rail :global(.map-jelly-action > svg) {
          display: block;
        }

        .venue-action-rail :global(.map-jelly-action > div) {
          padding-left: 0.2rem !important;
          padding-right: 0.2rem !important;
        }

        .venue-action-rail :global(.map-jelly-action > div svg) {
          display: none !important;
        }

        .venue-action-rail :global(.map-jelly-action-label) {
          max-width: 100%;
          min-width: 0;
          overflow: visible;
          text-overflow: clip;
          white-space: nowrap;
          font-size: clamp(0.56rem, 0.66vw, 0.66rem) !important;
          letter-spacing: 0.025em !important;
          line-height: 1;
        }

        @media (min-width: 768px) {
          .venue-action-rail :global(.map-jelly-action > div svg) {
            display: block !important;
          }

          .venue-action-rail :global(.map-jelly-action-label) {
            font-size: 0.74rem !important;
            letter-spacing: 0.08em !important;
          }
        }

        @media (min-width: 1180px) {
          .venue-action-rail :global(.map-jelly-action-label) {
            font-size: 0.76rem !important;
            letter-spacing: 0.08em !important;
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
          .venue-action-rail--primary {
            width: calc(100% + 3.25rem);
            max-width: calc(100% + 3.25rem);
          }

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

          .selected-place-panel-header .venue-action-rail--primary {
            margin-top: 0.65rem;
          }

          .selected-place-panel-header .venue-action-rail :global(.map-action-button) {
            min-height: 44px;
          }
        }

        .venue-action-rail--primary.venue-action-rail--compact-dock {
          width: 100%;
          max-width: 100%;
          margin-top: 0.75rem;
        }

        .selected-place-compact-dock .venue-action-rail {
          padding: 0.36rem;
        }

        .selected-place-compact-dock :global(.map-action-button) {
          min-height: 44px;
        }

        .selected-place-compact-dock :global(.map-jelly-action-label) {
          font-size: 0.58rem !important;
          letter-spacing: 0.055em !important;
        }

        .venue-action-rail--primary {
          width: 100% !important;
          max-width: 100% !important;
          margin-right: 0;
          margin-left: 0;
          align-items: stretch;
          justify-items: stretch;
          gap: clamp(0.24rem, 0.64vw, 0.42rem) !important;
        }

        .venue-action-rail--primary :global(.map-jelly-action) {
          display: block;
          width: 100% !important;
          max-width: 100%;
          min-width: 0;
          justify-self: stretch;
        }

        .venue-action-rail--primary :global(.map-jelly-action > div) {
          padding-right: clamp(0.22rem, 0.7vw, 0.42rem) !important;
          padding-left: clamp(0.22rem, 0.7vw, 0.42rem) !important;
        }

        .venue-action-rail--primary :global(.map-jelly-action-label) {
          display: flex;
          width: 100%;
          min-width: 0;
          max-width: 100%;
          align-items: center;
          flex-wrap: wrap;
          justify-content: center;
          gap: 0.14rem;
          overflow: hidden;
          text-align: center;
          text-overflow: clip;
          text-wrap: balance;
          white-space: normal;
          overflow-wrap: normal;
          font-size: clamp(0.5rem, 1.24vw, 0.62rem) !important;
          letter-spacing: 0.018em !important;
          line-height: 1.04;
        }

        .venue-action-rail--primary :global(.map-jelly-action-label > svg),
        .venue-action-rail--primary :global(.map-jelly-action > div svg) {
          display: none !important;
        }

        .selected-place-panel-header .venue-action-rail--primary {
          width: 100% !important;
          max-width: 100% !important;
        }

        .venue-action-rail--primary.venue-action-rail--three {
          grid-template-columns: repeat(auto-fit, minmax(min(100%, 8.1rem), 1fr));
        }

        .venue-action-rail--primary.venue-action-rail--four {
          grid-template-columns: repeat(auto-fit, minmax(min(100%, 7.25rem), 1fr));
        }

        .venue-action-rail--primary.venue-action-rail--two {
          grid-template-columns: repeat(auto-fit, minmax(min(100%, 8.1rem), 1fr));
        }

        :global(.venue-action-rail--primary) {
          width: 100% !important;
          max-width: 100% !important;
          margin-right: 0 !important;
          margin-left: 0 !important;
          align-items: stretch !important;
          justify-items: stretch !important;
          gap: clamp(0.24rem, 0.64vw, 0.42rem) !important;
        }

        :global(.venue-action-rail--primary.venue-action-rail--three) {
          grid-template-columns: repeat(auto-fit, minmax(min(100%, 8.1rem), 1fr)) !important;
        }

        :global(.venue-action-rail--primary.venue-action-rail--four) {
          grid-template-columns: repeat(auto-fit, minmax(min(100%, 7.25rem), 1fr)) !important;
        }

        :global(.venue-action-rail--primary.venue-action-rail--two) {
          grid-template-columns: repeat(auto-fit, minmax(min(100%, 8.1rem), 1fr)) !important;
        }

        :global(.venue-action-rail--primary .map-primary-action-button) {
          position: relative !important;
          display: flex !important;
          min-width: 0 !important;
          width: 100% !important;
          min-height: 52px !important;
          align-items: center !important;
          justify-content: center !important;
          overflow: hidden !important;
          border: 1px solid rgba(255, 255, 255, 0.18) !important;
          border-radius: 999px !important;
          padding: 0.7rem clamp(0.28rem, 0.68vw, 0.58rem) 0.64rem !important;
          text-align: center !important;
          font-size: clamp(0.52rem, 0.62vw, 0.64rem) !important;
          font-weight: 900 !important;
          line-height: 1.05 !important;
          letter-spacing: 0.018em !important;
          text-transform: uppercase !important;
          box-shadow:
            0 12px 22px rgba(0, 0, 0, 0.34),
            inset 0 1px 0 rgba(255, 255, 255, 0.34),
            inset 0 -12px 16px rgba(0, 0, 0, 0.28) !important;
          transform: translateZ(0);
          transition:
            border-color 160ms ease,
            box-shadow 160ms ease,
            transform 160ms ease;
        }

        :global(.venue-action-rail--primary .map-primary-action-button::before) {
          content: '';
          position: absolute;
          inset: 4px 20% auto;
          height: 4px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.32);
          opacity: 0.78;
          pointer-events: none;
        }

        :global(.venue-action-rail--primary .map-primary-action-button:hover) {
          transform: translateY(-1px) translateZ(0);
          box-shadow:
            0 16px 26px rgba(0, 0, 0, 0.38),
            inset 0 1px 0 rgba(255, 255, 255, 0.38),
            inset 0 -13px 18px rgba(0, 0, 0, 0.3) !important;
        }

        :global(.venue-action-rail--primary .map-primary-action-button > span) {
          position: relative !important;
          z-index: 1 !important;
          display: block !important;
          min-width: 0 !important;
          max-width: 100% !important;
          overflow: visible !important;
          white-space: normal !important;
          text-align: center !important;
          text-wrap: balance;
          overflow-wrap: normal;
          font-size: inherit !important;
          letter-spacing: inherit !important;
          line-height: 1.05 !important;
        }

        :global(.venue-action-rail--primary .map-primary-action-button > svg) {
          display: none !important;
        }

        :global(.venue-action-rail--primary .map-primary-action-button--proof) {
          color: #15120c !important;
          border-color: rgba(255, 232, 122, 0.72) !important;
          background:
            radial-gradient(circle at 50% 0%, rgba(255, 255, 255, 0.62), transparent 36%),
            linear-gradient(180deg, #ffe36a 0%, #f5c518 52%, #8a5a00 100%) !important;
        }

        :global(.venue-action-rail--primary .map-primary-action-button--fund) {
          color: #eaffff !important;
          border-color: rgba(125, 249, 255, 0.62) !important;
          background:
            radial-gradient(circle at 50% 0%, rgba(255, 255, 255, 0.48), transparent 36%),
            linear-gradient(180deg, #67e8f9 0%, #06b6d4 52%, #164e63 100%) !important;
        }

        :global(.venue-action-rail--primary .map-primary-action-button--pay) {
          color: #e9fff4 !important;
          border-color: rgba(52, 211, 153, 0.6) !important;
          background:
            radial-gradient(circle at 50% 0%, rgba(255, 255, 255, 0.42), transparent 36%),
            linear-gradient(180deg, #34d399 0%, #059669 52%, #064e3b 100%) !important;
        }

        :global(.venue-action-rail--primary .map-primary-action-button--venue) {
          color: #fff6ff !important;
          border-color: rgba(236, 189, 255, 0.62) !important;
          background:
            radial-gradient(circle at 50% 0%, rgba(255, 255, 255, 0.38), transparent 36%),
            linear-gradient(180deg, #c785ff 0%, #934fd7 52%, #4b1d78 100%) !important;
        }

        @media (max-width: 767px) {
          :global(.venue-action-rail--primary) {
            gap: 0.24rem !important;
          }

          :global(.venue-action-rail--primary .map-primary-action-button) {
            min-height: 48px !important;
            padding-right: 0.24rem !important;
            padding-left: 0.24rem !important;
            font-size: clamp(0.46rem, 2.05vw, 0.56rem) !important;
            letter-spacing: 0.01em !important;
          }

        }

        /* Two-tier venue action rail: one dominant primary, quiet utilities. */
        .venue-action-rail-stack--compact-dock {
          gap: 0.35rem;
        }

        .venue-status-strip {
          display: flex;
          flex-wrap: wrap;
          gap: 0.4rem;
        }

        .venue-status-chip {
          display: inline-flex;
          align-items: center;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.14);
          padding: 0.18rem 0.58rem;
          font-size: 0.58rem;
          font-weight: 800;
          line-height: 1;
          letter-spacing: 0.16em;
          text-transform: uppercase;
        }

        .venue-status-chip--verified {
          color: #f8dd72;
          border-color: rgba(245, 197, 24, 0.4);
          background: rgba(245, 197, 24, 0.12);
        }

        .venue-status-chip--presence {
          color: rgba(255, 255, 255, 0.66);
          border-color: rgba(255, 255, 255, 0.16);
          background: rgba(255, 255, 255, 0.05);
        }

        .venue-status-chip--live {
          color: #8bffc7;
          border-color: rgba(52, 211, 153, 0.42);
          background: rgba(16, 185, 129, 0.14);
        }

        .venue-status-chip--dormant {
          color: rgba(255, 255, 255, 0.5);
          border-color: rgba(255, 255, 255, 0.12);
          background: rgba(255, 255, 255, 0.035);
        }

        .venue-action-rail--lead :global(.map-primary-action-button) {
          min-height: 60px !important;
          font-size: clamp(0.72rem, 0.9vw, 0.88rem) !important;
          letter-spacing: 0.09em !important;
        }

        .venue-action-rail--lead :global(.map-primary-action-button--proof > span::before) {
          content: '✦';
          margin-right: 0.5rem;
          font-size: 0.9em;
        }

        .venue-action-rail--lead-duo {
          grid-template-columns: 1.55fr 1fr !important;
        }

        .venue-action-rail--utility :global(.map-primary-action-button) {
          min-height: 50px !important;
          font-size: clamp(0.55rem, 0.62vw, 0.62rem) !important;
          letter-spacing: 0.08em !important;
        }

        .venue-cta-hint {
          margin-top: 0.05rem;
          text-align: center;
          font-size: 0.68rem;
          line-height: 1.3;
          color: rgba(255, 255, 255, 0.5);
        }

        .venue-state-card {
          margin-top: 0.6rem;
        }

        .venue-state-card__label {
          display: inline-flex;
          align-items: center;
          gap: 0.45rem;
          font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
          font-size: 0.6rem;
          font-weight: 800;
          letter-spacing: 0.2em;
          text-transform: uppercase;
        }

        .venue-state-card__label::before {
          content: '';
          width: 6px;
          height: 6px;
          border-radius: 999px;
          background: currentColor;
          box-shadow: 0 0 10px currentColor;
        }

        .venue-state-card__headline {
          margin-top: 0.45rem;
          font-size: 0.98rem;
          font-weight: 800;
          line-height: 1.2;
          color: #ffffff;
          text-wrap: pretty;
        }

        .venue-state-card__support {
          margin-top: 0.25rem;
          font-size: 0.8rem;
          line-height: 1.35;
          color: rgba(255, 255, 255, 0.55);
        }

        .venue-state-card--presence .venue-state-card__label {
          color: #d8b6ff;
        }

        .venue-state-card--verified .venue-state-card__label {
          color: #f8dd72;
        }

        .venue-state-card--live .venue-state-card__label {
          color: #7fe9ff;
        }

        .venue-state-card--noproof .venue-state-card__label {
          color: rgba(255, 255, 255, 0.55);
        }

        .map-filter-pill {
          min-width: 0;
          max-width: 100%;
          min-height: 2.25rem;
          line-height: 1;
          white-space: nowrap;
        }

        .map-filter-pill > span {
          min-width: 0;
          line-height: 1;
        }

        .map-filter-pill > span:first-child {
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .venue-action-rail--primary {
          display: grid !important;
          width: 100% !important;
          max-width: 100% !important;
          grid-auto-rows: minmax(54px, auto);
          align-items: stretch !important;
          justify-items: stretch !important;
          gap: clamp(0.42rem, 0.78vw, 0.65rem) !important;
        }

        .venue-action-rail--primary.venue-action-rail--three,
        :global(.venue-action-rail--primary.venue-action-rail--three) {
          grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
        }

        .venue-action-rail--primary.venue-action-rail--four,
        :global(.venue-action-rail--primary.venue-action-rail--four) {
          grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
        }

        .venue-action-rail--primary.venue-action-rail--two,
        :global(.venue-action-rail--primary.venue-action-rail--two) {
          grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
        }

        :global(.venue-action-rail--primary .map-primary-action-button) {
          min-width: 0 !important;
          width: 100% !important;
          height: 100% !important;
          min-height: 54px !important;
          padding: 0.74rem clamp(0.45rem, 0.82vw, 0.82rem) 0.66rem !important;
          border-radius: 999px !important;
          white-space: nowrap !important;
        }

        :global(.venue-action-rail--primary .map-primary-action-button > span) {
          display: inline-flex !important;
          min-width: 0 !important;
          max-width: 100% !important;
          align-items: center !important;
          justify-content: center !important;
          overflow: visible !important;
          text-align: center !important;
          white-space: nowrap !important;
          font-size: clamp(0.58rem, 0.72vw, 0.7rem) !important;
          letter-spacing: 0.052em !important;
          line-height: 1 !important;
        }

        @media (max-width: 767px) {
          .map-signal-rail-scroll {
            scroll-padding-right: 1rem;
          }

          .map-filter-pill {
            min-height: 2.15rem;
            padding-right: 0.72rem;
            padding-left: 0.72rem;
            font-size: 10px;
            letter-spacing: 0.13em;
          }

          .venue-action-rail--primary {
            grid-auto-rows: minmax(50px, auto);
            gap: 0.34rem !important;
          }

          :global(.venue-action-rail--primary .map-primary-action-button) {
            min-height: 50px !important;
            padding: 0.68rem 0.36rem 0.6rem !important;
          }

          :global(.venue-action-rail--primary .map-primary-action-button > span) {
            font-size: clamp(0.52rem, 2.25vw, 0.64rem) !important;
            letter-spacing: 0.036em !important;
          }
        }

        @media (max-width: 430px) {
          .venue-action-rail--primary.venue-action-rail--three,
          :global(.venue-action-rail--primary.venue-action-rail--three) {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }

          .venue-action-rail--primary.venue-action-rail--four,
          :global(.venue-action-rail--primary.venue-action-rail--four) {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }

          :global(.venue-action-rail--primary .map-primary-action-button--venue) {
            grid-column: 1 / -1;
          }

          :global(.venue-action-rail--primary.venue-action-rail--four .map-primary-action-button--venue) {
            grid-column: auto !important;
          }

          :global(.venue-action-rail--primary .map-primary-action-button > span) {
            font-size: clamp(0.58rem, 3.3vw, 0.68rem) !important;
          }
        }

        .venue-action-rail--primary.venue-action-rail--one,
        :global(.venue-action-rail--primary.venue-action-rail--one) {
          grid-template-columns: minmax(0, 1fr) !important;
        }

        /* Fund-first activation state: the lone Fund button reads at lead tier. */
        .venue-action-rail--utility-solo :global(.map-primary-action-button) {
          min-height: 60px !important;
        }

        .venue-action-rail--utility-solo :global(.map-primary-action-button > span) {
          font-size: clamp(0.72rem, 0.95vw, 0.86rem) !important;
          letter-spacing: 0.09em !important;
        }

        @media (max-width: 767px) {
          .venue-action-rail--utility-solo :global(.map-primary-action-button) {
            min-height: 56px !important;
          }

          .venue-action-rail--utility-solo :global(.map-primary-action-button > span) {
            font-size: clamp(0.68rem, 3.1vw, 0.8rem) !important;
          }
        }

        @media (max-width: 480px) {
          .map-container-wrapper:not(.map-container-wrapper--immersive) {
            height: 64dvh !important;
            min-height: 420px !important;
          }

          .map-panel-shell,
          .venue-action-rail,
          .nearby-dare-tray,
          .map-signal-pill,
          :global(.map-action-button),
          :global(.map-primary-action-button) {
            backdrop-filter: none !important;
            -webkit-backdrop-filter: none !important;
          }

          .map-panel-shell,
          .map-panel-section,
          .map-mobile-secondary {
            content-visibility: auto;
            contain-intrinsic-size: 220px;
          }

          .map-panel-section,
          .map-mobile-secondary,
          .map-mobile-stats .stat-card {
            animation: none !important;
            will-change: auto !important;
          }

          .selected-place-panel-header {
            max-height: none;
          }

          .selected-place-panel-wrap--save-spot .selected-place-panel-header {
            max-height: min(24dvh, 9.75rem);
          }

          .selected-place-panel-stack--save-spot {
            max-height: min(90dvh, calc(100dvh - 0.5rem)) !important;
          }

          :global(.selected-place-panel-wrap--save-spot) :global(.map-save-spot-rail) {
            max-height: min(66dvh, calc(100dvh - 9.25rem));
          }

          .selected-place-panel-content {
            min-height: 0;
          }
        }

        .venue-action-rail--primary,
        :global(.venue-action-rail--primary) {
          display: grid !important;
          width: 100% !important;
          max-width: 100% !important;
          gap: 0.5rem !important;
          grid-auto-rows: minmax(3.45rem, auto) !important;
          align-items: stretch !important;
          justify-items: stretch !important;
          overflow: visible !important;
        }

        .venue-action-rail--primary.venue-action-rail--three,
        :global(.venue-action-rail--primary.venue-action-rail--three) {
          grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
        }

        .venue-action-rail--primary.venue-action-rail--four,
        :global(.venue-action-rail--primary.venue-action-rail--four) {
          grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
        }

        .venue-action-rail--primary.venue-action-rail--two,
        :global(.venue-action-rail--primary.venue-action-rail--two) {
          grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
        }

        :global(.venue-action-rail--primary .map-primary-action-button) {
          container-type: inline-size;
          width: 100% !important;
          max-width: 100% !important;
          min-width: 0 !important;
          height: 100% !important;
          min-height: 3.45rem !important;
          padding: 0.68rem 0.42rem 0.62rem !important;
          letter-spacing: 0 !important;
          overflow: hidden !important;
        }

        :global(.venue-action-rail--primary .map-primary-action-button > span) {
          display: inline-flex !important;
          width: 100% !important;
          min-width: 0 !important;
          max-width: 100% !important;
          align-items: center !important;
          justify-content: center !important;
          overflow: visible !important;
          text-overflow: clip !important;
          text-wrap: balance;
          white-space: normal !important;
          overflow-wrap: anywhere !important;
          font-size: clamp(0.52rem, 8cqw, 0.66rem) !important;
          letter-spacing: 0 !important;
          line-height: 1.02 !important;
        }

        @media (max-width: 520px) {
          .venue-action-rail--primary,
          :global(.venue-action-rail--primary) {
            gap: 0.42rem !important;
            grid-auto-rows: minmax(3.15rem, auto) !important;
          }

          .venue-action-rail--primary.venue-action-rail--three,
          :global(.venue-action-rail--primary.venue-action-rail--three) {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }

          .venue-action-rail--primary.venue-action-rail--four,
          :global(.venue-action-rail--primary.venue-action-rail--four) {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }

          :global(.venue-action-rail--primary .map-primary-action-button) {
            min-height: 3.15rem !important;
            padding: 0.58rem 0.34rem 0.52rem !important;
          }

          :global(.venue-action-rail--primary .map-primary-action-button--venue) {
            grid-column: 1 / -1;
          }

          :global(.venue-action-rail--primary.venue-action-rail--four .map-primary-action-button--venue) {
            grid-column: auto !important;
          }

          :global(.venue-action-rail--primary .map-primary-action-button > span) {
            font-size: clamp(0.5rem, 10cqw, 0.62rem) !important;
          }
        }

        @media (max-width: 350px) {
          .venue-action-rail--primary.venue-action-rail--three,
          .venue-action-rail--primary.venue-action-rail--four,
          .venue-action-rail--primary.venue-action-rail--two,
          :global(.venue-action-rail--primary.venue-action-rail--three),
          :global(.venue-action-rail--primary.venue-action-rail--four),
          :global(.venue-action-rail--primary.venue-action-rail--two) {
            grid-template-columns: 1fr !important;
          }

          :global(.venue-action-rail--primary .map-primary-action-button--venue) {
            grid-column: auto;
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

        @media (prefers-reduced-motion: reduce) {
          .map-panel-section,
          .basedare-maplibre-map :global(.maplibregl-marker),
          .basedare-maplibre-map :global(.basedare-maplibre-marker),
          .basedare-maplibre-map :global(.peebear-core),
          .basedare-maplibre-map :global(.peebear-ripple),
          .basedare-maplibre-map :global(.peebear-challenge-aura),
          .basedare-maplibre-map :global(.peebear-challenge-ring),
          .basedare-maplibre-map :global(.peebear-tonight-ring),
          .basedare-maplibre-map :global(.current-location-pulse),
          .basedare-maplibre-map :global(.current-location-bear) {
            animation: none !important;
            transition: none !important;
          }

          .basedare-maplibre-map :global(.peebear-ripple),
          .basedare-maplibre-map :global(.peebear-challenge-aura) {
            display: none !important;
          }
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
          --preset-atmosphere:
            radial-gradient(ellipse 55% 40% at 26% 14%, rgba(245, 197, 24, 0.12) 0%, transparent 58%),
            radial-gradient(ellipse 48% 44% at 72% 62%, rgba(168, 85, 247, 0.12) 0%, transparent 64%),
            radial-gradient(ellipse 40% 36% at 52% 36%, rgba(80, 50, 180, 0.09) 0%, transparent 68%),
            linear-gradient(180deg, rgba(8, 5, 22, 0.12) 0%, rgba(0, 0, 0, 0.14) 100%);
          --mesh-opacity: 0.1;
          --links-opacity: 0.14;
          --star-opacity: 0.08;
          --scan-opacity: 0.025;
          --haze-opacity: 0.34;
        }

        .basedare-maplibre-map[data-map-preset='crt'] {
          --preset-atmosphere:
            radial-gradient(ellipse 45% 38% at 24% 18%, rgba(184, 127, 255, 0.16) 0%, transparent 58%),
            radial-gradient(ellipse 34% 40% at 78% 72%, rgba(245, 197, 24, 0.1) 0%, transparent 62%),
            linear-gradient(180deg, rgba(255, 255, 255, 0.02) 0%, transparent 18%, rgba(255, 0, 128, 0.02) 100%);
          --mesh-opacity: 0.14;
          --links-opacity: 0.18;
          --star-opacity: 0.12;
          --scan-opacity: 0.1;
          --haze-opacity: 0.82;
        }

        .basedare-maplibre-map[data-map-preset='heat'] {
          --preset-atmosphere:
            radial-gradient(ellipse 48% 42% at 24% 18%, rgba(245, 197, 24, 0.18) 0%, transparent 58%),
            radial-gradient(ellipse 34% 40% at 78% 72%, rgba(251, 113, 133, 0.13) 0%, transparent 62%),
            radial-gradient(ellipse 28% 36% at 54% 44%, rgba(184, 127, 255, 0.1) 0%, transparent 66%);
          --mesh-opacity: 0.09;
          --links-opacity: 0.12;
          --star-opacity: 0.14;
          --scan-opacity: 0.04;
          --haze-opacity: 0.86;
        }

        .basedare-maplibre-map[data-map-preset='noir'] {
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
          opacity: 0.28;
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
            linear-gradient(180deg, rgba(255, 255, 255, 0.01) 0%, rgba(255, 255, 255, 0) 24%),
            radial-gradient(120% 100% at 50% 0%, rgba(245, 197, 24, 0.028) 0%, transparent 46%),
            radial-gradient(110% 100% at 50% 100%, rgba(168, 85, 247, 0.04) 0%, transparent 52%);
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
          font-family: inherit;
        }

        .basedare-maplibre-map :global(.maplibregl-map) {
          position: absolute;
          inset: 0;
          overflow: hidden;
          background: #050617;
        }

        .basedare-maplibre-map :global(.maplibregl-canvas-container) {
          background: rgba(3, 3, 10, 0.98);
        }

        .basedare-maplibre-map :global(.maplibregl-canvas) {
          display: block !important;
          visibility: visible !important;
          opacity: 1 !important;
          filter: none;
          background: #050617;
          image-rendering: auto !important;
          outline: none;
          will-change: auto !important;
        }

        .basedare-maplibre-map[data-crosshair='true'] :global(.maplibregl-map),
        .basedare-maplibre-map[data-crosshair='true'] :global(.maplibregl-canvas-container),
        .basedare-maplibre-map[data-crosshair='true'] :global(.maplibregl-canvas) {
          cursor: crosshair;
        }

        .basedare-maplibre-map[data-map-preset='noir'] :global(.maplibregl-canvas) {
          filter: none;
        }

        .maplibre-depth-vignette {
          background:
            radial-gradient(ellipse 78% 60% at 50% 36%, transparent 0%, rgba(6, 4, 18, 0.1) 58%, rgba(0, 0, 0, 0.42) 100%),
            linear-gradient(180deg, rgba(28, 10, 55, 0.1) 0%, transparent 24%, rgba(0, 0, 0, 0.16) 100%);
        }

        .basedare-maplibre-map :global(.maplibregl-marker) {
          z-index: 8;
          pointer-events: auto;
          will-change: transform;
        }

        .basedare-maplibre-map :global(.basedare-maplibre-marker) {
          border: 0;
          background: transparent;
          cursor: pointer;
          pointer-events: auto;
          transform-origin: 50% 100%;
          transition: filter 180ms ease;
          user-select: none;
          -webkit-user-select: none;
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

        @media (min-width: 768px) {
          /*
           * Desktop Chrome is sensitive to stacking a large WebGL backing store,
           * DOM markers, and backdrop overlays in the same frame. Keep the map
           * paint-contained and opaque, then quiet decorative overlays while the
           * camera is moving.
           */
          .map-canvas-host {
            isolation: isolate !important;
            contain: layout paint style !important;
            background: #050617 !important;
          }

          .basedare-maplibre-map :global(.maplibregl-canvas-container) {
            contain: paint !important;
            background: #050617 !important;
          }

          .basedare-maplibre-map :global(.maplibregl-canvas) {
            backface-visibility: hidden !important;
            contain: paint !important;
            will-change: auto !important;
          }

          .basedare-maplibre-map .maplibre-depth-vignette,
          .basedare-maplibre-map .preset-atmosphere,
          .basedare-maplibre-map .starfield,
          .basedare-maplibre-map .scanlines,
          .basedare-maplibre-map .glass-haze {
            display: none !important;
          }

          .basedare-maplibre-map[data-map-moving='true'] [data-map-crosshair='true'],
          .basedare-maplibre-map[data-map-moving='true'] .map-engine-badge,
          .basedare-maplibre-map[data-map-moving='true'] .map-activation-legend {
            opacity: 0 !important;
            transition: none !important;
          }

          .basedare-maplibre-map[data-map-moving='true'] :global(.peebear-tonight-ring) {
            animation-play-state: paused !important;
            box-shadow: none !important;
          }

          .basedare-maplibre-map[data-map-moving='true'] :global(.peebear-venue-label),
          .basedare-maplibre-map[data-map-moving='true'] :global(.peebear-pulse-pill),
          .basedare-maplibre-map[data-map-moving='true'] :global(.peebear-tonight-pill),
          .basedare-maplibre-map[data-map-moving='true'] :global(.peebear-count),
          .basedare-maplibre-map[data-map-moving='true'] :global(.peebear-state),
          .basedare-maplibre-map[data-map-moving='true'] :global(.venue-legend-chip),
          .basedare-maplibre-map[data-map-moving='true'] :global(.place-cluster-match),
          .basedare-maplibre-map[data-map-moving='true'] :global(.place-cluster-live) {
            opacity: 0 !important;
            backdrop-filter: none !important;
            -webkit-backdrop-filter: none !important;
            box-shadow: none !important;
            filter: none !important;
            transition: none !important;
            will-change: auto !important;
          }
        }

        .basedare-maplibre-map :global(.maplibregl-control-container) {
          position: relative;
          z-index: 9;
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

        /* Pixel place objects are the default marker language. Adventure mode
           adds discovery signals; it never swaps out or hides real places. */
        .adventure-map-atmosphere {
          opacity: 0;
          background:
            radial-gradient(circle at 18% 22%, rgba(34, 211, 238, 0.1), transparent 23%),
            radial-gradient(circle at 78% 68%, rgba(139, 92, 246, 0.11), transparent 27%),
            repeating-linear-gradient(0deg, rgba(255, 255, 255, 0.018) 0 1px, transparent 1px 4px),
            repeating-linear-gradient(90deg, rgba(255, 255, 255, 0.012) 0 1px, transparent 1px 4px);
          mix-blend-mode: screen;
          transition: opacity 280ms ease;
        }

        .basedare-maplibre-map[data-adventure-mode='true'] .adventure-map-atmosphere {
          opacity: 0.82;
        }

        .basedare-maplibre-map[data-attention-guide='true'] .map-activation-legend,
        .basedare-maplibre-map[data-attention-guide='true'] .map-first-proof-dock,
        .basedare-maplibre-map[data-attention-guide='true'] .nearby-dare-tray,
        .basedare-maplibre-map[data-attention-guide='true'] .map-meetup-layer-controls {
          display: none;
        }

        @media (max-width: 639px) {
          .basedare-maplibre-map :global(.map-attention-choice .adventure-sprite) {
            margin: -7px;
            transform: scale(0.78);
          }
        }

        .basedare-maplibre-map[data-adventure-mode='true'] .adventure-map-atmosphere::after {
          content: '';
          position: absolute;
          inset: 0;
          background:
            linear-gradient(135deg, transparent 0 46%, rgba(245, 197, 24, 0.035) 46% 47%, transparent 47% 100%),
            radial-gradient(circle at 50% 50%, transparent 28%, rgba(5, 7, 14, 0.22) 100%);
          background-size: 34px 34px, auto;
          image-rendering: pixelated;
        }

        .basedare-maplibre-map:not([data-attention-intent='unset'])
          :global(.basedare-maplibre-marker--venue) {
          opacity: 0.58;
          filter: saturate(0.72);
          transition: opacity 180ms ease, filter 180ms ease;
        }

        .basedare-maplibre-map:not([data-attention-intent='unset'])
          :global(.basedare-maplibre-marker--attention-pick),
        .basedare-maplibre-map:not([data-attention-intent='unset'])
          :global(.basedare-maplibre-marker--selected) {
          z-index: 8 !important;
          opacity: 1;
          filter: saturate(1.08);
        }

        .basedare-maplibre-map :global(.basedare-maplibre-marker--attention-pick .adventure-place-object) {
          filter: drop-shadow(0 0 12px rgba(245, 197, 24, 0.48));
        }

        .basedare-maplibre-map :global(.basedare-maplibre-marker--attention-pick .peebear-venue-label) {
          border-color: rgba(245, 197, 24, 0.34);
          color: rgba(255, 245, 190, 0.94);
        }

        .basedare-maplibre-map :global(.adventure-guide-head) {
          display: none;
        }

        .basedare-maplibre-map :global(.peebear-core),
        .basedare-maplibre-map :global(.peebear-meta),
        .basedare-maplibre-map :global(.peebear-count),
        .basedare-maplibre-map :global(.venue-legend-stack),
        .basedare-maplibre-map :global(.peebear-ripple),
        .basedare-maplibre-map :global(.peebear-challenge-aura),
        .basedare-maplibre-map :global(.peebear-challenge-ring),
        .basedare-maplibre-map :global(.peebear-match-badge),
        .basedare-maplibre-map :global(.peebear-shadow) {
          display: none !important;
        }

        .basedare-maplibre-map :global(.peebear-marker) {
          width: 82px;
          height: 112px;
          opacity: 1;
        }

        .basedare-maplibre-map :global(.peebear-marker.is-compact) {
          width: 70px;
          height: 94px;
        }

        .basedare-maplibre-map :global(.peebear-venue-label) {
          top: 3px;
          max-width: 126px;
          opacity: 0;
          visibility: hidden;
          transition: none;
        }

        .basedare-maplibre-map :global(.peebear-marker.is-active .peebear-venue-label),
        .basedare-maplibre-map :global(.peebear-marker.has-challenge-live .peebear-venue-label),
        .basedare-maplibre-map :global(.peebear-marker.is-live-tonight .peebear-venue-label) {
          opacity: 1;
          visibility: visible;
        }

        .basedare-maplibre-map :global(.peebear-marker.is-activated-venue .peebear-venue-label) {
          top: -2px;
          min-width: 0;
          max-width: 138px;
          border-radius: 9999px;
          padding: 5px 9px;
          font-size: 8px;
          transform: translateX(-50%);
          animation: none;
        }

        .basedare-maplibre-map :global(.peebear-marker.is-activated-venue .peebear-venue-label::after),
        .basedare-maplibre-map :global(.peebear-marker.is-activated-venue .peebear-venue-label::before) {
          display: none;
        }

        .basedare-maplibre-map :global(.adventure-place-object) {
          position: absolute;
          left: 50%;
          bottom: 15px;
          z-index: 9;
          display: grid;
          width: 72px;
          height: 76px;
          place-items: center;
          transform: translateX(-50%) translateY(-7px);
          transform-origin: 50% 100%;
          border: 0;
          background: transparent;
          box-shadow: none;
          filter: drop-shadow(0 12px 10px rgba(0, 0, 0, 0.52)) drop-shadow(0 0 8px rgba(95, 230, 255, 0.14));
          animation: adventureObjectHover 3.2s ease-in-out infinite;
          isolation: auto;
        }

        .basedare-maplibre-map :global(.adventure-place-object::before) {
          content: '';
          position: absolute;
          left: 50%;
          bottom: -3px;
          z-index: 0;
          width: 34px;
          height: 8px;
          transform: translateX(-50%);
          border-radius: 9999px;
          border: 1px solid rgba(95, 230, 255, 0.3);
          background: radial-gradient(ellipse, rgba(34, 211, 238, 0.23), rgba(1, 3, 9, 0.48) 58%, transparent 72%);
          box-shadow: 0 0 11px rgba(34, 211, 238, 0.2);
          filter: blur(0.3px);
        }

        .basedare-maplibre-map :global(.adventure-place-object::after) {
          content: '';
          position: absolute;
          left: 50%;
          bottom: 3px;
          z-index: 0;
          width: 1px;
          height: 17px;
          transform: translateX(-50%);
          background: linear-gradient(180deg, transparent, rgba(95, 230, 255, 0.46));
          box-shadow: 0 0 7px rgba(34, 211, 238, 0.34);
        }

        .basedare-maplibre-map :global(.adventure-sprite) {
          position: relative;
          z-index: 2;
          display: block;
          width: 64px;
          height: 64px;
          flex: 0 0 64px;
          background-image: url('/assets/map/adventure-sprites-v1.png');
          background-repeat: no-repeat;
          background-size: 384px 256px;
          image-rendering: auto;
          mix-blend-mode: screen;
          filter: saturate(1.12) contrast(1.04) drop-shadow(0 8px 7px rgba(0, 0, 0, 0.52)) drop-shadow(0 0 5px rgba(255, 224, 114, 0.2));
        }

        .basedare-maplibre-map :global(.adventure-place-object .adventure-sprite),
        .basedare-maplibre-map :global(.adventure-focal-marker .adventure-sprite) {
          transform: translateY(-7px) scale(1.12);
        }

        .basedare-maplibre-map :global(.adventure-sprite--flag) {
          background-position: -38px -180px;
          clip-path: polygon(10% 2%, 76% 2%, 94% 24%, 82% 72%, 65% 80%, 63% 100%, 39% 100%, 39% 82%, 13% 78%);
        }

        .basedare-maplibre-map :global(.adventure-sprite--surf) {
          background-position: -100px -180px;
          clip-path: polygon(25% 0, 70% 0, 88% 14%, 96% 46%, 87% 72%, 68% 100%, 11% 100%, 3% 72%, 13% 45%);
        }

        .basedare-maplibre-map :global(.adventure-sprite--cafe) {
          background-position: -160px -180px;
          clip-path: polygon(23% 8%, 64% 8%, 71% 25%, 91% 28%, 96% 45%, 90% 66%, 71% 73%, 62% 91%, 18% 91%, 7% 71%, 8% 34%);
        }

        .basedare-maplibre-map :global(.adventure-sprite--gathering) {
          background-position: -229px -180px;
          clip-path: polygon(36% 0, 62% 0, 74% 18%, 94% 64%, 88% 86%, 68% 100%, 25% 100%, 7% 86%, 4% 62%, 27% 18%);
        }

        .basedare-maplibre-map :global(.adventure-sprite--rumor) {
          background-position: -294px -180px;
          clip-path: polygon(35% 0, 66% 0, 88% 13%, 100% 37%, 95% 72%, 76% 94%, 48% 100%, 17% 91%, 1% 67%, 4% 30%, 17% 10%);
        }

        .basedare-maplibre-map :global(.adventure-sprite--bear) {
          width: 74px;
          height: 74px;
          flex-basis: 74px;
          background-size: 276px 184px;
          background-position: -101px -4px;
          clip-path: polygon(18% 3%, 82% 3%, 100% 27%, 96% 72%, 78% 96%, 50% 100%, 21% 95%, 3% 72%, 0 27%);
        }

        .basedare-maplibre-map :global(.adventure-sprite--bear-mini) {
          width: 30px;
          height: 30px;
          flex-basis: 30px;
          background-size: 108px 72px;
          background-position: -39px -1px;
          clip-path: polygon(18% 3%, 82% 3%, 100% 27%, 96% 72%, 78% 96%, 50% 100%, 21% 95%, 3% 72%, 0 27%);
          filter: drop-shadow(0 3px 5px rgba(0, 0, 0, 0.4));
        }

        .basedare-maplibre-map :global(.adventure-sprite--rumor-mini) {
          width: 28px;
          height: 28px;
          flex-basis: 28px;
          background-size: 168px 112px;
          background-position: -128px -79px;
          clip-path: polygon(35% 0, 66% 0, 88% 13%, 100% 37%, 95% 72%, 76% 94%, 48% 100%, 17% 91%, 1% 67%, 4% 30%, 17% 10%);
        }

        .basedare-maplibre-map :global(.adventure-place-modifier) {
          position: absolute;
          right: -9px;
          top: -8px;
          z-index: 4;
          display: inline-flex;
          min-width: 22px;
          height: 22px;
          align-items: center;
          justify-content: center;
          border: 2px solid rgba(5, 6, 12, 0.96);
          border-radius: 9999px;
          background: #34d399;
          padding: 0 6px;
          color: #03140d;
          font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
          font-size: 10px;
          font-weight: 950;
          line-height: 1;
          box-shadow: 0 7px 14px rgba(0, 0, 0, 0.36);
        }

        .basedare-maplibre-map :global(.adventure-place-object--unmarked) {
          filter: saturate(0.76) brightness(0.9) drop-shadow(0 0 10px rgba(184, 127, 255, 0.34));
        }

        .basedare-maplibre-map :global(.adventure-place-object--unmarked .adventure-place-modifier) {
          border-color: rgba(8, 6, 17, 0.96);
          background: #6d45a8;
          color: #f1e7ff;
        }

        .basedare-maplibre-map :global(.adventure-place-object.has-live-dare) {
          filter: drop-shadow(0 14px 11px rgba(0, 0, 0, 0.54)) drop-shadow(0 0 13px rgba(245, 197, 24, 0.5));
        }

        .basedare-maplibre-map :global(.adventure-place-object.has-live-dare .adventure-sprite) {
          filter: saturate(1.18) contrast(1.06) drop-shadow(0 9px 8px rgba(0, 0, 0, 0.54)) drop-shadow(0 0 8px rgba(255, 222, 98, 0.4));
        }

        .basedare-maplibre-map :global(.adventure-place-object.has-live-dare .adventure-place-modifier) {
          right: -16px;
          min-width: 34px;
          border-color: rgba(19, 12, 0, 0.94);
          background: #0b0d16;
          color: #fff0a8;
          font-size: 8px;
          letter-spacing: 0.08em;
        }

        .basedare-maplibre-map :global(.peebear-marker.is-active .adventure-place-object) {
          transform: translateX(-50%) translateY(-12px) scale(1.14);
          filter: drop-shadow(0 16px 12px rgba(0, 0, 0, 0.56)) drop-shadow(0 0 14px rgba(255, 240, 168, 0.5));
        }

        @keyframes adventureObjectHover {
          0%, 100% { translate: 0 0; }
          50% { translate: 0 -4px; }
        }

        .basedare-maplibre-map[data-adventure-mode='true'] :global(.current-location-bear) {
          display: none;
        }

        .basedare-maplibre-map[data-adventure-mode='true'] :global(.adventure-guide-head) {
          position: absolute;
          left: 35px;
          bottom: 23px;
          z-index: 4;
          display: none;
          width: 54px;
          height: 54px;
          place-items: center;
          border-radius: 19px;
          border: 1px solid rgba(245, 197, 24, 0.36);
          background:
            radial-gradient(circle at 28% 16%, rgba(255, 255, 255, 0.18), transparent 44%),
            linear-gradient(145deg, rgba(31, 24, 10, 0.94), rgba(7, 8, 16, 0.97));
          box-shadow:
            0 14px 25px rgba(0, 0, 0, 0.48),
            0 0 22px rgba(245, 197, 24, 0.2),
            inset 0 1px 0 rgba(255, 255, 255, 0.14);
        }

        .basedare-maplibre-map[data-adventure-mode='true'] :global(.adventure-guide-head img) {
          width: 49px;
          height: 49px;
          object-fit: contain;
          filter: drop-shadow(0 4px 7px rgba(0, 0, 0, 0.38));
        }

        .basedare-maplibre-map[data-adventure-mode='true'] :global(.adventure-guide-spark) {
          position: absolute;
          right: -5px;
          top: -5px;
          width: 12px;
          height: 12px;
          border: 2px solid rgba(4, 7, 13, 0.96);
          border-radius: 3px;
          background: #22d3ee;
          box-shadow: 0 0 14px rgba(34, 211, 238, 0.52);
          transform: rotate(12deg);
        }

        .basedare-maplibre-map :global(.adventure-guide-orb) {
          position: relative;
          display: grid;
          width: 78px;
          height: 78px;
          place-items: center;
          overflow: visible;
          border: 0;
          border-radius: 0;
          background: transparent;
          box-shadow: none;
          filter: drop-shadow(0 14px 10px rgba(0, 0, 0, 0.58)) drop-shadow(0 0 13px rgba(245, 197, 24, 0.34));
        }

        .basedare-maplibre-map :global(.adventure-guide-face) {
          display: block;
          width: 96px;
          height: 72px;
          max-width: none;
          object-fit: contain;
          user-select: none;
          -webkit-user-drag: none;
        }

        .basedare-maplibre-map :global(.adventure-guide-mini) {
          display: block;
          width: 32px;
          height: 24px;
          max-width: none;
          object-fit: contain;
          user-select: none;
          -webkit-user-drag: none;
        }

        @media (max-width: 639px) {
          .basedare-maplibre-map :global(.adventure-guide-orb) {
            width: 70px;
            height: 58px;
          }

          .basedare-maplibre-map :global(.adventure-guide-face) {
            width: 82px;
            height: 56px;
          }
        }

        .basedare-maplibre-map :global(.adventure-guide-orb__spark) {
          position: absolute;
          right: 4px;
          top: 4px;
          width: 12px;
          height: 12px;
          border: 2px solid rgba(4, 7, 13, 0.96);
          border-radius: 3px;
          background: #22d3ee;
          box-shadow: 0 0 14px rgba(34, 211, 238, 0.5);
          transform: rotate(12deg);
        }

        .basedare-maplibre-map :global(.adventure-rumor-marker) {
          position: relative;
          display: grid;
          width: 82px;
          height: 92px;
          place-items: center;
          transform: translateY(-5px);
        }

        .basedare-maplibre-map :global(.adventure-rumor-fog) {
          position: absolute;
          inset: 5px;
          border: 2px dotted rgba(196, 157, 255, 0.58);
          border-radius: 9999px;
          background: radial-gradient(circle, rgba(139, 92, 246, 0.16), transparent 66%);
          box-shadow: 0 0 28px rgba(139, 92, 246, 0.2);
          animation: adventureRumorTurn 9s linear infinite;
        }

        .basedare-maplibre-map :global(.adventure-rumor-label) {
          position: absolute;
          bottom: -1px;
          left: 50%;
          z-index: 4;
          transform: translateX(-50%);
          border: 1px solid rgba(196, 157, 255, 0.28);
          border-radius: 9999px;
          background: rgba(13, 8, 27, 0.94);
          padding: 4px 7px;
          color: rgba(235, 221, 255, 0.86);
          font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
          font-size: 7px;
          font-weight: 950;
          letter-spacing: 0.18em;
          line-height: 1;
        }

        @keyframes adventureRumorTurn {
          to {
            transform: rotate(360deg);
          }
        }

        .basedare-maplibre-map[data-adventure-mode='true']
          :global(.peebear-marker--blazing .adventure-place-object) {
          border-color: rgba(255, 111, 142, 0.76);
          box-shadow:
            0 0 0 5px rgba(255, 60, 104, 0.1),
            0 0 34px rgba(255, 60, 104, 0.28),
            0 16px 26px rgba(0, 0, 0, 0.5),
            inset 0 1px 0 rgba(255, 255, 255, 0.22);
        }

        .basedare-maplibre-map[data-adventure-mode='true']
          :global(.peebear-marker--igniting .adventure-place-object) {
          border-color: rgba(34, 211, 238, 0.72);
          box-shadow:
            0 0 0 5px rgba(34, 211, 238, 0.09),
            0 0 30px rgba(34, 211, 238, 0.24),
            0 16px 26px rgba(0, 0, 0, 0.48),
            inset 0 1px 0 rgba(255, 255, 255, 0.2);
        }

        .basedare-maplibre-map[data-adventure-mode='true']
          :global(.peebear-marker--simmering .adventure-place-object) {
          border-color: rgba(245, 197, 24, 0.7);
          box-shadow:
            0 0 0 4px rgba(245, 197, 24, 0.08),
            0 0 26px rgba(245, 197, 24, 0.2),
            0 15px 24px rgba(0, 0, 0, 0.46),
            inset 0 1px 0 rgba(255, 255, 255, 0.18);
        }

        .basedare-maplibre-map :global(.adventure-focal-marker) {
          position: relative;
          display: grid;
          width: 72px;
          height: 76px;
          place-items: center;
          transform: translateY(-8px);
        }

        .basedare-maplibre-map :global(.adventure-focal-beacon) {
          position: relative;
          z-index: 3;
          display: grid;
          width: 54px;
          height: 54px;
          flex: 0 0 54px;
          place-items: center;
          border: 1px solid rgba(255, 240, 168, 0.84);
          border-radius: 19px;
          background:
            radial-gradient(circle at 30% 18%, rgba(255, 255, 255, 0.5), transparent 38%),
            linear-gradient(145deg, #ffd83d, #805000);
          color: #171103;
          font-family: system-ui, sans-serif;
          font-size: 31px;
          line-height: 1;
          text-shadow: 0 1px 0 rgba(255, 255, 255, 0.36);
          box-shadow:
            0 14px 24px rgba(0, 0, 0, 0.48),
            0 0 0 4px rgba(245, 197, 24, 0.12),
            0 0 28px rgba(245, 197, 24, 0.3),
            inset 0 1px 0 rgba(255, 255, 255, 0.58),
            inset 0 -11px 16px rgba(81, 43, 0, 0.34);
        }

        .basedare-maplibre-map :global(.adventure-focal-marker--meetup .adventure-focal-beacon) {
          border-color: rgba(167, 243, 208, 0.72);
          background:
            radial-gradient(circle at 30% 18%, rgba(255, 255, 255, 0.36), transparent 38%),
            linear-gradient(145deg, #34d399, #064e3b);
          color: #ecfdf5;
          box-shadow:
            0 14px 24px rgba(0, 0, 0, 0.46),
            0 0 0 4px rgba(52, 211, 153, 0.1),
            0 0 26px rgba(52, 211, 153, 0.24),
            inset 0 1px 0 rgba(255, 255, 255, 0.36),
          inset 0 -11px 16px rgba(0, 50, 35, 0.3);
        }

        .basedare-maplibre-map :global(.adventure-focal-badge) {
          position: absolute;
          right: 0;
          top: 0;
          z-index: 5;
          display: inline-flex;
          min-width: 24px;
          height: 22px;
          align-items: center;
          justify-content: center;
          border: 2px solid rgba(18, 12, 1, 0.96);
          border-radius: 9999px;
          background: #0b0d16;
          padding: 0 6px;
          color: #fff0a8;
          font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
          font-size: 9px;
          font-weight: 950;
          line-height: 1;
          box-shadow: 0 8px 15px rgba(0, 0, 0, 0.38);
        }

        .basedare-maplibre-map :global(.adventure-focal-marker--meetup .adventure-focal-badge) {
          color: #a7f3d0;
        }

        .basedare-maplibre-map :global(.adventure-focal-shadow) {
          position: absolute;
          bottom: 3px;
          left: 10px;
          width: 52px;
          height: 10px;
          border-radius: 9999px;
          background: rgba(1, 3, 8, 0.76);
          filter: blur(4px);
        }

        .basedare-maplibre-map[data-map-moving='true'] :global(.adventure-place-object),
        .basedare-maplibre-map[data-map-moving='true'] :global(.adventure-guide-head),
        .basedare-maplibre-map[data-map-moving='true'] :global(.adventure-focal-marker) {
          filter: none !important;
          transition: none !important;
        }

        @media (prefers-reduced-motion: reduce) {
          .basedare-maplibre-map :global(.adventure-place-object),
          .basedare-maplibre-map :global(.adventure-guide-head),
          .basedare-maplibre-map :global(.adventure-focal-marker) {
            animation: none !important;
            transition: none !important;
          }
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
          height: 170px;
        }

        .basedare-maplibre-map :global(.peebear-marker.is-activated-venue.is-compact) {
          height: 140px;
        }

        .basedare-maplibre-map :global(.peebear-venue-label) {
          position: absolute;
          left: 50%;
          top: -24px;
          z-index: 12;
          display: inline-flex;
          min-width: 0;
          max-width: 138px;
          align-items: center;
          justify-content: center;
          transform: translateX(-50%);
          overflow: hidden;
          border-radius: 9999px;
          border: 1px solid rgba(255, 255, 255, 0.16);
          background:
            radial-gradient(circle at 50% 0%, rgba(255, 255, 255, 0.16), transparent 44%),
            linear-gradient(180deg, rgba(10, 12, 22, 0.94), rgba(4, 5, 12, 0.92));
          padding: 4px 9px;
          color: rgba(255, 255, 255, 0.9);
          font-size: 8px;
          font-weight: 900;
          letter-spacing: 0.1em;
          line-height: 1;
          text-align: center;
          text-overflow: ellipsis;
          text-transform: uppercase;
          white-space: nowrap;
          box-shadow:
            0 12px 20px rgba(0, 0, 0, 0.34),
            0 0 16px rgba(34, 211, 238, 0.12),
            inset 0 1px 0 rgba(255, 255, 255, 0.1);
          pointer-events: none;
          backdrop-filter: blur(12px);
        }

        .basedare-maplibre-map :global(.peebear-venue-label-name) {
          display: block;
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .basedare-maplibre-map :global(.peebear-venue-label-kicker) {
          display: block;
          font-size: 5.5px;
          font-weight: 950;
          letter-spacing: 0.28em;
          line-height: 1;
          color: rgba(56, 34, 0, 0.7);
        }

        .basedare-maplibre-map :global(.peebear-marker.is-active .peebear-venue-label) {
          border-color: rgba(245, 197, 24, 0.42);
          color: #fff4be;
          box-shadow:
            0 14px 24px rgba(0, 0, 0, 0.38),
            0 0 20px rgba(245, 197, 24, 0.16),
            inset 0 1px 0 rgba(255, 255, 255, 0.12);
        }

        .basedare-maplibre-map :global(.peebear-marker.is-activated-venue .peebear-venue-label) {
          top: -14px;
          z-index: 18;
          min-width: 122px;
          max-width: 204px;
          overflow: visible;
          border-radius: 12px 12px 8px 8px;
          border-color: rgba(255, 244, 190, 0.78);
          background:
            radial-gradient(circle at 50% 0%, rgba(255, 255, 255, 0.72), transparent 40%),
            linear-gradient(100deg, transparent 30%, rgba(255, 255, 255, 0.5) 42%, rgba(255, 255, 255, 0.08) 54%, transparent 62%),
            linear-gradient(180deg, rgba(255, 246, 183, 0.98), rgba(245, 197, 24, 0.98) 46%, rgba(148, 92, 12, 0.98) 100%);
          background-size: 100% 100%, 240% 100%, 100% 100%;
          background-position: 0 0, -160% 0, 0 0;
          background-repeat: no-repeat;
          animation: venueSignShine 4.6s ease-in-out infinite;
          padding: 9px 14px 10px;
          color: rgba(22, 14, 0, 0.96);
          font-size: 11px;
          letter-spacing: 0.12em;
          line-height: 1.05;
          text-shadow:
            0 1px 0 rgba(255, 255, 255, 0.42),
            0 2px 8px rgba(255, 248, 196, 0.28);
          transform: translateX(-50%) perspective(170px) rotateX(17deg);
          transform-origin: center bottom;
          box-shadow:
            0 2px 0 rgba(126, 78, 8, 0.95),
            0 4px 0 rgba(92, 55, 5, 0.9),
            0 6px 1px rgba(56, 33, 3, 0.85),
            0 18px 26px rgba(0, 0, 0, 0.46),
            0 0 30px rgba(245, 197, 24, 0.34),
            inset 0 1px 0 rgba(255, 255, 255, 0.8),
            inset 0 -9px 12px rgba(64, 37, 0, 0.28);
          backdrop-filter: blur(8px);
        }

        .basedare-maplibre-map :global(.peebear-marker.is-activated-venue .peebear-venue-label::before) {
          content: '';
          position: absolute;
          inset: 1px 8px auto;
          height: 1px;
          border-radius: 9999px;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.74), transparent);
          pointer-events: none;
        }

        .basedare-maplibre-map :global(.peebear-marker.is-activated-venue .peebear-venue-label::after) {
          content: '';
          position: absolute;
          left: 12px;
          right: 12px;
          bottom: -8px;
          height: 8px;
          border-radius: 0 0 9999px 9999px;
          background: linear-gradient(90deg, rgba(68, 38, 0, 0.12), rgba(248, 221, 114, 0.78), rgba(68, 38, 0, 0.12));
          transform: perspective(46px) rotateX(62deg);
          transform-origin: center top;
          pointer-events: none;
        }

        @keyframes venueSignShine {
          0%,
          58% {
            background-position: 0 0, -160% 0, 0 0;
          }
          82%,
          100% {
            background-position: 0 0, 260% 0, 0 0;
          }
        }

        .basedare-maplibre-map :global(.peebear-marker.is-compact .peebear-venue-label) {
          top: -20px;
          max-width: 118px;
          padding: 3px 7px;
          font-size: 7px;
          letter-spacing: 0.08em;
        }

        .basedare-maplibre-map :global(.peebear-marker.is-activated-venue.is-compact .peebear-venue-label) {
          top: -8px;
          min-width: 104px;
          max-width: 168px;
          padding: 7px 11px 8px;
          font-size: 9px;
          letter-spacing: 0.08em;
        }

        .basedare-maplibre-map :global(.peebear-marker.is-activated-venue.is-compact .peebear-venue-label-kicker) {
          display: none;
        }

        .basedare-maplibre-map :global(.peebear-mayor) {
          display: inline-flex;
          align-items: center;
          gap: 2px;
          border-radius: 9999px;
          border: 1px solid rgba(245, 197, 24, 0.55);
          background: linear-gradient(180deg, rgba(245, 197, 24, 0.26), rgba(90, 60, 4, 0.6));
          padding: 2px 7px;
          font-size: 8px;
          font-weight: 900;
          letter-spacing: 0.08em;
          color: #ffe9a8;
          text-shadow: 0 1px 0 rgba(0, 0, 0, 0.4);
          box-shadow:
            0 6px 12px rgba(0, 0, 0, 0.3),
            0 0 12px rgba(245, 197, 24, 0.22),
            inset 0 1px 0 rgba(255, 255, 255, 0.25);
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
          margin-top: 62px;
          border-color: rgba(248, 221, 114, 0.82);
          background:
            radial-gradient(circle at 38% 28%, rgba(255, 255, 255, 0.18) 0%, transparent 54%),
            radial-gradient(circle at 62% 86%, rgba(245, 197, 24, 0.18) 0%, transparent 48%),
            linear-gradient(180deg, rgba(41, 27, 8, 0.98), rgba(14, 10, 22, 0.99));
          box-shadow:
            0 0 0 3px rgba(245, 197, 24, 0.15),
            0 0 24px rgba(245, 197, 24, 0.26),
            0 0 34px rgba(184, 127, 255, 0.12),
            0 16px 28px rgba(0, 0, 0, 0.46),
            inset 0 1px 0 rgba(255, 255, 255, 0.12),
            inset 0 -12px 16px rgba(0, 0, 0, 0.26);
        }

        .basedare-maplibre-map :global(.peebear-marker.is-activated-venue.is-compact .peebear-core) {
          margin-top: 56px;
          height: 50px;
          width: 50px;
        }

        .basedare-maplibre-map :global(.peebear-marker.is-activated-venue .peebear-count) {
          left: auto;
          right: 2px;
          top: 42px;
          z-index: 7;
          transform: scale(0.84);
        }

        .basedare-maplibre-map :global(.peebear-marker.is-activated-venue.is-compact .peebear-count) {
          right: -4px;
          top: 32px;
          transform: scale(0.74);
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

        /* Tonight's venue per the General Luna weekly rotation: a slow dashed
           gold orbit — deliberately distinct from the solid challenge ring
           (live money). Rotation is transform-only so it stays on the
           compositor; paused during gestures via the data-map-moving rules. */
        .basedare-maplibre-map :global(.peebear-tonight-ring) {
          position: absolute;
          top: -1px;
          left: 50%;
          z-index: 0;
          width: 92px;
          height: 92px;
          margin-left: -46px;
          border-radius: 9999px;
          border: 2px dashed rgba(255, 214, 92, 0.62);
          box-shadow:
            0 0 18px rgba(245, 197, 24, 0.2),
            inset 0 0 16px rgba(245, 197, 24, 0.08);
          pointer-events: none;
          animation: peebearTonightOrbit 16s linear infinite;
        }

        .basedare-maplibre-map :global(.peebear-tonight-pill) {
          position: absolute;
          left: -6px;
          top: 10px;
          z-index: 4;
          border-radius: 9999px;
          border: 1px solid rgba(255, 214, 92, 0.4);
          background:
            linear-gradient(180deg, rgba(255, 233, 157, 0.22), rgba(245, 197, 24, 0.16)),
            linear-gradient(180deg, rgba(60, 38, 8, 0.97), rgba(24, 15, 5, 0.97));
          padding: 3px 8px;
          font-size: 7px;
          font-weight: 900;
          line-height: 1;
          letter-spacing: 0.17em;
          color: rgba(255, 243, 200, 0.98);
          box-shadow:
            0 10px 18px rgba(0, 0, 0, 0.28),
            0 0 18px rgba(245, 197, 24, 0.2),
            inset 0 1px 0 rgba(255, 255, 255, 0.1);
          white-space: nowrap;
        }

        @keyframes peebearTonightOrbit {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        .basedare-maplibre-map :global(.peebear-review-aura) {
          position: absolute;
          left: 50%;
          top: 10px;
          z-index: 0;
          width: 72px;
          height: 72px;
          transform: translateX(-50%);
          border-radius: 9999px;
          background:
            radial-gradient(circle, rgba(139, 255, 199, 0.2) 0%, rgba(139, 255, 199, 0.08) 42%, transparent 72%);
          filter: blur(5px);
          opacity: 0.84;
          pointer-events: none;
        }

        .basedare-maplibre-map :global(.peebear-review-signal) {
          position: absolute;
          left: 50%;
          top: 72px;
          z-index: 6;
          max-width: 118px;
          transform: translateX(-50%);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          border-radius: 9999px;
          border: 1px solid rgba(139, 255, 199, 0.26);
          background:
            linear-gradient(180deg, rgba(139, 255, 199, 0.11), rgba(139, 255, 199, 0.05)),
            linear-gradient(180deg, rgba(7, 14, 18, 0.94), rgba(4, 7, 12, 0.96));
          padding: 3px 8px;
          color: rgba(221, 255, 239, 0.9);
          font-size: 6.5px;
          font-weight: 900;
          letter-spacing: 0.14em;
          line-height: 1;
          text-transform: uppercase;
          box-shadow:
            0 10px 16px rgba(0, 0, 0, 0.28),
            0 0 16px rgba(139, 255, 199, 0.12),
            inset 0 1px 0 rgba(255, 255, 255, 0.08);
          pointer-events: none;
          backdrop-filter: blur(8px);
        }

        .basedare-maplibre-map :global(.peebear-marker--review-worth-it .peebear-review-aura) {
          background:
            radial-gradient(circle, rgba(245, 197, 24, 0.22) 0%, rgba(245, 197, 24, 0.09) 44%, transparent 72%);
        }

        .basedare-maplibre-map :global(.peebear-marker--review-worth-it .peebear-review-signal) {
          border-color: rgba(245, 197, 24, 0.3);
          color: #fff1a8;
          box-shadow:
            0 10px 16px rgba(0, 0, 0, 0.28),
            0 0 16px rgba(245, 197, 24, 0.16),
            inset 0 1px 0 rgba(255, 255, 255, 0.08);
        }

        .basedare-maplibre-map :global(.peebear-marker--review-mixed .peebear-review-aura) {
          background:
            radial-gradient(circle, rgba(184, 127, 255, 0.2) 0%, rgba(184, 127, 255, 0.08) 44%, transparent 72%);
        }

        .basedare-maplibre-map :global(.peebear-marker--review-mixed .peebear-review-signal) {
          border-color: rgba(184, 127, 255, 0.32);
          color: #ead7ff;
        }

        .basedare-maplibre-map :global(.peebear-marker--review-skip .peebear-review-aura) {
          background:
            radial-gradient(circle, rgba(251, 113, 133, 0.2) 0%, rgba(251, 113, 133, 0.08) 44%, transparent 72%);
        }

        .basedare-maplibre-map :global(.peebear-marker--review-skip .peebear-review-signal) {
          border-color: rgba(251, 113, 133, 0.28);
          color: #fecdd3;
        }

        .basedare-maplibre-map :global(.peebear-marker--review-needs-review .peebear-review-aura) {
          background:
            radial-gradient(circle, rgba(148, 163, 184, 0.16) 0%, rgba(148, 163, 184, 0.06) 44%, transparent 72%);
          opacity: 0.64;
        }

        .basedare-maplibre-map :global(.peebear-marker--review-needs-review .peebear-review-signal) {
          border-color: rgba(148, 163, 184, 0.24);
          color: rgba(226, 232, 240, 0.78);
        }

        .basedare-maplibre-map :global(.peebear-marker.is-review-fresh .peebear-review-signal) {
          border-color: rgba(139, 255, 199, 0.34);
          color: #ddffef;
          box-shadow:
            0 10px 16px rgba(0, 0, 0, 0.28),
            0 0 18px rgba(139, 255, 199, 0.18),
            inset 0 1px 0 rgba(255, 255, 255, 0.08);
        }

        .basedare-maplibre-map :global(.peebear-marker.has-review-signal .peebear-core) {
          border-color: rgba(139, 255, 199, 0.48);
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

        .basedare-maplibre-map :global(.peebear-marker.is-activated-venue .map-pin-marker) {
          border-color: rgba(248, 221, 114, 0.86);
          background:
            radial-gradient(circle at 34% 28%, rgba(255, 255, 255, 0.22) 0%, transparent 54%),
            radial-gradient(circle at 66% 76%, rgba(184, 127, 255, 0.16) 0%, transparent 50%),
            linear-gradient(180deg, rgba(41, 27, 8, 0.98), rgba(14, 10, 24, 0.99));
          box-shadow:
            6px 8px 16px rgba(0, 0, 0, 0.86),
            -2px -2px 7px rgba(255, 255, 255, 0.07),
            0 0 0 2px rgba(245, 197, 24, 0.56),
            0 0 24px rgba(245, 197, 24, 0.3),
            0 18px 30px rgba(0, 0, 0, 0.48),
            inset 0 1px 0 rgba(255, 255, 255, 0.14),
            inset 0 -12px 16px rgba(0, 0, 0, 0.25);
        }

        .basedare-maplibre-map :global(.peebear-marker.is-activated-venue .peebear-head) {
          width: 91%;
          height: 91%;
          filter:
            drop-shadow(0 5px 9px rgba(0, 0, 0, 0.28))
            drop-shadow(0 0 8px rgba(245, 197, 24, 0.14));
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

        @media (min-width: 768px) {
          .basedare-maplibre-map :global(.maplibregl-marker),
          .basedare-maplibre-map :global(.basedare-maplibre-marker),
          .basedare-maplibre-map :global(.peebear-core),
          .basedare-maplibre-map :global(.peebear-challenge-aura),
          .basedare-maplibre-map :global(.peebear-challenge-ring),
          .basedare-maplibre-map :global(.current-location-bear),
          .basedare-maplibre-map :global(.place-cluster-core) {
            animation: none !important;
            transition: none !important;
            will-change: auto !important;
          }

          .basedare-maplibre-map :global(.peebear-ripple),
          .basedare-maplibre-map :global(.current-location-pulse) {
            display: none !important;
          }

          .basedare-maplibre-map :global(.place-cluster-aura),
          .basedare-maplibre-map :global(.peebear-challenge-aura),
          .basedare-maplibre-map :global(.place-cluster-shadow) {
            filter: blur(3px);
            opacity: 0.62;
          }
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

          .basedare-maplibre-map :global(.maplibregl-marker),
          .basedare-maplibre-map :global(.basedare-maplibre-marker),
          .basedare-maplibre-map :global(.peebear-core),
          .basedare-maplibre-map :global(.peebear-ripple),
          .basedare-maplibre-map :global(.peebear-challenge-aura),
          .basedare-maplibre-map :global(.peebear-challenge-ring),
          .basedare-maplibre-map :global(.current-location-pulse),
          .basedare-maplibre-map :global(.current-location-bear) {
            animation: none !important;
            transition: none !important;
            will-change: auto !important;
          }

          .basedare-maplibre-map :global(.peebear-ripple),
          .basedare-maplibre-map :global(.peebear-challenge-aura) {
            display: none !important;
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

        /* Gesture calm-down: was mobile-only, now ALL viewports — desktop Chrome's
           residual flicker is marker animations repainting over the canvas during
           pan/zoom. Only active while data-map-moving='true'. */
        @media (min-width: 0px) {
          .basedare-maplibre-map[data-map-moving='true'] {
            --mesh-opacity: 0.045;
            --links-opacity: 0.055;
            --star-opacity: 0.09;
            --scan-opacity: 0.01;
            --haze-opacity: 0.58;
          }

          .basedare-maplibre-map[data-map-moving='true'] :global(.maplibregl-marker),
          .basedare-maplibre-map[data-map-moving='true'] :global(.basedare-maplibre-marker),
          .basedare-maplibre-map[data-map-moving='true'] :global(.current-location-bear),
          .basedare-maplibre-map[data-map-moving='true'] :global(.peebear-core),
          .basedare-maplibre-map[data-map-moving='true'] :global(.place-cluster-core) {
            animation: none !important;
            filter: none !important;
            transition: none !important;
            will-change: auto !important;
          }

          .basedare-maplibre-map[data-map-moving='true'] :global(.peebear-ripple),
          .basedare-maplibre-map[data-map-moving='true'] :global(.peebear-challenge-aura),
          .basedare-maplibre-map[data-map-moving='true'] :global(.peebear-challenge-ring),
          .basedare-maplibre-map[data-map-moving='true'] :global(.current-location-pulse),
          .basedare-maplibre-map[data-map-moving='true'] :global(.place-cluster-aura),
          .basedare-maplibre-map[data-map-moving='true'] :global(.place-cluster-shadow) {
            display: none !important;
          }

          .basedare-maplibre-map[data-map-moving='true'] :global(.peebear-core),
          .basedare-maplibre-map[data-map-moving='true'] :global(.map-pin-marker),
          .basedare-maplibre-map[data-map-moving='true'] :global(.place-cluster-core) {
            box-shadow:
              0 10px 16px rgba(0, 0, 0, 0.34),
              inset 0 1px 0 rgba(255, 255, 255, 0.08),
              inset 0 -8px 12px rgba(0, 0, 0, 0.18) !important;
          }

          .basedare-maplibre-map[data-map-moving='true'] :global(.peebear-venue-label),
          .basedare-maplibre-map[data-map-moving='true'] :global(.peebear-pulse-pill),
          .basedare-maplibre-map[data-map-moving='true'] :global(.peebear-count),
          .basedare-maplibre-map[data-map-moving='true'] :global(.peebear-state),
          .basedare-maplibre-map[data-map-moving='true'] :global(.peebear-footprint),
          .basedare-maplibre-map[data-map-moving='true'] :global(.venue-legend-chip),
          .basedare-maplibre-map[data-map-moving='true'] :global(.place-cluster-match),
          .basedare-maplibre-map[data-map-moving='true'] :global(.place-cluster-live) {
            backdrop-filter: none !important;
            box-shadow: none !important;
            filter: none !important;
            transition: none !important;
            will-change: auto !important;
          }
        }

        /* ================================================================
           P0 MAP CLARITY PASS — signal hierarchy + label declutter.
           Three states only: Lit (proven/funded/live), Warm (ready/claimable),
           Unlit (no proof yet). CSS-only: opacity/scale/visibility, no new
           animations, no DOM changes — also reduces composite load per frame
           (fewer shadowed labels over WebGL = less Chrome shimmer).
           ================================================================ */

        /* Unlit: no proof yet — quiet, almost off. Hover/selection restores. */
        .basedare-maplibre-map :global(.peebear-marker--unmarked) {
          opacity: 0.52;
        }
        .basedare-maplibre-map :global(.peebear-marker--unmarked .peebear-core) {
          filter: saturate(0.55) brightness(0.82);
          box-shadow: 0 6px 12px rgba(0, 0, 0, 0.3) !important;
        }
        .basedare-maplibre-map :global(.peebear-marker--unmarked:hover),
        .basedare-maplibre-map :global(.peebear-marker--unmarked.is-active),
        .basedare-maplibre-map :global(.peebear-marker--unmarked.is-activated-venue),
        .basedare-maplibre-map :global(.peebear-marker--unmarked.has-challenge-live) {
          opacity: 1;
        }
        .basedare-maplibre-map :global(.peebear-marker--unmarked:hover .peebear-core),
        .basedare-maplibre-map :global(.peebear-marker--unmarked.is-active .peebear-core),
        .basedare-maplibre-map :global(.peebear-marker--unmarked.is-activated-venue .peebear-core),
        .basedare-maplibre-map :global(.peebear-marker--unmarked.has-challenge-live .peebear-core) {
          filter: none;
        }

        /* Label declutter by zoom band (set imperatively in syncViewport).
           FAR: only Lit pins + the selected pin speak; everything else is bears. */
        .basedare-maplibre-map[data-zoom-band='far'] :global(.peebear-venue-label),
        .basedare-maplibre-map[data-zoom-band='far'] :global(.peebear-mayor),
        .basedare-maplibre-map[data-zoom-band='far'] :global(.peebear-pulse-pill),
        .basedare-maplibre-map[data-zoom-band='far'] :global(.peebear-state),
        .basedare-maplibre-map[data-zoom-band='far'] :global(.peebear-count),
        .basedare-maplibre-map[data-zoom-band='far'] :global(.peebear-footprint),
        .basedare-maplibre-map[data-zoom-band='far'] :global(.peebear-review-signal),
        .basedare-maplibre-map[data-zoom-band='far'] :global(.peebear-match-badge),
        .basedare-maplibre-map[data-zoom-band='far'] :global(.venue-legend-chip),
        .basedare-maplibre-map[data-zoom-band='far'] :global(.place-cluster-match),
        .basedare-maplibre-map[data-zoom-band='far'] :global(.place-cluster-live) {
          opacity: 0 !important;
          visibility: hidden !important;
          transition: none !important;
        }
        .basedare-maplibre-map[data-zoom-band='far'] :global(.peebear-marker--hot .peebear-venue-label),
        .basedare-maplibre-map[data-zoom-band='far'] :global(.peebear-marker--active .peebear-venue-label),
        .basedare-maplibre-map[data-zoom-band='far'] :global(.has-challenge-live .peebear-venue-label),
        .basedare-maplibre-map[data-zoom-band='far'] :global(.is-activated-venue .peebear-venue-label),
        .basedare-maplibre-map[data-zoom-band='far'] :global(.has-challenge-live .peebear-challenge-pill),
        .basedare-maplibre-map[data-zoom-band='far'] :global(.is-live-tonight .peebear-venue-label),
        .basedare-maplibre-map[data-zoom-band='far'] :global(.peebear-marker:hover .peebear-venue-label),
        .basedare-maplibre-map[data-zoom-band='far'] :global(.peebear-marker.is-active .peebear-venue-label),
        .basedare-maplibre-map[data-zoom-band='far'] :global(.peebear-marker.is-active .peebear-state) {
          opacity: 1 !important;
          visibility: visible !important;
        }

        /* FAR: Lit pins bloom — the island reads as a constellation of proof.
           Static drop-shadow only (no animation); killed during gestures by
           the data-map-moving calm-down. */
        .basedare-maplibre-map[data-zoom-band='far'] :global(.peebear-marker--blazing .peebear-core),
        .basedare-maplibre-map[data-zoom-band='far'] :global(.peebear-marker--igniting .peebear-core),
        .basedare-maplibre-map[data-zoom-band='far'] :global(.peebear-marker--hot .peebear-core),
        .basedare-maplibre-map[data-zoom-band='far'] :global(.peebear-marker--first-mark .peebear-core),
        .basedare-maplibre-map[data-zoom-band='far'] :global(.peebear-marker.has-challenge-live .peebear-core),
        .basedare-maplibre-map[data-zoom-band='far'] :global(.peebear-marker.is-activated-venue .peebear-core),
        .basedare-maplibre-map[data-zoom-band='far'] :global(.peebear-marker.is-live-tonight .peebear-core) {
          filter: drop-shadow(0 0 10px rgba(245, 197, 24, 0.5)) drop-shadow(0 0 26px rgba(245, 197, 24, 0.22));
        }
        .basedare-maplibre-map[data-map-moving='true'][data-zoom-band='far'] :global(.peebear-core) {
          filter: none !important;
        }

        /* MID: Unlit pins stay label-silent; Lit/Warm speak. */
        .basedare-maplibre-map[data-zoom-band='mid'] :global(.peebear-marker--unmarked .peebear-venue-label),
        .basedare-maplibre-map[data-zoom-band='mid'] :global(.peebear-marker--unmarked .peebear-pulse-pill),
        .basedare-maplibre-map[data-zoom-band='mid'] :global(.peebear-marker--unmarked .peebear-state),
        .basedare-maplibre-map[data-zoom-band='mid'] :global(.peebear-marker--unmarked .peebear-footprint) {
          opacity: 0 !important;
          visibility: hidden !important;
          transition: none !important;
        }
        .basedare-maplibre-map[data-zoom-band='mid'] :global(.peebear-marker--unmarked:hover .peebear-venue-label),
        .basedare-maplibre-map[data-zoom-band='mid'] :global(.peebear-marker--unmarked.is-active .peebear-venue-label),
        .basedare-maplibre-map[data-zoom-band='mid'] :global(.peebear-marker--unmarked.is-active .peebear-state) {
          opacity: 1 !important;
          visibility: visible !important;
        }

        /* Pixel objects decorate named places; they never replace place identity.
           Clusters provide the density guard. Gesture-time hiding still wins so
           desktop Chromium does not regress into marker repaint flicker. */
        .basedare-maplibre-map:not([data-map-moving='true'])
          :global(.peebear-venue-label) {
          opacity: 1 !important;
          visibility: visible !important;
        }

        .basedare-maplibre-map :global(.peebear-marker) {
          width: 82px;
          height: 112px;
        }

        .basedare-maplibre-map :global(.peebear-marker.is-compact) {
          width: 70px;
          height: 94px;
        }

        .basedare-maplibre-map :global(.peebear-venue-label) {
          top: 3px;
          max-width: 126px;
          transition: none;
        }

        .basedare-maplibre-map :global(.peebear-marker.is-activated-venue .peebear-venue-label) {
          top: -2px;
          min-width: 0;
          max-width: 138px;
          border-radius: 9999px;
          padding: 5px 9px;
          font-size: 8px;
          transform: translateX(-50%);
          animation: none;
        }

        .basedare-maplibre-map :global(.peebear-marker.is-activated-venue .peebear-venue-label::after),
        .basedare-maplibre-map :global(.peebear-marker.is-activated-venue .peebear-venue-label::before) {
          display: none;
        }

        .basedare-maplibre-map :global(.peebear-marker--unmarked) {
          opacity: 0.94;
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
