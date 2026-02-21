'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import {
  ArrowLeft, Share2, Clock, Heart, MessageCircle,
  ExternalLink, AlertCircle, Loader2, CheckCircle,
  ChevronDown, Send, Shield, Zap, LayoutDashboard,
} from 'lucide-react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseUnits } from 'viem';
import { formatDistanceToNow } from 'date-fns';
import LiquidBackground from '@/components/LiquidBackground';
import DareVisual from '@/components/DareVisual';

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

const USDC_ADDRESS = (process.env.NEXT_PUBLIC_USDC_ADDRESS || '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913') as `0x${string}`;
const CONTRACT_ADDR = (process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || '0x0') as `0x${string}`;

// ── Types ──────────────────────────────────────────────────────────────────
interface DareDetail {
  id: string; shortId: string; title: string; bounty: number;
  streamerHandle: string | null; status: string; expiresAt: string | null;
  videoUrl: string | null; inviteToken: string | null; claimDeadline: string | null;
  targetWalletAddress: string | null; awaitingClaim: boolean;
  claimRequestWallet: string | null; claimRequestTag: string | null;
  claimRequestedAt: string | null; claimRequestStatus: string | null;
  stakerAddress?: string | null;
}

interface Comment {
  id: string; walletAddress: string; displayName: string;
  body: string; createdAt: string;
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

function statusConfig(status: string) {
  const s = status?.toUpperCase();
  if (s === 'VERIFIED' || s === 'COMPLETED') return { label: 'VERIFIED', cls: 'bg-green-500/20 border-green-500/40 text-green-400' };
  if (s === 'EXPIRED' || s === 'FAILED') return { label: 'EXPIRED', cls: 'bg-gray-500/20 border-gray-500/40 text-gray-400' };
  if (s === 'PENDING_REVIEW') return { label: 'UNDER REVIEW', cls: 'bg-yellow-500/20 border-yellow-500/40 text-yellow-400' };
  return { label: 'LIVE', cls: 'bg-red-500/20 border-red-500/40 text-red-400' };
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

// ── Steal modal ────────────────────────────────────────────────────────────
function StealModal({ onClose }: { onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-md p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}
        onClick={e => e.stopPropagation()}
        className="bg-[#0d0d14] border border-yellow-500/30 rounded-2xl p-6 max-w-sm w-full text-center shadow-2xl"
      >
        <div className="text-4xl mb-3">🔒</div>
        <h3 className="text-lg font-black text-white mb-2">Coming Soon</h3>
        <p className="text-sm text-gray-400 mb-4">
          The <span className="text-yellow-400 font-bold">Steal</span> mechanism is exclusive to{' '}
          <span className="text-yellow-400 font-bold">Genesis Pass</span> holders.<br />
          Claim a bounty before time runs out and pocket the pot.
        </p>
        <button onClick={onClose} className="w-full py-3 rounded-xl bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 font-bold text-sm hover:bg-yellow-500/20 transition-colors">
          Got it
        </button>
      </motion.div>
    </motion.div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────
export default function DareDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const shortId = params.shortId as string;
  const { address, isConnected } = useAccount();

  // Dare state
  const [dare, setDare] = useState<DareDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState('');
  const [likeCount, setLikeCount] = useState(0);
  const [liked, setLiked] = useState(false);

  // Action bar state
  const [addAmount, setAddAmount] = useState('5');
  const [showAddInput, setShowAddInput] = useState(false);
  const [txError, setTxError] = useState<string | null>(null);
  const [showStealModal, setShowStealModal] = useState(false);

  // Comments state
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [commentBody, setCommentBody] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);
  const commentsRef = useRef<HTMLDivElement>(null);

  // Claim state (preserved)
  const [claimLoading, setClaimLoading] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);
  const [claimSuccess, setClaimSuccess] = useState(false);

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
        setDare(data);
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

