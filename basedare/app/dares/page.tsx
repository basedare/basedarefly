'use client';

import { Badge } from "@/components/ui/badge";
import { ArrowRight, Zap, Coins } from "lucide-react";

// Placeholder for the Live Pot / Cards area
const LiveDareFeed = () => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6 p-4">
            {/* Placeholder for future ElectricCard components */}
            {[...Array(8)].map((_, i) => (
                <div 
                    key={i} 
                    className="aspect-[7/10] bg-neutral-900 border border-purple-500/30 rounded-2xl flex flex-col justify-end p-4 
                               shadow-[0_0_20px_rgba(168,85,247,0.1)] hover:shadow-[0_0_40px_rgba(250,204,21,0.3)] 
                               transition-all duration-300 transform hover:scale-[1.02] cursor-pointer group"
                >
                    <div className="relative z-10 space-y-2">
                        <Badge variant="secondary" className="bg-purple-600/50 text-white border-purple-400">
                            Pot: {Math.floor(Math.random() * 5000 + 1000)} $BASE
                        </Badge>
                        <h3 className="text-xl font-black text-white group-hover:text-yellow-400 transition-colors">
                            Dare #{i + 1} Pending...
                        </h3>
                        <p className="text-sm text-gray-400">
                            Stake to raise the chaos level and force a streamer's hand.
                        </p>
                    </div>
                    
                    {/* Electric Glow Effect */}
                    <div className="absolute inset-0 rounded-2xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                         style={{ 
                            background: 'radial-gradient(circle at center, rgba(250, 204, 21, 0.2) 0%, transparent 60%)', 
                            filter: 'blur(30px)' 
                         }}
                    />
                </div>
            ))}
        </div>
    );
}

export default function DaresPage() {
    return (
        <div className="min-h-screen pt-24 pb-20 px-4 relative overflow-hidden bg-black text-white">
            
            {/* Background Chaos */}
            <div className="absolute inset-0 z-0 pointer-events-none">
                <div className="absolute top-20 left-0 w-full h-[600px] bg-gradient-to-b from-yellow-900/10 via-black to-black" />
                <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center opacity-10" />
            </div>

            <div className="max-w-7xl mx-auto z-10 space-y-12 relative">
                
                {/* HERO HEADLINE */}
                <div className="text-center space-y-4 pt-10">
                    <Badge className="bg-yellow-500/10 text-yellow-400 border-yellow-500/30 font-mono uppercase tracking-widest mb-2">
                        <Zap className="w-3 h-3 mr-1" /> Live Feed
                    </Badge>
                    <h1 className="text-5xl md:text-7xl font-black tracking-tighter leading-none">
                        <span className="block text-white">THE DEGEN</span>
                        <span className="block text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-purple-600 drop-shadow-[0_0_20px_rgba(168,85,247,0.5)]">
                            COLOSSEUM
                        </span>
                    </h1>
                    <p className="text-lg text-gray-400 max-w-2xl mx-auto">
                        View the active Dares, stake your crypto, and call the shot. If they refuse to comply, you get 100% back.
                    </p>
                </div>

                {/* LIVE POT/CARDS CONTAINER */}
                <div className="relative">
                    <LiveDareFeed />
                </div>
                
                {/* CTA FOOTER */}
                <div className="pt-12 text-center">
                    <a href="/create" className="inline-flex items-center">
                        <span className="text-purple-400 text-sm font-mono uppercase tracking-widest hover:text-purple-300 transition-colors">
                            Don't see a Dare you like? 
                        </span>
                        <span className="ml-2 font-black text-yellow-400 hover:text-yellow-300 flex items-center">
                            Create a New Pot <ArrowRight className="w-4 h-4 ml-1" />
                        </span>
                    </a>
                </div>
            </div>
        </div>
    );
}

