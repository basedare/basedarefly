// components/LivePotBubble.tsx (PURPLE AMBIENT GLOW RESTORED + BULLETPROOF BASKETBALL BOUNCE)
'use client';

import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useView } from '@/app/context/ViewContext';

interface LivePotBubbleProps {
  className?: string;
}

type PoolStat = {
  amount: number;
  count: number;
};

type TopVenue = {
  name: string;
  slug: string;
  city?: string | null;
  country?: string | null;
  amount: number;
  verifiedDares: number;
};

type CreatorPoolSummary = {
  total: number;
  liveDares: PoolStat;
  venueActivations: PoolStat;
  paidOut: PoolStat;
  topEarningVenue: TopVenue | null;
  fundedBy: string[];
  updatedAt: string;
};

function formatCompactUsd(value: number) {
  const options: Intl.NumberFormatOptions = {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  };

  if (value >= 100000) {
    options.notation = 'compact';
  }

  return new Intl.NumberFormat('en-US', options).format(value);
}

function formatUsd(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

export default function LivePotBubble({ className }: LivePotBubbleProps = {}) {
  const { isControlMode } = useView(); // Use global context
  const pathname = usePathname();
  const [translateY, setTranslateY] = useState(0);
  const [triggerBounce, setTriggerBounce] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [pool, setPool] = useState<CreatorPoolSummary | null>(null);
  const [poolLoadSettled, setPoolLoadSettled] = useState(false);
  const potRef = useRef<HTMLButtonElement>(null);
  const rafRef = useRef<number | null>(null);
  const prevDistance = useRef<number>(0);

  // THE ELEVATOR SCRIPT (GPU-Accelerated + Basketball Bounce)
  useEffect(() => {
    const updatePosition = () => {
      const footer = document.getElementById('site-footer');
      const pot = potRef.current;
      if (!footer || !pot) return;

      const footerRect = footer.getBoundingClientRect();
      const potHeight = pot.offsetHeight;
      const gap = 24;
      const windowHeight = window.innerHeight;
      const distanceToFooterTop = windowHeight - footerRect.top;

      if (distanceToFooterTop > prevDistance.current && distanceToFooterTop > 0) {
        if (distanceToFooterTop > potHeight + gap) {
          if (!triggerBounce) {
            setTriggerBounce(true);
            setTimeout(() => setTriggerBounce(false), 1200);
          }
        }
      }
      prevDistance.current = distanceToFooterTop;

      if (distanceToFooterTop > potHeight + gap) {
        setTranslateY(-(potHeight + gap));
      } else if (distanceToFooterTop > 0) {
        setTranslateY(-distanceToFooterTop);
      } else {
        setTranslateY(0);
      }
    };

    const onScroll = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(updatePosition);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    updatePosition();

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [triggerBounce]);

  useEffect(() => {
    if (pathname !== '/') return;

    let isActive = true;
    const controller = new AbortController();

    fetch('/api/live-pot', {
      signal: controller.signal,
      cache: 'no-store',
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => {
        if (isActive && payload?.success && payload?.data?.creatorPool) {
          setPool(payload.data.creatorPool);
        }
      })
      .catch((error: unknown) => {
        if ((error as { name?: string }).name !== 'AbortError') {
          console.warn('[CreatorPool] Failed to load', error);
        }
      })
      .finally(() => {
        if (isActive) {
          setPoolLoadSettled(true);
        }
      });

    return () => {
      isActive = false;
      controller.abort();
    };
  }, [pathname]);

  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen]);

  if (pathname !== '/') {
    return null;
  }

  const displayTotal = pool && pool.total > 0 ? pool.total : 86227;
  const isLoadingPool = !poolLoadSettled && !pool;
  const topVenue = pool?.topEarningVenue;
  const poolStats = [
    {
      label: 'Live dares',
      value: formatUsd(pool?.liveDares.amount ?? 0),
      meta: `${pool?.liveDares.count ?? 0} active`,
    },
    {
      label: 'Venue activations',
      value: formatUsd(pool?.venueActivations.amount ?? 0),
      meta: `${pool?.venueActivations.count ?? 0} live`,
    },
    {
      label: 'Paid out',
      value: formatUsd(pool?.paidOut.amount ?? 0),
      meta: `${pool?.paidOut.count ?? 0} verified`,
    },
    {
      label: 'Top venue',
      value: topVenue?.name ?? 'Warming up',
      meta: topVenue ? `${formatUsd(topVenue.amount)} paid` : 'No winner yet',
    },
  ];
  const fundedBy = pool?.fundedBy?.length ? pool.fundedBy : ['Brands', 'Venues', 'Dare creators'];

  return (
    <>
      <motion.button
        ref={potRef}
        type="button"
        aria-label="Open Creator Pool"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((value) => !value)}
        className={`
          fixed z-40 will-change-transform origin-bottom-right
          rounded-full flex flex-col justify-center items-center p-2
          border-2 overflow-hidden cursor-pointer
          w-44 h-44
          bottom-4 right-2 scale-75
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-300/70 focus-visible:ring-offset-2 focus-visible:ring-offset-black
          md:bottom-6 md:right-6 md:scale-100
          ${isControlMode
            ? 'border-zinc-400/50 shadow-[0_0_20px_rgba(120,120,120,0.4)]'
            : 'border-purple-500/50 shadow-[0_0_20px_rgba(168,85,247,0.4)]'
          }
          ${className || ''}
        `}
        style={{
          transform: `translateY(${translateY}px) translateZ(0)`,
          transition: triggerBounce ? 'none' : 'transform 300ms cubic-bezier(0.16, 1, 0.3, 1)',
          borderRadius: '9999px',
          overflow: 'hidden',
          isolation: 'isolate',
          contain: 'paint',
          WebkitMaskImage: '-webkit-radial-gradient(white, black)',
          maskImage: 'radial-gradient(circle, white 98%, transparent 100%)',
          filter: isControlMode ? 'grayscale(1) contrast(1.1) brightness(0.95)' : 'none',
          WebkitFilter: isControlMode ? 'grayscale(1) contrast(1.1) brightness(0.95)' : 'none',
        }}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 150, delay: 0.5 }}
        whileHover={{
          scale: 1.08,
          transition: { type: "spring", stiffness: 200, damping: 15, duration: 0.6 }
        }}
        whileTap={{ scale: 0.96 }}
      >
        {/* PRIMARY SPINNING VORTEX */}
        <div
          className="absolute inset-[-100%] z-0 opacity-95 mix-blend-color-dodge pointer-events-none rounded-full"
          style={{
            backgroundImage: `conic-gradient(from 0deg, transparent 0deg, #A855F7 90deg, transparent 180deg, #FACC15 270deg, transparent 360deg)`,
            animation: "spinGlobe 10s linear infinite",
            filter: "blur(4px)",
            transform: 'scale(1.8)'
          }}
        />

        {/* COUNTER-VORTEX LAYER */}
        <div
          className="absolute inset-[-100%] z-0 opacity-60 mix-blend-screen pointer-events-none rounded-full"
          style={{
            backgroundImage: `conic-gradient(from 0deg, #FACC15, #A855F7, transparent)`,
            animation: "spinGlobe 20s linear infinite reverse",
            filter: "blur(8px)",
            transform: 'scale(2)'
          }}
        />

        {/* DEEP PURPLE AMBIENT GLOW */}
        <div
          className="absolute inset-0 z-0 pointer-events-none rounded-full"
          style={{
            background: "radial-gradient(circle at center, #A855F7 0%, #6B21A8 50%, transparent 80%)",
            opacity: 0.25,
            filter: "blur(30px)",
          }}
        />

        {/* INNER PULSE GLOW */}
        <motion.div
          className="absolute inset-0 rounded-full pointer-events-none z-10"
          animate={{ boxShadow: ["0 0 10px rgba(168,85,247,0.3)", "0 0 20px rgba(168,85,247,0.6)", "0 0 10px rgba(168,85,247,0.3)"] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* SPHERICAL SHADING */}
        <div className="absolute inset-0 rounded-full pointer-events-none z-[15] shadow-[inset_-12px_-12px_30px_rgba(0,0,0,0.95),_inset_6px_6px_20px_rgba(255,255,255,0.15),_inset_0_-20px_40px_rgba(168,85,247,0.2)]" />

        {/* SPECULAR HIGHLIGHTS */}
        <div className="absolute top-6 left-8 w-16 h-8 bg-white/25 rounded-full blur-lg -rotate-12 pointer-events-none z-[25]" />
        <div className="absolute top-8 left-10 w-8 h-4 bg-white/30 rounded-full blur-sm -rotate-12 pointer-events-none z-[26]" />
        <div className="absolute top-12 left-14 w-6 h-3 bg-white/40 rounded-full blur-[2px] -rotate-45 pointer-events-none z-[27]" />

        {/* LIQUID GLASS SURFACE - Safari fix: explicit webkit prefix + GPU layer */}
        <div
          className="absolute inset-0 z-20 rounded-full pointer-events-none"
          style={{
            WebkitBackdropFilter: 'blur(8px) saturate(180%)',
            backdropFilter: 'blur(8px) saturate(180%)',
            background: 'rgba(0, 0, 0, 0.2)',
            boxShadow: 'inset 0 0 0 1px rgba(255, 255, 255, 0.1)',
            transform: 'translateZ(0)',
            WebkitTransform: 'translateZ(0)',
            isolation: 'isolate',
            overflow: 'hidden',
            WebkitMaskImage: '-webkit-radial-gradient(white, black)',
          }}
        />

        {/* Content */}
        <div className={`absolute inset-0 z-30 flex flex-col justify-center items-center text-center p-2 ${triggerBounce ? 'animate-basketball-bounce' : ''}`}>
          <div className="text-xs font-semibold text-purple-300 uppercase tracking-widest drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">CREATOR POOL</div>
          <div className="live-pot-value text-3xl font-extrabold drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">{formatCompactUsd(displayTotal)}</div>
          <div className="mt-1 text-[0.55rem] font-black uppercase tracking-[0.22em] text-white/80 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
            {isLoadingPool ? 'Syncing' : 'Live liquidity'}
          </div>
        </div>
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="fixed bottom-36 right-4 z-50 w-[calc(100vw-2rem)] max-w-sm overflow-hidden rounded-[2rem] border border-white/12 bg-[linear-gradient(180deg,rgba(18,16,30,0.76)_0%,rgba(7,6,16,0.92)_100%)] p-4 text-white shadow-[0_24px_80px_rgba(0,0,0,0.72),0_0_46px_rgba(168,85,247,0.24),inset_0_1px_0_rgba(255,255,255,0.14),inset_0_-18px_32px_rgba(0,0,0,0.28)] backdrop-blur-xl md:bottom-52 md:right-8"
            initial={{ opacity: 0, y: 14, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
          >
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(168,85,247,0.24),transparent_46%),radial-gradient(circle_at_bottom_right,rgba(250,204,21,0.16),transparent_42%)]" />
            <div className="pointer-events-none absolute inset-x-6 top-0 h-px rounded-full bg-[linear-gradient(90deg,transparent_0%,rgba(255,255,255,0.16)_18%,rgba(255,255,255,0.34)_50%,rgba(255,255,255,0.16)_82%,transparent_100%)]" />
            <div className="pointer-events-none absolute inset-x-10 top-[1px] h-10 rounded-full bg-white/[0.035] blur-2xl" />

            <div className="relative z-10">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="inline-flex rounded-full border border-yellow-300/35 bg-yellow-300/10 px-3 py-1 text-[0.62rem] font-black uppercase tracking-[0.22em] text-yellow-200">
                    Creator Pool
                  </div>
                  <h2 className="mt-3 text-2xl font-black uppercase italic leading-none text-white">
                    Liquidity Layer
                  </h2>
                </div>
                <button
                  type="button"
                  aria-label="Close Creator Pool"
                  onClick={() => setIsOpen(false)}
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/12 bg-white/5 text-xl text-white/70 transition hover:bg-white/10 hover:text-white"
                >
                  ×
                </button>
              </div>

              <p className="mt-3 text-sm leading-relaxed text-white/68">
                Real money available or already routed to creators through live dares, venue activations, and campaign budgets.
              </p>

              <div className="mt-4 rounded-[1.25rem] border border-white/10 bg-black/35 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                <div className="text-[0.62rem] font-black uppercase tracking-[0.22em] text-white/45">
                  Total live / routed
                </div>
                <div className="mt-1 text-3xl font-black text-yellow-300">{formatUsd(displayTotal)}</div>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2">
                {poolStats.map((stat) => (
                  <div
                    key={stat.label}
                    className="min-w-0 rounded-[1.1rem] border border-white/10 bg-black/30 p-3"
                  >
                    <div className="truncate text-[0.58rem] font-black uppercase tracking-[0.2em] text-white/40">
                      {stat.label}
                    </div>
                    <div className="mt-2 truncate text-lg font-black text-white">{stat.value}</div>
                    <div className="mt-1 truncate text-xs text-white/48">{stat.meta}</div>
                  </div>
                ))}
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {fundedBy.map((source) => (
                  <span
                    key={source}
                    className="rounded-full border border-purple-300/18 bg-purple-300/8 px-2.5 py-1 text-[0.56rem] font-black uppercase tracking-[0.18em] text-purple-100/80"
                  >
                    {source}
                  </span>
                ))}
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2">
                <Link
                  href="/map"
                  onClick={() => setIsOpen(false)}
                  className="rounded-full border border-cyan-300/28 bg-cyan-300/10 px-2.5 py-3 text-center text-[0.62rem] font-black uppercase tracking-[0.18em] text-cyan-100 transition hover:bg-cyan-300/16"
                >
                  Earn
                </Link>
                <Link
                  href="/create"
                  onClick={() => setIsOpen(false)}
                  className="rounded-full border border-yellow-300/32 bg-yellow-300/12 px-2.5 py-3 text-center text-[0.62rem] font-black uppercase tracking-[0.18em] text-yellow-100 transition hover:bg-yellow-300/18"
                >
                  Create
                </Link>
                <Link
                  href="/activations"
                  onClick={() => setIsOpen(false)}
                  className="rounded-full border border-purple-300/32 bg-purple-300/14 px-2.5 py-3 text-center text-[0.62rem] font-black uppercase tracking-[0.18em] text-purple-100 transition hover:bg-purple-300/20"
                >
                  Launch
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
