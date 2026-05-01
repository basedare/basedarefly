'use client';

import Image from 'next/image';
import Link from 'next/link';
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAccount } from 'wagmi';
import {
  Shield,
  ArrowRight,
  CheckCircle,
  XCircle,
  Loader2,
  AlertTriangle,
  Play,
  Users,
  DollarSign,
  Clock,
  Lock,
  MapPin,
  Tag,
  ExternalLink,
  Copy,
  Hand,
  Smartphone,
  Mail,
} from 'lucide-react';
import LiquidBackground from '@/components/LiquidBackground';
import GradualBlurOverlay from '@/components/GradualBlurOverlay';
import SentinelBadge from '@/components/SentinelBadge';
import { formatSentinelPausedMessage } from '@/lib/sentinel';
import { getPlaceTagReviewState, type PlaceTagReviewTone } from '@/lib/place-tag-review-sla';
import { useSessionAdminSecret } from '@/hooks/useSessionAdminSecret';

interface DareForModeration {
  id: string;
  shortId: string | null;
  title: string;
  bounty: number;
  requireSentinel: boolean;
  sentinelVerified: boolean;
  manualReviewNeeded: boolean;
  streamerHandle: string | null;
  status: string;
  videoUrl: string | null;
  claimedBy: string | null;
  targetWalletAddress: string | null;
  createdAt: string;
  updatedAt: string;
  venue: {
    slug: string;
    name: string;
    city: string | null;
    country: string | null;
  } | null;
  linkedCampaign: {
    id: string;
    title: string;
    brandName: string | null;
  } | null;
  votes: {
    approve: number;
    reject: number;
    total: number;
    approvePercent: number;
  };
  readyForDecision: boolean;
  voteThreshold: number;
  proofAgeHours: number;
  queueStage: 'COMMUNITY' | 'REFEREE';
  priorityScore: number;
  priorityReason: string;
}

interface QueueSummary {
  readyNow: number;
  oldestProofHours: number;
  campaignBackedReady: number;
}

interface PayoutBacklogSummary {
  total: number;
  oldestQueuedHours: number;
  missingOnChainId: number;
  campaignBacked: number;
}

interface PayoutBacklogEntry {
  id: string;
  shortId: string | null;
  title: string;
  bounty: number;
  streamerHandle: string | null;
  status: string;
  targetWalletAddress: string | null;
  updatedAt: string;
  moderatedAt: string | null;
  queuedHours: number;
  queueReason: string;
  onChainDareId: string | null;
  isSimulated: boolean;
  venue: {
    slug: string;
    name: string;
    city: string | null;
    country: string | null;
  } | null;
  linkedCampaign: {
    id: string;
    title: string;
    brandName: string | null;
  } | null;
}

interface AdminSettingsState {
  sentinelEnabled: boolean;
  sentinelPausedReason: string | null;
  sentinelPendingAlertThreshold: number;
  lastSentinelQueueAlertSent: string | null;
  venueLeadAlertThreshold: number;
  lastVenueLeadAlertSent: string | null;
}

function deriveQueueSummary(dares: DareForModeration[]): QueueSummary {
  return {
    readyNow: dares.filter((dare) => dare.readyForDecision || dare.status === 'PENDING_REVIEW').length,
    oldestProofHours: dares.length ? Math.max(...dares.map((dare) => dare.proofAgeHours)) : 0,
    campaignBackedReady: dares.filter(
      (dare) => dare.linkedCampaign && (dare.readyForDecision || dare.status === 'PENDING_REVIEW')
    ).length,
  };
}

interface PendingTag {
  id: string;
  tag: string;
  walletAddress: string;
  verificationMethod: string;
  identityPlatform: string | null;
  identityHandle: string | null;
  identityVerificationCode: string | null;
  status: string;
  twitterHandle: string | null;
  twitchHandle: string | null;
  youtubeHandle: string | null;
  kickHandle: string | null;
  kickVerificationCode: string | null;
  createdAt: string;
}

function formatIdentityPlatformLabel(platform: string | null | undefined) {
  if (!platform) return 'Unknown';
  if (platform === 'twitter') return 'X';
  if (platform === 'TWITTER') return 'X';
  return platform.charAt(0).toUpperCase() + platform.slice(1).toLowerCase();
}

function formatRelativeTime(value: string | null | undefined) {
  if (!value) return 'just now';
  const diffMs = Date.now() - new Date(value).getTime();
  const diffMinutes = Math.max(1, Math.round(diffMs / (1000 * 60)));
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.round(diffHours / 24);
  return `${diffDays}d ago`;
}

function formatProofAge(hours: number) {
  if (hours < 1) return '<1h';
  if (hours < 24) return `${hours}h`;
  return `${Math.round(hours / 24)}d`;
}

function formatLeadDue(value: string | null) {
  if (!value) return 'No reminder set';
  const date = new Date(value);
  const diffMs = date.getTime() - Date.now();
  const diffHours = Math.round(diffMs / (1000 * 60 * 60));
  if (diffHours < 0) return `${Math.abs(diffHours)}h overdue`;
  if (diffHours < 24) return `due in ${diffHours}h`;
  const diffDays = Math.round(diffHours / 24);
  return `due in ${diffDays}d`;
}

interface ClaimRequest {
  id: string;
  shortId: string | null;
  title: string;
  bounty: number;
  streamerHandle: string | null;
  status: string;
  expiresAt: string | null;
  createdAt: string;
  claimRequestWallet: string | null;
  claimRequestTag: string | null;
  claimRequestedAt: string | null;
  claimRequestStatus: string | null;
}

interface VenueClaimRequest {
  id: string;
  slug: string;
  name: string;
  city: string | null;
  country: string | null;
  isPartner: boolean;
  claimRequestWallet: string | null;
  claimRequestTag: string | null;
  claimRequestedAt: string | null;
  claimRequestStatus: string | null;
  claimedBy: string | null;
  claimedAt: string | null;
  _count: {
    placeTags: number;
    dares: number;
    campaigns: number;
  };
}

interface VenueReportLeadSummary {
  totalLeads: number;
  newLeads: number;
  activeFollowUps: number;
  overdue: number;
  unowned: number;
  venueAudience: number;
  sponsorAudience: number;
  claimStarted: number;
  activationsLaunched: number;
  repeatsLaunched: number;
}

interface VenueReportLeadEntry {
  id: string;
  audience: 'venue' | 'sponsor';
  source: string;
  intent: string | null;
  sessionKey: string | null;
  email: string;
  name: string | null;
  organization: string | null;
  notes: string | null;
  followUpStatus: 'NEW' | 'FOLLOWING_UP' | 'WAITING' | 'CONVERTED' | 'ARCHIVED';
  ownerWallet: string | null;
  nextActionAt: string | null;
  contactedAt: string;
  createdAt: string;
  venue: {
    id: string;
    slug: string;
    name: string;
    city: string | null;
    country: string | null;
    claimedBy: string | null;
    claimRequestStatus: string | null;
  };
  pipeline: {
    stage: 'CONTACTED' | 'CLAIM_STARTED' | 'ACTIVATION_LAUNCHED' | 'REPEAT_LAUNCHED';
    stageLabel: string;
    stageAt: string | null;
    latestEventLabel: string;
    latestEventAt: string | null;
  };
  priority: {
    score: number;
    label: string;
    reasons: string[];
    staleHours: number;
    isOverdue: boolean;
  };
  events: Array<{
    id: string;
    eventType: string;
    channel: string | null;
    createdAt: string;
  }>;
}

type LeadInboxFilter = 'all' | 'needsOwner' | 'overdue' | 'highSignal' | 'mine';

function formatLeadStatus(value: VenueReportLeadEntry['followUpStatus']) {
  switch (value) {
    case 'FOLLOWING_UP':
      return 'Working';
    case 'CONVERTED':
      return 'Won';
    case 'ARCHIVED':
      return 'Archived';
    case 'WAITING':
      return 'Waiting';
    case 'NEW':
    default:
      return 'New';
  }
}

interface PendingPlaceTag {
  id: string;
  venueId: string;
  walletAddress: string;
  creatorTag: string | null;
  status: string;
  caption: string | null;
  vibeTags: string[];
  proofMediaUrl: string;
  proofCid: string | null;
  proofType: string;
  linkedDareId: string | null;
  latitude: number | null;
  longitude: number | null;
  geoDistanceMeters: number | null;
  firstMark: boolean;
  submittedAt: string;
  reviewedAt: string | null;
  reviewerWallet: string | null;
  reviewReason: string | null;
  venue: {
    id: string;
    slug: string;
    name: string;
    city: string | null;
    country: string | null;
  };
}

const PLACE_TAG_REJECT_REASON_CHIPS = [
  'Off-place proof',
  'Low-quality proof',
  'Duplicate or spam',
  'Unsafe or private content',
] as const;

function getPlaceTagReviewToneClass(tone: PlaceTagReviewTone) {
  switch (tone) {
    case 'overdue':
      return 'border-red-400/24 bg-red-500/[0.1] text-red-200';
    case 'due':
      return 'border-yellow-400/24 bg-yellow-500/[0.1] text-yellow-200';
    case 'fresh':
      return 'border-cyan-400/22 bg-cyan-500/[0.09] text-cyan-200';
    default:
      return 'border-emerald-400/20 bg-emerald-500/[0.08] text-emerald-200';
  }
}

function getPlaceTagReviewFillClass(tone: PlaceTagReviewTone) {
  switch (tone) {
    case 'overdue':
      return 'bg-red-300';
    case 'due':
      return 'bg-yellow-300';
    case 'fresh':
      return 'bg-cyan-300';
    default:
      return 'bg-emerald-300';
  }
}

function derivePlaceTagQueueSummary(tags: PendingPlaceTag[]) {
  const states = tags.map((tag) => getPlaceTagReviewState(tag.submittedAt));

  return {
    total: tags.length,
    overdue: states.filter((state) => state.tone === 'overdue').length,
    dueSoon: states.filter((state) => state.tone === 'due').length,
    firstMarks: tags.filter((tag) => tag.firstMark).length,
    oldestQueuedLabel: states.length
      ? states.reduce((oldest, state) =>
          state.progress > oldest.progress ? state : oldest
        ).elapsedLabel
      : 'clear',
  };
}

interface AdminPlace {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  latitude: number;
  longitude: number;
  status: string;
  isPartner: boolean;
  partnerTier: string | null;
  placeSource: string | null;
  externalPlaceId: string | null;
  categories: string[];
  checkInRadiusMeters: number;
  qrRotationSeconds: number;
  createdAt: string;
  updatedAt: string;
  _count: {
    placeTags: number;
    dares: number;
  };
}

interface PushDiagnosticsSummary {
  configured: boolean;
  activeSubscriptions: number;
  inactiveSubscriptions: number;
  freshLocationSubscriptions: number;
  recentSent: number;
  recentFailed: number;
  recentSkipped: number;
  recentlyDeactivated: number;
}

interface PushTopicMix {
  topic: string;
  subscriptions: number;
  deliveries: number;
}

interface PushDeliveryEntry {
  id: string;
  wallet: string;
  topic: string;
  title: string;
  url: string | null;
  status: string;
  reason: string | null;
  errorMessage: string | null;
  createdAt: string;
  subscriptionId: string | null;
}

const ADMIN_PUSH_TOPICS = ['wallet', 'nearby', 'campaigns', 'venues'] as const;
type AdminPushTopic = (typeof ADMIN_PUSH_TOPICS)[number];

type AdminPushForm = {
  wallet: string;
  topic: AdminPushTopic;
  title: string;
  body: string;
  url: string;
};

type AdminPushSendResult = {
  configured: boolean;
  subscriptions: number;
  sent: number;
  skipped: number;
  failed: number;
  deactivated: number;
  reason?: string;
};

const DEFAULT_ADMIN_PUSH_FORM: AdminPushForm = {
  wallet: '',
  topic: 'wallet',
  title: 'BaseDare alert',
  body: 'Open BaseDare for the latest action.',
  url: '/dashboard',
};

type AdminPlaceForm = {
  id?: string;
  slug: string;
  name: string;
  description: string;
  address: string;
  city: string;
  country: string;
  latitude: string;
  longitude: string;
  status: string;
  isPartner: boolean;
  partnerTier: string;
  placeSource: string;
  externalPlaceId: string;
  categories: string;
};

type AdminTab =
  | 'moderation'
  | 'claims'
  | 'venueClaims'
  | 'reportLeads'
  | 'tags'
  | 'placeTags'
  | 'places'
  | 'push';

const ADMIN_TABS: AdminTab[] = [
  'moderation',
  'claims',
  'venueClaims',
  'reportLeads',
  'tags',
  'placeTags',
  'places',
  'push',
];

type AdminRouteState = {
  tab: AdminTab;
  fromDailyCommandLoop: boolean;
  targetDareId: string | null;
  targetClaimId: string | null;
  targetVenueClaimId: string | null;
  targetReportLeadId: string | null;
  targetTagId: string | null;
  targetPlaceTagId: string | null;
  targetPlaceId: string | null;
};

const DEFAULT_ADMIN_ROUTE: AdminRouteState = {
  tab: 'moderation',
  fromDailyCommandLoop: false,
  targetDareId: null,
  targetClaimId: null,
  targetVenueClaimId: null,
  targetReportLeadId: null,
  targetTagId: null,
  targetPlaceTagId: null,
  targetPlaceId: null,
};

function isAdminTab(value: string | null): value is AdminTab {
  return Boolean(value && ADMIN_TABS.includes(value as AdminTab));
}

function readAdminRouteFromSearch(search: string): AdminRouteState {
  const params = new URLSearchParams(search);
  const tab = params.get('tab');
  const from = params.get('from');

  return {
    tab: isAdminTab(tab) ? tab : 'moderation',
    fromDailyCommandLoop: from === 'daily-command-loop' || from === 'command-loop',
    targetDareId: params.get('dareId') ?? params.get('shortId'),
    targetClaimId: params.get('claimId'),
    targetVenueClaimId: params.get('venueClaimId') ?? params.get('venueId') ?? params.get('venueSlug'),
    targetReportLeadId: params.get('reportLeadId') ?? params.get('leadId'),
    targetTagId: params.get('tagId'),
    targetPlaceTagId: params.get('placeTagId') ?? (tab === 'placeTags' ? params.get('tagId') : null),
    targetPlaceId: params.get('placeId') ?? params.get('venueId') ?? params.get('venueSlug'),
  };
}

function writeAdminRouteToHistory(route: AdminRouteState) {
  if (typeof window === 'undefined') return;

  const params = new URLSearchParams();
  params.set('tab', route.tab);
  if (route.fromDailyCommandLoop) {
    params.set('from', 'daily-command-loop');
  }

  const nextUrl = `${window.location.pathname}?${params.toString()}${window.location.hash}`;
  window.history.replaceState(null, '', nextUrl);
}

const EMPTY_PLACE_FORM: AdminPlaceForm = {
  slug: '',
  name: '',
  description: '',
  address: '',
  city: '',
  country: '',
  latitude: '',
  longitude: '',
  status: 'ACTIVE',
  isPartner: false,
  partnerTier: '',
  placeSource: 'ADMIN_MANUAL',
  externalPlaceId: '',
  categories: '',
};

