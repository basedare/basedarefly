import Link from 'next/link';
import { ArrowRight, Sparkles, Store } from 'lucide-react';
import { controlSoftCard } from '@/components/control/tokens';
import { businessRequestHref } from '@/lib/business-request';

/**
 * Homepage role choice. Two tactile entry points separate people looking for a
 * mission from people funding one without making either group learn BaseDare's
 * internal product vocabulary first.
 */
export default function RoleChoiceCards() {
  return (
    <div className="w-full">
      <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#f5c518]/70">
        Paid dares
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
              Create content, document a place, or complete another paid task. See the brief and reward before you request it.
            </p>
          </div>
          <span className="relative mt-auto inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.16em] text-[#f5c518]">
            See paid missions
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </span>
        </Link>

        {/* Buyers can describe their need before an account or funding action. */}
        <article
          aria-labelledby="home-business-brief"
          className={`${controlSoftCard} flex flex-col gap-3 p-5 text-left sm:p-6`}
        >
          <span className="relative inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-200/24 bg-cyan-300/[0.08] text-cyan-100">
            <Store className="h-5 w-5" />
          </span>
          <div className="relative">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-100/64">
              For businesses & venues
            </p>
            <h3 id="home-business-brief" className="mt-1 text-xl font-black italic tracking-[-0.02em] text-white sm:text-2xl">
              I want to commission work
            </h3>
            <p className="mt-2 text-sm font-bold leading-6 text-white/64">
              Request a photo or video, or plan a funded local activity. Agree on the deliverable, permissions and costs before work begins.
            </p>
          </div>
          <div className="relative mt-auto grid gap-2">
            <Link href={businessRequestHref('content-brief', 'home-business')} prefetch={false} className="bd-action bd-action--gold w-full !text-sm">Request content <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
            <Link href={businessRequestHref('activity-brief', 'home-business')} prefetch={false} className="bd-action w-full !text-sm">Plan a local activity <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
          </div>
          <p className="relative text-sm leading-6 text-white/60">No account or payment needed to enquire. A request does not start work or reserve contributors.</p>
          <Link href="/create?sparkType=paid&source=home-mission-buyer" prefetch={false} className="relative inline-flex min-h-11 items-center text-sm font-bold text-cyan-100 underline decoration-cyan-100/30 underline-offset-4">Set up a paid dare yourself →</Link>
        </article>
      </div>
    </div>
  );
}
