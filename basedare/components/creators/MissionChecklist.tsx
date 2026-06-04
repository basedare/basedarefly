'use client';

import { CheckCircle2, Circle, Zap } from 'lucide-react';

import { cn } from '@/lib/utils';
import { controlInset } from '@/components/control/tokens';
import type { MissionId, PassportMissionState } from '@/lib/creator-passport-constants';

/**
 * Starter mission checklist. Completed missions show a check + earned points;
 * incomplete `explicit` missions can expose an action (e.g. "Mark done").
 */

type MissionChecklistProps = {
  missions: PassportMissionState[];
  /** Optional CTA per incomplete mission (label + handler), keyed by mission id. */
  actions?: Partial<Record<MissionId, { label: string; onClick: () => void }>>;
  className?: string;
};

export function MissionChecklist({ missions, actions, className }: MissionChecklistProps) {
  return (
    <ul className={cn('grid gap-2', className)}>
      {missions.map((mission) => {
        const action = !mission.complete ? actions?.[mission.id] : undefined;
        return (
          <li
            key={mission.id}
            className={cn(
              controlInset,
              'flex items-center gap-3 px-4 py-3 transition',
              mission.complete && 'opacity-70'
            )}
          >
            {mission.complete ? (
              <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-300" />
            ) : (
              <Circle className="h-5 w-5 shrink-0 text-white/30" />
            )}

            <div className="min-w-0 flex-1">
              <div
                className={cn(
                  'truncate text-sm font-black tracking-[-0.01em]',
                  mission.complete ? 'text-white/70 line-through decoration-white/30' : 'text-white'
                )}
              >
                {mission.title}
              </div>
              <div className="truncate text-xs font-bold text-white/48">{mission.detail}</div>
            </div>

            {action ? (
              <button
                type="button"
                onClick={action.onClick}
                className="shrink-0 rounded-full border border-yellow-300/30 bg-yellow-300/[0.1] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-yellow-100 transition hover:bg-yellow-300/[0.16]"
              >
                {action.label}
              </button>
            ) : (
              <span
                className={cn(
                  'inline-flex shrink-0 items-center gap-1 text-xs font-black tabular-nums',
                  mission.complete ? 'text-emerald-200/80' : 'text-white/40'
                )}
              >
                <Zap className="h-3 w-3" />
                {mission.points}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export default MissionChecklist;
