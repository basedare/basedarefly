'use client';

import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface LiquidCrystalBallProps {
  children: ReactNode;
  className?: string;
}

const LiquidCrystalBall = ({ children, className = '' }: LiquidCrystalBallProps) => {
  return (
    <motion.div
      className={`relative rounded-full border-4 border-purple-500/50 bg-black/60 shadow-[0_0_60px_rgba(168,85,247,0.7)] backdrop-blur-md overflow-hidden flex items-center justify-center ${className}`}
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 120, damping: 20 }}
    >
      {/* Subtle cosmic shimmer */}
      <div
        className="absolute inset-0 opacity-40 mix-blend-screen pointer-events-none"
        style={{
          backgroundImage: 'linear-gradient(135deg, rgba(168,85,247,0.3) 0%, rgba(250,204,21,0.2) 50%, rgba(168,85,247,0.3) 100%)',
          backgroundSize: '200% 200%',
          animation: 'slow-pan 25s linear infinite',
        }}
      />
      {children}
    </motion.div>
  );
};

export default LiquidCrystalBall;
