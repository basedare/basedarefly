import { MapPin, Sparkles, Trophy } from 'lucide-react';

import { cn } from '@/lib/utils';
import { controlPanel, controlInset, controlHairline } from '@/components/control/tokens';
import {
  MISSION_STYLE_LABELS,
  AVAILABILITY_LABELS,
  type MissionStyle,
  type Availability,
} from '@/lib/creator-passport-constants';
import { SignalPointsBadge } from './SignalPointsBadge';

/**
 * Creator Passport — the "route-ready" identity card: tag, Dare DNA (mission
 * styles), home zone, Signal score, availability, proof history.
 */

type CreatorPassportCardProps = {
  displayTag: string;
  homeZone?: string | null;
  vibeLine?: string | null;
  missionStyles?: string[];
  availability?: string[];
  signalPoints: number;
  routeReady?: boolean;
  proofs?: number;
  streakDays?: number;
  className?: string;
};

function styleLabel(value: string): string {
  return MISSION_STYLE_LABELS[value as MissionStyle] ?? value;
}

function availabilityLabel(value: string): string {
  return AVAILABILITY_LABELS[value as Availability] ?? value;
}

export function CreatorPassportCard({
  displayTag,
  homeZone,
  vibeLine,
  missionStyles = [],
  availability = [],
  signalPoints,
  routeReady = false,
  proofs = 0,
  streakDays = 0,
  className,
}: CreatorPassportCardProps) {
  return (
    <section className={cn(controlPanel, 'p-5 sm:p-6', className)}>
      <div className={controlHairline} />
      <div className="relative">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-yellow-100/70">Creator record</p>
            <h2 className="mt-1 truncate text-2xl font-black tracking-[-0.04em] text-white sm:text-3xl">{displayTag}</h2>
            {vibeLine ? <p className="mt-1 truncate text-sm font-bold text-white/56">{vibeLine}</p> : null}
          </div>
          <SignalPointsBadge points={signalPoints} routeReady={routeReady} className="shrink-0 flex-col items-end gap-1.5" />
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className={cn(controlInset, 'px-4 py-3')}>
            <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-white/44">
              <MapPin className="h-3.5 w-3.5" /> Home zone
            </p>
            <p className="mt-1 truncate text-sm font-black text-white">{homeZone || 'Not set'}</p>
          </div>
          <div className={cn(controlInset, 'px-4 py-3')}>
            <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-white/44">
              <Trophy className="h-3.5 w-3.5" /> Proofs
            </p>
            <p className="mt-1 flex items-center gap-2 text-sm font-black text-white">
              {proofs}
              {streakDays >= 2 ? (
                <span className="rounded-full border border-[#f5c518]/35 bg-[#f5c518]/[0.12] px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.12em] text-[#f8dd72]">
                  🔥 {streakDays}-day streak
                </span>
              ) : null}
            </p>
          </div>
        </div>

        <div className="mt-4">
          <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-white/44">
            <Sparkles className="h-3.5 w-3.5" /> Dare DNA
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {missionStyles.length ? (
              missionStyles.map((style) => (
                <span
                  key={style}
                  className="rounded-full border border-white/12 bg-white/[0.05] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-white/64"
                >
                  {styleLabel(style)}
                </span>
              ))
            ) : (
              <span className="text-xs font-bold text-white/40">Tune your radar to set this.</span>
            )}
          </div>
        </div>

        {availability.length ? (
          <div className="mt-4">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/44">Availability</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {availability.map((slot) => (
                <span
                  key={slot}
                  className="rounded-full border border-cyan-200/18 bg-cyan-300/[0.06] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-cyan-100/72"
                >
                  {availabilityLabel(slot)}
                </span>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}

export default CreatorPassportCard;
