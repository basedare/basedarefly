"use client";

import React from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { DollarSign, Users, TrendingUp, Trophy, Zap, Tag, Shield, CheckCircle, ArrowRight } from "lucide-react";
import LiquidBackground from "@/components/LiquidBackground";
import GradualBlurOverlay from "@/components/GradualBlurOverlay";
import { LiquidMetalButton } from "@/components/ui/LiquidMetalButton";

export default function CreatorsPage() {
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

        {/* How It Works */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="max-w-xl mx-auto mb-10"
        >
          <h2 className="text-xl font-black text-white text-center mb-6 tracking-tight">
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
          className="max-w-xl mx-auto mb-10"
        >
          <h2 className="text-xl font-black text-white text-center mb-6 tracking-tight">
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
          className="max-w-md mx-auto mb-6"
        >
          <div className="backdrop-blur-xl bg-black/20 border border-white/10 rounded-2xl p-6 text-center">
            <h2 className="text-lg font-black text-white mb-4">
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
              <h2 className="text-xl font-black text-white mb-2">
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
