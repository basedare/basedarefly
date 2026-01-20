"use client";

import { useState, useEffect } from "react";
import GalaxyBackground from "@/components/GalaxyBackground";
import MoltenGold from "@/components/ui/MoltenGold";
import { ElectricCard } from "@/components/ui/electric-card";
import LeaderboardList from "@/components/LeaderboardList";
import { Medal, Loader2, Trophy } from "lucide-react";
import Image from 'next/image';

interface LeaderboardEntry {
  rank: number;
  user: string;
  avatar: string;
  staked: string;
  repPoints: number;
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

function mapAPIToLeaderboard(entries: APILeaderboardEntry[]): LeaderboardEntry[] {
  const colors = ['#FACC15', '#94a3b8', '#cd7f32'];
  return entries.map((entry, index) => ({
    rank: entry.rank,
    user: entry.handle || `Creator ${index + 1}`,
    avatar: `/assets/avatars/${(index % 8) + 1}.jpg`,
    staked: formatVolume(entry.totalVolume),
    repPoints: Math.min(100, entry.totalCompletions * 10 + 20),
    color: colors[index] || undefined,
  }));
}

export default function LeaderboardPage() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchLeaderboard() {
      try {
        setLoading(true);
        const res = await fetch('/api/leaderboard?type=CREATOR&limit=20');
        if (!res.ok) throw new Error('Failed to fetch leaderboard');
        const json = await res.json();

        if (json.success && json.data?.leaderboard) {
          setLeaderboard(mapAPIToLeaderboard(json.data.leaderboard));
        } else {
          setLeaderboard([]);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load leaderboard');
      } finally {
        setLoading(false);
      }
    }

    fetchLeaderboard();
  }, []);

  // Get top 3 for podium
  const FIRST = leaderboard[0] || { user: '---', avatar: '/assets/avatars/1.jpg', staked: '$0', repPoints: 0 };
  const SECOND = leaderboard[1] || { user: '---', avatar: '/assets/avatars/2.jpg', staked: '$0', repPoints: 0 };
  const THIRD = leaderboard[2] || { user: '---', avatar: '/assets/avatars/3.jpg', staked: '$0', repPoints: 0 };

  return (
    <main className="min-h-screen w-full bg-[#020204] relative overflow-hidden pt-32 pb-20">
      <GalaxyBackground />

      {/* HEADER & CROWN */}
      <div className="relative z-10 text-center mb-20 space-y-6">
          {/* Crown Container – Larger for impact, no placeholder flash */}
          <div className="relative mx-auto w-32 h-32 md:w-40 md:h-40 mb-10">
              <Image 
                  src="/assets/peebear-crown.png" 
                  alt="PeeBear Champion Crown" 
                  fill 
                  sizes="160px"
                  placeholder="empty"
                  priority
                  style={{ objectFit: 'contain' }}
                  className="drop-shadow-[0_0_30px_rgba(250,204,21,0.8)] animate-bounce-slow" 
              />
          </div>

          <h2 className="text-base font-bold text-purple-400 uppercase tracking-[0.5em]">The Apex</h2>
          <MoltenGold className="text-6xl md:text-8xl">LEADERBOARD</MoltenGold> 
      </div>

      {/* 3. THE PODIUM (Top 3) */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 mb-32 w-full">
            <div className="flex flex-col md:flex-row items-end justify-center gap-8 md:gap-12">
                
                {/* 2ND PLACE (Silver) */}
                <div className="order-2 md:order-1 w-full md:w-[30%] h-[320px] transform md:translate-y-8">
                    <ElectricCard color="#94a3b8" variant="swirl" className="h-full rounded-2xl p-6">
                        <div className="flex flex-col items-center justify-end h-full text-center backdrop-blur-xl bg-black/10 rounded-2xl border border-white/10">
                            <div className="absolute top-4 left-4 text-[#94a3b8] opacity-50"><Medal size={24} /></div>
                            <div className="w-20 h-20 rounded-full border-4 border-[#94a3b8] p-1 mb-4 shadow-[0_0_20px_rgba(148,163,184,0.3)] relative overflow-hidden">
                                <Image src={SECOND.avatar} alt={SECOND.user} fill sizes="80px" style={{ objectFit: 'cover' }} priority />
                            </div>
                            <div className="text-2xl font-black text-white font-serif tracking-wide">{SECOND.user}</div>
                            <div className="text-[#94a3b8] font-bold text-sm tracking-widest uppercase mb-2">2nd Place</div>
                            <div className="text-3xl font-black text-white drop-shadow-md">{SECOND.staked}</div>
                        </div>
                    </ElectricCard>
                </div>

                {/* 1ST PLACE (Gold) */}
                <div className="order-1 md:order-2 w-full md:w-[35%] h-[380px] z-20 relative">
                    <ElectricCard color="#FACC15" variant="hue" className="h-full rounded-2xl p-6">
                        <div className="flex flex-col items-center justify-end h-full text-center backdrop-blur-xl bg-black/10 rounded-2xl border border-white/10">
                            <div className="w-28 h-28 rounded-full border-4 border-[#FACC15] p-1 mb-6 shadow-[0_0_40px_rgba(250,204,21,0.4)] relative overflow-hidden">
                                <Image src={FIRST.avatar} alt={FIRST.user} fill sizes="112px" style={{ objectFit: 'cover' }} priority />
                            </div>
                            <div className="text-3xl font-black text-white font-serif tracking-wide mb-1">{FIRST.user}</div>
                            <div className="text-[#FACC15] font-black text-lg tracking-[0.3em] uppercase mb-4">1st Place</div>
                            <div className="text-4xl md:text-5xl font-black text-[#FACC15] drop-shadow-[0_4px_4px_rgba(0,0,0,0.8)]">{FIRST.staked}</div>
                        </div>
                    </ElectricCard>
                </div>

                {/* 3RD PLACE (Bronze) */}
                <div className="order-3 w-full md:w-[30%] h-[300px] transform md:translate-y-16">
                    <ElectricCard color="#cd7f32" variant="swirl" className="h-full rounded-2xl p-6">
                        <div className="flex flex-col items-center justify-end h-full text-center backdrop-blur-xl bg-black/10 rounded-2xl border border-white/10">
                            <div className="absolute top-4 right-4 text-[#cd7f32] opacity-50"><Medal size={24} /></div>
                            <div className="w-16 h-16 rounded-full border-4 border-[#cd7f32] p-1 mb-4 shadow-[0_0_20px_rgba(205,127,50,0.3)] relative overflow-hidden">
                                <Image src={THIRD.avatar} alt={THIRD.user} fill sizes="64px" style={{ objectFit: 'cover' }} priority />
                            </div>
                            <div className="text-xl font-black text-white font-serif tracking-wide">{THIRD.user}</div>
                            <div className="text-[#cd7f32] font-bold text-sm tracking-widest uppercase mb-2">3rd Place</div>
                            <div className="text-2xl font-black text-white drop-shadow-md">{THIRD.staked}</div>
                        </div>
                    </ElectricCard>
                </div>
            </div>

        {/* Subtle Cosmic Divider for Clear Separation */}
        <div className="mt-20 mb-16 flex justify-center">
            <div className="w-full max-w-2xl h-px bg-gradient-to-r from-transparent via-purple-500/50 to-transparent shadow-[0_0_20px_rgba(168,85,247,0.6)]" />
        </div>
      </div>

      {/* 4. THE LIST (Ranks 4+) */}
      <div className="relative z-10 max-w-5xl mx-auto px-6 w-full">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="text-purple-500 animate-spin mb-4" size={40} />
            <p className="text-gray-400">Loading rankings...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-red-400">{error}</p>
          </div>
        ) : leaderboard.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Trophy className="text-gray-600 mb-4" size={48} />
            <h2 className="text-2xl font-bold text-white mb-2">No Rankings Yet</h2>
            <p className="text-gray-400 max-w-md">
              Complete dares to appear on the leaderboard!
            </p>
          </div>
        ) : leaderboard.length > 3 ? (
          <LeaderboardList data={leaderboard.slice(3)} />
        ) : null}
      </div>
    </main>
  );
}
