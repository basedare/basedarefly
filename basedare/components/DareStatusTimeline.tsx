'use client';

import { CheckCircle2, CircleDot, Clock3 } from 'lucide-react';

import {
  type DareLifecycleInput,
  type DareTimelineSize,
  getDareLifecycleModel,
} from '@/lib/dare-lifecycle';

type DareStatusTimelineProps = {
  dare: DareLifecycleInput;
  size?: DareTimelineSize;
};

function stepCircle(state: 'complete' | 'current' | 'upcoming') {
  if (state === 'complete') {
    return (
      <span className="flex h-8 w-8 items-center justify-center rounded-full border border-emerald-400/30 bg-emerald-500/15 text-emerald-300">
        <CheckCircle2 className="h-4.5 w-4.5" />
      </span>
    );
  }

  if (state === 'current') {
    return (
      <span className="flex h-8 w-8 items-center justify-center rounded-full border border-fuchsia-400/35 bg-fuchsia-500/15 text-fuchsia-200 shadow-[0_0_18px_rgba(192,132,252,0.18)]">
        <CircleDot className="h-4.5 w-4.5" />
      </span>
    );
  }

  return (
    <span className="flex h-8 w-8 items-center justify-center rounded-full border border-white/[0.12] bg-white/[0.04] text-white/35">
      <Clock3 className="h-4 w-4" />
    </span>
  );
}

export default function DareStatusTimeline({
  dare,
  size = 'full',
}: DareStatusTimelineProps) {
  const lifecycle = getDareLifecycleModel(dare);
  const compact = size === 'compact';

  return (
    <section
      className={`rounded-2xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-xl ${
        compact ? 'p-4' : 'p-5 md:p-6'
      }`}
    >
      <div className={`flex flex-col gap-3 ${compact ? 'md:flex-row md:items-center md:justify-between' : 'lg:flex-row lg:items-center lg:justify-between'}`}>
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-white/35">
            Dare lifecycle
          </p>
          <p className="mt-2 text-sm text-white/55">
            {lifecycle.dareType === 'open'
              ? 'Open dare flow'
              : 'Targeted dare flow'}
          </p>
        </div>
        <span
          className={`inline-flex w-fit items-center rounded-full border px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.18em] ${lifecycle.statusTone}`}
        >
          {lifecycle.currentStatusLabel}
        </span>
      </div>

      <div className="mt-5 overflow-x-auto pb-2">
        <ol className={`flex min-w-[720px] items-start ${compact ? 'gap-2' : 'gap-3'}`}>
          {lifecycle.steps.map((step, index) => (
            <li key={step.key} className="flex min-w-0 flex-1 items-start">
              <div className="min-w-0 flex-1">
                <div className="flex items-center">
                  {stepCircle(step.state)}
                  {index < lifecycle.steps.length - 1 ? (
                    <div
                      className={`mx-2 h-px flex-1 ${
                        step.state === 'complete'
                          ? 'bg-emerald-400/30'
                          : step.state === 'current'
                            ? 'bg-fuchsia-400/25'
                            : 'bg-white/[0.08]'
                      }`}
                    />
                  ) : null}
                </div>
                <div className="mt-3 pr-2">
                  <p
                    className={`text-[11px] font-black uppercase tracking-[0.16em] ${
                      step.state === 'complete'
                        ? 'text-emerald-200'
                        : step.state === 'current'
                          ? 'text-white'
                          : 'text-white/35'
                    }`}
                  >
                    {compact && step.label.length > 12 ? step.label : step.label}
                  </p>
                  {!compact ? (
                    <p className="mt-1 text-xs leading-5 text-white/45">{step.description}</p>
                  ) : null}
                </div>
              </div>
            </li>
          ))}
        </ol>
      </div>

      <div className="mt-4 rounded-2xl border border-white/[0.08] bg-black/20 p-4">
        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-white/35">
          What happens next
        </p>
        <p className="mt-2 text-sm leading-6 text-white/68">{lifecycle.nextActionCopy}</p>
      </div>
    </section>
  );
}

