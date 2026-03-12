"use client";

import React from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { MessageCircle, Bot, AlertTriangle } from 'lucide-react';
import TextPressure from "@/components/TextPressure";
import GradualBlurOverlay from "@/components/GradualBlurOverlay";
import LiquidBackground from "@/components/LiquidBackground";

const FAQ_ITEMS = [
  {
    q: "Who are you and why are you yelling?",
    a: "I am Peebear 🐻. I am the chaotic neutral AI running this circus. I exist to facilitate bad decisions and liquid markets. Next question."
  },
  {
    q: "What exactly is BaseDare?",
    a: "It's a **bounty platform** for creator challenges. You fund a dare with USDC, and if the creator completes it, they earn the reward. If they don't complete it within the deadline, you get a full refund. It's crowdfunded challenges meets entertainment."
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
    a: "That's up to you. You set the expiry timer when you create the dare (e.g., 24h, 3 days, 1 week). If the timer hits zero with no proof submitted, the smart contract **automatically refunds your contribution**. We don't hold your money hostage."
  },
  {
    q: "How do I get on the Hall of Shame?",
    a: "Fail a dare. Chicken out. Upload a fake video. We publicly roast verified failures on the homepage. It's an honor, really."
  },
  {
    q: "What's the CHAOS / CONTROL switch?",
    a: "It's a vibe selector. **CHAOS mode** is for fans who want to fund dares and watch streamers perform. **CONTROL mode** is for brands and scouts who want to leverage creator challenges for campaigns. Same protocol, different energy. Pick your poison."
  },
  {
    q: "What is Control Mode / Brand Portal?",
    a: "The **Brand Portal** is where suits turn marketing budgets into viral moments. Brands create campaigns, set budgets, and define what counts as 'verified content'. Our AI referee does the rest. No influencer DMs. No fake engagement. Just algorithmic brand injection."
  },
  {
    q: "What is the Shadow Army?",
    a: "The **Shadow Army** is our scout network. They hunt creators, claim bounty slots, and match brands with streamers. In return, they earn **permanent rake** on every successful payout: 0.5% discovery rake + 0.5% active rake. Find one good creator, collect forever. It's passive income for professional stalkers."
  },
  {
    q: "How do Scout tiers work?",
    a: "You start as a **BLOODHOUND** 🐕. Complete campaigns successfully and level up to **ARBITER** ⚖️, then **ARCHON** 👑. Higher tiers = auto-accepted slot claims, priority access, and flex rights. Fail too many and watch your reputation decay. The Shadow Army has standards."
  },
  {
    q: "Why does Control Mode look like a 1940s film?",
    a: "Because business is **noir**. While CHAOS mode is vibrant and unhinged, CONTROL mode runs in black and white like the boardrooms it was built for. It's an aesthetic choice. Also, it looks sick."
  },
  {
    q: "Can I collab or report a bug?",
    a: "Slide into the DMs. If it's a good idea, we build it. If it's a bug, we fix it."
  }
];

export default function FAQPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-transparent">
      <LiquidBackground />
      <div className="pointer-events-none fixed inset-0 z-10">
        <GradualBlurOverlay intensity="light" placement="lower" />
      </div>

      <div className="pointer-events-none absolute inset-0 z-[1]">
        <div className="absolute -left-40 top-20 h-96 w-96 rounded-full bg-purple-500/20 blur-[120px]" />
        <div className="absolute -right-32 top-40 h-80 w-80 rounded-full bg-cyan-400/10 blur-[120px]" />
        <div className="absolute bottom-0 left-1/2 h-[420px] w-[520px] -translate-x-1/2 rounded-full bg-yellow-400/10 blur-[140px]" />
      </div>

      <div className="relative z-20 mt-12 px-4 pb-32 pt-16 md:pt-20">
        <div className="mx-auto max-w-5xl">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="apple-liquid-glass mb-10 overflow-hidden px-6 py-10 text-center md:px-10 md:py-12"
          >
            <div className="relative mx-auto mb-6 h-44 w-44 md:h-56 md:w-56">
              <div className="absolute inset-0 rounded-full bg-yellow-500/20 blur-2xl" />
              <div className="absolute inset-0 rounded-full border border-white/20 bg-white/5 backdrop-blur-xl" />
              <motion.div
                className="relative z-10 h-full w-full"
                animate={{ rotate: [0, 4, -4, 0], scale: [1, 1.04, 1] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              >
                <Image
                  src="/assets/peebear-head.png"
                  alt="BaseDare Bear"
                  fill
                  className="object-contain p-4"
                  sizes="(max-width: 768px) 176px, 224px"
                />
              </motion.div>

              <div className="absolute bottom-1 right-0 z-20 translate-x-1/4 translate-y-1/4">
                <div className="whitespace-nowrap rounded-full border border-white/20 bg-purple-600 px-2 py-1 text-[10px] font-black text-white shadow-[0_0_15px_rgba(168,85,247,0.5)]">
                  AI AGENT
                </div>
              </div>
            </div>

            <div className="relative mx-auto mb-2 h-24 w-full max-w-3xl cursor-default md:h-28">
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

            <p className="mt-4 flex items-center justify-center gap-2 font-mono text-sm uppercase tracking-[0.2em] text-gray-300 md:text-base">
              <Bot className="w-5 h-5 text-purple-400" />
              Peebear answers your questions
            </p>
          </motion.div>

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
                  className="apple-liquid-glass overflow-hidden px-6 data-[state=open]:border-yellow-500/35 data-[state=open]:bg-white/[0.06] transition-colors"
                >
                  <AccordionTrigger className="text-left py-6 hover:no-underline group">
                    <span className="text-base font-black uppercase italic tracking-wide text-white transition-colors group-hover:text-yellow-400 md:text-xl">
                      {item.q}
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="border-t border-white/10 pb-6 pt-4 font-mono text-sm leading-relaxed text-gray-200 md:text-base">
                    <span className="text-yellow-500 font-bold mr-2">{">"}</span>
                    <span
                      dangerouslySetInnerHTML={{
                        __html: item.a.replace(
                          /\*\*(.*?)\*\*/g,
                          '<strong class="text-white">$1</strong>'
                        ),
                      }}
                    />
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="mt-16 text-center"
          >
            <div className="apple-liquid-glass inline-flex flex-col items-center gap-4 rounded-3xl p-6 md:p-8">
              <p className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-gray-300">
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
                Still confused?
              </p>
              <a
                href="https://x.com/basedare_xyz"
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-center gap-2 rounded-full border border-[#1DA1F2]/35 bg-[#1DA1F2]/10 px-8 py-4 text-sm font-black uppercase tracking-[0.14em] text-[#1DA1F2] transition-all hover:bg-[#1DA1F2] hover:text-white"
              >
                <MessageCircle className="h-5 w-5" />
                DM @basedare_xyz
              </a>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
