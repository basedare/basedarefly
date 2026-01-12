'use client';

import React from 'react';
import { ElectricCard } from '@/components/ui/electric-card';

export default function TruthProtocol() {
  const staticCards = [
    {
      id: 'verification',
      badge: '01 // PROOF',
      title: 'VERIFICATION',
      description: 'zkML Sentinel analyzes stream frames to provide mathematically certain proof of completion.',
      color: '#A855F7'
    },
    {
      id: 'settlement',
      badge: '02 // ESCROW',
      title: 'SETTLEMENT',
      description: 'Funds released instantly via smart contracts upon verification. Code is law.',
      color: '#FACC15'
    },
    {
      id: 'network',
      badge: '03 // SCALE',
      title: 'NETWORK',
      description: 'Immutable, low-fee execution powered by Base L2, secured by Ethereum mainnet.',
      color: '#3B82F6'
    }
  ];

  return (
    <section className="relative z-20 py-24 px-4 md:px-6 overflow-hidden">
      <div className="max-w-[1600px] mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-6xl font-black italic uppercase tracking-tighter text-white mb-6">
            THE <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400">TRUTH PROTOCOL</span>
          </h2>
          <p className="text-gray-400 font-mono text-sm uppercase tracking-widest">
            Zero-Knowledge Verification • On-Chain Settlement • Base L2
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {staticCards.map((card) => (
            <ElectricCard 
              key={card.id}
              variant="hue"
              color={card.color}
              badge={card.badge}
              title={card.title}
              description={card.description}
              className="w-full md:w-auto max-w-full md:max-w-[600px]"
            />
          ))}
        </div>
      </div>
    </section>
  );
}