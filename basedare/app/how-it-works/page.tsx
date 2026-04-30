"use client";

import React from "react";
import { motion } from "framer-motion";
import {
  Wallet,
  Camera,
  BadgeCheck,
  Zap,
  MapPin,
  Film,
  DollarSign,
  Target,
  Users,
  BarChart3,
  Sparkles,
} from "lucide-react";
import GradualBlurOverlay from "@/components/GradualBlurOverlay";
import LiquidBackground from "@/components/LiquidBackground";
import CosmicButton from "@/components/ui/CosmicButton";

/* ── design tokens (shared with FAQ) ── */

const raisedPanelClass =
  "relative overflow-hidden rounded-[30px] border border-white/[0.09] bg-[linear-gradient(180deg,rgba(255,255,255,0.07)_0%,rgba(255,255,255,0.025)_14%,rgba(10,9,18,0.9)_58%,rgba(7,6,14,0.96)_100%)] shadow-[0_28px_90px_rgba(0,0,0,0.4),0_0_28px_rgba(168,85,247,0.07),inset_0_1px_0_rgba(255,255,255,0.1),inset_0_-18px_24px_rgba(0,0,0,0.24)]";

const softCardClass =
  "relative overflow-hidden rounded-[26px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(255,255,255,0.06)_0%,rgba(255,255,255,0.02)_12%,rgba(10,10,18,0.92)_100%)] shadow-[0_18px_30px_rgba(0,0,0,0.22),inset_0_1px_0_rgba(255,255,255,0.08),inset_0_-12px_18px_rgba(0,0,0,0.22)]";

const insetDentClass =
  "bd-dent-surface bd-dent-surface--soft rounded-[20px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(4,5,10,0.72)_0%,rgba(11,11,18,0.92)_100%)]";

const sectionLabelClass =
  "inline-flex items-center gap-2 rounded-full border border-fuchsia-400/25 bg-[linear-gradient(180deg,rgba(217,70,239,0.16)_0%,rgba(88,28,135,0.08)_100%)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-fuchsia-100 shadow-[0_12px_24px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.12),inset_0_-10px_14px_rgba(0,0,0,0.22)]";

/* ── data ── */

const OVERVIEW_STEPS = [
  {
    icon: Wallet,
    title: "Fund",
    description: "Anyone funds a dare with USDC. Funds go into a secure on-chain escrow — nobody can touch them until the challenge is resolved.",
    color: "text-yellow-400",
    glow: "rgba(250,204,21,0.12)",
  },
  {
    icon: Camera,
    title: "Complete",
    description: "A creator claims the dare, goes to the venue or does the challenge, and submits video proof directly on the platform.",
    color: "text-purple-400",
    glow: "rgba(168,85,247,0.12)",
  },
  {
    icon: BadgeCheck,
    title: "Payout",
    description: "Community reviews the proof, the referee verifies it, and the smart contract releases USDC directly to the creator's wallet.",
    color: "text-emerald-400",
    glow: "rgba(52,211,153,0.12)",
  },
];

const CREATOR_POINTS = [
  {
    icon: Zap,
    title: "Claim dares from fans or brands",
    description: "Browse active bounties, filter by location or niche, and claim challenges that match your vibe.",
  },
  {
    icon: MapPin,
    title: "Show up & do the challenge",
    description: "Go to the venue, complete the dare IRL, and capture the moment on video. Nearby check-ins prove you were there.",
  },
  {
    icon: Film,
    title: "Submit proof on-platform",
    description: "Upload your video proof. The community reviews it and the AI referee validates completion.",
  },
  {
    icon: DollarSign,
    title: "Get paid in USDC",
    description: "No middleman, no 30-day net terms. Verified proof triggers instant payout from escrow to your wallet.",
  },
];

