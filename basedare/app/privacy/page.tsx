'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Eye, Lock, Database } from 'lucide-react';
import LiquidBackground from '@/components/LiquidBackground';

export default function PrivacyPolicy() {
  return (
    <main className="min-h-screen bg-[#050505] text-white selection:bg-cyan-500/30 font-sans relative overflow-hidden">
      <LiquidBackground />
      
      <div className="relative z-10 max-w-4xl mx-auto px-6 py-24">
        {/* NAV BACK */}
        <Link href="/" className="inline-flex items-center gap-2 text-gray-500 hover:text-cyan-400 transition-colors mb-12 font-mono text-sm uppercase tracking-widest group">
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Return to Base
        </Link>

        {/* HEADER */}
        <div className="mb-16 border-b border-white/10 pb-8">
            <h1 className="text-5xl md:text-7xl font-black italic tracking-tighter mb-4 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-600">
                PRIVACY PROTOCOL
            </h1>
            <p className="font-mono text-gray-500 uppercase tracking-widest text-xs">
                // DATA TRANSPARENCY REPORT //
            </p>
        </div>

        {/* CONTENT */}
        <div className="space-y-12 text-gray-300 leading-relaxed">
            
            <section className="bg-white/5 p-8 rounded-3xl border border-white/10">
                <div className="flex items-center gap-3 mb-4 text-cyan-400">
                    <Eye className="w-6 h-6" />
                    <h2 className="text-xl font-black italic uppercase">1. The Public Ledger</h2>
                </div>
                <p className="font-mono text-sm opacity-80">
                    BaseDare is built on public blockchains. <strong>We do not hide your data because we cannot.</strong> Your wallet address, transaction history, and staked amounts are publicly visible on the Base block explorer. If you require absolute anonymity, use a fresh wallet mixed via privacy protocols before interacting.
                </p>
            </section>

            <section>
                <h2 className="text-2xl font-black italic uppercase mb-4 text-white flex items-center gap-2">
                    <Database className="w-5 h-5 text-gray-500" /> No Database, No Problem
                </h2>
                <p className="font-mono text-sm opacity-80 mb-4">
                    We do not maintain a traditional Web2 database of user emails, passwords, or physical addresses. Your account is your wallet. We do not know who you are, only what you own.
                </p>
            </section>

            <section>
                <h2 className="text-2xl font-black italic uppercase mb-4 text-white flex items-center gap-2">
                    <Lock className="w-5 h-5 text-gray-500" /> Cookies & Local Storage
                </h2>
                <p className="font-mono text-sm opacity-80 mb-4">
                    We use local storage on your device only to remember your "Chaos vs Control" view preference. We do not use third-party tracking pixels to sell your soul to advertisers.
                </p>
            </section>

            <div className="pt-12 border-t border-white/10 mt-12 flex items-center justify-between">
                <span className="font-mono text-xs text-gray-600 uppercase">Status: ENCRYPTED (MOSTLY)</span>
                <span className="font-mono text-xs text-gray-600 uppercase">v.1.0</span>
            </div>

        </div>
      </div>
    </main>
  );
}