export default function AdminPage() {
  const { address } = useAccount();
  const placeTagRejectReasonRef = useRef<HTMLTextAreaElement | null>(null);
  const [adminRoute, setAdminRoute] = useState<AdminRouteState>(DEFAULT_ADMIN_ROUTE);
  const [activeTab, setActiveTab] = useState<AdminTab>('moderation');
  const [dares, setDares] = useState<DareForModeration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [moderating, setModerating] = useState<string | null>(null);
  const [moderationActionError, setModerationActionError] = useState<string | null>(null);
  const [selectedDare, setSelectedDare] = useState<DareForModeration | null>(null);
  const [moderateNote, setModerateNote] = useState('');
  const [queueSummary, setQueueSummary] = useState<QueueSummary>({
    readyNow: 0,
    oldestProofHours: 0,
    campaignBackedReady: 0,
  });
  const [payoutBacklog, setPayoutBacklog] = useState<PayoutBacklogEntry[]>([]);
  const [payoutBacklogSummary, setPayoutBacklogSummary] = useState<PayoutBacklogSummary>({
    total: 0,
    oldestQueuedHours: 0,
    missingOnChainId: 0,
    campaignBacked: 0,
  });
  const [moderationActionNotice, setModerationActionNotice] = useState<string | null>(null);
  const [adminSettings, setAdminSettings] = useState<AdminSettingsState>({
    sentinelEnabled: true,
    sentinelPausedReason: null,
    sentinelPendingAlertThreshold: 5,
    lastSentinelQueueAlertSent: null,
    venueLeadAlertThreshold: 2,
    lastVenueLeadAlertSent: null,
  });
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [sentinelThresholdDraft, setSentinelThresholdDraft] = useState('5');
  const [venueLeadThresholdDraft, setVenueLeadThresholdDraft] = useState('2');
  const [sentinelPauseReasonDraft, setSentinelPauseReasonDraft] = useState('');
  const [leadAlertRunning, setLeadAlertRunning] = useState(false);

  // Tags management state
  const [pendingTags, setPendingTags] = useState<PendingTag[]>([]);
  const [tagsLoading, setTagsLoading] = useState(false);
  const [tagsError, setTagsError] = useState<string | null>(null);
  const [processingTag, setProcessingTag] = useState<string | null>(null);
  const [selectedTag, setSelectedTag] = useState<PendingTag | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const {
    adminSecret,
    setAdminSecret,
    ensureAdminSession,
    clearAdminSecret,
    hasAdminSession,
    hasSessionAdminSecret,
  } = useSessionAdminSecret();
  const [isTagsAuthorized, setIsTagsAuthorized] = useState(false);
  const [pendingPlaceTags, setPendingPlaceTags] = useState<PendingPlaceTag[]>([]);
  const [placeTagsLoading, setPlaceTagsLoading] = useState(false);
  const [placeTagsError, setPlaceTagsError] = useState<string | null>(null);
  const [processingPlaceTag, setProcessingPlaceTag] = useState<string | null>(null);
  const [selectedPlaceTag, setSelectedPlaceTag] = useState<PendingPlaceTag | null>(null);
  const [placeTagRejectReason, setPlaceTagRejectReason] = useState('');
  const [places, setPlaces] = useState<AdminPlace[]>([]);
  const [placesLoading, setPlacesLoading] = useState(false);
  const [placesError, setPlacesError] = useState<string | null>(null);
  const [placesSearchQuery, setPlacesSearchQuery] = useState('');
  const [selectedPlaceRecord, setSelectedPlaceRecord] = useState<AdminPlace | null>(null);
  const [placeForm, setPlaceForm] = useState<AdminPlaceForm>(EMPTY_PLACE_FORM);
  const [savingPlace, setSavingPlace] = useState(false);
  const [pushSummary, setPushSummary] = useState<PushDiagnosticsSummary>({
    configured: false,
    activeSubscriptions: 0,
    inactiveSubscriptions: 0,
    freshLocationSubscriptions: 0,
    recentSent: 0,
    recentFailed: 0,
    recentSkipped: 0,
    recentlyDeactivated: 0,
  });
  const [pushTopicMix, setPushTopicMix] = useState<PushTopicMix[]>([]);
  const [pushDeliveries, setPushDeliveries] = useState<PushDeliveryEntry[]>([]);
  const [pushLoading, setPushLoading] = useState(false);
  const [pushError, setPushError] = useState<string | null>(null);
  const [adminPushForm, setAdminPushForm] = useState<AdminPushForm>(DEFAULT_ADMIN_PUSH_FORM);
  const [adminPushSending, setAdminPushSending] = useState(false);
  const [adminPushResult, setAdminPushResult] = useState<AdminPushSendResult | null>(null);

  // Claims management state
  const [pendingClaims, setPendingClaims] = useState<ClaimRequest[]>([]);
  const [claimsLoading, setClaimsLoading] = useState(false);
  const [claimsError, setClaimsError] = useState<string | null>(null);
  const [processingClaim, setProcessingClaim] = useState<string | null>(null);
  const [selectedClaim, setSelectedClaim] = useState<ClaimRequest | null>(null);
  const [claimRejectReason, setClaimRejectReason] = useState('');
  const [pendingVenueClaims, setPendingVenueClaims] = useState<VenueClaimRequest[]>([]);
  const [venueClaimsLoading, setVenueClaimsLoading] = useState(false);
  const [venueClaimsError, setVenueClaimsError] = useState<string | null>(null);
  const [processingVenueClaim, setProcessingVenueClaim] = useState<string | null>(null);
  const [selectedVenueClaim, setSelectedVenueClaim] = useState<VenueClaimRequest | null>(null);
  const [venueClaimRejectReason, setVenueClaimRejectReason] = useState('');
  const [reportLeadSummary, setReportLeadSummary] = useState<VenueReportLeadSummary>({
    totalLeads: 0,
    newLeads: 0,
    activeFollowUps: 0,
    overdue: 0,
    unowned: 0,
    venueAudience: 0,
    sponsorAudience: 0,
    claimStarted: 0,
    activationsLaunched: 0,
    repeatsLaunched: 0,
  });
  const [reportLeads, setReportLeads] = useState<VenueReportLeadEntry[]>([]);
  const [reportLeadsLoading, setReportLeadsLoading] = useState(false);
  const [reportLeadsError, setReportLeadsError] = useState<string | null>(null);
  const [selectedReportLead, setSelectedReportLead] = useState<VenueReportLeadEntry | null>(null);
  const [reportLeadUpdating, setReportLeadUpdating] = useState<string | null>(null);
  const [leadInboxFilter, setLeadInboxFilter] = useState<LeadInboxFilter>('needsOwner');
  const adminSecretTrimmed = adminSecret.trim();
  const hasAdminAuth = Boolean(address || hasAdminSession || adminSecretTrimmed);
  const hasReadyAdminAuth = Boolean(address || hasAdminSession);
  const adminAuthHeaders = useMemo<Record<string, string>>(() => {
    const headers: Record<string, string> = {};
    if (address) {
      headers['x-moderator-wallet'] = address;
      return headers;
    }
    return headers;
  }, [address]);
  const ensureAdminAccess = useCallback(async () => {
    if (address || hasAdminSession) return true;
    return ensureAdminSession();
  }, [address, ensureAdminSession, hasAdminSession]);
  const placeTagQueueSummary = useMemo(
    () => derivePlaceTagQueueSummary(pendingPlaceTags),
    [pendingPlaceTags]
  );
  const selectedPlaceTagReviewState = selectedPlaceTag
    ? getPlaceTagReviewState(selectedPlaceTag.submittedAt)
    : null;
  const sentinelQueueCount = dares.filter(
    (dare) => dare.requireSentinel && dare.manualReviewNeeded && dare.status === 'PENDING_REVIEW'
  ).length;

  const selectRelativeDare = useCallback(
    (direction: 1 | -1) => {
      if (!dares.length) {
        setSelectedDare(null);
        return;
      }

      if (!selectedDare) {
        setSelectedDare(dares[0]);
        return;
      }

      const currentIndex = dares.findIndex((dare) => dare.id === selectedDare.id);
      const nextIndex = currentIndex === -1
        ? 0
        : (currentIndex + direction + dares.length) % dares.length;
      setSelectedDare(dares[nextIndex]);
    },
    [dares, selectedDare]
  );

  const selectAdminTab = useCallback((tab: AdminTab) => {
    const nextRoute: AdminRouteState = {
      ...DEFAULT_ADMIN_ROUTE,
      tab,
      fromDailyCommandLoop: adminRoute.fromDailyCommandLoop,
    };
    setAdminRoute(nextRoute);
    setActiveTab(tab);
    writeAdminRouteToHistory(nextRoute);
  }, [adminRoute.fromDailyCommandLoop]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const nextRoute = readAdminRouteFromSearch(window.location.search);
    setAdminRoute(nextRoute);
    setActiveTab(nextRoute.tab);
  }, []);

  // Fetch moderation queue
  const fetchQueue = useCallback(async () => {
    if (!hasAdminAuth) return;

    try {
      setLoading(true);
      setError(null);

      if (!(await ensureAdminAccess())) {
        setIsAuthorized(false);
        setError('Invalid admin secret');
        return;
      }

      const res = await fetch('/api/admin/moderate', {
        headers: adminAuthHeaders,
      });

      const data = await res.json();

      if (data.success) {
        setIsAuthorized(true);
        const nextDares = data.data.dares || [];
        setDares(nextDares);
        setQueueSummary(data.data.queueSummary || deriveQueueSummary(nextDares));
        setPayoutBacklog(data.data.payoutBacklog || []);
        setPayoutBacklogSummary(data.data.payoutBacklogSummary || {
          total: 0,
          oldestQueuedHours: 0,
          missingOnChainId: 0,
          campaignBacked: 0,
        });
        setSelectedDare((current) => {
          if (!nextDares.length) return null;
          const targetedDare = adminRoute.targetDareId
            ? nextDares.find((dare: DareForModeration) =>
                dare.id === adminRoute.targetDareId || dare.shortId === adminRoute.targetDareId
              )
            : null;
          if (targetedDare) return targetedDare;
          if (!current) return nextDares[0];
          return nextDares.find((dare: DareForModeration) => dare.id === current.id) || nextDares[0];
        });
      } else if (res.status === 401) {
        setIsAuthorized(false);
        setError(adminSecretTrimmed ? 'Invalid admin secret' : 'Your wallet is not authorized as a moderator');
      } else {
        setError(data.error || 'Failed to load moderation queue');
      }
    } catch {
      setError('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  }, [adminAuthHeaders, adminRoute.targetDareId, adminSecretTrimmed, ensureAdminAccess, hasAdminAuth]);

  const fetchAdminSettings = useCallback(async () => {
    if (!hasAdminAuth) return;

    try {
      setSettingsLoading(true);
      if (!(await ensureAdminAccess())) return;

      const res = await fetch('/api/admin/settings', {
        headers: adminAuthHeaders,
      });
      const data = await res.json();

      if (data.success) {
        setAdminSettings({
          sentinelEnabled: data.data.sentinelEnabled !== false,
          sentinelPausedReason: data.data.sentinelPausedReason ?? null,
          sentinelPendingAlertThreshold: data.data.sentinelPendingAlertThreshold ?? 5,
          lastSentinelQueueAlertSent: data.data.lastSentinelQueueAlertSent ?? null,
          venueLeadAlertThreshold: data.data.venueLeadAlertThreshold ?? 2,
          lastVenueLeadAlertSent: data.data.lastVenueLeadAlertSent ?? null,
        });
        setSentinelThresholdDraft(String(data.data.sentinelPendingAlertThreshold ?? 5));
        setVenueLeadThresholdDraft(String(data.data.venueLeadAlertThreshold ?? 2));
        setSentinelPauseReasonDraft(data.data.sentinelPausedReason ?? '');
      }
    } catch {
      // Keep the existing UI state if settings fail to load.
    } finally {
      setSettingsLoading(false);
    }
  }, [adminAuthHeaders, ensureAdminAccess, hasAdminAuth]);

  useEffect(() => {
    if (hasReadyAdminAuth) {
      fetchQueue();
      fetchAdminSettings();
    } else {
      setLoading(false);
    }
  }, [fetchAdminSettings, fetchQueue, hasReadyAdminAuth]);

  const handleSentinelToggle = useCallback(async () => {
    if (!hasAdminAuth) return;

    try {
      setSettingsSaving(true);
      const nextEnabled = !adminSettings.sentinelEnabled;
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...adminAuthHeaders,
        },
        body: JSON.stringify({
          sentinelEnabled: nextEnabled,
          sentinelPausedReason: nextEnabled
            ? null
            : sentinelPauseReasonDraft || adminSettings.sentinelPausedReason,
        }),
      });
      const data = await res.json();

      if (data.success) {
        setAdminSettings({
          sentinelEnabled: data.data.sentinelEnabled !== false,
          sentinelPausedReason: data.data.sentinelPausedReason ?? null,
          sentinelPendingAlertThreshold: data.data.sentinelPendingAlertThreshold ?? adminSettings.sentinelPendingAlertThreshold,
          lastSentinelQueueAlertSent: data.data.lastSentinelQueueAlertSent ?? adminSettings.lastSentinelQueueAlertSent,
          venueLeadAlertThreshold: data.data.venueLeadAlertThreshold ?? adminSettings.venueLeadAlertThreshold,
          lastVenueLeadAlertSent: data.data.lastVenueLeadAlertSent ?? adminSettings.lastVenueLeadAlertSent,
        });
        setSentinelThresholdDraft(
          String(data.data.sentinelPendingAlertThreshold ?? adminSettings.sentinelPendingAlertThreshold)
        );
        setVenueLeadThresholdDraft(
          String(data.data.venueLeadAlertThreshold ?? adminSettings.venueLeadAlertThreshold)
        );
        setSentinelPauseReasonDraft(data.data.sentinelPausedReason ?? sentinelPauseReasonDraft);
      } else {
        setError(data.error || 'Failed to update Sentinel settings');
      }
    } catch {
      setError('Failed to update Sentinel settings');
    } finally {
      setSettingsSaving(false);
    }
  }, [
    adminAuthHeaders,
    adminSettings.lastSentinelQueueAlertSent,
    adminSettings.lastVenueLeadAlertSent,
    adminSettings.sentinelPausedReason,
    adminSettings.sentinelEnabled,
    adminSettings.sentinelPendingAlertThreshold,
    adminSettings.venueLeadAlertThreshold,
    hasAdminAuth,
    sentinelPauseReasonDraft,
  ]);

  const handleSentinelThresholdSave = useCallback(async () => {
    if (!hasAdminAuth) return;

    const nextThreshold = Number.parseInt(sentinelThresholdDraft, 10);
    if (!Number.isFinite(nextThreshold) || nextThreshold < 1) {
      setError('Sentinel queue alert threshold must be at least 1');
      return;
    }

    try {
      setSettingsSaving(true);
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...adminAuthHeaders,
        },
        body: JSON.stringify({
          sentinelEnabled: adminSettings.sentinelEnabled,
          sentinelPausedReason: adminSettings.sentinelEnabled ? null : adminSettings.sentinelPausedReason,
          sentinelPendingAlertThreshold: nextThreshold,
        }),
      });
      const data = await res.json();

      if (data.success) {
        setAdminSettings({
          sentinelEnabled: data.data.sentinelEnabled !== false,
          sentinelPausedReason: data.data.sentinelPausedReason ?? null,
          sentinelPendingAlertThreshold: data.data.sentinelPendingAlertThreshold ?? nextThreshold,
          lastSentinelQueueAlertSent: data.data.lastSentinelQueueAlertSent ?? null,
          venueLeadAlertThreshold: data.data.venueLeadAlertThreshold ?? adminSettings.venueLeadAlertThreshold,
          lastVenueLeadAlertSent: data.data.lastVenueLeadAlertSent ?? adminSettings.lastVenueLeadAlertSent,
        });
        setSentinelThresholdDraft(String(data.data.sentinelPendingAlertThreshold ?? nextThreshold));
        setVenueLeadThresholdDraft(
          String(data.data.venueLeadAlertThreshold ?? adminSettings.venueLeadAlertThreshold)
        );
      } else {
        setError(data.error || 'Failed to update Sentinel queue alert threshold');
      }
    } catch {
      setError('Failed to update Sentinel queue alert threshold');
    } finally {
      setSettingsSaving(false);
    }
  }, [
    adminAuthHeaders,
    adminSettings.sentinelEnabled,
    adminSettings.sentinelPausedReason,
    adminSettings.lastVenueLeadAlertSent,
    adminSettings.venueLeadAlertThreshold,
    hasAdminAuth,
    sentinelThresholdDraft,
  ]);

  const handleVenueLeadThresholdSave = useCallback(async () => {
    if (!hasAdminAuth) return;

    const nextThreshold = Number.parseInt(venueLeadThresholdDraft, 10);
    if (!Number.isFinite(nextThreshold) || nextThreshold < 1) {
      setError('Venue lead alert threshold must be at least 1');
      return;
    }

    try {
      setSettingsSaving(true);
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...adminAuthHeaders,
        },
        body: JSON.stringify({
          sentinelEnabled: adminSettings.sentinelEnabled,
          sentinelPausedReason: adminSettings.sentinelEnabled ? null : adminSettings.sentinelPausedReason,
          sentinelPendingAlertThreshold: adminSettings.sentinelPendingAlertThreshold,
          venueLeadAlertThreshold: nextThreshold,
        }),
      });
      const data = await res.json();

      if (data.success) {
        setAdminSettings({
          sentinelEnabled: data.data.sentinelEnabled !== false,
          sentinelPausedReason: data.data.sentinelPausedReason ?? null,
          sentinelPendingAlertThreshold: data.data.sentinelPendingAlertThreshold ?? adminSettings.sentinelPendingAlertThreshold,
          lastSentinelQueueAlertSent: data.data.lastSentinelQueueAlertSent ?? adminSettings.lastSentinelQueueAlertSent,
          venueLeadAlertThreshold: data.data.venueLeadAlertThreshold ?? nextThreshold,
          lastVenueLeadAlertSent: data.data.lastVenueLeadAlertSent ?? adminSettings.lastVenueLeadAlertSent,
        });
        setSentinelThresholdDraft(
          String(data.data.sentinelPendingAlertThreshold ?? adminSettings.sentinelPendingAlertThreshold)
        );
        setVenueLeadThresholdDraft(String(data.data.venueLeadAlertThreshold ?? nextThreshold));
      } else {
        setError(data.error || 'Failed to update venue lead alert threshold');
      }
    } catch {
      setError('Failed to update venue lead alert threshold');
    } finally {
      setSettingsSaving(false);
    }
  }, [
    adminAuthHeaders,
    adminSettings.lastSentinelQueueAlertSent,
    adminSettings.lastVenueLeadAlertSent,
    adminSettings.sentinelEnabled,
    adminSettings.sentinelPausedReason,
    adminSettings.sentinelPendingAlertThreshold,
    hasAdminAuth,
    venueLeadThresholdDraft,
  ]);

  const handleRunLeadAlertScan = useCallback(async () => {
    if (!hasAdminAuth) return;

    try {
      setLeadAlertRunning(true);
      const res = await fetch('/api/admin/venue-report-leads/alert', {
        method: 'POST',
        headers: adminAuthHeaders,
      });
      const data = await res.json();
      if (data.success) {
        setModerationActionNotice(
          data.data.alerted
            ? `Lead alert sent for ${data.data.urgentCount} urgent lead${data.data.urgentCount === 1 ? '' : 's'}.`
            : `Lead scan complete: ${data.data.reason?.toLowerCase?.() || 'no alert sent'}.`
        );
        await fetchAdminSettings();
      } else {
        setError(data.error || 'Failed to run venue lead alert scan');
      }
    } catch {
      setError('Failed to run venue lead alert scan');
    } finally {
      setLeadAlertRunning(false);
    }
  }, [adminAuthHeaders, fetchAdminSettings, hasAdminAuth]);

  // Fetch pending tags
  const fetchPendingTags = useCallback(async () => {
    if (!hasAdminAuth) return;

    setTagsLoading(true);
    setTagsError(null);

    try {
      if (!(await ensureAdminAccess())) {
        setIsTagsAuthorized(false);
        setTagsError('Invalid admin secret');
        return;
      }

      const res = await fetch('/api/admin/tags?status=PENDING', {
        headers: adminAuthHeaders,
      });

      const data = await res.json();

      if (data.success) {
        const tags = data.data.tags as PendingTag[];
        setIsTagsAuthorized(true);
        setPendingTags(tags);
        setSelectedTag((current) => {
          if (!tags.length) return null;
          const targetedTag = adminRoute.targetTagId
            ? tags.find((tag) => tag.id === adminRoute.targetTagId || tag.tag === adminRoute.targetTagId)
            : null;
          if (targetedTag) return targetedTag;
          if (!current) return tags[0];
          return tags.find((tag) => tag.id === current.id) ?? tags[0];
        });
      } else if (res.status === 401) {
        setIsTagsAuthorized(false);
        setTagsError('Invalid admin secret');
      } else {
        setTagsError(data.error || 'Failed to load pending tags');
      }
    } catch {
      setTagsError('Failed to connect to server');
    } finally {
      setTagsLoading(false);
    }
  }, [adminAuthHeaders, adminRoute.targetTagId, ensureAdminAccess, hasAdminAuth]);

  // Handle tag verification
  const handleTagAction = async (tagId: string, action: 'VERIFY_MANUAL' | 'REJECT_MANUAL') => {
    if (!hasAdminAuth) return;

    setProcessingTag(tagId);

    try {
      if (!(await ensureAdminAccess())) {
        setTagsError('Invalid admin secret');
        return;
      }

      const res = await fetch('/api/admin/tags', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...adminAuthHeaders,
        },
        body: JSON.stringify({
          tagId,
          action,
          reason: action === 'REJECT_MANUAL' ? rejectReason || undefined : undefined,
        }),
      });

      const data = await res.json();

      if (data.success) {
        // Remove from list
        setPendingTags((prev) => prev.filter((t) => t.id !== tagId));
        setSelectedTag(null);
        setRejectReason('');
      } else {
        setTagsError(data.error || 'Failed to process tag');
      }
    } catch {
      setTagsError('Failed to submit decision');
    } finally {
      setProcessingTag(null);
    }
  };

  // Load tags when tab switches or secret changes
  useEffect(() => {
    if (activeTab === 'tags' && hasReadyAdminAuth && (!isTagsAuthorized || pendingTags.length === 0)) {
      fetchPendingTags();
    }
  }, [activeTab, hasReadyAdminAuth, isTagsAuthorized, pendingTags.length, fetchPendingTags]);

  const fetchPendingPlaceTags = useCallback(async () => {
    if (!hasAdminAuth) return;

    setPlaceTagsLoading(true);
    setPlaceTagsError(null);

    try {
      if (!(await ensureAdminAccess())) {
        setIsTagsAuthorized(false);
        setPlaceTagsError('Invalid admin secret');
        return;
      }

      const res = await fetch('/api/admin/place-tags?status=PENDING', {
        headers: adminAuthHeaders,
      });

      const data = await res.json();

      if (data.success) {
        const tags = data.data.tags as PendingPlaceTag[];
        setIsTagsAuthorized(true);
        setPendingPlaceTags(tags);
        setSelectedPlaceTag((current) => {
          if (!tags.length) return null;
          const targetedTag = adminRoute.targetPlaceTagId
            ? tags.find((tag) => tag.id === adminRoute.targetPlaceTagId)
            : null;
          if (targetedTag) return targetedTag;
          return current && tags.some((tag) => tag.id === current.id) ? current : tags[0] ?? null;
        });
      } else if (res.status === 401) {
        setIsTagsAuthorized(false);
        setPlaceTagsError('Invalid admin secret');
      } else {
        setPlaceTagsError(data.error || 'Failed to load place tags');
      }
    } catch {
      setPlaceTagsError('Failed to connect to server');
    } finally {
      setPlaceTagsLoading(false);
    }
  }, [adminAuthHeaders, adminRoute.targetPlaceTagId, ensureAdminAccess, hasAdminAuth]);

  const handlePlaceTagAction = useCallback(async (
    tagId: string,
    action: 'APPROVE' | 'REJECT' | 'FLAG',
    options?: { openNext?: boolean }
  ) => {
    if (!hasAdminAuth) return;

    setProcessingPlaceTag(tagId);
    const openNext = options?.openNext ?? false;
    const currentIndex = pendingPlaceTags.findIndex((tag) => tag.id === tagId);
    const nextTagCandidate =
      currentIndex >= 0
        ? pendingPlaceTags.find((tag, index) => index > currentIndex && tag.id !== tagId) ||
          pendingPlaceTags.find((tag) => tag.id !== tagId)
        : null;
    const normalizedNextTag = nextTagCandidate ?? null;

    try {
      if (!(await ensureAdminAccess())) {
        setPlaceTagsError('Invalid admin secret');
        return;
      }

      const res = await fetch('/api/admin/place-tags', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...adminAuthHeaders,
        },
        body: JSON.stringify({
          tagId,
          action,
          reason: action === 'APPROVE' ? undefined : placeTagRejectReason || undefined,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setPendingPlaceTags((prev) => prev.filter((tag) => tag.id !== tagId));
        setSelectedPlaceTag(openNext ? normalizedNextTag : null);
        setPlaceTagRejectReason('');
      } else {
        setPlaceTagsError(data.error || 'Failed to process place tag');
      }
    } catch {
      setPlaceTagsError('Failed to submit decision');
    } finally {
      setProcessingPlaceTag(null);
    }
  }, [adminAuthHeaders, ensureAdminAccess, hasAdminAuth, pendingPlaceTags, placeTagRejectReason]);

  const focusPlaceTagRejectReason = useCallback(() => {
    window.requestAnimationFrame(() => {
      placeTagRejectReasonRef.current?.focus();
      placeTagRejectReasonRef.current?.select();
    });
  }, []);

  const handlePlaceTagRejectIntent = useCallback(
    (options?: { openNext?: boolean }) => {
      if (!selectedPlaceTag) return;

      if (!placeTagRejectReason.trim()) {
        focusPlaceTagRejectReason();
        return;
      }

      void handlePlaceTagAction(selectedPlaceTag.id, 'REJECT', options);
    },
    [focusPlaceTagRejectReason, handlePlaceTagAction, placeTagRejectReason, selectedPlaceTag]
  );

  const selectNextPendingPlaceTag = useCallback(() => {
    if (!selectedPlaceTag || pendingPlaceTags.length <= 1) {
      return;
    }

    const currentIndex = pendingPlaceTags.findIndex((tag) => tag.id === selectedPlaceTag.id);
    const nextTag =
      currentIndex >= 0
        ? pendingPlaceTags.find((tag, index) => index > currentIndex && tag.id !== selectedPlaceTag.id) ||
          pendingPlaceTags.find((tag) => tag.id !== selectedPlaceTag.id)
        : pendingPlaceTags[0] ?? null;

    if (nextTag) {
      setSelectedPlaceTag(nextTag);
      setPlaceTagRejectReason('');
    }
  }, [pendingPlaceTags, selectedPlaceTag]);

  useEffect(() => {
    if (activeTab !== 'placeTags' || !selectedPlaceTag || !isTagsAuthorized) {
      return;
    }

    const handleKeydown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || processingPlaceTag) {
        return;
      }

      const target = event.target as HTMLElement | null;
      const isTypingSurface =
        target?.isContentEditable ||
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.tagName === 'SELECT';

      if (isTypingSurface) {
        return;
      }

      const key = event.key.toLowerCase();

      if (key === 'a') {
        event.preventDefault();
        void handlePlaceTagAction(selectedPlaceTag.id, 'APPROVE', { openNext: true });
        return;
      }

      if (key === 'r') {
        event.preventDefault();
        handlePlaceTagRejectIntent({ openNext: true });
        return;
      }

      if (key === 'f') {
        event.preventDefault();
        void handlePlaceTagAction(selectedPlaceTag.id, 'FLAG', { openNext: true });
        return;
      }

      if (key === 'n') {
        event.preventDefault();
        selectNextPendingPlaceTag();
      }
    };

    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  }, [
    activeTab,
    handlePlaceTagAction,
    handlePlaceTagRejectIntent,
    isTagsAuthorized,
    processingPlaceTag,
    selectNextPendingPlaceTag,
    selectedPlaceTag,
  ]);

  const populatePlaceForm = useCallback((place: AdminPlace | null) => {
    if (!place) {
      setPlaceForm(EMPTY_PLACE_FORM);
      return;
    }

    setPlaceForm({
      id: place.id,
      slug: place.slug,
      name: place.name,
      description: place.description ?? '',
      address: place.address ?? '',
      city: place.city ?? '',
      country: place.country ?? '',
      latitude: String(place.latitude),
      longitude: String(place.longitude),
      status: place.status,
      isPartner: place.isPartner,
      partnerTier: place.partnerTier ?? '',
      placeSource: place.placeSource ?? '',
      externalPlaceId: place.externalPlaceId ?? '',
      categories: place.categories.join(', '),
    });
  }, []);

  useEffect(() => {
    populatePlaceForm(selectedPlaceRecord);
  }, [populatePlaceForm, selectedPlaceRecord]);

  const fetchPlaces = useCallback(async (query?: string) => {
    if (!hasAdminAuth) return;

    setPlacesLoading(true);
    setPlacesError(null);

    try {
      if (!(await ensureAdminAccess())) {
        setIsTagsAuthorized(false);
        setPlacesError('Invalid admin secret');
        return;
      }

      const url = new URL('/api/admin/places', window.location.origin);
      if (query?.trim()) {
        url.searchParams.set('q', query.trim());
      }

      const res = await fetch(url.toString(), {
        headers: adminAuthHeaders,
      });

      const data = await res.json();

      if (data.success) {
        const nextPlaces = data.data.places as AdminPlace[];
        setIsTagsAuthorized(true);
        setPlaces(nextPlaces);
        setSelectedPlaceRecord((current) => {
          if (!nextPlaces.length) return null;
          const targetedPlace = adminRoute.targetPlaceId
            ? nextPlaces.find((place) =>
                place.id === adminRoute.targetPlaceId || place.slug === adminRoute.targetPlaceId
              )
            : null;
          if (targetedPlace) return targetedPlace;
          if (current) {
            const preservedPlace = nextPlaces.find((place) => place.id === current.id);
            if (preservedPlace) return preservedPlace;
          }
          return nextPlaces[0];
        });
      } else if (res.status === 401) {
        setIsTagsAuthorized(false);
        setPlacesError('Invalid admin secret');
      } else {
        setPlacesError(data.error || 'Failed to load places');
      }
    } catch {
      setPlacesError('Failed to connect to server');
    } finally {
      setPlacesLoading(false);
    }
  }, [adminAuthHeaders, adminRoute.targetPlaceId, ensureAdminAccess, hasAdminAuth]);

  const handleSavePlace = async () => {
    if (!hasAdminAuth) return;

    setSavingPlace(true);
    setPlacesError(null);

    try {
      if (!(await ensureAdminAccess())) {
        setPlacesError('Invalid admin secret');
        return;
      }

      const res = await fetch('/api/admin/places', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...adminAuthHeaders,
        },
        body: JSON.stringify({
          id: placeForm.id || undefined,
          slug: placeForm.slug || undefined,
          name: placeForm.name,
          description: placeForm.description || null,
          address: placeForm.address || null,
          city: placeForm.city || null,
          country: placeForm.country || null,
          latitude: Number(placeForm.latitude),
          longitude: Number(placeForm.longitude),
          status: placeForm.status,
          isPartner: placeForm.isPartner,
          partnerTier: placeForm.partnerTier || null,
          placeSource: placeForm.placeSource || null,
          externalPlaceId: placeForm.externalPlaceId || null,
          categories: placeForm.categories
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean),
        }),
      });

      const data = await res.json();

      if (!data.success || !data.data?.place) {
        setPlacesError(data.error || 'Failed to save place');
        return;
      }

      await fetchPlaces(placesSearchQuery);
      const nextPlace = data.data.place as AdminPlace;
      setSelectedPlaceRecord((current) => (current?.id === nextPlace.id ? { ...current, ...nextPlace } : nextPlace));
      setPlaceForm((current) => ({ ...current, id: nextPlace.id, slug: nextPlace.slug }));
    } catch {
      setPlacesError('Failed to save place');
    } finally {
      setSavingPlace(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'placeTags' && hasReadyAdminAuth && (!isTagsAuthorized || pendingPlaceTags.length === 0)) {
      fetchPendingPlaceTags();
    }
  }, [activeTab, hasReadyAdminAuth, isTagsAuthorized, pendingPlaceTags.length, fetchPendingPlaceTags]);

  useEffect(() => {
    if (activeTab === 'places' && hasReadyAdminAuth && (!isTagsAuthorized || places.length === 0)) {
      fetchPlaces(placesSearchQuery);
    }
  }, [activeTab, hasReadyAdminAuth, isTagsAuthorized, places.length, placesSearchQuery, fetchPlaces]);

  // Fetch pending claims (uses moderator wallet auth, same as moderation queue)
  const fetchPendingClaims = useCallback(async () => {
    if (!hasAdminAuth) return;

    setClaimsLoading(true);
    setClaimsError(null);

    try {
      const res = await fetch('/api/admin/claims?status=PENDING', {
        headers: adminAuthHeaders,
      });

      const data = await res.json();

      if (data.success) {
        const claims = data.data.claims as ClaimRequest[];
        setPendingClaims(claims);
        setSelectedClaim((current) => {
          if (!claims.length) return null;
          const targetedClaim = adminRoute.targetClaimId
            ? claims.find((claim) => claim.id === adminRoute.targetClaimId || claim.shortId === adminRoute.targetClaimId)
            : null;
          if (targetedClaim) return targetedClaim;
          if (!current) return claims[0];
          return claims.find((claim) => claim.id === current.id) ?? claims[0];
        });
      } else {
        setClaimsError(data.error || 'Failed to load pending claims');
      }
    } catch {
      setClaimsError('Failed to connect to server');
    } finally {
      setClaimsLoading(false);
    }
  }, [adminAuthHeaders, adminRoute.targetClaimId, hasAdminAuth]);

  const fetchPendingVenueClaims = useCallback(async () => {
    if (!hasAdminAuth) return;

    setVenueClaimsLoading(true);
    setVenueClaimsError(null);

    try {
      const res = await fetch('/api/admin/venue-claims?status=PENDING', {
        headers: adminAuthHeaders,
      });

      const data = await res.json();

      if (data.success) {
        const claims = data.data.claims as VenueClaimRequest[];
        setPendingVenueClaims(claims);
        setSelectedVenueClaim((current) => {
          if (!claims.length) return null;
          const targetedClaim = adminRoute.targetVenueClaimId
            ? claims.find((claim) =>
                claim.id === adminRoute.targetVenueClaimId || claim.slug === adminRoute.targetVenueClaimId
              )
            : null;
          if (targetedClaim) return targetedClaim;
          if (!current) return claims[0];
          return claims.find((claim) => claim.id === current.id) ?? claims[0];
        });
      } else {
        setVenueClaimsError(data.error || 'Failed to load pending venue claims');
      }
    } catch {
      setVenueClaimsError('Failed to connect to server');
    } finally {
      setVenueClaimsLoading(false);
    }
  }, [adminAuthHeaders, adminRoute.targetVenueClaimId, hasAdminAuth]);

  const fetchPushDiagnostics = useCallback(async () => {
    if (!hasAdminAuth) return;

    try {
      setPushLoading(true);
      setPushError(null);

      const res = await fetch('/api/admin/push', {
        headers: adminAuthHeaders,
      });

      const data = await res.json();

      if (data.success) {
        setPushSummary(data.data.summary);
        setPushTopicMix(data.data.topicMix ?? []);
        setPushDeliveries(data.data.recentDeliveries ?? []);
      } else {
        setPushError(data.error || 'Failed to load push diagnostics');
      }
    } catch {
      setPushError('Failed to connect to server');
    } finally {
      setPushLoading(false);
    }
  }, [adminAuthHeaders, hasAdminAuth]);

  const handleAdminPushSend = useCallback(async () => {
    if (!hasAdminAuth) return;

    setAdminPushSending(true);
    setAdminPushResult(null);
    setPushError(null);

    try {
      if (!(await ensureAdminAccess())) {
        setPushError('Invalid admin secret');
        return;
      }

      const res = await fetch('/api/admin/push', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...adminAuthHeaders,
        },
        body: JSON.stringify({
          wallet: adminPushForm.wallet,
          topic: adminPushForm.topic,
          title: adminPushForm.title,
          body: adminPushForm.body,
          url: adminPushForm.url,
        }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setPushError(data.error || 'Failed to send push');
        setAdminPushResult(data.data ?? null);
        return;
      }

      setAdminPushResult(data.data);
      await fetchPushDiagnostics();
    } catch {
      setPushError('Failed to send push');
    } finally {
      setAdminPushSending(false);
    }
  }, [adminAuthHeaders, adminPushForm, ensureAdminAccess, fetchPushDiagnostics, hasAdminAuth]);

  const fetchReportLeads = useCallback(async () => {
    if (!hasAdminAuth) return;

    setReportLeadsLoading(true);
    setReportLeadsError(null);

    try {
      const res = await fetch('/api/admin/venue-report-leads', {
        headers: adminAuthHeaders,
      });

      const data = await res.json();

      if (data.success) {
        const nextLeads = data.data.leads ?? [];
        setReportLeadSummary(data.data.summary ?? {
          totalLeads: 0,
          newLeads: 0,
          activeFollowUps: 0,
          overdue: 0,
          unowned: 0,
          venueAudience: 0,
          sponsorAudience: 0,
          claimStarted: 0,
          activationsLaunched: 0,
          repeatsLaunched: 0,
        });
        setReportLeads(nextLeads);
        setSelectedReportLead((current) => {
          if (!nextLeads.length) return null;
          const targetedLead = adminRoute.targetReportLeadId
            ? nextLeads.find((lead: VenueReportLeadEntry) => lead.id === adminRoute.targetReportLeadId)
            : null;
          if (targetedLead) return targetedLead;
          if (!current) return nextLeads[0];
          return nextLeads.find((lead: VenueReportLeadEntry) => lead.id === current.id) || nextLeads[0];
        });
      } else {
        setReportLeadsError(data.error || 'Failed to load report leads');
      }
    } catch {
      setReportLeadsError('Failed to connect to server');
    } finally {
      setReportLeadsLoading(false);
    }
  }, [adminAuthHeaders, adminRoute.targetReportLeadId, hasAdminAuth]);

  const handleReportLeadUpdate = useCallback(async (
    leadId: string,
    update: {
      followUpStatus?: VenueReportLeadEntry['followUpStatus'];
      ownerWallet?: string | null;
      nextActionAt?: string | null;
    }
  ) => {
    if (!hasAdminAuth) return;

    setReportLeadUpdating(leadId);
    try {
      const res = await fetch('/api/admin/venue-report-leads', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...adminAuthHeaders,
        },
        body: JSON.stringify({
          leadId,
          ...update,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        setReportLeadsError(data.error || 'Failed to update report lead');
        return;
      }

      setReportLeads((prev) =>
        prev.map((lead) =>
          lead.id === leadId
            ? {
                ...lead,
                followUpStatus: data.data.followUpStatus ?? lead.followUpStatus,
                ownerWallet: data.data.ownerWallet ?? null,
                nextActionAt: data.data.nextActionAt ?? lead.nextActionAt,
              }
            : lead
        )
      );
      setSelectedReportLead((current) =>
        current?.id === leadId
          ? {
              ...current,
              followUpStatus: data.data.followUpStatus ?? current.followUpStatus,
              ownerWallet: data.data.ownerWallet ?? null,
              nextActionAt: data.data.nextActionAt ?? current.nextActionAt,
            }
          : current
      );
      void fetchReportLeads();
    } catch {
      setReportLeadsError('Failed to update report lead');
    } finally {
      setReportLeadUpdating(null);
    }
  }, [adminAuthHeaders, fetchReportLeads, hasAdminAuth]);

  const visibleReportLeads = reportLeads.filter((lead) => {
    if (leadInboxFilter === 'needsOwner') {
      return !lead.ownerWallet;
    }
    if (leadInboxFilter === 'mine') {
      return Boolean(address) && lead.ownerWallet?.toLowerCase() === address?.toLowerCase();
    }
    if (leadInboxFilter === 'overdue') {
      return lead.priority.isOverdue;
    }
    if (leadInboxFilter === 'highSignal') {
      return lead.priority.score >= 50;
    }
    return true;
  });

  // Handle claim decision
  const handleClaimDecision = async (dareId: string, decision: 'APPROVE' | 'REJECT') => {
    if (!hasAdminAuth) return;

    setProcessingClaim(dareId);

    try {
      const res = await fetch('/api/admin/claims', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...adminAuthHeaders,
        },
        body: JSON.stringify({
          dareId,
          decision,
          reason: decision === 'REJECT' ? claimRejectReason || undefined : undefined,
        }),
      });

      const data = await res.json();

      if (data.success) {
        // Remove from list
        setPendingClaims((prev) => prev.filter((c) => c.id !== dareId));
        setSelectedClaim(null);
        setClaimRejectReason('');
      } else {
        setClaimsError(data.error || 'Failed to process claim');
      }
    } catch {
      setClaimsError('Failed to submit decision');
    } finally {
      setProcessingClaim(null);
    }
  };

  const handleVenueClaimDecision = async (venueId: string, decision: 'APPROVE' | 'REJECT') => {
    if (!hasAdminAuth) return;

    setProcessingVenueClaim(venueId);

    try {
      const res = await fetch('/api/admin/venue-claims', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...adminAuthHeaders,
        },
        body: JSON.stringify({
          venueId,
          decision,
          reason: decision === 'REJECT' ? venueClaimRejectReason || undefined : undefined,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setPendingVenueClaims((prev) => prev.filter((claim) => claim.id !== venueId));
        setSelectedVenueClaim(null);
        setVenueClaimRejectReason('');
      } else {
        setVenueClaimsError(data.error || 'Failed to process venue claim');
      }
    } catch {
      setVenueClaimsError('Failed to submit venue claim decision');
    } finally {
      setProcessingVenueClaim(null);
    }
  };

  // Load claims when tab switches
  useEffect(() => {
    if (activeTab === 'claims' && isAuthorized) {
      fetchPendingClaims();
    }
  }, [activeTab, isAuthorized, fetchPendingClaims]);

  useEffect(() => {
    if (activeTab === 'venueClaims' && isAuthorized) {
      fetchPendingVenueClaims();
    }
  }, [activeTab, isAuthorized, fetchPendingVenueClaims]);

  useEffect(() => {
    if (activeTab === 'push' && isAuthorized) {
      fetchPushDiagnostics();
    }
  }, [activeTab, isAuthorized, fetchPushDiagnostics]);

  useEffect(() => {
    if (activeTab === 'reportLeads' && isAuthorized) {
      fetchReportLeads();
    }
  }, [activeTab, isAuthorized, fetchReportLeads]);

  // Handle moderation decision
  const handleModerate = useCallback(async (
    dareId: string,
    decision: 'APPROVE' | 'REJECT',
    options?: { openNext?: boolean }
  ) => {
    if (!hasAdminAuth) {
      setModerationActionError('Connect an authorized moderator wallet or enter the admin secret before taking action.');
      return;
    }

    setError(null);
    setModerationActionError(null);
    setModerationActionNotice(null);
    setModerating(dareId);
    const openNext = options?.openNext ?? false;
    const currentIndex = dares.findIndex((dare) => dare.id === dareId);
    const nextDareCandidate =
      currentIndex >= 0
        ? dares.find((dare, index) => index > currentIndex && dare.id !== dareId) ||
          dares.find((dare) => dare.id !== dareId)
        : null;

    try {
      const res = await fetch('/api/admin/moderate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...adminAuthHeaders,
        },
        body: JSON.stringify({
          dareId,
          decision,
          note: moderateNote || undefined,
        }),
      });

      const data = await res.json();

      if (data.success) {
        const remainingDares = dares.filter((d) => d.id !== dareId);
        setDares(remainingDares);
        setQueueSummary(deriveQueueSummary(remainingDares));
        setSelectedDare(openNext ? nextDareCandidate ?? null : null);
        setModerateNote('');
        setModerationActionNotice(
          data.data?.message ||
          (data.data?.newStatus === 'PENDING_PAYOUT'
            ? 'Dare approved. Payout is queued for retry.'
            : 'Moderation decision saved.')
        );
        await fetchQueue();
      } else {
        const message = data.error || 'Failed to moderate';
        setError(message);
        setModerationActionError(message);

        if (
          /already moderated|not found|pending_payout|verified|failed/i.test(message)
        ) {
          void fetchQueue();
        }
      }
    } catch {
      const message = 'Failed to submit moderation decision';
      setError(message);
      setModerationActionError(message);
    } finally {
      setModerating(null);
    }
  }, [adminAuthHeaders, dares, fetchQueue, hasAdminAuth, moderateNote]);

  const formatAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  useEffect(() => {
    if (activeTab !== 'moderation' || !isAuthorized) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tagName = target?.tagName;
      const isTyping =
        target?.isContentEditable ||
        tagName === 'INPUT' ||
        tagName === 'TEXTAREA' ||
        tagName === 'SELECT';

      if (isTyping || moderating) return;

      if (event.key === 'j') {
        event.preventDefault();
        selectRelativeDare(1);
      } else if (event.key === 'k') {
        event.preventDefault();
        selectRelativeDare(-1);
      } else if (event.key === 'a' && selectedDare) {
        event.preventDefault();
        void handleModerate(selectedDare.id, 'APPROVE', { openNext: true });
      } else if (event.key === 'x' && selectedDare) {
        event.preventDefault();
        void handleModerate(selectedDare.id, 'REJECT', { openNext: true });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab, handleModerate, isAuthorized, moderating, selectRelativeDare, selectedDare]);

  useEffect(() => {
    if (activeTab !== 'moderation' || !isAuthorized || !hasAdminAuth) return;

    const intervalId = window.setInterval(() => {
      void fetchQueue();
    }, 15000);

    return () => window.clearInterval(intervalId);
  }, [activeTab, fetchQueue, hasAdminAuth, isAuthorized]);

  return (
    <div className="relative min-h-screen flex flex-col">
      <LiquidBackground />
      <div className="fixed inset-0 z-10 pointer-events-none">
        <GradualBlurOverlay />
      </div>

      <div className="container mx-auto px-4 sm:px-6 py-20 sm:py-24 flex-grow relative z-20 max-w-6xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-full px-4 py-2 mb-4">
            <Shield className="w-4 h-4 text-red-400" />
            <span className="text-sm text-red-400 font-medium tracking-wide">ADMIN PANEL</span>
          </div>

          <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight mb-3">
            Admin{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-orange-400">
              Dashboard
            </span>
          </h1>
          <p className="text-gray-400 font-mono text-sm max-w-md mx-auto">
            Manage moderation, claims, tags, and the place-memory inbox
          </p>

          {/* Tab Switcher */}
          <div className="mt-6 mx-auto flex max-w-xl flex-col gap-3 rounded-2xl border border-white/10 bg-black/35 p-4 text-left sm:flex-row sm:items-end">
            <label className="flex-1">
              <span className="text-[10px] font-black uppercase tracking-[0.24em] text-gray-500">
                Admin secret fallback
              </span>
              <input
                type="password"
                value={adminSecret}
                onChange={(event) => setAdminSecret(event.target.value)}
                placeholder="Optional: paste ADMIN_SECRET"
                className="mt-2 w-full rounded-xl border border-white/10 bg-black/50 px-4 py-2.5 text-sm font-bold text-white outline-none transition focus:border-yellow-400/45"
              />
              <span className="mt-2 flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-gray-500">
                Session-only, never added to links
                {hasSessionAdminSecret && (
                  <button
                    type="button"
                    onClick={() => void clearAdminSecret()}
                    className="text-yellow-200/80 underline-offset-4 hover:text-yellow-100 hover:underline"
                  >
                    Forget
                  </button>
                )}
              </span>
            </label>
            <button
              type="button"
              onClick={() => {
                void fetchQueue();
                void fetchAdminSettings();
              }}
              disabled={!hasAdminAuth || loading}
              className="rounded-xl border border-yellow-400/35 bg-yellow-400 px-4 py-2.5 text-xs font-black uppercase tracking-[0.18em] text-black transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-45"
            >
              Authorize
            </button>
          </div>

          {hasAdminAuth && isAuthorized && (
            <div className="flex justify-center gap-2 mt-6 flex-wrap">
              <button
                onClick={() => selectAdminTab('moderation')}
                className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${
                  activeTab === 'moderation'
                    ? 'bg-purple-500/20 border border-purple-500/50 text-purple-400'
                    : 'bg-white/5 border border-white/10 text-gray-400 hover:text-white'
                }`}
              >
                <Users className="w-4 h-4 inline mr-2" />
                Moderation ({dares.length})
              </button>
              <button
                onClick={() => selectAdminTab('claims')}
                className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${
                  activeTab === 'claims'
                    ? 'bg-yellow-500/20 border border-yellow-500/50 text-yellow-400'
                    : 'bg-white/5 border border-white/10 text-gray-400 hover:text-white'
                }`}
              >
                <Hand className="w-4 h-4 inline mr-2" />
                Claims {pendingClaims.length > 0 && `(${pendingClaims.length})`}
              </button>
              <button
                onClick={() => selectAdminTab('venueClaims')}
                className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${
                  activeTab === 'venueClaims'
                    ? 'bg-fuchsia-500/20 border border-fuchsia-500/50 text-fuchsia-300'
                    : 'bg-white/5 border border-white/10 text-gray-400 hover:text-white'
                }`}
              >
                <MapPin className="w-4 h-4 inline mr-2" />
                Venue Claims {pendingVenueClaims.length > 0 && `(${pendingVenueClaims.length})`}
              </button>
              <button
                onClick={() => selectAdminTab('reportLeads')}
                className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${
                  activeTab === 'reportLeads'
                    ? 'bg-cyan-500/20 border border-cyan-500/50 text-cyan-300'
                    : 'bg-white/5 border border-white/10 text-gray-400 hover:text-white'
                }`}
              >
                <Mail className="w-4 h-4 inline mr-2" />
                Lead Inbox {reportLeadSummary.totalLeads > 0 && `(${reportLeadSummary.totalLeads})`}
              </button>
              <button
                onClick={() => selectAdminTab('tags')}
                className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${
                  activeTab === 'tags'
                    ? 'bg-purple-500/20 border border-purple-500/50 text-purple-400'
                    : 'bg-white/5 border border-white/10 text-gray-400 hover:text-white'
                }`}
              >
                <Tag className="w-4 h-4 inline mr-2" />
                Tags {pendingTags.length > 0 && `(${pendingTags.length})`}
              </button>
              <button
                onClick={() => selectAdminTab('placeTags')}
                className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${
                  activeTab === 'placeTags'
                    ? 'bg-cyan-500/20 border border-cyan-500/50 text-cyan-300'
                    : 'bg-white/5 border border-white/10 text-gray-400 hover:text-white'
                }`}
              >
                <Tag className="w-4 h-4 inline mr-2" />
                Chaos Inbox {pendingPlaceTags.length > 0 && `(${pendingPlaceTags.length})`}
              </button>
              <button
                onClick={() => selectAdminTab('places')}
                className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${
                  activeTab === 'places'
                    ? 'bg-emerald-500/20 border border-emerald-500/50 text-emerald-300'
                    : 'bg-white/5 border border-white/10 text-gray-400 hover:text-white'
                }`}
              >
                <MapPin className="w-4 h-4 inline mr-2" />
                Places
              </button>
              <button
                onClick={() => selectAdminTab('push')}
                className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${
                  activeTab === 'push'
                    ? 'bg-cyan-500/20 border border-cyan-500/50 text-cyan-300'
                    : 'bg-white/5 border border-white/10 text-gray-400 hover:text-white'
                }`}
              >
                <Smartphone className="w-4 h-4 inline mr-2" />
                Push Ops
              </button>
              <Link
                href="/admin/production-safety"
                className="px-6 py-2.5 rounded-xl font-bold text-sm transition-all bg-yellow-500/10 border border-yellow-400/35 text-yellow-200 hover:bg-yellow-400/15"
              >
                <Shield className="w-4 h-4 inline mr-2" />
                Production Safety
              </Link>
              <Link
                href="/admin/founder-scoreboard"
                className="px-6 py-2.5 rounded-xl font-bold text-sm transition-all bg-emerald-500/10 border border-emerald-300/35 text-emerald-100 hover:bg-emerald-400/15"
              >
                <DollarSign className="w-4 h-4 inline mr-2" />
                Founder Scoreboard
              </Link>
              <Link
                href="/admin/daily-command-loop"
                className="px-6 py-2.5 rounded-xl font-bold text-sm transition-all bg-cyan-500/10 border border-cyan-300/35 text-cyan-100 hover:bg-cyan-400/15"
              >
                <Clock className="w-4 h-4 inline mr-2" />
                Daily Command Loop
              </Link>
              <Link
                href="/admin/activation-intakes"
                className="px-6 py-2.5 rounded-xl font-bold text-sm transition-all bg-yellow-500/10 border border-yellow-300/35 text-yellow-100 hover:bg-yellow-400/15"
              >
                <DollarSign className="w-4 h-4 inline mr-2" />
                Activation Intakes
              </Link>
              <Link
                href="/admin/inbox"
                className="px-6 py-2.5 rounded-xl font-bold text-sm transition-all bg-emerald-500/10 border border-emerald-300/35 text-emerald-100 hover:bg-emerald-400/15"
              >
                <Mail className="w-4 h-4 inline mr-2" />
                Support Inbox
              </Link>
              <Link
                href="/admin/venue-scout-command"
                className="px-6 py-2.5 rounded-xl font-bold text-sm transition-all bg-yellow-500/10 border border-yellow-300/35 text-yellow-100 hover:bg-yellow-400/15"
              >
                <MapPin className="w-4 h-4 inline mr-2" />
                Venue Scout Command
              </Link>
            </div>
          )}

          {adminRoute.fromDailyCommandLoop && (
            <Link
              href="/admin/daily-command-loop"
              className="mt-4 inline-flex items-center gap-2 rounded-full border border-cyan-300/25 bg-cyan-500/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-cyan-100 transition hover:bg-cyan-500/15"
            >
              <ArrowRight className="h-3.5 w-3.5 rotate-180" />
              Back to Daily Command Loop
            </Link>
          )}
        </div>

        {/* Not Connected State */}
        {!hasAdminAuth && (
          <div className="backdrop-blur-xl bg-yellow-500/5 border border-yellow-500/30 rounded-2xl p-8 text-center">
            <Lock className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Authenticate Admin</h3>
            <p className="text-gray-400 text-sm">
              Connect your moderator wallet or paste the admin secret to access the admin panel.
            </p>
          </div>
        )}

        {/* Not Authorized State */}
        {hasAdminAuth && !loading && !isAuthorized && (
          <div className="backdrop-blur-xl bg-red-500/5 border border-red-500/30 rounded-2xl p-8 text-center">
            <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Not Authorized</h3>
            <p className="text-gray-400 text-sm mb-4">
              {adminSecretTrimmed || hasSessionAdminSecret
                ? 'The admin secret or admin session was not accepted.'
                : address
                  ? `Your wallet (${formatAddress(address)}) is not registered as a moderator.`
                  : 'Connect a moderator wallet or enter the production admin secret.'}
            </p>
            <p className="text-gray-500 text-xs font-mono">
              Use a signed moderator wallet session or the production ADMIN_SECRET.
            </p>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
          </div>
        )}

        {/* Error State */}
        {error && !loading && isAuthorized && (
          <div className="backdrop-blur-xl bg-red-500/5 border border-red-500/30 rounded-2xl p-4 mb-6">
            <div className="flex items-center gap-3">
              <XCircle className="w-5 h-5 text-red-400" />
              <span className="text-red-400 text-sm">{error}</span>
            </div>
          </div>
        )}

        {/* Authorized Content - Moderation Tab */}
        {hasAdminAuth && isAuthorized && !loading && activeTab === 'moderation' && (
          <div className="space-y-6">
            <div className="backdrop-blur-xl bg-black/20 border border-white/10 rounded-2xl p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.24em] text-gray-500">Sentinel Queue</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className={`rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${
                      adminSettings.sentinelEnabled
                        ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                        : 'border-amber-500/30 bg-amber-500/10 text-amber-200'
                    }`}>
                      {adminSettings.sentinelEnabled ? 'Sentinel live' : 'Sentinel paused'}
                    </span>
                    {settingsLoading ? (
                      <span className="text-xs text-gray-500">Loading settings...</span>
                    ) : null}
                  </div>
                  <p className="mt-2 text-sm text-gray-400">
                    {adminSettings.sentinelEnabled
                      ? 'Creators can still request Sentinel verification.'
                      : formatSentinelPausedMessage(adminSettings.sentinelPausedReason)}
                  </p>
                  <p className="mt-2 text-xs text-gray-500">
                    Current Sentinel queue: {sentinelQueueCount} pending review{sentinelQueueCount === 1 ? '' : 's'}.
                  </p>
                  <div className="mt-4 max-w-md space-y-2">
                    <label className="flex flex-col gap-2 text-xs text-gray-400">
                      Pause reason
                      <input
                        type="text"
                        maxLength={160}
                        value={sentinelPauseReasonDraft}
                        onChange={(event) => setSentinelPauseReasonDraft(event.target.value)}
                        placeholder="Queue too hot, maintenance window, referee offline..."
                        className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none transition focus:border-amber-400/60"
                      />
                    </label>
                    <p className="text-[11px] text-gray-500">
                      This reason is shown in the create flow and included in the Telegram pause alert.
                    </p>
                  </div>
                  <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
                    <label className="flex max-w-[220px] flex-col gap-2 text-xs text-gray-400">
                      Queue alert threshold
                      <input
                        type="number"
                        min={1}
                        step={1}
                        value={sentinelThresholdDraft}
                        onChange={(event) => setSentinelThresholdDraft(event.target.value)}
                        className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm font-semibold text-white outline-none transition focus:border-cyan-400/60"
                      />
                    </label>
                    <button
                      onClick={() => void handleSentinelThresholdSave()}
                      disabled={settingsSaving || settingsLoading}
                      className="inline-flex items-center justify-center rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-3 text-sm font-bold text-cyan-200 transition hover:bg-cyan-500/20 disabled:opacity-60"
                    >
                      Save threshold
                    </button>
                  </div>
                  <p className="mt-2 text-xs text-gray-500">
                    Telegram sends one queue alert when pending Sentinel reviews reach this number, then cools
                    down for 45 minutes before sending another.
                  </p>
                  {adminSettings.lastSentinelQueueAlertSent ? (
                    <p className="mt-1 text-xs text-gray-500">
                      Last queue alert: {formatRelativeTime(adminSettings.lastSentinelQueueAlertSent)}
                    </p>
                  ) : null}
                  <div className="mt-5 rounded-2xl border border-cyan-400/15 bg-cyan-500/[0.05] p-4">
                    <p className="text-[11px] uppercase tracking-[0.22em] text-cyan-200/70">Venue Lead Nudges</p>
                    <p className="mt-2 text-sm text-gray-300">
                      Alert operators when high-signal venue report leads are overdue or still unowned.
                    </p>
                    <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
                      <label className="flex max-w-[220px] flex-col gap-2 text-xs text-gray-400">
                        Lead alert threshold
                        <input
                          type="number"
                          min={1}
                          step={1}
                          value={venueLeadThresholdDraft}
                          onChange={(event) => setVenueLeadThresholdDraft(event.target.value)}
                          className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm font-semibold text-white outline-none transition focus:border-cyan-400/60"
                        />
                      </label>
                      <button
                        onClick={() => void handleVenueLeadThresholdSave()}
                        disabled={settingsSaving || settingsLoading}
                        className="inline-flex items-center justify-center rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-3 text-sm font-bold text-cyan-200 transition hover:bg-cyan-500/20 disabled:opacity-60"
                      >
                        Save threshold
                      </button>
                      <button
                        onClick={() => void handleRunLeadAlertScan()}
                        disabled={leadAlertRunning || settingsLoading}
                        className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] px-4 py-3 text-sm font-bold text-white/80 transition hover:bg-white/[0.1] hover:text-white disabled:opacity-60"
                      >
                        {leadAlertRunning ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          'Run scan now'
                        )}
                      </button>
                    </div>
                    <p className="mt-3 text-xs text-gray-500">
                      Last lead alert: {adminSettings.lastVenueLeadAlertSent ? formatRelativeTime(adminSettings.lastVenueLeadAlertSent) : 'never'}.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => void handleSentinelToggle()}
                  disabled={settingsSaving || settingsLoading}
                  className={`inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-bold transition-all disabled:opacity-60 ${
                    adminSettings.sentinelEnabled
                      ? 'border-amber-500/40 bg-amber-500/10 text-amber-200 hover:bg-amber-500/20'
                      : 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20'
                  }`}
                >
                  {settingsSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />}
                  {adminSettings.sentinelEnabled ? 'Pause Sentinel' : 'Resume Sentinel'}
                </button>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
              <div className="backdrop-blur-xl bg-black/20 border border-white/10 rounded-2xl p-4">
                <p className="text-[11px] uppercase tracking-[0.24em] text-gray-500">Proof Queue</p>
                <p className="mt-2 text-3xl font-black text-white">{dares.length}</p>
              </div>
              <div className="backdrop-blur-xl bg-black/20 border border-white/10 rounded-2xl p-4">
                <p className="text-[11px] uppercase tracking-[0.24em] text-gray-500">Ready Now</p>
                <p className="mt-2 text-3xl font-black text-emerald-300">{queueSummary.readyNow}</p>
              </div>
              <div className="backdrop-blur-xl bg-black/20 border border-white/10 rounded-2xl p-4">
                <p className="text-[11px] uppercase tracking-[0.24em] text-gray-500">Campaign-Backed Hot</p>
                <p className="mt-2 text-3xl font-black text-cyan-300">{queueSummary.campaignBackedReady}</p>
              </div>
              <div className="backdrop-blur-xl bg-black/20 border border-white/10 rounded-2xl p-4">
                <p className="text-[11px] uppercase tracking-[0.24em] text-gray-500">Oldest Proof</p>
                <p className="mt-2 text-3xl font-black text-orange-300">{formatProofAge(queueSummary.oldestProofHours)}</p>
              </div>
              <div className={`backdrop-blur-xl rounded-2xl p-4 border ${payoutBacklogSummary.total > 0 ? 'bg-amber-500/10 border-amber-500/30' : 'bg-black/20 border-white/10'}`}>
                <p className="text-[11px] uppercase tracking-[0.24em] text-gray-500">Payout Backlog</p>
                <p className={`mt-2 text-3xl font-black ${payoutBacklogSummary.total > 0 ? 'text-amber-200' : 'text-white'}`}>
                  {payoutBacklogSummary.total}
                </p>
              </div>
              <div className={`backdrop-blur-xl rounded-2xl p-4 border ${payoutBacklogSummary.total > 0 ? 'bg-red-500/10 border-red-500/30' : 'bg-black/20 border-white/10'}`}>
                <p className="text-[11px] uppercase tracking-[0.24em] text-gray-500">Oldest Retry</p>
                <p className={`mt-2 text-3xl font-black ${payoutBacklogSummary.total > 0 ? 'text-red-200' : 'text-white'}`}>
                  {payoutBacklogSummary.total > 0 ? formatProofAge(payoutBacklogSummary.oldestQueuedHours) : 'none'}
                </p>
              </div>
            </div>

            {payoutBacklogSummary.total > 0 ? (
              <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-5 py-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.24em] text-amber-200/80">Payout Retry Backlog</p>
                    <p className="mt-2 text-sm text-amber-50">
                      {payoutBacklogSummary.total} approved {payoutBacklogSummary.total === 1 ? 'dare is' : 'dares are'} waiting on payout retry.
                      {payoutBacklogSummary.missingOnChainId > 0
                        ? ` ${payoutBacklogSummary.missingOnChainId} ${payoutBacklogSummary.missingOnChainId === 1 ? 'entry is' : 'entries are'} missing an on-chain dare ID and likely need funding-sync repair.`
                        : ' Automatic retry should clear the rest once referee wallet and cron are healthy.'}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 text-[10px] uppercase tracking-[0.18em] text-amber-100/80">
                    <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-1">
                      backlog {payoutBacklogSummary.total}
                    </span>
                    <span className="rounded-full border border-red-400/30 bg-red-400/10 px-2 py-1">
                      oldest {formatProofAge(payoutBacklogSummary.oldestQueuedHours)}
                    </span>
                    <span className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-2 py-1">
                      campaign-backed {payoutBacklogSummary.campaignBacked}
                    </span>
                  </div>
                </div>
              </div>
            ) : null}

          <div className="grid lg:grid-cols-2 gap-6">
            {/* Queue List */}
            <div className="backdrop-blur-xl bg-black/20 border border-white/10 rounded-2xl p-6">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-400" />
                Pending Review ({dares.length})
              </h3>
              <div className="mb-4 flex flex-wrap gap-2 text-[10px] uppercase tracking-[0.18em] text-gray-400">
                <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1">J next</span>
                <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1">K previous</span>
                <span className="rounded-full border border-green-500/20 bg-green-500/10 px-2 py-1 text-green-300">A approve + next</span>
                <span className="rounded-full border border-red-500/20 bg-red-500/10 px-2 py-1 text-red-300">X reject + next</span>
              </div>

              {dares.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-4" />
                  <p className="text-gray-400">All caught up! No dares pending review.</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                  {dares.map((dare) => (
                    <div
                      key={dare.id}
                      onClick={() => setSelectedDare(dare)}
                      className={`p-4 rounded-xl border cursor-pointer transition-all ${
                        selectedDare?.id === dare.id
                          ? 'bg-purple-500/10 border-purple-500/50'
                          : 'bg-white/5 border-white/10 hover:bg-white/10'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <h4 className="font-bold text-white text-sm line-clamp-1">{dare.title}</h4>
                        <span
                          className={`px-2 py-1 text-[10px] font-bold uppercase rounded ${
                            dare.status === 'PENDING_REVIEW'
                              ? 'bg-orange-500/20 text-orange-400'
                              : 'bg-yellow-500/20 text-yellow-400'
                          }`}
                        >
                          {dare.status}
                        </span>
                      </div>

                      <SentinelBadge
                        requireSentinel={dare.requireSentinel}
                        sentinelVerified={dare.sentinelVerified}
                        className="mb-2"
                      />

                      <div className="mb-2 flex flex-wrap gap-2 text-[10px] uppercase tracking-[0.18em]">
                        <span
                          className={`rounded-full border px-2 py-1 ${
                            dare.status === 'PENDING_REVIEW'
                              ? 'border-orange-500/30 bg-orange-500/10 text-orange-300'
                              : dare.readyForDecision
                                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                                : 'border-yellow-500/30 bg-yellow-500/10 text-yellow-300'
                          }`}
                        >
                          {dare.status === 'PENDING_REVIEW'
                            ? 'referee now'
                            : dare.readyForDecision
                              ? 'decision ready'
                              : 'watching votes'}
                        </span>
                        {dare.linkedCampaign ? (
                          <span className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2 py-1 text-cyan-300">
                            {dare.linkedCampaign.brandName ? `${dare.linkedCampaign.brandName} campaign` : 'campaign-backed'}
                          </span>
                        ) : null}
                        {dare.venue ? (
                          <span className="rounded-full border border-fuchsia-500/30 bg-fuchsia-500/10 px-2 py-1 text-fuchsia-300">
                            {dare.venue.name}
                          </span>
                        ) : null}
                        <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-gray-400">
                          proof {formatRelativeTime(dare.updatedAt)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="text-gray-400">
                          {dare.streamerHandle || '@everyone'}
                        </span>
                        <span className="text-[#FFD700] font-bold">${dare.bounty}</span>
                      </div>
                      <p className="mt-2 text-[11px] text-gray-500">{dare.priorityReason}</p>

                      {/* Vote Bar */}
                      <div className="mt-3">
                        <div className="flex items-center justify-between text-[10px] text-gray-400 mb-1">
                          <span className="text-green-400">{dare.votes.approve} pass</span>
                          <span className="text-red-400">{dare.votes.reject} fail</span>
                        </div>
                        <div className="h-2 bg-white/10 rounded-full overflow-hidden flex">
                          {dare.votes.total > 0 && (
                            <>
                              <div
                                className="h-full bg-green-500"
                                style={{ width: `${dare.votes.approvePercent}%` }}
                              />
                              <div
                                className="h-full bg-red-500"
                                style={{ width: `${100 - dare.votes.approvePercent}%` }}
                              />
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {payoutBacklog.length > 0 ? (
                <div className="mt-6 border-t border-white/10 pt-6">
                  <h4 className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.18em] text-amber-200">
                    <AlertTriangle className="h-4 w-4" />
                    Payout Retry Queue ({payoutBacklog.length})
                  </h4>
                  <div className="mt-4 space-y-3">
                    {payoutBacklog.slice(0, 6).map((dare) => (
                      <Link
                        key={dare.id}
                        href={`/dare/${dare.shortId || dare.id}`}
                        className="block rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 transition hover:border-amber-400/40 hover:bg-amber-500/10"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-bold text-white line-clamp-1">{dare.title}</p>
                            <p className="mt-1 text-xs text-amber-100/70">
                              {dare.streamerHandle || '@everyone'} • ${dare.bounty}
                            </p>
                          </div>
                          <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-amber-200">
                            payout queued
                          </span>
                        </div>
                        <p className="mt-3 text-xs text-amber-50/85">{dare.queueReason}</p>
                        <div className="mt-3 flex flex-wrap gap-2 text-[10px] uppercase tracking-[0.16em]">
                          <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-gray-300">
                            queued {formatProofAge(dare.queuedHours)}
                          </span>
                          {dare.linkedCampaign ? (
                            <span className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2 py-1 text-cyan-300">
                              {dare.linkedCampaign.brandName ? `${dare.linkedCampaign.brandName} campaign` : 'campaign-backed'}
                            </span>
                          ) : null}
                          {!dare.onChainDareId ? (
                            <span className="rounded-full border border-red-500/30 bg-red-500/10 px-2 py-1 text-red-300">
                              missing chain id
                            </span>
                          ) : null}
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>

            {/* Selected Dare Details */}
            <div className="backdrop-blur-xl bg-black/20 border border-white/10 rounded-2xl p-6">
              {selectedDare ? (
                <>
                  <h3 className="text-lg font-bold text-white mb-4">Review Dare</h3>

                  {/* Video Preview */}
                  {selectedDare.videoUrl && (
                    <div className="mb-4 rounded-xl overflow-hidden bg-black/40 aspect-video flex items-center justify-center">
                      <a
                        href={selectedDare.videoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-purple-400 hover:text-purple-300"
                      >
                        <Play className="w-8 h-8" />
                        <span className="text-sm font-mono">View Proof</span>
                      </a>
                    </div>
                  )}

                  {/* Details */}
                  <div className="space-y-3 mb-6">
                    <div className="p-3 bg-white/5 rounded-lg">
                      <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Mission</p>
                      <p className="text-white font-bold">{selectedDare.title}</p>
                      <SentinelBadge
                        requireSentinel={selectedDare.requireSentinel}
                        sentinelVerified={selectedDare.sentinelVerified}
                        className="mt-2"
                      />
                    </div>

                    {selectedDare.linkedCampaign || selectedDare.venue ? (
                      <div className="grid grid-cols-1 gap-3">
                        {selectedDare.linkedCampaign ? (
                          <div className="p-3 bg-cyan-500/10 border border-cyan-500/20 rounded-lg">
                            <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Campaign Context</p>
                            <p className="text-cyan-200 font-bold">
                              {selectedDare.linkedCampaign.brandName
                                ? `${selectedDare.linkedCampaign.brandName} • ${selectedDare.linkedCampaign.title}`
                                : selectedDare.linkedCampaign.title}
                            </p>
                          </div>
                        ) : null}
                        {selectedDare.venue ? (
                          <div className="p-3 bg-fuchsia-500/10 border border-fuchsia-500/20 rounded-lg">
                            <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Venue</p>
                            <div className="flex items-center justify-between gap-3">
                              <p className="text-fuchsia-200 font-bold">
                                {selectedDare.venue.name}
                                {selectedDare.venue.city ? ` • ${selectedDare.venue.city}` : ''}
                              </p>
                              <Link
                                href={`/venues/${selectedDare.venue.slug}`}
                                className="inline-flex items-center gap-1 text-xs text-fuchsia-200 hover:text-fuchsia-100"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                                Open
                              </Link>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    ) : null}

                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 bg-white/5 rounded-lg">
                        <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Bounty</p>
                        <p className="text-[#FFD700] font-bold flex items-center gap-1">
                          <DollarSign className="w-4 h-4" />
                          {selectedDare.bounty} USDC
                        </p>
                      </div>
                      <div className="p-3 bg-white/5 rounded-lg">
                        <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Votes</p>
                        <p className="text-white font-bold">
                          {selectedDare.votes.total} / {selectedDare.voteThreshold} threshold
                        </p>
                        <p className="mt-1 text-[11px] text-gray-500">
                          proof {formatRelativeTime(selectedDare.updatedAt)}
                        </p>
                      </div>
                    </div>

                    <div className="p-3 bg-white/5 rounded-lg">
                      <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">
                        Community Verdict
                      </p>
                      <div className="flex items-center gap-4">
                        <span className="text-green-400 font-bold">
                          {selectedDare.votes.approvePercent}% Pass
                        </span>
                        <span className="text-red-400 font-bold">
                          {100 - selectedDare.votes.approvePercent}% Fail
                        </span>
                      </div>
                    </div>

                    <div className="p-3 bg-white/5 rounded-lg">
                      <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Operator Read</p>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-300">
                          {selectedDare.queueStage === 'REFEREE' ? 'Referee Review' : 'Community Signal'}
                        </span>
                        <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-300">
                          proof age {formatProofAge(selectedDare.proofAgeHours)}
                        </span>
                        {selectedDare.linkedCampaign ? (
                          <span className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-cyan-200">
                            campaign-backed
                          </span>
                        ) : null}
                        {selectedDare.manualReviewNeeded ? (
                          <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-200">
                            sentinel queue
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-2 text-sm text-gray-300">{selectedDare.priorityReason}</p>
                    </div>

                    {selectedDare.targetWalletAddress && (
                      <div className="p-3 bg-white/5 rounded-lg">
                        <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">
                          Payout To
                        </p>
                        <p className="text-purple-400 font-mono text-sm">
                          {formatAddress(selectedDare.targetWalletAddress)}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Moderator Note */}
                  <div className="mb-4">
                    <label className="text-xs text-gray-400 uppercase tracking-wider block mb-2">
                      Note (optional)
                    </label>
                    <textarea
                      value={moderateNote}
                      onChange={(e) => setModerateNote(e.target.value)}
                      placeholder="Add a note about your decision..."
                      className="w-full p-3 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder-gray-500 focus:border-purple-500/50 focus:outline-none resize-none"
                      rows={2}
                    />
                  </div>

                  {moderationActionError ? (
                    <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/8 px-4 py-3">
                      <div className="flex items-start gap-2">
                        <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
                        <p className="text-sm text-red-300">{moderationActionError}</p>
                      </div>
                    </div>
                  ) : null}

                  {moderationActionNotice ? (
                    <div className="mb-4 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3">
                      <div className="flex items-start gap-2">
                        <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                        <p className="text-sm text-emerald-100">{moderationActionNotice}</p>
                      </div>
                    </div>
                  ) : null}

                  {/* Action Buttons */}
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => void handleModerate(selectedDare.id, 'REJECT')}
                      disabled={moderating === selectedDare.id}
                      className="flex items-center justify-center gap-2 px-4 py-3 bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 text-red-400 font-bold text-sm uppercase tracking-wider rounded-xl transition-colors disabled:opacity-50"
                    >
                      {moderating === selectedDare.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <XCircle className="w-4 h-4" />
                      )}
                      Reject
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleModerate(selectedDare.id, 'APPROVE')}
                      disabled={moderating === selectedDare.id}
                      className="flex items-center justify-center gap-2 px-4 py-3 bg-green-500/20 hover:bg-green-500/30 border border-green-500/50 text-green-400 font-bold text-sm uppercase tracking-wider rounded-xl transition-colors disabled:opacity-50"
                    >
                      {moderating === selectedDare.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <CheckCircle className="w-4 h-4" />
                      )}
                      Approve
                    </button>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => void handleModerate(selectedDare.id, 'REJECT', { openNext: true })}
                      disabled={moderating === selectedDare.id}
                      className="flex items-center justify-center gap-2 px-4 py-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-300 font-bold text-[11px] uppercase tracking-[0.18em] rounded-xl transition-colors disabled:opacity-50"
                    >
                      {moderating === selectedDare.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Clock className="w-4 h-4" />}
                      Reject + Next
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleModerate(selectedDare.id, 'APPROVE', { openNext: true })}
                      disabled={moderating === selectedDare.id}
                      className="flex items-center justify-center gap-2 px-4 py-3 bg-green-500/10 hover:bg-green-500/20 border border-green-500/30 text-green-300 font-bold text-[11px] uppercase tracking-[0.18em] rounded-xl transition-colors disabled:opacity-50"
                    >
                      {moderating === selectedDare.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Clock className="w-4 h-4" />}
                      Approve + Next
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center h-full min-h-[400px]">
                  <div className="text-center">
                    <Clock className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                    <p className="text-gray-400">Select a dare to review</p>
                  </div>
                </div>
              )}
            </div>
          </div>
          </div>
        )}

        {/* Authorized Content - Claims Tab */}
        {hasAdminAuth && isAuthorized && !loading && activeTab === 'claims' && (
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Pending Claims List */}
            <div className="backdrop-blur-xl bg-black/20 border border-white/10 rounded-2xl p-6">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Hand className="w-5 h-5 text-yellow-400" />
                Pending Claims ({pendingClaims.length})
              </h3>

              {claimsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 text-yellow-400 animate-spin" />
                </div>
              ) : pendingClaims.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-4" />
                  <p className="text-gray-400">No pending claim requests!</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                  {pendingClaims.map((claim) => (
                    <div
                      key={claim.id}
                      onClick={() => setSelectedClaim(claim)}
                      className={`p-4 rounded-xl border cursor-pointer transition-all ${
                        selectedClaim?.id === claim.id
                          ? 'bg-yellow-500/10 border-yellow-500/50'
                          : 'bg-white/5 border-white/10 hover:bg-white/10'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <h4 className="font-bold text-white text-sm line-clamp-1">{claim.title}</h4>
                        <span className="px-2 py-1 text-[10px] font-bold uppercase rounded bg-yellow-500/20 text-yellow-400 shrink-0">
                          ${claim.bounty}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="text-yellow-400">{claim.claimRequestTag}</span>
                        <span className="text-gray-500">
                          {claim.claimRequestedAt && new Date(claim.claimRequestedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {claimsError && (
                <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                  <p className="text-xs text-red-400">{claimsError}</p>
                </div>
              )}
            </div>

            {/* Selected Claim Details */}
            <div className="backdrop-blur-xl bg-black/20 border border-white/10 rounded-2xl p-6">
              {selectedClaim ? (
                <>
                  <h3 className="text-lg font-bold text-white mb-4">Review Claim Request</h3>

                  {/* Details */}
                  <div className="space-y-3 mb-6">
                    <div className="p-3 bg-white/5 rounded-lg">
                      <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Dare</p>
                      <p className="text-white font-bold">{selectedClaim.title}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 bg-white/5 rounded-lg">
                        <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Bounty</p>
                        <p className="text-[#FFD700] font-bold flex items-center gap-1">
                          <DollarSign className="w-4 h-4" />
                          {selectedClaim.bounty} USDC
                        </p>
                      </div>
                      <div className="p-3 bg-white/5 rounded-lg">
                        <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Expires</p>
                        <p className="text-white font-mono text-sm">
                          {selectedClaim.expiresAt
                            ? new Date(selectedClaim.expiresAt).toLocaleDateString()
                            : 'No expiry'}
                        </p>
                      </div>
                    </div>

                    <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                      <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Requested By</p>
                      <p className="text-yellow-400 font-bold text-lg">{selectedClaim.claimRequestTag}</p>
                      <p className="text-gray-500 font-mono text-xs mt-1">
                        {selectedClaim.claimRequestWallet && formatAddress(selectedClaim.claimRequestWallet)}
                      </p>
                    </div>

                    <div className="p-3 bg-white/5 rounded-lg">
                      <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Requested At</p>
                      <p className="text-gray-300 text-sm">
                        {selectedClaim.claimRequestedAt &&
                          new Date(selectedClaim.claimRequestedAt).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {/* Rejection Reason */}
                  <div className="mb-4">
                    <label className="text-xs text-gray-400 uppercase tracking-wider block mb-2">
                      Rejection Reason (optional)
                    </label>
                    <textarea
                      value={claimRejectReason}
                      onChange={(e) => setClaimRejectReason(e.target.value)}
                      placeholder="Reason for rejection..."
                      className="w-full p-3 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder-gray-500 focus:border-yellow-500/50 focus:outline-none resize-none"
                      rows={2}
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => handleClaimDecision(selectedClaim.id, 'REJECT')}
                      disabled={processingClaim === selectedClaim.id}
                      className="flex items-center justify-center gap-2 px-4 py-3 bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 text-red-400 font-bold text-sm uppercase tracking-wider rounded-xl transition-colors disabled:opacity-50"
                    >
                      {processingClaim === selectedClaim.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <XCircle className="w-4 h-4" />
                      )}
                      Reject
                    </button>
                    <button
                      onClick={() => handleClaimDecision(selectedClaim.id, 'APPROVE')}
                      disabled={processingClaim === selectedClaim.id}
                      className="flex items-center justify-center gap-2 px-4 py-3 bg-green-500/20 hover:bg-green-500/30 border border-green-500/50 text-green-400 font-bold text-sm uppercase tracking-wider rounded-xl transition-colors disabled:opacity-50"
                    >
                      {processingClaim === selectedClaim.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <CheckCircle className="w-4 h-4" />
                      )}
                      Approve
                    </button>
                  </div>

                  <p className="text-xs text-gray-500 text-center mt-4">
                    Approving will assign this dare to {selectedClaim.claimRequestTag}
                  </p>
                </>
              ) : (
                <div className="flex items-center justify-center h-full min-h-[400px]">
                  <div className="text-center">
                    <Hand className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                    <p className="text-gray-400">Select a claim request to review</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Authorized Content - Tags Tab */}
        {hasAdminAuth && isAuthorized && !loading && activeTab === 'tags' && (
          <div className="space-y-6">
            {/* Admin Secret Input */}
            {!isTagsAuthorized && (
              <div className="backdrop-blur-xl bg-black/20 border border-white/10 rounded-2xl p-6 max-w-md mx-auto">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <Lock className="w-5 h-5 text-purple-400" />
                  Admin Authentication
                </h3>
                <p className="text-sm text-gray-400 mb-4">
                  Enter your admin secret to manage tag verifications.
                </p>
                <div className="space-y-3">
                  <input
                    type="password"
                    value={adminSecret}
                    onChange={(e) => setAdminSecret(e.target.value)}
                    placeholder="Enter admin secret..."
                    className="w-full p-3 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder-gray-500 focus:border-purple-500/50 focus:outline-none font-mono"
                  />
                  <button
                    onClick={fetchPendingTags}
                    disabled={!hasAdminAuth || tagsLoading}
                    className="w-full py-3 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/50 text-purple-400 font-bold text-sm uppercase tracking-wider rounded-xl transition-colors disabled:opacity-50"
                  >
                    {tagsLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                    ) : (
                      'Authenticate'
                    )}
                  </button>
                  {tagsError && (
                    <p className="text-xs text-red-400 text-center">{tagsError}</p>
                  )}
                </div>
              </div>
            )}

            {/* Tags Management */}
            {isTagsAuthorized && (
              <div className="grid lg:grid-cols-2 gap-6">
                {/* Pending Tags List */}
                <div className="backdrop-blur-xl bg-black/20 border border-white/10 rounded-2xl p-6">
                  <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <Tag className="w-5 h-5 text-purple-400" />
                    Pending Tags ({pendingTags.length})
                  </h3>

                  {pendingTags.length === 0 ? (
                    <div className="text-center py-12">
                      <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-4" />
                      <p className="text-gray-400">No pending tag verifications!</p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                      {pendingTags.map((tag) => {
                        const platformHandle =
                          tag.identityHandle ||
                          tag.twitterHandle ||
                          tag.twitchHandle ||
                          tag.youtubeHandle ||
                          tag.kickHandle;
                        const platformLabel = formatIdentityPlatformLabel(
                          tag.identityPlatform || tag.verificationMethod
                        );
                        return (
                          <div
                            key={tag.id}
                            onClick={() => setSelectedTag(tag)}
                            className={`p-4 rounded-xl border cursor-pointer transition-all ${
                              selectedTag?.id === tag.id
                                ? 'bg-purple-500/10 border-purple-500/50'
                                : 'bg-white/5 border-white/10 hover:bg-white/10'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3 mb-2">
                              <h4 className="font-bold text-white text-sm">{tag.tag}</h4>
                              <span className="px-2 py-1 text-[10px] font-bold uppercase rounded bg-yellow-500/20 text-yellow-400">
                                {platformLabel}
                              </span>
                            </div>

                            <div className="flex items-center justify-between text-xs font-mono">
                              <span className="text-gray-400">@{platformHandle}</span>
                              <span className="text-gray-500">{formatAddress(tag.walletAddress)}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Selected Tag Details */}
                <div className="backdrop-blur-xl bg-black/20 border border-white/10 rounded-2xl p-6">
                  {selectedTag ? (
                    <>
                      <h3 className="text-lg font-bold text-white mb-4">Verify Tag</h3>

                      {/* Details */}
                      <div className="space-y-3 mb-6">
                        <div className="p-3 bg-white/5 rounded-lg">
                          <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Tag</p>
                          <p className="text-purple-400 font-bold text-xl">{selectedTag.tag}</p>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="p-3 bg-white/5 rounded-lg">
                            <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Platform</p>
                            <p className="text-white font-bold">
                              {formatIdentityPlatformLabel(
                                selectedTag.identityPlatform || selectedTag.verificationMethod
                              )}
                            </p>
                          </div>
                          <div className="p-3 bg-white/5 rounded-lg">
                            <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Handle</p>
                            <p className="text-white font-mono">
                              @{selectedTag.identityHandle || selectedTag.twitterHandle || selectedTag.twitchHandle || selectedTag.youtubeHandle || selectedTag.kickHandle}
                            </p>
                          </div>
                        </div>

                        <div className="p-3 bg-white/5 rounded-lg">
                          <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Wallet</p>
                          <p className="text-gray-300 font-mono text-sm">{selectedTag.walletAddress}</p>
                        </div>

                        {(selectedTag.identityVerificationCode || selectedTag.kickVerificationCode) && (
                          <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                            <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Verification Code</p>
                            <div className="flex items-center gap-2">
                              <code className="text-yellow-400 font-mono font-bold">{selectedTag.identityVerificationCode || selectedTag.kickVerificationCode}</code>
                              <button
                                onClick={() => navigator.clipboard.writeText(selectedTag.identityVerificationCode || selectedTag.kickVerificationCode || '')}
                                className="p-1.5 bg-yellow-500/20 hover:bg-yellow-500/30 rounded transition-colors"
                              >
                                <Copy className="w-3.5 h-3.5 text-yellow-400" />
                              </button>
                            </div>
                            <p className="text-xs text-yellow-400/70 mt-2">
                              Check if this code appears on their profile/bio
                            </p>
                          </div>
                        )}

                        {/* Platform Profile Link */}
                        {(() => {
                          const handle = selectedTag.identityHandle || selectedTag.twitterHandle || selectedTag.twitchHandle || selectedTag.youtubeHandle || selectedTag.kickHandle;
                          const platformUrls: Record<string, string | null> = {
                            TWITTER: `https://twitter.com/${handle}`,
                            TWITCH: `https://twitch.tv/${handle}`,
                            YOUTUBE: `https://youtube.com/@${handle}`,
                            KICK: `https://kick.com/${handle}`,
                            instagram: `https://instagram.com/${handle}`,
                            tiktok: `https://www.tiktok.com/@${handle}`,
                            youtube: `https://youtube.com/@${handle}`,
                            twitter: `https://twitter.com/${handle}`,
                            other: null,
                          };
                          const platformKey = selectedTag.identityPlatform || selectedTag.verificationMethod;
                          const url = platformUrls[platformKey];
                          return url ? (
                            <a
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg text-purple-400 hover:bg-purple-500/20 transition-colors"
                            >
                              <ExternalLink className="w-4 h-4" />
                              <span className="text-sm font-bold">
                                Open {formatIdentityPlatformLabel(platformKey)} Profile
                              </span>
                            </a>
                          ) : null;
                        })()}
                      </div>

                      {/* Rejection Reason */}
                      <div className="mb-4">
                        <label className="text-xs text-gray-400 uppercase tracking-wider block mb-2">
                          Rejection Reason (optional)
                        </label>
                        <textarea
                          value={rejectReason}
                          onChange={(e) => setRejectReason(e.target.value)}
                          placeholder="Code not found on profile..."
                          className="w-full p-3 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder-gray-500 focus:border-purple-500/50 focus:outline-none resize-none"
                          rows={2}
                        />
                      </div>

                      {/* Action Buttons */}
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          onClick={() => handleTagAction(selectedTag.id, 'REJECT_MANUAL')}
                          disabled={processingTag === selectedTag.id}
                          className="flex items-center justify-center gap-2 px-4 py-3 bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 text-red-400 font-bold text-sm uppercase tracking-wider rounded-xl transition-colors disabled:opacity-50"
                        >
                          {processingTag === selectedTag.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <XCircle className="w-4 h-4" />
                          )}
                          Reject
                        </button>
                        <button
                          onClick={() => handleTagAction(selectedTag.id, 'VERIFY_MANUAL')}
                          disabled={processingTag === selectedTag.id}
                          className="flex items-center justify-center gap-2 px-4 py-3 bg-green-500/20 hover:bg-green-500/30 border border-green-500/50 text-green-400 font-bold text-sm uppercase tracking-wider rounded-xl transition-colors disabled:opacity-50"
                        >
                          {processingTag === selectedTag.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <CheckCircle className="w-4 h-4" />
                          )}
                          Verify
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center justify-center h-full min-h-[400px]">
                      <div className="text-center">
                        <Tag className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                        <p className="text-gray-400">Select a tag to review</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Authorized Content - Venue Claims Tab */}
        {hasAdminAuth && isAuthorized && !loading && activeTab === 'venueClaims' && (
          <div className="grid lg:grid-cols-2 gap-6">
            <div className="backdrop-blur-xl bg-black/20 border border-white/10 rounded-2xl p-6">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-fuchsia-300" />
                Pending Venue Claims ({pendingVenueClaims.length})
              </h3>

              {venueClaimsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 text-fuchsia-300 animate-spin" />
                </div>
              ) : pendingVenueClaims.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-4" />
                  <p className="text-gray-400">No pending venue claims.</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                  {pendingVenueClaims.map((claim) => (
                    <div
                      key={claim.id}
                      onClick={() => setSelectedVenueClaim(claim)}
                      className={`p-4 rounded-xl border cursor-pointer transition-all ${
                        selectedVenueClaim?.id === claim.id
                          ? 'bg-fuchsia-500/10 border-fuchsia-500/50'
                          : 'bg-white/5 border-white/10 hover:bg-white/10'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div>
                          <h4 className="font-bold text-white text-sm line-clamp-1">{claim.name}</h4>
                          <p className="text-[11px] text-gray-500">{claim.city || 'Unknown city'}{claim.country ? `, ${claim.country}` : ''}</p>
                        </div>
                        <span className="px-2 py-1 text-[10px] font-bold uppercase rounded bg-fuchsia-500/20 text-fuchsia-300 shrink-0">
                          {claim.claimRequestTag || 'pending'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="text-gray-400">
                          {claim._count.placeTags} marks · {claim._count.dares} dares
                        </span>
                        <span className="text-gray-500">
                          {claim.claimRequestedAt && new Date(claim.claimRequestedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {venueClaimsError && (
                <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                  <p className="text-xs text-red-400">{venueClaimsError}</p>
                </div>
              )}
            </div>

            <div className="backdrop-blur-xl bg-black/20 border border-white/10 rounded-2xl p-6">
              {selectedVenueClaim ? (
                <>
                  <h3 className="text-lg font-bold text-white mb-4">Review Venue Claim</h3>

                  <div className="space-y-3 mb-6">
                    <div className="p-3 bg-white/5 rounded-lg">
                      <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Venue</p>
                      <p className="text-white font-bold">{selectedVenueClaim.name}</p>
                      <p className="text-gray-500 text-sm mt-1">
                        {selectedVenueClaim.city || 'Unknown city'}{selectedVenueClaim.country ? `, ${selectedVenueClaim.country}` : ''}
                      </p>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div className="p-3 bg-white/5 rounded-lg">
                        <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Marks</p>
                        <p className="text-white font-bold">{selectedVenueClaim._count.placeTags}</p>
                      </div>
                      <div className="p-3 bg-white/5 rounded-lg">
                        <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Dares</p>
                        <p className="text-white font-bold">{selectedVenueClaim._count.dares}</p>
                      </div>
                      <div className="p-3 bg-white/5 rounded-lg">
                        <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Campaigns</p>
                        <p className="text-white font-bold">{selectedVenueClaim._count.campaigns}</p>
                      </div>
                    </div>

                    <div className="p-3 bg-fuchsia-500/10 border border-fuchsia-500/30 rounded-lg">
                      <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Requested By</p>
                      <p className="text-fuchsia-300 font-bold text-lg">{selectedVenueClaim.claimRequestTag}</p>
                      <p className="text-gray-500 font-mono text-xs mt-1">
                        {selectedVenueClaim.claimRequestWallet && formatAddress(selectedVenueClaim.claimRequestWallet)}
                      </p>
                    </div>

                    <div className="p-3 bg-white/5 rounded-lg">
                      <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Requested At</p>
                      <p className="text-gray-300 text-sm">
                        {selectedVenueClaim.claimRequestedAt &&
                          new Date(selectedVenueClaim.claimRequestedAt).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className="text-xs text-gray-400 uppercase tracking-wider block mb-2">
                      Rejection Reason (optional)
                    </label>
                    <textarea
                      value={venueClaimRejectReason}
                      onChange={(e) => setVenueClaimRejectReason(e.target.value)}
                      placeholder="Reason for rejection..."
                      className="w-full p-3 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder-gray-500 focus:border-fuchsia-500/50 focus:outline-none resize-none"
                      rows={2}
                    />
                  </div>

                  <div className="flex flex-wrap gap-2 mb-4">
                    <Link
                      href={`/map?place=${encodeURIComponent(selectedVenueClaim.slug)}`}
                      target="_blank"
                      className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-cyan-300 transition hover:bg-cyan-500/15"
                    >
                      <MapPin className="h-3.5 w-3.5" />
                      Open on map
                    </Link>
                    <Link
                      href={`/venues/${selectedVenueClaim.slug}`}
                      target="_blank"
                      className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-white/70 transition hover:bg-white/[0.1] hover:text-white"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Open venue
                    </Link>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => handleVenueClaimDecision(selectedVenueClaim.id, 'REJECT')}
                      disabled={processingVenueClaim === selectedVenueClaim.id}
                      className="flex items-center justify-center gap-2 px-4 py-3 bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 text-red-400 font-bold text-sm uppercase tracking-wider rounded-xl transition-colors disabled:opacity-50"
                    >
                      {processingVenueClaim === selectedVenueClaim.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <XCircle className="w-4 h-4" />
                      )}
                      Reject
                    </button>
                    <button
                      onClick={() => handleVenueClaimDecision(selectedVenueClaim.id, 'APPROVE')}
                      disabled={processingVenueClaim === selectedVenueClaim.id}
                      className="flex items-center justify-center gap-2 px-4 py-3 bg-fuchsia-500/20 hover:bg-fuchsia-500/30 border border-fuchsia-500/50 text-fuchsia-300 font-bold text-sm uppercase tracking-wider rounded-xl transition-colors disabled:opacity-50"
                    >
                      {processingVenueClaim === selectedVenueClaim.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <CheckCircle className="w-4 h-4" />
                      )}
                      Approve
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center h-full min-h-[400px]">
                  <div className="text-center">
                    <MapPin className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                    <p className="text-gray-400">Select a venue claim to review</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {hasAdminAuth && isAuthorized && !loading && activeTab === 'reportLeads' && (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-4">
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4 backdrop-blur-xl">
                <p className="text-[11px] uppercase tracking-[0.22em] text-gray-500">Warm leads</p>
                <p className="mt-2 text-3xl font-black text-white">{reportLeadSummary.totalLeads}</p>
                <p className="mt-1 text-xs text-gray-500">Captured from venue reports</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4 backdrop-blur-xl">
                <p className="text-[11px] uppercase tracking-[0.22em] text-gray-500">Needs follow-up</p>
                <p className="mt-2 text-3xl font-black text-white">{reportLeadSummary.newLeads}</p>
                <p className="mt-1 text-xs text-gray-500">Fresh leads with no operator action yet</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4 backdrop-blur-xl">
                <p className="text-[11px] uppercase tracking-[0.22em] text-gray-500">Active follow-up</p>
                <p className="mt-2 text-3xl font-black text-white">{reportLeadSummary.activeFollowUps}</p>
                <p className="mt-1 text-xs text-gray-500">Leads currently owned or waiting on reply</p>
              </div>
              <div className="rounded-2xl border border-amber-400/20 bg-amber-500/[0.08] p-4 backdrop-blur-xl">
                <p className="text-[11px] uppercase tracking-[0.22em] text-amber-200/70">Overdue / unowned</p>
                <p className="mt-2 text-3xl font-black text-amber-100">
                  {reportLeadSummary.overdue} / {reportLeadSummary.unowned}
                </p>
                <p className="mt-1 text-xs text-amber-100/60">Reminders missed vs nobody assigned</p>
              </div>
              <div className="rounded-2xl border border-cyan-400/20 bg-cyan-500/[0.08] p-4 backdrop-blur-xl">
                <p className="text-[11px] uppercase tracking-[0.22em] text-cyan-200/70">Launches from report</p>
                <p className="mt-2 text-3xl font-black text-cyan-100">
                  {reportLeadSummary.activationsLaunched + reportLeadSummary.repeatsLaunched}
                </p>
                <p className="mt-1 text-xs text-cyan-100/60">Combined fresh and repeat launches</p>
              </div>
            </div>

            <div className="grid lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] gap-6">
              <div className="backdrop-blur-xl bg-black/20 border border-white/10 rounded-2xl p-6">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Mail className="w-5 h-5 text-cyan-300" />
                    Report Leads
                  </h3>
                  <span className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-gray-400">
                    {reportLeadSummary.venueAudience} venue · {reportLeadSummary.sponsorAudience} sponsor
                  </span>
                </div>

                <div className="mb-4 flex flex-wrap gap-2">
                  {[
                    ['all', `All (${reportLeadSummary.totalLeads})`],
                    ['needsOwner', `Needs owner (${reportLeadSummary.unowned})`],
                    ...(address
                      ? [[
                          'mine',
                          `Mine (${reportLeads.filter((lead) => lead.ownerWallet?.toLowerCase() === address.toLowerCase()).length})`,
                        ] as const]
                      : []),
                    ['overdue', `Overdue (${reportLeadSummary.overdue})`],
                    ['highSignal', 'High signal'],
                  ].map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setLeadInboxFilter(value as LeadInboxFilter)}
                      className={`rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] transition ${
                        leadInboxFilter === value
                          ? 'border-cyan-400/30 bg-cyan-500/[0.14] text-cyan-200'
                          : 'border-white/10 bg-white/[0.04] text-white/60 hover:bg-white/[0.08] hover:text-white'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {reportLeadsLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 text-cyan-300 animate-spin" />
                  </div>
                ) : visibleReportLeads.length === 0 ? (
                  <div className="text-center py-12">
                    <Mail className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                    <p className="text-gray-400">No leads match this filter yet.</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[720px] overflow-y-auto pr-2">
                    {visibleReportLeads.map((lead) => (
                      <button
                        key={lead.id}
                        type="button"
                        onClick={() => setSelectedReportLead(lead)}
                        className={`w-full rounded-2xl border p-4 text-left transition-all ${
                          selectedReportLead?.id === lead.id
                            ? 'border-cyan-400/40 bg-cyan-500/[0.08]'
                            : 'border-white/10 bg-white/[0.04] hover:bg-white/[0.07]'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-white truncate">
                              {lead.name || lead.organization || lead.email}
                            </p>
                            <p className="text-xs text-gray-400 truncate">{lead.email}</p>
                            <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-gray-500 truncate">
                              {lead.venue.name}
                            </p>
                          </div>
                          <span
                            className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] ${
                              lead.pipeline.stage === 'REPEAT_LAUNCHED'
                                ? 'border-amber-400/30 bg-amber-500/[0.12] text-amber-200'
                                : lead.pipeline.stage === 'ACTIVATION_LAUNCHED'
                                  ? 'border-cyan-400/30 bg-cyan-500/[0.12] text-cyan-200'
                                  : lead.pipeline.stage === 'CLAIM_STARTED'
                                    ? 'border-fuchsia-400/30 bg-fuchsia-500/[0.12] text-fuchsia-200'
                                    : 'border-white/12 bg-white/[0.06] text-white/60'
                            }`}
                          >
                            {lead.pipeline.stageLabel}
                          </span>
                        </div>

                        <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-gray-500">
                          <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-1 uppercase tracking-[0.16em]">
                            {lead.audience}
                          </span>
                          <span className={`rounded-full border px-2 py-1 uppercase tracking-[0.16em] ${
                            lead.priority.isOverdue
                              ? 'border-amber-400/30 bg-amber-500/[0.12] text-amber-200'
                              : 'border-white/10 bg-white/[0.04]'
                          }`}>
                            {lead.priority.label}
                          </span>
                          {lead.intent ? (
                            <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-1 uppercase tracking-[0.16em]">
                              {lead.intent}
                            </span>
                          ) : null}
                          {!lead.ownerWallet ? (
                            <span className="rounded-full border border-red-400/20 bg-red-500/[0.08] px-2 py-1 uppercase tracking-[0.16em] text-red-200">
                              unowned
                            </span>
                          ) : null}
                          <span>{formatLeadDue(lead.nextActionAt)}</span>
                          <span>{formatRelativeTime(lead.contactedAt)}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {reportLeadsError && (
                  <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3">
                    <p className="text-xs text-red-400">{reportLeadsError}</p>
                  </div>
                )}
              </div>

              <div className="backdrop-blur-xl bg-black/20 border border-white/10 rounded-2xl p-6">
                {selectedReportLead ? (
                  <>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.22em] text-cyan-300">Lead Detail</p>
                        <h3 className="mt-2 text-2xl font-black text-white">
                          {selectedReportLead.name || selectedReportLead.organization || selectedReportLead.email}
                        </h3>
                        <p className="mt-2 text-sm text-gray-400">{selectedReportLead.email}</p>
                      </div>
                      <span className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-gray-400">
                        {selectedReportLead.pipeline.stageLabel}
                      </span>
                    </div>

                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
                        <p className="text-[11px] uppercase tracking-[0.18em] text-gray-500">Venue</p>
                        <p className="mt-2 text-lg font-bold text-white">{selectedReportLead.venue.name}</p>
                        <p className="mt-1 text-sm text-gray-400">
                          {selectedReportLead.venue.city || 'Unknown city'}
                          {selectedReportLead.venue.country ? `, ${selectedReportLead.venue.country}` : ''}
                        </p>
                      </div>
                      <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
                        <p className="text-[11px] uppercase tracking-[0.18em] text-gray-500">Lead context</p>
                        <div className="mt-2 space-y-1 text-sm text-gray-300">
                          <p>Audience: <span className="text-white">{selectedReportLead.audience}</span></p>
                          <p>Intent: <span className="text-white">{selectedReportLead.intent || 'general'}</span></p>
                          <p>Contacted: <span className="text-white">{formatRelativeTime(selectedReportLead.contactedAt)}</span></p>
                          <p>Priority: <span className="text-white">{selectedReportLead.priority.label}</span></p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 rounded-xl border border-white/10 bg-white/[0.04] p-4">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                          <p className="text-[11px] uppercase tracking-[0.18em] text-gray-500">Owner + follow-up</p>
                          <p className="mt-2 text-sm text-gray-300">
                            Owner:{' '}
                            <span className="text-white">
                              {selectedReportLead.ownerWallet
                                ? formatAddress(selectedReportLead.ownerWallet)
                                : 'Unassigned'}
                            </span>
                          </p>
                          <p className="mt-1 text-sm text-gray-300">
                            Status: <span className="text-white">{formatLeadStatus(selectedReportLead.followUpStatus)}</span>
                          </p>
                          <p className="mt-1 text-sm text-gray-300">
                            Next action: <span className="text-white">{formatLeadDue(selectedReportLead.nextActionAt)}</span>
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => void handleReportLeadUpdate(selectedReportLead.id, { ownerWallet: address ?? null })}
                            disabled={reportLeadUpdating === selectedReportLead.id}
                            className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-cyan-300 transition hover:bg-cyan-500/15 disabled:opacity-60"
                          >
                            {reportLeadUpdating === selectedReportLead.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Hand className="h-3.5 w-3.5" />
                            )}
                            Assign to me
                          </button>
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            void handleReportLeadUpdate(selectedReportLead.id, {
                              nextActionAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
                              followUpStatus: selectedReportLead.followUpStatus === 'NEW' ? 'FOLLOWING_UP' : undefined,
                            })
                          }
                          disabled={reportLeadUpdating === selectedReportLead.id}
                          className="rounded-full border border-amber-400/20 bg-amber-500/10 px-3 py-2 text-[11px] font-bold uppercase tracking-[0.16em] text-amber-200 transition hover:bg-amber-500/15 disabled:opacity-60"
                        >
                          Remind tomorrow
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            void handleReportLeadUpdate(selectedReportLead.id, {
                              nextActionAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
                              followUpStatus: selectedReportLead.followUpStatus === 'NEW' ? 'WAITING' : undefined,
                            })
                          }
                          disabled={reportLeadUpdating === selectedReportLead.id}
                          className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-2 text-[11px] font-bold uppercase tracking-[0.16em] text-white/70 transition hover:bg-white/[0.1] hover:text-white disabled:opacity-60"
                        >
                          Wait 3d
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            void handleReportLeadUpdate(selectedReportLead.id, {
                              nextActionAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
                              followUpStatus:
                                selectedReportLead.followUpStatus === 'NEW' ||
                                selectedReportLead.followUpStatus === 'FOLLOWING_UP'
                                  ? 'WAITING'
                                  : undefined,
                            })
                          }
                          disabled={reportLeadUpdating === selectedReportLead.id}
                          className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-[11px] font-bold uppercase tracking-[0.16em] text-white/55 transition hover:bg-white/[0.08] hover:text-white disabled:opacity-60"
                        >
                          Snooze 7d
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            void handleReportLeadUpdate(selectedReportLead.id, {
                              followUpStatus: 'CONVERTED',
                            })
                          }
                          disabled={reportLeadUpdating === selectedReportLead.id}
                          className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-2 text-[11px] font-bold uppercase tracking-[0.16em] text-emerald-200 transition hover:bg-emerald-500/15 disabled:opacity-60"
                        >
                          Mark won
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            void handleReportLeadUpdate(selectedReportLead.id, {
                              followUpStatus: 'ARCHIVED',
                            })
                          }
                          disabled={reportLeadUpdating === selectedReportLead.id}
                          className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-[11px] font-bold uppercase tracking-[0.16em] text-white/55 transition hover:bg-white/[0.08] hover:text-white disabled:opacity-60"
                        >
                          Archive
                        </button>
                      </div>
                    </div>

                    <div className="mt-5 rounded-xl border border-white/10 bg-white/[0.04] p-4">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-gray-500">Pipeline</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {[
                          { key: 'CONTACTED', label: 'Contacted' },
                          { key: 'CLAIM_STARTED', label: 'Claim started' },
                          { key: 'ACTIVATION_LAUNCHED', label: 'Activation launched' },
                          { key: 'REPEAT_LAUNCHED', label: 'Repeat launched' },
                        ].map((stage) => {
                          const active =
                            stage.key === 'CONTACTED'
                              ? true
                              : selectedReportLead.events.some((event) => event.eventType === stage.key);
                          return (
                            <div
                              key={stage.key}
                              className={`rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] ${
                                active
                                  ? 'border-cyan-400/30 bg-cyan-500/[0.12] text-cyan-200'
                                  : 'border-white/10 bg-white/[0.04] text-white/35'
                              }`}
                            >
                              {stage.label}
                            </div>
                          );
                        })}
                      </div>
                      <p className="mt-3 text-xs text-gray-500">
                        Latest movement: {selectedReportLead.pipeline.latestEventLabel}
                        {selectedReportLead.pipeline.latestEventAt
                          ? ` · ${formatRelativeTime(selectedReportLead.pipeline.latestEventAt)}`
                          : ''}
                      </p>
                    </div>

                    {selectedReportLead.notes ? (
                      <div className="mt-5 rounded-xl border border-white/10 bg-white/[0.04] p-4">
                        <p className="text-[11px] uppercase tracking-[0.18em] text-gray-500">Notes</p>
                        <p className="mt-2 text-sm leading-6 text-gray-300">{selectedReportLead.notes}</p>
                      </div>
                    ) : null}

                    <div className="mt-5 flex flex-wrap gap-2">
                      <Link
                        href={`/venues/${selectedReportLead.venue.slug}/report`}
                        target="_blank"
                        className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-cyan-300 transition hover:bg-cyan-500/15"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        Open report
                      </Link>
                      <Link
                        href={`/venues/${selectedReportLead.venue.slug}`}
                        target="_blank"
                        className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-white/70 transition hover:bg-white/[0.1] hover:text-white"
                      >
                        <MapPin className="h-3.5 w-3.5" />
                        Open venue
                      </Link>
                      <a
                        href={`mailto:${selectedReportLead.email}?subject=${encodeURIComponent(`BaseDare follow-up: ${selectedReportLead.venue.name}`)}`}
                        className="inline-flex items-center gap-2 rounded-full border border-fuchsia-400/20 bg-fuchsia-500/10 px-3 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-fuchsia-200 transition hover:bg-fuchsia-500/15"
                      >
                        <Mail className="h-3.5 w-3.5" />
                        Email lead
                      </a>
                    </div>
                  </>
                ) : (
                  <div className="flex min-h-[420px] items-center justify-center">
                    <div className="text-center">
                      <Mail className="mx-auto mb-4 h-12 w-12 text-gray-500" />
                      <p className="text-gray-400">Select a report lead to inspect the pipeline.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Authorized Content - Place Tags Tab */}
        {hasAdminAuth && isAuthorized && !loading && activeTab === 'placeTags' && (
          <div className="space-y-6">
            {!isTagsAuthorized && (
              <div className="backdrop-blur-xl bg-black/20 border border-white/10 rounded-2xl p-6 max-w-md mx-auto">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <Lock className="w-5 h-5 text-cyan-300" />
                  Admin Authentication
                </h3>
                <p className="text-sm text-gray-400 mb-4">
                  Enter your admin secret to review pending place tags.
                </p>
                <div className="space-y-3">
                  <input
                    type="password"
                    value={adminSecret}
                    onChange={(e) => setAdminSecret(e.target.value)}
                    placeholder="Enter admin secret..."
                    className="w-full p-3 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder-gray-500 focus:border-cyan-500/50 focus:outline-none font-mono"
                  />
                  <button
                    onClick={fetchPendingPlaceTags}
                    disabled={!hasAdminAuth || placeTagsLoading}
                    className="w-full py-3 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/50 text-cyan-300 font-bold text-sm uppercase tracking-wider rounded-xl transition-colors disabled:opacity-50"
                  >
                    {placeTagsLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                    ) : (
                      'Authenticate'
                    )}
                  </button>
                  {placeTagsError && (
                    <p className="text-xs text-red-400 text-center">{placeTagsError}</p>
                  )}
                </div>
              </div>
            )}

            {isTagsAuthorized && (
              <div className="grid lg:grid-cols-2 gap-6">
                <div className="backdrop-blur-xl bg-black/20 border border-white/10 rounded-2xl p-6">
                  <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <Tag className="w-5 h-5 text-cyan-300" />
                    Chaos Inbox ({pendingPlaceTags.length})
                  </h3>

                  <div className="mb-4 grid grid-cols-2 gap-2 xl:grid-cols-5">
                    <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-3">
                      <p className="text-[10px] uppercase tracking-[0.18em] text-white/35">Queue</p>
                      <p className="mt-1 text-lg font-black text-white">{placeTagQueueSummary.total}</p>
                    </div>
                    <div className={`rounded-2xl border px-3 py-3 ${placeTagQueueSummary.overdue > 0 ? 'border-red-400/24 bg-red-500/[0.1]' : 'border-white/10 bg-white/[0.04]'}`}>
                      <p className="text-[10px] uppercase tracking-[0.18em] text-white/35">Overdue</p>
                      <p className={`mt-1 text-lg font-black ${placeTagQueueSummary.overdue > 0 ? 'text-red-200' : 'text-white'}`}>
                        {placeTagQueueSummary.overdue}
                      </p>
                    </div>
                    <div className={`rounded-2xl border px-3 py-3 ${placeTagQueueSummary.dueSoon > 0 ? 'border-yellow-400/24 bg-yellow-500/[0.1]' : 'border-white/10 bg-white/[0.04]'}`}>
                      <p className="text-[10px] uppercase tracking-[0.18em] text-white/35">Due soon</p>
                      <p className={`mt-1 text-lg font-black ${placeTagQueueSummary.dueSoon > 0 ? 'text-yellow-200' : 'text-white'}`}>
                        {placeTagQueueSummary.dueSoon}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-fuchsia-400/16 bg-fuchsia-500/[0.06] px-3 py-3">
                      <p className="text-[10px] uppercase tracking-[0.18em] text-white/35">First marks</p>
                      <p className="mt-1 text-lg font-black text-fuchsia-100">{placeTagQueueSummary.firstMarks}</p>
                    </div>
                    <div className="rounded-2xl border border-cyan-400/16 bg-cyan-500/[0.06] px-3 py-3">
                      <p className="text-[10px] uppercase tracking-[0.18em] text-white/35">Oldest</p>
                      <p className="mt-1 text-sm font-black uppercase tracking-[0.08em] text-cyan-100">
                        {placeTagQueueSummary.oldestQueuedLabel}
                      </p>
                    </div>
                  </div>

                  {placeTagsLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="w-8 h-8 text-cyan-300 animate-spin" />
                    </div>
                  ) : pendingPlaceTags.length === 0 ? (
                    <div className="text-center py-12">
                      <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-4" />
                      <p className="text-gray-400">No pending place tags. The grid is quiet.</p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                      {pendingPlaceTags.map((tag) => {
                        const reviewState = getPlaceTagReviewState(tag.submittedAt);

                        return (
                        <div
                          key={tag.id}
                          onClick={() => setSelectedPlaceTag(tag)}
                          className={`p-4 rounded-xl border cursor-pointer transition-all ${
                            selectedPlaceTag?.id === tag.id
                              ? 'bg-cyan-500/10 border-cyan-500/50'
                              : 'bg-white/5 border-white/10 hover:bg-white/10'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <div>
                              <h4 className="font-bold text-white text-sm line-clamp-1">
                                {tag.venue.name}
                              </h4>
                              <p className="text-[11px] text-gray-500">
                                {tag.creatorTag || formatAddress(tag.walletAddress)}
                              </p>
                            </div>
                            <div className="flex shrink-0 flex-col items-end gap-1">
                              <span className="px-2 py-1 text-[10px] font-bold uppercase rounded bg-cyan-500/20 text-cyan-300">
                                {tag.proofType}
                              </span>
                              <span className={`rounded-full border px-2 py-1 text-[9px] font-black uppercase tracking-[0.16em] ${getPlaceTagReviewToneClass(reviewState.tone)}`}>
                                {reviewState.label}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between text-xs font-mono">
                            <span className="text-gray-400">{tag.venue.city || 'Unknown city'}</span>
                            <span className="text-gray-500">
                              {reviewState.elapsedLabel}
                            </span>
                          </div>

                          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-black/30">
                            <div
                              className={`h-full rounded-full ${getPlaceTagReviewFillClass(reviewState.tone)}`}
                              style={{ width: `${reviewState.progress}%` }}
                            />
                          </div>

                          <div className="mt-3 flex flex-wrap gap-2">
                            <Link
                              href={`/map?place=${encodeURIComponent(tag.venue.slug)}`}
                              target="_blank"
                              onClick={(event) => event.stopPropagation()}
                              className="inline-flex items-center gap-1.5 rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-300 transition hover:bg-cyan-500/15"
                            >
                              <MapPin className="h-3.5 w-3.5" />
                              Open on map
                            </Link>
                            <Link
                              href={`/venues/${tag.venue.slug}`}
                              target="_blank"
                              onClick={(event) => event.stopPropagation()}
                              className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-white/70 transition hover:bg-white/[0.1] hover:text-white"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                              Open place
                            </Link>
                          </div>
                        </div>
                        );
                      })}
                    </div>
                  )}

                  {placeTagsError && (
                    <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                      <p className="text-xs text-red-400">{placeTagsError}</p>
                    </div>
                  )}
                </div>

                <div className="backdrop-blur-xl bg-black/20 border border-white/10 rounded-2xl p-6">
                  {selectedPlaceTag ? (
                    <>
                      <h3 className="text-lg font-bold text-white mb-4">Review Place Tag</h3>

                      {selectedPlaceTagReviewState ? (
                        <div className={`mb-4 rounded-2xl border px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] ${getPlaceTagReviewToneClass(selectedPlaceTagReviewState.tone)}`}>
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <p className="text-[10px] font-black uppercase tracking-[0.22em] opacity-75">
                                Referee SLA
                              </p>
                              <p className="mt-1 text-base font-black text-white">
                                {selectedPlaceTagReviewState.label}
                              </p>
                            </div>
                            <div className="text-left sm:text-right">
                              <p className="text-xs font-bold uppercase tracking-[0.16em]">
                                {selectedPlaceTagReviewState.elapsedLabel}
                              </p>
                              <p className="mt-1 text-[11px] uppercase tracking-[0.14em] opacity-75">
                                {selectedPlaceTagReviewState.detail}
                              </p>
                            </div>
                          </div>
                          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-black/30">
                            <div
                              className={`h-full rounded-full ${getPlaceTagReviewFillClass(selectedPlaceTagReviewState.tone)}`}
                              style={{ width: `${selectedPlaceTagReviewState.progress}%` }}
                            />
                          </div>
                        </div>
                      ) : null}

                      <div className="mb-4 rounded-xl overflow-hidden bg-black/40">
                        {selectedPlaceTag.proofType === 'VIDEO' ? (
                          <video
                            src={selectedPlaceTag.proofMediaUrl}
                            controls
                            className="w-full max-h-[320px] object-cover"
                          />
                        ) : (
                          <div className="relative h-[320px] w-full">
                            <Image
                              src={selectedPlaceTag.proofMediaUrl}
                              alt="Place tag proof"
                              fill
                              sizes="(max-width: 1024px) 100vw, 50vw"
                              className="object-cover"
                              unoptimized
                            />
                          </div>
                        )}
                      </div>

                      <div className="space-y-3 mb-6">
                        <div className="p-3 bg-white/5 rounded-lg">
                          <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Place</p>
                          <p className="text-white font-bold">{selectedPlaceTag.venue.name}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {selectedPlaceTag.venue.city || 'Unknown city'}{selectedPlaceTag.venue.country ? `, ${selectedPlaceTag.venue.country}` : ''}
                          </p>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="p-3 bg-white/5 rounded-lg">
                            <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Creator</p>
                            <p className="text-cyan-300 font-bold">
                              {selectedPlaceTag.creatorTag || formatAddress(selectedPlaceTag.walletAddress)}
                            </p>
                          </div>
                          <div className="p-3 bg-white/5 rounded-lg">
                            <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Distance</p>
                            <p className="text-white font-mono text-sm">
                              {selectedPlaceTag.geoDistanceMeters != null ? `${selectedPlaceTag.geoDistanceMeters}m` : 'Unknown'}
                            </p>
                          </div>
                        </div>

                        <div className="p-3 bg-white/5 rounded-lg">
                          <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Caption</p>
                          <p className="text-gray-300 text-sm">
                            {selectedPlaceTag.caption || 'No caption provided.'}
                          </p>
                        </div>

                        {selectedPlaceTag.vibeTags.length > 0 && (
                          <div className="p-3 bg-white/5 rounded-lg">
                            <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">Vibe Tags</p>
                            <div className="flex flex-wrap gap-2">
                              {selectedPlaceTag.vibeTags.map((tag) => (
                                <span
                                  key={tag}
                                  className="px-2 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-[10px] uppercase tracking-wider"
                                >
                                  #{tag}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="grid gap-3 sm:grid-cols-2">
                          <Link
                            href={`/map?place=${encodeURIComponent(selectedPlaceTag.venue.slug)}`}
                            target="_blank"
                            className="flex items-center gap-2 p-3 bg-cyan-500/10 border border-cyan-500/20 rounded-lg text-cyan-300 hover:bg-cyan-500/15 transition-colors"
                          >
                            <MapPin className="w-4 h-4" />
                            <span className="text-sm font-bold">Open on map</span>
                          </Link>
                          <Link
                            href={`/venues/${selectedPlaceTag.venue.slug}`}
                            target="_blank"
                            className="flex items-center gap-2 p-3 bg-white/5 border border-white/10 rounded-lg text-white/80 hover:bg-white/10 transition-colors"
                          >
                            <ExternalLink className="w-4 h-4" />
                            <span className="text-sm font-bold">Open place page</span>
                          </Link>
                        </div>
                      </div>

                      <div className="mb-4">
                        <label className="text-xs text-gray-400 uppercase tracking-wider block mb-2">
                          Review Note (optional)
                        </label>
                        <textarea
                          ref={placeTagRejectReasonRef}
                          value={placeTagRejectReason}
                          onChange={(e) => setPlaceTagRejectReason(e.target.value)}
                          placeholder="Low quality, spam, off-place, fake geo..."
                          className="w-full p-3 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder-gray-500 focus:border-cyan-500/50 focus:outline-none resize-none"
                          rows={2}
                        />
                        <div className="mt-2 flex flex-wrap gap-2">
                          {PLACE_TAG_REJECT_REASON_CHIPS.map((reason) => (
                            <button
                              key={reason}
                              type="button"
                              onClick={() => setPlaceTagRejectReason(reason)}
                              className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-white/58 transition hover:border-red-300/30 hover:bg-red-500/[0.1] hover:text-red-100"
                            >
                              {reason}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
                        <button
                          onClick={() => handlePlaceTagAction(selectedPlaceTag.id, 'FLAG')}
                          disabled={processingPlaceTag === selectedPlaceTag.id}
                          className="flex items-center justify-center gap-2 px-4 py-3 bg-yellow-500/20 hover:bg-yellow-500/30 border border-yellow-500/50 text-yellow-300 font-bold text-sm uppercase tracking-wider rounded-xl transition-colors disabled:opacity-50"
                        >
                          {processingPlaceTag === selectedPlaceTag.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <AlertTriangle className="w-4 h-4" />
                          )}
                          Flag
                        </button>
                        <button
                          onClick={() =>
                            handlePlaceTagAction(selectedPlaceTag.id, 'FLAG', { openNext: true })
                          }
                          disabled={processingPlaceTag === selectedPlaceTag.id || pendingPlaceTags.length <= 1}
                          className="flex items-center justify-center gap-2 px-4 py-3 bg-yellow-500/14 hover:bg-yellow-500/24 border border-yellow-500/40 text-yellow-200 font-bold text-sm uppercase tracking-wider rounded-xl transition-colors disabled:opacity-50"
                        >
                          {processingPlaceTag === selectedPlaceTag.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <AlertTriangle className="w-4 h-4" />
                          )}
                          Flag + Next
                        </button>
                        <button
                          onClick={() => handlePlaceTagRejectIntent()}
                          disabled={processingPlaceTag === selectedPlaceTag.id}
                          className="flex items-center justify-center gap-2 px-4 py-3 bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 text-red-400 font-bold text-sm uppercase tracking-wider rounded-xl transition-colors disabled:opacity-50"
                        >
                          {processingPlaceTag === selectedPlaceTag.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <XCircle className="w-4 h-4" />
                          )}
                          Reject
                        </button>
                        <button
                          onClick={() =>
                            handlePlaceTagRejectIntent({ openNext: true })
                          }
                          disabled={processingPlaceTag === selectedPlaceTag.id || pendingPlaceTags.length <= 1}
                          className="flex items-center justify-center gap-2 px-4 py-3 bg-red-500/14 hover:bg-red-500/24 border border-red-500/40 text-red-300 font-bold text-sm uppercase tracking-wider rounded-xl transition-colors disabled:opacity-50"
                        >
                          {processingPlaceTag === selectedPlaceTag.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <XCircle className="w-4 h-4" />
                          )}
                          Reject + Next
                        </button>
                        <button
                          onClick={() => handlePlaceTagAction(selectedPlaceTag.id, 'APPROVE')}
                          disabled={processingPlaceTag === selectedPlaceTag.id}
                          className="flex items-center justify-center gap-2 px-4 py-3 bg-green-500/20 hover:bg-green-500/30 border border-green-500/50 text-green-400 font-bold text-sm uppercase tracking-wider rounded-xl transition-colors disabled:opacity-50"
                        >
                          {processingPlaceTag === selectedPlaceTag.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <CheckCircle className="w-4 h-4" />
                          )}
                          Approve
                        </button>
                        <button
                          onClick={() =>
                            handlePlaceTagAction(selectedPlaceTag.id, 'APPROVE', { openNext: true })
                          }
                          disabled={processingPlaceTag === selectedPlaceTag.id || pendingPlaceTags.length <= 1}
                          className="flex items-center justify-center gap-2 px-4 py-3 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/50 text-cyan-300 font-bold text-sm uppercase tracking-wider rounded-xl transition-colors disabled:opacity-50"
                        >
                          {processingPlaceTag === selectedPlaceTag.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <CheckCircle className="w-4 h-4" />
                          )}
                          Approve + Next
                        </button>
                      </div>

                      <p className="mt-3 text-[11px] uppercase tracking-[0.18em] text-white/35">
                        Shortcuts: <span className="text-cyan-300">A</span> approve + next, <span className="text-red-300">R</span> reject + next, <span className="text-yellow-300">F</span> flag + next, <span className="text-white/65">N</span> skip
                      </p>
                    </>
                  ) : (
                    <div className="flex items-center justify-center h-full min-h-[400px]">
                      <div className="text-center">
                        <Tag className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                        <p className="text-gray-400">Select a place tag to review</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {hasAdminAuth && isAuthorized && !loading && activeTab === 'places' && (
          <div className="space-y-6">
            {!isTagsAuthorized && (
              <div className="backdrop-blur-xl bg-black/20 border border-white/10 rounded-2xl p-6 max-w-md mx-auto">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <Lock className="w-5 h-5 text-emerald-300" />
                  Admin Authentication
                </h3>
                <p className="text-sm text-gray-400 mb-4">
                  Enter your admin secret to manage places on the map.
                </p>
                <div className="space-y-3">
                  <input
                    type="password"
                    value={adminSecret}
                    onChange={(e) => setAdminSecret(e.target.value)}
                    placeholder="Enter admin secret..."
                    className="w-full p-3 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder-gray-500 focus:border-emerald-500/50 focus:outline-none font-mono"
                  />
                  <button
                    onClick={() => fetchPlaces(placesSearchQuery)}
                    disabled={!hasAdminAuth || placesLoading}
                    className="w-full py-3 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/50 text-emerald-300 font-bold text-sm uppercase tracking-wider rounded-xl transition-colors disabled:opacity-50"
                  >
                    {placesLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                    ) : (
                      'Authenticate'
                    )}
                  </button>
                  {placesError && (
                    <p className="text-xs text-red-400 text-center">{placesError}</p>
                  )}
                </div>
              </div>
            )}

            {isTagsAuthorized && (
              <div className="grid lg:grid-cols-2 gap-6">
                <div className="backdrop-blur-xl bg-black/20 border border-white/10 rounded-2xl p-6">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      <MapPin className="w-5 h-5 text-emerald-300" />
                      Place Ops ({places.length})
                    </h3>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedPlaceRecord(null);
                        populatePlaceForm(null);
                      }}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-emerald-300 transition hover:bg-emerald-500/15"
                    >
                      New place
                    </button>
                  </div>

                  <div className="flex gap-3 mb-4">
                    <input
                      value={placesSearchQuery}
                      onChange={(e) => setPlacesSearchQuery(e.target.value)}
                      placeholder="Search by name, slug, city..."
                      className="flex-1 p-3 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder-gray-500 focus:border-emerald-500/50 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => fetchPlaces(placesSearchQuery)}
                      disabled={placesLoading}
                      className="px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white text-sm font-bold hover:bg-white/10 transition-colors disabled:opacity-50"
                    >
                      {placesLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Load'}
                    </button>
                  </div>

                  {placesLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="w-8 h-8 text-emerald-300 animate-spin" />
                    </div>
                  ) : places.length === 0 ? (
                    <div className="text-center py-12">
                      <MapPin className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                      <p className="text-gray-400">No places loaded yet.</p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                      {places.map((place) => (
                        <div
                          key={place.id}
                          onClick={() => {
                            setSelectedPlaceRecord(place);
                            populatePlaceForm(place);
                          }}
                          className={`p-4 rounded-xl border cursor-pointer transition-all ${
                            selectedPlaceRecord?.id === place.id
                              ? 'bg-emerald-500/10 border-emerald-500/50'
                              : 'bg-white/5 border-white/10 hover:bg-white/10'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <div>
                              <h4 className="font-bold text-white text-sm line-clamp-1">{place.name}</h4>
                              <p className="text-[11px] text-gray-500">{place.slug}</p>
                            </div>
                            <span className="px-2 py-1 text-[10px] font-bold uppercase rounded bg-emerald-500/20 text-emerald-300 shrink-0">
                              {place.status}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-xs font-mono">
                            <span className="text-gray-400">{place.city || 'Unknown city'}</span>
                            <span className="text-gray-500">
                              {place._count.placeTags} marks / {place._count.dares} dares
                            </span>
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <Link
                              href={`/map?place=${encodeURIComponent(place.slug)}`}
                              target="_blank"
                              onClick={(event) => event.stopPropagation()}
                              className="inline-flex items-center gap-1.5 rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-300 transition hover:bg-cyan-500/15"
                            >
                              <MapPin className="h-3.5 w-3.5" />
                              Open on map
                            </Link>
                            <Link
                              href={`/venues/${place.slug}`}
                              target="_blank"
                              onClick={(event) => event.stopPropagation()}
                              className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-white/70 transition hover:bg-white/[0.1] hover:text-white"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                              Open place
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {placesError && (
                    <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                      <p className="text-xs text-red-400">{placesError}</p>
                    </div>
                  )}
                </div>

                <div className="backdrop-blur-xl bg-black/20 border border-white/10 rounded-2xl p-6">
                  <div className="flex items-center justify-between gap-3 mb-4">
                    <h3 className="text-lg font-bold text-white">
                      {placeForm.id ? 'Edit Place' : 'Create Place'}
                    </h3>
                    {placeForm.id ? (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedPlaceRecord(null);
                          populatePlaceForm(null);
                        }}
                        className="text-xs uppercase tracking-[0.18em] text-white/50 hover:text-white transition-colors"
                      >
                        clear
                      </button>
                    ) : null}
                  </div>

                  <div className="space-y-3">
                    <div className="grid sm:grid-cols-2 gap-3">
                      <input
                        value={placeForm.name}
                        onChange={(e) => setPlaceForm((current) => ({ ...current, name: e.target.value }))}
                        placeholder="Place name"
                        className="w-full p-3 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder-gray-500 focus:border-emerald-500/50 focus:outline-none"
                      />
                      <input
                        value={placeForm.slug}
                        onChange={(e) => setPlaceForm((current) => ({ ...current, slug: e.target.value }))}
                        placeholder="Slug (optional)"
                        className="w-full p-3 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder-gray-500 focus:border-emerald-500/50 focus:outline-none"
                      />
                    </div>

                    <textarea
                      value={placeForm.description}
                      onChange={(e) => setPlaceForm((current) => ({ ...current, description: e.target.value }))}
                      placeholder="Short description..."
                      rows={2}
                      className="w-full p-3 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder-gray-500 focus:border-emerald-500/50 focus:outline-none resize-none"
                    />

                    <input
                      value={placeForm.address}
                      onChange={(e) => setPlaceForm((current) => ({ ...current, address: e.target.value }))}
                      placeholder="Address"
                      className="w-full p-3 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder-gray-500 focus:border-emerald-500/50 focus:outline-none"
                    />

                    <div className="grid sm:grid-cols-2 gap-3">
                      <input
                        value={placeForm.city}
                        onChange={(e) => setPlaceForm((current) => ({ ...current, city: e.target.value }))}
                        placeholder="City"
                        className="w-full p-3 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder-gray-500 focus:border-emerald-500/50 focus:outline-none"
                      />
                      <input
                        value={placeForm.country}
                        onChange={(e) => setPlaceForm((current) => ({ ...current, country: e.target.value }))}
                        placeholder="Country"
                        className="w-full p-3 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder-gray-500 focus:border-emerald-500/50 focus:outline-none"
                      />
                    </div>

                    <div className="grid sm:grid-cols-2 gap-3">
                      <input
                        value={placeForm.latitude}
                        onChange={(e) => setPlaceForm((current) => ({ ...current, latitude: e.target.value }))}
                        placeholder="Latitude"
                        className="w-full p-3 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder-gray-500 focus:border-emerald-500/50 focus:outline-none font-mono"
                      />
                      <input
                        value={placeForm.longitude}
                        onChange={(e) => setPlaceForm((current) => ({ ...current, longitude: e.target.value }))}
                        placeholder="Longitude"
                        className="w-full p-3 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder-gray-500 focus:border-emerald-500/50 focus:outline-none font-mono"
                      />
                    </div>

                    <div className="grid sm:grid-cols-2 gap-3">
                      <input
                        value={placeForm.placeSource}
                        onChange={(e) => setPlaceForm((current) => ({ ...current, placeSource: e.target.value }))}
                        placeholder="Place source"
                        className="w-full p-3 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder-gray-500 focus:border-emerald-500/50 focus:outline-none"
                      />
                      <input
                        value={placeForm.externalPlaceId}
                        onChange={(e) => setPlaceForm((current) => ({ ...current, externalPlaceId: e.target.value }))}
                        placeholder="External place ID"
                        className="w-full p-3 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder-gray-500 focus:border-emerald-500/50 focus:outline-none"
                      />
                    </div>

                    <div className="grid sm:grid-cols-2 gap-3">
                      <input
                        value={placeForm.categories}
                        onChange={(e) => setPlaceForm((current) => ({ ...current, categories: e.target.value }))}
                        placeholder="Categories (comma separated)"
                        className="w-full p-3 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder-gray-500 focus:border-emerald-500/50 focus:outline-none"
                      />
                      <input
                        value={placeForm.partnerTier}
                        onChange={(e) => setPlaceForm((current) => ({ ...current, partnerTier: e.target.value }))}
                        placeholder="Partner tier"
                        className="w-full p-3 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder-gray-500 focus:border-emerald-500/50 focus:outline-none"
                      />
                    </div>

                    <div className="grid sm:grid-cols-[1fr_auto] gap-3 items-center">
                      <input
                        value={placeForm.status}
                        onChange={(e) => setPlaceForm((current) => ({ ...current, status: e.target.value.toUpperCase() }))}
                        placeholder="Status"
                        className="w-full p-3 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder-gray-500 focus:border-emerald-500/50 focus:outline-none"
                      />
                      <label className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/80">
                        <input
                          type="checkbox"
                          checked={placeForm.isPartner}
                          onChange={(e) => setPlaceForm((current) => ({ ...current, isPartner: e.target.checked }))}
                          className="rounded border-white/20 bg-transparent text-emerald-400 focus:ring-emerald-400"
                        />
                        Partner
                      </label>
                    </div>
                  </div>

                  <div className="mt-6 grid gap-3 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={handleSavePlace}
                      disabled={
                        savingPlace ||
                        !placeForm.name.trim() ||
                        !placeForm.latitude.trim() ||
                        !placeForm.longitude.trim()
                      }
                      className="flex items-center justify-center gap-2 px-4 py-3 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/50 text-emerald-300 font-bold text-sm uppercase tracking-wider rounded-xl transition-colors disabled:opacity-50"
                    >
                      {savingPlace ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <CheckCircle className="w-4 h-4" />
                      )}
                      {placeForm.id ? 'Save place' : 'Create place'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedPlaceRecord(null);
                        populatePlaceForm(null);
                      }}
                      className="px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 font-bold text-sm uppercase tracking-wider rounded-xl transition-colors"
                    >
                      Reset
                    </button>
                  </div>

                  {selectedPlaceRecord ? (
                    <div className="mt-6 rounded-xl border border-white/10 bg-white/5 p-4">
                      <p className="text-xs uppercase tracking-[0.2em] text-white/35">Current place context</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Link
                          href={`/map?place=${encodeURIComponent(selectedPlaceRecord.slug)}`}
                          target="_blank"
                          className="inline-flex items-center gap-1.5 rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-300 transition hover:bg-cyan-500/15"
                        >
                          <MapPin className="h-3.5 w-3.5" />
                          Open on map
                        </Link>
                        <Link
                          href={`/venues/${selectedPlaceRecord.slug}`}
                          target="_blank"
                          className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-white/70 transition hover:bg-white/[0.1] hover:text-white"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          Open place
                        </Link>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            )}
          </div>
        )}

        {hasAdminAuth && isAuthorized && !loading && activeTab === 'push' && (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
                <div className="text-[11px] uppercase tracking-[0.18em] text-white/45">Delivery keys</div>
                <div className={`mt-3 text-3xl font-black ${pushSummary.configured ? 'text-emerald-300' : 'text-red-300'}`}>
                  {pushSummary.configured ? 'Armed' : 'Missing'}
                </div>
                <div className="mt-1 text-xs text-white/45">VAPID public/private key status</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
                <div className="text-[11px] uppercase tracking-[0.18em] text-white/45">Active subscriptions</div>
                <div className="mt-3 text-3xl font-black text-white">{pushSummary.activeSubscriptions}</div>
                <div className="mt-1 text-xs text-white/45">{pushSummary.freshLocationSubscriptions} with fresh nearby context</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
                <div className="text-[11px] uppercase tracking-[0.18em] text-white/45">Recent sent</div>
                <div className="mt-3 text-3xl font-black text-emerald-300">{pushSummary.recentSent}</div>
                <div className="mt-1 text-xs text-white/45">{pushSummary.recentSkipped} deduped or cooled down</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
                <div className="text-[11px] uppercase tracking-[0.18em] text-white/45">Failures</div>
                <div className="mt-3 text-3xl font-black text-amber-300">{pushSummary.recentFailed}</div>
                <div className="mt-1 text-xs text-white/45">{pushSummary.recentlyDeactivated} endpoints auto-disabled</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
                <div className="text-[11px] uppercase tracking-[0.18em] text-white/45">Inactive devices</div>
                <div className="mt-3 text-3xl font-black text-white">{pushSummary.inactiveSubscriptions}</div>
                <div className="mt-1 text-xs text-white/45">Stored for delivery diagnostics</div>
              </div>
            </div>

            <div className="rounded-2xl border border-cyan-300/15 bg-cyan-500/[0.06] p-6">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <h3 className="text-lg font-bold text-white">Controlled Wallet Push</h3>
                  <p className="mt-1 max-w-2xl text-sm text-white/50">
                    Send one operator-approved push to a specific wallet and record the delivery outcome. This is for smoke tests,
                    recovery nudges, and high-trust manual ops only.
                  </p>
                </div>
                {adminPushResult ? (
                  <div className="rounded-xl border border-white/10 bg-black/25 px-4 py-3 text-xs font-bold text-white/65">
                    Sent {adminPushResult.sent} / failed {adminPushResult.failed} / skipped {adminPushResult.skipped} / inactive {adminPushResult.deactivated}
                  </div>
                ) : null}
              </div>

              <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(0,1.25fr)_160px_minmax(0,0.8fr)]">
                <input
                  value={adminPushForm.wallet}
                  onChange={(event) => setAdminPushForm((current) => ({ ...current, wallet: event.target.value }))}
                  placeholder="Target wallet 0x..."
                  className="rounded-xl border border-white/10 bg-black/35 px-4 py-3 text-sm font-bold text-white outline-none transition placeholder:text-white/25 focus:border-cyan-300/45"
                />
                <select
                  value={adminPushForm.topic}
                  onChange={(event) =>
                    setAdminPushForm((current) => ({ ...current, topic: event.target.value as AdminPushTopic }))
                  }
                  className="rounded-xl border border-white/10 bg-black/35 px-4 py-3 text-sm font-black uppercase tracking-[0.16em] text-white outline-none transition focus:border-cyan-300/45"
                >
                  {ADMIN_PUSH_TOPICS.map((topic) => (
                    <option key={topic} className="bg-[#080814]" value={topic}>
                      {topic}
                    </option>
                  ))}
                </select>
                <input
                  value={adminPushForm.url}
                  onChange={(event) => setAdminPushForm((current) => ({ ...current, url: event.target.value }))}
                  placeholder="/dashboard"
                  className="rounded-xl border border-white/10 bg-black/35 px-4 py-3 text-sm font-bold text-white outline-none transition placeholder:text-white/25 focus:border-cyan-300/45"
                />
              </div>

              <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)_auto]">
                <input
                  value={adminPushForm.title}
                  onChange={(event) => setAdminPushForm((current) => ({ ...current, title: event.target.value }))}
                  placeholder="Push title"
                  maxLength={80}
                  className="rounded-xl border border-white/10 bg-black/35 px-4 py-3 text-sm font-bold text-white outline-none transition placeholder:text-white/25 focus:border-cyan-300/45"
                />
                <input
                  value={adminPushForm.body}
                  onChange={(event) => setAdminPushForm((current) => ({ ...current, body: event.target.value }))}
                  placeholder="Push body"
                  maxLength={180}
                  className="rounded-xl border border-white/10 bg-black/35 px-4 py-3 text-sm font-bold text-white outline-none transition placeholder:text-white/25 focus:border-cyan-300/45"
                />
                <button
                  type="button"
                  onClick={() => void handleAdminPushSend()}
                  disabled={
                    adminPushSending ||
                    !adminPushForm.wallet.trim() ||
                    !adminPushForm.title.trim() ||
                    !adminPushForm.body.trim()
                  }
                  className="rounded-xl border border-cyan-300/25 bg-cyan-300 px-5 py-3 text-xs font-black uppercase tracking-[0.18em] text-black transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-45"
                >
                  {adminPushSending ? 'Sending' : 'Send Push'}
                </button>
              </div>
            </div>

            <div className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
              <div className="rounded-2xl border border-white/10 bg-black/20 p-6">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-bold text-white">Topic Mix</h3>
                    <p className="mt-1 text-sm text-white/45">How many active devices are listening and how much each topic is actually delivering.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => fetchPushDiagnostics()}
                    disabled={pushLoading}
                    className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-white/70 transition hover:bg-white/10 disabled:opacity-50"
                  >
                    {pushLoading ? 'Loading' : 'Refresh'}
                  </button>
                </div>

                <div className="mt-5 space-y-3">
                  {pushTopicMix.map((topic) => (
                    <div key={topic.topic} className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-sm font-bold uppercase tracking-[0.18em] text-white">{topic.topic}</div>
                        <div className="text-xs text-white/45">{topic.deliveries} sent recently</div>
                      </div>
                      <div className="mt-2 text-sm text-white/65">{topic.subscriptions} active subscriptions</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/20 p-6">
                <div>
                  <h3 className="text-lg font-bold text-white">Recent Delivery Log</h3>
                  <p className="mt-1 text-sm text-white/45">Latest sends, skips, and dead-end subscriptions.</p>
                </div>

                {pushError ? (
                  <div className="mt-5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                    {pushError}
                  </div>
                ) : pushDeliveries.length === 0 ? (
                  <div className="mt-5 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-8 text-center text-sm text-white/45">
                    No push delivery events recorded yet.
                  </div>
                ) : (
                  <div className="mt-5 space-y-3 max-h-[560px] overflow-y-auto pr-2">
                    {pushDeliveries.map((delivery) => (
                      <div key={delivery.id} className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ${
                              delivery.status === 'SENT'
                                ? 'bg-emerald-500/15 text-emerald-300'
                                : delivery.status === 'SKIPPED'
                                  ? 'bg-amber-500/15 text-amber-300'
                                  : delivery.status === 'DEACTIVATED'
                                    ? 'bg-fuchsia-500/15 text-fuchsia-300'
                                    : 'bg-red-500/15 text-red-300'
                            }`}>
                              {delivery.status}
                            </span>
                            <span className="rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-white/65">
                              {delivery.topic}
                            </span>
                          </div>
                          <div className="text-xs text-white/40">{formatRelativeTime(delivery.createdAt)}</div>
                        </div>
                        <div className="mt-3 text-sm font-semibold text-white">{delivery.title}</div>
                        <div className="mt-1 text-xs text-white/45">{formatAddress(delivery.wallet)}</div>
                        {delivery.reason ? (
                          <div className="mt-2 text-xs text-white/55">Reason: {delivery.reason}</div>
                        ) : null}
                        {delivery.errorMessage ? (
                          <div className="mt-2 text-xs text-red-300">{delivery.errorMessage}</div>
                        ) : null}
                        {delivery.url ? (
                          <div className="mt-2 text-xs text-cyan-300">{delivery.url}</div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
