'use client';
import { trackClientEvent } from '@/lib/analytics';
import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useSignMessage } from 'wagmi';
import { useActiveWallet } from '@/hooks/useActiveWallet';
import { buildWalletActionAuthHeaders } from '@/lib/wallet-action-auth';
import Link from 'next/link';
type OwnStory = { id: string; title: string; status: string; href: string };
export default function StoryManagement({ postId }: { postId?: string }) {
  const { address } = useActiveWallet();
  return <Actions key={address ?? 'guest'} wallet={address ?? undefined} postId={postId} />;
}
function Actions({ wallet, postId }: { wallet?: string; postId?: string }) {
  const { data: session } = useSession(), { signMessageAsync } = useSignMessage();
  const [rows, setRows] = useState<OwnStory[]>(), [busy, setBusy] = useState(false), [message, setMessage] = useState(''), [reason, setReason] = useState('');
  async function headers() {
    const s = session as { token?: string; walletAddress?: string; user?: { walletAddress?: string } } | null;
    return buildWalletActionAuthHeaders({ walletAddress: wallet!, sessionToken: s?.token ?? null, sessionWallet: s?.walletAddress ?? s?.user?.walletAddress ?? null, action: 'community-post:manage', resource: 'community', signMessageAsync });
  }
  async function action(id: string, type: 'report' | 'withdraw') {
    setBusy(true); setMessage('');
    try { const r = await fetch('/api/local-signals/' + id, { method: 'POST', headers: { ...await headers(), 'Content-Type': 'application/json' }, body: JSON.stringify({ wallet, action: type, ...(type === 'report' ? { reason } : {}) }), signal: AbortSignal.timeout(10000) }); const b = await r.json(); if (!r.ok || !b.success) throw Error(b.error || 'Could not save this action.'); trackClientEvent('community_story_action', { action: type, source: 'community' }); setMessage(type === 'withdraw' ? 'Withdrawn. This post is no longer public.' : 'Report saved. The post is hidden pending review.'); setRows(prev => prev?.map(row => row.id === id && type === 'withdraw' ? { ...row, status: 'WITHDRAWN' } : row)); }
    catch (e) { setMessage(e instanceof Error ? e.message : 'Could not save. Retry.'); } finally { setBusy(false); }
  }
  return <details className="bd-well mt-5 p-4"><summary className="min-h-11 cursor-pointer py-2 font-bold">{postId ? 'Report or manage this post' : 'My posts · review status & withdrawal'}</summary>{!wallet ? <button type="button" className="bd-action mt-3 min-h-11 !text-sm" onClick={() => window.dispatchEvent(new Event('basedare:sign-in'))}>Sign in to continue</button> : postId ? <div className="mt-3 space-y-3"><label className="block text-sm">What needs review?<textarea className="bd-field mt-2 min-h-24 w-full p-3 text-base" value={reason} onChange={e => setReason(e.target.value)} maxLength={300} /></label><button type="button" className="bd-action min-h-11 !text-sm" disabled={busy || reason.trim().length < 5} onClick={() => void action(postId, 'report')}>Report for review</button><button type="button" className="bd-action ml-2 min-h-11 !text-sm" disabled={busy} onClick={() => void action(postId, 'withdraw')}>Withdraw my post</button><p className="text-sm leading-6 text-white/60">Only the author can withdraw a post. Reports return a public post to safety review.</p></div> : <><button type="button" className="bd-action mt-3 min-h-11 !text-sm" disabled={busy} onClick={async () => { setBusy(true); setMessage(''); try { const r = await fetch('/api/local-signals/mine?wallet=' + wallet, { headers: await headers(), cache: 'no-store', signal: AbortSignal.timeout(10000) }); const b = await r.json(); if (!r.ok || !b.success) throw Error(b.error || 'Posts unavailable.'); setRows(b.data); } catch(e) { setMessage(e instanceof Error ? e.message : 'Posts unavailable. Retry.'); } finally { setBusy(false); } }}>Check my posts</button>{rows?.length === 0 ? <p className="mt-3 text-sm">No submitted stories on this account.</p> : rows?.map(row => <div key={row.id} className="mt-3 border-t border-white/10 py-3"><p className="text-base font-bold">{row.title}</p><p className="mt-2 text-sm text-white/65">{row.status === 'NEW' ? 'Waiting for review' : row.status === 'APPROVED' ? 'Reviewed for display' : row.status === 'WITHDRAWN' ? 'Withdrawn' : 'Not approved'}</p>{row.status === 'APPROVED' ? <Link href={row.href} className="mr-3 inline-flex min-h-11 items-center text-cyan-100">Open post →</Link> : null}{row.status !== 'WITHDRAWN' ? <button type="button" disabled={busy} className="bd-action mt-2 min-h-11 !text-sm" onClick={() => void action(row.id, 'withdraw')}>Withdraw</button> : null}</div>)}</>}{message ? <p role="status" className="mt-3 text-sm leading-6 text-amber-100">{message}</p> : null}</details>;
}
