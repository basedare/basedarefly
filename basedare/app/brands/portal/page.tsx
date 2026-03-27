'use client';

import { useState, useEffect } from 'react';
import { useAccount, useConnect } from 'wagmi';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { ArrowLeft, MapPin, PlayCircle, Users } from 'lucide-react';
import ParticleNetwork from '@/components/ParticleNetwork';

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
  };
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
  creator: {
    id: string;
    tag: string;
    bio: string | null;
    followerCount: number | null;
    tags: string[];
    status: string;
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
    name: 'Sip & Mention',
    description: 'Show product, tag brand',
    minPayout: 50,
    window: '7 days',
    bonus: 'None',
    rake: '25%',
    color: 'from-zinc-600 to-zinc-700',
    borderColor: 'border-zinc-500/30',
  },
  SIP_SHILL: {
    name: 'Sip & Shill',
    description: 'Demo product, include CTA',
    minPayout: 100,
    window: '24 hours',
    bonus: 'None',
    rake: '28%',
    color: 'from-blue-600 to-blue-700',
    borderColor: 'border-blue-500/30',
  },
  CHALLENGE: {
    name: 'Challenge Integration',
    description: 'Product in dare, hashtag campaign',
    minPayout: 250,
    window: '2 hours',
    bonus: '1.3x Strike',
    rake: '30%',
    color: 'from-purple-600 to-purple-700',
    borderColor: 'border-purple-500/30',
  },
  APEX: {
    name: 'Apex Stunt',
    description: 'Full branded content, custom brief',
    minPayout: 1000,
    window: '1 hour',
    bonus: '1.5x Strike',
    rake: '35%',
    color: 'from-amber-500 to-orange-600',
    borderColor: 'border-amber-500/30',
  },
};

