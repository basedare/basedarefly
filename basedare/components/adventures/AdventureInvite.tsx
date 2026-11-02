'use client';
import { useState } from 'react';
import PlanShareButton from '@/components/community/PlanShareButton';
export default function AdventureInvite({ activityId, runId, href, title }: { activityId: string; runId: string; href: string; title: string }) {
  const [tracked, setTracked] = useState<string>(); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  async function prepare() {
    if (tracked || busy) return;
    setBusy(true); setError('');
    try {
      const r = await fetch('/api/adventures/invitations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ activityId, runId, href, action: 'PREPARE' }), signal: AbortSignal.timeout(5000) });
      const b = await r.json(); if (!r.ok || !b.success || !/^\/go\/try-[a-f0-9]{28}$/.test(b.data?.href)) throw Error();
      setTracked(b.data.href);
    } catch { setError('You can share the direct challenge link below. Your progress stays yours.'); }
    finally { setBusy(false); }
  }
  return <details className="bd-well mt-4 w-full p-4" onToggle={e => { if (e.currentTarget.open) void prepare(); }}>
    <summary className="min-h-11 cursor-pointer py-2 text-base font-bold text-amber-100">Dare a friend · your turn becomes theirs</summary>
    <p className="mt-2 text-sm leading-6 text-white/70">“I tried {title}. I reckon you’d bring a brilliant twist.” Invite someone who’d enjoy it—no pressure, posting or account required to play.</p>
    {busy ? <p role="status" className="mt-3 text-sm text-white/65">Preparing your invitation…</p> : <div className="mt-4"><PlanShareButton title={title} href={tracked ?? href} text={`I tried “${title}”. What would your version look like? Play free. Your turn!`} label="Share or copy your invitation" analyticsSource="adventure_chain_reaction" onShareAction={tracked ? method => { void fetch('/api/adventures/invitations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ activityId, runId, href, action: 'SHARE_ACTION', method }), signal: AbortSignal.timeout(5000) }).catch(() => {}); } : undefined} /></div>}
    {error ? <p role="status" className="mt-3 text-sm leading-6 text-white/60">{error}</p> : null}
  </details>;
}
