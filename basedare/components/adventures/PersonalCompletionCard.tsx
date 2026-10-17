'use client';
import { useState } from 'react';
import type { AdventureRun } from '@/lib/adventure-progress';
import { ACTIVITY_SUGGESTIONS } from '@/lib/home-activities';
import { personalAdventureInvite } from '@/lib/adventure-passport';
import { personalCompletionSvg } from '@/lib/passport-progression';
import PlanShareButton from '@/components/community/PlanShareButton';
import PassportStamp from './PassportStamp';

export default function PersonalCompletionCard({ run, publicName }: { run: AdventureRun; publicName?: string | null }) {
  const [includeName, setIncludeName] = useState(false);
  const activity = ACTIVITY_SUGGESTIONS.find((a) => a.id === run.activityId);
  if (!activity || !run.completedAt) return null;
  function download() {
    const url = URL.createObjectURL(new Blob([personalCompletionSvg(run, includeName ? publicName ?? undefined : undefined)], { type: 'image/svg+xml' }));
    const anchor = document.createElement('a');
    anchor.href = url; anchor.download = 'basedare-' + run.activityId + '.svg'; anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return <div className="bd-card mt-4 p-4 sm:p-5">
    <div className="flex items-center gap-3"><PassportStamp evidence="personal"/><div className="min-w-0">
      <p className="text-xs font-bold text-amber-100">Explorer · personal adventure completed</p>
      <h4 className="mt-1 font-black text-white">{activity.title}</h4>
      <p className="mt-1 break-words text-xs text-white/65">{run.area.label} · {new Date(run.completedAt).toLocaleDateString()}</p>
    </div></div>
    <p className="mt-3 text-xs leading-5 text-white/60">Self-reported. Your friend starts their own attempt. No verified attendance or reward is transferred.</p>
    {publicName ? <label className="mt-2 flex min-h-11 items-center gap-2 text-xs text-white/75"><input type="checkbox" checked={includeName} onChange={(event) => setIncludeName(event.target.checked)}/>Include {publicName} on my downloaded card</label> : null}
    <div className="mt-3 flex flex-wrap gap-3">
      <PlanShareButton href={personalAdventureInvite(run)} title={activity.title} text={'I tried “' + activity.title + '”. Try this with me?'} label="Try this with me" analyticsSource="passport_completion"/>
      <button type="button" className="bd-action !text-xs" onClick={download}>Download memory card</button>
      <a className="inline-flex min-h-11 items-center text-xs font-bold text-cyan-100 underline" href={personalAdventureInvite(run)}>Open invitation</a>
    </div>
  </div>;
}
