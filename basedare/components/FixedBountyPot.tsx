'use client';
import { motion } from 'framer-motion';
import { Sparkles, DollarSign, Trophy } from 'lucide-react';
import MoltenGold from './ui/MoltenGold';
import Link from 'next/link';

interface FixedBountyPotProps {
    totalPot: string;
    countdown: string;
}

const FixedBountyPot: React.FC<FixedBountyPotProps> = ({ totalPot, countdown }) => {
    
    // Framer Motion variants for the floating/breathing effect
    const bounceVariants = {
        initial: { y: 15, opacity: 0.8 },
        animate: {
            y: 0,
            opacity: 1,
        },
    };

    return (
        <motion.div
            className="fixed bottom-[130px] right-4 z-[999] w-[180px] md:w-[220px] p-3 rounded-xl backdrop-blur-xl bg-black/70 border-2 border-purple-500/50 shadow-[0_0_20px_rgba(168,85,247,0.5),_0_0_10px_rgba(255,215,0,0.5)] cursor-pointer transition-transform hover:scale-[1.02]"
            variants={bounceVariants}
            initial="initial"
            animate="animate"
            whileTap={{ scale: 0.95 }}
            transition={{
                type: "spring",
                stiffness: 100,
                damping: 10,
                duration: 1.5,
                repeat: Infinity,
                repeatType: "reverse" as const,
            }}
        >
            <Link href="/bounty-pot" className="block">
                <div className="flex items-center justify-center gap-2 mb-2">
                    <Trophy className="w-4 h-4 text-yellow-400" />
                    <span className="text-xs font-bold uppercase tracking-widest text-purple-300">
                        Total Bounty Pot
                    </span>
                </div>

                {/* Pot Value */}
                <div className="text-center mb-1">
                    <MoltenGold className="text-2xl font-extrabold flex items-center justify-center">
                        <DollarSign className="w-4 h-4 mr-1 fill-yellow-400 text-yellow-400" />
                        {totalPot}
                    </MoltenGold>
                </div>

                {/* Countdown */}
                <div className="text-center text-xs font-mono text-gray-400 mt-2">
                    <Sparkles className="inline w-3 h-3 text-yellow-500 animate-pulse mr-1" />
                    {countdown} LEFT
                </div>
            </Link>
        </motion.div>
    );
};

export default FixedBountyPot;








