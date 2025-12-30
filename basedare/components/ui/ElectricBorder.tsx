'use client';

import React, { useId } from 'react';

interface ElectricBorderProps {
  children: React.ReactNode;
  color?: string;
  speed?: number;
  thickness?: number;
  chaos?: number;
  className?: string;
}

export default function ElectricBorder({
  children,
  color = "#A855F7",
  speed = 1,
  thickness = 2,
  chaos = 0.7, // Slightly increased chaos for better visibility
  className = "",
}: ElectricBorderProps) {
  const filterId = useId();
  
  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      {/* THE ELECTRIC LAYER 
         - overflow-visible: Vital to stop the "cutout" look.
         - inset: Negative margin ensures the spikes have room to jitter.
      */}
      <div className="absolute -inset-4 pointer-events-none z-0 overflow-visible">
        <svg className="w-full h-full overflow-visible" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id={filterId} x="-50%" y="-50%" width="200%" height="200%">
              <feTurbulence
                type="fractalNoise"
                baseFrequency={chaos} 
                numOctaves="4"
                stitchTiles="stitch"
                result="noise"
              >
                <animate
                  attributeName="baseFrequency"
                  values={`${chaos}; ${chaos + 0.02}; ${chaos - 0.02}; ${chaos}`}
                  dur={`${0.1 / speed}s`}
                  repeatCount="indefinite"
                />
              </feTurbulence>
              <feDisplacementMap
                in="SourceGraphic"
                in2="noise"
                scale={thickness * 4} // Scale determines spike height
              />
            </filter>
          </defs>
          
          {/* The Border Path - Calculated to hug the content */}
          <rect
            x="16" y="16" // Matches the -inset-4 (16px) offset
            width="calc(100% - 32px)" 
            height="calc(100% - 32px)"
            fill="none"
            stroke={color}
            strokeWidth={thickness}
            rx="9999" // Force Pill Shape
            ry="9999"
            filter={`url(#${filterId})`}
            strokeLinecap="round"
          />
        </svg>
      </div>

      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}
