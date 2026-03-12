'use client';

import Link from "next/link";
import Image from "next/image";
import { LocateFixed, Minus, Plus } from "lucide-react";
import { useMemo, useState } from "react";

type PinStatus = "live" | "funded" | "done" | "hot";

type MapPin = {
  id: string;
  status: PinStatus;
  left: number;
  top: number;
  title: string;
  venue: string;
  bounty: string;
  badge: string;
};

type TickerItem = {
  prefix: string;
  highlight: string;
  suffix: string;
};

const STATUS_META: Record<
  PinStatus,
  {
    label: string;
    ringClass: string;
    badgeClass: string;
    tooltipBadgeClass: string;
    dotClass: string;
    hasRipple: boolean;
  }
> = {
  live: {
    label: "Live",
    ringClass:
      "bg-[radial-gradient(circle,_#1a0030,_#0d0018)] shadow-[0_0_0_3px_#ff2d55,0_0_20px_rgba(255,45,85,0.45),0_6px_20px_rgba(0,0,0,0.6)]",
    badgeClass: "bg-[#ff2d55] text-white",
    tooltipBadgeClass:
      "bg-[rgba(255,45,85,0.2)] text-[#ff2d55] border border-[rgba(255,45,85,0.35)]",
    dotClass: "bg-[#ff2d55]",
    hasRipple: true,
  },
  funded: {
    label: "Funded",
    ringClass:
      "bg-[radial-gradient(circle,_#0a1a0a,_#0d0018)] shadow-[0_0_0_3px_#00ff94,0_0_20px_rgba(0,255,148,0.4),0_6px_20px_rgba(0,0,0,0.6)]",
    badgeClass: "bg-[#00ff94] text-black",
    tooltipBadgeClass:
      "bg-[rgba(0,255,148,0.12)] text-[#00ff94] border border-[rgba(0,255,148,0.3)]",
    dotClass: "bg-[#00ff94]",
    hasRipple: false,
  },
  done: {
    label: "Done",
    ringClass:
      "bg-[radial-gradient(circle,_#1a1200,_#0d0018)] shadow-[0_0_0_3px_#f5c518,0_0_20px_rgba(245,197,24,0.4),0_6px_20px_rgba(0,0,0,0.6)]",
    badgeClass: "bg-[#f5c518] text-black",
    tooltipBadgeClass:
      "bg-[rgba(245,197,24,0.12)] text-[#f5c518] border border-[rgba(245,197,24,0.3)]",
    dotClass: "bg-[#f5c518]",
    hasRipple: false,
  },
  hot: {
    label: "Hot",
    ringClass:
      "bg-[radial-gradient(circle,_#0f0030,_#0d0018)] shadow-[0_0_0_3px_#6b21ff,0_0_24px_rgba(107,33,255,0.6),0_6px_20px_rgba(0,0,0,0.6)]",
    badgeClass: "bg-[#6b21ff] text-white",
    tooltipBadgeClass:
      "bg-[rgba(107,33,255,0.2)] text-[#b87fff] border border-[rgba(107,33,255,0.35)]",
    dotClass: "bg-[#6b21ff]",
    hasRipple: true,
  },
};

const STATS = [
  { value: "247", label: "Live Dares" },
  { value: "$48K", label: "Staked" },
  { value: "63", label: "Cities" },
  { value: "1,204", label: "Completions" },
];

const BLOCKS = [
  { left: 5, top: 10, width: 12, height: 18 },
  { left: 20, top: 5, width: 8, height: 12 },
  { left: 32, top: 15, width: 15, height: 22 },
  { left: 50, top: 8, width: 10, height: 16 },
  { left: 65, top: 12, width: 18, height: 14 },
  { left: 8, top: 40, width: 20, height: 25 },
  { left: 32, top: 45, width: 12, height: 18 },
  { left: 48, top: 38, width: 22, height: 20 },
  { left: 74, top: 35, width: 14, height: 28 },
  { left: 10, top: 72, width: 16, height: 15 },
  { left: 30, top: 68, width: 25, height: 20 },
  { left: 58, top: 65, width: 18, height: 22 },
  { left: 80, top: 68, width: 12, height: 18 },
];

const ROADS = [
  { id: "h1", axis: "h", pos: 32, thick: false },
  { id: "h2", axis: "h", pos: 50, thick: true },
  { id: "h3", axis: "h", pos: 64, thick: false },
  { id: "v1", axis: "v", pos: 28, thick: false },
  { id: "v2", axis: "v", pos: 46, thick: true },
  { id: "v3", axis: "v", pos: 62, thick: false },
  { id: "v4", axis: "v", pos: 78, thick: false },
];

