'use client';

import { Check, Compass, ExternalLink, Loader2, LockKeyhole, MapPin, Save, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useAccount, useSignMessage } from 'wagmi';

import { MissionPassSheet } from '@/components/mission-pass/MissionPassSheet';
import { buildWalletActionAuthHeaders } from '@/lib/wallet-action-auth';

type Stop = {
  id: string;
  ordinal: number;
  loreTitle: string;
  loreBody: string;
  venue: { slug: string; name: string; address: string | null; latitude: number; longitude: number };
};

export function RoutePlayer({
  route,
}: {
  route: { id: string; slug: string; title: string; description: string; loreIntro: string | null; mode: string; stops: Stop[] };
}) {
  const { address } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const [run, setRun] = useState<{ actionIntentId: string | null; receiptCode: string; status: string } | null>(null);
  const [completedStopIds, setCompletedStopIds] = useState<string[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [passOpen, setPassOpen] = useState(false);
  const completedOrdinals = useMemo(
    () => route.stops.filter((stop) => completedStopIds.includes(stop.id)).map((stop) => stop.ordinal),
    [completedStopIds, route.stops],
  );

  const start = async () => {
    if (run) return run;
    setBusy('start'); setError(null);
    try {
      const response = await fetch(`/api/routes/${encodeURIComponent(route.slug)}/start`, { method: 'POST' });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload.error || 'Unable to start route.');
      const next = {
        actionIntentId: payload.data.actionIntentId as string | null,
        receiptCode: payload.data.receiptCode as string,
        status: payload.data.status as string,
      };
      setRun(next);
      setCompletedStopIds(payload.data.completedStopIds ?? []);
      setMessage('Route started. Your Mission Pass can carry it to another browser.');
      return next;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to start route.');
      return null;
    } finally { setBusy(null); }
  };

  const save = async () => {
    const activeRun = await start();
    if (activeRun?.actionIntentId) setPassOpen(true);
  };

  const complete = async (stop: Stop) => {
    if (!address) {
      setError('Connect a wallet after checking in to verify this stop.');
      return;
    }
    if (!run && !(await start())) return;
    setBusy(stop.id); setError(null);
    try {
      const resource = `route:${route.slug}:stop:${stop.id}`;
      const authHeaders = await buildWalletActionAuthHeaders({
        walletAddress: address,
        sessionToken: null,
        sessionWallet: null,
        action: 'playable-route:complete-stop',
        resource,
        signMessageAsync,
      });
      const response = await fetch(`/api/routes/${encodeURIComponent(route.slug)}/stops/${encodeURIComponent(stop.id)}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({ walletAddress: address }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload.error || 'Unable to verify this stop.');
      setCompletedStopIds(payload.data.completedStopIds ?? []);
      setRun((current) => current ? { ...current, status: payload.data.status } : current);
      setMessage(payload.data.status === 'COMPLETE' ? 'Route complete. Your field receipt is ready.' : `${stop.venue.name} added to your route receipt.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to verify this stop.');
    } finally { setBusy(null); }
  };

  return (
    <>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <button type="button" onClick={() => void start()} disabled={Boolean(busy)} className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-[#f5c518] px-5 text-sm font-black uppercase tracking-[0.12em] text-[#15120c] disabled:opacity-50">
          {busy === 'start' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Compass className="h-4 w-4" />} {run ? 'Route active' : 'Start route'}
        </button>
        <button type="button" onClick={() => void save()} disabled={Boolean(busy)} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-cyan-300/20 bg-cyan-300/[0.06] px-5 text-sm font-black text-cyan-50">
          <Save className="h-4 w-4" /> Save route
        </button>
        {run?.status === 'COMPLETE' ? <Link href={`/routes/receipts/${run.receiptCode}`} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-emerald-300/25 bg-emerald-300/[0.08] px-5 text-sm font-black text-emerald-100"><ShieldCheck className="h-4 w-4" /> View receipt</Link> : null}
      </div>
      {message ? <p className="mt-3 rounded-xl border border-emerald-300/15 bg-emerald-300/[0.06] p-3 text-xs text-emerald-100/80">{message}</p> : null}
      {error ? <p className="mt-3 rounded-xl border border-red-300/15 bg-red-300/[0.06] p-3 text-xs text-red-100/80">{error}</p> : null}

      <section className="mt-7 grid gap-4">
        {route.stops.map((stop) => {
          const completeState = completedStopIds.includes(stop.id);
          const locked = route.mode === 'ORDERED' && stop.ordinal > 1 && !completedOrdinals.includes(stop.ordinal - 1);
          const directions = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${stop.venue.latitude},${stop.venue.longitude}`)}`;
          return <article key={stop.id} className={`rounded-3xl border p-5 ${completeState ? 'border-emerald-300/25 bg-emerald-300/[0.06]' : 'border-white/10 bg-white/[0.035]'}`}>
            <div className="flex items-start gap-4">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-[#ffe36a]/20 bg-[#ffe36a]/[0.08] font-black text-[#ffe36a]">{completeState ? <Check className="h-5 w-5" /> : stop.ordinal}</div>
              <div className="min-w-0 flex-1">
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-cyan-200/65">{stop.loreTitle}</p>
                <h2 className="mt-1 text-xl font-black">{stop.venue.name}</h2>
                <p className="mt-2 text-sm leading-6 text-white/55">{stop.loreBody}</p>
                {stop.venue.address ? <p className="mt-3 flex items-start gap-2 text-xs text-white/35"><MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {stop.venue.address}</p> : null}
              </div>
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              <a href={directions} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-cyan-300/15 bg-cyan-300/[0.05] px-3 text-xs font-black text-cyan-50"><ExternalLink className="h-3.5 w-3.5" /> Directions</a>
              <Link href={`/venues/${stop.venue.slug}`} className="inline-flex min-h-11 items-center justify-center rounded-xl border border-white/10 px-3 text-xs font-black text-white/70">Open place / check in</Link>
              <button type="button" onClick={() => void complete(stop)} disabled={locked || completeState || Boolean(busy)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#ffe36a]/20 bg-[#ffe36a]/[0.07] px-3 text-xs font-black text-[#ffe36a] disabled:opacity-35">
                {busy === stop.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : locked ? <LockKeyhole className="h-3.5 w-3.5" /> : null}{completeState ? 'Verified' : locked ? 'Locked' : 'Verify check-in'}
              </button>
            </div>
          </article>;
        })}
      </section>

      {run?.actionIntentId ? <MissionPassSheet open={passOpen} onClose={() => setPassOpen(false)} targetType="ROUTE" targetId={route.id} targetHref={`/routes/${route.slug}`} title={route.title} description="Save this playable route and resume it in Safari or Chrome. Completion still requires secure venue check-ins." /> : null}
    </>
  );
}
