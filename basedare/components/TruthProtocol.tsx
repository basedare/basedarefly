'use client';

import React from 'react';
import { ElectricCard } from '@/components/ui/electric-card';

export default function TruthProtocol() {
  return (
    // 1. INCREASED VERTICAL PADDING (py-24 -> py-32 md:py-48)
    <section className="relative z-20 py-24 md:py-32 px-4 md:px-6 overflow-hidden">
      <div className="max-w-[1600px] mx-auto relative">
        
        {/* HEADER */}
        <div className="text-center mb-16 md:mb-24 relative z-10">
          <h2 className="text-4xl md:text-6xl font-black italic uppercase tracking-tighter text-white mb-6">
            THE <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400">TRUTH PROTOCOL</span>
          </h2>
          <p className="text-gray-400 font-mono text-sm md:text-base uppercase tracking-widest">
            Zero-Knowledge Verification • On-Chain Settlement • Base L2
          </p>
        </div>

        {/* CARDS GRID */}
        {/* Mobile: Simple static cards */}
        <div className="md:hidden space-y-6">
          <div className="p-8 bg-black/50 border border-white/10 rounded-2xl backdrop-blur-sm">
            <p className="text-purple-400 font-bold uppercase text-sm tracking-widest">01 // PROOF</p>
            <h3 className="text-2xl font-black italic mt-4 text-white">VERIFICATION</h3>
            <p className="text-gray-400 mt-4 text-sm leading-relaxed">zkML Sentinel analyzes stream frames to provide mathematically certain proof of completion.</p>
          </div>
          
          <div className="p-8 bg-black/50 border border-white/10 rounded-2xl backdrop-blur-sm">
            <p className="text-[#FACC15] font-bold uppercase text-sm tracking-widest">02 // ESCROW</p>
            <h3 className="text-2xl font-black italic mt-4 text-white">SETTLEMENT</h3>
            <p className="text-gray-400 mt-4 text-sm leading-relaxed">Funds released instantly via smart contracts upon verification. Code is law.</p>
          </div>
          
          <div className="p-8 bg-black/50 border border-white/10 rounded-2xl backdrop-blur-sm">
            <p className="text-cyan-400 font-bold uppercase text-sm tracking-widest">03 // SCALE</p>
            <h3 className="text-2xl font-black italic mt-4 text-white">NETWORK</h3>
            <p className="text-gray-400 mt-4 text-sm leading-relaxed">Immutable, low-fee execution powered by Base L2, secured by Ethereum mainnet.</p>
          </div>
        </div>

        {/* Desktop: Full electric cards */}
        <div className="hidden md:grid md:grid-cols-2 xl:grid-cols-3 gap-8 justify-center items-start">
          
          {/* Card 1: Purple */}
          <div className="flex justify-center w-full">
            <ElectricCard 
              variant="hue" 
              color="#A855F7"
              badge="01 // PROOF"
              title="VERIFICATION"
              description="zkML Sentinel analyzes stream frames to provide mathematically certain proof of completion."
              width="100%"
              aspectRatio="3/4"
              className="w-full max-w-[450px]"
            />
          </div>

          {/* Card 2: Yellow */}
          <div className="flex justify-center w-full">
            <ElectricCard 
              variant="hue" 
              color="#FACC15"
              badge="02 // ESCROW"
              title="SETTLEMENT"
              description="Funds released instantly via smart contracts upon verification. Code is law."
              width="100%"
              aspectRatio="3/4"
              className="w-full max-w-[450px]"
            />
          </div>

          {/* Card 3: Blue */}
          <div className="flex justify-center w-full">
            <ElectricCard 
              variant="hue" 
              color="#3B82F6"
              badge="03 // SCALE"
              title="NETWORK"
              description="Immutable, low-fee execution powered by Base L2, secured by Ethereum mainnet."
              width="100%"
              aspectRatio="3/4"
              className="w-full max-w-[450px]"
            />
          </div>

        </div>
      </div>
    </section>
  );
}
