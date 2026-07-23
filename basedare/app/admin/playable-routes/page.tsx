'use client';

import { ExternalLink, Loader2, Plus, RefreshCw, Route as RouteIcon, ShieldCheck, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { useAccount } from 'wagmi';

import { useSessionAdminSecret } from '@/hooks/useSessionAdminSecret';

type Place = { id: string; slug: string; name: string; address: string | null; status: string };
type StopDraft = { venueId: string; loreTitle: string; loreBody: string };
type RouteRecord = {
  id: string;
  slug: string;
  title: string;
  description: string;
  mode: string;
  status: string;
  stops: Array<{ id: string; ordinal: number; loreTitle: string; venue: { name: string; slug: string } }>;
};

const emptyStop = (): StopDraft => ({ venueId: '', loreTitle: '', loreBody: '' });
const EMPTY = {
  slug: '',
  title: '',
  description: '',
  loreIntro: '',
  mode: 'ORDERED' as 'ORDERED' | 'FREE_PLAY',
  stops: [emptyStop(), emptyStop(), emptyStop()] as StopDraft[],
};

export default function PlayableRoutesAdminPage() {
  const { address } = useAccount();
  const { adminSecret, setAdminSecret, ensureAdminSession, hasAdminSession } = useSessionAdminSecret();
  const [form, setForm] = useState(EMPTY);
  const [places, setPlaces] = useState<Place[]>([]);
  const [routes, setRoutes] = useState<RouteRecord[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const headers = useMemo<Record<string, string>>(
    () => {
      const next: Record<string, string> = {};
      if (address) next['x-moderator-wallet'] = address;
      return next;
    },
    [address],
  );
  const authenticate = useCallback(
    async () => Boolean(address || hasAdminSession || (await ensureAdminSession())),
    [address, ensureAdminSession, hasAdminSession],
  );

  const load = useCallback(async () => {
    if (!(await authenticate())) return;
    setBusy(true);
    setError(null);
    try {
      const [routeResponse, placeResponse] = await Promise.all([
        fetch('/api/admin/playable-routes', { headers, cache: 'no-store' }),
        fetch('/api/admin/places?limit=50', { headers, cache: 'no-store' }),
      ]);
      const [routePayload, placePayload] = await Promise.all([routeResponse.json(), placeResponse.json()]);
      if (!routeResponse.ok || !routePayload.success) throw new Error(routePayload.error || 'Unable to load routes.');
      if (!placeResponse.ok || !placePayload.success) throw new Error(placePayload.error || 'Unable to load places.');
      setRoutes(routePayload.data);
      setPlaces((placePayload.data.places as Place[]).filter((place) => place.status === 'ACTIVE'));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load route builder.');
    } finally {
      setBusy(false);
    }
  }, [authenticate, headers]);

  useEffect(() => {
    if (address || hasAdminSession) void load();
  }, [address, hasAdminSession, load]);

  const create = async (event: FormEvent) => {
    event.preventDefault();
    if (!(await authenticate())) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch('/api/admin/playable-routes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ ...form, loreIntro: form.loreIntro || null }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload.error || 'Unable to create route.');
      setForm(EMPTY);
      setMessage('Draft route created. Publish only after every stop has fresh accepted place memory.');
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to create route.');
    } finally {
      setBusy(false);
    }
  };

  const act = async (action: 'PUBLISH' | 'RETIRE', routeId: string) => {
    if (!(await authenticate())) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch('/api/admin/playable-routes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ action, routeId }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload.error || 'Route action failed.');
      setMessage(action === 'PUBLISH' ? 'Route published.' : 'Route retired.');
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Route action failed.');
    } finally {
      setBusy(false);
    }
  };

  const updateStop = (index: number, patch: Partial<StopDraft>) => {
    setForm((current) => ({
      ...current,
      stops: current.stops.map((stop, stopIndex) => (stopIndex === index ? { ...stop, ...patch } : stop)),
    }));
  };

  return (
    <main className="min-h-screen bg-[#07070b] px-4 pb-24 pt-24 text-white sm:px-6">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-cyan-200">Internal · Playable discovery</p>
            <h1 className="mt-2 text-4xl font-black">Route builder</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-white/50">Compose a 3–5 stop story. Publishing fails closed if a stop is aging, disputed, retired, or needs a recheck.</p>
          </div>
          <button type="button" onClick={() => void load()} disabled={busy} className="grid h-11 w-11 place-items-center rounded-xl border border-white/10 bg-white/[0.04]">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          </button>
        </header>

        {!address && !hasAdminSession ? (
          <section className="mt-8 max-w-lg rounded-2xl border border-white/10 bg-white/[0.04] p-5">
            <label className="text-xs font-black uppercase tracking-[0.16em] text-white/50">Admin secret</label>
            <input type="password" value={adminSecret} onChange={(event) => setAdminSecret(event.target.value)} className="mt-2 h-12 w-full rounded-xl border border-white/10 bg-black px-4" />
            <button type="button" onClick={() => void load()} className="mt-3 h-11 w-full rounded-xl bg-[#f5c518] text-xs font-black uppercase tracking-[0.16em] text-black">Open builder</button>
          </section>
        ) : null}
        {error ? <p className="mt-5 rounded-xl border border-red-400/20 bg-red-500/10 p-3 text-sm text-red-100">{error}</p> : null}
        {message ? <p className="mt-5 rounded-xl border border-emerald-400/20 bg-emerald-500/10 p-3 text-sm text-emerald-100">{message}</p> : null}

        {address || hasAdminSession ? (
          <form onSubmit={create} className="mt-8 grid gap-4 rounded-3xl border border-[#ffe36a]/15 bg-gradient-to-br from-[#251d09]/50 to-[#101018] p-5 md:grid-cols-2">
            <Field label="Route title" value={form.title} onChange={(title) => setForm({ ...form, title })} required />
            <Field label="URL slug" value={form.slug} onChange={(slug) => setForm({ ...form, slug: slug.toLowerCase().replace(/[^a-z0-9-]/g, '-') })} required />
            <label className="md:col-span-2"><Label>Description</Label><textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} required className="mt-2 min-h-24 w-full rounded-xl border border-white/10 bg-black/50 p-3" /></label>
            <label className="md:col-span-2"><Label>Opening lore (optional)</Label><textarea value={form.loreIntro} onChange={(event) => setForm({ ...form, loreIntro: event.target.value })} className="mt-2 min-h-20 w-full rounded-xl border border-white/10 bg-black/50 p-3" /></label>
            <label><Label>Play mode</Label><select value={form.mode} onChange={(event) => setForm({ ...form, mode: event.target.value as 'ORDERED' | 'FREE_PLAY' })} className="mt-2 h-12 w-full rounded-xl border border-white/10 bg-black/50 px-3"><option value="ORDERED">In order</option><option value="FREE_PLAY">Free play</option></select></label>
            <div className="rounded-xl border border-white/10 bg-black/35 p-3 text-xs leading-5 text-white/45"><b className="text-white/70">Proof boundary</b><br />Directions and opening a place never complete a stop. A secure venue QR + GPS check-in does.</div>

            <fieldset className="md:col-span-2 space-y-3">
              <legend><Label>Stops (3–5)</Label></legend>
              {form.stops.map((stop, index) => (
                <div key={index} className="grid gap-2 rounded-2xl border border-white/10 bg-black/35 p-3 md:grid-cols-[48px_1fr_1fr]">
                  <div className="grid h-12 place-items-center rounded-xl border border-[#ffe36a]/20 bg-[#ffe36a]/[0.07] font-black text-[#ffe36a]">{index + 1}</div>
                  <select value={stop.venueId} onChange={(event) => updateStop(index, { venueId: event.target.value })} required className="h-12 rounded-xl border border-white/10 bg-black px-3"><option value="">Choose a fresh place</option>{places.map((place) => <option key={place.id} value={place.id}>{place.name}</option>)}</select>
                  <input value={stop.loreTitle} onChange={(event) => updateStop(index, { loreTitle: event.target.value })} placeholder="Lore chapter title" required className="h-12 rounded-xl border border-white/10 bg-black px-3" />
                  <textarea value={stop.loreBody} onChange={(event) => updateStop(index, { loreBody: event.target.value })} placeholder="What should the player notice here?" required className="min-h-20 rounded-xl border border-white/10 bg-black p-3 md:col-start-2 md:col-span-2" />
                </div>
              ))}
              <div className="flex gap-2">
                <button type="button" disabled={form.stops.length >= 5} onClick={() => setForm({ ...form, stops: [...form.stops, emptyStop()] })} className="inline-flex h-10 items-center gap-2 rounded-xl border border-cyan-300/20 bg-cyan-300/[0.06] px-4 text-xs font-black text-cyan-100 disabled:opacity-30"><Plus className="h-4 w-4" /> Add stop</button>
                <button type="button" disabled={form.stops.length <= 3} onClick={() => setForm({ ...form, stops: form.stops.slice(0, -1) })} className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/10 px-4 text-xs font-black text-white/55 disabled:opacity-30"><Trash2 className="h-4 w-4" /> Remove last</button>
              </div>
            </fieldset>
            <button disabled={busy} className="md:col-span-2 h-12 rounded-xl bg-[#f5c518] text-xs font-black uppercase tracking-[0.16em] text-black disabled:opacity-40">Create draft route</button>
          </form>
        ) : null}

        <section className="mt-10 grid gap-4 md:grid-cols-2">
          {routes.map((route) => (
            <article key={route.id} className="rounded-3xl border border-white/10 bg-white/[0.035] p-5">
              <div className="flex items-center justify-between gap-3"><p className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-200">{route.status} · {route.mode.replace('_', ' ')}</p><RouteIcon className="h-5 w-5 text-white/30" /></div>
              <h2 className="mt-2 text-2xl font-black">{route.title}</h2>
              <p className="mt-2 text-sm leading-6 text-white/45">{route.description}</p>
              <ol className="mt-4 space-y-2">{route.stops.map((stop) => <li key={stop.id} className="rounded-xl border border-white/8 bg-black/30 p-3 text-xs"><b>{stop.ordinal}. {stop.venue.name}</b><span className="block text-white/35">{stop.loreTitle}</span></li>)}</ol>
              <div className="mt-4 flex flex-wrap gap-2">
                {route.status === 'DRAFT' ? <button type="button" onClick={() => void act('PUBLISH', route.id)} className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#f5c518] px-4 text-xs font-black text-black"><ShieldCheck className="h-4 w-4" /> Publish after health check</button> : null}
                {route.status === 'PUBLISHED' ? <><Link href={`/routes/${route.slug}`} target="_blank" className="inline-flex h-10 items-center gap-2 rounded-xl border border-cyan-300/20 bg-cyan-300/[0.06] px-4 text-xs font-black text-cyan-100">Open <ExternalLink className="h-4 w-4" /></Link><button type="button" onClick={() => void act('RETIRE', route.id)} className="h-10 rounded-xl border border-white/10 px-4 text-xs font-black text-white/55">Retire</button></> : null}
              </div>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}

function Label({ children }: { children: ReactNode }) {
  return <span className="text-[10px] font-black uppercase tracking-[0.15em] text-white/45">{children}</span>;
}

function Field({ label, value, onChange, required = false }: { label: string; value: string; onChange: (value: string) => void; required?: boolean }) {
  return <label><Label>{label}</Label><input value={value} onChange={(event) => onChange(event.target.value)} required={required} className="mt-2 h-12 w-full rounded-xl border border-white/10 bg-black/50 px-3" /></label>;
}
