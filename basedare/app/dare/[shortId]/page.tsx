'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Share2, Clock, Copy, CheckCircle } from 'lucide-react';
import BountyQRCode from '@/components/BountyQRCode';
import LiquidBackground from '@/components/LiquidBackground';

function shareDareOnX(dare: { title: string; bounty: number; streamerHandle: string }, shortId: string) {
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://basedare.xyz';
  const dareUrl = `${baseUrl}/dare/${shortId}`;

  const text = `🎯 $${dare.bounty.toLocaleString()} USDC bounty on @${dare.streamerHandle.replace('@', '')}

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
  streamerHandle: string;
  status: string;
  expiresAt: string | null;
  videoUrl: string | null;
  // Invite flow fields
  inviteToken: string | null;
  claimDeadline: string | null;
  targetWalletAddress: string | null;
  awaitingClaim: boolean;
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

  const [dare, setDare] = useState<DareDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState('');
  const [copied, setCopied] = useState(false);

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
      } catch (err) {
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

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-white/60 font-mono text-sm">Loading bounty...</p>
        </div>
      </div>
    );
  }

  if (error || !dare) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
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
  const inviteLink = isAwaitingClaim && dare.inviteToken
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
    <main className="min-h-screen bg-black relative overflow-hidden">
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
          className="bg-black/60 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden"
        >
          {/* Header */}
          <div className="p-6 border-b border-white/10">
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
              <span className="font-mono text-sm">{dare.streamerHandle.replace('@', '')}</span>
            </div>
          </div>

          {/* Bounty Amount */}
          <div className="p-8 flex flex-col items-center border-b border-white/10 bg-gradient-to-b from-purple-500/5 to-transparent">
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

          {/* Share on X Button */}
          <div className="p-6 border-b border-white/10">
            <button
              onClick={() => shareDareOnX(dare, shortId)}
              className="w-full py-4 bg-black hover:bg-zinc-900 border border-white/20 text-white font-bold text-sm uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-3 group"
            >
              <Share2 className="w-5 h-5 group-hover:scale-110 transition-transform" />
              <span>Share on X</span>
            </button>
            <p className="text-center text-[10px] text-white/30 mt-3 font-mono">
              Spread the dare. Build the pot.
            </p>
          </div>

          {/* QR Code */}
          <div className="p-8 flex flex-col items-center">
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
            <div className="p-6 border-t border-white/10 bg-gradient-to-b from-yellow-500/5 to-transparent">
              <div className="flex items-center gap-3 mb-4">
                <Clock className="w-5 h-5 text-yellow-400" />
                <span className="text-sm font-bold text-yellow-400 uppercase tracking-wider">
                  Creator Not Yet Claimed
                </span>
              </div>

              <p className="text-sm text-gray-300 mb-4">
                {dare.streamerHandle} hasn&apos;t claimed their tag yet. Share the invite link
                to let them know about this bounty!
              </p>

              {/* Invite Link */}
              <div className="mb-4 p-3 bg-black/40 rounded-xl border border-yellow-500/20">
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
                  const text = `Hey ${dare.streamerHandle}! Someone put up a $${dare.bounty.toLocaleString()} USDC bounty for you:\n\n"${dare.title}"\n\nClaim your tag to accept it 👇\n\n#BaseDare`;
                  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(fullUrl)}`;
                  window.open(twitterUrl, '_blank', 'width=550,height=420');
                }}
                className="w-full py-4 bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-500 hover:to-yellow-400 text-black font-black text-lg uppercase tracking-wider rounded-xl transition-all shadow-[0_0_30px_rgba(234,179,8,0.3)] hover:shadow-[0_0_40px_rgba(234,179,8,0.5)] flex items-center justify-center gap-3"
              >
                <Share2 className="w-5 h-5" />
                Invite Creator on X
              </button>

              <p className="text-center text-[10px] text-white/30 mt-3 font-mono">
                Tag them so they can claim their bounty!
              </p>
            </div>
          )}

          {/* Pledge Button */}
          {!isExpired && !isVerified && !isAwaitingClaim && (
            <div className="p-6 border-t border-white/10">
              <button
                onClick={() => {
                  // Include referral if present
                  const pledgeUrl = referrer
                    ? `/create?pledge=${shortId}&ref=${encodeURIComponent(referrer)}`
                    : `/create?pledge=${shortId}`;
                  router.push(pledgeUrl);
                }}
                className="w-full py-4 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white font-black text-lg uppercase tracking-wider rounded-xl transition-all shadow-[0_0_30px_rgba(239,68,68,0.3)] hover:shadow-[0_0_40px_rgba(239,68,68,0.5)]"
              >
                Add to Bounty Pool
              </button>
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
            <div className="p-6 border-t border-white/10">
              <button
                onClick={() => {
                  const pledgeUrl = referrer
                    ? `/create?pledge=${shortId}&ref=${encodeURIComponent(referrer)}`
                    : `/create?pledge=${shortId}`;
                  router.push(pledgeUrl);
                }}
                className="w-full py-4 bg-white/5 hover:bg-white/10 border border-white/20 text-white font-bold text-sm uppercase tracking-wider rounded-xl transition-all"
              >
                Add More to Bounty Pool
              </button>
            </div>
          )}

          {/* Verified - Show Proof */}
          {isVerified && dare.videoUrl && (
            <div className="p-6 border-t border-white/10">
              <a
                href={dare.videoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-4 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-black text-lg uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 shadow-[0_0_30px_rgba(16,185,129,0.3)]"
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
