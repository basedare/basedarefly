'use client';

import React from 'react';

export default function MintAnnouncement() {
  return (
    <section className="w-full bg-[#FFD700] text-black overflow-hidden py-3 border-y-4 border-black relative z-40">
      {/* Texture Overlay */}
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/diagmonds-light.png')] opacity-20 pointer-events-none" />
      
      <div className="flex whitespace-nowrap animate-marquee">
         {/* Repeated Content for seamless loop */}
         {[...Array(10)].map((_, i) => (
            <div key={i} className="flex items-center gap-12 mx-4">
               <span className="text-xl md:text-2xl font-black italic tracking-tighter uppercase flex items-center gap-4">
                  ⚠️ INCOMING MINT: GENESIS PASS
               </span>
               <span className="text-lg font-mono font-bold opacity-70">
                  // MINT DATE: [REDACTED] //
               </span>
               <div className="w-3 h-3 bg-black rotate-45" />
            </div>
         ))}
      </div>

      <style jsx>{`
        .animate-marquee {
          animation: marquee 30s linear infinite;
        }
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </section>
  );
}

