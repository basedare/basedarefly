'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { useIgnition } from '@/app/context/IgnitionContext';

// Origin of the burst — roughly where the FUND button sits on a phone, high
// enough that the energy reads as radiating up and out across the whole screen.
const ORIGIN_TOP = '44%';

// Deterministic (no Math.random → SSR-safe) radial warp streaks. Uneven lengths
// keep it organic instead of a mechanical starburst.
const STREAKS = Array.from({ length: 16 }, (_, i) => {
  const angle = (360 / 16) * i;
  const len = 52 + ((i * 37) % 22); // 52–74vh
  const delay = (i % 4) * 0.015;
  return { angle, len, delay };
});

// Embers flung outward — precomputed vectors so render stays pure.
const EMBERS = Array.from({ length: 12 }, (_, i) => {
  const angle = (360 / 12) * i + (i % 2 === 0 ? 11 : -8);
  const dist = 120 + ((i * 53) % 90); // px
  const rad = (angle * Math.PI) / 180;
  return {
    x: Math.cos(rad) * dist,
    y: Math.sin(rad) * dist,
    delay: (i % 3) * 0.04,
    size: 5 + (i % 3) * 2,
  };
});

export default function MobileIgnitionField() {
  const { ignitionActive, ignitionId } = useIgnition();
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

  return (
    <>
      <AnimatePresence>
        {show ? (
          <motion.div
            key={ignitionId}
            className="pointer-events-none fixed inset-0 z-[94] overflow-hidden md:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.14, ease: 'easeOut' }}
            aria-hidden="true"
          >
            {/* Full-screen energy veil — the whole screen briefly charges gold. */}
            <motion.div
              className="absolute inset-0 bg-[radial-gradient(circle_at_50%_44%,rgba(255,244,186,0.24)_0%,rgba(245,197,24,0.12)_22%,rgba(249,115,22,0.05)_44%,transparent_66%)] mix-blend-screen"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 1, 0] }}
              transition={{ duration: 0.72, times: [0, 0.3, 1], ease: 'easeOut' }}
            />

            {/* Core bloom rising from the button. Centering goes through motion
                (x/y -50%) because motion owns the transform — Tailwind translate
                utilities would be clobbered by the animated scale. */}
            <motion.div
              className="absolute left-1/2 h-[46vh] w-[46vh] rounded-full bg-[radial-gradient(circle,rgba(255,244,186,0.5)_0%,rgba(245,197,24,0.28)_30%,rgba(249,115,22,0.1)_52%,transparent_70%)] blur-xl mix-blend-screen"
              style={{ top: ORIGIN_TOP }}
              initial={{ scale: 0.4, opacity: 0, x: '-50%', y: '-50%' }}
              animate={{ scale: 1.75, opacity: [0, 0.95, 0], x: '-50%', y: '-50%' }}
              transition={{ duration: 1.05, times: [0, 0.26, 1], ease: 'easeOut' }}
            />

            {/* Warp-speed streaks radiating outward = the "speeding up" feel.
                rotate is held constant in motion props (not a raw CSS transform)
                so it composes with the animated scaleY instead of being lost. */}
            <div className="absolute left-1/2 h-0 w-0" style={{ top: ORIGIN_TOP }}>
              {STREAKS.map((s) => (
                <motion.span
                  key={s.angle}
                  className="absolute w-[2px] rounded-full"
                  style={{
                    height: `${s.len}vh`,
                    bottom: 0,
                    left: -1,
                    transformOrigin: '50% 100%',
                    background:
                      'linear-gradient(to top, rgba(245,197,24,0) 0%, rgba(255,232,140,0.9) 34%, rgba(245,197,24,0) 100%)',
                  }}
                  initial={{ scaleY: 0.12, opacity: 0, rotate: s.angle }}
                  animate={{ scaleY: 1, opacity: [0, 0.9, 0], rotate: s.angle }}
                  transition={{
                    duration: 0.58,
                    delay: s.delay,
                    times: [0, 0.35, 1],
                    ease: [0.16, 0.9, 0.24, 1],
                  }}
                />
              ))}
            </div>

            {/* Shockwave rings. */}
            {[0, 0.11, 0.22].map((delay, index) => (
              <motion.span
                key={delay}
                className="absolute left-1/2 h-28 w-28 rounded-full border-2 border-[#f5c518]/50 shadow-[0_0_30px_rgba(245,197,24,0.4),inset_0_0_22px_rgba(245,197,24,0.14)]"
                style={{ top: ORIGIN_TOP }}
                initial={{ scale: 0.4, opacity: 0.85, x: '-50%', y: '-50%' }}
                animate={{ scale: 3.9 + index * 0.9, opacity: 0, x: '-50%', y: '-50%' }}
                transition={{ duration: 1.02, delay, ease: [0.18, 0.9, 0.18, 1] }}
              />
            ))}

            {/* Embers flung outward. */}
            <div className="absolute left-1/2 h-0 w-0" style={{ top: ORIGIN_TOP }}>
              {EMBERS.map((e, i) => (
                <motion.span
                  key={i}
                  className="absolute rounded-full bg-[#ffe98c] shadow-[0_0_10px_rgba(245,197,24,0.8)]"
                  style={{ width: e.size, height: e.size, left: -e.size / 2, top: -e.size / 2 }}
                  initial={{ x: 0, y: 0, opacity: 0, scale: 0.6 }}
                  animate={{ x: e.x, y: e.y, opacity: [0, 1, 0], scale: [0.6, 1, 0.3] }}
                  transition={{
                    duration: 0.9,
                    delay: e.delay,
                    times: [0, 0.2, 1],
                    ease: 'easeOut',
                  }}
                />
              ))}
            </div>

            {/* Horizontal light lance across the origin. */}
            <motion.div
              className="absolute inset-x-0 h-px bg-[linear-gradient(90deg,transparent,rgba(255,232,140,0.95),transparent)] mix-blend-screen"
              style={{ top: ORIGIN_TOP }}
              initial={{ scaleX: 0, opacity: 0 }}
              animate={{ scaleX: 1, opacity: [0, 1, 0] }}
              transition={{ duration: 0.4, delay: 0.05, ease: 'easeOut' }}
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

        /* A single decisive zoom-punch — an energy "thump" outward from the
           button — reads as expensive, where the old tremor read as nervous. */
        @keyframes bd-mobile-ignition-punch {
          0% {
            transform: scale(1);
          }
          20% {
            transform: scale(1.022);
          }
          46% {
            transform: scale(0.994);
          }
          70% {
            transform: scale(1.004);
          }
          100% {
            transform: scale(1);
          }
        }
      `}</style>
    </>
  );
}
