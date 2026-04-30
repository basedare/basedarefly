'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Eye, Lock, Database } from 'lucide-react';
import LiquidBackground from '@/components/LiquidBackground';

export default function PrivacyPolicy() {
  const raisedPanelClass =
    'rounded-[2rem] border border-white/10 bg-[linear-gradient(155deg,rgba(22,28,48,0.78),rgba(7,9,18,0.95))] shadow-[10px_10px_28px_rgba(0,0,0,0.5),-6px_-6px_18px_rgba(255,255,255,0.04)] backdrop-blur-xl';
  const dentWellClass =
    'bd-dent-surface bd-dent-surface--soft rounded-[1.6rem] border border-white/6 bg-white/[0.02]';
  const sectionClass = `${raisedPanelClass} p-6 md:p-8`;

  return (
    <main className="relative overflow-hidden bg-transparent font-sans text-white selection:bg-cyan-500/30">
      <LiquidBackground />
      
      <div className="relative z-10 mx-auto max-w-4xl px-6 pb-14 pt-8 md:pb-16 md:pt-10">
        {/* NAV BACK */}
        <Link href="/" className="inline-flex items-center gap-2 text-gray-500 hover:text-cyan-400 transition-colors mb-12 font-mono text-sm uppercase tracking-widest group">
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Return to Base
        </Link>

        {/* HEADER */}
        <div className={`${raisedPanelClass} mb-12 p-8 md:p-10`}>
            <h1 className="text-5xl md:text-7xl font-black italic tracking-tighter mb-4 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-600">
                PRIVACY PROTOCOL
            </h1>
            <div className={`${dentWellClass} px-5 py-4`}>
              <p className="font-mono text-gray-400 uppercase tracking-widest text-xs mb-2">
                {'// DATA TRANSPARENCY REPORT //'}
              </p>
              <p className="text-sm md:text-base text-white/70 leading-relaxed">
                BaseDare is public by design. Your wallet activity is visible on-chain, while off-chain data collection stays deliberately minimal.
              </p>
            </div>
        </div>

        {/* CONTENT */}
        <div className="space-y-8 text-gray-300 leading-relaxed">
            
            <section className={sectionClass}>
                <div className="flex items-center gap-3 mb-4 text-cyan-400">
                    <Eye className="w-6 h-6" />
                    <h2 className="text-xl font-black italic uppercase">1. The Public Ledger</h2>
                </div>
                <div className={`${dentWellClass} px-5 py-4`}>
                  <p className="font-mono text-sm opacity-80">
                      BaseDare is built on public blockchains. <strong>We do not hide your data because we cannot.</strong> Your wallet address, transaction history, and bounty activity remain visible on-chain. If you need stronger separation, use a fresh wallet before interacting.
                  </p>
                </div>
            </section>

            <section className={sectionClass}>
                <h2 className="text-2xl font-black italic uppercase mb-4 text-white flex items-center gap-2">
                    <Database className="w-5 h-5 text-gray-500" /> No Database, No Problem
                </h2>
                <div className={`${dentWellClass} px-5 py-4`}>
                  <p className="font-mono text-sm opacity-80">
                      We do not maintain a traditional Web2 user database full of emails, passwords, or home addresses. Your account is your wallet. We know wallet activity, not your real-world identity.
                  </p>
                </div>
            </section>

            <section className={sectionClass}>
                <h2 className="text-2xl font-black italic uppercase mb-4 text-white flex items-center gap-2">
                    <Lock className="w-5 h-5 text-gray-500" /> Cookies & Local Storage
                </h2>
                <div className={`${dentWellClass} px-5 py-4`}>
                  <p className="font-mono text-sm opacity-80">
                      We use local storage only to remember product preferences like your chaos-versus-control view. We are not running third-party ad pixels across the protocol.
                  </p>
                </div>
            </section>

            <div className={`${dentWellClass} mt-10 px-5 py-4 flex items-center justify-between`}>
                <span className="font-mono text-xs text-gray-500 uppercase">Status: Encrypted (mostly)</span>
                <span className="font-mono text-xs text-gray-500 uppercase">v.1.0</span>
            </div>

        </div>
      </div>
    </main>
  );
}
