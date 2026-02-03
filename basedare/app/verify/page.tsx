'use client';
import React, { useState, useEffect, useCallback } from "react";
import { Shield, Zap, Trophy, Flame, Gift } from "lucide-react";
import { useAccount } from 'wagmi';
import Link from 'next/link';
import TruthOracle from "@/components/TruthOracle";
import GradualBlurOverlay from "@/components/GradualBlurOverlay";
import LiquidBackground from "@/components/LiquidBackground";

interface VoterPoints {
  totalPoints: number;
  correctVotes: number;
  totalVotes: number;
  streak: number;
  accuracy: number;
  rank: number | null;
  isNewVoter: boolean;
}

export default function Verify() {
  const { address, isConnected } = useAccount();
  const [points, setPoints] = useState<VoterPoints | null>(null);

  const fetchPoints = useCallback(async () => {
    if (!address) {
      setPoints(null);
      return;
    }
    try {
      const res = await fetch(`/api/verify/points?wallet=${address}`);
      const data = await res.json();
      if (data.success) {
        setPoints(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch points:', error);
    }
  }, [address]);

  useEffect(() => {
    let mounted = true;
    const loadPoints = async () => {
      if (mounted) {
        await fetchPoints();
      }
    };
    loadPoints();
    return () => {
      mounted = false;
    };
  }, [fetchPoints]);

  return (
    <div className="relative min-h-screen flex flex-col pt-20 pb-12 px-4 md:px-8">
      <LiquidBackground />
      {/* Gradual Blur Overlay */}
      <div className="fixed inset-0 z-10 pointer-events-none"><GradualBlurOverlay intensity="light" /></div>

      <div className="container mx-auto px-2 sm:px-6 relative z-10 mb-12 flex-grow max-w-7xl">

        {/* AIRDROP TEASER BANNER */}
        <div className="mb-6 p-4 bg-gradient-to-r from-purple-500/10 via-blue-500/10 to-purple-500/10 border border-purple-500/20 rounded-xl backdrop-blur-xl relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 via-transparent to-blue-500/5 animate-pulse" />
          <div className="relative flex items-center gap-3 flex-wrap justify-center text-center sm:text-left sm:justify-start">
            <Gift className="w-5 h-5 text-purple-400 flex-shrink-0" />
            <p className="text-xs sm:text-sm text-gray-300 font-mono">
              <span className="text-purple-400 font-bold">Earn VERIFY points</span> for every vote. Accurate voters earn bonus multipliers.
              Points will count toward the upcoming <Link href="/airdrop" className="text-yellow-400 font-bold hover:underline">$BARE token airdrop</Link>.
            </p>
          </div>
        </div>

        {/* HEADER - Apple Liquid Glass */}
        <div className="mb-8 md:mb-12">
          {/* Live Badge + Points Display */}
          <div className="flex flex-wrap justify-center items-center gap-3 mb-4">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-500/10 border border-green-500/20 rounded-full backdrop-blur-xl">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-[10px] font-mono text-green-400 uppercase tracking-wider">Live</span>
            </div>

            {isConnected && points && (
              <>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-full backdrop-blur-xl">
                  <Trophy className="w-3 h-3 text-blue-400" />
                  <span className="text-[10px] font-mono text-blue-400 uppercase tracking-wider">
                    {points.totalPoints.toLocaleString()} pts
                  </span>
                </div>

                {points.streak > 0 && (
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-orange-500/10 border border-orange-500/20 rounded-full backdrop-blur-xl">
                    <Flame className="w-3 h-3 text-orange-400" />
                    <span className="text-[10px] font-mono text-orange-400 uppercase tracking-wider">
                      {points.streak} streak
                    </span>
                  </div>
                )}

                {points.rank && (
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-yellow-500/10 border border-yellow-500/20 rounded-full backdrop-blur-xl">
                    <span className="text-[10px] font-mono text-yellow-400 uppercase tracking-wider">
                      Rank #{points.rank}
                    </span>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="text-center">
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black uppercase italic tracking-tighter mb-3 flex items-center justify-center gap-2 sm:gap-4 flex-wrap">
              <Shield className="text-blue-500 w-7 h-7 sm:w-10 sm:h-10 flex-shrink-0" />
              <span>TRUTH</span>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-600">PROTOCOL</span>
            </h1>
            <p className="text-gray-400 font-mono text-xs sm:text-sm max-w-xl mx-auto">
              Community-powered verification. Review proof, cast your vote, earn rewards.
            </p>
          </div>
        </div>

        {/* THE ORACLE INTERFACE */}
        <TruthOracle onPointsChange={fetchPoints} />

        {/* INSTRUCTIONS - Liquid Glass Cards */}
        <div className="mt-8 md:mt-12 grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          {[
            {
              step: '1',
              title: 'Review Proof',
              description: 'Watch the submitted video or image evidence. Does it show the dare being completed?',
              color: 'blue'
            },
            {
              step: '2',
              title: 'Cast Vote',
              description: 'Vote VALID if the proof is legit and shows completion. Vote FAKE if the proof is insufficient or fraudulent.',
              color: 'purple'
            },
            {
              step: '3',
              title: 'Earn Points',
              description: 'Get 5 points per vote. When consensus is reached, voters on the winning side earn +15 bonus points plus streak multipliers.',
              color: 'green'
            }
          ].map((item) => (
            <div
              key={item.step}
              className="relative p-4 sm:p-5 backdrop-blur-2xl bg-white/[0.02] border border-white/[0.06] rounded-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] overflow-hidden group hover:bg-white/[0.04] transition-colors"
            >
              {/* Top highlight */}
              <div className="absolute top-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

              {/* Step number */}
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold mb-3 ${
                item.color === 'blue' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                item.color === 'purple' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' :
                'bg-green-500/20 text-green-400 border border-green-500/30'
              }`}>
                {item.step}
              </div>

              <h3 className={`font-bold uppercase text-xs mb-2 ${
                item.color === 'blue' ? 'text-blue-400' :
                item.color === 'purple' ? 'text-purple-400' :
                'text-green-400'
              }`}>
                {item.title}
              </h3>
              <p className="text-[10px] sm:text-xs text-gray-400 font-mono leading-relaxed">
                {item.description}
              </p>
            </div>
          ))}
        </div>

        {/* Points Info */}
        <div className="mt-6 p-4 backdrop-blur-2xl bg-white/[0.02] border border-white/[0.06] rounded-xl">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-4 h-4 text-yellow-400" />
            <span className="text-xs font-bold text-yellow-400 uppercase">How Points Work</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-[10px] sm:text-xs text-gray-400 font-mono">
            <div>
              <span className="text-blue-400 font-bold">+5</span> points for every vote cast
            </div>
            <div>
              <span className="text-green-400 font-bold">+15</span> bonus for voting with consensus
            </div>
            <div>
              <span className="text-orange-400 font-bold">+streak</span> multiplier for consecutive correct votes
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
