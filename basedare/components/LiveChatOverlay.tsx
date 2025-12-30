'use client';

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, Users, Crown, Zap, Wallet, TrendingUp, AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface ChatProps {
  target: any;
  onClose: () => void;
}

const FAKE_MESSAGES = [
  { user: "BasedGod", text: "DO IT!!!", color: "text-red-500" },
  { user: "CryptoWhale", text: "Staked 0.5 ETH", color: "text-[#FFD700]", isSystem: true },
  { user: "Anon", text: "LFG", color: "text-gray-400" },
  { user: "Mod_Bot", text: "Wallet connected: 0x...3f", color: "text-blue-400" },
  { user: "Pepe", text: "monkaW", color: "text-green-500" },
];

export default function LiveChatOverlay({ target, onClose }: ChatProps) {
  // TABS: 'CHAT' or 'STAKE'
  const [activeTab, setActiveTab] = useState<"CHAT" | "STAKE">("CHAT");
  
  const [messages, setMessages] = useState<any[]>([
    { id: 1, user: "SYSTEM", text: `Connected to secure channel: ${target.streamer}`, color: "text-purple-500", type: "system" }
  ]);
  const [input, setInput] = useState("");
  const [stakeAmount, setStakeAmount] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-generate hype messages
  useEffect(() => {
    const interval = setInterval(() => {
      const randomMsg = FAKE_MESSAGES[Math.floor(Math.random() * FAKE_MESSAGES.length)];
      setMessages((prev) => [
        ...prev.slice(-50),
        { id: Date.now(), ...randomMsg }
      ]);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (activeTab === "CHAT") {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, activeTab]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    setMessages((prev) => [
      ...prev,
      { id: Date.now(), user: "YOU", text: input, color: "text-white", isMe: true }
    ]);
    setInput("");
  };

  const handlePledge = () => {
    if (!stakeAmount) return;
    // Simulate Pledge Event
    setMessages((prev) => [
      ...prev,
      { id: Date.now(), user: "YOU", text: `STAKED ${stakeAmount} ETH ON THE OUTCOME`, color: "text-[#FFD700]", isSystem: true, isMe: true }
    ]);
    setActiveTab("CHAT");
    setStakeAmount("");
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: "100%" }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: "100%" }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="fixed inset-y-0 right-0 w-full md:w-[450px] bg-[#050505] border-l border-white/10 z-[100] flex flex-col shadow-[-50px_0_100px_rgba(0,0,0,0.8)]"
    >
      {/* 1. HEADER (Streamer Info) */}
      <div className="p-6 border-b border-white/10 bg-[#0a0a0a] flex items-center justify-between relative overflow-hidden">
        {/* Animated Background Gradient */}
        <div className="absolute inset-0 bg-gradient-to-r from-purple-900/20 to-transparent animate-pulse" />
        
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_10px_red]" />
            <h3 className="font-black text-white tracking-widest text-sm">SECURE_LINK</h3>
          </div>
          <p className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-500 uppercase italic">
            {target.streamer}
          </p>
        </div>
        
        <div className="relative z-10 flex items-center gap-4">
          <div className="text-right">
            <div className="text-[10px] text-purple-400 font-mono uppercase tracking-widest">Current Pot</div>
            <div className="text-xl font-black text-[#FFD700] drop-shadow-[0_0_10px_rgba(255,215,0,0.5)]">
              {target.bounty}
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <X className="w-6 h-6 text-gray-400 hover:text-white" />
          </button>
        </div>
      </div>

      {/* 2. TABS (Chat vs Stake) */}
      <div className="grid grid-cols-2 border-b border-white/10">
        <button 
          onClick={() => setActiveTab("CHAT")}
          className={`py-4 text-xs font-black uppercase tracking-widest transition-colors ${activeTab === 'CHAT' ? 'bg-white/5 text-white border-b-2 border-[#FFD700]' : 'text-gray-600 hover:text-gray-300'}`}
        >
          Live Comms
        </button>
        <button 
          onClick={() => setActiveTab("STAKE")}
          className={`py-4 text-xs font-black uppercase tracking-widest transition-colors ${activeTab === 'STAKE' ? 'bg-white/5 text-[#FFD700] border-b-2 border-[#FFD700]' : 'text-gray-600 hover:text-gray-300'}`}
        >
          Inject Liquidity
        </button>
      </div>

      {/* 3. CONTENT AREA */}
      <div className="flex-1 overflow-y-auto relative bg-[url('https://grainy-gradients.vercel.app/noise.svg')] bg-opacity-5">
        
        {/* --- CHAT TAB --- */}
        {activeTab === "CHAT" && (
          <div className="p-4 space-y-3 font-mono text-sm min-h-full flex flex-col justify-end pb-4">
            {messages.map((msg) => (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                key={msg.id} 
                className={`flex items-start gap-3 ${msg.isMe ? "justify-end" : ""}`}
              >
                {!msg.isMe && !msg.isSystem && (
                  <div className="mt-1 w-6 h-6 rounded bg-gray-800 border border-white/10 flex items-center justify-center text-[10px] font-bold text-gray-500 shrink-0">
                    {msg.user.substring(0,2).toUpperCase()}
                  </div>
                )}
                
                {/* Message Bubble */}
                <div className={`
                  relative px-4 py-2 rounded-xl max-w-[85%]
                  ${msg.isSystem ? 'w-full text-center bg-[#FFD700]/10 border border-[#FFD700]/30 text-[#FFD700] font-bold uppercase tracking-wide text-xs py-3' : ''}
                  ${msg.isMe && !msg.isSystem ? 'bg-purple-600/20 border border-purple-500/50 text-right text-white' : ''}
                  ${!msg.isMe && !msg.isSystem ? 'bg-white/5 border border-white/5 text-gray-300' : ''}
                `}>
                  {!msg.isMe && !msg.isSystem && (
                    <div className={`text-[10px] font-bold mb-1 ${msg.color}`}>{msg.user}</div>
                  )}
                  {msg.text}
                </div>
              </motion.div>
            ))}
            <div ref={bottomRef} />
          </div>
        )}

        {/* --- STAKE TAB (THE PLEDGE UI) --- */}
        {activeTab === "STAKE" && (
          <div className="p-8 h-full flex flex-col items-center">
            
            <div className="w-full text-center mb-8">
              <div className="w-20 h-20 mx-auto bg-[#FFD700]/10 rounded-full flex items-center justify-center border border-[#FFD700] shadow-[0_0_30px_rgba(255,215,0,0.3)] mb-4 animate-pulse">
                <Zap className="w-10 h-10 text-[#FFD700]" />
              </div>
              <h2 className="text-2xl font-black text-white uppercase italic">Escrow Staking</h2>
              <p className="text-gray-500 text-xs font-mono mt-2">
                Funds are locked in a smart contract. If the streamer fails, you are refunded (minus gas).
              </p>
            </div>

            {/* Amount Input */}
            <div className="w-full space-y-4 mb-8">
              <div className="grid grid-cols-3 gap-3">
                {['0.01', '0.05', '0.1'].map((amt) => (
                  <button 
                    key={amt}
                    onClick={() => setStakeAmount(amt)}
                    className={`py-3 bg-white/5 border rounded-lg hover:bg-white/10 hover:border-[#FFD700] hover:text-[#FFD700] transition-all font-mono font-bold text-sm ${
                      stakeAmount === amt ? 'border-[#FFD700] bg-[#FFD700]/10 text-[#FFD700]' : 'border-white/10'
                    }`}
                  >
                    {amt} ETH
                  </button>
                ))}
              </div>
              
              <div className="relative">
                <Input 
                  type="number" 
                  value={stakeAmount}
                  onChange={(e) => setStakeAmount(e.target.value)}
                  placeholder="0.00" 
                  step="0.01"
                  min="0"
                  className="h-16 bg-black border border-white/20 text-3xl font-black text-white text-center focus:border-[#FFD700] rounded-xl"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 font-black">ETH</span>
              </div>
              
              <div className="flex justify-between text-[10px] font-mono text-gray-500 px-2">
                <span>WALLET BALANCE: 4.205 ETH</span>
                <span>GAS: ~$3.50</span>
              </div>
            </div>

            {/* Action Button */}
            <Button 
              onClick={handlePledge}
              disabled={!stakeAmount || parseFloat(stakeAmount) <= 0}
              className="w-full h-16 bg-[#FFD700] hover:bg-[#FFD700] text-black text-xl font-black uppercase tracking-widest rounded-xl hover:scale-[1.02] transition-transform shadow-[0_0_40px_rgba(255,215,0,0.4)] disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed"
            >
              Confirm Pledge
            </Button>

            {/* Trust Badge */}
            <div className="mt-auto pt-8 flex items-center gap-2 text-[10px] text-gray-600 font-mono">
              <AlertTriangle className="w-3 h-3" />
              <span>VERIFIED BY PROTOCOL LABS ORACLE</span>
            </div>
          </div>
        )}

      </div>

      {/* 4. FOOTER (Only for Chat Tab) */}
      {activeTab === "CHAT" && (
        <div className="p-4 border-t border-white/10 bg-[#0a0a0a]">
          <form onSubmit={handleSend} className="relative">
            <Input 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Send message..."
              className="pr-12 bg-white/5 border-white/10 focus:border-purple-500 text-white placeholder:text-gray-600"
            />
            <Button 
              type="submit"
              size="icon"
              className="absolute right-1 top-1 h-8 w-8 bg-transparent hover:bg-purple-500/20 text-purple-400 hover:text-white"
            >
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </div>
      )}
    </motion.div>
  );
}
