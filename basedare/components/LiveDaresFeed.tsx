'use client';
import React from 'react';

const dares = [
  { title: "eat a raw onion whole", amount: "350", timeLeft: "2h 14m", difficulty: "HARD" },
  { title: "chug a gallon of milk", amount: "120", timeLeft: "45m", difficulty: "MED" },
  { title: "text your ex 'I miss us'", amount: "500", timeLeft: "4h 00m", difficulty: "EXTREME" },
];

export default function LiveDaresFeed() {
  return (
    <section className="w-full max-w-7xl mx-auto mt-32 px-4 relative z-20">
      <div className="flex items-end justify-between mb-12 border-b border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-3 mb-4">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
            </span>
            <span className="text-red-500 font-mono text-xs tracking-widest uppercase">Live Feed Active</span>
          </div>
          <h2 className="text-5xl md:text-7xl font-black italic uppercase tracking-tighter">
            The <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500">Arena</span>
          </h2>
        </div>
      </div>

      <div className="perspective-container grid grid-cols-1 md:grid-cols-3 gap-10">
        {dares.map((dare, i) => (
          <div key={i} className="holo-card-3d group relative rounded-2xl overflow-hidden cursor-pointer h-80">
            {/* Texture Layers */}
            <div className="noise-overlay" />
            <div className="tesla-discharge-bar" />
            
            {/* Content */}
            <div className="relative z-10 p-8 flex flex-col justify-between h-full">
              <div>
                <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold mb-6 border ${
                  dare.difficulty === 'EXTREME' ? 'border-red-500/70 text-red-400 bg-red-500/10' :
                  dare.difficulty === 'HARD' ? 'border-orange-500/70 text-orange-400 bg-orange-500/10' :
                  'border-cyan-500/70 text-cyan-400 bg-cyan-500/10'
                }`}>
                  {dare.difficulty}
                </span>
                <h3 className="text-3xl md:text-4xl font-black uppercase leading-tight text-white group-hover:text-cyan-300 transition-colors duration-300">
                  {dare.title}
                </h3>
              </div>

              <div className="border-t border-white/10 pt-6 flex justify-between items-end">
                <div>
                  <p className="text-gray-500 text-xs font-mono uppercase">Deadline</p>
                  <p className="text-white font-bold text-lg font-mono">{dare.timeLeft}</p>
                </div>
                <div className="text-right">
                  <p className="text-purple-400 text-xs font-bold tracking-widest uppercase">Bounty</p>
                  <p className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-amber-500 drop-shadow-[0_0_20px_rgba(234,179,8,0.7)]">
                    ${dare.amount}
                  </p>
                </div>
              </div>
            </div>
            
            {/* Hover Gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-purple-500/5 to-transparent opacity-0 group-hover:opacity-60 transition-opacity duration-700 pointer-events-none" />
          </div>
        ))}
      </div>
    </section>
  );
}
