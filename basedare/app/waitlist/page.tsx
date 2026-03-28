'use client';

import React, { useState } from 'react';
import ChromeText from '@/components/ChromeText';
import GradualBlurOverlay from '@/components/GradualBlurOverlay';
import LiquidBackground from '@/components/LiquidBackground';

export default function WaitlistPage() {
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const raisedShellClass =
    'rounded-[28px] border border-white/15 bg-[linear-gradient(180deg,rgba(255,255,255,0.08)_0%,rgba(255,255,255,0.03)_18%,rgba(8,9,16,0.9)_62%,rgba(6,7,12,0.95)_100%)] shadow-[10px_14px_48px_rgba(3,8,26,0.55),-8px_-8px_24px_rgba(255,255,255,0.04),0_0_28px_rgba(168,85,247,0.08),inset_0_1px_0_rgba(255,255,255,0.2),inset_0_-18px_24px_rgba(0,0,0,0.24)] backdrop-blur-2xl';
  const dentWellClass =
    'bd-dent-surface bd-dent-surface--soft rounded-[1.35rem] border border-white/6 bg-white/[0.02]';

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
        notes: notes,
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
      <LiquidBackground />
      <div className="fixed inset-0 z-10 hidden pointer-events-none md:block">
        <GradualBlurOverlay />
      </div>

      <div className="pointer-events-none absolute inset-0 z-[1]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_14%,rgba(168,85,247,0.18),transparent_32%),radial-gradient(circle_at_82%_22%,rgba(34,211,238,0.12),transparent_28%),radial-gradient(circle_at_50%_92%,rgba(250,204,21,0.12),transparent_34%),linear-gradient(180deg,rgba(4,5,10,0.2)_0%,rgba(4,5,10,0.5)_100%)]" />
        <div className="absolute inset-0 backdrop-blur-[1.5px]" />
      </div>

      {/* RADIANT AURA: Matches the Hero Bear feel */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 z-[2] h-[100vh] w-[150vw] -translate-x-1/2 -translate-y-1/2 rounded-full bg-purple-900/10 blur-[150px]" />

      <div className={`relative z-20 w-full max-w-md space-y-8 p-6 text-center md:p-8 ${raisedShellClass}`}>
        
        {/* THE SENTINEL: Floating head */}
        <div className="relative group mx-auto w-fit">
          <div className="absolute -inset-4 bg-purple-500/20 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
          <img 
            src="/assets/peebear-head.png" 
            alt="BaseDare Sentinel" 
            className="vault-peebear relative z-10 mx-auto h-44 w-44 object-contain md:h-60 md:w-60"
          />
        </div>

        {/* HEADLINE SECTION */}
        <div className="space-y-4">
          <ChromeText text="THE VAULT" className="text-6xl md:text-7xl tracking-tighter" />
          <div className={`${dentWellClass} px-4 py-3.5`}>
            <p className="text-gray-200/90 font-mono text-[10px] md:text-xs tracking-[0.28em] uppercase">
              Early Access • BaseDare
            </p>
          </div>
        </div>

        {/* FORM STATE */}
        {!submitted ? (
          <div className="w-full space-y-5">
            <div className={`${dentWellClass} mx-auto max-w-[340px] px-5 py-4.5`}>
              <p className="text-sm leading-relaxed text-gray-200/88">
                Join the waitlist for early access to BaseDare.
              </p>
              <p className="mt-3 text-[11px] uppercase tracking-[0.18em] text-gray-400/85">
                Leave a note if you have questions, ideas, or a partnership angle.
              </p>
            </div>
            
            <form onSubmit={handleSubmit} className="w-full space-y-3">
              <div className={`${dentWellClass} px-2 py-2`}>
                <input
                  type="email"
                  required
                  placeholder="EMAIL_ADDRESS"
                  className="w-full rounded-[1rem] border border-white/8 bg-transparent px-4 py-4 text-center font-mono tracking-widest text-white outline-none transition-all placeholder:text-gray-400 focus:border-purple-400/40"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className={`${dentWellClass} px-2 py-2`}>
                <textarea
                  placeholder="OPTIONAL_NOTE"
                  className="min-h-[108px] w-full resize-none rounded-[1rem] border border-white/8 bg-transparent px-4 py-4 font-mono text-sm tracking-[0.14em] text-white outline-none transition-all placeholder:text-gray-400 focus:border-purple-400/40"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
              
              <button
                type="submit"
                className="vault-glass-button relative w-full overflow-hidden rounded-[1.15rem] py-4 text-lg font-black italic uppercase tracking-tighter text-white transition-all active:scale-[0.98]"
              >
                <span className="vault-glass-button__surface">
                  <span className="vault-glass-button__label">Enter the Vault</span>
                </span>
              </button>
            </form>
          </div>
        ) : (
          <div className={`animate-in fade-in zoom-in p-8 duration-500 ${dentWellClass}`}>
            <h3 className="text-white font-black italic text-2xl uppercase mb-2 tracking-tighter">✨ Success</h3>
            <p className="text-purple-400 font-mono text-xs uppercase tracking-widest">You&apos;re on the list.</p>
            <p className="mt-3 text-sm text-white/62">We&apos;ll let you know when the vault opens.</p>
          </div>
        )}

        {/* FOOTER CAPTION */}
        <div className={`${dentWellClass} px-4 py-3`}>
          <p className="text-[10px] text-gray-400/80 font-mono uppercase tracking-[0.4em]">
            Base Mainnet • Early Access Queue
          </p>
        </div>
      </div>

      <style jsx>{`
        .vault-peebear {
          animation: vault-breathe 5.8s ease-in-out infinite;
          filter: drop-shadow(0 18px 30px rgba(0, 0, 0, 0.34))
            drop-shadow(0 0 28px rgba(168, 85, 247, 0.18));
          transform-origin: center;
        }

        @keyframes vault-breathe {
          0%,
          100% {
            transform: translateY(0) scale(1);
            filter: drop-shadow(0 18px 30px rgba(0, 0, 0, 0.34))
              drop-shadow(0 0 24px rgba(168, 85, 247, 0.16));
          }
          50% {
            transform: translateY(-4px) scale(1.035);
            filter: drop-shadow(0 24px 36px rgba(0, 0, 0, 0.38))
              drop-shadow(0 0 34px rgba(168, 85, 247, 0.22));
          }
        }

        .vault-glass-button {
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: linear-gradient(180deg, rgba(10, 12, 18, 0.96) 0%, rgba(8, 8, 14, 0.98) 100%);
          box-shadow:
            0 18px 38px rgba(0, 0, 0, 0.36),
            inset 0 1px 0 rgba(255, 255, 255, 0.08),
            0 0 0 1px rgba(255, 255, 255, 0.02);
        }

        .vault-glass-button::before {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: inherit;
          margin: -2px;
          padding: 2px;
          background-image: conic-gradient(
            from 180deg,
            rgba(255, 255, 255, 0.92) 0deg,
            rgba(255, 255, 255, 0.3) 42deg,
            rgba(210, 210, 210, 0.42) 78deg 102deg,
            rgba(255, 255, 255, 0.85) 150deg,
            rgba(195, 195, 195, 0.28) 248deg 278deg,
            rgba(255, 255, 255, 0.92) 330deg
          );
          mask:
            linear-gradient(#fff, #fff) content-box,
            linear-gradient(#fff, #fff);
          mask-composite: exclude;
          -webkit-mask:
            linear-gradient(#fff, #fff) content-box,
            linear-gradient(#fff, #fff);
          -webkit-mask-composite: xor;
          pointer-events: none;
          opacity: 0.92;
        }

        .vault-glass-button__surface {
          position: relative;
          z-index: 1;
          display: flex;
          min-height: 100%;
          width: 100%;
          align-items: center;
          justify-content: center;
          border-radius: calc(1.15rem - 2px);
          background:
            radial-gradient(60% 140% at 50% 0%, rgba(255, 255, 255, 0.12) 0%, transparent 58%),
            radial-gradient(90% 100% at 50% 100%, rgba(168, 85, 247, 0.15) 0%, transparent 72%),
            rgba(255, 255, 255, 0.04);
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.1),
            inset 0 -14px 18px rgba(0, 0, 0, 0.18);
        }

        .vault-glass-button__label {
          color: rgba(255, 255, 255, 0.92);
          text-shadow:
            0 0 18px rgba(168, 85, 247, 0.2),
            0 1px 0 rgba(0, 0, 0, 0.28);
        }

        .vault-glass-button:hover {
          transform: translateY(-1px);
          box-shadow:
            0 22px 44px rgba(0, 0, 0, 0.42),
            0 0 26px rgba(168, 85, 247, 0.12),
            inset 0 1px 0 rgba(255, 255, 255, 0.1),
            0 0 0 1px rgba(255, 255, 255, 0.03);
        }

        .vault-glass-button:hover .vault-glass-button__surface {
          background:
            radial-gradient(60% 140% at 50% 0%, rgba(255, 255, 255, 0.14) 0%, transparent 58%),
            radial-gradient(90% 100% at 50% 100%, rgba(168, 85, 247, 0.2) 0%, transparent 72%),
            rgba(255, 255, 255, 0.05);
        }

        .vault-glass-button:active {
          transform: translateY(1px) scale(0.985);
          box-shadow:
            inset 0 4px 12px rgba(0, 0, 0, 0.28),
            inset 0 -3px 8px rgba(255, 255, 255, 0.04),
            0 10px 22px rgba(0, 0, 0, 0.28);
        }
      `}</style>
    </main>
  );
}
