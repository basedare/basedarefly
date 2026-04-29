"use client";

import React from "react";
import dynamic from "next/dynamic";
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
import CosmicButton from '@/components/ui/CosmicButton';

const PeeBearGlass = dynamic(() => import('@/components/PeeBearGlass'), {
  ssr: false,
});

const raisedPanelClass =
  "relative overflow-hidden rounded-[30px] border border-white/[0.09] bg-[linear-gradient(180deg,rgba(255,255,255,0.07)_0%,rgba(255,255,255,0.025)_14%,rgba(10,9,18,0.9)_58%,rgba(7,6,14,0.96)_100%)] shadow-[0_28px_90px_rgba(0,0,0,0.4),0_0_28px_rgba(168,85,247,0.07),inset_0_1px_0_rgba(255,255,255,0.1),inset_0_-18px_24px_rgba(0,0,0,0.24)]";

const softCardClass =
  "relative overflow-hidden rounded-[26px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(255,255,255,0.06)_0%,rgba(255,255,255,0.02)_12%,rgba(10,10,18,0.92)_100%)] shadow-[0_18px_30px_rgba(0,0,0,0.22),inset_0_1px_0_rgba(255,255,255,0.08),inset_0_-12px_18px_rgba(0,0,0,0.22)]";

const insetDentClass =
  "bd-dent-surface bd-dent-surface--soft rounded-[20px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(4,5,10,0.72)_0%,rgba(11,11,18,0.92)_100%)]";

const sectionLabelClass =
  "inline-flex items-center gap-2 rounded-full border border-fuchsia-400/25 bg-[linear-gradient(180deg,rgba(217,70,239,0.16)_0%,rgba(88,28,135,0.08)_100%)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-fuchsia-100 shadow-[0_12px_24px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.12),inset_0_-10px_14px_rgba(0,0,0,0.22)]";

const octagonClipPath =
  "polygon(29.29% 0%,70.71% 0%,100% 29.29%,100% 70.71%,70.71% 100%,29.29% 100%,0% 70.71%,0% 29.29%)";

const FAQ_ITEMS = [
  {
    q: "Who are you and why are you yelling?",
    a: "I am Peebear 🐻. I am the chaotic neutral AI running this circus. I exist to facilitate bad decisions and liquid markets. Next question."
  },
  {
    q: "What exactly is BaseDare?",
    a: "It's a **bounty platform** for creator challenges. You fund a dare with USDC, a creator completes it, and the protocol handles the payout. If it expires or fails review, contributors go through the refund path. Think crowdfunded chaos with receipts."
  },
  {
    q: "Who judges the proof? Can streamers cheat?",
    a: "Cute theory. The **community review layer** on `/verify` can signal whether proof looks real, but crowd votes do **not** trigger payout directly. Consensus pushes the dare into **referee review**, and the protocol still owns the final payout or failure path. If the proof is fake, weak, or edited into fantasy, it gets bounced."
  },
  {
    q: "What's the difference between IRL and STREAM dares?",
    a: "**IRL** dares happen in the physical world: places, movement, nearby missions, venue check-ins, real-life nonsense. **STREAM** dares are tied to a creator, stream context, and proof from that world. Same protocol. Different battlefield."
  },
  {
    q: "What is a venue on BaseDare?",
    a: "A **venue** is not just a pin on a map. It's a live place page with memory: check-ins, active dares, recent presence, and eventually perks. We want places on BaseDare to feel alive, social, and worth showing up to."
  },
  {
    q: "Do I need to scan a QR code to use BaseDare?",
    a: "No. Relax. QR is **not** the whole app. Normal links are for normal discovery. QR is our **secure handshake** layer when a venue wants stronger proof that you actually showed up. Browse freely. Scan only when trust matters."
  },
  {
    q: "How do venue check-ins work?",
    a: "At partner venues, the venue console can show a rotating QR. You scan it to prove presence, and we can combine that with time-window and nearby location checks. Translation: harder to fake, better for live dares, and way less interesting to scammers."
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
    a: "You choose the expiry when you create the dare: 24h, 3 days, 1 week, whatever flavor of pressure you want. If the clock dies and there is no valid completion, the dare goes through the **refund path**. We are not keeping your money in a haunted vault forever."
  },
  {
    q: "What's the CHAOS / CONTROL switch?",
    a: "It's a vibe selector. **CHAOS mode** is for fans who want to fund dares and watch streamers perform. **CONTROL mode** is for brands and scouts who want to leverage creator challenges for campaigns. Same protocol, different energy. Pick your poison."
  },
  {
    q: "Can brands or venues use this too?",
    a: "Yes. Fans can fund chaos, but brands and venues can also use BaseDare to run creator challenges, anchor activity to real places, and turn live moments into measurable missions. Same machine. Cleaner shoes."
  },
  {
    q: "Can I collab or report a bug?",
    a: "Slide into the DMs. If it's a good idea, we build it. If it's a bug, we fix it."
  }
];

