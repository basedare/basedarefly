'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ArrowRight, BookOpen, Check, Compass, Footprints, Layers3, LockKeyhole } from 'lucide-react';
import { useAdventureProgress } from '@/hooks/useAdventureProgress';
import { useRecommendationClock } from '@/hooks/useRecommendationClock';
import { useDiscovery } from '@/components/DiscoveryProvider';
import PlanShareButton from '@/components/community/PlanShareButton';
import { activeAdventure, adventureHref } from '@/lib/adventure-progress';
import { ACTIVITY_SUGGESTIONS } from '@/lib/home-activities';
import { nextPassportActivity, personalAdventureInvite, personalPassport, PERSONAL_COLLECTION } from '@/lib/adventure-passport';
import { trackClientEvent } from '@/lib/analytics';

export default function AdventurePassport({ compact = false }: { compact?: boolean }) {
  const { progress, ready, storageUnavailable, asOf } = useAdventureProgress();
  const { area } = useDiscovery();
  const clock = useRecommendationClock();
  // Progress can update between clock ticks; a just-finished run is valid immediately.
  const now = new Date(Math.max(clock.getTime(), asOf));
  const [showAll, setShowAll] = useState(false);
  const passport = personalPassport(progress, now.getTime());
  const active = activeAdventure(progress, now.getTime());
  const activeTemplate = ACTIVITY_SUGGESTIONS.find((activity) => activity.id === active?.activityId);
  const next = nextPassportActivity(progress, area, now);
  const finishedStages = passport.stages.filter((stage) => stage.run).length;

  return <section id="passport" className="bd-surface scroll-mt-28 p-5 sm:p-7" aria-label="Adventure Passport">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <p className="flex items-center gap-2 text-xs font-bold text-violet-200"><BookOpen size={16} aria-hidden="true" />Your journey</p>
        <h2 className="mt-2 text-2xl font-black tracking-tight text-white">Adventure Passport</h2>
        <p className="mt-2 max-w-lg text-sm leading-6 text-white/65">Little adventures. Memories worth keeping.</p>
      </div>
      {compact ? <Link href="/adventures/passport" className="bd-action !text-xs">Open Passport <ArrowRight size={15} aria-hidden="true" /></Link> : null}
    </div>
    <p className={`mt-4 flex items-start gap-2 text-xs leading-5 ${storageUnavailable ? 'text-amber-100' : 'text-white/65'}`}><LockKeyhole size={14} className="mt-0.5 shrink-0" aria-hidden="true" />{storageUnavailable ? 'Storage is unavailable. This journal lasts for this visit only.' : 'Saved on this device · personal, self-reported memories.'}</p>
    {!ready ? <p role="status" className="mt-6 text-sm text-white/65">Opening your journal…</p> : <>
      {active && activeTemplate ? <Link href={adventureHref(active.activityId, active.placeSlug, active.area)} onClick={() => trackClientEvent('passport_adventure_resumed', { activity_id: active.activityId })} className="bd-well mt-5 flex min-h-20 items-center gap-3 p-4">
        <Compass className="shrink-0 text-cyan-200" aria-hidden="true" />
        <div className="min-w-0 flex-1"><p className="text-xs font-bold text-cyan-100">Continue · {active.steps.length}/{activeTemplate.steps.length} steps</p><p className="mt-1 text-sm font-bold text-white">{activeTemplate.title}</p></div><ArrowRight size={18} className="shrink-0 text-cyan-100" aria-hidden="true" />
      </Link> : null}
      <div className="mt-5 grid grid-cols-2 gap-3" aria-label="Personal stamps">
        {passport.stamps.map((stamp, index) => {
          const Icon = index === 0 ? Footprints : Layers3;
          const earned = stamp.earnedAt !== null;
          return <div key={stamp.id} className={`bd-card p-4 ${earned ? '!border-amber-200/25' : ''}`}>
            <span className={`grid h-12 w-12 place-items-center rounded-2xl border ${earned ? 'border-amber-200/35 bg-[linear-gradient(145deg,#ffe8a3,#bc8b36)] text-[#251a0a] shadow-[inset_0_1px_0_#fff8,0_3px_0_#4b331c]' : 'border-white/15 bg-white/5 text-white/50'}`}><Icon size={23} aria-hidden="true" /></span>
            <h3 className="mt-3 text-sm font-black text-white">{stamp.title}</h3>
            <p className="mt-1 text-xs leading-5 text-white/65">{earned ? `Personal stamp · ${new Date(stamp.earnedAt!).toLocaleDateString()}` : stamp.detail}</p>
          </div>;
        })}
      </div>
      <div className="bd-well mt-5 p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3"><h3 className="font-black text-white">{PERSONAL_COLLECTION.title}</h3><span className="shrink-0 text-sm font-bold text-violet-100">{finishedStages}/3</span></div>
        <p className="mt-2 text-sm leading-6 text-white/60">{PERSONAL_COLLECTION.description} Three free activities, at your own pace.</p>
        <ol className="mt-4 space-y-2">{passport.stages.map(({ activity, run }, index) => <li key={activity.id}>
          <Link className="flex min-h-11 items-center gap-3 rounded-xl px-2 text-sm text-white/80 transition hover:bg-white/5 focus-visible:outline focus-visible:outline-cyan-200" href={adventureHref(activity.id, run?.placeSlug, run?.area ?? area)}>
            <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full border text-xs ${run ? 'border-emerald-200/30 bg-emerald-300/10 text-emerald-100' : 'border-white/15 text-white/55'}`}>{run ? <Check size={14} aria-label="Completed" /> : index + 1}</span><span>{activity.title}</span><ArrowRight size={14} className="ml-auto shrink-0 text-white/40" aria-hidden="true" />
          </Link>
        </li>)}</ol>
      </div>
      {!active && next ? <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <div className="max-w-sm"><p className="text-xs leading-5 text-white/60">{finishedStages === 3 ? 'PeeBear’s next idea, whenever you’re ready.' : 'PeeBear’s pick for the local time. No rush.'}</p><p className="mt-1 text-sm font-bold text-white">{next.title}</p></div>
        <Link href={adventureHref(next.id, undefined, area)} className="bd-action bd-action--violet !text-xs" onClick={() => trackClientEvent('passport_next_adventure_opened', { activity_id: next.id })}>See adventure <ArrowRight size={15} className="shrink-0" aria-hidden="true" /></Link>
      </div> : null}
      {!compact ? <div className="mt-7 border-t border-white/10 pt-5">
        <h3 className="font-black text-white">Your memories <span className="ml-2 text-sm font-normal text-white/50">{passport.completed.length}</span></h3>
        {!passport.completed.length ? <p className="mt-3 text-sm leading-6 text-white/60">Finish an adventure to keep its completion card here. You can keep every memory private.</p> : <ul className="mt-4 space-y-3">{passport.completed.slice(0, showAll ? 30 : 5).map((run) => {
          const activity = ACTIVITY_SUGGESTIONS.find((item) => item.id === run.activityId)!;
          return <li key={run.runId} className="bd-card p-4">
            <p className="text-xs text-violet-200">Personal memory · {new Date(run.completedAt!).toLocaleDateString()}</p>
            <Link className="mt-2 block min-h-11 text-lg font-bold text-white" href={adventureHref(run.activityId, run.placeSlug, run.area)}>{activity.title}</Link>
            <p className="mb-4 text-xs leading-5 text-white/55">{run.area.label} · self-reported</p>
            <PlanShareButton href={personalAdventureInvite(run)} title={`${activity.title} · BaseDare`} text={`I tried “${activity.title}”. Want to try this free activity yourself?`} label="Share this adventure" analyticsSource="passport_completion" />
          </li>;
        })}</ul>}
        {passport.completed.length > 5 ? <button type="button" className="bd-action mt-4 !text-xs" aria-expanded={showAll} onClick={() => setShowAll(!showAll)}>{showAll ? 'Show fewer memories' : 'Show all memories'}</button> : null}
      </div> : null}
      <details className="mt-5 border-t border-white/10 pt-2">
        <summary className="flex min-h-11 cursor-pointer items-center text-xs font-bold text-white/65">About your record</summary>
        <p className="pb-3 text-xs leading-5 text-white/60">Your latest 30 adventure runs stay until browser data is cleared. Active runs last 24 hours. Stamps reflect the memories currently saved here. They are self-reported, with no points or cash value. Verified visits, approved contributions and paid-work reputation stay in their own records; this journal does not award Signal Points or sync across devices.</p>
      </details>
    </>}
  </section>;
}
