import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, MapPin, Radio } from 'lucide-react';
import { getBoardSections, type Flyer, type FlyerStamp, type FlyerTone } from '@/lib/board';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'The Board | BaseDare',
  description: 'What is verified-happening near you — live missions, venue nights, and proof. If BaseDare can drive attendance or produce a receipt, it is on The Board.',
  openGraph: {
    title: 'The Board | BaseDare',
    description: 'Live missions, venue nights, and verified presence — the local board for what is actually happening.',
    url: 'https://www.basedare.xyz/board',
    siteName: 'BaseDare',
    type: 'website',
  },
};

const STAMP_LABEL: Record<FlyerStamp, string> = {
  LIVE_TONIGHT: 'Live tonight',
  CHECK_IN_OPEN: 'Check-in open',
  VERIFIED: 'Verified',
  REWARD: 'Reward',
  HOSTED: 'Hosted',
};

const STAMP_CLASS: Record<FlyerStamp, string> = {
  LIVE_TONIGHT: 'border-rose-300/45 bg-rose-500/[0.16] text-rose-100',
  CHECK_IN_OPEN: 'border-cyan-300/35 bg-cyan-500/[0.12] text-cyan-100',
  VERIFIED: 'border-emerald-300/45 bg-emerald-500/[0.16] text-emerald-100',
  REWARD: 'border-[#f5c518]/45 bg-[#f5c518]/[0.16] text-[#f8dd72]',
  HOSTED: 'border-violet-300/40 bg-violet-500/[0.16] text-violet-100',
};

const TONE_EDGE: Record<FlyerTone, string> = {
  gold: 'border-[#f5c518]/30',
  cyan: 'border-cyan-300/28',
  emerald: 'border-emerald-300/28',
  violet: 'border-violet-300/28',
};

function FlyerCard({ flyer, index }: { flyer: Flyer; index: number }) {
  // Subtle pinned-flyer tilt — kept tiny so the board stays scannable.
  const tilt = [-1.4, 1, -0.6, 1.5, -1][index % 5];
  return (
    <Link
      href={flyer.href}
      style={{ transform: `rotate(${tilt}deg)` }}
      className={`group relative flex flex-col overflow-hidden rounded-[20px] border ${TONE_EDGE[flyer.tone]} bg-[linear-gradient(180deg,rgba(255,255,255,0.07)_0%,rgba(255,255,255,0.02)_14%,rgba(11,11,18,0.94)_100%)] p-4 shadow-[0_22px_50px_rgba(0,0,0,0.42),inset_0_1px_0_rgba(255,255,255,0.1)] transition duration-200 hover:z-10 hover:-translate-y-1 hover:rotate-0 hover:shadow-[0_30px_70px_rgba(0,0,0,0.5)] sm:p-5`}
    >
      {/* tape strip */}
      <span className="pointer-events-none absolute -top-2 left-1/2 h-4 w-20 -translate-x-1/2 -rotate-2 rounded-[3px] bg-white/12 shadow-[inset_0_1px_0_rgba(255,255,255,0.25)] backdrop-blur-sm" />

      <div className="flex items-center justify-between">
        <span className="text-[9px] font-black uppercase tracking-[0.24em] text-white/40">
          {flyer.kind === 'MISSION' ? 'Mission' : flyer.kind === 'RECEIPT' ? 'Receipt' : 'Venue'}
        </span>
        {flyer.metricValue ? (
          <span className="text-right">
            <span className="block text-lg font-black leading-none text-white">{flyer.metricValue}</span>
            <span className="block text-[8px] font-black uppercase tracking-[0.14em] text-white/40">{flyer.metricLabel}</span>
          </span>
        ) : null}
      </div>

      <h3 className="mt-3 text-lg font-black leading-tight tracking-tight text-white">{flyer.title}</h3>

      {flyer.venueName ? (
        <span className="mt-1.5 inline-flex items-center gap-1.5 text-[11px] font-bold text-white/50">
          <MapPin className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">
            {flyer.venueName}
            {flyer.city ? ` · ${flyer.city}` : ''}
          </span>
        </span>
      ) : null}

      <p className="mt-2 text-xs font-semibold leading-5 text-white/55">{flyer.detail}</p>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {flyer.stamps.map((stamp) => (
          <span
            key={stamp}
            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.14em] ${STAMP_CLASS[stamp]}`}
          >
            {STAMP_LABEL[stamp]}
          </span>
        ))}
      </div>

      <span className="mt-3 inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-[0.16em] text-white/45 transition group-hover:text-white/80">
        {flyer.kind === 'RECEIPT' ? 'See receipt' : 'Open'}
        <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
      </span>
    </Link>
  );
}

function BoardSection({ title, subtitle, flyers }: { title: string; subtitle: string; flyers: Flyer[] }) {
  if (flyers.length === 0) return null;
  return (
    <section className="mt-10">
      <div className="mb-4 flex items-baseline gap-3">
        <h2 className="text-xl font-black uppercase italic tracking-tight text-white">{title}</h2>
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/35">{subtitle}</span>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {flyers.map((flyer, index) => (
          <FlyerCard key={flyer.id} flyer={flyer} index={index} />
        ))}
      </div>
    </section>
  );
}

export default async function BoardPage() {
  const sections = await getBoardSections();
  const total =
    sections.tonight.length + sections.rewards.length + sections.receipts.length + sections.placesLitUp.length;

  return (
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_18%_0%,rgba(168,85,247,0.12),transparent_36%),radial-gradient(circle_at_88%_8%,rgba(34,211,238,0.08),transparent_34%),linear-gradient(180deg,#0a0913_0%,#070710_100%)]">
      <section className="relative z-10 mx-auto max-w-6xl px-4 pb-24 pt-20 sm:px-6 md:pt-24">
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#f5c518]/24 bg-[#f5c518]/[0.09] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.24em] text-[#f8dd72]">
            <Radio className="h-3.5 w-3.5" />
            The Board
          </div>
          <h1 className="mt-4 text-4xl font-black uppercase italic tracking-tight text-white md:text-6xl">
            What&apos;s happening<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-b from-[#ffe27a] to-[#c39106]">tonight</span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-sm font-bold leading-6 text-white/55">
            Live missions, venue nights, and verified presence. If BaseDare can drive attendance or produce a receipt, it&apos;s on The Board.
          </p>
        </div>

        {total === 0 ? (
          <div className="mx-auto mt-12 max-w-md rounded-[24px] border border-white/10 bg-white/[0.03] p-8 text-center">
            <p className="text-sm font-bold leading-6 text-white/60">
              The board&apos;s quiet right now. Be the first to light up a venue —{' '}
              <Link href="/map" className="text-[#f8dd72] underline-offset-2 hover:underline">open the map</Link>, check in, and drop a proof.
            </p>
          </div>
        ) : (
          <>
            <BoardSection title="Tonight" subtitle="Live now" flyers={sections.tonight} />
            <BoardSection title="Rewards" subtitle="Open paid missions" flyers={sections.rewards} />
            <BoardSection title="Receipts" subtitle="Verified proof" flyers={sections.receipts} />
            <BoardSection title="Places lit up" subtitle="Recent verified activity" flyers={sections.placesLitUp} />
          </>
        )}
      </section>
    </div>
  );
}
