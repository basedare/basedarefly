'use client';

import Image from 'next/image';
import Link from 'next/link';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAccount } from 'wagmi';
import {
  Shield,
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
} from 'lucide-react';
import LiquidBackground from '@/components/LiquidBackground';
import GradualBlurOverlay from '@/components/GradualBlurOverlay';

interface DareForModeration {
  id: string;
  shortId: string | null;
  title: string;
  bounty: number;
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

type AdminTab = 'moderation' | 'claims' | 'tags' | 'placeTags' | 'places';

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
  const { address, isConnected } = useAccount();
  const placeTagRejectReasonRef = useRef<HTMLTextAreaElement | null>(null);
  const [activeTab, setActiveTab] = useState<AdminTab>('moderation');
  const [dares, setDares] = useState<DareForModeration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [moderating, setModerating] = useState<string | null>(null);
  const [selectedDare, setSelectedDare] = useState<DareForModeration | null>(null);
  const [moderateNote, setModerateNote] = useState('');
  const [queueSummary, setQueueSummary] = useState<QueueSummary>({
    readyNow: 0,
    oldestProofHours: 0,
    campaignBackedReady: 0,
  });

  // Tags management state
  const [pendingTags, setPendingTags] = useState<PendingTag[]>([]);
  const [tagsLoading, setTagsLoading] = useState(false);
  const [tagsError, setTagsError] = useState<string | null>(null);
  const [processingTag, setProcessingTag] = useState<string | null>(null);
  const [selectedTag, setSelectedTag] = useState<PendingTag | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [adminSecret, setAdminSecret] = useState('');
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

  // Claims management state
  const [pendingClaims, setPendingClaims] = useState<ClaimRequest[]>([]);
  const [claimsLoading, setClaimsLoading] = useState(false);
  const [claimsError, setClaimsError] = useState<string | null>(null);
  const [processingClaim, setProcessingClaim] = useState<string | null>(null);
  const [selectedClaim, setSelectedClaim] = useState<ClaimRequest | null>(null);
  const [claimRejectReason, setClaimRejectReason] = useState('');

