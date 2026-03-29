'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, AlertTriangle, ShieldAlert, Gavel } from 'lucide-react';
import LiquidBackground from '@/components/LiquidBackground';

export default function TermsOfChaos() {
    const raisedPanelClass =
        'rounded-[2rem] border border-white/10 bg-[linear-gradient(155deg,rgba(28,25,48,0.76),rgba(8,9,18,0.95))] shadow-[10px_10px_28px_rgba(0,0,0,0.5),-6px_-6px_18px_rgba(255,255,255,0.04)] backdrop-blur-xl';
    const dentWellClass =
        'bd-dent-surface bd-dent-surface--soft rounded-[1.6rem] border border-white/6 bg-white/[0.02]';
    const sectionClass = `${raisedPanelClass} p-6 md:p-8`;

    return (
        <main className="min-h-screen bg-transparent text-white selection:bg-purple-500/30 font-sans relative overflow-hidden">
            <LiquidBackground />

            <div className="relative z-10 max-w-4xl mx-auto px-6 py-24">
                {/* NAV BACK */}
                <Link href="/" className="inline-flex items-center gap-2 text-gray-500 hover:text-[#FFD700] transition-colors mb-12 font-mono text-sm uppercase tracking-widest group">
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    Return to Base
                </Link>

                {/* HEADER */}
                <div className={`${raisedPanelClass} mb-12 p-8 md:p-10`}>
                    <h1 className="text-5xl md:text-7xl font-black italic tracking-tighter mb-4 text-transparent bg-clip-text bg-gradient-to-r from-[#FFD700] to-orange-600">
                        TERMS OF CHAOS
                    </h1>
                    <div className={`${dentWellClass} px-5 py-4`}>
                        <p className="font-mono text-purple-300 uppercase tracking-widest text-xs mb-2">
                            {'// LEGAL PROTOCOL V1.0 // READ BEFORE INTERACTING'}
                        </p>
                        <p className="text-sm md:text-base text-white/70 leading-relaxed">
                            BaseDare runs on public rails, signed actions are final, and unsafe or illegal behavior is not welcome here.
                        </p>
                    </div>
                </div>

                {/* CONTENT */}
                <div className="space-y-8 text-gray-300 leading-relaxed">

                    <section className={sectionClass}>
                        <div className="flex items-center gap-3 mb-4 text-[#FFD700]">
                            <AlertTriangle className="w-6 h-6" />
                            <h2 className="text-xl font-black italic uppercase">1. The Protocol is Experimental</h2>
                        </div>
                        <div className={`${dentWellClass} px-5 py-4`}>
                            <p className="font-mono text-sm opacity-80">
                                BaseDare is experimental code running on Base. If you fund, claim, or verify through the protocol, you accept that the system is still early-stage software and should be used carefully. Bounty funds stay in escrow until completion conditions are verified.
                            </p>
                        </div>
                    </section>

                    <section className={sectionClass}>
                        <h2 className="text-2xl font-black italic uppercase mb-4 text-white">2. Immutable Actions</h2>
                        <div className={`${dentWellClass} px-5 py-4`}>
                            <p className="font-mono text-sm opacity-80">
                                Blockchain transactions are final. Once you fund a bounty or interact with the contract, there is no platform-side undo button. Double-check before you sign.
                            </p>
                        </div>
                    </section>

                    <section className={sectionClass}>
                        <h2 className="text-2xl font-black italic uppercase mb-4 text-white">3. Physical Safety & Liability</h2>
                        <div className={`${dentWellClass} px-5 py-4`}>
                            <p className="font-mono text-sm opacity-80">
                                BaseDare does not allow dares involving self-harm, illegal activity, or reckless physical danger. Users remain responsible for their own choices and conduct. If someone ignores common sense, that liability does not jump back onto the protocol.
                            </p>
                        </div>
                    </section>

                    <section className={sectionClass}>
                        <h2 className="text-2xl font-black italic uppercase mb-4 text-white">4. Token Volatility</h2>
                        <div className={`${dentWellClass} px-5 py-4`}>
                            <p className="font-mono text-sm opacity-80">
                                Crypto markets move. Even when a bounty is denominated in USDC, the broader environment around gas, wallets, and asset access can change. Only commit amounts you can afford to lock up.
                            </p>
                        </div>
                    </section>

                    <section className={`${sectionClass} border-red-500/20 bg-[linear-gradient(155deg,rgba(58,16,20,0.55),rgba(14,9,18,0.94))]`}>
                        <div className="flex items-center gap-3 mb-4 text-red-400">
                            <ShieldAlert className="w-6 h-6" />
                            <h2 className="text-xl font-black italic uppercase">5. Critical Legal Distinctions</h2>
                        </div>
                        <div className={`${dentWellClass} font-mono text-sm opacity-90 space-y-4 px-5 py-5`}>
                            <p><strong>NON-GAMBLING PLATFORM:</strong> SummitGrants (operating BaseDare) is NOT a gambling platform. Dares are conditional bounties/grants. There are no wagers, odds, or chance mechanisms.</p>
                            <p><strong>NON-CUSTODIAL NATURE:</strong> We do NOT custody user USDC. All funds are held in immutable smart contracts on the Base network. You retain ultimate control through the contract&apos;s fixed parameters.</p>
                            <p><strong>REFEREE WALLET LIMITATIONS:</strong> The platform&apos;s &apos;Referee wallet&apos; solely executes contract state changes to abstract gas costs. It holds NO user funds and cannot arbitrarily redirect bounties.</p>
                            <p><strong>REFUND POLICY:</strong> Refunds are strictly bound by the smart contract expiration logic. We cannot mathematically or manually refund or override the contract if conditions are not met. What happens on-chain, stays on-chain.</p>
                        </div>
                    </section>

                    <div className={`${dentWellClass} mt-10 px-5 py-4 flex items-center justify-between`}>
                        <span className="font-mono text-xs text-gray-500 uppercase">Last Updated: BLOCK 9827341</span>
                        <Gavel className="w-6 h-6 text-gray-700" />
                    </div>

                </div>
            </div>
        </main>
    );
}
