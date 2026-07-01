import Link from 'next/link';
import { ArrowRight, Compass, MapPin } from 'lucide-react';

// Branded 404 — dark BaseDare treatment so a stale/mistyped link still lands somewhere real.
export default function NotFound() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#030305] px-6 py-24 text-center text-white">
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(circle_at_1px_1px,rgba(185,127,255,0.1)_1px,transparent_0)] [background-size:112px_112px]" />
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(circle_at_14%_8%,rgba(255,213,74,0.12),transparent_34%),radial-gradient(circle_at_82%_8%,rgba(154,82,255,0.16),transparent_30%),linear-gradient(180deg,#05040a_0%,#07020f_48%,#000_100%)]" />

      <section className="relative z-10 flex flex-col items-center gap-5">
        <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-yellow-300/25 bg-yellow-300/[0.1] text-[#f5c518]">
          <Compass className="h-7 w-7" />
        </span>
        <p className="text-[11px] font-black uppercase tracking-[0.28em] text-[#f5c518]/70">404 · off the grid</p>
        <h1 className="text-4xl font-black italic uppercase tracking-[-0.04em] text-white sm:text-5xl">
          This page isn&apos;t on the map
        </h1>
        <p className="max-w-md text-sm font-bold leading-6 text-white/56">
          The link may be old or mistyped. Head back and find your scene.
        </p>
        <div className="mt-2 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/"
            className="inline-flex min-h-12 items-center gap-2 rounded-full border border-yellow-300/30 bg-yellow-300 px-7 text-sm font-black uppercase tracking-[0.16em] text-black transition hover:bg-yellow-200"
          >
            Back home
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/map"
            className="inline-flex min-h-12 items-center gap-2 rounded-full border border-white/12 bg-white/[0.05] px-6 text-sm font-black uppercase tracking-[0.14em] text-white/72 transition hover:bg-white/[0.09] hover:text-white"
          >
            <MapPin className="h-4 w-4" />
            Explore the map
          </Link>
        </div>
      </section>
    </main>
  );
}
