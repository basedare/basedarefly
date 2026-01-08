'use client';

import React, { useState } from 'react';
import ChromeText from '@/components/ChromeText';

export default function WaitlistPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Use your actual Formspree ID here
    const response = await fetch('https://formspree.io/f/xaqnrpgg', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ 
        email: email,
        source: 'BaseDare Waitlist' // Optional: helps you track where signups come from
      }),
    });

    if (response.ok) {
      setSubmitted(true);
    } else {
      // If something goes wrong, give a "God-Tier" error message
      alert("The Vault is temporarily locked. Identity could not be verified.");
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-black px-4 overflow-hidden relative">
      
      {/* RADIANT AURA: Matches the Hero Bear feel */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150vw] h-[100vh] bg-purple-900/10 blur-[150px] rounded-full -z-10 pointer-events-none" />

      <div className="w-full max-w-md flex flex-col items-center text-center space-y-10 z-10">
        
        {/* THE SENTINEL: Floating head */}
        <div className="relative group">
          <div className="absolute -inset-4 bg-purple-500/20 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
          <img 
            src="/assets/peebear-head.png" 
            alt="BaseDare Sentinel" 
            className="w-40 h-40 md:w-52 md:h-52 object-contain animate-float-slow relative z-10"
          />
        </div>

        {/* HEADLINE SECTION */}
        <div className="space-y-3">
          <ChromeText text="THE VAULT" className="text-6xl md:text-7xl tracking-tighter" />
          <p className="text-gray-400 font-mono text-[10px] md:text-xs tracking-[0.3em] uppercase">
            On-Chain Accountability • Verification Imminent
          </p>
        </div>

        {/* FORM STATE */}
        {!submitted ? (
          <div className="w-full space-y-6">
            <p className="text-gray-500 text-sm max-w-[280px] mx-auto leading-relaxed">
              Enter your email to secure early access to the Truth Protocol.
            </p>
            
            <form onSubmit={handleSubmit} className="w-full space-y-3">
              <input
                type="email"
                required
                placeholder="EMAIL_ADDRESS"
                className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-6 py-4 text-white placeholder:text-gray-700 outline-none focus:border-purple-500/50 focus:bg-white/[0.07] transition-all font-mono text-center tracking-widest"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              
              <button
                type="submit"
                className="w-full bg-white text-black font-black italic uppercase py-4 rounded-xl hover:bg-purple-400 transition-all transform active:scale-[0.98] tracking-tighter text-lg shadow-[0_0_20px_rgba(255,255,255,0.1)]"
              >
                Enter the Vault
              </button>
            </form>
          </div>
        ) : (
          <div className="p-10 bg-white/5 border border-purple-500/30 rounded-2xl backdrop-blur-xl animate-in fade-in zoom-in duration-500">
            <h3 className="text-white font-black italic text-2xl uppercase mb-2 tracking-tighter">Identity Verified</h3>
            <p className="text-purple-400 font-mono text-xs uppercase tracking-widest">You are on the list.</p>
          </div>
        )}

        {/* FOOTER CAPTION */}
        <div className="pt-10">
          <p className="text-[10px] text-gray-700 font-mono uppercase tracking-[0.4em]">
            Base Mainnet • L2 Protocol
          </p>
        </div>
      </div>
    </main>
  );
}

