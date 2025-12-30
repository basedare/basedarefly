'use client';
import React from 'react';

export default function BusinessDossier() {
  return (
    <div className="max-w-4xl mx-auto px-6 space-y-8">
      <div className="bg-[#0a0a0a] border border-white/10 rounded-xl p-8">
        <h3 className="text-2xl font-black text-white mb-4 uppercase tracking-wider">PROTOCOL OVERVIEW</h3>
        <p className="text-gray-400 font-mono text-sm leading-relaxed">
          BaseDare is a decentralized protocol enabling real-time, verifiable dares with instant settlement via zkML verification.
        </p>
      </div>
      <div className="bg-[#0a0a0a] border border-white/10 rounded-xl p-8">
        <h3 className="text-2xl font-black text-white mb-4 uppercase tracking-wider">INTEGRATION GUIDE</h3>
        <p className="text-gray-400 font-mono text-sm leading-relaxed">
          Connect your brand to streamers through verified challenges. API documentation available upon request.
        </p>
      </div>
    </div>
  );
}


