'use client';

import React, { useState, useEffect } from 'react';

export default function TruthProtocol() {
  const [focusIndex, setFocusIndex] = useState(0);

  // Auto-cycle focus
  useEffect(() => {
    const interval = setInterval(() => {
      setFocusIndex((prev) => (prev + 1) % 3);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="relative z-20 py-24 px-6">
      {/* Removed the black background container, making it transparent or subtle */}
      <div className="max-w-6xl mx-auto p-12 rounded-3xl relative overflow-hidden">
        
        {/* HEADER */}
        <div className="text-center mb-16 relative z-10">
          <h2 className="text-4xl md:text-6xl font-black italic uppercase tracking-tighter text-white mb-4">
            THE <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400">TRUTH PROTOCOL</span>
          </h2>
          <p className="text-gray-400 font-mono text-sm uppercase tracking-widest">
            Zero-Knowledge Verification • On-Chain Settlement • Base L2
          </p>
        </div>

        <div className="relative grid md:grid-cols-3 gap-8 md:gap-12 min-h-[300px]">
          
          {/* MOVING SCANNER FRAME - Keeping this visual element */}
          <div 
            className="absolute pointer-events-none border-2 border-purple-500/50 rounded-xl hidden md:block z-20 transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)]"
            style={{
              left: focusIndex === 0 ? '0%' : focusIndex === 1 ? '33.33%' : '66.66%',
              top: '-10px',
              bottom: '-10px',
              width: 'calc(33.33% - 1.5rem)',
              marginLeft: focusIndex === 0 ? '0' : '0.75rem',
              marginRight: focusIndex === 2 ? '0' : '0.75rem',
              boxShadow: '0 0 30px rgba(168, 85, 247, 0.2), inset 0 0 20px rgba(168, 85, 247, 0.1)'
            }}
          >
            {/* SCANLINE ANIMATION */}
            <div className="absolute left-0 right-0 h-1 bg-purple-400/50 blur-[2px] animate-scan-vertical" />
          </div>

          {/* COLUMNS */}
          {[
              { id: 1, title: 'Verification', text: 'zkML Sentinel analyzes stream frames to provide mathematically certain proof of completion.' },
              { id: 2, title: 'Settlement', text: 'Escrowed funds released instantly via smart contracts upon verification. Code is law.' },
              { id: 3, title: 'Network', text: 'Immutable, low-fee execution powered by Base L2, secured by Ethereum mainnet.' }
          ].map((item, i) => (
              <div 
                key={i}
                className={`space-y-4 p-6 rounded-xl transition-all duration-500 ${focusIndex === i ? 'opacity-100 bg-white/5' : 'opacity-40 blur-[1px]'}`}
                onMouseEnter={() => setFocusIndex(i)}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded bg-purple-500/20 flex items-center justify-center text-purple-400 font-black text-sm">0{i+1}</div>
                  <h3 className="text-purple-400 font-mono text-sm uppercase tracking-widest">{item.title}</h3>
                </div>
                <p className="text-gray-300 leading-relaxed text-sm">{item.text}</p>
              </div>
          ))}
        </div>
      </div>
      <style jsx>{`
        @keyframes scan-vertical {
          0% { top: 0%; opacity: 0; }
          50% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
        .animate-scan-vertical {
          animation: scan-vertical 2s linear infinite;
        }
      `}</style>
    </section>
  );
}
