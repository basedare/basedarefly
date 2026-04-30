'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useEffect } from 'react';
import { useIgnition } from '@/app/context/IgnitionContext';

export default function MobileIgnitionField() {
  const { ignitionActive, ignitionId } = useIgnition();

  useEffect(() => {
    if (typeof document === 'undefined') return;

    const root = document.documentElement;

    if (!ignitionActive) {
      root.classList.remove('bd-mobile-ignition-active');
      return;
    }

    root.classList.add('bd-mobile-ignition-active');

    return () => {
      root.classList.remove('bd-mobile-ignition-active');
    };
  }, [ignitionActive, ignitionId]);

  return (
    <>
      <AnimatePresence>
        {ignitionActive ? (
          <motion.div
            key={ignitionId}
            className="pointer-events-none fixed inset-0 z-[94] overflow-hidden md:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
            aria-hidden="true"
          >
            <motion.div
              className="absolute left-1/2 top-[34%] h-[42vh] w-[42vh] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(245,197,24,0.28)_0%,rgba(249,115,22,0.12)_34%,transparent_68%)] blur-xl mix-blend-screen"
              initial={{ scale: 0.45, opacity: 0 }}
              animate={{ scale: 1.7, opacity: [0, 0.92, 0] }}
              transition={{ duration: 1.05, times: [0, 0.28, 1], ease: 'easeOut' }}
            />
            {[0, 0.12, 0.24].map((delay, index) => (
              <motion.span
                key={delay}
                className="absolute left-1/2 top-[38%] h-28 w-28 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#f5c518]/45 shadow-[0_0_28px_rgba(245,197,24,0.34),inset_0_0_20px_rgba(245,197,24,0.12)]"
                initial={{ scale: 0.42, opacity: 0.8 }}
                animate={{ scale: 3.7 + index * 0.8, opacity: 0 }}
                transition={{ duration: 1.02, delay, ease: [0.18, 0.9, 0.18, 1] }}
              />
            ))}
            <motion.div
              className="absolute inset-x-0 top-[28%] h-px bg-[linear-gradient(90deg,transparent,rgba(255,232,140,0.9),transparent)] mix-blend-screen"
              initial={{ scaleX: 0, opacity: 0 }}
              animate={{ scaleX: 1, opacity: [0, 1, 0] }}
              transition={{ duration: 0.42, delay: 0.06, ease: 'easeOut' }}
            />
            <motion.div
              className="absolute inset-0 bg-[radial-gradient(circle_at_50%_32%,rgba(255,244,186,0.22)_0%,rgba(245,197,24,0.10)_18%,transparent_48%)] mix-blend-screen"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 1, 0] }}
              transition={{ duration: 0.62, ease: 'easeOut' }}
            />
          </motion.div>
        ) : null}
      </AnimatePresence>

      <style jsx global>{`
        @media (max-width: 767px) {
          html.bd-mobile-ignition-active .bd-app-shell {
            animation: bd-mobile-ignition-tremor 420ms cubic-bezier(0.2, 0.9, 0.2, 1) both;
            transform-origin: 50% 36%;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          html.bd-mobile-ignition-active .bd-app-shell {
            animation: none !important;
          }
        }

        @keyframes bd-mobile-ignition-tremor {
          0%,
          100% {
            transform: translate3d(0, 0, 0);
          }
          12% {
            transform: translate3d(0.7px, -0.9px, 0) rotate(-0.08deg);
          }
          26% {
            transform: translate3d(-1.1px, 0.6px, 0) rotate(0.08deg);
          }
          42% {
            transform: translate3d(0.8px, 0.9px, 0) rotate(-0.05deg);
          }
          58% {
            transform: translate3d(-0.6px, -0.4px, 0) rotate(0.04deg);
          }
          76% {
            transform: translate3d(0.4px, 0.2px, 0);
          }
        }
      `}</style>
    </>
  );
}
