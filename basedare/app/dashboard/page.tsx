'use client';
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Wallet, Trophy, Target, Zap, Plus, AlertCircle, Clock, CheckCircle, XCircle, Loader2, Upload, LogIn } from "lucide-react";
import SubmitEvidence from "@/components/SubmitEvidence";
import GradualBlurOverlay from "@/components/GradualBlurOverlay";
import LiquidBackground from "@/components/LiquidBackground";
import LivePotLeaderboard from "@/components/LivePotLeaderboard";
import InitProtocolButton from "@/components/InitProtocolButton";
import { useAccount, useConnect } from 'wagmi';
import { coinbaseWallet } from 'wagmi/connectors';

interface Dare {
  id: string;
  title: string;
  bounty: number;
  streamerHandle: string;
  status: string;
  videoUrl?: string;
  createdAt: string;
  isSimulated?: boolean;
}

export default function Dashboard() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const { connect, isPending: isConnecting } = useConnect();
  const [dares, setDares] = useState<Dare[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDare, setSelectedDare] = useState<Dare | null>(null);
  const [stats, setStats] = useState({
    totalFunded: 0,
    activeBounties: 0,
    completedBounties: 0,
  });

  // Format wallet address for display
  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  // Handle wallet connection
  const handleConnect = () => {
    connect({ connector: coinbaseWallet() });
  };

  // Fetch user's dares from API
  useEffect(() => {
    const fetchDares = async () => {
      try {
        setLoading(true);
        // Include user address to filter for their dares only
        const params = new URLSearchParams({ includeAll: 'true' });
        if (address) {
          params.set('userAddress', address);
        }

        const response = await fetch(`/api/dares?${params.toString()}`);
        if (response.ok) {
          const data = await response.json();
          setDares(data);

          // Calculate stats
          const active = data.filter((d: Dare) => d.status === 'PENDING').length;
          const completed = data.filter((d: Dare) => d.status === 'VERIFIED').length;
          const total = data.reduce((sum: number, d: Dare) => sum + d.bounty, 0);

          setStats({
            totalFunded: total,
            activeBounties: active,
            completedBounties: completed,
          });

          // Auto-select first pending dare for evidence submission
          const pendingDare = data.find((d: Dare) => d.status === 'PENDING');
          if (pendingDare) {
            setSelectedDare(pendingDare);
          }
        }
      } catch (error) {
        console.error('Failed to fetch dares:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDares();
  }, [address]);

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

  return (
    <div className="relative min-h-screen flex flex-col">
      <LiquidBackground />
      <div className="fixed inset-0 z-10 pointer-events-none"><GradualBlurOverlay /></div>

      <div className="container mx-auto px-6 py-24 mb-12 flex-grow relative z-20">
        {/* HEADER */}
        <div className="flex flex-col md:flex-row items-end justify-between gap-6 mb-8 border-b border-white/10 pb-6">
          <div className="flex flex-col gap-2">
            <h1 className="text-4xl md:text-5xl font-black uppercase italic tracking-tighter flex items-center gap-4">
              <div className="w-12 h-12 bg-[#FFD700] rounded-xl flex items-center justify-center text-black shadow-[0_0_20px_rgba(255,215,0,0.5)]">
                <Wallet className="w-6 h-6" />
              </div>
              <span className="text-[#FACC15]">COMMAND</span> <span className="text-[#A855F7]">BASE</span>
            </h1>
            {/* Wallet Identity Badge */}
            {isConnected && address && (
              <div className="flex items-center gap-2 ml-16">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                <span className="text-xs font-mono text-gray-400">Connected as</span>
                <span className="px-2 py-1 bg-purple-500/20 border border-purple-500/30 rounded text-xs font-mono text-purple-300">
                  {formatAddress(address)}
                </span>
              </div>
            )}
          </div>

          <Link href="/create">
            <button className="hidden md:flex items-center gap-2 px-6 py-3 bg-white/5 border border-white/10 rounded-lg uppercase font-bold text-xs hover:bg-white/10 hover:border-white/30 transition-all text-white">
              <Plus className="w-4 h-4" /> Create Dare
            </button>
          </Link>
        </div>

        {/* CONNECTION STATUS */}
        {!isConnected && (
          <div className="mb-8 p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-400 shrink-0" />
              <p className="text-yellow-400 text-sm font-mono">Connect your wallet to see your personal stats and bounties</p>
            </div>
            <button
              onClick={handleConnect}
              disabled={isConnecting}
              className="flex items-center gap-2 px-4 py-2 bg-yellow-500/20 hover:bg-yellow-500/30 border border-yellow-500/50 rounded-lg text-yellow-400 font-bold text-xs uppercase tracking-wider transition-colors disabled:opacity-50 shrink-0"
            >
              {isConnecting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <LogIn className="w-4 h-4" />
              )}
              Connect
            </button>
          </div>
        )}

        {/* USER STATS GRID */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {/* Card 1: Total Staked */}
          <div className="backdrop-blur-xl bg-black/20 border border-white/10 rounded-2xl p-6 relative group hover:border-[#FFD700]/30 transition-colors">
            <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:opacity-50 transition-opacity z-10">
              <Wallet className="w-12 h-12 text-[#FFD700]" />
            </div>
            <div className="relative z-10 text-gray-400 font-mono text-xs uppercase tracking-widest mb-2">Your Total Funded</div>
            <div className="relative z-10 text-3xl font-black text-white">
              {!isConnected ? (
                <span className="text-gray-500">--</span>
              ) : loading ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <>{stats.totalFunded.toLocaleString()} <span className="text-[#FFD700]">USDC</span></>
              )}
            </div>
            <div className="relative z-10 text-xs text-green-400 mt-2 font-mono flex items-center gap-1">
              <Zap className="w-3 h-3" /> On Base L2
            </div>
          </div>

          {/* Card 2: Active Bounties */}
          <div className="backdrop-blur-xl bg-black/20 border border-white/10 rounded-2xl p-6 relative group hover:border-purple-500/30 transition-colors">
            <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:opacity-50 transition-opacity z-10">
              <Target className="w-12 h-12 text-purple-500" />
            </div>
            <div className="relative z-10 text-gray-400 font-mono text-xs uppercase tracking-widest mb-2">Your Active Bounties</div>
            <div className="relative z-10 text-3xl font-black text-white">
              {!isConnected ? (
                <span className="text-gray-500">--</span>
              ) : loading ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <>{stats.activeBounties} <span className="text-purple-500">DARES</span></>
              )}
            </div>
            <div className="relative z-10 text-xs text-purple-400 mt-2 font-mono">Awaiting Verification</div>
          </div>

          {/* Card 3: Completed */}
          <div className="backdrop-blur-xl bg-black/20 border border-white/10 rounded-2xl p-6 relative group hover:border-green-500/30 transition-colors">
            <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:opacity-50 transition-opacity z-10">
              <Trophy className="w-12 h-12 text-green-500" />
            </div>
            <div className="relative z-10 text-gray-400 font-mono text-xs uppercase tracking-widest mb-2">Your Completed</div>
            <div className="relative z-10 text-3xl font-black text-white">
              {!isConnected ? (
                <span className="text-gray-500">--</span>
              ) : loading ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <>{stats.completedBounties} <span className="text-green-500">VERIFIED</span></>
              )}
            </div>
            <div className="relative z-10 text-xs text-green-400 mt-2 font-mono">Successfully Paid Out</div>
          </div>
        </div>

        {/* MAIN CONTENT GRID */}
        <div className="grid lg:grid-cols-2 gap-8 mb-12">

          {/* LEFT: BOUNTY LIST */}
          <div className="backdrop-blur-xl bg-black/20 border border-white/10 rounded-2xl p-6">
            <h3 className="text-xl font-black text-white uppercase tracking-wider mb-6 flex items-center gap-3">
              <Target className="w-5 h-5 text-purple-400" />
              Your Bounties
            </h3>

            {!isConnected ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center">
                  <Wallet className="w-8 h-8 text-yellow-400" />
                </div>
                <p className="text-gray-400 font-mono text-sm mb-2">Wallet not connected</p>
                <p className="text-gray-500 font-mono text-xs mb-4">Connect to view your personal bounties</p>
                <button
                  onClick={handleConnect}
                  disabled={isConnecting}
                  className="px-6 py-3 bg-yellow-500/20 hover:bg-yellow-500/30 border border-yellow-500/50 text-yellow-400 rounded-lg font-bold text-sm uppercase tracking-wider transition-colors disabled:opacity-50"
                >
                  {isConnecting ? 'Connecting...' : 'Connect Wallet'}
                </button>
              </div>
            ) : loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
              </div>
            ) : dares.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/5 flex items-center justify-center">
                  <Target className="w-8 h-8 text-gray-500" />
                </div>
                <p className="text-gray-400 font-mono text-sm mb-2">No bounties yet</p>
                <p className="text-gray-500 font-mono text-xs mb-6">Create your first dare to get started</p>
                <InitProtocolButton onClick={() => router.push('/create')} />
              </div>
            ) : (
              <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                {dares.map((dare) => (
                  <div
                    key={dare.id}
                    onClick={() => setSelectedDare(dare)}
                    className={`p-4 rounded-xl border cursor-pointer transition-all ${
                      selectedDare?.id === dare.id
                        ? 'bg-purple-500/10 border-purple-500/50'
                        : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <h4 className="font-bold text-white text-sm line-clamp-1">{dare.title}</h4>
                      {getStatusBadge(dare.status)}
                    </div>
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-gray-400">{dare.streamerHandle || 'Open Bounty'}</span>
                      <span className="text-[#FFD700] font-bold">{dare.bounty} USDC</span>
                    </div>
                    {dare.isSimulated && (
                      <span className="mt-2 inline-block px-2 py-0.5 text-[10px] font-mono uppercase bg-yellow-500/20 text-yellow-400 rounded">
                        Simulated
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* RIGHT: SELECTED DARE DETAILS & EVIDENCE */}
          <div className="space-y-6">
            {/* MISSION DETAILS */}
            {selectedDare ? (
              <div className="backdrop-blur-xl bg-black/20 border border-white/10 rounded-2xl p-6 relative">
                <div className="absolute top-0 right-0 px-4 py-2 bg-purple-500/20 text-purple-300 text-[10px] font-bold uppercase tracking-widest rounded-bl-xl border-b border-l border-purple-500/30 z-20">
                  Status: {selectedDare.status}
                </div>

                <div className="relative z-10">
                  <h3 className="text-lg font-black text-white mb-2 uppercase tracking-wider">Current Mission</h3>
                  <h2 className="text-2xl md:text-3xl font-black text-[#FFD700] mb-6 italic">&quot;{selectedDare.title}&quot;</h2>

                  <div className="space-y-3 font-mono text-sm text-gray-400 mb-6">
                    <div className="flex justify-between border-b border-white/10 pb-2">
                      <span>BOUNTY LOCKED:</span>
                      <span className="text-white">{selectedDare.bounty} USDC</span>
                    </div>
                    <div className="flex justify-between border-b border-white/10 pb-2">
                      <span>TARGET:</span>
                      <span className="text-purple-400">{selectedDare.streamerHandle}</span>
                    </div>
                    <div className="flex justify-between border-b border-white/10 pb-2">
                      <span>CREATED:</span>
                      <span className="text-gray-300">{new Date(selectedDare.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {selectedDare.status === 'PENDING' && (
                    <div className="flex items-start gap-3 text-xs text-gray-500 backdrop-blur-xl bg-black/10 p-4 rounded-xl border border-white/5">
                      <AlertCircle className="w-4 h-4 text-[#FFD700] shrink-0" />
                      <span>Upload video proof to verify completion. AI Referee will analyze within 60 seconds.</span>
                    </div>
                  )}

                  {selectedDare.status === 'VERIFIED' && (
                    <div className="flex items-start gap-3 text-xs backdrop-blur-xl bg-green-500/10 p-4 rounded-xl border border-green-500/30">
                      <CheckCircle className="w-4 h-4 text-green-400 shrink-0" />
                      <span className="text-green-400">This dare has been verified and paid out!</span>
                    </div>
                  )}

                  {selectedDare.status === 'FAILED' && (
                    <div className="flex items-start gap-3 text-xs backdrop-blur-xl bg-red-500/10 p-4 rounded-xl border border-red-500/30">
                      <XCircle className="w-4 h-4 text-red-400 shrink-0" />
                      <span className="text-red-400">Verification failed. Bounty has been refunded to stakers.</span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="backdrop-blur-xl bg-black/20 border border-white/10 rounded-2xl p-6 flex items-center justify-center min-h-[200px]">
                <p className="text-gray-500 font-mono text-sm">Select a bounty to view details</p>
              </div>
            )}

            {/* EVIDENCE UPLOAD - Only show for pending dares */}
            {selectedDare && selectedDare.status === 'PENDING' && (
              <div className="backdrop-blur-xl bg-black/20 border border-white/10 rounded-2xl p-6">
                <h3 className="text-lg font-black text-white uppercase tracking-wider mb-4 flex items-center gap-3">
                  <Upload className="w-5 h-5 text-cyan-400" />
                  Submit Evidence
                </h3>
                <SubmitEvidence
                  dareId={selectedDare.id}
                  onVerificationComplete={(result) => {
                    // Refresh dares list on verification complete
                    if (result.status === 'VERIFIED' || result.status === 'FAILED') {
                      setDares((prev) =>
                        prev.map((d) =>
                          d.id === selectedDare.id ? { ...d, status: result.status } : d
                        )
                      );
                    }
                  }}
                />
              </div>
            )}
          </div>
        </div>

        {/* LIVE POT & LEADERBOARD */}
        <div className="mt-8">
          <LivePotLeaderboard />
        </div>
      </div>
    </div>
  );
}
