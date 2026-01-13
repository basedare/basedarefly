'use client';

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from 'next/navigation';
import { useWallet } from '@/context/WalletContext';
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
  useWallet();

  return (
    <>
      {/* === NAVBAR (Z-50 to stay above everything) === */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-4 md:px-6 py-4 overflow-x-hidden">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 md:gap-4">
          
          {/* 1. LOGO (Image) */}
          <div className="flex items-center gap-2 z-50 flex-shrink-0">
            <Link 
              href="/" 
              className="relative group"
            >
              <img 
                src="/assets/basedarenew.png" 
                alt="BaseDare" 
                className="h-9 max-h-[36px] w-auto object-contain md:h-[80px] md:max-h-none drop-shadow-[0_0_20px_rgba(255,215,0,0.3)] hover:scale-105 transition-transform"
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
          <div className="flex items-center gap-4 z-50">
            
            {/* Desktop Connect Button (Hidden on Mobile) - Fallback if GlassSurface doesn't work */}
            <div className="hidden md:hidden">
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
            {/* Mobile Links */}
            <div className="flex flex-col gap-8">
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
                      className={`text-4xl font-black italic uppercase tracking-tighter ${
                        isActive
                          ? 'text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-cyan-500'
                          : 'text-transparent bg-clip-text bg-gradient-to-r from-gray-400 to-white hover:from-purple-500 hover:to-cyan-500'
                      }`}
                    >
                      {link.name}
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
