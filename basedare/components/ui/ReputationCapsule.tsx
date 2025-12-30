'use client';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface ReputationCapsuleProps {
    value: number; // 0 to 100
    className?: string;
}

const ReputationCapsule: React.FC<ReputationCapsuleProps> = ({ value, className }) => {
    const fillWidth = `${value}%`;

    const RADIOACTIVE_GRADIENT = 'linear-gradient(to right, #BFFF00, #FADF94 40%, #CD9A30)';
    
    // Static liquid position (Removed motion variants)
    const liquidStyles: React.CSSProperties = {
        backgroundPosition: '50% 50%',
        backgroundSize: '150% 150%',
        backgroundImage: 'radial-gradient(circle at 10% 20%, #BFFF00 5%, transparent 20%), radial-gradient(circle at 70% 80%, #A855F7 8%, transparent 30%)',
        mixBlendMode: 'overlay' as const
    };

    return (
        // FIX 1: Reduced overall height and removed max-w-md to fit list row better.
        <div className={cn("relative w-full h-12 flex items-center justify-center p-0.5 z-50", className)}>
            
            {/* FIX 3: Outer Casing - Dual Color Background (Purple/Yellow) */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-800 to-yellow-600 overflow-hidden" />
            
            {/* Space Glittery Purple Layer on Left Side */}
            <div className="absolute left-0 top-0 bottom-0 w-1/2 rounded-l-full bg-purple-900 opacity-80"
                 style={{ 
                     backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(255,255,255,0.1) 1px, transparent 1px)',
                     backgroundSize: '4px 4px',
                     boxShadow: 'inset 0 0 20px rgba(255,255,255,0.2)'
                 }}
            />

            {/* Neon Border Frame */}
            <div className="absolute inset-0 rounded-full border-2 border-purple-500/80 z-10"
                 style={{ 
                     boxShadow: '0 0 10px rgba(168,85,247,0.7), 0 0 10px rgba(255,215,0,0.7) inset',
                 }}
            />

            {/* Glass Tube Container */}
            <div className="relative w-[95%] h-3/4 rounded-full bg-gradient-to-b from-transparent to-black/40 overflow-hidden border border-white/20 backdrop-blur-sm z-20">
                
                {/* Honey Liquid Fill (static) */}
                <motion.div
                    className="absolute inset-y-0 left-0 rounded-full"
                    style={{ 
                        width: fillWidth,
                        background: RADIOACTIVE_GRADIENT,
                        boxShadow: 'inset 0 5px 10px rgba(255,255,255,0.3)',
                    }}
                    initial={{ width: '0%' }}
                    animate={{ width: fillWidth }}
                    transition={{ duration: 1.5, ease: "easeOut" as const }}
                >
                    {/* FIX 2: Bubbling/Texture/Holo Overlay (Static - removed motion.div, replaced with div) */}
                    <div 
                        className="absolute inset-0 opacity-40" 
                        style={liquidStyles}
                    />
                </motion.div>

                {/* Strong Glass Highlights */}
                <div className="absolute inset-0 rounded-full pointer-events-none"
                     style={{ 
                         background: 'linear-gradient(135deg, rgba(255,255,255,0.6) 0%, transparent 50%)',
                     }}
                />

                {/* Percentage Readout */}
                <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white z-50 drop-shadow">
                    {value}% REP
                </div>
            </div>

            {/* REPUTATION Neon Title (Removed from here as it takes too much space in a list row) */}
        </div>
    );
};

export default ReputationCapsule;
