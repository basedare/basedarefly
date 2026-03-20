'use client';

import React from 'react';

interface GradualBlurOverlayProps {
  intensity?: 'full' | 'light' | 'none';
  placement?: 'default' | 'lower' | 'footer-thin';
}

export default function GradualBlurOverlay({
  intensity = 'full',
  placement = 'default',
}: GradualBlurOverlayProps) {
  // Skip rendering if none
  if (intensity === 'none') return null;

  // We stack multiple layers with varying blur amounts and gradient masks.
  // "lower" starts blur further down the viewport.
  const fullLayers =
    placement === 'footer-thin'
      ? [
          { blur: '0px', maskStart: '0%', maskEnd: '86%' },
          { blur: '0.8px', maskStart: '86%', maskEnd: '91%' },
          { blur: '1.5px', maskStart: '91%', maskEnd: '95%' },
          { blur: '2.2px', maskStart: '95%', maskEnd: '100%' },
        ]
      : placement === 'lower'
        ? [
            { blur: '0px', maskStart: '0%', maskEnd: '38%' },
            { blur: '0.8px', maskStart: '38%', maskEnd: '52%' },
            { blur: '1.6px', maskStart: '52%', maskEnd: '64%' },
            { blur: '2.2px', maskStart: '64%', maskEnd: '72%' },
          ]
        : [
            { blur: '0px', maskStart: '0%', maskEnd: '30%' },
            { blur: '1px', maskStart: '30%', maskEnd: '45%' },
            { blur: '2px', maskStart: '45%', maskEnd: '55%' },
            { blur: '3px', maskStart: '55%', maskEnd: '60%' },
          ];

  const lightLayers =
    placement === 'footer-thin'
      ? [
          { blur: '0px', maskStart: '0%', maskEnd: '89%' },
          { blur: '0.75px', maskStart: '89%', maskEnd: '95%' },
          { blur: '1.2px', maskStart: '95%', maskEnd: '100%' },
        ]
      : placement === 'lower'
        ? [
            { blur: '0px', maskStart: '0%', maskEnd: '48%' },
            { blur: '0.6px', maskStart: '48%', maskEnd: '64%' },
          ]
        : [
            { blur: '0px', maskStart: '0%', maskEnd: '35%' },
            { blur: '1px', maskStart: '35%', maskEnd: '50%' },
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
