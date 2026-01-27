'use client';

import React from 'react';

interface GradualBlurOverlayProps {
  intensity?: 'full' | 'light' | 'none';
}

export default function GradualBlurOverlay({ intensity = 'full' }: GradualBlurOverlayProps) {
  // Skip rendering if none
  if (intensity === 'none') return null;

  // We stack multiple layers with varying blur amounts and gradient masks
  // This creates a smooth "fade to blur" effect - stops at 60% to keep footer readable
  const fullLayers = [
    { blur: '0px',   maskStart: '0%', maskEnd: '30%' },
    { blur: '1px',   maskStart: '30%', maskEnd: '45%' },
    { blur: '2px',   maskStart: '45%', maskEnd: '55%' },
    { blur: '3px',   maskStart: '55%', maskEnd: '60%' },
  ];

  // Light version - much subtler blur, ends at 50%
  const lightLayers = [
    { blur: '0px',   maskStart: '0%', maskEnd: '35%' },
    { blur: '1px',   maskStart: '35%', maskEnd: '50%' },
  ];

  const layers = intensity === 'light' ? lightLayers : fullLayers;

  return (
    <div className="gradual-blur-container">
      <style jsx>{`
        .gradual-blur-container {
          position: fixed;
          inset: 0;
          z-index: 10;
          pointer-events: none;
          isolation: isolate; 
          /* GPU OPTIMIZATION: */
          transform: translateZ(0);
          will-change: transform;
        }
        
        .blur-layer {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          /* GPU OPTIMIZATION: */
          transform: translateZ(0);
          will-change: backdrop-filter, transform;
        }
      `}</style>

      {layers.map((layer, i) => (
        <div
          key={i}
          className="blur-layer"
          style={{
            backdropFilter: `blur(${layer.blur})`,
            WebkitBackdropFilter: `blur(${layer.blur})`,
            maskImage: `linear-gradient(to bottom, transparent ${layer.maskStart}, black ${layer.maskEnd})`,
            WebkitMaskImage: `linear-gradient(to bottom, transparent ${layer.maskStart}, black ${layer.maskEnd})`,
          }}
        />
      ))}
    </div>
  );
}