'use client';
import { TRIAL_ISLANDS } from '@/lib/island-trials';
import { useState } from 'react';
import type { AdventureRun } from '@/lib/adventure-progress';
import { ACTIVITY_SUGGESTIONS } from '@/lib/home-activities';
import { personalAdventureInvite } from '@/lib/adventure-passport';
import { personalCompletionSvg } from '@/lib/passport-progression';
import PlanShareButton from '@/components/community/PlanShareButton';
import AdventureCover from './AdventureCover';
import PassportStamp from './PassportStamp';

export default function PersonalCompletionCard({ run, publicName }: { run: AdventureRun; publicName?: string | null }) {
  const [downloadError, setDownloadError] = useState('');
  const [downloading, setDownloading] = useState(false);
  const [includeName, setIncludeName] = useState(false);
  const activity = ACTIVITY_SUGGESTIONS.find((a) => a.id === run.activityId);
  if (!activity || !run.completedAt) return null;
  async function download() {
    setDownloading(true); setDownloadError('');
    const svg = URL.createObjectURL(new Blob([personalCompletionSvg(run, includeName ? publicName ?? undefined : undefined)], { type: 'image/svg+xml' }));
    let png: string | undefined;
    try {
      const image = new window.Image();
      await new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = () => reject(new Error()); image.src = svg; });
      const canvas = document.createElement('canvas'); canvas.width = 1200; canvas.height = 630;
      const context = canvas.getContext('2d'); if (!context) throw new Error();
      context.drawImage(image, 0, 0);
      const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error()), 'image/png'));
      png = URL.createObjectURL(blob);
      const anchor = document.createElement('a'); anchor.href = png; anchor.download = 'basedare-' + run.activityId + '.png'; anchor.click();
    } catch { setDownloadError('This browser couldn’t make the image. You can still copy the invitation or take a screenshot of your card.'); }
    finally { setDownloading(false); window.setTimeout(() => { URL.revokeObjectURL(svg); if (png) URL.revokeObjectURL(png); }, 1000); }
  }

  return <div className="bd-card mt-4 p-4 sm:p-5">
    {Boolean(activity.collection) ? <div className="mb-4 overflow-hidden rounded-2xl"><AdventureCover activity={activity} /></div> : null}
    <div className="flex items-center gap-3"><PassportStamp evidence="personal"/><div className="min-w-0">
      <p className="text-xs font-bold text-amber-100">{run.island ? 'Island Trial #001 · No Beaches Allowed' : 'One for the travel memories'}</p>
      <h4 className="mt-1 font-black text-white">{run.island ? 'I DEFENDED ' + TRIAL_ISLANDS.find((island) => island.id === run.island)?.label.toUpperCase() : activity.result ?? activity.title}</h4>
      <p className="mt-1 break-words text-xs text-white/65">{run.area.label} · {new Date(run.completedAt).toLocaleDateString()}</p>
    </div></div>
    <p className="mt-3 text-xs leading-5 text-white/60">Your own record of what you did, not a verified check-in or cash reward. Invite a friend to try the adventure for themselves.</p>
    {publicName ? <label className="mt-2 flex min-h-11 items-center gap-2 text-xs text-white/75"><input type="checkbox" checked={includeName} onChange={(event) => setIncludeName(event.target.checked)}/>Include {publicName} on my downloaded card</label> : null}
    <div className="mt-3 flex flex-wrap gap-3">
      <PlanShareButton href={personalAdventureInvite(run)} title={activity.title} text={activity.creator?.invitation ?? ('I tried “' + activity.title + '”. Try this with me?')} label={Boolean(activity.collection) ? 'Dare a friend' : 'Try this with me'} analyticsSource="passport_completion"/>
      {activity.collection ? <PlanShareButton href={personalAdventureInvite(run)} title={activity.title} text={activity.creator?.invitation ?? activity.title} label="Copy invitation" copyOnly analyticsSource="passport_completion" /> : null}
      <button type="button" className="bd-action !text-xs" disabled={downloading} onClick={() => void download()}>{downloading ? 'Making your card…' : 'Download memory card'}</button>
      <a className="inline-flex min-h-11 items-center text-xs font-bold text-cyan-100 underline" href={personalAdventureInvite(run)}>Open invitation</a>
    </div>
    {downloadError ? <p role="status" className="mt-3 text-sm leading-6 text-amber-100">{downloadError}</p> : null}
  </div>;
}
