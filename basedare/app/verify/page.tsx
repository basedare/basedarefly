'use client';
import React from "react";
import { Shield } from "lucide-react";
import TruthOracle from "@/components/TruthOracle";
import GradualBlurOverlay from "@/components/GradualBlurOverlay";
import LiquidBackground from "@/components/LiquidBackground";

export default function Verify() {
  return (
    <div className="relative min-h-screen flex flex-col py-24 px-4 md:px-8">
      <LiquidBackground />
      {/* Gradual Blur Overlay */}
      <div className="fixed inset-0 z-10 pointer-events-none"><GradualBlurOverlay /></div>
      
      <div className="container mx-auto px-6 relative z-10 mb-24 flex-grow">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row items-end justify-between mb-12 border-b border-white/10 pb-6">
          <div>
            <h1 className="text-5xl md:text-6xl font-black uppercase italic tracking-tighter mb-2 flex items-center gap-4">
              <Shield className="text-blue-500 w-10 h-10" />
              TRUTH <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-600">PROTOCOL</span>
            </h1>
            <p className="text-gray-400 font-mono text-sm max-w-xl">
              Review evidence. Cast your vote. Earn reputation for accurate consensus.
            </p>
          </div>
          
          <div className="flex items-center gap-2 mt-4 md:mt-0">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-xs font-mono text-green-400 uppercase tracking-widest">Oracle Node Online</span>
          </div>
        </div>

        {/* THE ORACLE INTERFACE */}
        <TruthOracle />

        {/* INSTRUCTIONS */}
        <div className="mt-12 grid md:grid-cols-3 gap-6 opacity-70">
          <div className="p-6 bg-white/5 rounded-xl border border-white/10">
            <h3 className="text-blue-400 font-bold uppercase text-xs mb-2">1. Watch Carefully</h3>
            <p className="text-xs text-gray-400 font-mono">Verify that the dare was completed exactly as described in the smart contract conditions.</p>
          </div>
          <div className="p-6 bg-white/5 rounded-xl border border-white/10">
            <h3 className="text-blue-400 font-bold uppercase text-xs mb-2">2. Cast Vote</h3>
            <p className="text-xs text-gray-400 font-mono">Vote VALID if proof is sufficient. Vote INVALID if the streamer cheated or failed.</p>
          </div>
          <div className="p-6 bg-white/5 rounded-xl border border-white/10">
            <h3 className="text-blue-400 font-bold uppercase text-xs mb-2">3. Earn Yield</h3>
            <p className="text-xs text-gray-400 font-mono">Voters who align with the final consensus are rewarded with protocol reputation points.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
