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
  const signalLabel = initialTopic === 'venue-claim'
    ? 'Venue claim signal'
    : initialTopic === 'venue-partnership'
      ? 'Venue partnership signal'
      : 'Contact • Feedback • Partnerships';
  const heroCopy = initialTopic === 'venue-claim'
    ? 'Claim a venue pin, activate the command center, and get your place ready for sponsored dares.'
    : initialTopic === 'venue-partnership'
      ? 'Tell us which venue you want to sponsor and we will route the activation conversation from there.'
      : 'Suggest a venue, pitch a partnership, report a bug, or send the idea that should become part of the grid.';
  const routeCards = [
    {
      label: 'Venue signal',
      accent: 'text-cyan-200',
      body: 'Send a place that should be visible on the map.',
      foot: 'Name • location • why it matters',
    },
    {
      label: 'Paid activation',
      accent: 'text-yellow-200',
      body: 'For venues and brands ready to fund live challenges.',
      foot: 'Venue • budget • target outcome',
    },
    {
      label: 'Product signal',
      accent: 'text-purple-200',
      body: 'Bugs, creator feedback, weird ideas, or broken flows.',
      foot: 'What happened • what should happen',
    },
  ];
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
    <main className="relative flex flex-col items-center justify-start overflow-hidden bg-transparent px-4 pb-14 pt-6 md:pb-16 md:pt-8">
      <LiquidBackground />
      <div className="fixed inset-0 z-10 hidden pointer-events-none md:block">
        <GradualBlurOverlay />
      </div>

      <div className="pointer-events-none absolute inset-0 z-[1]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_14%,rgba(168,85,247,0.18),transparent_32%),radial-gradient(circle_at_82%_22%,rgba(34,211,238,0.12),transparent_28%),radial-gradient(circle_at_50%_92%,rgba(250,204,21,0.12),transparent_34%),linear-gradient(180deg,rgba(4,5,10,0.2)_0%,rgba(4,5,10,0.5)_100%)]" />
        <div className="absolute inset-0 backdrop-blur-[1.5px]" />
      </div>

      <div className="pointer-events-none absolute left-1/2 top-1/2 z-[2] h-[100vh] w-[150vw] -translate-x-1/2 -translate-y-1/2 rounded-full bg-purple-900/10 blur-[150px]" />

      <div className={`relative z-20 w-full max-w-6xl overflow-hidden p-4 text-left md:p-6 lg:p-7 ${raisedShellClass}`}>
        <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/24 to-transparent" />
        <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-yellow-300/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-20 h-72 w-72 rounded-full bg-purple-500/12 blur-3xl" />

        <div className="relative grid gap-4 lg:grid-cols-[0.92fr_1.08fr] lg:items-stretch">
          <section className="relative overflow-hidden rounded-[26px] border border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.08)_0%,rgba(7,8,16,0.88)_42%,rgba(5,6,12,0.98)_100%)] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.12),inset_0_-18px_34px_rgba(0,0,0,0.28)] md:p-7">
            <div className="pointer-events-none absolute inset-x-6 top-5 h-10 rounded-full bg-gradient-to-r from-transparent via-white/[0.035] to-transparent blur-sm" />
            <div className="relative flex items-start justify-between gap-4">
              <div className={`${dentWellClass} w-fit px-4 py-3`}>
                <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-gray-200/90">
                  {signalLabel}
                </p>
              </div>
              <div className="relative hidden shrink-0 sm:block">
                <div className="absolute -inset-5 rounded-full bg-purple-500/20 blur-2xl" />
                <img
                  src="/assets/peebear-head.png"
                  alt="BaseDare Signal Bear"
                  className="vault-peebear relative z-10 h-24 w-24 object-contain md:h-32 md:w-32"
                />
              </div>
            </div>

            <div className="relative mt-8 max-w-2xl space-y-5">
              <div className="sm:hidden">
                <img
                  src="/assets/peebear-head.png"
                  alt="BaseDare Signal Bear"
                  className="vault-peebear mx-auto h-24 w-24 object-contain"
                />
              </div>
              <div className="md:hidden">
                <h1 className="font-display text-[22vw] font-black italic leading-[0.82] tracking-[-0.08em] text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-400 sm:text-[18vw]">
                  <span className="block">SIGNAL</span>
                  <span className="block">THE GRID</span>
                </h1>
              </div>
              <div className="hidden md:block">
                <ChromeText
                  text="SIGNAL THE GRID"
                  className="text-6xl leading-[0.86] tracking-[-0.06em] lg:text-7xl xl:text-8xl"
                />
              </div>
              <p className="max-w-xl text-base leading-relaxed text-white/72 md:text-lg">
                {heroCopy}
              </p>
            </div>

            <div className="relative mt-7 grid gap-3 md:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
              {routeCards.map((card) => (
                <div key={card.label} className={`${dentWellClass} px-4 py-4`}>
                  <p className={`font-mono text-[10px] uppercase tracking-[0.24em] ${card.accent}`}>
                    {card.label}
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-white/75">{card.body}</p>
                  <p className="mt-3 font-mono text-[9px] uppercase tracking-[0.22em] text-white/36">
                    {card.foot}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section className="relative rounded-[26px] border border-white/10 bg-[radial-gradient(circle_at_20%_0%,rgba(168,85,247,0.14),transparent_38%),linear-gradient(180deg,rgba(10,11,22,0.92),rgba(3,4,10,0.98))] p-4 shadow-[0_18px_44px_rgba(0,0,0,0.34),inset_0_1px_0_rgba(255,255,255,0.1)] md:p-6">
            <div className="mb-5 grid gap-3 sm:grid-cols-3">
              {[
                ['Route', initialTopic === 'venue-claim' ? 'Claim' : initialTopic === 'venue-partnership' ? 'Partner' : 'Open'],
                ['Signal time', 'Under 60 sec'],
                ['Reply path', 'Direct'],
              ].map(([label, value]) => (
                <div key={label} className={`${dentWellClass} px-4 py-3`}>
                  <p className="font-mono text-[9px] uppercase tracking-[0.24em] text-white/38">{label}</p>
                  <p className="mt-1 text-sm font-black uppercase tracking-[0.08em] text-white">{value}</p>
                </div>
              ))}
            </div>

            {!submitted ? (
              <div className="space-y-5">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-purple-200/85">
                    Open signal line
                  </p>
                  <h2 className="mt-2 text-2xl font-black tracking-[-0.04em] text-white md:text-3xl">
                    Tell us what should happen next.
                  </h2>
                </div>

                <form onSubmit={handleSubmit} className="w-full space-y-4">
                  <div className={`${dentWellClass} px-2 py-2`}>
                    <input
                      type="email"
                      required
                      placeholder="EMAIL ADDRESS"
                      className="w-full rounded-[1rem] border border-white/8 bg-transparent px-4 py-4 font-mono text-sm tracking-[0.18em] text-white outline-none transition-all placeholder:text-gray-400 focus:border-purple-400/40"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>

                  <div className={`${dentWellClass} px-2 py-2`}>
                    <textarea
                      placeholder="DROP YOUR SIGNAL"
                      className="min-h-[210px] w-full resize-none rounded-[1rem] border border-white/8 bg-transparent px-4 py-4 font-mono text-sm leading-relaxed tracking-[0.06em] text-white outline-none transition-all placeholder:text-gray-400 focus:border-purple-400/40"
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
              <div className={`animate-in fade-in zoom-in p-8 text-center duration-500 ${dentWellClass}`}>
                <h3 className="mb-2 text-3xl font-black italic uppercase tracking-tighter text-white">
                  Signal Received
                </h3>
                <p className="font-mono text-xs uppercase tracking-widest text-purple-300">We&apos;ll read it.</p>
                <p className="mt-3 text-sm text-white/62">Thanks for helping shape the grid.</p>
              </div>
            )}

            <div className={`${dentWellClass} mt-5 px-4 py-3 text-center`}>
              <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-gray-400/80">
                Base Mainnet • Open Signal Line
              </p>
            </div>
          </section>
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
