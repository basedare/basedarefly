import React from "react";
import { motion } from "framer-motion";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import Footer from "../components/Footer";

const FAQ_ITEMS = [
  {
    q: "What the hell is BaseDare?",
    a: "Twitch + crypto gambling on Base. You stake $BARE to force streamers to do stupid/funny dares. If they complete it → they win 2× the pot. If they fail → YOU win 2× the pot. Win-win chaos."
  },
  {
    q: "How do I create a dare?",
    a: "Connect wallet → \"Create\" → pick streamer → write dare → stake → confirm."
  },
  {
    q: "How much do I win?",
    a: "Always 2× the pot. Top 50 wallets = 0% rake forever."
  },
  {
    q: "Can streamers just refuse my dare?",
    a: "Hell yeah they can — no one's getting forced.\n\nHere's exactly what happens:\n• You stake $100 → dare goes live\n• Streamer has 48 hours to accept & complete it on stream\n• They accept & win → they take 2× pot ($200)\n• They ignore/refuse → dare auto-expires → you get 100% of your stake back (minus tiny gas)\n• No penalties, no rug, no tears\n\nSo you literally can't lose money if they chicken out.\nOnly risk is if they actually do the dare and beat you.\n\nThat's the entire game: Force them to choose between free money or looking like a coward on stream."
  },
  {
    q: "What's the bounty pot?",
    a: "5% of every losing dare goes here. Top leaderboard claims it weekly. Live on leaderboard page."
  },
  {
    q: "How do I climb the leaderboard?",
    a: "Complete dares = Rep. Win big = bonus Rep. Top 10 get badges + bigger bounty slices."
  },
  {
    q: "When does a dare expire?",
    a: "48 hrs or streamer ignores → you get stake back."
  },
  {
    q: "Is this gambling?",
    a: "Skill-based entertainment. You're paying for content creation. Totally legal on Base ;)"
  },
  {
    q: "How do I get $BARE?",
    a: "Token drops any moment. Follow @basedare on X for sniper link."
  },
  {
    q: "Who runs this?",
    a: "Degens like you. Contract verified. Team doxx later. Just vibe."
  },
  {
    q: "Something broken / collab?",
    a: "DM @basedare on X."
  }
];

export default function FAQPage() {
  return (
    <div className="min-h-screen bg-[#0A0A0F] relative overflow-hidden">
      {/* Background glow */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-[150px]" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-orange-500/10 rounded-full blur-[150px]" />
      </div>

      <div className="relative z-10 pt-8 pb-32 px-4">
        <div className="max-w-3xl mx-auto">
          {/* Header with Bear */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <motion.img
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68fdae09d2124933d726e89a/bef958255_image.png"
              alt="BaseDare Bear"
              className="w-32 h-32 mx-auto mb-6"
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            />
            <h1 className="text-4xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-orange-500 to-yellow-400 mb-4">
              FAQ
            </h1>
            <p className="text-gray-400 text-lg">
              Everything you need to know about BaseDare
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
                  className="bg-black/50 border border-purple-500/30 rounded-xl px-6 overflow-hidden"
                >
                  <AccordionTrigger className="text-left py-5 hover:no-underline group">
                    <span className="text-white font-bold text-lg group-hover:text-yellow-400 transition-colors">
                      {item.q}
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="text-gray-300 pb-5 text-base leading-relaxed">
                    {item.a}
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
            className="mt-12 text-center"
          >
            <p className="text-gray-400 mb-4">Still confused?</p>
            <a
              href="https://twitter.com/basedare"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold px-6 py-3 rounded-full hover:scale-105 transition"
            >
              DM @basedare on X
            </a>
          </motion.div>
        </div>
      </div>

      <Footer />
    </div>
  );
}