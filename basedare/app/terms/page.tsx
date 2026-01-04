'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, AlertTriangle, ShieldAlert, Gavel } from 'lucide-react';
import LiquidBackground from '@/components/LiquidBackground';

export default function TermsOfChaos() {
  return (
    <main className="min-h-screen bg-[#050505] text-white selection:bg-purple-500/30 font-sans relative overflow-hidden">
      <LiquidBackground />
      
      <div className="relative z-10 max-w-4xl mx-auto px-6 py-24">
        {/* NAV BACK */}
        <Link href="/" className="inline-flex items-center gap-2 text-gray-500 hover:text-[#FFD700] transition-colors mb-12 font-mono text-sm uppercase tracking-widest group">
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Return to Base
        </Link>

        {/* HEADER */}
        <div className="mb-16 border-b border-white/10 pb-8">
            <h1 className="text-5xl md:text-7xl font-black italic tracking-tighter mb-4 text-transparent bg-clip-text bg-gradient-to-r from-[#FFD700] to-orange-600">
                TERMS OF CHAOS
            </h1>
            <p className="font-mono text-purple-400 uppercase tracking-widest text-xs">
                // LEGAL PROTOCOL V1.0 // READ BEFORE INTERACTING
            </p>
        </div>

        {/* CONTENT */}
        <div className="space-y-12 text-gray-300 leading-relaxed">
            
            <section className="bg-white/5 p-8 rounded-3xl border border-white/10">
                <div className="flex items-center gap-3 mb-4 text-[#FFD700]">
                    <AlertTriangle className="w-6 h-6" />
                    <h2 className="text-xl font-black italic uppercase">1. The Protocol is Experimental</h2>
                </div>
                <p className="font-mono text-sm opacity-80">
                    BaseDare is a decentralized social coordination protocol running on the Base L2 network. By interacting with the smart contracts, you acknowledge that the protocol is experimental code. Use at your own risk. Funds sent to dare pools are locked until settlement conditions are met via zKML (Zero-Knowledge Machine Learning) verification.
                </p>
            </section>

            <section>
                <h2 className="text-2xl font-black italic uppercase mb-4 text-white">2. Immutable Actions</h2>
                <p className="font-mono text-sm opacity-80 mb-4">
                    Blockchain transactions are irreversible. Once you pledge funds to a dare or initiate a bounty, you cannot "undo" the transaction. The blockchain does not care about your regret.
                </p>
            </section>

            <section>
                <h2 className="text-2xl font-black italic uppercase mb-4 text-white">3. Physical Safety & Liability</h2>
                <p className="font-mono text-sm opacity-80 mb-4">
                    BaseDare is a platform for digital dares. We strictly prohibit challenges that encourage self-harm, illegal acts, or physical danger. However, BaseDare (the developers) holds <strong>ZERO LIABILITY</strong> for the actions taken by streamers or users. If you dare someone to do a backflip and they fail, that is gravity's fault, not ours.
                </p>
            </section>

            <section>
                <h2 className="text-2xl font-black italic uppercase mb-4 text-white">4. Token Volatility</h2>
                <p className="font-mono text-sm opacity-80 mb-4">
                    The value of assets ($BD tokens or ETH) staked in dares may fluctuate wildly. 1 BD = 1 BD, but the market may disagree. Do not stake money you cannot afford to lose to the void.
                </p>
            </section>

            <div className="pt-12 border-t border-white/10 mt-12 flex items-center justify-between">
                <span className="font-mono text-xs text-gray-600 uppercase">Last Updated: BLOCK 9827341</span>
                <Gavel className="w-6 h-6 text-gray-700" />
            </div>

        </div>
      </div>
    </main>
  );
}
