import Link from 'next/link';
import { ArrowRight, Sparkles, Store } from 'lucide-react';
import { controlSoftCard } from '@/components/control/tokens';

/**
 * Homepage role choice. Two tactile entry points separate people looking for a
 * mission from people funding one without making either group learn BaseDare's
 * internal product vocabulary first.
 */
export default function RoleChoiceCards() {
  return (
    <div className="w-full">
      <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#f5c518]/70">
        Start on BaseDare
      </p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {/* Paid work — show the mission before profile setup. */}
        <Link
          href="/earn?source=home-role"
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
              Paid missions
            </p>
            <h3 className="mt-1 text-xl font-black italic tracking-[-0.02em] text-white sm:text-2xl">
              I want paid work
            </h3>
            <p className="mt-2 text-sm font-bold leading-6 text-white/64">
              Pick a mission. Do the work. Submit it. Get paid when approved.
            </p>
          </div>
          <span className="relative mt-auto inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.16em] text-[#f5c518]">
            See paid missions
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </span>
        </Link>

        {/* Buyer — venues, brands, communities, and individual funders. */}
        <Link
          href="/create?sparkType=paid&source=home-mission-buyer"
          prefetch={false}
          className={`group ${controlSoftCard} flex flex-col gap-3 p-5 text-left transition hover:border-cyan-200/30 sm:p-6`}
        >
          <span className="relative inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-200/24 bg-cyan-300/[0.08] text-cyan-100">
            <Store className="h-5 w-5" />
          </span>
          <div className="relative">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-100/64">
              Buyer or venue
            </p>
            <h3 className="mt-1 text-xl font-black italic tracking-[-0.02em] text-white sm:text-2xl">
              I want to fund a mission
            </h3>
            <p className="mt-2 text-sm font-bold leading-6 text-white/64">
              Ask for a place check, local content, or another clear real-world task.
            </p>
          </div>
          <span className="relative mt-auto inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.16em] text-cyan-100/90">
            Create a paid Dare
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </span>
        </Link>
      </div>
    </div>
  );
}
