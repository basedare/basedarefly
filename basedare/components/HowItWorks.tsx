'use client';

import Link from "next/link";
import { motion } from "framer-motion";
import HowItWorksSignalWires from "@/components/HowItWorksSignalWires";
import FirstActionSelector from "@/components/FirstActionSelector";
import './HowItWorksSignalWires.css';

export default function HowItWorks() {
  const steps = [
    {
      step: "01",
      title: "The Pledge",
      desc: "Lock real money in escrow. The dare is live. The place is tagged. Anyone nearby can claim it.",
      icon: "💰",
      accent: "from-[#F5C518]/30 via-[#F5C518]/12 to-transparent",
      titleColor: "text-[#F5C518]"
    },
    {
      step: "02",
      title: "The Action",
      desc: "Show up. Do it. Film the proof. No audience needed. Just you, the place, and what you're willing to do.",
      icon: "🎥",
      accent: "from-[#A855F7]/28 via-[#A855F7]/12 to-transparent",
      titleColor: "text-white"
    },
    {
      step: "03",
      title: "The Payoff",
      desc: "Proof verified. Settlement instant. The win gets written to the place forever.",
      icon: "💸",
      accent: "from-[#3BA7FF]/28 via-[#3BA7FF]/12 to-transparent",
      titleColor: "text-[#3BA7FF]"
    }
  ];

  return (
    <section className="w-full py-24 bg-transparent relative overflow-hidden">
      {/* Background Tech Lines */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] opacity-10" />

      <div className="container mx-auto px-4 md:px-6 relative z-10">
        
        {/* HEADER */}
        <div className="text-center mb-14 md:mb-20">
          <div className="mb-5 inline-flex items-center rounded-full border border-purple-400/25 bg-white/[0.03] px-3 py-2 shadow-[0_12px_30px_rgba(0,0,0,0.22)]">
            <div className="bd-dent-surface bd-dent-surface--soft rounded-full border border-purple-400/20 px-4 py-2">
              <h2 className="text-[0.7rem] font-mono text-purple-300 tracking-[0.45em] uppercase drop-shadow-lg">
                System Protocol
              </h2>
            </div>
          </div>
          <div className="hidden md:flex justify-center">
            <div className="how-it-works-neon-shell">
              <div className="how-it-works-neon-sign">
                <h3 className="how-it-works-neon-title">How It Works</h3>
              </div>
            </div>
          </div>
          <h3 className="text-5xl font-black text-white italic tracking-tighter uppercase drop-shadow-[0_0_30px_rgba(255,255,255,0.3)] md:hidden">
            How It Works
          </h3>
          <div className="mx-auto mt-5 max-w-2xl rounded-[1.6rem] border border-white/[0.08] bg-white/[0.02] px-4 py-3 shadow-[0_18px_50px_rgba(0,0,0,0.26)]">
            <div className="bd-dent-surface bd-dent-surface--soft rounded-[1.2rem] border border-white/[0.06] px-5 py-3">
              <p className="text-sm uppercase tracking-[0.32em] text-white/55 md:text-[0.84rem]">
                Fund it. Trigger it. Verify it.
              </p>
            </div>
          </div>
        </div>

        <div className="mx-auto mb-14 max-w-5xl md:mb-20">
          <div className="relative overflow-hidden rounded-[2.25rem] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(255,255,255,0.045),rgba(7,8,15,0.86))] px-5 py-5 shadow-[18px_24px_70px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.08)] md:px-7 md:py-6">
            <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/28 to-transparent" />
            <div className="grid gap-4 md:grid-cols-[1fr_220px_1fr] md:items-center">
              <div className="rounded-[1.5rem] border border-purple-300/14 bg-purple-400/[0.045] px-5 py-4">
                <p className="font-mono text-[0.68rem] uppercase tracking-[0.32em] text-purple-200/80">
                  For fans + creators
                </p>
                <h4 className="mt-2 text-2xl font-black uppercase italic text-white">Stay in Chaos</h4>
                <p className="mt-2 text-sm leading-6 text-white/58">
                  Browse dares, create missions, complete proof, verify outcomes, and move around the map.
                </p>
              </div>

              <div className="mx-auto w-full max-w-[220px]">
                <div className="mb-2 text-center font-mono text-[0.62rem] uppercase tracking-[0.32em] text-white/44">
                  The switch separates the product
                </div>
                <div className="relative h-14 overflow-hidden rounded-full border border-white/12 bg-black/70 p-1 shadow-[inset_8px_8px_16px_rgba(0,0,0,0.75),inset_-5px_-5px_12px_rgba(255,255,255,0.04)]">
                  <div className="absolute inset-y-0 left-5 flex items-center font-mono text-[0.64rem] font-black uppercase tracking-[0.22em] text-purple-200/70">
                    Chaos
                  </div>
                  <div className="absolute inset-y-0 right-4 flex items-center font-mono text-[0.64rem] font-black uppercase tracking-[0.22em] text-yellow-100/70">
                    Control
                  </div>
                  <motion.div
                    className="absolute left-1 top-1 h-[calc(100%-0.5rem)] w-[45%] rounded-full bg-[linear-gradient(145deg,#f8fafc,#9ca3af)] shadow-[0_10px_22px_rgba(0,0,0,0.44),inset_0_1px_0_rgba(255,255,255,0.72)]"
                    animate={{ x: ['0%', '115%', '0%'] }}
                    transition={{ duration: 4.8, repeat: Infinity, ease: 'easeInOut' }}
                  />
                </div>
              </div>

              <div className="rounded-[1.5rem] border border-white/12 bg-white/[0.045] px-5 py-4 grayscale">
                <p className="font-mono text-[0.68rem] uppercase tracking-[0.32em] text-white/58">
                  For venues + brands
                </p>
                <h4 className="mt-2 text-2xl font-black uppercase italic text-white">Flip to Control</h4>
                <p className="mt-2 text-sm leading-6 text-white/58">
                  Plan activations, open the Brand Portal, route creators, and read proof receipts in one operator layer.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 3-STEP PROCESS */}
        <div className="how-it-works-wire-shell relative mb-16 md:mb-24">
          <HowItWorksSignalWires foundationRatio={0.53} />
          <div className="grid md:grid-cols-3 gap-6 md:gap-8">
          {steps.map((item, idx) => (
            <div key={idx} data-cable-node className="relative group min-w-0">
              <div className="how-it-works-card-shell relative z-10 overflow-hidden rounded-[2rem] border border-white/[0.08] p-3 transition-all duration-300 hover:-translate-y-1.5 hover:border-purple-400/30">
                <div data-cable-anchor="left" className="how-it-works-side-socket how-it-works-side-socket--left hidden md:block" />
                <div data-cable-anchor="right" className="how-it-works-side-socket how-it-works-side-socket--right hidden md:block" />
                <div className={`pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b ${item.accent} opacity-90`} />
                <div className="how-it-works-card-glass relative flex min-h-[290px] flex-col rounded-[1.55rem] border border-white/[0.05] px-6 py-6">
                  <div className="how-it-works-card-fog pointer-events-none absolute inset-0 rounded-[1.55rem]" />
                  <div className="how-it-works-card-noise pointer-events-none absolute inset-0 rounded-[1.55rem]" />
                  <div className="mb-7 flex items-start justify-between gap-4">
                    <div className="how-it-works-icon-bay bd-dent-surface relative flex h-16 w-16 items-center justify-center rounded-[1.35rem] border border-purple-400/20 shadow-[0_0_24px_rgba(168,85,247,0.12)]">
                      <div className="how-it-works-icon-core flex h-[calc(100%-10px)] w-[calc(100%-10px)] items-center justify-center rounded-[1.05rem]">
                        <span className="how-it-works-icon-glyph">{item.icon}</span>
                      </div>
                    </div>
                    <div className="how-it-works-step-pill bd-dent-surface bd-dent-surface--soft rounded-full border border-white/[0.06] px-4 py-2">
                      <span className="text-sm font-mono font-black tracking-[0.28em] text-white/35">
                        {item.step}
                      </span>
                    </div>
                  </div>

                  <div className="how-it-works-content-bay bd-dent-surface flex flex-1 flex-col rounded-[1.45rem] border border-white/[0.06] px-5 py-5">
                    <div className="mb-4">
                      <p className="mb-2 text-[0.72rem] font-mono uppercase tracking-[0.34em] text-white/42">
                        Protocol Step
                      </p>
                      <div className="how-it-works-title-well rounded-[1.1rem] px-4 py-3">
                        <h4 className={`text-[2rem] font-black uppercase italic leading-none drop-shadow-lg ${item.titleColor}`}>
                          {item.title}
                        </h4>
                      </div>
                    </div>
                    <p className="text-[1.05rem] leading-relaxed text-gray-300 break-words drop-shadow-md">
                      {item.desc}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
          </div>
        </div>

        <div className="mb-12 flex justify-center md:mb-14">
          <FirstActionSelector />
        </div>

        <div className="mx-auto mt-2 max-w-5xl text-center md:mt-4">
          <div className="relative overflow-hidden rounded-[2.4rem] border border-white/[0.08] bg-[radial-gradient(circle_at_20%_0%,rgba(245,197,24,0.11),transparent_32%),radial-gradient(circle_at_80%_18%,rgba(168,85,247,0.13),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.035),rgba(6,7,14,0.82))] px-5 py-8 shadow-[18px_24px_70px_rgba(0,0,0,0.38),inset_0_1px_0_rgba(255,255,255,0.08)] md:px-10 md:py-11">
            <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-[#f5c518]/55 to-transparent" />
            <p className="mb-4 text-[0.68rem] font-black uppercase tracking-[0.36em] text-white/42">
              Real dares. Real proof. Real payouts.
            </p>
            <h3 className="text-[clamp(2.35rem,7.4vw,5.7rem)] font-black italic uppercase leading-[0.9] tracking-[-0.06em] text-white drop-shadow-[0_0_28px_rgba(255,255,255,0.16)]">
              Wherever You Go.
              <span className="mt-2 block bg-gradient-to-r from-[#f8dd72] via-[#ff7adf] to-[#a5b4fc] bg-clip-text text-transparent drop-shadow-[0_0_28px_rgba(168,85,247,0.28)] max-sm:bg-none max-sm:text-[#f8dd72] max-sm:drop-shadow-[0_0_18px_rgba(245,197,24,0.2)]">
                Someone Will Pay You To Do It.
              </span>
            </h3>
            <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/map"
                className="group inline-flex w-full items-center justify-center rounded-full border border-[#f5c518]/34 bg-[linear-gradient(180deg,rgba(255,226,122,0.98),rgba(245,197,24,0.94)_48%,rgba(171,111,0,0.95))] px-6 py-3 text-[0.76rem] font-black uppercase tracking-[0.2em] text-[#15120c] shadow-[0_14px_26px_rgba(245,197,24,0.15),inset_0_1px_0_rgba(255,255,255,0.38),inset_0_-7px_13px_rgba(77,45,0,0.28)] transition hover:-translate-y-[1px] sm:w-auto"
              >
                Browse Active Dares
              </Link>
              <Link
                href="/activations"
                className="inline-flex w-full items-center justify-center rounded-full border border-white/12 bg-white/[0.045] px-6 py-3 text-[0.76rem] font-black uppercase tracking-[0.2em] text-white/86 shadow-[0_16px_30px_rgba(0,0,0,0.24),inset_0_1px_0_rgba(255,255,255,0.08)] transition hover:-translate-y-[1px] hover:border-purple-300/30 hover:text-white sm:w-auto"
              >
                Run a Venue Activation
              </Link>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
