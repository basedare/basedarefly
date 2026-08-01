'use client';

import { BarChart3, Copy, Loader2, Plus, RefreshCw, Send, Share2, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { useAccount } from 'wagmi';

import { useSessionAdminSecret } from '@/hooks/useSessionAdminSecret';
import { CREATOR_DROP_CATEGORIES, creatorDropCategoryLabel, type CreatorDropCategory } from '@/lib/creator-drops';

type CreatorDropSummary = {
  id: string;
  slug: string;
  creatorCode: string;
  contentCode: string;
  campaignCode: string | null;
  targetType: string;
  targetId: string;
  landingPath: string;
  actionHref: string;
  publicPath: string;
  participationOwner: boolean;
  active: boolean;
  createdAt: string;
  metadata: {
    title: string;
    hook: string;
    category: CreatorDropCategory;
    actionLabel: string;
    rewardLabel?: string | null;
    cityLabel?: string | null;
    creatorBrief?: string | null;
    suggestedCaption?: string | null;
    proofPrompt?: string | null;
  };
  metrics: {
    touches: number;
    intents: number;
    missionPasses: number;
    verifiedCompletions: number;
  };
  shareText?: string;
};

type Report = {
  generatedAt: string;
  drops: CreatorDropSummary[];
};

const EMPTY_FORM = {
  slug: '',
  creatorCode: '',
  contentCode: '',
  campaignCode: 'creator-drops-v1',
  targetType: 'PAGE',
  targetId: '',
  actionHref: '',
  title: '',
  hook: '',
  category: 'social',
  actionLabel: 'Open on BaseDare',
  rewardLabel: '',
  cityLabel: 'Siargao',
  creatorBrief: '',
  suggestedCaption: '',
  proofPrompt: '',
  participationOwner: false,
};

const inputClass =
  'mt-1 h-11 w-full rounded-xl border border-white/10 bg-black/45 px-3 text-sm text-white outline-none placeholder:text-white/22 focus:border-[#f5c518]/35';
const textareaClass =
  'mt-1 min-h-[84px] w-full rounded-xl border border-white/10 bg-black/45 px-3 py-3 text-sm text-white outline-none placeholder:text-white/22 focus:border-[#f5c518]/35';
const labelClass = 'text-[9px] font-black uppercase tracking-[0.16em] text-white/35';

function absoluteUrl(path: string) {
  if (typeof window === 'undefined') return path;
  return `${window.location.origin}${path}`;
}

export default function CreatorDropsAdminPage() {
  const { address } = useAccount();
  const { adminSecret, setAdminSecret, ensureAdminSession, hasAdminSession } = useSessionAdminSecret();
  const [form, setForm] = useState(EMPTY_FORM);
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

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
      const response = await fetch('/api/admin/creator-drops', { headers });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload.hint || payload.error || 'Unable to load creator drops.');
      setReport(payload.data);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load creator drops.');
    } finally {
      setLoading(false);
    }
  }, [authenticate, headers]);

  useEffect(() => { if (address || hasAdminSession) void load(); }, [address, hasAdminSession, load]);

  const update = (field: keyof typeof EMPTY_FORM, value: string | boolean) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const createDrop = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!(await authenticate())) { setError('Admin authorization required.'); return; }
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch('/api/admin/creator-drops', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({
          ...form,
          campaignCode: form.campaignCode || null,
          rewardLabel: form.rewardLabel || null,
          cityLabel: form.cityLabel || null,
          creatorBrief: form.creatorBrief || null,
          suggestedCaption: form.suggestedCaption || null,
          proofPrompt: form.proofPrompt || null,
        }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.success || !payload.data) throw new Error(payload.error || 'Unable to create creator drop.');
      const url = absoluteUrl(payload.data.publicPath);
      await navigator.clipboard.writeText(url).catch(() => null);
      setMessage(`Created and copied: ${url}`);
      setForm((current) => ({
        ...EMPTY_FORM,
        creatorCode: current.creatorCode,
        campaignCode: current.campaignCode,
        cityLabel: current.cityLabel,
      }));
      await load();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to create creator drop.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#07070b] px-4 pb-20 pt-24 text-white sm:px-6">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-[#f5c518]/20 bg-[#f5c518]/[0.07] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.24em] text-[#ffe36a]">
              <Sparkles className="h-3.5 w-3.5" />
              Creator Drop OS · v1
            </p>
            <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">Give creators links that move people.</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/45">
              Build one creator-facing drop page, route through <code className="text-white/70">/go</code>, preserve Mission Pass handoff, and measure verified outcomes without promising automatic bonuses.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/admin/creator-drop-queue" className="inline-flex h-11 items-center gap-2 rounded-xl border border-[#f5c518]/20 bg-[#f5c518]/[0.08] px-4 text-xs font-black uppercase tracking-[0.12em] text-[#ffe36a]">
              <Send className="h-4 w-4" />
              Activation queue
            </Link>
            <button onClick={() => void load()} disabled={loading} className="inline-flex h-11 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 text-xs font-black uppercase tracking-[0.12em] text-white/65">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Refresh
            </button>
          </div>
        </div>

        {!address && !hasAdminSession ? (
          <section className="mt-8 max-w-lg rounded-2xl border border-white/10 bg-white/[0.04] p-5">
            <label className={labelClass}>Admin secret</label>
            <input type="password" value={adminSecret} onChange={(event) => setAdminSecret(event.target.value)} className={inputClass} />
            <button onClick={() => void load()} className="mt-3 h-11 w-full rounded-xl bg-[#f5c518] text-xs font-black uppercase tracking-[0.16em] text-black">Open creator drops</button>
          </section>
        ) : null}

        {error ? <div className="mt-5 rounded-xl border border-red-400/20 bg-red-500/10 p-3 text-sm text-red-200">{error}</div> : null}
        {message ? <div className="mt-5 rounded-xl border border-emerald-400/20 bg-emerald-500/10 p-3 text-sm text-emerald-100">{message}</div> : null}

        <section className="mt-8 grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <form onSubmit={createDrop} className="rounded-[28px] border border-[#f5c518]/20 bg-[linear-gradient(150deg,rgba(245,197,24,.07),rgba(255,255,255,.035)_30%,rgba(0,0,0,.62))] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,.08)]">
            <h2 className="flex items-center gap-2 text-xl font-black"><Plus className="h-5 w-5 text-[#ffe36a]" /> New creator drop</h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <Field label="slug" value={form.slug} onChange={(value) => update('slug', value)} placeholder="maya-cloud9-rumor" required />
              <Field label="creatorCode" value={form.creatorCode} onChange={(value) => update('creatorCode', value)} placeholder="maya" required />
              <Field label="contentCode" value={form.contentCode} onChange={(value) => update('contentCode', value)} placeholder="rumor-01" required />
              <Field label="campaignCode" value={form.campaignCode} onChange={(value) => update('campaignCode', value)} placeholder="siargao-creators-v1" />
              <label>
                <span className={labelClass}>targetType</span>
                <select value={form.targetType} onChange={(event) => update('targetType', event.target.value)} className={inputClass}>
                  <option>PAGE</option><option>DARE</option><option>MEETUP</option><option>DROP</option>
                </select>
              </label>
              <Field label="targetId" value={form.targetId} onChange={(value) => update('targetId', value)} placeholder="place:hideaway or dare id" required />
              <Field label="actionHref" value={form.actionHref} onChange={(value) => update('actionHref', value)} placeholder="/map?place=hideaway" className="sm:col-span-2" required />
              <Field label="title" value={form.title} onChange={(value) => update('title', value)} placeholder="Solo in Siargao tonight?" className="sm:col-span-2" required />
              <label className="sm:col-span-2">
                <span className={labelClass}>hook</span>
                <textarea value={form.hook} onChange={(event) => update('hook', event.target.value)} className={textareaClass} placeholder="Open the live map, save the mission, then prove what you find." required />
              </label>
              <label>
                <span className={labelClass}>category</span>
                <select value={form.category} onChange={(event) => update('category', event.target.value)} className={inputClass}>
                  {CREATOR_DROP_CATEGORIES.map((category) => <option key={category} value={category}>{creatorDropCategoryLabel(category)}</option>)}
                </select>
              </label>
              <Field label="actionLabel" value={form.actionLabel} onChange={(value) => update('actionLabel', value)} placeholder="Open on BaseDare" />
              <Field label="rewardLabel" value={form.rewardLabel} onChange={(value) => update('rewardLabel', value)} placeholder="Free challenge · no payout promise" />
              <Field label="cityLabel" value={form.cityLabel} onChange={(value) => update('cityLabel', value)} placeholder="Siargao" />
              <label className="sm:col-span-2">
                <span className={labelClass}>creatorBrief</span>
                <textarea value={form.creatorBrief} onChange={(event) => update('creatorBrief', event.target.value)} className={textareaClass} placeholder="What the creator should film or say, in plain words." />
              </label>
              <label className="sm:col-span-2">
                <span className={labelClass}>suggestedCaption</span>
                <textarea value={form.suggestedCaption} onChange={(event) => update('suggestedCaption', event.target.value)} className={textareaClass} placeholder="Caption seed for TikTok/IG." />
              </label>
              <label className="sm:col-span-2">
                <span className={labelClass}>proofPrompt</span>
                <textarea value={form.proofPrompt} onChange={(event) => update('proofPrompt', event.target.value)} className={textareaClass} placeholder="What proof/check-in/outcome should happen later?" />
              </label>
              <label className="flex items-center gap-2 pt-3 text-xs text-white/55 sm:col-span-2">
                <input type="checkbox" checked={form.participationOwner} onChange={(event) => update('participationOwner', event.target.checked)} />
                Lock this creator as the participation owner for this target.
              </label>
            </div>
            <button disabled={saving} className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-[16px] bg-[#f5c518] px-4 text-xs font-black uppercase tracking-[0.16em] text-black shadow-[0_16px_42px_rgba(245,197,24,.18)] disabled:opacity-50">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Copy className="h-4 w-4" />}
              Create + copy /go link
            </button>
          </form>

          <div className="rounded-[28px] border border-white/10 bg-white/[0.025] p-5">
            <h2 className="flex items-center gap-2 text-xl font-black"><BarChart3 className="h-5 w-5 text-cyan-200" /> Recent creator drops</h2>
            <div className="mt-5 space-y-3">
              {!report ? (
                <p className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-sm text-white/35">Authorize to load creator drops.</p>
              ) : report.drops.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-sm text-white/35">No creator drops yet.</p>
              ) : report.drops.map((drop) => <CreatorDropCard key={drop.id} drop={drop} />)}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  className = '',
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  required?: boolean;
}) {
  return (
    <label className={className}>
      <span className={labelClass}>{label}</span>
      <input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} required={required} className={inputClass} />
    </label>
  );
}

