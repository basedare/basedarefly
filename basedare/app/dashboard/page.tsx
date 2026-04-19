'use client';
import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Clock, CheckCircle, XCircle, Loader2, LogIn, ChevronDown, ChevronRight, Settings2, Zap } from "lucide-react";
import SubmitEvidence from "@/components/SubmitEvidence";
import ShareWinButton from "@/components/ShareWinButton";
import GradualBlurOverlay from "@/components/GradualBlurOverlay";
import LiquidBackground from "@/components/LiquidBackground";
import LivePotLeaderboard from "@/components/LivePotLeaderboard";
import CosmicButton from "@/components/ui/CosmicButton";
import InitProtocolButton from "@/components/InitProtocolButton";
import { useAccount, useConnect, useSignMessage } from 'wagmi';
import { coinbaseWallet } from 'wagmi/connectors';
import { useSession } from 'next-auth/react';
import { buildDareResponseMessage, DARE_RESPONSE_WINDOW_MS } from '@/lib/dare-response-auth';
import { DARE_STATUS_DECLINED, DARE_STATUS_PENDING_ACCEPTANCE } from '@/lib/dare-status';

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
  moderatorNote?: string | null;
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
  pfpUrl?: string | null;
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
  affinity?: {
    venueMarks: number;
    firstMarksAtVenue: number;
    cityMarks: number;
  };
  assignedToCreator?: boolean;
  claimable?: boolean;
  shortlisted: boolean;
}

interface FootprintStats {
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
}

type StoredDareResponseAuth = {
  walletAddress: string;
  dareId: string;
  issuedAt: string;
  signature: string;
};

const raisedPanelClass =
  "relative overflow-hidden rounded-[30px] border border-white/[0.09] bg-[linear-gradient(180deg,rgba(255,255,255,0.07)_0%,rgba(255,255,255,0.025)_14%,rgba(10,9,18,0.9)_58%,rgba(7,6,14,0.96)_100%)] shadow-[0_28px_90px_rgba(0,0,0,0.4),0_0_28px_rgba(168,85,247,0.07),inset_0_1px_0_rgba(255,255,255,0.1),inset_0_-18px_24px_rgba(0,0,0,0.24)]";

const softCardClass =
  "relative overflow-hidden rounded-[26px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(255,255,255,0.06)_0%,rgba(255,255,255,0.02)_12%,rgba(10,10,18,0.92)_100%)] shadow-[0_18px_30px_rgba(0,0,0,0.22),inset_0_1px_0_rgba(255,255,255,0.08),inset_0_-12px_18px_rgba(0,0,0,0.22)]";

const insetCardClass =
  "bd-dent-surface bd-dent-surface--soft rounded-[22px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(4,5,10,0.72)_0%,rgba(11,11,18,0.92)_100%)]";

const raisedTileClass =
  "relative overflow-hidden rounded-[24px] border border-white/[0.08] bg-[linear-gradient(160deg,rgba(34,32,56,0.92)_0%,rgba(18,18,30,0.98)_38%,rgba(10,10,18,1)_100%)] shadow-[0_20px_38px_rgba(0,0,0,0.32),0_0_22px_rgba(168,85,247,0.08),inset_0_1px_0_rgba(255,255,255,0.12),inset_0_-14px_20px_rgba(0,0,0,0.26)]";

const metricTileClass =
  `${raisedTileClass} before:pointer-events-none before:absolute before:inset-x-6 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-white/28 before:to-transparent`;

const sectionBarClass =
  "relative isolate overflow-hidden rounded-[20px] border border-white/[0.09] bg-[linear-gradient(180deg,rgba(34,31,52,0.9)_0%,rgba(20,18,31,0.96)_42%,rgba(10,10,18,1)_100%)] px-4 py-3 shadow-[0_14px_24px_rgba(0,0,0,0.26),0_0_14px_rgba(168,85,247,0.05),inset_0_1px_0_rgba(255,255,255,0.08),inset_0_-10px_14px_rgba(0,0,0,0.24)] before:pointer-events-none before:absolute before:inset-x-8 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-white/18 before:to-transparent after:pointer-events-none after:absolute after:inset-[1px] after:rounded-[18px] after:border after:border-white/7";

const insetWellClass =
  "bd-dent-surface bd-dent-surface--soft rounded-[20px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(8,8,14,0.94)_0%,rgba(16,14,28,0.86)_100%)]";

