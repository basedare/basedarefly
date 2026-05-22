'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
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
        <div className="mx-auto max-w-3xl">
          <Link
            href="/dashboard"
            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06)_0%,rgba(8,10,18,0.9)_100%)] px-5 py-2 text-[11px] font-mono uppercase tracking-[0.2em] text-white/65 shadow-[0_14px_26px_rgba(0,0,0,0.22),inset_0_1px_0_rgba(255,255,255,0.08),inset_0_-10px_14px_rgba(0,0,0,0.22)] transition hover:-translate-y-[1px] hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Dashboard
          </Link>

          <div className="relative mt-5 overflow-hidden rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06)_0%,rgba(9,7,19,0.94)_100%)] px-5 py-5 shadow-[0_22px_70px_rgba(0,0,0,0.44),inset_0_1px_0_rgba(255,255,255,0.1),inset_0_-14px_20px_rgba(0,0,0,0.24)] sm:px-6">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_14%_0%,rgba(192,132,252,0.15),transparent_34%),radial-gradient(circle_at_88%_100%,rgba(34,211,238,0.1),transparent_36%)]" />
            <div className="relative">
              <p className="text-[10px] font-mono uppercase tracking-[0.24em] text-[#f5c518]">Creator identity</p>
              <h1 className="mt-3 text-3xl font-black tracking-[-0.04em] text-white sm:text-5xl">
                Claim your @tag
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-white/62 sm:text-base">
                Connect your wallet, choose the public account people know, and send the tag for review.
              </p>
            </div>
          </div>

          <div className="mt-5">
            <Suspense fallback={null}>
              <ClaimTagModule />
            </Suspense>
          </div>
        </div>
      </div>
    </main>
  );
}
