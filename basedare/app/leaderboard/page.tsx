"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { Loader2, Trophy, ChevronDown, ChevronUp, Crown, Flame } from "lucide-react";
import LiquidBackground from "@/components/LiquidBackground";
import GradualBlurOverlay from "@/components/GradualBlurOverlay";
import { LiquidProgressBar } from "@/components/ui/Liquid3DBar";

interface LeaderboardEntry {
  rank: number;
  user: string;
  avatar: string;
  staked: string;
  repPoints: number;
  level: number;
  color?: string;
}

interface APILeaderboardEntry {
  rank: number;
  handle: string;
  totalVolume: number;
  totalCompletions: number;
}

function formatVolume(volume: number): string {
  if (volume >= 1_000_000) return `$${(volume / 1_000_000).toFixed(2)}M`;
  if (volume >= 1_000) return `$${(volume / 1_000).toFixed(0)}K`;
  return `$${volume.toLocaleString()}`;
}

function calculateLevel(completions: number, volume: number): number {
  const base = Math.min(100, completions * 8 + Math.floor(volume / 1000) * 2);
  return Math.max(10, base);
}

function mapAPIToLeaderboard(entries: APILeaderboardEntry[]): LeaderboardEntry[] {
  return entries.map((entry, index) => {
    const level = calculateLevel(entry.totalCompletions, entry.totalVolume);
    return {
      rank: entry.rank,
      user: entry.handle || `Creator ${index + 1}`,
      avatar: `/assets/avatars/${(index % 8) + 1}.jpg`,
      staked: formatVolume(entry.totalVolume),
      repPoints: Math.min(100, entry.totalCompletions * 10 + 20),
      level,
    };
  });
}

// Rank colors for progress bars
const getRankColor = (rank: number): "yellow" | "cyan" | "lime" | "purple" | "pink" | "blue" => {
  if (rank === 1) return "yellow";
  if (rank === 2) return "cyan";
  if (rank === 3) return "pink";
  if (rank <= 5) return "purple";
  return "blue";
};

