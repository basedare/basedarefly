import Link from 'next/link';
import { ArrowRight, Clock3, MapPin } from 'lucide-react';

import type { CreatorMission } from '@/lib/creator-missions-server';

function formatDeadline(expiresAt: Date | null) {
  if (!expiresAt) return 'No fixed deadline';
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  }).format(expiresAt);
}

function formatUsdc(value: number) {
  return value.toLocaleString('en-US', { maximumFractionDigits: 2 });
}

export function CreatorMissionCard({ mission }: { mission: CreatorMission }) {
  return (
    <Link
      href={`/earn/${encodeURIComponent(mission.shortId)}`}
      className="group relative flex min-h-72 flex-col overflow-hidden rounded-[26px] border border-yellow-200/14 bg-[linear-gradient(180deg,rgba(255,227,106,0.08),rgba(9,10,16,0.96)_34%)] p-5 shadow-[0_22px_52px_rgba(0,0,0,0.34),inset_0_1px_0_rgba(255,255,255,0.08)] transition hover:-translate-y-0.5 hover:border-yellow-200/30 sm:p-6"
    >
      <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-yellow-100/45 to-transparent" />
      <div className="flex items-start justify-between gap-4">
        <span className="rounded-full border border-cyan-200/18 bg-cyan-300/[0.06] px-3 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-cyan-100">
          {mission.typeLabel}
        </span>
        <span className="text-right">
          <strong className="block text-2xl font-black text-yellow-200">
            {formatUsdc(mission.creatorPayout)}
          </strong>
          <span className="block text-[9px] font-black uppercase tracking-[0.16em] text-white/34">
            USDC after approval
          </span>
        </span>
      </div>

      <h2 className="mt-6 text-2xl font-black leading-tight text-white">{mission.title}</h2>
      <p className="mt-3 line-clamp-2 text-sm font-semibold leading-6 text-white/56">
        {mission.whatToMake}
      </p>

      <div className="mt-5 space-y-2 text-xs font-semibold text-white/46">
        <p className="flex items-start gap-2">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-cyan-200" aria-hidden="true" />
          <span>{mission.locationLabel}</span>
        </p>
        <p className="flex items-start gap-2">
          <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-violet-200" aria-hidden="true" />
          <span>{formatDeadline(mission.expiresAt)}</span>
        </p>
      </div>

      <span className="mt-auto inline-flex items-center gap-2 pt-7 text-[10px] font-black uppercase tracking-[0.16em] text-yellow-100">
        Open mission
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
      </span>
    </Link>
  );
}
