'use client';

import RotatingText from "@/components/RotatingText";

export default function HowItWorks() {
  return (
    <section className="w-full py-24 bg-transparent relative overflow-hidden">
      {/* Background Tech Lines */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] opacity-10" />

      <div className="container mx-auto px-4 md:px-6 relative z-10">
        
        {/* HEADER */}
        <div className="text-center mb-14 md:mb-20">
          <h2 className="text-sm font-mono text-purple-400 tracking-[0.5em] mb-4 uppercase drop-shadow-lg">System Protocol</h2>
          <h3 className="text-5xl md:text-6xl font-black text-white italic tracking-tighter uppercase drop-shadow-[0_0_30px_rgba(255,255,255,0.3)]">
            How It Works
          </h3>
        </div>

        {/* 3-STEP PROCESS */}
        <div className="grid md:grid-cols-3 gap-6 md:gap-8 mb-16 md:mb-24">
          {[
            {
              step: "01",
              title: "The Pledge",
              desc: "You fund a bounty with USDC tokens held in escrow. The money is real. The pressure is visible.",
              icon: "💰"
            },
            {
              step: "02",
              title: "The Action",
              desc: "The influencer receives the challenge. The chat goes wild. They either perform the dare or lose face forever.",
              icon: "🎥"
            },
            {
              step: "03",
              title: "The Payoff",
              desc: "Proof submitted. Consensus reached. Smart contract releases funds instantly.",
              icon: "💸"
            }
          ].map((item, idx) => (
            <div key={idx} className="relative group min-w-0">
              {/* Connector Line (Desktop only) */}
              {idx !== 2 && (
                <div className="hidden md:block absolute top-12 left-full w-full h-[2px] bg-gradient-to-r from-purple-500 via-purple-400 to-transparent -translate-x-8 z-0 shadow-lg shadow-purple-500/50" />
              )}
              
              <div className="p-6 md:p-8 relative z-10 overflow-hidden transition-all duration-300 hover:translate-y-[-5px] rounded-2xl bg-white/[0.03] backdrop-blur-[12px] md:backdrop-blur-[20px] border border-purple-500/20 hover:bg-white/[0.08] hover:border-purple-500/40 shadow-lg">
                <span className="text-6xl font-black text-white/5 absolute top-4 right-4 drop-shadow-lg">{item.step}</span>
                <div className="w-16 h-16 bg-purple-900/20 rounded-full flex items-center justify-center text-3xl mb-6 border border-purple-500/20 group-hover:border-purple-500 transition-colors shadow-[0_0_20px_rgba(168,85,247,0.2)]">
                  {item.icon}
                </div>
                <h4 className="text-2xl font-bold text-white mb-3 uppercase italic drop-shadow-lg">{item.title}</h4>
                <p className="text-gray-300 leading-relaxed break-words drop-shadow-md">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop Animated Text Strip */}
        <div className="parallax hidden md:block">
          <div className="scroller text-white">
            <span>Wherever You Are. Someone Will Pay You To Do It.&nbsp;&nbsp;&nbsp;</span>
            <span>Wherever You Are. Someone Will Pay You To Do It.&nbsp;&nbsp;&nbsp;</span>
            <span>Wherever You Are. Someone Will Pay You To Do It.&nbsp;&nbsp;&nbsp;</span>
            <span>Wherever You Are. Someone Will Pay You To Do It.&nbsp;&nbsp;&nbsp;</span>
          </div>
        </div>

        {/* Mobile Bounded Banner */}
        <div className="mt-4 text-center md:hidden">
          <p className="px-2 text-[1.15rem] font-black italic leading-tight tracking-tight text-white">
            Wherever You Are. Someone Will Pay You To Do It.
          </p>
        </div>

        <div className="mt-8 md:mt-12 text-center px-2">
          <div className="inline-flex max-w-full flex-wrap justify-center items-baseline gap-x-2 gap-y-1 rounded-full border border-purple-400/35 bg-white/[0.05] px-5 py-3 sm:px-8 sm:py-4 md:px-16 md:py-7 backdrop-blur-sm md:backdrop-blur-xl shadow-[0_10px_30px_rgba(14,10,36,0.35)] md:shadow-[0_16px_55px_rgba(14,10,36,0.5)]">
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
          padding: 0.75rem 0;
          border-top: 1px solid rgba(168, 85, 247, 0.22);
          border-bottom: 1px solid rgba(168, 85, 247, 0.22);
          background: rgba(255, 255, 255, 0.02);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
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
