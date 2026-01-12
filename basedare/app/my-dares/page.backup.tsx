"use client";

import GalaxyBackground from "@/components/GalaxyBackground";
import MoltenGold from "@/components/ui/MoltenGold";
import ElectricCard from "@/components/ui/electric-card"; // Using the default export
import { Wallet, Clock, CheckCircle, XCircle, Zap } from "lucide-react";

// Mock Data for the User's Dares
const MY_DARES = [
  { 
    id: 1, 
    target: "@xQc", 
    avatar: "/assets/avatars/xqc.jpg", // Ensure you have placeholders or use standard generic ones
    task: "Eat a Ghost Pepper", 
    amount: "$10,000", 
    status: "LIVE", 
    time: "24h left",
    color: "#FACC15" // Gold
  },
  { 
    id: 2, 
    target: "@KaiCenat", 
    avatar: "/assets/avatars/kai.jpg", 
    task: "Wear a Chicken Suit", 
    amount: "$1,000", 
    status: "PENDING", 
    time: "Waiting for acceptance",
    color: "#A855F7" // Purple
  },
  { 
    id: 3, 
    target: "@Pokimane", 
    avatar: "/assets/avatars/poki.jpg", 
    task: "Cosplay as Teletubby", 
    amount: "$5,000", 
    status: "COMPLETED", 
    time: "Won 2 days ago",
    color: "#22c55e" // Green
  },
  { 
    id: 4, 
    target: "@Speed", 
    avatar: "/assets/avatars/speed.jpg", 
    task: "Bark at Strangers", 
    amount: "$500", 
    status: "FAILED", 
    time: "Refused",
    color: "#ef4444" // Red
  }
];

export default function MyDaresPage() {
  return (
    <main className="min-h-screen w-full bg-[#020204] relative overflow-hidden pt-32 pb-20">
      
      {/* 1. SHARED BACKGROUND DNA */}
      <GalaxyBackground />

      {/* 2. HEADER SECTION */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 mb-16">
        <div className="flex flex-col md:flex-row justify-between items-end gap-6">
            
            {/* Title */}
            <div>
                <div className="flex items-center gap-4 mb-2">
                    <div className="p-3 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
                        <Wallet className="text-[#FACC15]" size={32} />
                    </div>
                    <div className="flex flex-col">
                        <h1 className="text-sm font-bold text-gray-400 uppercase tracking-[0.3em]">Command Center</h1>
                        <MoltenGold className="text-5xl md:text-6xl">MY DARES</MoltenGold>
                    </div>
                </div>
            </div>

            {/* Stats Summary */}
            <div className="flex gap-4">
                <div className="px-6 py-4 rounded-2xl border border-white/10 bg-white/[0.02] backdrop-blur-md">
                    <div className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">Total Staked</div>
                    <div className="text-2xl font-black text-white">$16,500</div>
                </div>
                <div className="px-6 py-4 rounded-2xl border border-white/10 bg-white/[0.02] backdrop-blur-md">
                    <div className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">Active</div>
                    <div className="text-2xl font-black text-[#FACC15]">2</div>
                </div>
            </div>
        </div>
      </div>

      {/* 3. THE GRID (Electric Cards) */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {MY_DARES.map((dare) => (
            <div key={dare.id} className="h-[320px] w-full">
                <ElectricCard 
                    color={dare.color} 
                    variant={dare.status === 'LIVE' ? 'hue' : 'swirl'} // Only live cards have the crazy hue shift
                    className="h-full"
                >
                    <div className="flex flex-col h-full justify-between p-2">
                        
                        {/* Top Row: Target & Amount */}
                        <div className="flex justify-between items-start">
                            <div className="flex items-center gap-3">
                                <div className={`w-12 h-12 rounded-full border-2 p-0.5 ${dare.status === 'LIVE' ? 'border-[#FACC15] animate-pulse' : 'border-white/20'}`}>
                                    <div className="w-full h-full rounded-full bg-gray-800 overflow-hidden">
                                        {/* Fallback avatar if image missing */}
                                        <div className="w-full h-full bg-zinc-900 flex items-center justify-center text-xs font-bold text-gray-500">
                                            IMG
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <div className="text-xs text-gray-400 font-bold uppercase tracking-wider">Target</div>
                                    <div className="text-white font-bold font-serif text-lg">{dare.target}</div>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-xs text-gray-400 font-bold uppercase tracking-wider">Staked</div>
                                <div className={`text-2xl font-black tracking-tighter drop-shadow-md`} style={{ color: dare.color }}>
                                    {dare.amount}
                                </div>
                            </div>
                        </div>

                        {/* Middle: The Task */}
                        <div className="flex-grow flex items-center justify-center text-center px-4">
                            <h3 className="text-2xl font-black text-white leading-tight font-serif italic opacity-90">
                                "{dare.task}"
                            </h3>
                        </div>

                        {/* Bottom: Status Bar */}
                        <div className="mt-auto">
                            <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
                                
                                {/* Status Text */}
                                <div className="flex items-center gap-2">
                                    {dare.status === 'LIVE' && <Zap size={14} className="text-[#FACC15] fill-[#FACC15] animate-bounce" />}
                                    {dare.status === 'PENDING' && <Clock size={14} className="text-purple-400" />}
                                    {dare.status === 'COMPLETED' && <CheckCircle size={14} className="text-green-500" />}
                                    {dare.status === 'FAILED' && <XCircle size={14} className="text-red-500" />}
                                    
                                    <span className="text-sm font-black tracking-widest" style={{ color: dare.color }}>
                                        {dare.status}
                                    </span>
                                </div>

                                {/* Time / Details */}
                                <span className="text-xs font-mono text-gray-500 font-medium">
                                    {dare.time}
                                </span>

                            </div>
                        </div>

                    </div>
                </ElectricCard>
            </div>
        ))}
      </div>

    </main>
  );
}
