'use client';

import { BarChart3, Copy, Download, Link2, Loader2, RefreshCw, ShieldCheck } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { useAccount } from 'wagmi';

import { useSessionAdminSecret } from '@/hooks/useSessionAdminSecret';

type Report = {
  generatedAt: string;
  periodDays: number;
  creators: Array<Record<string, string | number>>;
  recentCompletions: Array<{
    id: string;
    eventType: string;
    creatorCode: string | null;
    contentCode: string | null;
    targetType: string | null;
    targetId: string | null;
    occurredAt: string;
  }>;
  links: Array<{
    id: string;
    slug: string;
    creatorCode: string;
    contentCode: string;
    targetHref: string;
    participationOwner: boolean;
  }>;
};

const EMPTY_FORM = {
  slug: '', creatorCode: '', contentCode: '', campaignCode: '',
  targetType: 'DARE', targetId: '', targetHref: '', participationOwner: false,
};

export default function CreatorAttributionAdminPage() {
  const { address } = useAccount();
  const { adminSecret, setAdminSecret, ensureAdminSession, hasAdminSession } = useSessionAdminSecret();
  const [form, setForm] = useState(EMPTY_FORM);
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [periodDays, setPeriodDays] = useState(30);

  const headers = useMemo<Record<string, string>>(() => {
    const next: Record<string, string> = {};
    if (address) next['x-moderator-wallet'] = address;
    return next;
  }, [address]);

  const authenticate = useCallback(async () => {
    if (address || hasAdminSession) return true;
    return ensureAdminSession();
  }, [address, ensureAdminSession, hasAdminSession]);

  const load = useCallback(async () => {
    if (!(await authenticate())) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/creator-attribution?periodDays=${periodDays}`, { headers });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload.hint || payload.error || 'Unable to load report.');
      setReport(payload.data);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load report.');
    } finally {
      setLoading(false);
    }
  }, [authenticate, headers, periodDays]);

  useEffect(() => { if (address || hasAdminSession) void load(); }, [address, hasAdminSession, load]);

  const createLink = async (event: FormEvent) => {
    event.preventDefault();
    if (!(await authenticate())) { setError('Admin authorization required.'); return; }
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch('/api/admin/creator-attribution', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ ...form, campaignCode: form.campaignCode || null }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload.error || 'Unable to create link.');
      const url = `${window.location.origin}${payload.data.publicPath}`;
      await navigator.clipboard.writeText(url).catch(() => null);
      setMessage(`Created and copied: ${url}`);
      setForm(EMPTY_FORM);
      await load();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to create link.');
    } finally {
      setSaving(false);
    }
  };

  const exportCsv = async () => {
    if (!(await authenticate())) return;
    const response = await fetch(`/api/admin/creator-attribution?periodDays=${periodDays}&format=csv`, { headers });
    if (!response.ok) { setError('Unable to export the attribution CSV.'); return; }
    const url = URL.createObjectURL(await response.blob());
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `basedare-creator-attribution-${periodDays}d.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <main className="min-h-screen bg-[#07070b] px-4 pb-20 pt-24 text-white sm:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#ffe36a]">Internal · Ground truth</p>
            <h1 className="mt-2 text-3xl font-black">Creator attribution</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/45">Path-attributed verified completions stay separate from wider creator-mission participation. Neither metric changes payout automatically.</p>
          </div>
          <div className="flex items-center gap-2">
            <select value={periodDays} onChange={(event) => setPeriodDays(Number(event.target.value))} className="h-10 rounded-xl border border-white/10 bg-black px-3 text-xs">
              <option value={7}>7 days</option><option value={30}>30 days</option><option value={90}>90 days</option>
            </select>
            <button onClick={() => void load()} disabled={loading} className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/[0.04]">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            </button>
            <button onClick={() => void exportCsv()} className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 text-[10px] font-black uppercase tracking-[0.12em] text-white/65">
              <Download className="h-4 w-4" /> CSV
            </button>
          </div>
        </div>

        {!address && !hasAdminSession ? (
          <section className="mt-8 max-w-lg rounded-2xl border border-white/10 bg-white/[0.04] p-5">
            <label className="text-xs font-black uppercase tracking-[0.16em] text-white/50">Admin secret</label>
            <input type="password" value={adminSecret} onChange={(event) => setAdminSecret(event.target.value)} className="mt-2 h-12 w-full rounded-xl border border-white/10 bg-black px-4 outline-none" />
            <button onClick={() => void load()} className="mt-3 h-11 w-full rounded-xl bg-[#f5c518] text-xs font-black uppercase tracking-[0.16em] text-black">Open report</button>
          </section>
        ) : null}

        {error ? <div className="mt-5 rounded-xl border border-red-400/20 bg-red-500/10 p-3 text-sm text-red-200">{error}</div> : null}
        {message ? <div className="mt-5 rounded-xl border border-emerald-400/20 bg-emerald-500/10 p-3 text-sm text-emerald-100">{message}</div> : null}

        {report ? (
          <>
            <section className="mt-8 grid gap-3 md:grid-cols-3">
              {report.creators.length === 0 ? (
                <div className="col-span-full rounded-2xl border border-dashed border-white/10 p-8 text-center text-white/35">No creator touches in this period yet.</div>
              ) : report.creators.map((creator) => (
                <div key={String(creator.creatorCode)} className="rounded-2xl border border-white/10 bg-white/[0.035] p-5">
                  <p className="text-xs font-black text-[#ffe36a]">@{creator.creatorCode}</p>
                  <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                    <Metric label="Touches" value={Number(creator.touches ?? 0)} />
                    <Metric label="Intents" value={Number(creator.INTENT_LOCKED ?? 0)} />
                    <Metric label="Verified" value={Number(creator.PATH_VERIFIED_COMPLETION ?? 0)} />
                  </div>
                  <p className="mt-3 text-[11px] text-white/35">Mission participation: {Number(creator.CREATOR_MISSION_PARTICIPATION ?? 0)}</p>
                </div>
              ))}
            </section>

            <section className="mt-8 grid gap-6 lg:grid-cols-[1fr_1.15fr]">
              <form onSubmit={createLink} className="rounded-2xl border border-[#f5c518]/20 bg-[#f5c518]/[0.04] p-5">
                <h2 className="flex items-center gap-2 font-black"><Link2 className="h-4 w-4 text-[#ffe36a]" /> Create immutable link</h2>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {(['slug', 'creatorCode', 'contentCode', 'campaignCode', 'targetId', 'targetHref'] as const).map((field) => (
                    <label key={field} className={field === 'targetHref' ? 'sm:col-span-2' : ''}>
                      <span className="text-[9px] font-black uppercase tracking-[0.16em] text-white/35">{field}</span>
                      <input value={form[field]} onChange={(event) => setForm((current) => ({ ...current, [field]: event.target.value }))} required={!['campaignCode'].includes(field)} className="mt-1 h-11 w-full rounded-xl border border-white/10 bg-black/45 px-3 text-sm outline-none focus:border-[#f5c518]/35" />
                    </label>
                  ))}
                  <label>
                    <span className="text-[9px] font-black uppercase tracking-[0.16em] text-white/35">targetType</span>
                    <select value={form.targetType} onChange={(event) => setForm((current) => ({ ...current, targetType: event.target.value }))} className="mt-1 h-11 w-full rounded-xl border border-white/10 bg-black/45 px-3 text-sm">
                      <option>DARE</option><option>MEETUP</option><option>DROP</option><option>PAGE</option><option>ROUTE</option>
                    </select>
                  </label>
                  <label className="flex items-center gap-2 pt-6 text-xs text-white/55">
                    <input type="checkbox" checked={form.participationOwner} onChange={(event) => setForm((current) => ({ ...current, participationOwner: event.target.checked }))} /> Creator owns this mission
                  </label>
                </div>
                <button disabled={saving} className="mt-4 inline-flex h-11 items-center gap-2 rounded-xl bg-[#f5c518] px-4 text-xs font-black uppercase tracking-[0.14em] text-black disabled:opacity-50">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Copy className="h-4 w-4" />} Create + copy
                </button>
              </form>

              <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-5">
                <h2 className="flex items-center gap-2 font-black"><BarChart3 className="h-4 w-4 text-cyan-300" /> Recent verified outcomes</h2>
                <div className="mt-4 max-h-[420px] space-y-2 overflow-y-auto">
                  {report.recentCompletions.length === 0 ? <p className="py-8 text-center text-sm text-white/30">No verified outcomes yet.</p> : report.recentCompletions.map((item) => (
                    <div key={item.id} className="rounded-xl border border-white/[0.07] bg-black/25 p-3 text-xs">
                      <div className="flex items-center justify-between gap-3"><strong className="text-white/80">@{item.creatorCode ?? 'direct'}</strong><span className="text-white/25">{new Date(item.occurredAt).toLocaleString()}</span></div>
                      <p className="mt-1 text-white/40">{item.eventType} · {item.targetType}:{item.targetId}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <p className="mt-6 flex items-start gap-2 text-xs leading-5 text-white/30"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" /> Only PATH_VERIFIED_COMPLETION is eligible for future performance compensation. No automated bonuses are enabled in alpha.</p>
          </>
        ) : null}
      </div>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return <div className="rounded-xl bg-black/35 p-2"><strong className="block text-lg">{value}</strong><span className="text-[9px] uppercase tracking-wider text-white/30">{label}</span></div>;
}