  // Fetch moderation queue
  const fetchQueue = useCallback(async () => {
    if (!address) return;

    try {
      setLoading(true);
      setError(null);

      const res = await fetch('/api/admin/moderate', {
        headers: {
          'x-moderator-wallet': address,
        },
      });

      const data = await res.json();

      if (data.success) {
        setIsAuthorized(true);
        const nextDares = data.data.dares || [];
        setDares(nextDares);
        setQueueSummary(
          data.data.queueSummary || {
            readyNow: 0,
            oldestProofHours: 0,
            campaignBackedReady: 0,
          }
        );
        setSelectedDare((current) => {
          if (!nextDares.length) return null;
          if (!current) return nextDares[0];
          return nextDares.find((dare: DareForModeration) => dare.id === current.id) || nextDares[0];
        });
      } else if (res.status === 401) {
        setIsAuthorized(false);
        setError('Your wallet is not authorized as a moderator');
      } else {
        setError(data.error || 'Failed to load moderation queue');
      }
    } catch {
      setError('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => {
    if (isConnected && address) {
      fetchQueue();
    } else {
      setLoading(false);
    }
  }, [isConnected, address, fetchQueue]);

  // Fetch pending tags
  const fetchPendingTags = useCallback(async () => {
    if (!adminSecret) return;

    setTagsLoading(true);
    setTagsError(null);

    try {
      const res = await fetch('/api/admin/tags?status=PENDING', {
        headers: {
          'x-admin-secret': adminSecret,
        },
      });

      const data = await res.json();

      if (data.success) {
        setIsTagsAuthorized(true);
        setPendingTags(data.data.tags);
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
  }, [adminSecret]);

  // Handle tag verification
  const handleTagAction = async (tagId: string, action: 'VERIFY_MANUAL' | 'REJECT_MANUAL') => {
    if (!adminSecret) return;

    setProcessingTag(tagId);

    try {
      const res = await fetch('/api/admin/tags', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-secret': adminSecret,
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
    if (activeTab === 'tags' && adminSecret && (!isTagsAuthorized || pendingTags.length === 0)) {
      fetchPendingTags();
    }
  }, [activeTab, adminSecret, isTagsAuthorized, pendingTags.length, fetchPendingTags]);

  const fetchPendingPlaceTags = useCallback(async () => {
    if (!adminSecret) return;

    setPlaceTagsLoading(true);
    setPlaceTagsError(null);

    try {
      const res = await fetch('/api/admin/place-tags?status=PENDING', {
        headers: {
          'x-admin-secret': adminSecret,
        },
      });

      const data = await res.json();

      if (data.success) {
        setIsTagsAuthorized(true);
        setPendingPlaceTags(data.data.tags);
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
  }, [adminSecret]);

  const handlePlaceTagAction = useCallback(async (
    tagId: string,
    action: 'APPROVE' | 'REJECT' | 'FLAG',
    options?: { openNext?: boolean }
  ) => {
    if (!adminSecret) return;

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
      const res = await fetch('/api/admin/place-tags', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-secret': adminSecret,
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
  }, [adminSecret, pendingPlaceTags, placeTagRejectReason]);

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
        void handlePlaceTagAction(selectedPlaceTag.id, 'APPROVE');
        return;
      }

      if (key === 'r') {
        event.preventDefault();
        handlePlaceTagRejectIntent();
        return;
      }

      if (key === 'f') {
        event.preventDefault();
        void handlePlaceTagAction(selectedPlaceTag.id, 'FLAG');
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

  const fetchPlaces = useCallback(async (query?: string) => {
    if (!adminSecret) return;

    setPlacesLoading(true);
    setPlacesError(null);

    try {
      const url = new URL('/api/admin/places', window.location.origin);
      if (query?.trim()) {
        url.searchParams.set('q', query.trim());
      }

      const res = await fetch(url.toString(), {
        headers: {
          'x-admin-secret': adminSecret,
        },
      });

      const data = await res.json();

      if (data.success) {
        setIsTagsAuthorized(true);
        setPlaces(data.data.places);
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
  }, [adminSecret]);

  const handleSavePlace = async () => {
    if (!adminSecret) return;

    setSavingPlace(true);
    setPlacesError(null);

    try {
      const res = await fetch('/api/admin/places', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-secret': adminSecret,
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
    if (activeTab === 'placeTags' && adminSecret && (!isTagsAuthorized || pendingPlaceTags.length === 0)) {
      fetchPendingPlaceTags();
    }
  }, [activeTab, adminSecret, isTagsAuthorized, pendingPlaceTags.length, fetchPendingPlaceTags]);

  useEffect(() => {
    if (activeTab === 'places' && adminSecret && (!isTagsAuthorized || places.length === 0)) {
      fetchPlaces(placesSearchQuery);
    }
  }, [activeTab, adminSecret, isTagsAuthorized, places.length, placesSearchQuery, fetchPlaces]);

  // Fetch pending claims (uses moderator wallet auth, same as moderation queue)
  const fetchPendingClaims = useCallback(async () => {
    if (!address) return;

    setClaimsLoading(true);
    setClaimsError(null);

    try {
      const res = await fetch('/api/admin/claims?status=PENDING', {
        headers: {
          'x-moderator-wallet': address,
        },
      });

      const data = await res.json();

      if (data.success) {
        setPendingClaims(data.data.claims);
      } else {
        setClaimsError(data.error || 'Failed to load pending claims');
      }
    } catch {
      setClaimsError('Failed to connect to server');
    } finally {
      setClaimsLoading(false);
    }
  }, [address]);

  // Handle claim decision
  const handleClaimDecision = async (dareId: string, decision: 'APPROVE' | 'REJECT') => {
    if (!address) return;

    setProcessingClaim(dareId);

    try {
      const res = await fetch('/api/admin/claims', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-moderator-wallet': address,
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

  // Load claims when tab switches
  useEffect(() => {
    if (activeTab === 'claims' && isAuthorized) {
      fetchPendingClaims();
    }
  }, [activeTab, isAuthorized, fetchPendingClaims]);

  // Handle moderation decision
  const handleModerate = async (
    dareId: string,
    decision: 'APPROVE' | 'REJECT',
    options?: { openNext?: boolean }
  ) => {
    if (!address) return;

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
          'x-moderator-wallet': address,
        },
        body: JSON.stringify({
          dareId,
          decision,
          note: moderateNote || undefined,
        }),
      });

      const data = await res.json();

      if (data.success) {
        // Remove from list
        setDares((prev) => prev.filter((d) => d.id !== dareId));
        setSelectedDare(openNext ? nextDareCandidate ?? null : null);
        setModerateNote('');
      } else {
        setError(data.error || 'Failed to moderate');
      }
    } catch {
      setError('Failed to submit moderation decision');
    } finally {
      setModerating(null);
    }
  };

  const formatAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

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
          {isConnected && isAuthorized && (
            <div className="flex justify-center gap-2 mt-6 flex-wrap">
              <button
                onClick={() => setActiveTab('moderation')}
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
                onClick={() => setActiveTab('claims')}
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
                onClick={() => setActiveTab('tags')}
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
                onClick={() => setActiveTab('placeTags')}
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
                onClick={() => setActiveTab('places')}
                className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${
                  activeTab === 'places'
                    ? 'bg-emerald-500/20 border border-emerald-500/50 text-emerald-300'
                    : 'bg-white/5 border border-white/10 text-gray-400 hover:text-white'
                }`}
              >
                <MapPin className="w-4 h-4 inline mr-2" />
                Places
              </button>
            </div>
          )}
        </div>

        {/* Not Connected State */}
        {!isConnected && (
          <div className="backdrop-blur-xl bg-yellow-500/5 border border-yellow-500/30 rounded-2xl p-8 text-center">
            <Lock className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Connect Wallet</h3>
            <p className="text-gray-400 text-sm">
              Connect your moderator wallet to access the admin panel
            </p>
          </div>
        )}

        {/* Not Authorized State */}
        {isConnected && !loading && !isAuthorized && (
          <div className="backdrop-blur-xl bg-red-500/5 border border-red-500/30 rounded-2xl p-8 text-center">
            <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Not Authorized</h3>
            <p className="text-gray-400 text-sm mb-4">
              Your wallet ({address && formatAddress(address)}) is not registered as a moderator.
            </p>
            <p className="text-gray-500 text-xs font-mono">
              Add your wallet to MODERATOR_WALLETS in .env.local
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
        {isConnected && isAuthorized && !loading && activeTab === 'moderation' && (
          <div className="space-y-6">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
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
            </div>

          <div className="grid lg:grid-cols-2 gap-6">
            {/* Queue List */}
            <div className="backdrop-blur-xl bg-black/20 border border-white/10 rounded-2xl p-6">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-400" />
                Pending Review ({dares.length})
              </h3>

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

                  {/* Action Buttons */}
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => handleModerate(selectedDare.id, 'REJECT')}
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
                      onClick={() => handleModerate(selectedDare.id, 'APPROVE')}
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
                      onClick={() => handleModerate(selectedDare.id, 'REJECT', { openNext: true })}
                      disabled={moderating === selectedDare.id}
                      className="flex items-center justify-center gap-2 px-4 py-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-300 font-bold text-[11px] uppercase tracking-[0.18em] rounded-xl transition-colors disabled:opacity-50"
                    >
                      {moderating === selectedDare.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Clock className="w-4 h-4" />}
                      Reject + Next
                    </button>
                    <button
                      onClick={() => handleModerate(selectedDare.id, 'APPROVE', { openNext: true })}
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
        {isConnected && isAuthorized && !loading && activeTab === 'claims' && (
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
        {isConnected && isAuthorized && !loading && activeTab === 'tags' && (
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
                    disabled={!adminSecret || tagsLoading}
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

        {/* Authorized Content - Place Tags Tab */}
        {isConnected && isAuthorized && !loading && activeTab === 'placeTags' && (
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
                    disabled={!adminSecret || placeTagsLoading}
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
                      {pendingPlaceTags.map((tag) => (
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
                            <span className="px-2 py-1 text-[10px] font-bold uppercase rounded bg-cyan-500/20 text-cyan-300 shrink-0">
                              {tag.proofType}
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-xs font-mono">
                            <span className="text-gray-400">{tag.venue.city || 'Unknown city'}</span>
                            <span className="text-gray-500">
                              {new Date(tag.submittedAt).toLocaleDateString()}
                            </span>
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
                      ))}
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
                        Shortcuts: <span className="text-cyan-300">A</span> approve, <span className="text-red-300">R</span> reject, <span className="text-yellow-300">F</span> flag, <span className="text-white/65">N</span> next
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

        {isConnected && isAuthorized && !loading && activeTab === 'places' && (
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
                    disabled={!adminSecret || placesLoading}
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
      </div>
    </div>
  );
}
