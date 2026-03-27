'use client';

import Link from 'next/link';
import { ArrowLeft, Share2, Shield, MapPin } from 'lucide-react';
import GradualBlurOverlay from '@/components/GradualBlurOverlay';
import LiquidBackground from '@/components/LiquidBackground';
import { ClaimTagModule } from '@/components/ClaimTagModule';

export default function ClaimTagPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-transparent text-white">
      <LiquidBackground />
      <div className="pointer-events-none fixed inset-0 z-10 hidden md:block">
        <GradualBlurOverlay />
      </div>

      <div className="relative z-10 container mx-auto px-4 pt-28 pb-24">
        <div className="mx-auto max-w-5xl">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06)_0%,rgba(8,10,18,0.9)_100%)] px-4 py-2 text-[11px] font-mono uppercase tracking-[0.2em] text-white/65 shadow-[0_14px_26px_rgba(0,0,0,0.22),inset_0_1px_0_rgba(255,255,255,0.08),inset_0_-10px_14px_rgba(0,0,0,0.22)] transition hover:-translate-y-[1px] hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Dashboard
          </Link>

          <div className="relative mt-6 overflow-hidden rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.07)_0%,rgba(255,255,255,0.02)_12%,rgba(9,7,19,0.95)_100%)] px-6 py-7 shadow-[0_26px_90px_rgba(0,0,0,0.52),0_0_34px_rgba(168,85,247,0.08),inset_0_1px_0_rgba(255,255,255,0.1),inset_0_-16px_22px_rgba(0,0,0,0.24)] sm:px-7">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_14%_0%,rgba(192,132,252,0.15),transparent_34%),radial-gradient(circle_at_88%_100%,rgba(34,211,238,0.1),transparent_36%)]" />
            <div className="relative">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#f5c518]/30 bg-[linear-gradient(180deg,rgba(250,204,21,0.14)_0%,rgba(250,204,21,0.05)_100%)] px-4 py-2 text-[10px] uppercase tracking-[0.24em] text-[#f5c518] shadow-[0_12px_22px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.12)]">
                <Shield className="h-3.5 w-3.5" />
                Connect Identity
              </div>

              <h1 className="mt-5 text-4xl font-black tracking-[-0.04em] text-white sm:text-6xl">
                Plug Your Real-World
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-[#f5c518] via-[#d8b4fe] to-cyan-300">
                  Creator Identity In
                </span>
              </h1>

              <p className="mt-3 max-w-3xl text-sm text-white/68 sm:text-base">
                Link your public creator handle to this wallet, submit proof, and anchor payouts and routing to one identity.
              </p>

              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                <div className="rounded-[20px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05)_0%,rgba(7,10,18,0.94)_100%)] px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),inset_0_-12px_18px_rgba(0,0,0,0.22)]">
                  <div className="flex items-center gap-2 text-cyan-200">
                    <Shield className="h-4 w-4" />
                    <p className="text-[10px] uppercase tracking-[0.24em] text-white/38">Identity</p>
                  </div>
                  <p className="mt-2 text-sm font-semibold text-white">Claim the right handle</p>
                  <p className="mt-2 text-xs leading-5 text-white/48">
                    Keep wallet, handle, and payouts aligned.
                  </p>
                </div>

                <div className="rounded-[20px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05)_0%,rgba(7,10,18,0.94)_100%)] px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),inset_0_-12px_18px_rgba(0,0,0,0.22)]">
                  <div className="flex items-center gap-2 text-[#f5c518]">
                    <Share2 className="h-4 w-4" />
                    <p className="text-[10px] uppercase tracking-[0.24em] text-white/38">Distribution</p>
                  </div>
                  <p className="mt-2 text-sm font-semibold text-white">Route wins cleanly</p>
                  <p className="mt-2 text-xs leading-5 text-white/48">
                    One anchored handle keeps proofs and links clean.
                  </p>
                </div>

                <div className="rounded-[20px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05)_0%,rgba(7,10,18,0.94)_100%)] px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),inset_0_-12px_18px_rgba(0,0,0,0.22)]">
                  <div className="flex items-center gap-2 text-purple-200">
                    <MapPin className="h-4 w-4" />
                    <p className="text-[10px] uppercase tracking-[0.24em] text-white/38">Your Map</p>
                  </div>
                  <p className="mt-2 text-sm font-semibold text-white">Start your map layer</p>
                  <p className="mt-2 text-xs leading-5 text-white/48">
                    Your creator footprint starts here.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-10">
            <ClaimTagModule />
          </div>
        </div>
      </div>
    </main>
  );
}
