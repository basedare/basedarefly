'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import {
  ArrowLeft, Share2, Clock, Heart, MessageCircle,
  ExternalLink, AlertCircle, Loader2, CheckCircle,
  ChevronDown, Send, Zap, LayoutDashboard, Star,
  Play, Users, Sparkles, MapPin,
} from 'lucide-react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useSignMessage } from 'wagmi';
import { parseUnits } from 'viem';
import { formatDistanceToNow } from 'date-fns';
import LiquidBackground from '@/components/LiquidBackground';
import SafetyWaiver from '@/components/SafetyWaiver';
import DareVisual from '@/components/DareVisual';
import DareStatusTimeline from '@/components/DareStatusTimeline';
import SentinelBadge from '@/components/SentinelBadge';
import CosmicButton from '@/components/ui/CosmicButton';
import { BOUNTY_CONTRACT_ADDRESS as CONTRACT_ADDR, CONTRACT_VALIDATION, USDC_ADDRESS } from '@/lib/contracts';
import { getDareLifecycleModel } from '@/lib/dare-lifecycle';
import { formatCommunitySparkPlayRadius } from '@/lib/community-spark-map-policy';
import { buildXSharePayload } from '@/lib/social-share';
import { buildCreatorReviewMessage } from '@/lib/creator-review-auth';
import { buildWalletActionAuthHeaders } from '@/lib/wallet-action-auth';
import { MissionPassSheet } from '@/components/mission-pass/MissionPassSheet';
import { useSocialWebview } from '@/components/mission-pass/SocialWebviewProvider';
import { parseOutcomeContractSnapshot, type ReportedOutcome } from '@/lib/outcome-contracts';

// ── ABI stubs ──────────────────────────────────────────────────────────────
const USDC_ABI = [
  {
    name: 'approve', type: 'function', stateMutability: 'nonpayable',
    inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }],
    outputs: [{ name: '', type: 'bool' }]
  },
] as const;

const BASEDARE_ABI = [
  {
    name: 'fundBounty', type: 'function', stateMutability: 'nonpayable',
    inputs: [{ name: 'dareId', type: 'bytes32' }, { name: 'amount', type: 'uint256' }],
    outputs: []
  },
] as const;

// ── Types ──────────────────────────────────────────────────────────────────
interface DareDetail {
  id: string; shortId: string; title: string; bounty: number; upvoteCount: number;
  missionTag?: string | null; isCommunitySpark?: boolean | null;
  streamerHandle: string | null; status: string; expiresAt: string | null;
  videoUrl: string | null; imageUrl?: string | null; inviteToken: string | null; claimDeadline: string | null;
  targetWalletAddress: string | null; awaitingClaim: boolean; updatedAt?: string | null;
  createdAt?: string | null; claimedBy?: string | null; claimedAt?: string | null;
  verifiedAt?: string | null; moderatedAt?: string | null;
  claimRequestWallet: string | null; claimRequestTag: string | null;
  claimRequestedAt: string | null; claimRequestStatus: string | null;
  requireSentinel?: boolean | null;
  sentinelVerified?: boolean | null;
  stakerAddress?: string | null;
  outcomeContractSnapshot?: unknown;
  reportedOutcome?: unknown;
  evidenceDecision?: string | null;
  communitySparkPlay?: {
    title: string;
    hook: string;
    instructions: string;
    capturePrompt: string;
    socialPrompt: string;
    safety: string;
    estimatedMinutes: number;
    crew: string;
    version: number;
    isCurrentVersion: boolean;
  } | null;
  communitySparkPlayRadiusKm?: number | null;
}

type CommunityPlayAccessState = {
  status: 'idle' | 'checking' | 'ready' | 'blocked' | 'error';
  message: string | null;
  location: { latitude: number; longitude: number } | null;
};

interface Comment {
  id: string; walletAddress: string; displayName: string;
  body: string; createdAt: string;
}

