'use client';

import React, { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";

// === CORE COMPONENTS ===
import ViewToggle from "@/components/ViewToggle";
import LivePotBubble from "@/components/LivePotBubble";
import GlitchText from "@/components/GlitchText";
import { LiquidInput } from "@/components/LiquidInput";
import InitProtocolButton from "@/components/InitProtocolButton";
import LiquidBackground from "@/components/LiquidBackground";
import GradualBlurOverlay from "@/components/GradualBlurOverlay";
import PeeBearConveyor from "@/components/PeeBearConveyor"; 

// === FEATURE COMPONENTS ===
import HeroEllipticalStream from "@/components/HeroEllipticalStream";
import TruthProtocol from "@/components/TruthProtocol"; 
import LiveBounties from "@/components/LiveBounties";   
import HallOfShame from "@/components/HallOfShame"; 
import BusinessDossier from "@/components/BusinessDossier"; 
import LiveChatOverlay from "@/components/LiveChatOverlay";
import HowItWorks from "@/components/HowItWorks";
import MintAnnouncement from "@/components/MintAnnouncement";

interface Dare {
  id: string;
  description: string;
  stake_amount: number;
  streamer_name?: string;
  status: string;
  video_url?: string;
  expiry_timer?: string;
  image_url?: string;
}

export default function Home() {
  const [view, setView] = useState<'FAN' | 'BUSINESS'>('FAN');
  const [dares, setDares] = useState<Dare[]>([]);
  const [activeChatTarget, setActiveChatTarget] = useState<any>(null);

  useEffect(() => {
    const fetchDares = async () => {
      try {
        const response = await fetch('/api/dares');
        if (response.ok) {
          const data = await response.json();
          setDares(data);
        }
      } catch (error) {
        console.error('Failed to fetch dares:', error);
      }
    };
    fetchDares();
  }, []);

  return (
    <main className="flex flex-col items-center min-h-screen bg-transparent font-sans selection:bg-purple-500/30 overflow-x-hidden relative">
      
      {/* GLOBAL BACKGROUNDS */}
      <LiquidBackground />
      <div className="fixed inset-0 z-10 pointer-events-none"><GradualBlurOverlay /></div>
      
      <ViewToggle view={view} setView={setView} />
      <LivePotBubble />

      <AnimatePresence mode="wait">
        
        {view === 'FAN' && (
          <motion.div 
            key="fan-view"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="w-full flex flex-col items-center"
          >
            {/* 1. HERO SECTION (Relative - Scrolls naturally) */}
            <div className="w-full flex flex-col items-center relative z-20">
              
              {/* ORBIT SYSTEM */}
              <div className="w-full relative">
                <div className="hidden md:block">
                  <HeroEllipticalStream 
                    dares={dares} 
                    onCardClick={(dare) => setActiveChatTarget(dare)} 
                  />
                </div>
                <div className="block md:hidden pt-32 pb-12">
                  <PeeBearConveyor dares={dares} />
                </div>
              </div>

              {/* TITLE */}
              <div className="flex flex-col items-center justify-center -space-y-4 mb-12 mt-[-50px] relative z-30">
                <GlitchText glowColor="#FFD700" className="text-yellow-400 text-6xl md:text-9xl font-black italic tracking-tighter">CONTROL</GlitchText>
                <GlitchText glowColor="#A855F7" className="text-purple-500 text-4xl md:text-8xl font-black italic tracking-tighter">THE STREAM</GlitchText>
              </div>

              {/* INPUTS */}
              <div className="w-full max-w-4xl px-6 mb-24 relative z-30">
                <div className="flex flex-col md:flex-row items-center justify-center gap-6">
                  <div className="w-full md:flex-[2]">
                    <LiquidInput placeholder="I dare @xQc to..." prefix="$" className="text-xl" />
                  </div>
                  <div className="w-full md:w-auto">
                    <InitProtocolButton className="w-full md:w-auto" />
                  </div>
                </div>
                <p className="text-[10px] text-gray-500 text-center font-mono mt-6 tracking-[0.2em] uppercase">
                  USE <span className="text-[#FFD700] font-bold">$BASETAGS</span> FOR INSTANT ROUTING
                </p>
              </div>

              {/* 2. HOW IT WORKS (System Protocol) */}
              <HowItWorks />

              {/* 3. MINT ANNOUNCEMENT */}
              <MintAnnouncement />

              {/* 4. LIVE BOUNTIES (MOLTEN CARDS) */}
              <LiveBounties />

              {/* 5. TRUTH PROTOCOL (SCANNER) */}
              <TruthProtocol />

              {/* 6. HALL OF SHAME */}
              <div className="w-full border-t border-white/5 bg-black/50">
                  <HallOfShame />
              </div>

            </div>
            
          </motion.div>
        )}

        {/* === VIEW 2: CONTROL (BUSINESS) === */}
        {/* THIS IS WHERE THE SALES MACHINE GOES - UNDER THE SWITCH */}
        {view === 'BUSINESS' && (
          <motion.div 
            key="business-view"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className="w-full min-h-screen flex flex-col items-center justify-center pt-32 pb-24 backdrop-blur-xl bg-black/10 border border-white/10"
          >
            {/* Replaced empty content with BusinessDossier */}
            <BusinessDossier />
          </motion.div>
        )}

      </AnimatePresence>

      {/* CHAT OVERLAY */}
      <AnimatePresence>
        {activeChatTarget && (
          <LiveChatOverlay
            target={activeChatTarget}
            onClose={() => setActiveChatTarget(null)}
          />
        )}
      </AnimatePresence>

    </main>
  );
}