"use client";

import React from "react";
import { motion } from "framer-motion";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { MessageCircle, Bot, AlertTriangle } from 'lucide-react';
import TextPressure from "@/components/TextPressure";

const FAQ_ITEMS = [
  {
    q: "Who are you and why are you yelling?",
    a: "I am Peebear 🐻. I am the chaotic neutral AI running this circus. I exist to facilitate bad decisions and liquid markets. Next question."
  },
  {
    q: "What exactly is BaseDare?",
    a: "It's a marketplace for **social chaos**. You stake ETH or USDC to dare streamers to do things. If they do it, they get the bag. If they chicken out, YOU win the pot (2x payout). It's prediction markets meets Jackass."
  },
  {
    q: "Who judges the proof? Can streamers cheat?",
    a: "Nice try. Our **AI Sentinel** (my evil twin) scans every frame of the evidence video using zkML. If they fake it, cheat, or use deepfakes, we reject it and slash their reputation. Truth is mathematical."
  },
  {
    q: "My dare got rejected immediately. Why?",
    a: "It was probably cringe, illegal, or gross. My content filters are strict. We want vibes, not a lawsuit. Keep it TOS-friendly or get banned."
  },
  {
    q: "I have zero creativity. Can you help?",
    a: "Typical human. Yes, use the **'AI Suggest'** button in the Create menu. I analyze the streamer's psychological profile and suggest dares they will hate (but have to accept). You're welcome."
  },
  {
    q: "Is there a $BARE token?",
    a: "🛑 **STOP.** There is NO token yet. We use USDC and ETH on Base. If you buy a 'BaseDare' token on Uniswap right now, you are donating to a scammer. Don't be that guy."
  },
  {
    q: "When does a dare expire?",
    a: "That's up to you. You set the expiry timer when you create the dare (e.g., 24h, 3 days, 1 week). If the timer hits zero with no proof submitted, the smart contract **automatically refunds your stake**. We don't hold your money hostage."
  },
  {
    q: "How do I get on the Hall of Shame?",
    a: "Fail a dare. Chicken out. Upload a fake video. We publicly roast verified failures on the homepage. It's an honor, really."
  },
  {
    q: "Can I collab or report a bug?",
    a: "Slide into the DMs. If it's a good idea, we build it. If it's a bug, we fix it."
  }
];

export default function FAQPage() {
  return (
    <div className="min-h-screen bg-black relative overflow-hidden flex flex-col">
      {/* Background glow */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-[150px]" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-orange-500/10 rounded-full blur-[150px]" />
      </div>

      <div className="relative z-10 pt-16 pb-32 px-4 flex-1 mt-12">
        <div className="max-w-3xl mx-auto">
          
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            {/* Peebear Head Container - Tight Fit for Badge */}
            <div className="relative w-80 h-80 mx-auto mb-8">
               <div className="absolute inset-0 bg-yellow-500/20 rounded-full blur-xl animate-pulse" />
            <motion.img
                 src="/assets/peebear-head.png"
              alt="BaseDare Bear"
                 className="w-full h-full object-contain relative z-10"
                 animate={{ 
                   rotate: [0, 5, -5, 0],
                   scale: [1, 1.05, 1]
                 }}
                 transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
               />
               
               {/* AI AGENT BADGE - Tucked tightly to bottom right */}
               <div className="absolute bottom-0 right-0 z-20 translate-x-1/4 translate-y-1/4">
                 <div className="bg-purple-600 text-white text-[10px] font-black px-2 py-1 rounded-full border border-white/20 shadow-[0_0_15px_rgba(168,85,247,0.5)] whitespace-nowrap">
                   AI AGENT
                 </div>
               </div>
            </div>
            
            {/* TEXT PRESSURE TITLE */}
            <div className="relative h-24 md:h-32 w-full mb-2 cursor-default">
              <TextPressure 
                text="WTF IS THIS?"
                flex={true}
                alpha={false}
                stroke={false}
                width={true}
                weight={true}
                italic={true}
                textColor="#FFD700" // Brand Gold
                minFontSize={36}
              />
            </div>

            <p className="text-gray-400 text-lg font-mono uppercase tracking-widest flex items-center justify-center gap-2 mt-4">
              <Bot className="w-5 h-5 text-purple-400" />
              Peebear answers your questions
            </p>
          </motion.div>

          {/* Accordion */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Accordion type="single" collapsible className="space-y-4">
              {FAQ_ITEMS.map((item, index) => (
                <AccordionItem
                  key={index}
                  value={`item-${index}`}
                  className="bg-white/5 border border-white/10 rounded-2xl px-6 overflow-hidden data-[state=open]:border-yellow-500/30 transition-colors"
                >
                  <AccordionTrigger className="text-left py-6 hover:no-underline group">
                    <span className="text-white font-bold text-lg md:text-xl group-hover:text-yellow-400 transition-colors uppercase italic tracking-wide">
                      {item.q}
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="text-gray-300 pb-6 text-sm md:text-base font-mono leading-relaxed border-t border-white/5 pt-4">
                    <span className="text-yellow-500 font-bold mr-2">{">"}</span>
                    {/* Render with bold markdown support */}
                    <span dangerouslySetInnerHTML={{ __html: item.a.replace(/\*\*(.*?)\*\*/g, '<strong class="text-white">$1</strong>') }} />
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </motion.div>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="mt-16 text-center"
          >
            <div className="inline-flex flex-col items-center gap-4 p-6 rounded-3xl bg-white/5 border border-white/10">
                <p className="text-gray-400 text-xs uppercase tracking-widest flex items-center gap-2">
                   <AlertTriangle className="w-4 h-4 text-yellow-500" />
                   Still confused?
                </p>
                <a
                  href="https://x.com/basedare_xyz"
              target="_blank"
              rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-[#1DA1F2]/10 border border-[#1DA1F2]/30 text-[#1DA1F2] font-black px-8 py-4 rounded-full hover:bg-[#1DA1F2] hover:text-white transition-all text-sm uppercase tracking-wider group"
            >
                  <MessageCircle className="w-5 h-5" />
                  DM @basedare_xyz
            </a>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
