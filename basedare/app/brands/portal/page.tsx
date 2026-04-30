'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAccount, useConnect, usePublicClient, useWriteContract } from 'wagmi';
import { useSession } from 'next-auth/react';
import { getPreferredWalletConnector } from '@/lib/wallet-connect';
import Link from 'next/link';
import { ArrowLeft, MapPin, PlayCircle, Users } from 'lucide-react';
import ParticleNetwork from '@/components/ParticleNetwork';
import { useBountyMode } from '@/hooks/useBountyMode';
import { submitBountyCreation, type BountyApprovalStatus } from '@/lib/bounty-flow';
import { NETWORK_CONFIG } from '@/lib/contracts';
import { buildVenueActivationCreateHref } from '@/lib/venue-launch';

// ============================================================================
// CONTROL MODE - BRAND PORTAL
// B2B dashboard for programmatic attention marketing
// ============================================================================

interface Brand {
  id: string;
  name: string;
  logo: string | null;
  walletAddress: string;
  verified: boolean;
  totalSpend: number;
  campaignSummary?: {
    total: number;
    live: number;
    settled: number;
    place: number;
    creator: number;
    creatorMovement: number;
    claimRequestsPending: number;
    creatorsAttached: number;
    proofsSubmitted: number;
    inReview: number;
    payoutQueued: number;
    paid: number;
  };
  venueRadar?: BrandVenueRadarItem[];
}

interface BrandVenueRadarItem {
  id: string;
  slug: string;
  name: string;
  city: string | null;
  country: string | null;
  claimState: 'unclaimed' | 'pending' | 'claimed';
  commandStatus: 'live' | 'claimable';
  sponsorReady: boolean;
  priorityLabel: string;
  strategyLabel: string;
  summary: string;
  score: number;
  rankReasons: string[];
  activity: {
    approvedMarks: number;
    activeChallenges: number;
    paidActivations: number;
    totalLiveFundingUsd: number;
    uniqueVisitorsToday: number;
    scansLastHour: number;
    recentCompletedCount: number;
  };
  brandHistory: {
    campaigns: number;
    liveCampaigns: number;
    totalSpendUsd: number;
  };
  topCreators: Array<{
    creatorTag: string;
    walletAddress: string;
    marksHere: number;
    firstMarksHere: number;
    latestMarkAt: string;
    totalEarned: number;
    completedDares: number;
    followerCount: number | null;
    trustLevel: number;
    trustLabel: string;
    trustScore: number;
  }>;
  recentSignals: Array<{
    creatorTag: string | null;
    caption: string | null;
    submittedAt: string;
    vibeTags: string[];
    firstMark: boolean;
  }>;
  contactUrl: string;
  contactLabel: string;
  consoleUrl: string | null;
}

interface Campaign {
  id: string;
  shortId: string;
  type: string;
  tier: string;
  title: string;
  description: string | null;
  budgetUsdc: number;
  creatorCountTarget: number;
  payoutPerCreator: number;
  status: string;
  syncTime: string | null;
  createdAt: string;
  venue?: {
    id: string;
    slug: string;
    name: string;
    city: string | null;
    country: string | null;
    impact?: {
      pulseNow: number;
      memoriesNow: number;
      lastMarkedAt: string | null;
      recentProofCount: number;
      recentCompletedCount: number;
      recentCheckInCount: number;
      memoryBucketStartedAt: string | null;
      campaignVerifiedMemory: boolean;
      firstMarkWon: boolean;
      pulseContribution: number;
      linkedMemoryAt: string | null;
    };
  } | null;
  linkedDare?: {
    id: string;
    shortId: string | null;
    status: string;
    videoUrl?: string | null;
    createdAt?: string | null;
    updatedAt?: string | null;
    moderatedAt?: string | null;
    verifiedAt?: string | null;
    completedAt?: string | null;
    streamerHandle?: string | null;
    targetWalletAddress?: string | null;
    claimedBy?: string | null;
    claimedAt?: string | null;
    claimRequestWallet?: string | null;
    claimRequestTag?: string | null;
    claimRequestedAt?: string | null;
    claimRequestStatus?: string | null;
    moderatorNote?: string | null;
  } | null;
  truth?: {
    sourceOfTruth: 'LINKED_DARE' | 'CAMPAIGN';
    lifecycleState: string;
    followsLinkedDare: boolean;
    creatorRoutingDormant: boolean;
    linkedDareState: {
      id: string;
      shortId: string | null;
      status: string;
      verifiedAt: string | null;
      completedAt: string | null;
      createdAt: string | null;
      venueId: string | null;
    } | null;
    timeline: {
      createdAt: string | null;
      fundedAt: string | null;
      liveAt: string | null;
      settledAt: string | null;
      linkedDareVerifiedAt: string | null;
      linkedDareCompletedAt: string | null;
      lastOperationalAt: string | null;
    };
  };
  slotCounts: {
    total: number;
    open: number;
    claimed: number;
    assigned: number;
    completed: number;
  };
  targetingCriteria?: string;
}

interface CampaignFormData {
  type: 'PLACE' | 'CREATOR';
  tier: 'SIP_MENTION' | 'SIP_SHILL' | 'CHALLENGE' | 'APEX';
  title: string;
  description: string;
  creatorCountTarget: number;
  payoutPerCreator: number;
  syncTime: string;
  targetingCriteria: {
    niche: string;
    minFollowers: number;
    location: 'anywhere' | 'near-venue';
    platforms: string[];
  };
  verificationCriteria: {
    hashtagsRequired: string[];
    minDurationSeconds: number;
    productVisible?: {
      target: string;
      minFramePercent: number;
    };
    ctaSpoken?: {
      phrase: string;
      fuzzyMatch: boolean;
    };
  };
}

interface CampaignMatch {
  score: number;
  reasons: string[];
  venueAffinity: {
    exactVenueMarks: number;
    exactVenueCheckIns: number;
    exactVenueWins: number;
    sameCityMarks: number;
  };
  creator: {
    id: string;
    tag: string;
    walletAddress: string;
    bio: string | null;
    pfpUrl: string | null;
    followerCount: number | null;
    tags: string[];
    status: string;
    identityPlatform: string | null;
    identityHandle: string | null;
    totalEarned: number;
    completedDares: number;
    platforms: {
      twitter: { handle: string; verified: boolean } | null;
      twitch: { handle: string; verified: boolean } | null;
      youtube: { handle: string; verified: boolean } | null;
      kick: { handle: string; verified: boolean } | null;
    };
  };
}

interface CampaignMatchesState {
  loading: boolean;
  data: CampaignMatch[];
  error: string | null;
}

type ResponseRailTab = 'shortlisted' | 'claimed' | 'proof' | 'review' | 'verified';
type VenueRadarFilter = 'hot' | 'managed' | 'claimable';
type CampaignTier = CampaignFormData['tier'];
type ComposerPrefill = {
  creatorTag?: string | null;
  tier?: CampaignTier;
  payoutPerCreator?: number | null;
  title?: string | null;
  description?: string | null;
  syncTime?: string | null;
  reportSource?: string | null;
  reportAudience?: 'venue' | 'sponsor' | null;
  reportSessionKey?: string | null;
  reportIntent?: 'activation' | 'repeat' | null;
};

type ReportAttribution = {
  source: string | null;
  audience: 'venue' | 'sponsor' | null;
  sessionKey: string | null;
  intent: 'activation' | 'repeat' | null;
};

const PLATFORM_OPTIONS = [
  { value: 'twitter', label: 'X' },
  { value: 'twitch', label: 'Twitch' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'kick', label: 'Kick' },
] as const;

interface PlaceSearchResult {
  id: string;
  name: string;
  displayName: string;
  address?: string | null;
  city: string | null;
  country: string | null;
  slug?: string;
  placeId?: string;
  placeSource?: string;
  externalPlaceId?: string;
  latitude?: number;
  longitude?: number;
}

const TIER_INFO = {
  SIP_MENTION: {
    name: 'Visit & Post',
    description: 'Creator visits and posts about your venue',
    minPayout: 50,
    window: '7 days',
    bonus: 'None',
    rake: '25%',
    color: 'from-zinc-600 to-zinc-700',
    borderColor: 'border-zinc-500/30',
  },
  SIP_SHILL: {
    name: 'Product Experience',
    description: 'Creator tries your product and shows it',
    minPayout: 100,
    window: '24 hours',
    bonus: 'None',
    rake: '28%',
    color: 'from-blue-600 to-blue-700',
    borderColor: 'border-blue-500/30',
  },
  CHALLENGE: {
    name: 'Branded Challenge',
    description: 'Creator runs a challenge at your venue',
    minPayout: 250,
    window: '2 hours',
    bonus: '1.3x Strike',
    rake: '30%',
    color: 'from-purple-600 to-purple-700',
    borderColor: 'border-purple-500/30',
  },
  APEX: {
    name: 'Headline Stunt',
    description: 'Custom high-impact activation with your brief',
    minPayout: 1000,
    window: '1 hour',
    bonus: '1.5x Strike',
    rake: '35%',
    color: 'from-amber-500 to-orange-600',
    borderColor: 'border-amber-500/30',
  },
};

function isCampaignTier(value: string | null): value is CampaignTier {
  return value === 'SIP_MENTION' || value === 'SIP_SHILL' || value === 'CHALLENGE' || value === 'APEX';
}

function formatCompactAudience(value: number | null) {
  if (typeof value !== 'number' || value <= 0) return 'Building';
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M+`;
  if (value >= 10_000) return `${Math.round(value / 1_000)}K+`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K+`;
  return `${value}+`;
}

function getCreatorInitial(tag: string) {
  return tag.replace(/^@/, '').charAt(0).toUpperCase() || 'C';
}

function getCreatorVenueFitLabel(match: CampaignMatch) {
  if (match.venueAffinity.exactVenueWins > 0) return 'Proven here';
  if (match.venueAffinity.exactVenueMarks > 0 || match.venueAffinity.exactVenueCheckIns > 0) return 'Knows this venue';
  if (match.venueAffinity.sameCityMarks > 0) return 'Active nearby';
  return 'Fresh eyes';
}

function getCreatorReliabilityLabel(match: CampaignMatch) {
  if (match.creator.completedDares >= 10) return 'Elite closer';
  if (match.creator.completedDares >= 5) return 'Reliable closer';
  if (match.creator.completedDares >= 1) return 'Getting reps';
  return 'New to BaseDare';
}

function getCreatorStrengthLabel(match: CampaignMatch) {
  if (match.creator.platforms.youtube) return 'Strong on YouTube';
  if (match.creator.platforms.twitter) return 'Strong on X';
  if (match.creator.platforms.twitch) return 'Strong on Twitch';
  if (match.creator.platforms.kick) return 'Strong on Kick';
  if ((match.creator.followerCount ?? 0) >= 10000) return 'Audience signal';
  return 'Ready to activate';
}

function getVenueRadarClaimTone(venue: BrandVenueRadarItem) {
  if (venue.claimState === 'claimed') {
    return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  }

  if (venue.claimState === 'pending') {
    return 'border-amber-200 bg-amber-50 text-amber-700';
  }

  return 'border-zinc-200 bg-zinc-100 text-zinc-600';
}

function formatVenueRadarLocation(venue: Pick<BrandVenueRadarItem, 'city' | 'country'>) {
  return [venue.city, venue.country].filter(Boolean).join(', ') || 'Venue on the grid';
}

function buildBrandPortalActivationHref(venue?: BrandVenueRadarItem | null, creatorTag?: string | null) {
  if (!venue) {
    return '/create?mode=venue-activation&source=brand-portal&title=Launch+a+paid+venue+activation&amount=120';
  }

  return buildVenueActivationCreateHref({
    venueId: venue.id,
    venueSlug: venue.slug,
    venueName: venue.name,
    payout: 120,
    creatorTag,
    source: 'brand-portal',
  });
}

