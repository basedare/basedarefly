'use client';

import React, { useEffect, useState } from 'react';
import BubbleCard from '@/components/BubbleCard';
import HowItWorksSignalWires from '@/components/HowItWorksSignalWires';
import './HowItWorksSignalWires.css';

export default function TruthProtocol() {
  const [solidMode, setSolidMode] = useState(true);
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
      badge: '04 // PLACE',
      title: 'LOCATION',
      description: 'Venue anchors and nearby proof turn dares into place-bound missions with real-world context.',
      color: '#22D3EE'
    }
  ];

  useEffect(() => {
    const mediaQuery = window.matchMedia('(min-width: 768px) and (prefers-reduced-motion: no-preference)');
    const syncMode = () => setSolidMode(!mediaQuery.matches);

    syncMode();

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', syncMode);
      return () => mediaQuery.removeEventListener('change', syncMode);
    }

    mediaQuery.addListener(syncMode);
    return () => mediaQuery.removeListener(syncMode);
  }, []);

  return (
    <section className="relative z-20 overflow-hidden px-4 py-14 md:px-6 md:py-24">
      <div className="max-w-[1600px] mx-auto">
        <div className="mb-10 text-center md:mb-16">
          {solidMode ? (
            <>
              <h2 className="mb-5 text-3xl font-black uppercase italic leading-none tracking-tight text-white md:text-6xl md:tracking-tighter">
                <span className="mr-2">THE</span>
                <span className="mr-2 text-[#FACC15]">TRUTH</span>
                <span className="text-[#A855F7]">PROTOCOL</span>
              </h2>
              <p className="mx-auto inline-flex max-w-[22rem] items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.035] px-4 py-2 text-center font-mono text-[10px] uppercase tracking-[0.16em] text-gray-400 md:max-w-fit md:px-5 md:py-3 md:text-sm md:tracking-widest">
                Presence proof · QR checks · settlement
              </p>
            </>
          ) : (
            <>
              <h2 className="text-4xl md:text-6xl font-display font-black italic uppercase tracking-tighter text-white mb-6">
                <span className="mr-3">THE</span>
                <span className="mr-3 inline-block text-[#FACC15]">TRUTH</span>
                <span className="inline-block text-[#A855F7]">PROTOCOL</span>
              </h2>
              <p className="inline-flex max-w-fit items-center justify-center bd-dent-surface bd-dent-surface--soft rounded-full border border-white/[0.08] px-5 py-3 text-gray-400 font-mono text-sm uppercase tracking-widest">
                Zero-Knowledge Verification • On-Chain Settlement • Base L2
              </p>
            </>
          )}
        </div>

        {solidMode ? (
          <div className="mx-auto grid max-w-[1100px] gap-3 sm:grid-cols-2">
            {staticCards.map((card) => (
              <div
                key={card.id}
                className="relative overflow-hidden rounded-[22px] border bg-[linear-gradient(180deg,rgba(255,255,255,0.055)_0%,rgba(8,8,14,0.9)_100%)] px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),inset_0_-10px_16px_rgba(0,0,0,0.22)]"
                style={{ borderColor: `color-mix(in srgb, ${card.color} 16%, rgba(255,255,255,0.08))` }}
              >
                {/* Persistent per-step color wash + top accent (matches BubbleCard) */}
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0"
                  style={{
                    background: `radial-gradient(circle 120px at 16% -8%, color-mix(in srgb, ${card.color} 18%, transparent) 0%, transparent 60%)`,
                  }}
                />
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-4 top-0 h-0.5 rounded-b-[3px]"
                  style={{ background: `linear-gradient(90deg, transparent, ${card.color}, transparent)`, opacity: 0.6 }}
                />
                <p className="relative text-[10px] font-black uppercase tracking-[0.18em] text-white/38">{card.badge}</p>
                <h3 className="mt-3 text-lg font-black text-white" style={{ color: card.color }}>
                  {card.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-white/54">{card.description}</p>
              </div>
            ))}
          </div>
        ) : (
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
        )}
      </div>
    </section>
  );
}
