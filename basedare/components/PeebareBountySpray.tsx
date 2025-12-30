"use client";

import React from 'react';

interface PeebareBountySprayProps {
  amount?: number | string;
}

export default function PeebareBountySpray({ amount = 0 }: PeebareBountySprayProps) {
  return (
    <div className="relative inline-flex items-center gap-2">
      <style jsx>{`
        @keyframes spray-pulse {
          0%, 100% { transform: scaleY(1); opacity: 0.8; }
          50% { transform: scaleY(1.2); opacity: 1; }
        }

        .spray-line {
          animation: spray-pulse 1.5s ease-in-out infinite;
        }

        @keyframes bear-wiggle {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(-3deg); }
          75% { transform: rotate(3deg); }
        }

        .bear-spray-icon {
          animation: bear-wiggle 2s ease-in-out infinite;
        }
      `}</style>

      {/* Bear Mascot Head */}
      <img 
        src="/bear-mascot.png"
        alt="Bear"
        className="bear-spray-icon w-8 h-8 object-contain"
      />

      {/* Spray Lines */}
      <div className="flex flex-col gap-1">
        <div className="spray-line h-1 bg-gradient-to-r from-[#FFD700] to-transparent rounded" style={{ width: '30px', animationDelay: '0s' }}/>
        <div className="spray-line h-1 bg-gradient-to-r from-[#FFD700] to-transparent rounded" style={{ width: '25px', animationDelay: '0.2s' }}/>
        <div className="spray-line h-1 bg-gradient-to-r from-[#FFD700] to-transparent rounded" style={{ width: '28px', animationDelay: '0.4s' }}/>
      </div>

      {/* Amount */}
      <span className="font-black text-[#FFB800] text-lg drop-shadow-[0_0_8px_rgba(255,184,0,0.6)]">
        ${amount}
      </span>
    </div>
  );
}