  // ── Submit comment ─────────────────────────────────────────────────────
  const submitComment = async () => {
    if (!commentBody.trim() || !dare || !isConnected || !address) return;
    setSubmittingComment(true);
    setCommentError(null);
    try {
      const res = await fetch(`/api/dares/${dare.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: address,
          displayName: `${address.slice(0, 6)}...${address.slice(-4)}`,
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

  // ── Add to Pool tx ─────────────────────────────────────────────────────
  const handleAddToPool = async () => {
    if (!dare || !isConnected) return;
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
    if (!approveConfirmed || !dare) return;
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
  }, [approveConfirmed]);

  // ── Claim (preserved) ──────────────────────────────────────────────────
  const handleClaimRequest = useCallback(async () => {
    if (!dare || !address) return;
    setClaimLoading(true); setClaimError(null);
    try {
      const res = await fetch(`/api/dares/${dare.id}/claim`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: address }),
      });
      const data = await res.json();
      if (data.success) {
        setClaimSuccess(true);
        setDare(prev => prev ? { ...prev, claimRequestWallet: address.toLowerCase(), claimRequestStatus: 'PENDING' } : null);
      } else { setClaimError(data.error || 'Claim request failed'); }
    } catch { setClaimError('Network error'); }
    finally { setClaimLoading(false); }
  }, [dare, address]);

  const isUserInvolved = dare && address &&
    (address.toLowerCase() === dare.stakerAddress?.toLowerCase() ||
      address.toLowerCase() === dare.targetWalletAddress?.toLowerCase());

  const sc = dare ? statusConfig(dare.status) : null;
  const isExpired = dare?.status?.toUpperCase() === 'EXPIRED' || dare?.status?.toUpperCase() === 'FAILED';
  const timerColor = getTimerColor(dare?.expiresAt ?? null);

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
    <main className="min-h-screen bg-black text-white pb-32">
      <LiquidBackground />

      {/* ── TOP NAV ── */}
      <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-3 bg-black/60 backdrop-blur-xl border-b border-white/[0.06]">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-white/60 hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-medium hidden sm:inline">Back</span>
        </button>
        <div className="flex items-center gap-3">
          {isUserInvolved && (
            <Link href="/dashboard" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-500/20 border border-purple-500/30 text-purple-400 text-xs font-bold hover:bg-purple-500/30 transition-colors">
              <LayoutDashboard className="w-3 h-3" />
              Dashboard
            </Link>
          )}
          <button
            onClick={() => {
              const url = `${window.location.origin}/dare/${shortId}`;
              navigator.clipboard.writeText(url);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white/60 text-xs font-bold hover:bg-white/10 transition-colors"
          >
            <Share2 className="w-3 h-3" />
            Share
          </button>
        </div>
      </div>

      {/* ── HERO ── */}
      <div className="relative w-full min-h-[300px] md:min-h-[400px] overflow-hidden pt-14">
        <div className="absolute inset-0">
          <DareVisual
            imageUrl={undefined}
            streamerName={dare.streamerHandle || ''}
            type={dare.streamerHandle ? 'streamer' : 'open'}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/50 to-black" />
        </div>
        <div className="relative z-10 flex flex-col justify-end h-full min-h-[300px] md:min-h-[400px] px-4 pb-8 md:px-8 max-w-3xl mx-auto">
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
            <span className="flex items-center gap-1.5 text-xs font-mono text-white/40">
              <MessageCircle className="w-3.5 h-3.5" />
              {comments.length} comments
            </span>
          </div>

          {/* Title */}
          <h1 className="text-3xl md:text-5xl font-black italic uppercase leading-tight text-white tracking-tight mb-4 text-shadow-lg">
            {dare.title}
          </h1>

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

      {/* ── CONTENT ── */}
      <div className="relative z-10 max-w-3xl mx-auto px-4 md:px-8 space-y-6 mt-4">

        {/* Bounty + likes row */}
        <div className="flex items-center justify-between p-4 bg-white/[0.04] border border-white/[0.08] rounded-2xl backdrop-blur-xl">
          <div>
            <p className="text-[10px] text-white/30 uppercase tracking-wider font-bold mb-0.5">Pot Size</p>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-black text-green-400">{dare.bounty.toLocaleString()}</span>
              <span className="text-sm font-bold text-green-600">USDC</span>
            </div>
          </div>
          <button
            onClick={() => { setLiked(v => !v); setLikeCount(c => c + (liked ? -1 : 1)); }}
            className={`flex flex-col items-center gap-1 transition-all ${liked ? 'text-red-400 scale-110' : 'text-white/30 hover:text-red-400'}`}
          >
            <Heart className={`w-6 h-6 ${liked ? 'fill-red-400' : ''}`} />
            <span className="text-xs font-mono font-bold">{likeCount}</span>
          </button>
        </div>

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

        {/* Claim section (preserved for open/target dares) */}
        {dare.awaitingClaim && !dare.targetWalletAddress && isConnected && !dare.claimRequestWallet && (
          <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-2xl">
            <h3 className="text-sm font-black text-purple-300 mb-2">Open Bounty — Claim It</h3>
            <p className="text-xs text-white/50 mb-3">You can request to accept this dare and earn the full bounty.</p>
            {claimError && <p className="text-xs text-red-400 mb-2">{claimError}</p>}
            <button
              onClick={handleClaimRequest}
              disabled={claimLoading || claimSuccess}
              className="w-full py-2.5 rounded-xl bg-purple-500 hover:bg-purple-400 text-black font-black text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {claimLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {claimSuccess ? '✓ Request Sent' : 'Request to Claim'}
            </button>
          </div>
        )}

        {/* Video proof */}
        {dare.videoUrl && (
          <div className="rounded-2xl overflow-hidden border border-white/[0.08]">
            <video src={dare.videoUrl} controls className="w-full rounded-2xl" />
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

      {/* ── FIXED BOTTOM ACTION BAR (mobile + desktop) ── */}
      {!isExpired && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-[#0a0a0f]/95 border-t border-white/[0.08] backdrop-blur-2xl safe-area-bottom">
          <div className="max-w-3xl mx-auto px-4 py-3">
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
                      disabled={approvePending || fundPending || !isConnected}
                      className="px-4 py-1.5 bg-green-500 hover:bg-green-400 text-black font-black text-xs rounded-lg transition-colors disabled:opacity-50"
                    >
                      Confirm
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Three CTA buttons */}
            <div className="grid grid-cols-3 gap-2">
              {/* Upvote */}
              <button
                onClick={() => { setLiked(v => !v); setLikeCount(c => c + (liked ? -1 : 1)); }}
                className={`flex flex-col items-center gap-1 py-3 rounded-xl border transition-all ${liked ? 'bg-red-500/20 border-red-500/40 text-red-400' : 'bg-white/[0.04] border-white/[0.08] text-white/60 hover:text-white'
                  }`}
              >
                <Heart className={`w-5 h-5 ${liked ? 'fill-red-400' : ''}`} />
                <span className="text-[10px] font-black uppercase tracking-wider">Upvote</span>
              </button>

              {/* Add to Pool */}
              <button
                onClick={() => {
                  if (!isConnected) { setTxError('Connect your wallet first'); return; }
                  setShowAddInput(v => !v);
                }}
                disabled={approvePending || fundPending}
                className="flex flex-col items-center gap-1 py-3 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 hover:bg-green-500/20 transition-all disabled:opacity-50"
              >
                {approvePending || fundPending
                  ? <Loader2 className="w-5 h-5 animate-spin" />
                  : <Zap className="w-5 h-5" />
                }
                <span className="text-[10px] font-black uppercase tracking-wider">Add Pool</span>
              </button>

              {/* Steal */}
              <button
                onClick={() => setShowStealModal(true)}
                className="flex flex-col items-center gap-1 py-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 hover:bg-yellow-500/20 transition-all"
              >
                <Shield className="w-5 h-5" />
                <span className="text-[10px] font-black uppercase tracking-wider">Steal?</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Steal modal */}
      <AnimatePresence>
        {showStealModal && <StealModal onClose={() => setShowStealModal(false)} />}
      </AnimatePresence>
    </main>
  );
}
