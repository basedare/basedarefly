'use client';

import React from 'react';
import { PlayCircle, BarChart3, Globe, Zap, Settings } from 'lucide-react';

export default function BusinessDossier() {
  return (
    <div className="w-full max-w-6xl mx-auto px-6">
      
      {/* HEADER */}
      <div className="text-center mb-16">
         <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-900/20 border border-purple-500/30 text-purple-400 text-xs font-mono mb-4 uppercase tracking-widest">
            <Settings className="w-3 h-3 animate-spin-slow" />
            <span>Corporate Access Granted</span>
         </div>
         <h1 className="text-5xl md:text-8xl font-black italic text-white tracking-tighter uppercase mb-4">
            THE SALES <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-cyan-500">MACHINE</span>
         </h1>
         <p className="text-gray-400 font-mono max-w-2xl mx-auto text-sm md:text-base">
            Algorithmic Brand Injection. Synchronized Viral Moments.
         </p>
      </div>

      {/* VIDEO MACHINE SECTION */}
      <div className="relative w-full aspect-video bg-black rounded-3xl overflow-hidden border border-white/10 shadow-[0_0_100px_rgba(168,85,247,0.15)] mb-24 group">
         
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
            <p className="text-xs md:text-sm font-mono text-[#FFD700] bg-black/60 px-4 py-2 rounded mt-2 uppercase tracking-widest border border-[#FFD700]/30">
               500 Streamers. 1 Second. Zero Latency.
            </p>
         </div>
         
         {/* SCANLINES */}
         <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none mix-blend-overlay" />
      </div>

      {/* METRICS GRID */}
      <div className="grid md:grid-cols-3 gap-8">
         {[
            { label: "Global Reach", value: "450M+", icon: Globe, color: "text-cyan-400" },
            { label: "Conversion Rate", value: "8.5%", icon: BarChart3, color: "text-[#FFD700]" },
            { label: "Viral Velocity", value: "12x", icon: Zap, color: "text-purple-400" },
         ].map((stat, i) => (
            <div key={i} className="p-8 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-colors group">
               <stat.icon className={`w-8 h-8 ${stat.color} mb-4 group-hover:scale-110 transition-transform`} />
               <div className="text-4xl font-black text-white mb-2">{stat.value}</div>
               <div className="text-xs font-mono text-gray-500 uppercase tracking-widest group-hover:text-white transition-colors">{stat.label}</div>
            </div>
         ))}
      </div>

    </div>
  );
}
