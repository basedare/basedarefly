'use client';

import React from 'react';
import { PlayCircle, BarChart3, Globe, Zap } from 'lucide-react';

export default function BusinessDossier() {
  return (
    <div
      className="w-full max-w-6xl mx-auto px-6 relative"
      style={{
        filter: 'grayscale(1) contrast(1.05)',
        WebkitFilter: 'grayscale(1) contrast(1.05)',
      }}
    >
      {/* VHS Scan Lines Overlay */}
      <div
        className="absolute inset-0 z-50 pointer-events-none opacity-[0.04]"
        style={{
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.4) 2px, rgba(0,0,0,0.4) 4px)',
          backgroundSize: '100% 4px',
        }}
      />
      
      {/* HEADER */}
      <div className="text-center mb-16">
         <h1 className="text-5xl md:text-8xl font-black italic text-zinc-900 tracking-tighter uppercase mb-4">
            THE SALES MACHINE
         </h1>
         <p className="text-zinc-600 font-mono max-w-2xl mx-auto text-sm md:text-base">
            Algorithmic Brand Injection. Synchronized Viral Moments.
         </p>
      </div>

      {/* VIDEO MACHINE SECTION - Noir VHS Treatment */}
      <div className="relative w-full aspect-video bg-black rounded-3xl overflow-hidden border border-zinc-400/30 shadow-[0_0_100px_rgba(100,100,100,0.15)] mb-24 group">

         {/* YOUR VIDEO FILE */}
         <video
            src="/assets/machine-loop.mp4"
            className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-500"
            muted
            loop
            autoPlay
            playsInline
         />

         {/* OVERLAY CONTENT */}
         <div className="absolute inset-0 flex flex-col items-center justify-center z-10 pointer-events-none">
            <div className="w-20 h-20 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center border border-white/20 mb-6 shadow-lg">
               <PlayCircle className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-4xl md:text-5xl font-black italic text-white uppercase tracking-tighter drop-shadow-2xl text-center">
               Operation: Red Bull
            </h2>
            <p className="text-xs md:text-sm font-mono text-zinc-300 bg-black/60 px-4 py-2 rounded mt-2 uppercase tracking-widest border border-zinc-500/30">
               500 Streamers. 1 Second. Zero Latency.
            </p>
         </div>

         {/* VHS Static Noise */}
         <div
            className="absolute inset-0 pointer-events-none opacity-[0.08] mix-blend-overlay z-20"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
            }}
         />

         {/* VHS Horizontal Scan Lines */}
         <div
            className="absolute inset-0 pointer-events-none opacity-[0.06] z-20"
            style={{
              backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 1px, rgba(0,0,0,0.5) 1px, rgba(0,0,0,0.5) 2px)',
              backgroundSize: '100% 2px',
            }}
         />
      </div>

      {/* METRICS GRID - Noir Style */}
      <div className="grid md:grid-cols-3 gap-8">
         {[
            { label: "Global Reach", value: "450M+", icon: Globe },
            { label: "Conversion Rate", value: "8.5%", icon: BarChart3 },
            { label: "Viral Velocity", value: "12x", icon: Zap },
         ].map((stat, i) => (
            <div key={i} className="p-8 bg-white/70 backdrop-blur-xl border border-zinc-300 rounded-2xl hover:border-zinc-400 hover:shadow-lg transition-all group">
               <stat.icon className="w-8 h-8 text-zinc-700 mb-4 group-hover:scale-110 transition-transform" />
               <div className="text-4xl font-black text-zinc-900 mb-2">{stat.value}</div>
               <div className="text-xs font-mono text-zinc-500 uppercase tracking-widest group-hover:text-zinc-800 transition-colors">{stat.label}</div>
            </div>
         ))}
      </div>

    </div>
  );
}
