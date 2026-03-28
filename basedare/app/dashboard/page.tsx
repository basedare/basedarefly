'use client';
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Clock, CheckCircle, XCircle, Loader2, LogIn, ChevronDown, ChevronRight, Settings2 } from "lucide-react";
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

const volumetricButtonBase =
  "inline-flex min-h-[44px] items-center justify-center gap-2 rounded-[16px] border px-4 py-3 text-xs font-bold uppercase tracking-[0.18em] transition-[transform,box-shadow,border-color,background,color] duration-150 ease-out hover:translate-y-[1px] active:translate-y-[2px] disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_14px_28px_rgba(0,0,0,0.34),inset_0_1px_0_rgba(255,255,255,0.08),inset_0_-12px_16px_rgba(0,0,0,0.24)] hover:shadow-[inset_0_12px_18px_rgba(0,0,0,0.34),inset_0_1px_0_rgba(255,255,255,0.06)]";

const volumetricButtonPurple =
  `${volumetricButtonBase} border-purple-400/25 bg-[linear-gradient(145deg,rgba(50,24,84,0.92),rgba(20,12,36,0.98))] text-purple-100 hover:border-purple-300/40 hover:bg-[linear-gradient(145deg,rgba(58,28,96,0.96),rgba(24,14,42,1))] hover:shadow-[inset_0_12px_18px_rgba(10,5,22,0.5),inset_0_1px_0_rgba(255,255,255,0.06),0_0_20px_rgba(168,85,247,0.18)]`;

const volumetricButtonGold =
  `${volumetricButtonBase} border-yellow-400/25 bg-[linear-gradient(145deg,rgba(58,44,12,0.94),rgba(24,18,6,0.98))] text-yellow-200 hover:border-yellow-300/40 hover:bg-[linear-gradient(145deg,rgba(66,50,14,0.98),rgba(28,21,7,1))] hover:shadow-[inset_0_12px_18px_rgba(18,12,2,0.52),inset_0_1px_0_rgba(255,255,255,0.06),0_0_22px_rgba(245,197,24,0.18)]`;

const volumetricButtonNeutral =
  `${volumetricButtonBase} border-white/10 bg-[linear-gradient(145deg,rgba(28,28,44,0.92),rgba(12,12,20,0.98))] text-white/85 hover:border-white/20 hover:bg-[linear-gradient(145deg,rgba(32,32,50,0.96),rgba(15,15,24,1))]`;

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

