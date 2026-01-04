'use client';

import React, { useState, useEffect } from 'react';
import { Scan, Brain, ShieldAlert, CheckCircle, XCircle, Activity, Lock, Siren } from 'lucide-react';
import { Button } from "@/components/ui/button";

interface SwoopModalProps {
  isOpen: boolean;
  onClose: () => void;
  originalTarget: {
    name: string;
    tier: string;
    followers: string;
  };
  challenger: {
    name: string;
    tier: string;
    followers: string;
  };
  bountyAmount: string;
}

export default function SwoopAnalysisModal({ isOpen, onClose, originalTarget, challenger, bountyAmount }: SwoopModalProps) {
  const [status, setStatus] = useState<'IDLE' | 'SCANNING' | 'APPROVED' | 'REJECTED'>('IDLE');
  const [matchScore, setMatchScore] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);

  // Sound Hook Placeholder
  useEffect(() => {
    if (status === 'SCANNING') {
      // playSound('/sounds/scan_loop.mp3');
    } else if (status === 'APPROVED') {
      // playSound('/sounds/access_granted.mp3');
    } else if (status === 'REJECTED') {
      // playSound('/sounds/access_denied.mp3');
    }
  }, [status]);

  const startAnalysis = () => {
    setStatus('SCANNING');
    setLogs([]);
    setMatchScore(0);

    const steps = [
      { msg: "Connecting to zkML Sentinel Node...", delay: 500 },
      { msg: `Fetching ${originalTarget.name} audience graph...`, delay: 1200 },
      { msg: `Analyzing Challenger: ${challenger.name}...`, delay: 2000 },
      { msg: "Cross-referencing engagement overlap...", delay: 2800 },
      { msg: "Verifying reputation collateral...", delay: 3500 },
    ];

    let currentStep = 0;

    const interval = setInterval(() => {
      if (currentStep >= steps.length) {
        clearInterval(interval);
        finalizeResult();
        return;
      }
      setLogs(prev => [...prev, steps[currentStep].msg]);
      // Randomly increment score to simulate calculation
      setMatchScore(prev => Math.min(prev + Math.floor(Math.random() * 20), 99)); 
      currentStep++;
    }, 800);
  };

  const finalizeResult = () => {
    // DYNAMIC DEMO LOGIC: 70% Chance of Approval
    const isSuccess = Math.random() > 0.3; 
    
    // Set final score based on result
    const finalScore = isSuccess 
        ? Math.floor(Math.random() * 10 + 85) // 85-95%
        : Math.floor(Math.random() * 30 + 20); // 20-50%

    setMatchScore(finalScore);
    setStatus(isSuccess ? 'APPROVED' : 'REJECTED');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-xl p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-black border border-purple-500/30 rounded-3xl overflow-hidden shadow-[0_0_100px_rgba(168,85,247,0.2)] flex flex-col relative">
        
        {/* Background Grid */}
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 pointer-events-none" />
        
        {/* HEADER */}
        <div className="p-6 border-b border-white/10 flex justify-between items-center bg-purple-900/20 relative z-10">
          <div className="flex items-center gap-3">
            <Scan className="w-6 h-6 text-[#FFD700] animate-pulse" />
            <h2 className="text-xl font-black text-white uppercase tracking-widest">
              VULTURE PROTOCOL <span className="text-purple-500">v1.0</span>
            </h2>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors font-mono text-xs">
            [ESC] CANCEL
          </button>
        </div>

        <div className="p-8 grid md:grid-cols-2 gap-8 relative min-h-[400px] z-10">
          
          {/* LEFT: THE MATCHUP */}
          <div className="flex flex-col gap-6">
            
            {/* Target Card */}
            <div className="relative p-4 rounded-xl border border-white/10 bg-white/5 opacity-50 grayscale transition-all hover:opacity-80">
              <div className="absolute top-2 right-2 text-[9px] font-mono text-gray-400 uppercase">Current Target</div>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gray-700 animate-pulse" />
                <div>
                  <div className="font-bold text-lg text-white leading-none">{originalTarget.name}</div>
                  <div className="text-xs font-mono text-gray-400 mt-1">{originalTarget.tier} • {originalTarget.followers}</div>
                </div>
              </div>
            </div>

            {/* VS Badge */}
            <div className="mx-auto flex items-center justify-center w-12 h-12 rounded-full bg-red-600 font-black italic text-white border-4 border-black z-10 -my-5 shadow-[0_0_20px_rgba(220,38,38,0.5)]">
              VS
            </div>

            {/* Challenger Card */}
            <div className="relative p-4 rounded-xl border-2 border-purple-500 bg-purple-900/10 shadow-[0_0_30px_rgba(168,85,247,0.1)]">
              <div className="absolute top-2 right-2 text-[9px] font-mono text-purple-400 uppercase animate-pulse">Challenger (You)</div>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-blue-500" />
                <div>
                  <div className="font-bold text-lg text-white leading-none">{challenger.name}</div>
                  <div className="text-xs font-mono text-purple-300 mt-1">{challenger.tier} • {challenger.followers}</div>
                </div>
              </div>
            </div>

            {/* BOUNTY STAKES */}
            <div className="mt-auto p-4 bg-[#FFD700]/5 border border-[#FFD700]/20 rounded-xl text-center">
              <div className="text-[10px] text-[#FFD700] uppercase tracking-[0.2em] mb-1">Total Bounty Value</div>
              <div className="text-3xl font-black text-white tracking-tighter drop-shadow-md">{bountyAmount}</div>
            </div>
          </div>

          {/* RIGHT: THE AI BRAIN */}
          <div className="relative bg-black/50 rounded-2xl border border-white/10 p-6 flex flex-col justify-between">
            
            {/* SCANNING VISUALIZER */}
            <div className="flex-1 flex flex-col items-center justify-center relative mb-6 min-h-[180px]">
               {/* Radar Circles */}
               <div className={`absolute inset-0 flex items-center justify-center transition-opacity duration-500 ${status === 'SCANNING' ? 'opacity-100' : 'opacity-10'}`}>
                  <div className="w-48 h-48 border border-purple-500/30 rounded-full animate-[ping_3s_linear_infinite]" />
                  <div className="w-32 h-32 border border-purple-500/50 rounded-full animate-[ping_2s_linear_infinite]" />
                  <div className="w-16 h-16 bg-purple-500/20 rounded-full animate-pulse blur-xl" />
               </div>

               {/* Central Percent */}
               <div className="relative z-10 text-center">
                  <div className={`text-6xl font-black font-mono transition-colors duration-300 ${
                      status === 'APPROVED' ? 'text-green-500' : 
                      status === 'REJECTED' ? 'text-red-500' : 'text-white'
                  }`}>
                      {matchScore}%
                  </div>
                  <div className="text-[10px] text-gray-500 uppercase tracking-widest mt-2">Fit Score</div>
               </div>
            </div>

            {/* CONSOLE LOGS */}
            <div className="h-32 overflow-y-auto font-mono text-[10px] space-y-1.5 p-3 bg-black rounded-lg border border-white/10 text-green-400/90 mb-4 shadow-inner custom-scrollbar">
               {logs.map((log, i) => (
                 <div key={i} className="flex gap-2">
                   <span className="text-gray-600">{`>`}</span>
                   <span className="typing-effect">{log}</span>
                 </div>
               ))}
               {status === 'SCANNING' && <div className="animate-pulse text-purple-500">_PROCESSING_DATA_BLOCKS...</div>}
            </div>

            {/* ACTION BUTTONS */}
            {status === 'IDLE' && (
              <Button 
                onClick={startAnalysis}
                className="w-full h-14 bg-white hover:bg-gray-200 text-black font-black uppercase tracking-widest text-sm transition-all"
              >
                <Brain className="w-4 h-4 mr-2" /> Initiate Analysis
              </Button>
            )}

            {status === 'SCANNING' && (
              <Button disabled className="w-full h-14 bg-gray-800 text-gray-400 border border-white/10 font-mono uppercase tracking-widest text-xs">
                <ShieldAlert className="w-4 h-4 mr-2 animate-pulse" /> Neural Match Running...
              </Button>
            )}

            {status === 'APPROVED' && (
              <Button className="w-full h-14 bg-green-500 hover:bg-green-400 text-black font-black uppercase tracking-widest text-sm animate-pulse shadow-[0_0_30px_rgba(34,197,94,0.4)]">
                <CheckCircle className="w-5 h-5 mr-2" /> Confirm Takeover
              </Button>
            )}

            {status === 'REJECTED' && (
              <div className="text-center p-3 bg-red-900/20 border border-red-500/30 rounded-xl">
                <div className="flex items-center justify-center gap-2 text-red-500 font-bold uppercase text-sm mb-1">
                   <XCircle className="w-4 h-4" /> INSUFFICIENT CLOUT
                </div>
                <p className="text-[10px] text-gray-400 font-mono">
                    Audience overlap below protocol threshold.
                </p>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}