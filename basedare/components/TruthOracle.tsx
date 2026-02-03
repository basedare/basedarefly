'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { CheckCircle, XCircle, BrainCircuit, Activity, SkipForward, Loader2, AlertCircle, Wallet } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAccount } from 'wagmi';
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

export default function TruthOracle({ onPointsChange }: TruthOracleProps) {
  const { address, isConnected } = useAccount();

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

  // Fetch voting queue
  const fetchQueue = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const walletParam = address ? `&wallet=${address.toLowerCase()}` : '';
      const res = await fetch(`/api/verify/queue?limit=20${walletParam}`);
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
  }, [address]);

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

    setVoting(true);
    setIsTxOpen(true);
    setTxStatus('PROCESSING');

    try {
      const res = await fetch(`/api/dares/${currentDare.id}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
    // Find next unvoted dare
    const nextUnvoted = queue.findIndex(
      (d, idx) => idx > currentIndex && !d.userVote
    );
    if (nextUnvoted >= 0) {
      setCurrentIndex(nextUnvoted);
    } else if (currentIndex < queue.length - 1) {
      setCurrentIndex((prev) => prev + 1);
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
      <div className="w-full max-w-6xl mx-auto rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-2xl shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.04)] overflow-hidden relative min-h-[400px] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          <span className="text-sm text-gray-400 font-mono">Loading voting queue...</span>
        </div>
      </div>
    );
  }

  // Empty state
  if (!currentDare || queue.length === 0) {
    return (
      <div className="w-full max-w-6xl mx-auto rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-2xl shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.04)] overflow-hidden relative min-h-[400px] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-center px-6">
          <CheckCircle className="w-12 h-12 text-green-500" />
          <h3 className="text-xl font-bold text-white">All Caught Up!</h3>
          <p className="text-sm text-gray-400 font-mono max-w-md">
            No dares currently need verification. Check back soon as creators submit proof for their challenges.
          </p>
          <button
            onClick={fetchQueue}
            className="mt-4 px-6 py-2 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/40 text-blue-400 rounded-lg text-sm font-mono transition-colors"
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
      <div className="w-full max-w-6xl mx-auto rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-2xl shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.04)] overflow-hidden relative">
        {/* Top highlight */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-500/30 to-transparent" />

        {/* HEADER */}
        <div className="p-3 sm:p-4 border-b border-white/[0.06] flex flex-wrap sm:flex-nowrap justify-between items-center gap-2 bg-black/40">
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

        <div className="grid grid-cols-1 lg:grid-cols-3">

          {/* LEFT: EVIDENCE VIEWER */}
          <div className="lg:col-span-2 lg:border-r border-b lg:border-b-0 border-white/10 bg-black/60 relative group min-h-[250px] sm:min-h-[350px] lg:min-h-[400px]">
            <div className="relative h-full w-full overflow-hidden flex items-center justify-center bg-black/80">
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
              <div className="absolute top-2 left-2 sm:top-4 sm:left-4 bg-black/80 backdrop-blur-md border border-yellow-500/30 px-3 py-1.5 rounded-lg">
                <span className="text-yellow-400 font-black text-lg">${currentDare.bounty.toLocaleString()}</span>
                <span className="text-yellow-400/60 text-xs ml-1">USDC</span>
              </div>
            </div>

            <div className="p-3 sm:p-6 border-t border-white/10 bg-[#050505]">
              <h3 className="font-bold text-white text-base sm:text-xl mb-1 flex items-center gap-2 flex-wrap">
                <span>&quot;{currentDare.title}&quot;</span>
              </h3>
              <div className="text-xs sm:text-sm text-gray-400 font-mono">
                Submitted by {currentDare.streamerHandle || 'Anonymous'} • {new Date(currentDare.createdAt).toLocaleDateString()}
              </div>
            </div>
          </div>

          {/* RIGHT: VOTING TERMINAL */}
          <div className="p-4 sm:p-6 flex flex-col bg-[#050505]">

            {/* AI INSIGHT BOX */}
            <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-purple-900/10 border border-purple-500/20 rounded-xl relative overflow-hidden">
              <div className="flex items-center gap-2 mb-2">
                <Activity className="w-4 h-4 text-purple-400 flex-shrink-0" />
                <span className="text-[10px] sm:text-xs font-bold text-purple-300 uppercase">Verification Task</span>
              </div>
              <p className="text-[9px] sm:text-[10px] text-gray-400 font-mono leading-relaxed">
                Review the proof above. Does it show completion of &quot;{currentDare.title}&quot;? Vote PASS if the dare was completed, FAIL if the proof is insufficient or fraudulent.
              </p>
            </div>

            {/* CONSENSUS & VOTE COUNT */}
            <div className="mb-4 sm:mb-6">
              <div className="flex justify-between text-[9px] sm:text-[10px] font-bold uppercase text-gray-500 mb-2">
                <span>Community Consensus</span>
                <span className="text-white">{consensusPercent}% Pass</span>
              </div>
              <div className="h-2 bg-gray-800 rounded-full overflow-hidden flex mb-2">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${consensusPercent}%` }}
                  transition={{ duration: 0.5 }}
                  className="bg-blue-500 h-full shadow-[0_0_10px_#3b82f6]"
                />
              </div>
              <div className="flex gap-2 text-[9px] sm:text-[10px] font-mono text-gray-500">
                <span className="text-blue-400 font-bold">{currentDare.votes.total} VOTES</span>
                <span>•</span>
                <span>{currentDare.votes.total >= 10 ? 'QUORUM MET' : `${10 - currentDare.votes.total} more needed`}</span>
              </div>
            </div>

            {/* Error Display */}
            {error && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                <span className="text-xs text-red-400 font-mono">{error}</span>
              </div>
            )}

            {/* VOTING BUTTONS */}
            <div className="mt-auto space-y-2 sm:space-y-3">
              {!isConnected ? (
                <div className="text-center py-6 sm:py-8 bg-white/5 rounded-xl border border-white/10">
                  <Wallet className="w-6 h-6 sm:w-8 sm:h-8 text-blue-400 mx-auto mb-2" />
                  <h3 className="text-white font-bold text-[10px] sm:text-xs tracking-widest mb-2">CONNECT WALLET TO VOTE</h3>
                  <p className="text-[9px] sm:text-[10px] text-gray-500 font-mono">Earn points for accurate votes</p>
                </div>
              ) : voted ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-6 sm:py-8 bg-white/5 rounded-xl border border-white/10"
                >
                  <CheckCircle className="w-6 h-6 sm:w-8 sm:h-8 text-green-500 mx-auto mb-2" />
                  <h3 className="text-white font-bold text-[10px] sm:text-xs tracking-widest">VOTE SECURED</h3>
                  <p className="text-[9px] sm:text-[10px] text-gray-500 font-mono mt-1">
                    You voted: <span className={voteColor}>{voteLabel}</span>
                  </p>
                  {pointsAwarded > 0 && (
                    <p className="text-[9px] sm:text-[10px] text-blue-400 font-mono mt-1">+{pointsAwarded} points earned</p>
                  )}
                  <button
                    onClick={handleNextAfterVote}
                    className="mt-4 px-6 py-2 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/40 text-blue-400 rounded-lg text-xs font-mono transition-colors"
                  >
                    Next Dare
                  </button>
                </motion.div>
              ) : (
                <>
                  {/* Vote Pass - Liquid Metal Button */}
                  <div className="relative group p-[1.5px] rounded-xl overflow-hidden">
                    <div
                      className="absolute inset-[-100%] bg-[conic-gradient(from_0deg,#052e16_0%,#22c55e_25%,#052e16_50%,#22c55e_75%,#052e16_100%)] opacity-50 group-hover:opacity-100 group-hover:animate-[spin_3s_linear_infinite] transition-opacity duration-500"
                      aria-hidden="true"
                    />
                    <button
                      onClick={() => handleVote('APPROVE')}
                      disabled={voting}
                      className="relative w-full py-3 sm:py-4 bg-[#050505] backdrop-blur-xl rounded-[10px] text-green-500 font-black uppercase text-xs sm:text-sm tracking-wider transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <div className="absolute inset-0 bg-gradient-to-tr from-green-500/10 via-transparent to-green-500/5 pointer-events-none rounded-[10px]" />
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

                  {/* Vote Fail - Liquid Metal Button */}
                  <div className="relative group p-[1.5px] rounded-xl overflow-hidden">
                    <div
                      className="absolute inset-[-100%] bg-[conic-gradient(from_0deg,#450a0a_0%,#ef4444_25%,#450a0a_50%,#ef4444_75%,#450a0a_100%)] opacity-50 group-hover:opacity-100 group-hover:animate-[spin_3s_linear_infinite] transition-opacity duration-500"
                      aria-hidden="true"
                    />
                    <button
                      onClick={() => handleVote('REJECT')}
                      disabled={voting}
                      className="relative w-full py-3 sm:py-4 bg-[#050505] backdrop-blur-xl rounded-[10px] text-red-500 font-black uppercase text-xs sm:text-sm tracking-wider transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <div className="absolute inset-0 bg-gradient-to-tr from-red-500/10 via-transparent to-red-500/5 pointer-events-none rounded-[10px]" />
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
                    className="w-full py-2 text-gray-500 hover:text-gray-400 text-xs font-mono uppercase tracking-wider transition-colors flex items-center justify-center gap-2 disabled:opacity-30"
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
