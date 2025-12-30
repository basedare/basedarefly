// components/ElectricDareCard.tsx
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Coins, Zap } from "lucide-react";
import React from 'react';

interface ElectricDareCardProps {
    id: number;
    potAmount: number;
    title: string;
    streamer: string;
    href: string;
}

const ElectricDareCard: React.FC<ElectricDareCardProps> = ({ 
    id, potAmount, title, streamer, href 
}) => {
    // Determine the glow color based on the ID for variation (e.g., yellow for high pot, purple for default)
    const isHighPot = id % 3 === 0;
    const borderClass = isHighPot ? "border-yellow-500/50" : "border-purple-500/50";
    const glowShadow = isHighPot 
        ? "shadow-[0_0_30px_rgba(250,204,21,0.5)]" 
        : "shadow-[0_0_30px_rgba(168,85,247,0.5)]";

    return (
        <Link href={href} passHref>
            <div
                className={`relative aspect-[7/10] bg-black/80 rounded-2xl p-0.5 group 
                            transition-all duration-300 transform hover:scale-[1.03] cursor-pointer 
                            border ${borderClass} overflow-hidden`}
                style={{
                    // Inner shadow and backdrop filter for depth
                    boxShadow: `${glowShadow}, inset 0 0 20px rgba(255, 255, 255, 0.05)`,
                    backdropFilter: 'blur(5px)',
                }}
            >
                {/* --- 1. Background Glow Effect (The "Electric Honeycomb" Base) --- */}
                <div 
                    className={`absolute inset-0 rounded-2xl pointer-events-none opacity-50 
                                transition-opacity duration-700 mix-blend-screen`}
                    style={{
                        background: `radial-gradient(circle at center, ${isHighPot ? '#FACC15' : '#A855F7'} 0%, transparent 60%)`,
                        filter: 'blur(20px)',
                    }}
                />
                
                {/* --- 2. Inner Content & Glass Surface --- */}
                <div className="relative w-full h-full p-6 bg-neutral-900/90 rounded-2xl flex flex-col justify-between">
                    
                    {/* Top Section: Status */}
                    <div className="flex flex-col items-start space-y-2">
                        <Badge className={`uppercase text-xs font-mono tracking-widest ${isHighPot ? 'bg-yellow-600/20 text-yellow-300 border-yellow-500' : 'bg-purple-600/20 text-purple-300 border-purple-500'}`}>
                            {isHighPot ? <Zap className="w-3 h-3 mr-1" /> : <Coins className="w-3 h-3 mr-1" />}
                            {isHighPot ? "High Pot Alert" : "Live Dare"}
                        </Badge>
                        <p className="text-sm text-gray-500 mt-2">By @{streamer}</p>
                    </div>

                    {/* Bottom Section: Pot & Title */}
                    <div className="space-y-2">
                        <h4 className="text-3xl font-black text-white leading-tight group-hover:text-yellow-400 transition-colors">
                            {title}
                        </h4>
                        <div className="flex items-center gap-2">
                            <Zap className="w-5 h-5 text-yellow-500" />
                            <span className="text-lg font-extrabold text-yellow-300">
                                {potAmount.toLocaleString()} $BASE
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </Link>
    );
};

export default ElectricDareCard;








