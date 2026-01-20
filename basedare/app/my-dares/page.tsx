"use client";

import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import Link from "next/link";
import GalaxyBackground from "@/components/GalaxyBackground";
import MoltenGold from "@/components/ui/MoltenGold";
import { ElectricCard } from "@/components/ui/electric-card";
import { Wallet, Clock, CheckCircle, XCircle, Zap, Loader2 } from "lucide-react";

interface Dare {
  id: string;
  title: string;
  bounty: number;
  streamerHandle: string;
  status: string;
  expiresAt: string | null;
  shortId: string | null;
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'VERIFIED': return '#22c55e'; // Green
    case 'PENDING': return '#FACC15'; // Gold - active
    case 'REJECTED': return '#ef4444'; // Red
    case 'EXPIRED': return '#6b7280'; // Gray
    default: return '#A855F7'; // Purple
  }
}

function getStatusDisplay(status: string): { label: string; time: string } {
  switch (status) {
    case 'VERIFIED': return { label: 'COMPLETED', time: 'Verified' };
    case 'PENDING': return { label: 'LIVE', time: 'Awaiting proof' };
    case 'REJECTED': return { label: 'FAILED', time: 'Rejected' };
    case 'EXPIRED': return { label: 'EXPIRED', time: 'Time ran out' };
    default: return { label: status, time: '' };
  }
}

