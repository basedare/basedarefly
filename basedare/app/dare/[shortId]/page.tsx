'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Share2, Clock, Copy, CheckCircle, Users, ExternalLink, Hand, Loader2, AlertCircle } from 'lucide-react';
import { useAccount } from 'wagmi';
import BountyQRCode from '@/components/BountyQRCode';
import LiquidBackground from '@/components/LiquidBackground';

function shareDareOnX(dare: { title: string; bounty: number; streamerHandle: string | null }, shortId: string) {
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://basedare.xyz';
  const dareUrl = `${baseUrl}/dare/${shortId}`;

  const targetText = dare.streamerHandle
    ? `on @${dare.streamerHandle.replace('@', '')}`
    : '(OPEN BOUNTY - anyone can claim!)';

  const text = `🎯 $${dare.bounty.toLocaleString()} USDC bounty ${targetText}

"${dare.title}"

Think they'll do it? Add to the pot or watch them sweat 👇

#BaseDare #Base`;

  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(dareUrl)}`;
  window.open(twitterUrl, '_blank', 'width=550,height=420');
}

interface DareDetail {
  id: string;
  shortId: string;
  title: string;
  bounty: number;
  streamerHandle: string | null;
  status: string;
  expiresAt: string | null;
  videoUrl: string | null;
  // Invite flow fields
  inviteToken: string | null;
  claimDeadline: string | null;
  targetWalletAddress: string | null;
  awaitingClaim: boolean;
  // Claim request fields (for open dares)
  claimRequestWallet: string | null;
  claimRequestTag: string | null;
  claimRequestedAt: string | null;
  claimRequestStatus: string | null;
}

interface VoteCounts {
  approve: number;
  reject: number;
  total: number;
  dareStatus: string;
  threshold: {
    required: number;
    consensusPercent: number;
    met: boolean;
  };
}

function formatTimeRemaining(expiresAt: string | null): string {
  if (!expiresAt) return 'No expiry';

  const now = Date.now();
  const expiry = new Date(expiresAt).getTime();
  const diff = expiry - now;

  if (diff <= 0) return 'EXPIRED';

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 0) return `${hours}h ${minutes}m remaining`;
  return `${minutes}m remaining`;
}

// Store referral in sessionStorage for tracking
function storeReferral(ref: string, dareId: string) {
  if (typeof window !== 'undefined' && ref) {
    const referralData = { ref, dareId, timestamp: Date.now() };
    sessionStorage.setItem('basedare_referral', JSON.stringify(referralData));
  }
}

export default function DareDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const shortId = params.shortId as string;
  const referrer = searchParams.get('ref');
  const { address, isConnected } = useAccount();

  const [dare, setDare] = useState<DareDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState('');
  const [copied, setCopied] = useState(false);
  const [voteCounts, setVoteCounts] = useState<VoteCounts | null>(null);

  // Claim request state
  const [claimLoading, setClaimLoading] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);
  const [claimSuccess, setClaimSuccess] = useState(false);

  // Upload state
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleUpload = async () => {
    if (!uploadFile || !dare) return;
    setUploading(true);
    setUploadError(null);
    const formData = new FormData();
    formData.append('file', uploadFile);
    formData.append('dareId', dare.id);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        setDare(prev => prev ? { ...prev, status: 'PENDING_REVIEW', videoUrl: data.url } : null);
      } else {
        setUploadError(data.error || 'Upload failed');
      }
    } catch (err) {
      setUploadError('Upload failed to connect');
    } finally {
      setUploading(false);
    }
  };

  // Track referral on page load
  useEffect(() => {
    if (referrer) {
      storeReferral(referrer, shortId);
    }
  }, [referrer, shortId]);

  useEffect(() => {
    const fetchDare = async () => {
      try {
        const res = await fetch(`/api/dare/${shortId}`);
        if (!res.ok) {
          if (res.status === 404) {
            setError('Bounty not found');
          } else {
            setError('Failed to load bounty');
          }
          return;
        }
        const data = await res.json();
        setDare(data);
        setTimeRemaining(formatTimeRemaining(data.expiresAt));

        // Fetch vote counts if dare has proof submitted
        if (data.id && data.videoUrl) {
          try {
            const voteRes = await fetch(`/api/dares/${data.id}/vote`);
            const voteData = await voteRes.json();
            if (voteData.success) {
              setVoteCounts(voteData.data);
            }
          } catch {
            // Vote counts are optional, fail silently
          }
        }
      } catch {
        setError('Failed to load bounty');
      } finally {
        setLoading(false);
      }
    };

    fetchDare();
  }, [shortId]);

  // Live countdown
  useEffect(() => {
    if (!dare?.expiresAt) return;

    const interval = setInterval(() => {
      setTimeRemaining(formatTimeRemaining(dare.expiresAt));
    }, 1000);

    return () => clearInterval(interval);
  }, [dare?.expiresAt]);

  // Handle claim request for open dares
  const handleClaimRequest = useCallback(async () => {
    if (!dare || !address) return;

    setClaimLoading(true);
    setClaimError(null);

    try {
      const res = await fetch(`/api/dares/${dare.id}/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: address }),
      });

      const data = await res.json();

      if (data.success) {
        setClaimSuccess(true);
        // Update local dare state with claim request info
        setDare((prev) => prev ? {
          ...prev,
          claimRequestWallet: address.toLowerCase(),
          claimRequestTag: data.data.claimRequestTag,
          claimRequestedAt: new Date().toISOString(),
          claimRequestStatus: 'PENDING',
        } : null);
      } else {
        setClaimError(data.error || 'Failed to submit claim request');
      }
    } catch {
      setClaimError('Failed to submit claim request');
    } finally {
      setClaimLoading(false);
    }
  }, [dare, address]);

  // Check if this is an open dare
  const isOpenDare = !dare?.streamerHandle || dare.streamerHandle.toLowerCase() === '@open';

  // Check if current user has already requested
  const hasUserRequested = dare?.claimRequestWallet?.toLowerCase() === address?.toLowerCase();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-white/60 font-mono text-sm">Loading bounty...</p>
        </div>
      </div>
    );
  }

  if (error || !dare) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-6 text-center px-6">
          <div className="text-6xl">🔍</div>
          <h1 className="text-2xl font-bold text-white">{error || 'Bounty not found'}</h1>
          <p className="text-white/60 max-w-md">
            This bounty may have been removed or the link is invalid.
          </p>
          <Link
            href="/"
            className="px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl transition-colors"
          >
            Browse Active Bounties
          </Link>
        </div>
      </div>
    );
  }

  const isExpired = dare.status === 'EXPIRED' || timeRemaining === 'EXPIRED';
  const isVerified = dare.status === 'VERIFIED';
  const isAwaitingClaim = dare.status === 'AWAITING_CLAIM' || dare.awaitingClaim;

  // Build invite link for awaiting claim dares
  const inviteLink = isAwaitingClaim && dare.inviteToken && dare.streamerHandle
    ? `/claim-tag?invite=${dare.inviteToken}&handle=${encodeURIComponent(dare.streamerHandle.replace('@', ''))}`
    : null;

  // Format claim deadline
  const formatClaimDeadline = (deadline: string | null) => {
    if (!deadline) return null;
    const date = new Date(deadline);
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

    if (days <= 0) return 'Expired';
    if (days === 1) return '1 day left to claim';
    if (days <= 7) return `${days} days left to claim`;
    return `Claim by ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
  };

  return (
    <main className="min-h-screen relative overflow-hidden">
      <LiquidBackground />

      <div className="relative z-10 max-w-2xl mx-auto px-6 py-20">
        {/* Back link */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-white/40 hover:text-white/60 font-mono text-sm mb-8 transition-colors"
        >
          ← Back to Bounties
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="backdrop-blur-2xl bg-white/[0.02] border border-white/[0.06] rounded-3xl overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.05)] relative"
        >
          {/* Liquid glass gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-white/[0.04] via-transparent to-black/30 pointer-events-none rounded-3xl" />
          {/* Top highlight line */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
          {/* Golden accent line */}
          <div className="absolute top-[1px] left-1/4 right-1/4 h-px bg-gradient-to-r from-transparent via-[#FACC15]/40 to-transparent" />

          {/* Header */}
          <div className="p-6 border-b border-white/[0.06] relative">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                {isVerified ? (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/20 border border-emerald-500/40 rounded-full">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                    <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-wider">Verified</span>
                  </div>
                ) : isExpired ? (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-red-500/20 border border-red-500/40 rounded-full">
                    <span className="text-[10px] font-mono text-red-400 uppercase tracking-wider">Expired</span>
                  </div>
                ) : isAwaitingClaim ? (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-yellow-500/20 border border-yellow-500/40 rounded-full">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
                    <span className="text-[10px] font-mono text-yellow-400 uppercase tracking-wider">Awaiting Creator</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/20 border border-green-500/40 rounded-full">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    <span className="text-[10px] font-mono text-green-400 uppercase tracking-wider">Active</span>
                  </div>
                )}
              </div>
              <div className="font-mono text-xs text-white/40">
                {isAwaitingClaim && dare.claimDeadline
                  ? formatClaimDeadline(dare.claimDeadline)
                  : timeRemaining}
              </div>
            </div>

            <h1 className="text-3xl font-black italic text-white mb-2">
              {dare.title.toUpperCase()}
            </h1>

            <div className="flex items-center gap-2 text-white/60">
              <span className="text-yellow-500">@</span>
              <span className="font-mono text-sm">
                {dare.streamerHandle ? dare.streamerHandle.replace('@', '') : 'Open Bounty - Anyone can claim'}
              </span>
            </div>

            {/* Claim Request Status for Open Dares */}
            {isOpenDare && dare.claimRequestStatus === 'PENDING' && (
              <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-yellow-400" />
                  <span className="text-xs font-bold text-yellow-400 uppercase">Claim Request Pending</span>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  {hasUserRequested
                    ? 'Your claim request is awaiting moderator approval.'
                    : `${dare.claimRequestTag} has requested to claim this dare.`}
                </p>
              </div>
            )}
          </div>

          {/* Bounty Amount */}
          <div className="p-8 flex flex-col items-center border-b border-white/[0.06] relative">
            <div className="text-[10px] font-mono text-white/40 uppercase tracking-widest mb-2">
              Bounty Pool
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-black text-yellow-400 drop-shadow-[0_0_20px_rgba(250,204,21,0.4)]">
                {dare.bounty.toLocaleString()}
              </span>
              <span className="text-xl font-bold text-yellow-400/70">USDC</span>
            </div>
          </div>

          {/* Community Voting Section - Show for dares with proof */}
          {dare.videoUrl && voteCounts && (
            <div className="p-6 border-b border-white/[0.06] relative">
              <div className="flex items-center gap-2 mb-4">
                <Users className="w-4 h-4 text-blue-400" />
                <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">Community Verification</span>
              </div>

              {/* Consensus Bar */}
              <div className="mb-4">
                <div className="flex justify-between text-[10px] font-mono text-gray-400 mb-2">
                  <span>Valid ({voteCounts.approve})</span>
                  <span>Fake ({voteCounts.reject})</span>
                </div>
                <div className="h-2 bg-gray-800 rounded-full overflow-hidden flex">
                  {voteCounts.total > 0 ? (
                    <>
                      <div
                        className="bg-green-500 h-full transition-all duration-500"
                        style={{ width: `${(voteCounts.approve / voteCounts.total) * 100}%` }}
                      />
                      <div
                        className="bg-red-500 h-full transition-all duration-500"
                        style={{ width: `${(voteCounts.reject / voteCounts.total) * 100}%` }}
                      />
                    </>
                  ) : (
                    <div className="bg-gray-700 h-full w-full" />
                  )}
                </div>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-[10px] font-mono text-gray-500">
                    {voteCounts.total} vote{voteCounts.total !== 1 ? 's' : ''}
                  </span>
                  <span className="text-[10px] font-mono text-gray-500">
                    {voteCounts.threshold.met ? 'Quorum reached' : `${voteCounts.threshold.required - voteCounts.total} more needed`}
                  </span>
                </div>
              </div>

              {/* Resolved Status */}
              {(dare.status === 'VERIFIED' || dare.status === 'FAILED') && (
                <div className={`p-3 rounded-lg mb-4 ${dare.status === 'VERIFIED'
                    ? 'bg-green-500/10 border border-green-500/30'
                    : 'bg-red-500/10 border border-red-500/30'
                  }`}>
                  <div className="flex items-center gap-2">
                    <CheckCircle className={`w-4 h-4 ${dare.status === 'VERIFIED' ? 'text-green-400' : 'text-red-400'
                      }`} />
                    <span className={`text-xs font-bold uppercase ${dare.status === 'VERIFIED' ? 'text-green-400' : 'text-red-400'
                      }`}>
                      {dare.status === 'VERIFIED' ? 'Community Verified' : 'Community Rejected'}
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-400 font-mono mt-1">
                    {dare.status === 'VERIFIED'
                      ? 'The community has verified this dare was completed.'
                      : 'The community determined the proof was insufficient.'}
                  </p>
                </div>
              )}

              {/* Vote CTA - only show for pending dares */}
              {(dare.status === 'PENDING' || dare.status === 'PENDING_REVIEW') && (
                <Link
                  href="/verify"
                  className="w-full py-3 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/40 text-blue-400 font-bold text-sm uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2"
                >
                  <span>Vote on this dare</span>
                  <ExternalLink className="w-4 h-4" />
                </Link>
              )}
            </div>
          )}

          {/* Share on X Button */}
          <div className="p-6 border-b border-white/[0.06] relative">
            <button
              onClick={() => shareDareOnX(dare, shortId)}
              className="w-full py-4 bg-white/[0.03] hover:bg-white/[0.06] backdrop-blur-md border border-white/[0.06] text-white font-bold text-sm uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-3 group shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
            >
              <Share2 className="w-5 h-5 group-hover:scale-110 transition-transform" />
              <span>Share on X</span>
            </button>
            <p className="text-center text-[10px] text-white/30 mt-3 font-mono">
              Spread the dare. Build the pot.
            </p>
          </div>

          {/* QR Code */}
          <div className="p-8 flex flex-col items-center relative">
            <div className="text-[10px] font-mono text-white/40 uppercase tracking-widest mb-6">
              Or scan to share
            </div>
            <BountyQRCode
              shortId={shortId}
              bountyAmount={dare.bounty}
              dareTitle={dare.title}
              size={200}
            />
          </div>

          {/* Awaiting Claim - Invite Creator */}
          {isAwaitingClaim && inviteLink && (
            <div className="p-6 border-t border-white/[0.06] relative">
              <div className="flex items-center gap-3 mb-4">
                <Clock className="w-5 h-5 text-yellow-400" />
                <span className="text-sm font-bold text-yellow-400 uppercase tracking-wider">
                  Creator Not Yet Claimed
                </span>
              </div>

              <p className="text-sm text-gray-300 mb-4">
                {dare.streamerHandle || 'The creator'} hasn&apos;t claimed their tag yet. Share the invite link
                to let them know about this bounty!
              </p>

              {/* Invite Link */}
              <div className="mb-4 p-3 bg-white/[0.03] backdrop-blur-md rounded-xl border border-white/[0.06] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-xs text-yellow-400 font-mono truncate">
                    {typeof window !== 'undefined' ? `${window.location.origin}${inviteLink}` : inviteLink}
                  </code>
                  <button
                    onClick={() => {
                      const fullUrl = `${window.location.origin}${inviteLink}`;
                      navigator.clipboard.writeText(fullUrl);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                    className="p-2 bg-yellow-500/20 hover:bg-yellow-500/30 rounded-lg transition-colors shrink-0"
                  >
                    {copied ? (
                      <CheckCircle className="w-4 h-4 text-green-400" />
                    ) : (
                      <Copy className="w-4 h-4 text-yellow-400" />
                    )}
                  </button>
                </div>
              </div>

              {/* Share on X to invite creator */}
              <button
                onClick={() => {
                  const fullUrl = `${window.location.origin}${inviteLink}`;
                  const creatorName = dare.streamerHandle || 'there';
                  const text = `Hey ${creatorName}! Someone put up a $${dare.bounty.toLocaleString()} USDC bounty for you:\n\n"${dare.title}"\n\nClaim your tag to accept it 👇\n\n#BaseDare`;
                  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(fullUrl)}`;
                  window.open(twitterUrl, '_blank', 'width=550,height=420');
                }}
                className="w-full py-4 bg-[#FACC15] hover:bg-[#FDE047] text-black font-black text-lg uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-3 relative overflow-hidden"
              >
                <Share2 className="w-5 h-5" />
                Invite Creator on X
              </button>

              <p className="text-center text-[10px] text-white/30 mt-3 font-mono">
                Tag them so they can claim their bounty!
              </p>
            </div>
          )}

          {/* Request to Claim Button for Open Dares */}
          {isOpenDare && !isExpired && !isVerified && dare.status === 'PENDING' && !dare.claimRequestStatus && (
            <div className="p-6 border-t border-white/[0.06]">
              {isConnected ? (
                <>
                  <button
                    onClick={handleClaimRequest}
                    disabled={claimLoading}
                    className="w-full py-4 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-400 hover:to-emerald-400 text-white font-black text-lg uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                  >
                    {claimLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Hand className="w-5 h-5" />
                    )}
                    {claimLoading ? 'Submitting...' : 'Request to Claim'}
                  </button>

                  {claimError && (
                    <div className="mt-3 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                      <p className="text-xs text-red-400">{claimError}</p>
                    </div>
                  )}

                  {claimSuccess && (
                    <div className="mt-3 p-3 bg-green-500/10 border border-green-500/30 rounded-lg flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />
                      <p className="text-xs text-green-400">Claim request submitted! Awaiting moderator approval.</p>
                    </div>
                  )}

                  <p className="text-center text-[10px] text-white/30 mt-3 font-mono">
                    A moderator will review and approve your request.
                  </p>
                </>
              ) : (
                <div className="text-center p-4 bg-white/5 rounded-xl border border-white/10">
                  <Hand className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-400 mb-1">Open Bounty</p>
                  <p className="text-xs text-gray-500">Connect your wallet to request claiming this dare</p>
                </div>
              )}
            </div>
          )}

          {/* Upload Proof UI */}
          {!isExpired && !isVerified && !isAwaitingClaim && dare.status === 'PENDING' && isConnected && (
            <div className="p-6 border-t border-white/[0.06]">
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle className="w-5 h-5 text-purple-400" />
                <span className="text-sm font-bold text-white uppercase tracking-wider">Submit Proof</span>
              </div>
              <p className="text-xs text-gray-400 mb-4">Upload a video or image proving you completed the dare.</p>

              <div className="space-y-4">
                <input
                  type="file"
                  accept="video/*,image/*"
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  className="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border file:border-white/10 file:text-sm file:font-semibold file:bg-white/5 file:text-white hover:file:bg-white/10 transition-colors cursor-pointer"
                />

                <button
                  onClick={handleUpload}
                  disabled={!uploadFile || uploading}
                  className="w-full py-4 bg-purple-600 hover:bg-purple-500 text-white font-black text-lg uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Uploading to IPFS...</span>
                    </>
                  ) : (
                    <span>Upload & Submit</span>
                  )}
                </button>

                {uploadError && (
                  <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                    <p className="text-xs text-red-400">{uploadError}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Pledge Button */}
          {!isExpired && !isVerified && !isAwaitingClaim && (
            <div className="p-6 border-t border-white/[0.06]">
              <div className="relative group p-[1.5px] rounded-xl overflow-hidden">
                <div
                  className="absolute inset-[-100%] bg-[conic-gradient(from_0deg,#78350f_0%,#facc15_25%,#78350f_50%,#facc15_75%,#78350f_100%)] opacity-80 group-hover:animate-[spin_2s_linear_infinite] transition-opacity duration-500"
                  aria-hidden="true"
                />
                <button
                  onClick={() => {
                    const pledgeUrl = referrer
                      ? `/create?pledge=${shortId}&ref=${encodeURIComponent(referrer)}`
                      : `/create?pledge=${shortId}`;
                    router.push(pledgeUrl);
                  }}
                  className="relative w-full py-4 bg-[#FACC15] text-black font-black text-lg uppercase tracking-wider rounded-[10px] transition-all hover:bg-[#FDE047] flex items-center justify-center"
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-white/20 pointer-events-none rounded-[10px]" />
                  <span className="relative">Add to Bounty Pool</span>
                </button>
              </div>
              {referrer && (
                <p className="text-center text-[10px] text-purple-400 mt-2 font-mono">
                  Referred by {referrer}
                </p>
              )}
              <p className="text-center text-[10px] text-white/30 mt-3 font-mono">
                Increase the stakes. Make them sweat.
              </p>
            </div>
          )}

          {/* Add to Bounty Pool for Awaiting Claim dares */}
          {isAwaitingClaim && (
            <div className="p-6 border-t border-white/[0.06]">
              <button
                onClick={() => {
                  const pledgeUrl = referrer
                    ? `/create?pledge=${shortId}&ref=${encodeURIComponent(referrer)}`
                    : `/create?pledge=${shortId}`;
                  router.push(pledgeUrl);
                }}
                className="w-full py-4 bg-white/[0.03] hover:bg-white/[0.06] backdrop-blur-md border border-white/[0.06] text-white font-bold text-sm uppercase tracking-wider rounded-xl transition-all shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]"
              >
                Add More to Bounty Pool
              </button>
            </div>
          )}

          {/* Verified - Show Proof */}
          {isVerified && dare.videoUrl && (
            <div className="p-6 border-t border-white/[0.06]">
              <a
                href={dare.videoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-black font-black text-lg uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2"
              >
                <span>View Proof</span>
                <span>👁️</span>
              </a>
            </div>
          )}
        </motion.div>
      </div>
    </main>
  );
}
