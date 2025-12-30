
import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Home, PlusCircle, Target, LogOut, User, Wallet, Menu, Trophy, Crown, Copy, Check } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import MobileNav from "./components/MobileNav";
import AppLoader from "./components/AppLoader";
import GalaxyBackground from "./components/GalaxyBackground";

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [walletConnected, setWalletConnected] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [walletAddress] = useState("0x1234567890abcdef1234567890abcdef12345678");
  const [copied, setCopied] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // GUARANTEED 3s timeout - will ALWAYS fire
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoaded(true);
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => setUser(null));
  }, []);

  useEffect(() => {
    document.documentElement.classList.add("dark");
    document.body.classList.add("dark");
  }, []);

  const shortenAddress = (addr) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  const copyAddress = () => {
    navigator.clipboard.writeText(walletAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    if (window.DeviceOrientationEvent && 'ontouchstart' in window === false) {
      const handleOrientation = (e) => {
        const tiltX = e.gamma / 90;
        const tiltY = e.beta / 90;
        document.querySelectorAll('.glass-panel').forEach((panel, i) => {
          panel.style.transform = `translate(${tiltX * (i+1) * 20}px, ${tiltY * (i+1) * 20}px) translateZ(-${(i+1)*20}px) scale(1.${i}5)`;
        });
      };
      window.addEventListener('deviceorientation', handleOrientation);
      return () => window.removeEventListener('deviceorientation', handleOrientation);
    }
  }, []);

  const handleLogout = () => {
    base44.auth.logout();
  };

  return (
    <>
      <AnimatePresence mode="wait">
        <AppLoader isVisible={!isLoaded} />
      </AnimatePresence>
      
      {isLoaded && (
      <motion.div 
        className="min-h-screen bg-[#0A0A0F] dark:bg-[#0A0A0F]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
      <GalaxyBackground />
      <style>{`
        :root {
          --navy: #0A0A0F;
          --peebare-yellow: #FFB800;
          --peebare-orange: #FF6B00;
          --peebare-gold: #FFD700;
        }

        /* HD TEXT RENDERING */
        * {
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
          text-rendering: optimizeLegibility;
        }

        /* MOBILE RESPONSIVE BASE */
        @media (max-width: 640px) {
          html { font-size: 14px; }
          .nav-btn { padding: 0.375rem 0.5rem; font-size: 0.7rem; }
          button { font-size: 0.875rem; min-height: 40px; }
        }

        /* IPHONE SE ULTRA-SMALL SCREENS */
        @media (max-width: 375px) {
          .nav-btn { font-size: 0.65rem; padding: 0.25rem 0.375rem; }
          .hero-text { font-size: 1.25rem !important; line-height: 1.3 !important; }
          .treadmill-card { min-width: 85vw; gap: 0.5rem; }
          .main-content { padding-top: 3.5rem; }
        }

        /* OVERFLOW FIX */
        html, body { overflow-x: hidden; max-width: 100vw; }

        /* VAUL DRAWER CLAMP */
        [data-vaul-drawer], .drawer-content {
          max-width: 100vw !important;
          min-height: 100vh !important;
          overflow-x: hidden !important;
        }

        /* LEADERBOARD ROW WRAP */
        .rank-row, .leaderboard-row {
          flex-wrap: wrap !important;
          gap: 0.5rem !important;
        }

        /* FADE-IN AFTER LOAD */
        .fade-in-content {
          animation: fadeInContent 0.3s ease-out forwards;
        }
        @keyframes fadeInContent {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        /* PAGE POSITION FIX (iPhone SE) */
        .page-content {
          position: relative !important;
        }

        /* NEON GREEN HOVERS */
        .neon-hover:hover { color: #00ff41 !important; text-shadow: 0 0 10px #00ff41; }
        button:hover { box-shadow: 0 0 20px rgba(0, 255, 65, 0.3); }

        /* REDUCED MOTION */
        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
        }

        /* TOAST VISIBILITY FIX - TOP POSITIONED */
        .toast-container {
          position: fixed !important;
          top: 5.5rem !important;
          left: 50% !important;
          transform: translateX(-50%) !important;
          z-index: 9999 !important;
          max-width: 92vw;
        }
        @media (max-width: 640px) {
          .toast-container {
            top: 5rem !important;
            min-width: 90vw;
          }
        }

        /* OPTIMIZED GLASS ARCHITECTURE */
        * { backdrop-filter:none !important; -webkit-backdrop-filter:none !important; mask-image:none !important; }
        body::before {content:"";position:fixed;inset:0;background:rgba(10,0,25,0.38);backdrop-filter:blur(16px) saturate(200%);-webkit-backdrop-filter:blur(16px) saturate(200%);z-index:-2;}
        main,#__next,div,section{background:transparent !important;position:relative;z-index:1;}
        .electric-particle,.floating-x,.rotating-bear,canvas,.graffiti-spray{position:fixed !important;z-index:999999 !important;mix-blend-mode:screen !important;pointer-events:none !important;}

        /* 1. HD MATTE GLASS BOUNTY POT - ULTRA CRISP */
        #bounty-pot, .bounty-pot, [data-bounty] {
          background: rgba(0, 10, 20, 0.45) !important;
          backdrop-filter: blur(20px) saturate(180%) brightness(1.1) !important;
          -webkit-backdrop-filter: blur(20px) saturate(180%) brightness(1.1) !important;
          border: 1.5px solid rgba(0, 255, 255, 0.5) !important;
          border-radius: 28px !important;
          box-shadow: 
            0 16px 60px rgba(0,0,0,0.8),
            0 0 0 1px rgba(255,255,255,0.1) inset,
            inset 0 1px 0 rgba(255,255,255,0.15),
            inset 0 0 80px rgba(0,255,255,0.12) !important;
          padding: 24px 36px !important;
          position: relative !important;
          pointer-events: auto !important;
          z-index: 1 !important;
        }

        #bounty-pot::before, .bounty-pot::before, [data-bounty]::before {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: 28px;
          background: linear-gradient(135deg, rgba(255,255,255,0.08) 0%, transparent 50%, rgba(0,255,255,0.05) 100%);
          pointer-events: none;
        }

        /* 2. HD FIRE TEXT – CRYSTAL CLEAR WITH AGGRESSIVE FLASHING */
        .conveyor-text, .fire-text, [data-fire-text] {
          font-weight: 900 !important;
          font-size: clamp(1.5rem, 5vw, 3rem) !important;
          letter-spacing: -0.01em !important;
          line-height: 1.2 !important;
          
          /* HD gradient with better contrast */
          background: linear-gradient(
            90deg, 
            #ff1a75 0%,
            #ff6b35 20%,
            #ffeb3b 40%,
            #ff6b35 60%,
            #ff1a75 80%,
            #ff1a75 100%
          ) !important;
          background-size: 200% 100% !important;
          -webkit-background-clip: text !important;
          background-clip: text !important;
          -webkit-text-fill-color: transparent !important;
          
          /* Crisp shadow with depth */
          filter: 
            drop-shadow(0 0 16px rgba(255, 26, 117, 1))
            drop-shadow(0 0 32px rgba(255, 107, 53, 0.8))
            drop-shadow(0 0 48px rgba(255, 235, 59, 0.6))
            drop-shadow(0 2px 4px rgba(0,0,0,0.8)) !important;
          
          /* AGGRESSIVE FLASHING + MOVEMENT */
          animation: 
            flame-flash 0.12s infinite alternate,
            glow-pulse 0.8s ease-in-out infinite,
            siren-flash 0.5s infinite alternate !important;
          
          white-space: nowrap !important;
          text-shadow: none !important;
        }

        @keyframes flame-flash {
          0% { 
            filter: 
              drop-shadow(0 0 12px rgba(255, 26, 117, 0.7))
              drop-shadow(0 0 24px rgba(255, 107, 53, 0.5))
              drop-shadow(0 0 36px rgba(255, 235, 59, 0.3))
              drop-shadow(0 2px 4px rgba(0,0,0,0.8))
              brightness(0.9);
          }
          100% { 
            filter: 
              drop-shadow(0 0 20px rgba(255, 26, 117, 1))
              drop-shadow(0 0 40px rgba(255, 107, 53, 1))
              drop-shadow(0 0 60px rgba(255, 235, 59, 0.9))
              drop-shadow(0 2px 4px rgba(0,0,0,0.8))
              brightness(1.6);
          }
        }

        @keyframes glow-pulse {
          0%, 100% { 
            opacity: 0.9;
            text-shadow: 
              0 0 20px rgba(255, 235, 59, 0.8),
              0 0 40px rgba(255, 107, 53, 0.6),
              0 0 60px rgba(255, 26, 117, 0.4);
          }
          50% { 
            opacity: 1;
            text-shadow: 
              0 0 30px rgba(255, 235, 59, 1),
              0 0 60px rgba(255, 107, 53, 0.9),
              0 0 90px rgba(255, 26, 117, 0.7);
          }
        }

        @keyframes siren-flash {
          0% { 
            filter: brightness(1) hue-rotate(0deg);
          }
          25% {
            filter: brightness(1.8) hue-rotate(10deg);
          }
          50% { 
            filter: brightness(1.2) hue-rotate(-5deg);
          }
          75% {
            filter: brightness(1.6) hue-rotate(8deg);
          }
          100% { 
            filter: brightness(1.4) hue-rotate(0deg);
          }
        }

        /* YELLOW LIGHTNING ICON ANIMATION */
        .lightning-icon {
          color: #ffeb3b !important;
          filter: 
            drop-shadow(0 0 8px rgba(255, 235, 59, 1))
            drop-shadow(0 0 16px rgba(255, 235, 59, 0.8))
            drop-shadow(0 0 24px rgba(255, 235, 59, 0.6)) !important;
          animation: lightning-pulse 0.4s infinite alternate !important;
        }

        @keyframes lightning-pulse {
          0% {
            color: #ffeb3b;
            filter: 
              drop-shadow(0 0 6px rgba(255, 235, 59, 0.8))
              drop-shadow(0 0 12px rgba(255, 235, 59, 0.6))
              drop-shadow(0 0 18px rgba(255, 235, 59, 0.4));
            transform: scale(1);
          }
          100% {
            color: #fff44f;
            filter: 
              drop-shadow(0 0 12px rgba(255, 235, 59, 1))
              drop-shadow(0 0 24px rgba(255, 235, 59, 1))
              drop-shadow(0 0 36px rgba(255, 235, 59, 0.8));
            transform: scale(1.15);
          }
        }

        /* YELLOW SIREN EMERGENCY LIGHT */
        .conveyor-header::after {
          content: '';
          position: absolute;
          top: 50%;
          right: -40px;
          width: 12px;
          height: 12px;
          background: #ffeb3b;
          border-radius: 50%;
          transform: translateY(-50%);
          box-shadow: 
            0 0 20px rgba(255, 235, 59, 1),
            0 0 40px rgba(255, 235, 59, 0.8),
            0 0 60px rgba(255, 235, 59, 0.6);
          animation: siren-pulse 0.5s infinite alternate;
        }

        @keyframes siren-pulse {
          0% {
            opacity: 1;
            transform: translateY(-50%) scale(1);
            box-shadow: 
              0 0 20px rgba(255, 235, 59, 1),
              0 0 40px rgba(255, 235, 59, 0.8),
              0 0 60px rgba(255, 235, 59, 0.6);
          }
          100% {
            opacity: 0.3;
            transform: translateY(-50%) scale(1.3);
            box-shadow: 
              0 0 40px rgba(255, 235, 59, 1),
              0 0 80px rgba(255, 235, 59, 1),
              0 0 120px rgba(255, 235, 59, 0.8);
          }
        }

        /* Original styles preserved below */
        html, body {
          background: var(--navy);
          color: white;
          overflow-x: hidden;
        }

        /* Stacked frosted-glass panels that warp with mouse / head movement */
        .glass-panel {
          position: fixed;
          inset: 0;
          background: rgba(255, 255, 255, 0.07);
          pointer-events: none;
          z-index: -1;
          animation: float 20s infinite ease-in-out;
        }

        /* Make text look etched into the glass */
        h1, h2, .dare-text, .dare-feed-title {
          color: white;
          text-shadow: 
            0 0 20px rgba(255,255,255,0.8),
            0 0 40px rgba(255,0,255,0.6);
          font-weight: 900;
          letter-spacing: -0.02em;
          background: linear-gradient(90deg, #fff, #ff00ff, #00ffff);
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        /* Parallax that reacts to head tilt on Vision Pro */
        @media (prefers-reduced-motion: no-preference) {
          .glass-panel:nth-child(1) { transform: translateZ(-20px) scale(1.05); }
          .glass-panel:nth-child(2) { transform: translateZ(-40px) scale(1.1); }
          .glass-panel:nth-child(3) { transform: translateZ(-60px) scale(1.15); }
        }

        /* Floating animation */
        @keyframes float {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-30px) rotate(1deg); }
        }

        .nav-btn {
          position: relative;
          color: #9ca3af;
          font-size: 0.875rem;
          font-weight: 500;
          padding: 0.625rem 1rem;
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          background: transparent;
          border: none;
          border-radius: 0.75rem;
          overflow: hidden;
        }

        .nav-btn::before {
          content: '';
          position: absolute;
          inset: 0;
          background: radial-gradient(circle at center, rgba(255, 184, 0, 0.15), transparent 70%);
          opacity: 0;
          transform: scale(0.5);
          transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
          border-radius: 0.75rem;
        }

        .nav-btn::after {
          content: '';
          position: absolute;
          inset: -2px;
          background: linear-gradient(135deg, rgba(255, 184, 0, 0.3), rgba(255, 107, 0, 0.3));
          border-radius: 0.75rem;
          opacity: 0;
          filter: blur(8px);
          transition: opacity 0.5s cubic-bezier(0.4, 0, 0.2, 1);
          z-index: -1;
        }

        @media (prefers-reduced-motion: no-preference) {
          .nav-btn:hover {
            color: #FFB800;
            transform: scale(1.08) translateY(-1px);
            background: rgba(255, 184, 0, 0.05);
          }

          .nav-btn:hover::before {
            opacity: 1;
            transform: scale(1.2);
          }

          .nav-btn:hover::after {
            opacity: 1;
          }
        }

        .nav-btn.active {
          color: #FFB800;
          background: rgba(255, 184, 0, 0.1);
        }

        .nav-btn.active::before {
          opacity: 0.6;
          transform: scale(1);
        }

        @media (prefers-reduced-motion: reduce) {
          .nav-btn:hover {
            animation: none;
            transform: none;
          }
        }
      `}</style>

      {/* Vision Pro Glass Panels */}
      <div className="glass-panel" style={{ animationDelay: '0s' }} />
      <div className="glass-panel" style={{ animationDelay: '7s', background: 'rgba(255,0,255,0.05)' }} />
      <div className="glass-panel" style={{ animationDelay: '14s', background: 'rgba(0,255,255,0.05)' }} />

      <MobileNav isOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} user={user} />

      {/* TOKEN SOON - Floating pill */}
      <div className="fixed top-2 right-2 z-50 md:hidden">
        <div className="px-3 py-1.5 rounded-full bg-gradient-to-r from-orange-500/20 to-red-500/20 border border-orange-500 shadow-lg text-white text-xs font-bold animate-pulse">
          TOKEN SOON ⚡
        </div>
      </div>

      <nav className="fixed top-0 left-0 right-0 h-14 md:h-16 bg-black/95 z-40 border-b border-white/5 mt-6 md:mt-8">
        <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 h-full">
          <div className="flex flex-row items-center justify-between h-full w-full gap-2 md:gap-4">
            <div className="flex items-center gap-2 md:gap-4 flex-shrink-0">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMobileMenuOpen(true)}
                className="lg:hidden text-gray-400 hover:text-white transition-colors p-1"
              >
                <Menu className="w-5 h-5" />
              </Button>
              
              <Link to={createPageUrl("Home")} className="flex items-center gap-1.5 md:gap-2 flex-shrink-0">
                <img 
                  src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68fdae09d2124933d726e89a/ca6b6c8e3_image.png"
                  alt="BaseDare Bear"
                  className="w-7 h-7 md:w-10 md:h-10 object-contain hover:scale-110 transition-transform"
                />
                <span className="text-sm md:text-xl font-bold text-[#FFB800] tracking-tight hidden sm:inline">
                  BaseDare
                </span>
              </Link>

              <div className="hidden lg:flex items-center gap-4 ml-4 flex-nowrap">
                <Link to={createPageUrl("Home")}>
                  <button className={`nav-btn min-w-fit hover:scale-105 transition-all duration-200 ${location.pathname === createPageUrl("Home") ? 'active' : ''}`}>
                    Home
                  </button>
                </Link>

                <Link to={createPageUrl("CreateDare")}>
                  <button className={`nav-btn min-w-fit hover:scale-105 transition-all duration-200 ${location.pathname === createPageUrl("CreateDare") ? 'active' : ''}`}>
                    Create
                  </button>
                </Link>

                <Link to={createPageUrl("MyDares")}>
                  <button className={`nav-btn min-w-fit hover:scale-105 transition-all duration-200 ${location.pathname === createPageUrl("MyDares") ? 'active' : ''}`}>
                    My Dares
                  </button>
                </Link>

                <Link to={createPageUrl("Leaderboard")}>
                  <button className={`nav-btn min-w-fit hover:scale-105 transition-all duration-200 ${location.pathname === createPageUrl("Leaderboard") ? 'active' : ''}`}>
                    Leaderboard
                  </button>
                </Link>

                <Link to={createPageUrl("About")}>
                  <button className={`nav-btn min-w-fit flex-shrink-0 hover:scale-105 transition-all duration-200 ${location.pathname === createPageUrl("About") ? 'active' : ''}`}>
                    About
                  </button>
                </Link>

                <Link to={createPageUrl("FAQ")}>
                  <button className={`nav-btn min-w-fit flex-shrink-0 hover:scale-105 transition-all duration-200 ${location.pathname === createPageUrl("FAQ") ? 'active' : ''}`}>
                    FAQ
                  </button>
                </Link>
                </div>
            </div>

            <div className="hidden md:flex items-center gap-4">
              <div className="flex items-center gap-2 bg-gradient-to-r from-orange-500 to-yellow-500 text-black font-black px-4 py-2 rounded-full">
                <Wallet className="w-4 h-4" />
                <span className="font-mono text-sm">{shortenAddress(walletAddress)}</span>
                <button onClick={copyAddress} className="p-1 hover:bg-black/10 rounded">
                  {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>
              
              <button className="relative bg-black text-white font-black px-5 py-2.5 rounded-full hover:scale-105 transition text-sm border border-transparent overflow-hidden group">
                <span className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-500 via-pink-500 to-cyan-400 opacity-100" style={{ padding: '2px' }}>
                  <span className="absolute inset-[2px] bg-black rounded-full" />
                </span>
                <span className="relative z-10 flex items-center gap-1">
                  TOKEN SOON ⚡
                </span>
                <span className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-500 via-pink-500 to-cyan-400 opacity-0 group-hover:opacity-30 blur-xl transition-opacity" />
              </button>
            </div>

            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="p-1 hover:opacity-80 transition-opacity lg:hidden">
                    <Avatar className="w-8 h-8 bg-gradient-to-br from-[#FFB800] to-[#FF6B00]">
                      <AvatarFallback className="bg-transparent text-white font-semibold text-sm">
                        {user.full_name?.[0]?.toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent 
                  align="end"
                  className="w-56 bg-[#1a1a1f] border-white/10 text-white"
                >
                  <div className="px-3 py-2">
                    <p className="font-medium text-white text-sm">{user.full_name || 'Streamer'}</p>
                    <p className="text-xs text-gray-400 truncate">{user.email}</p>
                  </div>
                  <DropdownMenuSeparator className="bg-white/10" />
                  <DropdownMenuItem
                    className="hover:bg-white/5 cursor-pointer text-sm"
                    onClick={handleLogout}
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <button
                onClick={() => base44.auth.redirectToLogin()}
                className="lg:hidden bg-[#FFB800] text-black px-4 py-2 rounded-full font-bold hover:bg-[#FF6B00] transition"
              >
                Login
              </button>
            )}
          </div>
        </div>
      </nav>

      <main className="flex-1 bg-transparent pt-16 md:pt-20">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="page-content"
            style={{ position: 'relative' }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>
    </motion.div>
      )}
    </>
  );
}
