"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Bell,
  Wallet,
  Camera,
  BadgeCheck,
  CheckCircle2,
  Zap,
  MapPin,
  MessageSquare,
  QrCode,
  Route,
  Store,
  DollarSign,
  Target,
  Users,
  BarChart3,
  Sparkles,
} from "lucide-react";
import GradualBlurOverlay from "@/components/GradualBlurOverlay";
import HoneyGooAccent from "@/components/HoneyGooAccent";
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
    icon: MapPin,
    title: "Explore",
    description: "Open the map and see interesting places, local activity and challenges around you.",
    color: "text-cyan-300",
    glow: "rgba(103,232,249,0.12)",
  },
  {
    icon: Sparkles,
    title: "Join",
    description: "Choose something that sounds fun: a free Spark, a social activity, a route or a rewarded Dare.",
    color: "text-purple-400",
    glow: "rgba(168,85,247,0.12)",
  },
  {
    icon: BadgeCheck,
    title: "Leave a mark",
    description: "Complete it, add proof when needed and build points, receipts, local reputation or rewards.",
    color: "text-emerald-400",
    glow: "rgba(52,211,153,0.12)",
  },
];

const CREATOR_POINTS = [
  {
    icon: MapPin,
    title: "Find something nearby",
    description: "Browse the map for places, free activities, meetups, routes and rewarded challenges.",
  },
  {
    icon: Users,
    title: "Join or complete it",
    description: "Go solo, bring a friend or join an activity at a public place.",
  },
  {
    icon: Camera,
    title: "Share proof when needed",
    description: "Some challenges ask for a photo, clip, nearby location or venue check-in so the result can be trusted.",
  },
  {
    icon: DollarSign,
    title: "Keep what you earn",
    description: "Collect points and reputation. Rewarded Dares can also pay USDC to your wallet.",
  },
];

const BRAND_POINTS = [
  {
    icon: Target,
    title: "Choose a useful outcome",
    description: "Start with one place, one clear challenge and one result worth measuring.",
  },
  {
    icon: Wallet,
    title: "Fund the reward",
    description: "Set the reward and proof rules before the challenge goes live.",
  },
  {
    icon: Users,
    title: "Let people participate",
    description: "Nearby people discover it, claim it and complete it through the normal map experience.",
  },
  {
    icon: BarChart3,
    title: "See what happened",
    description: "Approved completions leave a timestamped receipt attached to the place.",
  },
];

const ROLE_GLOSSARY = [
  {
    icon: Sparkles,
    title: "Everyone",
    description: "Explore, join free activities, complete challenges and leave verified marks.",
    color: "text-cyan-300",
  },
  {
    icon: Users,
    title: "Locals",
    description: "Share useful spots, create community Sparks and help newcomers join in.",
    color: "text-emerald-300",
  },
  {
    icon: Route,
    title: "Hosts",
    description: "Trusted locals who help launch venue missions.",
    color: "text-yellow-300",
  },
  {
    icon: Store,
    title: "Places",
    description: "Build memory through challenges, check-ins, local rooms and recent activity.",
    color: "text-purple-300",
  },
];

