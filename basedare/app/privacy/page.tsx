'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Eye, Lock, Database, MapPin, Camera, Trash2, Mail } from 'lucide-react';
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
                BaseDare is proof-heavy, not privacy-light. We collect real-world proof because that is how
                BaseDare works — so this page tells you exactly what becomes public, what stays private, and
                what cannot be deleted once published. BaseDare is operated through basedare.xyz. Formal
                operating entity details will be added when available.
              </p>
            </div>
        </div>

        {/* CONTENT */}
        <div className="space-y-8 text-gray-300 leading-relaxed">

            <section className={sectionClass}>
                <div className="flex items-center gap-3 mb-4 text-cyan-400">
                    <Database className="w-6 h-6" />
                    <h2 className="text-xl font-black italic uppercase">1. What We Collect</h2>
                </div>
                <div className={`${dentWellClass} font-mono text-sm opacity-80 space-y-3 px-5 py-4`}>
                    <p><strong>Location proof:</strong> QR + GPS check-ins — coordinates, distance from the venue, and timestamps. This is the core product, not a side effect.</p>
                    <p><strong>Proof media:</strong> the photos and videos you submit as proof, plus captions and tags.</p>
                    <p><strong>Wallet &amp; session data:</strong> your wallet address, signed session proofs, and your @tag if you claim one.</p>
                    <p><strong>Messages:</strong> venue room posts and direct messages you send are stored so they can be delivered.</p>
                    <p><strong>Contact &amp; intake data:</strong> if you submit a venue, partnership, or contact form, we keep the email and details you send.</p>
                    <p><strong>Analytics &amp; notifications:</strong> product analytics events, and a push token if you turn notifications on.</p>
                </div>
            </section>

            <section className={sectionClass}>
                <div className="flex items-center gap-3 mb-4 text-yellow-300">
                    <Eye className="w-6 h-6" />
                    <h2 className="text-xl font-black italic uppercase">2. What Becomes Public</h2>
                </div>
                <div className={`${dentWellClass} font-mono text-sm opacity-80 space-y-3 px-5 py-4`}>
                    <p>Your wallet address and every on-chain transaction are public on Base — that is how blockchains work. If you need stronger separation, use a fresh wallet.</p>
                    <p>Approved proof is public by design: it appears on the map, the venue page, the Board, and your proof receipt, together with your @tag and the venue.</p>
                    <p><strong>Crossed paths:</strong> when you and another verified human check in at the same venue in the same window, you each become visible to the other as having crossed paths. That co-presence signal is what unlocks messaging.</p>
                    <p>Approved local tips and meetups you host are shown publicly with the details you provided.</p>
                </div>
            </section>

            <section className={sectionClass}>
                <div className="flex items-center gap-3 mb-4 text-purple-300">
                    <Lock className="w-6 h-6" />
                    <h2 className="text-xl font-black italic uppercase">3. What Stays Private</h2>
                </div>
                <div className={`${dentWellClass} font-mono text-sm opacity-80 space-y-3 px-5 py-4`}>
                    <p>Direct messages are visible only to their participants. Rejected or pending proof is not public. Contact emails and business intakes go to the ops team, not the feed.</p>
                    <p>Raw GPS coordinates are used to verify presence; the public surface shows the venue, not your exact position. We do not track your location in the background — only at the moment you check in.</p>
                    <p>We do not sell your data, and we do not run third-party ad pixels.</p>
                </div>
            </section>

            <section className={sectionClass}>
                <div className="flex items-center gap-3 mb-4 text-emerald-300">
                    <MapPin className="w-6 h-6" />
                    <h2 className="text-xl font-black italic uppercase">4. Who Processes It</h2>
                </div>
                <div className={`${dentWellClass} px-5 py-4`}>
                    <p className="font-mono text-sm opacity-80">
                        BaseDare runs on infrastructure partners that process data on our behalf: <strong>Vercel</strong> (hosting),{' '}
                        <strong>Supabase</strong> (database), <strong>Pinata / IPFS</strong> (proof media storage),{' '}
                        <strong>PostHog</strong> (product analytics), <strong>Telegram</strong> (ops alerts and community rooms),{' '}
                        <strong>Coinbase / OnchainKit</strong> (wallet infrastructure), and <strong>Formspree</strong> (contact forms).
                        Each receives only what its job requires.
                    </p>
                </div>
            </section>

            <section className={`${sectionClass} border-red-500/20 bg-[linear-gradient(155deg,rgba(58,16,20,0.45),rgba(10,9,18,0.94))]`}>
                <div className="flex items-center gap-3 mb-4 text-red-300">
                    <Camera className="w-6 h-6" />
                    <h2 className="text-xl font-black italic uppercase">5. What Cannot Be Deleted</h2>
                </div>
                <div className={`${dentWellClass} font-mono text-sm opacity-80 space-y-3 px-5 py-4`}>
                    <p>On-chain transactions are permanent. Proof media published to IPFS is content-addressed and may persist on nodes we do not control, even after we unpin it. Receipts that people screenshot and share are out of anyone&apos;s hands.</p>
                    <p>Think before you submit proof: the unfakeable part is the product, and unfakeable cuts both ways.</p>
                </div>
            </section>

            <section className={sectionClass}>
                <div className="flex items-center gap-3 mb-4 text-cyan-300">
                    <Trash2 className="w-6 h-6" />
                    <h2 className="text-xl font-black italic uppercase">6. Your Requests</h2>
                </div>
                <div className={`${dentWellClass} px-5 py-4`}>
                    <p className="font-mono text-sm opacity-80">
                        You can ask us to delete or export the off-chain data we hold about you — profile, messages,
                        pending proofs, contact records, analytics identifiers — and we will honor it for everything
                        not permanently published (see section 5). BaseDare is for adults <strong>18+</strong>; if we
                        learn an account belongs to someone younger, we remove it.
                    </p>
                </div>
            </section>

            <section className={sectionClass}>
                <div className="flex items-center gap-3 mb-4 text-white">
                    <Mail className="w-6 h-6" />
                    <h2 className="text-xl font-black italic uppercase">7. Contact</h2>
                </div>
                <div className={`${dentWellClass} px-5 py-4`}>
                    <p className="font-mono text-sm opacity-80">
                        Privacy requests, deletion requests, questions: use the{' '}
                        <Link href="/contact" className="text-cyan-300 underline-offset-2 hover:underline">contact page</Link>.
                        A human reads it.
                    </p>
                </div>
            </section>

            <div className={`${dentWellClass} mt-10 px-5 py-4 flex items-center justify-between`}>
                <span className="font-mono text-xs text-gray-500 uppercase">Last Updated: July 8, 2026</span>
                <span className="font-mono text-xs text-gray-500 uppercase">v.2.0</span>
            </div>

        </div>
      </div>
    </main>
  );
}
