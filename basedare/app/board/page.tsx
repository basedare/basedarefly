import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Compass, Flag, MapPin, MoonStar, Radio, Sparkles, Users } from 'lucide-react';
import { getBoardSections, type BoardSections, type Flyer, type FlyerStamp, type FlyerTone } from '@/lib/board';
import { FieldStationEntryBeacon, FieldStationTrackedLink } from '@/components/field-stations/FieldStationTrackedLink';
import {
  normalizeDensityRadiusKm,
  normalizeFieldStationAttention,
  normalizeMinimumDensity,
  type FieldStationAttentionMode,
} from '@/lib/field-station-policy';
import {
  evaluateStationInventory,
  type FieldStationInventoryResult,
} from '@/lib/field-stations/inventory';
import type { FieldStationInventoryCandidate } from '@/lib/field-stations/inventory-policy';

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

function normalizedFieldAttention(value: string | undefined): FieldStationAttentionMode {
  try {
    return normalizeFieldStationAttention(value, 'ASK');
  } catch {
    return 'ASK';
  }
}

function normalizedThreshold(value: string | undefined) {
  try {
    const parsed = value ? Number(value) : undefined;
    return normalizeMinimumDensity(parsed);
  } catch {
    return normalizeMinimumDensity(undefined);
  }
}

function normalizedRadius(value: string | undefined) {
  try {
    const parsed = value ? Number(value) : undefined;
    return normalizeDensityRadiusKm(parsed);
  } catch {
    return normalizeDensityRadiusKm(undefined);
  }
}

function copyParams(
  params: Record<string, string | string[] | undefined>,
  overrides: Record<string, string | null> = {}
) {
  const next = new URLSearchParams();
  for (const [key, raw] of Object.entries(params)) {
    const value = firstParam(raw);
    if (value) next.set(key, value);
  }
  for (const [key, value] of Object.entries(overrides)) {
    if (value === null) next.delete(key);
    else next.set(key, value);
  }
  return next;
}

const FIELD_STATION_EMPTY_SECTIONS: BoardSections = {
  tonight: [],
  rewards: [],
  receipts: [],
  placesLitUp: [],
};

const ATTENTION_COPY: Record<Exclude<FieldStationAttentionMode, 'ASK' | 'NEARBY'>, {
  eyebrow: string;
  title: string;
  detail: string;
}> = {
  SOCIAL: {
    eyebrow: 'Public and bounded',
    title: 'Three ways to meet people',
    detail: 'Real public activities near this station—not an open city chat.',
  },
  MYSTERY: {
    eyebrow: 'Reviewed local signals',
    title: 'Three things worth investigating',
    detail: 'Approximate clues with honest confidence, never fake certainty.',
  },
  REWARD: {
    eyebrow: 'Open funded missions',
    title: 'Three useful things you can do now',
    detail: 'Only claimable missions with a real reward and a review boundary.',
  },
  TONIGHT: {
    eyebrow: 'Usual rhythm + confirmed one-offs',
    title: 'Where the island moves tonight',
    detail: 'The Siargao weekly pattern first; confirmed events outrank the guide.',
  },
};

function StationInventoryCard({ item }: { item: FieldStationInventoryCandidate }) {
  return (
    <FieldStationTrackedLink
      href={item.href}
      eventType="STATION_TARGET_OPENED"
      attentionMode={item.attention}
      targetType={item.targetType}
      targetId={item.targetId}
      className="group flex min-h-36 flex-col rounded-[22px] border border-white/10 bg-[linear-gradient(145deg,rgba(255,255,255,.065),rgba(5,7,13,.92))] p-4 shadow-[0_20px_46px_rgba(0,0,0,.35)] transition hover:-translate-y-0.5 hover:border-[#f5c518]/35"
    >
      <div className="flex items-start justify-between gap-3">
        <span className="rounded-full border border-emerald-300/20 bg-emerald-300/[0.08] px-2 py-1 text-[8px] font-black uppercase tracking-[0.14em] text-emerald-100">
          {item.trustLabel}
        </span>
        <span className="text-[10px] font-bold text-white/38">{item.distanceKm < 1 ? `${Math.round(item.distanceKm * 1000)}m` : `${item.distanceKm.toFixed(1)}km`}</span>
      </div>
      <h3 className="mt-3 text-lg font-black leading-tight text-white">{item.title}</h3>
      <p className="mt-1 flex items-center gap-1.5 text-[11px] font-bold text-white/52"><MapPin className="h-3.5 w-3.5" />{item.placeLabel}</p>
      <p className="mt-2 text-xs leading-5 text-white/45">{item.freshnessLabel}</p>
      {item.disclaimer ? <p className="mt-2 text-[10px] leading-4 text-white/32">{item.disclaimer}</p> : null}
      <span className="mt-auto inline-flex items-center gap-1 pt-3 text-[10px] font-black uppercase tracking-[0.15em] text-[#f8dd72]">Open <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" /></span>
    </FieldStationTrackedLink>
  );
}

