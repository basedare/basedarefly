"use client";

import React, { useEffect, useRef } from 'react';

interface Peebare3DProps {
  size?: number;
}

export default function Peebare3D({ size = 300 }: Peebare3DProps) {
  const bearRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!bearRef.current) return;
    
    let rotation = 0;
    let animationId: number;

    const animate = () => {
      rotation += 0.005;
      if (bearRef.current) {
        bearRef.current.style.transform = `rotateY(${rotation}rad) rotateX(${Math.sin(rotation * 2) * 0.1}rad)`;
      }
      animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationId) cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <div className="relative inline-block perspective-1000" style={{ width: size, height: size }}>
      <style jsx>{`
        .perspective-1000 {
          perspective: 1000px;
        }

        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }

        @keyframes pee-spray {
          0%, 100% { transform: scaleY(1) translateY(0); opacity: 0.8; }
          50% { transform: scaleY(1.3) translateY(5px); opacity: 1; }
        }

        .float-bear {
          animation: float 3s ease-in-out infinite;
          transform-style: preserve-3d;
          width: 100%;
          height: 100%;
        }

        .pee-spray {
          animation: pee-spray 1s ease-in-out infinite;
        }

        @keyframes sparkle {
          0%, 100% { opacity: 0; transform: scale(0); }
          50% { opacity: 1; transform: scale(1); }
        }

        .sparkle {
          animation: sparkle 2s ease-in-out infinite;
        }
      `}</style>

      <div ref={bearRef} className="float-bear">
        <svg width="100%" height="100%" viewBox="0 0 200 250" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Shadow */}
          <ellipse cx="100" cy="230" rx="60" ry="15" fill="#000" opacity="0.2"/>
          
          {/* Body */}
          <ellipse cx="100" cy="140" rx="50" ry="65" fill="#FFB800" stroke="#FF6B00" strokeWidth="4"/>
          
          {/* Left Arm (raised) */}
          <ellipse cx="65" cy="120" rx="15" ry="40" fill="#FFB800" stroke="#FF6B00" strokeWidth="3" transform="rotate(-30 65 120)"/>
          
          {/* Right Arm (flexing) */}
          <ellipse cx="135" cy="110" rx="15" ry="35" fill="#FFB800" stroke="#FF6B00" strokeWidth="3" transform="rotate(20 135 110)"/>
          
          {/* Legs */}
          <ellipse cx="85" cy="190" rx="15" ry="30" fill="#FFB800" stroke="#FF6B00" strokeWidth="3"/>
          <ellipse cx="115" cy="190" rx="15" ry="30" fill="#FFB800" stroke="#FF6B00" strokeWidth="3"/>
          
          {/* Feet */}
          <ellipse cx="85" cy="215" rx="18" ry="10" fill="#FFC933" stroke="#FF6B00" strokeWidth="2"/>
          <ellipse cx="115" cy="215" rx="18" ry="10" fill="#FFC933" stroke="#FF6B00" strokeWidth="2"/>
          
          {/* Left Ear */}
          <circle cx="70" cy="45" r="20" fill="#FFB800" stroke="#FF6B00" strokeWidth="3"/>
          
          {/* Right Ear */}
          <circle cx="130" cy="45" r="20" fill="#FFB800" stroke="#FF6B00" strokeWidth="3"/>
          
          {/* Head */}
          <circle cx="100" cy="70" r="40" fill="#FFB800" stroke="#FF6B00" strokeWidth="4"/>
          
          {/* Snout */}
          <ellipse cx="100" cy="82" rx="22" ry="16" fill="#FFC933"/>
          
          {/* Nose */}
          <ellipse cx="100" cy="80" rx="10" ry="7" fill="#FF6B00"/>
          
          {/* X Eye (left) */}
          <g className="x-eye">
            <line x1="85" y1="62" x2="95" y2="72" stroke="#000" strokeWidth="5" strokeLinecap="round"/>
            <line x1="95" y1="62" x2="85" y2="72" stroke="#000" strokeWidth="5" strokeLinecap="round"/>
          </g>
          
          {/* Normal Eye (right) */}
          <circle cx="115" cy="67" r="5" fill="#000"/>
          
          {/* Smirk Mouth */}
          <path d="M 90 92 Q 100 98 110 92" stroke="#000" strokeWidth="3" fill="none" strokeLinecap="round"/>
          
          {/* Abs (6-pack) */}
          <g opacity="0.3">
            <rect x="88" y="125" width="10" height="12" rx="2" fill="#FF6B00"/>
            <rect x="102" y="125" width="10" height="12" rx="2" fill="#FF6B00"/>
            <rect x="88" y="140" width="10" height="12" rx="2" fill="#FF6B00"/>
            <rect x="102" y="140" width="10" height="12" rx="2" fill="#FF6B00"/>
            <rect x="88" y="155" width="10" height="12" rx="2" fill="#FF6B00"/>
            <rect x="102" y="155" width="10" height="12" rx="2" fill="#FF6B00"/>
          </g>
          
          {/* Pee Stream */}
          <g className="pee-spray">
            <path d="M 100 170 Q 95 190 90 210" stroke="#FFD700" strokeWidth="4" opacity="0.8"/>
            <path d="M 100 170 Q 100 190 100 210" stroke="#FFD700" strokeWidth="5" opacity="0.9"/>
            <path d="M 100 170 Q 105 190 110 210" stroke="#FFD700" strokeWidth="4" opacity="0.8"/>
          </g>
          
          {/* Sparkles */}
          <circle className="sparkle" cx="140" cy="100" r="3" fill="#FFD700" style={{ animationDelay: '0s' }}/>
          <circle className="sparkle" cx="60" cy="120" r="2" fill="#FFD700" style={{ animationDelay: '0.5s' }}/>
          <circle className="sparkle" cx="150" cy="140" r="4" fill="#FFD700" style={{ animationDelay: '1s' }}/>
          <circle className="sparkle" cx="50" cy="90" r="2" fill="#FFD700" style={{ animationDelay: '1.5s' }}/>
        </svg>
      </div>
    </div>
  );
}