interface CreatorReview {
  id: string;
  rating: number;
  review: string | null;
  createdAt: string;
  reviewerWallet: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────
function getTimerColor(expiresAt: string | null): string {
  if (!expiresAt) return 'text-gray-400';
  const diff = new Date(expiresAt).getTime() - Date.now();
  const days = diff / (1000 * 60 * 60 * 24);
  if (diff <= 0) return 'text-gray-500';
  if (days < 1) return 'text-red-400';
  if (days < 3) return 'text-orange-400';
  return 'text-green-400';
}

function formatCountdown(expiresAt: string | null): string {
  if (!expiresAt) return 'No expiry';
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return 'EXPIRED';
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  if (h > 48) return formatDistanceToNow(new Date(expiresAt), { addSuffix: true });
  if (h > 0) return `${h}h ${m}m left`;
  if (m > 0) return `${m}m ${s}s left`;
  return `${s}s left`;
}

function formatStatusMoment(value: string | null | undefined) {
  if (!value) return null;
  try {
    return new Date(value).toLocaleString('en-AU', {
      day: 'numeric',
      month: 'short',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return null;
  }
}

function requestCommunitySparkLocation() {
  return new Promise<{ latitude: number; longitude: number }>((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      reject(new Error('Location is not available in this browser.'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => resolve({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      }),
      () => reject(new Error('Share location when you are near the place to unlock Play.')),
      {
        enableHighAccuracy: true,
        timeout: 12_000,
        maximumAge: 30_000,
      },
    );
  });
}

// ── Skeleton ───────────────────────────────────────────────────────────────
function DareSkeleton() {
  return (
    <div className="animate-pulse space-y-6 p-6 max-w-3xl mx-auto pt-24">
      <div className="h-48 bg-white/5 rounded-2xl" />
      <div className="h-8 bg-white/5 rounded-xl w-3/4" />
      <div className="h-5 bg-white/5 rounded-xl w-1/2" />
      <div className="flex gap-3">
        {[1, 2, 3].map(i => <div key={i} className="h-8 bg-white/5 rounded-full w-24" />)}
      </div>
      <div className="space-y-3">
        {[1, 2, 3].map(i => <div key={i} className="h-16 bg-white/5 rounded-xl" />)}
      </div>
    </div>
  );
}

// ── Comment item ───────────────────────────────────────────────────────────
function CommentItem({ comment }: { comment: Comment }) {
  return (
    <div className="flex gap-3 py-4 border-b border-white/[0.06] last:border-0">
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-600 to-yellow-500 flex-shrink-0 flex items-center justify-center text-xs font-black text-white">
        {comment.displayName.slice(0, 1).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-bold text-white/80">{comment.displayName}</span>
          <span className="text-[10px] text-white/30 font-mono">
            {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
          </span>
        </div>
        <p className="text-sm text-white/70 leading-relaxed break-words">{comment.body}</p>
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────
export default function DareDetailPage() {
  const params = useParams();
  const router = useRouter();
  const shortId = params.shortId as string;
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const { data: session } = useSession();
  const sessionToken = (session as { token?: string | null } | null)?.token ?? null;
  const sessionWallet =
    (session as { walletAddress?: string | null; user?: { walletAddress?: string | null } | null } | null)?.walletAddress?.toLowerCase() ??
    (session as { walletAddress?: string | null; user?: { walletAddress?: string | null } | null } | null)?.user?.walletAddress?.toLowerCase() ??
    null;

  // Dare state
  const [dare, setDare] = useState<DareDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState('');
  const [upvoteLoading, setUpvoteLoading] = useState(false);
  const [upvoteError, setUpvoteError] = useState<string | null>(null);

  // Action bar state
  const [addAmount, setAddAmount] = useState('5');
  const [showAddInput, setShowAddInput] = useState(false);
  const [txError, setTxError] = useState<string | null>(null);

  // Comments state
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [commentBody, setCommentBody] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);
  const commentsRef = useRef<HTMLDivElement>(null);
  const communityJoinRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLDivElement>(null);
  const [creatorReview, setCreatorReview] = useState<CreatorReview | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewBody, setReviewBody] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);

  // Claim state (preserved)
  const [claimLoading, setClaimLoading] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);
  const [claimSuccess, setClaimSuccess] = useState(false);
  const [claimWaiverAccepted, setClaimWaiverAccepted] = useState(false);
  const [communityPlayAccess, setCommunityPlayAccess] = useState<CommunityPlayAccessState>({
    status: 'idle',
    message: null,
    location: null,
  });
  const [showMissionPass, setShowMissionPass] = useState(false);
  const { isSocialWebview, label: socialWebviewLabel } = useSocialWebview();

  useEffect(() => {
    setCommunityPlayAccess({ status: 'idle', message: null, location: null });
  }, [shortId]);

  // Wagmi tx hooks
  const { writeContract: writeApprove, data: approveHash, isPending: approvePending } = useWriteContract();
  const { isSuccess: approveConfirmed } = useWaitForTransactionReceipt({ hash: approveHash });
  const { writeContract: writeFund, data: fundHash, isPending: fundPending } = useWriteContract();
  const { isSuccess: fundConfirmed } = useWaitForTransactionReceipt({ hash: fundHash });

  // ── Fetch dare ─────────────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/dare/${shortId}`);
        if (!res.ok) {
          setError(res.status === 404 ? 'Bounty not found' : 'Failed to load bounty');
          return;
        }
        const data = await res.json();
        const normalizedDare: DareDetail = {
          ...data,
          bounty: typeof data.bounty === 'number' ? data.bounty : Number(data.bounty ?? 0),
          upvoteCount:
            typeof data.upvoteCount === 'number'
              ? data.upvoteCount
              : Number(data.upvoteCount ?? 0),
        };
        setDare(normalizedDare);
      } catch {
        setError('Failed to load bounty');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [shortId]);

  // Live countdown
  useEffect(() => {
    if (!dare?.expiresAt) return;
    setCountdown(formatCountdown(dare.expiresAt));
    const id = setInterval(() => setCountdown(formatCountdown(dare.expiresAt)), 1000);
    return () => clearInterval(id);
  }, [dare?.expiresAt]);

  // ── Load comments ──────────────────────────────────────────────────────
  const loadComments = useCallback(async (cursor?: string) => {
    if (!dare) return;
    setCommentsLoading(true);
    try {
      const url = `/api/dares/${dare.id}/comments${cursor ? `?cursor=${cursor}` : ''}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setComments(prev => cursor ? [...prev, ...data.data.comments] : data.data.comments);
        setNextCursor(data.data.nextCursor);
      }
    } catch { /* silent */ }
    finally { setCommentsLoading(false); }
  }, [dare]);

  useEffect(() => { if (dare) loadComments(); }, [dare, loadComments]);

  useEffect(() => {
    if (!dare?.id) return;

    let cancelled = false;
    const loadReview = async () => {
      try {
        const res = await fetch(`/api/dares/${dare.id}/review`, { cache: 'no-store' });
        const data = await res.json();
        if (!cancelled && res.ok && data.success) {
          setCreatorReview(data.data);
        }
      } catch {
        if (!cancelled) {
          setCreatorReview(null);
        }
      }
    };

    void loadReview();
    return () => {
      cancelled = true;
    };
  }, [dare?.id]);

  // ── Submit comment ─────────────────────────────────────────────────────
  const submitComment = async () => {
    if (!commentBody.trim() || !dare || !isConnected || !address) return;
    setSubmittingComment(true);
    setCommentError(null);
    try {
      const authHeaders = await buildWalletActionAuthHeaders({
        walletAddress: address,
        sessionToken,
        sessionWallet,
        action: 'dare:comment',
        resource: dare.id,
        signMessageAsync,
      });
      const res = await fetch(`/api/dares/${dare.id}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
        body: JSON.stringify({
          walletAddress: address,
          body: commentBody.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setComments(prev => [data.data, ...prev]);
        setCommentBody('');
      } else {
        setCommentError(data.error || 'Failed to post comment');
      }
    } catch {
      setCommentError('Network error posting comment');
    } finally { setSubmittingComment(false); }
  };

  const submitCreatorReview = async () => {
    if (!dare || !address || !isConnected || reviewSubmitting) return;

    setReviewSubmitting(true);
    setReviewError(null);
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (sessionToken) {
        headers.Authorization = `Bearer ${sessionToken}`;
      } else {
        const issuedAt = new Date().toISOString();
        const message = buildCreatorReviewMessage({
          walletAddress: address,
          dareId: dare.id,
          issuedAt,
        });
        const signature = await signMessageAsync({ message });
        headers['x-basedare-review-wallet'] = address;
        headers['x-basedare-review-issued-at'] = issuedAt;
        headers['x-basedare-review-signature'] = String(signature);
      }

      const res = await fetch(`/api/dares/${dare.id}/review`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          rating: reviewRating,
          review: reviewBody.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to submit review');
      }
      setCreatorReview(data.data);
      setReviewBody('');
    } catch (err: unknown) {
      setReviewError(err instanceof Error ? err.message : 'Failed to submit review');
    } finally {
      setReviewSubmitting(false);
    }
  };

  // ── Upvote (persisted) ────────────────────────────────────────────────
  const handleUpvote = async () => {
    if (!dare) return;
    if (!isConnected || !address) {
      setUpvoteError('Connect your wallet to upvote');
      return;
    }

    setUpvoteLoading(true);
    setUpvoteError(null);
    try {
      const authHeaders = await buildWalletActionAuthHeaders({
        walletAddress: address,
        sessionToken,
        sessionWallet,
        action: 'dare:upvote',
        resource: dare.id,
        signMessageAsync,
      });
      const res = await fetch(`/api/dares/${dare.id}/upvote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({ walletAddress: address }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to upvote');
      }
      const nextUpvoteCount = Number(data?.data?.upvoteCount ?? 0);
      setDare((prev) =>
        prev
          ? {
              ...prev,
              upvoteCount: Number.isFinite(nextUpvoteCount) ? nextUpvoteCount : prev.upvoteCount,
            }
          : prev
      );
    } catch (err: unknown) {
      setUpvoteError(err instanceof Error ? err.message : 'Failed to upvote');
    } finally {
      setUpvoteLoading(false);
    }
  };

  // ── Share link (prefer X on desktop, native share on mobile) ──────────
  const handleShare = useCallback(async () => {
    const url = `${window.location.origin}/dare/${shortId}`;
    const title = dare?.title || 'BaseDare Bounty';
    const payload = buildXSharePayload({
      title,
      bounty: dare?.bounty,
      streamerTag: dare?.streamerHandle,
      shortId,
      status: dare?.status?.toUpperCase() === 'VERIFIED' ? 'verified' : 'live',
    });
    const isMobileShareSurface =
      typeof navigator !== 'undefined' &&
      /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);

    try {
      if (navigator.share && isMobileShareSurface) {
        await navigator.share({
          title,
          text: payload.text,
          url,
        });
        setShareFeedback('Shared');
      } else if (navigator.clipboard?.writeText) {
        const composer = window.open(payload.url, '_blank', 'noopener,noreferrer,width=700,height=620');
        if (composer) {
          setShareFeedback('Opened X');
        } else {
          await navigator.clipboard.writeText(url);
          setShareFeedback('Link copied');
        }
      } else {
        setShareFeedback('Share unavailable');
      }
    } catch {
      try {
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(url);
          setShareFeedback('Link copied');
          return;
        }
      } catch {
        // noop
      }
      setShareFeedback('Share failed. Copy URL from address bar.');
    } finally {
      setTimeout(() => setShareFeedback(null), 2200);
    }
  }, [dare?.bounty, dare?.status, dare?.streamerHandle, dare?.title, shortId]);

  const isOnchainContractsReady = CONTRACT_VALIDATION.coreValid;
  const onchainConfigError = CONTRACT_VALIDATION.errors.join(' ');

  // ── Add to Pool tx ─────────────────────────────────────────────────────
  const handleAddToPool = async () => {
    if (!dare || !isConnected) return;
    if (!isOnchainContractsReady) {
      setTxError(onchainConfigError || 'Contract configuration missing. Add pool is temporarily unavailable.');
      return;
    }
    setTxError(null);
    const amountUnits = parseUnits(addAmount || '5', 6);
    try {
      writeApprove({
        address: USDC_ADDRESS,
        abi: USDC_ABI,
        functionName: 'approve',
        args: [CONTRACT_ADDR, amountUnits],
      });
    } catch (err: unknown) {
      setTxError(err instanceof Error ? err.message : 'Approval failed');
    }
  };

  // After approve confirmed → fund
  useEffect(() => {
    if (!approveConfirmed || !dare || !isOnchainContractsReady) return;
    const amountUnits = parseUnits(addAmount || '5', 6);
    const dareIdBytes = `0x${dare.id.replace(/-/g, '').padEnd(64, '0')}` as `0x${string}`;
    try {
      writeFund({
        address: CONTRACT_ADDR,
        abi: BASEDARE_ABI,
        functionName: 'fundBounty',
        args: [dareIdBytes, amountUnits],
      });
    } catch (err: unknown) {
      setTxError(err instanceof Error ? err.message : 'Fund tx failed');
    }
  }, [addAmount, approveConfirmed, dare, isOnchainContractsReady, writeFund]);

  // ── Claim (preserved) ──────────────────────────────────────────────────
  const handleClaimRequest = useCallback(async () => {
    if (!dare || !address) return;
    setClaimLoading(true); setClaimError(null);
    try {
      const authHeaders = await buildWalletActionAuthHeaders({
        walletAddress: address,
        sessionToken,
        sessionWallet,
        action: 'dare:claim',
        resource: dare.id,
        signMessageAsync,
      });
      const res = await fetch(`/api/dares/${dare.id}/claim`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
        body: JSON.stringify({
          walletAddress: address,
          ...(communityPlayAccess.location ?? {}),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setClaimSuccess(true);
        setDare(prev => prev ? {
          ...prev,
          claimRequestWallet: address.toLowerCase(),
          claimRequestStatus: 'PENDING',
        } : null);
      } else { setClaimError(data.error || 'Claim request failed'); }
    } catch { setClaimError('Network error'); }
    finally { setClaimLoading(false); }
  }, [
    dare,
    address,
    sessionToken,
    sessionWallet,
    signMessageAsync,
    communityPlayAccess.location,
  ]);

  const isUserInvolved = dare && address &&
    (address.toLowerCase() === dare.stakerAddress?.toLowerCase() ||
      address.toLowerCase() === dare.targetWalletAddress?.toLowerCase());
  const canReviewCreator = Boolean(
    dare &&
    address &&
    dare.stakerAddress &&
    address.toLowerCase() === dare.stakerAddress.toLowerCase() &&
    ['VERIFIED', 'PENDING_PAYOUT'].includes(dare.status?.toUpperCase()) &&
    !creatorReview
  );

  const safeBountyAmount = Number.isFinite(dare?.bounty) ? (dare?.bounty ?? 0) : 0;
  const isCommunitySpark = Boolean(dare?.isCommunitySpark || (safeBountyAmount <= 0 && dare?.missionTag === 'community'));
  const lifecycle = dare ? getDareLifecycleModel({ ...dare, isCommunitySpark }) : null;
  const sc = lifecycle
    ? {
        label: lifecycle.currentStatusLabel.toUpperCase(),
        cls: lifecycle.statusTone,
      }
    : null;
  const isExpired = dare?.status?.toUpperCase() === 'EXPIRED' || dare?.status?.toUpperCase() === 'FAILED';
  const timerColor = getTimerColor(dare?.expiresAt ?? null);
  const safeUpvoteCount = Number.isFinite(dare?.upvoteCount) ? (dare?.upvoteCount ?? 0) : 0;
  const lifecycleMoments = dare
    ? [
        { label: 'Created', value: dare.createdAt ?? null },
        { label: 'Claim requested', value: dare.claimRequestedAt ?? null },
        { label: 'Claimed', value: dare.claimedAt ?? null },
        { label: 'Reviewed', value: dare.moderatedAt ?? null },
        {
          label:
            dare.status?.toUpperCase() === 'VERIFIED' || dare.status?.toUpperCase() === 'PAID'
              ? isCommunitySpark ? 'Completed' : 'Paid'
              : dare.status?.toUpperCase() === 'PENDING_PAYOUT'
                ? 'Approved'
                : 'Updated',
          value:
            dare.verifiedAt ??
            (['PENDING_REVIEW', 'PENDING_PAYOUT'].includes(dare.status?.toUpperCase())
              ? dare.updatedAt ?? null
              : null),
        },
      ].filter((moment) => Boolean(moment.value))
    : [];
  const trustPanel = (() => {
    if (!dare) return null;
    const status = dare.status?.toUpperCase();

    if (status === 'PENDING_REVIEW') {
      if (isCommunitySpark) {
        return {
          title: 'Moment in review',
          tone: 'border-yellow-500/20 bg-yellow-500/[0.08] text-yellow-100',
          bullets: [
            dare.updatedAt
              ? `Moment received ${formatDistanceToNow(new Date(dare.updatedAt), { addSuffix: true })}.`
              : 'Your moment has been received.',
            'BaseDare is checking that the Spark stayed safe and matched the activity.',
            'There is nothing else to do right now.',
          ],
        };
      }
      return {
        title: 'Review in progress',
        tone: 'border-yellow-500/20 bg-yellow-500/[0.08] text-yellow-100',
        bullets: [
          dare.updatedAt
            ? `Proof received ${formatDistanceToNow(new Date(dare.updatedAt), { addSuffix: true })}.`
            : 'Proof has been received.',
          'Human review usually lands within 4 hours.',
          dare.requireSentinel
            ? 'Sentinel-required proofs may take a little longer because they include manual verification.'
            : 'No extra action is needed from the creator right now.',
        ],
      };
    }

    if (status === 'PENDING_PAYOUT') {
      if (isCommunitySpark) {
        return {
          title: 'Receipt closing',
          tone: 'border-amber-500/20 bg-amber-500/[0.08] text-amber-100',
          bullets: [
            'The moment was accepted.',
            'BaseDare is closing the Spark receipt and adding the completion to community memory.',
            'This free Spark has no cash reward or payout step.',
          ],
        };
      }
      return {
        title: 'Approved, payout queued',
        tone: 'border-amber-500/20 bg-amber-500/[0.08] text-amber-100',
        bullets: [
          dare.moderatedAt || dare.verifiedAt
            ? `Approval logged ${formatDistanceToNow(new Date(dare.verifiedAt ?? dare.moderatedAt ?? dare.updatedAt ?? dare.createdAt ?? new Date().toISOString()), { addSuffix: true })}.`
            : 'Approval is logged on the system.',
          'Settlement is processing on Base L2.',
          'Funds are still reserved in escrow while the payout worker clears the queue.',
        ],
      };
    }

    if (['VERIFIED', 'PAID', 'COMPLETED'].includes(status)) {
      if (isCommunitySpark) {
        return {
          title: 'Spark played',
          tone: 'border-emerald-500/20 bg-emerald-500/[0.08] text-emerald-100',
          bullets: [
            dare.verifiedAt
              ? `Moment accepted ${formatDistanceToNow(new Date(dare.verifiedAt), { addSuffix: true })}.`
              : 'This Spark has a completed moment.',
            'The receipt now adds a small piece of memory to this place.',
            'Cheer it on or share the Spark with the next person.',
          ],
        };
      }
      return {
        title: 'Completed and settled',
        tone: 'border-emerald-500/20 bg-emerald-500/[0.08] text-emerald-100',
        bullets: [
          dare.verifiedAt
            ? `Completion logged ${formatDistanceToNow(new Date(dare.verifiedAt), { addSuffix: true })}.`
            : 'This dare has been completed.',
          'Payout has been sent from escrow.',
          'If you funded this mission, you can leave a simple creator review below.',
        ],
      };
    }

    if (status === 'PENDING_ACCEPTANCE' || status === 'AWAITING_CLAIM') {
      if (isCommunitySpark) {
        return {
          title: 'Getting a player ready',
          tone: 'border-fuchsia-500/20 bg-fuchsia-500/[0.08] text-fuchsia-100',
          bullets: [
            'This Spark is waiting for someone to join it.',
            'Once joined, the player can do the activity and capture the fun part.',
            'The close is a community receipt, not a cash payout.',
          ],
        };
      }
      return {
        title: 'Waiting on the creator side',
        tone: 'border-fuchsia-500/20 bg-fuchsia-500/[0.08] text-fuchsia-100',
        bullets: [
          status === 'PENDING_ACCEPTANCE'
            ? 'The targeted creator still needs to accept or decline this dare.'
            : 'This dare is waiting for a creator to claim it or finish setting up the target identity.',
          dare.claimDeadline
            ? `If nobody takes it by ${formatStatusMoment(dare.claimDeadline)}, it can be refunded.`
            : 'Once claimed, the creator can move straight into proof submission.',
          'No proof or payout activity starts until the brief is accepted or claimed.',
        ],
      };
    }

    return null;
  })();
  const showTrustPanel = Boolean(
    trustPanel &&
    (!isCommunitySpark ||
      !['PENDING_ACCEPTANCE', 'AWAITING_CLAIM'].includes(dare?.status?.toUpperCase() ?? '')),
  );
  const outcomeContract = parseOutcomeContractSnapshot(dare?.outcomeContractSnapshot);
  const reportedOutcome = dare?.reportedOutcome && typeof dare.reportedOutcome === 'object'
    ? (dare.reportedOutcome as Partial<ReportedOutcome>)
    : null;
  const communitySparkBrief = dare && isCommunitySpark
    ? dare.communitySparkPlay ?? {
        title: dare.title.split('—')[0]?.trim() || 'Play this Spark',
        hook: 'Try it your way. Save the best moment. Pass it on.',
        instructions: 'Do the challenge in your own safe style.',
        capturePrompt: 'Save the best 5–15 seconds.',
        socialPrompt: 'Tag the friend who should try next.',
        safety: 'Stay within your ability, follow local rules, and stop if it feels unsafe.',
        estimatedMinutes: 15,
        crew: 'Solo or with friends',
        version: 1,
        isCurrentVersion: false,
      }
    : null;
  const communityActionLabel = dare?.videoUrl
    ? 'Watch the moment'
    : dare?.awaitingClaim && !dare.targetWalletAddress && !dare.claimRequestWallet
      ? communityPlayAccess.status === 'blocked'
        ? 'Move closer to play'
        : communityPlayAccess.status === 'error'
          ? 'Check location to play'
          : 'Play this Spark'
      : 'Share this Spark';
  const communitySparkPlayRadiusLabel =
    isCommunitySpark &&
    typeof dare?.communitySparkPlayRadiusKm === 'number' &&
    dare.communitySparkPlayRadiusKm > 0
      ? formatCommunitySparkPlayRadius(dare.communitySparkPlayRadiusKm)
      : null;
  const checkCommunitySparkPlayAccess = async () => {
    if (!dare) return false;

    setCommunityPlayAccess({ status: 'checking', message: 'Checking the play zone…', location: null });
    try {
      const location = await requestCommunitySparkLocation();
      const url = new URL(`/api/dare/${encodeURIComponent(dare.shortId)}/play-access`, window.location.origin);
      url.searchParams.set('lat', String(location.latitude));
      url.searchParams.set('lng', String(location.longitude));
      const response = await fetch(url.toString(), { cache: 'no-store' });
      const payload = await response.json();

      if (!response.ok || !payload.success) {
        throw new Error(payload.error || 'Unable to check the play zone.');
      }
      if (payload.data?.isPlayableHere !== true) {
        setCommunityPlayAccess({
          status: 'blocked',
          message: `You are ${payload.data?.distanceDisplay ?? 'outside the play zone'}. Get within ${payload.data?.playRadiusLabel ?? 'the marked radius'} to unlock Play.`,
          location: null,
        });
        return false;
      }

      setCommunityPlayAccess({
        status: 'ready',
        message: `You’re inside the ${payload.data.playRadiusLabel} play zone.`,
        location,
      });
      return true;
    } catch (playError) {
      setCommunityPlayAccess({
        status: 'error',
        message: playError instanceof Error
          ? playError.message
          : 'Share location when you are near the place to unlock Play.',
        location: null,
      });
      return false;
    }
  };
  const handleCommunitySparkAction = async () => {
    if (!dare) return;
    if (dare.videoUrl) {
      videoRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    if (dare.awaitingClaim && !dare.targetWalletAddress && !dare.claimRequestWallet) {
      const canPlay = communityPlayAccess.status === 'ready' || await checkCommunitySparkPlayAccess();
      if (!canPlay) return;
      communityJoinRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    void handleShare();
  };

  // ── Render ─────────────────────────────────────────────────────────────
  if (loading) return (
    <main className="min-h-screen bg-black">
      <LiquidBackground />
      <DareSkeleton />
    </main>
  );

  if (error || !dare) return (
    <main className="min-h-screen bg-black flex flex-col items-center justify-center gap-6 px-6">
      <LiquidBackground />
      <div className="relative z-10 text-center">
        <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
        <h1 className="text-2xl font-black text-white mb-2">{error || 'Not Found'}</h1>
        <p className="text-gray-400 mb-6">This bounty doesn&apos;t exist or has been removed.</p>
        <button onClick={() => router.push('/')} className="px-6 py-3 bg-white/10 border border-white/20 text-white font-bold rounded-xl hover:bg-white/20 transition-colors">
          ← Back to Bounties
        </button>
      </div>
    </main>
  );

  return (
    <main className="min-h-screen overflow-x-hidden bg-transparent pb-[calc(7rem+env(safe-area-inset-bottom))] text-white md:pb-16">
      <LiquidBackground />
      <div className="fixed bottom-0 left-0 right-0 z-[2] hidden h-44 pointer-events-none bg-gradient-to-t from-[#05060f]/90 via-[#05060f]/45 to-transparent backdrop-blur-[6px] md:block" />

      {/* ── HERO ── */}
      <div className="relative w-full px-4 pt-4 md:px-8 md:pt-6">
        <div className="max-w-3xl mx-auto mb-3 flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[rgba(13,16,35,0.45)] border border-white/[0.12] text-white/70 text-xs font-bold hover:text-white hover:bg-[rgba(13,16,35,0.62)] transition-colors backdrop-blur-xl"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back
          </button>
          <div className="flex items-center gap-2">
            {isUserInvolved && (
              <Link href="/dashboard" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-500/20 border border-purple-500/35 text-purple-300 text-xs font-bold hover:bg-purple-500/30 transition-colors backdrop-blur-xl">
                <LayoutDashboard className="w-3 h-3" />
                Dashboard
              </Link>
            )}
            <button
              onClick={handleShare}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[rgba(13,16,35,0.45)] border border-white/[0.12] text-white/70 text-xs font-bold hover:text-white hover:bg-[rgba(13,16,35,0.62)] transition-colors backdrop-blur-xl"
            >
              <Share2 className="w-3 h-3" />
              Share
            </button>
          </div>
        </div>
        {shareFeedback && (
          <div className="max-w-3xl mx-auto mb-3 text-right">
            <span className="inline-flex px-2.5 py-1 rounded-md bg-[rgba(13,16,35,0.55)] border border-white/[0.12] text-[11px] text-white/75 backdrop-blur-xl">
              {shareFeedback}
            </span>
          </div>
        )}

        <div className={`relative mx-auto max-w-3xl overflow-hidden rounded-[28px] border border-white/[0.12] bg-[rgba(13,16,35,0.20)] shadow-[0_12px_45px_rgba(5,8,24,0.45)] backdrop-blur-xl md:backdrop-blur-2xl ${isCommunitySpark ? 'min-h-[225px] md:min-h-[300px]' : 'min-h-[250px] md:min-h-[400px]'}`}>
          <div className="absolute inset-0">
            <DareVisual
              imageUrl={dare.imageUrl}
              streamerName={dare.streamerHandle || ''}
              type={isCommunitySpark ? 'community' : dare.streamerHandle ? 'streamer' : 'open'}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-[rgba(10,12,26,0.14)] via-[rgba(10,12,26,0.09)] to-[rgba(10,12,26,0.06)]" />
          </div>
          <div className={`relative z-10 flex h-full flex-col justify-end px-5 pb-6 md:px-8 md:pb-8 ${isCommunitySpark ? 'min-h-[225px] md:min-h-[300px]' : 'min-h-[250px] md:min-h-[400px]'}`}>
            {/* Status + timer badges */}
            <div className="flex flex-wrap items-center gap-2 mb-4">
              {sc && (
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black border ${sc.cls}`}>
                  {sc.label === 'LIVE' && <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />}
                  {sc.label}
                </span>
              )}
              {dare.expiresAt && (
                <span className={`flex items-center gap-1.5 text-xs font-mono font-bold ${timerColor}`}>
                  <Clock className="w-3.5 h-3.5" />
                  {countdown}
                </span>
              )}
              {!isCommunitySpark ? (
                <span className="flex items-center gap-1.5 text-xs font-mono text-white/40">
                  <MessageCircle className="w-3.5 h-3.5" />
                  {comments.length} comments
                </span>
              ) : null}
            </div>

            {/* Title */}
            <h1 className="mb-4 text-2xl font-black italic uppercase leading-tight tracking-tight text-[#f8dd72] drop-shadow-[0_4px_22px_rgba(0,0,0,0.78)] md:text-5xl">
              {communitySparkBrief?.title ?? dare.title}
            </h1>

            <SentinelBadge
              requireSentinel={dare.requireSentinel}
              sentinelVerified={dare.sentinelVerified}
              className="mb-4 w-fit"
            />

            {/* Dared by row */}
            {dare.streamerHandle && (
              <Link
                href={`/creator/${dare.streamerHandle.replace('@', '')}`}
                className="inline-flex items-center gap-2 group w-fit"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-400 to-purple-600 flex items-center justify-center text-xs font-black text-black flex-shrink-0">
                  {dare.streamerHandle.replace('@', '').slice(0, 1).toUpperCase()}
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] text-white/30 uppercase tracking-wider font-bold">Target</span>
                  <span className="text-sm font-bold text-yellow-400 group-hover:text-yellow-300 transition-colors flex items-center gap-1">
                    {dare.streamerHandle.startsWith('@') ? dare.streamerHandle : `@${dare.streamerHandle}`}
                    <ExternalLink className="w-3 h-3 opacity-50" />
                  </span>
                </div>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* ── CONTENT ── */}
      <div className="relative z-10 max-w-3xl mx-auto px-4 md:px-8 space-y-6 mt-4">

        {/* Paid dares keep the money summary. Free Sparks put the challenge first. */}
        {!isCommunitySpark ? (
        <div className="flex items-center justify-between rounded-2xl border border-white/[0.08] bg-white/[0.04] p-4 backdrop-blur-md md:backdrop-blur-xl">
          <div>
              <p className="text-[10px] text-white/30 uppercase tracking-wider font-bold mb-0.5">
                Pot Size
              </p>
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-black text-green-400">{safeBountyAmount.toLocaleString()}</span>
                <span className="text-sm font-bold text-green-600">USDC</span>
            </div>
          </div>
          <button
            onClick={handleUpvote}
            disabled={upvoteLoading}
            className="flex flex-col items-center gap-1 transition-all text-white/30 hover:text-red-400 disabled:opacity-60"
          >
            {upvoteLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Heart className="w-6 h-6" />}
            <span className="text-xs font-mono font-bold">{safeUpvoteCount.toLocaleString()}</span>
          </button>
        </div>
        ) : null}

        {communitySparkBrief ? (
          <section className="overflow-hidden rounded-[26px] border border-fuchsia-300/18 bg-[radial-gradient(circle_at_85%_0%,rgba(16,185,129,.13),transparent_34%),linear-gradient(145deg,rgba(98,35,135,.2),rgba(4,15,18,.9))] p-5 shadow-[0_18px_54px_rgba(48,16,70,.2)] md:p-6">
            <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.24em] text-emerald-200">
              <Sparkles className="h-3.5 w-3.5" />
              Free Spark
            </p>
            <h2 className="mt-3 text-2xl font-black leading-[1.05] text-white md:text-3xl">
              {communitySparkBrief.hook}
            </h2>

            <div className="mt-4 rounded-2xl border border-white/[0.08] bg-black/22 px-4 py-3">
              <p className="grid grid-cols-[3.25rem_minmax(0,1fr)] gap-2 text-sm leading-5 text-white/82">
                <span className="text-[9px] font-black uppercase tracking-[0.18em] text-fuchsia-200">Do</span>
                <span className="font-bold">{communitySparkBrief.instructions}</span>
              </p>
              <p className="mt-2 grid grid-cols-[3.25rem_minmax(0,1fr)] gap-2 border-t border-white/[0.07] pt-2 text-sm leading-5 text-white/68">
                <span className="text-[9px] font-black uppercase tracking-[0.18em] text-cyan-200">Film</span>
                <span>{communitySparkBrief.capturePrompt}</span>
              </p>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {communitySparkPlayRadiusLabel ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300/16 bg-emerald-500/[0.07] px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.14em] text-emerald-100/75">
                  <MapPin className="h-3 w-3" />
                  {communitySparkPlayRadiusLabel} zone
                </span>
              ) : null}
              <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.14em] text-white/58">
                ~{communitySparkBrief.estimatedMinutes} min
              </span>
              <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.14em] text-white/58">
                {communitySparkBrief.crew}
              </span>
            </div>

            {!isExpired ? (
              <div className="mt-4 grid grid-cols-[minmax(0,1fr)_68px] gap-2">
                <button
                  type="button"
                  onClick={() => { void handleCommunitySparkAction(); }}
                  disabled={communityPlayAccess.status === 'checking'}
                  className="flex min-h-[52px] items-center justify-center gap-2 rounded-xl border border-[#f5c518]/35 bg-[linear-gradient(135deg,#f4d44d,#b87c0b)] px-4 text-xs font-black uppercase tracking-[0.15em] text-[#171108] shadow-[0_8px_26px_rgba(245,197,24,.18)] transition hover:brightness-110"
                >
                  {communityPlayAccess.status === 'checking'
                    ? <Loader2 className="h-5 w-5 animate-spin" />
                    : <Play className="h-5 w-5 fill-current" />}
                  {communityPlayAccess.status === 'checking' ? 'Checking location' : communityActionLabel}
                </button>
                <button
                  type="button"
                  onClick={handleUpvote}
                  disabled={upvoteLoading}
                  aria-label="Cheer this Spark"
                  className="flex min-h-[52px] flex-col items-center justify-center gap-0.5 rounded-xl border border-fuchsia-400/18 bg-fuchsia-500/10 text-fuchsia-100 transition hover:bg-fuchsia-500/18 disabled:opacity-60"
                >
                  {upvoteLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Heart className="h-5 w-5" />}
                  <span className="text-[9px] font-black uppercase tracking-wider">Cheer</span>
                </button>
              </div>
            ) : null}

            {communityPlayAccess.message ? (
              <div
                className={`mt-3 flex items-start gap-2 rounded-xl border px-3 py-2.5 text-xs leading-5 ${
                  communityPlayAccess.status === 'ready'
                    ? 'border-emerald-300/20 bg-emerald-500/[0.08] text-emerald-100'
                    : 'border-white/10 bg-black/20 text-white/62'
                }`}
              >
                <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{communityPlayAccess.message}</span>
              </div>
            ) : null}

            <p className="mt-3 flex items-center gap-2 text-xs font-bold leading-5 text-fuchsia-100/66">
              <Users className="h-3.5 w-3.5 shrink-0" />
              {communitySparkBrief.socialPrompt}
            </p>

            <details className="group mt-3 rounded-xl border border-white/[0.07] bg-black/16 px-3 py-2.5 text-xs text-white/48">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-bold text-white/58">
                <span>Play safe</span>
                <ChevronDown className="h-3.5 w-3.5 transition group-open:rotate-180" />
              </summary>
              <p className="mt-2 leading-5">{communitySparkBrief.safety}</p>
              <p className="mt-1.5 leading-5 text-white/34">Free to play · no cash prize · not an official venue competition.</p>
            </details>
          </section>
        ) : null}

        {!isCommunitySpark ? <DareStatusTimeline dare={{ ...dare, isCommunitySpark }} size="full" /> : null}

        {outcomeContract && !isCommunitySpark ? (
          <section className="rounded-2xl border border-cyan-300/16 bg-cyan-400/[0.055] p-4 backdrop-blur-md md:p-5">
            <p className="text-[10px] font-mono font-bold uppercase tracking-[0.25em] text-cyan-100">Outcome contract · {outcomeContract.family.replaceAll('_', ' ')}</p>
            <h2 className="mt-2 text-lg font-black text-white">What counts was locked before funding</h2>
            <div className="mt-3 grid gap-2 text-sm text-white/70">
              {Object.entries(outcomeContract.mission).map(([label, value]) => (
                <p key={label}><span className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/40">{label}</span> · {value}</p>
              ))}
            </div>
            {reportedOutcome?.kind && reportedOutcome.summary ? (
              <div className="mt-4 rounded-xl border border-white/10 bg-black/25 px-3 py-3">
                <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-white/40">Reported outcome · {dare.evidenceDecision ?? 'PENDING'}</p>
                <p className="mt-1 text-sm text-white"><strong>{reportedOutcome.kind}</strong> — {reportedOutcome.summary}</p>
              </div>
            ) : null}
          </section>
        ) : null}

        {showTrustPanel && trustPanel ? (
          <section className={`rounded-2xl border p-4 backdrop-blur-md md:p-5 md:backdrop-blur-xl ${trustPanel.tone}`}>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-white/45">
                  {isCommunitySpark ? 'Spark receipt' : 'Review & settlement'}
                </p>
                <h2 className="mt-2 text-lg font-black text-white">{trustPanel.title}</h2>
              </div>
              {lifecycleMoments.length > 0 ? (
                <div className="grid gap-2 sm:grid-cols-2 lg:min-w-[320px]">
                  {lifecycleMoments.map((moment) => (
                    <div
                      key={`${moment.label}-${moment.value}`}
                      className="rounded-xl border border-white/[0.08] bg-black/20 px-3 py-2"
                    >
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/35">
                        {moment.label}
                      </p>
                      <p className="mt-1 text-xs text-white/72">{formatStatusMoment(moment.value ?? null)}</p>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
            <ul className="mt-4 space-y-2 text-sm leading-6 text-white/72">
              {trustPanel.bullets.map((bullet) => (
                <li key={bullet} className="flex gap-2">
                  <span className="mt-[9px] h-1.5 w-1.5 rounded-full bg-current/80" />
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
            <Link
              href={isCommunitySpark ? '/how-it-works' : '/trust'}
              className="mt-4 inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.18em] text-white/70 transition hover:text-white"
            >
              {isCommunitySpark ? 'How Spark receipts work' : 'See how review and payout work'}
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </section>
        ) : null}

        {/* Tx feedback */}
        {(approvePending || fundPending) && (
          <div className="flex items-center gap-3 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl text-yellow-400 text-sm">
            <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />
            {approvePending ? 'Approving USDC...' : 'Adding to pool...'}
          </div>
        )}
        {fundConfirmed && (
          <div className="flex items-center gap-3 p-3 bg-green-500/10 border border-green-500/20 rounded-xl text-green-400 text-sm">
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
            Successfully added to pool!
          </div>
        )}
        {txError && (
          <div className="flex items-center gap-3 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {txError}
          </div>
        )}
        {!isCommunitySpark && !isOnchainContractsReady && (
          <div className="flex items-center gap-3 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl text-yellow-300 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {onchainConfigError || 'Contract configuration missing. Pool funding is temporarily unavailable.'}
          </div>
        )}
        {upvoteError && (
          <div className="flex items-center gap-3 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {upvoteError}
          </div>
        )}

        {/* Action bar (inline, transparent — no fixed black footer overlay) */}
        {!isExpired && !isCommunitySpark && (
          <div className="sticky bottom-[calc(0.85rem+env(safe-area-inset-bottom))] z-30 -mx-1 rounded-[24px] border border-white/[0.12] bg-[rgba(7,8,18,0.9)] p-2 shadow-[0_18px_42px_rgba(0,0,0,0.42),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-md md:static md:mx-0 md:rounded-2xl md:bg-[rgba(15,18,38,0.18)] md:p-4 md:shadow-[0_10px_40px_rgba(8,10,24,0.35)] md:backdrop-blur-2xl">
            {/* Add-to-pool amount input (expandable) */}
            <AnimatePresence>
              {showAddInput && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden mb-3"
                >
                  <div className="flex items-center gap-2 bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2">
                    <span className="text-xs text-white/30 font-mono">USDC</span>
                    <input
                      type="number" min="1" max="10000" step="1"
                      value={addAmount}
                      onChange={e => setAddAmount(e.target.value)}
                      className="flex-1 bg-transparent text-white font-mono text-sm focus:outline-none"
                    />
                    <button
                      onClick={() => { handleAddToPool(); setShowAddInput(false); }}
                      disabled={approvePending || fundPending || !isConnected || !isOnchainContractsReady}
                      className="px-4 py-1.5 bg-green-500 hover:bg-green-400 text-black font-black text-xs rounded-lg transition-colors disabled:opacity-50"
                    >
                      Confirm
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* CTA buttons */}
            <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleUpvote}
                  disabled={upvoteLoading}
                  className="flex min-h-[48px] flex-col items-center gap-1 rounded-xl border border-white/[0.08] bg-white/[0.04] py-2 text-white/60 transition-all hover:text-white disabled:opacity-60 md:py-3"
                >
                  {upvoteLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Heart className="w-5 h-5" />}
                  <span className="text-[10px] font-black uppercase tracking-wider">Upvote</span>
                </button>

                <button
                  onClick={() => {
                    if (!isOnchainContractsReady) { setTxError(onchainConfigError || 'Contract configuration missing'); return; }
                    if (!isConnected) { setTxError('Connect your wallet first'); return; }
                    setShowAddInput(v => !v);
                  }}
                  disabled={approvePending || fundPending || !isOnchainContractsReady}
                  className="flex min-h-[48px] flex-col items-center gap-1 rounded-xl border border-green-500/20 bg-green-500/10 py-2 text-green-400 transition-all hover:bg-green-500/20 disabled:cursor-not-allowed disabled:opacity-50 md:py-3"
                >
                  {approvePending || fundPending
                    ? <Loader2 className="w-5 h-5 animate-spin" />
                    : <Zap className="w-5 h-5" />
                  }
                  <span className="text-[10px] font-black uppercase tracking-wider">Add Pool</span>
                </button>
            </div>
          </div>
        )}

        {/* Claim section (preserved for open/target dares) */}
        {dare.awaitingClaim && !dare.targetWalletAddress && isConnected && !dare.claimRequestWallet && (
          <div ref={communityJoinRef} className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-2xl scroll-mt-28">
            <h3 className="text-sm font-black text-purple-300 mb-2">
              {isCommunitySpark ? 'Ready to play?' : 'Open Bounty — Claim It'}
            </h3>
            <p className="text-xs text-white/50 mb-3">
              {isCommunitySpark
                ? 'You are close enough. Join, play, and save your best moment.'
                : 'You can request to accept this dare and earn the full bounty.'}
            </p>
            {claimError && <p className="text-xs text-red-400 mb-2">{claimError}</p>}
            <div className="mb-3">
              <SafetyWaiver checked={claimWaiverAccepted} onChange={setClaimWaiverAccepted} context={isCommunitySpark ? 'spark' : 'claim'} />
            </div>
            <CosmicButton
              onClick={() => {
                if (isCommunitySpark && communityPlayAccess.status !== 'ready') {
                  void handleCommunitySparkAction();
                  return;
                }
                void handleClaimRequest();
              }}
              disabled={
                claimLoading ||
                claimSuccess ||
                !claimWaiverAccepted ||
                communityPlayAccess.status === 'checking'
              }
              variant="gold"
              size="md"
              fullWidth
            >
              {claimLoading || communityPlayAccess.status === 'checking'
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : null}
              {claimSuccess
                ? isCommunitySpark ? '✓ Join request sent' : '✓ Request sent'
                : isCommunitySpark
                  ? communityPlayAccess.status === 'ready' ? 'Join this Spark' : 'Check location to play'
                  : 'Request to Claim'}
            </CosmicButton>
          </div>
        )}

        {dare.awaitingClaim && !dare.targetWalletAddress && !isConnected && !dare.claimRequestWallet && (
          <div ref={communityJoinRef} className="rounded-2xl border border-[#f5c518]/20 bg-[linear-gradient(145deg,rgba(245,197,24,.1),rgba(79,45,120,.08))] p-4 scroll-mt-28">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#ffe36a]">
              {isSocialWebview ? `Opened inside ${socialWebviewLabel}` : isCommunitySpark ? 'Want to play later?' : 'Not ready to claim yet?'}
            </p>
            <h3 className="mt-2 text-base font-black text-white">
              {isCommunitySpark ? 'Save this Spark' : 'Take this mission with you'}
            </h3>
            <p className="mt-1 text-xs leading-5 text-white/50">
              {isSocialWebview
                ? 'Save a private Mission Pass, then open it in Safari or Chrome before you connect a wallet.'
                : isCommunitySpark
                  ? 'Keep it on this device, then come back when you are near the place and ready to play.'
                  : 'Save it without an account, or use Sign in above when you are ready to request the mission.'}
            </p>
            <CosmicButton
              onClick={() => setShowMissionPass(true)}
              variant="gold"
              size="md"
              fullWidth
              className="mt-4"
            >
              {isCommunitySpark ? 'Save Spark Pass' : 'Save Mission Pass'}
            </CosmicButton>
          </div>
        )}

        {dare.awaitingClaim && dare.claimRequestStatus === 'PENDING' && dare.claimRequestWallet && (
          <div className="p-4 bg-cyan-500/10 border border-cyan-500/20 rounded-2xl">
            <h3 className="text-sm font-black text-cyan-300 mb-2">
              {isCommunitySpark ? 'Join request sent' : 'Activation claim pending'}
            </h3>
            <p className="text-xs text-white/55">
              {dare.claimRequestWallet?.toLowerCase() === address?.toLowerCase()
                ? isCommunitySpark
                  ? 'You are in the queue. We will let you know when this Spark is ready.'
                  : 'Your claim request is in. A moderator will review it before this activation is assigned.'
                : isCommunitySpark
                  ? `${dare.claimRequestTag ?? 'Someone'} is up next. Cheer them on or pick another Spark.`
                  : `${dare.claimRequestTag ?? 'Someone'} has already requested this activation. Check back soon or browse another live brief.`}
            </p>
          </div>
        )}

        {/* Video proof */}
        {dare.videoUrl && (
          <div ref={videoRef} className="rounded-2xl overflow-hidden border border-white/[0.08] scroll-mt-28">
            <video src={dare.videoUrl} controls className="w-full rounded-2xl" />
          </div>
        )}

        {(['VERIFIED', 'PENDING_PAYOUT'].includes(dare.status?.toUpperCase()) && (canReviewCreator || creatorReview)) && (
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-4 backdrop-blur-xl">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-base font-black uppercase tracking-[0.18em] text-white/85">Creator Review</h2>
                <p className="mt-1 text-sm text-white/45">
                  Simple business-side signal after a mission lands.
                </p>
              </div>
              {creatorReview ? (
                <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-emerald-300">
                  <CheckCircle className="h-3.5 w-3.5" />
                  Review logged
                </span>
              ) : null}
            </div>

            {creatorReview ? (
              <div className="mt-4 rounded-[20px] border border-white/[0.08] bg-black/20 px-4 py-4">
                <div className="flex gap-1 text-[#f9e27a]">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <Star key={index} className={`h-4 w-4 ${creatorReview.rating >= index + 1 ? 'fill-current' : 'text-white/12'}`} />
                  ))}
                </div>
                <p className="mt-2 text-xs uppercase tracking-[0.16em] text-white/35">
                  Logged {formatDistanceToNow(new Date(creatorReview.createdAt), { addSuffix: true })}
                </p>
                <p className="mt-3 text-sm leading-6 text-white/68">
                  {creatorReview.review || 'No written note, just the star rating.'}
                </p>
              </div>
            ) : canReviewCreator ? (
              <div className="mt-4 space-y-4">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-white/35">Rating</p>
                  <div className="mt-2 flex gap-2">
                    {Array.from({ length: 5 }).map((_, index) => {
                      const nextRating = index + 1;
                      return (
                        <button
                          key={nextRating}
                          type="button"
                          onClick={() => setReviewRating(nextRating)}
                          className="transition-transform hover:scale-105"
                        >
                          <Star className={`h-6 w-6 ${reviewRating >= nextRating ? 'fill-[#f9e27a] text-[#f9e27a]' : 'text-white/15'}`} />
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-white/35">Optional note</p>
                  <textarea
                    value={reviewBody}
                    onChange={(event) => setReviewBody(event.target.value.slice(0, 240))}
                    rows={3}
                    placeholder="How was delivery, proof quality, or venue impact?"
                    className="mt-2 w-full resize-none rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm text-white placeholder:text-white/25 focus:border-purple-500/50 focus:outline-none"
                  />
                  <div className="mt-2 flex items-center justify-between text-[11px] text-white/35">
                    <span>Visible on the creator profile.</span>
                    <span>{reviewBody.length}/240</span>
                  </div>
                </div>
                {reviewError ? (
                  <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                    {reviewError}
                  </div>
                ) : null}
                <button
                  type="button"
                  onClick={submitCreatorReview}
                  disabled={reviewSubmitting}
                  className="inline-flex items-center gap-2 rounded-xl border border-[#f5c518]/25 bg-[#f5c518]/10 px-4 py-2 text-sm font-black uppercase tracking-[0.16em] text-[#f9e27a] transition hover:border-[#f5c518]/40 hover:bg-[#f5c518]/16 disabled:opacity-50"
                >
                  {reviewSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Star className="h-4 w-4" />}
                  {reviewSubmitting ? 'Saving...' : 'Save review'}
                </button>
              </div>
            ) : null}
          </div>
        )}

        {/* ── COMMENTS ── */}
        <div ref={commentsRef}>
          <h2 className="text-base font-black text-white/80 uppercase tracking-widest mb-4 flex items-center gap-2">
            <MessageCircle className="w-4 h-4" /> Comments
          </h2>

          {/* Comment form */}
          <div className="mb-4">
            {isConnected ? (
              <div className="flex gap-2">
                <textarea
                  value={commentBody}
                  onChange={e => setCommentBody(e.target.value.slice(0, 500))}
                  placeholder="Say something..."
                  rows={2}
                  className="flex-1 resize-none text-sm bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-white placeholder:text-white/25 focus:outline-none focus:border-purple-500/50 transition-colors"
                />
                <button
                  onClick={submitComment}
                  disabled={!commentBody.trim() || submittingComment}
                  className="px-4 py-2 bg-purple-500 hover:bg-purple-400 text-white rounded-xl font-bold transition-colors disabled:opacity-40 flex items-center gap-1.5 self-start mt-0"
                >
                  {submittingComment ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </div>
            ) : (
              <p className="text-sm text-white/30 text-center py-4 border border-white/[0.06] rounded-xl">
                Connect your wallet to comment
              </p>
            )}
            {commentError && <p className="text-xs text-red-400 mt-2">{commentError}</p>}
          </div>

          {/* Comment list */}
          <div className="divide-y divide-white/[0.05]">
            {commentsLoading && comments.length === 0 ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-5 h-5 text-white/30 animate-spin" />
              </div>
            ) : comments.length === 0 ? (
              <p className="text-sm text-white/25 text-center py-8">No comments yet. Be the first!</p>
            ) : (
              <>
                {comments.map(c => <CommentItem key={c.id} comment={c} />)}
                {nextCursor && (
                  <button
                    onClick={() => loadComments(nextCursor)}
                    disabled={commentsLoading}
                    className="w-full py-3 flex items-center justify-center gap-2 text-xs text-white/40 hover:text-white/60 transition-colors"
                  >
                    {commentsLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    Load more
                  </button>
                )}
              </>
            )}
          </div>
        </div>

      </div>

      <MissionPassSheet
        open={showMissionPass}
        onClose={() => setShowMissionPass(false)}
        targetType="DARE"
        targetId={dare.id}
        targetHref={`/dare/${dare.shortId || dare.id}`}
        title={communitySparkBrief?.title ?? dare.title}
      />

    </main>
  );
}
