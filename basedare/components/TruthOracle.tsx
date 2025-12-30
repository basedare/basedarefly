'use client';
import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Scan, BrainCircuit, Activity } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import TransactionModal from "@/components/TransactionModal";

export default function TruthOracle() {
  const [analysisStatus, setAnalysisStatus] = useState<"IDLE" | "SCANNING" | "COMPLETE">("SCANNING"); // Auto-start scan
  const [aiConfidence, setAiConfidence] = useState(0);
  const [voted, setVoted] = useState<"VALID" | "INVALID" | null>(null);
  const [consensus, setConsensus] = useState({ valid: 65, invalid: 35 });
  const [pledgeAmount, setPledgeAmount] = useState(50);

  const [isTxOpen, setIsTxOpen] = useState(false);
  const [txStatus, setTxStatus] = useState<'PROCESSING' | 'SUCCESS'>('PROCESSING');

  // SIMULATE AI SCANNING SEQUENCE
  useEffect(() => {
    if (analysisStatus === "SCANNING") {
      let score = 0;
      const interval = setInterval(() => {
        score += Math.floor(Math.random() * 5) + 2;
        if (score >= 94) {
          score = 94;
          clearInterval(interval);
          setTimeout(() => setAnalysisStatus("COMPLETE"), 800);
        }
        setAiConfidence(score);
      }, 150);
      return () => clearInterval(interval);
    }
  }, [analysisStatus]);

  const handleVote = (type: "VALID" | "INVALID") => {
    setIsTxOpen(true);
    setTxStatus('PROCESSING');
    setTimeout(() => {
      setTxStatus('SUCCESS');
      setVoted(type);
      // Simulate dynamic consensus shift
      if (type === "VALID") setConsensus(prev => ({ valid: prev.valid + 2, invalid: prev.invalid - 2 }));
      else setConsensus(prev => ({ valid: prev.valid - 2, invalid: prev.invalid + 2 }));
    }, 2000);
  };

  return (
    <>
      <div className="w-full max-w-6xl mx-auto liquid-glass shadow-[0_0_50px_rgba(59,130,246,0.15)] overflow-hidden">
        
        {/* HEADER */}
        <div className="p-4 border-b border-white/10 flex justify-between items-center bg-[#0a0a0a]">
          <div className="flex items-center gap-2">
            <BrainCircuit className="w-4 h-4 text-purple-500" />
            <span className="text-xs font-mono text-white font-bold">SENTINEL AI: <span className="text-green-400 animate-pulse">ONLINE</span></span>
          </div>
          <div className="flex items-center gap-4 text-[10px] font-mono text-gray-500 uppercase">
            <span className="hidden md:inline">Model: GPT-4o-Vision</span>
            <span>Latency: 12ms</span>
          </div>
        </div>

        <div className="grid lg:grid-cols-3">
          
          {/* LEFT: EVIDENCE VIEWER (WITH AI OVERLAY) */}
          <div className="lg:col-span-2 border-r border-white/10 bg-black relative group min-h-[400px]">
            <div className="relative h-full w-full overflow-hidden">
              <img 
                src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=1200&auto=format&fit=crop" 
                className="w-full h-full object-cover opacity-60" 
                alt="Evidence"
              />
              
              {/* --- AI SCANNING OVERLAY --- */}
              <AnimatePresence>
                {analysisStatus === "SCANNING" && (
                  <motion.div 
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: 1 }} 
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 z-20 pointer-events-none"
                  >
                    {/* Scanning Line */}
                    <motion.div 
                      animate={{ top: ["0%", "100%", "0%"] }} 
                      transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                      className="absolute left-0 right-0 h-0.5 bg-green-500/50 shadow-[0_0_20px_#22c55e]"
                    />
                    
                    {/* Detection Boxes */}
                    <div className="absolute top-[20%] left-[30%] w-32 h-32 border border-green-500/30 rounded-lg">
                      <div className="absolute -top-4 left-0 text-[10px] bg-green-900/50 text-green-400 px-1 font-mono">FACE_MATCH 98%</div>
                    </div>
                    <div className="absolute bottom-10 right-10 flex flex-col gap-1 text-[10px] font-mono text-green-400">
                      <span>{'>'} ANALYZING MOTION...</span>
                      <span>{'>'} AUDIO SPECTRUM MATCH...</span>
                      <span>{'>'} DEEPFAKE CHECK: PASS</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* FINAL AI VERDICT OVERLAY */}
              {analysisStatus === "COMPLETE" && (
                <motion.div 
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="absolute top-4 right-4 bg-black/80 backdrop-blur-md border border-green-500/30 p-4 rounded-xl shadow-[0_0_30px_rgba(34,197,94,0.15)]"
                >
                  <div className="text-[10px] text-gray-400 font-mono uppercase mb-1">AI Confidence Score</div>
                  <div className="text-3xl font-black text-green-400 flex items-center gap-2">
                    <Scan className="w-6 h-6" /> {aiConfidence}%
                  </div>
                  <div className="text-[10px] text-green-600 font-mono mt-1">
                    RECOMMENDATION: <span className="font-bold text-green-400">VALID</span>
                  </div>
                </motion.div>
              )}
            </div>
            
            <div className="p-6 border-t border-white/10 bg-[#050505]">
              <h3 className="font-bold text-white text-xl mb-1 flex items-center gap-2">
                &quot;Eat the Reaper Chip&quot;
                {analysisStatus === "COMPLETE" && <CheckCircle className="w-4 h-4 text-green-500" />}
              </h3>
              <div className="text-sm text-gray-400 font-mono">
                Submitted by @KaiCenat • 12 mins ago
              </div>
            </div>
          </div>

          {/* RIGHT: VOTING TERMINAL */}
          <div className="p-6 flex flex-col bg-[#050505]">
            
            {/* AI INSIGHT BOX */}
            <div className="mb-6 p-4 bg-purple-900/10 border border-purple-500/20 rounded-xl relative overflow-hidden">
              <div className="flex items-center gap-2 mb-2">
                <Activity className="w-4 h-4 text-purple-400" />
                <span className="text-xs font-bold text-purple-300 uppercase">Analysis Report</span>
              </div>
              <p className="text-[10px] text-gray-400 font-mono leading-relaxed">
                Visual confirmation of &quot;Reaper Chip&quot; packaging detected. Streamer facial biometrics match known ID. No video artifacts detected.
              </p>
              {analysisStatus === "SCANNING" && (
                <div className="absolute bottom-0 left-0 h-0.5 bg-purple-500 animate-pulse w-full" />
              )}
            </div>

            {/* CONSENSUS & PLEDGE */}
            <div className="mb-6">
              <div className="flex justify-between text-[10px] font-bold uppercase text-gray-500 mb-2">
                <span>Community Consensus</span>
                <span className="text-white">{consensus.valid}% Valid</span>
              </div>
              <div className="h-2 bg-gray-800 rounded-full overflow-hidden flex mb-2">
                <motion.div 
                  initial={{ width: 0 }} 
                  animate={{ width: `${consensus.valid}%` }} 
                  className="bg-blue-500 h-full shadow-[0_0_10px_#3b82f6]"
                />
              </div>
              <div className="flex gap-2 text-[10px] font-mono text-gray-500">
                <span className="text-blue-400 font-bold">1,337 VOTES</span>
                <span>•</span>
                <span>QUORUM MET</span>
              </div>
            </div>

            {/* REPUTATION SLIDER */}
            <div className="mb-6 px-1">
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs text-gray-400 font-mono uppercase font-bold">Pledge Reputation</label>
                <span className="text-xs text-blue-400 font-bold">{pledgeAmount} REP</span>
              </div>
              <input 
                type="range" 
                min="10" 
                max="500" 
                step="10"
                value={pledgeAmount}
                onChange={(e) => setPledgeAmount(parseInt(e.target.value))}
                className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
              <div className="text-[10px] text-gray-500 mt-2 font-mono flex justify-between">
                <span>Risk: {pledgeAmount}</span>
                <span className="text-green-400">Reward: +{Math.floor(pledgeAmount * 1.5)}</span>
              </div>
            </div>

            {/* VOTING BUTTONS */}
            <div className="mt-auto space-y-3">
              {voted ? (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-8 bg-white/5 rounded-xl border border-white/10"
                >
                  <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
                  <h3 className="text-white font-bold text-xs tracking-widest">VOTE SECURED</h3>
                  <p className="text-[10px] text-gray-500 font-mono mt-1">Staked {pledgeAmount} REP on outcome</p>
                </motion.div>
              ) : (
                <>
                  <button 
                    onClick={() => handleVote("VALID")}
                    disabled={analysisStatus === "SCANNING"}
                    className="w-full py-4 bg-green-900/10 border border-green-500/30 rounded-xl text-green-500 font-black uppercase hover:bg-green-500 hover:text-black transition-all disabled:opacity-30 disabled:cursor-not-allowed text-sm tracking-wider"
                  >
                    {analysisStatus === "SCANNING" ? "Analying..." : "Verify as Valid"}
                  </button>
                  <button 
                    onClick={() => handleVote("INVALID")}
                    disabled={analysisStatus === "SCANNING"}
                    className="w-full py-4 bg-red-900/10 border border-red-500/30 rounded-xl text-red-500 font-black uppercase hover:bg-red-500 hover:text-black transition-all disabled:opacity-30 disabled:cursor-not-allowed text-sm tracking-wider"
                  >
                    {analysisStatus === "SCANNING" ? "Wait..." : "Mark as Fake"}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <TransactionModal 
        isOpen={isTxOpen} 
        status={txStatus} 
        title="Submitting Consensus"
        hash="0x8a...2b9" 
        onClose={() => setIsTxOpen(false)}
      />
    </>
  );
}
