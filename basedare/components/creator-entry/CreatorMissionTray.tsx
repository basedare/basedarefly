'use client';

import Link from 'next/link';
import { BriefcaseBusiness, ChevronRight, MapPin, Navigation } from 'lucide-react';

import { trackClientEvent } from '@/lib/analytics';
import { formatPhp, formatUsdc, getBaseCashPhpPerUsdc } from '@/lib/basecash-shared';

export type CreatorMissionTrayItem = {
  id: string;
  category: 'Needs response' | 'Ready for proof' | 'Under review' | 'Payout queued';
  title: string;
  cta: string;
  href: string;
  role: 'creator';
  statusLabel?: string | null;
  locationLabel?: string | null;
  creatorPayout?: number | null;
  expiresAt?: string | null;
  directionsHref?: string | null;
};

const PROGRESS = ['Requested', 'Confirmed', 'Submitted', 'Paid'] as const;

function currentProgress(item: CreatorMissionTrayItem) {
  if (item.statusLabel === 'Requested' || item.category === 'Needs response') return 0;
  if (item.category === 'Ready for proof') return 1;
  if (item.category === 'Under review' || item.category === 'Payout queued') return 2;
  return 0;
}

function deadline(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

function trayCta(item: CreatorMissionTrayItem) {
  if (item.statusLabel === 'Requested') return 'View request';
  if (item.category === 'Ready for proof') return item.statusLabel === 'Submitted' ? 'Resume' : 'Submit work';
  return item.cta;
}

function trayDetail(item: CreatorMissionTrayItem) {
  if (item.statusLabel === 'Requested') return 'Waiting for approval · upload unlocks after confirmation';
  if (item.category === 'Ready for proof') return 'Confirmed · complete the brief and upload your work';
  return null;
}

export function CreatorMissionTray({
  item,
  className = '',
  variant = 'default',
}: {
  item: CreatorMissionTrayItem;
  className?: string;
  variant?: 'default' | 'map';
}) {
  const progress = currentProgress(item);
  const due = deadline(item.expiresAt);
  const payout = item.creatorPayout && item.creatorPayout > 0 ? item.creatorPayout : null;
  const cta = trayCta(item);
  const stateDetail = trayDetail(item);

  return (
    <>
      {variant === 'map' ? (
        <Link
          href={item.href}
          onClick={() => trackClientEvent('creator_mission_tray_opened', { state: item.statusLabel || item.category, surface: 'map_compact' })}
          className="creator-mission-tray-map-compact fixed bottom-[4.65rem] left-3 z-20 flex min-h-11 max-w-[calc(100%-6.5rem)] items-center gap-2 rounded-full border border-yellow-200/20 bg-[linear-gradient(135deg,rgba(41,29,6,0.96),rgba(7,9,15,0.98))] px-3 shadow-[0_12px_32px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.11)] backdrop-blur-xl transition duration-200 md:hidden"
          aria-label={`${cta}: ${item.title}`}
        >
          <BriefcaseBusiness className="h-4 w-4 shrink-0 text-yellow-100" aria-hidden="true" />
          <span className="min-w-0">
            <span className="block text-[7px] font-black uppercase tracking-[0.16em] text-yellow-100/62">My mission · {item.statusLabel || item.category}</span>
            <strong className="block truncate text-[11px] text-white">{item.title}</strong>
          </span>
          <ChevronRight className="h-4 w-4 shrink-0 text-yellow-100" aria-hidden="true" />
        </Link>
      ) : null}
      <aside
        className={`fixed inset-x-3 bottom-3 z-40 mx-auto max-w-2xl overflow-hidden rounded-[1.35rem] border border-yellow-200/22 bg-[linear-gradient(150deg,rgba(36,27,7,0.97),rgba(6,8,14,0.99)_58%)] p-3 shadow-[0_20px_70px_rgba(0,0,0,0.64),inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-xl ${variant === 'map' ? 'hidden md:block' : ''} ${className}`.trim()}
        aria-label="My mission"
      >
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-yellow-200/20 bg-yellow-300/[0.09] text-yellow-100">
          <BriefcaseBusiness className="h-4 w-4" aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[8px] font-black uppercase tracking-[0.2em] text-yellow-100/62">My mission · {item.statusLabel || item.category}</span>
          <strong className="mt-1 block truncate text-sm text-white">{item.title}</strong>
          <span className="mt-0.5 block truncate text-[10px] font-bold text-white/42">
            {stateDetail || [item.locationLabel, due].filter(Boolean).join(' · ') || 'Open the mission for details'}
          </span>
        </span>
        {payout ? (
          <span className="hidden shrink-0 text-right sm:block">
            <strong className="block text-sm font-black text-yellow-100">≈ {formatPhp(payout * getBaseCashPhpPerUsdc())}</strong>
            <span className="block text-[8px] font-black uppercase tracking-[0.13em] text-white/34">{formatUsdc(payout)} payout</span>
          </span>
        ) : null}
        <Link
          href={item.href}
          onClick={() => trackClientEvent('creator_mission_tray_opened', { state: item.statusLabel || item.category })}
          className="inline-flex min-h-10 shrink-0 items-center gap-1 rounded-full bg-yellow-300 px-4 text-[9px] font-black uppercase tracking-[0.12em] text-[#211805]"
        >
          {cta} <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </div>

      <div className="mt-2 flex items-center gap-2 border-t border-white/7 pt-2">
        <div className="grid min-w-0 flex-1 grid-cols-4 gap-1.5" aria-label="Mission progress">
          {PROGRESS.map((step, index) => (
            <span
              key={step}
              className={`rounded-full border px-2 py-1 text-center text-[7px] font-black uppercase tracking-[0.08em] ${
                index <= progress
                  ? 'border-yellow-200/25 bg-yellow-300/[0.1] text-yellow-100'
                  : 'border-white/7 bg-white/[0.025] text-white/24'
              }`}
            >
              {step}
            </span>
          ))}
        </div>
        {item.directionsHref ? (
          <a
            href={item.directionsHref}
            target="_blank"
            rel="noreferrer"
            onClick={() => trackClientEvent('creator_mission_directions_opened', { state: item.statusLabel || item.category })}
            className="inline-flex min-h-9 shrink-0 items-center justify-center gap-1.5 rounded-full border border-cyan-200/18 bg-cyan-300/[0.06] px-3 text-[8px] font-black uppercase tracking-[0.1em] text-cyan-100"
          >
            <Navigation className="h-3.5 w-3.5" aria-hidden="true" /> <span className="hidden sm:inline">Directions</span>
          </a>
        ) : item.locationLabel ? (
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-cyan-200/12 text-cyan-100/62">
            <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
          </span>
        ) : null}
      </div>
      </aside>
      {variant === 'map' ? (
        <style jsx global>{`
          @media (max-width: 767px) {
            body.bd-map-route-active:has(.selected-place-panel-wrap) .creator-mission-tray-map-compact,
            body.bd-map-route-active:has(.nearby-dare-tray) .creator-mission-tray-map-compact {
              opacity: 0;
              pointer-events: none;
              transform: translateY(0.75rem);
            }
          }
        `}</style>
      ) : null}
    </>
  );
}
