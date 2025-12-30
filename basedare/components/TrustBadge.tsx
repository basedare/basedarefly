'use client';
import React from 'react';
export default function TrustBadge() {
  return (
    <section className="w-full py-8 bg-black border-b border-white/10 flex justify-center gap-8 opacity-60 hover:opacity-100 transition-opacity">
      <span className="font-mono text-sm text-[#A855F7]">● zkML REFEREE</span><span className="text-white/20">|</span>
      <span className="font-mono text-sm text-green-400">⚡ ATOMIC &lt;200ms</span><span className="text-white/20">|</span>
      <span className="font-mono text-sm text-[#FFD700]">★ 10k+ VERIFIED</span>
    </section>
  );
}


