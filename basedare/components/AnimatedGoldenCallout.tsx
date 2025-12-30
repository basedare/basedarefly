// components/AnimatedGoldenCallout.tsx
'use client';

import { motion, Variants } from 'framer-motion';

// Defined CSS for approximating the toxic golden honey drip look
const GOLD_TEXT_CLASSES = 'text-transparent bg-clip-text bg-gradient-to-b from-[#FADF94] via-[#CD9A30] to-[#997926] shadow-xl drop-shadow-[0_4px_6px_rgba(251,191,36,0.6)]';

const pulseVariants: Variants = {
  animate: {
    scale: [1, 1.01, 1], 
    textShadow: [
      "0 0 10px #FFD700, 0 0 20px #FFD700", 
      "0 0 15px #FFD700, 0 0 25px #FFD700",
      "0 0 10px #FFD700, 0 0 20px #FFD700"
    ],
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: "easeInOut" as const // Fix applied here
    }
  }
};

const AnimatedGoldenCallout = () => {
  return (
    // Reverting to the black background structure
    <div className="mx-auto inline-block">
      <motion.h1
        className={`text-3xl md:text-5xl font-extrabold uppercase tracking-widest px-4 py-1 ${GOLD_TEXT_CLASSES}`}
        variants={pulseVariants}
        initial="animate" 
        animate="animate"
      >
        MAKE 'EM EARN IT
      </motion.h1>
    </div>
  );
};

export default AnimatedGoldenCallout;




