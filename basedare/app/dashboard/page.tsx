'use client';
import React from "react";
import Link from "next/link";
import { Wallet, Trophy, Target, Zap, Plus, AlertCircle } from "lucide-react";
import SubmitEvidence from "@/components/SubmitEvidence";
import Footer from "@/components/Footer";

export default function Dashboard() {
  return (
    <div className="relative min-h-screen flex flex-col">
      {/* 1. DASHBOARD OVERVIEW */}
      <div className="container mx-auto px-6 py-24 mb-12 flex-grow">
        <div className="flex flex-col md:flex-row items-end justify-between gap-6 mb-8 border-b border-white/10 pb-6">
          <h1 className="text-4xl md:text-5xl font-black uppercase italic tracking-tighter flex items-center gap-4">
            <div className="w-12 h-12 bg-[#FFD700] rounded-xl flex items-center justify-center text-black shadow-[0_0_20px_rgba(255,215,0,0.5)]">
              <Wallet className="w-6 h-6" />
            </div>
            COMMAND <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-indigo-500">CENTER</span>
          </h1>
          
          <div className="flex gap-4">
            {/* CREATE DARE BUTTON */}
            <Link href="/create">
              <button className="hidden md:flex items-center gap-2 px-6 py-3 bg-white/5 border border-white/10 rounded-lg uppercase font-bold text-xs hover:bg-white/10 hover:border-white/30 transition-all">
                <Plus className="w-4 h-4" /> Create Dare
              </button>
            </Link>
            {/* LIVE FEED BUTTON (Fixed Visibility: Neon DNA) */}
            <button className="group relative px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg border border-purple-400/50 uppercase font-black tracking-widest text-xs text-white shadow-[0_0_20px_rgba(168,85,247,0.6)] hover:scale-105 hover:shadow-[0_0_40px_rgba(168,85,247,0.8)] transition-all duration-300">
              <span className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                </span>
                LIVE FEED
              </span>
            </button>
          </div>
        </div>

        {/* USER STATS GRID */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {/* Card 1: Balance */}
          <div className="liquid-glass p-6 relative group hover:border-[#FFD700]/30 transition-colors">
            <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:opacity-50 transition-opacity z-10">
              <Wallet className="w-12 h-12 text-[#FFD700]" />
            </div>
            <div className="relative z-10 text-gray-400 font-mono text-xs uppercase tracking-widest mb-2">Wallet Balance</div>
            <div className="relative z-10 text-3xl font-black text-white">4.205 <span className="text-[#FFD700]">ETH</span></div>
            <div className="relative z-10 text-xs text-green-400 mt-2 font-mono flex items-center gap-1">
              <Zap className="w-3 h-3" /> +12% this week
            </div>
          </div>
          {/* Card 2: Active Bounties */}
          <div className="liquid-glass p-6 relative group hover:border-purple-500/30 transition-colors">
            <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:opacity-50 transition-opacity z-10">
              <Target className="w-12 h-12 text-purple-500" />
            </div>
            <div className="relative z-10 text-gray-400 font-mono text-xs uppercase tracking-widest mb-2">Active Bounties</div>
            <div className="relative z-10 text-3xl font-black text-white">3 <span className="text-purple-500">DARES</span></div>
            <div className="relative z-10 text-xs text-purple-400 mt-2 font-mono">Pending Verification</div>
          </div>
          {/* Card 3: Reputation */}
          <div className="liquid-glass p-6 relative group hover:border-blue-500/30 transition-colors">
            <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:opacity-50 transition-opacity z-10">
              <Trophy className="w-12 h-12 text-blue-500" />
            </div>
            <div className="relative z-10 text-gray-400 font-mono text-xs uppercase tracking-widest mb-2">Reputation Score</div>
            <div className="relative z-10 text-3xl font-black text-white">850 <span className="text-blue-500">PTS</span></div>
            <div className="relative z-10 text-xs text-blue-400 mt-2 font-mono">Rank: Agent</div>
          </div>
        </div>

        {/* --- ACTIVE MISSION & UPLOAD --- */}
        <div className="grid lg:grid-cols-2 gap-8 mb-24">
          
          {/* LEFT: MISSION DETAILS */}
          <div className="liquid-glass p-8 relative group">
            <div className="absolute top-0 right-0 px-4 py-2 bg-purple-500/20 text-purple-300 text-[10px] font-bold uppercase tracking-widest rounded-bl-xl border-b border-l border-purple-500/30 z-20">
              Status: In Progress
            </div>
            
            <div className="relative z-10">
              <h3 className="text-2xl font-black text-white mb-2">CURRENT MISSION</h3>
              <h2 className="text-4xl font-black text-[#FFD700] mb-6 italic">&quot;EAT THE REAPER CHIP&quot;</h2>
              
              <div className="space-y-4 font-mono text-sm text-gray-400 mb-8">
                <div className="flex justify-between border-b border-white/10 pb-2">
                  <span>BOUNTY LOCKED:</span>
                  <span className="text-white">5,000 BD</span>
                </div>
                <div className="flex justify-between border-b border-white/10 pb-2">
                  <span>TIME REMAINING:</span>
                  <span className="text-red-400 animate-pulse">01:22:45</span>
                </div>
                <div className="flex justify-between border-b border-white/10 pb-2">
                  <span>VERIFIER:</span>
                  <span className="text-blue-400">@Community_DAO</span>
                </div>
              </div>
              <div className="flex items-start gap-3 text-xs text-gray-500 bg-black/40 p-4 rounded-xl border border-white/5">
                <AlertCircle className="w-4 h-4 text-[#FFD700] shrink-0" />
                Proof must be single-take video, unedited, showing face and empty chip package.
              </div>
            </div>
          </div>

          {/* RIGHT: EVIDENCE UPLOAD */}
          <div className="bg-black/40 border border-white/10 rounded-3xl p-8 flex flex-col justify-center relative overflow-hidden">
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay pointer-events-none" />
            <div className="relative z-10">
              <SubmitEvidence />
            </div>
          </div>
        </div>
      </div>

      {/* PUSH FOOTER TO BOTTOM */}
      <div className="mt-auto">
        <Footer />
      </div>
    </div>
  );
}
