'use client';

import React from 'react';
import { motion } from 'framer-motion';

const DARES = [
  "EAT GHOST PEPPER ($500)",
  "SHAVE EYEBROWS ($1,200)",
  "CALL YOUR EX ($800)",
  "TATTOO PEEBEAR ($5,000)",
  "DELETE FORTNITE ACC ($2,500)",
  "DRINK RAW EGGS ($300)",
];

export default function PeeBearConveyor() {
  return (
    <div className="w-full overflow-hidden bg-purple-900/10 border-y border-purple-500/20 py-3 relative">
      <div className="absolute inset-0 bg-gradient-to-r from-[#020202] via-transparent to-[#020202] z-10 pointer-events-none" />
      <motion.div 
        className="flex whitespace-nowrap gap-8"
        animate={{ x: [0, -1000] }}
        transition={{ repeat: Infinity, duration: 20, ease: "linear" }}
      >
        {[...DARES, ...DARES, ...DARES, ...DARES].map((dare, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="text-[#FFD700] text-xl">⚡</span>
            <span className="text-purple-300 font-mono font-bold uppercase tracking-widest text-sm">
              {dare}
            </span>
          </div>
        ))}
      </motion.div>
    </div>
  );
}



