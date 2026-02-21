"use client";

import React from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { DollarSign, Users, TrendingUp, Trophy, Zap, Tag, Shield, CheckCircle, ArrowRight } from "lucide-react";
import LiquidBackground from "@/components/LiquidBackground";
import GradualBlurOverlay from "@/components/GradualBlurOverlay";
import { LiquidMetalButton } from "@/components/ui/LiquidMetalButton";

export default function CreatorsPage() {
  const [creators, setCreators] = React.useState<any[]>([]);
  const [loadingCreators, setLoadingCreators] = React.useState(true);

  React.useEffect(() => {
    async function fetchCreators() {
      try {
        const res = await fetch("/api/creators");
        const data = await res.json();
        if (data.success) {
          setCreators(data.data);
        }
      } catch (err) {
        console.error("Failed to fetch creators", err);
      } finally {
        setLoadingCreators(false);
      }
    }
    fetchCreators();
  }, []);

  const STREAMER_IMAGES: Record<string, string> = {
    kaicenat: "/assets/KAICENAT.jpeg",
    "kai cenat": "/assets/KAICENAT.jpeg",
    adinross: "/assets/adinross.png",
    "adin ross": "/assets/adinross.png",
    ishowspeed: "/assets/Ishowspeed.jpg",
    speed: "/assets/Ishowspeed.jpg",
  };

  const features = [
    { icon: DollarSign, title: "Earn Big", description: "Top creators bank $5k-$50k/month from dare bounties" },
    { icon: Users, title: "Instant Audience", description: "100k+ dare watchers ready to fund your challenges" },
    { icon: TrendingUp, title: "Grow Your Brand", description: "Viral moments = more followers, more sponsors" },
    { icon: Trophy, title: "Leaderboard Fame", description: "Top creators get legendary status + perks" },
  ];

  const verificationSteps = [
    { icon: Tag, title: "Claim Your Tag", description: "Choose a unique @tag linked to your wallet" },
    { icon: Shield, title: "Verify Identity", description: "Connect Twitter, Twitch, YouTube, or Kick" },
    { icon: CheckCircle, title: "Start Earning", description: "Receive 89% of every bounty you complete" },
  ];

  const platforms = [
    { name: "Twitter/X", icon: "𝕏" },
    { name: "Twitch", icon: "📺" },
    { name: "YouTube", icon: "▶" },
    { name: "Kick", icon: "⚡" },
  ];

  return (
    <div className="relative min-h-screen flex flex-col">
      <LiquidBackground />
      <div className="fixed inset-0 z-10 pointer-events-none">
        <GradualBlurOverlay />
      </div>

      <div className="container mx-auto px-6 py-24 flex-grow relative z-20">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 bg-purple-500/10 border border-purple-500/30 rounded-full px-4 py-2 mb-4">
            <Zap className="w-4 h-4 text-purple-400" />
            <span className="text-sm text-purple-400 font-medium tracking-wide">FOR CREATORS</span>
          </div>

          <h1 className="text-3xl md:text-5xl font-black text-white mb-3 tracking-tight">
            Turn Dares Into{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-yellow-600">
              Dollars
            </span>
          </h1>

          <p className="text-gray-400 font-mono text-sm max-w-md mx-auto mb-8">
            Your audience dares, you deliver, everyone wins. Get paid to do wild challenges.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center max-w-md mx-auto">
            <Link href="/claim-tag" className="flex-1">
              <LiquidMetalButton className="w-full" size="md">
                <Tag className="w-4 h-4" />
                Claim Your Tag
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </LiquidMetalButton>
            </Link>
            <Link href="/leaderboard" className="flex-1">
              <motion.button
                whileTap={{ scale: 0.98 }}
                className="w-full px-6 py-3.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white text-sm font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2"
              >
                <Trophy className="w-4 h-4 text-yellow-400" />
                Leaderboard
              </motion.button>
            </Link>
          </div>
        </motion.div>

        {/* Active Creators Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="max-w-4xl mx-auto mb-16"
        >
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-black text-white tracking-tight italic">
              ACTIVE CREATORS
            </h2>
            <Link href="/leaderboard" className="text-[10px] font-black text-purple-400 hover:text-purple-300 transition-colors uppercase tracking-widest flex items-center gap-2">
              View All <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {loadingCreators ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-40 bg-white/5 rounded-2xl animate-pulse border border-white/10" />
              ))}
            </div>
          ) : creators.length === 0 ? (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center backdrop-blur-md">
              <p className="text-gray-500 font-mono text-xs">No creators verified yet. Be the first!</p>
              <Link href="/claim-tag" className="inline-block mt-4 text-purple-400 text-sm font-bold hover:underline italic">
                Claim your tag →
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {creators.map((creator, index) => {
                const plainTag = creator.tag.replace("@", "").toLowerCase();
                const avatarImg = STREAMER_IMAGES[plainTag];

                return (
                  <motion.div
                    key={creator.tag}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.1 + index * 0.05 }}
                  >
                    <Link
                      href={`/creator/${plainTag}`}
                      className="group block relative p-5 bg-white/5 hover:bg-white/[0.08] border border-white/10 hover:border-purple-500/50 rounded-2xl transition-all duration-300 text-center overflow-hidden backdrop-blur-sm"
                    >
                      {/* Subtle Glow */}
                      <div className="absolute inset-0 bg-purple-500/0 group-hover:bg-purple-500/5 transition-colors duration-300" />

                      <div className="relative z-10">
                        <div className="mb-4 mx-auto relative w-16 h-16">
                          {avatarImg ? (
                            <img
                              src={avatarImg}
                              alt={creator.tag}
                              className="w-full h-full rounded-full object-cover border-2 border-white/10 group-hover:border-purple-500/50 transition-colors shadow-xl"
                            />
                          ) : (
                            <div className="w-full h-full rounded-full bg-gradient-to-br from-purple-600 to-yellow-500 flex items-center justify-center text-xl font-black text-white shadow-xl">
                              {creator.tag.charAt(creator.tag.startsWith("@") ? 1 : 0).toUpperCase()}
                            </div>
                          )}
                          <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-blue-500 rounded-full border-2 border-[#0a0a0f] flex items-center justify-center">
                            <CheckCircle className="w-3 h-3 text-white" />
                          </div>
                        </div>

                        <h3 className="text-sm font-black text-white group-hover:text-purple-400 transition-colors truncate italic italic">
                          {creator.tag.startsWith("@") ? creator.tag : `@${creator.tag}`}
                        </h3>

                        <div className="flex items-center justify-center gap-3 mt-3">
                          <div className="flex flex-col">
                            <span className="text-[10px] font-black text-green-400">${creator.totalEarned.toLocaleString()}</span>
                            <span className="text-[8px] text-gray-500 uppercase font-black tracking-tighter">Earned</span>
                          </div>
                          <div className="w-[1px] h-6 bg-white/10" />
                          <div className="flex flex-col">
                            <span className="text-[10px] font-black text-white">{creator.completedDares}</span>
                            <span className="text-[8px] text-gray-500 uppercase font-black tracking-tighter">Dares</span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.div>

        {/* How It Works */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="max-w-xl mx-auto mb-16"
        >
          <h2 className="text-xl font-black text-white text-center mb-6 tracking-tight italic">
            How It Works
          </h2>
          <div className="space-y-3">
            {verificationSteps.map((step, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 + index * 0.1 }}
                className="backdrop-blur-xl bg-black/20 border border-white/10 rounded-2xl p-4"
              >
                <div className="flex items-center gap-4">
                  <div className="w-11 h-11 bg-purple-500/20 border border-purple-500/30 rounded-xl flex items-center justify-center shrink-0">
                    <step.icon className="w-5 h-5 text-purple-400" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-white">{step.title}</h3>
                    <p className="text-xs text-gray-500 font-mono">{step.description}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Features Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="max-w-xl mx-auto mb-16"
        >
          <h2 className="text-xl font-black text-white text-center mb-6 tracking-tight italic">
            Why Join?
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 + index * 0.05 }}
                className="backdrop-blur-xl bg-black/20 border border-white/10 rounded-2xl p-4"
              >
                <div className="w-10 h-10 bg-yellow-500/10 border border-yellow-500/20 rounded-xl flex items-center justify-center mb-3">
                  <feature.icon className="w-5 h-5 text-yellow-400" />
                </div>
                <h3 className="text-sm font-bold text-white mb-1">{feature.title}</h3>
                <p className="text-[11px] text-gray-500 font-mono leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Platform Verification */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="max-w-md mx-auto mb-12"
        >
          <div className="backdrop-blur-xl bg-black/20 border border-white/10 rounded-2xl p-6 text-center">
            <h2 className="text-lg font-black text-white mb-4 italic">
              Verify With Your Platform
            </h2>
            <div className="grid grid-cols-4 gap-2 mb-4">
              {platforms.map((platform) => (
                <div
                  key={platform.name}
                  className="p-3 bg-white/5 border border-white/10 rounded-xl"
                >
                  <div className="text-2xl mb-1">{platform.icon}</div>
                  <div className="text-[9px] font-medium text-gray-400">{platform.name}</div>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-gray-600 font-mono">
              Instant OAuth verification. Kick requires manual review.
            </p>
          </div>
        </motion.div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="max-w-md mx-auto"
        >
          <div className="backdrop-blur-xl bg-purple-500/5 border border-purple-500/30 rounded-2xl p-6 text-center relative overflow-hidden">
            {/* Subtle gradient accent */}
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-yellow-500/5 pointer-events-none" />

            <div className="relative z-10">
              <h2 className="text-xl font-black text-white mb-2 italic">
                Ready to Get Paid?
              </h2>
              <p className="text-sm text-gray-400 mb-6 font-mono">
                Claim your tag in under 2 minutes.
              </p>
              <Link href="/claim-tag">
                <LiquidMetalButton className="w-full" size="lg">
                  <Zap className="w-5 h-5" />
                  Claim Your Tag Now
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </LiquidMetalButton>
              </Link>
            </div>
          </div>
        </motion.div>

      </div>
    </div>
  );
}
