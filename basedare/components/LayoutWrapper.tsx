"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import AppLoader from "@/components/AppLoader";
import GalaxyBackground from "@/components/GalaxyBackground";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import MobileNav from "@/components/MobileNav";

// Mock User
const MOCK_USER = { email: "you@basedare.com", full_name: "Based Degen" };

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [user, setUser] = useState<typeof MOCK_USER | null>(null);

  // Load Simulation
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoaded(true);
      setUser(MOCK_USER);
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  // Parallax Effect (Vision Pro Style)
  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: no-preference)').matches) {
      const handleMouseMove = (e: MouseEvent) => {
        const x = (e.clientX / window.innerWidth) - 0.5;
        const y = (e.clientY / window.innerHeight) - 0.5;
        document.querySelectorAll('.glass-panel').forEach((panel, i) => {
          (panel as HTMLElement).style.transform = `translate(${x * (i + 1) * 20}px, ${y * (i + 1) * 20}px) scale(1.0${i + 5})`;
        });
      };
      window.addEventListener('mousemove', handleMouseMove);
      return () => window.removeEventListener('mousemove', handleMouseMove);
    }
  }, []);

  return (
    <>
      {/* 1. LOADING SCREEN */}
      <AppLoader isVisible={!isLoaded} />

      {/* 2. MAIN CONTENT (Only shows after load) */}
      {isLoaded && (
        <motion.div 
          className="min-h-screen flex flex-col"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <GalaxyBackground />
          <MobileNav isOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} user={user} />
          
          {/* GLOBAL STYLES (Ported from your Layout.js) */}
          <style jsx global>{`
            :root {
              --navy: #020204;
              --peebare-yellow: #FFB800;
              --peebare-orange: #FF6B00;
              --peebare-gold: #FFD700;
            }
            
            /* Vision Pro Glass Panels */
            .glass-panel {
              position: fixed;
              inset: 0;
              background: rgba(255, 255, 255, 0.03);
              pointer-events: none;
              z-index: -1;
              transition: transform 0.1s ease-out;
            }

            /* Token Soon Pill Animation */
            @keyframes pulse-ring {
              0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(255, 82, 82, 0.7); }
              70% { transform: scale(1); box-shadow: 0 0 0 10px rgba(255, 82, 82, 0); }
              100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(255, 82, 82, 0); }
            }
          `}</style>

          {/* Parallax Background Layers */}
          <div className="glass-panel" />
          <div className="glass-panel" style={{ background: 'rgba(168, 85, 247, 0.02)' }} />

          {/* TOKEN SOON PILL (Floating) */}
          <div className="fixed top-24 right-4 z-40 hidden md:block">
             <div className="px-3 py-1 rounded-full bg-red-500/20 border border-red-500/50 text-red-400 text-xs font-bold animate-pulse shadow-[0_0_20px_rgba(239,68,68,0.4)]">
               TOKEN SOON ⚡
             </div>
          </div>

          {/* HEADER */}
          <Navbar />

          {/* PAGE CONTENT */}
          <main className="flex-1 relative z-10">
            {children}
          </main>

          {/* FOOTER */}
          <Footer />
        </motion.div>
      )}
    </>
  );
}
