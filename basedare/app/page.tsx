'use client';

import React, { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";

// === CORE COMPONENTS ===
import ViewToggle from "@/components/ViewToggle";
import GlitchText from "@/components/GlitchText";
import MetallicText from "@/components/MetallicText";
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
import ParticleNetwork from "@/components/ParticleNetwork";
import RealityShift from "@/components/RealityShift";
import MatrixRain from "@/components/MatrixRain";

// === FIXED IMPORT PATH ===
import { useIgnition } from "@/app/context/IgnitionContext";
import { useView } from "@/app/context/ViewContext";

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
  const searchParams = useSearchParams();
  const { view, setView } = useView(); // Use global context
  const [dares, setDares] = useState<Dare[]>([]);
  // Chat removed for MVP
  const [isClient, setIsClient] = useState(false);
  const [dareInput, setDareInput] = useState('');
  const [selectedStreamer, setSelectedStreamer] = useState('');
  const [showDossier, setShowDossier] = useState(false);
  const [triggerRealityShift, setTriggerRealityShift] = useState(false);
  const [triggerMatrixRain, setTriggerMatrixRain] = useState(false);
  const [glitchActive, setGlitchActive] = useState(false);

  // Cyberpunk glitch effect for mobile PeeBear - triggers every 10 seconds
  useEffect(() => {
    const glitchInterval = setInterval(() => {
      setGlitchActive(true);
      // Glitch lasts 300ms
      setTimeout(() => setGlitchActive(false), 300);
    }, 10000);

    return () => clearInterval(glitchInterval);
  }, []);

  // Custom view setter that triggers transitions
  const handleViewChange = (newView: 'FAN' | 'BUSINESS') => {
    if (view === 'BUSINESS' && newView === 'FAN') {
      // Control → Chaos: Sin City lightning strike
      setTriggerRealityShift(true);
    } else if (view === 'FAN' && newView === 'BUSINESS') {
      // Chaos → Control: Matrix rain
      setTriggerMatrixRain(true);
    }
    setView(newView); // Updates global context
  };

  // Check URL params for mode on mount
  useEffect(() => {
    const mode = searchParams.get('mode');
    const fromControl = searchParams.get('from');

    if (mode === 'control') {
      setView('BUSINESS');
    }

    // Trigger reality shift when returning from Control pages
    if (fromControl === 'control') {
      setTriggerRealityShift(true);
      // Clean up the URL param
      const url = new URL(window.location.href);
      url.searchParams.delete('from');
      window.history.replaceState({}, '', url.toString());
    }
  }, [searchParams]);

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
      <ViewToggle view={view} setView={handleViewChange} />

      {/* Reality Shift - Sin City lightning from Control to Chaos */}
      <RealityShift
        trigger={triggerRealityShift}
        onComplete={() => setTriggerRealityShift(false)}
      />

      {/* Matrix Rain - Digital rain from Chaos to Control */}
      <MatrixRain
        trigger={triggerMatrixRain}
        onComplete={() => setTriggerMatrixRain(false)}
      />

      <AnimatePresence mode="wait">
        {view === 'FAN' && (
          <motion.div
            key="fan-view"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
            className="w-full flex flex-col items-center"
          >
            <div className="w-full flex flex-col items-center relative z-20 p-6 md:p-0">
              <div className="w-full relative">
                {/* Desktop: Full 3D Hero with orbiting cards */}
                <div className="hidden md:block">
                  <HeroEllipticalStream />
                </div>

                {/* Mobile: Simplified hero with PeeBear + Conveyor */}
                <div className="block md:hidden pt-24 pb-8">
                  {/* Mobile PeeBear Head - With Cyberpunk Glitch Effect */}
                  <div className="relative w-full flex justify-center mb-6">
                    <div className="relative w-[200px] h-[200px]">
                      {/* Glow effect */}
                      <div
                        className={`absolute inset-0 bg-purple-600/30 rounded-full blur-3xl transition-all duration-100 ${
                          glitchActive ? 'bg-cyan-500/40 scale-110' : ''
                        }`}
                        style={{ transform: glitchActive ? 'scale(1.3)' : 'scale(1.2)' }}
                      />

                      {/* Glitch RGB layers - only visible during glitch */}
                      {glitchActive && (
                        <>
                          {/* Red channel offset */}
                          <img
                            src="/assets/peebear-head.png"
                            alt=""
                            className="absolute inset-0 w-full h-full object-contain z-20 opacity-60"
                            style={{
                              filter: 'hue-rotate(-60deg) saturate(2)',
                              transform: 'translate(-4px, 2px)',
                              mixBlendMode: 'screen',
                              maskImage: 'linear-gradient(to bottom, black 0%, black 70%, transparent 100%)',
                              WebkitMaskImage: 'linear-gradient(to bottom, black 0%, black 70%, transparent 100%)',
                            }}
                          />
                          {/* Cyan channel offset */}
                          <img
                            src="/assets/peebear-head.png"
                            alt=""
                            className="absolute inset-0 w-full h-full object-contain z-20 opacity-60"
                            style={{
                              filter: 'hue-rotate(180deg) saturate(2)',
                              transform: 'translate(4px, -2px)',
                              mixBlendMode: 'screen',
                              maskImage: 'linear-gradient(to bottom, black 0%, black 70%, transparent 100%)',
                              WebkitMaskImage: 'linear-gradient(to bottom, black 0%, black 70%, transparent 100%)',
                            }}
                          />
                          {/* Scan lines overlay */}
                          <div
                            className="absolute inset-0 z-30 pointer-events-none opacity-30"
                            style={{
                              background: 'repeating-linear-gradient(0deg, transparent 0px, transparent 2px, rgba(0,0,0,0.3) 2px, rgba(0,0,0,0.3) 4px)',
                            }}
                          />
                        </>
                      )}

                      {/* PeeBear image - main */}
                      <img
                        src="/assets/peebear-head.png"
                        alt="BaseDare God"
                        className={`w-full h-full object-contain relative z-10 drop-shadow-[0_0_20px_rgba(168,85,247,0.5)] transition-all duration-75 ${
                          glitchActive ? 'scale-[1.02]' : ''
                        }`}
                        style={{
                          maskImage: 'linear-gradient(to bottom, black 0%, black 70%, transparent 100%)',
                          WebkitMaskImage: 'linear-gradient(to bottom, black 0%, black 70%, transparent 100%)',
                          transform: glitchActive ? 'translate(1px, -1px) skewX(-1deg)' : undefined,
                          filter: glitchActive
                            ? 'drop-shadow(0 0 20px rgba(168,85,247,0.5)) brightness(1.2) contrast(1.1)'
                            : 'drop-shadow(0 0 20px rgba(168,85,247,0.5))',
                        }}
                      />
                    </div>
                  </div>

                  {/* Mobile Conveyor Strip - Always uses featured dares (same as desktop orbit) */}
                  <PeeBearConveyor />
                </div>
              </div>

              <div className="flex flex-col items-center justify-center -space-y-2 md:-space-y-4 z-10 mb-8 relative z-30 w-full max-w-[100vw] px-4 overflow-hidden">
                <GlitchText glowColor="#FFD700" className="text-yellow-400 text-[12vw] leading-none md:text-9xl font-black italic tracking-tighter z-20">CONTROL</GlitchText>
                <h2 className="text-white text-[11vw] md:text-7xl lg:text-8xl font-black italic tracking-tighter uppercase">
                  THE STREAM
                </h2>
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
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
            className="w-full min-h-screen flex flex-col items-center -mt-32 pb-24 relative"
          >
            {/* Light Background with Particle Network */}
            <motion.div
              className="fixed inset-0 z-0"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.2, ease: [0.4, 0, 0.2, 1] }}
            >
              {/* Base light gradient */}
              <div className="absolute inset-0 bg-gradient-to-b from-zinc-100 via-zinc-50 to-white" />

              {/* Particle Network - fades in with delay for hypnotic effect */}
              <motion.div
                className="absolute inset-0"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 1.5, delay: 0.3, ease: [0.4, 0, 0.2, 1] }}
              >
                <ParticleNetwork
                  particleCount={100}
                  minDist={120}
                  particleColor="rgba(0, 0, 0, 0.5)"
                  lineColor="rgba(0, 0, 0,"
                  speed={0.25}
                />
              </motion.div>

              {/* Subtle vignette */}
              <div className="absolute inset-0 pointer-events-none"
                style={{
                  background: 'radial-gradient(ellipse at center, transparent 40%, rgba(255,255,255,0.8) 100%)'
                }}
              />
            </motion.div>

            {/* Control Mode Selection */}
            <div className="text-center mb-8 relative z-10">
              <div className="w-full max-w-7xl mx-auto h-[300px] md:h-[500px] lg:h-[600px]">
                <MetallicText text="CONTROL MODE" className="w-full h-full" />
              </div>
              <p className="text-zinc-600 text-lg max-w-md mx-auto -mt-16 md:-mt-32 lg:-mt-40">
                The B2B infrastructure for programmatic attention marketing
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto px-6 relative z-10">
              {/* Brand Portal Card - Ferrofluid/Venom Black */}
              <div
                onClick={() => router.push('/brands/portal')}
                className="group relative p-[3px] rounded-3xl overflow-hidden cursor-pointer transition-all duration-700"
              >
                {/* Ferrofluid Border Effect - organic black liquid metal */}
                <div
                  className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-all duration-700"
                  style={{
                    background: 'linear-gradient(135deg, #0a0a0a, #1a1a1a, #000, #2a2a2a, #0a0a0a)',
                    backgroundSize: '400% 400%',
                    animation: 'ferrofluidShift 3s ease infinite',
                  }}
                />
                {/* Metallic sheen overlay */}
                <div
                  className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                  style={{
                    background: 'conic-gradient(from 0deg at 50% 50%, transparent 0deg, rgba(255,255,255,0.15) 60deg, transparent 120deg, rgba(255,255,255,0.1) 180deg, transparent 240deg, rgba(255,255,255,0.12) 300deg, transparent 360deg)',
                    animation: 'spin 6s linear infinite',
                  }}
                />

                {/* Deep Black Glossy Panel - Venom aesthetic */}
                <div className="relative p-8 rounded-[21px] text-left overflow-hidden"
                  style={{
                    background: 'linear-gradient(165deg, #0d0d0d 0%, #000000 40%, #080808 70%, #0a0a0a 100%)',
                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05), inset 0 -2px 10px rgba(0,0,0,0.8), 0 30px 60px -15px rgba(0,0,0,0.7)',
                  }}
                >
                  {/* Ferrofluid surface sheen - mimics oil slick */}
                  <div
                    className="absolute inset-0 pointer-events-none opacity-60 group-hover:opacity-100 transition-opacity duration-700"
                    style={{
                      background: 'linear-gradient(125deg, transparent 0%, rgba(255,255,255,0.03) 25%, transparent 50%, rgba(255,255,255,0.05) 75%, transparent 100%)',
                    }}
                  />
                  {/* Metallic edge highlight */}
                  <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-zinc-600/30 to-transparent" />
                  {/* Venom-like organic shine blob */}
                  <div
                    className="absolute -top-20 -right-20 w-40 h-40 rounded-full opacity-0 group-hover:opacity-30 transition-all duration-1000 blur-2xl"
                    style={{ background: 'radial-gradient(circle, rgba(100,100,100,0.4) 0%, transparent 70%)' }}
                  />

                  <div className="relative z-10">
                    <div className="text-4xl mb-4">🏢</div>
                    <h2 className="text-2xl font-bold mb-2 text-white">Brand Portal</h2>
                    <p className="text-zinc-500 mb-4">
                      Create campaigns, set budgets, and let the Shadow Army hunt creators for you.
                    </p>
                    <div className="flex flex-wrap gap-2 text-xs">
                      <span className="px-2 py-1 bg-zinc-900 border border-zinc-700/50 text-zinc-400 rounded">Value Menu</span>
                      <span className="px-2 py-1 bg-zinc-900 border border-zinc-700/50 text-zinc-400 rounded">Auto-Verify</span>
                      <span className="px-2 py-1 bg-zinc-900 border border-zinc-700/50 text-zinc-400 rounded">USDC Settlement</span>
                    </div>
                    <div className="mt-6 flex items-center gap-2 text-zinc-300 font-semibold group-hover:text-white transition-colors duration-500">
                      Enter Portal
                      <span className="group-hover:translate-x-2 transition-transform duration-500">→</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Shadow Army Card - Inverted Ferrofluid (Chrome/Mercury) */}
              <div
                onClick={() => router.push('/scouts/dashboard')}
                className="group relative p-[3px] rounded-3xl overflow-hidden cursor-pointer transition-all duration-700"
              >
                {/* Chrome/Mercury Border Effect */}
                <div
                  className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-all duration-700"
                  style={{
                    background: 'linear-gradient(135deg, #e0e0e0, #f5f5f5, #d0d0d0, #fafafa, #e5e5e5)',
                    backgroundSize: '400% 400%',
                    animation: 'ferrofluidShift 3s ease infinite',
                  }}
                />
                {/* Metallic sheen overlay - darker for contrast */}
                <div
                  className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                  style={{
                    background: 'conic-gradient(from 180deg at 50% 50%, transparent 0deg, rgba(0,0,0,0.08) 60deg, transparent 120deg, rgba(0,0,0,0.05) 180deg, transparent 240deg, rgba(0,0,0,0.06) 300deg, transparent 360deg)',
                    animation: 'spin 6s linear infinite',
                  }}
                />

                {/* Glossy Chrome Panel */}
                <div className="relative p-8 rounded-[21px] text-left overflow-hidden"
                  style={{
                    background: 'linear-gradient(165deg, #fafafa 0%, #f0f0f0 40%, #f5f5f5 70%, #ffffff 100%)',
                    boxShadow: 'inset 0 2px 0 rgba(255,255,255,1), inset 0 -2px 10px rgba(0,0,0,0.03), 0 30px 60px -15px rgba(0,0,0,0.12)',
                  }}
                >
                  {/* Chrome surface sheen */}
                  <div
                    className="absolute inset-0 pointer-events-none opacity-40 group-hover:opacity-70 transition-opacity duration-700"
                    style={{
                      background: 'linear-gradient(125deg, transparent 0%, rgba(0,0,0,0.02) 25%, transparent 50%, rgba(0,0,0,0.03) 75%, transparent 100%)',
                    }}
                  />
                  {/* Metallic edge highlight */}
                  <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-zinc-400/30 to-transparent" />
                  {/* Chrome shine blob */}
                  <div
                    className="absolute -top-20 -right-20 w-40 h-40 rounded-full opacity-0 group-hover:opacity-20 transition-all duration-1000 blur-2xl"
                    style={{ background: 'radial-gradient(circle, rgba(0,0,0,0.15) 0%, transparent 70%)' }}
                  />

                  <div className="relative z-10">
                    <div className="text-4xl mb-4">🕵️</div>
                    <h2 className="text-2xl font-bold mb-2 text-zinc-900">Shadow Army</h2>
                    <p className="text-zinc-600 mb-4">
                      Hunt creators, claim bounty slots, and earn permanent rake on every win.
                    </p>
                    <div className="flex flex-wrap gap-2 text-xs">
                      <span className="px-2 py-1 bg-zinc-100 border border-zinc-300/50 text-zinc-700 rounded">Bounty Board</span>
                      <span className="px-2 py-1 bg-zinc-100 border border-zinc-300/50 text-zinc-700 rounded">0.5% Discovery</span>
                      <span className="px-2 py-1 bg-zinc-100 border border-zinc-300/50 text-zinc-700 rounded">0.5% Active</span>
                    </div>
                    <div className="mt-6 flex items-center gap-2 text-zinc-700 font-semibold group-hover:text-zinc-900 transition-colors duration-500">
                      Join the Army
                      <span className="group-hover:translate-x-2 transition-transform duration-500">→</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Investor Dossier Link */}
            <div className="mt-12 relative z-10">
              <button
                onClick={() => setShowDossier(!showDossier)}
                className="text-zinc-500 hover:text-zinc-800 text-sm flex items-center gap-2 transition"
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
                  className="w-full mt-8 overflow-hidden relative z-10"
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
