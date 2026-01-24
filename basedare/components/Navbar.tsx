'use client';

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from 'next/navigation';
import { useWallet } from '@/context/WalletContext';
import { useView } from '@/app/context/ViewContext';
import GlassSurface from './GlassSurface';
import { IdentityButton } from './IdentityButton';

const NAV_LINKS = [
  { name: "HOME", href: "/" },
  { name: "CREATE", href: "/create" },
  { name: "VERIFY", href: "/verify" },
  { name: "DASHBOARD", href: "/dashboard" },
  { name: "ABOUT", href: "/about" },
];

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const { isControlMode } = useView();
  useWallet();

  return (
    <>
      {/* === NAVBAR (Z-50 to stay above everything) === */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-4 md:px-6 py-4 overflow-x-hidden">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 md:gap-4">
          
          {/* 1. LOGO (Image) - Noir filter in Control mode */}
          <div className="flex items-center gap-2 z-50 flex-shrink-0">
            <Link
              href="/"
              className="relative group"
            >
              <img
                src="/assets/BASEDAREGOO.png"
                alt="BaseDare"
                className={`h-10 max-h-[40px] w-auto object-contain md:h-[56px] md:max-h-none hover:scale-105 transition-all duration-500 ${
                  isControlMode
                    ? 'grayscale contrast-110 brightness-95 drop-shadow-[0_0_25px_rgba(100,100,100,0.4)]'
                    : 'drop-shadow-[0_0_25px_rgba(255,215,0,0.4)]'
                }`}
                style={{
                  filter: isControlMode ? 'grayscale(1) contrast(1.1) brightness(0.95)' : undefined,
                  WebkitFilter: isControlMode ? 'grayscale(1) contrast(1.1) brightness(0.95)' : undefined,
                }}
              />
            </Link>
          </div>

          {/* 2. DESKTOP MENU (Hidden on Mobile) - With GlassSurface */}
          <div className="hidden md:flex">
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
              className="w-max max-w-fit"
            >
              <div className="p-1.5 flex items-center gap-1">
                {NAV_LINKS.map((link) => {
                  const isActive = pathname === link.href;
                  return (
                    <Link 
                      key={link.name} 
                      href={link.href}
                      className="relative px-5 py-2.5 rounded-full text-[10px] font-black tracking-[0.2em] text-gray-400 hover:text-white transition-colors z-10"
                    >
                      {isActive && (
                        <motion.div
                          layoutId="nav-pill"
                          className="absolute inset-0 bg-white/10 rounded-full shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)]"
                          transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                        />
                      )}
                      <span className="relative z-10 mix-blend-overlay">{link.name}</span>
                    </Link>
                  );
                })}

                {/* DIVIDER */}
                <div className="w-px h-5 bg-white/10 mx-3" />

                {/* CONNECT BUTTON */}
                <IdentityButton />
              </div>
            </GlassSurface>
          </div>

          {/* 3. RIGHT SIDE ACTIONS */}
          <div className="flex items-center gap-2 md:gap-4 z-50">

            {/* Mobile Connect Button - Visible on mobile, hidden on desktop (desktop has it in GlassSurface) */}
            <div className="md:hidden">
               <IdentityButton />
            </div>

            {/* === MOBILE HAMBURGER (Visible ONLY on Mobile via 'md:hidden') === */}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="md:hidden w-10 h-10 flex items-center justify-center bg-black/50 backdrop-blur-md border border-white/10 rounded-full text-white active:scale-90 transition-transform"
            >
              {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </nav>

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
                      <div className={`relative px-5 py-3 text-3xl font-black italic uppercase tracking-tight ${
                        isActive ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'
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

            {/* Mobile Connect Button */}
            <div className="mt-auto mb-12">
               <IdentityButton />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
