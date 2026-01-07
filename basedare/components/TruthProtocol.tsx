'use client';

import React from 'react';
import { ElectricCard } from '@/components/ui/electric-card';

export default function TruthProtocol() {
  return (
    // 1. INCREASED VERTICAL PADDING (py-24 -> py-32 md:py-48)
    <section className="relative z-20 py-24 md:py-48 px-6 overflow-hidden">
      <div className="max-w-7xl mx-auto relative">
        
        {/* HEADER */}
        <div className="text-center mb-20 md:mb-24 relative z-10">
          <h2 className="text-4xl md:text-6xl font-black italic uppercase tracking-tighter text-white mb-6">
            THE <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400">TRUTH PROTOCOL</span>
          </h2>
          <p className="text-gray-400 font-mono text-sm md:text-base uppercase tracking-widest">
            Zero-Knowledge Verification • On-Chain Settlement • Base L2
          </p>
        </div>

        {/* CARDS GRID */}
        {/* Increased gap (gap-10) and alignment */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-10 justify-center items-start">
          
          {/* Card 1: Purple - Cosmos Variant */}
          <div className="flex justify-center w-full">
            <ElectricCard 
              variant="cosmos" 
              color="#d946ef" // Magenta/Fuchsia accent looks best with the nebula
              badge="01 // PROOF"
              title="VERIFICATION"
              description="zkML Sentinel analyzes stream frames to provide mathematically certain proof of completion."
              width="100%"
              aspectRatio="3/4"
              className="max-w-[480px]" // <--- 20% bigger (Was 400px)
            />
          </div>

          {/* Card 2: Yellow (Hue variant = Smooth) */}
          <div className="flex justify-center w-full">
            <ElectricCard 
              variant="hue" 
              color="#FACC15" // Yellow
              badge="02 // ESCROW"
              title="SETTLEMENT"
              description="Funds released instantly via smart contracts upon verification. Code is law."
              width="100%"
              aspectRatio="3/4"
              className="max-w-[400px]" // <--- UPGRADED SIZE
            />
          </div>

          {/* Card 3: Blue */}
          <div className="flex justify-center w-full">
            <ElectricCard 
              variant="hue" 
              color="#3B82F6" // Blue
              badge="03 // SCALE"
              title="NETWORK"
              description="Immutable, low-fee execution powered by Base L2, secured by Ethereum mainnet."
              width="100%"
              aspectRatio="3/4"
              className="max-w-[400px]" // <--- UPGRADED SIZE
            />
          </div>

        </div>
      </div>
    </section>
  );
}