const PINS: MapPin[] = [
  {
    id: "p1",
    status: "live",
    left: 22,
    top: 66,
    title: 'Sing "Macarena" on the bar counter',
    venue: "Mango's Tropical Cafe, Miami Beach",
    bounty: "$120 USDC",
    badge: "●",
  },
  {
    id: "p2",
    status: "funded",
    left: 38,
    top: 40,
    title: "Kickflip the Wynwood Wall steps",
    venue: "Wynwood Walls, Miami",
    bounty: "$350 USDC",
    badge: "✓",
  },
  {
    id: "p3",
    status: "hot",
    left: 54,
    top: 26,
    title: "Get 5 strangers to do a group conga line",
    venue: "Bayside Marketplace, Downtown",
    bounty: "$1,200 USDC",
    badge: "🔥",
  },
  {
    id: "p4",
    status: "done",
    left: 67,
    top: 56,
    title: "Order entire meal speaking only rhymes",
    venue: "Zuma Restaurant, Brickell",
    bounty: "$200 USDC",
    badge: "★",
  },
  {
    id: "p5",
    status: "live",
    left: 15,
    top: 43,
    title: "Dance salsa with a stranger for 60 secs",
    venue: "Ball & Chain, Little Havana",
    bounty: "$75 USDC",
    badge: "●",
  },
  {
    id: "p6",
    status: "funded",
    left: 82,
    top: 20,
    title: "Jump into the ocean fully clothed at midnight",
    venue: "Ocean Drive Beach, South Beach",
    bounty: "$500 USDC",
    badge: "✓",
  },
  {
    id: "p7",
    status: "live",
    left: 44,
    top: 70,
    title: "Air guitar solo in the middle of CocoWalk",
    venue: "CocoWalk, Coconut Grove",
    bounty: "$90 USDC",
    badge: "●",
  },
  {
    id: "p8",
    status: "hot",
    left: 29,
    top: 22,
    title: "Freestyle rap about a stranger's outfit",
    venue: "The Citadel, Overtown",
    bounty: "$800 USDC",
    badge: "🔥",
  },
  {
    id: "p9",
    status: "done",
    left: 73,
    top: 73,
    title: "Speak only Spanish for 30 mins straight",
    venue: "Downtown Doral",
    bounty: "$150 USDC",
    badge: "★",
  },
];

const TICKER_ITEMS: TickerItem[] = [
  {
    prefix: "New dare funded at",
    highlight: "Wynwood Walls",
    suffix: "for $350 USDC",
  },
  {
    prefix: "Verification pending at",
    highlight: "Ball & Chain",
    suffix: "by @sweatlord",
  },
  {
    prefix: "Payout released for",
    highlight: "Ocean Drive jump",
    suffix: "to @basebandit",
  },
  {
    prefix: "Hot challenge trending near",
    highlight: "Bayside",
    suffix: "watch parties forming",
  },
];

const FILTERS: PinStatus[] = ["live", "funded", "done", "hot"];

