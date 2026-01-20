'use client';

import React from 'react';
import BubbleCard from '@/components/BubbleCard';
import Shuffle from '@/components/Shuffle';

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
          <h2 className="text-4xl md:text-6xl font-display font-black italic uppercase tracking-tighter text-white mb-6">
            <span className="mr-3">THE</span>
            <Shuffle
              text="TRUTH"
              tag="span"
              className="text-[#FACC15] inline-block mr-3"
              duration={0.8}
              stagger={0.03}
              shuffleTimes={4}
              triggerOnHover={true}
            />
            <Shuffle
              text="PROTOCOL"
              tag="span"
              className="text-[#A855F7] inline-block"
              duration={0.8}
              stagger={0.03}
              shuffleTimes={4}
              triggerOnHover={true}
            />
          </h2>
          <Shuffle
            text="Zero-Knowledge Verification • On-Chain Settlement • Base L2"
            tag="p"
            className="text-gray-400 font-mono text-sm uppercase tracking-widest"
            duration={0.6}
            stagger={0.01}
            shuffleTimes={2}
            triggerOnHover={true}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {staticCards.map((card) => (
            <BubbleCard
              key={card.id}
              color={card.color}
              badge={card.badge}
              title={card.title}
              description={card.description}
              className="w-full max-w-[280px] mx-auto"
            />
          ))}
        </div>
      </div>
    </section>
  );
}
