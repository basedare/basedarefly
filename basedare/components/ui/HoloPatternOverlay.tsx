'use client';
import { motion } from 'framer-motion';

const HoloPatternOverlay: React.FC = () => {
    // Holographic Star/Dot Pattern (Purple/Yellow)
    const HOLO_PATTERN = {
        backgroundImage: 'radial-gradient(circle at 10% 20%, rgba(168, 85, 247, 0.4) 1px, transparent 1px), radial-gradient(circle at 70% 80%, rgba(255, 215, 0, 0.4) 1px, transparent 1px)',
        backgroundSize: '25px 25px',
        mixBlendMode: 'soft-light', // Blends nicely with the existing dark/glass background
        opacity: 0.7,
    };

    return (
        <motion.div
            className="absolute inset-0 pointer-events-none z-0"
            style={HOLO_PATTERN as React.CSSProperties}
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.7 }}
            transition={{ duration: 1 }}
        />
    );
};

export default HoloPatternOverlay;








