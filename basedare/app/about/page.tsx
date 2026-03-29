'use client';
import dynamic from 'next/dynamic';
import GradualBlurOverlay from "@/components/GradualBlurOverlay";
import { Zap, Shield, Users } from "lucide-react";
import ProfileCard from "@/components/ProfileCard";
import LiquidBackground from "@/components/LiquidBackground";

const PeeBearGlass = dynamic(() => import('@/components/PeeBearGlass'), {
  ssr: false,
});

const raisedPanelClass =
  "relative overflow-hidden rounded-[30px] border border-white/[0.09] bg-[linear-gradient(180deg,rgba(255,255,255,0.07)_0%,rgba(255,255,255,0.025)_14%,rgba(10,9,18,0.9)_58%,rgba(7,6,14,0.96)_100%)] shadow-[0_28px_90px_rgba(0,0,0,0.4),0_0_28px_rgba(168,85,247,0.07),inset_0_1px_0_rgba(255,255,255,0.1),inset_0_-18px_24px_rgba(0,0,0,0.24)]";

const softCardClass =
  "relative overflow-hidden rounded-[26px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(255,255,255,0.06)_0%,rgba(255,255,255,0.02)_12%,rgba(10,10,18,0.92)_100%)] shadow-[0_18px_30px_rgba(0,0,0,0.22),inset_0_1px_0_rgba(255,255,255,0.08),inset_0_-12px_18px_rgba(0,0,0,0.22)]";

const insetDentClass =
  "bd-dent-surface bd-dent-surface--soft rounded-[20px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(4,5,10,0.72)_0%,rgba(11,11,18,0.92)_100%)]";

export default function About() {
  return (
    <div className="relative min-h-screen">
      <LiquidBackground />
      <div className="fixed inset-0 z-10 pointer-events-none"><GradualBlurOverlay /></div>
      
      <section className="relative z-10 container mx-auto px-6 pt-24 pb-12 text-center">
        <div className={`${raisedPanelClass} mx-auto max-w-5xl px-6 py-10 md:px-10 md:py-12`}>
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_0%,rgba(168,85,247,0.12),transparent_32%),radial-gradient(circle_at_88%_100%,rgba(34,211,238,0.1),transparent_36%),linear-gradient(180deg,rgba(255,255,255,0.05)_0%,transparent_32%,transparent_72%,rgba(0,0,0,0.24)_100%)]" />
          <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/26 to-transparent" />
          <div className="relative">
            <div className="inline-block px-4 py-1 rounded-full bg-white/5 border border-white/10 text-[#FFD700] font-mono text-xs uppercase tracking-widest mb-6">
              The Protocol
            </div>
            <h1 className="text-6xl md:text-8xl font-black uppercase italic tracking-tighter mb-8 leading-none">
              WE MONETIZE <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-b from-purple-400 to-purple-900">CHAOS.</span>
            </h1>
            <div className={`${insetDentClass} mx-auto max-w-3xl px-5 py-5`}>
              <p className="text-xl text-gray-300 font-mono leading-relaxed">
                BaseDare is the first decentralized attention marketplace. We turn viral moments into funded challenges. Back the creators. Own the moment.
              </p>
            </div>
            <div className="mt-10 flex justify-center">
              <div className={`${softCardClass} relative p-4 md:p-5`}>
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_38%,rgba(168,85,247,0.18),transparent_40%),radial-gradient(circle_at_50%_88%,rgba(34,211,238,0.12),transparent_45%)]" />
                <div className="relative">
                  <PeeBearGlass className="mx-auto h-[280px] w-[280px] md:h-[400px] md:w-[400px]" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="relative z-10 container mx-auto px-6 py-12 flex flex-col items-center">
        <div className={`${softCardClass} w-full max-w-2xl p-8`}>
          <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
          <div className="mb-8 text-center relative">
            <span className="font-mono text-xs text-purple-400 uppercase tracking-widest mb-2 block">
              Access Level: God Mode
            </span>
            <h2 className="text-3xl font-black italic uppercase text-white">Meet The C.H.O.</h2>
          </div>
          
          <div className="w-full max-w-[350px] mx-auto">
            <ProfileCard
              name="MANAGER"
              title="Chief Honey Officer"
              handle="@BaseDareManager"
              onContactClick={() => window.open('https://x.com/messages/compose?recipient_id=basedare_xyz', '_blank')}
            />
          </div>
        </div>
      </section>

      <section className="relative z-10 container mx-auto px-6 py-24 mb-32">
        <div className="grid md:grid-cols-3 gap-6">
          <div className={`${softCardClass} group p-8 transition-all duration-500 hover:border-[#FFD700]/50 hover:-translate-y-[2px]`}>
            <div className={`${insetDentClass} w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
              <Zap className="w-6 h-6 text-purple-400" />
            </div>
            <h3 className="text-2xl font-black text-white mb-2 uppercase italic">Atomic Settlement</h3>
            <div className={`${insetDentClass} px-4 py-4`}>
              <p className="text-sm text-gray-400 font-mono">
                Every dare is a smart contract. When the stream ends, liquidity settles instantly on Base L2. No middlemen. No delays.
              </p>
            </div>
          </div>

          <div className={`${softCardClass} group p-8 transition-all duration-500 hover:border-[#FFD700]/50 hover:-translate-y-[2px]`}>
            <div className={`${insetDentClass} w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
              <Shield className="w-6 h-6 text-blue-400" />
            </div>
            <h3 className="text-2xl font-black text-white mb-2 uppercase italic">Verifiable Truth</h3>
            <div className={`${insetDentClass} px-4 py-4`}>
              <p className="text-sm text-gray-400 font-mono">
                zkML + Oracle consensus ensures outcomes are reported accurately. Fake news gets slashed. Truth gets paid.
              </p>
            </div>
          </div>

          <div className={`${softCardClass} group p-8 transition-all duration-500 hover:border-[#FFD700]/50 hover:-translate-y-[2px]`}>
            <div className={`${insetDentClass} w-12 h-12 bg-[#FFD700]/20 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
              <Users className="w-6 h-6 text-[#FFD700]" />
            </div>
            <h3 className="text-2xl font-black text-white mb-2 uppercase italic">Social Liquidity</h3>
            <div className={`${insetDentClass} px-4 py-4`}>
              <p className="text-sm text-gray-400 font-mono">
                High reputation unlocks lower fees and higher funding limits. Your clout is now your credential.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
