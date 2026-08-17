'use client';

import Link from 'next/link';
import { ArrowDownRight, ChevronLeft, ChevronRight, Map, Plus, Radio, X } from 'lucide-react';

export const LIVE_PLANS_INTRO_KEY = 'basedare-live-plans-intro-v1';
export type LivePlansGuideStep = 0 | 1 | 2;

export function LivePlansFirstChoice({
  onDoSomethingNow,
  onLeave,
}: {
  onDoSomethingNow: () => void;
  onLeave: () => void;
}) {
  return (
    <section className="mt-5 overflow-hidden rounded-[1.6rem] border border-yellow-200/22 bg-[linear-gradient(145deg,rgba(38,28,9,0.9),rgba(8,9,15,0.97))] p-5 shadow-[0_18px_48px_rgba(0,0,0,0.36),inset_0_1px_0_rgba(255,255,255,0.09)] sm:p-6" aria-labelledby="live-plans-first-choice">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-yellow-100/60">Start here</p>
          <h2 id="live-plans-first-choice" className="mt-2 text-2xl font-black text-white">What do you want to do?</h2>
        </div>
        <button type="button" onClick={onLeave} aria-label="Close start choices" className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/10 bg-black/24 text-white/50 hover:text-white">
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <div className="mt-5 grid gap-2 sm:grid-cols-3">
        <button type="button" onClick={onDoSomethingNow} className="group flex min-h-24 items-center gap-3 rounded-2xl border border-cyan-200/18 bg-cyan-300/[0.07] p-4 text-left transition hover:border-cyan-200/32 hover:bg-cyan-300/[0.11]">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-cyan-200/20 bg-cyan-300/[0.08] text-cyan-100"><Radio className="h-4 w-4" aria-hidden="true" /></span>
          <span><strong className="block text-sm text-white">Do something now</strong><small className="mt-1 block text-[10px] leading-4 text-white/40">Join what is already live</small></span>
        </button>
        <Link href="/map?source=now-intro" onClick={onLeave} className="group flex min-h-24 items-center gap-3 rounded-2xl border border-violet-200/18 bg-violet-300/[0.07] p-4 transition hover:border-violet-200/32 hover:bg-violet-300/[0.11]">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-violet-200/20 bg-violet-300/[0.08] text-violet-100"><Map className="h-4 w-4" aria-hidden="true" /></span>
          <span><strong className="block text-sm text-white">Explore places</strong><small className="mt-1 block text-[10px] leading-4 text-white/40">Free-roam the live map</small></span>
        </Link>
        <Link href="/start?source=now-intro" onClick={onLeave} className="group flex min-h-24 items-center gap-3 rounded-2xl border border-emerald-200/18 bg-emerald-300/[0.07] p-4 transition hover:border-emerald-200/32 hover:bg-emerald-300/[0.11]">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-emerald-200/20 bg-emerald-300/[0.08] text-emerald-100"><Plus className="h-4 w-4" aria-hidden="true" /></span>
          <span><strong className="block text-sm text-white">Start something</strong><small className="mt-1 block text-[10px] leading-4 text-white/40">Create a plan or challenge</small></span>
        </Link>
      </div>
    </section>
  );
}

const CUES = [
  {
    label: 'Live things are collected here',
    body: 'Use Now, Needs people or Tonight. Start with Now.',
  },
  {
    label: 'Every card answers the same questions',
    body: 'What, where, when, how many people—and one button to join.',
  },
  {
    label: 'Joined plans stay close',
    body: 'My Next Move keeps your plan, share link and next action easy to reopen.',
  },
] as const;

export function LivePlansGuideCue({
  step,
  onBack,
  onNext,
  onClose,
}: {
  step: LivePlansGuideStep;
  onBack: () => void;
  onNext: () => void;
  onClose: () => void;
}) {
  const cue = CUES[step];
  const finalStep = step === CUES.length - 1;

  return (
    <aside className="relative mt-3 rounded-2xl border border-yellow-200/25 bg-[#171208] px-4 py-4 shadow-[0_16px_36px_rgba(0,0,0,0.38),inset_0_1px_0_rgba(255,255,255,0.08)]" aria-live="polite">
      <ArrowDownRight className="absolute -top-3 left-6 h-5 w-5 text-yellow-300" aria-hidden="true" />
      <div className="flex items-start gap-3">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-yellow-300 text-[10px] font-black text-black">{step + 1}</span>
        <span className="min-w-0 flex-1">
          <strong className="block text-sm text-white">{cue.label}</strong>
          <span className="mt-1 block text-xs leading-5 text-white/48">{cue.body}</span>
        </span>
        <button type="button" onClick={onClose} aria-label="Skip guide" className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-white/42 hover:bg-white/[0.06] hover:text-white"><X className="h-4 w-4" aria-hidden="true" /></button>
      </div>
      <div className="mt-3 flex justify-end gap-2">
        {step > 0 ? <button type="button" onClick={onBack} className="inline-flex min-h-9 items-center gap-1 rounded-full border border-white/10 px-3 text-[9px] font-black uppercase tracking-[0.12em] text-white/52"><ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" /> Back</button> : null}
        <button type="button" onClick={onNext} className="inline-flex min-h-9 items-center gap-1 rounded-full bg-yellow-300 px-4 text-[9px] font-black uppercase tracking-[0.12em] text-black">{finalStep ? 'Got it' : 'Next'}{finalStep ? null : <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />}</button>
      </div>
    </aside>
  );
}
