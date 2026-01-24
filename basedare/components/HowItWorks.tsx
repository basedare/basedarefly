'use client';

import React from "react";

export default function HowItWorks() {
  return (
    <section className="py-24 bg-transparent relative overflow-hidden">
      {/* Background Tech Lines */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] opacity-10" />

      <div className="container mx-auto px-6 relative z-10">
        
        {/* HEADER */}
        <div className="text-center mb-20">
          <h2 className="text-sm font-mono text-purple-400 tracking-[0.5em] mb-4 uppercase drop-shadow-lg">System Protocol</h2>
          <h3 className="text-5xl md:text-6xl font-black text-white italic tracking-tighter uppercase drop-shadow-[0_0_30px_rgba(255,255,255,0.3)]">
            How It Works
          </h3>
        </div>

        {/* 3-STEP PROCESS */}
        <div className="grid md:grid-cols-3 gap-8 mb-24">
          {[
            {
              step: "01",
              title: "The Pledge",
              desc: "You fund a bounty with USDC tokens held in escrow. The money is real. The pressure is visible.",
              icon: "💰"
            },
            {
              step: "02",
              title: "The Action",
              desc: "The streamer receives the challenge. The chat goes wild. They either perform the dare or lose face forever.",
              icon: "🎥"
            },
            {
              step: "03",
              title: "The Payoff",
              desc: "Proof submitted. Consensus reached. Smart contract releases funds instantly.",
              icon: "💸"
            }
          ].map((item, idx) => (
            <div key={idx} className="relative group">
              {/* Connector Line (Desktop only) */}
              {idx !== 2 && (
                <div className="hidden md:block absolute top-12 left-full w-full h-[2px] bg-gradient-to-r from-purple-500 via-purple-400 to-transparent -translate-x-8 z-0 shadow-lg shadow-purple-500/50" />
              )}
              
              <div className="p-8 relative z-10 transition-all duration-300 hover:translate-y-[-5px] rounded-2xl bg-white/[0.03] backdrop-blur-[20px] border border-purple-500/20 hover:bg-white/[0.08] hover:border-purple-500/40 shadow-lg">
                <span className="text-6xl font-black text-white/5 absolute top-4 right-4 drop-shadow-lg">{item.step}</span>
                <div className="w-16 h-16 bg-purple-900/20 rounded-full flex items-center justify-center text-3xl mb-6 border border-purple-500/20 group-hover:border-purple-500 transition-colors shadow-[0_0_20px_rgba(168,85,247,0.2)]">
                  {item.icon}
                </div>
                <h4 className="text-2xl font-bold text-white mb-3 uppercase italic drop-shadow-lg">{item.title}</h4>
                <p className="text-gray-300 leading-relaxed drop-shadow-md">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}

