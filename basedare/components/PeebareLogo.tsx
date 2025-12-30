"use client";

import React from 'react';

interface PeebareLogoProps {
  size?: number;
}

export default function PeebareLogo({ size = 40 }: PeebareLogoProps) {
  return (
    <div className="relative inline-block" style={{ width: size, height: size }}>
      <style jsx>{`
        @keyframes pee-drip {
          0%, 100% { transform: translateY(0) scaleY(1); opacity: 1; }
          50% { transform: translateY(8px) scaleY(1.5); opacity: 0.7; }
        }

        .pee-drip {
          animation: pee-drip 2s ease-in-out infinite;
        }

        @keyframes x-eye-pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }

        .x-eye {
          animation: x-eye-pulse 1.5s ease-in-out infinite;
          transform-origin: 42px 47px; /* Centered on the eye */
        }
      `}</style>
      
      {/* Bear Head */}
      <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Left Ear */}
        <circle cx="25" cy="25" r="18" fill="#FFB800" stroke="#FF6B00" strokeWidth="3"/>
        
        {/* Right Ear */}
        <circle cx="75" cy="25" r="18" fill="#FFB800" stroke="#FF6B00" strokeWidth="3"/>
        
        {/* Head */}
        <circle cx="50" cy="55" r="35" fill="#FFB800" stroke="#FF6B00" strokeWidth="3"/>
        
        {/* Snout */}
        <ellipse cx="50" cy="65" rx="20" ry="15" fill="#FFC933"/>
        
        {/* Nose */}
        <ellipse cx="50" cy="63" rx="8" ry="6" fill="#FF6B00"/>
        
        {/* X Eye (left) */}
        <g className="x-eye">
          <line x1="38" y1="43" x2="46" y2="51" stroke="#000" strokeWidth="4" strokeLinecap="round"/>
          <line x1="46" y1="43" x2="38" y2="51" stroke="#000" strokeWidth="4" strokeLinecap="round"/>
        </g>
        
        {/* Normal Eye (right) */}
        <circle cx="62" cy="47" r="4" fill="#000"/>
        
        {/* Mouth */}
        <path d="M 42 72 Q 50 78 58 72" stroke="#000" strokeWidth="2" fill="none" strokeLinecap="round"/>
        
        {/* Pee Drip */}
        <g className="pee-drip">
          <ellipse cx="50" cy="92" rx="4" ry="6" fill="#FFD700" opacity="0.8"/>
        </g>
      </svg>
    </div>
  );
}


