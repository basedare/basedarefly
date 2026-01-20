'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useIgnition } from '@/app/context/IgnitionContext';

interface InitProtocolButtonProps {
  className?: string;
  onClick?: () => void;
}

export default function InitProtocolButton({ className, onClick }: InitProtocolButtonProps) {
  const { ignitionActive, triggerIgnition } = useIgnition();

  const handleAction = () => {
    triggerIgnition();
    if (onClick) onClick();
  };

  return (
    <div className={`relative group p-[1.5px] rounded-2xl overflow-hidden transition-all duration-500 ${className ?? ''}`}>
      <div
        className={`
          absolute inset-[-100%]
          ${
            ignitionActive
              ? 'bg-[conic-gradient(from_0deg,#78350f_0%,#facc15_25%,#78350f_50%,#facc15_75%,#78350f_100%)] animate-[spin_3s_linear_infinite]'
              : 'bg-[conic-gradient(from_0deg,#1a1a1a_0%,#737373_20%,#fff_25%,#737373_30%,#1a1a1a_50%,#737373_70%,#fff_75%,#737373_80%,#1a1a1a_100%)] group-hover:animate-[spin_3s_linear_infinite]'
          }
          transition-all duration-500
        `}
        aria-hidden="true"
      />

      <motion.button
        whileTap={{ scale: 0.98 }}
        onClick={handleAction}
        className="relative w-full h-full flex items-center justify-center bg-[#050505] backdrop-blur-3xl px-10 py-5 rounded-[15px]"
      >
        <div className="absolute inset-0 bg-gradient-to-tr from-white/10 via-transparent to-white/5 pointer-events-none" />

        <span
          className={`
            relative z-10 font-black italic uppercase tracking-[0.2em] text-xl
            transition-all duration-500
            ${ignitionActive ? 'text-yellow-400 scale-110' : 'text-white group-hover:tracking-[0.25em]'}
          `}
        >
          {ignitionActive ? 'IGNITING...' : 'INITIATE PROTOCOL'}
        </span>

        <AnimatePresence>
          {ignitionActive && (
            <motion.div
              initial={{ scale: 0.8, opacity: 1 }}
              animate={{ scale: 3, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className="absolute inset-0 rounded-full bg-yellow-400/30 pointer-events-none z-0"
            />
          )}
        </AnimatePresence>

        <div className={`absolute inset-0 bg-yellow-500/5 transition-opacity duration-500 ${ignitionActive ? 'opacity-100' : 'opacity-0'}`} />
      </motion.button>

      <div
        className={`
          absolute inset-0 transition-opacity duration-700 pointer-events-none
          ${
            ignitionActive
              ? 'shadow-[0_0_60px_rgba(250,204,21,0.4),inset_0_0_20px_rgba(250,204,21,0.2)] opacity-100'
              : 'opacity-0'
          }
        `}
        aria-hidden="true"
      />
    </div>
  );
}
