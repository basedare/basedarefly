'use client';
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Wallet, Trophy, Target, Zap, Plus, AlertCircle, Clock, CheckCircle, XCircle, Loader2, Upload, LogIn, Share2, MapPin } from "lucide-react";
import SubmitEvidence from "@/components/SubmitEvidence";
import ShareWinButton from "@/components/ShareWinButton";
import GradualBlurOverlay from "@/components/GradualBlurOverlay";
import LiquidBackground from "@/components/LiquidBackground";
import LivePotLeaderboard from "@/components/LivePotLeaderboard";
import InitProtocolButton from "@/components/InitProtocolButton";
import { useAccount, useConnect } from 'wagmi';
import { coinbaseWallet } from 'wagmi/connectors';
import { useSession } from 'next-auth/react';

interface Dare {
  id: string;
  shortId?: string;
  title: string;
  bounty: number;
  streamerHandle: string | null;
  status: string;
  videoUrl?: string;
  createdAt: string;
  updatedAt?: string;
  moderatedAt?: string | null;
  verifiedAt?: string | null;
  isSimulated?: boolean;
  stakerAddress?: string;
  targetWalletAddress?: string;
  claimedBy?: string | null;
  claimedAt?: string | null;
  claimRequestWallet?: string | null;
  claimRequestTag?: string | null;
  claimRequestedAt?: string | null;
  claimRequestStatus?: string | null;
  awaitingClaim?: boolean;
  claimDeadline?: string | null;
  locationLabel?: string | null;
}

interface UserTag {
  id: string;
  tag: string;
  status: string;
  verificationMethod: string;
  isPrimary?: boolean;
  identityPlatform?: string | null;
  identityHandle?: string | null;
  identityVerificationCode?: string | null;
  totalEarned: number;
  completedDares: number;
  bio?: string | null;
  followerCount?: number | null;
  tags?: string[];
}

interface SessionPlatformData {
  provider?: string | null;
  platformHandle?: string | null;
  platformBio?: string | null;
  platformFollowerCount?: number | null;
  token?: string | null;
}

interface Opportunity {
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
  claimable?: boolean;
  shortlisted: boolean;
}

type DareView = 'funded' | 'forme';

const raisedPanelClass =
  "relative overflow-hidden rounded-[30px] border border-white/[0.09] bg-[linear-gradient(180deg,rgba(255,255,255,0.07)_0%,rgba(255,255,255,0.025)_14%,rgba(10,9,18,0.9)_58%,rgba(7,6,14,0.96)_100%)] shadow-[0_28px_90px_rgba(0,0,0,0.4),0_0_28px_rgba(168,85,247,0.07),inset_0_1px_0_rgba(255,255,255,0.1),inset_0_-18px_24px_rgba(0,0,0,0.24)]";

const softCardClass =
  "relative overflow-hidden rounded-[26px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(255,255,255,0.06)_0%,rgba(255,255,255,0.02)_12%,rgba(10,10,18,0.92)_100%)] shadow-[0_18px_30px_rgba(0,0,0,0.22),inset_0_1px_0_rgba(255,255,255,0.08),inset_0_-12px_18px_rgba(0,0,0,0.22)]";

const insetCardClass =
  "rounded-[22px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(4,5,10,0.72)_0%,rgba(11,11,18,0.92)_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.06),inset_0_-10px_16px_rgba(0,0,0,0.26)]";

const sectionLabelClass =
  "inline-flex items-center gap-2 rounded-full border border-fuchsia-400/25 bg-[linear-gradient(180deg,rgba(217,70,239,0.16)_0%,rgba(88,28,135,0.08)_100%)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-fuchsia-100 shadow-[0_12px_24px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.12),inset_0_-10px_14px_rgba(0,0,0,0.22)]";

const pillClass =
  "inline-flex items-center gap-2 rounded-full border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06)_0%,rgba(11,11,18,0.94)_100%)] px-3.5 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-300 shadow-[0_12px_18px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.08)]";

function formatCompactCount(value: number | null | undefined): string | null {
  if (typeof value !== 'number' || Number.isNaN(value) || value <= 0) return null;

  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(value >= 10_000_000 ? 0 : 1)}M`;
  }

  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(value >= 10_000 ? 0 : 1)}K`;
  }

  return value.toString();
}

function getProviderLabel(provider: string | null | undefined): string {
  if (provider === 'twitter') return 'X';
  if (provider === 'twitch') return 'Twitch';
  if (provider === 'google') return 'YouTube';
  if (provider === 'youtube') return 'YouTube';
  if (provider === 'instagram') return 'Instagram';
  if (provider === 'tiktok') return 'TikTok';
  if (provider === 'other') return 'Other';
  return 'Social';
}

function getIdentityStatusLabel(status: string | null | undefined): string {
  if (status === 'ACTIVE' || status === 'VERIFIED') return 'Verified';
  if (status === 'PENDING') return 'Pending verification';
  if (status === 'REJECTED' || status === 'REVOKED' || status === 'SUSPENDED') return 'Rejected';
  return 'Not connected';
}

function walletsMatch(left?: string | null, right?: string | null) {
  if (!left || !right) return false;
  return left.toLowerCase() === right.toLowerCase();
}

