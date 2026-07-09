'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { useIgnition } from '@/app/context/IgnitionContext';

// Roughly where the FUND button sits on a phone — the immersion rises from here.
const ORIGIN_TOP = '44%';

export default function MobileIgnitionField() {
  const { ignitionActive, ignitionId, charging, ignitionIntensity } = useIgnition();
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    if (!ignitionActive || reduced) {
      root.classList.remove('bd-mobile-ignition-active');
      return;
    }
    root.classList.add('bd-mobile-ignition-active');
    return () => {
      root.classList.remove('bd-mobile-ignition-active');
    };
  }, [ignitionActive, ignitionId, reduced]);

  const show = ignitionActive && !reduced;
  // Melt is present during the hold AND through the release.
  const melt = (charging || ignitionActive) && !reduced;
  // Quick tap = softer bloom; a full hold = fuller bloom.
  const burstK = 0.55 + 0.45 * ignitionIntensity;

  return (
    <>
      {/* Environment melt — driven continuously by --bd-charge as you hold. The
          page content saturates under the backdrop, a gold immersion rises from
          the button, a vignette closes inward, and faint VHS scanlines bleed in.
          Blended into the environment, not a starburst on top of it. */}
      {melt ? (
        <div className="pointer-events-none fixed inset-0 z-[92] md:hidden" aria-hidden="true">
          <div
            className="absolute inset-0"
            style={{
              backdropFilter:
                'saturate(calc(1 + var(--bd-charge, 0) * 1.7)) brightness(calc(1 + var(--bd-charge, 0) * 0.1)) contrast(calc(1 + var(--bd-charge, 0) * 0.06))',
              WebkitBackdropFilter:
                'saturate(calc(1 + var(--bd-charge, 0) * 1.7)) brightness(calc(1 + var(--bd-charge, 0) * 0.1)) contrast(calc(1 + var(--bd-charge, 0) * 0.06))',
            }}
          />
          <div
            className="absolute inset-0 mix-blend-screen bg-[radial-gradient(circle_at_50%_44%,rgba(255,236,153,0.5)_0%,rgba(245,197,24,0.2)_28%,rgba(249,115,22,0.07)_52%,transparent_74%)]"
            style={{ opacity: 'var(--bd-charge, 0)' }}
          />
          {/* Retro VHS scanlines — subtle horizontal bleed that intensifies with the hold. */}
          <div
            className="absolute inset-0 mix-blend-soft-light bg-[repeating-linear-gradient(0deg,rgba(0,0,0,0.2)_0px,rgba(0,0,0,0.2)_1px,transparent_1px,transparent_3px)]"
            style={{ opacity: 'calc(var(--bd-charge, 0) * 0.55)' }}
          />
          {/* Film grain — the grit, shifting every few frames. */}
          <div
            className="bd-ignition-grain absolute inset-0 mix-blend-overlay"
            style={{
              opacity: 'calc(var(--bd-charge, 0) * 0.5)',
              backgroundImage:
                "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
              backgroundSize: '140px 140px',
            }}
          />
          {/* Cyan-tinged vignette closing inward — futuristic edge over gritty dark. */}
          <div
            className="absolute inset-0"
            style={{
              opacity: 'var(--bd-charge, 0)',
              boxShadow:
                'inset 0 0 90px 22px rgba(80,232,255,0.14), inset 0 0 150px 40px rgba(245,197,24,0.26), inset 0 0 240px 90px rgba(8,7,18,0.5)',
            }}
          />
        </div>
      ) : null}

      {/* Release = a soft light bloom rising from the button. No streaks, rings,
          or confetti — the glitter field carries the particles. */}
      <AnimatePresence>
        {show ? (
          <motion.div
            key={ignitionId}
            className="pointer-events-none fixed inset-0 z-[94] overflow-hidden md:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: burstK }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
            aria-hidden="true"
          >
            <motion.div
              className="absolute left-1/2 h-[52vh] w-[52vh] rounded-full bg-[radial-gradient(circle,rgba(255,244,186,0.4)_0%,rgba(245,197,24,0.18)_32%,rgba(80,232,255,0.1)_52%,transparent_72%)] blur-2xl mix-blend-screen"
              style={{ top: ORIGIN_TOP }}
              initial={{ scale: 0.5, opacity: 0, x: '-50%', y: '-50%' }}
              animate={{ scale: 1.7, opacity: [0, 0.85, 0], x: '-50%', y: '-50%' }}
              transition={{ duration: 1.15, times: [0, 0.3, 1], ease: 'easeOut' }}
            />
          </motion.div>
        ) : null}
      </AnimatePresence>

      <style jsx global>{`
        @media (max-width: 767px) {
          html.bd-mobile-ignition-active .bd-app-shell {
            animation: bd-mobile-ignition-punch 460ms cubic-bezier(0.16, 0.9, 0.24, 1) both;
            transform-origin: 50% 42%;
            will-change: transform;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          html.bd-mobile-ignition-active .bd-app-shell {
            animation: none !important;
          }
        }

        /* Film-grain jitter — shifts the noise so it flickers like signal grit. */
        .bd-ignition-grain {
          animation: bd-grain-shift 0.5s steps(3) infinite;
        }
        @keyframes bd-grain-shift {
          0% {
            background-position: 0 0;
          }
          33% {
            background-position: -47px 31px;
          }
          66% {
            background-position: 29px -43px;
          }
          100% {
            background-position: 0 0;
          }
        }

        /* A single decisive zoom-punch — an energy "thump" outward from the
           button, softer than a shake. */
        @keyframes bd-mobile-ignition-punch {
          0% {
            transform: scale(1);
          }
          22% {
            transform: scale(1.016);
          }
          50% {
            transform: scale(0.996);
          }
          100% {
            transform: scale(1);
          }
        }
      `}</style>
    </>
  );
}
