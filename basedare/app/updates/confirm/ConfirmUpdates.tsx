'use client';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import Link from 'next/link';
export default function ConfirmUpdates() {
  const token = useSearchParams().get('token') ?? '';
  const [message, setMessage] = useState('Only the topics you requested. Unsubscribe in any update. No purchase, account or public profile required.'), [busy, setBusy] = useState(false), [done, setDone] = useState(false);
  return <main className="mx-auto max-w-lg px-5 py-16"><section className="bd-surface p-6 sm:p-8"><p className="text-sm font-bold text-amber-100">BASEDARE · YOUR CHOICE</p><h1 className="mt-4 text-3xl font-black">Make room for your next dare.</h1><p role="status" className="mt-4 text-base leading-7 text-white/70">{message}</p>{!done ? <button className="bd-action bd-action--gold mt-6 min-h-12 !text-base" disabled={busy || !token} onClick={async () => {
    setBusy(true);
    try { const r = await fetch('/api/updates/consent', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, action: 'confirm' }), signal: AbortSignal.timeout(10000) }); const b = await r.json(); setMessage(b.message ?? b.error ?? 'Could not confirm. Retry.'); if (r.ok && b.success) setDone(true); }
    catch { setMessage('Could not confirm. Please retry.'); } finally { setBusy(false); }
  }}>{busy ? 'Confirming…' : 'Confirm my chosen updates'}</button> : null}<Link className="mt-5 flex min-h-11 items-center font-bold text-cyan-100" href="/adventures">Back to adventures →</Link></section></main>;
}
