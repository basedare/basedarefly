'use client';
import React from 'react';
import { Target, Zap, Trophy } from 'lucide-react';
export default function ProtocolSteps() {
  return (
    <section className="w-full py-16 border-y border-white/5 bg-white/[0.02]">
      <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
        {[{icon:Target,t:"1. TARGET",d:"Select streamer & pledge bounty."},{icon:Zap,t:"2. EXECUTE",d:"Streamer has 48hrs to complete live."},{icon:Trophy,t:"3. PAYOUT",d:"Proof verified by zkML. Instant settlement."}].map((s,i)=>(
          <div key={i} className="flex flex-col items-center gap-4 group"><div className="w-16 h-16 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center group-hover:border-[#FFD700] transition-colors"><s.icon className="w-8 h-8 text-white group-hover:text-[#FFD700]" /></div><div><h3 className="text-white font-black italic text-xl mb-2">{s.t}</h3><p className="text-gray-500 font-mono text-sm">{s.d}</p></div></div>
        ))}
      </div>
    </section>
  );
}