const sectionLabelClass =
  "inline-flex items-center gap-2 rounded-full border border-fuchsia-400/25 bg-[linear-gradient(180deg,rgba(217,70,239,0.16)_0%,rgba(88,28,135,0.08)_100%)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-fuchsia-100 shadow-[0_12px_24px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.12),inset_0_-10px_14px_rgba(0,0,0,0.22)]";

const pillClass =
  "inline-flex items-center gap-2 rounded-full border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06)_0%,rgba(11,11,18,0.94)_100%)] px-3.5 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-300 shadow-[0_12px_18px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.08)]";

const volumetricButtonBase =
  "relative isolate inline-flex min-h-[48px] items-center justify-center gap-2 overflow-hidden rounded-[16px] border px-4 py-3 text-xs font-bold uppercase tracking-[0.18em] transition-[transform,box-shadow,border-color,background,color] duration-150 ease-out hover:-translate-y-[1px] active:translate-y-[1px] disabled:cursor-not-allowed disabled:opacity-50 shadow-[0_12px_20px_rgba(0,0,0,0.26),inset_0_1px_0_rgba(255,255,255,0.08),inset_0_-10px_14px_rgba(0,0,0,0.24)] before:pointer-events-none before:absolute before:inset-x-5 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-white/26 before:to-transparent after:pointer-events-none after:absolute after:inset-[1px] after:rounded-[15px] after:border after:border-white/8 hover:shadow-[0_14px_22px_rgba(0,0,0,0.28),inset_0_1px_0_rgba(255,255,255,0.08),inset_0_-10px_14px_rgba(0,0,0,0.24)]";

const volumetricButtonPurple =
  `${volumetricButtonBase} border-purple-300/18 bg-[linear-gradient(180deg,rgba(78,49,124,0.88)_0%,rgba(43,27,71,0.94)_28%,rgba(19,14,31,0.98)_100%)] text-purple-100 hover:border-purple-200/26 hover:bg-[linear-gradient(180deg,rgba(88,56,136,0.9)_0%,rgba(47,30,78,0.95)_28%,rgba(20,14,33,1)_100%)]`;

const volumetricButtonGold =
  `${volumetricButtonBase} border-yellow-300/20 bg-[linear-gradient(180deg,rgba(223,177,44,0.92)_0%,rgba(159,118,18,0.9)_26%,rgba(58,42,8,0.96)_74%,rgba(22,17,6,1)_100%)] text-[#140f06] hover:border-yellow-200/28 hover:bg-[linear-gradient(180deg,rgba(232,187,52,0.94)_0%,rgba(171,126,21,0.92)_26%,rgba(61,45,8,0.98)_74%,rgba(24,18,6,1)_100%)] after:border-yellow-100/12`;

