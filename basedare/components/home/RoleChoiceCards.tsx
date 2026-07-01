import Link from 'next/link';
import { ArrowRight, Sparkles, Store } from 'lucide-react';
import { controlSoftCard } from '@/components/control/tokens';

/**
 * Homepage role choice — the "who are you" fork (PartiStaff pattern, BaseDare
 * skin). Two tactile cards: creators (the spark — prominent, gold) and venues
 * (the demand — cooler glass). Mobile stacks vertically with creator on top;
 * desktop sits side-by-side. The creator path is deliberately dominant: a creator
 * landing on basedare.xyz should know within seconds they can join.
 */
export default function RoleChoiceCards() {
  return (
    <div className="w-full">
      <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#f5c518]/70">
        Start on BaseDare
      </p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {/* Creator — the spark. Prominent (gold). */}
        <Link
          href="/creators/signup"
          prefetch={false}
          className={`group ${controlSoftCard} flex flex-col gap-3 border-yellow-300/25 p-5 text-left transition hover:border-yellow-300/45 sm:p-6`}
        >
          <span
            className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-[radial-gradient(circle,rgba(245,197,24,0.22),transparent_70%)] blur-xl"
            aria-hidden="true"
          />
          <span className="relative inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-yellow-300/30 bg-yellow-300/[0.12] text-[#f5c518]">
            <Sparkles className="h-5 w-5" />
          </span>
          <div className="relative">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-yellow-200/70">
              Founding creator
            </p>
            <h3 className="mt-1 text-xl font-black italic tracking-[-0.02em] text-white sm:text-2xl">
              I&apos;m joining as a creator
            </h3>
            <p className="mt-2 text-sm font-bold leading-6 text-white/64">
              Show up. Post it. Bring people. Get paid.
            </p>
          </div>
          <span className="relative mt-auto inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.16em] text-[#f5c518]">
            Become a founding creator
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </span>
        </Link>

        {/* Venue — the demand. Cooler glass. */}
        <Link
          href="/first-spark"
          prefetch={false}
          className={`group ${controlSoftCard} flex flex-col gap-3 p-5 text-left transition hover:border-cyan-200/30 sm:p-6`}
        >
          <span className="relative inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-200/24 bg-cyan-300/[0.08] text-cyan-100">
            <Store className="h-5 w-5" />
          </span>
          <div className="relative">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-100/64">
              Venue
            </p>
            <h3 className="mt-1 text-xl font-black italic tracking-[-0.02em] text-white sm:text-2xl">
              I run a venue
            </h3>
            <p className="mt-2 text-sm font-bold leading-6 text-white/64">
              Bring creators, verified arrivals, and proof to your venue.
            </p>
          </div>
          <span className="relative mt-auto inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.16em] text-cyan-100/90">
            Put your scene on the map
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </span>
        </Link>
      </div>
    </div>
  );
}