export default function BrandPortalPage() {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const { data: session } = useSession();
  const sessionToken = (session as { token?: string | null } | null)?.token ?? null;
  const { simulated: isSimulationMode } = useBountyMode();

  // Hydration guard to prevent SSR/client mismatch flickering
  const [mounted, setMounted] = useState(false);

  const [brand, setBrand] = useState<Brand | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRegister, setShowRegister] = useState(false);
  const [showCreateCampaign, setShowCreateCampaign] = useState(false);
  const [registerName, setRegisterName] = useState('');
  const [venueRadarFilter, setVenueRadarFilter] = useState<VenueRadarFilter>('hot');
  const [selectedVenueRadarId, setSelectedVenueRadarId] = useState<string | null>(null);
  const [preferredCreatorTag, setPreferredCreatorTag] = useState<string | null>(null);
  const [reportAttribution, setReportAttribution] = useState<ReportAttribution | null>(null);

  const [formData, setFormData] = useState<CampaignFormData>({
    type: 'PLACE',
    tier: 'SIP_SHILL',
    title: '',
    description: '',
    creatorCountTarget: 10,
    payoutPerCreator: 100,
    syncTime: '',
    targetingCriteria: {
      niche: '',
      minFollowers: 0,
      location: 'anywhere',
      platforms: [],
    },
    verificationCriteria: {
      hashtagsRequired: [],
      minDurationSeconds: 30,
    },
  });
  const [hashtagInput, setHashtagInput] = useState('');
  const [placeQuery, setPlaceQuery] = useState('');
  const [placeResults, setPlaceResults] = useState<PlaceSearchResult[]>([]);
  const [placeLoading, setPlaceLoading] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<PlaceSearchResult | null>(null);
  const [recommendedCreators, setRecommendedCreators] = useState<CampaignMatch[]>([]);
  const [recommendedCreatorsLoading, setRecommendedCreatorsLoading] = useState(false);
  const [recommendedCreatorsError, setRecommendedCreatorsError] = useState<string | null>(null);
  const [selectedCreatorId, setSelectedCreatorId] = useState<string | null>(null);
  const [creatingCampaign, setCreatingCampaign] = useState(false);
  const [approvalStatus, setApprovalStatus] = useState<BountyApprovalStatus>('idle');
  const [expandedMatchesCampaignId, setExpandedMatchesCampaignId] = useState<string | null>(null);
  const [responsesTabByCampaign, setResponsesTabByCampaign] = useState<Record<string, ResponseRailTab>>({});
  const [matchesByCampaign, setMatchesByCampaign] = useState<Record<string, CampaignMatchesState>>({});
  const [shortlistedCreators, setShortlistedCreators] = useState<Record<string, string[]>>({});
  const [handledDeepLinkKey, setHandledDeepLinkKey] = useState<string | null>(null);
  const [deepLinkSearch, setDeepLinkSearch] = useState('');
  const campaignSummary = brand?.campaignSummary;
  const liveCampaignCount =
    campaignSummary?.live ?? campaigns.filter((c) => ['RECRUITING', 'LIVE'].includes(c.status)).length;
  const creatorMovementCount =
    campaignSummary?.creatorMovement ??
    campaigns.filter(
      (campaign) =>
        campaign.linkedDare?.claimRequestStatus === 'PENDING' ||
        Boolean(campaign.linkedDare?.claimedBy || campaign.linkedDare?.targetWalletAddress)
    ).length;
  const proofsSubmittedCount =
    campaignSummary?.proofsSubmitted ?? campaigns.filter((campaign) => Boolean(campaign.linkedDare?.videoUrl)).length;
  const claimRequestsPendingCount =
    campaignSummary?.claimRequestsPending ??
    campaigns.filter((campaign) => campaign.linkedDare?.claimRequestStatus === 'PENDING').length;
  const creatorsAttachedCount =
    campaignSummary?.creatorsAttached ??
    campaigns.filter((campaign) => Boolean(campaign.linkedDare?.claimedBy || campaign.linkedDare?.targetWalletAddress)).length;
  const paidOutCount =
    campaignSummary?.paid ?? campaigns.filter((campaign) => campaign.linkedDare?.status === 'VERIFIED').length;
  const inReviewCount =
    campaignSummary?.inReview ?? campaigns.filter((campaign) => campaign.linkedDare?.status === 'PENDING_REVIEW').length;
  const payoutQueuedCount =
    campaignSummary?.payoutQueued ?? campaigns.filter((campaign) => campaign.linkedDare?.status === 'PENDING_PAYOUT').length;
  const venueRadar = useMemo(() => brand?.venueRadar ?? [], [brand?.venueRadar]);
  const filteredVenueRadar = venueRadar.filter((venue) => {
    if (venueRadarFilter === 'managed') {
      return venue.claimState === 'claimed' || venue.sponsorReady;
    }

    if (venueRadarFilter === 'claimable') {
      return venue.claimState !== 'claimed';
    }

    return true;
  });
  const selectedVenueRadar =
    filteredVenueRadar.find((venue) => venue.id === selectedVenueRadarId) ??
    filteredVenueRadar[0] ??
    venueRadar[0] ??
    null;

  const openCampaignComposerForVenue = useCallback((venue: BrandVenueRadarItem, prefillInput?: string | null | ComposerPrefill) => {
    const prefill =
      typeof prefillInput === 'string' || prefillInput === null || prefillInput === undefined
        ? { creatorTag: prefillInput ?? null }
        : prefillInput;
    const displayName = [venue.name, formatVenueRadarLocation(venue)].filter(Boolean).join(', ');
    const nextTier = prefill.tier ?? 'SIP_SHILL';
    const minimumPayout = NETWORK_CONFIG.isMainnet ? TIER_INFO[nextTier].minPayout : 1;
    const nextPayout = prefill.payoutPerCreator ? Math.max(prefill.payoutPerCreator, minimumPayout) : null;

    setSelectedPlace({
      id: venue.id,
      name: venue.name,
      displayName,
      city: venue.city,
      country: venue.country,
      placeId: venue.id,
      slug: venue.slug,
    });
    setPlaceQuery(displayName);
    setFormData((current) => ({
      ...current,
      type: 'PLACE',
      tier: nextTier,
      title: prefill.title?.trim() || (current.title.trim() ? current.title : `${venue.name} activation`),
      description:
        prefill.description?.trim() ||
        (current.description.trim()
          ? current.description
          : `Launch a creator activation at ${venue.name} while venue signal is already building.`),
      payoutPerCreator: nextPayout ?? Math.max(current.payoutPerCreator, minimumPayout),
      syncTime: prefill.syncTime ?? current.syncTime,
      targetingCriteria: {
        ...current.targetingCriteria,
        location: 'near-venue',
      },
    }));
    setPreferredCreatorTag(prefill.creatorTag?.trim() || null);
    setReportAttribution(
      prefill.reportSource === 'venue-report'
        ? {
            source: prefill.reportSource,
            audience: prefill.reportAudience ?? 'venue',
            sessionKey: prefill.reportSessionKey ?? null,
            intent: prefill.reportIntent ?? null,
          }
        : null
    );
    setShowCreateCampaign(true);
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 50);
  }, []);

  // Mark as mounted after hydration
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || typeof window === 'undefined') return;
    setDeepLinkSearch(window.location.search);
  }, [mounted]);

  useEffect(() => {
    if (!mounted) return;
    if (!brand && campaigns.length === 0) return;

    const params = new URLSearchParams(deepLinkSearch);
    const venueSlug = params.get('venue');
    const campaignId = params.get('campaign');
    const compose = params.get('compose');
    const creatorTag = params.get('creator');
    const tier = params.get('tier');
    const payout = params.get('payout');
    const title = params.get('title');
    const objective = params.get('objective');
    const syncTime = params.get('syncTime');
    const reportSource = params.get('reportSource');
    const reportAudience =
      params.get('reportAudience') === 'sponsor'
        ? 'sponsor'
        : params.get('reportAudience') === 'venue'
          ? 'venue'
          : null;
    const reportSessionKey = params.get('reportSessionKey');
    const reportIntent =
      params.get('reportIntent') === 'repeat'
        ? 'repeat'
        : params.get('reportIntent') === 'activation'
          ? 'activation'
          : null;
    const deepLinkKey = `${venueSlug ?? ''}|${campaignId ?? ''}|${compose ?? ''}|${creatorTag ?? ''}|${tier ?? ''}|${payout ?? ''}|${title ?? ''}|${objective ?? ''}|${syncTime ?? ''}|${reportSource ?? ''}|${reportAudience ?? ''}|${reportSessionKey ?? ''}|${reportIntent ?? ''}`;

    if (handledDeepLinkKey === deepLinkKey) {
      return;
    }

    if (venueSlug) {
      const matchingVenue = venueRadar.find((venue) => venue.slug === venueSlug);
      if (matchingVenue) {
        setSelectedVenueRadarId(matchingVenue.id);

        if (compose === '1') {
          openCampaignComposerForVenue(matchingVenue, {
            creatorTag,
            tier: isCampaignTier(tier) ? tier : undefined,
            payoutPerCreator: payout ? Number.parseInt(payout, 10) : undefined,
            title,
            description: objective,
            syncTime,
            reportSource,
            reportAudience,
            reportSessionKey,
            reportIntent,
          });
        }
      }
    }

    if (campaignId) {
      const matchingCampaign = campaigns.find((campaign) => campaign.id === campaignId);
      if (matchingCampaign) {
        setExpandedMatchesCampaignId(matchingCampaign.id);
        setResponsesTabByCampaign((current) => ({
          ...current,
          [matchingCampaign.id]: current[matchingCampaign.id] ?? getDefaultResponseTab(matchingCampaign),
        }));
        setTimeout(() => {
          document.getElementById(`campaign-${matchingCampaign.id}`)?.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
          });
        }, 120);
      }
    }

    setHandledDeepLinkKey(deepLinkKey);
  }, [
    brand,
    campaigns,
    deepLinkSearch,
    handledDeepLinkKey,
    mounted,
    openCampaignComposerForVenue,
    venueRadar,
  ]);

  // Fetch brand and campaigns
  useEffect(() => {
    if (!isConnected || !address) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    const fetchData = async (isBackgroundRefresh = false) => {
      try {
        if (!isBackgroundRefresh) {
          setLoading(true);
        }

        const brandRes = await fetch(`/api/brands?wallet=${address}`);
        const brandData = await brandRes.json();

        if (!cancelled && brandData.success) {
          setBrand(brandData.data);

          const campaignsRes = await fetch(`/api/campaigns?brand=${address}`);
          const campaignsData = await campaignsRes.json();

          if (!cancelled && campaignsData.success) {
            setCampaigns(campaignsData.data);
          }
        } else if (!cancelled && brandData.code === 'NOT_FOUND') {
          setShowRegister(true);
        }
      } catch (error) {
        if (!cancelled) {
          console.error('Failed to fetch brand data:', error);
        }
      } finally {
        if (!cancelled && !isBackgroundRefresh) {
          setLoading(false);
        }
      }
    };

    void fetchData();
    const interval = window.setInterval(() => {
      void fetchData(true);
    }, 15000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [isConnected, address]);

  useEffect(() => {
    if (formData.type !== 'PLACE') {
      setPlaceResults([]);
      setPlaceLoading(false);
      return;
    }

    const trimmedQuery = placeQuery.trim();
    if (trimmedQuery.length < 2) {
      setPlaceResults([]);
      setPlaceLoading(false);
      return;
    }

    let cancelled = false;
    const controller = new AbortController();

    const run = async () => {
      try {
        setPlaceLoading(true);
        const response = await fetch(`/api/places/search?q=${encodeURIComponent(trimmedQuery)}`, {
          signal: controller.signal,
        });
        const payload = await response.json();
        if (!cancelled) {
          const results = payload.success ? payload.data?.results ?? [] : [];
          setPlaceResults(results);
        }
      } catch (error) {
        if (!cancelled) {
          console.error('Failed to search places:', error);
          setPlaceResults([]);
        }
      } finally {
        if (!cancelled) {
          setPlaceLoading(false);
        }
      }
    };

    const timer = window.setTimeout(run, 220);

    return () => {
      cancelled = true;
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [formData.type, placeQuery]);

  useEffect(() => {
    if (!showCreateCampaign || formData.type !== 'PLACE' || !address || !selectedPlace) {
      setRecommendedCreators([]);
      setRecommendedCreatorsLoading(false);
      setRecommendedCreatorsError(null);
      setSelectedCreatorId(null);
      return;
    }

    let cancelled = false;
    const controller = new AbortController();
    const targetingSignature = JSON.stringify(formData.targetingCriteria);

    const run = async () => {
      try {
        setRecommendedCreatorsLoading(true);
        setRecommendedCreatorsError(null);

        const response = await fetch('/api/campaigns/recommendations', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {}),
          },
          signal: controller.signal,
          body: JSON.stringify({
            brandWallet: address,
            venueId: selectedPlace.placeId,
            venueCity: selectedPlace.city ?? undefined,
            venueCountry: selectedPlace.country ?? undefined,
            targetingCriteria: JSON.parse(targetingSignature),
            limit: 4,
          }),
        });

        const payload = await response.json();

        if (!response.ok || !payload.success) {
          throw new Error(payload.error || 'Failed to load recommended creators');
        }

        if (cancelled) return;

        const matches = payload.data?.matches ?? [];
        setRecommendedCreators(matches);
        setSelectedCreatorId((current) =>
          current && matches.some((match: CampaignMatch) => match.creator.id === current)
            ? current
            : preferredCreatorTag
              ? matches.find((match: CampaignMatch) => match.creator.tag.toLowerCase() === preferredCreatorTag.toLowerCase())?.creator.id ?? matches[0]?.creator.id ?? null
              : matches[0]?.creator.id ?? null
        );
      } catch (error) {
        if (cancelled || controller.signal.aborted) return;
        setRecommendedCreators([]);
        setSelectedCreatorId(null);
        setRecommendedCreatorsError(
          error instanceof Error ? error.message : 'Failed to load recommended creators'
        );
      } finally {
        if (!cancelled) {
          setRecommendedCreatorsLoading(false);
        }
      }
    };

    const timer = window.setTimeout(run, 220);

    return () => {
      cancelled = true;
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [
    showCreateCampaign,
    formData.type,
    address,
    sessionToken,
    selectedPlace,
    preferredCreatorTag,
    formData.targetingCriteria,
  ]);

  const handleRegister = async () => {
    if (!address || !registerName.trim()) return;

    try {
      const res = await fetch('/api/brands', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {}),
        },
        body: JSON.stringify({
          name: registerName,
          walletAddress: address,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setBrand(data.data);
        setShowRegister(false);
      } else {
        alert(data.error);
      }
    } catch (error) {
      console.error('Failed to register brand:', error);
    }
  };

  const handleCreateCampaign = async () => {
    if (!address) return;

    try {
      setCreatingCampaign(true);
      setApprovalStatus('idle');
      const tierConfig = TIER_INFO[formData.tier];
      const activeMinPayout = NETWORK_CONFIG.isMainnet ? tierConfig.minPayout : 1;
      
      if (formData.payoutPerCreator < activeMinPayout) {
        alert(`Minimum payout for ${tierConfig.name} is $${activeMinPayout}`);
        return;
      }

      if (formData.type === 'PLACE' && !selectedPlace?.placeId) {
        if (
          !selectedPlace?.externalPlaceId ||
          typeof selectedPlace.latitude !== 'number' ||
          typeof selectedPlace.longitude !== 'number'
        ) {
          alert('Choose a valid place for this activation.');
          return;
        }
      }

      let resolvedVenueId = selectedPlace?.placeId;
      if (formData.type === 'PLACE' && !resolvedVenueId && selectedPlace) {
        const resolveResponse = await fetch('/api/places/resolve-or-create', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {}),
          },
          body: JSON.stringify({
            name: selectedPlace.name,
            latitude: selectedPlace.latitude,
            longitude: selectedPlace.longitude,
            address: selectedPlace.address ?? selectedPlace.displayName,
            city: selectedPlace.city,
            country: selectedPlace.country,
            placeSource: selectedPlace.placeSource ?? 'OSM_NOMINATIM',
            externalPlaceId: selectedPlace.externalPlaceId ?? selectedPlace.id,
          }),
        });

        const resolvePayload = await resolveResponse.json();
        if (!resolvePayload.success || !resolvePayload.data?.place?.id) {
          throw new Error(resolvePayload.error || 'Failed to resolve place');
        }

        resolvedVenueId = resolvePayload.data.place.id;
        setSelectedPlace((current) =>
          current
            ? {
                ...current,
                placeId: resolvePayload.data.place.id,
                slug: resolvePayload.data.place.slug ?? current.slug,
                address: resolvePayload.data.place.address ?? current.address,
              }
            : current
        );
      }

      if (formData.type === 'PLACE' && !selectedCreatorId) {
        alert('Pick a recommended creator before launching this campaign.');
        return;
      }

      const chosenCreator =
        formData.type === 'PLACE'
          ? recommendedCreators.find((match) => match.creator.id === selectedCreatorId) ?? null
          : null;

      if (formData.type === 'PLACE' && !chosenCreator) {
        alert('The selected creator recommendation is no longer available. Refresh and try again.');
        return;
      }

      let linkedDareId: string | undefined;

      if (formData.type === 'PLACE' && chosenCreator && resolvedVenueId) {
        const connectedWallet = address.toLowerCase();

        const fundedDare = await submitBountyCreation(
          {
            title: formData.title.trim(),
            description: formData.description.trim() || undefined,
            amount: formData.payoutPerCreator,
            streamerTag: chosenCreator.creator.tag,
            streamId: `brand:${Date.now()}`,
            missionMode: 'IRL',
            missionTag: 'brand-campaign',
            isNearbyDare: true,
            latitude: selectedPlace?.latitude,
            longitude: selectedPlace?.longitude,
            locationLabel: selectedPlace?.name || selectedPlace?.displayName || undefined,
            discoveryRadiusKm: 0.5,
            venueId: resolvedVenueId,
            creationContext: 'MAP',
            stakerAddress: connectedWallet,
          },
          {
            sessionToken,
            isSimulationMode,
            publicClient,
            writeContractAsync,
            onApprovalStatusChange: setApprovalStatus,
          }
        );

        linkedDareId = fundedDare.dareId;
      }

      const res = await fetch('/api/campaigns', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {}),
        },
        body: JSON.stringify({
          brandWallet: address,
          ...formData,
          creatorCountTarget: formData.type === 'PLACE' ? 1 : formData.creatorCountTarget,
          venueId: formData.type === 'PLACE' ? resolvedVenueId : undefined,
          selectedCreatorId: formData.type === 'PLACE' ? selectedCreatorId : undefined,
          linkedDareId,
          syncTime: formData.syncTime || undefined,
          reportSource: reportAttribution?.source ?? undefined,
          reportAudience: reportAttribution?.audience ?? undefined,
          reportSessionKey: reportAttribution?.sessionKey ?? undefined,
          reportIntent: reportAttribution?.intent ?? undefined,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setCampaigns([data.data, ...campaigns]);
        setShowCreateCampaign(false);
        setFormData({
          type: 'PLACE',
          tier: 'SIP_SHILL',
          title: '',
          description: '',
          creatorCountTarget: 10,
          payoutPerCreator: 100,
          syncTime: '',
          targetingCriteria: { niche: '', minFollowers: 0, location: 'anywhere', platforms: [] },
          verificationCriteria: { hashtagsRequired: [], minDurationSeconds: 30 },
        });
        setPlaceQuery('');
        setPlaceResults([]);
        setSelectedPlace(null);
        setPreferredCreatorTag(null);
        setReportAttribution(null);
        setRecommendedCreators([]);
        setRecommendedCreatorsError(null);
        setRecommendedCreatorsLoading(false);
        setSelectedCreatorId(null);
      } else if (data.code === 'CREATOR_CAMPAIGNS_DORMANT') {
        alert(data.error);
      } else {
        if (linkedDareId) {
          alert(`${data.error}\n\nEscrowed dare: ${linkedDareId}`);
        } else {
          alert(data.error);
        }
      }
    } catch (error) {
      console.error('Failed to create campaign:', error);
      const message = error instanceof Error ? error.message : 'Failed to create campaign';
      alert(message);
    } finally {
      setCreatingCampaign(false);
      setApprovalStatus('idle');
    }
  };

  const addHashtag = () => {
    if (hashtagInput.trim()) {
      const tag = hashtagInput.startsWith('#') ? hashtagInput : `#${hashtagInput}`;
      setFormData({
        ...formData,
        verificationCriteria: {
          ...formData.verificationCriteria,
          hashtagsRequired: [...formData.verificationCriteria.hashtagsRequired, tag],
        },
      });
      setHashtagInput('');
    }
  };

  const togglePreferredPlatform = (platform: string) => {
    setFormData((current) => {
      const hasPlatform = current.targetingCriteria.platforms.includes(platform);
      return {
        ...current,
        targetingCriteria: {
          ...current.targetingCriteria,
          platforms: hasPlatform
            ? current.targetingCriteria.platforms.filter((entry) => entry !== platform)
            : [...current.targetingCriteria.platforms, platform],
        },
      };
    });
  };

  const fetchMatchesForCampaign = async (campaignId: string) => {
    if (!address) return;

    setMatchesByCampaign((current) => ({
      ...current,
      [campaignId]: {
        loading: true,
        data: current[campaignId]?.data ?? [],
        error: null,
      },
    }));

    try {
      const response = await fetch(
        `/api/campaigns/${encodeURIComponent(campaignId)}/matches?brandWallet=${encodeURIComponent(address)}`,
        {
          headers: sessionToken ? { Authorization: `Bearer ${sessionToken}` } : undefined,
        }
      );
      const payload = await response.json();

      if (!payload.success) {
        throw new Error(payload.error || 'Failed to load matches');
      }

      setMatchesByCampaign((current) => ({
        ...current,
        [campaignId]: {
          loading: false,
          data: payload.data?.matches ?? [],
          error: null,
        },
      }));
    } catch (error) {
      setMatchesByCampaign((current) => ({
        ...current,
        [campaignId]: {
          loading: false,
          data: current[campaignId]?.data ?? [],
          error: error instanceof Error ? error.message : 'Failed to load matches',
        },
      }));
    }
  };

  const getDefaultResponseTab = (campaign: Campaign): ResponseRailTab => {
    const dare = campaign.linkedDare;
    if (dare?.status === 'VERIFIED' || dare?.status === 'PENDING_PAYOUT') return 'verified';
    if (dare?.status === 'PENDING_REVIEW') return 'review';
    if (dare?.videoUrl) return 'proof';
    if (dare?.claimRequestStatus === 'PENDING' || dare?.claimedBy || dare?.targetWalletAddress) return 'claimed';
    return 'shortlisted';
  };

  const toggleCampaignMatches = async (campaign: Campaign) => {
    const campaignId = campaign.id;
    const willExpand = expandedMatchesCampaignId !== campaignId;
    setExpandedMatchesCampaignId(willExpand ? campaignId : null);
    if (willExpand) {
      setResponsesTabByCampaign((current) => ({
        ...current,
        [campaignId]: current[campaignId] ?? getDefaultResponseTab(campaign),
      }));
    }

    if (!willExpand) return;
    if (matchesByCampaign[campaignId]?.data?.length || matchesByCampaign[campaignId]?.loading) return;

    await fetchMatchesForCampaign(campaignId);
  };

  const toggleShortlistCreator = (campaignId: string, creatorId: string) => {
    setShortlistedCreators((current) => {
      const currentList = current[campaignId] ?? [];
      const nextList = currentList.includes(creatorId)
        ? currentList.filter((id) => id !== creatorId)
        : [...currentList, creatorId];
      return {
        ...current,
        [campaignId]: nextList,
      };
    });
  };

  const formatTargetingPreview = (targetingRaw?: string) => {
    if (!targetingRaw) return [];

    try {
      const targeting = JSON.parse(targetingRaw) as CampaignFormData['targetingCriteria'];
      const chips: string[] = [];
      if (targeting.minFollowers && targeting.minFollowers > 0) {
        chips.push(`min ${targeting.minFollowers.toLocaleString()} followers`);
      }
      if (targeting.platforms?.length) {
        chips.push(targeting.platforms.map((platform) => platform.toUpperCase()).join(' + '));
      }
      if (targeting.niche?.trim()) {
        chips.push(targeting.niche.trim());
      }
      if (targeting.location === 'near-venue') {
        chips.push('venue-local');
      }
      return chips;
    } catch {
      return [];
    }
  };

  const calculateBudget = () => {
    const tierConfig = TIER_INFO[formData.tier];
    const effectiveSlotCount = formData.type === 'PLACE' ? 1 : formData.creatorCountTarget;
    const gross = formData.payoutPerCreator * effectiveSlotCount;
    const rake = gross * (parseInt(tierConfig.rake) / 100);
    return { gross, rake, total: gross + rake, effectiveSlotCount };
  };

  const budget = calculateBudget();

  const formatWallet = (value: string | null | undefined) =>
    value ? `${value.slice(0, 6)}...${value.slice(-4)}` : null;

  const getCampaignIntent = (campaign: Campaign) => {
    const dare = campaign.linkedDare;
    if (!dare) return null;

    const actor =
      (dare.streamerHandle && dare.streamerHandle !== '@open' ? dare.streamerHandle : null) ||
      dare.claimRequestTag ||
      formatWallet(dare.claimRequestWallet || dare.claimedBy || dare.targetWalletAddress) ||
      'Creator';

    if (dare.status === 'VERIFIED') {
      return {
        label: 'Paid',
        tone: 'emerald' as const,
        actor,
        detail: dare.verifiedAt
          ? `verified ${new Date(dare.verifiedAt).toLocaleString()}`
          : 'activation verified and payout completed',
      };
    }

    if (dare.status === 'PENDING_PAYOUT') {
      return {
        label: 'Payout queued',
        tone: 'cyan' as const,
        actor,
        detail: 'proof is approved and payout is being processed automatically',
      };
    }

    if (dare.status === 'PENDING_REVIEW') {
      return {
        label: 'Proof in review',
        tone: 'amber' as const,
        actor,
        detail: 'creator submitted proof, waiting on referee review',
      };
    }

    if (dare.claimRequestStatus === 'PENDING') {
      return {
        label: 'Claim request pending',
        tone: 'amber' as const,
        actor,
        detail: dare.claimRequestedAt
          ? `requested ${new Date(dare.claimRequestedAt).toLocaleString()}`
          : 'waiting for review',
      };
    }

    if (dare.claimedBy || dare.targetWalletAddress) {
      return {
        label: dare.status === 'PENDING' ? 'Ready for proof' : 'Claimed',
        tone: 'blue' as const,
        actor,
        detail: dare.claimedAt
          ? `claimed ${new Date(dare.claimedAt).toLocaleString()}`
          : dare.status === 'PENDING'
            ? 'creator is attached and can submit proof now'
            : 'creator is attached to this activation',
      };
    }

    if (campaign.type === 'PLACE') {
      return {
        label: 'Open',
        tone: 'zinc' as const,
        actor: 'No creator yet',
        detail: 'live on the map and waiting for a creator to pick it up',
      };
    }

    return null;
  };

  const getCampaignOutcomeSteps = (campaign: Campaign) => {
    const dare = campaign.linkedDare;
    const creatorAttached = Boolean(dare?.claimedBy || dare?.targetWalletAddress);
    const creatorPending = dare?.claimRequestStatus === 'PENDING';
    const proofAttached = Boolean(dare?.videoUrl);
    const proofInReview = dare?.status === 'PENDING_REVIEW';
    const payoutQueued = dare?.status === 'PENDING_PAYOUT';
    const paid = dare?.status === 'VERIFIED';

    return [
      {
        label: 'Live',
        state: dare ? 'done' : campaign.status === 'LIVE' ? 'done' : 'idle',
      },
      {
        label: 'Creator',
        state: creatorAttached ? 'done' : creatorPending ? 'active' : 'idle',
      },
      {
        label: 'Proof',
        state: paid || payoutQueued || proofInReview || proofAttached ? 'done' : 'idle',
      },
      {
        label: 'Paid',
        state: paid ? 'done' : payoutQueued ? 'active' : 'idle',
      },
    ] as const;
  };

  const getCampaignOutcomeSummary = (campaign: Campaign) => {
    const dare = campaign.linkedDare;
    if (!dare) {
      return {
        label: 'No linked activation yet',
        detail: 'This activation has not produced a live creator result yet.',
      };
    }

    if (dare.status === 'VERIFIED') {
      return {
        label: 'Verified result',
        detail: dare.verifiedAt
          ? `proof cleared ${new Date(dare.verifiedAt).toLocaleString()}`
          : 'proof cleared and payout completed',
      };
    }

    if (dare.status === 'PENDING_PAYOUT') {
      return {
        label: 'Proof cleared',
        detail: 'Waiting for payout retry to complete automatically.',
      };
    }

    if (dare.status === 'PENDING_REVIEW') {
      return {
        label: 'Proof submitted',
        detail: dare.videoUrl ? 'Proof media is attached and waiting on referee review.' : 'Submission is waiting on referee review.',
      };
    }

    if (dare.claimRequestStatus === 'PENDING') {
      return {
        label: 'Claim request in',
        detail: 'A creator has raised a hand. Review is still in flight.',
      };
    }

    if (dare.claimedBy || dare.targetWalletAddress) {
      return {
        label: 'Creator attached',
        detail: 'A creator is attached and the activation is waiting for proof.',
      };
    }

    return {
      label: 'Open activation',
      detail: 'Live on the map and waiting for a creator to engage.',
    };
  };

  const getCampaignRecentMovement = (campaign: Campaign) => {
    const dare = campaign.linkedDare;
    if (!dare) {
      return {
        label: 'No movement yet',
        detail: 'The activation is live but no creator has engaged with it yet.',
      };
    }

    if (dare.status === 'VERIFIED') {
      return {
        label: 'Paid out',
        detail: dare.verifiedAt
          ? `verified ${new Date(dare.verifiedAt).toLocaleString()}`
          : 'verified completion cleared payout',
      };
    }

    if (dare.status === 'PENDING_PAYOUT') {
      return {
        label: 'Awaiting chain settlement',
        detail: dare.moderatedAt
          ? `approved ${new Date(dare.moderatedAt).toLocaleString()}`
          : 'proof is approved and payout retry is running',
      };
    }

    if (dare.status === 'PENDING_REVIEW') {
      return {
        label: 'Proof submitted',
        detail: dare.updatedAt
          ? `submitted ${new Date(dare.updatedAt).toLocaleString()}`
          : 'proof is in review now',
      };
    }

    if (dare.claimRequestStatus === 'PENDING') {
      return {
        label: 'Creator raised a hand',
        detail: dare.claimRequestedAt
          ? `requested ${new Date(dare.claimRequestedAt).toLocaleString()}`
          : 'claim request is waiting for review',
      };
    }

    if (dare.claimedBy || dare.targetWalletAddress) {
      return {
        label: 'Creator attached',
        detail: dare.claimedAt
          ? `attached ${new Date(dare.claimedAt).toLocaleString()}`
          : 'creator can submit proof now',
      };
    }

    return {
        label: 'Live on the map',
        detail: dare.createdAt
          ? `linked ${new Date(dare.createdAt).toLocaleString()}`
          : 'activation is waiting for creator activity',
    };
  };

  const getCampaignCompletionHistory = (campaign: Campaign) => {
    const dare = campaign.linkedDare;
    if (!dare) return [];

    const entries = [
      dare.claimRequestedAt
        ? {
            key: 'claim-request',
            label: 'Claim requested',
            detail: dare.claimRequestTag || formatWallet(dare.claimRequestWallet) || 'Creator',
            at: dare.claimRequestedAt,
          }
        : null,
      dare.claimedAt
        ? {
            key: 'creator-attached',
            label: 'Creator attached',
            detail: dare.streamerHandle || formatWallet(dare.claimedBy || dare.targetWalletAddress) || 'Creator',
            at: dare.claimedAt,
          }
        : null,
      dare.updatedAt && dare.videoUrl
        ? {
            key: 'proof-submitted',
            label: 'Proof submitted',
            detail: 'Proof was submitted for review',
            at: dare.updatedAt,
          }
        : null,
      dare.moderatedAt
        ? {
            key: 'moderated',
            label: dare.status === 'FAILED' ? 'Rejected' : 'Approved',
            detail: dare.status === 'FAILED' ? 'Review closed this activation' : 'Review cleared the proof',
            at: dare.moderatedAt,
          }
        : null,
      dare.verifiedAt
        ? {
            key: 'paid',
            label: 'Paid',
            detail: 'Completion settled to the creator',
            at: dare.verifiedAt,
          }
        : null,
    ].filter(Boolean) as Array<{ key: string; label: string; detail: string; at: string }>;

    return entries
      .sort((left, right) => new Date(right.at).getTime() - new Date(left.at).getTime())
      .slice(0, 4);
  };

  const getLinkedCreatorHandle = (campaign: Campaign) => {
    const dare = campaign.linkedDare;
    return (
      (dare?.streamerHandle && dare.streamerHandle !== '@open' ? dare.streamerHandle : null) ||
      dare?.claimRequestTag ||
      formatWallet(dare?.claimRequestWallet || dare?.claimedBy || dare?.targetWalletAddress) ||
      'Creator'
    );
  };

  const getResponseTabCounts = (campaign: Campaign, matchesState?: CampaignMatchesState, shortlistedCount = 0) => {
    const dare = campaign.linkedDare;
    const shortlisted = shortlistedCount || (matchesState?.data?.length ?? 0);
    const claimed = dare?.claimRequestStatus === 'PENDING' || dare?.claimedBy || dare?.targetWalletAddress ? 1 : 0;
    const proof = dare?.videoUrl ? 1 : 0;
    const review = dare?.status === 'PENDING_REVIEW' ? 1 : 0;
    const verified = dare?.status === 'VERIFIED' || dare?.status === 'PENDING_PAYOUT' ? 1 : 0;

    return { shortlisted, claimed, proof, review, verified };
  };

  const getCampaignImpactSummary = (campaign: Campaign) => {
    const impact = campaign.venue?.impact;
    if (!campaign.venue || !impact) {
      return {
        label: 'Venue impact pending',
        detail: 'Attach this activation to a venue to track venue memory and momentum.',
      };
    }

    if (impact.campaignVerifiedMemory) {
      return {
        label: impact.firstMarkWon ? 'First mark won' : 'Verified memory added',
        detail: `${campaign.venue.name} now sits at ${impact.memoriesNow} memories and pulse ${impact.pulseNow}.`,
      };
    }

    if (campaign.linkedDare?.status === 'PENDING_REVIEW' || campaign.linkedDare?.videoUrl) {
      return {
        label: 'Outcome forming',
        detail: 'Proof is in review. Once it clears, the venue impact will appear here.',
      };
    }

    return {
      label: 'Venue pulse live',
      detail: `${campaign.venue.name} currently has ${impact.memoriesNow} memories and pulse ${impact.pulseNow}.`,
    };
  };

  // Determine current view state
  const showNotConnected = mounted && !isConnected;
  const showLoading = mounted && isConnected && loading;
  const showRegisterView = mounted && isConnected && !loading && showRegister;
  const showDashboard = mounted && isConnected && !loading && !showRegister;

  return (
    <div className="control-glass-room fixed inset-0 z-[100] overflow-auto bg-[#030305] text-white">
      <style>{`
        .control-glass-room {
          background:
            radial-gradient(circle at 1px 1px, rgba(255,255,255,0.12) 1px, transparent 0) 0 0 / 112px 112px,
            radial-gradient(circle at 20% 0%, rgba(255,255,255,0.08), transparent 32%),
            radial-gradient(circle at 82% 12%, rgba(255,255,255,0.06), transparent 30%),
            linear-gradient(180deg, #050506 0%, #030305 54%, #000 100%);
          filter: grayscale(1) contrast(1.05);
          -webkit-filter: grayscale(1) contrast(1.05);
        }

        .control-glass-room header,
        .control-glass-room [class*="bg-white"],
        .control-glass-room [class*="bg-zinc-50"],
        .control-glass-room [class*="bg-zinc-100"],
        .control-glass-room [class*="bg-yellow"],
        .control-glass-room [class*="bg-purple"],
        .control-glass-room [class*="bg-cyan"],
        .control-glass-room [class*="bg-green"],
        .control-glass-room [class*="bg-emerald"] {
          background: linear-gradient(180deg, rgba(255,255,255,0.075), rgba(255,255,255,0.026) 18%, rgba(7,7,10,0.84) 100%) !important;
          border-color: rgba(255,255,255,0.1) !important;
          box-shadow:
            0 18px 42px rgba(0,0,0,0.24),
            inset 0 1px 0 rgba(255,255,255,0.08),
            inset 0 -12px 18px rgba(0,0,0,0.22) !important;
          backdrop-filter: blur(18px);
          -webkit-backdrop-filter: blur(18px);
        }

        .control-glass-room [class*="bg-zinc-950"],
        .control-glass-room [class*="bg-zinc-900"] {
          background: linear-gradient(180deg, rgba(255,255,255,0.1), rgba(0,0,0,0.86)) !important;
          border-color: rgba(255,255,255,0.12) !important;
        }

        .control-glass-room [class*="border-zinc"],
        .control-glass-room [class*="border-yellow"],
        .control-glass-room [class*="border-purple"],
        .control-glass-room [class*="border-cyan"],
        .control-glass-room [class*="border-green"],
        .control-glass-room [class*="border-emerald"] {
          border-color: rgba(255,255,255,0.12) !important;
        }

        .control-glass-room [class*="text-zinc-950"],
        .control-glass-room [class*="text-zinc-900"],
        .control-glass-room [class*="text-zinc-800"],
        .control-glass-room [class*="text-yellow"],
        .control-glass-room [class*="text-purple"],
        .control-glass-room [class*="text-cyan"],
        .control-glass-room [class*="text-green"],
        .control-glass-room [class*="text-emerald"] {
          color: rgba(255,255,255,0.94) !important;
        }

        .control-glass-room [class*="text-zinc-700"],
        .control-glass-room [class*="text-zinc-600"],
        .control-glass-room [class*="text-zinc-500"],
        .control-glass-room [class*="text-zinc-400"] {
          color: rgba(255,255,255,0.58) !important;
        }

        .control-glass-room input,
        .control-glass-room textarea,
        .control-glass-room select {
          background: rgba(0,0,0,0.34) !important;
          border-color: rgba(255,255,255,0.12) !important;
          color: rgba(255,255,255,0.94) !important;
        }

        .control-glass-room input::placeholder,
        .control-glass-room textarea::placeholder {
          color: rgba(255,255,255,0.32) !important;
        }

        @media (max-width: 767px) {
          .control-glass-room {
            filter: none;
            -webkit-filter: none;
          }

          .control-glass-room header,
          .control-glass-room [class*="bg-white"],
          .control-glass-room [class*="bg-zinc-50"],
          .control-glass-room [class*="bg-zinc-100"],
          .control-glass-room [class*="bg-yellow"],
          .control-glass-room [class*="bg-purple"],
          .control-glass-room [class*="bg-cyan"],
          .control-glass-room [class*="bg-green"],
          .control-glass-room [class*="bg-emerald"] {
            backdrop-filter: none;
            -webkit-backdrop-filter: none;
          }
        }
      `}</style>
      {/* VHS Scan Lines Overlay - old film aesthetic */}
      <div
        className="fixed inset-0 z-[200] pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.3) 2px, rgba(0,0,0,0.3) 4px)',
          backgroundSize: '100% 4px',
        }}
      />

      {/* Subtle film grain noise */}
      <div
        className="fixed inset-0 z-[199] pointer-events-none opacity-[0.015] mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Control mode particle background - rendered once, persists across all states */}
      <div className="fixed inset-0 z-0">
        <ParticleNetwork particleCount={80} minDist={120} particleColor="rgba(255, 255, 255, 0.42)" lineColor="rgba(255, 255, 255," speed={0.25} />
      </div>

      {/* Pre-hydration skeleton */}
      {!mounted && (
        <div className="flex items-center justify-center h-full relative z-10">
          <div className="animate-pulse text-zinc-400">Loading...</div>
        </div>
      )}

      {/* Not connected state */}
      {showNotConnected && (
        <div className="flex items-center justify-center h-full relative z-10">
          <Link
            href="/?mode=control"
            className="absolute top-6 left-6 flex items-center gap-2 px-4 py-2 bg-white/70 border border-zinc-200 rounded-xl backdrop-blur-sm hover:bg-white transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Back to Home</span>
          </Link>

          <div className="text-center space-y-6">
            <div className="text-6xl mb-4" style={{ filter: 'grayscale(1)', WebkitFilter: 'grayscale(1)' }}>🎮</div>
            <h1 className="text-3xl font-bold text-zinc-900">
              CONTROL MODE
            </h1>
            <p className="text-zinc-600 max-w-md">
              Fund live venue activations, route creators, and track proof.
              Connect your wallet to open the activation portal.
            </p>
            <button
              onClick={() => {
                const preferredConnector = getPreferredWalletConnector(connectors);
                if (preferredConnector) connect({ connector: preferredConnector });
              }}
              className="px-6 py-4 bg-zinc-900 text-white rounded-lg font-semibold hover:bg-zinc-800 transition touch-manipulation select-none cursor-pointer active:scale-95"
              style={{
                WebkitTapHighlightColor: 'transparent',
                minHeight: '52px',
              }}
            >
              Connect Wallet
            </button>
          </div>
        </div>
      )}

      {/* Loading state */}
      {showLoading && (
        <div className="flex items-center justify-center h-full relative z-10">
          <div className="animate-pulse text-zinc-500">Loading Control Mode...</div>
        </div>
      )}

      {/* Register brand state */}
      {showRegisterView && (
        <div className="flex items-center justify-center h-full p-4 relative z-10">
          <Link
            href="/?mode=control"
            className="absolute top-6 left-6 flex items-center gap-2 px-4 py-2 bg-white/70 border border-zinc-200 rounded-xl backdrop-blur-sm hover:bg-white transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Back to Home</span>
          </Link>

          <div className="max-w-md w-full space-y-6">
            <div className="text-center">
              <div className="text-5xl mb-4" style={{ filter: 'grayscale(1)', WebkitFilter: 'grayscale(1)' }}>🏢</div>
              <h1 className="text-2xl font-bold text-zinc-900">Register Venue or Brand</h1>
              <p className="text-zinc-600 mt-2">
                Set up the buyer profile that will fund venue activations.
              </p>
            </div>

            <div className="space-y-4 bg-white/80 backdrop-blur-xl p-6 rounded-xl border border-zinc-200">
              <div>
                <label className="block text-sm text-zinc-600 mb-2">Venue / brand name</label>
                <input
                  type="text"
                  value={registerName}
                  onChange={(e) => setRegisterName(e.target.value)}
                  placeholder="e.g., Hideaway, Red Bull, Local Gym"
                  className="w-full px-4 py-3 bg-white border border-zinc-300 rounded-lg focus:border-yellow-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm text-zinc-600 mb-2">Wallet Address</label>
                <div className="px-4 py-3 bg-zinc-100 border border-zinc-200 rounded-lg text-zinc-500 font-mono text-sm">
                  {address}
                </div>
              </div>

              <button
                onClick={handleRegister}
                disabled={!registerName.trim()}
                className="w-full py-3 bg-zinc-900 text-white rounded-lg font-semibold hover:bg-zinc-800 transition disabled:opacity-50"
              >
                Create activation profile
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main dashboard */}
      {showDashboard && (
        <>

      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-zinc-200 bg-white/95 px-4 py-3 shadow-[0_10px_30px_rgba(15,23,42,0.06)] md:bg-white/80 md:px-6 md:py-4 md:shadow-none md:backdrop-blur-xl">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2 md:gap-4">
            {/* Back button */}
            <Link
              href="/?mode=control"
              className="flex items-center gap-2 px-2 md:px-3 py-2 bg-white/70 border border-zinc-200 rounded-lg hover:bg-white transition"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div className="text-[1.05rem] font-black leading-none tracking-[-0.03em] text-zinc-950 antialiased md:text-2xl">
              ACTIVATION OPS
            </div>
            <div className="hidden md:block px-2 py-1 bg-yellow-100 border border-yellow-400 rounded text-xs text-yellow-700 font-semibold">
              ACTIVATION PORTAL
            </div>
          </div>

          <div className="flex items-center justify-between md:justify-end gap-2 md:gap-4">
            <div className="text-right">
              <div className="font-semibold text-zinc-900 text-sm md:text-base">{brand?.name}</div>
              <div className="text-xs text-zinc-500 font-mono">
                {address?.slice(0, 6)}...{address?.slice(-4)}
              </div>
            </div>
            {brand?.verified && (
              <div className="px-2 py-1 bg-green-100 border border-green-400 rounded text-xs text-green-700">
                ✓
              </div>
            )}

            {/* Mode Switch - Go to Chaos with Reality Shift */}
            <div className="touch-manipulation" style={{ padding: '8px 8px 16px 8px', margin: '-8px -8px -16px -8px', WebkitTapHighlightColor: 'transparent' }}>
              <Link
                href="/?from=control"
                className="flex items-center gap-1 md:gap-2 px-3 md:px-3 py-3 md:py-2 bg-zinc-900 text-white rounded-lg hover:bg-zinc-800 active:scale-95 transition text-xs md:text-sm font-semibold"
                style={{ minHeight: '44px' }}
              >
                <span className="text-purple-400">CHAOS</span>
                <span className="text-zinc-500">→</span>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-7xl px-4 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-5 md:px-6 md:py-8">
        <div className="mb-6 md:mb-8 overflow-hidden rounded-2xl border border-zinc-200 bg-white/85 p-4 shadow-[0_24px_80px_rgba(15,10,35,0.08)] backdrop-blur-xl md:p-6">
          <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-zinc-500">
                For venues, local businesses, and sponsors
              </div>
              <h1 className="mt-2 text-2xl font-black tracking-tight text-zinc-950 md:text-4xl">
                Launch a paid venue activation
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-600 md:text-base">
                Pick a real place, set the creator payout, fund the mission, then watch proof and venue lift come back into one surface.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <Link
                  href={buildBrandPortalActivationHref(selectedVenueRadar)}
                  className="rounded-xl bg-zinc-950 px-5 py-3 text-sm font-bold text-white transition hover:bg-zinc-800"
                >
                  Launch activation
                </Link>
                <Link
                  href="/map"
                  className="rounded-xl border border-zinc-300 bg-white px-5 py-3 text-sm font-bold text-zinc-800 transition hover:border-zinc-400"
                >
                  View venue map
                </Link>
              </div>
            </div>

            <div className="hidden grid-cols-2 gap-2 text-sm md:grid">
              {[
                { label: '1. Pick venue', detail: 'A real place on the grid' },
                { label: '2. Set payout', detail: 'USDC budget and brief' },
                { label: '3. Route creator', detail: 'Best available venue fit' },
                { label: '4. Prove lift', detail: 'Proof, payout, repeat signal' },
              ].map((item) => (
                <div key={item.label} className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-3">
                  <div className="font-bold text-zinc-950">{item.label}</div>
                  <div className="mt-1 text-xs text-zinc-500">{item.detail}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-8">
          <div className="bg-white/80 backdrop-blur-xl border border-zinc-200 rounded-xl p-3 md:p-4">
            <div className="text-zinc-500 text-xs md:text-sm">Activation Spend</div>
            <div className="text-xl md:text-2xl font-bold text-zinc-900">${(brand?.totalSpend ?? 0).toLocaleString()}</div>
            <div className="text-[11px] md:text-xs text-zinc-500 mt-1">
              {campaignSummary?.total ?? campaigns.length} activations launched
            </div>
          </div>
          <div className="bg-white/80 backdrop-blur-xl border border-zinc-200 rounded-xl p-3 md:p-4">
            <div className="text-zinc-500 text-xs md:text-sm">Live Activations</div>
            <div className="text-xl md:text-2xl font-bold text-zinc-900">{liveCampaignCount}</div>
            <div className="text-[11px] md:text-xs text-zinc-500 mt-1">
              {(campaignSummary?.place ?? campaigns.filter((campaign) => campaign.type === 'PLACE').length)} venue
              {' • '}
              {(campaignSummary?.creator ?? campaigns.filter((campaign) => campaign.type === 'CREATOR').length)} creator
            </div>
          </div>
          <div className="bg-white/80 backdrop-blur-xl border border-zinc-200 rounded-xl p-3 md:p-4">
            <div className="text-zinc-500 text-xs md:text-sm">Creator Activity</div>
            <div className="text-xl md:text-2xl font-bold text-zinc-900">{creatorMovementCount}</div>
            <div className="text-[11px] md:text-xs text-zinc-500 mt-1">
              {proofsSubmittedCount} proofs submitted
            </div>
          </div>
          <div className="bg-white/80 backdrop-blur-xl border border-zinc-200 rounded-xl p-3 md:p-4">
            <div className="text-zinc-500 text-xs md:text-sm">Paid Completions</div>
            <div className="text-xl md:text-2xl font-bold text-zinc-900">{paidOutCount}</div>
            <div className="text-[11px] md:text-xs text-zinc-500 mt-1">
              {inReviewCount} in review {' • '} {payoutQueuedCount} queued
            </div>
          </div>
        </div>

        <div className="mb-6 md:mb-8 rounded-2xl border border-zinc-200 bg-white/80 p-4 md:p-5 backdrop-blur-xl">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="text-[11px] uppercase tracking-[0.28em] text-zinc-500">Venue Radar</div>
              <h2 className="mt-2 text-xl font-semibold text-zinc-900">Where to activate next</h2>
              <p className="mt-1 hidden max-w-2xl text-sm text-zinc-600 md:block">
                Venues ranked by live activity, ownership signal, and repeat potential so you can choose where spend is most likely to move people.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {([
                { id: 'hot', label: 'Hot now' },
                { id: 'managed', label: 'My venues' },
                { id: 'claimable', label: 'Needs activation' },
              ] as const).map((filter) => {
                const active = venueRadarFilter === filter.id;
                return (
                  <button
                    key={filter.id}
                    onClick={() => setVenueRadarFilter(filter.id)}
                    className={`rounded-full border px-3 py-2 text-xs font-semibold transition ${
                      active
                        ? 'border-purple-400 bg-purple-500/[0.08] text-purple-700'
                        : 'border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300'
                    }`}
                  >
                    {filter.label}
                  </button>
                );
              })}
            </div>
          </div>

          {filteredVenueRadar.length === 0 ? (
            <div className="mt-4 rounded-xl border border-dashed border-zinc-300 bg-zinc-50 px-4 py-5 text-sm text-zinc-500">
              No venues match this view yet. Pick a venue from the map or launch the first activation to create signal.
            </div>
          ) : (
            <div className="mt-5 grid gap-3 lg:grid-cols-3">
              {filteredVenueRadar.slice(0, 6).map((venue, index) => (
                <button
                  key={venue.id}
                  type="button"
                  onClick={() => setSelectedVenueRadarId(venue.id)}
                  className={`rounded-2xl border bg-white/90 p-4 text-left shadow-[0_20px_50px_rgba(12,12,16,0.08)] transition ${
                    selectedVenueRadar?.id === venue.id
                      ? 'border-purple-400 ring-2 ring-purple-400/20'
                      : 'border-zinc-200 hover:border-zinc-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="rounded-full border border-zinc-200 bg-zinc-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
                          #{index + 1}
                        </span>
                        <span className={`rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${getVenueRadarClaimTone(venue)}`}>
                          {venue.claimState === 'claimed'
                            ? 'Claimed'
                            : venue.claimState === 'pending'
                              ? 'Claim pending'
                              : 'Unclaimed'}
                        </span>
                      </div>
                      <div className="mt-3 text-lg font-semibold text-zinc-900">{venue.name}</div>
                      <div className="mt-1 flex items-center gap-1 text-xs text-zinc-500">
                        <MapPin className="h-3.5 w-3.5" />
                        <span>{venue.city ?? venue.country ?? 'Venue on the grid'}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] uppercase tracking-[0.22em] text-zinc-400">Score</div>
                      <div className="text-xl font-semibold text-zinc-900">{venue.score}</div>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className="rounded-full border border-purple-200 bg-purple-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-purple-700">
                      {venue.priorityLabel}
                    </span>
                    <span className="rounded-full border border-cyan-200 bg-cyan-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-700">
                      {venue.strategyLabel}
                    </span>
                  </div>

                  <p className="mt-4 hidden text-sm leading-6 text-zinc-600 md:block">{venue.summary}</p>

                  <div className="mt-4 hidden flex-wrap gap-2 md:flex">
                    {venue.rankReasons.slice(0, 2).map((reason) => (
                      <span
                        key={reason}
                        className="rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500"
                      >
                        {reason}
                      </span>
                    ))}
                  </div>

                  <div className="mt-4 hidden grid-cols-2 gap-2 md:grid">
                    <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-3">
                      <div className="text-[10px] uppercase tracking-[0.18em] text-zinc-400">Visitors today</div>
                      <div className="mt-1 text-lg font-semibold text-zinc-900">{venue.activity.uniqueVisitorsToday}</div>
                      <div className="text-[11px] text-zinc-500">{venue.activity.scansLastHour} scans last hour</div>
                    </div>
                    <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-3">
                      <div className="text-[10px] uppercase tracking-[0.18em] text-zinc-400">Live funding</div>
                      <div className="mt-1 text-lg font-semibold text-zinc-900">${venue.activity.totalLiveFundingUsd.toLocaleString()}</div>
                      <div className="text-[11px] text-zinc-500">{venue.activity.activeChallenges} live challenges</div>
                    </div>
                    <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-3">
                      <div className="text-[10px] uppercase tracking-[0.18em] text-zinc-400">Past activations</div>
                      <div className="mt-1 text-lg font-semibold text-zinc-900">{venue.brandHistory.campaigns}</div>
                      <div className="text-[11px] text-zinc-500">${venue.brandHistory.totalSpendUsd.toLocaleString()} spent here</div>
                    </div>
                    <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-3">
                      <div className="text-[10px] uppercase tracking-[0.18em] text-zinc-400">Verified signal</div>
                      <div className="mt-1 text-lg font-semibold text-zinc-900">{venue.activity.approvedMarks}</div>
                      <div className="text-[11px] text-zinc-500">{venue.activity.recentCompletedCount} recent completions</div>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className="inline-flex items-center gap-2 rounded-full border border-zinc-300 bg-white px-3 py-2 text-xs font-semibold text-zinc-700">
                      Inspect venue
                    </span>
                    <span className="inline-flex items-center gap-2 rounded-full border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
                      Fund here
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}

          {selectedVenueRadar ? (
            <div className="mt-5 rounded-2xl border border-zinc-200 bg-zinc-950 px-4 py-5 text-white shadow-[0_24px_80px_rgba(15,10,35,0.25)]">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="max-w-3xl">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-200">
                      {selectedVenueRadar.priorityLabel}
                    </span>
                    <span className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-200">
                      {selectedVenueRadar.strategyLabel}
                    </span>
                  </div>
                  <h3 className="mt-3 text-2xl font-semibold">{selectedVenueRadar.name}</h3>
                  <div className="mt-1 flex items-center gap-1 text-sm text-zinc-400">
                    <MapPin className="h-4 w-4" />
                    <span>{formatVenueRadarLocation(selectedVenueRadar)}</span>
                  </div>
                  <p className="mt-4 max-w-2xl text-sm leading-6 text-zinc-300">{selectedVenueRadar.summary}</p>
                </div>

                <div className="hidden rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4 md:block lg:min-w-[220px]">
                  <div className="text-[11px] uppercase tracking-[0.22em] text-zinc-500">Why it ranks</div>
                  <div className="mt-3 space-y-2">
                    {selectedVenueRadar.rankReasons.map((reason) => (
                      <div key={reason} className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-zinc-200">
                        {reason}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-5 hidden gap-3 md:grid md:grid-cols-4">
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">Visitors today</div>
                  <div className="mt-2 text-2xl font-semibold">{selectedVenueRadar.activity.uniqueVisitorsToday}</div>
                  <div className="mt-1 text-xs text-zinc-400">{selectedVenueRadar.activity.scansLastHour} scans last hour</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">Live funding</div>
                  <div className="mt-2 text-2xl font-semibold">${selectedVenueRadar.activity.totalLiveFundingUsd.toLocaleString()}</div>
                  <div className="mt-1 text-xs text-zinc-400">{selectedVenueRadar.activity.activeChallenges} open challenges</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">Past activations</div>
                  <div className="mt-2 text-2xl font-semibold">{selectedVenueRadar.brandHistory.campaigns}</div>
                  <div className="mt-1 text-xs text-zinc-400">{selectedVenueRadar.brandHistory.liveCampaigns} live activations here</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">Verified memory</div>
                  <div className="mt-2 text-2xl font-semibold">{selectedVenueRadar.activity.approvedMarks}</div>
                  <div className="mt-1 text-xs text-zinc-400">{selectedVenueRadar.activity.recentCompletedCount} recent completions</div>
                </div>
              </div>

              <div className="mt-5 grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
                <div className="hidden rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4 md:block">
                  <div className="text-[11px] uppercase tracking-[0.22em] text-zinc-500">Recent creator signal</div>
                  {selectedVenueRadar.recentSignals.length === 0 ? (
                    <div className="mt-3 rounded-xl border border-dashed border-white/10 px-4 py-4 text-sm text-zinc-400">
                      No approved creator memory has been logged here yet. This is still a good venue to seed if the foot traffic signal is rising.
                    </div>
                  ) : (
                    <div className="mt-3 space-y-3">
                      {selectedVenueRadar.recentSignals.map((signal, index) => (
                        <div key={`${signal.creatorTag ?? 'anon'}-${signal.submittedAt}-${index}`} className="rounded-xl border border-white/10 bg-black/20 px-4 py-3">
                          <div className="flex items-center justify-between gap-3">
                            <div className="text-sm font-semibold text-white">{signal.creatorTag ?? 'Anonymous creator'}</div>
                            <div className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">
                              {signal.firstMark ? 'First spark' : 'Venue memory'}
                            </div>
                          </div>
                          <div className="mt-2 text-sm text-zinc-300">
                            {signal.caption || 'Creator left a verified venue signal here.'}
                          </div>
                          {signal.vibeTags.length > 0 ? (
                            <div className="mt-3 flex flex-wrap gap-2">
                              {signal.vibeTags.slice(0, 3).map((tag) => (
                                <span
                                  key={tag}
                                  className="rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-300"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div className="hidden rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4 md:block">
                    <div className="text-[11px] uppercase tracking-[0.22em] text-zinc-500">Top creators for this venue</div>
                    {selectedVenueRadar.topCreators.length === 0 ? (
                      <div className="mt-3 rounded-xl border border-dashed border-white/10 px-4 py-4 text-sm text-zinc-400">
                        No creator has built a strong public venue history here yet. This is still a good place to seed if the venue signal is hot.
                      </div>
                    ) : (
                      <div className="mt-3 space-y-3">
                        {selectedVenueRadar.topCreators.map((creator) => (
                          <div key={`${creator.creatorTag}-${creator.walletAddress}`} className="rounded-xl border border-white/10 bg-black/20 px-4 py-3">
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <div className="text-sm font-semibold text-white">{creator.creatorTag}</div>
                                <div className="mt-1 text-[11px] uppercase tracking-[0.18em] text-zinc-500">
                                  {creator.trustLabel} level {creator.trustLevel}
                                </div>
                              </div>
                              <div className="rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-300">
                                {creator.trustScore} trust
                              </div>
                            </div>
                            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                              <div className="rounded-lg border border-white/10 bg-white/[0.03] px-2 py-2">
                                <div className="text-sm font-semibold text-white">{creator.marksHere}</div>
                                <div className="text-[10px] uppercase tracking-[0.16em] text-zinc-500">Marks here</div>
                              </div>
                              <div className="rounded-lg border border-white/10 bg-white/[0.03] px-2 py-2">
                                <div className="text-sm font-semibold text-white">{creator.completedDares}</div>
                                <div className="text-[10px] uppercase tracking-[0.16em] text-zinc-500">Wins total</div>
                              </div>
                              <div className="rounded-lg border border-white/10 bg-white/[0.03] px-2 py-2">
                                <div className="text-sm font-semibold text-white">${Math.round(creator.totalEarned)}</div>
                                <div className="text-[10px] uppercase tracking-[0.16em] text-zinc-500">Earned</div>
                              </div>
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2">
                              {creator.firstMarksHere > 0 ? (
                                <span className="rounded-full border border-amber-400/20 bg-amber-400/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-100">
                                  {creator.firstMarksHere} first sparks
                                </span>
                              ) : null}
                              {typeof creator.followerCount === 'number' && creator.followerCount > 0 ? (
                                <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-100">
                                  {formatCompactAudience(creator.followerCount)} audience
                                </span>
                              ) : null}
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => openCampaignComposerForVenue(selectedVenueRadar, creator.creatorTag)}
                                className="inline-flex items-center gap-2 rounded-full border border-purple-400/25 bg-purple-500/10 px-3 py-2 text-xs font-semibold text-purple-100 transition hover:border-purple-300 hover:bg-purple-500/15"
                              >
                                <PlayCircle className="h-3.5 w-3.5" />
                                Route this creator
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4">
                    <div className="text-[11px] uppercase tracking-[0.22em] text-zinc-500">Next move</div>
                    <div className="mt-3 text-lg font-semibold text-white">
                      {selectedVenueRadar.strategyLabel}
                    </div>
                    <p className="mt-2 text-sm leading-6 text-zinc-300">
                      If you want to capture this venue while the signal is fresh, fund one activation now and route the best-fit creator into the existing movement.
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Link
                        href={buildBrandPortalActivationHref(selectedVenueRadar)}
                        className="inline-flex items-center gap-2 rounded-full border border-purple-400/30 bg-purple-500/15 px-4 py-2 text-sm font-semibold text-purple-100 transition hover:border-purple-300 hover:bg-purple-500/20"
                      >
                        <PlayCircle className="h-4 w-4" />
                        Fund activation here
                      </Link>
                      <Link
                        href={`/venues/${selectedVenueRadar.slug}`}
                        className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-4 py-2 text-sm font-semibold text-zinc-100 transition hover:border-white/25"
                      >
                        <MapPin className="h-3.5 w-3.5" />
                        View venue
                      </Link>
                      {selectedVenueRadar.consoleUrl ? (
                        <Link
                          href={selectedVenueRadar.consoleUrl}
                          className="inline-flex items-center gap-2 rounded-full border border-cyan-400/25 bg-cyan-500/10 px-4 py-2 text-sm font-semibold text-cyan-100 transition hover:border-cyan-300/40"
                        >
                          <PlayCircle className="h-3.5 w-3.5" />
                          Open console
                        </Link>
                      ) : null}
                      <Link
                        href={selectedVenueRadar.contactUrl}
                        className="inline-flex items-center gap-2 rounded-full border border-emerald-400/25 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-100 transition hover:border-emerald-300/40"
                      >
                        <Users className="h-3.5 w-3.5" />
                        {selectedVenueRadar.contactLabel}
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {/* Value Menu / Launch Activation */}
        {showCreateCampaign ? (
          <div className="mb-8 rounded-2xl border border-zinc-200 bg-white/90 p-4 shadow-lg backdrop-blur-md md:p-6 md:backdrop-blur-xl">
            <div className="mb-5 flex items-center justify-between md:mb-6">
              <h2 className="text-xl font-bold text-zinc-900">Launch Venue Activation</h2>
              <button
                onClick={() => {
                  setShowCreateCampaign(false);
                  setPreferredCreatorTag(null);
                }}
                className="text-zinc-500 hover:text-zinc-900"
              >
                ✕
              </button>
            </div>

            {/* Tier Selection - Value Menu Style */}
            <div className="mb-6">
              <label className="block text-sm text-zinc-600 mb-3">Choose budget tier</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
                {(Object.keys(TIER_INFO) as Array<keyof typeof TIER_INFO>).map((tier) => {
                  const info = TIER_INFO[tier];
                  const isSelected = formData.tier === tier;
                  return (
                    <button
                      key={tier}
                      onClick={() => {
                        const activeMinPayout = NETWORK_CONFIG.isMainnet ? info.minPayout : 1;
                        setFormData({
                          ...formData,
                          tier,
                          payoutPerCreator: Math.max(formData.payoutPerCreator, activeMinPayout),
                        });
                      }}
                      className={`rounded-xl border p-3 transition-all md:p-4 ${
                        isSelected
                          ? `bg-gradient-to-br ${info.color} border-transparent text-white`
                          : `bg-white ${info.borderColor} hover:border-zinc-400 text-zinc-900`
                      }`}
                    >
                      <div className="font-semibold">{info.name}</div>
                      <div className={`mt-1 hidden text-xs md:block ${isSelected ? 'text-white/80' : 'text-zinc-500'}`}>{info.description}</div>
                      <div className="mt-3 space-y-1 text-left text-xs">
                        <div className="flex justify-between">
                          <span className={isSelected ? 'text-white/70' : 'text-zinc-500'}>From:</span>
                          <span>${NETWORK_CONFIG.isMainnet ? info.minPayout : 1}</span>
                        </div>
                        <div className="hidden justify-between md:flex">
                          <span className={isSelected ? 'text-white/70' : 'text-zinc-500'}>Timing:</span>
                          <span>{info.window}</span>
                        </div>
                        <div className="hidden justify-between md:flex">
                          <span className={isSelected ? 'text-white/70' : 'text-zinc-500'}>Boost:</span>
                          <span>{info.bonus}</span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Campaign Details */}
            <div className="mb-6">
              <label className="block text-sm text-zinc-600 mb-2">Activation format</label>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {([
                  {
                    value: 'PLACE',
                    title: 'Venue Activation',
                    body: 'Fund one real place mission that appears on the map.',
                  },
                  {
                    value: 'CREATOR',
                    title: 'Creator-only Route',
                    body: 'Coming later. Venue activations are the supported launch path right now.',
                  },
                ] as const).map((option) => {
                  const isSelected = formData.type === option.value;
                  return (
                    <button
                      key={option.value}
                      onClick={() =>
                        setFormData((current) => ({
                          ...current,
                          type: option.value,
                          creatorCountTarget: option.value === 'PLACE' ? 1 : current.creatorCountTarget,
                        }))
                      }
                      className={`rounded-xl border p-4 text-left transition ${
                        isSelected
                          ? 'border-purple-500/60 bg-purple-500/[0.08] text-zinc-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]'
                          : 'border-zinc-300 bg-white hover:border-zinc-400'
                      }`}
                    >
                      <div className="font-semibold">{option.title}</div>
                      <div className="mt-1 text-xs text-zinc-500">{option.body}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-zinc-600 mb-2">Activation name</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g., Hideaway Friday Foot-Traffic Push"
                    className="w-full px-4 py-3 bg-white border border-zinc-300 rounded-lg focus:border-purple-500 focus:outline-none text-zinc-900 placeholder:text-zinc-400"
                  />
                </div>

                <div>
                  <label className="block text-sm text-zinc-600 mb-2">What should the creator do?</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Describe the visit, product moment, or challenge you want filmed..."
                    rows={3}
                    className="w-full px-4 py-3 bg-white border border-zinc-300 rounded-lg focus:border-purple-500 focus:outline-none text-zinc-900 placeholder:text-zinc-400 resize-none"
                  />
                </div>

                {formData.type === 'PLACE' ? (
                  <div>
                    <label className="block text-sm text-zinc-600 mb-2">Target venue</label>
                    <input
                      type="text"
                      value={selectedPlace ? selectedPlace.displayName : placeQuery}
                      onChange={(e) => {
                        setSelectedPlace(null);
                        setPreferredCreatorTag(null);
                        setPlaceQuery(e.target.value);
                      }}
                      placeholder="Search for a venue, landmark, or district..."
                      className="w-full px-4 py-3 bg-white border border-zinc-300 rounded-lg focus:border-purple-500 focus:outline-none text-zinc-900 placeholder:text-zinc-400"
                    />
                    <div className="mt-2 text-xs text-zinc-500">
                      Choose where you want the activation to happen. We will attach the live mission to that venue on the map.
                    </div>
                    {placeLoading ? (
                      <div className="mt-3 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-500">
                        Searching places...
                      </div>
                    ) : !selectedPlace && placeResults.length > 0 ? (
                      <div className="mt-3 space-y-2 rounded-xl border border-zinc-200 bg-zinc-50 p-2">
                        {placeResults.slice(0, 5).map((place) => (
                          <button
                            key={place.id}
                            onClick={() => {
                              setSelectedPlace(place);
                              setPreferredCreatorTag(null);
                              setPlaceQuery(place.displayName);
                              setPlaceResults([]);
                            }}
                            className="w-full rounded-lg border border-transparent bg-white px-3 py-3 text-left transition hover:border-purple-300 hover:bg-purple-50"
                          >
                            <div className="font-medium text-zinc-900">{place.name}</div>
                            <div className="text-xs text-zinc-500">{place.displayName}</div>
                            <div className="mt-1 text-[11px] uppercase tracking-[0.16em] text-zinc-400">
                              {place.placeId ? 'Existing venue' : 'New venue from search'}
                            </div>
                          </button>
                        ))}
                      </div>
                    ) : placeQuery.trim().length >= 2 && !selectedPlace ? (
                      <div className="mt-3 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-500">
                        No matching place yet. Try a nearby landmark, venue, or district name.
                      </div>
                    ) : null}
                    {selectedPlace ? (
                      <div className="mt-3 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3">
                        <div className="text-sm font-semibold text-emerald-800">{selectedPlace.name}</div>
                        <div className="text-xs text-emerald-700">{selectedPlace.displayName}</div>
                        <div className="mt-1 text-[11px] uppercase tracking-[0.16em] text-emerald-700">
                          {selectedPlace.placeId ? 'Venue ready' : 'Venue will be created on launch'}
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : null}

                <div className="grid grid-cols-2 gap-4">
                  {formData.type === 'CREATOR' ? (
                    <div>
                      <label className="block text-sm text-zinc-600 mb-2">Number of creators</label>
                      <input
                        type="number"
                        value={formData.creatorCountTarget}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            creatorCountTarget: parseInt(e.target.value) || 1,
                          })
                        }
                        min={1}
                        max={1000}
                        className="w-full px-4 py-3 bg-white border border-zinc-300 rounded-lg focus:border-purple-500 focus:outline-none text-zinc-900"
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="block text-sm text-zinc-600 mb-2">Activation count</label>
                      <div className="w-full rounded-lg border border-zinc-200 bg-zinc-100 px-4 py-3 text-zinc-700">
                        1 live venue activation
                      </div>
                    </div>
                  )}
                  <div>
                    <label className="block text-sm text-zinc-600 mb-2">
                      {formData.type === 'PLACE' ? 'Creator payout for this activation ($)' : 'Payout per creator ($)'}
                    </label>
                    <input
                      type="number"
                      value={formData.payoutPerCreator}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          payoutPerCreator: parseInt(e.target.value) || 0,
                        })
                      }
                      min={NETWORK_CONFIG.isMainnet ? TIER_INFO[formData.tier].minPayout : 1}
                      className="w-full px-4 py-3 bg-white border border-zinc-300 rounded-lg focus:border-purple-500 focus:outline-none text-zinc-900"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                {formData.type === 'CREATOR' ? (
                  <div className="rounded-xl border border-amber-300 bg-amber-50 p-4">
                    <div className="text-sm font-semibold text-amber-800">Creator-only campaigns are coming soon</div>
                    <div className="mt-2 text-sm text-amber-700">
                      New creator-only launches are not available yet. Venue activations are the live option today.
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                    <div className="text-sm font-semibold text-zinc-900">How venue activations work</div>
                    <div className="mt-2 text-sm text-zinc-600">
                      This funds one venue mission, routes one recommended creator, shows it on the map, and records the result back into venue memory.
                    </div>
                  </div>
                )}

                {formData.type === 'PLACE' ? (
                  <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 space-y-4">
                    <div>
                      <div className="text-sm font-semibold text-zinc-900">Creator speed dial</div>
                      <div className="mt-1 hidden text-sm text-zinc-600 md:block">
                        Best-fit creators for this venue, ranked by venue fit, proof history, and audience signal. Pick one instead of browsing.
                      </div>
                    </div>

                    {!selectedPlace ? (
                      <div className="rounded-xl border border-dashed border-zinc-300 bg-white px-4 py-4 text-sm text-zinc-500">
                        Choose a target venue first and BaseDare will surface the best-fit creators here.
                      </div>
                    ) : recommendedCreatorsLoading ? (
                      <div className="rounded-xl border border-zinc-200 bg-white px-4 py-4 text-sm text-zinc-500">
                        Ranking creators for this venue...
                      </div>
                    ) : recommendedCreatorsError ? (
                      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700">
                        {recommendedCreatorsError}
                      </div>
                    ) : recommendedCreators.length === 0 ? (
                      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-800">
                        No strong creator match is ready yet. Broaden the targeting or try another venue.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {recommendedCreators.slice(0, 3).map((match) => {
                          const isSelected = selectedCreatorId === match.creator.id;
                          return (
                            <div
                              key={match.creator.id}
                              className={`rounded-xl border p-3 transition ${
                                isSelected
                                  ? 'border-purple-500 bg-purple-500/[0.06]'
                                  : preferredCreatorTag?.toLowerCase() === match.creator.tag.toLowerCase()
                                    ? 'border-cyan-300 bg-cyan-50'
                                  : 'border-zinc-200 bg-white'
                              }`}
                            >
                              <div className="flex items-start gap-3">
                                <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full border border-zinc-200 bg-gradient-to-br from-purple-500 via-fuchsia-500 to-amber-300">
                                  {match.creator.pfpUrl ? (
                                    <img
                                      src={match.creator.pfpUrl}
                                      alt={match.creator.tag}
                                      className="h-full w-full object-cover"
                                    />
                                  ) : (
                                    <div className="flex h-full w-full items-center justify-center text-sm font-bold text-white">
                                      {getCreatorInitial(match.creator.tag)}
                                    </div>
                                  )}
                                </div>

                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <div className="font-semibold text-zinc-900">{match.creator.tag}</div>
                                    <div className="rounded-full border border-zinc-200 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-600">
                                      {getCreatorStrengthLabel(match)}
                                    </div>
                                    {preferredCreatorTag?.toLowerCase() === match.creator.tag.toLowerCase() ? (
                                      <div className="rounded-full border border-cyan-300 bg-cyan-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-cyan-700">
                                        venue favorite
                                      </div>
                                    ) : null}
                                  </div>
                                  <div className="mt-1 hidden text-sm text-zinc-500 md:block">
                                    {match.creator.bio || 'No bio yet. Identity and performance stats still make this creator selectable.'}
                                  </div>
                                  <div className="mt-3 hidden grid-cols-3 gap-2 md:grid">
                                    {[
                                      { label: 'Venue fit', value: getCreatorVenueFitLabel(match) },
                                      { label: 'Reliability', value: getCreatorReliabilityLabel(match) },
                                      { label: 'Audience', value: formatCompactAudience(match.creator.followerCount) },
                                    ].map((item) => (
                                      <div
                                        key={`${match.creator.id}-${item.label}`}
                                        className="rounded-lg border border-zinc-200 bg-zinc-50 px-2 py-2"
                                      >
                                        <div className="text-[10px] uppercase tracking-[0.14em] text-zinc-500">{item.label}</div>
                                        <div className="mt-1 text-xs font-semibold text-zinc-900">{item.value}</div>
                                      </div>
                                    ))}
                                  </div>
                                  <div className="mt-2 hidden flex-wrap gap-2 md:flex">
                                    {match.reasons.slice(0, 2).map((reason) => (
                                      <span
                                        key={`${match.creator.id}-${reason}`}
                                        className="rounded-full border border-zinc-200 bg-zinc-50 px-2 py-1 text-[10px] uppercase tracking-[0.12em] text-zinc-600"
                                      >
                                        {reason}
                                      </span>
                                    ))}
                                  </div>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedCreatorId(match.creator.id);
                                    setPreferredCreatorTag(match.creator.tag);
                                  }}
                                  className={`shrink-0 rounded-lg border px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] transition md:self-start ${
                                    isSelected
                                      ? 'border-purple-500 bg-purple-500/[0.12] text-zinc-950'
                                      : 'border-zinc-300 bg-white text-zinc-700 hover:border-zinc-400'
                                  }`}
                                >
                                  {isSelected ? 'Selected' : 'Use creator'}
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ) : null}

                <div className="hidden rounded-xl border border-zinc-200 bg-zinc-50 p-4 space-y-4 md:block">
                  <div>
                    <div className="text-sm font-semibold text-zinc-900">Optional targeting</div>
                    <div className="mt-1 text-sm text-zinc-600">
                      Use these if you want to guide creator fit. Most brands can leave them broad.
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm text-zinc-600 mb-2">Creator niche</label>
                    <input
                      type="text"
                      value={formData.targetingCriteria.niche}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          targetingCriteria: { ...formData.targetingCriteria, niche: e.target.value },
                        })
                      }
                      placeholder="e.g., Surf, Nightlife, Food"
                      className="w-full px-4 py-3 bg-white border border-zinc-300 rounded-lg focus:border-purple-500 focus:outline-none text-zinc-900 placeholder:text-zinc-400"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-zinc-600 mb-2">Minimum audience size</label>
                    <input
                      type="number"
                      value={formData.targetingCriteria.minFollowers}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          targetingCriteria: {
                            ...formData.targetingCriteria,
                            minFollowers: parseInt(e.target.value) || 0,
                          },
                        })
                      }
                      min={0}
                      className="w-full px-4 py-3 bg-white border border-zinc-300 rounded-lg focus:border-purple-500 focus:outline-none text-zinc-900"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-zinc-600 mb-2">Preferred platforms</label>
                    <div className="flex flex-wrap gap-2">
                      {PLATFORM_OPTIONS.map((platform) => {
                        const active = formData.targetingCriteria.platforms.includes(platform.value);
                        return (
                          <button
                            key={platform.value}
                            type="button"
                            onClick={() => togglePreferredPlatform(platform.value)}
                            className={`rounded-full border px-3 py-2 text-xs font-semibold transition ${
                              active
                                ? 'border-purple-500 bg-purple-500/[0.08] text-zinc-950'
                                : 'border-zinc-300 bg-white text-zinc-600 hover:border-zinc-400'
                            }`}
                          >
                            {platform.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm text-zinc-600 mb-2">Location preference</label>
                    <select
                      value={formData.targetingCriteria.location}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          targetingCriteria: {
                            ...formData.targetingCriteria,
                            location: e.target.value as 'anywhere' | 'near-venue',
                          },
                        })
                      }
                      className="w-full px-4 py-3 bg-white border border-zinc-300 rounded-lg focus:border-purple-500 focus:outline-none text-zinc-900"
                    >
                      <option value="anywhere">Open to creators anywhere</option>
                      <option value="near-venue">Prefer creators already around this venue</option>
                    </select>
                  </div>
                </div>

                <div className="hidden md:block">
                  <label className="block text-sm text-zinc-600 mb-2">Required hashtags</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={hashtagInput}
                      onChange={(e) => setHashtagInput(e.target.value)}
                      placeholder="#BaseDare"
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addHashtag())}
                      className="flex-1 px-4 py-3 bg-white border border-zinc-300 rounded-lg focus:border-purple-500 focus:outline-none text-zinc-900 placeholder:text-zinc-400"
                    />
                    <button
                      onClick={addHashtag}
                      className="px-4 py-3 bg-zinc-100 border border-zinc-300 rounded-lg hover:bg-zinc-200 text-zinc-700"
                    >
                      Add
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.verificationCriteria.hashtagsRequired.map((tag, i) => (
                      <span
                        key={i}
                        className="px-2 py-1 bg-purple-100 border border-purple-300 rounded text-sm text-purple-700"
                      >
                        {tag}
                        <button
                          onClick={() =>
                            setFormData({
                              ...formData,
                              verificationCriteria: {
                                ...formData.verificationCriteria,
                                hashtagsRequired:
                                  formData.verificationCriteria.hashtagsRequired.filter(
                                    (_, idx) => idx !== i
                                  ),
                              },
                            })
                          }
                          className="ml-2 text-purple-600 hover:text-purple-900"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>

                {(formData.tier === 'CHALLENGE' || formData.tier === 'APEX') && (
                  <div>
                    <label className="block text-sm text-zinc-600 mb-2">
                      Preferred posting window
                    </label>
                    <input
                      type="datetime-local"
                      value={formData.syncTime}
                      onChange={(e) => setFormData({ ...formData, syncTime: e.target.value })}
                      className="w-full px-4 py-3 bg-white border border-zinc-300 rounded-lg focus:border-purple-500 focus:outline-none text-zinc-900"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Budget Summary */}
            <div className="bg-zinc-100 border border-zinc-200 rounded-xl p-3 md:p-4 mb-6">
              <div className="text-sm text-zinc-600 mb-2">Budget summary</div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 text-center">
                <div>
                  <div className="text-lg md:text-2xl font-bold text-zinc-900">${budget.gross.toLocaleString()}</div>
                  <div className="text-xs text-zinc-500">Creator payouts</div>
                </div>
                <div>
                  <div className="text-lg md:text-2xl font-bold text-purple-600">
                    ${budget.rake.toLocaleString()}
                  </div>
                  <div className="text-xs text-zinc-500">
                    Platform fee ({TIER_INFO[formData.tier].rake})
                  </div>
                </div>
                <div>
                  <div className="text-lg md:text-2xl font-bold text-green-600">
                    ${budget.total.toLocaleString()}
                  </div>
                  <div className="text-xs text-zinc-500">Total budget</div>
                </div>
                <div>
                  <div className="text-lg md:text-2xl font-bold text-zinc-900">
                    {budget.effectiveSlotCount} × ${formData.payoutPerCreator}
                  </div>
                  <div className="text-xs text-zinc-500">
                    {formData.type === 'PLACE' ? '1 activation × payout' : 'Slots × payout'}
                  </div>
                </div>
              </div>
            </div>

            {/* Guarantee Banner */}
            <div className="mb-6 hidden rounded-xl border border-green-300 bg-gradient-to-r from-green-100 to-emerald-100 p-4 md:block">
              <div className="flex items-center gap-3">
                <span className="text-2xl" style={{ filter: 'grayscale(1)' }}>⚡</span>
                <div>
                  <div className="font-semibold text-green-700">
                    Deliverables are reviewed before completion
                  </div>
                  <div className="text-sm text-zinc-600">
                    Proof is checked before the activation is marked complete.
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="sticky bottom-[calc(0.85rem+env(safe-area-inset-bottom))] z-30 -mx-2 flex flex-col gap-2 rounded-2xl border border-zinc-200 bg-white/95 p-2 shadow-[0_18px_46px_rgba(15,10,35,0.2)] backdrop-blur md:static md:mx-0 md:flex-row md:gap-4 md:border-0 md:bg-transparent md:p-0 md:shadow-none md:backdrop-blur-none">
              <button
                onClick={handleCreateCampaign}
                disabled={
                  creatingCampaign ||
                  !formData.title.trim() ||
                  formData.type === 'CREATOR' ||
                  (formData.type === 'PLACE' && (!selectedPlace || recommendedCreatorsLoading || !selectedCreatorId))
                }
                className="flex-1 rounded-xl bg-zinc-950 py-3 text-sm font-black uppercase tracking-[0.12em] text-white transition hover:bg-zinc-800 disabled:opacity-50 md:py-4 md:text-lg"
              >
                {creatingCampaign
                  ? approvalStatus === 'approving'
                    ? 'Approve USDC in wallet...'
                    : approvalStatus === 'funding'
                      ? 'Funding activation...'
                      : approvalStatus === 'verifying'
                        ? 'Registering activation...'
                        : 'Launching activation...'
                  : formData.type === 'PLACE'
                  ? (
                    <>
                      <span className="md:hidden">Launch ${budget.total.toLocaleString()}</span>
                      <span className="hidden md:inline">Launch Activation (${budget.total.toLocaleString()} USDC)</span>
                    </>
                  )
                  : 'Creator-Only Coming Soon'}
              </button>
              <button
                onClick={() => {
                  setShowCreateCampaign(false);
                  setPreferredCreatorTag(null);
                }}
                className="rounded-xl border border-zinc-300 bg-zinc-100 px-6 py-3 text-zinc-700 transition hover:bg-zinc-200 md:py-4"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowCreateCampaign(true)}
            className="w-full mb-8 p-6 border-2 border-dashed border-zinc-700 rounded-2xl hover:border-purple-500/50 hover:bg-purple-500/5 transition group"
          >
            <div className="text-zinc-400 group-hover:text-purple-400 transition">
              <span className="text-2xl mr-2">+</span>
              Launch Venue Activation
            </div>
          </button>
        )}

        {/* Activations List */}
        <div>
          <h2 className="text-xl font-bold mb-4">Your Activations</h2>

          <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
            <div className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Claim Requests</div>
              <div className="mt-1 text-lg font-bold text-zinc-900">{claimRequestsPendingCount}</div>
              <div className="text-xs text-zinc-500">waiting for review</div>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Creators Assigned</div>
              <div className="mt-1 text-lg font-bold text-zinc-900">{creatorsAttachedCount}</div>
              <div className="text-xs text-zinc-500">activations with a creator attached</div>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Proofs Submitted</div>
              <div className="mt-1 text-lg font-bold text-zinc-900">{proofsSubmittedCount}</div>
              <div className="text-xs text-zinc-500">{inReviewCount} in review now</div>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Paid Completions</div>
              <div className="mt-1 text-lg font-bold text-zinc-900">{paidOutCount}</div>
              <div className="text-xs text-zinc-500">{payoutQueuedCount} queued for payout</div>
            </div>
          </div>

          {campaigns.length === 0 ? (
            <div className="text-center py-12 text-zinc-500">
              No activations yet. Launch your first venue activation to start creator activity.
            </div>
          ) : (
            <div className="space-y-4">
              {campaigns.map((campaign) => {
                const tierInfo = TIER_INFO[campaign.tier as keyof typeof TIER_INFO];
                const targetingPreview = formatTargetingPreview(campaign.targetingCriteria);
                const matchesState = matchesByCampaign[campaign.id];
                const shortlistedCount = (shortlistedCreators[campaign.id] ?? []).length;
                const isMatchesExpanded = expandedMatchesCampaignId === campaign.id;
                const activeResponsesTab = responsesTabByCampaign[campaign.id] ?? getDefaultResponseTab(campaign);
                const creatorIntent = getCampaignIntent(campaign);
                const outcomeSteps = getCampaignOutcomeSteps(campaign);
                const outcomeSummary = getCampaignOutcomeSummary(campaign);
                const impactSummary = getCampaignImpactSummary(campaign);
                const completionHistory = getCampaignCompletionHistory(campaign);
                const responseTabCounts = getResponseTabCounts(campaign, matchesState, shortlistedCount);
                return (
                  <div
                    key={campaign.id}
                    id={`campaign-${campaign.id}`}
                    className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-3 md:p-4 hover:border-white/20 transition"
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div className="flex items-center gap-3 md:gap-4">
                        <div
                          className={`px-2 md:px-3 py-1 rounded-lg bg-gradient-to-r ${tierInfo.color} text-xs md:text-sm font-semibold whitespace-nowrap`}
                        >
                          {tierInfo.name}
                        </div>
                        <div>
                          <div className="font-semibold text-sm md:text-base">{campaign.title}</div>
                          <div className="text-xs md:text-sm text-zinc-500">
                            {new Date(campaign.createdAt).toLocaleDateString()}
                            {campaign.venue ? ` • ${campaign.venue.name}` : ''}
                          </div>
                          {campaign.type === 'PLACE' && campaign.linkedDare?.shortId ? (
                            <div className="mt-1 text-[11px] uppercase tracking-[0.16em] text-cyan-500">
                              Live dare {campaign.linkedDare.shortId}
                            </div>
                          ) : null}
                          {campaign.truth?.creatorRoutingDormant ? (
                            <div className="mt-1 text-[11px] uppercase tracking-[0.16em] text-amber-500">
                              Creator routing parked
                            </div>
                          ) : null}
                          {targetingPreview.length > 0 ? (
                            <div className="mt-2 flex flex-wrap gap-2">
                              {targetingPreview.map((item) => (
                                <span
                                  key={`${campaign.id}-${item}`}
                                  className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-600"
                                >
                                  {item}
                                </span>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      </div>

                      <div className="flex items-center justify-between md:justify-end gap-3 md:gap-6">
                        <div className="text-center md:text-right">
                          <div className="text-base md:text-lg font-bold">
                            ${campaign.budgetUsdc.toLocaleString()}
                          </div>
                          <div className="text-xs text-zinc-500">Budget</div>
                        </div>

                        <div className="text-center md:text-right">
                          <div className="text-base md:text-lg font-bold">
                            {campaign.slotCounts.assigned + campaign.slotCounts.completed}/
                            {campaign.slotCounts.total}
                          </div>
                          <div className="text-xs text-zinc-500">Slots</div>
                        </div>

                        <div
                          className={`px-2 md:px-3 py-1 rounded-lg text-xs md:text-sm ${
                            campaign.status === 'RECRUITING'
                              ? 'bg-green-500/20 text-green-400'
                              : campaign.status === 'LIVE'
                                ? 'bg-blue-500/20 text-blue-400'
                                : campaign.status === 'SETTLED'
                                  ? 'bg-zinc-500/20 text-zinc-400'
                                  : 'bg-yellow-500/20 text-yellow-400'
                          }`}
                        >
                          {campaign.status}
                        </div>
                      </div>
                    </div>

                    {/* Slot Progress Bar */}
                    <div className="mt-4">
                      {creatorIntent ? (
                        <div
                          className={`mb-4 rounded-xl border px-4 py-3 ${
                            creatorIntent.tone === 'amber'
                              ? 'border-amber-300 bg-amber-50 text-amber-900'
                              : creatorIntent.tone === 'cyan'
                                ? 'border-cyan-300 bg-cyan-50 text-cyan-900'
                                : creatorIntent.tone === 'blue'
                                  ? 'border-blue-300 bg-blue-50 text-blue-900'
                                  : creatorIntent.tone === 'zinc'
                                    ? 'border-zinc-300 bg-zinc-50 text-zinc-900'
                              : 'border-emerald-300 bg-emerald-50 text-emerald-900'
                          }`}
                        >
                          <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                            <div>
                              <div className="text-[11px] font-semibold uppercase tracking-[0.18em]">
                                Activation State
                              </div>
                              <div className="mt-1 text-sm font-semibold">
                                {creatorIntent.label} • {creatorIntent.actor}
                              </div>
                            </div>
                            <div className="text-xs opacity-80">{creatorIntent.detail}</div>
                          </div>
                        </div>
                      ) : null}

                      {(() => {
                        const recentMovement = getCampaignRecentMovement(campaign);
                        return (
                          <div className="mb-4 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
                            <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                              <div>
                                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                                  Recent Movement
                                </div>
                                <div className="mt-1 text-sm font-semibold text-zinc-900">{recentMovement.label}</div>
                              </div>
                              <div className="text-xs text-zinc-500">{recentMovement.detail}</div>
                            </div>
                          </div>
                        );
                      })()}

                      <div className="mb-4 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3">
                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                          <div>
                            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                              Result Proof
                            </div>
                            <div className="mt-1 text-sm font-semibold text-zinc-900">
                              {outcomeSummary.label}
                            </div>
                            <div className="mt-1 text-xs text-zinc-500">{outcomeSummary.detail}</div>
                          </div>
                          <div className="grid grid-cols-4 gap-2">
                            {outcomeSteps.map((step) => (
                              <div
                                key={`${campaign.id}-${step.label}`}
                                className={`rounded-lg border px-3 py-2 text-center text-[10px] font-semibold uppercase tracking-[0.14em] ${
                                  step.state === 'done'
                                    ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                                    : step.state === 'active'
                                      ? 'border-amber-300 bg-amber-50 text-amber-800'
                                      : 'border-zinc-200 bg-white text-zinc-400'
                                }`}
                              >
                                {step.label}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {campaign.venue?.impact ? (
                        <div className="mb-4 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
                          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                            <div>
                              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                                Pulse Outcome
                              </div>
                              <div className="mt-1 text-sm font-semibold text-zinc-900">{impactSummary.label}</div>
                              <div className="mt-1 text-xs text-zinc-500">{impactSummary.detail}</div>
                            </div>
                            <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                              <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-center">
                                <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Pulse now</div>
                                <div className="mt-1 text-sm font-bold text-zinc-900">{campaign.venue.impact.pulseNow}</div>
                              </div>
                              <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-center">
                                <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Memories</div>
                                <div className="mt-1 text-sm font-bold text-zinc-900">{campaign.venue.impact.memoriesNow}</div>
                              </div>
                              <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-center">
                                <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">This activation</div>
                                <div className="mt-1 text-sm font-bold text-zinc-900">
                                  {campaign.venue.impact.campaignVerifiedMemory
                                    ? `+${campaign.venue.impact.pulseContribution}`
                                    : 'pending'}
                                </div>
                              </div>
                              <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-center">
                                <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">First mark</div>
                                <div className="mt-1 text-sm font-bold text-zinc-900">
                                  {campaign.venue.impact.firstMarkWon ? 'won' : 'open'}
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {campaign.venue.impact.campaignVerifiedMemory ? (
                              <span className="rounded-full border border-emerald-300 bg-emerald-50 px-2 py-1 text-[10px] uppercase tracking-[0.12em] text-emerald-800">
                                memory added {campaign.venue.impact.linkedMemoryAt ? new Date(campaign.venue.impact.linkedMemoryAt).toLocaleDateString() : ''}
                              </span>
                            ) : null}
                            {campaign.venue.impact.firstMarkWon ? (
                              <span className="rounded-full border border-amber-300 bg-amber-50 px-2 py-1 text-[10px] uppercase tracking-[0.12em] text-amber-800">
                                first mark won
                              </span>
                            ) : null}
                            {campaign.venue.impact.recentCompletedCount > 0 ? (
                              <span className="rounded-full border border-purple-300 bg-purple-500/[0.08] px-2 py-1 text-[10px] uppercase tracking-[0.12em] text-zinc-800">
                                {campaign.venue.impact.recentCompletedCount} completions in latest bucket
                              </span>
                            ) : null}
                            {campaign.venue.impact.lastMarkedAt ? (
                              <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] uppercase tracking-[0.12em] text-zinc-600">
                                last marked {new Date(campaign.venue.impact.lastMarkedAt).toLocaleDateString()}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      ) : null}

                      {completionHistory.length > 0 ? (
                        <div className="mb-4 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
                          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                            Completion History
                          </div>
                          <div className="mt-3 space-y-2">
                            {completionHistory.map((entry) => (
                              <div
                                key={`${campaign.id}-${entry.key}`}
                                className="flex flex-col gap-1 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 md:flex-row md:items-center md:justify-between"
                              >
                                <div>
                                  <div className="text-xs font-semibold text-zinc-900">{entry.label}</div>
                                  <div className="text-[11px] text-zinc-500">{entry.detail}</div>
                                </div>
                                <div className="text-[11px] uppercase tracking-[0.14em] text-zinc-400">
                                  {new Date(entry.at).toLocaleString()}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null}

                      <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
                          style={{
                            width: `${
                              ((campaign.slotCounts.assigned + campaign.slotCounts.completed) /
                                Math.max(1, campaign.slotCounts.total)) *
                              100
                            }%`,
                          }}
                        />
                      </div>
                      <div className="flex justify-between mt-2 text-xs text-zinc-500">
                        <span>
                          {campaign.type === 'PLACE'
                            ? `${campaign.slotCounts.completed > 0 ? 'completed' : 'live on map'}`
                            : `${campaign.slotCounts.open} open • ${campaign.slotCounts.claimed} claimed • ${campaign.slotCounts.assigned} assigned`}
                        </span>
                        <span>
                          {campaign.truth?.timeline.settledAt
                            ? `settled ${new Date(campaign.truth.timeline.settledAt).toLocaleDateString()}`
                            : campaign.linkedDare?.status === 'PENDING_REVIEW'
                              ? 'proof in review'
                              : campaign.linkedDare?.status === 'PENDING_PAYOUT'
                                ? 'payout queued'
                                : campaign.linkedDare?.status === 'VERIFIED'
                                  ? 'paid and verified'
                            : campaign.truth?.timeline.liveAt
                              ? `live ${new Date(campaign.truth.timeline.liveAt).toLocaleDateString()}`
                              : `${campaign.slotCounts.completed} completed`}
                        </span>
                      </div>
                      <div className="mt-3 flex flex-wrap justify-end gap-2">
                        {campaign.linkedDare?.videoUrl ? (
                          <a
                            href={campaign.linkedDare.videoUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-800 transition hover:border-emerald-300 hover:bg-emerald-100"
                          >
                            <PlayCircle className="h-3.5 w-3.5" />
                            Watch Proof
                          </a>
                        ) : null}
                        {campaign.linkedDare?.shortId ? (
                          <Link
                            href={`/dare/${encodeURIComponent(campaign.linkedDare.shortId)}`}
                            className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-700 transition hover:border-white/20 hover:bg-white/10 hover:text-zinc-900"
                          >
                            Open Brief
                          </Link>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => toggleCampaignMatches(campaign)}
                          className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-700 transition hover:border-white/20 hover:bg-white/10 hover:text-zinc-900"
                        >
                          <Users className="h-3.5 w-3.5" />
                          {isMatchesExpanded ? 'Hide Responses' : responseTabCounts.shortlisted > 0 ? `Responses • ${responseTabCounts.shortlisted} shortlisted` : 'Responses'}
                        </button>
                        {campaign.venue?.slug ? (
                          <Link
                            href={`/map?place=${encodeURIComponent(campaign.venue.slug)}&campaignId=${encodeURIComponent(campaign.id)}&source=control`}
                            className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-700 transition hover:border-white/20 hover:bg-white/10 hover:text-zinc-900"
                          >
                            <MapPin className="h-3.5 w-3.5" />
                            View on Map
                          </Link>
                        ) : null}
                      </div>

                      {isMatchesExpanded ? (
                        <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] p-4">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <div className="text-sm font-semibold text-zinc-900">Creator responses</div>
                              <div className="mt-1 text-xs text-zinc-500">
                                Watch the activation move from shortlist to proof to paid outcome without leaving Control.
                              </div>
                            </div>
                            {matchesState?.loading ? (
                              <div className="text-xs uppercase tracking-[0.16em] text-zinc-500">Loading</div>
                            ) : null}
                          </div>

                          <div className="mt-4 flex flex-wrap gap-2">
                            {([
                              ['shortlisted', 'Shortlisted', responseTabCounts.shortlisted],
                              ['claimed', 'Claimed', responseTabCounts.claimed],
                              ['proof', 'Proof Submitted', responseTabCounts.proof],
                              ['review', 'In Review', responseTabCounts.review],
                              ['verified', 'Verified / Paid', responseTabCounts.verified],
                            ] as Array<[ResponseRailTab, string, number]>).map(([tabKey, label, count]) => (
                              <button
                                key={`${campaign.id}-${tabKey}`}
                                type="button"
                                onClick={() =>
                                  setResponsesTabByCampaign((current) => ({
                                    ...current,
                                    [campaign.id]: tabKey,
                                  }))
                                }
                                className={`rounded-full border px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] transition ${
                                  activeResponsesTab === tabKey
                                    ? 'border-purple-500 bg-purple-500/[0.08] text-zinc-950'
                                    : 'border-white/10 bg-white/5 text-zinc-600 hover:border-white/20 hover:bg-white/10 hover:text-zinc-900'
                                }`}
                              >
                                {label} {count > 0 ? `• ${count}` : ''}
                              </button>
                            ))}
                          </div>

                          {matchesState?.error ? (
                            <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                              {matchesState.error}
                            </div>
                          ) : null}

                          {activeResponsesTab === 'shortlisted' ? (
                            <>
                              {!matchesState?.loading && (matchesState?.data?.length ?? 0) === 0 ? (
                                <div className="mt-3 rounded-lg border border-white/10 bg-white/5 px-4 py-4 text-sm text-zinc-600">
                                  No creator matches yet. That is expected while onboarding is still at zero. Social connect and tag claims will start feeding this list.
                                </div>
                              ) : null}

                              <div className="mt-3 space-y-3">
                                {(matchesState?.data ?? []).slice(0, 5).map((match) => {
                                  const shortlist = (shortlistedCreators[campaign.id] ?? []).includes(match.creator.id);
                                  const platformLabels = Object.entries(match.creator.platforms)
                                    .filter(([, value]) => value?.handle)
                                    .map(([platform]) => platform.toUpperCase());

                                  return (
                                    <div
                                      key={match.creator.id}
                                      className="rounded-xl border border-white/10 bg-white/5 p-3"
                                    >
                                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                                        <div>
                                          <div className="flex flex-wrap items-center gap-2">
                                            <div className="font-semibold text-zinc-900">{match.creator.tag}</div>
                                            <div className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-600">
                                              score {match.score}
                                            </div>
                                          </div>
                                          <div className="mt-1 text-sm text-zinc-600">
                                            {match.creator.followerCount
                                              ? `${match.creator.followerCount.toLocaleString()} followers`
                                              : 'audience signal pending'}
                                            {' • '}
                                            {match.creator.completedDares} wins
                                            {' • '}
                                            ${Math.round(match.creator.totalEarned)} earned
                                          </div>
                                          {platformLabels.length > 0 ? (
                                            <div className="mt-2 text-xs uppercase tracking-[0.16em] text-zinc-500">
                                              {platformLabels.join(' • ')}
                                            </div>
                                          ) : null}
                                          {match.creator.identityHandle ? (
                                            <div className="mt-2 text-xs uppercase tracking-[0.16em] text-zinc-500">
                                              primary {match.creator.identityPlatform ?? 'identity'} • @{match.creator.identityHandle.replace(/^@/, '')}
                                            </div>
                                          ) : null}
                                          {match.creator.bio ? (
                                            <div className="mt-2 text-sm text-zinc-600 line-clamp-2">{match.creator.bio}</div>
                                          ) : null}
                                          <div className="mt-3 flex flex-wrap gap-2">
                                            {match.venueAffinity.exactVenueWins > 0 ? (
                                              <span className="rounded-full border border-emerald-300 bg-emerald-50 px-2 py-1 text-[10px] uppercase tracking-[0.12em] text-emerald-800">
                                                {match.venueAffinity.exactVenueWins} win{match.venueAffinity.exactVenueWins === 1 ? '' : 's'} here
                                              </span>
                                            ) : null}
                                            {match.venueAffinity.exactVenueMarks > 0 ? (
                                              <span className="rounded-full border border-purple-300 bg-purple-500/[0.08] px-2 py-1 text-[10px] uppercase tracking-[0.12em] text-zinc-800">
                                                {match.venueAffinity.exactVenueMarks} mark{match.venueAffinity.exactVenueMarks === 1 ? '' : 's'} here
                                              </span>
                                            ) : null}
                                            {match.venueAffinity.exactVenueCheckIns > 0 ? (
                                              <span className="rounded-full border border-sky-300 bg-sky-50 px-2 py-1 text-[10px] uppercase tracking-[0.12em] text-sky-800">
                                                {match.venueAffinity.exactVenueCheckIns} check-in{match.venueAffinity.exactVenueCheckIns === 1 ? '' : 's'} here
                                              </span>
                                            ) : null}
                                            {match.venueAffinity.sameCityMarks > 0 ? (
                                              <span className="rounded-full border border-amber-300 bg-amber-50 px-2 py-1 text-[10px] uppercase tracking-[0.12em] text-amber-800">
                                                {match.venueAffinity.sameCityMarks} city mark{match.venueAffinity.sameCityMarks === 1 ? '' : 's'}
                                              </span>
                                            ) : null}
                                          </div>
                                          <div className="mt-2 flex flex-wrap gap-2">
                                            {match.reasons.slice(0, 3).map((reason) => (
                                              <span
                                                key={`${match.creator.id}-${reason}`}
                                                className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] uppercase tracking-[0.12em] text-zinc-600"
                                              >
                                                {reason}
                                              </span>
                                            ))}
                                          </div>
                                          <div className="mt-3 flex flex-wrap gap-2">
                                            <Link
                                              href={`/creator/${encodeURIComponent(match.creator.tag)}`}
                                              className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-700 transition hover:border-white/20 hover:bg-white/10 hover:text-zinc-900"
                                            >
                                              View Creator
                                            </Link>
                                          </div>
                                        </div>

                                        <button
                                          type="button"
                                          onClick={() => toggleShortlistCreator(campaign.id, match.creator.id)}
                                          className={`rounded-lg border px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] transition ${
                                            shortlist
                                              ? 'border-purple-500 bg-purple-500/[0.08] text-zinc-950'
                                              : 'border-white/10 bg-white/5 text-zinc-700 hover:border-white/20 hover:bg-white/10 hover:text-zinc-900'
                                          }`}
                                        >
                                          {shortlist ? 'Shortlisted' : 'Shortlist'}
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </>
                          ) : null}

                          {activeResponsesTab === 'claimed' ? (
                            responseTabCounts.claimed > 0 ? (
                              <div className="mt-3 space-y-3">
                                <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                                    <div>
                                      <div className="flex flex-wrap items-center gap-2">
                                        <div className="font-semibold text-zinc-900">{getLinkedCreatorHandle(campaign)}</div>
                                        <div className="rounded-full border border-blue-300 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-blue-800">
                                          {campaign.linkedDare?.claimRequestStatus === 'PENDING' ? 'pending claim' : 'creator attached'}
                                        </div>
                                      </div>
                                      <div className="mt-1 text-sm text-zinc-600">
                                        {campaign.linkedDare?.claimRequestedAt
                                          ? `claimed ${new Date(campaign.linkedDare.claimRequestedAt).toLocaleString()}`
                                          : campaign.linkedDare?.claimedAt
                                            ? `attached ${new Date(campaign.linkedDare.claimedAt).toLocaleString()}`
                                            : 'creator is moving on this activation'}
                                      </div>
                                      <div className="mt-2 text-xs text-zinc-500">
                                        {campaign.linkedDare?.claimRequestStatus === 'PENDING'
                                          ? 'Waiting for moderation before the creator can lock the spot.'
                                          : 'Creator is attached and can submit proof now.'}
                                      </div>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                      {campaign.linkedDare?.shortId ? (
                                        <Link
                                          href={`/dare/${encodeURIComponent(campaign.linkedDare.shortId)}`}
                                          className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/60 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-800 transition hover:border-white/20 hover:bg-white/80"
                                        >
                                          Open Brief
                                        </Link>
                                      ) : null}
                                      {(campaign.linkedDare?.streamerHandle || campaign.linkedDare?.claimRequestTag) ? (
                                        <Link
                                          href={`/creator/${encodeURIComponent((campaign.linkedDare?.streamerHandle || campaign.linkedDare?.claimRequestTag || '').replace(/^@?/, '@'))}`}
                                          className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/60 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-800 transition hover:border-white/20 hover:bg-white/80"
                                        >
                                          View Creator
                                        </Link>
                                      ) : null}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="mt-3 rounded-lg border border-white/10 bg-white/5 px-4 py-4 text-sm text-zinc-600">
                                No creator has claimed this activation yet. Warm matches live in the Shortlisted rail.
                              </div>
                            )
                          ) : null}

                          {activeResponsesTab === 'proof' ? (
                            responseTabCounts.proof > 0 ? (
                              <div className="mt-3 space-y-3">
                                <div className="rounded-xl border border-violet-200 bg-violet-50 p-4">
                                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                                    <div>
                                      <div className="flex flex-wrap items-center gap-2">
                                        <div className="font-semibold text-zinc-900">{getLinkedCreatorHandle(campaign)}</div>
                                        <div className="rounded-full border border-violet-300 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-violet-800">
                                          proof submitted
                                        </div>
                                      </div>
                                      <div className="mt-1 text-sm text-zinc-600">
                                        {campaign.linkedDare?.updatedAt
                                          ? `submitted ${new Date(campaign.linkedDare.updatedAt).toLocaleString()}`
                                          : 'proof media landed for review'}
                                      </div>
                                      <div className="mt-2 text-xs text-zinc-500">
                                        Media is attached to the linked activation and ready for operator review.
                                      </div>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                      {campaign.linkedDare?.videoUrl ? (
                                        <a
                                          href={campaign.linkedDare.videoUrl}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="inline-flex items-center gap-2 rounded-lg border border-violet-300 bg-white/70 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-violet-900 transition hover:bg-white"
                                        >
                                          View Proof
                                        </a>
                                      ) : null}
                                      {campaign.linkedDare?.shortId ? (
                                        <Link
                                          href={`/dare/${encodeURIComponent(campaign.linkedDare.shortId)}`}
                                          className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/60 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-800 transition hover:border-white/20 hover:bg-white/80"
                                        >
                                          Open Brief
                                        </Link>
                                      ) : null}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="mt-3 rounded-lg border border-white/10 bg-white/5 px-4 py-4 text-sm text-zinc-600">
                                No proof has landed yet. This rail wakes up as soon as media is attached.
                              </div>
                            )
                          ) : null}

                          {activeResponsesTab === 'review' ? (
                            responseTabCounts.review > 0 ? (
                              <div className="mt-3 space-y-3">
                                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                                    <div>
                                      <div className="flex flex-wrap items-center gap-2">
                                        <div className="font-semibold text-zinc-900">{getLinkedCreatorHandle(campaign)}</div>
                                        <div className="rounded-full border border-amber-300 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-800">
                                          in review
                                        </div>
                                      </div>
                                      <div className="mt-1 text-sm text-zinc-600">
                                        {campaign.linkedDare?.moderatedAt
                                          ? `review touched ${new Date(campaign.linkedDare.moderatedAt).toLocaleString()}`
                                          : 'referee review is in flight'}
                                      </div>
                                      <div className="mt-2 text-xs text-zinc-500">
                                        {campaign.linkedDare?.moderatorNote || 'Review is live. The operator rail is deciding whether proof clears payout.'}
                                      </div>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                      {campaign.linkedDare?.videoUrl ? (
                                        <a
                                          href={campaign.linkedDare.videoUrl}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="inline-flex items-center gap-2 rounded-lg border border-amber-300 bg-white/70 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-900 transition hover:bg-white"
                                        >
                                          View Proof
                                        </a>
                                      ) : null}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="mt-3 rounded-lg border border-white/10 bg-white/5 px-4 py-4 text-sm text-zinc-600">
                                Nothing is waiting on moderation right now.
                              </div>
                            )
                          ) : null}

                          {activeResponsesTab === 'verified' ? (
                            responseTabCounts.verified > 0 ? (
                              <div className="mt-3 space-y-3">
                                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                                    <div>
                                      <div className="flex flex-wrap items-center gap-2">
                                        <div className="font-semibold text-zinc-900">{getLinkedCreatorHandle(campaign)}</div>
                                        <div className="rounded-full border border-emerald-300 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-800">
                                          {campaign.linkedDare?.status === 'PENDING_PAYOUT' ? 'payout queued' : 'paid and verified'}
                                        </div>
                                      </div>
                                      <div className="mt-1 text-sm text-zinc-600">
                                        {campaign.linkedDare?.verifiedAt
                                          ? `verified ${new Date(campaign.linkedDare.verifiedAt).toLocaleString()}`
                                          : 'proof cleared and settlement is underway'}
                                      </div>
                                      <div className="mt-2 text-xs text-zinc-500">
                                        {campaign.venue
                                          ? `This completion now sits in ${campaign.venue.name}'s place memory and strengthens the venue pulse.`
                                          : 'This completion now counts as a verified cultural outcome for the activation.'}
                                      </div>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                      {campaign.linkedDare?.videoUrl ? (
                                        <a
                                          href={campaign.linkedDare.videoUrl}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="inline-flex items-center gap-2 rounded-lg border border-emerald-300 bg-white/80 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-900 transition hover:bg-white"
                                        >
                                          Watch Proof
                                        </a>
                                      ) : null}
                                      {campaign.venue?.slug ? (
                                        <Link
                                          href={`/venues/${encodeURIComponent(campaign.venue.slug)}`}
                                          className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/60 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-800 transition hover:border-white/20 hover:bg-white/80"
                                        >
                                          Open Venue
                                        </Link>
                                      ) : null}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="mt-3 rounded-lg border border-white/10 bg-white/5 px-4 py-4 text-sm text-zinc-600">
                                No verified outcome yet. Once this clears, payout and place-memory impact will show up here.
                              </div>
                            )
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
      </>
      )}
    </div>
  );
}
