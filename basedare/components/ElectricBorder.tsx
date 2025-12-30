'use client';

import React, { useId } from 'react';

interface ElectricBorderProps {
  children: React.ReactNode;
  color?: string;
  speed?: number;
  thickness?: number;
  className?: string;
}

export default function ElectricBorder({
  children,
  color = "#FACC15", // Default to Toxic Gold
  speed = 1,
  thickness = 2,
  className = "",
}: ElectricBorderProps) {
  const filterId = useId();
  
  return (
    <div className={`relative inline-block ${className}`} style={{ padding: thickness }}>
      {/* The Electric SVG Filter Layer */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id={filterId}>
              {/* Turbulence creates the noise/jitter */}
              <feTurbulence
                type="fractalNoise"
                baseFrequency="2.5" // High frequency = jagged electric look
                numOctaves="5"
                stitchTiles="stitch"
                result="noise"
              >
                {/* Animate the seed to make it "crackle" */}
                <animate
                  attributeName="baseFrequency"
                  values="2.5; 2.55; 2.45; 2.5"
                  dur={`${0.1 / speed}s`}
                  repeatCount="indefinite"
                />
              </feTurbulence>
              {/* Displacement maps the noise to the source graphic */}
              <feDisplacementMap
                in="SourceGraphic"
                in2="noise"
                scale="3" // How far the distortion goes
              />
            </filter>
          </defs>
          
          {/* The Border Rectangle */}
          <rect
            x={thickness / 2}
            y={thickness / 2}
            width="100%"
            height="100%"
            fill="none"
            stroke={color}
            strokeWidth={thickness}
            rx="9999" // Full rounding for pill shape
            ry="9999"
            filter={`url(#${filterId})`}
            style={{
                width: `calc(100% - ${thickness}px)`,
                height: `calc(100% - ${thickness}px)`
            }}
          />
        </svg>
      </div>

      {/* Inner Glow to sell the effect */}
      <div className="absolute inset-0 rounded-full opacity-50" style={{ boxShadow: `0 0 15px ${color}` }}></div>

      {/* The Button Content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}

