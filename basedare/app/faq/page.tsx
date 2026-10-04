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
    "q": "What is BaseDare?",
    "a": "Open BaseDare and **find your next move**: free adventures, community meetups and paid dares around real places. Explore the map or choose Play, Meet or Earn on the homepage. You do not need to earn money to take part."
  },
  {
    "q": "Do I need a wallet to get started?",
    "a": "You can browse places and start a free adventure without signing in. Adventure progress is saved on this device. Sharing an upload, joining or hosting a meetup, and paid work require the sign-in shown in the app. Wallet actions may require a signature; phone/passkey sign-in is not promised."
  },
  {
    "q": "How do free adventures work?",
    "a": "Pick an idea, follow the steps at your own pace and mark it finished. Your **adventure journal is self-reported**, saved in this browser, and separate from verified visits and paid work. Free suggestions are not hosted events and do not promise cash or venue perks."
  },
  {
    "q": "Can I share a photo or video from an adventure?",
    "a": "After finishing, choose **Share what you made**. Select a public place, add one photo or short clip under 4 MB and a caption, and accept public display. A person reviews it before it appears in discovery. Approved posts have a hashtag and a B pin on the map. You can withdraw your listing from My submissions."
  },
  {
    "q": "Who can use the content I upload?",
    "a": "You keep ownership. Adventure display consent allows BaseDare to show the post in its public discovery features. The optional promotion checkbox only lets BaseDare ask you about reuse; it does **not** give a venue or brand advertising rights. Paid content work uses the specific deliverables and permissions accepted for that mission. Uploaded media uses public storage, including while a listing awaits review."
  },
  {
    "q": "Where can I find people or add friends?",
    "a": "Open **Community → Find people & friends**. Search public profiles, send a request and accept or decline incoming requests. Both people need a public profile. Friendship does not reveal live location or bypass the existing chat rules. You can also invite someone using a meetup or adventure share link."
  },
  {
    "q": "How do I make a plan for tonight?",
    "a": "Open **Tonight** on the map. Matching venue suggestions offer Start a meetup and Invite a friend. Choose the actual date and time when creating the plan. A usual weekly nightlife pattern is not a confirmed event: check the venue or the published event source before going."
  },
  {
    "q": "How do paid dares work?",
    "a": "Open **Earn** to see funded opportunities and read the requirements, deadline and reward. Request a mission, wait for acceptance where required, submit the requested evidence and follow its review status. Payment follows approval and successful settlement; it is not guaranteed to be instant. Only start work under the terms shown for that mission."
  },
  {
    "q": "Is paid participation ready for everyone?",
    "a": "Paid participation is in a **limited rollout**. Production payment and recovery checks must be completed before wider launch. Browsing or finishing a free adventure does not create a payment entitlement. Do not send money to an address shared in a message; use only the supported funding flow."
  },
  {
    "q": "What is saved on /missions?",
    "a": "**Mission Pass** saves a private continuation link for a supported activity. Saving does not reserve a spot, accept paid work or claim a reward. Keep the link private. Email recovery is not currently enabled. Use My Activity for your wider activity and Earn to find paid work."
  },
  {
    "q": "What do check-ins and receipts prove?",
    "a": "At enabled venues, scan the rotating QR displayed by staff with your phone camera, sign in and allow a fresh location check. The venue QR and nearby GPS together provide evidence of a visit. The public ‘I’m here’ option only shares temporary presence; it is not a verified check-in. Approved records can contribute to your verified trail. A receipt records the evidence and review outcome; it is **not a guarantee against fraud** and does not prove every claim about a place. Self-reported adventure completions stay separate."
  },
  {
    "q": "Can I message anyone?",
    "a": "You can find public profiles and request friends in Community. Direct messaging still follows the existing crossed-paths eligibility rules; becoming friends does not automatically open a private chat. Venue rooms require nearby presence or an eligible check-in. Report harassment or suspicious content through Contact or support."
  },
  {
    "q": "What happens if my submission is rejected?",
    "a": "Read the review reason. Paid missions show the available correction or appeal route and any deadline. Shared adventure posts can be declined or removed from discovery; the current sharing flow does not edit or resubmit the same upload. Contact support if you think a decision is wrong."
  },
  {
    "q": "How can a business or venue take part?",
    "a": "Use **For businesses** to request on-site checks or discuss a venue activity. The Buyer Workspace shows the agreed scope, price and invoice steps before work starts. For paid content or promotion, agree the files, posting obligations and usage rights explicitly. To manage an existing venue, open its place page from the map and follow the ownership claim process."
  },
  {
    "q": "Are venue perks, BaseCash and Yodl the same thing?",
    "a": "No. A venue perk has its own availability, quantity and redemption conditions. BaseCash is a separate venue-credit system. Yodl is a limited spend-local pilot shown only at tested participating venues; it does not convert BaseCash or automatically verify a BaseDare reward purchase."
  },
  {
    "q": "What does PeeBear do?",
    "a": "PeeBear helps you choose places and activities. Suggestions can use published plans, usual venue patterns or clearly labelled BaseDare ideas. PeeBear does not guarantee opening hours, conditions, attendance or payment. Tap a talking hint to reveal it immediately."
  },
  {
    "q": "Is there a BaseDare token?",
    "a": "There is **no official BaseDare token**. Paid rewards use the currency and network shown on the mission. Signal Points and journal entries are not money or promises of a future token."
  },
  {
    "q": "How do I report a problem?",
    "a": "Use **Contact** or in-app support. Include the page or activity link, what happened and a screenshot if useful. Never send your seed phrase, private key or private Mission Pass link in a public post."
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
                FAQ TERMINAL · UPDATED OCT 1, 2026
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
                      src="/assets/peebear-head.webp"
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
              PeeBear’s guide to the current build
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
          .faq-mobile-peebear,
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
