'use client';

import { Target, Zap, Lock } from "lucide-react";
import MoltenGold from "./ui/MoltenGold";

export default function TheMechanism() {
  return (
    <section className="relative py-24 px-6">
      <div className="max-w-7xl mx-auto">
        
        {/* SECTION TITLE */}
        <div className="text-center mb-16 space-y-4">
           <div className="inline-block border border-[#FACC15]/30 bg-[#FACC15]/5 rounded-full px-4 py-1.5 mb-4">
              <span className="text-[#FACC15] text-xs font-mono font-bold tracking-[0.2em] uppercase">
                The Protocol
              </span>
           </div>
           <div className="flex flex-col items-center">
              <MoltenGold className="text-5xl md:text-6xl">
                HOW IT WORKS
              </MoltenGold>
           </div>
        </div>

        {/* THE 3 STEPS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10">
            
            {/* STEP 1 */}
            <div className="relative group p-8 rounded-3xl border border-white/10 bg-white/[0.02] backdrop-blur-sm hover:bg-white/[0.05] transition-colors">
                <div className="absolute top-0 right-0 p-4 opacity-10 font-black text-6xl text-gray-500">01</div>
                <div className="w-12 h-12 rounded-full bg-purple-900/30 border border-purple-500/50 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <Zap className="text-purple-400" size={24} />
                </div>
                <h3 className="text-2xl font-bold text-white mb-3">The Pledge</h3>
                <p className="text-gray-400 leading-relaxed">
                    You fund a bounty with <span className="text-[#FACC15]">USDC</span> held in escrow. The money is real. The pressure is visible.
                </p>
            </div>

            {/* STEP 2 */}
            <div className="relative group p-8 rounded-3xl border border-white/10 bg-white/[0.02] backdrop-blur-sm hover:bg-white/[0.05] transition-colors">
                <div className="absolute top-0 right-0 p-4 opacity-10 font-black text-6xl text-gray-500">02</div>
                <div className="w-12 h-12 rounded-full bg-yellow-900/30 border border-yellow-500/50 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <Target className="text-yellow-400" size={24} />
                </div>
                <h3 className="text-2xl font-bold text-white mb-3">The Action</h3>
                <p className="text-gray-400 leading-relaxed">
                    The streamer receives the challenge. The chat goes wild. They either perform the dare or lose face forever.
                </p>
            </div>

            {/* STEP 3 (The AI Tease) */}
            <div className="relative group p-8 rounded-3xl border border-white/10 bg-white/[0.02] backdrop-blur-sm hover:bg-white/[0.05] transition-colors">
                <div className="absolute top-0 right-0 p-4 opacity-10 font-black text-6xl text-gray-500">03</div>
                <div className="w-12 h-12 rounded-full bg-green-900/30 border border-green-500/50 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <span className="text-green-400 font-black text-xl">$</span>
                </div>
                <h3 className="text-2xl font-bold text-white mb-3">The Payoff</h3>
                <p className="text-gray-400 leading-relaxed mb-4">
                    Proof submitted. Consensus reached. Smart contract releases funds instantly.
                </p>
                
                {/* MYSTERIOUS AI HINT */}
                <div className="mt-6 pt-4 border-t border-white/5 flex items-center gap-3 opacity-60">
                    <Lock size={14} className="text-[#FACC15]" />
                    <span className="text-xs font-mono text-gray-500 uppercase tracking-wider">
                        AI JUDGEMENT: <span className="text-[#FACC15] animate-pulse">TRAINING...</span>
                    </span>
                </div>
            </div>

        </div>

      </div>
    </section>
  );
}

