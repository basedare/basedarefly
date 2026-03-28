"use client";

import { useState, useEffect, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { Loader2, Trophy, ChevronDown, ChevronUp, Crown, Flame, ArrowRight, ArrowLeft } from "lucide-react";
import LiquidBackground from "@/components/LiquidBackground";
import GradualBlurOverlay from "@/components/GradualBlurOverlay";
import { LiquidProgressBar } from "@/components/ui/Liquid3DBar";

const raisedPanelClass =
  "relative overflow-hidden rounded-[30px] border border-white/[0.09] bg-[linear-gradient(180deg,rgba(255,255,255,0.07)_0%,rgba(255,255,255,0.025)_14%,rgba(10,9,18,0.9)_58%,rgba(7,6,14,0.96)_100%)] shadow-[0_28px_90px_rgba(0,0,0,0.4),0_0_28px_rgba(168,85,247,0.07),inset_0_1px_0_rgba(255,255,255,0.1),inset_0_-18px_24px_rgba(0,0,0,0.24)]";

const softCardClass =
  "relative overflow-hidden rounded-[26px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(255,255,255,0.06)_0%,rgba(255,255,255,0.02)_12%,rgba(10,10,18,0.92)_100%)] shadow-[0_18px_30px_rgba(0,0,0,0.22),inset_0_1px_0_rgba(255,255,255,0.08),inset_0_-12px_18px_rgba(0,0,0,0.22)]";

const insetCardClass =
  "rounded-[22px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(4,5,10,0.72)_0%,rgba(11,11,18,0.92)_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.06),inset_0_-10px_16px_rgba(0,0,0,0.26)]";

const dentWellClass =
  "bd-dent-surface bd-dent-surface--soft rounded-[20px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(7,8,14,0.9)_0%,rgba(14,13,24,0.86)_100%)]";

const sectionLabelClass =
  "inline-flex items-center gap-2 rounded-full border border-fuchsia-400/25 bg-[linear-gradient(180deg,rgba(217,70,239,0.16)_0%,rgba(88,28,135,0.08)_100%)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-fuchsia-100 shadow-[0_12px_24px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.12),inset_0_-10px_14px_rgba(0,0,0,0.22)]";

interface LeaderboardEntry {
  rank: number;
  user: string;
  avatar?: string | null;
  staked: string;
  totalVolume: number;
  completions: number;
  p2pVolume: number;
  p2pCount: number;
  b2bVolume: number;
  b2bCount: number;
  rewardTier: string | null;
  repPoints: number;
  level: number;
  color?: string;
}

interface APILeaderboardEntry {
  rank: number;
  handle: string;
  totalVolume: number;
  totalCompletions: number;
  p2pVolume: number;
  p2pCount: number;
  b2bVolume: number;
  b2bCount: number;
  rewardTier: string | null;
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
      avatar: null,
      staked: formatVolume(entry.totalVolume),
      totalVolume: entry.totalVolume,
      completions: entry.totalCompletions,
      p2pVolume: entry.p2pVolume,
      p2pCount: entry.p2pCount,
      b2bVolume: entry.b2bVolume,
      b2bCount: entry.b2bCount,
      rewardTier: entry.rewardTier,
      repPoints: Math.min(100, entry.totalCompletions * 10 + 20),
      level,
    };
  });
}

function getLeaderboardInitial(user: string): string {
  const cleaned = user.replace(/^@+/, "").trim();
  return cleaned.charAt(0).toUpperCase() || "?";
}

function getLeaderboardGradient(user: string): string {
  const cleaned = user.replace(/^@+/, "").trim().toLowerCase();
  const hash = cleaned.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const gradients = [
    "from-yellow-400 via-amber-500 to-orange-500",
    "from-cyan-400 via-sky-500 to-blue-600",
    "from-fuchsia-400 via-pink-500 to-rose-500",
    "from-violet-500 via-purple-500 to-indigo-600",
    "from-emerald-400 via-teal-500 to-cyan-600",
    "from-orange-400 via-red-500 to-pink-600",
  ];
  return gradients[hash % gradients.length];
}

function getCreatorHref(user: string): string | null {
  const cleaned = user.replace(/^@+/, "").trim();
  if (!cleaned || cleaned === "---") return null;
  return `/creator/${encodeURIComponent(cleaned)}`;
}

function LeaderboardCardLink({
  href,
  className,
  children,
}: {
  href: string | null;
  className?: string;
  children: ReactNode;
}) {
  if (!href) {
    return <div className={className}>{children}</div>;
  }

  return (
    <Link href={href} className={`group block ${className ?? ""}`}>
      {children}
    </Link>
  );
}