export default function Dashboard() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const { connect, isPending: isConnecting } = useConnect();
  const { data: session } = useSession();
  const [fundedDares, setFundedDares] = useState<Dare[]>([]);
  const [forMeDares, setForMeDares] = useState<Dare[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedFundedId, setExpandedFundedId] = useState<string | null>(null);
  const [expandedActivationId, setExpandedActivationId] = useState<string | null>(null);
  const [activationsOpen, setActivationsOpen] = useState(true);
  const [fundedOpen, setFundedOpen] = useState(true);
  const [userTag, setUserTag] = useState<UserTag | null>(null);
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

  const sessionData = session as SessionPlatformData | null;
  const sessionToken = sessionData?.token ?? null;
  const connectedProvider = sessionData?.provider || null;
  const connectedHandle = sessionData?.platformHandle?.replace(/^@/, '').trim() || null;
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

  // Format wallet address for display
  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  // Handle wallet connection
  const handleConnect = () => {
    connect({ connector: coinbaseWallet() });
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

      } catch (error) {
        console.error('Failed to fetch dares:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDares();
  }, [address]);

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

  const topOpportunities = opportunities.slice(0, 3);
  const creatorClaims = React.useMemo(() => {
    const lowerAddress = address?.toLowerCase() || null;
    const sorted = [...forMeDares].sort((left, right) => {
      const leftPriority = getClaimLoopState(left, lowerAddress).priority;
      const rightPriority = getClaimLoopState(right, lowerAddress).priority;
      if (leftPriority !== rightPriority) return leftPriority - rightPriority;
      return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
    });

    const seen = new Set<string>();
    return sorted.filter((dare) => {
      if (seen.has(dare.id)) return false;
      seen.add(dare.id);
      return true;
    });
  }, [address, forMeDares]);

  const fundedRows = React.useMemo(
    () => [...fundedDares].sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()),
    [fundedDares]
  );

  const expandedActivation = creatorClaims.find((dare) => dare.id === expandedActivationId) || null;
  const expandedFundedDare = fundedRows.find((dare) => dare.id === expandedFundedId) || null;

  return (
    <div className="relative min-h-screen flex flex-col">
      <LiquidBackground />
      <div className="fixed inset-0 z-10 pointer-events-none hidden md:block">
        <GradualBlurOverlay />
      </div>

      <div className="container relative z-20 mx-auto mb-12 flex-grow px-4 py-24 sm:px-6">
        <div className={`${raisedPanelClass} mb-8 px-5 py-6 sm:px-6`}>
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_14%_0%,rgba(250,204,21,0.12),transparent_32%),radial-gradient(circle_at_88%_100%,rgba(168,85,247,0.1),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.05)_0%,transparent_36%,transparent_72%,rgba(0,0,0,0.24)_100%)]" />
          <div className="relative flex flex-col gap-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={sectionLabelClass}>Dashboard</span>
                  {isConnected && address ? (
                    <span className={`${pillClass} normal-case tracking-normal text-xs text-gray-300`}>
                      {formatAddress(address)}
                    </span>
                  ) : null}
                  {userTag?.tag ? (
                    <span className={`${pillClass} normal-case tracking-normal text-xs text-[#FFD700] border-[#FFD700]/30 bg-[linear-gradient(180deg,rgba(250,204,21,0.18)_0%,rgba(161,98,7,0.08)_100%)]`}>
                      {userTag.tag}
                    </span>
                  ) : null}
                  {isConnected ? (
                    <span
                      className={`${pillClass} normal-case tracking-normal text-xs ${
                        hasVerifiedIdentity
                          ? 'text-green-300 border-green-500/25 bg-[linear-gradient(180deg,rgba(34,197,94,0.18)_0%,rgba(20,83,45,0.08)_100%)]'
                          : hasPendingIdentity
                            ? 'text-yellow-300 border-yellow-500/25 bg-[linear-gradient(180deg,rgba(250,204,21,0.18)_0%,rgba(161,98,7,0.08)_100%)]'
                            : hasRejectedIdentity
                              ? 'text-red-300 border-red-500/25 bg-[linear-gradient(180deg,rgba(239,68,68,0.18)_0%,rgba(127,29,29,0.08)_100%)]'
                              : 'text-gray-300'
                      }`}
                    >
                      {getIdentityStatusLabel(identityStatus)}
                    </span>
                  ) : null}
                </div>

                <div className="mt-4 flex flex-wrap items-baseline gap-x-2 gap-y-1 text-[2.2rem] leading-none sm:text-5xl md:text-6xl font-black uppercase italic tracking-[-0.06em]">
                  <span className="text-[#FACC15] drop-shadow-[0_4px_18px_rgba(250,204,21,0.25)]">Command</span>
                  <span className="text-[#A855F7] drop-shadow-[0_4px_18px_rgba(168,85,247,0.2)]">Base</span>
                </div>
                <p className="mt-2 text-sm text-white/55">
                  {isConnected
                    ? identityHandle && identityPlatform
                      ? `@${identityHandle} on ${getProviderLabel(identityPlatform)}`
                      : 'Connect identity to tighten payouts and matching.'
                    : 'Connect your wallet to enter the creator loop.'}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {isConnected ? (
                  <>
                    <button
                      onClick={() => router.push(claimTagHref)}
                      className={volumetricButtonPurple}
                    >
                      <span className="inline-flex items-center gap-2">
                        <Settings2 className="h-4 w-4" />
                        {identityHandle ? 'Manage identity' : 'Connect identity'}
                      </span>
                    </button>
                    <Link
                      href="/create"
                      className={volumetricButtonNeutral}
                    >
                      <Plus className="h-4 w-4" />
                      Create dare
                    </Link>
                  </>
                ) : (
                  <button
                    onClick={handleConnect}
                    disabled={isConnecting}
                    className={volumetricButtonGold}
                  >
                    {isConnecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
                    Connect wallet
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            {
              label: 'Funded',
              value: !isConnected ? '--' : loading ? '…' : `${stats.totalFunded.toLocaleString()} USDC`,
            },
            {
              label: 'Active dares',
              value: !isConnected ? '--' : loading ? '…' : `${stats.activeBounties}`,
            },
            {
              label: 'Completed',
              value: !isConnected ? '--' : loading ? '…' : `${stats.completedBounties}`,
            },
            {
              label: 'Activations',
              value: !isConnected ? '--' : loading ? '…' : `${stats.daresForMe}`,
            },
          ].map((item) => (
            <div key={item.label} className={`${softCardClass} px-4 py-4`}>
              <div className="text-2xl font-black text-white sm:text-3xl">{item.value}</div>
              <div className="mt-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/45">{item.label}</div>
            </div>
          ))}
        </div>

        <div className={`${softCardClass} mb-8 p-5 sm:p-6`}>
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-lg font-black uppercase tracking-[0.12em] text-white">Opportunities</h2>
            <button
              onClick={() => router.push('/map')}
              className={`${volumetricButtonNeutral} px-3 py-2 text-[11px]`}
            >
              Open map
            </button>
          </div>

          {!isConnected ? (
            <div className={`${insetCardClass} px-4 py-4 text-sm text-white/55`}>Connect wallet to see opportunities.</div>
          ) : opportunitiesLoading ? (
            <div className={`${insetCardClass} flex items-center justify-center px-4 py-6 text-sm text-white/55`}>
              <Loader2 className="mr-3 h-5 w-5 animate-spin text-cyan-300" />
              Loading opportunities
            </div>
          ) : topOpportunities.length === 0 ? (
            <div className={`${insetCardClass} flex flex-wrap items-center gap-3 px-4 py-4`}>
              <span className="text-sm text-white/55">
                {opportunitiesReason === 'CLAIM_TAG_REQUIRED' ? 'Claim your tag to unlock matches.' : 'No live matches yet.'}
              </span>
              <button
                onClick={() => router.push(claimTagHref)}
                className={volumetricButtonPurple}
              >
                Manage identity
              </button>
            </div>
          ) : (
            <div className="-mx-1 flex snap-x gap-4 overflow-x-auto px-1 pb-2 md:grid md:grid-cols-3 md:overflow-visible md:px-0">
              {topOpportunities.map((opportunity) => {
                const href = opportunity.linkedDare?.shortId
                  ? `/dare/${opportunity.linkedDare.shortId}`
                  : opportunity.venue?.slug
                    ? `/map?place=${encodeURIComponent(opportunity.venue.slug)}`
                    : '/map';
                return (
                  <div key={opportunity.id} className={`${insetCardClass} min-h-[220px] min-w-[280px] snap-start p-4 md:min-w-0`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-base font-black text-white line-clamp-1">{opportunity.venue?.name || 'Venue activation'}</p>
                        <p className="mt-1 text-xs text-white/42">
                          {opportunity.venue?.city || 'Map-linked'}
                          {opportunity.venue?.country ? ` • ${opportunity.venue.country}` : ''}
                        </p>
                      </div>
                      <div className="shrink-0 text-right text-lg font-black text-[#22c55e]">
                        ${opportunity.payoutAmount}
                      </div>
                    </div>
                    <p className="mt-4 text-sm font-bold text-white line-clamp-2">{opportunity.title}</p>
                    {claimFeedback[opportunity.id] ? (
                      <p className="mt-3 text-xs text-green-300">{claimFeedback[opportunity.id]}</p>
                    ) : null}
                    <div className="mt-6">
                      {opportunity.claimable ? (
                        <button
                          onClick={() => handleClaimOpportunity(opportunity)}
                          disabled={claimingOpportunityId === opportunity.id}
                          className={`${volumetricButtonGold} w-full`}
                        >
                          {claimingOpportunityId === opportunity.id ? 'Claiming...' : 'Claim'}
                        </button>
                      ) : (
                        <button
                          onClick={() => router.push(href)}
                          className={`${volumetricButtonPurple} w-full`}
                        >
                          Open
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className={`${softCardClass} mb-8 p-5 sm:p-6`}>
          <div className="mb-4 flex items-center justify-between gap-3">
            <button
              onClick={() => setActivationsOpen((current) => !current)}
              className="flex min-h-[44px] flex-1 items-center justify-between gap-3 text-left"
            >
              <h2 className="text-lg font-black uppercase tracking-[0.12em] text-white">My activations</h2>
              <div className="flex items-center gap-3">
                <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/40">{creatorClaims.length}</span>
                {activationsOpen ? (
                  <ChevronDown className="h-4 w-4 text-white/45" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-white/45" />
                )}
              </div>
            </button>
          </div>

          {!activationsOpen ? (
            <div className={`${insetCardClass} px-4 py-4 text-sm text-white/50`}>Collapsed</div>
          ) : !isConnected ? (
            <div className={`${insetCardClass} px-4 py-4 text-sm text-white/55`}>Connect wallet to track your activations.</div>
          ) : creatorClaims.length === 0 ? (
            <div className={`${insetCardClass} px-4 py-4 text-sm text-white/55`}>No activations yet.</div>
          ) : (
            <div className="space-y-3">
              {creatorClaims.map((dare) => {
                const loopState = getClaimLoopState(dare, address);
                const isExpanded = expandedActivation?.id === dare.id;
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
                  <div key={dare.id} className={`${insetCardClass} overflow-hidden`}>
                    <div className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                      <button
                        onClick={() => setExpandedActivationId(isExpanded ? null : dare.id)}
                        className="flex min-w-0 items-center gap-3 text-left"
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 shrink-0 text-white/45" />
                        ) : (
                          <ChevronRight className="h-4 w-4 shrink-0 text-white/45" />
                        )}
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-white line-clamp-1">{dare.title}</p>
                          <p className="mt-1 text-xs text-white/42">{dare.locationLabel || dare.streamerHandle || 'Live activation'}</p>
                        </div>
                      </button>
                      <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                        <span className="text-sm font-black text-[#f8dd72]">${dare.bounty}</span>
                        <span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${toneClass}`}>
                          {loopState.label}
                        </span>
                        <button
                          onClick={() => {
                            if (loopState.label === 'Ready for Proof') {
                              setExpandedActivationId(dare.id);
                              return;
                            }
                            router.push(`/dare/${dare.shortId || dare.id}`);
                          }}
                          className={`${
                            loopState.label === 'Ready for Proof'
                              ? volumetricButtonGold
                              : volumetricButtonPurple
                          }`}
                        >
                          {loopState.label === 'Ready for Proof' ? 'Submit proof' : 'Open'}
                        </button>
                      </div>
                    </div>

                    {isExpanded ? (
                      <div className="border-t border-white/8 px-4 py-4">
                        <p className="text-sm text-white/60">{loopState.detail}</p>
                        {dare.status === 'PENDING' && loopState.label === 'Ready for Proof' ? (
                          <div className="mt-4">
                            <SubmitEvidence
                              dareId={dare.id}
                              dareTitle={dare.title}
                              bountyAmount={dare.bounty}
                              streamerHandle={dare.streamerHandle ?? undefined}
                              shortId={dare.shortId}
                              placeName={dare.locationLabel}
                              onVerificationComplete={(result: { status: string }) => {
                                const updateDare = (entry: Dare) =>
                                  entry.id === dare.id
                                    ? {
                                        ...entry,
                                        status: result.status,
                                        updatedAt: new Date().toISOString(),
                                      }
                                    : entry;
                                setFundedDares((prev) => prev.map(updateDare));
                                setForMeDares((prev) => prev.map(updateDare));
                              }}
                            />
                          </div>
                        ) : (
                          <div className="mt-4 flex flex-wrap gap-2">
                            <button
                              onClick={() => router.push(`/dare/${dare.shortId || dare.id}`)}
                              className={volumetricButtonNeutral}
                            >
                              Open brief
                            </button>
                            {dare.status === 'VERIFIED' ? (
                              <ShareWinButton
                                dare={dare.title}
                                amount={dare.bounty}
                                streamer={dare.streamerHandle ?? undefined}
                                shortId={dare.shortId}
                                placeName={dare.locationLabel}
                                compact
                              />
                            ) : null}
                          </div>
                        )}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div id="mission-control" className={`${softCardClass} mb-8 p-5 sm:p-6`}>
          <div className="mb-4 flex items-center justify-between gap-3">
            <button
              onClick={() => setFundedOpen((current) => !current)}
              className="flex min-h-[44px] flex-1 items-center justify-between gap-3 text-left"
            >
              <h2 className="text-lg font-black uppercase tracking-[0.12em] text-white">Funded dares</h2>
              <div className="flex items-center gap-3">
                <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/40">{fundedRows.length}</span>
                {fundedOpen ? (
                  <ChevronDown className="h-4 w-4 text-white/45" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-white/45" />
                )}
              </div>
            </button>
            <Link
              href="/create"
              className={`${volumetricButtonNeutral} px-3 py-2 text-[11px]`}
            >
              <Plus className="h-4 w-4" />
              Create
            </Link>
          </div>

          {!fundedOpen ? (
            <div className={`${insetCardClass} px-4 py-4 text-sm text-white/50`}>Collapsed</div>
          ) : !isConnected ? (
            <div className={`${insetCardClass} px-4 py-4 text-sm text-white/55`}>Connect wallet to manage funded dares.</div>
          ) : loading ? (
            <div className={`${insetCardClass} flex items-center justify-center px-4 py-6 text-sm text-white/55`}>
              <Loader2 className="mr-3 h-5 w-5 animate-spin text-purple-300" />
              Loading funded dares
            </div>
          ) : fundedRows.length === 0 ? (
            <div className={`${insetCardClass} flex flex-wrap items-center gap-3 px-4 py-4`}>
              <span className="text-sm text-white/55">No funded dares yet.</span>
              <InitProtocolButton onClick={() => router.push('/create')} />
            </div>
          ) : (
            <div className="space-y-3">
              {fundedRows.map((dare) => {
                const isExpanded = expandedFundedDare?.id === dare.id;
                return (
                  <div key={dare.id} className={`${insetCardClass} overflow-hidden`}>
                    <div className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                      <button
                        onClick={() => setExpandedFundedId(isExpanded ? null : dare.id)}
                        className="flex min-w-0 items-center gap-3 text-left"
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 shrink-0 text-white/45" />
                        ) : (
                          <ChevronRight className="h-4 w-4 shrink-0 text-white/45" />
                        )}
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-white line-clamp-1">{dare.title}</p>
                          <p className="mt-1 text-xs text-white/42">{dare.streamerHandle || 'Open bounty'}</p>
                        </div>
                      </button>
                      <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                        <span className="text-sm font-black text-[#f8dd72]">${dare.bounty}</span>
                        {getStatusBadge(dare.status)}
                      </div>
                    </div>

                    {isExpanded ? (
                      <div className="border-t border-white/8 px-4 py-4">
                        <div className="grid gap-2 text-sm text-white/60 sm:grid-cols-3">
                          <div>
                            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/35">Target</p>
                            <p className="mt-1 text-white/75">{dare.streamerHandle || 'Open bounty'}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/35">Created</p>
                            <p className="mt-1 text-white/75">{new Date(dare.createdAt).toLocaleDateString()}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/35">State</p>
                            <p className="mt-1 text-white/75">{dare.status}</p>
                          </div>
                        </div>

                        <div className="mt-4 flex flex-wrap gap-2">
                          <button
                            onClick={() => router.push(`/dare/${dare.shortId || dare.id}`)}
                            className={volumetricButtonPurple}
                          >
                            Open brief
                          </button>
                          {dare.status === 'VERIFIED' ? (
                            <ShareWinButton
                              dare={dare.title}
                              amount={dare.bounty}
                              streamer={dare.streamerHandle ?? undefined}
                              shortId={dare.shortId}
                              placeName={dare.locationLabel}
                              compact
                            />
                          ) : null}
                        </div>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <details className={`${softCardClass} group mt-10`}>
          <summary className="flex min-h-[56px] cursor-pointer list-none items-center justify-between px-5 py-4 sm:px-6">
            <span className="text-lg font-black uppercase tracking-[0.12em] text-white">Fund signal</span>
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/40 group-open:hidden">Expand</span>
            <span className="hidden text-[11px] font-semibold uppercase tracking-[0.18em] text-white/40 group-open:block">Collapse</span>
          </summary>
          <div className="px-3 pb-3 sm:px-4 sm:pb-4">
            <LivePotLeaderboard />
          </div>
        </details>
      </div>
    </div>
  );
}
