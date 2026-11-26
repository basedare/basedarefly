import Link from 'next/link';
import { ArrowRight, Plus, Sparkles } from 'lucide-react';
import { controlSoftCard } from '@/components/control/tokens';
import DiscoveryLink from '@/components/DiscoveryLink';

/**
 * Two ways to play the same dare loop. Anyone can do a dare or post one;
 * business enquiries remain an optional extension.
 */
export default function RoleChoiceCards() {
  return (
    <div className="w-full">
      <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#f5c518]/70">
        Your move
      </p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {/* Show paid dares before profile setup. */}
        <DiscoveryLink
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
              Play & earn
            </p>
            <h3 className="mt-1 text-xl font-black italic tracking-[-0.02em] text-white sm:text-2xl">
              Do a dare
            </h3>
            <p className="mt-2 text-sm font-bold leading-6 text-white/64">
              Pick a challenge. Film it. Get paid after approval.
            </p>
          </div>
          <span className="relative mt-auto inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.16em] text-[#f5c518]">
            See paid dares
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </span>
        </DiscoveryLink>

        {/* Anyone can post a dare; business enquiries stay accessible. */}
        <article
          aria-labelledby="home-business-brief"
          className={`${controlSoftCard} flex flex-col gap-3 p-5 text-left sm:p-6`}
        >
          <span className="relative inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-200/24 bg-cyan-300/[0.08] text-cyan-100">
            <Plus className="h-5 w-5" />
          </span>
          <div className="relative">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-100/64">
              Set a challenge
            </p>
            <h3 id="home-business-brief" className="mt-1 text-xl font-black italic tracking-[-0.02em] text-white sm:text-2xl">
              Post a dare
            </h3>
            <p className="mt-2 text-sm font-bold leading-6 text-white/64">
              Set the challenge. Fund the reward. See what happens.
            </p>
          </div>
          <div className="relative mt-auto grid gap-2">
            <Link href="/create?sparkType=paid&source=home-mission-buyer" prefetch={false} className="bd-action bd-action--gold w-full !text-sm">Post a dare <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
          </div>
          <Link href="/brands/portal?from=home" prefetch={false} className="relative inline-flex min-h-11 items-center text-sm font-bold text-cyan-100 underline decoration-cyan-100/30 underline-offset-4">Need a business dare? Get help →</Link>
          <p className="relative text-xs leading-5 text-white/60">No account or payment needed to enquire. Work starts only after agreement.</p>
        </article>
      </div>
    </div>
  );
}
