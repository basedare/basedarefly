'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { CheckCircle, XCircle, BrainCircuit, Activity, SkipForward, Loader2, AlertCircle, Wallet } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAccount } from 'wagmi';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import TransactionModal from "@/components/TransactionModal";

interface DareForVoting {
  id: string;
  shortId: string | null;
  title: string;
  bounty: number;
  streamerHandle: string | null;
  videoUrl: string | null;
  createdAt: string;
  votes: {
    approve: number;
    reject: number;
    total: number;
  };
  userVote: 'APPROVE' | 'REJECT' | null;
}

interface TruthOracleProps {
  onPointsChange?: () => void;
}

const oracleShellClass =
  'w-full max-w-6xl mx-auto relative overflow-hidden rounded-[28px] border border-white/[0.08] bg-[linear-gradient(155deg,rgba(255,255,255,0.08)_0%,rgba(255,255,255,0.03)_18%,rgba(8,8,14,0.92)_62%,rgba(5,5,9,0.98)_100%)] shadow-[0_0_0_1px_rgba(255,255,255,0.02),0_30px_60px_rgba(0,0,0,0.42),0_0_40px_rgba(59,130,246,0.05),inset_0_1px_0_rgba(255,255,255,0.1),inset_0_-20px_28px_rgba(0,0,0,0.3)]';

const oracleStatePanelClass =
  'relative overflow-hidden rounded-[24px] border border-white/[0.08] bg-[linear-gradient(155deg,rgba(255,255,255,0.06)_0%,rgba(255,255,255,0.03)_18%,rgba(9,8,15,0.92)_68%,rgba(8,7,12,0.97)_100%)] px-6 py-10 shadow-[0_0_0_1px_rgba(255,255,255,0.02),0_18px_34px_rgba(0,0,0,0.34),inset_0_1px_0_rgba(255,255,255,0.08),inset_0_-12px_18px_rgba(0,0,0,0.28)]';

function getVoteButtonFrameClass(tone: 'approve' | 'reject') {
  const toneClass =
    tone === 'approve'
      ? 'border-green-500/25 shadow-[0_0_0_1px_rgba(34,197,94,0.08),0_18px_28px_rgba(0,0,0,0.3),0_0_24px_rgba(34,197,94,0.08)]'
      : 'border-red-500/25 shadow-[0_0_0_1px_rgba(239,68,68,0.08),0_18px_28px_rgba(0,0,0,0.3),0_0_24px_rgba(239,68,68,0.08)]';

  return `group relative overflow-hidden rounded-2xl border bg-[linear-gradient(180deg,rgba(255,255,255,0.05)_0%,rgba(255,255,255,0.02)_10%,rgba(8,8,12,0.92)_100%)] p-[1.5px] transition-transform duration-200 hover:-translate-y-[1px] ${toneClass}`;
}

function getVoteButtonClass(tone: 'approve' | 'reject') {
  const toneClass =
    tone === 'approve'
      ? 'text-green-300 bg-[radial-gradient(circle_at_50%_0%,rgba(34,197,94,0.14),transparent_40%),linear-gradient(180deg,rgba(20,28,22,0.98)_0%,rgba(11,14,12,0.96)_100%)]'
      : 'text-red-300 bg-[radial-gradient(circle_at_50%_0%,rgba(239,68,68,0.14),transparent_40%),linear-gradient(180deg,rgba(28,18,18,0.98)_0%,rgba(13,10,10,0.96)_100%)]';

  return `relative w-full overflow-hidden rounded-[15px] border border-white/[0.05] px-4 py-4 text-xs font-black uppercase tracking-[0.24em] transition-all duration-200 active:translate-y-[1px] disabled:cursor-not-allowed disabled:opacity-40 ${toneClass} shadow-[inset_0_1px_0_rgba(255,255,255,0.12),inset_0_-10px_18px_rgba(0,0,0,0.36),0_8px_16px_rgba(0,0,0,0.2)]`;
}

