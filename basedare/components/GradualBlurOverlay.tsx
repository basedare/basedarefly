'use client';

import React from 'react';

export default function GradualBlurOverlay() {
  // We stack multiple layers with varying blur amounts and gradient masks
  // This creates a smooth "fade to blur" effect from top to bottom
  // Reduced blur intensity for better visibility
  const layers = [
    { blur: '0px',   maskStart: '0%', maskEnd: '40%' }, // Clear at top (extended)
    { blur: '1px',   maskStart: '40%', maskEnd: '60%' },
    { blur: '2px',   maskStart: '60%', maskEnd: '75%' },
    { blur: '4px',   maskStart: '75%', maskEnd: '90%' },
    { blur: '6px',   maskStart: '90%', maskEnd: '100%' }, // Much lighter blur at bottom
  ];

  return (
    <div className="gradual-blur-container">
      <style jsx>{`
        .gradual-blur-container {
          position: fixed;
          inset: 0;
          z-index: 10; /* Sits above background, but below main content */
          pointer-events: none;
          /* Optimization: Isolates render layer */
          isolation: isolate; 
        }
        
        .blur-layer {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          /* Force GPU acceleration for smooth scrolling */
          will-change: backdrop-filter;
        }
      `}</style>

      {layers.map((layer, i) => (
        <div
          key={i}
          className="blur-layer"
          style={{
            backdropFilter: `blur(${layer.blur})`,
            WebkitBackdropFilter: `blur(${layer.blur})`,
            // The mask creates the transition area for this specific blur amount
            maskImage: `linear-gradient(to bottom, transparent ${layer.maskStart}, black ${layer.maskEnd})`,
            WebkitMaskImage: `linear-gradient(to bottom, transparent ${layer.maskStart}, black ${layer.maskEnd})`,
          }}
        />
      ))}
    </div>
  );
}


