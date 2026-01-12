'use client';

import React, { useRef, useCallback } from 'react';
import './HoloProfileCard.css';

interface HoloProfileCardProps {
  rarity?: string;
}

export default function HoloProfileCard({
  // We'll use 'rare holo' as the default to apply the effect
  rarity = "rare holo"
}: HoloProfileCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  // Calculate mouse position relative to the card
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const card = cardRef.current;
    if (!card) return;

    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Calculate position as a percentage
    const posx = (x / rect.width) * 100;
    const posy = (y / rect.height) * 100;
    
    // Calculate rotation based on mouse position
    const rx = (posy - 50) / -10;
    const ry = (posx - 50) / 10;
    
    // Calculate distance from center for effect intensity
    const hyp = Math.sqrt(Math.pow(posx - 50, 2) + Math.pow(posy - 50, 2)) / 50;

    // Set CSS variables
    card.style.setProperty('--posx', `${posx}%`);
    card.style.setProperty('--posy', `${posy}%`);
    card.style.setProperty('--rx', `${rx}deg`);
    card.style.setProperty('--ry', `${ry}deg`);
    card.style.setProperty('--hyp', `${Math.min(hyp, 1)}`);
  }, []);

  // Reset rotation when mouse leaves
  const handleMouseLeave = useCallback(() => {
    const card = cardRef.current;
    if (!card) return;
    
    card.style.setProperty('--rx', '0deg');
    card.style.setProperty('--ry', '0deg');
  }, []);

  return (
    <div className="holo-container">
      <div 
        ref={cardRef} 
        className="holo-card" 
        data-rarity={rarity} 
        onMouseMove={handleMouseMove} 
        onMouseLeave={handleMouseLeave} 
      >
        <div className="holo-card__rotator">
          <div className="holo-card__front">
            {/* This layer applies the holographic effect */}
            <div className="holo-card__shine"></div>
            
            {/* Card Content - Add your content here later */}
            <div className="holo-card__content">
              <h2 className="text-2xl font-bold">Holo Card</h2>
              <p>Hover to see the effect.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}