export default function MapClient({ monoClass }: { monoClass: string }) {
  const [activeFilters, setActiveFilters] = useState<Record<PinStatus, boolean>>({
    live: true,
    funded: true,
    done: true,
    hot: true,
  });
  const [sprayBurst, setSprayBurst] = useState(false);

  const visiblePins = useMemo(
    () => PINS.filter((pin) => activeFilters[pin.status]),
    [activeFilters]
  );

  const handleSpray = () => {
    setSprayBurst(false);
    requestAnimationFrame(() => {
      setSprayBurst(true);
      setTimeout(() => setSprayBurst(false), 600);
    });
  };

  return (
    <section className="relative z-20 overflow-hidden px-4 pb-24 pt-8 sm:px-6 md:px-10">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_50%_0%,rgba(107,33,255,0.32)_0%,transparent_62%),radial-gradient(ellipse_40%_40%_at_20%_80%,rgba(74,14,143,0.2)_0%,transparent_50%),radial-gradient(ellipse_30%_30%_at_80%_60%,rgba(107,33,255,0.15)_0%,transparent_52%)]" />
        <div className="scanlines absolute inset-0" />
      </div>

      <div className="mx-auto max-w-7xl">
        <div
          className={`mx-auto mb-8 inline-flex items-center rounded-full border border-[#f5c518]/20 bg-[#f5c518]/8 px-3 py-1.5 text-[10px] tracking-[0.12em] text-[#f5c518]/90 ${monoClass}`}
        >
          preview*
        </div>

        <header className="relative z-[1] pb-10 text-center">
          <div
            className={`mb-6 inline-flex items-center gap-2 rounded-full border border-[#f5c518]/35 bg-[#f5c518]/10 px-5 py-2 text-[10px] uppercase tracking-[0.22em] text-[#f5c518] ${monoClass}`}
          >
            <span>🌐</span>
            <span>First IRL Web3 Dare Network</span>
          </div>
          <h1 className="text-5xl font-extrabold leading-[0.9] tracking-[-0.05em] text-white sm:text-7xl lg:text-8xl">
            The World Is
            <br />
            <span className="text-[#f5c518]">Your Dare</span>
            <br />
            <span className="text-[#b87fff]">Ground</span>
          </h1>
          <p
            className={`mx-auto mt-5 max-w-[500px] text-xs leading-7 text-white/45 sm:text-sm ${monoClass}`}
          >
            Real venues. Crypto stakes. On-chain proof. Every pin is a legend permanently
            written to the map.
          </p>
          <div className="mt-9 inline-flex overflow-hidden rounded-2xl border border-[rgba(107,33,255,0.35)]">
            {STATS.map((stat, index) => (
              <div
                key={stat.label}
                className={`bg-[rgba(107,33,255,0.07)] px-5 py-3 text-center sm:px-10 ${
                  index < STATS.length - 1 ? "border-r border-[rgba(107,33,255,0.25)]" : ""
                }`}
              >
                <span className={`block text-xl font-bold text-[#f5c518] sm:text-3xl ${monoClass}`}>
                  {stat.value}
                </span>
                <span className={`block text-[10px] uppercase tracking-[0.12em] text-white/45 ${monoClass}`}>
                  {stat.label}
                </span>
              </div>
            ))}
          </div>
        </header>

        <section className="relative z-[1]">
          <div className="relative overflow-hidden rounded-[20px] border border-[rgba(138,164,255,0.25)] bg-[rgba(8,12,30,0.42)] shadow-[0_0_0_1px_rgba(107,33,255,0.12),0_45px_120px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,255,255,0.16)] backdrop-blur-2xl">
            <div className="pointer-events-none absolute inset-x-6 top-0 z-[2] h-px bg-gradient-to-r from-transparent via-white/35 to-transparent" />
            <div
              className="relative h-[620px] w-full overflow-hidden sm:h-[660px]"
              style={{
                backgroundImage:
                  "radial-gradient(120% 100% at 10% 0%, rgba(86,96,255,0.24), transparent 52%),radial-gradient(120% 90% at 95% 20%, rgba(150,65,255,0.2), transparent 55%),linear-gradient(160deg, #040718 0%, #070d2a 45%, #120a30 100%)",
              }}
            >
              <div className="network-mesh pointer-events-none absolute inset-0 opacity-75" />
              <div className="network-links pointer-events-none absolute inset-0 opacity-45" />
              <div className="starfield pointer-events-none absolute inset-0 opacity-70" />
              <div className="glass-haze pointer-events-none absolute inset-0" />

              {BLOCKS.map((block, idx) => (
                <div
                  key={`block-${idx}`}
                  className="absolute rounded-[8px] border border-white/10 bg-[rgba(140,170,255,0.04)] backdrop-blur-[2px]"
                  style={{
                    left: `${block.left}%`,
                    top: `${block.top}%`,
                    width: `${block.width}%`,
                    height: `${block.height}%`,
                  }}
                />
              ))}

              {ROADS.map((road) => (
                <div
                  key={road.id}
                  className={`absolute bg-[rgba(126,150,255,0.12)] ${road.thick ? "bg-[rgba(148,88,255,0.2)]" : ""}`}
                  style={
                    road.axis === "h"
                      ? {
                          top: `${road.pos}%`,
                          left: 0,
                          right: 0,
                          height: road.thick ? "3px" : "2px",
                        }
                      : {
                          left: `${road.pos}%`,
                          top: 0,
                          bottom: 0,
                          width: road.thick ? "3px" : "2px",
                        }
                  }
                />
              ))}

              <div className="absolute left-3 top-3 z-20 flex flex-wrap gap-2">
                {FILTERS.map((status) => {
                  const meta = STATUS_META[status];
                  const on = activeFilters[status];
                  return (
                    <button
                      key={status}
                      onClick={() =>
                        setActiveFilters((prev) => ({
                          ...prev,
                          [status]: !prev[status],
                        }))
                      }
                      className={`flex items-center gap-2 rounded-full border px-3 py-1 text-[10px] uppercase tracking-[0.08em] transition ${monoClass} ${
                        on
                          ? "border-white/25 bg-[rgba(107,33,255,0.18)] text-white"
                          : "border-[rgba(107,33,255,0.3)] bg-[rgba(10,0,22,0.9)] text-white/55"
                      }`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${meta.dotClass}`} />
                      {meta.label}
                    </button>
                  );
                })}
              </div>

              <div className="absolute right-3 top-3 z-20 flex flex-col gap-2">
                <button className="ctrl-btn" aria-label="Zoom in">
                  <Plus className="h-4 w-4" />
                </button>
                <button className="ctrl-btn" aria-label="Zoom out">
                  <Minus className="h-4 w-4" />
                </button>
                <button className="ctrl-btn" aria-label="Recenter">
                  <LocateFixed className="h-4 w-4" />
                </button>
              </div>

              {visiblePins.map((pin) => {
                const meta = STATUS_META[pin.status];
                const showBelow = pin.top < 24;
                const alignLeft = pin.left < 16;
                const alignRight = pin.left > 84;
                return (
                  <div
                    key={pin.id}
                    className="group absolute z-10 -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-transform duration-200 hover:z-20 hover:scale-110"
                    style={{ left: `${pin.left}%`, top: `${pin.top}%` }}
                  >
                    {meta.hasRipple && (
                      <span
                        className={`pin-ripple ${pin.status === "live" ? "pin-ripple-live" : "pin-ripple-hot"}`}
                      />
                    )}
                    <div className={`relative flex h-[52px] w-[52px] items-center justify-center overflow-hidden rounded-full ${meta.ringClass}`}>
                      <Image
                        src="/assets/peebear-head.png"
                        alt="PeeBear pin"
                        width={42}
                        height={42}
                        className="relative z-[1] h-[80%] w-[80%] object-contain"
                      />
                      <span
                        className={`absolute -right-1 -top-1 z-[2] flex h-[18px] w-[18px] items-center justify-center rounded-full border-2 border-[#0d0018] text-[9px] font-bold ${meta.badgeClass}`}
                      >
                        {pin.badge}
                      </span>
                    </div>
                    <div className="mx-auto mt-1 h-1 w-4 rounded-full bg-black/50 blur-[2px]" />

                    <div
                      className={`pointer-events-none absolute w-[220px] rounded-xl border border-[rgba(107,33,255,0.3)] bg-[rgba(10,0,22,0.97)] p-3 opacity-0 shadow-[0_8px_32px_rgba(0,0,0,0.6)] backdrop-blur-xl transition-opacity duration-200 group-hover:opacity-100 ${
                        showBelow ? "top-[calc(100%+10px)]" : "bottom-[calc(100%+10px)]"
                      } ${
                        alignRight
                          ? "right-0"
                          : alignLeft
                            ? "left-0"
                            : "left-1/2 -translate-x-1/2"
                      }`}
                    >
                      <div className="mb-1 text-[12px] font-extrabold leading-[1.25] text-white">
                        {pin.title}
                      </div>
                      <div className={`mb-2 text-[9px] text-white/35 ${monoClass}`}>📍 {pin.venue}</div>
                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-[14px] font-bold text-[#f5c518] ${monoClass}`}>{pin.bounty}</span>
                        <span
                          className={`rounded-full px-2 py-1 text-[9px] font-bold uppercase tracking-[0.06em] ${monoClass} ${meta.tooltipBadgeClass}`}
                        >
                          {meta.label}
                        </span>
                      </div>
                      <span
                        className={`absolute border-[6px] border-transparent ${
                          alignRight
                            ? "right-6"
                            : alignLeft
                              ? "left-6"
                              : "left-1/2 -translate-x-1/2"
                        } ${
                          showBelow
                            ? "bottom-full border-b-[rgba(107,33,255,0.3)]"
                            : "top-full border-t-[rgba(107,33,255,0.3)]"
                        }`}
                      />
                    </div>
                  </div>
                );
              })}

              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_35%_45%_at_25%_65%,rgba(255,45,85,0.08)_0%,transparent_60%),radial-gradient(ellipse_30%_40%_at_65%_30%,rgba(0,255,148,0.08)_0%,transparent_60%),radial-gradient(ellipse_25%_35%_at_50%_50%,rgba(107,33,255,0.12)_0%,transparent_60%)]" />

              <div className="absolute bottom-4 left-4 right-4 z-20 rounded-xl border border-[rgba(107,33,255,0.3)] bg-[rgba(10,0,22,0.92)] px-3 py-2 backdrop-blur-md">
                <div className="flex items-center gap-3">
                  <span className={`ticker-label text-[9px] font-bold uppercase tracking-[0.12em] text-[#ff2d55] ${monoClass}`}>
                    Live feed
                  </span>
                  <div className="relative flex-1 overflow-hidden">
                    <div className="ticker-track whitespace-nowrap text-[10px] text-white/45">
                      {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, idx) => (
                        <span key={`${item.highlight}-${idx}`} className={`mr-12 inline-block ${monoClass}`}>
                          {item.prefix} <span className="text-[#f5c518]">{item.highlight}</span> {item.suffix}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className={`spray-burst ${sprayBurst ? "bang" : ""}`} />
              <button onClick={handleSpray} className="spray-can" aria-label="Spray map easter egg">
                <Image
                  src="/assets/bare-paint-can.png"
                  alt="Bare Paint spray can"
                  width={92}
                  height={92}
                  className="h-auto w-full"
                />
              </button>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-6">
            {FILTERS.map((status) => {
              const meta = STATUS_META[status];
              return (
                <div key={`legend-${status}`} className={`flex items-center gap-2 text-[11px] text-white/45 ${monoClass}`}>
                  <span className={`h-2.5 w-2.5 rounded-full ${meta.dotClass}`} />
                  {meta.label}
                </div>
              );
            })}
          </div>
        </section>

        <section className="relative z-[1] pt-16 text-center">
          <h2 className="text-4xl font-extrabold tracking-[-0.04em] text-white sm:text-6xl">
            Ready To Own Your <span className="text-[#f5c518]">City Block</span>?
          </h2>
          <p className={`mx-auto mt-4 max-w-xl text-xs text-white/45 sm:text-sm ${monoClass}`}>
            Want to dare near you? Join the waitlist.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/waitlist"
              className={`inline-flex items-center rounded-full border border-[rgba(107,33,255,0.4)] px-6 py-3 text-xs uppercase tracking-[0.1em] text-[#f5c518] transition hover:border-[#f5c518]/60 hover:bg-[#f5c518]/10 ${monoClass}`}
            >
              Join Waitlist
            </Link>
          </div>
        </section>
      </div>

      <style jsx>{`
        .scanlines {
          background: repeating-linear-gradient(
            0deg,
            transparent,
            transparent 2px,
            rgba(0, 0, 0, 0.04) 2px,
            rgba(0, 0, 0, 0.04) 4px
          );
        }

        .pin-ripple {
          position: absolute;
          left: 50%;
          top: 50%;
          width: 52px;
          height: 52px;
          border-radius: 9999px;
          transform: translate(-50%, -50%);
          animation: rippleOut 2s infinite;
          pointer-events: none;
        }

        .pin-ripple-live {
          border: 1.5px solid #ff2d55;
        }

        .pin-ripple-hot {
          border: 1.5px solid #6b21ff;
          animation-delay: 0.3s;
        }

        .ctrl-btn {
          width: 34px;
          height: 34px;
          border-radius: 8px;
          border: 1px solid rgba(107, 33, 255, 0.3);
          background: rgba(10, 0, 22, 0.9);
          color: rgba(255, 255, 255, 0.55);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.15s ease;
        }

        .ctrl-btn:hover {
          border-color: #f5c518;
          color: #f5c518;
        }

        .ticker-label::before {
          content: "";
          display: inline-block;
          width: 5px;
          height: 5px;
          border-radius: 9999px;
          margin-right: 6px;
          background: #ff2d55;
          animation: blink 1s infinite;
        }

        .ticker-track {
          animation: scroll 24s linear infinite;
        }

        .network-mesh {
          background-image:
            linear-gradient(rgba(129, 103, 255, 0.24) 1px, transparent 1px),
            linear-gradient(90deg, rgba(129, 103, 255, 0.24) 1px, transparent 1px);
          background-size: 96px 96px, 96px 96px;
        }

        .network-links {
          background-image:
            linear-gradient(32deg, transparent 48%, rgba(153, 126, 255, 0.18) 50%, transparent 52%),
            linear-gradient(-32deg, transparent 48%, rgba(87, 164, 255, 0.14) 50%, transparent 52%),
            linear-gradient(74deg, transparent 48%, rgba(137, 95, 255, 0.14) 50%, transparent 52%);
          background-size: 220px 220px, 240px 240px, 280px 280px;
          background-position: 0 0, 30px 40px, 90px 60px;
        }

        .starfield {
          background-image:
            radial-gradient(circle at 12% 15%, rgba(255, 255, 255, 0.85) 0 2px, transparent 3px),
            radial-gradient(circle at 70% 20%, rgba(181, 203, 255, 0.65) 0 2px, transparent 3px),
            radial-gradient(circle at 23% 62%, rgba(170, 130, 255, 0.7) 0 2px, transparent 3px),
            radial-gradient(circle at 78% 70%, rgba(255, 255, 255, 0.55) 0 2px, transparent 3px),
            radial-gradient(circle at 40% 44%, rgba(156, 199, 255, 0.45) 0 3px, transparent 4px),
            radial-gradient(circle at 88% 45%, rgba(160, 120, 255, 0.45) 0 2px, transparent 3px);
        }

        .glass-haze {
          background:
            linear-gradient(180deg, rgba(255, 255, 255, 0.06) 0%, rgba(255, 255, 255, 0) 30%),
            radial-gradient(120% 100% at 50% 0%, rgba(255, 255, 255, 0.08) 0%, transparent 60%);
          backdrop-filter: blur(1.5px);
          -webkit-backdrop-filter: blur(1.5px);
        }

        .spray-can {
          position: absolute;
          right: 20px;
          bottom: 48px;
          z-index: 15;
          width: 78px;
          border: none;
          background: transparent;
          padding: 0;
          transform: rotate(-15deg);
          transition: transform 0.3s ease, filter 0.3s ease;
          filter: drop-shadow(0 6px 20px rgba(107, 33, 255, 0.45));
          animation: canFloat 4s ease-in-out infinite;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .spray-can::after {
          content: "BARE PAINT";
          position: absolute;
          bottom: 110%;
          left: 50%;
          transform: translateX(-50%) rotate(15deg);
          border-radius: 8px;
          border: 1px solid rgba(107, 33, 255, 0.4);
          background: rgba(10, 0, 22, 0.95);
          color: #00ffc8;
          font-size: 9px;
          letter-spacing: 1.5px;
          white-space: nowrap;
          padding: 5px 10px;
          opacity: 0;
          transition: opacity 0.2s ease;
          pointer-events: none;
        }

        .spray-can:hover {
          transform: rotate(20deg) scale(1.12);
          filter: drop-shadow(0 0 24px rgba(0, 255, 200, 0.7));
          animation: none;
        }

        .spray-can:hover::after {
          opacity: 1;
        }

        .spray-can:active {
          transform: rotate(45deg) scale(0.95);
        }

        .spray-burst {
          position: absolute;
          right: 8px;
          bottom: 84px;
          width: 120px;
          height: 120px;
          border-radius: 9999px;
          background: radial-gradient(
            circle,
            rgba(0, 255, 200, 0.6),
            rgba(107, 33, 255, 0.3),
            transparent 70%
          );
          opacity: 0;
          transform: scale(0);
          pointer-events: none;
          z-index: 14;
        }

        .spray-burst.bang {
          animation: sprayBang 0.6s ease-out forwards;
        }

        @keyframes blink {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0.3;
          }
        }

        @keyframes rippleOut {
          0% {
            transform: translate(-50%, -50%) scale(1);
            opacity: 0.7;
          }
          100% {
            transform: translate(-50%, -50%) scale(2.2);
            opacity: 0;
          }
        }

        @keyframes scroll {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }

        @keyframes canFloat {
          0%,
          100% {
            transform: rotate(-15deg) translateY(0);
          }
          50% {
            transform: rotate(-12deg) translateY(-8px);
          }
        }

        @keyframes sprayBang {
          0% {
            opacity: 1;
            transform: scale(0.2);
          }
          60% {
            opacity: 0.8;
            transform: scale(1.4);
          }
          100% {
            opacity: 0;
            transform: scale(2);
          }
        }
      `}</style>
    </section>
  );
}
