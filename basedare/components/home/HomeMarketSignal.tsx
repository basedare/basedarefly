import Link from 'next/link';
import { MapPin, Zap } from 'lucide-react';

type HomeMarketSignalProps = {
  variant?: 'standalone' | 'embedded';
};

export default function HomeMarketSignal({ variant = 'standalone' }: HomeMarketSignalProps) {
  const isEmbedded = variant === 'embedded';

  return (
    <section
      id="live-market"
      className={
        isEmbedded
          ? 'w-full scroll-mt-32 pt-5'
          : 'w-full scroll-mt-32 px-4 pb-12 md:px-6 md:pb-16'
      }
    >
      <div
        className={
          isEmbedded
            ? 'relative w-full overflow-hidden rounded-[1.6rem] border border-white/10 bg-[linear-gradient(150deg,rgba(15,30,38,0.5),rgba(25,18,15,0.38)_58%,rgba(7,8,16,0.94))] px-5 py-5 shadow-[12px_18px_42px_rgba(0,0,0,0.32),inset_0_1px_0_rgba(255,255,255,0.08),inset_0_-18px_28px_rgba(0,0,0,0.22)] backdrop-blur-xl md:px-6 md:py-6'
            : 'relative mx-auto w-full max-w-[1680px] overflow-hidden rounded-[1.75rem] border border-white/10 bg-[linear-gradient(150deg,rgba(20,31,43,0.48),rgba(24,17,14,0.38)_58%,rgba(7,8,16,0.94))] px-5 py-6 shadow-[14px_18px_46px_rgba(0,0,0,0.34),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl md:px-7 md:py-7'
        }
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_0%,rgba(34,211,238,0.11),transparent_38%),radial-gradient(circle_at_92%_20%,rgba(245,197,24,0.1),transparent_34%)]" />
        <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/22 to-transparent" />

        <div className="relative grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#f5c518]/20 bg-[#f5c518]/[0.08] px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.2em] text-[#f9e27a] shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]">
              <Zap className="h-3.5 w-3.5" aria-hidden="true" />
              Paid missions
            </div>
            <h3 className="mt-3 text-xl font-black leading-tight text-white md:text-2xl">
              Pick a mission. Make it real. Get paid.
            </h3>
            <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-white/52">
              Check a place, capture a moment, or create something for a venue or brand. Once your work is approved, you get paid.
            </p>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 lg:w-[25rem]">
            <Link
              href="/earn?source=home-market-signal"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-[#f5c518]/30 bg-[linear-gradient(180deg,rgba(245,197,24,0.2),rgba(245,197,24,0.08))] px-4 py-3 text-center text-[10px] font-black uppercase tracking-[0.11em] text-[#f9e27a] shadow-[0_14px_24px_rgba(245,197,24,0.08),inset_0_1px_0_rgba(255,255,255,0.12),inset_0_-10px_16px_rgba(0,0,0,0.2)] transition hover:border-[#f5c518]/48 active:scale-[0.985]"
            >
              <Zap className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              Find paid missions
            </Link>
            <Link
              href="/map?source=home-market-signal"
              prefetch={false}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(12,14,24,0.72))] px-4 py-3 text-center text-[10px] font-black uppercase tracking-[0.11em] text-white/74 shadow-[0_14px_26px_rgba(0,0,0,0.24),inset_0_1px_0_rgba(255,255,255,0.1),inset_0_-10px_16px_rgba(0,0,0,0.18)] transition hover:border-cyan-300/28 hover:text-cyan-100 active:scale-[0.985]"
            >
              <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              See verified places
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
