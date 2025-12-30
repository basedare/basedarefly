import React, { useState, useEffect } from "react";

export default function LiveBountyPot() {
  const [pot, setPot] = useState(69420);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setPot(prev => prev + Math.floor(Math.random() * 666));
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative group cursor-pointer" data-bounty id="bounty-pot">
      <style>{`
        @keyframes matrix {
          0%, 100% { 
            filter: brightness(1) drop-shadow(0 0 20px rgba(255, 184, 0, 0.8));
          }
          50% { 
            filter: brightness(1.3) drop-shadow(0 0 40px rgba(255, 107, 0, 1));
          }
        }

        @keyframes float-dollar {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          90% {
            opacity: 1;
          }
          100% {
            transform: translateY(-120px) rotate(15deg);
            opacity: 0;
          }
        }

        .dollar-float {
          position: absolute;
          font-size: 2rem;
          animation: float-dollar 3s ease-out infinite;
          filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));
        }

        .dollar-1 { left: 10%; animation-delay: 0s; }
        .dollar-2 { left: 30%; animation-delay: 0.5s; }
        .dollar-3 { left: 50%; animation-delay: 1s; }
        .dollar-4 { left: 70%; animation-delay: 1.5s; }
        .dollar-5 { left: 90%; animation-delay: 2s; }

        #bounty-pot .pot-number {
          font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
          text-rendering: optimizeLegibility;
          letter-spacing: -0.02em;
        }
      `}</style>

      {/* FLOATING DOLLARS */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 1 }}>
        <div className="dollar-float dollar-1">💰</div>
        <div className="dollar-float dollar-2">💵</div>
        <div className="dollar-float dollar-3">💸</div>
        <div className="dollar-float dollar-4">💰</div>
        <div className="dollar-float dollar-5">💵</div>
      </div>

      {/* GLOW BACKGROUND */}
      <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 via-orange-500 to-yellow-400 rounded-3xl blur-3xl opacity-60 group-hover:opacity-80 transition-opacity" style={{ zIndex: -1 }} />
      
      {/* MAIN POT - Glass styling applied via Layout.js */}
      <div className="relative" style={{ zIndex: 2 }}>
        <div className="text-center">
          {/* POT ICON */}
          <div className="text-6xl mb-4 filter drop-shadow-lg">🏆</div>
          
          {/* CRYSTAL CLEAR NUMBERS */}
          <div className="pot-number font-mono text-6xl md:text-7xl font-black tracking-tighter">
            <span className="text-yellow-400 filter drop-shadow-lg">$</span>
            <span 
              className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-orange-500 to-yellow-400" 
              style={{ 
                animation: 'matrix 2s ease-in-out infinite',
                filter: 'drop-shadow(0 2px 8px rgba(255,184,0,0.5))'
              }}
            >
              {pot.toLocaleString()}
            </span>
          </div>
          
          {/* LIVE BADGE */}
          <div className="flex justify-center mt-4">
            <div className="bg-red-600 px-5 py-2 rounded-full animate-pulse flex items-center gap-2 shadow-lg">
              <div className="w-3 h-3 bg-white rounded-full animate-ping" />
              <span className="font-black text-sm tracking-wide">LIVE</span>
            </div>
          </div>
          
          {/* SUBTEXT */}
          <p className="text-yellow-400 font-black mt-4 text-xl tracking-wide filter drop-shadow-md">
            TOTAL BOUNTY POT
          </p>
        </div>
      </div>
    </div>
  );
}