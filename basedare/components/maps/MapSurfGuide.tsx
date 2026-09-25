"use client";

import { Waves, X } from "lucide-react";
import type { SiargaoSurfSignal } from "@/lib/siargao-surf-signal";
import { CLOUD_9_SURF_FORECAST_CROSS_CHECK, KANAWAY_SURF_LAUNCH } from "@/lib/siargao-surf-signal";
import { SIARGAO_SURF_BREAK_POINTS } from "@/lib/siargao-surf-breaks";

function formatSurfModelTime(modelTime: string) {
  return new Intl.DateTimeFormat("en", {
    timeZone: "Asia/Manila",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(modelTime));
}

function formatTideTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    timeZone: "Asia/Manila",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function MapSurfGuide({ surfSignal, daylight, onSelectPlace, onClose }: {
  surfSignal: SiargaoSurfSignal | null;
  daylight: boolean;
  onSelectPlace: (slug: string) => void;
  onClose: () => void;
}) {
  return (
    <section aria-label="Siargao surf guide" className="map-attention-card pointer-events-auto relative max-h-[min(30rem,55dvh)] w-[min(24rem,calc(100vw-4rem))] overflow-y-auto rounded-[24px] border border-cyan-200/20 bg-[linear-gradient(180deg,rgba(18,26,38,0.98),rgba(5,7,14,0.985))] p-3.5 shadow-[0_24px_54px_rgba(0,0,0,0.48)] backdrop-blur-xl">
      <button type="button" onClick={onClose} aria-label="Close surf guide" className="absolute right-2.5 top-2.5 grid h-8 w-8 place-items-center rounded-full border border-white/10 bg-black/30 text-white/60"><X className="h-3.5 w-3.5" /></button>
      <p className="text-[9px] font-black uppercase tracking-[0.2em] text-cyan-100/60">PeeBear’s surf guide · Siargao</p>
      <h2 className="mt-2 pr-8 text-lg font-black text-white">Surf, tides & boat access</h2>
      <p className="mt-2 text-xs leading-5 text-white/65">{daylight ? "Browse the breaks and check the latest model before choosing a session." : "Plan your next daylight session. It’s too late for a surf-now suggestion; this model describes current conditions, not tomorrow’s forecast."}</p>
            {surfSignal ? (
              <div className="mt-3 block w-full rounded-[18px] border border-cyan-200/18 bg-[radial-gradient(circle_at_100%_0%,rgba(34,211,238,0.14),transparent_40%),rgba(34,211,238,0.055)] px-3 py-3 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.07)]">
                <span className="flex items-start gap-2.5">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-cyan-100/16 bg-black/25">
                    <Waves className="h-4 w-4 text-cyan-100" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[8px] font-black uppercase tracking-[0.2em] text-cyan-100/58">
                      Offshore model · {formatSurfModelTime(surfSignal.modelTime)} · Siargao time
                    </span>
                    <span className="mt-1 block text-xs font-black leading-4 text-white">
                      {surfSignal.headline}
                    </span>
                    {surfSignal.tide ? (
                      <span className="mt-1.5 block text-[10px] font-black text-[#f8dd72]/82">
                        Low {formatTideTime(surfSignal.tide.lowTime)} · High {formatTideTime(surfSignal.tide.highTime)}
                      </span>
                    ) : null}
                    <span className="mt-1.5 block text-[10px] font-semibold leading-4 text-white/52">
                      {surfSignal.guidance}
                    </span>
                    <span className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                      <button
                        type="button"
                        onClick={() => onSelectPlace(surfSignal.launchPlace.slug)}
                        className="text-[9px] font-bold text-[#f8dd72]/72 transition hover:text-[#fff0a8]"
                      >
                        Open Kanaway launch pin →
                      </button>
                      <a
                        href={surfSignal.source.href}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[8px] font-semibold text-cyan-100/48 underline decoration-cyan-100/18 underline-offset-2 transition hover:text-cyan-100/72"
                      >
                        {surfSignal.source.attribution}
                      </a>
                      <a
                        href={surfSignal.crossCheck.href}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[8px] font-semibold text-cyan-100/48 underline decoration-cyan-100/18 underline-offset-2 transition hover:text-cyan-100/72"
                      >
                        {surfSignal.crossCheck.label}
                      </a>
                      {surfSignal.tide ? (
                        <>
                          <a
                            href={surfSignal.tide.source.href}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[8px] font-semibold text-[#f8dd72]/48 underline decoration-[#f8dd72]/18 underline-offset-2 transition hover:text-[#fff0a8]/72"
                          >
                            {surfSignal.tide.station} tides
                          </a>
                          <a
                            href={surfSignal.tide.source.crossCheckHref}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[8px] font-semibold text-cyan-100/48 underline decoration-cyan-100/18 underline-offset-2 transition hover:text-cyan-100/72"
                          >
                            Surfline tide check
                          </a>
                        </>
                      ) : null}
                    </span>
                    <span className="mt-1.5 block border-t border-white/8 pt-1.5 text-[8px] font-medium leading-3 text-white/34">
                      {surfSignal.caveat}
                    </span>
                  </span>
                </span>
              </div>
            ) : null}

      {!surfSignal ? <p role="status" className="mt-3 rounded-xl border border-white/10 bg-white/5 p-3 text-xs leading-5 text-white/65">The live surf model is not available yet. You can still explore the breaks and check the forecast source below.</p> : null}
      {surfSignal && !surfSignal.tide ? <p className="mt-2 text-[10px] text-white/55">Tide times are unavailable. Check the forecast source before planning.</p> : null}
      <p className="mt-3 text-[9px] font-black uppercase tracking-[0.18em] text-cyan-100/60">Explore the breaks</p>
      <div className="mt-2 grid grid-cols-2 gap-2">
        {SIARGAO_SURF_BREAK_POINTS.map((spot) => <button key={spot.id} type="button" onClick={() => onSelectPlace(spot.venueSlug)} className="min-h-11 rounded-xl border border-cyan-100/15 bg-cyan-300/5 px-2 text-left text-xs font-bold text-cyan-50">{spot.label} →</button>)}
      </div>
      <button type="button" onClick={() => onSelectPlace(KANAWAY_SURF_LAUNCH.slug)} className="mt-3 min-h-11 w-full rounded-xl border border-[#f5c518]/25 bg-[#f5c518]/10 px-3 text-left text-xs font-bold text-[#fff0a8]">Kanaway · launch & boat crew →</button>
      <p className="mt-2 text-[10px] leading-4 text-white/55">Break pins mark the water, not an entrance. Confirm board rental, boat access and local conditions at the launch.</p>
      <a href={CLOUD_9_SURF_FORECAST_CROSS_CHECK.href} target="_blank" rel="noreferrer" className="mt-3 inline-block text-xs text-cyan-100 underline underline-offset-2">Check the multi-day Cloud 9 forecast ↗</a>
    </section>
  );
}
