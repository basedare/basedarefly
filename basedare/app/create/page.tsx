'use client';
import React, { useState } from "react";
import { Zap, Wallet, Clock, Users, ChevronRight } from "lucide-react";
import DareGenerator from "@/components/DareGenerator";
import GradualBlurOverlay from "@/components/GradualBlurOverlay";

export default function CreateDare() {
  const [mission, setMission] = useState("");

  return (
    <div className="relative min-h-screen flex flex-col py-24 px-4 md:px-8">
      {/* Gradual Blur Overlay */}
      <div className="fixed inset-0 z-10 pointer-events-none"><GradualBlurOverlay /></div>
      
      <div className="container mx-auto px-6 relative z-10 max-w-4xl flex-grow">
        
        {/* HEADER */}
        <div className="text-center mb-12">
          <h1 className="text-5xl md:text-7xl font-black uppercase italic tracking-tighter mb-4">
            INIT <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FFD700] to-orange-500">PROTOCOL</span>
          </h1>
          <p className="text-gray-400 font-mono tracking-widest uppercase text-xs md:text-sm">
            Deploy a new smart contract dare on Base L2
          </p>
        </div>

        {/* FORM */}
        <div className="backdrop-blur-xl bg-black/10 border border-white/10 rounded-3xl p-8 md:p-12 shadow-[0_0_50px_rgba(168,85,247,0.15)] relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#FFD700] to-transparent opacity-50" />
          <div className="space-y-12">
            
            {/* 1. TARGET */}
            <div className="space-y-4">
              <label className="flex items-center gap-3 text-sm font-bold text-purple-400 uppercase tracking-widest">
                <Users className="w-4 h-4" /> Target Identity
              </label>
              <input 
                placeholder="@xQc, @KaiCenat, or 0xWallet..." 
                className="w-full h-16 backdrop-blur-md bg-black/10 border border-white/10 text-xl font-bold text-white placeholder:text-gray-600 rounded-xl pl-6 focus:border-purple-500 focus:outline-none transition-colors"
              />
            </div>

            {/* 2. MISSION */}
            <div className="space-y-4">
              <div className="flex justify-between items-end">
                <label className="flex items-center gap-3 text-sm font-bold text-purple-400 uppercase tracking-widest">
                  <Zap className="w-4 h-4" /> Mission Objective
                </label>
                <span className="text-[10px] text-gray-500 font-mono">STUCK? USE AI ASSIST</span>
              </div>
              <DareGenerator onSelect={(text) => setMission(text)} />
              <textarea 
                value={mission}
                onChange={(e) => setMission(e.target.value)}
                placeholder="Describe the dare in detail..." 
                className="w-full min-h-[150px] backdrop-blur-md bg-black/10 border border-white/10 text-lg text-white placeholder:text-gray-600 rounded-xl p-6 focus:border-purple-500 focus:outline-none transition-colors resize-none font-mono"
              />
            </div>

            {/* 3. BOUNTY & TIME */}
            <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <label className="flex items-center gap-3 text-sm font-bold text-[#FFD700] uppercase tracking-widest">
                  <Wallet className="w-4 h-4" /> Total Bounty
                </label>
                <div className="relative">
                  <input 
                    type="number" 
                    placeholder="0.00 ETH" 
                    className="w-full h-16 backdrop-blur-md bg-black/10 border border-white/10 text-2xl font-black text-[#FFD700] placeholder:text-gray-700 rounded-xl pl-6 focus:border-[#FFD700] focus:outline-none"
                  />
                  <span className="absolute right-6 top-1/2 -translate-y-1/2 text-xs font-mono text-gray-500">
                    ~$0.00 USD
                  </span>
                </div>
              </div>
              <div className="space-y-4">
                <label className="flex items-center gap-3 text-sm font-bold text-blue-400 uppercase tracking-widest">
                  <Clock className="w-4 h-4" /> Time Limit
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <input 
                    placeholder="24" 
                    className="w-full h-16 backdrop-blur-md bg-black/10 border border-white/10 text-xl font-bold text-white text-center rounded-xl focus:border-blue-500 focus:outline-none" 
                  />
                  <select className="h-16 backdrop-blur-md bg-black/10 border border-white/10 text-white rounded-xl px-4 focus:border-blue-500 focus:outline-none font-bold uppercase cursor-pointer">
                    <option>Hours</option>
                    <option>Days</option>
                    <option>Weeks</option>
                  </select>
                </div>
              </div>
            </div>

            {/* DEPLOY BUTTON */}
            <div className="pt-6">
              <button className="w-full h-20 text-2xl font-black uppercase tracking-widest bg-[#FFD700] text-black hover:bg-[#FFD700] hover:scale-[1.01] hover:shadow-[0_0_40px_rgba(255,215,0,0.4)] transition-all rounded-xl relative overflow-hidden group flex items-center justify-center gap-3">
                <div className="absolute inset-0 bg-white/40 translate-y-full group-hover:translate-y-0 transition-transform duration-300 skew-y-12 pointer-events-none" />
                <span className="relative">Deploy Contract</span>
                <ChevronRight className="w-8 h-8 relative" />
              </button>
              <p className="text-center text-[10px] text-gray-500 font-mono mt-4 uppercase">
                * Gas fees apply. Smart contract is immutable once deployed.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
