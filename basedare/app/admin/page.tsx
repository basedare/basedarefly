'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAccount } from 'wagmi';
import {
  Shield,
  CheckCircle,
  XCircle,
  Loader2,
  AlertTriangle,
  Play,
  Users,
  DollarSign,
  Clock,
  Lock,
} from 'lucide-react';
import LiquidBackground from '@/components/LiquidBackground';
import GradualBlurOverlay from '@/components/GradualBlurOverlay';

interface DareForModeration {
  id: string;
  shortId: string | null;
  title: string;
  bounty: number;
  streamerHandle: string | null;
  status: string;
  videoUrl: string | null;
  claimedBy: string | null;
  targetWalletAddress: string | null;
  createdAt: string;
  votes: {
    approve: number;
    reject: number;
    total: number;
    approvePercent: number;
  };
  readyForDecision: boolean;
  voteThreshold: number;
}

export default function AdminPage() {
  const { address, isConnected } = useAccount();
  const [dares, setDares] = useState<DareForModeration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [moderating, setModerating] = useState<string | null>(null);
  const [selectedDare, setSelectedDare] = useState<DareForModeration | null>(null);
  const [moderateNote, setModerateNote] = useState('');

  // Fetch moderation queue
  const fetchQueue = useCallback(async () => {
    if (!address) return;

    try {
      setLoading(true);
      setError(null);

      const res = await fetch('/api/admin/moderate', {
        headers: {
          'x-moderator-wallet': address,
        },
      });

      const data = await res.json();

      if (data.success) {
        setIsAuthorized(true);
        setDares(data.data.dares);
      } else if (res.status === 401) {
        setIsAuthorized(false);
        setError('Your wallet is not authorized as a moderator');
      } else {
        setError(data.error || 'Failed to load moderation queue');
      }
    } catch {
      setError('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => {
    if (isConnected && address) {
      fetchQueue();
    } else {
      setLoading(false);
    }
  }, [isConnected, address, fetchQueue]);

  // Handle moderation decision
  const handleModerate = async (dareId: string, decision: 'APPROVE' | 'REJECT') => {
    if (!address) return;

    setModerating(dareId);

    try {
      const res = await fetch('/api/admin/moderate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-moderator-wallet': address,
        },
        body: JSON.stringify({
          dareId,
          decision,
          note: moderateNote || undefined,
        }),
      });

      const data = await res.json();

      if (data.success) {
        // Remove from list
        setDares((prev) => prev.filter((d) => d.id !== dareId));
        setSelectedDare(null);
        setModerateNote('');
      } else {
        setError(data.error || 'Failed to moderate');
      }
    } catch {
      setError('Failed to submit moderation decision');
    } finally {
      setModerating(null);
    }
  };

  const formatAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  return (
    <div className="relative min-h-screen flex flex-col">
      <LiquidBackground />
      <div className="fixed inset-0 z-10 pointer-events-none">
        <GradualBlurOverlay />
      </div>

      <div className="container mx-auto px-4 sm:px-6 py-20 sm:py-24 flex-grow relative z-20 max-w-6xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-full px-4 py-2 mb-4">
            <Shield className="w-4 h-4 text-red-400" />
            <span className="text-sm text-red-400 font-medium tracking-wide">ADMIN PANEL</span>
          </div>

          <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight mb-3">
            Moderation{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-orange-400">
              Queue
            </span>
          </h1>
          <p className="text-gray-400 font-mono text-sm max-w-md mx-auto">
            Review community votes and make final decisions on disputed dares
          </p>
        </div>

        {/* Not Connected State */}
        {!isConnected && (
          <div className="backdrop-blur-xl bg-yellow-500/5 border border-yellow-500/30 rounded-2xl p-8 text-center">
            <Lock className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Connect Wallet</h3>
            <p className="text-gray-400 text-sm">
              Connect your moderator wallet to access the admin panel
            </p>
          </div>
        )}

        {/* Not Authorized State */}
        {isConnected && !loading && !isAuthorized && (
          <div className="backdrop-blur-xl bg-red-500/5 border border-red-500/30 rounded-2xl p-8 text-center">
            <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Not Authorized</h3>
            <p className="text-gray-400 text-sm mb-4">
              Your wallet ({address && formatAddress(address)}) is not registered as a moderator.
            </p>
            <p className="text-gray-500 text-xs font-mono">
              Add your wallet to MODERATOR_WALLETS in .env.local
            </p>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
          </div>
        )}

        {/* Error State */}
        {error && !loading && isAuthorized && (
          <div className="backdrop-blur-xl bg-red-500/5 border border-red-500/30 rounded-2xl p-4 mb-6">
            <div className="flex items-center gap-3">
              <XCircle className="w-5 h-5 text-red-400" />
              <span className="text-red-400 text-sm">{error}</span>
            </div>
          </div>
        )}

        {/* Authorized Content */}
        {isConnected && isAuthorized && !loading && (
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Queue List */}
            <div className="backdrop-blur-xl bg-black/20 border border-white/10 rounded-2xl p-6">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-400" />
                Pending Review ({dares.length})
              </h3>

              {dares.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-4" />
                  <p className="text-gray-400">All caught up! No dares pending review.</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                  {dares.map((dare) => (
                    <div
                      key={dare.id}
                      onClick={() => setSelectedDare(dare)}
                      className={`p-4 rounded-xl border cursor-pointer transition-all ${
                        selectedDare?.id === dare.id
                          ? 'bg-purple-500/10 border-purple-500/50'
                          : 'bg-white/5 border-white/10 hover:bg-white/10'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <h4 className="font-bold text-white text-sm line-clamp-1">{dare.title}</h4>
                        <span
                          className={`px-2 py-1 text-[10px] font-bold uppercase rounded ${
                            dare.status === 'PENDING_REVIEW'
                              ? 'bg-orange-500/20 text-orange-400'
                              : 'bg-yellow-500/20 text-yellow-400'
                          }`}
                        >
                          {dare.status}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="text-gray-400">
                          {dare.streamerHandle || '@everyone'}
                        </span>
                        <span className="text-[#FFD700] font-bold">${dare.bounty}</span>
                      </div>

                      {/* Vote Bar */}
                      <div className="mt-3">
                        <div className="flex items-center justify-between text-[10px] text-gray-400 mb-1">
                          <span className="text-green-400">{dare.votes.approve} pass</span>
                          <span className="text-red-400">{dare.votes.reject} fail</span>
                        </div>
                        <div className="h-2 bg-white/10 rounded-full overflow-hidden flex">
                          {dare.votes.total > 0 && (
                            <>
                              <div
                                className="h-full bg-green-500"
                                style={{ width: `${dare.votes.approvePercent}%` }}
                              />
                              <div
                                className="h-full bg-red-500"
                                style={{ width: `${100 - dare.votes.approvePercent}%` }}
                              />
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Selected Dare Details */}
            <div className="backdrop-blur-xl bg-black/20 border border-white/10 rounded-2xl p-6">
              {selectedDare ? (
                <>
                  <h3 className="text-lg font-bold text-white mb-4">Review Dare</h3>

                  {/* Video Preview */}
                  {selectedDare.videoUrl && (
                    <div className="mb-4 rounded-xl overflow-hidden bg-black/40 aspect-video flex items-center justify-center">
                      <a
                        href={selectedDare.videoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-purple-400 hover:text-purple-300"
                      >
                        <Play className="w-8 h-8" />
                        <span className="text-sm font-mono">View Proof</span>
                      </a>
                    </div>
                  )}

                  {/* Details */}
                  <div className="space-y-3 mb-6">
                    <div className="p-3 bg-white/5 rounded-lg">
                      <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Mission</p>
                      <p className="text-white font-bold">{selectedDare.title}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 bg-white/5 rounded-lg">
                        <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Bounty</p>
                        <p className="text-[#FFD700] font-bold flex items-center gap-1">
                          <DollarSign className="w-4 h-4" />
                          {selectedDare.bounty} USDC
                        </p>
                      </div>
                      <div className="p-3 bg-white/5 rounded-lg">
                        <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Votes</p>
                        <p className="text-white font-bold">
                          {selectedDare.votes.total} / {selectedDare.voteThreshold} threshold
                        </p>
                      </div>
                    </div>

                    <div className="p-3 bg-white/5 rounded-lg">
                      <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">
                        Community Verdict
                      </p>
                      <div className="flex items-center gap-4">
                        <span className="text-green-400 font-bold">
                          {selectedDare.votes.approvePercent}% Pass
                        </span>
                        <span className="text-red-400 font-bold">
                          {100 - selectedDare.votes.approvePercent}% Fail
                        </span>
                      </div>
                    </div>

                    {selectedDare.targetWalletAddress && (
                      <div className="p-3 bg-white/5 rounded-lg">
                        <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">
                          Payout To
                        </p>
                        <p className="text-purple-400 font-mono text-sm">
                          {formatAddress(selectedDare.targetWalletAddress)}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Moderator Note */}
                  <div className="mb-4">
                    <label className="text-xs text-gray-400 uppercase tracking-wider block mb-2">
                      Note (optional)
                    </label>
                    <textarea
                      value={moderateNote}
                      onChange={(e) => setModerateNote(e.target.value)}
                      placeholder="Add a note about your decision..."
                      className="w-full p-3 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder-gray-500 focus:border-purple-500/50 focus:outline-none resize-none"
                      rows={2}
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => handleModerate(selectedDare.id, 'REJECT')}
                      disabled={moderating === selectedDare.id}
                      className="flex items-center justify-center gap-2 px-4 py-3 bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 text-red-400 font-bold text-sm uppercase tracking-wider rounded-xl transition-colors disabled:opacity-50"
                    >
                      {moderating === selectedDare.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <XCircle className="w-4 h-4" />
                      )}
                      Reject
                    </button>
                    <button
                      onClick={() => handleModerate(selectedDare.id, 'APPROVE')}
                      disabled={moderating === selectedDare.id}
                      className="flex items-center justify-center gap-2 px-4 py-3 bg-green-500/20 hover:bg-green-500/30 border border-green-500/50 text-green-400 font-bold text-sm uppercase tracking-wider rounded-xl transition-colors disabled:opacity-50"
                    >
                      {moderating === selectedDare.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <CheckCircle className="w-4 h-4" />
                      )}
                      Approve
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center h-full min-h-[400px]">
                  <div className="text-center">
                    <Clock className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                    <p className="text-gray-400">Select a dare to review</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
