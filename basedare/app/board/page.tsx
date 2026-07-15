import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Compass, Flag, MapPin, MoonStar, Radio, Sparkles, Users } from 'lucide-react';
import { getBoardSections, type Flyer, type FlyerStamp, type FlyerTone } from '@/lib/board';
import { FieldStationEntryBeacon, FieldStationTrackedLink } from '@/components/field-stations/FieldStationTrackedLink';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'The Board | BaseDare',
  description: 'What is verified-happening near you — live dares, venue nights, and proof. If BaseDare can drive attendance or produce a receipt, it is on The Board.',
  openGraph: {
    title: 'The Board | BaseDare',
    description: 'Live dares, venue nights, and verified presence — the local board for what is actually happening.',
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

// Dark-neon "tinted paper" — a colored wash fading into near-black so the note
// stays dark + premium but carries its section's color. Capped saturation.
const NOTE_TONE: Record<FlyerTone, { wash: string; edge: string; pin: string }> = {
  gold: { wash: 'linear-gradient(157deg, rgba(245,197,24,0.17) 0%, rgba(245,197,24,0.05) 40%, rgba(12,11,8,0.96) 100%)', edge: 'border-[#f5c518]/28', pin: '#f5c518' },
  cyan: { wash: 'linear-gradient(157deg, rgba(34,211,238,0.16) 0%, rgba(34,211,238,0.05) 40%, rgba(7,12,18,0.96) 100%)', edge: 'border-cyan-300/26', pin: '#67e8f9' },
  emerald: { wash: 'linear-gradient(157deg, rgba(52,211,153,0.16) 0%, rgba(52,211,153,0.05) 40%, rgba(6,15,12,0.96) 100%)', edge: 'border-emerald-300/26', pin: '#6ee7b7' },
  violet: { wash: 'linear-gradient(157deg, rgba(168,85,247,0.17) 0%, rgba(168,85,247,0.05) 40%, rgba(11,9,20,0.96) 100%)', edge: 'border-violet-300/28', pin: '#c4b5fd' },
};

const PAPER_GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='90' height='90'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

const TILTS = [-1.5, 1.1, -0.7, 1.4, -1.2, 0.8];

function FlyerCard({ flyer, index, tone, fieldStation = false }: { flyer: Flyer; index: number; tone: FlyerTone; fieldStation?: boolean }) {
  const note = NOTE_TONE[tone];
  const tilt = TILTS[index % TILTS.length];
  const usePin = index % 3 !== 0;

  return (
    <div className="group relative pt-2" style={{ transform: `rotate(${tilt}deg)` }}>
      {/* pushpin (most) / tape (some) — a real board mixes both */}
      {usePin ? (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-0 z-20 h-3.5 w-3.5 -translate-x-1/2 rounded-full"
          style={{ background: `radial-gradient(circle at 35% 30%, #ffffff, ${note.pin} 48%, rgba(0,0,0,0.55) 100%)`, boxShadow: '0 3px 6px rgba(0,0,0,0.55)' }}
        />
      ) : (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-0 z-20 h-4 w-16 -translate-x-1/2 -rotate-3 rounded-[2px] bg-white/14 shadow-[inset_0_1px_0_rgba(255,255,255,0.3)] backdrop-blur-sm"
        />
      )}

      <FieldStationTrackedLink
        href={flyer.href}
        enabled={fieldStation}
        eventType="STATION_TARGET_OPENED"
        targetType="PAGE"
        targetId={`flyer:${flyer.id}`}
        className={`relative flex flex-col overflow-hidden rounded-[18px] border ${note.edge} p-4 shadow-[0_24px_46px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.1)] transition duration-200 hover:-translate-y-1 hover:shadow-[0_34px_64px_rgba(0,0,0,0.6)] sm:p-5`}
        style={{ background: note.wash }}
      >
        {/* paper grain */}
        <span aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-[0.05] mix-blend-soft-light" style={{ backgroundImage: PAPER_GRAIN }} />
        {/* lifted corner curl */}
        <span aria-hidden="true" className="pointer-events-none absolute bottom-0 right-0 h-6 w-6" style={{ background: 'linear-gradient(135deg, transparent 46%, rgba(255,255,255,0.10) 50%, rgba(0,0,0,0.42) 56%)' }} />

        <div className="relative flex items-center justify-between">
          <span className="text-[9px] font-black uppercase tracking-[0.24em] text-white/45">
            {flyer.kind === 'MISSION' ? 'Dare' : flyer.kind === 'RECEIPT' ? 'Receipt' : 'Venue'}
          </span>
          {flyer.metricValue ? (
            <span className="text-right">
              <span className="block text-lg font-black leading-none text-white">{flyer.metricValue}</span>
              <span className="block text-[8px] font-black uppercase tracking-[0.14em] text-white/45">{flyer.metricLabel}</span>
            </span>
          ) : null}
        </div>

        <h3 className="relative mt-3 text-lg font-black leading-tight tracking-tight text-white">{flyer.title}</h3>

        {flyer.venueName ? (
          <span className="relative mt-1.5 inline-flex items-center gap-1.5 text-[11px] font-bold text-white/55">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">
              {flyer.venueName}
              {flyer.city ? ` · ${flyer.city}` : ''}
            </span>
          </span>
        ) : null}

        <p className="relative mt-2 text-xs font-semibold leading-5 text-white/60">{flyer.detail}</p>

        <div className="relative mt-3 flex flex-wrap gap-1.5">
          {flyer.stamps.map((stamp) => (
            <span
              key={stamp}
              className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.14em] ${STAMP_CLASS[stamp]}`}
            >
              {STAMP_LABEL[stamp]}
            </span>
          ))}
        </div>

        <span className="relative mt-3 inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-[0.16em] text-white/50 transition group-hover:text-white/85">
          {flyer.kind === 'RECEIPT' ? 'See receipt' : 'Open'}
          <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
        </span>
      </FieldStationTrackedLink>
    </div>
  );
}

function BoardSection({ title, subtitle, flyers, tone, fieldStation = false }: { title: string; subtitle: string; flyers: Flyer[]; tone: FlyerTone; fieldStation?: boolean }) {
  if (flyers.length === 0) return null;
  return (
    <section className="mt-10">
      <div className="mb-5 flex items-baseline gap-3">
        <h2 className="text-xl font-black uppercase italic tracking-tight text-white">{title}</h2>
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/35">{subtitle}</span>
      </div>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {flyers.map((flyer, index) => (
          <FlyerCard key={flyer.id} flyer={flyer} index={index} tone={tone} fieldStation={fieldStation} />
        ))}
      </div>
    </section>
  );
}

type BoardSearchParams = Promise<Record<string, string | string[] | undefined>>;

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function BoardPage({ searchParams }: { searchParams: BoardSearchParams }) {
  const params = await searchParams;
  const fieldStation = firstParam(params.field) === '1';
  const stationLabel = firstParam(params.stationLabel);
  const attention = (firstParam(params.attention) ?? 'ask').toLowerCase();
  const answerFirst = fieldStation && (attention === 'ask' || attention === 'nearby');
  const sections = await getBoardSections();
  const total =
    sections.tonight.length + sections.rewards.length + sections.receipts.length + sections.placesLitUp.length;

  return (
    <div className="relative min-h-screen">
      {/* faint scrim only behind the hero so text stays legible over the live bg */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[46vh] bg-[radial-gradient(circle_at_50%_0%,rgba(5,5,12,0.55),transparent_70%)]" />

      <section className="relative z-10 mx-auto max-w-6xl px-4 pb-24 pt-20 sm:px-6 md:pt-24">
        {fieldStation ? <FieldStationEntryBeacon attentionMode={attention} /> : null}
        <div className="mb-6">
          <Link
            href="/"
            className="inline-flex min-h-10 items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-white/68 transition hover:border-[#f5c518]/30 hover:text-[#f8dd72]"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back
          </Link>
        </div>
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#f5c518]/24 bg-[#f5c518]/[0.09] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.24em] text-[#f8dd72]">
            <Radio className="h-3.5 w-3.5" />
            {stationLabel ? `${stationLabel} · Field Station` : 'The Board'}
          </div>
          <h1 className="mt-4 text-4xl font-black uppercase italic tracking-tight text-white md:text-6xl">
            What&apos;s on<br />
            <span className="text-[#f5c518]">the Board</span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-sm font-bold leading-6 text-white/55">
            Live dares, venue nights, and verified presence. If BaseDare can drive attendance or produce a receipt, it&apos;s on The Board.
          </p>
        </div>

        {answerFirst ? (
          <div className="mx-auto mt-10 max-w-2xl rounded-[28px] border border-[#f5c518]/18 bg-[radial-gradient(circle_at_100%_0%,rgba(34,211,238,.11),transparent_35%),linear-gradient(180deg,rgba(18,20,31,.96),rgba(6,7,14,.98))] p-5 shadow-[0_28px_70px_rgba(0,0,0,.5)] sm:p-7">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#f8dd72]/70">PeeBear asks first</p>
            <h2 className="mt-2 text-2xl font-black text-white">What would make your next two hours better?</h2>
            <p className="mt-2 text-sm leading-6 text-white/48">Choose one and the map will reveal a small useful set around this station.</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {[
                ['social', 'Meet people', 'Public, bounded activities', Users],
                ['mystery', 'Find something interesting', 'Places with a story', Sparkles],
                ['reward', 'Do something now', 'Live, nearby and low-friction', Flag],
                ['tonight', 'See what’s on tonight', 'Usual rhythm + confirmed events', MoonStar],
              ].map(([mode, label, detail, Icon]) => {
                const next = new URLSearchParams();
                for (const [key, raw] of Object.entries(params)) {
                  const value = firstParam(raw);
                  if (value) next.set(key, value);
                }
                next.set('attention', String(mode));
                return (
                  <FieldStationTrackedLink
                    key={String(mode)}
                    href={`/map?${next.toString()}`}
                    eventType="STATION_ATTENTION_SELECTED"
                    attentionMode={String(mode)}
                    targetType="PAGE"
                    targetId="map"
                    className="group flex min-h-20 items-center gap-3 rounded-2xl border border-white/9 bg-white/[0.035] px-4 transition hover:-translate-y-0.5 hover:border-cyan-100/24 hover:bg-cyan-300/[0.05]"
                  >
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/10 bg-black/30"><Icon className="h-4 w-4 text-cyan-100" /></span>
                    <span className="min-w-0 flex-1"><span className="block text-sm font-black text-white">{String(label)}</span><span className="mt-1 block text-[11px] text-white/42">{String(detail)}</span></span>
                    <ArrowRight className="h-4 w-4 text-white/25 transition group-hover:text-cyan-100" />
                  </FieldStationTrackedLink>
                );
              })}
              <FieldStationTrackedLink href={`/map?${new URLSearchParams(Object.entries(params).flatMap(([key, raw]) => { const value = firstParam(raw); return value ? [[key, value]] : []; })).toString()}`} eventType="STATION_ATTENTION_SELECTED" attentionMode="NEARBY" targetType="PAGE" targetId="map" className="group flex min-h-16 items-center gap-3 rounded-2xl border border-emerald-100/13 bg-emerald-300/[0.035] px-4 sm:col-span-2">
                <Compass className="h-4 w-4 text-emerald-100" /><span className="flex-1 text-sm font-black text-white">Free roam</span><span className="text-[10px] text-white/38">No suggestions</span><ArrowRight className="h-4 w-4 text-white/25" />
              </FieldStationTrackedLink>
            </div>
          </div>
        ) : total === 0 ? (
          <div className="mx-auto mt-12 max-w-md rounded-[24px] border border-white/10 bg-black/40 p-8 text-center backdrop-blur-md">
            <p className="text-sm font-bold leading-6 text-white/60">
              The board&apos;s quiet right now. Be the first to light up a venue —{' '}
              <Link href="/map" className="text-[#f8dd72] underline-offset-2 hover:underline">open the map</Link>, check in, and drop a proof.
            </p>
          </div>
        ) : (
          <>
            <BoardSection title="Tonight" subtitle="Live now" flyers={sections.tonight} tone="cyan" fieldStation={fieldStation} />
            <BoardSection title="Rewards" subtitle="Open paid dares" flyers={sections.rewards} tone="gold" fieldStation={fieldStation} />
            <BoardSection title="Receipts" subtitle="Verified proof" flyers={sections.receipts} tone="emerald" fieldStation={fieldStation} />
            <BoardSection title="Places lit up" subtitle="Recent verified activity" flyers={sections.placesLitUp} tone="violet" fieldStation={fieldStation} />
          </>
        )}
      </section>
    </div>
  );
}
