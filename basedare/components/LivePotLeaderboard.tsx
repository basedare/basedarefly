'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ============================================================================
// CREATOR FUND & LEADERBOARD
// Performance-based Rewards + Competitive Rankings
// ============================================================================

interface PotData {
  balance: number;
  totalDeposited: number;
  totalDistributed: number;
  totalSlashed: number;
  weekly?: {
    deposited: number;
    distributed: number;
  };
}

interface CreatorEntry {
  rank: number;
  handle: string;
  totalVolume: number;
  totalCompletions: number;
  p2pVolume: number;
  b2bVolume: number;
  rewardTier: string | null;
}

interface ScoutEntry {
  rank: number;
  walletAddress: string;
  handle: string;
  tier: string;
  reputationScore: number;
  successfulSlots: number;
  creatorsDiscovered: number;
  totalRakeEarned: number;
  successRate: number;
  rewardTier: string | null;
}

const TIER_COLORS = {
  BLOODHOUND: 'from-zinc-500 to-zinc-600',
  ARBITER: 'from-blue-500 to-blue-600',
  ARCHON: 'from-purple-500 to-pink-500',
};

export default function LivePotLeaderboard() {
  const [potData, setPotData] = useState<PotData | null>(null);
  const [creatorLeaderboard, setCreatorLeaderboard] = useState<CreatorEntry[]>([]);
  const [scoutLeaderboard, setScoutLeaderboard] = useState<ScoutEntry[]>([]);
  const [activeTab, setActiveTab] = useState<'creators' | 'scouts'>('creators');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch Live Pot data
        const potRes = await fetch('/api/live-pot');
        const potJson = await potRes.json();
        if (potJson.success) {
          setPotData({
            ...potJson.data.pot,
            weekly: potJson.data.weekly,
          });
        }

        // Fetch Creator Leaderboard
        const creatorsRes = await fetch('/api/leaderboard?type=CREATOR&period=WEEKLY&limit=10');
        const creatorsJson = await creatorsRes.json();
        if (creatorsJson.success) {
          setCreatorLeaderboard(creatorsJson.data.leaderboard);
        }

        // Fetch Scout Leaderboard
        const scoutsRes = await fetch('/api/leaderboard?type=SCOUT&limit=10');
        const scoutsJson = await scoutsRes.json();
        if (scoutsJson.success) {
          setScoutLeaderboard(scoutsJson.data.leaderboard);
        }
      } catch (error) {
        console.error('Failed to fetch leaderboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // Refresh every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="animate-pulse rounded-[28px] border border-white/10 bg-[linear-gradient(160deg,rgba(30,22,52,0.34),rgba(8,9,18,0.92))] p-6 h-96 shadow-[14px_18px_48px_rgba(0,0,0,0.42),-8px_-8px_20px_rgba(255,255,255,0.03),inset_0_1px_0_rgba(255,255,255,0.08)]">
        <div className="h-8 w-48 bg-zinc-800 rounded mb-4" />
        <div className="h-24 bg-zinc-800 rounded mb-4" />
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 bg-zinc-800 rounded" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(160deg,rgba(30,22,52,0.34),rgba(8,9,18,0.92))] shadow-[14px_18px_48px_rgba(0,0,0,0.42),-8px_-8px_20px_rgba(255,255,255,0.03),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl">
      {/* Live Pot Header */}
      <div className="p-6 border-b border-white/8 bg-gradient-to-r from-purple-900/20 to-pink-900/20">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <span className="text-2xl">🏆</span>
              Creator Fund
            </h2>
            <p className="text-sm text-zinc-500 mt-1">
              Community Rewards • Top 3 share 5% weekly
            </p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-black bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
              ${potData?.balance.toLocaleString(undefined, { minimumFractionDigits: 2 }) || '0.00'}
            </div>
            <div className="text-xs text-zinc-500">Current Balance</div>
          </div>
        </div>

        {/* Pot Stats */}
        <div className="grid grid-cols-4 gap-4 text-center">
          <div className="bd-dent-surface bd-dent-surface--soft rounded-2xl border border-white/6 p-3">
            <div className="text-lg font-bold text-green-400">
              +${(potData?.weekly?.deposited ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-zinc-500">This Week</div>
          </div>
          <div className="bd-dent-surface bd-dent-surface--soft rounded-2xl border border-white/6 p-3">
            <div className="text-lg font-bold text-purple-400">
              ${(potData?.totalDeposited ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-zinc-500">All-Time In</div>
          </div>
          <div className="bd-dent-surface bd-dent-surface--soft rounded-2xl border border-white/6 p-3">
            <div className="text-lg font-bold text-blue-400">
              ${(potData?.totalDistributed ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-zinc-500">Distributed</div>
          </div>
          <div className="bd-dent-surface bd-dent-surface--soft rounded-2xl border border-white/6 p-3">
            <div className="text-lg font-bold text-red-400">
              ${(potData?.totalSlashed ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-zinc-500">From Sunders</div>
          </div>
        </div>
      </div>

      {/* Leaderboard Tabs */}
      <div className="flex border-b border-white/8">
        <button
          onClick={() => setActiveTab('creators')}
          className={`flex-1 py-3 text-sm font-semibold transition ${
            activeTab === 'creators'
              ? 'text-purple-300 border-b-2 border-purple-400 bg-purple-500/5'
              : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          🎬 Top Creators
        </button>
        <button
          onClick={() => setActiveTab('scouts')}
          className={`flex-1 py-3 text-sm font-semibold transition ${
            activeTab === 'scouts'
              ? 'text-pink-400 border-b-2 border-pink-400 bg-pink-500/5'
              : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          🕵️ Top Scouts
        </button>
      </div>

      {/* Leaderboard Content */}
      <div className="p-4">
        <AnimatePresence mode="wait">
          {activeTab === 'creators' && (
            <motion.div
              key="creators"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-2"
            >
              {creatorLeaderboard.length === 0 ? (
                <div className="bd-dent-surface bd-dent-surface--soft rounded-2xl border border-white/6 text-center py-8 text-zinc-500">
                  No creator data yet this week. Complete dares to rank!
                </div>
              ) : (
                creatorLeaderboard.map((creator) => (
                  <div
                    key={creator.handle}
                    className={`flex items-center justify-between p-3 rounded-lg transition ${
                      creator.rank <= 3
                        ? 'bd-dent-surface bd-dent-surface--soft border border-yellow-500/20 bg-gradient-to-r from-yellow-500/10 to-orange-500/10'
                        : 'bd-dent-surface bd-dent-surface--soft border border-white/6 hover:border-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                          creator.rank === 1
                            ? 'bg-yellow-500 text-black'
                            : creator.rank === 2
                              ? 'bg-zinc-400 text-black'
                              : creator.rank === 3
                                ? 'bg-amber-700 text-white'
                                : 'bg-zinc-700 text-zinc-300'
                        }`}
                      >
                        {creator.rank}
                      </div>
                      <div>
                        <div className="font-semibold flex items-center gap-2">
                          {creator.handle}
                          {creator.rewardTier && (
                            <span className="text-xs">{creator.rewardTier.split(' ')[0]}</span>
                          )}
                        </div>
                        <div className="text-xs text-zinc-500">
                          {creator.totalCompletions} completions
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-green-400">
                        ${creator.totalVolume.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </div>
                      <div className="text-xs text-zinc-500">
                        P2P: ${creator.p2pVolume.toFixed(0)} • B2B: ${creator.b2bVolume.toFixed(0)}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </motion.div>
          )}

          {activeTab === 'scouts' && (
            <motion.div
              key="scouts"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-2"
            >
              {scoutLeaderboard.length === 0 ? (
                <div className="bd-dent-surface bd-dent-surface--soft rounded-2xl border border-white/6 text-center py-8 text-zinc-500">
                  No scout data yet. Start recruiting creators to rank!
                </div>
              ) : (
                scoutLeaderboard.map((scout) => (
                  <div
                    key={scout.walletAddress}
                    className={`flex items-center justify-between p-3 rounded-lg transition ${
                      scout.rank <= 3
                        ? 'bd-dent-surface bd-dent-surface--soft border border-purple-500/20 bg-gradient-to-r from-purple-500/10 to-pink-500/10'
                        : 'bd-dent-surface bd-dent-surface--soft border border-white/6 hover:border-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                          scout.rank === 1
                            ? 'bg-yellow-500 text-black'
                            : scout.rank === 2
                              ? 'bg-zinc-400 text-black'
                              : scout.rank === 3
                                ? 'bg-amber-700 text-white'
                                : 'bg-zinc-700 text-zinc-300'
                        }`}
                      >
                        {scout.rank}
                      </div>
                      <div>
                        <div className="font-semibold flex items-center gap-2">
                          {scout.handle}
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold bg-gradient-to-r ${
                              TIER_COLORS[scout.tier as keyof typeof TIER_COLORS] || TIER_COLORS.BLOODHOUND
                            }`}
                          >
                            {scout.tier}
                          </span>
                        </div>
                        <div className="text-xs text-zinc-500">
                          Rep: {scout.reputationScore} • {scout.creatorsDiscovered} creators
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-green-400">
                        ${scout.totalRakeEarned.toFixed(2)}
                      </div>
                      <div className="text-xs text-zinc-500">
                        {scout.successfulSlots} wins • {scout.successRate}% rate
                      </div>
                    </div>
                  </div>
                ))
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Reward Info */}
      <div className="p-4 border-t border-white/8 bg-black/10">
        <div className="bd-dent-surface bd-dent-surface--soft rounded-2xl border border-white/6 px-4 py-3 text-center text-sm text-zinc-500">
          <span className="text-yellow-400">🥇 50%</span> •{' '}
          <span className="text-zinc-400">🥈 30%</span> •{' '}
          <span className="text-amber-600">🥉 20%</span>
          <span className="mx-2">|</span>
          Top 3 split 5% of fund weekly
        </div>
      </div>
    </div>
  );
}
