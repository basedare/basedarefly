'use client';

import Link from 'next/link';
import { useCallback, useState } from 'react';
import { ArrowRight, BookOpen, Check, Compass, LockKeyhole } from 'lucide-react';
import { useAdventureProgress } from '@/hooks/useAdventureProgress';
import { useRecommendationClock } from '@/hooks/useRecommendationClock';
import { useDiscovery } from '@/components/DiscoveryProvider';
import PersonalCompletionCard from './PersonalCompletionCard';
import PassportAccountPanel from './PassportAccountPanel';
import PassportStamp from './PassportStamp';
import { weeklyPersonalChallenge, personalExplorer } from '@/lib/passport-progression';
import { activeAdventure, adventureHref } from '@/lib/adventure-progress';
import { ACTIVITY_SUGGESTIONS } from '@/lib/home-activities';
import { nextPassportActivity, personalPassport, PERSONAL_COLLECTION } from '@/lib/adventure-passport';
import { trackClientEvent } from '@/lib/analytics';

export default function AdventurePassport({ compact = false }: { compact?: boolean }) {
  const { progress, ready, storageUnavailable, asOf, wallet, accountLinked } = useAdventureProgress();
  const { area } = useDiscovery();
  const clock = useRecommendationClock();
  // Progress can update between clock ticks; a just-finished run is valid immediately.
  const now = new Date(Math.max(clock.getTime(), asOf));
  const [identity, setIdentity] = useState<{ wallet?: string; name: string | null }>({ name: null });
  const onPublicName = useCallback((name: string | null) => setIdentity({ wallet, name }), [wallet]);
  const [showAll, setShowAll] = useState(false);
  const passport = personalPassport(progress, now.getTime());
  const weekly = weeklyPersonalChallenge(progress, area, now);
  const explorer = personalExplorer(progress, now.getTime());
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
    <p className={`mt-4 flex items-start gap-2 text-xs leading-5 ${storageUnavailable ? 'text-amber-100' : 'text-white/65'}`}><LockKeyhole size={14} className="mt-0.5 shrink-0" aria-hidden="true" />{storageUnavailable ? 'Storage is unavailable. This journal lasts for this visit only.' : accountLinked ? 'Account journal on this device · choose Save and merge to update its account copy.' : 'Saved on this device · personal, self-reported memories.'}</p>
    {!ready ? <p role="status" className="mt-6 text-sm text-white/65">Opening your journal…</p> : <>
      {active && activeTemplate ? <Link href={adventureHref(active.activityId, active.placeSlug, active.area)} onClick={() => trackClientEvent('passport_adventure_resumed', { activity_id: active.activityId })} className="bd-well mt-5 flex min-h-20 items-center gap-3 p-4">
        <Compass className="shrink-0 text-cyan-200" aria-hidden="true" />
        <div className="min-w-0 flex-1"><p className="text-xs font-bold text-cyan-100">Continue · {active.steps.length}/{activeTemplate.steps.length} steps</p><p className="mt-1 text-sm font-bold text-white">{activeTemplate.title}</p></div><ArrowRight size={18} className="shrink-0 text-cyan-100" aria-hidden="true" />
      </Link> : null}
      <div className="mt-5 grid grid-cols-2 gap-3" aria-label="Personal stamps">
        {passport.stamps.map((stamp) => {
          const earned = stamp.earnedAt !== null;
          return <div key={stamp.id} className={`bd-card p-4 ${earned ? '!border-amber-200/25' : ''}`}>
<PassportStamp evidence="personal" earned={earned}/>
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
      <div className="bd-well mt-5 p-4"><div className="flex flex-wrap items-center justify-between gap-3"><h3 className="font-black text-white">Your weekly adventure</h3><span className="text-sm font-bold text-amber-100">{weekly.completed}/3</span></div><p className="mt-2 text-sm text-white/70">{weekly.title}</p><p className="mt-2 text-xs leading-5 text-white/60">Personal, self-reported progress · week of {weekly.week}, {weekly.timeZone}. Missed days never erase your memories.</p>{explorer.earnedAt ? <p className="mt-3 text-xs font-bold text-amber-100">Explorer · earned by finishing a personal adventure</p> : null}</div>
      {!compact ? <div className="mt-7 border-t border-white/10 pt-5">
        <h3 className="font-black text-white">Your memories <span className="ml-2 text-sm font-normal text-white/50">{passport.completed.length}</span></h3>
        {!passport.completed.length ? <p className="mt-3 text-sm leading-6 text-white/60">Finish an adventure to keep its completion card here. You can keep every memory private.</p> : <ul className="mt-4 space-y-3">{passport.completed.slice(0, showAll ? 30 : 5).map((run) => {
          return <li key={run.runId}><PersonalCompletionCard run={run} publicName={identity.wallet === wallet ? identity.name : null}/></li>;
        })}</ul>}
        {passport.completed.length > 5 ? <button type="button" className="bd-action mt-4 !text-xs" aria-expanded={showAll} onClick={() => setShowAll(!showAll)}>{showAll ? 'Show fewer memories' : 'Show all memories'}</button> : null}
      </div> : null}
      {!compact ? <PassportAccountPanel key={(wallet || 'guest') + ':' + area.lat + ':' + area.lng} progress={progress} accountLinked={accountLinked} area={area} onPublicName={onPublicName}/> : null}
      <details className="mt-5 border-t border-white/10 pt-2">
        <summary className="flex min-h-11 cursor-pointer items-center text-xs font-bold text-white/65">About your record</summary>
        <p className="pb-3 text-xs leading-5 text-white/60">Your latest 30 adventure runs stay until browser data is cleared. Active runs last 24 hours. Stamps reflect the memories currently saved here. They are self-reported, with no points or cash value. Verified visits, approved contributions and paid-work reputation stay in their own records; this journal does not award Signal Points. Open your full Passport to explicitly save and merge an account copy across devices. Signing out shows the separate guest-device journal. Export before clearing browser data; device copies remain on shared devices until browser data is cleared.</p>
      </details>
    </>}
  </section>;
}
