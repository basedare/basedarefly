'use client';
import Link from '@/components/DiscoveryLink';
import { useDiscovery } from '@/components/DiscoveryProvider';
import { useEffect, useState } from 'react';
import { trackClientEvent } from '@/lib/analytics';
type Story = { id: string; title: string; notes: string; submittedBy: string; venueSlug: string; venueName: string; createdAt: string };
export default function CommunityStories() {
  const { area, ready } = useDiscovery();
  const [items, setItems] = useState<Story[]>(), [error, setError] = useState(''), [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!ready) return;
    const controller = new AbortController(), deadline = setTimeout(() => { setError('Local stories timed out. Retry.'); controller.abort(); }, 8000);
    const reset = setTimeout(() => { setItems(undefined); setError(''); }, 0);
    void fetch(`/api/local-signals?postType=story&lat=${area.lat}&lng=${area.lng}&radiusKm=${area.radiusKm}&limit=8`, { cache: 'no-store', signal: controller.signal }).then(async r => { const b = await r.json(); if (!r.ok || !b.success) throw Error(); if (!controller.signal.aborted) setItems(b.data.signals); }).catch(() => { if (!controller.signal.aborted) setError('Local stories could not load. Retry.'); }).finally(() => clearTimeout(deadline));
    return () => { controller.abort(); clearTimeout(deadline); clearTimeout(reset); };
  }, [ready, area.lat, area.lng, area.radiusKm, retry]);
  return <section className="bd-surface mt-6 p-5 sm:p-7" aria-label="Local stories"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-2xl font-black">From the community</h2><Link href="/community?compose=story#local-post" className="bd-action min-h-11 !text-sm">Share an experience</Link></div><p className="mt-3 text-sm leading-6 text-white/65">People’s experiences around {area.label}. Personal stories are separate from scheduled plans and verified visits.</p>{items ? items.length ? <div className="mt-4 grid gap-3 sm:grid-cols-2">{items.map(s => <article className="bd-well p-4" key={s.id}><p className="text-sm text-cyan-100">{s.submittedBy} · Community experience</p><h3 className="mt-3 text-xl font-black">{s.title}</h3><p className="mt-3 line-clamp-3 whitespace-pre-line text-base leading-7 text-white/70">{s.notes}</p><div className="mt-3 flex flex-wrap gap-3"><Link href={'/community/posts/' + s.id} className="inline-flex min-h-11 items-center font-bold text-amber-100" onClick={() => trackClientEvent('community_story_opened', { source: 'pulse' })}>Read story →</Link>{s.venueSlug ? <Link href={'/venues/' + s.venueSlug} className="inline-flex min-h-11 items-center text-sm text-cyan-100">Explore {s.venueName} →</Link> : null}</div></article>)}</div> : <p className="mt-4 text-base leading-7 text-white/65">No reviewed stories in this area yet. Explore the places and free Dares below, or share something you enjoyed.</p> : <p role="status" className="mt-4 text-sm text-white/65">{error || 'Reading local stories…'}</p>}{error ? <button className="bd-action mt-3 min-h-11 !text-sm" onClick={() => setRetry(n => n + 1)}>Retry stories</button> : null}</section>;
}