export default function TruthOracle({ onPointsChange }: TruthOracleProps) {
  const { address, isConnected } = useAccount();
  const { data: session } = useSession();

  const [queue, setQueue] = useState<DareForVoting[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState(false);
  const [voted, setVoted] = useState<'APPROVE' | 'REJECT' | null>(null);
  const [pointsAwarded, setPointsAwarded] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const [isTxOpen, setIsTxOpen] = useState(false);
  const [txStatus, setTxStatus] = useState<'PROCESSING' | 'SUCCESS'>('PROCESSING');

  const currentDare = queue[currentIndex] || null;
  const sessionToken = (session as { token?: string } | null)?.token || null;
  const sessionWallet = ((session as { walletAddress?: string } | null)?.walletAddress || '').toLowerCase();
  const connectedWallet = (address || '').toLowerCase();
  const hasVerifiedSession = Boolean(
    isConnected &&
    connectedWallet &&
    sessionToken &&
    sessionWallet &&
    sessionWallet === connectedWallet
  );

  // Check if all dares have been voted on
  const allDaresVoted = queue.length > 0 && queue.every(d => d.userVote !== null);

  // Fetch voting queue
  const fetchQueue = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const walletParam = hasVerifiedSession ? `&wallet=${connectedWallet}` : '';
      const res = await fetch(`/api/verify/queue?limit=20${walletParam}`, {
        headers: hasVerifiedSession && sessionToken
          ? { Authorization: `Bearer ${sessionToken}` }
          : undefined,
      });
      const data = await res.json();

      if (data.success) {
        setQueue(data.data.dares);
        // Find first dare user hasn't voted on
        const firstUnvoted = data.data.dares.findIndex(
          (d: DareForVoting) => !d.userVote
        );
        setCurrentIndex(firstUnvoted >= 0 ? firstUnvoted : 0);
      } else {
        setError(data.error || 'Failed to load voting queue');
      }
    } catch {
      setError('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  }, [connectedWallet, hasVerifiedSession, sessionToken]);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  // Reset voted state when changing dares
  const currentDareId = currentDare?.id;
  const currentUserVote = currentDare?.userVote;
  useEffect(() => {
    if (currentDareId) {
      setVoted(currentUserVote ?? null);
      setPointsAwarded(0);
    }
  }, [currentDareId, currentUserVote]);

  const handleVote = async (voteType: 'APPROVE' | 'REJECT') => {
    if (!isConnected || !address || !currentDare) return;

    if (!hasVerifiedSession || !sessionToken) {
      setError('Sign in with your verified BaseDare session to vote.');
      return;
    }

    setVoting(true);
    setIsTxOpen(true);
    setTxStatus('PROCESSING');

    try {
      const res = await fetch(`/api/dares/${currentDare.id}/vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({
          walletAddress: address,
          voteType,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setTxStatus('SUCCESS');
        setVoted(voteType);
        setPointsAwarded(data.data.pointsAwarded || 0);

        // Update queue with new vote counts
        setQueue((prev) =>
          prev.map((d) =>
            d.id === currentDare.id
              ? {
                  ...d,
                  votes: data.data.counts,
                  userVote: voteType,
                }
              : d
          )
        );

        // Notify parent of points change
        if (data.data.pointsAwarded > 0 && onPointsChange) {
          onPointsChange();
        }
      } else {
        setTxStatus('PROCESSING');
        setIsTxOpen(false);
        setError(data.error || 'Failed to submit vote');
      }
    } catch {
      setTxStatus('PROCESSING');
      setIsTxOpen(false);
      setError('Failed to submit vote');
    } finally {
      setVoting(false);
    }
  };

  const handleSkip = () => {
    if (currentIndex < queue.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setVoted(null);
      setPointsAwarded(0);
    }
  };

  const handleNextAfterVote = () => {
    setIsTxOpen(false);
    // Find next unvoted dare (starting from after current index)
    const nextUnvoted = queue.findIndex(
      (d, idx) => idx > currentIndex && !d.userVote
    );
    if (nextUnvoted >= 0) {
      setCurrentIndex(nextUnvoted);
    } else {
      // No unvoted dares after current index, check from beginning
      const anyUnvoted = queue.findIndex((d) => !d.userVote);
      if (anyUnvoted >= 0) {
        setCurrentIndex(anyUnvoted);
      }
      // If no unvoted dares at all, the allDaresVoted check will show "All Caught Up"
    }
    setVoted(null);
    setPointsAwarded(0);
  };

  // Get consensus percentage
  const consensusPercent =
    currentDare && currentDare.votes.total > 0
      ? Math.round((currentDare.votes.approve / currentDare.votes.total) * 100)
      : 50;

  // Vote display helpers
  const voteLabel = voted === 'APPROVE' ? 'PASS' : 'FAIL';
  const voteColor = voted === 'APPROVE' ? 'text-green-400' : 'text-red-400';

  // Loading state
  if (loading) {
    return (
      <div className={`${oracleShellClass} min-h-[420px] flex items-center justify-center`}>
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_14%_0%,rgba(59,130,246,0.12),transparent_36%),radial-gradient(circle_at_86%_100%,rgba(168,85,247,0.1),transparent_38%),linear-gradient(180deg,rgba(255,255,255,0.06)_0%,transparent_28%,transparent_72%,rgba(0,0,0,0.24)_100%)]" />
        <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />
        <div className={`${oracleStatePanelClass} flex flex-col items-center gap-4 text-center`}>
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          <div>
            <p className="text-[10px] font-mono uppercase tracking-[0.28em] text-white/35">Truth Terminal</p>
            <span className="mt-2 block text-sm text-gray-300 font-mono">Loading the community review queue...</span>
          </div>
        </div>
      </div>
    );
  }

  // Empty state - no dares OR all dares have been voted on
  if (!currentDare || queue.length === 0 || allDaresVoted) {
    return (
      <div className={`${oracleShellClass} min-h-[420px] flex items-center justify-center`}>
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_14%_0%,rgba(59,130,246,0.12),transparent_36%),radial-gradient(circle_at_86%_100%,rgba(168,85,247,0.1),transparent_38%),linear-gradient(180deg,rgba(255,255,255,0.06)_0%,transparent_28%,transparent_72%,rgba(0,0,0,0.24)_100%)]" />
        <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />
        <div className={`${oracleStatePanelClass} flex flex-col items-center gap-4 text-center px-6`}>
          <CheckCircle className="w-12 h-12 text-green-500" />
          <h3 className="text-xl font-bold text-white">All Caught Up!</h3>
          <p className="text-sm text-gray-400 font-mono max-w-md">
            {allDaresVoted && queue.length > 0
              ? `You've voted on all ${queue.length} dares in the queue. Check back soon for new submissions.`
              : 'No dares currently need verification. Check back soon as creators submit proof for their challenges.'}
          </p>
          <button
            onClick={fetchQueue}
            className="mt-4 rounded-full border border-blue-500/30 bg-[linear-gradient(180deg,rgba(96,165,250,0.16)_0%,rgba(37,99,235,0.08)_100%)] px-6 py-2 text-sm font-mono text-blue-300 shadow-[0_8px_18px_rgba(0,0,0,0.22),inset_0_1px_0_rgba(255,255,255,0.12),inset_0_-8px_14px_rgba(0,0,0,0.25)] transition-all hover:-translate-y-[1px] hover:border-blue-400/40 hover:text-blue-200"
          >
            Refresh Queue
          </button>
        </div>
      </div>
    );
  }

  // Determine if video or image
  const isVideo = currentDare.videoUrl?.match(/\.(mp4|webm|mov|m3u8)$/i) ||
    currentDare.videoUrl?.includes('livepeer') ||
    currentDare.videoUrl?.includes('video');

  return (
    <>
      <div className={oracleShellClass}>
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_14%_0%,rgba(59,130,246,0.12),transparent_36%),radial-gradient(circle_at_86%_100%,rgba(168,85,247,0.1),transparent_38%),linear-gradient(180deg,rgba(255,255,255,0.06)_0%,transparent_28%,transparent_72%,rgba(0,0,0,0.24)_100%)]" />
        <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />
        <div className="pointer-events-none absolute bottom-0 left-10 right-10 h-px bg-gradient-to-r from-transparent via-black/55 to-transparent" />

        {/* HEADER */}
        <div className="relative border-b border-white/[0.06] bg-[linear-gradient(180deg,rgba(0,0,0,0.3)_0%,rgba(0,0,0,0.55)_100%)] p-3 sm:p-4">
          <div className="pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-white/18 to-transparent" />
          <div className="flex flex-wrap sm:flex-nowrap justify-between items-center gap-2">
          <div className="flex items-center gap-2">
            <BrainCircuit className="w-4 h-4 text-purple-500 flex-shrink-0" />
            <span className="text-[10px] sm:text-xs font-mono text-white font-bold whitespace-nowrap">
              COMMUNITY VERIFY: <span className="text-green-400">LIVE</span>
            </span>
          </div>
          <div className="flex items-center gap-2 sm:gap-4 text-[9px] sm:text-[10px] font-mono text-gray-500 uppercase">
            <span>{queue.length} in queue</span>
            <span className="hidden sm:inline">#{currentIndex + 1}</span>
          </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3">

          {/* LEFT: EVIDENCE VIEWER */}
          <div className="lg:col-span-2 lg:border-r border-b lg:border-b-0 border-white/10 bg-[linear-gradient(180deg,rgba(4,4,8,0.92)_0%,rgba(2,2,5,0.98)_100%)] p-3 sm:p-4 lg:p-5 relative min-h-[250px] sm:min-h-[350px] lg:min-h-[400px]">
            <div className="relative h-full min-h-[250px] sm:min-h-[350px] lg:min-h-[400px] w-full overflow-hidden rounded-[24px] border border-white/[0.07] bg-[linear-gradient(160deg,rgba(15,15,22,0.98)_0%,rgba(7,7,11,0.98)_45%,rgba(2,2,3,1)_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),inset_0_-14px_24px_rgba(0,0,0,0.45),inset_10px_10px_24px_rgba(0,0,0,0.22),0_18px_28px_rgba(0,0,0,0.25)] flex items-center justify-center">
              <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/18 to-transparent" />
              {isVideo ? (
                <video
                  src={currentDare.videoUrl || ''}
                  controls
                  className="max-w-full max-h-full object-contain"
                  poster="/video-placeholder.png"
                />
              ) : (
                <img
                  src={currentDare.videoUrl || ''}
                  className="max-w-full max-h-full object-contain"
                  alt="Proof"
                />
              )}

              {/* Bounty Badge */}
              <div className="absolute top-3 left-3 sm:top-4 sm:left-4 overflow-hidden rounded-xl border border-yellow-500/25 bg-[linear-gradient(180deg,rgba(255,255,255,0.09)_0%,rgba(255,255,255,0.03)_16%,rgba(17,12,5,0.96)_100%)] px-3 py-2 backdrop-blur-md shadow-[0_12px_20px_rgba(0,0,0,0.28),inset_0_1px_0_rgba(255,255,255,0.12),inset_0_-10px_16px_rgba(0,0,0,0.28)]">
                <div className="pointer-events-none absolute inset-x-3 top-0 h-px bg-gradient-to-r from-transparent via-white/24 to-transparent" />
                <span className="text-yellow-300 font-black text-lg">${currentDare.bounty.toLocaleString()}</span>
                <span className="text-yellow-300/70 text-xs ml-1 uppercase tracking-widest">USDC</span>
              </div>
            </div>

            <div className="mt-3 rounded-[20px] border border-white/[0.06] bg-[linear-gradient(150deg,rgba(16,16,22,0.95)_0%,rgba(10,10,14,0.98)_100%)] p-4 sm:p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),inset_0_-12px_18px_rgba(0,0,0,0.3)]">
              <h3 className="font-bold text-white text-base sm:text-xl mb-1 flex items-center gap-2 flex-wrap">
                <span>&quot;{currentDare.title}&quot;</span>
              </h3>
              <div className="text-xs sm:text-sm text-gray-400 font-mono">
                Submitted by {currentDare.streamerHandle || 'Anonymous'} • {new Date(currentDare.createdAt).toLocaleDateString()}
              </div>
            </div>
          </div>

          {/* RIGHT: VOTING TERMINAL */}
          <div className="p-4 sm:p-6 flex flex-col bg-[linear-gradient(180deg,rgba(7,7,11,0.94)_0%,rgba(4,4,7,0.99)_100%)]">

            {/* AI INSIGHT BOX */}
            <div className="mb-4 sm:mb-6 relative overflow-hidden rounded-2xl border border-purple-500/20 bg-[radial-gradient(circle_at_50%_0%,rgba(168,85,247,0.14),transparent_42%),linear-gradient(160deg,rgba(18,12,29,0.96)_0%,rgba(11,10,18,0.98)_100%)] p-3 sm:p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),inset_0_-10px_18px_rgba(0,0,0,0.34),0_14px_22px_rgba(0,0,0,0.2)]">
              <div className="pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-white/18 to-transparent" />
              <div className="flex items-center gap-2 mb-2">
                <Activity className="w-4 h-4 text-purple-400 flex-shrink-0" />
                <span className="text-[10px] sm:text-xs font-bold text-purple-300 uppercase">Verification Task</span>
              </div>
              <p className="text-[9px] sm:text-[10px] text-gray-400 font-mono leading-relaxed">
                Review the proof above. Does it show completion of &quot;{currentDare.title}&quot;? Vote PASS if the dare was completed, FAIL if the proof is insufficient or fraudulent.
              </p>
              <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/30 px-3 py-1.5 text-[9px] font-mono uppercase tracking-[0.2em] text-white/55">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />
                Community signal feeds referee review
              </div>
            </div>

            {/* CONSENSUS & VOTE COUNT */}
            <div className="mb-4 sm:mb-6 relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[linear-gradient(155deg,rgba(255,255,255,0.05)_0%,rgba(255,255,255,0.02)_16%,rgba(11,10,17,0.96)_100%)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),inset_0_-10px_16px_rgba(0,0,0,0.3)]">
              <div className="pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-white/18 to-transparent" />
              <div className="mb-3 flex justify-between text-[9px] sm:text-[10px] font-bold uppercase text-gray-500">
                <span>Community Consensus</span>
                <span className="text-white">{consensusPercent}% Pass</span>
              </div>
              <div className="rounded-full border border-white/[0.06] bg-[linear-gradient(180deg,rgba(0,0,0,0.38)_0%,rgba(0,0,0,0.18)_100%)] p-1 shadow-[inset_0_2px_4px_rgba(0,0,0,0.4),inset_0_-2px_3px_rgba(255,255,255,0.03)]">
                <div className="relative h-3 overflow-hidden rounded-full bg-[linear-gradient(180deg,rgba(9,9,13,0.98)_0%,rgba(18,18,24,0.95)_100%)]">
                  <div className="pointer-events-none absolute inset-y-0 left-1/2 w-px bg-white/10" />
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${consensusPercent}%` }}
                    transition={{ duration: 0.5 }}
                    className="h-full rounded-full bg-[linear-gradient(90deg,rgba(59,130,246,0.76)_0%,rgba(96,165,250,0.95)_48%,rgba(56,189,248,0.9)_100%)] shadow-[0_0_16px_rgba(59,130,246,0.42)]"
                  />
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2 text-[9px] sm:text-[10px] font-mono text-gray-500">
                <span className="rounded-full border border-blue-500/20 bg-blue-500/10 px-2.5 py-1 text-blue-300 font-bold">{currentDare.votes.total} VOTES</span>
                <span>•</span>
                <span>{currentDare.votes.total >= 10 ? 'QUORUM MET' : `${10 - currentDare.votes.total} more needed`}</span>
              </div>
              <p className="mt-3 text-[9px] sm:text-[10px] font-mono uppercase tracking-[0.18em] text-white/38">
                Quorum surfaces signal. Final payout still waits on referee review.
              </p>
            </div>

            {/* Error Display */}
            {error && (
              <div className="mb-4 rounded-xl border border-red-500/30 bg-[linear-gradient(180deg,rgba(239,68,68,0.1)_0%,rgba(18,8,8,0.92)_100%)] p-3 flex items-center gap-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                <span className="text-xs text-red-400 font-mono">{error}</span>
              </div>
            )}

            {/* VOTING BUTTONS */}
            <div className="mt-auto space-y-2 sm:space-y-3">
              {!isConnected ? (
                <div className="relative overflow-hidden rounded-2xl border border-blue-500/20 bg-[radial-gradient(circle_at_50%_0%,rgba(59,130,246,0.16),transparent_40%),linear-gradient(160deg,rgba(13,17,29,0.96)_0%,rgba(8,10,16,0.98)_100%)] px-4 py-6 sm:px-5 sm:py-7 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.08),inset_0_-12px_18px_rgba(0,0,0,0.3),0_18px_28px_rgba(0,0,0,0.22)]">
                  <div className="pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-white/18 to-transparent" />
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-blue-400/20 bg-black/25 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                    <Wallet className="h-6 w-6 text-blue-300" />
                  </div>
                  <h3 className="text-white font-bold text-[10px] sm:text-xs tracking-[0.28em] mb-2">CONNECT WALLET</h3>
                  <p className="text-[9px] sm:text-[10px] text-gray-400 font-mono max-w-[250px] mx-auto">
                    Enter the truth terminal with a connected wallet before you can cast community signal.
                  </p>
                </div>
              ) : !hasVerifiedSession ? (
                <div className="relative overflow-hidden rounded-2xl border border-yellow-500/22 bg-[radial-gradient(circle_at_50%_0%,rgba(250,204,21,0.15),transparent_40%),linear-gradient(160deg,rgba(28,22,10,0.96)_0%,rgba(13,11,8,0.98)_100%)] px-4 py-6 sm:px-5 sm:py-7 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.08),inset_0_-12px_18px_rgba(0,0,0,0.3),0_18px_28px_rgba(0,0,0,0.22)]">
                  <div className="pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-white/18 to-transparent" />
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-yellow-400/20 bg-black/25 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                    <Wallet className="h-6 w-6 text-yellow-300" />
                  </div>
                  <h3 className="text-white font-bold text-[10px] sm:text-xs tracking-[0.28em] mb-2">IDENTITY GATE</h3>
                  <p className="text-[9px] sm:text-[10px] text-gray-400 font-mono max-w-[240px] mx-auto">
                    Connect the same wallet and BaseDare session before your signal can enter referee review.
                  </p>
                  <p className="mt-3 text-[9px] font-mono uppercase tracking-[0.18em] text-yellow-200/60">
                    Session + wallet must match
                  </p>
                  <Link
                    href="/claim-tag"
                    className="inline-flex mt-4 rounded-full border border-yellow-500/30 bg-[linear-gradient(180deg,rgba(250,204,21,0.18)_0%,rgba(161,98,7,0.1)_100%)] px-6 py-2 text-xs font-mono uppercase tracking-[0.2em] text-yellow-200 shadow-[0_10px_18px_rgba(0,0,0,0.22),inset_0_1px_0_rgba(255,255,255,0.12),inset_0_-8px_14px_rgba(0,0,0,0.24)] transition-all hover:-translate-y-[1px] hover:border-yellow-400/40"
                  >
                    Open Identity Gate
                  </Link>
                </div>
              ) : voted ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="relative overflow-hidden rounded-2xl border border-green-500/18 bg-[radial-gradient(circle_at_50%_0%,rgba(34,197,94,0.16),transparent_42%),linear-gradient(160deg,rgba(10,20,12,0.96)_0%,rgba(8,10,8,0.98)_100%)] px-4 py-6 sm:px-5 sm:py-7 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.08),inset_0_-12px_18px_rgba(0,0,0,0.3),0_18px_28px_rgba(0,0,0,0.22)]"
                >
                  <div className="pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-white/18 to-transparent" />
                  <CheckCircle className="w-6 h-6 sm:w-8 sm:h-8 text-green-500 mx-auto mb-2" />
                  <h3 className="text-white font-bold text-[10px] sm:text-xs tracking-[0.28em]">SIGNAL LOCKED</h3>
                  <p className="text-[9px] sm:text-[10px] text-gray-500 font-mono mt-1">
                    You voted: <span className={voteColor}>{voteLabel}</span>
                  </p>
                  {pointsAwarded > 0 && (
                    <p className="text-[9px] sm:text-[10px] text-blue-400 font-mono mt-1">+{pointsAwarded} points earned</p>
                  )}
                  <button
                    onClick={handleNextAfterVote}
                    className="mt-4 rounded-full border border-blue-500/30 bg-[linear-gradient(180deg,rgba(96,165,250,0.16)_0%,rgba(37,99,235,0.08)_100%)] px-6 py-2 text-xs font-mono uppercase tracking-[0.2em] text-blue-300 shadow-[0_10px_18px_rgba(0,0,0,0.22),inset_0_1px_0_rgba(255,255,255,0.12),inset_0_-8px_14px_rgba(0,0,0,0.25)] transition-all hover:-translate-y-[1px] hover:border-blue-400/40 hover:text-blue-200"
                  >
                    Next Dare
                  </button>
                </motion.div>
              ) : (
                <>
                  {/* Vote Pass */}
                  <div className={getVoteButtonFrameClass('approve')}>
                    <button
                      onClick={() => handleVote('APPROVE')}
                      disabled={voting}
                      className={getVoteButtonClass('approve')}
                    >
                      <div className="pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-white/18 to-transparent" />
                      <span className="relative z-10 flex items-center justify-center gap-2">
                        {voting ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <CheckCircle className="w-4 h-4" />
                            Pass
                          </>
                        )}
                      </span>
                    </button>
                  </div>

                  {/* Vote Fail */}
                  <div className={getVoteButtonFrameClass('reject')}>
                    <button
                      onClick={() => handleVote('REJECT')}
                      disabled={voting}
                      className={getVoteButtonClass('reject')}
                    >
                      <div className="pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-white/18 to-transparent" />
                      <span className="relative z-10 flex items-center justify-center gap-2">
                        {voting ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <XCircle className="w-4 h-4" />
                            Fail
                          </>
                        )}
                      </span>
                    </button>
                  </div>

                  {/* Skip Button */}
                  <button
                    onClick={handleSkip}
                    disabled={currentIndex >= queue.length - 1}
                    className="w-full rounded-full border border-white/10 bg-white/[0.02] px-4 py-2 text-gray-400 hover:text-gray-200 hover:border-white/16 text-xs font-mono uppercase tracking-[0.22em] transition-all flex items-center justify-center gap-2 disabled:opacity-30 disabled:hover:text-gray-400 disabled:hover:border-white/10"
                  >
                    <SkipForward className="w-3 h-3" />
                    Skip
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <TransactionModal
        isOpen={isTxOpen}
        status={txStatus}
        title="Submitting Vote"
        hash="community-vote"
        onClose={() => {
          setIsTxOpen(false);
          if (txStatus === 'SUCCESS') {
            handleNextAfterVote();
          }
        }}
      />
    </>
  );
}
