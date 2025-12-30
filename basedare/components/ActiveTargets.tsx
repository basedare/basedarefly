'use client';
import React from 'react';
import HoloCard from '@/components/ui/holo-card';
const LIVE = [
  { s: "$Speed", d: "BARK AT COP", b: "50,000 BD", t: "48:00:00" },
  { s: "$Kai", d: "CALL EX", b: "25,000 BD", t: "23:59:59" },
  { s: "$xQc", d: "EAT CHIP", b: "15,000 BD", t: "12:00:00" },
];
export default function ActiveTargets() {
  return (
    <section className="w-full py-24 relative z-10">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center gap-4 mb-12"><div className="w-3 h-3 bg-green-500 rounded-full animate-ping" /><h2 className="text-2xl font-black text-white uppercase tracking-widest">Active Targets</h2><div className="flex-1 h-[1px] bg-white/10" /></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 justify-items-center">
          {LIVE.map((d, i) => <div key={i} className="w-full max-w-[320px] h-[450px]"><HoloCard streamer={d.s} title={d.d} bounty={d.b} time={d.t} className="w-full h-full" /></div>)}
        </div>
      </div>
    </section>
  );
}


