'use client';
import GradualBlurOverlay from "@/components/GradualBlurOverlay";
import { Zap, Shield, Users } from "lucide-react";
import ProfileCard from "@/components/ProfileCard";
import LiquidBackground from "@/components/LiquidBackground";

export default function About() {
  return (
    <div className="relative min-h-screen">
      <LiquidBackground />
      <div className="fixed inset-0 z-10 pointer-events-none"><GradualBlurOverlay /></div>
      
      <section className="relative z-10 container mx-auto px-6 pt-24 pb-12 text-center">
        <div className="inline-block px-4 py-1 rounded-full bg-white/5 border border-white/10 text-[#FFD700] font-mono text-xs uppercase tracking-widest mb-6">
          The Protocol
        </div>
        <h1 className="text-6xl md:text-8xl font-black uppercase italic tracking-tighter mb-8 leading-none">
          WE MONETIZE <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-b from-purple-400 to-purple-900">CHAOS.</span>
        </h1>
        <p className="max-w-2xl mx-auto text-xl text-gray-400 font-mono leading-relaxed">
          BaseDare is the first decentralized attention marketplace. We turn viral moments into liquid markets. Stake on the outcome. Own the moment.
        </p>
      </section>

      <section className="relative z-10 container mx-auto px-6 py-12 flex flex-col items-center">
        <div className="mb-8 text-center">
           <span className="font-mono text-xs text-purple-400 uppercase tracking-widest mb-2 block">
             Access Level: God Mode
           </span>
           <h2 className="text-3xl font-black italic uppercase text-white">Meet The C.H.O.</h2>
        </div>
        
        <div className="w-full max-w-[350px]">
          <ProfileCard
            name="MANAGER"
            title="Chief Honey Officer"
            handle="@BaseDareManager"
            onContactClick={() => window.open('https://x.com/messages/compose?recipient_id=basedare_xyz', '_blank')}
          />
        </div>
      </section>

      <section className="relative z-10 container mx-auto px-6 py-24 mb-32">
        <div className="grid md:grid-cols-3 gap-6">
          <div className="group p-8 rounded-3xl bg-black/40 border border-white/10 hover:border-[#FFD700]/50 transition-all duration-500 hover:bg-black/60">
            <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Zap className="w-6 h-6 text-purple-400" />
            </div>
            <h3 className="text-2xl font-black text-white mb-2 uppercase italic">Atomic Settlement</h3>
            <p className="text-sm text-gray-500 font-mono">
              Every dare is a smart contract. When the stream ends, liquidity settles instantly on Base L2. No middlemen. No delays.
            </p>
          </div>

          <div className="group p-8 rounded-3xl bg-black/40 border border-white/10 hover:border-[#FFD700]/50 transition-all duration-500 hover:bg-black/60">
            <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Shield className="w-6 h-6 text-blue-400" />
            </div>
            <h3 className="text-2xl font-black text-white mb-2 uppercase italic">Verifiable Truth</h3>
            <p className="text-sm text-gray-500 font-mono">
              zkML + Oracle consensus ensures outcomes are reported accurately. Fake news gets slashed. Truth gets paid.
            </p>
          </div>

          <div className="group p-8 rounded-3xl bg-black/40 border border-white/10 hover:border-[#FFD700]/50 transition-all duration-500 hover:bg-black/60">
            <div className="w-12 h-12 bg-[#FFD700]/20 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Users className="w-6 h-6 text-[#FFD700]" />
            </div>
            <h3 className="text-2xl font-black text-white mb-2 uppercase italic">Social Liquidity</h3>
            <p className="text-sm text-gray-500 font-mono">
              High reputation unlocks lower fees and higher staking limits. Your clout is now your collateral.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