export default function LeaderboardPage() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    async function fetchLeaderboard() {
      try {
        setLoading(true);
        const res = await fetch("/api/leaderboard?type=CREATOR&limit=20");
        if (!res.ok) throw new Error("Failed to fetch leaderboard");
        const json = await res.json();

        if (json.success && json.data?.leaderboard) {
          setLeaderboard(mapAPIToLeaderboard(json.data.leaderboard));
        } else {
          setLeaderboard([]);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load leaderboard");
      } finally {
        setLoading(false);
      }
    }

    fetchLeaderboard();
  }, []);

  // Get top 3 for podium
  const top3 = leaderboard.slice(0, 3);
  const rest = leaderboard.slice(3);
  const displayedRest = isExpanded ? rest : rest.slice(0, 4);

  const FIRST = top3[0] || { user: "---", avatar: "/assets/avatars/1.jpg", staked: "$0", level: 0 };
  const SECOND = top3[1] || { user: "---", avatar: "/assets/avatars/2.jpg", staked: "$0", level: 0 };
  const THIRD = top3[2] || { user: "---", avatar: "/assets/avatars/3.jpg", staked: "$0", level: 0 };

  return (
    <div className="relative min-h-screen flex flex-col">
      <LiquidBackground />
      <div className="fixed inset-0 z-10 pointer-events-none">
        <GradualBlurOverlay />
      </div>

      <div className="container mx-auto px-4 sm:px-6 py-20 sm:py-24 flex-grow relative z-20">
        {/* Header with Crown */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8 sm:mb-12"
        >
          {/* Crown */}
          <div className="relative mx-auto w-24 h-24 sm:w-32 sm:h-32 md:w-40 md:h-40 mb-6">
            <Image
              src="/assets/peebear-crown.png"
              alt="Champion Crown"
              fill
              sizes="160px"
              priority
              style={{ objectFit: "contain" }}
              className="drop-shadow-[0_0_30px_rgba(250,204,21,0.8)] animate-bounce-slow"
            />
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-7xl font-black tracking-tight">
            <span className="text-white">The </span>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-yellow-600">
              Leaderboard
            </span>
          </h1>
        </motion.div>

        {/* Loading / Error States */}
        {loading ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-12"
          >
            <div className="backdrop-blur-xl bg-black/20 border border-white/10 rounded-2xl p-8">
              <Loader2 className="text-yellow-500 animate-spin mb-4 mx-auto" size={40} />
              <p className="text-gray-400 text-sm font-mono">Loading rankings...</p>
            </div>
          </motion.div>
        ) : error ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="backdrop-blur-xl bg-red-500/10 border border-red-500/30 rounded-2xl p-6 max-w-md mx-auto text-center"
          >
            <p className="text-red-400 text-sm">{error}</p>
          </motion.div>
        ) : leaderboard.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="backdrop-blur-xl bg-black/20 border border-white/10 rounded-2xl p-8 max-w-md mx-auto text-center"
          >
            <Trophy className="text-gray-600 mb-4 mx-auto" size={48} />
            <h2 className="text-xl font-bold text-white mb-2">No Rankings Yet</h2>
            <p className="text-gray-400 text-sm font-mono">
              Complete dares to appear on the leaderboard!
            </p>
          </motion.div>
        ) : (
          <>
            {/* Top 3 Podium - Mobile: Stack, Desktop: Side by side */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="max-w-4xl mx-auto mb-8 sm:mb-12"
            >
              {/* Mobile: Vertical stack */}
              <div className="flex flex-col sm:hidden gap-3">
                {/* 1st Place */}
                <div className="backdrop-blur-xl bg-yellow-500/5 border border-yellow-500/30 rounded-2xl p-4">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <div className="w-16 h-16 rounded-full border-2 border-yellow-400 overflow-hidden shadow-[0_0_20px_rgba(250,204,21,0.4)]">
                        <Image
                          src={FIRST.avatar}
                          alt={FIRST.user}
                          fill
                          sizes="64px"
                          style={{ objectFit: "cover" }}
                          priority
                        />
                      </div>
                      <div className="absolute -top-2 -right-2 w-7 h-7 bg-yellow-500 rounded-full flex items-center justify-center text-black font-black text-sm shadow-lg">
                        1
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-bold truncate">{FIRST.user}</p>
                      <p className="text-yellow-400 font-black text-lg">{FIRST.staked}</p>
                      <div className="mt-2">
                        <LiquidProgressBar value={FIRST.level} color="yellow" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2nd Place */}
                <div className="backdrop-blur-xl bg-cyan-500/5 border border-cyan-500/30 rounded-2xl p-4">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <div className="w-14 h-14 rounded-full border-2 border-cyan-400 overflow-hidden shadow-[0_0_15px_rgba(87,202,244,0.4)]">
                        <Image
                          src={SECOND.avatar}
                          alt={SECOND.user}
                          fill
                          sizes="56px"
                          style={{ objectFit: "cover" }}
                          priority
                        />
                      </div>
                      <div className="absolute -top-2 -right-2 w-6 h-6 bg-cyan-400 rounded-full flex items-center justify-center text-black font-black text-xs shadow-lg">
                        2
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-bold text-sm truncate">{SECOND.user}</p>
                      <p className="text-cyan-400 font-black">{SECOND.staked}</p>
                      <div className="mt-2">
                        <LiquidProgressBar value={SECOND.level} color="cyan" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3rd Place */}
                <div className="backdrop-blur-xl bg-pink-500/5 border border-pink-500/30 rounded-2xl p-4">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <div className="w-12 h-12 rounded-full border-2 border-pink-400 overflow-hidden shadow-[0_0_15px_rgba(236,0,140,0.4)]">
                        <Image
                          src={THIRD.avatar}
                          alt={THIRD.user}
                          fill
                          sizes="48px"
                          style={{ objectFit: "cover" }}
                          priority
                        />
                      </div>
                      <div className="absolute -top-2 -right-2 w-6 h-6 bg-pink-400 rounded-full flex items-center justify-center text-black font-black text-xs shadow-lg">
                        3
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-bold text-sm truncate">{THIRD.user}</p>
                      <p className="text-pink-400 font-black">{THIRD.staked}</p>
                      <div className="mt-2">
                        <LiquidProgressBar value={THIRD.level} color="pink" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Desktop: Podium layout */}
              <div className="hidden sm:flex items-end justify-center gap-4 md:gap-6">
                {/* 2nd Place */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="w-[30%] transform translate-y-4"
                >
                  <div className="backdrop-blur-xl bg-cyan-500/5 border border-cyan-500/30 rounded-2xl p-5 text-center">
                    <div className="relative w-20 h-20 mx-auto mb-3">
                      <div className="w-full h-full rounded-full border-3 border-cyan-400 overflow-hidden shadow-[0_0_20px_rgba(87,202,244,0.4)]">
                        <Image
                          src={SECOND.avatar}
                          alt={SECOND.user}
                          fill
                          sizes="80px"
                          style={{ objectFit: "cover" }}
                          priority
                        />
                      </div>
                      <div className="absolute -top-2 -right-2 w-8 h-8 bg-cyan-400 rounded-full flex items-center justify-center text-black font-black text-sm shadow-lg">
                        2
                      </div>
                    </div>
                    <p className="text-white font-bold truncate mb-1">{SECOND.user}</p>
                    <p className="text-cyan-400 font-black text-xl mb-3">{SECOND.staked}</p>
                    <LiquidProgressBar value={SECOND.level} color="cyan" />
                    <p className="text-[10px] text-gray-500 font-mono mt-2">LVL {Math.floor(SECOND.level / 10)}</p>
                  </div>
                </motion.div>

                {/* 1st Place */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                  className="w-[35%] z-10"
                >
                  <div className="backdrop-blur-xl bg-yellow-500/5 border border-yellow-500/30 rounded-2xl p-6 text-center relative overflow-hidden">
                    {/* Glow effect */}
                    <div className="absolute inset-0 bg-gradient-to-b from-yellow-500/10 via-transparent to-transparent pointer-events-none" />

                    <div className="relative">
                      <div className="relative w-24 h-24 md:w-28 md:h-28 mx-auto mb-4">
                        <div className="w-full h-full rounded-full border-4 border-yellow-400 overflow-hidden shadow-[0_0_30px_rgba(250,204,21,0.5)]">
                          <Image
                            src={FIRST.avatar}
                            alt={FIRST.user}
                            fill
                            sizes="112px"
                            style={{ objectFit: "cover" }}
                            priority
                          />
                        </div>
                        <div className="absolute -top-3 -right-3 w-10 h-10 bg-yellow-500 rounded-full flex items-center justify-center text-black font-black shadow-lg">
                          <Crown className="w-5 h-5" />
                        </div>
                      </div>
                      <p className="text-white font-bold text-lg truncate mb-1">{FIRST.user}</p>
                      <p className="text-yellow-400 font-black text-2xl md:text-3xl mb-4">{FIRST.staked}</p>
                      <LiquidProgressBar value={FIRST.level} color="yellow" />
                      <p className="text-xs text-gray-500 font-mono mt-2">LVL {Math.floor(FIRST.level / 10)}</p>
                    </div>
                  </div>
                </motion.div>

                {/* 3rd Place */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 }}
                  className="w-[30%] transform translate-y-8"
                >
                  <div className="backdrop-blur-xl bg-pink-500/5 border border-pink-500/30 rounded-2xl p-4 text-center">
                    <div className="relative w-16 h-16 mx-auto mb-3">
                      <div className="w-full h-full rounded-full border-3 border-pink-400 overflow-hidden shadow-[0_0_15px_rgba(236,0,140,0.4)]">
                        <Image
                          src={THIRD.avatar}
                          alt={THIRD.user}
                          fill
                          sizes="64px"
                          style={{ objectFit: "cover" }}
                          priority
                        />
                      </div>
                      <div className="absolute -top-2 -right-2 w-7 h-7 bg-pink-400 rounded-full flex items-center justify-center text-black font-black text-sm shadow-lg">
                        3
                      </div>
                    </div>
                    <p className="text-white font-bold text-sm truncate mb-1">{THIRD.user}</p>
                    <p className="text-pink-400 font-black text-lg mb-3">{THIRD.staked}</p>
                    <LiquidProgressBar value={THIRD.level} color="pink" />
                    <p className="text-[10px] text-gray-500 font-mono mt-2">LVL {Math.floor(THIRD.level / 10)}</p>
                  </div>
                </motion.div>
              </div>
            </motion.div>

            {/* Divider */}
            {rest.length > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="flex justify-center mb-6 sm:mb-8"
              >
                <div className="w-full max-w-xl h-px bg-gradient-to-r from-transparent via-purple-500/40 to-transparent" />
              </motion.div>
            )}

            {/* Rest of Rankings */}
            {rest.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
                className="max-w-xl mx-auto space-y-2 sm:space-y-3"
              >
                <AnimatePresence mode="popLayout">
                  {displayedRest.map((entry, index) => (
                    <motion.div
                      key={entry.rank}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ delay: index * 0.05 }}
                      className="backdrop-blur-xl bg-black/20 border border-white/10 rounded-2xl p-3 sm:p-4 hover:bg-white/5 transition-colors"
                    >
                      <div className="flex items-center gap-3 sm:gap-4">
                        {/* Rank */}
                        <div className="w-8 h-8 sm:w-10 sm:h-10 bg-purple-500/20 border border-purple-500/30 rounded-xl flex items-center justify-center shrink-0">
                          <span className="text-purple-400 font-black text-sm sm:text-base">{entry.rank}</span>
                        </div>

                        {/* Avatar */}
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border border-white/20 overflow-hidden shrink-0 relative">
                          <Image
                            src={entry.avatar}
                            alt={entry.user}
                            fill
                            sizes="48px"
                            style={{ objectFit: "cover" }}
                          />
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-1.5">
                            <p className="text-white font-bold text-sm truncate">{entry.user}</p>
                            <p className="text-yellow-400 font-black text-sm shrink-0">{entry.staked}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex-1">
                              <LiquidProgressBar value={entry.level} color={getRankColor(entry.rank)} />
                            </div>
                            <span className="text-[10px] text-gray-500 font-mono shrink-0">
                              LVL {Math.floor(entry.level / 10)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>

                {/* Expand/Collapse Button */}
                {rest.length > 4 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center pt-4"
                  >
                    <button
                      onClick={() => setIsExpanded(!isExpanded)}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-xs font-bold text-gray-400 hover:text-white uppercase tracking-wider transition-all"
                    >
                      {isExpanded ? (
                        <>
                          Show Less <ChevronUp className="w-4 h-4" />
                        </>
                      ) : (
                        <>
                          View All ({rest.length} creators) <ChevronDown className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </motion.div>
                )}
              </motion.div>
            )}

            {/* Bottom CTA */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="max-w-md mx-auto mt-10 sm:mt-12"
            >
              <div className="backdrop-blur-xl bg-purple-500/5 border border-purple-500/30 rounded-2xl p-5 sm:p-6 text-center relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-yellow-500/5 pointer-events-none" />
                <div className="relative z-10">
                  <div className="w-12 h-12 bg-purple-500/20 border border-purple-500/30 rounded-xl flex items-center justify-center mx-auto mb-3">
                    <Flame className="w-6 h-6 text-purple-400" />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">Want to Climb?</h3>
                  <p className="text-xs sm:text-sm text-gray-400 font-mono mb-4">
                    Complete more dares to rise through the ranks
                  </p>
                  <a
                    href="/"
                    className="inline-flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-xl text-white text-sm font-bold uppercase tracking-wider transition-all"
                  >
                    Browse Dares
                  </a>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </div>
    </div>
  );
}