const BRAND_POINTS = [
  {
    icon: Target,
    title: "Flip to Control first",
    description: "Venue and brand workflows live behind the Control switch: activation planning, creator routing, and proof receipts.",
  },
  {
    icon: Users,
    title: "Pick your creator",
    description: "Choose from verified creators who match your brand. No blind marketplace — you select who represents you.",
  },
  {
    icon: Wallet,
    title: "Fund the escrow, not a promise",
    description: "USDC goes into a smart contract, not a creator's DM. Funds only release when the challenge is verified complete.",
  },
  {
    icon: BarChart3,
    title: "On-chain proof = measurable ROI",
    description: "Every completion is verifiable on-chain. Real proof, real metrics, no fake engagement.",
  },
];

/* ── component ── */

export default function HowItWorksPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-transparent">
      <LiquidBackground />
      <div className="pointer-events-none fixed inset-0 z-10 hidden md:block">
        <GradualBlurOverlay />
      </div>

      {/* ambient glow */}
      <div className="pointer-events-none absolute inset-0 z-[1]">
        <div className="absolute -left-40 top-20 h-96 w-96 rounded-full bg-purple-500/20 blur-[120px]" />
        <div className="absolute -right-32 top-40 h-80 w-80 rounded-full bg-cyan-400/10 blur-[120px]" />
        <div className="absolute bottom-0 left-1/2 h-[420px] w-[520px] -translate-x-1/2 rounded-full bg-yellow-400/10 blur-[140px]" />
      </div>

      <div className="relative z-20 mt-12 px-4 pb-32 pt-16 md:pt-20">
        <div className="mx-auto max-w-5xl">

          {/* ════════════════════════════════════════════
              HERO
          ════════════════════════════════════════════ */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`${raisedPanelClass} mb-10 px-6 py-10 text-center md:px-10 md:py-14`}
          >
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_0%,rgba(168,85,247,0.12),transparent_32%),radial-gradient(circle_at_88%_100%,rgba(34,211,238,0.1),transparent_36%),linear-gradient(180deg,rgba(255,255,255,0.05)_0%,transparent_32%,transparent_72%,rgba(0,0,0,0.24)_100%)]" />
            <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/26 to-transparent" />

            <div className="relative mx-auto mb-5 inline-flex">
              <div className={sectionLabelClass}>
                <Sparkles className="w-4 h-4 text-fuchsia-300" />
                THE BASICS
              </div>
            </div>

            <h1 className="relative mb-4 text-4xl font-black uppercase italic tracking-tight text-white md:text-6xl">
              How It <span className="text-yellow-400">Works</span>
            </h1>

            <p className="relative mx-auto max-w-xl font-mono text-sm text-gray-400 md:text-base">
              Real venues. Real dares. Real payouts.
              <br />
              <span className="text-purple-400/70">No middlemen. No promises. Just smart contracts.</span>
            </p>
          </motion.div>

          {/* ════════════════════════════════════════════
              3-STEP OVERVIEW
          ════════════════════════════════════════════ */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="mb-10 grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-6"
          >
            {OVERVIEW_STEPS.map((step, i) => (
              <div key={i} className={`${softCardClass} group p-6 md:p-8 text-center transition-transform hover:-translate-y-1`}>
                <div className="pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-white/18 to-transparent" />

                {/* pressed icon well — Sparks/Heat style */}
                <div className="relative mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/[0.08] bd-dent-surface"
                  style={{
                    background: `linear-gradient(180deg, rgba(4,5,10,0.78) 0%, rgba(11,11,18,0.94) 100%)`,
                    boxShadow: `inset 8px 8px 16px rgba(0,0,0,0.5), inset -4px -4px 10px rgba(255,255,255,0.03), inset 0 1px 0 rgba(255,255,255,0.06), 0 1px 0 rgba(255,255,255,0.03), 0 0 20px ${step.glow}`,
                  }}
                >
                  <span className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-black text-white border border-white/20"
                    style={{
                      background: 'linear-gradient(180deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.04) 100%)',
                      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.15), 0 4px 8px rgba(0,0,0,0.3)',
                    }}
                  >
                    {i + 1}
                  </span>
                  <step.icon className={`h-7 w-7 ${step.color} drop-shadow-[0_0_8px_currentColor]`} />
                </div>

                <h3 className={`mb-2 text-lg font-black uppercase italic tracking-wide ${step.color}`}>
                  {step.title}
                </h3>
                <p className="font-mono text-xs text-gray-400 leading-relaxed md:text-sm">
                  {step.description}
                </p>
              </div>
            ))}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className={`${softCardClass} mb-10 p-5 md:p-6`}
          >
            <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/24 to-transparent" />
            <div className="grid gap-4 md:grid-cols-[1fr_190px_1fr] md:items-center">
              <div className={`${insetDentClass} p-5`}>
                <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-purple-200/70">
                  Creators / Fans
                </p>
                <h3 className="mt-2 text-2xl font-black uppercase italic text-white">Chaos side</h3>
                <p className="mt-2 font-mono text-xs leading-6 text-gray-400">
                  Create, claim, complete, verify, and browse the public grid.
                </p>
              </div>

              <div className="mx-auto w-full max-w-[190px]">
                <div className="mb-2 text-center font-mono text-[10px] uppercase tracking-[0.26em] text-gray-500">
                  Use the switch
                </div>
                <div className="relative h-12 overflow-hidden rounded-full border border-white/12 bg-black/70 p-1 shadow-[inset_7px_7px_14px_rgba(0,0,0,0.72),inset_-4px_-4px_10px_rgba(255,255,255,0.04)]">
                  <motion.div
                    className="absolute left-1 top-1 h-[calc(100%-0.5rem)] w-[45%] rounded-full bg-[linear-gradient(145deg,#f8fafc,#9ca3af)] shadow-[0_8px_18px_rgba(0,0,0,0.42),inset_0_1px_0_rgba(255,255,255,0.72)]"
                    animate={{ x: ['0%', '115%', '0%'] }}
                    transition={{ duration: 4.8, repeat: Infinity, ease: 'easeInOut' }}
                  />
                </div>
              </div>

              <div className={`${insetDentClass} p-5 grayscale`}>
                <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-gray-300/70">
                  Venues / Brands
                </p>
                <h3 className="mt-2 text-2xl font-black uppercase italic text-white">Control side</h3>
                <p className="mt-2 font-mono text-xs leading-6 text-gray-400">
                  Plan activations, operate the Brand Portal, and read measurable proof.
                </p>
              </div>
            </div>
          </motion.div>

          {/* ════════════════════════════════════════════
              FOR CREATORS
          ════════════════════════════════════════════ */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className={`${raisedPanelClass} mb-10 p-6 md:p-10`}
          >
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_0%_50%,rgba(168,85,247,0.08),transparent_40%)]" />
            <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-purple-400/30 to-transparent" />

            <div className="relative mb-6 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] bd-dent-surface"
                style={{
                  background: 'linear-gradient(180deg, rgba(4,5,10,0.78) 0%, rgba(11,11,18,0.94) 100%)',
                  boxShadow: 'inset 6px 6px 12px rgba(0,0,0,0.5), inset -3px -3px 8px rgba(255,255,255,0.03), 0 0 14px rgba(168,85,247,0.12)',
                }}
              >
                <Zap className="h-5 w-5 text-purple-400 drop-shadow-[0_0_6px_rgba(168,85,247,0.5)]" />
              </div>
              <h2 className="text-2xl font-black uppercase italic tracking-tight text-white md:text-3xl">
                For <span className="text-purple-400">Creators</span>
              </h2>
            </div>

            <p className="relative mb-8 max-w-2xl font-mono text-sm text-gray-400">
              Get paid to do challenges at real venues. No brand deals, no invoices, no 30-day payment terms.
              Complete the dare, submit proof, and the escrow pays you directly.
            </p>

            <div className="relative grid grid-cols-1 gap-4 sm:grid-cols-2">
              {CREATOR_POINTS.map((point, i) => (
                <div key={i} className={`${insetDentClass} group flex items-start gap-4 p-5 transition-all hover:border-purple-400/20`}>
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bd-dent-surface group-hover:border-purple-400/20 transition-colors"
                    style={{
                      background: 'linear-gradient(180deg, rgba(4,5,10,0.72) 0%, rgba(11,11,18,0.92) 100%)',
                      boxShadow: 'inset 5px 5px 10px rgba(0,0,0,0.45), inset -2px -2px 6px rgba(255,255,255,0.025)',
                    }}
                  >
                    <point.icon className="h-5 w-5 text-purple-400" />
                  </div>
                  <div>
                    <h4 className="mb-1 text-sm font-bold uppercase tracking-wide text-white">{point.title}</h4>
                    <p className="font-mono text-xs text-gray-500 leading-relaxed">{point.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* ════════════════════════════════════════════
              FOR BRANDS
          ════════════════════════════════════════════ */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className={`${raisedPanelClass} mb-10 p-6 md:p-10`}
          >
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_100%_50%,rgba(250,204,21,0.06),transparent_40%)]" />
            <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-yellow-400/30 to-transparent" />

            <div className="relative mb-6 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] bd-dent-surface"
                style={{
                  background: 'linear-gradient(180deg, rgba(4,5,10,0.78) 0%, rgba(11,11,18,0.94) 100%)',
                  boxShadow: 'inset 6px 6px 12px rgba(0,0,0,0.5), inset -3px -3px 8px rgba(255,255,255,0.03), 0 0 14px rgba(250,204,21,0.12)',
                }}
              >
                <Target className="h-5 w-5 text-yellow-400 drop-shadow-[0_0_6px_rgba(250,204,21,0.5)]" />
              </div>
              <h2 className="text-2xl font-black uppercase italic tracking-tight text-white md:text-3xl">
                For <span className="text-yellow-400">Brands + Venues</span>
              </h2>
            </div>

            <p className="relative mb-8 max-w-2xl font-mono text-sm text-gray-400">
              Turn creator content into accountable activations. Fund campaigns at real venues,
              pick your creator, and get verifiable on-chain proof that the work was done.
            </p>

            <div className="relative grid grid-cols-1 gap-4 sm:grid-cols-2">
              {BRAND_POINTS.map((point, i) => (
                <div key={i} className={`${insetDentClass} group flex items-start gap-4 p-5 transition-all hover:border-yellow-400/20`}>
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bd-dent-surface group-hover:border-yellow-400/20 transition-colors"
                    style={{
                      background: 'linear-gradient(180deg, rgba(4,5,10,0.72) 0%, rgba(11,11,18,0.92) 100%)',
                      boxShadow: 'inset 5px 5px 10px rgba(0,0,0,0.45), inset -2px -2px 6px rgba(255,255,255,0.025)',
                    }}
                  >
                    <point.icon className="h-5 w-5 text-yellow-400" />
                  </div>
                  <div>
                    <h4 className="mb-1 text-sm font-bold uppercase tracking-wide text-white">{point.title}</h4>
                    <p className="font-mono text-xs text-gray-500 leading-relaxed">{point.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* ════════════════════════════════════════════
              CTA FOOTER
          ════════════════════════════════════════════ */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.45 }}
            className="text-center"
          >
            <div className={`${softCardClass} inline-flex flex-col items-center gap-6 rounded-[28px] p-8 md:p-10`}>
              <p className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-gray-300">
                <Sparkles className="h-4 w-4 text-yellow-500" />
                Ready to try?
              </p>

              <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
                <div className={`${insetDentClass} px-4 py-4`}>
                  <CosmicButton
                    href="/create"
                    variant="gold"
                    size="lg"
                    className="min-w-[200px]"
                  >
                    <Zap className="h-5 w-5" />
                    Create a Dare
                  </CosmicButton>
                </div>
                <div className={`${insetDentClass} px-4 py-4`}>
                  <CosmicButton
                    href="/?mode=control"
                    variant="blue"
                    size="lg"
                    className="min-w-[200px]"
                  >
                    <Target className="h-5 w-5" />
                    Open Control
                  </CosmicButton>
                </div>
              </div>
            </div>
          </motion.div>

        </div>
      </div>
    </div>
  );
}
