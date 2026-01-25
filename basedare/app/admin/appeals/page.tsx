'use client';

import React, { useState, useEffect } from 'react';
import { Shield, CheckCircle, XCircle, Clock, AlertTriangle, Loader2, Eye, ExternalLink } from 'lucide-react';
import LiquidBackground from '@/components/LiquidBackground';
import GradualBlurOverlay from '@/components/GradualBlurOverlay';

interface Appeal {
  id: string;
  shortId: string | null;
  title: string;
  bounty: number;
  streamerHandle: string;
  status: string;
  appealStatus: string | null;
  appealReason: string | null;
  appealedAt: string | null;
  verifyConfidence: number | null;
  proofHash: string | null;
  videoUrl: string | null;
  stakerAddress: string | null;
  createdAt: string;
  isSimulated: boolean;
}

interface AppealCounts {
  pending: number;
  approved: number;
  rejected: number;
  none: number;
}

export default function AdminAppealsPage() {
  const [appeals, setAppeals] = useState<Appeal[]>([]);
  const [counts, setCounts] = useState<AppealCounts>({ pending: 0, approved: 0, rejected: 0, none: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'PENDING' | 'APPROVED' | 'REJECTED' | 'ALL'>('PENDING');
  const [adminSecret, setAdminSecret] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [selectedAppeal, setSelectedAppeal] = useState<Appeal | null>(null);

  const fetchAppeals = async () => {
    if (!adminSecret) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/appeals?status=${filter}`, {
        headers: {
          'x-admin-secret': adminSecret,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          setIsAuthenticated(false);
          setError('Invalid admin secret');
        } else {
          setError(data.error || 'Failed to fetch appeals');
        }
        return;
      }

      setIsAuthenticated(true);
      setAppeals(data.data.appeals);
      setCounts(data.data.counts);
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchAppeals();
    }
  }, [filter, isAuthenticated]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    fetchAppeals();
  };

  const handleResolve = async (dareId: string, decision: 'APPROVED' | 'REJECTED') => {
    setProcessingId(dareId);

    try {
      const response = await fetch('/api/admin/appeals', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-secret': adminSecret,
        },
        body: JSON.stringify({ dareId, decision }),
      });

      const data = await response.json();

      if (data.success) {
        // Refresh the list
        fetchAppeals();
        setSelectedAppeal(null);
      } else {
        setError(data.error || 'Failed to resolve appeal');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setProcessingId(null);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleString();
  };

  const formatAddress = (addr: string | null) => {
    if (!addr) return 'Anonymous';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  // Login screen
  if (!isAuthenticated) {
    return (
      <div className="relative min-h-screen flex items-center justify-center">
        <LiquidBackground />
        <div className="fixed inset-0 z-10 pointer-events-none"><GradualBlurOverlay /></div>

        <div className="relative z-20 w-full max-w-md p-8">
          <div className="backdrop-blur-xl bg-black/40 border border-white/10 rounded-2xl p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center border border-purple-500/30">
                <Shield className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-white uppercase tracking-tight">Admin Access</h1>
                <p className="text-xs font-mono text-gray-400">Appeal Review System</p>
              </div>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-gray-400 uppercase tracking-wider mb-2">
                  Admin Secret
                </label>
                <input
                  type="password"
                  value={adminSecret}
                  onChange={(e) => setAdminSecret(e.target.value)}
                  placeholder="Enter admin secret..."
                  className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:border-purple-500/50 focus:outline-none font-mono"
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 px-3 py-2 rounded bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-mono">
                  <AlertTriangle className="w-4 h-4" />
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={!adminSecret || loading}
                className="w-full px-6 py-3 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-bold text-sm rounded-lg uppercase tracking-wider transition-colors flex items-center justify-center gap-2"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Shield className="w-4 h-4" />
                )}
                Access Appeals
              </button>
            </form>

            <p className="mt-6 text-[10px] font-mono text-gray-500 text-center">
              Secret configured in ADMIN_SECRET env var
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen">
      <LiquidBackground />
      <div className="fixed inset-0 z-10 pointer-events-none"><GradualBlurOverlay /></div>

      <div className="container mx-auto px-6 py-24 relative z-20">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8 border-b border-white/10 pb-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center border border-purple-500/30">
              <Shield className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-white uppercase tracking-tight">Appeal Review</h1>
              <p className="text-xs font-mono text-gray-400">Beta AI Referee Override System</p>
            </div>
          </div>

          {/* Stats */}
          <div className="flex gap-4">
            <div className="px-4 py-2 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
              <span className="text-xs font-mono text-yellow-400">{counts.pending} PENDING</span>
            </div>
            <div className="px-4 py-2 bg-green-500/10 border border-green-500/30 rounded-lg">
              <span className="text-xs font-mono text-green-400">{counts.approved} APPROVED</span>
            </div>
            <div className="px-4 py-2 bg-red-500/10 border border-red-500/30 rounded-lg">
              <span className="text-xs font-mono text-red-400">{counts.rejected} REJECTED</span>
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6">
          {(['PENDING', 'APPROVED', 'REJECTED', 'ALL'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-lg font-mono text-xs uppercase tracking-wider transition-colors ${
                filter === status
                  ? 'bg-purple-500/20 border border-purple-500/50 text-purple-300'
                  : 'bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10'
              }`}
            >
              {status}
            </button>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 flex items-center gap-2 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm font-mono">
            <AlertTriangle className="w-4 h-4" />
            {error}
          </div>
        )}

        {/* Appeals Grid */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Appeals List */}
          <div className="space-y-4">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
              </div>
            ) : appeals.length === 0 ? (
              <div className="backdrop-blur-xl bg-black/20 border border-white/10 rounded-xl p-8 text-center">
                <Clock className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                <p className="text-gray-400 font-mono text-sm">No {filter.toLowerCase()} appeals</p>
              </div>
            ) : (
              appeals.map((appeal) => (
                <div
                  key={appeal.id}
                  onClick={() => setSelectedAppeal(appeal)}
                  className={`backdrop-blur-xl bg-black/20 border rounded-xl p-4 cursor-pointer transition-all ${
                    selectedAppeal?.id === appeal.id
                      ? 'border-purple-500/50 bg-purple-500/5'
                      : 'border-white/10 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <h3 className="font-bold text-white text-sm line-clamp-1">{appeal.title}</h3>
                    <span className={`px-2 py-1 text-[10px] font-mono uppercase rounded ${
                      appeal.appealStatus === 'PENDING'
                        ? 'bg-yellow-500/20 text-yellow-400'
                        : appeal.appealStatus === 'APPROVED'
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-red-500/20 text-red-400'
                    }`}>
                      {appeal.appealStatus}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs font-mono text-gray-400">
                    <span>{appeal.streamerHandle}</span>
                    <span className="text-[#FFD700]">{appeal.bounty} USDC</span>
                  </div>
                  <p className="mt-2 text-xs text-gray-500 line-clamp-2">{appeal.appealReason}</p>
                  {appeal.isSimulated && (
                    <span className="mt-2 inline-block px-2 py-0.5 text-[10px] font-mono uppercase bg-yellow-500/20 text-yellow-400 rounded">
                      Simulated
                    </span>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Appeal Details */}
          <div className="backdrop-blur-xl bg-black/20 border border-white/10 rounded-xl p-6 sticky top-24">
            {selectedAppeal ? (
              <div className="space-y-6">
                <div>
                  <span className="text-[10px] font-mono text-gray-500 uppercase tracking-wider">Appeal Details</span>
                  <h2 className="text-xl font-black text-white mt-1">{selectedAppeal.title}</h2>
                </div>

                <div className="space-y-3 text-sm font-mono">
                  <div className="flex justify-between border-b border-white/10 pb-2">
                    <span className="text-gray-400">Dare ID:</span>
                    <span className="text-gray-300">{selectedAppeal.shortId || selectedAppeal.id.slice(0, 8)}</span>
                  </div>
                  <div className="flex justify-between border-b border-white/10 pb-2">
                    <span className="text-gray-400">Streamer:</span>
                    <span className="text-purple-400">{selectedAppeal.streamerHandle}</span>
                  </div>
                  <div className="flex justify-between border-b border-white/10 pb-2">
                    <span className="text-gray-400">Bounty:</span>
                    <span className="text-[#FFD700]">{selectedAppeal.bounty} USDC</span>
                  </div>
                  <div className="flex justify-between border-b border-white/10 pb-2">
                    <span className="text-gray-400">Staker:</span>
                    <span className="text-gray-300">{formatAddress(selectedAppeal.stakerAddress)}</span>
                  </div>
                  <div className="flex justify-between border-b border-white/10 pb-2">
                    <span className="text-gray-400">AI Confidence:</span>
                    <span className="text-red-400">
                      {selectedAppeal.verifyConfidence
                        ? `${(selectedAppeal.verifyConfidence * 100).toFixed(1)}%`
                        : 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-white/10 pb-2">
                    <span className="text-gray-400">Appealed At:</span>
                    <span className="text-gray-300">{formatDate(selectedAppeal.appealedAt)}</span>
                  </div>
                </div>

                {/* Appeal Reason */}
                <div>
                  <span className="text-[10px] font-mono text-gray-500 uppercase tracking-wider">Appeal Reason</span>
                  <div className="mt-2 p-3 bg-black/40 border border-white/10 rounded-lg">
                    <p className="text-sm text-gray-300">{selectedAppeal.appealReason || 'No reason provided'}</p>
                  </div>
                </div>

                {/* Video Proof */}
                {selectedAppeal.videoUrl && (
                  <div>
                    <span className="text-[10px] font-mono text-gray-500 uppercase tracking-wider">Video Proof</span>
                    <a
                      href={selectedAppeal.videoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 flex items-center gap-2 px-3 py-2 bg-cyan-500/10 border border-cyan-500/30 rounded-lg text-cyan-400 text-sm font-mono hover:bg-cyan-500/20 transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                      View Proof
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}

                {/* Action Buttons */}
                {selectedAppeal.appealStatus === 'PENDING' && (
                  <div className="flex gap-3 pt-4 border-t border-white/10">
                    <button
                      onClick={() => handleResolve(selectedAppeal.id, 'APPROVED')}
                      disabled={processingId === selectedAppeal.id}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-500/20 hover:bg-green-500/30 border border-green-500/50 rounded-lg text-green-400 font-bold text-sm uppercase tracking-wider transition-colors disabled:opacity-50"
                    >
                      {processingId === selectedAppeal.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <CheckCircle className="w-4 h-4" />
                      )}
                      Approve
                    </button>
                    <button
                      onClick={() => handleResolve(selectedAppeal.id, 'REJECTED')}
                      disabled={processingId === selectedAppeal.id}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 rounded-lg text-red-400 font-bold text-sm uppercase tracking-wider transition-colors disabled:opacity-50"
                    >
                      {processingId === selectedAppeal.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <XCircle className="w-4 h-4" />
                      )}
                      Reject
                    </button>
                  </div>
                )}

                {selectedAppeal.appealStatus !== 'PENDING' && (
                  <div className={`p-4 rounded-lg ${
                    selectedAppeal.appealStatus === 'APPROVED'
                      ? 'bg-green-500/10 border border-green-500/30'
                      : 'bg-red-500/10 border border-red-500/30'
                  }`}>
                    <p className={`text-sm font-mono ${
                      selectedAppeal.appealStatus === 'APPROVED' ? 'text-green-400' : 'text-red-400'
                    }`}>
                      This appeal has been {selectedAppeal.appealStatus?.toLowerCase()}.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <Shield className="w-12 h-12 text-gray-500 mb-4" />
                <p className="text-gray-400 font-mono text-sm">Select an appeal to review</p>
              </div>
            )}
          </div>
        </div>

        {/* Prisma Studio Note */}
        <div className="mt-12 p-4 bg-purple-500/5 border border-purple-500/20 rounded-xl">
          <h3 className="text-sm font-bold text-purple-300 mb-2">Alternative: Prisma Studio</h3>
          <p className="text-xs font-mono text-gray-400">
            For direct database access, run <code className="px-1 py-0.5 bg-black/40 rounded">npx prisma studio</code> and
            update the <code className="px-1 py-0.5 bg-black/40 rounded">appealStatus</code> field directly.
          </p>
        </div>
      </div>
    </div>
  );
}
