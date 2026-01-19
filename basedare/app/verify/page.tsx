'use client';
import React from "react";
import { Shield } from "lucide-react";
import TruthOracle from "@/components/TruthOracle";
import GradualBlurOverlay from "@/components/GradualBlurOverlay";
import LiquidBackground from "@/components/LiquidBackground";

export default function Verify() {
  return (
    <div className="relative min-h-screen flex flex-col pt-20 pb-12 px-4 md:px-8">
      <LiquidBackground />
      {/* Gradual Blur Overlay */}
      <div className="fixed inset-0 z-10 pointer-events-none"><GradualBlurOverlay intensity="light" /></div>

      <div className="container mx-auto px-2 sm:px-6 relative z-10 mb-12 flex-grow">

        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 md:mb-12 border-b border-white/10 pb-4 md:pb-6">
          <div className="min-w-0">
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black uppercase italic tracking-tighter mb-2 flex items-center gap-2 sm:gap-4 flex-wrap">
              <Shield className="text-blue-500 w-7 h-7 sm:w-10 sm:h-10 flex-shrink-0" />
              <span className="break-words">TRUTH</span>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-600 break-words">PROTOCOL</span>
            </h1>
            <p className="text-gray-400 font-mono text-xs sm:text-sm max-w-xl">
              Review evidence. Cast your vote. Earn reputation for accurate consensus.
            </p>
          </div>

          <div className="flex items-center gap-2 mt-4 md:mt-0 flex-shrink-0">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-[10px] sm:text-xs font-mono text-green-400 uppercase tracking-widest whitespace-nowrap">Oracle Online</span>
          </div>
        </div>

        {/* THE ORACLE INTERFACE */}
        <TruthOracle />

        {/* INSTRUCTIONS */}
        <div className="mt-8 md:mt-12 grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-6 opacity-70">
          <div className="p-4 sm:p-6 bg-black/40 backdrop-blur-xl rounded-xl border border-white/10">
            <h3 className="text-blue-400 font-bold uppercase text-[10px] sm:text-xs mb-1 sm:mb-2">1. Watch Carefully</h3>
            <p className="text-[10px] sm:text-xs text-gray-400 font-mono leading-relaxed">Verify that the dare was completed exactly as described in the smart contract conditions.</p>
          </div>
          <div className="p-4 sm:p-6 bg-black/40 backdrop-blur-xl rounded-xl border border-white/10">
            <h3 className="text-blue-400 font-bold uppercase text-[10px] sm:text-xs mb-1 sm:mb-2">2. Cast Vote</h3>
            <p className="text-[10px] sm:text-xs text-gray-400 font-mono leading-relaxed">Vote VALID if proof is sufficient. Vote INVALID if the streamer cheated or failed.</p>
          </div>
          <div className="p-4 sm:p-6 bg-black/40 backdrop-blur-xl rounded-xl border border-white/10">
            <h3 className="text-blue-400 font-bold uppercase text-[10px] sm:text-xs mb-1 sm:mb-2">3. Earn Yield</h3>
            <p className="text-[10px] sm:text-xs text-gray-400 font-mono leading-relaxed">Voters who align with final consensus are rewarded with protocol reputation points.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

