import Link from 'next/link';
import { ArrowRight, MapPin } from 'lucide-react';
import { MARKETS } from '@/lib/markets';

/**
 * Markets discovery — "choose your scene." Airbnb-style city cards in BaseDare's
 * dark treatment (gradient covers, no stock photos). Siargao is the one live
 * founding market; the rest are honest scouting/waitlist (no fake job counts).
 * Mobile stacks; desktop is a 2-column grid.
 */
export default function MarketsSection() {
  return (
    <section className="relative z-30 mx-auto w-full max-w-5xl px-4 py-14 sm:px-6">
      <div className="text-center">
        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#f5c518]/70">Markets</p>
        <h2 className="mt-2 text-3xl font-black italic uppercase tracking-[-0.03em] text-white sm:text-4xl">
          Choose your scene
        </h2>
        <p className="mx-auto mt-3 max-w-md text-sm font-bold leading-6 text-white/56">
          Creators earn and venues launch missions, city by city.
        </p>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {MARKETS.map((market) => {
          const creatorHref = `/creators/signup?city=${market.slug}`;
          return (
            <div
              key={market.slug}
              className={`relative overflow-hidden rounded-[26px] border ${
                market.live ? 'border-yellow-300/30' : 'border-white/10'
              } bg-[#08080e] shadow-[0_22px_46px_rgba(0,0,0,0.34)]`}
            >
              {/* Gradient cover (image-led, no stock photo) */}
              <div className={`relative h-36 overflow-hidden bg-gradient-to-br ${market.gradient}`}>
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.06)_1px,transparent_0)] [background-size:22px_22px]" />
                <MapPin className={`absolute -bottom-4 -right-3 h-28 w-28 opacity-15 ${market.accent}`} />
                <span
                  className={`absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${
                    market.live
                      ? 'border-yellow-300/40 bg-yellow-300/[0.14] text-yellow-100'
                      : 'border-white/14 bg-black/40 text-white/64'
                  }`}
                >
                  {market.live ? <span className="h-1.5 w-1.5 rounded-full bg-yellow-300" /> : null}
                  {market.status}
                </span>
                <h3 className="absolute bottom-3 left-4 right-4 text-2xl font-black italic tracking-[-0.02em] text-white">
                  {market.name}
                </h3>
              </div>

              {/* Body */}
              <div className="p-5">
                <p className="text-sm font-bold leading-6 text-white/58">{market.blurb}</p>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <Link
                    href={creatorHref}
                    prefetch={false}
                    className={`inline-flex min-h-10 items-center gap-2 rounded-full px-4 text-[11px] font-black uppercase tracking-[0.14em] transition ${
                      market.live
                        ? 'border border-yellow-300/30 bg-yellow-300 text-black hover:bg-yellow-200'
                        : 'border border-white/14 bg-white/[0.05] text-white/76 hover:bg-white/[0.09] hover:text-white'
                    }`}
                  >
                    {market.creatorCta}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                  {market.live ? (
                    <Link
                      href={`/first-spark?city=${market.slug}`}
                      prefetch={false}
                      className="inline-flex min-h-10 items-center gap-2 rounded-full border border-cyan-200/24 bg-cyan-300/[0.07] px-4 text-[11px] font-black uppercase tracking-[0.14em] text-cyan-100/88 transition hover:bg-cyan-300/[0.12] hover:text-white"
                    >
                      Run a Venue Mission
                    </Link>
                  ) : null}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-6 text-center text-[11px] font-black uppercase tracking-[0.18em] text-white/40">
        Don&apos;t see your city?{' '}
        <Link href="/creators/signup" className="text-[#f5c518]/80 underline-offset-4 hover:underline">
          Put it on the map →
        </Link>
      </p>
    </section>
  );
}
