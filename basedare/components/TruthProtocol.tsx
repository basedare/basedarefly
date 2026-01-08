'use client';

import React from 'react';
import { ElectricCard } from '@/components/ui/electric-card';

interface Dare {
  id: string;
  description: string;
  stake_amount: number;
  streamer_name?: string;
  status: string;
  video_url?: string;
  expiry_timer?: string;
}

interface TruthProtocolProps {
  dares?: Dare[];
  onCardClick?: (dare: Dare) => void;
}

export default function TruthProtocol({ dares = [], onCardClick }: TruthProtocolProps) {
  const liveDares = dares.slice(0, 3);
  
  const staticCards = [
    {
      id: 'static-1',
      badge: '01 // PROOF',
      title: 'VERIFICATION',
      description: 'zkML Sentinel analyzes stream frames to provide mathematically certain proof of completion.',
      color: '#A855F7'
    },
    {
      id: 'static-2',
      badge: '02 // ESCROW',
      title: 'SETTLEMENT',
      description: 'Funds released instantly via smart contracts upon verification. Code is law.',
      color: '#FACC15'
    },
    {
      id: 'static-3',
      badge: '03 // SCALE',
      title: 'NETWORK',
      description: 'Immutable, low-fee execution powered by Base L2, secured by Ethereum mainnet.',
      color: '#3B82F6'
    }
  ];

  const displayCards = liveDares.length > 0 ? liveDares : staticCards;
  const isLiveData = liveDares.length > 0;

  return (
    <section className="relative z-20 py-24 md:py-32 px-4 md:px-6 overflow-hidden">
      <div className="max-w-[1600px] mx-auto relative">
        
        <div className="text-center mb-16 md:mb-24 relative z-10">
          <h2 className="text-4xl md:text-6xl font-black italic uppercase tracking-tighter text-white mb-6">
            THE <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400">TRUTH PROTOCOL</span>
          </h2>
          <p className="text-gray-400 font-mono text-sm md:text-base uppercase tracking-widest">
            {isLiveData 
              ? `${liveDares.length} LIVE DARES • SENTINEL ACTIVE • BASE L2`
              : 'Zero-Knowledge Verification • On-Chain Settlement • Base L2'
            }
          </p>
        </div>

        <div className="md:hidden space-y-6">
          {displayCards.map((item, idx) => {
            const isLive = 'stake_amount' in item;
            return (
              <div 
                key={item.id}
                onClick={() => isLive && onCardClick && onCardClick(item as Dare)}
                className={`p-8 bg-black/50 border border-white/10 rounded-2xl backdrop-blur-sm ${
                  isLive ? 'cursor-pointer hover:border-purple-500/50 transition-colors' : ''
                }`}
              >
                <p className="text-purple-400 font-bold uppercase text-sm tracking-widest">
                  {isLive ? `LIVE DARE #${idx + 1}` : (item as any).badge}
                </p>
                <h3 className="text-2xl font-black italic mt-4 text-white">
                  {isLive ? (item as Dare).description : (item as any).title}
                </h3>
                <p className="text-gray-400 mt-4 text-sm leading-relaxed">
                  {isLive 
                    ? `${(item as Dare).stake_amount} USDC • ${(item as Dare).streamer_name || '@Anon'} • ${(item as Dare).status}`
                    : (item as any).description
                  }
                </p>
                {isLive && (
                  <button className="mt-6 px-6 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold uppercase text-xs tracking-wider rounded-lg transition-colors">
                    VERIFY REALITY
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <div className="hidden md:grid md:grid-cols-2 xl:grid-cols-3 gap-8 justify-center items-start">
          {displayCards.map((item, idx) => {
            const isLive = 'stake_amount' in item;
            const colors = ['#A855F7', '#FACC15', '#3B82F6'];
            
            return (
              <div key={item.id} className="flex justify-center w-full">
                <ElectricCard 
                  variant="hue" 
                  color={isLive ? colors[idx % 3] : (item as any).color}
                  badge={isLive ? `LIVE #${idx + 1}` : (item as any).badge}
                  title={isLive ? (item as Dare).description : (item as any).title}
                  description={
                    isLive 
                      ? `${(item as Dare).stake_amount} USDC | ${(item as Dare).streamer_name || '@Anon'} | ${(item as Dare).status}`
                      : (item as any).description
                  }
                  width="100%"
                  aspectRatio="3/4"
                  className="w-full max-w-[450px] cursor-pointer"
                  onClick={() => isLive && onCardClick && onCardClick(item as Dare)}
                />
                {isLive && (
                  <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        onCardClick && onCardClick(item as Dare);
                      }}
                      className="px-8 py-3 bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white font-black uppercase text-sm tracking-wider rounded-xl transition-all duration-300 shadow-lg hover:shadow-purple-500/50"
                    >
                      VERIFY REALITY
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {isLiveData && (
          <div className="mt-12 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-500/10 border border-green-500/30 rounded-full">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-green-400 font-mono text-xs uppercase tracking-wider">
                SENTINEL ONLINE • MONITORING {liveDares.length} DARES
              </span>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}