const QUICKSTART_TRACKS = [
  {
    audience: "Everyone",
    title: "Find something to do",
    summary: "Explore first. Sign in only when an action needs identity, progress or payment.",
    href: "/map",
    cta: "Open map",
    pillClass: "border-cyan-300/20 bg-cyan-400/[0.08] text-cyan-100",
    iconClass: "text-cyan-300",
    lineColor: "rgba(103,232,249,0.58)",
    steps: [
      { icon: MapPin, label: "Explore", detail: "Open the map and see what is nearby." },
      { icon: Sparkles, label: "Pick", detail: "Choose a place, Spark, Dare, route or activity." },
      { icon: Users, label: "Join", detail: "Go solo, bring a friend or join people there." },
      { icon: BadgeCheck, label: "Remember", detail: "Complete it and leave a trusted mark on the map." },
    ],
    targets: ["Explore", "Nearby now", "Challenge page"],
  },
  {
    audience: "Venue",
    title: "Claim the place layer",
    summary: "Claim the venue, turn on QR, and watch check-ins.",
    href: "/map",
    cta: "Find venue",
    pillClass: "border-emerald-300/20 bg-emerald-400/[0.08] text-emerald-100",
    iconClass: "text-emerald-300",
    lineColor: "rgba(110,231,183,0.56)",
    steps: [
      { icon: Store, label: "Select", detail: "Open the venue." },
      { icon: QrCode, label: "Claim", detail: "Use the claim prompt on the place." },
      { icon: MessageSquare, label: "Room", detail: "Checked-in guests unlock the room." },
      { icon: Bell, label: "Signals", detail: "Watch marks, proof, and check-in alerts." },
    ],
    targets: ["Map pin", "Venue header", "Signal room"],
  },
  {
    audience: "Brand",
    title: "Run First Spark",
    summary: "Approve one venue, one perk, and one proof route.",
    href: "/first-spark",
    cta: "Run pilot",
    pillClass: "border-yellow-300/24 bg-yellow-400/[0.09] text-yellow-100",
    iconClass: "text-yellow-300",
    lineColor: "rgba(250,204,21,0.62)",
    steps: [
      { icon: Target, label: "Brief", detail: "Use Plan Activation from Control." },
      { icon: MapPin, label: "Place", detail: "Pick the venue or city." },
      { icon: Users, label: "Route", detail: "Choose creator fit and payout." },
      { icon: BarChart3, label: "Receipt", detail: "Track proof and recap." },
    ],
    targets: ["Control switch", "Plan Activation card", "Brand Portal"],
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
            <HoneyGooAccent className="absolute right-6 top-[-2px] z-20 hidden lg:block xl:right-10" size="md" />
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
              Discover real places. Join challenges. Meet people.
              <br />
              <span className="text-purple-300/75">Play for fun, build local reputation, or earn a reward.</span>
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
            transition={{ delay: 0.18 }}
            className={`${softCardClass} mb-10 p-4 md:p-5`}
          >
            <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/24 to-transparent" />
            <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="font-mono text-[10px] font-black uppercase tracking-[0.28em] text-white/38">
                  People and places
                </p>
                <h2 className="mt-2 text-xl font-black uppercase italic tracking-tight text-white md:text-2xl">
                  Everyone can take part
                </h2>
              </div>
              <p className="max-w-2xl font-mono text-xs leading-6 text-gray-400">
                Start as an explorer. People earn more trust and responsibility by completing useful actions over time.
              </p>
            </div>

            <div className="relative mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {ROLE_GLOSSARY.map((role) => (
                <div key={role.title} className={`${insetDentClass} p-4`}>
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-black/30">
                      <role.icon className={`h-4 w-4 ${role.color}`} />
                    </div>
                    <h3 className="text-sm font-black uppercase tracking-[0.14em] text-white">{role.title}</h3>
                  </div>
                  <p className="mt-3 text-xs leading-5 text-gray-500">{role.description}</p>
                </div>
              ))}
            </div>
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
                  People
                </p>
                <h3 className="mt-2 text-2xl font-black uppercase italic text-white">Play side</h3>
                <p className="mt-2 font-mono text-xs leading-6 text-gray-400">
                  Explore, join, create, complete and build your story on the map.
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
                  Places / Partners
                </p>
                <h3 className="mt-2 text-2xl font-black uppercase italic text-white">Control side</h3>
                <p className="mt-2 font-mono text-xs leading-6 text-gray-400">
                  Fund challenges, offer perks and see trusted activity around real places.
                </p>
              </div>
            </div>
          </motion.div>

          {/* ════════════════════════════════════════════
              QUICKSTART GUIDE
          ════════════════════════════════════════════ */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.24 }}
            className={`${raisedPanelClass} mb-10 p-5 md:p-8`}
          >
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_0%,rgba(34,211,238,0.08),transparent_30%),radial-gradient(circle_at_90%_18%,rgba(245,197,24,0.1),transparent_34%)]" />
            <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/28 to-transparent" />

            <div className="relative mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <div className={sectionLabelClass}>
                  <Route className="h-4 w-4 text-fuchsia-300" />
                  START HERE
                </div>
                <h2 className="mt-4 text-2xl font-black uppercase italic tracking-tight text-white md:text-3xl">
                  Pick the <span className="text-cyan-300">Shortest Path</span>
                </h2>
                <p className="mt-3 max-w-2xl font-mono text-sm leading-6 text-gray-400">
                  Pick the lane that matches what you need now.
                </p>
              </div>
              <Link
                href="/"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-white/12 bg-white/[0.05] px-4 py-3 text-[11px] font-black uppercase tracking-[0.18em] text-white/72 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_12px_24px_rgba(0,0,0,0.18)] transition hover:border-white/20 hover:text-white md:self-center"
              >
                Home control
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="relative grid gap-4 lg:grid-cols-2">
              {QUICKSTART_TRACKS.map((track) => (
                <div key={track.audience} className={`${softCardClass} p-4 md:p-5`}>
                  <div
                    className="pointer-events-none absolute inset-x-5 top-0 h-px"
                    style={{ background: `linear-gradient(90deg, transparent, ${track.lineColor}, transparent)` }}
                  />

                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className={`inline-flex rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] ${track.pillClass}`}>
                        {track.audience}
                      </div>
                      <h3 className="mt-3 text-xl font-black uppercase italic text-white">{track.title}</h3>
                    </div>
                    <Link
                      href={track.href}
                      className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-full border border-white/12 bg-black/30 px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-white/78 transition hover:border-white/22 hover:text-white"
                    >
                      {track.cta}
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>

                  <p className="mt-3 font-mono text-xs leading-6 text-gray-400">{track.summary}</p>

                  <div className={`${insetDentClass} mt-4 p-3`}>
                    <div className="grid gap-2">
                      {track.steps.map((step, index) => (
                        <div key={step.label} className="grid grid-cols-[42px_1fr_22px] items-center gap-3 rounded-2xl border border-white/[0.055] bg-white/[0.025] px-3 py-3">
                          <div
                            className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] bg-black/35"
                            style={{ boxShadow: `inset 5px 5px 10px rgba(0,0,0,0.38), 0 0 14px ${track.lineColor}` }}
                          >
                            <step.icon className={`h-5 w-5 ${track.iconClass}`} />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-[10px] font-black uppercase tracking-[0.2em] text-white/34">
                                {String(index + 1).padStart(2, "0")}
                              </span>
                              <span className="truncate text-sm font-bold text-white">{step.label}</span>
                            </div>
                            <p className="mt-1 text-xs leading-5 text-gray-500">{step.detail}</p>
                          </div>
                          {index === track.steps.length - 1 ? (
                            <CheckCircle2 className={`h-4 w-4 ${track.iconClass}`} />
                          ) : (
                            <ArrowRight className="h-4 w-4 text-white/28" />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {track.targets.map((target) => (
                      <span
                        key={target}
                        className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-white/52"
                      >
                        <Route className={`h-3.5 w-3.5 ${track.iconClass}`} />
                        {target}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
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
                For <span className="text-purple-400">Everyone</span>
              </h2>
            </div>

            <p className="relative mb-8 max-w-2xl font-mono text-sm text-gray-400">
              Browse first, then choose how deeply you want to participate. A wallet is only needed for identity, progress or payment.
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
              Put a useful challenge on the map and get a trusted receipt for what people actually completed.
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
                    href="/map"
                    variant="gold"
                    size="lg"
                    className="min-w-[200px]"
                  >
                    <MapPin className="h-5 w-5" />
                    Open the Map
                  </CosmicButton>
                </div>
                <div className={`${insetDentClass} px-4 py-4`}>
                  <CosmicButton
                    href="/join"
                    variant="blue"
                    size="lg"
                    className="min-w-[200px]"
                  >
                    <Users className="h-5 w-5" />
                    Start Here
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
