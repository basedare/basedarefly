'use client';

import React, { useState, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { ConnectWallet } from '@coinbase/onchainkit/wallet';
import './InfiniteMenu.css';
import CircularGallery from './CircularGallery';

interface InfiniteMenuProps {
  items: any[];
  onStake?: (id: string) => void;
}

export default function InfiniteMenu({ items = [], onStake }: InfiniteMenuProps) {
  const { isConnected } = useAccount();
  const [activeItem, setActiveItem] = useState<any | null>(null);

  const handleCenter = useCallback((item: any) => {
    setActiveItem((prev: any) => (prev?.id === item.id ? prev : item));
  }, []);

  const handleAction = () => {
    if (activeItem && isConnected && onStake) {
      onStake(activeItem.id);
    }
  };

  return (
    <div id="infinite-grid-menu-canvas">
      
      {/* DESKTOP: Glassmorphism Title Card */}
      <div className={`face-title ${activeItem ? 'active' : 'inactive'}`}>
        {activeItem?.title || "SELECT TARGET"}
      </div>

      {/* DESKTOP: Glassmorphism Stats Card */}
      <div className={`face-description ${activeItem ? 'active' : 'inactive'}`}>
        {activeItem?.description ??
          `${activeItem?.bounty ?? '0'} USDC • @${activeItem?.streamer ?? '---'}`}
      </div>

      {/* Liquid Gradient Action Button */}
      <div className={`action-button ${activeItem ? 'active' : 'inactive'}`}>
        {!isConnected ? (
          // Invisible Coinbase Smart Wallet
          <div className="w-full h-full absolute inset-0 opacity-0 cursor-pointer overflow-hidden rounded-full z-30">
            <ConnectWallet className="w-full h-full scale-[3]" />
          </div>
        ) : (
          // Visible Stake Button
          <button
            onClick={handleAction}
            className="w-full h-full absolute inset-0 z-20 flex items-center justify-center bg-transparent border-none cursor-pointer"
            aria-label="Stake on this dare"
          >
            <svg
              width="36"
              height="36"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]"
            >
              <path
                d="M13 2L3 14H12L11 22L21 10H12L13 2Z"
                fill="white"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        )}
        
        {/* Visual Icon (shows under invisible wallet connect) */}
        {!isConnected && (
          <span className="action-button-icon pointer-events-none">⚡</span>
        )}
      </div>

      {/* The 3D WebGL Drum */}
      <CircularGallery
        items={items}
        onCenter={handleCenter}
        bend={2.5}
        textColor="#ffffff"
        borderRadius={0.08}
        scrollSpeed={2}
        scrollEase={0.07}
      />
      
    </div>
  );
}