function formatStatusTimestamp(value?: string | null, fallback = 'just now') {
  if (!value) return fallback;
  return new Date(value).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function getClaimLoopState(dare: Dare, walletAddress?: string | null) {
  const isPendingRequester = walletsMatch(dare.claimRequestWallet, walletAddress);
  const isAssignedCreator =
    walletsMatch(dare.targetWalletAddress, walletAddress) || walletsMatch(dare.claimedBy, walletAddress);

  if (isPendingRequester && dare.claimRequestStatus === 'PENDING') {
    return {
      label: 'Claim Pending',
      detail: dare.claimRequestedAt
        ? `Requested ${formatStatusTimestamp(dare.claimRequestedAt)}. Moderator review is still in flight.`
        : 'Moderator review is still in flight.',
      cta: 'Open Brief',
      tone: 'yellow',
      priority: 1,
    };
  }

  if (isAssignedCreator && dare.status === 'PENDING') {
    return {
      label: 'Ready for Proof',
      detail: dare.claimedAt
        ? `Attached ${formatStatusTimestamp(dare.claimedAt)}. Submit proof now.`
        : 'You have the activation. Submit proof now.',
      cta: 'Submit Proof',
      tone: 'cyan',
      priority: 0,
    };
  }

  if (isAssignedCreator && dare.status === 'PENDING_REVIEW') {
    return {
      label: 'In Review',
      detail: dare.updatedAt
        ? `Proof submitted ${formatStatusTimestamp(dare.updatedAt)}. Waiting on referee review.`
        : 'Proof submitted. Waiting on referee review.',
      cta: 'Open Brief',
      tone: 'amber',
      priority: 2,
    };
  }

  if (isAssignedCreator && dare.status === 'PENDING_PAYOUT') {
    return {
      label: 'Payout Queued',
      detail: dare.moderatedAt
        ? `Approved ${formatStatusTimestamp(dare.moderatedAt)}. Payout will retry automatically.`
        : 'Proof cleared. Payout will retry automatically.',
      cta: 'Open Brief',
      tone: 'green',
      priority: 3,
    };
  }

  if (isAssignedCreator && dare.status === 'VERIFIED') {
    return {
      label: 'Paid',
      detail: dare.verifiedAt
        ? `Paid ${formatStatusTimestamp(dare.verifiedAt)}.`
        : 'Verified completion cleared and paid out.',
      cta: 'Open Brief',
      tone: 'green',
      priority: 4,
    };
  }

  if (isAssignedCreator && dare.status === 'FAILED') {
    return {
      label: 'Needs Retry',
      detail: 'Proof was rejected. Open the brief and try again.',
      cta: 'Open Brief',
      tone: 'red',
      priority: 5,
    };
  }

  return {
    label: dare.status,
    detail: 'Open the brief for the latest state.',
    cta: 'Open Brief',
    tone: 'gray',
    priority: 5,
  };
}

function getClaimLoopTrustLine(dare: Dare, walletAddress?: string | null) {
  const loopState = getClaimLoopState(dare, walletAddress);

  if (loopState.label === 'Claim Pending') {
    return 'You are in the queue. No extra action needed until moderator review resolves.';
  }

  if (loopState.label === 'Ready for Proof') {
    return 'This is live and attached to you now. Proof is the only thing standing between you and review.';
  }

  if (loopState.label === 'In Review') {
    return 'Proof is safely in the referee lane. You do not need to re-upload unless moderators reject it.';
  }

  if (loopState.label === 'Payout Queued') {
    return 'The hard part is over. Chain settlement is retrying automatically in the background.';
  }

  if (loopState.label === 'Paid') {
    return 'Completed and settled. This win now compounds your creator history.';
  }

  if (loopState.label === 'Needs Retry') {
    return 'The brief is still open to you. Tighten the proof and resubmit.';
  }

  return 'Open the brief to see the latest state and next move.';
}

function OpportunityCard({
  opportunity,
  onOpen,
  onClaim,
  claimLoading,
  claimFeedback,
}: {
  opportunity: Opportunity;
  onOpen: (href: string) => void;
  onClaim: (opportunity: Opportunity) => void;
  claimLoading: boolean;
  claimFeedback?: string;
}) {
  const href = opportunity.linkedDare?.shortId
    ? `/dare/${opportunity.linkedDare.shortId}`
    : opportunity.venue?.slug
      ? `/map?place=${encodeURIComponent(opportunity.venue.slug)}`
      : '/map';
  const mapHref = opportunity.venue?.slug
    ? `/map?place=${encodeURIComponent(opportunity.venue.slug)}&source=creator${
        opportunity.linkedDare?.shortId ? `&dare=${encodeURIComponent(opportunity.linkedDare.shortId)}` : ''
      }`
    : '/map';

  return (
    <div className={`${insetCardClass} p-4`}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-cyan-200">
            <MapPin className="w-4 h-4" />
            <span className="text-[10px] font-bold uppercase tracking-[0.18em]">Live Activation</span>
          </div>
          <p className="mt-2 text-base font-black text-white line-clamp-1">
            {opportunity.venue?.name || 'Venue activation'}
          </p>
          <p className="mt-1 text-xs text-white/45">
            {opportunity.venue?.city || 'Map-linked'}
            {opportunity.venue?.country ? ` • ${opportunity.venue.country}` : ''}
          </p>
        </div>

        <div className="text-right shrink-0">
          <div className="text-xl font-black text-[#22c55e]">
            ${opportunity.payoutAmount}
            <span className="ml-1 text-xs font-bold text-[#22c55e]/80">{opportunity.payoutCurrency}</span>
          </div>
          <div className="mt-1 text-[10px] uppercase tracking-[0.16em] text-white/35">
            score {opportunity.matchScore}
          </div>
        </div>
      </div>

      <p className="mt-4 text-sm font-bold text-white line-clamp-2">{opportunity.title}</p>
      {opportunity.description ? (
        <p className="mt-2 text-xs leading-5 text-white/50 line-clamp-2">{opportunity.description}</p>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        {opportunity.matchReasons.slice(0, 3).map((reason) => (
          <span
            key={`${opportunity.id}-${reason}`}
            className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/55"
          >
            {reason}
          </span>
        ))}
      </div>

      {claimFeedback ? (
        <div className="mt-4 rounded-xl border border-green-500/20 bg-green-500/10 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-green-300">
          {claimFeedback}
        </div>
      ) : null}

      <div
        className={`mt-5 grid grid-cols-1 gap-2 ${
          opportunity.venue?.slug ? 'sm:grid-cols-3' : 'sm:grid-cols-2'
        }`}
      >
        <button
          onClick={() => onOpen(href)}
          className="rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-4 py-3 text-xs font-bold uppercase tracking-[0.18em] text-cyan-100 transition hover:border-cyan-300/50 hover:bg-cyan-400/16"
        >
          Open Brief
        </button>

        {opportunity.venue?.slug ? (
          <button
            onClick={() => onOpen(mapHref)}
            className="rounded-xl border border-fuchsia-400/30 bg-fuchsia-500/10 px-4 py-3 text-xs font-bold uppercase tracking-[0.18em] text-fuchsia-100 transition hover:border-fuchsia-300/50 hover:bg-fuchsia-500/16"
          >
            View on Map
          </button>
        ) : null}

        {opportunity.claimable ? (
          <button
            onClick={() => onClaim(opportunity)}
            disabled={claimLoading}
            className="rounded-xl border border-[#f5c518]/30 bg-[#f5c518]/10 px-4 py-3 text-xs font-bold uppercase tracking-[0.18em] text-[#f5d75f] transition hover:border-[#f5d75f]/50 hover:bg-[#f5c518]/16 disabled:opacity-50"
          >
            {claimLoading ? 'Claiming...' : 'Claim This Activation'}
          </button>
        ) : (
          <div className="flex items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/35">
            {opportunity.linkedDare?.claimRequestStatus === 'PENDING' ? 'Claim pending review' : 'Live brief'}
          </div>
        )}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const { connect, isPending: isConnecting } = useConnect();
  const { data: session } = useSession();
  const [fundedDares, setFundedDares] = useState<Dare[]>([]);
  const [forMeDares, setForMeDares] = useState<Dare[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDare, setSelectedDare] = useState<Dare | null>(null);
  const [activeView, setActiveView] = useState<DareView>('funded');
  const [userTag, setUserTag] = useState<UserTag | null>(null);
  const [creatorTagsInput, setCreatorTagsInput] = useState('');
  const [savingCreatorTags, setSavingCreatorTags] = useState(false);
  const [tagsSaveError, setTagsSaveError] = useState<string | null>(null);
  const [tagsSaveSuccess, setTagsSaveSuccess] = useState<string | null>(null);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [opportunitiesLoading, setOpportunitiesLoading] = useState(false);
  const [opportunitiesReason, setOpportunitiesReason] = useState<string | null>(null);
  const [claimingOpportunityId, setClaimingOpportunityId] = useState<string | null>(null);
  const [claimFeedback, setClaimFeedback] = useState<Record<string, string>>({});
  const [stats, setStats] = useState({
    totalFunded: 0,
    activeBounties: 0,
    completedBounties: 0,
    daresForMe: 0,
  });

  // Get the active dares list based on view
  const dares = activeView === 'funded' ? fundedDares : forMeDares;
  const sessionData = session as SessionPlatformData | null;
  const sessionToken = sessionData?.token ?? null;
  const connectedProvider = sessionData?.provider || null;
  const connectedHandle = sessionData?.platformHandle?.replace(/^@/, '').trim() || null;
  const connectedAudience = formatCompactCount(sessionData?.platformFollowerCount ?? null);
  const normalizedUserTag = userTag?.tag?.replace(/^@/, '').toLowerCase() || null;
  const socialMatchesClaimedTag = Boolean(
    connectedHandle && normalizedUserTag && connectedHandle.toLowerCase() === normalizedUserTag
  );
  const identityHandle =
    userTag?.identityHandle ||
    userTag?.tag?.replace(/^@/, '') ||
    connectedHandle ||
    null;
  const identityPlatform = userTag?.identityPlatform || connectedProvider || null;
  const identityStatus = userTag?.status || null;
  const hasVerifiedIdentity = identityStatus === 'ACTIVE' || identityStatus === 'VERIFIED';
  const hasPendingIdentity = identityStatus === 'PENDING';
  const hasRejectedIdentity =
    identityStatus === 'REJECTED' || identityStatus === 'REVOKED' || identityStatus === 'SUSPENDED';
  const claimTagHref = (() => {
    const params = new URLSearchParams();
    if (identityPlatform) params.set('platform', identityPlatform);
    if (identityHandle) params.set('handle', identityHandle);
    if (userTag?.tag) params.set('tag', userTag.tag.replace(/^@/, ''));
    const query = params.toString();
    return query ? `/claim-tag?${query}` : '/claim-tag';
  })();
  const creatorClaims = React.useMemo(() => {
    const lowerAddress = address?.toLowerCase() || null;
    return [...forMeDares].sort((left, right) => {
      const leftPriority = getClaimLoopState(left, lowerAddress).priority;
      const rightPriority = getClaimLoopState(right, lowerAddress).priority;
      if (leftPriority !== rightPriority) return leftPriority - rightPriority;
      return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
    });
  }, [address, forMeDares]);

  // Format wallet address for display
  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const focusClaim = (dare: Dare) => {
    setActiveView('forme');
    setSelectedDare(dare);
    window.requestAnimationFrame(() => {
      document.getElementById('mission-control')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  // Handle wallet connection
  const handleConnect = () => {
    connect({ connector: coinbaseWallet() });
  };

  // Keep editor in sync with fetched creator tags
  useEffect(() => {
    if (userTag?.tags && userTag.tags.length > 0) {
      setCreatorTagsInput(userTag.tags.join(', '));
    } else {
      setCreatorTagsInput('');
    }
  }, [userTag?.id, userTag?.tags]);

  const handleSaveCreatorTags = async () => {
    if (!address || !userTag) return;

    const parsed = Array.from(
      new Set(
        creatorTagsInput
          .split(',')
          .map((t) => t.replace(/^#/, '').trim().toLowerCase())
          .filter((t) => t.length >= 2)
      )
    );

    if (parsed.length < 3 || parsed.length > 5) {
      setTagsSaveError('Please enter 3 to 5 tags (comma separated).');
      setTagsSaveSuccess(null);
      return;
    }

    setSavingCreatorTags(true);
    setTagsSaveError(null);
    setTagsSaveSuccess(null);
    try {
      const res = await fetch('/api/tags', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: address,
          tag: userTag.tag,
          tags: parsed,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to save creator tags');
      }

      setUserTag((prev) => (prev ? { ...prev, tags: data.data.tags } : prev));
      setCreatorTagsInput(data.data.tags.join(', '));
      setTagsSaveSuccess('Creator tags saved.');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to save creator tags';
      setTagsSaveError(message);
    } finally {
      setSavingCreatorTags(false);
    }
  };

  // Fetch user's dares from API (both funded and for-me)
  useEffect(() => {
    const fetchDares = async () => {
      if (!address) {
        setFundedDares([]);
        setForMeDares([]);
        setUserTag(null);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        // Fetch user's verified tag
        const tagRes = await fetch(`/api/tags?wallet=${address}`);
        const tagData = tagRes.ok ? await tagRes.json() : { tags: [], primaryTag: null };
        const primaryTag =
          tagData.tags?.find((t: UserTag) => t.isPrimary) ||
          tagData.tags?.find((t: UserTag) => t.status === 'ACTIVE' || t.status === 'VERIFIED') ||
          tagData.tags?.find((t: UserTag) => t.status === 'PENDING') ||
          tagData.tags?.[0] ||
          null;
        setUserTag(primaryTag || null);

        // Fetch dares I funded (as staker)
        const fundedParams = new URLSearchParams({
          includeAll: 'true',
          userAddress: address,
          role: 'staker',
        });
        const fundedRes = await fetch(`/api/dares?${fundedParams.toString()}`);
        const fundedData = fundedRes.ok ? await fundedRes.json() : [];

        // Fetch dares targeting me (as creator)
        const forMeParams = new URLSearchParams({
          includeAll: 'true',
          userAddress: address,
          role: 'creator',
        });
        const forMeRes = await fetch(`/api/dares?${forMeParams.toString()}`);
        const forMeData = forMeRes.ok ? await forMeRes.json() : [];

        setFundedDares(fundedData);
        setForMeDares(forMeData);

        // Calculate stats from funded dares
        const active = fundedData.filter((d: Dare) => d.status === 'PENDING').length;
        const completed = fundedData.filter((d: Dare) => d.status === 'VERIFIED').length;
        const total = fundedData.reduce((sum: number, d: Dare) => sum + d.bounty, 0);

        setStats({
          totalFunded: total,
          activeBounties: active,
          completedBounties: completed,
          daresForMe: forMeData.length,
        });

        // Auto-select first pending dare from the active view
        const activeDares = activeView === 'funded' ? fundedData : forMeData;
        const pendingDare = activeDares.find((d: Dare) => d.status === 'PENDING');
        if (pendingDare) {
          setSelectedDare(pendingDare);
        }
      } catch (error) {
        console.error('Failed to fetch dares:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDares();
  }, [address, activeView]);

  useEffect(() => {
    const fetchOpportunities = async () => {
      if (!address) {
        setOpportunities([]);
        setOpportunitiesReason(null);
        return;
      }

      try {
        setOpportunitiesLoading(true);
        const response = await fetch(`/api/campaigns/for-creator?wallet=${encodeURIComponent(address)}`, {
          headers: sessionToken ? { Authorization: `Bearer ${sessionToken}` } : undefined,
        });
        const payload = await response.json();

        if (!payload.success) {
          throw new Error(payload.error || 'Failed to load creator opportunities');
        }

        setOpportunities(payload.data?.campaigns ?? []);
        setOpportunitiesReason(payload.data?.reason ?? null);
      } catch (error) {
        console.error('Failed to load creator opportunities:', error);
        setOpportunities([]);
        setOpportunitiesReason('LOAD_FAILED');
      } finally {
        setOpportunitiesLoading(false);
      }
    };

    fetchOpportunities();
  }, [address, sessionToken]);

  const handleClaimOpportunity = async (opportunity: Opportunity) => {
    if (!address || !opportunity.linkedDare?.id) return;

    try {
      setClaimingOpportunityId(opportunity.id);
      const response = await fetch(`/api/dares/${opportunity.linkedDare.id}/claim`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {}),
        },
        body: JSON.stringify({
          walletAddress: address,
        }),
      });
      const payload = await response.json();

      if (!payload.success) {
        throw new Error(payload.error || 'Failed to claim activation');
      }

      setClaimFeedback((current) => ({
        ...current,
        [opportunity.id]: 'Claim request sent',
      }));

      setOpportunities((current) =>
        current.map((entry) =>
          entry.id === opportunity.id
            ? {
                ...entry,
                claimable: false,
                linkedDare: entry.linkedDare
                  ? {
                      ...entry.linkedDare,
                      claimRequestWallet: address.toLowerCase(),
                      claimRequestStatus: 'PENDING',
                    }
                  : entry.linkedDare,
              }
            : entry
        )
      );
    } catch (error) {
      setClaimFeedback((current) => ({
        ...current,
        [opportunity.id]:
          error instanceof Error ? error.message : 'Failed to claim activation',
      }));
    } finally {
      setClaimingOpportunityId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return (
          <span className="px-3 py-1 text-xs font-bold uppercase tracking-wider bg-yellow-500/20 text-yellow-400 rounded-full border border-yellow-500/30 flex items-center gap-1">
            <Clock className="w-3 h-3" /> Pending
          </span>
        );
      case 'VERIFIED':
        return (
          <span className="px-3 py-1 text-xs font-bold uppercase tracking-wider bg-green-500/20 text-green-400 rounded-full border border-green-500/30 flex items-center gap-1">
            <CheckCircle className="w-3 h-3" /> Verified
          </span>
        );
      case 'PENDING_REVIEW':
        return (
          <span className="px-3 py-1 text-xs font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 rounded-full border border-amber-500/30 flex items-center gap-1">
            <Loader2 className="w-3 h-3" /> In Review
          </span>
        );
      case 'PENDING_PAYOUT':
        return (
          <span className="px-3 py-1 text-xs font-bold uppercase tracking-wider bg-cyan-500/20 text-cyan-300 rounded-full border border-cyan-500/30 flex items-center gap-1">
            <Loader2 className="w-3 h-3" /> Payout Queued
          </span>
        );
      case 'FAILED':
        return (
          <span className="px-3 py-1 text-xs font-bold uppercase tracking-wider bg-red-500/20 text-red-400 rounded-full border border-red-500/30 flex items-center gap-1">
            <XCircle className="w-3 h-3" /> Failed
          </span>
        );
      default:
        return (
          <span className="px-3 py-1 text-xs font-bold uppercase tracking-wider bg-gray-500/20 text-gray-400 rounded-full border border-gray-500/30">
            {status}
          </span>
        );
    }
  };
  const selectedClaimLoopState = selectedDare ? getClaimLoopState(selectedDare, address) : null;

  return (
    <div className="relative min-h-screen flex flex-col">
      <LiquidBackground />
      <div className="fixed inset-0 z-10 pointer-events-none hidden md:block"><GradualBlurOverlay /></div>

      <div className="container mx-auto px-4 sm:px-6 py-24 mb-12 flex-grow relative z-20">
        {/* TOP COMMAND TILE */}
        <div className={`${raisedPanelClass} mb-8 px-5 py-7 sm:px-8 sm:py-8`}>
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_14%_0%,rgba(250,204,21,0.12),transparent_32%),radial-gradient(circle_at_88%_100%,rgba(168,85,247,0.1),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.05)_0%,transparent_36%,transparent_72%,rgba(0,0,0,0.24)_100%)]" />
          <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/26 to-transparent" />
          <div className="relative space-y-6">
            <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-6">
              <div className="flex flex-col gap-3 max-w-3xl">
                <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-[18px] border border-[#f6d75f]/70 bg-[linear-gradient(180deg,#fff0a8_0%,#facc15_44%,#d9a90a_70%,#b77f04_100%)] text-black shadow-[0_1px_0_rgba(255,255,255,0.32)_inset,0_-6px_10px_rgba(0,0,0,0.18)_inset,0_16px_24px_rgba(0,0,0,0.22)]">
                    <Wallet className="h-7 w-7" />
                  </div>
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-[2.2rem] leading-none sm:text-5xl md:text-6xl font-black uppercase italic tracking-[-0.06em]">
                    <span className="text-[#FACC15] drop-shadow-[0_4px_18px_rgba(250,204,21,0.25)]">Command</span>
                    <span className="text-[#A855F7] drop-shadow-[0_4px_18px_rgba(168,85,247,0.2)]">Base</span>
                  </div>
                </div>

                {isConnected && userTag ? (
                  <>
                    <div>
                      <p className="text-gray-400 font-mono text-sm mb-1">
                        {hasPendingIdentity
                          ? 'Identity proof submitted. Waiting on review.'
                          : hasRejectedIdentity
                            ? 'Identity needs a fresh proof.'
                            : 'Ready for your next mission?'}
                      </p>
                      <h2 className="text-3xl md:text-4xl font-black text-white">
                        Welcome back, <span className="text-[#FFD700]">{userTag.tag}</span>
                      </h2>
                    </div>
                    <div className="flex flex-wrap items-center gap-2.5 text-sm">
                      <span
                        className={`${pillClass} normal-case tracking-normal text-xs ${
                          hasVerifiedIdentity
                            ? 'text-green-300 border-green-500/25 bg-[linear-gradient(180deg,rgba(34,197,94,0.18)_0%,rgba(20,83,45,0.08)_100%)]'
                            : hasPendingIdentity
                              ? 'text-yellow-300 border-yellow-500/25 bg-[linear-gradient(180deg,rgba(250,204,21,0.18)_0%,rgba(161,98,7,0.08)_100%)]'
                              : hasRejectedIdentity
                                ? 'text-red-300 border-red-500/25 bg-[linear-gradient(180deg,rgba(239,68,68,0.18)_0%,rgba(127,29,29,0.08)_100%)]'
                                : 'text-gray-300 border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06)_0%,rgba(11,11,18,0.94)_100%)]'
                        }`}
                      >
                        {hasVerifiedIdentity
                          ? '✓ Verified'
                          : hasPendingIdentity
                            ? '◌ Pending review'
                            : hasRejectedIdentity
                              ? '✕ Re-verify'
                              : 'Identity not verified'}
                      </span>
                      {address && (
                        <span className={`${pillClass} normal-case tracking-normal text-xs text-gray-300`}>
                          <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                          {formatAddress(address)}
                        </span>
                      )}
                      {identityHandle && identityPlatform && (
                        <span className={`${pillClass} normal-case tracking-normal text-xs text-cyan-200 border-cyan-500/20 bg-[linear-gradient(180deg,rgba(34,211,238,0.12)_0%,rgba(8,11,18,0.92)_100%)]`}>
                          Primary • @{identityHandle} on {getProviderLabel(identityPlatform)}
                        </span>
                      )}
                      {userTag.completedDares > 0 && (
                        <span className={`${pillClass} normal-case tracking-normal text-xs text-gray-300`}>
                          {userTag.completedDares} completed • ${userTag.totalEarned.toLocaleString()} earned
                        </span>
                      )}
                      {stats.daresForMe > 0 && (
                        <span className={`${pillClass} normal-case tracking-normal text-xs text-[#FFD700] border-[#FFD700]/30 bg-[linear-gradient(180deg,rgba(250,204,21,0.18)_0%,rgba(161,98,7,0.08)_100%)] animate-pulse`}>
                          {stats.daresForMe} dare{stats.daresForMe > 1 ? 's' : ''} awaiting you
                        </span>
                      )}
                    </div>
                  </>
                ) : isConnected ? (
                  <>
                    {address && (
                      <span className={`${pillClass} normal-case tracking-normal text-xs text-gray-300 w-fit`}>
                        <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                        Connected as {formatAddress(address)}
                      </span>
                    )}
                  </>
                ) : (
                  <div>
                    <h2 className="text-2xl md:text-3xl font-black text-white">Connect to enter the protocol</h2>
                    <p className="mt-2 text-gray-400 font-mono text-sm">
                      Connect your wallet to see your stats, manage your dares, and enter the protocol properly.
                    </p>
                  </div>
                )}
              </div>

              <div className="flex flex-col sm:items-end gap-3 md:min-w-[220px]">
                <Link href="/create">
                  <button className="hidden md:flex items-center gap-2 px-6 py-3 rounded-xl border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06)_0%,rgba(11,11,18,0.94)_100%)] uppercase font-bold text-xs hover:-translate-y-[1px] hover:bg-white/10 hover:border-white/30 transition-all text-white shadow-[0_12px_18px_rgba(0,0,0,0.16),inset_0_1px_0_rgba(255,255,255,0.08)]">
                    <Plus className="w-4 h-4" /> Create Dare
                  </button>
                </Link>
                {isConnected && userTag && (
                  <span className={`${pillClass} normal-case tracking-normal text-xs text-[#FFD700] border-[#FFD700]/30 bg-[linear-gradient(180deg,rgba(250,204,21,0.18)_0%,rgba(161,98,7,0.08)_100%)]`}>
                    {userTag.tag}
                  </span>
                )}
              </div>
            </div>

            <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

            {isConnected && userTag ? (
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <p className="text-white font-bold text-sm">Creator Tags</p>
                    <p className="text-gray-400 font-mono text-xs">Add 3-5 tags (comma separated). Used for discovery.</p>
                  </div>
                  <button
                    onClick={handleSaveCreatorTags}
                    disabled={savingCreatorTags}
                    className="self-start sm:self-auto px-4 py-2 rounded-xl border border-purple-500/40 bg-[linear-gradient(180deg,rgba(168,85,247,0.18)_0%,rgba(88,28,135,0.12)_100%)] text-purple-200 font-bold text-xs uppercase tracking-wider shadow-[0_10px_18px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.08)] transition-all hover:-translate-y-[1px] hover:border-purple-400/50 disabled:opacity-50"
                  >
                    {savingCreatorTags ? 'Saving...' : 'Save Tags'}
                  </button>
                </div>
                <input
                  value={creatorTagsInput}
                  onChange={(e) => setCreatorTagsInput(e.target.value)}
                  placeholder="nightlife, gym, street"
                  className="w-full px-4 py-3 rounded-xl bg-[linear-gradient(180deg,rgba(4,5,10,0.72)_0%,rgba(11,11,18,0.92)_100%)] border border-white/10 text-white text-sm font-mono focus:outline-none focus:border-purple-500/50 shadow-[inset_0_1px_0_rgba(255,255,255,0.04),inset_0_-10px_16px_rgba(0,0,0,0.24)]"
                />
                {tagsSaveError && <p className="text-red-400 text-xs">{tagsSaveError}</p>}
                {tagsSaveSuccess && <p className="text-green-400 text-xs">{tagsSaveSuccess}</p>}

                <div className={`${insetCardClass} p-4`}>
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-cyan-200">
                        <Share2 className="w-4 h-4" />
                        <span className="text-[10px] font-bold uppercase tracking-[0.24em] text-cyan-100">Connect Identity</span>
                      </div>
                      <p className="mt-3 text-sm font-bold text-white">
                        {identityHandle && identityPlatform
                          ? `Primary handle: @${identityHandle} on ${getProviderLabel(identityPlatform)}`
                          : 'Link your main creator handle to your wallet'}
                      </p>
                      <p className="mt-2 text-xs leading-5 text-white/55 max-w-2xl">
                        {hasVerifiedIdentity
                          ? 'Your verified handle anchors payouts, creator opportunities, and your public creator graph.'
                          : hasPendingIdentity
                            ? 'Your handle proof is in review and already tied to this wallet.'
                            : hasRejectedIdentity
                              ? 'Your last proof did not clear. Update the handle or submit a fresh proof.'
                              : 'Link a creator handle and submit a public proof for review.'}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => router.push(claimTagHref)}
                        className="inline-flex items-center justify-center rounded-full border border-cyan-400/25 bg-cyan-400/10 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-100 transition hover:border-cyan-300/40 hover:bg-cyan-400/16"
                      >
                        {hasPendingIdentity
                          ? 'Update Handle / Re-verify'
                          : hasRejectedIdentity
                            ? 'Re-verify Identity'
                            : identityHandle
                              ? 'Manage Identity'
                              : 'Connect Identity'}
                      </button>
                      <button
                        onClick={() => router.push('/map')}
                        className="inline-flex items-center justify-center rounded-full border border-purple-400/25 bg-purple-400/10 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-purple-100 transition hover:border-purple-300/40 hover:bg-purple-400/16"
                      >
                        Open Map
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    <div className="rounded-[18px] border border-white/8 bg-white/[0.03] px-4 py-3">
                      <p className="text-[10px] uppercase tracking-[0.18em] text-white/36">Primary Identity</p>
                      <p className="mt-2 text-sm font-black text-white">
                        {getIdentityStatusLabel(identityStatus)}
                      </p>
                      <p className="mt-1 text-[11px] text-white/48">
                        {identityPlatform && identityHandle
                          ? `${getProviderLabel(identityPlatform)} handle @${identityHandle}`
                          : hasRejectedIdentity
                            ? 'Last proof was rejected. Submit a fresh handle proof.'
                            : 'No linked creator handle yet'}
                      </p>
                    </div>

                    <div className="rounded-[18px] border border-white/8 bg-white/[0.03] px-4 py-3">
                      <p className="text-[10px] uppercase tracking-[0.18em] text-white/36">Claim Match</p>
                      <p className="mt-2 text-sm font-black text-white">
                        {hasRejectedIdentity ? 'Needs re-verify' : identityHandle ? (socialMatchesClaimedTag ? 'Aligned' : 'Needs match') : 'Waiting'}
                      </p>
                      <p className="mt-1 text-[11px] text-white/48">
                        {hasRejectedIdentity
                          ? 'Re-submit the handle proof, then match it cleanly to your BaseDare tag.'
                          : identityHandle
                          ? (socialMatchesClaimedTag ? 'Your linked handle matches your claimed BaseDare tag.' : `Linked handle is @${identityHandle}.`)
                          : 'Connect first, then anchor the right tag.'}
                      </p>
                    </div>

                    <div className="rounded-[18px] border border-white/8 bg-white/[0.03] px-4 py-3">
                      <p className="text-[10px] uppercase tracking-[0.18em] text-white/36">Share Ready</p>
                      <p className="mt-2 text-sm font-black text-white">
                        {hasVerifiedIdentity ? 'Yes' : hasPendingIdentity ? 'Pending' : hasRejectedIdentity ? 'Blocked' : 'Later'}
                      </p>
                      <p className="mt-1 text-[11px] text-white/48">
                        {hasVerifiedIdentity
                          ? `${connectedAudience ? `${connectedAudience} audience linked, ` : ''}approved wins can route through one anchored creator identity.`
                          : hasPendingIdentity
                            ? 'Your handle is under review now. Once approved, share and matching rails will point through the same identity.'
                            : hasRejectedIdentity
                              ? 'Clear a fresh proof first. Then payouts, matching, and distribution can point through one identity again.'
                              : 'Connect identity to make payouts, matching, and distribution point the same way.'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : isConnected ? (
              <div className={`${insetCardClass} p-4 space-y-4`}>
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-purple-500/25 bg-purple-500/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                      <Target className="w-5 h-5 text-purple-400 shrink-0" />
                    </div>
                    <div>
                      <p className="text-purple-300 text-sm font-bold">Claim your tag to start earning</p>
                      <p className="text-purple-300/70 text-xs font-mono">Link your handle so payouts and opportunities point the same way</p>
                    </div>
                  </div>
                  <button
                    onClick={() => router.push(claimTagHref)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl border border-purple-500/40 bg-[linear-gradient(180deg,rgba(168,85,247,0.18)_0%,rgba(88,28,135,0.12)_100%)] text-purple-200 font-bold text-xs uppercase tracking-wider transition-all hover:-translate-y-[1px] shrink-0 shadow-[0_10px_18px_rgba(0,0,0,0.16),inset_0_1px_0_rgba(255,255,255,0.08)]"
                  >
                    <Zap className="w-4 h-4" />
                    Connect Identity
                  </button>
                </div>

                <div className="grid gap-3 md:grid-cols-3">
                  <div className="rounded-[18px] border border-white/8 bg-white/[0.03] px-4 py-3">
                    <div className="flex items-center gap-2 text-cyan-200">
                      <Share2 className="w-4 h-4" />
                      <span className="text-[10px] font-bold uppercase tracking-[0.18em]">Social Status</span>
                    </div>
                    <p className="mt-2 text-sm font-black text-white">
                      {identityHandle ? `@${identityHandle}` : hasRejectedIdentity ? 'Needs re-verify' : 'Not connected'}
                    </p>
                    <p className="mt-1 text-[11px] text-white/48">
                      {identityHandle && identityPlatform
                        ? `${getProviderLabel(identityPlatform)} linked and waiting for tag alignment.`
                        : hasRejectedIdentity
                          ? 'Open Connect Identity again and submit a fresh proof.'
                          : 'Link your public creator handle first, then claim the right tag.'}
                    </p>
                  </div>

                  <div className="rounded-[18px] border border-white/8 bg-white/[0.03] px-4 py-3">
                    <div className="flex items-center gap-2 text-[#f5c518]">
                      <Zap className="w-4 h-4" />
                      <span className="text-[10px] font-bold uppercase tracking-[0.18em]">Next Step</span>
                    </div>
                    <p className="mt-2 text-sm font-black text-white">
                      {hasRejectedIdentity ? 'Re-verify first' : identityHandle ? 'Match your tag' : 'Connect and claim'}
                    </p>
                    <p className="mt-1 text-[11px] text-white/48">
                      {hasRejectedIdentity
                        ? 'Your last proof failed. Open Connect Identity and try again.'
                        : identityHandle
                          ? 'Your linked handle is ready to be anchored as a BaseDare tag.'
                          : 'Wallet is ready. Connect identity next, then claim your tag.'}
                    </p>
                  </div>

                  <div className="rounded-[18px] border border-white/8 bg-white/[0.03] px-4 py-3">
                    <div className="flex items-center gap-2 text-purple-200">
                      <MapPin className="w-4 h-4" />
                      <span className="text-[10px] font-bold uppercase tracking-[0.18em]">Map Layer</span>
                    </div>
                    <p className="mt-2 text-sm font-black text-white">Footprint later</p>
                    <p className="mt-1 text-[11px] text-white/48">
                      Claiming the right identity is what lets future footprint, place memory, and creator routing stay trustworthy.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className={`${insetCardClass} p-4 flex items-center justify-between gap-4`}>
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-yellow-500/25 bg-yellow-500/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                    <AlertCircle className="w-5 h-5 text-yellow-400 shrink-0" />
                  </div>
                  <p className="text-yellow-300 text-sm font-mono">Connect your wallet to see your personal stats and bounties</p>
                </div>
                <button
                  onClick={handleConnect}
                  disabled={isConnecting}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl border border-yellow-500/40 bg-[linear-gradient(180deg,rgba(250,204,21,0.18)_0%,rgba(161,98,7,0.12)_100%)] text-yellow-200 font-bold text-xs uppercase tracking-wider transition-all hover:-translate-y-[1px] disabled:opacity-50 shrink-0 shadow-[0_10px_18px_rgba(0,0,0,0.16),inset_0_1px_0_rgba(255,255,255,0.08)]"
                >
                  {isConnecting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <LogIn className="w-4 h-4" />
                  )}
                  Connect
                </button>
              </div>
            )}
          </div>
        </div>

        {/* USER STATS GRID */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-12">
          {/* Card 1: Total Staked */}
          <div className={`${softCardClass} p-6 relative group hover:border-[#FFD700]/25 transition-colors`}>
            <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:opacity-50 transition-opacity z-10">
              <Wallet className="w-12 h-12 text-[#FFD700]" />
            </div>
            <div className="relative z-10 text-gray-400 font-mono text-xs uppercase tracking-widest mb-2">Your Total Funded</div>
            <div className="relative z-10 text-3xl font-black text-white">
              {!isConnected ? (
                <span className="text-gray-500">--</span>
              ) : loading ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <>{stats.totalFunded.toLocaleString()} <span className="text-[#FFD700]">USDC</span></>
              )}
            </div>
            <div className="relative z-10 text-xs text-green-400 mt-2 font-mono flex items-center gap-1">
              <Zap className="w-3 h-3" /> On Base L2
            </div>
          </div>

          {/* Card 2: Active Bounties */}
          <div className={`${softCardClass} p-6 relative group hover:border-purple-500/25 transition-colors`}>
            <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:opacity-50 transition-opacity z-10">
              <Target className="w-12 h-12 text-purple-500" />
            </div>
            <div className="relative z-10 text-gray-400 font-mono text-xs uppercase tracking-widest mb-2">Your Active Bounties</div>
            <div className="relative z-10 text-3xl font-black text-white">
              {!isConnected ? (
                <span className="text-gray-500">--</span>
              ) : loading ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <>{stats.activeBounties} <span className="text-purple-500">DARES</span></>
              )}
            </div>
            <div className="relative z-10 text-xs text-purple-400 mt-2 font-mono">Awaiting Verification</div>
          </div>

          {/* Card 3: Completed */}
          <div className={`${softCardClass} p-6 relative group hover:border-green-500/25 transition-colors`}>
            <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:opacity-50 transition-opacity z-10">
              <Trophy className="w-12 h-12 text-green-500" />
            </div>
            <div className="relative z-10 text-gray-400 font-mono text-xs uppercase tracking-widest mb-2">Completed</div>
            <div className="relative z-10 text-2xl md:text-3xl font-black text-white">
              {!isConnected ? (
                <span className="text-gray-500">--</span>
              ) : loading ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <>{stats.completedBounties} <span className="text-green-500">VERIFIED</span></>
              )}
            </div>
            <div className="relative z-10 text-xs text-green-400 mt-2 font-mono">Paid Out</div>
          </div>

          {/* Card 4: My Activations */}
          <div className={`${softCardClass} p-6 relative group hover:border-[#FFD700]/25 transition-colors`}>
            <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:opacity-50 transition-opacity z-10">
              <Zap className="w-12 h-12 text-[#FFD700]" />
            </div>
            <div className="relative z-10 text-gray-400 font-mono text-xs uppercase tracking-widest mb-2">My Activations</div>
            <div className="relative z-10 text-2xl md:text-3xl font-black text-white">
              {!isConnected ? (
                <span className="text-gray-500">--</span>
              ) : loading ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <>{stats.daresForMe} <span className="text-[#FFD700]">PENDING</span></>
              )}
            </div>
            <div className="relative z-10 text-xs text-[#FFD700] mt-2 font-mono">Claim to Proof</div>
          </div>
        </div>

        {/* OPPORTUNITIES FOR YOU */}
        <div className={`${softCardClass} p-6 mb-12`}>
          <div className="pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-white/22 to-transparent" />
          <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <div className={sectionLabelClass}>
                <Zap className="w-4 h-4 text-fuchsia-300" />
                CREATOR PULL
              </div>
              <h3 className="mt-4 text-xl font-black uppercase tracking-[0.12em] text-white">
                Opportunities For You
              </h3>
              <p className="mt-2 max-w-2xl text-sm text-white/55">
                Money that fits your tag, your linked identity, and the places brands are trying to heat up right now.
              </p>
            </div>
            <button
              onClick={() => router.push('/map')}
              className="inline-flex items-center gap-2 self-start rounded-full border border-white/10 bg-white/5 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-300 transition hover:border-white/20 hover:bg-white/10 hover:text-white"
            >
              <MapPin className="w-4 h-4" />
              Open Map
            </button>
          </div>

          {!isConnected ? (
            <div className={`${insetCardClass} p-5 text-sm text-white/55`}>
              Connect your wallet to see paid activations that fit your creator profile.
            </div>
          ) : opportunitiesLoading ? (
            <div className={`${insetCardClass} flex items-center justify-center p-6 text-sm text-white/55`}>
              <Loader2 className="mr-3 h-5 w-5 animate-spin text-cyan-300" />
              Pulling live activations for your profile...
            </div>
          ) : opportunities.length === 0 ? (
            <div className={`${insetCardClass} p-5`}>
              <p className="text-sm text-white/65">
                {opportunitiesReason === 'CLAIM_TAG_REQUIRED'
                  ? 'Paid activations will appear here once you claim your tag. That gives BaseDare a real creator identity to match against live brand demand.'
                  : 'Paid activations will appear here as brands target your style. Link your creator identity and save a few creator tags to improve matches.'}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  onClick={() => router.push('/claim-tag')}
                  className="rounded-full border border-cyan-400/25 bg-cyan-400/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-100 transition hover:border-cyan-300/40 hover:bg-cyan-400/16"
                >
                  Claim Tag
                </button>
                <button
                  onClick={() => router.push('/claim-tag')}
                  className="rounded-full border border-purple-400/25 bg-purple-400/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-purple-100 transition hover:border-purple-300/40 hover:bg-purple-400/16"
                >
                  Connect Identity
                </button>
              </div>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {opportunities.map((opportunity) => (
                <OpportunityCard
                  key={opportunity.id}
                  opportunity={opportunity}
                  onOpen={(href) => router.push(href)}
                  onClaim={handleClaimOpportunity}
                  claimLoading={claimingOpportunityId === opportunity.id}
                  claimFeedback={claimFeedback[opportunity.id]}
                />
              ))}
            </div>
          )}
        </div>

        {/* MY CLAIM LOOP */}
        {isConnected && creatorClaims.length > 0 ? (
          <div className={`${softCardClass} p-6 mb-12`}>
            <div className="pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-white/22 to-transparent" />
            <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <div className={sectionLabelClass}>
                  <Target className="w-4 h-4 text-[#f5d75f]" />
                  CLAIM LOOP
                </div>
                <h3 className="mt-4 text-xl font-black uppercase tracking-[0.12em] text-white">
                  My Activations
                </h3>
                <p className="mt-2 max-w-2xl text-sm text-white/55">
                  The shortest path from seeing money to getting paid. Follow the next live step on each activation.
                </p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {creatorClaims.slice(0, 6).map((dare) => {
                const loopState = getClaimLoopState(dare, address);
                const trustLine = getClaimLoopTrustLine(dare, address);
                const toneClass =
                  loopState.tone === 'cyan'
                    ? 'border-cyan-400/20 bg-cyan-400/[0.08] text-cyan-100'
                    : loopState.tone === 'yellow'
                      ? 'border-yellow-400/20 bg-yellow-400/[0.08] text-yellow-100'
                      : loopState.tone === 'amber'
                        ? 'border-amber-400/20 bg-amber-400/[0.08] text-amber-100'
                        : loopState.tone === 'green'
                          ? 'border-green-400/20 bg-green-400/[0.08] text-green-100'
                          : loopState.tone === 'red'
                            ? 'border-red-400/20 bg-red-400/[0.08] text-red-100'
                            : 'border-white/10 bg-white/[0.03] text-white/70';

                return (
                  <div key={dare.id} className={`${insetCardClass} p-4`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-base font-black text-white line-clamp-2">{dare.title}</p>
                        <p className="mt-2 text-xs text-white/45">
                          {dare.locationLabel || dare.streamerHandle || 'Live activation'}
                        </p>
                      </div>
                      <span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${toneClass}`}>
                        {loopState.label}
                      </span>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <span className="rounded-full border border-[#f5c518]/18 bg-[#f5c518]/[0.08] px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-[#f8dd72]">
                        ${dare.bounty} USDC
                      </span>
                      {dare.claimRequestStatus === 'PENDING' && dare.claimRequestedAt ? (
                        <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-white/48">
                          requested {new Date(dare.claimRequestedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                        </span>
                      ) : null}
                    </div>

                    <p className="mt-4 text-sm text-white/58">{loopState.detail}</p>
                    <p className="mt-2 text-[11px] uppercase tracking-[0.16em] text-white/38">{trustLine}</p>

                    <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <button
                        onClick={() => focusClaim(dare)}
                        className="rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-4 py-3 text-xs font-bold uppercase tracking-[0.18em] text-cyan-100 transition hover:border-cyan-300/50 hover:bg-cyan-400/16"
                      >
                        {loopState.cta}
                      </button>
                      <button
                        onClick={() => router.push(`/dare/${dare.shortId || dare.id}`)}
                        className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-xs font-bold uppercase tracking-[0.18em] text-white/70 transition hover:border-white/20 hover:bg-white/[0.06]"
                      >
                        Open Brief
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}

        {/* MAIN CONTENT GRID */}
        <div id="mission-control" className="grid lg:grid-cols-2 gap-8 mb-12">

          {/* LEFT: BOUNTY LIST */}
          <div className={`${softCardClass} p-6`}>
            <div className="pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-white/22 to-transparent" />
            {/* Tab Switcher */}
            <div className="flex items-center gap-2 mb-6">
              <button
                onClick={() => { setActiveView('funded'); setSelectedDare(null); }}
                className={`flex-1 px-4 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-[0_10px_18px_rgba(0,0,0,0.12),inset_0_1px_0_rgba(255,255,255,0.06)] ${
                  activeView === 'funded'
                    ? 'border border-purple-500/45 bg-[linear-gradient(180deg,rgba(168,85,247,0.18)_0%,rgba(88,28,135,0.12)_100%)] text-purple-300'
                    : 'border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05)_0%,rgba(11,11,18,0.95)_100%)] text-gray-400 hover:bg-white/10'
                }`}
              >
                <Wallet className="w-4 h-4" />
                Funded ({fundedDares.length})
              </button>
              <button
                onClick={() => { setActiveView('forme'); setSelectedDare(null); }}
                className={`flex-1 px-4 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-[0_10px_18px_rgba(0,0,0,0.12),inset_0_1px_0_rgba(255,255,255,0.06)] ${
                  activeView === 'forme'
                    ? 'border border-[#FFD700]/45 bg-[linear-gradient(180deg,rgba(250,204,21,0.18)_0%,rgba(161,98,7,0.12)_100%)] text-[#FFD700]'
                    : 'border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05)_0%,rgba(11,11,18,0.95)_100%)] text-gray-400 hover:bg-white/10'
                }`}
              >
                <Target className="w-4 h-4" />
                My Activations ({forMeDares.length})
              </button>
            </div>

            <h3 className="text-lg font-black text-white uppercase tracking-wider mb-4 flex items-center gap-3">
              {activeView === 'funded' ? (
                <>
                  <Wallet className="w-5 h-5 text-purple-400" />
                  Dares You Funded
                </>
              ) : (
                <>
                  <Target className="w-5 h-5 text-[#FFD700]" />
                  My Activations
                </>
              )}
            </h3>

            {!isConnected ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                  <Wallet className="w-8 h-8 text-yellow-400" />
                </div>
                <p className="text-gray-400 font-mono text-sm mb-2">Wallet not connected</p>
                <p className="text-gray-500 font-mono text-xs mb-4">Connect to view your personal bounties</p>
                <button
                  onClick={handleConnect}
                  disabled={isConnecting}
                  className="px-6 py-3 rounded-xl border border-yellow-500/40 bg-[linear-gradient(180deg,rgba(250,204,21,0.18)_0%,rgba(161,98,7,0.12)_100%)] text-yellow-200 font-bold text-sm uppercase tracking-wider transition-all hover:-translate-y-[1px] disabled:opacity-50 shadow-[0_10px_18px_rgba(0,0,0,0.16),inset_0_1px_0_rgba(255,255,255,0.08)]"
                >
                  {isConnecting ? 'Connecting...' : 'Connect Wallet'}
                </button>
              </div>
            ) : loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
              </div>
            ) : dares.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/5 flex items-center justify-center">
                  {activeView === 'funded' ? (
                    <Wallet className="w-8 h-8 text-gray-500" />
                  ) : (
                    <Target className="w-8 h-8 text-gray-500" />
                  )}
                </div>
                <p className="text-gray-400 font-mono text-sm mb-2">
                  {activeView === 'funded' ? 'No bounties funded yet' : 'No activations yet'}
                </p>
                <p className="text-gray-500 font-mono text-xs mb-6">
                  {activeView === 'funded'
                    ? 'Create a dare to stake on a creator'
                    : 'Claim an activation and your proof loop will appear here.'}
                </p>
                {activeView === 'funded' ? (
                  <InitProtocolButton onClick={() => router.push('/create')} />
                ) : (
                  <button
                    onClick={() => router.push('/claim-tag')}
                    className="px-6 py-3 rounded-xl border border-[#FFD700]/40 bg-[linear-gradient(180deg,rgba(250,204,21,0.18)_0%,rgba(161,98,7,0.12)_100%)] text-[#FFD700] font-bold text-sm uppercase tracking-wider transition-all hover:-translate-y-[1px] shadow-[0_10px_18px_rgba(0,0,0,0.16),inset_0_1px_0_rgba(255,255,255,0.08)]"
                  >
                    Claim Your Tag
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                {dares.map((dare) => (
                  <div
                    key={dare.id}
                    onClick={() => setSelectedDare(dare)}
                    className={`p-4 rounded-[20px] border cursor-pointer transition-all shadow-[inset_0_1px_0_rgba(255,255,255,0.05),inset_0_-8px_14px_rgba(0,0,0,0.24)] ${
                      selectedDare?.id === dare.id
                        ? 'bg-[linear-gradient(180deg,rgba(168,85,247,0.14)_0%,rgba(11,11,18,0.95)_100%)] border-purple-500/45'
                        : 'bg-[linear-gradient(180deg,rgba(255,255,255,0.05)_0%,rgba(11,11,18,0.95)_100%)] border-white/10 hover:bg-white/10 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <h4 className="font-bold text-white text-sm line-clamp-1">{dare.title}</h4>
                      {getStatusBadge(dare.status)}
                    </div>
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-gray-400">{dare.streamerHandle || 'Open Bounty'}</span>
                      <span className="text-[#FFD700] font-bold">{dare.bounty} USDC</span>
                    </div>
                    {dare.isSimulated && (
                      <span className="mt-2 inline-block px-2 py-0.5 text-[10px] font-mono uppercase bg-yellow-500/20 text-yellow-400 rounded">
                        Simulated
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* RIGHT: SELECTED DARE DETAILS & EVIDENCE */}
          <div className="space-y-6">
            {/* MISSION DETAILS */}
            {selectedDare ? (
              <div className={`${softCardClass} p-6 relative`}>
                <div className="absolute top-0 right-0 px-4 py-2 bg-purple-500/20 text-purple-300 text-[10px] font-bold uppercase tracking-widest rounded-bl-xl border-b border-l border-purple-500/30 z-20">
                  Status: {selectedClaimLoopState?.label || selectedDare.status}
                </div>

                <div className="relative z-10">
                  <h3 className="text-lg font-black text-white mb-2 uppercase tracking-wider">Current Mission</h3>
                  <h2 className="text-2xl md:text-3xl font-black text-[#FFD700] mb-6 italic">&quot;{selectedDare.title}&quot;</h2>

                  <div className="space-y-3 font-mono text-sm text-gray-400 mb-6">
                    <div className="flex justify-between border-b border-white/10 pb-2">
                      <span>BOUNTY LOCKED:</span>
                      <span className="text-white">{selectedDare.bounty} USDC</span>
                    </div>
                    <div className="flex justify-between border-b border-white/10 pb-2">
                      <span>TARGET:</span>
                      <span className="text-purple-400">{selectedDare.streamerHandle}</span>
                    </div>
                    <div className="flex justify-between border-b border-white/10 pb-2">
                      <span>CREATED:</span>
                      <span className="text-gray-300">{new Date(selectedDare.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {selectedClaimLoopState && selectedClaimLoopState.label !== 'Ready for Proof' ? (
                    <div className={`${insetCardClass} flex items-start gap-3 text-xs text-gray-500 p-4`}>
                      <AlertCircle className="w-4 h-4 text-[#FFD700] shrink-0" />
                      <div>
                        <span>{selectedClaimLoopState.detail}</span>
                        <p className="mt-2 text-[11px] uppercase tracking-[0.16em] text-white/35">
                          {getClaimLoopTrustLine(selectedDare, address)}
                        </p>
                      </div>
                    </div>
                  ) : null}

                  {selectedDare.status === 'PENDING' && (
                    <div className={`${insetCardClass} flex items-start gap-3 text-xs text-gray-500 p-4`}>
                      <AlertCircle className="w-4 h-4 text-[#FFD700] shrink-0" />
                      <div>
                        <span>Upload video proof to verify completion. AI Referee will analyze within 60 seconds.</span>
                        {selectedDare.claimedAt ? (
                          <p className="mt-2 text-[11px] uppercase tracking-[0.16em] text-white/35">
                            attached {formatStatusTimestamp(selectedDare.claimedAt)}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  )}

                  {selectedDare.status === 'VERIFIED' && (
                    <div className="bg-[linear-gradient(180deg,rgba(34,197,94,0.12)_0%,rgba(7,18,10,0.92)_100%)] p-4 rounded-xl border border-green-500/30">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3 text-xs">
                          <CheckCircle className="w-4 h-4 text-green-400 shrink-0" />
                          <div>
                            <span className="text-green-400">This dare has been verified and paid out!</span>
                            <p className="mt-2 text-[11px] font-mono text-green-200/70">
                              Turn the verified result into distribution while the outcome is still fresh.
                            </p>
                            {selectedDare.verifiedAt ? (
                              <p className="mt-2 text-[11px] uppercase tracking-[0.16em] text-green-200/55">
                                paid {formatStatusTimestamp(selectedDare.verifiedAt)}
                              </p>
                            ) : null}
                          </div>
                        </div>
                        <ShareWinButton
                          dare={selectedDare.title}
                          amount={selectedDare.bounty}
                          streamer={selectedDare.streamerHandle ?? undefined}
                          shortId={selectedDare.shortId}
                          placeName={selectedDare.locationLabel}
                          compact
                        />
                      </div>
                    </div>
                  )}

                  {selectedDare.status === 'FAILED' && (
                    <div className="flex items-start gap-3 text-xs bg-[linear-gradient(180deg,rgba(239,68,68,0.12)_0%,rgba(18,8,8,0.92)_100%)] p-4 rounded-xl border border-red-500/30">
                      <XCircle className="w-4 h-4 text-red-400 shrink-0" />
                      <div>
                        <span className="text-red-400">Verification failed. Bounty has been refunded to stakers.</span>
                        {selectedDare.moderatedAt ? (
                          <p className="mt-2 text-[11px] uppercase tracking-[0.16em] text-red-200/55">
                            reviewed {formatStatusTimestamp(selectedDare.moderatedAt)}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className={`${softCardClass} p-6 flex items-center justify-center min-h-[200px]`}>
                <p className="text-gray-500 font-mono text-sm">Select a bounty to view details</p>
              </div>
            )}

            {/* EVIDENCE UPLOAD - Only show when this creator has the activation and proof is next */}
            {selectedDare && selectedClaimLoopState?.label === 'Ready for Proof' && selectedDare.status === 'PENDING' && (
              <div className={`${softCardClass} p-6`}>
                <h3 className="text-lg font-black text-white uppercase tracking-wider mb-4 flex items-center gap-3">
                  <Upload className="w-5 h-5 text-cyan-400" />
                  Submit Evidence
                </h3>
                <SubmitEvidence
                  dareId={selectedDare.id}
                  dareTitle={selectedDare.title}
                  bountyAmount={selectedDare.bounty}
                  streamerHandle={selectedDare.streamerHandle ?? undefined}
                  shortId={selectedDare.shortId}
                  placeName={selectedDare.locationLabel}
                  onVerificationComplete={(result: { status: string }) => {
                    const updateDare = (d: Dare) =>
                      d.id === selectedDare.id ? { ...d, status: result.status } : d;
                    setFundedDares((prev) => prev.map(updateDare));
                    setForMeDares((prev) => prev.map(updateDare));
                    setSelectedDare((current) =>
                      current?.id === selectedDare.id ? { ...current, status: result.status } : current
                    );
                  }}
                />
              </div>
            )}
          </div>
        </div>

        {/* LIVE POT & LEADERBOARD */}
        <div className="mt-8">
          <div className={`${softCardClass} p-3 sm:p-4`}>
            <div className="pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-white/22 to-transparent" />
            <div className="mb-4 px-2">
              <div className={sectionLabelClass}>
                <Trophy className="w-4 h-4 text-fuchsia-300" />
                FUND SIGNAL
              </div>
            </div>
            <LivePotLeaderboard />
          </div>
        </div>
      </div>
    </div>
  );
}
