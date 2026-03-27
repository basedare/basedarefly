"use client";

import React from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { DollarSign, Users, TrendingUp, Trophy, Zap, Tag, Shield, CheckCircle, ArrowRight } from "lucide-react";
import LiquidBackground from "@/components/LiquidBackground";
import GradualBlurOverlay from "@/components/GradualBlurOverlay";
import { LiquidMetalButton } from "@/components/ui/LiquidMetalButton";
import { ClaimTagModule } from "@/components/ClaimTagModule";

type Creator = {
  tag: string;
  totalEarned: number;
  completedDares: number;
};

const raisedPanelClass =
  "relative overflow-hidden rounded-[30px] border border-white/[0.09] bg-[linear-gradient(180deg,rgba(255,255,255,0.07)_0%,rgba(255,255,255,0.025)_14%,rgba(10,9,18,0.9)_58%,rgba(7,6,14,0.96)_100%)] shadow-[0_28px_90px_rgba(0,0,0,0.4),0_0_28px_rgba(168,85,247,0.07),inset_0_1px_0_rgba(255,255,255,0.1),inset_0_-18px_24px_rgba(0,0,0,0.24)]";

const softCardClass =
  "relative overflow-hidden rounded-[26px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(255,255,255,0.06)_0%,rgba(255,255,255,0.02)_12%,rgba(10,10,18,0.92)_100%)] shadow-[0_18px_30px_rgba(0,0,0,0.22),inset_0_1px_0_rgba(255,255,255,0.08),inset_0_-12px_18px_rgba(0,0,0,0.22)]";

const insetCardClass =
  "rounded-[22px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(4,5,10,0.72)_0%,rgba(11,11,18,0.92)_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.06),inset_0_-10px_16px_rgba(0,0,0,0.26)]";

const sectionLabelClass =
  "inline-flex items-center gap-2 rounded-full border border-fuchsia-400/25 bg-[linear-gradient(180deg,rgba(217,70,239,0.16)_0%,rgba(88,28,135,0.08)_100%)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-fuchsia-100 shadow-[0_12px_24px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.12),inset_0_-10px_14px_rgba(0,0,0,0.22)]";

