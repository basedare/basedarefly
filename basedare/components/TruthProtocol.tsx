'use client';

import React from 'react';
import BubbleCard from '@/components/BubbleCard';
import HowItWorksSignalWires from '@/components/HowItWorksSignalWires';
import Shuffle from '@/components/Shuffle';
import './HowItWorksSignalWires.css';

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
    },
    {
      id: 'location',
      badge: '04 // FORT',
      title: 'LOCATION',
      description: 'Venue anchors and nearby proof turn dares into place-bound missions with real-world context.',
      color: '#22D3EE'
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
            className="inline-flex max-w-fit items-center justify-center bd-dent-surface bd-dent-surface--soft rounded-full border border-white/[0.08] px-5 py-3 text-gray-400 font-mono text-sm uppercase tracking-widest"
            duration={0.6}
            stagger={0.01}
            shuffleTimes={2}
            triggerOnHover={true}
          />
        </div>

        <div className="truth-protocol-wire-shell relative max-w-[1400px] mx-auto overflow-visible px-0 sm:px-2 md:px-4 2xl:px-0">
          <div className="pointer-events-none absolute inset-0 hidden overflow-hidden 2xl:block">
            <HowItWorksSignalWires foundationRatio={0.58} />
          </div>
          <div className="relative z-10 grid grid-cols-1 justify-items-center gap-6 md:grid-cols-2 2xl:grid-cols-4 2xl:gap-8">
          {staticCards.map((card) => (
            <div key={card.id} data-cable-node className="relative z-10 w-full max-w-[300px]">
              <BubbleCard
                color={card.color}
                badge={card.badge}
                title={card.title}
                description={card.description}
                className="w-full max-w-[300px] mx-auto"
              />
            </div>
          ))}
          </div>
        </div>
      </div>
    </section>
  );
}
