'use client';

import Link from 'next/link';
import { Coins, Navigation, RotateCcw, Sparkles } from 'lucide-react';

import PlanShareButton from '@/components/community/PlanShareButton';
import { trackClientEvent } from '@/lib/analytics';
import { getLivePlanDirectionsHref, type LivePlan } from '@/lib/live-plans';
import type { WorldPulseIntent, WorldPulseSignal } from '@/lib/world-pulse';

const INTENT_LABEL: Record<WorldPulseIntent, string> = {
  SURF: 'Surf',
  MEET: 'Meet people',
  PLAY: 'Play',
  SOCIAL: 'Meet people',
  SURPRISE: 'Something random',
};

export default function PeeBearDecisionCard({
  plan,
  runnerUp,
  signal,
  reason,
  intent,
  sideQuest,
  onFlipAgain,
}: {
  plan: LivePlan;
  runnerUp: LivePlan | null;
  signal: WorldPulseSignal;
  reason: string;
  intent: WorldPulseIntent | null;
  sideQuest: string | null;
  onFlipAgain?: () => void;
}) {
  const decisionMade = intent != null;
  const directionsHref = getLivePlanDirectionsHref(plan);
  const decisionDetail = !decisionMade
    ? 'Opened from a shared World Pulse view'
    : runnerUp
      ? `Flipped between this and ${runnerUp.title}`
      : 'One honest match in this time window';

  return (
    <section
      id="peebear-pick"
      className="scroll-mt-28 mt-6 overflow-hidden rounded-[1.8rem] border border-yellow-200/20 bg-[radial-gradient(circle_at_84%_18%,rgba(245,197,24,0.13),transparent_27%),linear-gradient(135deg,rgba(46,33,7,0.92),rgba(10,16,24,0.97)_48%,rgba(15,9,27,0.97))] p-5 shadow-[0_24px_68px_rgba(0,0,0,0.48),inset_0_1px_0_rgba(255,255,255,0.1),inset_0_-18px_28px_rgba(0,0,0,0.22)] sm:p-6"
      aria-label={decisionMade ? 'PeeBear decision' : 'Selected live plan'}
    >
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <span className={`${decisionMade ? 'peebear-decision-coin ' : ''}grid h-12 w-12 shrink-0 place-items-center rounded-full border border-yellow-100/26 bg-[radial-gradient(circle_at_35%_25%,#fff1a7,#d49307_48%,#4d2602_100%)] text-[#211104] shadow-[0_10px_24px_rgba(0,0,0,0.42),0_0_24px_rgba(245,197,24,0.2),inset_0_2px_2px_rgba(255,255,255,0.5),inset_0_-3px_5px_rgba(70,30,0,0.55)]`} aria-hidden="true">
              {decisionMade ? <Coins className="h-5 w-5" /> : <Sparkles className="h-5 w-5" />}
            </span>
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-yellow-100/66">
                {decisionMade ? `PeeBear showdown · ${INTENT_LABEL[intent]}` : 'Selected live plan'}
              </p>
              <p className="mt-1 text-[10px] font-bold text-white/38">
                {decisionDetail}
              </p>
            </div>
          </div>

          <h2 className="mt-4 text-2xl font-black leading-tight text-white sm:text-3xl">{plan.title}</h2>
          <p className="mt-2 text-sm font-bold text-white/54">
            {plan.place.label}
            {plan.people ? ` · ${plan.people.going} going${plan.people.spotsNeeded ? ` · needs ${plan.people.spotsNeeded}` : ''}` : ''}
          </p>
          <p className="mt-3 text-[9px] font-black uppercase tracking-[0.15em] text-cyan-100/54">
            {signal.label}{signal.sourceLabel ? ` · ${signal.sourceLabel}` : ''}
          </p>

          <p className="mt-2 text-xs leading-5 text-white/58">{reason}</p>

          {sideQuest ? (
            <div className="mt-4 rounded-2xl border border-violet-200/14 bg-violet-300/[0.055] px-4 py-3">
              <p className="text-[8px] font-black uppercase tracking-[0.18em] text-violet-100/52">Optional side quest · no proof needed</p>
              <p className="mt-1.5 text-xs font-bold leading-5 text-white/62">{sideQuest}</p>
            </div>
          ) : null}
        </div>

        <div className="grid w-full shrink-0 grid-cols-2 gap-2 lg:w-[23rem]">
          <Link
            href={plan.action.href}
            prefetch={false}
            onClick={() => trackClientEvent('peebear_decision_action_opened', {
              plan_id: plan.id,
              plan_type: plan.type,
              pulse_intent: intent,
            })}
            className="col-span-2 inline-flex min-h-12 items-center justify-center rounded-full bg-[#f5c518] px-7 text-[10px] font-black uppercase tracking-[0.14em] text-[#171006] transition hover:bg-[#ffe36e] active:scale-[0.985]"
          >
            {plan.action.label}
          </Link>
          <PlanShareButton
            title={plan.share.title}
            text={plan.share.text}
            href={plan.share.href}
            label="Invite mates"
            analyticsSource="peebear_decision"
            className="rounded-full"
          />
          <a
            href={directionsHref}
            target="_blank"
            rel="noreferrer"
            onClick={() => trackClientEvent('peebear_decision_directions_opened', {
              plan_id: plan.id,
              plan_type: plan.type,
              pulse_intent: intent,
            })}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-cyan-200/18 bg-cyan-300/[0.065] px-4 text-[9px] font-black uppercase tracking-[0.12em] text-cyan-100 transition hover:border-cyan-100/36 hover:text-white"
          >
            <Navigation className="h-4 w-4" aria-hidden="true" /> Directions
          </a>
          {onFlipAgain ? (
            <button
              type="button"
              onClick={onFlipAgain}
              className="col-span-2 inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-white/11 bg-white/[0.045] px-4 text-[9px] font-black uppercase tracking-[0.12em] text-white/62 transition hover:border-yellow-200/22 hover:text-yellow-100"
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" /> Flip again
            </button>
          ) : null}
        </div>
      </div>
    </section>
  );
}
