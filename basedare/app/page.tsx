'use client';

import React, { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";

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
import Feed from "@/components/Feed";
import PremiumBentoGrid from "@/components/PremiumBentoGrid";
import HallOfShame from "@/components/HallOfShame";
import BusinessDossier from "@/components/BusinessDossier";
// Chat removed for MVP - LiveChatOverlay was here
import HowItWorks from "@/components/HowItWorks";
import MintAnnouncement from "@/components/MintAnnouncement";
import CreateBountyForm from "@/components/create-bounty-form";
import { FuelTheRocket } from "@/components/FuelTheRocket";

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
  const router = useRouter();
  const [view, setView] = useState<'FAN' | 'BUSINESS'>('FAN');
  const [dares, setDares] = useState<Dare[]>([]);
  // Chat removed for MVP
  const [isClient, setIsClient] = useState(false);
  const [dareInput, setDareInput] = useState('');
  const [selectedStreamer, setSelectedStreamer] = useState('');
  const [showDossier, setShowDossier] = useState(false);

  // Parse dare input to extract streamer tag and dare title
  const parseDareInput = (input: string) => {
    const tagMatch = input.match(/@\w+/);
    const streamerTag = tagMatch ? tagMatch[0] : '';
    // Remove "I dare @tag to" pattern and clean up the title
    const title = input
      .replace(/^I dare\s*/i, '')
      .replace(/@\w+\s*to\s*/i, '')
      .replace(/@\w+\s*/i, '')
      .trim();
    return { streamerTag, title };
  };

  // Handle Initiate Protocol click - navigate to /create with parsed data
  const handleInitiateProtocol = () => {
    const { streamerTag, title } = parseDareInput(dareInput);
    const params = new URLSearchParams();
    if (streamerTag) params.set('streamer', streamerTag);
    if (title) params.set('title', title);
    router.push(`/create${params.toString() ? '?' + params.toString() : ''}`);
  };

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
      <div className="fixed inset-0 z-10 pointer-events-none">
        <GradualBlurOverlay intensity={view === 'BUSINESS' ? 'light' : 'full'} />
      </div>
      <ViewToggle view={view} setView={setView} />

      <AnimatePresence mode="wait">
        {view === 'FAN' && (
          <motion.div 
            key="fan-view"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="w-full flex flex-col items-center"
          >
            <div className="w-full flex flex-col items-center relative z-20 p-6 md:p-0">
              <div className="w-full relative">
                <div className="hidden md:block">
                  <HeroEllipticalStream />
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
                    <LiquidInput
                      placeholder="I dare @xQc to..."
                      prefix="$"
                      className="text-xl"
                      value={dareInput}
                      onChange={setDareInput}
                      onStreamerSelect={setSelectedStreamer}
                    />
                  </div>
                  <div className="w-full md:w-auto">
                    <InitProtocolButton
                      className="w-full md:w-auto"
                      onClick={handleInitiateProtocol}
                    />
                  </div>
                </div>
              </div>

              {/* CREATE BOUNTY FORM - For testing */}
              <div className="w-full flex flex-col items-center py-16 z-30">
                <div className="mb-8 flex flex-col items-center">
                  <h3 className="text-white/40 font-mono text-sm tracking-[0.3em] uppercase">Create a Bounty</h3>
                  <div className="h-px w-24 bg-gradient-to-r from-transparent via-purple-500 to-transparent mt-2" />
                </div>
                <CreateBountyForm />
              </div>

              <HowItWorks />
              <MintAnnouncement />

              <div className="w-full flex flex-col items-center py-20 z-30">
                <div className="mb-12 flex flex-col items-center">
                  <h3 className="text-white/40 font-mono text-sm tracking-[0.3em] uppercase">Active Bounties</h3>
                  <div className="h-px w-24 bg-gradient-to-r from-transparent via-purple-500 to-transparent mt-2" />
                </div>

                <PremiumBentoGrid dares={dares} />

                <div className="mt-12 text-center">
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-500/10 border border-green-500/30 rounded-full">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    <span className="text-green-400 font-mono text-xs uppercase tracking-wider">
                      SENTINEL ONLINE • MONITORING {dares.length} DARES
                    </span>
                  </div>
                </div>

                {/* FUEL THE ROCKET - Donation link */}
                <FuelTheRocket />
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
            className="w-full min-h-screen flex flex-col items-center justify-center pt-32 pb-24"
          >
            {/* Control Mode Selection */}
            <div className="text-center mb-16">
              <h1 className="text-5xl md:text-7xl font-display font-black bg-gradient-to-r from-purple-400 via-pink-400 to-yellow-400 bg-clip-text text-transparent mb-4">
                CONTROL MODE
              </h1>
              <p className="text-zinc-400 text-lg max-w-md mx-auto">
                The B2B infrastructure for programmatic attention marketing
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto px-6">
              {/* Brand Portal Card */}
              <button
                onClick={() => router.push('/brands/portal')}
                className="group relative p-8 bg-zinc-900/50 border border-zinc-800 rounded-2xl hover:border-purple-500/50 transition-all text-left overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative">
                  <div className="text-4xl mb-4">🏢</div>
                  <h2 className="text-2xl font-bold mb-2">Brand Portal</h2>
                  <p className="text-zinc-400 mb-4">
                    Create campaigns, set budgets, and let the Shadow Army hunt creators for you.
                  </p>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className="px-2 py-1 bg-purple-500/20 border border-purple-500/30 rounded">Value Menu</span>
                    <span className="px-2 py-1 bg-purple-500/20 border border-purple-500/30 rounded">Auto-Verify</span>
                    <span className="px-2 py-1 bg-purple-500/20 border border-purple-500/30 rounded">USDC Settlement</span>
                  </div>
                  <div className="mt-6 flex items-center gap-2 text-purple-400 font-semibold">
                    Enter Portal
                    <span className="group-hover:translate-x-2 transition-transform">→</span>
                  </div>
                </div>
              </button>

              {/* Scout Dashboard Card */}
              <button
                onClick={() => router.push('/scouts/dashboard')}
                className="group relative p-8 bg-zinc-900/50 border border-zinc-800 rounded-2xl hover:border-pink-500/50 transition-all text-left overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-pink-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative">
                  <div className="text-4xl mb-4">🕵️</div>
                  <h2 className="text-2xl font-bold mb-2">Shadow Army</h2>
                  <p className="text-zinc-400 mb-4">
                    Hunt creators, claim bounty slots, and earn permanent rake on every win.
                  </p>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className="px-2 py-1 bg-pink-500/20 border border-pink-500/30 rounded">Bounty Board</span>
                    <span className="px-2 py-1 bg-pink-500/20 border border-pink-500/30 rounded">0.5% Discovery</span>
                    <span className="px-2 py-1 bg-pink-500/20 border border-pink-500/30 rounded">0.5% Active</span>
                  </div>
                  <div className="mt-6 flex items-center gap-2 text-pink-400 font-semibold">
                    Join the Army
                    <span className="group-hover:translate-x-2 transition-transform">→</span>
                  </div>
                </div>
              </button>
            </div>

            {/* Investor Dossier Link */}
            <div className="mt-12">
              <button
                onClick={() => setShowDossier(!showDossier)}
                className="text-zinc-500 hover:text-zinc-300 text-sm flex items-center gap-2 transition"
              >
                <span>📊</span>
                <span>{showDossier ? 'Hide Investor Dossier' : 'View Investor Dossier'}</span>
                <span className={`transition-transform ${showDossier ? 'rotate-180' : ''}`}>▼</span>
              </button>
            </div>

            {/* Business Dossier - Numbers breakdown */}
            <AnimatePresence>
              {showDossier && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="w-full mt-8 overflow-hidden"
                >
                  <BusinessDossier />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat removed for MVP */}
    </main>
  );
}
