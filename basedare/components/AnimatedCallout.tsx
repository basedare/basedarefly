// components/AnimatedCallout.tsx
import { motion } from 'framer-motion';

const pulseVariants = {
  animate: {
    scale: [1, 1.01, 1], // Subtle scale change
    textShadow: [
      "0 0 10px #fff, 0 0 20px #fff", 
      "0 0 15px #fff, 0 0 25px #fff",
      "0 0 10px #fff, 0 0 20px #fff"
    ],
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: "easeInOut"
    }
  }
};

const AnimatedCallout = () => {
  return (
    // Enforced white background for the text wrapper, 
    // but contained within the Hero section.
    <div className="bg-white p-2 rounded-lg shadow-2xl shadow-white/30 mx-auto inline-block">
      <motion.h1
        className="text-3xl md:text-5xl font-extrabold text-black uppercase tracking-widest px-4 py-1"
        variants={pulseVariants}
        initial="animate" // Start the animation immediately
        animate="animate"
      >
        MAKE 'EM EARN IT
      </motion.h1>
    </div>
  );
};

export default AnimatedCallout;