function CreatorDropCard({ drop }: { drop: CreatorDropSummary }) {
  const url = absoluteUrl(drop.publicPath);
  const landingUrl = absoluteUrl(drop.landingPath);

  async function copy(value: string) {
    await navigator.clipboard.writeText(value).catch(() => null);
  }

  return (
    <article className="rounded-[22px] border border-white/10 bg-black/28 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#ffe36a]">@{drop.creatorCode} · {creatorDropCategoryLabel(drop.metadata.category)}</p>
          <h3 className="mt-1 text-lg font-black text-white">{drop.metadata.title}</h3>
          <p className="mt-1 max-w-xl text-xs leading-5 text-white/45">{drop.metadata.hook}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => void copy(url)} className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/[0.05]" title="Copy /go link">
            <Copy className="h-4 w-4" />
          </button>
          <button onClick={() => void copy(drop.shareText ?? url)} className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/[0.05]" title="Copy share text">
            <Share2 className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-4 gap-2 text-center">
        <Metric label="Touches" value={drop.metrics.touches} />
        <Metric label="Saves" value={drop.metrics.missionPasses} />
        <Metric label="Intents" value={drop.metrics.intents} />
        <Metric label="Verified" value={drop.metrics.verifiedCompletions} />
      </div>
      <div className="mt-3 grid gap-2 text-[11px] text-white/35 sm:grid-cols-2">
        <p><span className="text-white/55">Public:</span> {url}</p>
        <p><span className="text-white/55">Landing:</span> {landingUrl}</p>
        <p><span className="text-white/55">Action:</span> {drop.actionHref}</p>
        <p><span className="text-white/55">Target:</span> {drop.targetType}:{drop.targetId}</p>
      </div>
    </article>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-white/[0.07] bg-white/[0.035] p-2">
      <strong className="block text-lg">{value}</strong>
      <span className="text-[9px] uppercase tracking-wider text-white/30">{label}</span>
    </div>
  );
}
