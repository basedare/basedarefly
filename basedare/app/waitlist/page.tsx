'use client';

import React, { useState } from 'react';
import ChromeText from '@/components/ChromeText';
import GradualBlurOverlay from '@/components/GradualBlurOverlay';

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
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-transparent px-4 py-12">
      <div className="fixed inset-0 z-10 pointer-events-none">
        <GradualBlurOverlay intensity="light" placement="lower" />
      </div>

      {/* Liquid glass atmosphere */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_50%_0%,rgba(129,93,255,0.16)_0%,transparent_68%),radial-gradient(ellipse_40%_35%_at_15%_80%,rgba(59,130,246,0.12)_0%,transparent_56%),radial-gradient(ellipse_35%_35%_at_85%_70%,rgba(236,72,153,0.12)_0%,transparent_58%)]" />
        <div className="absolute inset-0 backdrop-blur-[2px]" />
      </div>

      {/* RADIANT AURA: Matches the Hero Bear feel */}
      <div className="absolute top-1/2 left-1/2 -z-10 h-[100vh] w-[150vw] -translate-x-1/2 -translate-y-1/2 rounded-full bg-purple-900/10 blur-[150px] pointer-events-none" />

      <div className="relative z-20 w-full max-w-md space-y-10 rounded-[28px] border border-white/15 bg-white/[0.04] p-6 text-center shadow-[0_35px_100px_rgba(3,8,26,0.55),inset_0_1px_0_rgba(255,255,255,0.28)] backdrop-blur-2xl md:p-8">
        
        {/* THE SENTINEL: Floating head */}
        <div className="relative group mx-auto w-fit">
          <div className="absolute -inset-4 bg-purple-500/20 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
          <img 
            src="/assets/peebear-head.png" 
            alt="BaseDare Sentinel" 
            className="relative z-10 mx-auto h-40 w-40 object-contain animate-float-slow md:h-52 md:w-52"
          />
        </div>

        {/* HEADLINE SECTION */}
        <div className="space-y-3">
          <ChromeText text="THE VAULT" className="text-6xl md:text-7xl tracking-tighter" />
          <p className="text-gray-300/90 font-mono text-[10px] md:text-xs tracking-[0.3em] uppercase">
            On-Chain Accountability • Verification Imminent
          </p>
        </div>

        {/* FORM STATE */}
        {!submitted ? (
          <div className="w-full space-y-6">
            <p className="mx-auto max-w-[280px] text-sm leading-relaxed text-gray-300/85">
              Enter your email to secure early access to the Truth Protocol.
            </p>
            
            <form onSubmit={handleSubmit} className="w-full space-y-3">
              <input
                type="email"
                required
                placeholder="EMAIL_ADDRESS"
                className="w-full rounded-xl border border-white/20 bg-white/[0.08] px-6 py-4 text-center font-mono tracking-widest text-white outline-none transition-all placeholder:text-gray-400 focus:border-purple-400/60 focus:bg-white/[0.12]"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              
              <button
                type="submit"
                className="w-full rounded-xl border border-white/25 bg-white/90 py-4 text-lg font-black italic uppercase tracking-tighter text-black shadow-[0_12px_35px_rgba(255,255,255,0.15)] transition-all hover:bg-purple-300 active:scale-[0.98]"
              >
                Enter the Vault
              </button>
            </form>
          </div>
        ) : (
          <div className="animate-in fade-in zoom-in rounded-2xl border border-purple-400/35 bg-white/[0.08] p-10 backdrop-blur-xl duration-500">
            <h3 className="text-white font-black italic text-2xl uppercase mb-2 tracking-tighter">Identity Verified</h3>
            <p className="text-purple-400 font-mono text-xs uppercase tracking-widest">You are on the list.</p>
          </div>
        )}

        {/* FOOTER CAPTION */}
        <div className="pt-6">
          <p className="text-[10px] text-gray-400/80 font-mono uppercase tracking-[0.4em]">
            Base Mainnet • L2 Protocol
          </p>
        </div>
      </div>
    </main>
  );
}
