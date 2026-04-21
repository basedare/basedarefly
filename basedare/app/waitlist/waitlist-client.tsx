'use client';

import React, { useMemo, useState } from 'react';
import ChromeText from '@/components/ChromeText';
import CosmicButton from '@/components/ui/CosmicButton';
import GradualBlurOverlay from '@/components/GradualBlurOverlay';
import LiquidBackground from '@/components/LiquidBackground';

type WaitlistClientProps = {
  initialTopic: string | null;
  initialVenue: string | null;
  initialCity: string | null;
  initialVenueSlug: string | null;
  initialSource: string | null;
  initialAudience: string | null;
  initialIntent: string | null;
  initialReportSessionKey: string | null;
};

export default function WaitlistClient({
  initialTopic,
  initialVenue,
  initialCity,
  initialVenueSlug,
  initialSource,
  initialAudience,
  initialIntent,
  initialReportSessionKey,
}: WaitlistClientProps) {
  const [email, setEmail] = useState('');
  const raisedShellClass =
    'rounded-[28px] border border-white/15 bg-[linear-gradient(180deg,rgba(255,255,255,0.08)_0%,rgba(255,255,255,0.03)_18%,rgba(8,9,16,0.9)_62%,rgba(6,7,12,0.95)_100%)] shadow-[10px_14px_48px_rgba(3,8,26,0.55),-8px_-8px_24px_rgba(255,255,255,0.04),0_0_28px_rgba(168,85,247,0.08),inset_0_1px_0_rgba(255,255,255,0.2),inset_0_-18px_24px_rgba(0,0,0,0.24)] backdrop-blur-2xl';
  const dentWellClass =
    'bd-dent-surface bd-dent-surface--soft rounded-[1.35rem] border border-white/6 bg-white/[0.02]';
  const signalSource = initialTopic === 'venue-claim'
    ? 'BaseDare Venue Claim Signal'
    : initialTopic === 'venue-partnership'
      ? 'BaseDare Venue Partnership Signal'
      : 'BaseDare Contact Signal';
  const prefilledNotes = useMemo(() => {
    if (initialTopic === 'venue-claim') {
      return [
        'Venue claim request',
        initialVenue ? `Venue: ${initialVenue}` : null,
        initialCity ? `City: ${initialCity}` : null,
        '',
        'I want to claim this venue and activate the command center.',
      ]
        .filter(Boolean)
        .join('\n');
    }

    if (initialTopic === 'venue-partnership') {
      return [
        'Venue partnership / sponsorship request',
        initialVenue ? `Venue: ${initialVenue}` : null,
        initialCity ? `City: ${initialCity}` : null,
        '',
        'I want to explore sponsored challenges and verified foot-traffic analytics.',
      ]
        .filter(Boolean)
        .join('\n');
    }

    return '';
  }, [initialCity, initialTopic, initialVenue]);
  const [notes, setNotes] = useState(prefilledNotes);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const response = await fetch('https://formspree.io/f/xaqnrpgg', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        email,
        notes,
        source: signalSource,
      }),
    });

    if (response.ok) {
      if (initialSource === 'venue-report' && initialVenueSlug) {
        try {
          await fetch(`/api/venues/${encodeURIComponent(initialVenueSlug)}/report`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              type: 'handoff',
              audience: initialAudience === 'sponsor' ? 'sponsor' : 'venue',
              sessionKey: initialReportSessionKey,
              intent:
                initialIntent === 'claim' || initialIntent === 'activation' || initialIntent === 'repeat'
                  ? initialIntent
                  : null,
              email,
              notes,
            }),
          });
        } catch {
          // The contact signal should still succeed even if report attribution fails.
        }
      }
      setSubmitted(true);
    } else {
      alert('Signal failed to route. Try again in a moment.');
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

      <div className="pointer-events-none absolute left-1/2 top-1/2 z-[2] h-[100vh] w-[150vw] -translate-x-1/2 -translate-y-1/2 rounded-full bg-purple-900/10 blur-[150px]" />

      <div className={`relative z-20 w-full max-w-md space-y-6 p-5 text-center md:space-y-7 md:p-8 ${raisedShellClass}`}>
        <div className="relative group mx-auto w-fit">
          <div className="absolute -inset-4 rounded-full bg-purple-500/20 opacity-0 blur-2xl transition-opacity duration-700 group-hover:opacity-100" />
          <img
            src="/assets/peebear-head.png"
            alt="BaseDare Signal Bear"
            className="vault-peebear relative z-10 mx-auto h-28 w-28 object-contain sm:h-32 sm:w-32 md:h-44 md:w-44"
          />
        </div>

        <div className="space-y-3">
          <div className={`${dentWellClass} px-4 py-3.5`}>
            <p className="text-gray-200/90 font-mono text-[10px] uppercase tracking-[0.28em] md:text-xs">
              {initialTopic === 'venue-claim'
                ? 'Venue Claim • Partnerships'
                : initialTopic === 'venue-partnership'
                  ? 'Venue Partnership • Sponsorship'
                  : 'Contact • Feedback • Partnerships'}
            </p>
          </div>
          <div className="mx-auto max-w-[300px] space-y-2 md:max-w-[380px]">
            <div className="md:hidden">
              <h1 className="font-display text-[22vw] font-black italic leading-[0.86] tracking-[-0.08em] text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-400">
                <span className="block">SIGNAL</span>
                <span className="block">THE</span>
                <span className="block">GRID</span>
              </h1>
            </div>
            <div className="hidden md:block">
              <ChromeText
                text="SIGNAL THE GRID"
                className="text-5xl leading-[0.92] tracking-[-0.04em]"
              />
            </div>
            <p className="text-sm leading-relaxed text-white/72 md:text-[15px]">
              {initialTopic === 'venue-claim'
                ? 'Claim a venue pin, activate the command center, and get your place ready for sponsored dares.'
                : initialTopic === 'venue-partnership'
                  ? 'Tell us which venue you want to sponsor and we will route the activation conversation from there.'
                  : 'Suggest a venue, pitch a partnership, or send us a bug, idea, or question.'}
            </p>
          </div>
        </div>

        {!submitted ? (
          <div className="w-full space-y-5">
            <div className="grid gap-3 text-left sm:grid-cols-3">
              <div className={`${dentWellClass} px-4 py-4`}>
                <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-purple-300/90">
                  Suggest A Venue
                </p>
                <p className="mt-2 text-sm leading-relaxed text-white/76">
                  Know a place that should be on the map? Drop us the location.
                </p>
              </div>
              <div className={`${dentWellClass} px-4 py-4`}>
                <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-yellow-300/90">
                  Partnership
                </p>
                <p className="mt-2 text-sm leading-relaxed text-white/76">
                  Venues and brands can reach us directly about paid activations.
                </p>
              </div>
              <div className={`${dentWellClass} px-4 py-4`}>
                <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-cyan-300/90">
                  General Signal
                </p>
                <p className="mt-2 text-sm leading-relaxed text-white/76">
                  Bugs, feedback, creator questions, or anything else on your mind.
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="w-full space-y-3">
              <div className={`${dentWellClass} px-2 py-2`}>
                <input
                  type="email"
                  required
                  placeholder="EMAIL ADDRESS"
                  className="w-full rounded-[1rem] border border-white/8 bg-transparent px-4 py-4 text-center font-mono text-sm tracking-[0.22em] text-white outline-none transition-all placeholder:text-gray-400 focus:border-purple-400/40"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className={`${dentWellClass} px-2 py-2`}>
                <textarea
                  placeholder="DROP YOUR SIGNAL"
                  className="min-h-[120px] w-full resize-none rounded-[1rem] border border-white/8 bg-transparent px-4 py-4 font-mono text-sm leading-relaxed tracking-[0.08em] text-white outline-none transition-all placeholder:text-gray-400 focus:border-purple-400/40"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              <CosmicButton type="submit" fullWidth size="lg" className="w-full">
                Send Signal
              </CosmicButton>
            </form>
          </div>
        ) : (
          <div className={`animate-in fade-in zoom-in p-8 duration-500 ${dentWellClass}`}>
            <h3 className="mb-2 text-2xl font-black italic uppercase tracking-tighter text-white">Signal Received</h3>
            <p className="font-mono text-xs uppercase tracking-widest text-purple-400">We&apos;ll read it.</p>
            <p className="mt-3 text-sm text-white/62">Thanks for helping shape the grid.</p>
          </div>
        )}

        <div className={`${dentWellClass} px-4 py-3`}>
          <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-gray-400/80">
            Base Mainnet • Open Signal Line
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
      `}</style>
    </main>
  );
}
