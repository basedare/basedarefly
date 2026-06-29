'use client';

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, MessageCircle, Sparkles, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from 'next/navigation';
import { useView } from '@/app/context/ViewContext';
import GlassSurface from './GlassSurface';
import { IdentityButton } from './IdentityButton';
import { DeferredNotificationBell } from './ui/DeferredNotificationBell';
import { DeferredGlobalSearch } from './ui/DeferredGlobalSearch';
import BackgroundToneToggle from './BackgroundToneToggle';

// Primary nav = the daily-action surfaces for the three loops.
// Learn (/how-it-works) and Verify (/verify) live in the footer; Control is
// reached via the FAN/CONTROL toggle.
const NAV_LINKS = [
  // Label-only clarity pass: routes unchanged for stability.
  { name: "HOME", href: "/" },
  { name: "MARKETS", href: "/markets" },
  { name: "MAP", href: "/map" },
  { name: "FUND", href: "/create" },
  { name: "PASSPORT", href: "/dashboard" },
  { name: "EARN", href: "/creators" },
];

const NAV_LINK_PREFETCH = false;

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const { isControlMode } = useView();
  const isMapRoute = pathname === '/map' || pathname?.startsWith('/map/');

  const desktopNavItems = (
    <div className="flex min-w-0 items-center gap-1 p-1.5">
      {NAV_LINKS.map((link) => {
        const isActive = pathname === link.href;
        return (
          <Link
            key={link.name}
            href={link.href}
            prefetch={NAV_LINK_PREFETCH}
            className="relative z-10 rounded-full px-3 py-2.5 text-[9px] font-black tracking-[0.14em] text-gray-400 transition-colors hover:text-white lg:px-4 lg:text-[10px] lg:tracking-[0.18em] xl:px-5 xl:tracking-[0.2em]"
          >
            {isActive && (
              <motion.div
                layoutId="nav-pill"
                className="absolute inset-0 rounded-full bg-white/10 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)]"
                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
              />
            )}
            <span className={`relative z-10 ${isMapRoute ? 'text-white/82' : 'mix-blend-overlay'}`}>
              {link.name}
            </span>
          </Link>
        );
      })}

      {/* DIVIDER */}
      <div className="mx-3 h-5 w-px bg-white/10" />

      {/* NOTIFICATIONS & CONNECT */}
      <Link
        href="/chat"
        prefetch={NAV_LINK_PREFETCH}
        aria-label="Open messenger"
        title="Messenger"
        className={`relative z-10 inline-flex h-9 w-9 items-center justify-center rounded-full border transition-colors ${
          pathname?.startsWith('/chat')
            ? 'border-cyan-300/40 bg-cyan-400/15 text-cyan-100 shadow-[0_0_18px_rgba(34,211,238,0.16)]'
            : 'border-white/10 bg-white/[0.04] text-white/70 hover:border-cyan-300/30 hover:bg-cyan-400/[0.1] hover:text-white'
        }`}
      >
        <MessageCircle className="h-4 w-4" />
      </Link>

      {/* Creator Sign Up — distinct gold CTA (not a nav tab); shown when there's room */}
      <Link
        href="/creators/signup"
        prefetch={NAV_LINK_PREFETCH}
        className="relative z-10 ml-1 inline-flex min-h-9 items-center gap-1.5 whitespace-nowrap rounded-full border border-yellow-300/35 bg-yellow-300/[0.14] px-4 text-[10px] font-black uppercase tracking-[0.16em] text-yellow-100 transition hover:bg-yellow-300/[0.22] hover:text-white"
      >
        <Sparkles className="h-3.5 w-3.5" />
        Sign Up
      </Link>
    </div>
  );

  return (
    <>
      {/* === NAVBAR (Z-50 to stay above everything) === */}
      <nav className="fixed top-0 left-0 right-0 z-50 overflow-x-hidden px-4 py-4 md:px-6">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-full border-b border-white/[0.035] bg-[linear-gradient(180deg,rgba(4,5,12,0.88)_0%,rgba(4,5,12,0.58)_58%,rgba(4,5,12,0)_100%)] backdrop-blur-[2px]"
          aria-hidden="true"
        />
        <div className="relative z-10 mx-auto flex max-w-[92rem] items-center justify-between gap-2 md:gap-4">

          {/* 1. LOGO */}
          <div className="flex items-center gap-3 z-50 flex-shrink-0">
            <Link
              href="/"
              prefetch={NAV_LINK_PREFETCH}
              aria-label="Open BaseDare home"
              className="relative group inline-flex h-10 w-[132px] items-center justify-center md:h-14 md:w-[224px]"
            >
              {/* Very subtle ambient glow */}
              <div className="absolute inset-1 rounded-lg bg-purple-500/10 blur-xl opacity-0 transition-opacity duration-500 group-hover:opacity-100 md:inset-2" />

              <Image
                src="/assets/BASEDAREGOO.webp"
                alt="BaseDare"
                width={620}
                height={161}
                priority
                sizes="(min-width: 768px) 224px, 132px"
                className={`relative h-8 w-auto max-w-full object-contain transition-all duration-300 hover:scale-105 md:h-[56px] ${isControlMode
                  ? 'grayscale contrast-110 brightness-95'
                  : ''
                  }`}
                style={{
                  filter: isControlMode
                    ? 'grayscale(1) contrast(1.1) brightness(0.95) drop-shadow(0 0 8px rgba(139,92,246,0.3))'
                    : 'drop-shadow(0 0 8px rgba(139,92,246,0.25))',
                  WebkitFilter: isControlMode
                    ? 'grayscale(1) contrast(1.1) brightness(0.95) drop-shadow(0 0 8px rgba(139,92,246,0.3))'
                    : 'drop-shadow(0 0 8px rgba(139,92,246,0.25))',
                }}
              />
            </Link>
          </div>

          {/* 2. DESKTOP MENU (Hidden on Mobile) - With GlassSurface */}
          <div className="hidden min-w-0 flex-1 justify-center md:flex">
            {isMapRoute ? (
              <div className="max-w-full overflow-hidden rounded-full border border-white/[0.08] bg-[linear-gradient(180deg,rgba(12,15,28,0.94)_0%,rgba(5,7,16,0.9)_100%)] shadow-[0_18px_54px_rgba(0,0,0,0.42),0_0_0_1px_rgba(120,150,255,0.05),inset_0_1px_0_rgba(255,255,255,0.1)]">
                {desktopNavItems}
              </div>
            ) : (
              <GlassSurface
                width="auto"
                height="auto"
                borderRadius={999}
                borderWidth={0.07}
                brightness={50}
                opacity={0.93}
                blur={11}
                backgroundOpacity={0.02}
                saturation={1.8}
                distortionScale={-180}
                className="max-w-full"
              >
                {desktopNavItems}
              </GlassSurface>
            )}
          </div>

          {/* 3. RIGHT SIDE ACTIONS */}
          <div className="flex items-center gap-2 md:gap-3 z-50">
            <div className="order-1 hidden md:flex">
              <BackgroundToneToggle />
            </div>
            <Link
              href="/chat"
              prefetch={NAV_LINK_PREFETCH}
              aria-label="Open messenger"
              title="Messenger"
              className={`order-2 flex h-10 w-10 items-center justify-center rounded-full border backdrop-blur-md transition-colors md:hidden ${
                pathname?.startsWith('/chat')
                  ? 'border-cyan-300/40 bg-cyan-400/15 text-cyan-100'
                  : 'border-white/10 bg-black/50 text-white/75 hover:border-cyan-300/30 hover:bg-cyan-400/[0.1]'
              }`}
            >
              <MessageCircle className="h-4 w-4" />
            </Link>
            <div className="order-3">
              <DeferredNotificationBell />
            </div>
            <div className="order-4 w-[108px] min-w-0 sm:w-[140px] md:w-auto">
              <IdentityButton />
            </div>

            {/* === MOBILE HAMBURGER (Visible ONLY on Mobile via 'md:hidden') === */}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="order-5 md:hidden w-10 h-10 flex items-center justify-center bg-black/50 backdrop-blur-md border border-white/10 rounded-full text-white active:scale-90 transition-transform"
            >
              {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </nav>

      {/* ============================================
          DESKTOP GLOBAL SEARCH
          Fixed to the left, parallel to the ViewToggle (which is top-24 right-6)
          ============================================ */}
      <div className="hidden md:block fixed top-24 left-6 z-[90]">
        <DeferredGlobalSearch isDesktopApp />
      </div>

      {/* === MOBILE MENU OVERLAY === */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed inset-0 z-40 bg-[#050505]/95 backdrop-blur-xl md:hidden flex flex-col pt-32 px-6"
          >
            {/* Mobile Links - Liquid Metal Chrome */}
            <div className="flex flex-col gap-4">
              {NAV_LINKS.map((link, i) => {
                const isActive = pathname === link.href;
                return (
                  <motion.div
                    key={link.name}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <Link
                      href={link.href}
                      prefetch={NAV_LINK_PREFETCH}
                      onClick={() => setIsOpen(false)}
                      className="relative block rounded-xl overflow-hidden active:scale-[0.98] transition-transform"
                    >
                      {/* Active state - Liquid Metal Chrome */}
                      {isActive && (
                        <>
                          {/* Chrome base gradient */}
                          <div
                            className="absolute inset-0"
                            style={{
                              background: 'linear-gradient(135deg, #2a2a30 0%, #1a1a1e 40%, #252528 70%, #1e1e22 100%)',
                            }}
                          />
                          {/* Top shine line */}
                          <div
                            className="absolute inset-x-0 top-0 h-[1px]"
                            style={{
                              background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.2) 50%, transparent 100%)',
                            }}
                          />
                          {/* Inner glow */}
                          <div
                            className="absolute inset-0"
                            style={{
                              background: 'linear-gradient(180deg, rgba(255,255,255,0.08) 0%, transparent 50%)',
                            }}
                          />
                        </>
                      )}

                      {/* Link content */}
                      <div className={`relative px-5 py-3 text-3xl font-black italic uppercase tracking-tight ${isActive ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'
                        }`}>
                        {link.name}
                        {/* Active indicator bar */}
                        {isActive && (
                          <div className="absolute right-4 top-1/2 -translate-y-1/2 w-1 h-6 rounded-full bg-gradient-to-b from-white/60 to-white/20" />
                        )}
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </div>

            {/* Creator Sign Up — prominent mobile CTA */}
            <Link
              href="/creators/signup"
              prefetch={NAV_LINK_PREFETCH}
              onClick={() => setIsOpen(false)}
              className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-yellow-300/35 bg-yellow-300 px-5 text-sm font-black uppercase tracking-[0.16em] text-black transition active:scale-[0.98]"
            >
              <Sparkles className="h-4 w-4" />
              Creator Sign Up
            </Link>

            {/* Mobile Search Button (Under FAQ) */}
            <div className="mt-6 w-full flex justify-center">
              <DeferredGlobalSearch />
            </div>

            {/* Mobile Connect Button */}
            <div className="mt-8 mb-12">
              <IdentityButton />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
