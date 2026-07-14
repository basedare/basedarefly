import { MapPin, Radio, ShieldCheck } from 'lucide-react';

import VenuePageShell from '../VenuePageShell';

const skeletonRows = ['Place signal', 'Live proof', 'Venue memory'];

export default function VenueLoading() {
  return (
    <VenuePageShell>
      <main className="mx-auto min-h-screen max-w-6xl px-4 pb-20 pt-28 sm:px-6 lg:px-8 lg:pt-36">
        <section
          className="relative overflow-hidden rounded-[32px] border border-white/[0.09] bg-[linear-gradient(160deg,rgba(245,197,24,0.09),rgba(11,10,18,0.94)_42%,rgba(7,7,12,0.98))] p-6 shadow-[0_28px_90px_rgba(0,0,0,0.42),inset_0_1px_0_rgba(255,255,255,0.1)] sm:p-9"
          aria-live="polite"
          aria-busy="true"
        >
          <div className="pointer-events-none absolute -right-24 -top-28 h-72 w-72 rounded-full bg-[#f5c518]/10 blur-3xl" />
          <div className="relative">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#f5c518]/20 bg-[#f5c518]/[0.08] px-3 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-[#f8dd72]">
              <Radio className="h-3.5 w-3.5 animate-pulse" />
              Reading venue signal
            </div>

            <div className="mt-6 flex items-start gap-4">
              <div className="grid h-14 w-14 shrink-0 place-items-center rounded-[20px] border border-cyan-300/15 bg-cyan-400/[0.07] text-cyan-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                <MapPin className="h-6 w-6" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="h-8 w-[min(22rem,82%)] animate-pulse rounded-xl bg-white/[0.09]" />
                <div className="mt-3 h-4 w-[min(32rem,94%)] animate-pulse rounded-lg bg-white/[0.05]" />
                <div className="mt-2 h-4 w-[min(24rem,72%)] animate-pulse rounded-lg bg-white/[0.04]" />
              </div>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {skeletonRows.map((label) => (
                <div
                  key={label}
                  className="rounded-[22px] border border-white/[0.08] bg-black/25 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
                >
                  <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/35">{label}</p>
                  <div className="mt-3 h-5 w-20 animate-pulse rounded-lg bg-white/[0.08]" />
                </div>
              ))}
            </div>

            <p className="mt-7 flex items-center gap-2 text-xs leading-5 text-white/42">
              <ShieldCheck className="h-4 w-4 text-cyan-200/70" />
              Loading current proof, contacts and place memory.
            </p>
          </div>
        </section>
      </main>
    </VenuePageShell>
  );
}
