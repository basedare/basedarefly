'use client';

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, Wallet } from "lucide-react";
import Link from "next/link";
import { usePathname } from 'next/navigation';
import { useWallet } from '@/context/WalletContext';
import GlassSurface from './GlassSurface';

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
  const { isConnected, address, connect, disconnect } = useWallet();

  return (
    <>
      {/* === NAVBAR (Z-50 to stay above everything) === */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          
          {/* 1. LOGO (Responsive Colors) */}
          <div className="flex items-center gap-2 z-50">
            <Link 
              href="/" 
              // MOBILE & DESKTOP: BASE is always Yellow
              className="text-2xl font-black italic text-[#FFD700] tracking-tighter uppercase relative group"
            >
              BASE
              <span 
                // MOBILE & DESKTOP: DARE is always Purple
                className="text-purple-500"
              >
                DARE
              </span>
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
                {isConnected ? (
                  <button 
                    onClick={disconnect}
                    className="group relative pl-4 pr-5 py-2 bg-green-900/20 hover:bg-green-900/30 border border-green-500/50 rounded-full flex items-center gap-2 transition-all duration-300"
                  >
                    <div className="relative flex items-center justify-center">
                      <div className="w-1.5 h-1.5 bg-green-400 rounded-full z-10 shadow-[0_0_8px_rgba(34,197,94,1)]" />
                    </div>
                    <span className="text-[10px] font-black text-white tracking-[0.15em] uppercase">
                      {address?.slice(0, 6)}...{address?.slice(-4)}
                    </span>
                  </button>
                ) : (
                  <button 
                    onClick={connect}
                    className="group relative pl-4 pr-5 py-2 backdrop-blur-xl bg-black/10 hover:bg-black/20 border border-white/10 rounded-full flex items-center gap-2 transition-all duration-300"
                  >
                    <div className="relative flex items-center justify-center">
                      <div className="w-1.5 h-1.5 bg-yellow-400 rounded-full z-10 shadow-[0_0_8px_rgba(250,204,21,1)]" />
                      <div className="absolute w-full h-full bg-yellow-400 rounded-full animate-ping opacity-75" />
                    </div>
                    <span className="text-[10px] font-black text-white tracking-[0.15em] uppercase">
                      Connect
                    </span>
                  </button>
                )}
              </div>
            </GlassSurface>
          </div>

          {/* 3. RIGHT SIDE ACTIONS */}
          <div className="flex items-center gap-4 z-50">
            
            {/* Desktop Connect Button (Hidden on Mobile) - Fallback if GlassSurface doesn't work */}
            <button className="hidden md:hidden items-center gap-2 px-5 py-2 bg-[#FFD700] hover:bg-[#ffea00] text-black font-black text-xs rounded-full uppercase tracking-widest shadow-[0_0_20px_rgba(255,215,0,0.3)] hover:scale-105 transition-all">
              <span className="w-2 h-2 bg-black rounded-full animate-pulse" />
              Connect
            </button>

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
              {isConnected ? (
                <button 
                  onClick={() => {
                    disconnect();
                    setIsOpen(false);
                  }}
                  className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-green-900/30 border border-green-500/50 text-green-400 font-black text-lg rounded-xl uppercase tracking-widest"
                >
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                  {address?.slice(0, 6)}...{address?.slice(-4)}
                </button>
              ) : (
                <button 
                  onClick={() => {
                    connect();
                    setIsOpen(false);
                  }}
                  className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-[#FFD700] text-black font-black text-lg rounded-xl uppercase tracking-widest shadow-lg"
                >
                  <Wallet className="w-5 h-5" />
                  Connect Wallet
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
