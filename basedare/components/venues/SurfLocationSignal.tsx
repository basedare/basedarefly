'use client';

import { ExternalLink, Waves } from 'lucide-react';
import { useSiargaoSurfSignal } from '@/components/maps/useSiargaoSurfSignal';

function formatSignalTime(value: string, includeMinutes = false) {
  return new Intl.DateTimeFormat('en-PH', {
    timeZone: 'Asia/Manila',
    hour: 'numeric',
    ...(includeMinutes ? { minute: '2-digit' as const } : {}),
  }).format(new Date(value));
}

export default function SurfLocationSignal() {
  const signal = useSiargaoSurfSignal();

  if (!signal) return null;

  return (
    <section
      aria-label="Current Siargao offshore surf model"
      className="mt-5 max-w-2xl rounded-[22px] border border-cyan-300/16 bg-[linear-gradient(145deg,rgba(34,211,238,0.09)_0%,rgba(8,8,16,0.78)_48%,rgba(245,197,24,0.055)_100%)] px-4 py-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.07),0_14px_28px_rgba(0,0,0,0.18)]"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.22em] text-cyan-100/78">
          <Waves className="h-4 w-4 text-cyan-300" />
          Offshore model · {formatSignalTime(signal.modelTime, true)}
        </p>
        <a
          href={signal.source.href}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white/38 transition hover:text-cyan-100"
        >
          Open-Meteo
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>

      <div className="mt-2.5 flex flex-col gap-1.5 sm:flex-row sm:flex-wrap sm:items-baseline sm:gap-x-5">
        <p className="text-base font-black text-white sm:text-lg">
          {signal.model.swellHeightLabel} at {Math.round(signal.model.swellPeriodSeconds)}s ·{' '}
          {signal.model.swellDirectionLabel}
        </p>
        {signal.tide ? (
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-bold text-[#f8dd72]">
            <span>Low {formatSignalTime(signal.tide.lowTime, true)} · High {formatSignalTime(signal.tide.highTime, true)}</span>
            <a href={signal.tide.source.href} target="_blank" rel="noopener noreferrer" className="text-[9px] uppercase tracking-[0.1em] text-white/38 underline decoration-white/15 underline-offset-2 hover:text-white/60">
              {signal.tide.station} station
            </a>
            <a href={signal.tide.source.crossCheckHref} target="_blank" rel="noopener noreferrer" className="text-[9px] text-cyan-100/42 underline decoration-cyan-100/15 underline-offset-2 hover:text-cyan-100/65">
              Surfline check
            </a>
          </div>
        ) : null}
      </div>

      <p className="mt-2 text-[11px] font-medium leading-4 text-white/42">
        Model only—not a break or safety report. Check locally.
      </p>
    </section>
  );
}