function LeaderboardAvatar({
  user,
  avatar,
  sizes,
  textClassName,
  shadowClassName = "",
}: {
  user: string;
  avatar?: string | null;
  sizes: string;
  textClassName: string;
  shadowClassName?: string;
}) {
  if (avatar) {
    return (
      <Image
        src={avatar}
        alt={user}
        fill
        sizes={sizes}
        style={{ objectFit: "cover" }}
        priority
      />
    );
  }

  return (
    <div
      className={`relative flex h-full w-full items-center justify-center overflow-hidden bg-gradient-to-br ${getLeaderboardGradient(user)} ${shadowClassName}`}
      aria-label={user}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_28%_24%,rgba(255,255,255,0.3),transparent_38%),radial-gradient(circle_at_72%_76%,rgba(0,0,0,0.28),transparent_48%)]" />
      <div className="pointer-events-none absolute inset-[10%] rounded-full border border-white/18 shadow-[inset_0_1px_0_rgba(255,255,255,0.14)]" />
      <span className={textClassName}>{getLeaderboardInitial(user)}</span>
    </div>
  );
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
        const res = await fetch("/api/leaderboard?type=CREATOR&limit=50");
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
  const displayedRest = isExpanded ? rest : rest.slice(0, 12);

  const FIRST = top3[0] || { user: "---", avatar: null, staked: "$0", level: 0, completions: 0, rewardTier: null };
  const SECOND = top3[1] || { user: "---", avatar: null, staked: "$0", level: 0, completions: 0, rewardTier: null };
  const THIRD = top3[2] || { user: "---", avatar: null, staked: "$0", level: 0, completions: 0, rewardTier: null };
  const hasThird = Boolean(top3[2]);
  const firstHref = getCreatorHref(FIRST.user);
  const secondHref = getCreatorHref(SECOND.user);
  const thirdHref = getCreatorHref(THIRD.user);
  const totalVolume = leaderboard.reduce((sum, entry) => sum + entry.totalVolume, 0);
  const totalCompletions = leaderboard.reduce((sum, entry) => sum + entry.completions, 0);
  const totalB2B = leaderboard.reduce((sum, entry) => sum + entry.b2bVolume, 0);
  const totalP2P = leaderboard.reduce((sum, entry) => sum + entry.p2pVolume, 0);

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
          className="mb-8 sm:mb-12 max-w-5xl mx-auto"
        >
          <div className={`${raisedPanelClass} px-5 py-8 sm:px-8 sm:py-10 text-center`}>
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_0%,rgba(168,85,247,0.12),transparent_32%),radial-gradient(circle_at_88%_100%,rgba(34,211,238,0.1),transparent_36%),linear-gradient(180deg,rgba(255,255,255,0.05)_0%,transparent_32%,transparent_72%,rgba(0,0,0,0.24)_100%)]" />
            <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/26 to-transparent" />

            <div className="relative">
              <div className="mb-5 flex justify-start">
                <Link
                  href="/streamers"
                  className="group inline-flex items-center gap-2 rounded-full border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06)_0%,rgba(11,11,18,0.94)_100%)] px-3.5 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-300 transition-all duration-300 hover:-translate-x-[2px] hover:border-fuchsia-400/30 hover:text-white shadow-[0_12px_18px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.08)]"
                >
                  <ArrowLeft className="h-3.5 w-3.5 transition-transform duration-300 group-hover:-translate-x-0.5" />
                  Creators
                </Link>
              </div>
              <div className={sectionLabelClass}>
                <Trophy className="w-4 h-4 text-fuchsia-300" />
                HALL OF FAME
              </div>

              <div className="relative mx-auto w-24 h-24 sm:w-32 sm:h-32 md:w-40 md:h-40 mt-6 mb-6">
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
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-yellow-400 to-amber-500">
                  Leaderboard
                </span>
              </h1>
              <div className={`${dentWellClass} mt-5 max-w-2xl mx-auto px-5 py-4`}>
                <p className="text-gray-300/85 font-mono text-sm leading-relaxed uppercase tracking-[0.2em]">
                  Only verified wins count.
                </p>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
                <div className={`${dentWellClass} px-4 py-4 text-left`}>
                  <div className="text-[10px] font-mono uppercase tracking-[0.24em] text-white/45">Ranked</div>
                  <div className="mt-2 text-2xl font-black text-white">{leaderboard.length}</div>
                  <div className="text-[11px] font-mono uppercase tracking-[0.16em] text-white/35">creators</div>
                </div>
                <div className={`${dentWellClass} px-4 py-4 text-left`}>
                  <div className="text-[10px] font-mono uppercase tracking-[0.24em] text-white/45">Volume</div>
                  <div className="mt-2 text-2xl font-black text-yellow-300">{formatVolume(totalVolume)}</div>
                  <div className="text-[11px] font-mono uppercase tracking-[0.16em] text-white/35">verified total</div>
                </div>
                <div className={`${dentWellClass} px-4 py-4 text-left`}>
                  <div className="text-[10px] font-mono uppercase tracking-[0.24em] text-white/45">Completions</div>
                  <div className="mt-2 text-2xl font-black text-cyan-300">{totalCompletions}</div>
                  <div className="text-[11px] font-mono uppercase tracking-[0.16em] text-white/35">finished dares</div>
                </div>
                <div className={`${dentWellClass} px-4 py-4 text-left`}>
                  <div className="text-[10px] font-mono uppercase tracking-[0.24em] text-white/45">Mix</div>
                  <div className="mt-2 text-lg font-black text-fuchsia-200">P2P {formatVolume(totalP2P)}</div>
                  <div className="text-[11px] font-mono uppercase tracking-[0.16em] text-white/35">B2B {formatVolume(totalB2B)}</div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Loading / Error States */}
        {loading ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-12"
          >
            <div className={`${softCardClass} p-8`}>
              <div className="pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-white/22 to-transparent" />
              <Loader2 className="text-yellow-500 animate-spin mb-4 mx-auto" size={40} />
              <p className="text-gray-400 text-sm font-mono">Loading rankings...</p>
            </div>
          </motion.div>
        ) : error ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="max-w-md mx-auto"
          >
            <div className="relative overflow-hidden rounded-[24px] border border-red-500/30 bg-[linear-gradient(180deg,rgba(239,68,68,0.12)_0%,rgba(18,8,8,0.92)_100%)] p-6 text-center shadow-[0_18px_30px_rgba(0,0,0,0.24),inset_0_1px_0_rgba(255,255,255,0.06)]">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          </motion.div>
        ) : leaderboard.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="max-w-md mx-auto"
          >
            <div className={`${softCardClass} p-8 text-center`}>
              <div className="pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-white/22 to-transparent" />
              <Trophy className="text-gray-600 mb-4 mx-auto" size={48} />
              <h2 className="text-xl font-bold text-white mb-2">No Rankings Yet</h2>
              <p className="text-gray-400 text-sm font-mono">
                Complete dares to appear on the leaderboard!
              </p>
            </div>
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
                <LeaderboardCardLink href={firstHref}>
                  <div className="relative overflow-hidden rounded-[24px] border border-yellow-500/30 bg-[radial-gradient(circle_at_50%_0%,rgba(250,204,21,0.16),transparent_42%),linear-gradient(160deg,rgba(28,22,10,0.96)_0%,rgba(13,11,8,0.98)_100%)] p-4 shadow-[0_18px_30px_rgba(0,0,0,0.24),inset_0_1px_0_rgba(255,255,255,0.08),inset_0_-12px_18px_rgba(0,0,0,0.28)] transition-all duration-300 group-hover:-translate-y-[2px] group-hover:border-yellow-400/45">
                    {firstHref ? (
                      <div className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full border border-yellow-400/25 bg-yellow-500/10 px-2.5 py-1 text-[9px] uppercase tracking-[0.18em] text-yellow-100/80">
                        Profile <ArrowRight className="h-3 w-3" />
                      </div>
                    ) : null}
                    <div className="flex items-center gap-4">
                    <div className="relative">
                      <div className="w-16 h-16 rounded-full border-2 border-yellow-400 overflow-hidden shadow-[0_0_20px_rgba(250,204,21,0.4)]">
                        <LeaderboardAvatar
                          user={FIRST.user}
                          avatar={FIRST.avatar}
                          sizes="64px"
                          shadowClassName="shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]"
                          textClassName="text-2xl font-black text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.35)]"
                        />
                      </div>
                      <div className="absolute -top-2 -right-2 w-7 h-7 bg-yellow-500 rounded-full flex items-center justify-center text-black font-black text-sm shadow-lg">
                        1
                      </div>
                    </div>
                    <div className={`${dentWellClass} flex-1 min-w-0 px-4 py-3`}>
                      <p className="text-white font-bold truncate">{FIRST.user}</p>
                      <p className="text-yellow-400 font-black text-lg">{FIRST.staked}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] font-mono uppercase tracking-[0.16em] text-white/45">
                        <span>{FIRST.completions} completions</span>
                        {FIRST.rewardTier ? <span className="text-yellow-200/70">{FIRST.rewardTier}</span> : null}
                      </div>
                      <div className="mt-2">
                        <LiquidProgressBar value={FIRST.level} color="yellow" />
                      </div>
                    </div>
                  </div>
                  </div>
                </LeaderboardCardLink>

                {/* 2nd Place */}
                <LeaderboardCardLink href={secondHref}>
                  <div className="relative overflow-hidden rounded-[24px] border border-cyan-500/30 bg-[radial-gradient(circle_at_50%_0%,rgba(34,211,238,0.14),transparent_42%),linear-gradient(160deg,rgba(10,20,28,0.96)_0%,rgba(7,10,14,0.98)_100%)] p-4 shadow-[0_18px_30px_rgba(0,0,0,0.24),inset_0_1px_0_rgba(255,255,255,0.08),inset_0_-12px_18px_rgba(0,0,0,0.28)] transition-all duration-300 group-hover:-translate-y-[2px] group-hover:border-cyan-400/45">
                    {secondHref ? (
                      <div className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full border border-cyan-400/25 bg-cyan-500/10 px-2.5 py-1 text-[9px] uppercase tracking-[0.18em] text-cyan-100/80">
                        Profile <ArrowRight className="h-3 w-3" />
                      </div>
                    ) : null}
                    <div className="flex items-center gap-4">
                    <div className="relative">
                      <div className="w-14 h-14 rounded-full border-2 border-cyan-400 overflow-hidden shadow-[0_0_15px_rgba(87,202,244,0.4)]">
                        <LeaderboardAvatar
                          user={SECOND.user}
                          avatar={SECOND.avatar}
                          sizes="56px"
                          shadowClassName="shadow-[inset_0_1px_0_rgba(255,255,255,0.22)]"
                          textClassName="text-xl font-black text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.35)]"
                        />
                      </div>
                      <div className="absolute -top-2 -right-2 w-6 h-6 bg-cyan-400 rounded-full flex items-center justify-center text-black font-black text-xs shadow-lg">
                        2
                      </div>
                    </div>
                    <div className={`${dentWellClass} flex-1 min-w-0 px-4 py-3`}>
                      <p className="text-white font-bold text-sm truncate">{SECOND.user}</p>
                      <p className="text-cyan-400 font-black">{SECOND.staked}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] font-mono uppercase tracking-[0.16em] text-white/45">
                        <span>{SECOND.completions} completions</span>
                        {SECOND.rewardTier ? <span className="text-cyan-100/70">{SECOND.rewardTier}</span> : null}
                      </div>
                      <div className="mt-2">
                        <LiquidProgressBar value={SECOND.level} color="cyan" />
                      </div>
                    </div>
                  </div>
                  </div>
                </LeaderboardCardLink>

                {/* 3rd Place */}
                {hasThird ? (
                  <LeaderboardCardLink href={thirdHref}>
                    <div className="relative overflow-hidden rounded-[24px] border border-pink-500/30 bg-[radial-gradient(circle_at_50%_0%,rgba(236,72,153,0.14),transparent_42%),linear-gradient(160deg,rgba(26,10,20,0.96)_0%,rgba(13,8,12,0.98)_100%)] p-4 shadow-[0_18px_30px_rgba(0,0,0,0.24),inset_0_1px_0_rgba(255,255,255,0.08),inset_0_-12px_18px_rgba(0,0,0,0.28)] transition-all duration-300 group-hover:-translate-y-[2px] group-hover:border-pink-400/45">
                      {thirdHref ? (
                        <div className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full border border-pink-400/25 bg-pink-500/10 px-2.5 py-1 text-[9px] uppercase tracking-[0.18em] text-pink-100/80">
                          Profile <ArrowRight className="h-3 w-3" />
                        </div>
                      ) : null}
                      <div className="flex items-center gap-4">
                      <div className="relative">
                        <div className="w-12 h-12 rounded-full border-2 border-pink-400 overflow-hidden shadow-[0_0_15px_rgba(236,0,140,0.4)]">
                          <LeaderboardAvatar
                            user={THIRD.user}
                            avatar={THIRD.avatar}
                            sizes="48px"
                            shadowClassName="shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]"
                            textClassName="text-lg font-black text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.35)]"
                          />
                        </div>
                        <div className="absolute -top-2 -right-2 w-6 h-6 bg-pink-400 rounded-full flex items-center justify-center text-black font-black text-xs shadow-lg">
                          3
                        </div>
                      </div>
                      <div className={`${dentWellClass} flex-1 min-w-0 px-4 py-3`}>
                        <p className="text-white font-bold text-sm truncate">{THIRD.user}</p>
                        <p className="text-pink-400 font-black">{THIRD.staked}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] font-mono uppercase tracking-[0.16em] text-white/45">
                          <span>{THIRD.completions} completions</span>
                          {THIRD.rewardTier ? <span className="text-pink-100/70">{THIRD.rewardTier}</span> : null}
                        </div>
                        <div className="mt-2">
                          <LiquidProgressBar value={THIRD.level} color="pink" />
                        </div>
                      </div>
                    </div>
                    </div>
                  </LeaderboardCardLink>
                ) : (
                  <div className="relative overflow-hidden rounded-[24px] border border-amber-500/28 bg-[radial-gradient(circle_at_50%_0%,rgba(251,146,60,0.14),transparent_42%),linear-gradient(160deg,rgba(30,18,10,0.96)_0%,rgba(15,9,7,0.98)_100%)] p-4 shadow-[0_18px_30px_rgba(0,0,0,0.24),inset_0_1px_0_rgba(255,255,255,0.08),inset_0_-12px_18px_rgba(0,0,0,0.28)]">
                    <div className="flex items-center gap-4">
                      <div className="relative flex h-12 w-12 items-center justify-center rounded-full border-2 border-amber-300/30 bg-[radial-gradient(circle_at_28%_24%,rgba(255,255,255,0.14),transparent_40%),linear-gradient(180deg,rgba(255,255,255,0.05),rgba(12,10,9,0.92))] shadow-[0_0_15px_rgba(251,146,60,0.2)]">
                        <span className="text-lg font-black text-amber-200">3</span>
                      </div>
                      <div className={`${dentWellClass} flex-1 min-w-0 px-4 py-3`}>
                        <p className="text-amber-100 font-black text-sm uppercase tracking-[0.18em]">#3 Unclaimed</p>
                        <p className="mt-1 text-sm text-white/70">Be the first to take this spot.</p>
                        <Link
                          href="/#active-bounties"
                          className="mt-3 inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-amber-100"
                        >
                          Browse Dares <ArrowRight className="h-3 w-3" />
                        </Link>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Desktop: Podium layout */}
              <div className="hidden sm:flex items-end justify-center gap-4 md:gap-6">
                {/* 2nd Place */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="w-[30%] flex flex-col"
                >
                  <LeaderboardCardLink href={secondHref}>
                    <div className="relative overflow-hidden rounded-[26px] border border-cyan-500/30 bg-[radial-gradient(circle_at_50%_0%,rgba(34,211,238,0.14),transparent_42%),linear-gradient(160deg,rgba(10,20,28,0.96)_0%,rgba(7,10,14,0.98)_100%)] p-5 text-center shadow-[0_18px_30px_rgba(0,0,0,0.24),inset_0_1px_0_rgba(255,255,255,0.08),inset_0_-12px_18px_rgba(0,0,0,0.28)] transition-all duration-300 group-hover:-translate-y-[3px] group-hover:border-cyan-400/45">
                    {secondHref ? (
                      <div className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full border border-cyan-400/25 bg-cyan-500/10 px-2.5 py-1 text-[9px] uppercase tracking-[0.18em] text-cyan-100/80 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                        View <ArrowRight className="h-3 w-3" />
                      </div>
                    ) : null}
                    <div className="relative w-20 h-20 mx-auto mb-3">
                      <div className="w-full h-full rounded-full border-3 border-cyan-400 overflow-hidden shadow-[0_0_20px_rgba(87,202,244,0.4)]">
                        <LeaderboardAvatar
                          user={SECOND.user}
                          avatar={SECOND.avatar}
                          sizes="80px"
                          shadowClassName="shadow-[inset_0_1px_0_rgba(255,255,255,0.22)]"
                          textClassName="text-3xl font-black text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.4)]"
                        />
                      </div>
                      <div className="absolute -top-2 -right-2 w-8 h-8 bg-cyan-400 rounded-full flex items-center justify-center text-black font-black text-sm shadow-lg">
                        2
                      </div>
                    </div>
                    <div className={`${dentWellClass} px-4 py-4`}>
                      <p className="text-white font-bold truncate mb-1">{SECOND.user}</p>
                      <p className="text-cyan-400 font-black text-xl mb-3">{SECOND.staked}</p>
                      <div className="mb-3 flex flex-wrap items-center justify-center gap-2 text-[10px] font-mono uppercase tracking-[0.16em] text-white/45">
                        <span>{SECOND.completions} completions</span>
                        {SECOND.rewardTier ? <span className="text-cyan-100/70">{SECOND.rewardTier}</span> : null}
                      </div>
                      <LiquidProgressBar value={SECOND.level} color="cyan" />
                      <p className="text-[10px] text-gray-500 font-mono mt-2">LVL {Math.floor(SECOND.level / 10)}</p>
                    </div>
                    </div>
                  </LeaderboardCardLink>
                  <div className="relative mt-3 h-28 rounded-[26px_26px_20px_20px] border border-cyan-400/22 bg-[linear-gradient(180deg,rgba(130,236,255,0.16)_0%,rgba(12,28,36,0.92)_18%,rgba(6,10,16,0.98)_100%)] px-4 pb-5 pt-4 shadow-[0_22px_36px_rgba(0,0,0,0.24),inset_0_1px_0_rgba(255,255,255,0.08),inset_0_-16px_22px_rgba(0,0,0,0.26)]">
                    <div className="pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-cyan-200/35 to-transparent" />
                    <div className={`${dentWellClass} h-full rounded-[18px] px-4 py-4 text-center`}>
                      <p className="text-[10px] font-mono uppercase tracking-[0.26em] text-cyan-100/52">Second</p>
                      <p className="mt-2 text-2xl font-black text-cyan-200">02</p>
                    </div>
                  </div>
                </motion.div>

                {/* 1st Place */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                  className="w-[35%] z-10 flex flex-col"
                >
                  <LeaderboardCardLink href={firstHref}>
                  <div className="relative overflow-hidden rounded-[28px] border border-yellow-500/30 bg-[radial-gradient(circle_at_50%_0%,rgba(250,204,21,0.16),transparent_42%),linear-gradient(160deg,rgba(28,22,10,0.96)_0%,rgba(13,11,8,0.98)_100%)] p-6 text-center shadow-[0_20px_34px_rgba(0,0,0,0.24),inset_0_1px_0_rgba(255,255,255,0.08),inset_0_-12px_18px_rgba(0,0,0,0.28)] transition-all duration-300 group-hover:-translate-y-[3px] group-hover:border-yellow-400/45">
                    {/* Glow effect */}
                    <div className="absolute inset-0 bg-gradient-to-b from-yellow-500/10 via-transparent to-transparent pointer-events-none" />
                    {firstHref ? (
                      <div className="absolute right-4 top-4 inline-flex items-center gap-1 rounded-full border border-yellow-400/25 bg-yellow-500/10 px-2.5 py-1 text-[9px] uppercase tracking-[0.18em] text-yellow-100/80 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                        View <ArrowRight className="h-3 w-3" />
                      </div>
                    ) : null}

                    <div className="relative">
                      <div className="relative w-24 h-24 md:w-28 md:h-28 mx-auto mb-4">
                        <div className="w-full h-full rounded-full border-4 border-yellow-400 overflow-hidden shadow-[0_0_30px_rgba(250,204,21,0.5)]">
                          <LeaderboardAvatar
                            user={FIRST.user}
                            avatar={FIRST.avatar}
                            sizes="112px"
                            shadowClassName="shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]"
                            textClassName="text-4xl font-black text-white drop-shadow-[0_3px_14px_rgba(0,0,0,0.45)]"
                          />
                        </div>
                        <div className="absolute -top-3 -right-3 w-10 h-10 bg-yellow-500 rounded-full flex items-center justify-center text-black font-black shadow-lg">
                          <Crown className="w-5 h-5" />
                        </div>
                      </div>
                      <div className={`${dentWellClass} px-4 py-4`}>
                        <p className="text-white font-bold text-lg truncate mb-1">{FIRST.user}</p>
                        <p className="text-yellow-400 font-black text-2xl md:text-3xl mb-4">{FIRST.staked}</p>
                        <div className="mb-4 flex flex-wrap items-center justify-center gap-2 text-[10px] font-mono uppercase tracking-[0.16em] text-white/45">
                          <span>{FIRST.completions} completions</span>
                          {FIRST.rewardTier ? <span className="text-yellow-100/75">{FIRST.rewardTier}</span> : null}
                        </div>
                        <LiquidProgressBar value={FIRST.level} color="yellow" />
                        <p className="text-xs text-gray-500 font-mono mt-2">LVL {Math.floor(FIRST.level / 10)}</p>
                      </div>
                    </div>
                  </div>
                  </LeaderboardCardLink>
                  <div className="relative mt-3 h-40 rounded-[28px_28px_22px_22px] border border-yellow-400/22 bg-[linear-gradient(180deg,rgba(250,204,21,0.2)_0%,rgba(44,32,8,0.9)_18%,rgba(10,8,6,0.98)_100%)] px-4 pb-5 pt-4 shadow-[0_24px_40px_rgba(0,0,0,0.26),inset_0_1px_0_rgba(255,255,255,0.08),inset_0_-18px_24px_rgba(0,0,0,0.26)]">
                    <div className="pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-yellow-200/45 to-transparent" />
                    <div className={`${dentWellClass} h-full rounded-[20px] px-4 py-4 text-center`}>
                      <p className="text-[10px] font-mono uppercase tracking-[0.26em] text-yellow-100/58">Champion</p>
                      <p className="mt-2 text-3xl font-black text-yellow-300">01</p>
                    </div>
                  </div>
                </motion.div>

                {/* 3rd Place */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 }}
                  className="w-[30%] flex flex-col"
                >
                  {hasThird ? (
                    <LeaderboardCardLink href={thirdHref}>
                      <div className="relative overflow-hidden rounded-[24px] border border-pink-500/30 bg-[radial-gradient(circle_at_50%_0%,rgba(236,72,153,0.14),transparent_42%),linear-gradient(160deg,rgba(26,10,20,0.96)_0%,rgba(13,8,12,0.98)_100%)] p-4 text-center shadow-[0_18px_30px_rgba(0,0,0,0.24),inset_0_1px_0_rgba(255,255,255,0.08),inset_0_-12px_18px_rgba(0,0,0,0.28)] transition-all duration-300 group-hover:-translate-y-[3px] group-hover:border-pink-400/45">
                      {thirdHref ? (
                        <div className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full border border-pink-400/25 bg-pink-500/10 px-2.5 py-1 text-[9px] uppercase tracking-[0.18em] text-pink-100/80 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                          View <ArrowRight className="h-3 w-3" />
                        </div>
                      ) : null}
                      <div className="relative w-16 h-16 mx-auto mb-3">
                        <div className="w-full h-full rounded-full border-3 border-pink-400 overflow-hidden shadow-[0_0_15px_rgba(236,0,140,0.4)]">
                          <LeaderboardAvatar
                            user={THIRD.user}
                            avatar={THIRD.avatar}
                            sizes="64px"
                            shadowClassName="shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]"
                            textClassName="text-2xl font-black text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.35)]"
                          />
                        </div>
                        <div className="absolute -top-2 -right-2 w-7 h-7 bg-pink-400 rounded-full flex items-center justify-center text-black font-black text-sm shadow-lg">
                          3
                        </div>
                      </div>
                      <div className={`${dentWellClass} px-4 py-4`}>
                        <p className="text-white font-bold text-sm truncate mb-1">{THIRD.user}</p>
                        <p className="text-pink-400 font-black text-lg mb-3">{THIRD.staked}</p>
                        <div className="mb-3 flex flex-wrap items-center justify-center gap-2 text-[10px] font-mono uppercase tracking-[0.16em] text-white/45">
                          <span>{THIRD.completions} completions</span>
                          {THIRD.rewardTier ? <span className="text-pink-100/70">{THIRD.rewardTier}</span> : null}
                        </div>
                        <LiquidProgressBar value={THIRD.level} color="pink" />
                        <p className="text-[10px] text-gray-500 font-mono mt-2">LVL {Math.floor(THIRD.level / 10)}</p>
                      </div>
                      </div>
                    </LeaderboardCardLink>
                  ) : (
                    <div className="relative overflow-hidden rounded-[24px] border border-amber-500/28 bg-[radial-gradient(circle_at_50%_0%,rgba(251,146,60,0.14),transparent_42%),linear-gradient(160deg,rgba(30,18,10,0.96)_0%,rgba(15,9,7,0.98)_100%)] p-4 text-center shadow-[0_18px_30px_rgba(0,0,0,0.24),inset_0_1px_0_rgba(255,255,255,0.08),inset_0_-12px_18px_rgba(0,0,0,0.28)]">
                      <div className="relative mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full border-2 border-amber-300/30 bg-[radial-gradient(circle_at_30%_25%,rgba(255,255,255,0.12),transparent_38%),linear-gradient(180deg,rgba(255,255,255,0.04),rgba(12,10,9,0.92))] shadow-[0_0_15px_rgba(251,146,60,0.24)]">
                        <span className="text-2xl font-black text-amber-200">3</span>
                      </div>
                      <div className={`${dentWellClass} px-4 py-4`}>
                        <p className="text-amber-100 font-black text-sm uppercase tracking-[0.18em] mb-2">#3 Unclaimed</p>
                        <p className="text-white/72 text-sm leading-relaxed">Be the first to take this spot.</p>
                        <Link
                          href="/#active-bounties"
                          className="mt-4 inline-flex items-center gap-2 rounded-full border border-amber-300/24 bg-amber-500/10 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.18em] text-amber-100 transition-colors hover:bg-amber-500/16"
                        >
                          Browse Dares <ArrowRight className="h-3 w-3" />
                        </Link>
                      </div>
                    </div>
                  )}
                  <div className="relative mt-3 h-20 rounded-[24px_24px_18px_18px] border border-pink-400/22 bg-[linear-gradient(180deg,rgba(236,72,153,0.18)_0%,rgba(38,10,26,0.92)_18%,rgba(14,6,10,0.98)_100%)] px-4 pb-4 pt-4 shadow-[0_20px_34px_rgba(0,0,0,0.24),inset_0_1px_0_rgba(255,255,255,0.08),inset_0_-16px_22px_rgba(0,0,0,0.24)]">
                    <div className="pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-pink-200/35 to-transparent" />
                    <div className={`${dentWellClass} h-full rounded-[16px] px-4 py-3 text-center`}>
                      <p className="text-[10px] font-mono uppercase tracking-[0.26em] text-pink-100/52">
                        {hasThird ? 'Third' : 'Open'}
                      </p>
                      <p className="mt-1.5 text-2xl font-black text-pink-200">03</p>
                    </div>
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
                className="max-w-2xl mx-auto"
              >
                <div className={`${softCardClass} p-4 sm:p-5`}>
                  <div className="pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-white/22 to-transparent" />
                  <div className="mb-5 flex items-center justify-between gap-3">
                    <div>
                      <h2 className="text-xl font-black italic tracking-tight text-white">Full Rankings</h2>
                      <p className="mt-1 text-[11px] font-mono uppercase tracking-[0.18em] text-gray-500">
                        beyond the podium
                      </p>
                    </div>
                    <div className={`${dentWellClass} rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-white/55`}>
                      {leaderboard.length} creators ranked
                    </div>
                  </div>
                  <div className="space-y-2 sm:space-y-3">
                    <AnimatePresence mode="popLayout">
                      {displayedRest.map((entry, index) => (
                        <motion.div
                          key={entry.rank}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          transition={{ delay: index * 0.05 }}
                        >
                          <LeaderboardCardLink
                            href={getCreatorHref(entry.user)}
                            className={`${insetCardClass} p-3 sm:p-4 transition-all duration-300 hover:-translate-y-[1px] hover:border-purple-400/25`}
                          >
                          <div className="flex items-center gap-3 sm:gap-4">
                            <div className={`${dentWellClass} w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0`}>
                              <span className="text-purple-400 font-black text-sm sm:text-base">{entry.rank}</span>
                            </div>

                            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border border-white/20 overflow-hidden shrink-0 relative shadow-[0_10px_18px_rgba(0,0,0,0.16)]">
                              <LeaderboardAvatar
                                user={entry.user}
                                avatar={entry.avatar}
                                sizes="48px"
                                shadowClassName="shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]"
                                textClassName="text-lg font-black text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.35)]"
                              />
                            </div>

                            <div className={`${dentWellClass} flex-1 min-w-0 px-3 py-3`}>
                              <div className="flex items-center justify-between gap-2 mb-1.5">
                                <p className="text-white font-bold text-sm truncate">{entry.user}</p>
                                <p className="text-yellow-400 font-black text-sm shrink-0">{entry.staked}</p>
                              </div>
                              <div className="mb-2 flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.14em] text-gray-500">
                                <span>{entry.completions} completions</span>
                                <span>•</span>
                                <span>{entry.repPoints} rep</span>
                              </div>
                              <div className="mb-2 flex flex-wrap items-center gap-2 text-[10px] font-mono uppercase tracking-[0.14em] text-white/40">
                                {entry.p2pCount > 0 ? <span>P2P {formatVolume(entry.p2pVolume)}</span> : null}
                                {entry.p2pCount > 0 && entry.b2bCount > 0 ? <span>•</span> : null}
                                {entry.b2bCount > 0 ? <span>B2B {formatVolume(entry.b2bVolume)}</span> : null}
                                {!entry.p2pCount && !entry.b2bCount ? <span>fresh trail</span> : null}
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
                            <div className="hidden sm:flex items-center justify-center text-white/30 transition-all duration-200 group-hover:translate-x-1 group-hover:text-white/60">
                              <ArrowRight className="h-4 w-4" />
                            </div>
                          </div>
                          </LeaderboardCardLink>
                        </motion.div>
                      ))}
                    </AnimatePresence>

                    {rest.length > 12 && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-center pt-4"
                      >
                        <button
                          onClick={() => setIsExpanded(!isExpanded)}
                          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05)_0%,rgba(11,11,18,0.95)_100%)] px-4 py-2 text-xs font-bold text-gray-400 hover:text-white uppercase tracking-wider transition-all shadow-[0_12px_18px_rgba(0,0,0,0.16),inset_0_1px_0_rgba(255,255,255,0.08)]"
                        >
                          {isExpanded ? (
                            <>
                              Show Less <ChevronUp className="w-4 h-4" />
                            </>
                          ) : (
                            <>
                              Show All ({rest.length} more) <ChevronDown className="w-4 h-4" />
                            </>
                          )}
                        </button>
                      </motion.div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Bottom CTA */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="max-w-md mx-auto mt-10 sm:mt-12"
            >
              <div className={`${softCardClass} p-5 sm:p-6 text-center`}>
                <div className="pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-white/22 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-yellow-500/5 pointer-events-none" />
                <div className="relative z-10">
                          <div className={`${dentWellClass} w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3`}>
                            <Flame className="w-6 h-6 text-purple-400" />
                          </div>
                  <h3 className="text-lg font-bold text-white mb-2">Want to Climb?</h3>
                  <p className="text-xs sm:text-sm text-gray-400 font-mono mb-4">
                    Complete more dares to rise through the ranks
                  </p>
                  <Link
                    href="/#active-bounties"
                    className="inline-flex items-center gap-2 rounded-[16px] border border-purple-400/25 bg-[linear-gradient(145deg,rgba(50,24,84,0.92),rgba(20,12,36,0.98))] px-5 py-3 text-sm font-bold uppercase tracking-wider text-white shadow-[0_14px_28px_rgba(0,0,0,0.34),inset_0_1px_0_rgba(255,255,255,0.08),inset_0_-12px_16px_rgba(0,0,0,0.24)] transition-all hover:border-purple-300/40 hover:bg-[linear-gradient(145deg,rgba(58,28,96,0.96),rgba(24,14,42,1))]"
                  >
                    Browse Dares
                  </Link>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </div>
    </div>
  );
}
