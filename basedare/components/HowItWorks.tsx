'use client';

import RotatingText from "@/components/RotatingText";
import HowItWorksSignalWires from "@/components/HowItWorksSignalWires";
import './HowItWorksSignalWires.css';

export default function HowItWorks() {
  const steps = [
    {
      step: "01",
      title: "The Pledge",
      desc: "Lock real money in escrow. The dare is live. The place is tagged. Anyone nearby can claim it.",
      icon: "💰",
      accent: "from-[#F5C518]/30 via-[#F5C518]/12 to-transparent",
      titleColor: "text-[#F5C518]"
    },
    {
      step: "02",
      title: "The Action",
      desc: "Show up. Do it. Film the proof. No audience needed. Just you, the place, and what you're willing to do.",
      icon: "🎥",
      accent: "from-[#A855F7]/28 via-[#A855F7]/12 to-transparent",
      titleColor: "text-white"
    },
    {
      step: "03",
      title: "The Payoff",
      desc: "Proof verified. Settlement instant. The win gets written to the place forever.",
      icon: "💸",
      accent: "from-[#3BA7FF]/28 via-[#3BA7FF]/12 to-transparent",
      titleColor: "text-[#3BA7FF]"
    }
  ];

  return (
    <section className="w-full py-24 bg-transparent relative overflow-hidden">
      {/* Background Tech Lines */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] opacity-10" />

      <div className="container mx-auto px-4 md:px-6 relative z-10">
        
        {/* HEADER */}
        <div className="text-center mb-14 md:mb-20">
          <div className="mb-5 inline-flex items-center rounded-full border border-purple-400/25 bg-white/[0.03] px-3 py-2 shadow-[0_12px_30px_rgba(0,0,0,0.22)]">
            <div className="bd-dent-surface bd-dent-surface--soft rounded-full border border-purple-400/20 px-4 py-2">
              <h2 className="text-[0.7rem] font-mono text-purple-300 tracking-[0.45em] uppercase drop-shadow-lg">
                System Protocol
              </h2>
            </div>
          </div>
          <div className="hidden md:flex justify-center">
            <div className="how-it-works-neon-shell">
              <div className="how-it-works-neon-sign">
                <h3 className="how-it-works-neon-title">How It Works</h3>
              </div>
            </div>
          </div>
          <h3 className="text-5xl font-black text-white italic tracking-tighter uppercase drop-shadow-[0_0_30px_rgba(255,255,255,0.3)] md:hidden">
            How It Works
          </h3>
          <div className="mx-auto mt-5 max-w-2xl rounded-[1.6rem] border border-white/[0.08] bg-white/[0.02] px-4 py-3 shadow-[0_18px_50px_rgba(0,0,0,0.26)]">
            <div className="bd-dent-surface bd-dent-surface--soft rounded-[1.2rem] border border-white/[0.06] px-5 py-3">
              <p className="text-sm uppercase tracking-[0.32em] text-white/55 md:text-[0.84rem]">
                Fund it. Trigger it. Verify it.
              </p>
            </div>
          </div>
        </div>

        {/* 3-STEP PROCESS */}
        <div className="how-it-works-wire-shell relative mb-16 md:mb-24">
          <HowItWorksSignalWires foundationRatio={0.53} />
          <div className="grid md:grid-cols-3 gap-6 md:gap-8">
          {steps.map((item, idx) => (
            <div key={idx} data-cable-node className="relative group min-w-0">
              <div className="how-it-works-card-shell relative z-10 overflow-hidden rounded-[2rem] border border-white/[0.08] p-3 transition-all duration-300 hover:-translate-y-1.5 hover:border-purple-400/30">
                <div data-cable-anchor="left" className="how-it-works-side-socket how-it-works-side-socket--left hidden md:block" />
                <div data-cable-anchor="right" className="how-it-works-side-socket how-it-works-side-socket--right hidden md:block" />
                <div className={`pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b ${item.accent} opacity-90`} />
                <div className="how-it-works-card-glass relative flex min-h-[290px] flex-col rounded-[1.55rem] border border-white/[0.05] px-6 py-6">
                  <div className="how-it-works-card-fog pointer-events-none absolute inset-0 rounded-[1.55rem]" />
                  <div className="how-it-works-card-noise pointer-events-none absolute inset-0 rounded-[1.55rem]" />
                  <div className="mb-7 flex items-start justify-between gap-4">
                    <div className="how-it-works-icon-bay bd-dent-surface relative flex h-16 w-16 items-center justify-center rounded-[1.35rem] border border-purple-400/20 shadow-[0_0_24px_rgba(168,85,247,0.12)]">
                      <div className="how-it-works-icon-core flex h-[calc(100%-10px)] w-[calc(100%-10px)] items-center justify-center rounded-[1.05rem]">
                        <span className="how-it-works-icon-glyph">{item.icon}</span>
                      </div>
                    </div>
                    <div className="how-it-works-step-pill bd-dent-surface bd-dent-surface--soft rounded-full border border-white/[0.06] px-4 py-2">
                      <span className="text-sm font-mono font-black tracking-[0.28em] text-white/35">
                        {item.step}
                      </span>
                    </div>
                  </div>

                  <div className="how-it-works-content-bay bd-dent-surface flex flex-1 flex-col rounded-[1.45rem] border border-white/[0.06] px-5 py-5">
                    <div className="mb-4">
                      <p className="mb-2 text-[0.72rem] font-mono uppercase tracking-[0.34em] text-white/42">
                        Protocol Step
                      </p>
                      <div className="how-it-works-title-well rounded-[1.1rem] px-4 py-3">
                        <h4 className={`text-[2rem] font-black uppercase italic leading-none drop-shadow-lg ${item.titleColor}`}>
                          {item.title}
                        </h4>
                      </div>
                    </div>
                    <p className="text-[1.05rem] leading-relaxed text-gray-300 break-words drop-shadow-md">
                      {item.desc}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
          </div>
        </div>

        {/* Desktop Animated Text Strip */}
        <div className="hidden md:block">
          <div className="parallax bd-dent-surface rounded-[2rem] border border-white/[0.08] px-4 py-4">
            <div className="scroller text-white">
              <span>Wherever You Go. Someone Will Pay You To Do It.&nbsp;&nbsp;&nbsp;</span>
              <span>Wherever You Go. Someone Will Pay You To Do It.&nbsp;&nbsp;&nbsp;</span>
              <span>Wherever You Go. Someone Will Pay You To Do It.&nbsp;&nbsp;&nbsp;</span>
              <span>Wherever You Go. Someone Will Pay You To Do It.&nbsp;&nbsp;&nbsp;</span>
            </div>
          </div>
        </div>

        {/* Mobile Bounded Banner */}
        <div className="mt-4 text-center md:hidden">
          <div className="bd-dent-surface bd-dent-surface--soft rounded-[1.75rem] border border-white/[0.08] px-4 py-4">
            <p className="px-2 text-[1.15rem] font-black italic leading-tight tracking-tight text-white">
              Wherever You Go. Someone Will Pay You To Do It.
            </p>
          </div>
        </div>

        <div className="mt-8 md:mt-12 text-center px-2">
          <div className="bd-dent-surface bd-dent-surface--soft inline-flex max-w-full flex-wrap justify-center items-baseline gap-x-2 gap-y-1 rounded-full border border-purple-400/35 px-5 py-3 sm:px-8 sm:py-4 md:px-16 md:py-7">
            <span className="font-black italic uppercase tracking-wide leading-none text-white text-2xl sm:text-3xl md:text-6xl">Real</span>
            <RotatingText
              texts={["Dares.", "Crypto.", "Chaos."]}
              rotationInterval={2200}
              staggerDuration={0.012}
              splitBy="characters"
              activeTextClassNames={["text-[#F5C518]", "text-[#3BA7FF]", "text-[#A855F7]"]}
              mainClassName="inline-block w-auto min-w-0 font-black italic uppercase tracking-wide leading-none text-left text-2xl sm:text-3xl md:text-6xl"
              elementLevelClassName="inline-block"
            />
          </div>
          <p className="sr-only">Real dares. Real crypto. Real chaos.</p>
        </div>

      </div>

      <style jsx>{`
        .parallax {
          position: relative;
          overflow: hidden;
          margin-top: 1rem;
        }

        .scroller {
          display: flex;
          white-space: nowrap;
          text-align: center;
          font-family: sans-serif;
          font-size: 1.75rem;
          font-weight: bold;
          font-style: italic;
          letter-spacing: -0.02em;
          filter: drop-shadow(0 1px 1px rgba(0, 0, 0, 0.1));
          animation: marquee 26s linear infinite;
          will-change: transform;
        }

        .scroller span {
          flex-shrink: 0;
        }

        @media (min-width: 768px) {
          .scroller {
            font-size: 5rem;
            line-height: 5rem;
          }
        }

        @keyframes marquee {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
      `}</style>
    </section>
  );
}
