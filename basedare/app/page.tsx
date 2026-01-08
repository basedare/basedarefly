'use client';

import React, { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";

// === CORE COMPONENTS ===
import ViewToggle from "@/components/ViewToggle";
import GlitchText from "@/components/GlitchText";
import ChromeText from "@/components/ChromeText";
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

// === FIXED IMPORT PATH ===
import { useIgnition } from "@/app/context/IgnitionContext";

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
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
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

  if (!isClient) {
    return <div className="min-h-screen bg-black" />;
  }

  return (
    <main className="flex flex-col items-center min-h-screen bg-transparent font-sans selection:bg-purple-500/30 overflow-x-hidden relative">
      <LiquidBackground />
      <div className="fixed inset-0 z-10 pointer-events-none"><GradualBlurOverlay /></div>
      <ViewToggle view={view} setView={setView} />

      <AnimatePresence mode="wait">
        {view === 'FAN' && (
          <motion.div 
            key="fan-view"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="w-full flex flex-col items-center"
          >
            <div className="w-full flex flex-col items-center relative z-20">
              <div className="w-full relative">
                <div className="hidden md:block">
                  <HeroEllipticalStream dares={dares} onCardClick={setActiveChatTarget} />
                </div>
                <div className="block md:hidden pt-32 pb-12">
                  <PeeBearConveyor dares={dares} />
                </div>
              </div>

              <div className="flex flex-col items-center justify-center -space-y-4 md:-space-y-8 z-10 mb-8 relative z-30 w-full max-w-[100vw] px-4 overflow-hidden">
                <GlitchText glowColor="#FFD700" className="text-yellow-400 text-[12vw] leading-none md:text-9xl font-black italic tracking-tighter z-20">CONTROL</GlitchText>
                <div className="w-full max-w-6xl relative z-10 px-4">
                  <ChromeText text="THE STREAM" className="text-[13vw] leading-none md:text-8xl lg:text-9xl" />
                </div>
              </div>

              <div className="w-full max-w-4xl px-6 mb-24 relative z-30">
                <div className="flex flex-col md:flex-row items-center justify-center gap-6">
                  <div className="w-full md:flex-[2]">
                    <LiquidInput placeholder="I dare @xQc to..." prefix="$" className="text-xl" />
                  </div>
                  <div className="w-full md:w-auto">
                    <InitProtocolButton className="w-full md:w-auto" />
                  </div>
                </div>
              </div>

              <HowItWorks />
              <MintAnnouncement />

              {/* 4. LIVE BOUNTIES - DATA CONNECTED */}
              <LiveBounties dares={dares} onCardClick={setActiveChatTarget} />

              {/* SENTINEL STATUS - POSITIONED UNDER BOUNTIES */}
              <div className="mt-8 mb-16 text-center">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-500/10 border border-green-500/30 rounded-full">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-green-400 font-mono text-xs uppercase tracking-wider">
                    SENTINEL ONLINE • MONITORING {dares.length} DARES
                  </span>
                </div>
              </div>

              {/* 5. TRUTH PROTOCOL - STATIC PILLARS */}
              <TruthProtocol />

              <div className="w-full border-t border-white/5 bg-black/50">
                  <HallOfShame />
              </div>
            </div>
          </motion.div>
        )}

        {view === 'BUSINESS' && (
          <motion.div 
            key="business-view"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className="w-full min-h-screen flex flex-col items-center justify-center pt-32 pb-24 backdrop-blur-xl bg-black/10 border border-white/10"
          >
            <BusinessDossier />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {activeChatTarget && <LiveChatOverlay target={activeChatTarget} onClose={() => setActiveChatTarget(null)} />}
      </AnimatePresence>
    </main>
  );
}