const volumetricButtonNeutral =
  `${volumetricButtonBase} border-white/10 bg-[linear-gradient(180deg,rgba(62,72,90,0.24)_0%,rgba(35,40,53,0.68)_22%,rgba(18,20,31,0.98)_100%)] text-white/86 hover:border-white/16 hover:bg-[linear-gradient(180deg,rgba(68,79,98,0.26)_0%,rgba(38,44,58,0.72)_22%,rgba(20,22,34,1)_100%)]`;

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

  if (isAssignedCreator && dare.status === DARE_STATUS_PENDING_ACCEPTANCE) {
    return {
      label: 'Respond Now',
      detail:
        'You were directly dared. Accept to unlock proof submission, or decline so the creator gets a clear answer.',
      cta: 'Respond',
      tone: 'yellow',
      priority: 0,
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

  if (isAssignedCreator && dare.status === DARE_STATUS_DECLINED) {
    return {
      label: 'Declined',
      detail: 'You declined this dare. The creator has been notified.',
      cta: 'Open Brief',
      tone: 'red',
      priority: 5,
    };
  }

  if (isAssignedCreator && dare.status === 'FUNDING') {
    return {
      label: 'Funding Sync Pending',
      detail:
        'The dare has been assigned to you, but the onchain funding receipt is still syncing. Proof unlocks automatically as soon as funding is confirmed.',
      cta: 'Open Brief',
      tone: 'yellow',
      priority: 1,
    };
  }

  if (isAssignedCreator && dare.status === 'PENDING_REVIEW') {
    return {
      label: 'In Review',
      detail: dare.moderatorNote
        ? dare.moderatorNote
        : dare.updatedAt
          ? `Proof submitted ${formatStatusTimestamp(dare.updatedAt)}. Referee review is live now. Expect an answer within 24 hours.`
          : 'Proof submitted. Referee review is live now. Expect an answer within 24 hours.',
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
      detail: dare.moderatorNote || 'Proof needs a clearer retry. Open the brief, check the note, and submit a stronger proof.',
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
  const { signMessageAsync } = useSignMessage();
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
  const [activationFeedback, setActivationFeedback] = useState<Record<string, string>>({});
  const [activationActionId, setActivationActionId] = useState<string | null>(null);
  const [activationActionType, setActivationActionType] = useState<'ACCEPT' | 'DECLINE' | null>(null);
  const [footprintStats, setFootprintStats] = useState<FootprintStats | null>(null);
  const [deepLinkedCampaignId, setDeepLinkedCampaignId] = useState<string | null>(null);
  const activationsRef = useRef<HTMLDivElement | null>(null);
  const opportunitiesRef = useRef<HTMLDivElement | null>(null);
  const [stats, setStats] = useState({
    totalFunded: 0,
    activeBounties: 0,
    completedBounties: 0,
    daresForMe: 0,
  });

  const sessionData = session as SessionPlatformData | null;
  const sessionToken = sessionData?.token ?? null;
  const sessionWalletRaw = (session as { walletAddress?: string | null } | null)?.walletAddress;
  const sessionWallet = sessionWalletRaw?.toLowerCase() ?? null;
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
  const dashboardAvatarUrl = userTag?.pfpUrl || null;
  const dashboardIdentityInitial = (
    userTag?.tag ||
    (identityHandle ? `@${identityHandle}` : '') ||
    address ||
    'C'
  )
    .replace(/^@/, '')
    .charAt(0)
    .toUpperCase();

  // Format wallet address for display
  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const readStoredDareResponseAuth = (walletAddress: string, dareId: string): StoredDareResponseAuth | null => {
    if (typeof window === 'undefined') return null;

    try {
      const raw = window.sessionStorage.getItem(`basedare:dare-response:${dareId}`);
      if (!raw) return null;

      const parsed = JSON.parse(raw) as StoredDareResponseAuth;
      if (
        !parsed?.walletAddress ||
        !parsed?.issuedAt ||
        !parsed?.signature ||
        !parsed?.dareId ||
        parsed.walletAddress !== walletAddress ||
        parsed.dareId !== dareId
      ) {
        return null;
      }

      const issuedAtMs = Date.parse(parsed.issuedAt);
      if (!Number.isFinite(issuedAtMs) || Date.now() - issuedAtMs > DARE_RESPONSE_WINDOW_MS) {
        return null;
      }

      return parsed;
    } catch {
      return null;
    }
  };

  const persistDareResponseAuth = (payload: StoredDareResponseAuth) => {
    if (typeof window === 'undefined') return;
    window.sessionStorage.setItem(`basedare:dare-response:${payload.dareId}`, JSON.stringify(payload));
  };

  const getDareResponseAuthHeaders = async (dareId: string): Promise<Record<string, string>> => {
    const connectedWallet = address?.toLowerCase() ?? null;
    const headers: Record<string, string> = {};

    if (sessionToken) {
      headers.Authorization = `Bearer ${sessionToken}`;
    }

    if (!connectedWallet || (sessionWallet && sessionWallet === connectedWallet)) {
      return headers;
    }

    const cachedAuth = readStoredDareResponseAuth(connectedWallet, dareId);
    const issuedAt = cachedAuth?.issuedAt ?? new Date().toISOString();
    const signature =
      cachedAuth?.signature ??
      (await signMessageAsync({
        message: buildDareResponseMessage({
          walletAddress: connectedWallet,
          dareId,
          issuedAt,
        }),
      }));

    if (!cachedAuth) {
      persistDareResponseAuth({
        walletAddress: connectedWallet,
        dareId,
        issuedAt,
        signature: String(signature),
      });
    }

    headers['x-basedare-dare-wallet'] = connectedWallet;
    headers['x-basedare-dare-signature'] = String(signature);
    headers['x-basedare-dare-issued-at'] = issuedAt;

    return headers;
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
        setFootprintStats(null);
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
        const active = fundedData.filter((d: Dare) => d.status === 'PENDING' || d.status === DARE_STATUS_PENDING_ACCEPTANCE).length;
        const completed = fundedData.filter((d: Dare) => d.status === 'VERIFIED').length;
        const total = fundedData.reduce((sum: number, d: Dare) => sum + d.bounty, 0);

        setStats({
          totalFunded: total,
          activeBounties: active,
          completedBounties: completed,
          daresForMe: forMeData.length,
        });

        const footprintRes = await fetch(`/api/places/footprint?wallet=${encodeURIComponent(address)}`);
        if (footprintRes.ok) {
          const footprintPayload = await footprintRes.json();
          setFootprintStats(footprintPayload.data?.stats ?? null);
        } else {
          setFootprintStats(null);
        }

      } catch (error) {
        console.error('Failed to fetch dares:', error);
        setFootprintStats(null);
      } finally {
        setLoading(false);
      }
    };

    fetchDares();
  }, [address]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const params = new URLSearchParams(window.location.search);
    const campaignId = params.get('campaign');
    setDeepLinkedCampaignId(campaignId);
  }, []);

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

  useEffect(() => {
    if (!deepLinkedCampaignId || opportunitiesLoading || opportunities.length === 0) return;

    const matchingOpportunity = opportunities.find((opportunity) => opportunity.id === deepLinkedCampaignId);
    if (!matchingOpportunity) return;

    const frame = window.requestAnimationFrame(() => {
      opportunitiesRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [deepLinkedCampaignId, opportunities, opportunitiesLoading]);

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

  const handleActivationResponse = async (dare: Dare, action: 'ACCEPT' | 'DECLINE') => {
    if (!address) return;

    try {
      setActivationActionId(dare.id);
      setActivationActionType(action);
      setActivationFeedback((current) => ({ ...current, [dare.id]: '' }));

      const response = await fetch(`/api/dares/${dare.id}/respond`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(await getDareResponseAuthHeaders(dare.id)),
        },
        body: JSON.stringify({
          action,
          walletAddress: address,
        }),
      });
      const payload = await response.json();

      if (!payload.success) {
        throw new Error(payload.error || 'Failed to respond to dare');
      }

      setForMeDares((current) =>
        current.map((entry) =>
          entry.id === dare.id
            ? {
                ...entry,
                status: payload.data.status,
                claimedBy: payload.data.claimedBy,
                claimedAt: payload.data.claimedAt,
                updatedAt: new Date().toISOString(),
              }
            : entry
        )
      );

      setActivationFeedback((current) => ({
        ...current,
        [dare.id]: payload.data.message,
      }));
    } catch (error) {
      setActivationFeedback((current) => ({
        ...current,
        [dare.id]: error instanceof Error ? error.message : 'Failed to respond to dare',
      }));
    } finally {
      setActivationActionId(null);
      setActivationActionType(null);
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
      case DARE_STATUS_PENDING_ACCEPTANCE:
        return (
          <span className="px-3 py-1 text-xs font-bold uppercase tracking-wider bg-fuchsia-500/20 text-fuchsia-200 rounded-full border border-fuchsia-500/30 flex items-center gap-1">
            <Zap className="w-3 h-3" /> Waiting for response
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
      case DARE_STATUS_DECLINED:
        return (
          <span className="px-3 py-1 text-xs font-bold uppercase tracking-wider bg-red-500/20 text-red-300 rounded-full border border-red-500/30 flex items-center gap-1">
            <XCircle className="w-3 h-3" /> Declined
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

  const topOpportunities = React.useMemo(() => {
    if (!deepLinkedCampaignId) {
      return opportunities.slice(0, 3);
    }

    const matchingOpportunity = opportunities.find((opportunity) => opportunity.id === deepLinkedCampaignId);
    if (!matchingOpportunity) {
      return opportunities.slice(0, 3);
    }

    return [
      matchingOpportunity,
      ...opportunities.filter((opportunity) => opportunity.id !== deepLinkedCampaignId).slice(0, 2),
    ];
  }, [deepLinkedCampaignId, opportunities]);
  const creatorProfileHref = userTag?.tag ? `/creator/${encodeURIComponent(userTag.tag)}` : null;
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
  const primaryActivation = creatorClaims[0] || null;
  const primaryActivationState = primaryActivation ? getClaimLoopState(primaryActivation, address) : null;

  const jumpToActivation = (activationId?: string | null) => {
    setActivationsOpen(true);
    if (activationId) {
      setExpandedActivationId(activationId);
    }
    requestAnimationFrame(() => {
      activationsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

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
                      : 'Claim a handle first, then edit your public creator profile from your creator page.'
                    : 'Connect your wallet to enter the creator loop.'}
                </p>

                {isConnected && userTag ? (
                  <div className={`${insetCardClass} mt-4 flex items-center gap-3 px-4 py-3`}>
                    <div className="h-14 w-14 shrink-0 overflow-hidden rounded-full border border-white/10 bg-[linear-gradient(135deg,rgba(168,85,247,0.95),rgba(250,204,21,0.9))] shadow-[0_12px_24px_rgba(0,0,0,0.24)]">
                      {dashboardAvatarUrl ? (
                        <img
                          src={dashboardAvatarUrl}
                          alt={userTag.tag}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-lg font-black text-white">
                          {dashboardIdentityInitial}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-white">{userTag.tag}</div>
                      <div className="mt-1 text-xs text-white/55">
                        {userTag.bio || 'Add a short bio and profile photo so people know who you are.'}
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="flex flex-wrap gap-2">
                {isConnected ? (
                  <>
                    {creatorProfileHref ? (
                      <button
                        onClick={() => router.push(creatorProfileHref)}
                        className={volumetricButtonPurple}
                      >
                        <span className="inline-flex items-center gap-2">
                          <Settings2 className="h-4 w-4" />
                          Edit profile
                        </span>
                      </button>
                    ) : (
                      <button
                        onClick={() => router.push(claimTagHref)}
                        className={volumetricButtonPurple}
                      >
                        <span className="inline-flex items-center gap-2">
                          <Settings2 className="h-4 w-4" />
                          Claim handle
                        </span>
                      </button>
                    )}
                    {!hasVerifiedIdentity ? (
                      <button
                        onClick={() => router.push(claimTagHref)}
                        className={volumetricButtonNeutral}
                      >
                        <span className="inline-flex items-center gap-2">
                          <Settings2 className="h-4 w-4" />
                          {identityHandle ? 'Manage handle' : 'Verify handle'}
                        </span>
                      </button>
                    ) : null}
                    <CosmicButton href="/create" variant="gold" size="md" className="min-w-[176px]">
                      <Plus className="h-4 w-4" />
                      Create dare
                    </CosmicButton>
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

        {isConnected && primaryActivation && primaryActivationState ? (
          <div className={`${raisedTileClass} mb-6 overflow-hidden border-fuchsia-400/18 bg-[linear-gradient(145deg,rgba(38,20,68,0.96),rgba(14,14,24,0.98))] shadow-[0_20px_42px_rgba(0,0,0,0.34),0_0_24px_rgba(168,85,247,0.14),inset_0_1px_0_rgba(255,255,255,0.12),inset_0_-12px_18px_rgba(0,0,0,0.22)]`}>
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_15%,rgba(250,204,21,0.16),transparent_26%),radial-gradient(circle_at_88%_0%,rgba(168,85,247,0.18),transparent_32%)]" />
            <div className="relative flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <div className="min-w-0">
                <div className="inline-flex items-center gap-2 rounded-full border border-yellow-300/20 bg-yellow-400/[0.08] px-3 py-1 text-[11px] font-black uppercase tracking-[0.24em] text-yellow-100 shadow-[0_0_18px_rgba(250,204,21,0.12)]">
                  <Zap className="h-3.5 w-3.5 text-yellow-300" />
                  New Dare Incoming
                </div>
                <p className="mt-3 text-lg font-black text-white sm:text-xl">
                  {primaryActivation.title}
                </p>
                <p className="mt-1 text-sm text-white/62">
                  {primaryActivationState.label === 'Ready for Proof'
                    ? 'You have been picked for this activation. Open it and submit proof.'
                    : primaryActivationState.label === 'Respond Now'
                      ? 'You have been directly dared. Accept or decline so the state is crystal clear.'
                    : primaryActivationState.detail}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                <span className="rounded-full border border-fuchsia-300/18 bg-fuchsia-500/[0.08] px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-fuchsia-100">
                  {creatorClaims.length} live {creatorClaims.length === 1 ? 'activation' : 'activations'}
                </span>
                <CosmicButton
                  onClick={() => jumpToActivation(primaryActivation.id)}
                  variant={primaryActivationState.label === 'Ready for Proof' ? 'gold' : 'purple'}
                  size="md"
                  className="min-w-[178px]"
                >
                  <Zap className="h-4 w-4" />
                  {primaryActivationState.label === 'Ready for Proof'
                    ? 'Open & Submit Proof'
                    : primaryActivationState.label === 'Respond Now'
                      ? 'Review Dare'
                      : 'Open Activation'}
                </CosmicButton>
              </div>
            </div>
          </div>
        ) : null}

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
              urgent: isConnected && stats.daresForMe > 0,
            },
          ].map((item) => (
            <div
              key={item.label}
              className={`${metricTileClass} px-4 py-4 ${item.urgent ? 'border-fuchsia-400/20 shadow-[0_18px_34px_rgba(0,0,0,0.28),0_0_24px_rgba(168,85,247,0.14),inset_0_1px_0_rgba(255,255,255,0.1),inset_0_-12px_16px_rgba(0,0,0,0.22)]' : ''}`}
            >
              {item.urgent ? (
                <div className="mb-2 inline-flex items-center gap-1 rounded-full border border-yellow-300/20 bg-yellow-400/[0.08] px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.22em] text-yellow-100">
                  <Zap className="h-3 w-3 text-yellow-300" />
                  Live
                </div>
              ) : null}
              <div className="text-2xl font-black text-white sm:text-3xl">{item.value}</div>
              <div className="mt-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/45">{item.label}</div>
            </div>
          ))}
        </div>

        <div ref={activationsRef} className={`${softCardClass} mb-8 p-5 sm:p-6`}>
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-black uppercase tracking-[0.12em] text-white">What You&apos;ve Done To The Grid</h2>
              <p className="mt-1 text-sm text-white/52">
                Your verified place memory, first sparks, and venue footprint all in one surface.
              </p>
            </div>
            <button
              onClick={() => router.push('/map')}
              className={`${volumetricButtonPurple} px-3 py-2 text-[11px]`}
            >
              View your trace
            </button>
          </div>

          {!isConnected ? (
            <div className={`${insetCardClass} px-4 py-4 text-sm text-white/55`}>
              Connect wallet to see what you&apos;ve already written onto the grid.
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {[
                  { label: 'Memory Added', value: footprintStats?.totalMarks ?? 0, tone: 'text-cyan-200' },
                  { label: 'First Sparks', value: footprintStats?.firstMarks ?? 0, tone: 'text-[#f8dd72]' },
                  { label: 'Venues Marked', value: footprintStats?.uniqueVenues ?? 0, tone: 'text-fuchsia-200' },
                  {
                    label: 'Last Movement',
                    value: footprintStats?.lastMarkedAt ? formatStatusTimestamp(footprintStats.lastMarkedAt, '--') : '--',
                    tone: 'text-white',
                  },
                ].map((item) => (
                  <div key={item.label} className={`${metricTileClass} px-4 py-4`}>
                    <div className={`text-2xl font-black sm:text-3xl ${item.tone}`}>{item.value}</div>
                    <div className="mt-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/45">{item.label}</div>
                  </div>
                ))}
              </div>

              <div className={`${insetCardClass} mt-4 px-4 py-4`}>
                {footprintStats?.topVenue ? (
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/35">Strongest Venue History</p>
                      <p className="mt-2 text-lg font-black text-white">{footprintStats.topVenue.name}</p>
                      <p className="mt-1 text-sm text-white/52">
                        You&apos;ve left {footprintStats.topVenue.count} verified {footprintStats.topVenue.count === 1 ? 'mark' : 'marks'} here.
                        {footprintStats.topVenue.city ? ` ${footprintStats.topVenue.city}` : ''}
                        {footprintStats.topVenue.country ? `, ${footprintStats.topVenue.country}` : ''}
                      </p>
                    </div>
                    <button
                      onClick={() => router.push(`/map?place=${encodeURIComponent(footprintStats.topVenue?.slug ?? '')}&trace=1`)}
                      className={`${volumetricButtonNeutral} px-3 py-2 text-[11px]`}
                    >
                      Open on map
                    </button>
                  </div>
                ) : (
                  <p className="text-sm text-white/55">
                    No verified place memory yet. Tag a place or finish a venue activation and your footprint starts drawing itself.
                  </p>
                )}
              </div>
            </>
          )}
        </div>

        <div ref={opportunitiesRef} className={`${softCardClass} mb-8 p-5 sm:p-6`}>
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
                onClick={() => router.push(opportunitiesReason === 'CLAIM_TAG_REQUIRED' ? claimTagHref : (creatorProfileHref || claimTagHref))}
                className={volumetricButtonPurple}
              >
                {opportunitiesReason === 'CLAIM_TAG_REQUIRED' ? 'Claim handle' : 'Open creator page'}
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
                const isDeepLinkedOpportunity = opportunity.id === deepLinkedCampaignId;
                return (
                  <div
                    key={opportunity.id}
                    className={`${raisedTileClass} min-h-[220px] min-w-[280px] snap-start p-4 md:min-w-0 ${
                      isDeepLinkedOpportunity
                        ? 'ring-1 ring-fuchsia-300/45 shadow-[0_24px_42px_rgba(0,0,0,0.34),0_0_34px_rgba(217,70,239,0.14),inset_0_1px_0_rgba(255,255,255,0.12),inset_0_-14px_20px_rgba(0,0,0,0.26)]'
                        : ''
                    }`}
                  >
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
                    {isDeepLinkedOpportunity ? (
                      <div className="mt-3">
                        <span className="rounded-full border border-fuchsia-300/18 bg-fuchsia-500/[0.08] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-fuchsia-100">
                          Opened from alert
                        </span>
                      </div>
                    ) : null}
                    {opportunity.matchReasons.length > 0 ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {opportunity.assignedToCreator ? (
                          <span className="rounded-full border border-fuchsia-300/18 bg-fuchsia-500/[0.08] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-fuchsia-100">
                            Picked for this activation
                          </span>
                        ) : null}
                        <span className="rounded-full border border-cyan-300/18 bg-cyan-500/[0.08] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-100">
                          You match this
                        </span>
                        {opportunity.matchReasons.slice(0, 2).map((reason) => (
                          <span
                            key={`${opportunity.id}-${reason}`}
                            className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] text-white/48"
                          >
                            {reason}
                          </span>
                        ))}
                      </div>
                    ) : null}
                    {opportunity.affinity && (opportunity.affinity.venueMarks > 0 || opportunity.affinity.cityMarks > 0) ? (
                      <p className="mt-3 text-xs text-white/58">
                        {opportunity.affinity.venueMarks > 0
                          ? `You've left ${opportunity.affinity.venueMarks} verified ${opportunity.affinity.venueMarks === 1 ? 'mark' : 'marks'} here`
                          : `You've already left ${opportunity.affinity.cityMarks} verified ${opportunity.affinity.cityMarks === 1 ? 'mark' : 'marks'} in this city`}
                        {opportunity.affinity.firstMarksAtVenue > 0
                          ? ` • ${opportunity.affinity.firstMarksAtVenue} first ${opportunity.affinity.firstMarksAtVenue === 1 ? 'spark' : 'sparks'} here`
                          : ''}
                      </p>
                    ) : null}
                    {claimFeedback[opportunity.id] ? (
                      <p className="mt-3 text-xs text-green-300">{claimFeedback[opportunity.id]}</p>
                    ) : null}
                    <div className="mt-6 space-y-2">
                      {opportunity.claimable ? (
                        <>
                          <CosmicButton
                            onClick={() => handleClaimOpportunity(opportunity)}
                            disabled={claimingOpportunityId === opportunity.id}
                            variant="gold"
                            size="md"
                            fullWidth
                          >
                            {claimingOpportunityId === opportunity.id ? 'Claiming...' : 'Claim'}
                          </CosmicButton>
                          <button
                            onClick={() => router.push(opportunity.venue?.slug ? `/map?place=${encodeURIComponent(opportunity.venue.slug)}&source=creator&matches=1${opportunity.linkedDare?.shortId ? `&dare=${encodeURIComponent(opportunity.linkedDare.shortId)}` : ''}` : '/map?matches=1')}
                            className={`${volumetricButtonNeutral} w-full`}
                          >
                            View on map
                          </button>
                        </>
                      ) : (
                        <div className="space-y-2">
                          <button
                            onClick={() => router.push(href)}
                            className={`${volumetricButtonPurple} w-full`}
                          >
                            Open
                          </button>
                          <button
                            onClick={() => router.push(opportunity.venue?.slug ? `/map?place=${encodeURIComponent(opportunity.venue.slug)}&source=creator&matches=1${opportunity.linkedDare?.shortId ? `&dare=${encodeURIComponent(opportunity.linkedDare.shortId)}` : ''}` : '/map?matches=1')}
                            className={`${volumetricButtonNeutral} w-full`}
                          >
                            View on map
                          </button>
                        </div>
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
              className={`${sectionBarClass} flex min-h-[44px] flex-1 items-center justify-between gap-3 text-left`}
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
            <div className={`${insetWellClass} px-4 py-4 text-sm text-white/50`}>Collapsed</div>
          ) : !isConnected ? (
            <div className={`${insetWellClass} px-4 py-4 text-sm text-white/55`}>Connect wallet to track your activations.</div>
          ) : creatorClaims.length === 0 ? (
            <div className={`${insetWellClass} px-4 py-4 text-sm text-white/55`}>No activations yet.</div>
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
                  <div key={dare.id} className={`${raisedTileClass} overflow-hidden`}>
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
                        <CosmicButton
                          onClick={() => {
                            if (loopState.label === 'Ready for Proof' || loopState.label === 'Respond Now') {
                              setExpandedActivationId(dare.id);
                              return;
                            }
                            router.push(`/dare/${dare.shortId || dare.id}`);
                          }}
                          variant={loopState.label === 'Ready for Proof' ? 'gold' : 'purple'}
                          size="sm"
                          className="min-w-[128px]"
                        >
                          {loopState.label === 'Ready for Proof'
                            ? 'Submit proof'
                            : loopState.label === 'Respond Now'
                              ? 'Respond'
                              : 'Open'}
                        </CosmicButton>
                      </div>
                    </div>

                    {isExpanded ? (
                      <div className={`${insetWellClass} m-3 border border-white/8 px-4 py-4`}>
                        <p className="text-sm text-white/60">{loopState.detail}</p>
                        {activationFeedback[dare.id] ? (
                          <div className="mt-3 rounded-[16px] border border-green-400/18 bg-green-500/[0.07] px-3 py-3 text-sm text-green-200">
                            {activationFeedback[dare.id]}
                          </div>
                        ) : null}
                        {dare.moderatorNote && (dare.status === 'FAILED' || dare.status === 'PENDING_REVIEW') ? (
                          <div className="mt-3 rounded-[18px] border border-amber-300/16 bg-amber-500/[0.06] px-3 py-3">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-amber-200/80">Review Note</p>
                            <p className="mt-1 text-sm text-white/74">{dare.moderatorNote}</p>
                          </div>
                        ) : null}
                        {dare.status === DARE_STATUS_PENDING_ACCEPTANCE && loopState.label === 'Respond Now' ? (
                          <div className="mt-4 flex flex-wrap gap-2">
                            <button
                              onClick={() => handleActivationResponse(dare, 'ACCEPT')}
                              disabled={activationActionId === dare.id}
                              className={volumetricButtonPurple}
                            >
                              {activationActionId === dare.id && activationActionType === 'ACCEPT' ? 'Accepting...' : 'Accept'}
                            </button>
                            <button
                              onClick={() => handleActivationResponse(dare, 'DECLINE')}
                              disabled={activationActionId === dare.id}
                              className={volumetricButtonNeutral}
                            >
                              {activationActionId === dare.id && activationActionType === 'DECLINE' ? 'Declining...' : 'Decline'}
                            </button>
                            <button
                              onClick={() => router.push(`/dare/${dare.shortId || dare.id}`)}
                              className={volumetricButtonNeutral}
                            >
                              Open brief
                            </button>
                          </div>
                        ) : dare.status === 'PENDING' && loopState.label === 'Ready for Proof' ? (
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
              className={`${sectionBarClass} flex min-h-[44px] flex-1 items-center justify-between gap-3 text-left`}
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
            <div className={`${insetWellClass} px-4 py-4 text-sm text-white/50`}>Collapsed</div>
          ) : !isConnected ? (
            <div className={`${insetWellClass} px-4 py-4 text-sm text-white/55`}>Connect wallet to manage funded dares.</div>
          ) : loading ? (
            <div className={`${insetWellClass} flex items-center justify-center px-4 py-6 text-sm text-white/55`}>
              <Loader2 className="mr-3 h-5 w-5 animate-spin text-purple-300" />
              Loading funded dares
            </div>
          ) : fundedRows.length === 0 ? (
            <div className={`${insetWellClass} flex flex-wrap items-center gap-3 px-4 py-4`}>
              <span className="text-sm text-white/55">No funded dares yet.</span>
              <InitProtocolButton onClick={() => router.push('/create')} />
            </div>
          ) : (
            <div className="space-y-3">
              {fundedRows.map((dare) => {
                const isExpanded = expandedFundedDare?.id === dare.id;
                return (
                  <div key={dare.id} className={`${raisedTileClass} overflow-hidden`}>
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
                      <div className={`${insetWellClass} m-3 border border-white/8 px-4 py-4`}>
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
                          {dare.status === DARE_STATUS_PENDING_ACCEPTANCE ? (
                            <div className="rounded-[16px] border border-fuchsia-300/18 bg-fuchsia-500/[0.07] px-3 py-3 text-sm text-fuchsia-100">
                              Waiting for {dare.streamerHandle || 'the target'} to accept or decline.
                            </div>
                          ) : null}
                          <button
                            onClick={() => router.push(`/dare/${dare.shortId || dare.id}`)}
                            className={volumetricButtonPurple}
                          >
                            {dare.status === 'VERIFIED' || dare.status === 'PENDING_PAYOUT' ? 'Rate creator' : 'Open brief'}
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
          <summary className={`${sectionBarClass} m-3 flex min-h-[56px] cursor-pointer list-none items-center justify-between sm:px-6`}>
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