export default function CreatorsPage() {
  const [creators, setCreators] = React.useState<Creator[]>([]);
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

  return (
    <div className="relative min-h-screen flex flex-col">
      <LiquidBackground />
      <div className="fixed inset-0 z-10 pointer-events-none">
        <GradualBlurOverlay />
      </div>

      <div className="container mx-auto max-w-6xl px-4 py-24 sm:px-6 flex-grow relative z-20">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <div className={`${raisedPanelClass} px-5 py-8 sm:px-8 sm:py-10 text-center`}>
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_0%,rgba(168,85,247,0.12),transparent_32%),radial-gradient(circle_at_88%_100%,rgba(34,211,238,0.1),transparent_36%),linear-gradient(180deg,rgba(255,255,255,0.05)_0%,transparent_32%,transparent_72%,rgba(0,0,0,0.24)_100%)]" />
            <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/26 to-transparent" />

            <div className="relative">
              <div className={sectionLabelClass}>
                <Zap className="w-4 h-4 text-fuchsia-300" />
                FOR CREATORS
              </div>

              <h1 className="mt-5 text-4xl md:text-6xl font-black text-white tracking-tight">
                Turn Dares Into{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-yellow-400 to-amber-500">
                  Dollars
                </span>
              </h1>

              <p className="mt-4 text-gray-400 font-mono text-sm max-w-xl mx-auto mb-8">
                Your audience dares, you deliver, everyone wins. Get paid to do wild challenges.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 justify-center max-w-md mx-auto">
                <LiquidMetalButton
                  onClick={() => document.getElementById("claim-tag-section")?.scrollIntoView({ behavior: "smooth" })}
                  className="flex-1"
                  size="md"
                >
                  <Tag className="w-4 h-4" />
                  Claim Your Tag
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </LiquidMetalButton>
                <Link href="/leaderboard" className="flex-1">
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    className="w-full relative overflow-hidden px-6 py-3.5 rounded-[18px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06)_0%,rgba(255,255,255,0.02)_12%,rgba(11,11,18,0.95)_100%)] text-white text-sm font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-[0_14px_22px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.08),inset_0_-10px_14px_rgba(0,0,0,0.24)] hover:-translate-y-[1px] hover:border-yellow-400/30 hover:text-yellow-100"
                  >
                    <span className="pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-white/24 to-transparent" />
                    <Trophy className="w-4 h-4 text-yellow-400" />
                    Leaderboard
                  </motion.button>
                </Link>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Active Creators Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="max-w-5xl mx-auto mb-16"
        >
          <div className={`${softCardClass} p-5 sm:p-6`}>
            <div className="pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-white/22 to-transparent" />
            <div className="relative">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-black text-white tracking-tight italic">
                  ACTIVE CREATORS
                </h2>
                <Link href="/leaderboard" className="inline-flex items-center gap-2 rounded-full border border-fuchsia-400/20 bg-fuchsia-500/[0.08] px-3 py-1.5 text-[10px] font-black text-purple-300 hover:text-purple-200 transition-colors uppercase tracking-widest shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                  Hall of Fame <ArrowRight className="w-3 h-3" />
                </Link>
              </div>

              {loadingCreators ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className={`h-44 animate-pulse ${softCardClass}`} />
                  ))}
                </div>
              ) : creators.length === 0 ? (
                <div className={`${insetCardClass} p-8 text-center`}>
                  <p className="text-gray-500 font-mono text-xs">No creators verified yet. Be the first!</p>
                  <button
                    onClick={() => document.getElementById("claim-tag-section")?.scrollIntoView({ behavior: "smooth" })}
                    className="inline-flex items-center gap-2 mt-4 rounded-full border border-purple-500/25 bg-purple-500/[0.08] px-4 py-2 text-purple-300 text-sm font-bold tracking-wide hover:border-purple-400/35 hover:text-purple-200 transition-colors italic"
                  >
                    Claim your tag <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-8 bg-gradient-to-b from-[#0a0913] to-transparent" />
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-10 bg-gradient-to-t from-[#0a0913] to-transparent" />
                  <div className="max-h-[38rem] overflow-y-auto pr-1 sm:pr-2">
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
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
                              className={`${softCardClass} group block p-5 text-center transition-all duration-300 hover:-translate-y-[2px] hover:border-purple-500/35`}
                            >
                              <div className="pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(168,85,247,0.10),transparent_42%),linear-gradient(180deg,transparent_0%,rgba(0,0,0,0.12)_100%)] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

                              <div className="relative z-10">
                                <div className="mb-4 mx-auto relative w-16 h-16">
                                  {avatarImg ? (
                                    <Image
                                      src={avatarImg}
                                      alt={creator.tag}
                                      fill
                                      sizes="64px"
                                      className="rounded-full object-cover border-2 border-white/10 group-hover:border-purple-500/45 transition-colors shadow-[0_14px_26px_rgba(0,0,0,0.3)]"
                                    />
                                  ) : (
                                    <div className="w-full h-full rounded-full bg-gradient-to-br from-purple-600 to-yellow-500 flex items-center justify-center text-xl font-black text-white shadow-[0_14px_26px_rgba(0,0,0,0.3)]">
                                      {creator.tag.charAt(creator.tag.startsWith("@") ? 1 : 0).toUpperCase()}
                                    </div>
                                  )}
                                  <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-blue-500 rounded-full border-2 border-[#0a0a0f] flex items-center justify-center shadow-[0_8px_16px_rgba(0,0,0,0.24)]">
                                    <CheckCircle className="w-3 h-3 text-white" />
                                  </div>
                                </div>

                                <h3 className="text-sm font-black text-white group-hover:text-purple-300 transition-colors truncate italic">
                                  {creator.tag.startsWith("@") ? creator.tag : `@${creator.tag}`}
                                </h3>

                                <div className={`mt-4 grid grid-cols-2 gap-2 ${insetCardClass} p-3`}>
                                  <div className="flex flex-col">
                                    <span className="text-[10px] font-black text-green-400">${creator.totalEarned.toLocaleString()}</span>
                                    <span className="text-[8px] text-gray-500 uppercase font-black tracking-[0.14em]">Earned</span>
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="text-[10px] font-black text-white">{creator.completedDares}</span>
                                    <span className="text-[8px] text-gray-500 uppercase font-black tracking-[0.14em]">Dares</span>
                                  </div>
                                </div>
                              </div>
                            </Link>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* How It Works */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="max-w-4xl mx-auto mb-16"
        >
          <div className={`${softCardClass} p-5 sm:p-6`}>
            <div className="pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-white/22 to-transparent" />
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
                  className={`${insetCardClass} p-4`}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-11 h-11 bg-purple-500/20 border border-purple-500/30 rounded-xl flex items-center justify-center shrink-0 shadow-[0_10px_18px_rgba(0,0,0,0.16),inset_0_1px_0_rgba(255,255,255,0.08)]">
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
          </div>
        </motion.div>

        {/* Features Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="max-w-4xl mx-auto mb-16"
        >
          <div className={`${softCardClass} p-5 sm:p-6`}>
            <div className="pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-white/22 to-transparent" />
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
                  className={`${insetCardClass} p-4`}
                >
                  <div className="w-10 h-10 bg-yellow-500/10 border border-yellow-500/20 rounded-xl flex items-center justify-center mb-3 shadow-[0_10px_18px_rgba(0,0,0,0.16),inset_0_1px_0_rgba(255,255,255,0.08)]">
                    <feature.icon className="w-5 h-5 text-yellow-400" />
                  </div>
                  <h3 className="text-sm font-bold text-white mb-1">{feature.title}</h3>
                  <p className="text-[11px] text-gray-500 font-mono leading-relaxed">{feature.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Bottom CTA replaced with the full Claim Tag Module */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="w-full relative mt-24 mb-12"
        >
          {/* subtle divider */}
          <div className="w-1/2 mx-auto h-px bg-gradient-to-r from-transparent via-purple-500/50 to-transparent mb-16" />
          <ClaimTagModule />
        </motion.div>

      </div>
    </div>
  );
}