export default function BrandPortalPage() {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { data: session } = useSession();
  const sessionToken = (session as { token?: string | null } | null)?.token ?? null;

  // Hydration guard to prevent SSR/client mismatch flickering
  const [mounted, setMounted] = useState(false);

  const [brand, setBrand] = useState<Brand | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRegister, setShowRegister] = useState(false);
  const [showCreateCampaign, setShowCreateCampaign] = useState(false);
  const [registerName, setRegisterName] = useState('');

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
  const [expandedMatchesCampaignId, setExpandedMatchesCampaignId] = useState<string | null>(null);
  const [matchesByCampaign, setMatchesByCampaign] = useState<Record<string, CampaignMatchesState>>({});
  const [shortlistedCreators, setShortlistedCreators] = useState<Record<string, string[]>>({});

  // Mark as mounted after hydration
  useEffect(() => {
    setMounted(true);
  }, []);

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
      const tierConfig = TIER_INFO[formData.tier];
      if (formData.payoutPerCreator < tierConfig.minPayout) {
        alert(`Minimum payout for ${tierConfig.name} is $${tierConfig.minPayout}`);
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
          syncTime: formData.syncTime || undefined,
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
      } else if (data.code === 'CREATOR_CAMPAIGNS_DORMANT') {
        alert(data.error);
      } else {
        alert(data.error);
      }
    } catch (error) {
      console.error('Failed to create campaign:', error);
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

  const toggleCampaignMatches = async (campaignId: string) => {
    const willExpand = expandedMatchesCampaignId !== campaignId;
    setExpandedMatchesCampaignId(willExpand ? campaignId : null);

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
          : 'activation verified and payout cleared',
      };
    }

    if (dare.status === 'PENDING_PAYOUT') {
      return {
        label: 'Payout queued',
        tone: 'cyan' as const,
        actor,
        detail: 'proof cleared, payout retry is running automatically',
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
        label: 'Pending claim',
        tone: 'amber' as const,
        actor,
        detail: dare.claimRequestedAt
          ? `requested ${new Date(dare.claimRequestedAt).toLocaleString()}`
          : 'awaiting moderator review',
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
        detail: 'live on the map and waiting for creator pull',
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
        detail: 'This campaign has not produced a live proof rail yet.',
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
        detail: 'The activation is claimed and waiting for proof.',
      };
    }

    return {
      label: 'Open activation',
      detail: 'Live on the map and waiting for creator movement.',
    };
  };

  const getCampaignRecentMovement = (campaign: Campaign) => {
    const dare = campaign.linkedDare;
    if (!dare) {
      return {
        label: 'No movement yet',
        detail: 'The activation is live but no creator has touched it yet.',
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
        label: 'Proof landed',
        detail: dare.updatedAt
          ? `submitted ${new Date(dare.updatedAt).toLocaleString()}`
          : 'proof is in referee review now',
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
      label: 'Open on the grid',
      detail: dare.createdAt
        ? `linked ${new Date(dare.createdAt).toLocaleString()}`
        : 'activation is waiting for creator pull',
    };
  };

  // Determine current view state
  const showNotConnected = mounted && !isConnected;
  const showLoading = mounted && isConnected && loading;
  const showRegisterView = mounted && isConnected && !loading && showRegister;
  const showDashboard = mounted && isConnected && !loading && !showRegister;

  return (
    <div
      className="fixed inset-0 z-[100] bg-gradient-to-b from-zinc-100 via-zinc-50 to-white text-zinc-900 overflow-auto"
      style={{
        filter: 'grayscale(1) contrast(1.05)',
        WebkitFilter: 'grayscale(1) contrast(1.05)',
      }}
    >
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
        <ParticleNetwork particleCount={80} minDist={120} particleColor="rgba(0, 0, 0, 0.5)" lineColor="rgba(0, 0, 0," speed={0.25} />
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
              The B2B portal for programmatic attention marketing.
              Connect your wallet to access the brand dashboard.
            </p>
            <button
              onClick={() => connectors[0] && connect({ connector: connectors[0] })}
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
              <h1 className="text-2xl font-bold text-zinc-900">Register Your Brand</h1>
              <p className="text-zinc-600 mt-2">
                Enter Control Mode and start creating campaigns
              </p>
            </div>

            <div className="space-y-4 bg-white/80 backdrop-blur-xl p-6 rounded-xl border border-zinc-200">
              <div>
                <label className="block text-sm text-zinc-600 mb-2">Brand Name</label>
                <input
                  type="text"
                  value={registerName}
                  onChange={(e) => setRegisterName(e.target.value)}
                  placeholder="e.g., Red Bull, Monster Energy"
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
                Register Brand
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main dashboard */}
      {showDashboard && (
        <>

      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-zinc-200 px-4 md:px-6 py-3 md:py-4 bg-white/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2 md:gap-4">
            {/* Back button */}
            <Link
              href="/?mode=control"
              className="flex items-center gap-2 px-2 md:px-3 py-2 bg-white/70 border border-zinc-200 rounded-lg hover:bg-white transition"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div className="text-lg md:text-2xl font-bold text-zinc-900">
              CONTROL
            </div>
            <div className="hidden md:block px-2 py-1 bg-yellow-100 border border-yellow-400 rounded text-xs text-yellow-700 font-semibold">
              BRAND PORTAL
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

      <main className="relative z-10 max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-8">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-8">
          <div className="bg-white/80 backdrop-blur-xl border border-zinc-200 rounded-xl p-3 md:p-4">
            <div className="text-zinc-500 text-xs md:text-sm">Total Spend</div>
            <div className="text-xl md:text-2xl font-bold text-zinc-900">${brand?.totalSpend.toLocaleString() || 0}</div>
          </div>
          <div className="bg-white/80 backdrop-blur-xl border border-zinc-200 rounded-xl p-3 md:p-4">
            <div className="text-zinc-500 text-xs md:text-sm">Active Campaigns</div>
            <div className="text-xl md:text-2xl font-bold text-zinc-900">
              {campaigns.filter((c) => ['RECRUITING', 'LIVE'].includes(c.status)).length}
            </div>
          </div>
          <div className="bg-white/80 backdrop-blur-xl border border-zinc-200 rounded-xl p-3 md:p-4">
            <div className="text-zinc-500 text-xs md:text-sm">Total Creators</div>
            <div className="text-xl md:text-2xl font-bold text-zinc-900">
              {campaigns.reduce((sum, c) => sum + c.slotCounts.completed, 0)}
            </div>
          </div>
          <div className="bg-white/80 backdrop-blur-xl border border-zinc-200 rounded-xl p-3 md:p-4">
            <div className="text-zinc-500 text-xs md:text-sm">Avg Completion</div>
            <div className="text-xl md:text-2xl font-bold text-zinc-900">
              {campaigns.length > 0
                ? Math.round(
                    (campaigns.reduce(
                      (sum, c) => sum + c.slotCounts.completed / c.slotCounts.total,
                      0
                    ) /
                      campaigns.length) *
                      100
                  )
                : 0}
              %
            </div>
          </div>
        </div>

        {/* Value Menu / Create Campaign */}
        {showCreateCampaign ? (
          <div className="mb-8 bg-white/90 backdrop-blur-xl border border-zinc-200 rounded-2xl p-6 shadow-lg">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-zinc-900">Create Campaign</h2>
              <button
                onClick={() => setShowCreateCampaign(false)}
                className="text-zinc-500 hover:text-zinc-900"
              >
                ✕
              </button>
            </div>

            {/* Tier Selection - Value Menu Style */}
            <div className="mb-6">
              <label className="block text-sm text-zinc-600 mb-3">Select Tier</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
                {(Object.keys(TIER_INFO) as Array<keyof typeof TIER_INFO>).map((tier) => {
                  const info = TIER_INFO[tier];
                  const isSelected = formData.tier === tier;
                  return (
                    <button
                      key={tier}
                      onClick={() =>
                        setFormData({
                          ...formData,
                          tier,
                          payoutPerCreator: Math.max(formData.payoutPerCreator, info.minPayout),
                        })
                      }
                      className={`p-4 rounded-xl border transition-all ${
                        isSelected
                          ? `bg-gradient-to-br ${info.color} border-transparent text-white`
                          : `bg-white ${info.borderColor} hover:border-zinc-400 text-zinc-900`
                      }`}
                    >
                      <div className="font-semibold">{info.name}</div>
                      <div className={`text-xs mt-1 ${isSelected ? 'text-white/80' : 'text-zinc-500'}`}>{info.description}</div>
                      <div className="mt-3 text-xs space-y-1 text-left">
                        <div className="flex justify-between">
                          <span className={isSelected ? 'text-white/70' : 'text-zinc-500'}>Min:</span>
                          <span>${info.minPayout}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className={isSelected ? 'text-white/70' : 'text-zinc-500'}>Window:</span>
                          <span>{info.window}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className={isSelected ? 'text-white/70' : 'text-zinc-500'}>Bonus:</span>
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
              <label className="block text-sm text-zinc-600 mb-2">Campaign Type</label>
              <div className="grid grid-cols-2 gap-3">
                {([
                  {
                    value: 'PLACE',
                    title: 'Place Activation',
                    body: 'One campaign creates one real venue-linked challenge on the map.',
                  },
                  {
                    value: 'CREATOR',
                    title: 'Creator Routing',
                    body: 'Kept visible in Control Mode, but new creator-routing launches are currently parked while we finish real social routing.',
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
                  <label className="block text-sm text-zinc-600 mb-2">Campaign Title</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g., Summer Energy Challenge"
                    className="w-full px-4 py-3 bg-white border border-zinc-300 rounded-lg focus:border-purple-500 focus:outline-none text-zinc-900 placeholder:text-zinc-400"
                  />
                </div>

                <div>
                  <label className="block text-sm text-zinc-600 mb-2">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Brief description of the campaign..."
                    rows={3}
                    className="w-full px-4 py-3 bg-white border border-zinc-300 rounded-lg focus:border-purple-500 focus:outline-none text-zinc-900 placeholder:text-zinc-400 resize-none"
                  />
                </div>

                {formData.type === 'PLACE' ? (
                  <div>
                    <label className="block text-sm text-zinc-600 mb-2">Target Place</label>
                    <input
                      type="text"
                      value={selectedPlace ? selectedPlace.displayName : placeQuery}
                      onChange={(e) => {
                        setSelectedPlace(null);
                        setPlaceQuery(e.target.value);
                      }}
                      placeholder="Search for a BaseDare venue..."
                      className="w-full px-4 py-3 bg-white border border-zinc-300 rounded-lg focus:border-purple-500 focus:outline-none text-zinc-900 placeholder:text-zinc-400"
                    />
                    <div className="mt-2 text-xs text-zinc-500">
                      PLACE campaigns use the same venue-linked challenge rail as map-funded missions. You can select a seeded venue or create a new canonical place from search.
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
                              setPlaceQuery(place.displayName);
                              setPlaceResults([]);
                            }}
                            className="w-full rounded-lg border border-transparent bg-white px-3 py-3 text-left transition hover:border-purple-300 hover:bg-purple-50"
                          >
                            <div className="font-medium text-zinc-900">{place.name}</div>
                            <div className="text-xs text-zinc-500">{place.displayName}</div>
                            <div className="mt-1 text-[11px] uppercase tracking-[0.16em] text-zinc-400">
                              {place.placeId ? 'Seeded place' : 'New place from search'}
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
                          {selectedPlace.placeId ? 'Canonical venue ready' : 'Will create canonical venue on launch'}
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : null}

                <div className="grid grid-cols-2 gap-4">
                  {formData.type === 'CREATOR' ? (
                    <div>
                      <label className="block text-sm text-zinc-600 mb-2">Creator Count</label>
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
                      <label className="block text-sm text-zinc-600 mb-2">Challenge Count</label>
                      <div className="w-full rounded-lg border border-zinc-200 bg-zinc-100 px-4 py-3 text-zinc-700">
                        1 live place challenge
                      </div>
                    </div>
                  )}
                  <div>
                    <label className="block text-sm text-zinc-600 mb-2">
                      {formData.type === 'PLACE' ? 'Payout for This Challenge ($)' : 'Payout Per Creator ($)'}
                    </label>
                    <input
                      type="number"
                      value={formData.payoutPerCreator}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          payoutPerCreator: parseInt(e.target.value) || 50,
                        })
                      }
                      min={TIER_INFO[formData.tier].minPayout}
                      className="w-full px-4 py-3 bg-white border border-zinc-300 rounded-lg focus:border-purple-500 focus:outline-none text-zinc-900"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                {formData.type === 'CREATOR' ? (
                  <div className="rounded-xl border border-amber-300 bg-amber-50 p-4">
                    <div className="text-sm font-semibold text-amber-800">Creator routing is parked</div>
                    <div className="mt-2 text-sm text-amber-700">
                      Existing scout workflows stay intact, but new CREATOR campaigns are temporarily paused until the linked social-routing path is fully wired.
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                    <div className="text-sm font-semibold text-zinc-900">Place campaign wiring</div>
                    <div className="mt-2 text-sm text-zinc-600">
                      This campaign creates one real venue-linked challenge, appears on the map and place page, and settles back into place memory on completion.
                    </div>
                  </div>
                )}

                <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 space-y-4">
                  <div>
                    <div className="text-sm font-semibold text-zinc-900">Creator fit</div>
                    <div className="mt-1 text-sm text-zinc-600">
                      Keep these soft while we onboard creators. They steer ranking instead of blocking participation.
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm text-zinc-600 mb-2">Target Niche</label>
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
                    <label className="block text-sm text-zinc-600 mb-2">Min Followers</label>
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
                    <label className="block text-sm text-zinc-600 mb-2">Preferred Platforms</label>
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
                    <label className="block text-sm text-zinc-600 mb-2">Location Relevance</label>
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
                      <option value="anywhere">Anywhere for now</option>
                      <option value="near-venue">Prefer creators already around this venue</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-zinc-600 mb-2">Required Hashtags</label>
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
                      Sync Time (for Strike Bonus)
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
              <div className="text-sm text-zinc-600 mb-2">Budget Summary</div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 text-center">
                <div>
                  <div className="text-lg md:text-2xl font-bold text-zinc-900">${budget.gross.toLocaleString()}</div>
                  <div className="text-xs text-zinc-500">Creator Payouts</div>
                </div>
                <div>
                  <div className="text-lg md:text-2xl font-bold text-purple-600">
                    ${budget.rake.toLocaleString()}
                  </div>
                  <div className="text-xs text-zinc-500">
                    Fee ({TIER_INFO[formData.tier].rake})
                  </div>
                </div>
                <div>
                  <div className="text-lg md:text-2xl font-bold text-green-600">
                    ${budget.total.toLocaleString()}
                  </div>
                  <div className="text-xs text-zinc-500">Total Budget</div>
                </div>
                <div>
                  <div className="text-lg md:text-2xl font-bold text-zinc-900">
                    {budget.effectiveSlotCount} × ${formData.payoutPerCreator}
                  </div>
                  <div className="text-xs text-zinc-500">
                    {formData.type === 'PLACE' ? 'Live challenge × payout' : 'Slots × Payout'}
                  </div>
                </div>
              </div>
            </div>

            {/* Guarantee Banner */}
            <div className="bg-gradient-to-r from-green-100 to-emerald-100 border border-green-300 rounded-xl p-4 mb-6">
              <div className="flex items-center gap-3">
                <span className="text-2xl" style={{ filter: 'grayscale(1)' }}>⚡</span>
                <div>
                  <div className="font-semibold text-green-700">
                    All Deliverables Auto-Verified by AI Vision
                  </div>
                  <div className="text-sm text-zinc-600">
                    USDC Payment on Completion. No Bots. No Waste.
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col md:flex-row gap-3 md:gap-4">
              <button
                onClick={handleCreateCampaign}
                disabled={
                  !formData.title.trim() ||
                  formData.type === 'CREATOR' ||
                  (formData.type === 'PLACE' && !selectedPlace)
                }
                className="flex-1 py-3 md:py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-bold text-sm md:text-lg hover:opacity-90 transition disabled:opacity-50"
              >
                {formData.type === 'PLACE'
                  ? `LAUNCH PLACE CAMPAIGN ($${budget.total.toLocaleString()} USDC)`
                  : 'CREATOR ROUTING PARKED'}
              </button>
              <button
                onClick={() => setShowCreateCampaign(false)}
                className="px-6 py-3 md:py-4 bg-zinc-100 border border-zinc-300 rounded-xl hover:bg-zinc-200 text-zinc-700 transition"
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
              Create New Campaign
            </div>
          </button>
        )}

        {/* Campaigns List */}
        <div>
          <h2 className="text-xl font-bold mb-4">Your Campaigns</h2>

          {campaigns.length === 0 ? (
            <div className="text-center py-12 text-zinc-500">
              No campaigns yet. Create your first campaign to start the Shadow Army hunt.
            </div>
          ) : (
            <div className="space-y-4">
              {campaigns.map((campaign) => {
                const tierInfo = TIER_INFO[campaign.tier as keyof typeof TIER_INFO];
                const targetingPreview = formatTargetingPreview(campaign.targetingCriteria);
                const matchesState = matchesByCampaign[campaign.id];
                const shortlistedCount = (shortlistedCreators[campaign.id] ?? []).length;
                const isMatchesExpanded = expandedMatchesCampaignId === campaign.id;
                const creatorIntent = getCampaignIntent(campaign);
                const outcomeSteps = getCampaignOutcomeSteps(campaign);
                const outcomeSummary = getCampaignOutcomeSummary(campaign);
                return (
                  <div
                    key={campaign.id}
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
                          onClick={() => toggleCampaignMatches(campaign.id)}
                          className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-700 transition hover:border-white/20 hover:bg-white/10 hover:text-zinc-900"
                        >
                          <Users className="h-3.5 w-3.5" />
                          {isMatchesExpanded ? 'Hide Matches' : shortlistedCount > 0 ? `Matches • ${shortlistedCount} shortlisted` : 'Matches'}
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
                              <div className="text-sm font-semibold text-zinc-900">Matches</div>
                              <div className="mt-1 text-xs text-zinc-500">
                                Ranked softly so brands can see emerging fits even before the creator graph is dense.
                              </div>
                            </div>
                            {matchesState?.loading ? (
                              <div className="text-xs uppercase tracking-[0.16em] text-zinc-500">Loading</div>
                            ) : null}
                          </div>

                          {matchesState?.error ? (
                            <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                              {matchesState.error}
                            </div>
                          ) : null}

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
                                      {match.creator.bio ? (
                                        <div className="mt-2 text-sm text-zinc-600 line-clamp-2">{match.creator.bio}</div>
                                      ) : null}
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
