import React from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import Footer from "../components/Footer";

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-black text-white overflow-hidden">
      <style jsx global>{`
        @keyframes electricPulse {
          0%, 100% { opacity: 0.7; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.15); }
        }
        @keyframes staticFlicker {
          0% { transform: translate(1px, 1px); }
          25% { transform: translate(-1px, -1px); }
          50% { transform: translate(2px, -2px); }
          75% { transform: translate(-2px, 2px); }
        }
        @keyframes neonFlicker {
          0%, 100% { opacity: 1; }
          2% { opacity: 0.8; }
          4% { opacity: 1; }
          8% { opacity: 0.9; }
          12% { opacity: 1; }
          14% { opacity: 0.85; }
          16% { opacity: 1; }
          18% { opacity: 0.95; }
          20% { opacity: 1; }
        }
        @keyframes glareSwipe {
          0% { left: -150%; }
          100% { left: 150%; }
        }
        @keyframes floatX {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-8px) rotate(5deg); }
        }
        @keyframes badgePulse {
          0%, 100% { 
            opacity: 0.85;
            box-shadow: 0 0 20px rgba(168, 85, 247, 0.4), inset 0 1px 10px rgba(255, 255, 255, 0.1);
          }
          50% { 
            opacity: 1;
            box-shadow: 0 0 30px rgba(168, 85, 247, 0.6), inset 0 1px 15px rgba(255, 255, 255, 0.15);
          }
        }
        
        .funko-card {
          position: relative;
          border-radius: 24px;
          overflow: hidden;
          box-shadow: 
            0 0 60px rgba(192, 38, 211, 0.6),
            0 20px 60px rgba(0, 0, 0, 0.8),
            inset 0 1px 0 rgba(255, 255, 255, 0.2);
          transition: all 0.6s cubic-bezier(0.23, 1, 0.32, 1);
        }
        
        .funko-card:hover {
          transform: translateY(-12px) scale(1.03) rotateY(-8deg) rotateX(2deg);
          box-shadow: 
            0 0 100px rgba(192, 38, 211, 0.9),
            0 30px 80px rgba(0, 0, 0, 0.9),
            inset 0 1px 0 rgba(255, 255, 255, 0.3);
        }
        
        .plastic-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            135deg,
            rgba(255, 255, 255, 0.1) 0%,
            transparent 40%,
            transparent 60%,
            rgba(255, 255, 255, 0.05) 100%
          );
          pointer-events: none;
          z-index: 10;
        }
        
        .funko-card:hover .plastic-overlay {
          background: linear-gradient(
            135deg,
            rgba(255, 255, 255, 0.15) 0%,
            rgba(255, 255, 255, 0.05) 40%,
            rgba(255, 255, 255, 0.05) 60%,
            rgba(255, 255, 255, 0.1) 100%
          );
        }
        
        .glass-shimmer {
          position: absolute;
          inset: 0;
          background: 
            repeating-linear-gradient(
              0deg,
              transparent,
              transparent 3px,
              rgba(255, 255, 255, 0.02) 3px,
              rgba(255, 255, 255, 0.02) 6px
            );
          pointer-events: none;
          z-index: 11;
        }
        
        .glare-effect {
          position: absolute;
          top: 0;
          width: 40%;
          height: 100%;
          background: linear-gradient(
            90deg,
            transparent,
            rgba(255, 255, 255, 0.3) 50%,
            transparent
          );
          filter: blur(20px);
          pointer-events: none;
          z-index: 15;
          opacity: 0;
          transition: opacity 0.3s ease;
        }
        
        .funko-card:hover .glare-effect {
          opacity: 1;
          animation: glareSwipe 1.5s ease-in-out;
        }
        
        .neon-x-mini {
          animation: neonFlicker 4s infinite, floatX 5s ease-in-out infinite;
          filter: drop-shadow(0 0 8px currentColor) drop-shadow(0 0 12px currentColor);
        }
        
        .card-border {
          position: absolute;
          inset: 0;
          border: 2px solid rgba(192, 38, 211, 0.4);
          border-radius: 24px;
          pointer-events: none;
          z-index: 20;
          transition: border-color 0.3s ease;
        }
        
        .funko-card:hover .card-border {
          border-color: rgba(192, 38, 211, 0.8);
          box-shadow: inset 0 0 40px rgba(192, 38, 211, 0.3);
        }

        .collectible-badge {
          position: absolute;
          bottom: 20px;
          right: 20px;
          z-index: 30;
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          background: rgba(168, 85, 247, 0.15);
          border: 1px solid rgba(168, 85, 247, 0.3);
          border-radius: 16px;
          padding: 12px 20px;
          animation: badgePulse 4s ease-in-out infinite;
          box-shadow: 0 0 20px rgba(168, 85, 247, 0.4), inset 0 1px 10px rgba(255, 255, 255, 0.1);
        }

        .badge-text {
          font-family: 'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif;
          font-size: 0.875rem;
          font-weight: 600;
          letter-spacing: 0.5px;
          background: linear-gradient(135deg, #A855F7 0%, #EC4899 100%);
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          text-shadow: 0 0 20px rgba(168, 85, 247, 0.5);
        }

        .purple-static {
          position: absolute;
          inset: 0;
          z-index: 5;
          pointer-events: none;
          background-image: 
            radial-gradient(circle at 20% 30%, rgba(168, 85, 247, 0.03) 0%, transparent 50%),
            radial-gradient(circle at 80% 70%, rgba(236, 72, 153, 0.03) 0%, transparent 50%);
          animation: staticFlicker 0.15s steps(3) infinite;
          opacity: 0.6;
        }
      `}</style>

      {/* HERO */}
      <div className="relative">
        {/* FUNKO POP CARD DESIGN */}
        <div className="relative max-w-5xl mx-auto mt-20 md:mt-24 px-4">
          {/* ELECTRIC PURPLE AURA BACKDROP */}
          <div className="absolute inset-0 -z-10"
               style={{
                 background: 'radial-gradient(circle at center, #C026D3 0%, transparent 60%)',
                 filter: 'blur(120px)',
                 boxShadow: '0 0 300px 100px #C026D3',
                 animation: 'electricPulse 3s ease-in-out infinite'
               }} />

          {/* SUBTLE STATIC OVERLAY */}
          <div className="absolute inset-0 -z-10 opacity-30 mix-blend-screen pointer-events-none"
               style={{
                 background: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'4\' height=\'4\'%3E%3Crect width=\'4\' height=\'4\' fill=\'%23C026D3\'/%3E%3C/svg%3E")',
                 animation: 'staticFlicker 0.08s steps(2) infinite'
               }} />

          {/* FUNKO CARD CONTAINER */}
          <div className="funko-card">
            {/* Plastic Overlay */}
            <div className="plastic-overlay" />
            
            {/* Glass Shimmer Lines */}
            <div className="glass-shimmer" />
            
            {/* Purple Static Effect */}
            <div className="purple-static" />
            
            {/* Glare Effect on Hover */}
            <div className="glare-effect" />
            
            {/* Card Border */}
            <div className="card-border" />
            
            {/* BEAR IMAGE */}
            <img 
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68fdae09d2124933d726e89a/3c77cb761_nano-banana-2025-11-09T10-00-04.png"
              alt="PEEBARE"
              className="relative w-full h-auto"
            />

            {/* COLLECTIBLE BADGE */}
            <div className="collectible-badge">
              <p className="badge-text">Badge Number 069/420</p>
            </div>
            
            {/* NEON Xs SCATTERED ACROSS IMAGE */}
            
            {/* Top Left X - Purple */}
            <div className="neon-x-mini absolute top-[12%] left-[15%] w-8 h-8 md:w-12 md:h-12 pointer-events-none z-30 text-purple-400" style={{ animationDelay: '0s' }}>
              <svg viewBox="0 0 100 100" className="w-full h-full">
                <path d="M 30 30 L 70 70 M 70 30 L 30 70" 
                  stroke="currentColor" 
                  strokeWidth="8" 
                  fill="none" 
                  strokeLinecap="round"
                />
              </svg>
            </div>

            {/* Top Center X - Fuchsia */}
            <div className="neon-x-mini absolute top-[8%] left-[48%] w-6 h-6 md:w-10 md:h-10 pointer-events-none z-30 text-fuchsia-400" style={{ animationDelay: '0.5s' }}>
              <svg viewBox="0 0 100 100" className="w-full h-full">
                <path d="M 30 30 L 70 70 M 70 30 L 30 70" 
                  stroke="currentColor" 
                  strokeWidth="8" 
                  fill="none" 
                  strokeLinecap="round"
                />
              </svg>
            </div>

            {/* Top Right X - Pink */}
            <div className="neon-x-mini absolute top-[15%] right-[12%] w-7 h-7 md:w-11 md:h-11 pointer-events-none z-30 text-pink-400" style={{ animationDelay: '1s' }}>
              <svg viewBox="0 0 100 100" className="w-full h-full">
                <path d="M 30 30 L 70 70 M 70 30 L 30 70" 
                  stroke="currentColor" 
                  strokeWidth="8" 
                  fill="none" 
                  strokeLinecap="round"
                />
              </svg>
            </div>

            {/* Middle Left X - Violet */}
            <div className="neon-x-mini absolute top-[40%] left-[10%] w-9 h-9 md:w-13 md:h-13 pointer-events-none z-30 text-violet-400" style={{ animationDelay: '1.5s' }}>
              <svg viewBox="0 0 100 100" className="w-full h-full">
                <path d="M 30 30 L 70 70 M 70 30 L 30 70" 
                  stroke="currentColor" 
                  strokeWidth="8" 
                  fill="none" 
                  strokeLinecap="round"
                />
              </svg>
            </div>

            {/* Center X - Magenta (Main Eye Position) */}
            <div className="neon-x-mini absolute top-[33%] left-[38%] w-10 h-10 md:w-16 md:h-16 pointer-events-none z-30 text-fuchsia-500" style={{ animationDelay: '0.3s' }}>
              <svg viewBox="0 0 100 100" className="w-full h-full">
                <path d="M 30 30 L 70 70 M 70 30 L 30 70" 
                  stroke="currentColor" 
                  strokeWidth="10" 
                  fill="none" 
                  strokeLinecap="round"
                />
                {/* Electric ring around main X */}
                <circle cx="50" cy="50" r="40" 
                  stroke="currentColor" 
                  strokeWidth="1" 
                  fill="none"
                  strokeDasharray="3,6"
                  className="animate-spin opacity-60"
                  style={{ animationDuration: '4s' }}
                />
              </svg>
            </div>

            {/* Middle Right X - Purple */}
            <div className="neon-x-mini absolute top-[45%] right-[15%] w-7 h-7 md:w-11 md:h-11 pointer-events-none z-30 text-purple-500" style={{ animationDelay: '2s' }}>
              <svg viewBox="0 0 100 100" className="w-full h-full">
                <path d="M 30 30 L 70 70 M 70 30 L 30 70" 
                  stroke="currentColor" 
                  strokeWidth="8" 
                  fill="none" 
                  strokeLinecap="round"
                />
              </svg>
            </div>

            {/* Bottom Left X - Pink */}
            <div className="neon-x-mini absolute bottom-[25%] left-[18%] w-8 h-8 md:w-12 md:h-12 pointer-events-none z-30 text-pink-500" style={{ animationDelay: '2.5s' }}>
              <svg viewBox="0 0 100 100" className="w-full h-full">
                <path d="M 30 30 L 70 70 M 70 30 L 30 70" 
                  stroke="currentColor" 
                  strokeWidth="8" 
                  fill="none" 
                  strokeLinecap="round"
                />
              </svg>
            </div>

            {/* Bottom Center X - Fuchsia */}
            <div className="neon-x-mini absolute bottom-[20%] left-[45%] w-6 h-6 md:w-10 md:h-10 pointer-events-none z-30 text-fuchsia-400" style={{ animationDelay: '3s' }}>
              <svg viewBox="0 0 100 100" className="w-full h-full">
                <path d="M 30 30 L 70 70 M 70 30 L 30 70" 
                  stroke="currentColor" 
                  strokeWidth="8" 
                  fill="none" 
                  strokeLinecap="round"
                />
              </svg>
            </div>

            {/* Bottom Right X - Violet */}
            <div className="neon-x-mini absolute bottom-[28%] right-[20%] w-7 h-7 md:w-11 md:h-11 pointer-events-none z-30 text-violet-500" style={{ animationDelay: '3.5s' }}>
              <svg viewBox="0 0 100 100" className="w-full h-full">
                <path d="M 30 30 L 70 70 M 70 30 L 30 70" 
                  stroke="currentColor" 
                  strokeWidth="8" 
                  fill="none" 
                  strokeLinecap="round"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* REPLACE THE ENTIRE SECTION AFTER THE BEAR — full liquid-glass billionaire mode */}
        <div className="relative z-20 mt-24 md:mt-32 px-6 max-w-7xl mx-auto">
          {/* SUBTLE PURPLE ORB BEHIND TEXT */}
          <div className="absolute inset-0 -z-10 -top-40">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 md:w-[600px] md:h-[600px] 
                            bg-purple-600/20 rounded-full blur-3xl animate-pulse" />
          </div>

          {/* MAIN COPY — CLEAN & EXPENSIVE */}
          <div className="text-center">
            <h1 className="text-7xl md:text-9xl font-black tracking-tight">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-yellow-300 via-orange-400 to-yellow-500">
                WE BUILT THIS
              </span>
            </h1>
            
            <p className="mt-8 text-4xl md:text-6xl font-bold text-yellow-200">
              because farokh said:
            </p>
          </div>

          {/* FAROKH QUOTE — LIQUID GLASS CARD */}
          <div className="mt-16 max-w-4xl mx-auto">
            <div className="backdrop-blur-2xl bg-white/5 border border-white/10 rounded-3xl p-10 md:p-16 
                            shadow-2xl hover:shadow-purple-500/20 transition-shadow duration-500">
              <p className="text-4xl md:text-7xl font-black text-white text-center leading-tight italic">
                "No one would pay me $10k to drink piss on stream"
              </p>
              <p className="text-right mt-6 text-yellow-300 text-xl md:text-2xl font-medium">
                — @farokh, 72 hours ago
              </p>
            </div>
          </div>

          {/* LIVE STATS — THREE GLASS PILLS */}
          <div className="mt-20 grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {[
              { value: "$86,227", label: "CURRENT POT", color: "yellow-400" },
              { value: "21h 07m", label: "UNTIL HE DRINKS", color: "red-500" },
              { value: "69", label: "RANDOM WINNERS", color: "green-400" }
            ].map((stat) => (
              <div key={stat.label} className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl p-8 text-center 
                                          hover:bg-white/10 transition-all duration-300">
                <p className={`text-6xl md:text-7xl font-black text-${stat.color}`}>{stat.value}</p>
                <p className="text-gray-300 text-lg mt-2">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* CTA — CLEAN, CLASSY, DEADLY */}
          <div className="mt-20 mb-32 text-center">
            <Link to={createPageUrl("CreateDare")} className="group relative inline-block">
              <div className="absolute -inset-1 bg-gradient-to-r from-yellow-500 to-orange-600 rounded-full blur-lg 
                              group-hover:blur-2xl transition duration-500 opacity-75" />
              <div className="relative px-16 py-8 bg-black border-2 border-yellow-500 rounded-full 
                              text-4xl md:text-5xl font-black text-yellow-400 
                              hover:text-white hover:bg-yellow-500/20 transition-all duration-300">
                ADD $100K → FORCE HIM
              </div>
            </Link>

            <p className="mt-10 text-2xl text-gray-400 font-medium">
              6,847 degens watching live
            </p>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}