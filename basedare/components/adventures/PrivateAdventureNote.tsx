'use client';
import { useEffect, useState } from 'react';

/** Device-only writing. Never enters account saves, analytics or invitations. */
export default function PrivateAdventureNote({ runId }: { runId: string }) {
  const [text, setText] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const key = 'basedare:trial-note:' + runId;
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
    try { setText((localStorage.getItem(key) ?? '').slice(0, 2000)); } catch { setFailed(true); }
    setLoaded(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [key]);
  return <div className="bd-well mt-4 p-4"><label htmlFor="trial-note" className="text-sm font-bold text-violet-100">Your island story · optional</label><textarea id="trial-note" disabled={!loaded} maxLength={2000} value={text} placeholder="The beach gets all the attention. But this little corner…" className="mt-3 min-h-32 w-full rounded-xl border border-white/15 bg-black/30 p-3 text-base leading-7 text-white" onChange={(event) => {
    const next = event.target.value; setText(next);
    try { if (next) localStorage.setItem(key, next); else localStorage.removeItem(key); setFailed(false); } catch { setFailed(true); }
  }} /><p role="status" className="mt-2 text-sm leading-6 text-white/60">{failed ? 'This browser couldn’t save your story. Copy it somewhere safe before leaving.' : 'Saved only in this browser. It stays out of your card, account save and invitation.'}</p></div>;
}
