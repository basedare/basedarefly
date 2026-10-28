'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import PlanShareButton from '@/components/community/PlanShareButton';
import { getBaseDareUrl } from '@/lib/social-share';
import { trackClientEvent } from '@/lib/analytics';
import { SIARGAO_VERDICTS, siargaoChallengeHref, type SiargaoVerdict as Verdict } from '@/lib/siargao-challenge';

export default function SiargaoVerdict({ runId, value, finished, onChange }: {
  runId: string; value?: Verdict; finished: boolean; onChange: (value: Verdict) => void;
}) {
  const noteKey = `basedare:siargao-note:${runId}`;
  const [note, setNote] = useState('');
  const [noteReady, setNoteReady] = useState(false);
  const [noteFailed, setNoteFailed] = useState(false);
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'manual'>('idle');
  useEffect(() => {
    try { setNote((localStorage.getItem(noteKey) ?? '').slice(0, 280)); } catch { setNoteFailed(true); }
    setNoteReady(true);
  }, [noteKey]);
  const verdict = SIARGAO_VERDICTS.find((item) => item.id === value);

  return <div className="mt-5" aria-label="Your Siargao verdict">
    {finished && verdict ? <>
      <div className="rounded-[1.5rem] border border-violet-200/25 bg-[radial-gradient(ellipse_at_top_right,rgba(168,85,247,0.25),transparent_65%),linear-gradient(145deg,#17121f,#080a10)] p-6 sm:p-8">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-amber-100">BaseDare · My Siargao take</p>
        <h3 className="mt-5 text-3xl font-black italic leading-tight tracking-tight sm:text-4xl">{verdict.headline}</h3>
        <p className="mt-4 text-base leading-7 text-white/75">{verdict.invitation}</p>
        <p className="mt-5 text-xs leading-5 text-white/55">Personal opinion · self-reported adventure</p>
      </div>
      <div className="mt-4 flex flex-wrap gap-3">
        <PlanShareButton href={siargaoChallengeHref(value)} title={verdict.headline} text={`${verdict.headline} ${verdict.invitation}`} label="Share my verdict" analyticsSource="siargao_verdict" />
        <button type="button" className="bd-action !text-sm" onClick={async () => {
          try {
            await navigator.clipboard.writeText(getBaseDareUrl(siargaoChallengeHref(value)));
            setCopyStatus('copied');
            trackClientEvent('adventure_verdict_shared', { activity_id: 'siargao-verdict', method: 'copy_link' });
          } catch { setCopyStatus('manual'); }
        }}>{copyStatus === 'copied' ? 'Link copied' : 'Copy verdict link'}</button>
        <a className="bd-action !text-sm" href={`${siargaoChallengeHref(value)}/card`} download="basedare-siargao-verdict.png">Save result card</a>
        <PlanShareButton href={siargaoChallengeHref() + '?from=challenge'} title="Is Siargao worth the hype?" text="The waves are only the start. Try this free three-part adventure and give your verdict." label="Challenge a friend" analyticsSource="siargao_challenge" />
      </div>
      {copyStatus === 'manual' ? <label className="mt-3 block text-sm text-white/70">Copy this invitation<input readOnly className="bd-field mt-2 w-full text-base" value={getBaseDareUrl(siargaoChallengeHref(value))} onFocus={(event) => event.currentTarget.select()} /></label> : null}
      <p className="mt-3 text-sm leading-6 text-white/60">Sharing is your choice. The card and link include this verdict, without your name, private note or location history.</p>
      <Link href={siargaoChallengeHref()} className="sr-only">Try the Siargao challenge</Link>
    </> : <fieldset>
      <legend className="text-xl font-black text-white">So… worth the hype?</legend>
      <p className="mt-2 text-sm leading-6 text-white/65">There’s no right answer. Choose your take to finish stage three.</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">{SIARGAO_VERDICTS.map((item) => <button type="button" key={item.id} aria-pressed={value === item.id} onClick={() => onChange(item.id)} className={`min-h-14 rounded-2xl border px-4 py-3 text-base font-bold transition ${value === item.id ? 'border-yellow-100/50 bg-yellow-300/15 text-yellow-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]' : 'border-white/15 bg-black/25 text-white/80 hover:border-violet-200/45'}`}>{item.label}</button>)}</div>
    </fieldset>}
    <details className="mt-4 rounded-2xl border border-white/10 px-4">
      <summary className="min-h-12 cursor-pointer py-3 text-sm font-bold text-white/70">A note for yourself · optional</summary>
      <label className="block pb-4 text-sm text-white/65">What tipped the balance?
        <textarea disabled={!noteReady} value={note} maxLength={280} rows={3} placeholder="The little moment I’d tell a friend about…" className="bd-field mt-2 w-full text-base" onChange={(event) => {
          const next = event.target.value.slice(0, 280); setNote(next);
          try { localStorage.setItem(noteKey, next); } catch { setNoteFailed(true); }
        }} />
        <span className="mt-2 block text-xs leading-5">{noteFailed ? 'This browser couldn’t save your note. It lasts only while this page stays open.' : 'Saved only in this browser. It stays out of your share card, link and account backup.'}</span>
      </label>
    </details>
  </div>;
}
