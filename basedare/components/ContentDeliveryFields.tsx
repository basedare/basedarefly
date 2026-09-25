'use client';

import { CONTENT_RIGHTS_VERSION, CONTENT_USAGE_TERMS, type ContentDeliveryBrief } from '@/lib/content-delivery';

export default function ContentDeliveryFields({ value, onChange, released }: {
  released: boolean; value: ContentDeliveryBrief | null; onChange: (value: ContentDeliveryBrief | null) => void;
}) {
  const field = 'mt-2 w-full rounded-xl border border-white/15 bg-black/30 p-3 text-sm text-white';
  const change = (patch: Partial<ContentDeliveryBrief>) => value && onChange({ ...value, ...patch });
  return <section className="rounded-2xl border border-cyan-200/15 bg-cyan-300/[0.03] p-5">
    <label className="flex items-start gap-3 font-bold"><input type="checkbox" checked={Boolean(value)} onChange={(event) => onChange(event.target.checked ? {
      termsVersion: CONTENT_RIGHTS_VERSION, buyerName: '', assetType: 'VIDEO', format: '', acceptanceCriteria: '',
      posting: 'NONE', postingInstructions: '', deadline: new Date(Date.now() + 48 * 3600000).toISOString(), revisionLimit: 0,
    } : null)} className="mt-1 h-4 w-4" />Commission content for this place</label>
    <p className="mt-2 text-xs leading-5 text-white/50">One accepted photo or video, with explicit usage permissions. The reward follows the existing 96% contributor / 4% settlement split. Managed service is separate.</p>
    {value && !released ? <p role="status" className="mt-3 text-sm text-amber-200">Content commissions are not open yet. Prepare a draft here; funding opens after the usage terms are reviewed.</p> : null}
    {value ? <div className="mt-5 grid gap-4 sm:grid-cols-2">
      <label className="text-sm">Buyer / venue legal name<input required maxLength={160} value={value.buyerName} onChange={(e) => change({ buyerName: e.target.value })} className={field} /></label>
      <label className="text-sm">Deliver one<select value={value.assetType} onChange={(e) => change({ assetType: e.target.value as ContentDeliveryBrief['assetType'] })} className={field}><option value="VIDEO">Video</option><option value="PHOTO">Photo</option></select></label>
      <label className="text-sm sm:col-span-2">Format and length<input required minLength={3} maxLength={240} value={value.format} placeholder="e.g. 20–30 seconds, vertical 9:16, clear sound" onChange={(e) => change({ format: e.target.value })} className={field} /></label>
      <label className="text-sm sm:col-span-2">What makes the delivery acceptable?<textarea required minLength={10} maxLength={1000} value={value.acceptanceCriteria} placeholder="Describe the shots, required facts and quality. Do not require a positive review." onChange={(e) => change({ acceptanceCriteria: e.target.value })} className={field} /></label>
      <label className="text-sm">Posting obligation<select value={value.posting} onChange={(e) => change({ posting: e.target.value as ContentDeliveryBrief['posting'] })} className={field}><option value="NONE">Asset only — no creator post</option><option value="PUBLIC_POST">Asset plus public social post</option></select></label>
      <label className="text-sm">Delivery deadline (UTC)<input required type="datetime-local" value={value.deadline.slice(0,16)} onChange={(e) => change({ deadline: e.target.value ? `${e.target.value}:00.000Z` : '' })} className={field} /><span className="mt-1 block text-xs text-white/40">Between one hour and seven days away. This is the mission expiry.</span></label>
      {value.posting === 'PUBLIC_POST' ? <label className="text-sm sm:col-span-2">Posting account, disclosure and availability window<textarea required minLength={10} maxLength={500} value={value.postingInstructions} onChange={(e) => change({ postingInstructions: e.target.value })} className={field} /></label> : null}
      <div className="sm:col-span-2 text-xs leading-5 text-white/60"><p>No included revision rounds. Agree the brief before funding; a changed brief needs a new mission. Existing evidence appeals remain available.</p><p className="mt-3">{CONTENT_USAGE_TERMS}</p><p className="mt-2 text-white/40">The contributor separately accepts these terms. Availability is subject to BaseDare releasing the reviewed terms.</p></div>
    </div> : null}
  </section>;
}
