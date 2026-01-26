'use client';
import React from "react";
import { Shield, Sparkles } from "lucide-react";
import TruthOracle from "@/components/TruthOracle";
import GradualBlurOverlay from "@/components/GradualBlurOverlay";
import LiquidBackground from "@/components/LiquidBackground";

export default function Verify() {
  return (
    <div className="relative min-h-screen flex flex-col pt-20 pb-12 px-4 md:px-8">
      <LiquidBackground />
      {/* Gradual Blur Overlay */}
      <div className="fixed inset-0 z-10 pointer-events-none"><GradualBlurOverlay intensity="light" /></div>

      <div className="container mx-auto px-2 sm:px-6 relative z-10 mb-12 flex-grow max-w-7xl">

        {/* HEADER - Apple Liquid Glass */}
        <div className="mb-8 md:mb-12">
          {/* Demo Badge */}
          <div className="flex justify-center mb-4">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-full backdrop-blur-xl">
              <Sparkles className="w-3 h-3 text-blue-400" />
              <span className="text-[10px] font-mono text-blue-400 uppercase tracking-wider">Preview Demo</span>
            </div>
          </div>

          <div className="text-center">
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black uppercase italic tracking-tighter mb-3 flex items-center justify-center gap-2 sm:gap-4 flex-wrap">
              <Shield className="text-blue-500 w-7 h-7 sm:w-10 sm:h-10 flex-shrink-0" />
              <span>TRUTH</span>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-600">PROTOCOL</span>
            </h1>
            <p className="text-gray-400 font-mono text-xs sm:text-sm max-w-xl mx-auto">
              AI-powered verification with community consensus. Coming soon.
            </p>
          </div>
        </div>

        {/* THE ORACLE INTERFACE */}
        <TruthOracle />

        {/* INSTRUCTIONS - Liquid Glass Cards */}
        <div className="mt-8 md:mt-12 grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          {[
            {
              step: '1',
              title: 'AI Analysis',
              description: 'Sentinel AI scans proof for deepfakes, verifies identity, and checks completion criteria.',
              color: 'blue'
            },
            {
              step: '2',
              title: 'Cast Vote',
              description: 'Review AI findings. Vote VALID if proof is legit, FAKE if something is off.',
              color: 'purple'
            },
            {
              step: '3',
              title: 'Earn REP',
              description: 'Voters aligned with final consensus earn reputation. Wrong votes lose staked REP.',
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

        {/* Note about demo */}
        <p className="text-center text-[10px] text-gray-500 font-mono mt-6 uppercase tracking-wider">
          This is a preview of community verification. Full implementation with real dares coming soon.
        </p>
      </div>
    </div>
  );
}

