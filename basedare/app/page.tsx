'use client';

import React, { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

// Components
import Navbar from "@/components/Navbar";
import ViewToggle from "@/components/ViewToggle";
import LivePotBubble from "@/components/LivePotBubble";
import GlitchText from "@/components/GlitchText";
import { LiquidInput } from "@/components/LiquidInput";
import InitProtocolButton from "@/components/InitProtocolButton";
import PeeBearConveyor from "@/components/PeeBearConveyor";
import BlackHoleAura from "@/components/BlackHoleAura"; 
import ActiveTargets from "@/components/ActiveTargets";
import ProtocolSteps from "@/components/ProtocolSteps";
import TrustBadge from "@/components/TrustBadge";
import HallOfFame from "@/components/HallOfFame";
import HallOfShame from "@/components/HallOfShame";
import BusinessDossier from "@/components/BusinessDossier";
import LiquidBackground from "@/components/LiquidBackground";

export default function Home() {
  const [view, setView] = useState<'FAN' | 'BUSINESS'>('FAN');

  return (
    <main className="flex flex-col items-center min-h-screen bg-black font-sans selection:bg-purple-500/30 overflow-x-hidden relative">
      
      {/* === THE NEW BACKGROUND LAYER === */}
      <LiquidBackground />

      {/* === YOUR EXISTING GALAXY & CONTENT (Stays exactly the same) === */}
      <Navbar />
      <ViewToggle view={view} setView={setView} />
      <LivePotBubble /> {/* Preserved */}

      <AnimatePresence mode="wait">
        
        {/* === VIEW 1: CHAOS (FANS) === */}
        {view === 'FAN' && (
          <motion.div 
            key="fan-view"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="w-full flex flex-col items-center"
          >
            {/* 1. HERO SECTION */}
            <section className="w-full flex flex-col items-center pt-32 pb-12 relative z-10">
              
              {/* GRAVITY WELL */}
              <div className="relative w-full flex justify-center items-center h-[350px] mb-4">
                <div className="absolute z-0 scale-125 opacity-100 mix-blend-screen"><BlackHoleAura size={800} /></div>
                <motion.div animate={{ y: [0, -15, 0] }} transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }} className="relative z-20 w-48 h-48 bg-black rounded-full border-2 border-purple-500/50 flex items-center justify-center shadow-[0_0_50px_#A855F7] overflow-hidden backdrop-blur-sm">
                  <span className="text-7xl">🐻</span>
                </motion.div>
                <div className="absolute top-[60%] left-0 right-0 z-10 opacity-90 pointer-events-none"><PeeBearConveyor /></div>
              </div>

              {/* TITLE */}
              <div className="flex flex-col items-center justify-center -space-y-4 mb-12 relative z-30">
                <GlitchText glowColor="#FFD700" className="text-yellow-400 text-6xl md:text-9xl font-black italic tracking-tighter">CONTROL</GlitchText>
                <GlitchText glowColor="#A855F7" className="text-purple-500 text-4xl md:text-8xl font-black italic tracking-tighter">THE STREAM</GlitchText>
              </div>

              {/* INPUTS */}
              <div className="w-full max-w-4xl px-6 z-40 relative">
                <div className="flex flex-col md:flex-row items-center justify-center gap-6">
                  <div className="w-full md:flex-[2]"><LiquidInput placeholder="I dare $xQc to..." prefix="$" className="text-xl" /></div>
                  <div className="w-full md:w-auto"><InitProtocolButton className="w-full md:w-auto" /></div>
                </div>
                <p className="text-[10px] text-gray-500 text-center font-mono mt-6 tracking-[0.2em] uppercase">
                  USE <span className="text-[#FFD700] font-bold">$BASETAGS</span> FOR INSTANT ROUTING
                </p>
              </div>
            </section>

            {/* 2. ACTIVE TARGETS */}
            <ActiveTargets />

            {/* 3. PROTOCOL */}
            <ProtocolSteps />
            <TrustBadge />

            {/* 4. THE VAULTS */}
            <HallOfFame />
            <HallOfShame />
            
          </motion.div>
        )}

        {/* === VIEW 2: CONTROL (BUSINESS) === */}
        {view === 'BUSINESS' && (
          <motion.div 
            key="business-view"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className="w-full min-h-screen flex flex-col items-center justify-center pt-24 pb-24 bg-[#050505]"
          >
            <div className="mb-12 text-center">
              <div className="text-xs font-mono text-purple-500 tracking-widest uppercase mb-4">[ ACCESS_LEVEL: BRAND_MANAGER ]</div>
              <h2 className="text-4xl md:text-6xl font-black italic text-white uppercase tracking-tighter">PRODUCER CONSOLE</h2>
            </div>
            <BusinessDossier />
          </motion.div>
        )}

      </AnimatePresence>

      <footer className="w-full py-12 border-t border-white/5 bg-black text-center relative z-50">
        <p className="text-gray-600 font-mono text-xs uppercase tracking-widest">BaseDare Protocol © 2025 • Verified Chaos on Base</p>
      </footer>
    </main>
  );
}