function renderFormattedAnswer(answer: string) {
  const nodes: React.ReactNode[] = [];
  const boldPattern = /\*\*(.*?)\*\*/g;
  let lastIndex = 0;

  for (const match of answer.matchAll(boldPattern)) {
    const index = match.index ?? 0;
    if (index > lastIndex) {
      nodes.push(answer.slice(lastIndex, index));
    }
    nodes.push(
      <strong key={`${match[1]}-${index}`} className="text-white">
        {match[1]}
      </strong>
    );
    lastIndex = index + match[0].length;
  }

  if (lastIndex < answer.length) {
    nodes.push(answer.slice(lastIndex));
  }

  return nodes.length > 0 ? nodes : answer;
}

export default function FAQPage() {
  const [isDesktop, setIsDesktop] = React.useState(false);

  React.useEffect(() => {
    const media = window.matchMedia("(min-width: 768px)");
    const syncDesktop = () => setIsDesktop(media.matches);

    syncDesktop();
    media.addEventListener?.("change", syncDesktop);

    return () => media.removeEventListener?.("change", syncDesktop);
  }, []);

  return (
    <div className="relative min-h-screen overflow-hidden bg-transparent">
      <LiquidBackground />
      <div className="pointer-events-none fixed inset-0 z-10 hidden md:block">
        <GradualBlurOverlay />
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
            className={`${raisedPanelClass} mb-10 overflow-hidden px-6 py-10 text-center md:px-10 md:py-12`}
          >
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_0%,rgba(168,85,247,0.12),transparent_32%),radial-gradient(circle_at_88%_100%,rgba(34,211,238,0.1),transparent_36%),linear-gradient(180deg,rgba(255,255,255,0.05)_0%,transparent_32%,transparent_72%,rgba(0,0,0,0.24)_100%)]" />
            <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/26 to-transparent" />

            <div className="relative mx-auto mb-5 inline-flex">
              <div className={sectionLabelClass}>
                <Bot className="w-4 h-4 text-fuchsia-300" />
                FAQ TERMINAL
              </div>
            </div>

            <div className="relative mx-auto mb-6 h-56 w-56 md:hidden">
              <div
                className="absolute inset-0 blur-2xl bg-purple-500/22"
                style={{ clipPath: octagonClipPath }}
              />
              <div
                className="bd-dent-surface absolute inset-0 border border-white/[0.08] bg-[linear-gradient(180deg,rgba(255,255,255,0.07)_0%,rgba(255,255,255,0.02)_14%,rgba(9,7,18,0.9)_54%,rgba(6,5,14,0.96)_100%)] backdrop-blur-xl shadow-[inset_14px_14px_28px_rgba(0,0,0,0.6),inset_-8px_-8px_18px_rgba(255,255,255,0.05),inset_0_1px_0_rgba(255,255,255,0.06),0_1px_0_rgba(255,255,255,0.03),0_18px_30px_rgba(0,0,0,0.22)]"
                style={{ clipPath: octagonClipPath }}
              />
              <div
                className="pointer-events-none absolute inset-[4.25%] border border-white/[0.055] bg-[linear-gradient(180deg,rgba(6,8,18,0.72)_0%,rgba(14,11,30,0.88)_100%)] shadow-[inset_16px_16px_26px_rgba(0,0,0,0.58),inset_-7px_-7px_18px_rgba(255,255,255,0.035)]"
                style={{ clipPath: octagonClipPath }}
              />
              <div className="relative z-10 h-full w-full">
                <div className="relative h-full w-full" style={{ clipPath: octagonClipPath }}>
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_18%,rgba(255,255,255,0.18)_0%,transparent_22%),linear-gradient(145deg,rgba(168,85,247,0.99)_0%,rgba(147,51,234,0.98)_32%,rgba(126,34,206,0.98)_64%,rgba(76,29,149,0.99)_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.18),inset_0_-18px_20px_rgba(0,0,0,0.28),0_0_24px_rgba(168,85,247,0.3)]" />
                  <div className="pointer-events-none absolute inset-[6%] opacity-95" style={{ clipPath: octagonClipPath }}>
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_24%_26%,rgba(255,255,255,0.18)_0%,transparent_18%),radial-gradient(circle_at_76%_72%,rgba(192,132,252,0.18)_0%,transparent_26%),radial-gradient(circle_at_58%_20%,rgba(245,197,24,0.08)_0%,transparent_18%)] mix-blend-screen" />
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_22%,rgba(245,197,24,0.16)_0%,transparent_5%),radial-gradient(circle_at_68%_34%,rgba(255,255,255,0.14)_0%,transparent_4%),radial-gradient(circle_at_72%_66%,rgba(245,197,24,0.14)_0%,transparent_4%),radial-gradient(circle_at_34%_72%,rgba(192,132,252,0.12)_0%,transparent_5%)] mix-blend-screen opacity-90" />
                  </div>
                  <div className="absolute inset-[16%] faq-mobile-peebear">
                    <Image
                      src="/assets/peebear-head.png"
                      alt="BaseDare Bear"
                      fill
                      className="object-contain"
                      sizes="224px"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="relative mx-auto mb-6 hidden h-72 w-72 overflow-hidden md:block" style={{ clipPath: octagonClipPath }}>
              <div
                className="absolute inset-0 blur-2xl bg-purple-500/18"
                style={{ clipPath: octagonClipPath }}
              />
              <div
                className="bd-dent-surface absolute inset-0 border border-white/[0.08] bg-[linear-gradient(180deg,rgba(255,255,255,0.07)_0%,rgba(255,255,255,0.02)_14%,rgba(9,7,18,0.9)_54%,rgba(6,5,14,0.96)_100%)] backdrop-blur-xl shadow-[inset_12px_12px_24px_rgba(0,0,0,0.56),inset_-6px_-6px_16px_rgba(255,255,255,0.04),inset_0_1px_0_rgba(255,255,255,0.06),0_1px_0_rgba(255,255,255,0.03),0_18px_30px_rgba(0,0,0,0.22)]"
                style={{ clipPath: octagonClipPath }}
              />
              <div
                className="pointer-events-none absolute inset-[6%] border border-white/[0.04] bg-[linear-gradient(180deg,rgba(5,7,16,0.66)_0%,rgba(13,11,28,0.82)_100%)] shadow-[inset_10px_10px_20px_rgba(0,0,0,0.5),inset_-4px_-4px_12px_rgba(255,255,255,0.025)]"
                style={{ clipPath: octagonClipPath }}
              />
              <div className="relative z-10 h-full w-full">
                {isDesktop ? <PeeBearGlass fit="edge" className="mx-auto h-full w-full" /> : null}
              </div>

              <div className="absolute bottom-1 right-0 z-20 translate-x-1/4 translate-y-1/4">
                <div className="whitespace-nowrap rounded-full border border-white/20 bg-[linear-gradient(180deg,rgba(168,85,247,0.94)_0%,rgba(107,33,168,0.92)_100%)] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-white shadow-[0_12px_18px_rgba(0,0,0,0.18),0_0_15px_rgba(168,85,247,0.32)]">
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
                textColor="#FFD700"
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
            <Accordion type="single" collapsible className="faq-accordion space-y-4">
              {FAQ_ITEMS.map((item, index) => (
                <AccordionItem
                  key={index}
                  value={`item-${index}`}
                  className={`faq-accordion-item ${softCardClass} overflow-hidden px-6 transition-all data-[state=open]:border-yellow-500/35 data-[state=open]:shadow-[0_20px_34px_rgba(0,0,0,0.22),inset_0_1px_0_rgba(255,255,255,0.08),inset_0_-12px_18px_rgba(0,0,0,0.22)]`}
                >
                  <div className="pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-white/18 to-transparent" />
                  <AccordionTrigger className="text-left py-6 hover:no-underline group">
                    <span className="pr-4 text-base font-black uppercase italic tracking-wide text-white transition-colors group-hover:text-yellow-400 md:text-xl">
                      {item.q}
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="border-t border-white/10 pb-6 pt-4">
                    <div className={`faq-answer-well ${insetDentClass} px-4 py-4`}>
                      <div className="flex items-start gap-2 font-mono text-sm leading-relaxed text-gray-200 md:text-base">
                        <span className="text-yellow-500 font-bold">{">"}</span>
                        <span>{renderFormattedAnswer(item.a)}</span>
                      </div>
                    </div>
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
            <div className={`${softCardClass} inline-flex flex-col items-center gap-4 rounded-[28px] p-6 md:p-8`}>
              <p className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-gray-300">
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
                Still confused?
              </p>
              <div className={`${insetDentClass} px-4 py-4`}>
                <CosmicButton
                  href="https://x.com/basedare_xyz"
                  target="_blank"
                  rel="noopener noreferrer"
                  variant="blue"
                  size="lg"
                  className="min-w-[280px]"
                >
                  <MessageCircle className="h-5 w-5" />
                  DM @basedare_xyz
                </CosmicButton>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes faq-mobile-peebear-breathe {
          0%,
          100% {
            transform: translateY(0) rotate(0deg) scale(1);
            filter: drop-shadow(0 8px 14px rgba(0, 0, 0, 0.28))
              drop-shadow(0 0 12px rgba(168, 85, 247, 0.14));
          }
          50% {
            transform: translateY(-5px) rotate(-3.4deg) scale(1.065);
            filter: drop-shadow(0 14px 22px rgba(0, 0, 0, 0.36))
              drop-shadow(0 0 22px rgba(168, 85, 247, 0.24));
          }
        }

        .faq-mobile-peebear {
          transform-origin: center;
        }

        @media (max-width: 767px) {
          .faq-mobile-peebear {
            animation: faq-mobile-peebear-breathe 5.2s ease-in-out infinite;
          }
        }

        @keyframes faq-accordion-down {
          from {
            height: 0;
          }
          to {
            height: var(--radix-accordion-content-height);
          }
        }

        @keyframes faq-accordion-up {
          from {
            height: var(--radix-accordion-content-height);
          }
          to {
            height: 0;
          }
        }

        .faq-accordion .faq-accordion-item {
          transition:
            transform 360ms cubic-bezier(0.22, 1, 0.36, 1),
            box-shadow 360ms cubic-bezier(0.22, 1, 0.36, 1),
            border-color 280ms ease;
          will-change: transform;
        }

        .faq-accordion .faq-accordion-item[data-state='open'] {
          transform: translateY(-4px);
        }

        .faq-accordion .faq-accordion-item[data-state='open'] .faq-answer-well {
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.08),
            inset 0 -14px 18px rgba(0, 0, 0, 0.28),
            0 18px 28px rgba(0, 0, 0, 0.12);
        }

        .faq-accordion .faq-accordion-item[data-state='open'] [data-state='open'] > svg {
          filter: drop-shadow(0 0 12px rgba(250, 204, 21, 0.22));
        }

        @media (prefers-reduced-motion: reduce) {
          .faq-accordion .faq-accordion-item,
          .faq-accordion .faq-answer-well,
          .faq-accordion [data-state] {
            animation: none !important;
            transition-duration: 0.01ms !important;
            transition-delay: 0ms !important;
            transform: none !important;
            filter: none !important;
          }
        }
      `}</style>
    </div>
  );
}