export default async function BoardPage({ searchParams }: { searchParams: BoardSearchParams }) {
  const params = await searchParams;
  const fieldStation = firstParam(params.field) === '1';
  const stationLabel = firstParam(params.stationLabel);
  const attentionMode = normalizedFieldAttention(firstParam(params.attention));
  const attention = attentionMode.toLowerCase();
  const targetedAttention = !['ASK', 'NEARBY'].includes(attentionMode);
  const latitude = Number(firstParam(params.lat));
  const longitude = Number(firstParam(params.lng));
  const minimumDensity = normalizedThreshold(firstParam(params.minimumDensity));
  const radiusKm = normalizedRadius(firstParam(params.radiusKm));
  let inventory: FieldStationInventoryResult | null = null;
  let inventoryUnavailable = false;
  if (
    fieldStation &&
    targetedAttention &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude)
  ) {
    try {
      inventory = await evaluateStationInventory({
        attention: attentionMode,
        latitude,
        longitude,
        minimumDensity,
        radiusKm,
      });
    } catch (error) {
      inventoryUnavailable = true;
      console.error('[BOARD] Field Station inventory evaluation failed:', error);
    }
  }
  const answerFirst = fieldStation && (
    !targetedAttention ||
    !inventory ||
    inventory.isLowDensity ||
    inventoryUnavailable
  );
  // Field Station scans never pay for the full Board projection before the
  // visitor asks for it. This keeps the first answer fast on constrained data.
  const sections = fieldStation ? FIELD_STATION_EMPTY_SECTIONS : await getBoardSections();
  const total =
    sections.tonight.length + sections.rewards.length + sections.receipts.length + sections.placesLitUp.length;

  return (
    <div className="relative min-h-screen">
      {/* faint scrim only behind the hero so text stays legible over the live bg */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[46vh] bg-[radial-gradient(circle_at_50%_0%,rgba(5,5,12,0.55),transparent_70%)]" />

      <section className="relative z-10 mx-auto max-w-6xl px-4 pb-24 pt-20 sm:px-6 md:pt-24">
        {fieldStation ? <FieldStationEntryBeacon attentionMode={attentionMode} /> : null}
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
          <div className="inline-flex items-center gap-2 rounded-full border border-[#f5c518]/24 bg-[#f5c518]/[0.09] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-[#f8dd72]">
            {fieldStation ? (
              <span className="relative flex h-2.5 w-2.5" aria-hidden="true">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-300 opacity-35 motion-reduce:animate-none" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full border border-cyan-100/70 bg-cyan-300" />
              </span>
            ) : <Radio className="h-3.5 w-3.5" />}
            {stationLabel ? `Node active · ${stationLabel} connected` : 'The Board'}
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
            <p className="mt-2 text-sm leading-6 text-white/48">Choose one and BaseDare will answer with no more than three useful options around this station.</p>
            {firstParam(params.fallback) === '1' || inventory?.isLowDensity || inventoryUnavailable ? (
              <div className="mt-4 rounded-2xl border border-cyan-200/12 bg-cyan-300/[0.045] px-4 py-3 text-xs leading-5 text-cyan-50/62">
                That specific layer is thin or unavailable right now, so BaseDare did not invent weak suggestions. Pick another mood or explore freely.
              </div>
            ) : null}
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {[
                ['social', 'Meet people', 'Public, bounded activities', Users],
                ['mystery', 'Find something interesting', 'Places with a story', Sparkles],
                ['reward', 'Do something now', 'Live, nearby and low-friction', Flag],
                ['tonight', 'See what’s on tonight', 'Usual rhythm + confirmed events', MoonStar],
              ].map(([mode, label, detail, Icon]) => {
                const next = copyParams(params, {
                  attention: String(mode),
                  fallback: null,
                  requestedAttention: null,
                });
                return (
                  <FieldStationTrackedLink
                    key={String(mode)}
                    href={`/board?${next.toString()}`}
                    eventType="STATION_ATTENTION_SELECTED"
                    attentionMode={String(mode)}
                    targetType="PAGE"
                    targetId={`board:${String(mode)}`}
                    className="group flex min-h-20 items-center gap-3 rounded-2xl border border-white/9 bg-white/[0.035] px-4 transition hover:-translate-y-0.5 hover:border-cyan-100/24 hover:bg-cyan-300/[0.05]"
                  >
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/10 bg-black/30"><Icon className="h-4 w-4 text-cyan-100" /></span>
                    <span className="min-w-0 flex-1"><span className="block text-sm font-black text-white">{String(label)}</span><span className="mt-1 block text-[11px] text-white/42">{String(detail)}</span></span>
                    <ArrowRight className="h-4 w-4 text-white/25 transition group-hover:text-cyan-100" />
                  </FieldStationTrackedLink>
                );
              })}
              <FieldStationTrackedLink href={`/map?${copyParams(params, { attention: 'nearby', fallback: null, requestedAttention: null }).toString()}`} eventType="STATION_ATTENTION_SELECTED" attentionMode="NEARBY" targetType="PAGE" targetId="map" className="group flex min-h-16 items-center gap-3 rounded-2xl border border-emerald-100/13 bg-emerald-300/[0.035] px-4 sm:col-span-2">
                <Compass className="h-4 w-4 text-emerald-100" /><span className="flex-1 text-sm font-black text-white">Free roam</span><span className="text-[10px] text-white/38">No suggestions</span><ArrowRight className="h-4 w-4 text-white/25" />
              </FieldStationTrackedLink>
            </div>
          </div>
        ) : fieldStation && inventory && inventory.items.length > 0 ? (
          <section className="mx-auto mt-10 max-w-4xl">
            <div className="text-center">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#f8dd72]/70">
                {ATTENTION_COPY[inventory.requestedAttention as keyof typeof ATTENTION_COPY].eyebrow}
              </p>
              <h2 className="mt-2 text-2xl font-black text-white sm:text-3xl">
                {ATTENTION_COPY[inventory.requestedAttention as keyof typeof ATTENTION_COPY].title}
              </h2>
              <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-white/48">
                {ATTENTION_COPY[inventory.requestedAttention as keyof typeof ATTENTION_COPY].detail}
              </p>
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {inventory.items.map((item) => <StationInventoryCard key={`${item.source}:${item.id}`} item={item} />)}
            </div>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <FieldStationTrackedLink
                href={`/board?${copyParams(params, { attention: 'ask', fallback: null, requestedAttention: null }).toString()}`}
                eventType="STATION_ATTENTION_SELECTED"
                attentionMode="ASK"
                targetType="PAGE"
                targetId="board:ask"
                className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-5 text-[10px] font-black uppercase tracking-[0.16em] text-white/62"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Choose another mood
              </FieldStationTrackedLink>
              <FieldStationTrackedLink
                href={`/map?${copyParams(params, { attention, fallback: null }).toString()}`}
                eventType="STATION_TARGET_OPENED"
                attentionMode={attentionMode}
                targetType="PAGE"
                targetId="map"
                className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[#f5c518]/30 bg-[#f5c518]/[0.10] px-5 text-[10px] font-black uppercase tracking-[0.16em] text-[#f8dd72]"
              >
                Open full map <ArrowRight className="h-3.5 w-3.5" />
              </FieldStationTrackedLink>
            </div>
            <p className="mt-5 text-center text-[10px] leading-4 text-white/28">
              {inventory.qualifyingCount} qualifying signals within {inventory.radiusKm}km · checked {new Date(inventory.evaluatedAt).toLocaleTimeString('en-US', { timeZone: 'Asia/Manila', hour: 'numeric', minute: '2-digit' })} Siargao time
            </p>
          </section>
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