function formatTimeLeft(expiresAt: string | null): string {
  if (!expiresAt) return 'No deadline';
  const now = new Date();
  const expires = new Date(expiresAt);
  const diff = expires.getTime() - now.getTime();

  if (diff <= 0) return 'Expired';

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d left`;
  if (hours > 0) return `${hours}h left`;
  return 'Soon';
}

export default function MyDaresPage() {
  const { address, isConnected } = useAccount();
  const [dares, setDares] = useState<Dare[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchMyDares() {
      if (!address) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const res = await fetch(`/api/dares?userAddress=${address}&includeAll=true`);
        if (!res.ok) throw new Error('Failed to fetch dares');
        const data = await res.json();
        setDares(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load dares');
      } finally {
        setLoading(false);
      }
    }

    fetchMyDares();
  }, [address]);

  // Calculate stats from real data
  const totalStaked = dares.reduce((sum, d) => sum + (d.bounty || 0), 0);
  const activeCount = dares.filter(d => d.status === 'PENDING').length;
  return (
    <main className="min-h-screen w-full bg-[#020204] relative overflow-hidden pt-32 pb-20">
      
      {/* 1. SHARED BACKGROUND DNA */}
      <GalaxyBackground />

      {/* 2. HEADER SECTION */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 mb-16">
        <div className="flex flex-col md:flex-row justify-between items-end gap-6">
            
            {/* Title */}
            <div>
                <div className="flex items-center gap-4 mb-2">
                    <div className="p-3 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
                        <Wallet className="text-[#FACC15]" size={32} />
                    </div>
                    <div className="flex flex-col">
                        <h1 className="text-sm font-bold text-gray-400 uppercase tracking-[0.3em]">Command Center</h1>
                        <MoltenGold className="text-5xl md:text-6xl">MY DARES</MoltenGold>
                    </div>
                </div>
            </div>

            {/* Stats Summary */}
            <div className="flex gap-4">
                <div className="px-6 py-4 rounded-2xl border border-white/10 bg-white/[0.02] backdrop-blur-md">
                    <div className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">Total Staked</div>
                    <div className="text-2xl font-black text-white">
                      {loading ? '...' : `$${totalStaked.toLocaleString()}`}
                    </div>
                </div>
                <div className="px-6 py-4 rounded-2xl border border-white/10 bg-white/[0.02] backdrop-blur-md">
                    <div className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">Active</div>
                    <div className="text-2xl font-black text-[#FACC15]">
                      {loading ? '...' : activeCount}
                    </div>
                </div>
            </div>
        </div>
      </div>

      {/* 3. THE GRID (Electric Cards) */}
      <div className="relative z-10 max-w-7xl mx-auto px-6">
        {/* Not Connected State */}
        {!isConnected && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Wallet className="text-gray-600 mb-4" size={48} />
            <h2 className="text-2xl font-bold text-white mb-2">Connect Your Wallet</h2>
            <p className="text-gray-400 max-w-md">
              Connect your wallet to see the dares you&apos;ve created.
            </p>
          </div>
        )}

        {/* Loading State */}
        {isConnected && loading && (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="text-[#FACC15] animate-spin mb-4" size={48} />
            <p className="text-gray-400">Loading your dares...</p>
          </div>
        )}

        {/* Error State */}
        {isConnected && error && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <XCircle className="text-red-500 mb-4" size={48} />
            <h2 className="text-2xl font-bold text-white mb-2">Something went wrong</h2>
            <p className="text-gray-400">{error}</p>
          </div>
        )}

        {/* Empty State */}
        {isConnected && !loading && !error && dares.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Zap className="text-gray-600 mb-4" size={48} />
            <h2 className="text-2xl font-bold text-white mb-2">No Dares Yet</h2>
            <p className="text-gray-400 max-w-md mb-6">
              You haven&apos;t created any dares yet. Start by challenging your favorite streamer!
            </p>
            <Link
              href="/"
              className="px-6 py-3 bg-[#FACC15] text-black font-bold rounded-xl hover:bg-[#FACC15]/90 transition-colors"
            >
              Create a Dare
            </Link>
          </div>
        )}

        {/* Dares Grid */}
        {isConnected && !loading && !error && dares.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {dares.map((dare) => {
              const color = getStatusColor(dare.status);
              const { label, time } = getStatusDisplay(dare.status);
              const timeDisplay = dare.status === 'PENDING' ? formatTimeLeft(dare.expiresAt) : time;
              const isLive = dare.status === 'PENDING';

              return (
                <Link key={dare.id} href={`/dare/${dare.shortId || dare.id}`} className="h-[320px] w-full block">
                  <ElectricCard
                    color={color}
                    variant={isLive ? 'hue' : 'swirl'}
                    className="h-full"
                  >
                    <div className="flex flex-col h-full justify-between p-2">

                      {/* Top Row: Target & Amount */}
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-3">
                          <div className={`w-12 h-12 rounded-full border-2 p-0.5 ${isLive ? 'border-[#FACC15] animate-pulse' : 'border-white/20'}`}>
                            <div className="w-full h-full rounded-full bg-gray-800 overflow-hidden">
                              <div className="w-full h-full bg-zinc-900 flex items-center justify-center text-xs font-bold text-gray-500">
                                {dare.streamerHandle?.slice(0, 2).toUpperCase() || '??'}
                              </div>
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-400 font-bold uppercase tracking-wider">Target</div>
                            <div className="text-white font-bold font-serif text-lg">@{dare.streamerHandle}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-gray-400 font-bold uppercase tracking-wider">Staked</div>
                          <div className="text-2xl font-black tracking-tighter drop-shadow-md" style={{ color }}>
                            ${dare.bounty?.toLocaleString() || '0'}
                          </div>
                        </div>
                      </div>

                      {/* Middle: The Task */}
                      <div className="flex-grow flex items-center justify-center text-center px-4">
                        <h3 className="text-2xl font-black text-white leading-tight font-serif italic opacity-90">
                          &quot;{dare.title}&quot;
                        </h3>
                      </div>

                      {/* Bottom: Status Bar */}
                      <div className="mt-auto">
                        <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">

                          {/* Status Text */}
                          <div className="flex items-center gap-2">
                            {isLive && <Zap size={14} className="text-[#FACC15] fill-[#FACC15] animate-bounce" />}
                            {dare.status === 'VERIFIED' && <CheckCircle size={14} className="text-green-500" />}
                            {dare.status === 'REJECTED' && <XCircle size={14} className="text-red-500" />}
                            {dare.status === 'EXPIRED' && <Clock size={14} className="text-gray-500" />}

                            <span className="text-sm font-black tracking-widest" style={{ color }}>
                              {label}
                            </span>
                          </div>

                          {/* Time / Details */}
                          <span className="text-xs font-mono text-gray-500 font-medium">
                            {timeDisplay}
                          </span>

                        </div>
                      </div>

                    </div>
                  </ElectricCard>
                </Link>
              );
            })}
          </div>
        )}
      </div>

    </main>
  );
}
