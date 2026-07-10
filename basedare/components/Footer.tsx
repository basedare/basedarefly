'use client';

import React from 'react';
import { Twitter, Shield, ShieldCheck, FileText, HelpCircle, Info, MessageSquare, Lightbulb } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useView } from '@/app/context/ViewContext';

export default function Footer() {
  const { isControlMode } = useView();

  return (
    <footer id="site-footer" className="w-full relative z-20 overflow-hidden">
      {/* APPLE LIQUID GLASS BACKDROP */}
      <div className="absolute inset-0">
        {/* Gradient base */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/60 to-transparent" />
        {/* Subtle purple glow at bottom */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-purple-500/10 blur-[100px] rounded-full" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-10 md:py-16">
        {/* MAIN GLASS CARD - Apple Liquid Glass */}
        <div
          className="apple-liquid-glass p-6 sm:p-8 md:p-12 rounded-2xl md:rounded-3xl"
          style={{
            background: 'rgba(10, 10, 15, 0.5)',
            boxShadow: `
              0 8px 32px rgba(0,0,0,0.4),
              inset 0 1px 0 rgba(255,255,255,0.1),
              inset 0 -1px 0 rgba(0,0,0,0.3)
            `,
          }}
        >
          {/* TOP HIGHLIGHT LINE - Signature Apple glass edge */}
          <div
            className="absolute top-0 left-4 right-4 md:left-8 md:right-8 h-[1px] rounded-full"
            style={{
              background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.2) 20%, rgba(255,255,255,0.3) 50%, rgba(255,255,255,0.2) 80%, transparent 100%)',
            }}
          />

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 md:gap-12 text-center md:text-left">

            {/* COL 1: LOGO + IDENTITY */}
            <div className="col-span-1 md:col-span-2 flex flex-col items-center md:items-start">
              {/* BASEDARE LOGO - Centered on mobile */}
              <div className="mb-4 md:mb-6 flex flex-col items-center md:items-start">
                <Image
                  src="/assets/BASEDAREGOO.webp"
                  alt="BaseDare"
                  width={620}
                  height={161}
                  className={`h-8 sm:h-10 md:h-14 w-auto mb-3 md:mb-4 object-contain mx-auto md:mx-0 transition-all duration-500 ${
                    isControlMode
                      ? 'drop-shadow-[0_0_20px_rgba(100,100,100,0.4)]'
                      : 'drop-shadow-[0_0_20px_rgba(255,215,0,0.4)]'
                  }`}
                  style={{
                    filter: isControlMode ? 'grayscale(1) contrast(1.1) brightness(0.95)' : undefined,
                    WebkitFilter: isControlMode ? 'grayscale(1) contrast(1.1) brightness(0.95)' : undefined,
                  }}
                />
                <p className="text-[11px] sm:text-xs text-gray-500 font-mono leading-relaxed max-w-sm text-center md:text-left">
                  Discover places. Join challenges. Meet people.
                  <br />
                  <span className="text-purple-500/60">Play for fun, build local reputation, or earn a reward.</span>
                </p>
              </div>

              {/* WAITLIST BUTTON - Touch optimized */}
              <Link
                href="/map"
                className="inline-flex items-center gap-2 px-5 sm:px-6 py-2.5 sm:py-3 bg-white text-black font-black italic uppercase rounded-xl hover:bg-purple-400 active:bg-purple-500 transition-all transform hover:scale-105 active:scale-[0.98] tracking-tighter text-xs sm:text-sm touch-manipulation"
                style={{
                  boxShadow: '0 0 20px rgba(255,255,255,0.15), 0 4px 12px rgba(0,0,0,0.3)',
                }}
              >
                <span>Open the Map</span>
                <span className="text-purple-600">→</span>
              </Link>
            </div>

            {/* COL 2: CONNECT */}
            <div className="flex flex-col items-center md:items-start">
              <h3 className="text-[10px] sm:text-xs font-bold text-white uppercase tracking-widest mb-4 md:mb-6 flex items-center gap-2">
                <span className="hidden md:block w-0.5 h-3 bg-purple-500 rounded-full" />
                <span className="md:hidden">—</span>
                Connect
                <span className="md:hidden">—</span>
              </h3>
              <a
                href="https://x.com/basedare_xyz"
                target="_blank"
                rel="noopener noreferrer"
                className="group flex min-h-10 items-center gap-3 rounded-xl px-2 text-gray-400 transition-colors hover:text-[#1DA1F2] active:text-[#1DA1F2] touch-manipulation"
              >
                <div className="w-9 h-9 sm:w-8 sm:h-8 rounded-full bg-white/5 flex items-center justify-center border border-white/10 group-hover:border-[#1DA1F2] group-active:border-[#1DA1F2] transition-colors">
                  <Twitter className="w-4 h-4" />
                </div>
                <span className="text-xs font-mono uppercase tracking-wider">Twitter / X</span>
              </a>
            </div>

            {/* COL 3: LEGAL */}
            <div className="flex flex-col items-center md:items-start">
              <h3 className="text-[10px] sm:text-xs font-bold text-white uppercase tracking-widest mb-4 md:mb-6 flex items-center gap-2">
                <span className="hidden md:block w-0.5 h-3 bg-[#FFD700] rounded-full" />
                <span className="md:hidden">—</span>
                Legal
                <span className="md:hidden">—</span>
              </h3>
              <ul className="space-y-3 sm:space-y-4">
                <li>
                  <Link href="/faq" className="flex min-h-10 items-center justify-center gap-2 rounded-xl px-2 text-xs font-mono uppercase tracking-wider text-gray-500 transition-colors hover:text-purple-400 active:text-purple-400 md:justify-start group touch-manipulation">
                    <HelpCircle className="w-3.5 h-3.5 sm:w-3 sm:h-3 group-hover:text-purple-400" />
                    FAQ
                  </Link>
                </li>
                <li>
                  <Link href="/how-it-works" className="flex min-h-10 items-center justify-center gap-2 rounded-xl px-2 text-xs font-mono uppercase tracking-wider text-gray-500 transition-colors hover:text-amber-400 active:text-amber-400 md:justify-start group touch-manipulation">
                    <Lightbulb className="w-3.5 h-3.5 sm:w-3 sm:h-3 group-hover:text-amber-400" />
                    How It Works
                  </Link>
                </li>
                <li>
                  <Link href="/verify" className="flex min-h-10 items-center justify-center gap-2 rounded-xl px-2 text-xs font-mono uppercase tracking-wider text-gray-500 transition-colors hover:text-emerald-400 active:text-emerald-400 md:justify-start group touch-manipulation">
                    <ShieldCheck className="w-3.5 h-3.5 sm:w-3 sm:h-3 group-hover:text-emerald-400" />
                    Verify Proof
                  </Link>
                </li>
                <li>
                  <Link href="/about" className="flex min-h-10 items-center justify-center gap-2 rounded-xl px-2 text-xs font-mono uppercase tracking-wider text-gray-500 transition-colors hover:text-emerald-400 active:text-emerald-400 md:justify-start group touch-manipulation">
                    <Info className="w-3.5 h-3.5 sm:w-3 sm:h-3 group-hover:text-emerald-400" />
                    About
                  </Link>
                </li>
                <li>
                  <Link href="/terms" className="flex min-h-10 items-center justify-center gap-2 rounded-xl px-2 text-xs font-mono uppercase tracking-wider text-gray-500 transition-colors hover:text-[#FFD700] active:text-[#FFD700] md:justify-start group touch-manipulation">
                    <FileText className="w-3.5 h-3.5 sm:w-3 sm:h-3 group-hover:text-[#FFD700]" />
                    Terms of Chaos
                  </Link>
                </li>
                <li>
                  <Link href="/privacy" className="flex min-h-10 items-center justify-center gap-2 rounded-xl px-2 text-xs font-mono uppercase tracking-wider text-gray-500 transition-colors hover:text-cyan-400 active:text-cyan-400 md:justify-start group touch-manipulation">
                    <Shield className="w-3.5 h-3.5 sm:w-3 sm:h-3 group-hover:text-cyan-400" />
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link href="/contact" className="flex min-h-10 items-center justify-center gap-2 rounded-xl px-2 text-xs font-mono uppercase tracking-wider text-gray-500 transition-colors hover:text-purple-300 active:text-purple-300 md:justify-start group touch-manipulation">
                    <MessageSquare className="w-3.5 h-3.5 sm:w-3 sm:h-3 group-hover:text-purple-300" />
                    Contact
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          {/* COPYRIGHT — COMPACT ON MOBILE */}
          <div className="mt-10 md:mt-16 pt-6 md:pt-8 border-t border-white/5 text-center">
            <p className="text-gray-600 text-[11px] sm:text-sm">
              © 2026 BaseDare
            </p>

            {/* Quick links row */}
            <div className="mt-4 md:mt-6 flex flex-wrap justify-center gap-1 sm:gap-5 text-gray-500 text-[10px] sm:text-xs">
              <Link href="/terms" className="inline-flex min-h-9 items-center rounded-lg px-2 transition hover:text-yellow-400 active:text-yellow-400 touch-manipulation">
                Terms
              </Link>
              <span className="text-white/20 hidden sm:inline">•</span>
              <Link href="/privacy" className="inline-flex min-h-9 items-center rounded-lg px-2 transition hover:text-yellow-400 active:text-yellow-400 touch-manipulation">
                Privacy
              </Link>
              <span className="text-white/20 hidden sm:inline">•</span>
              <Link href="/how-it-works" className="inline-flex min-h-9 items-center rounded-lg px-2 transition hover:text-yellow-400 active:text-yellow-400 touch-manipulation">
                How It Works
              </Link>
              <span className="text-white/20 hidden sm:inline">•</span>
              <Link href="/contact" className="inline-flex min-h-9 items-center rounded-lg px-2 transition hover:text-yellow-400 active:text-yellow-400 touch-manipulation">
                Contact
              </Link>
              <span className="text-white/20 hidden sm:inline">•</span>
              <a
                href="https://x.com/basedare_xyz"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-9 items-center rounded-lg px-2 transition hover:text-[#1DA1F2] active:text-[#1DA1F2] touch-manipulation"
              >
                @basedare
              </a>
            </div>

            {/* Built on Base badge */}
            <div className="mt-4 md:mt-6">
              <span className="text-[10px] text-gray-700 font-mono">
                Built on Base ⚡
              </span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
