'use client';
import React from "react";
import { Shield, Zap, Activity, ScanSearch, Wallet } from "lucide-react";
import TruthOracle from "@/components/TruthOracle";
import GradualBlurOverlay from "@/components/GradualBlurOverlay";
import LiquidBackground from "@/components/LiquidBackground";

export default function Verify() {
  return (
    <div className="relative min-h-screen flex flex-col pt-20 pb-12 px-4 md:px-8">
      <LiquidBackground />
      {/* Gradual Blur Overlay */}
      <div className="fixed inset-0 z-10 pointer-events-none"><GradualBlurOverlay /></div>

      <div className="container mx-auto px-2 sm:px-6 relative z-10 mb-12 flex-grow max-w-7xl">
        {/* HEADER - Apple Liquid Glass */}
        <div className="mb-8 md:mb-12">
          <div className="text-center">
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black uppercase italic tracking-tighter mb-3 flex items-center justify-center gap-2 sm:gap-4 flex-wrap">
              <Shield className="text-blue-500 w-7 h-7 sm:w-10 sm:h-10 flex-shrink-0" />
              <span>TRUTH</span>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-600">PROTOCOL</span>
            </h1>
            <p className="text-gray-400 font-mono text-xs sm:text-sm max-w-xl mx-auto">
              Surface community signal, feed referee review, and keep the payout layer honest.
            </p>
          </div>
        </div>

        <div className="mb-6 md:mb-8 relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[linear-gradient(155deg,rgba(255,255,255,0.08)_0%,rgba(255,255,255,0.03)_22%,rgba(10,8,16,0.9)_62%,rgba(7,5,12,0.96)_100%)] p-3 sm:p-4 shadow-[0_0_0_1px_rgba(255,255,255,0.02),0_18px_32px_rgba(0,0,0,0.42),0_0_30px_rgba(59,130,246,0.05),inset_0_1px_0_rgba(255,255,255,0.1),inset_0_-16px_24px_rgba(0,0,0,0.3)]">
          <div className="pointer-events-none absolute inset-0 rounded-2xl bg-[radial-gradient(circle_at_12%_0%,rgba(59,130,246,0.12),transparent_36%),radial-gradient(circle_at_88%_100%,rgba(168,85,247,0.12),transparent_40%),linear-gradient(180deg,rgba(255,255,255,0.08)_0%,transparent_30%,transparent_72%,rgba(0,0,0,0.28)_100%)]" />
          <div className="pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
          <div className="pointer-events-none absolute bottom-0 left-8 right-8 h-px bg-gradient-to-r from-transparent via-black/45 to-transparent" />

          <div className="relative rounded-xl border border-white/[0.08] bg-[linear-gradient(145deg,rgba(12,11,19,0.97)_0%,rgba(16,15,24,0.96)_24%,rgba(28,25,40,0.88)_100%)] px-4 py-3 shadow-[inset_0_2px_3px_rgba(255,255,255,0.04),inset_0_-10px_18px_rgba(0,0,0,0.4),inset_8px_8px_18px_rgba(0,0,0,0.18),0_1px_0_rgba(255,255,255,0.04)]">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-[10px] font-mono uppercase tracking-[0.28em] text-white/35">Review Protocol</p>
                <p className="mt-1 text-xs md:text-sm text-white/85 font-semibold uppercase tracking-wide">
                  Community signal · escalates to referee review · payout handled by protocol
                </p>
              </div>
              <div className="flex flex-wrap gap-2 text-[10px] font-mono uppercase tracking-wider text-white/55">
                <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/25 bg-blue-500/10 px-3 py-1.5">
                  <Activity className="h-3.5 w-3.5 text-blue-300" />
                  Signal Layer
                </div>
                <div className="inline-flex items-center gap-2 rounded-full border border-purple-500/25 bg-purple-500/10 px-3 py-1.5">
                  <ScanSearch className="h-3.5 w-3.5 text-purple-300" />
                  Referee Queue
                </div>
                <div className="inline-flex items-center gap-2 rounded-full border border-yellow-500/25 bg-yellow-500/10 px-3 py-1.5">
                  <Wallet className="h-3.5 w-3.5 text-yellow-300" />
                  Protocol Payout
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* THE ORACLE INTERFACE */}
        <TruthOracle />

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
              description: 'Vote PASS if the proof shows completion. Vote FAIL if the proof is insufficient or fraudulent.',
              color: 'purple'
            },
            {
              step: '3',
              title: 'Escalate Review',
              description: 'Strong community consensus pushes a dare into referee review. Final approval and payout are handled by protocol.',
              color: 'green'
            }
          ].map((item) => (
            <div
              key={item.step}
              className="relative overflow-hidden rounded-xl border border-white/[0.08] bg-[linear-gradient(155deg,rgba(255,255,255,0.06)_0%,rgba(255,255,255,0.02)_18%,rgba(9,8,15,0.92)_68%,rgba(8,7,12,0.96)_100%)] p-4 sm:p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.02),0_16px_24px_rgba(0,0,0,0.28),inset_0_1px_0_rgba(255,255,255,0.08),inset_0_-12px_18px_rgba(0,0,0,0.26)] transition-all hover:-translate-y-[1px] hover:bg-white/[0.04]"
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
        <div className="mt-6 relative overflow-hidden rounded-xl border border-white/[0.08] bg-[linear-gradient(155deg,rgba(255,255,255,0.06)_0%,rgba(255,255,255,0.02)_18%,rgba(9,8,15,0.92)_68%,rgba(8,7,12,0.96)_100%)] p-4 shadow-[0_0_0_1px_rgba(255,255,255,0.02),0_18px_28px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.08),inset_0_-12px_18px_rgba(0,0,0,0.28)]">
          <div className="pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-4 h-4 text-yellow-400" />
            <span className="text-xs font-bold text-yellow-400 uppercase">How Points Work</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-[10px] sm:text-xs text-gray-400 font-mono">
            <div>
              <span className="text-blue-400 font-bold">+5</span> points for every vote cast
            </div>
            <div>
              <span className="text-green-400 font-bold">Signal</span> helps prioritise referee review
            </div>
            <div>
              <span className="text-orange-400 font-bold">Final</span> payout still belongs to the protocol
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
