'use client';

import React, { useMemo } from 'react';
import './BlackHolePortal.css';

interface BlackHolePortalProps {
  className?: string;
}

// Generate random number in range
const random = (min: number, max: number) => Math.random() * (max - min) + min;

// BaseDare color palette
const COLOR_PALETTES = [
  // Purple
  ['rgba(168, 85, 247, 0)', 'rgba(168, 85, 247, 0.6)', 'rgba(139, 92, 246, 1)', 'rgba(168, 85, 247, 0.6)', 'rgba(168, 85, 247, 0)'],
  // Gold
  ['rgba(255, 215, 0, 0)', 'rgba(255, 215, 0, 0.6)', 'rgba(251, 191, 36, 1)', 'rgba(255, 215, 0, 0.6)', 'rgba(255, 215, 0, 0)'],
  // Cyan
  ['rgba(34, 211, 238, 0)', 'rgba(34, 211, 238, 0.6)', 'rgba(6, 182, 212, 1)', 'rgba(34, 211, 238, 0.6)', 'rgba(34, 211, 238, 0)'],
  // Pink
  ['rgba(236, 72, 153, 0)', 'rgba(236, 72, 153, 0.6)', 'rgba(219, 39, 119, 1)', 'rgba(236, 72, 153, 0.6)', 'rgba(236, 72, 153, 0)'],
];

export default function BlackHolePortal({ className = '' }: BlackHolePortalProps) {
  // Generate light stream particles (shooting INTO the center)
  const streams = useMemo(() =>
    Array.from({ length: 100 }, (_, i) => {
      const angle = random(0, 360);
      const colorPalette = COLOR_PALETTES[Math.floor(random(0, COLOR_PALETTES.length))];
      const duration = random(2, 5);
      const delay = random(0, 4);
      const startRadius = random(280, 450); // Start from outer edge

      return {
        id: i,
        angle,
        startRadius,
        duration,
        delay,
        gradient: `linear-gradient(90deg, ${colorPalette.join(', ')})`,
        width: random(80, 200),
        height: random(2, 4),
      };
    }),
    []
  );

  return (
    <div className={`accretion-disc-container ${className}`}>
      {/* The tilted disc plane */}
      <div className="accretion-disc">
        {/* Light streams being sucked into center */}
        {streams.map((stream) => (
          <div
            key={stream.id}
            className="light-stream"
            style={{
              '--angle': `${stream.angle}deg`,
              '--start-radius': `${stream.startRadius}px`,
              '--duration': `${stream.duration}s`,
              '--delay': `${stream.delay}s`,
              '--gradient': stream.gradient,
              '--width': `${stream.width}px`,
              '--height': `${stream.height}px`,
            } as React.CSSProperties}
          />
        ))}

        {/* Inner glow ring */}
        <div className="inner-ring" />

        {/* Event horizon (dark center) */}
        <div className="event-horizon" />
      </div>

      {/* Outer glow effect */}
      <div className="outer-glow" />

      {/* Fade overlay for blending */}
      <div className="fade-overlay" />
    </div>
  );
}
