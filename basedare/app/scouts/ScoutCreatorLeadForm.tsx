'use client';

import { useMemo, useState, type FormEvent } from 'react';
import { CheckCircle2, Clipboard, Loader2, Send, UserPlus } from 'lucide-react';

import {
  SCOUT_CREATOR_PLATFORM_LABELS,
  SCOUT_CREATOR_PLATFORMS,
  SCOUT_RELATIONSHIP_STRENGTH_LABELS,
  SCOUT_RELATIONSHIP_STRENGTHS,
  type ScoutCreatorPlatform,
  type ScoutRelationshipStrength,
} from '@/lib/scout-creator-leads';

type FormState = {
  scoutName: string;
  scoutHandle: string;
  scoutWallet: string;
  scoutCode: string;
  creatorHandle: string;
  creatorName: string;
  creatorPlatform: ScoutCreatorPlatform;
  creatorCity: string;
  creatorLink: string;
  relationshipStrength: ScoutRelationshipStrength;
  fitReason: string;
  notes: string;
  companyWebsite: string;
};

type ScoutCreatorLeadFormProps = {
  initialScoutCode?: string;
  initialScoutHandle?: string;
};

type SubmitResult = {
  id: string;
  scoutCode: string;
  captainInvitePath: string;
};

const inputClass =
  'w-full rounded-[18px] border border-white/10 bg-black/28 px-4 py-3 text-sm font-bold text-white outline-none transition placeholder:text-white/24 focus:border-cyan-200/40 focus:bg-black/38';
const labelClass = 'mb-2 block text-[10px] font-black uppercase tracking-[0.22em] text-white/45';

function buildInitialForm(props: ScoutCreatorLeadFormProps): FormState {
  return {
    scoutName: '',
    scoutHandle: props.initialScoutHandle || '',
    scoutWallet: '',
    scoutCode: props.initialScoutCode || '',
    creatorHandle: '',
    creatorName: '',
    creatorPlatform: 'tiktok',
    creatorCity: '',
    creatorLink: '',
    relationshipStrength: 'warm',
    fitReason: '',
    notes: '',
    companyWebsite: '',
  };
}

export default function ScoutCreatorLeadForm(props: ScoutCreatorLeadFormProps) {
  const initialForm = useMemo(() => buildInitialForm(props), [props]);
  const [form, setForm] = useState<FormState>(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setCopied(false);

    try {
      const response = await fetch('/api/scouts/creator-leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Scout lead failed');
      }
      setResult(data.data);
      setForm((current) => ({
        ...buildInitialForm({ initialScoutCode: data.data.scoutCode, initialScoutHandle: current.scoutHandle }),
        scoutName: current.scoutName,
        scoutWallet: current.scoutWallet,
      }));
    } catch (submitError: unknown) {
      setError(submitError instanceof Error ? submitError.message : 'Scout lead failed');
    } finally {
      setSubmitting(false);
    }
  }

  async function copyInvite() {
    if (!result) return;
    const inviteUrl = `${window.location.origin}${result.captainInvitePath}`;
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
  }

  if (result) {
    return (
      <section className="relative overflow-hidden rounded-[30px] border border-emerald-300/20 bg-[linear-gradient(180deg,rgba(16,185,129,0.12)_0%,rgba(8,9,17,0.94)_42%,rgba(4,5,10,0.98)_100%)] p-6 shadow-[0_28px_90px_rgba(0,0,0,0.42),inset_0_1px_0_rgba(255,255,255,0.12)] sm:p-8">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(52,211,153,0.18),transparent_34%),radial-gradient(circle_at_82%_100%,rgba(34,211,238,0.14),transparent_38%)]" />
        <div className="relative">
          <CheckCircle2 className="h-12 w-12 text-emerald-200" />
          <h2 className="mt-5 text-3xl font-black tracking-tight text-white">Scout lead routed</h2>
          <p className="mt-3 text-sm font-semibold leading-6 text-white/58">
            The creator is now in the Scout Army queue. Send them this captain link so the referral stays attached.
          </p>
          <div className="mt-4 rounded-2xl border border-white/10 bg-black/24 p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/35">Captain invite</p>
            <p className="mt-2 break-words text-sm font-bold text-cyan-100">{result.captainInvitePath}</p>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => void copyInvite()}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-cyan-300/25 bg-cyan-300/[0.1] px-4 py-3 text-xs font-black uppercase tracking-[0.16em] text-cyan-100"
            >
              <Clipboard className="h-4 w-4" />
              {copied ? 'Copied' : 'Copy link'}
            </button>
            <button
              type="button"
              onClick={() => setResult(null)}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-xs font-black uppercase tracking-[0.16em] text-white/68"
            >
              <UserPlus className="h-4 w-4" />
              Add another
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="relative overflow-hidden rounded-[30px] border border-white/[0.09] bg-[linear-gradient(180deg,rgba(255,255,255,0.07)_0%,rgba(255,255,255,0.025)_18%,rgba(9,8,18,0.94)_64%,rgba(5,5,12,0.98)_100%)] p-5 shadow-[0_28px_90px_rgba(0,0,0,0.42),inset_0_1px_0_rgba(255,255,255,0.1)] sm:p-7"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_16%_0%,rgba(245,197,24,0.13),transparent_34%),radial-gradient(circle_at_88%_24%,rgba(34,211,238,0.14),transparent_34%)]" />
      <div className="relative grid gap-5">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.26em] text-yellow-200/70">Submit a creator</p>
          <h2 className="mt-2 text-3xl font-black tracking-tight text-white">Scout Army intake</h2>
          <p className="mt-2 text-sm font-semibold leading-6 text-white/52">
            Put a creator into the queue and generate their attributed captain invite.
          </p>
        </div>

        <input
          className="hidden"
          tabIndex={-1}
          autoComplete="off"
          value={form.companyWebsite}
          onChange={(event) => setForm((current) => ({ ...current, companyWebsite: event.target.value }))}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <label>
            <span className={labelClass}>Your name</span>
            <input
              required
              className={inputClass}
              value={form.scoutName}
              onChange={(event) => setForm((current) => ({ ...current, scoutName: event.target.value }))}
              placeholder="Scout name"
            />
          </label>
          <label>
            <span className={labelClass}>Scout handle</span>
            <input
              className={inputClass}
              value={form.scoutHandle}
              onChange={(event) => setForm((current) => ({ ...current, scoutHandle: event.target.value }))}
              placeholder="@yourhandle"
            />
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-[1fr_0.8fr]">
          <label>
            <span className={labelClass}>Wallet</span>
            <input
              className={inputClass}
              value={form.scoutWallet}
              onChange={(event) => setForm((current) => ({ ...current, scoutWallet: event.target.value }))}
              placeholder="Optional until payout"
            />
          </label>
          <label>
            <span className={labelClass}>Scout code</span>
            <input
              className={inputClass}
              value={form.scoutCode}
              onChange={(event) => setForm((current) => ({ ...current, scoutCode: event.target.value }))}
              placeholder="Auto from handle"
            />
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-[1fr_0.85fr]">
          <label>
            <span className={labelClass}>Creator handle</span>
            <input
              required
              className={inputClass}
              value={form.creatorHandle}
              onChange={(event) => setForm((current) => ({ ...current, creatorHandle: event.target.value }))}
              placeholder="@creator"
            />
          </label>
          <label>
            <span className={labelClass}>Platform</span>
            <select
              className={inputClass}
              value={form.creatorPlatform}
              onChange={(event) =>
                setForm((current) => ({ ...current, creatorPlatform: event.target.value as ScoutCreatorPlatform }))
              }
            >
              {SCOUT_CREATOR_PLATFORMS.map((platform) => (
                <option key={platform} value={platform}>
                  {SCOUT_CREATOR_PLATFORM_LABELS[platform]}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label>
            <span className={labelClass}>Creator name</span>
            <input
              className={inputClass}
              value={form.creatorName}
              onChange={(event) => setForm((current) => ({ ...current, creatorName: event.target.value }))}
              placeholder="Optional"
            />
          </label>
          <label>
            <span className={labelClass}>Creator city</span>
            <input
              required
              className={inputClass}
              value={form.creatorCity}
              onChange={(event) => setForm((current) => ({ ...current, creatorCity: event.target.value }))}
              placeholder="Manila, Miami, Austin..."
            />
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-[1fr_0.8fr]">
          <label>
            <span className={labelClass}>Best content link</span>
            <input
              className={inputClass}
              value={form.creatorLink}
              onChange={(event) => setForm((current) => ({ ...current, creatorLink: event.target.value }))}
              placeholder="TikTok, Reel, YouTube, X post..."
            />
          </label>
          <label>
            <span className={labelClass}>Relationship</span>
            <select
              className={inputClass}
              value={form.relationshipStrength}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  relationshipStrength: event.target.value as ScoutRelationshipStrength,
                }))
              }
            >
              {SCOUT_RELATIONSHIP_STRENGTHS.map((strength) => (
                <option key={strength} value={strength}>
                  {SCOUT_RELATIONSHIP_STRENGTH_LABELS[strength]}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label>
          <span className={labelClass}>Why are they BaseDare material?</span>
          <textarea
            required
            className={`${inputClass} min-h-[108px] resize-none leading-6`}
            value={form.fitReason}
            onChange={(event) => setForm((current) => ({ ...current, fitReason: event.target.value }))}
            placeholder="What makes them fun, reliable, local, filmable, or useful for venue missions?"
          />
        </label>

        <label>
          <span className={labelClass}>Operator notes</span>
          <textarea
            className={`${inputClass} min-h-[88px] resize-none leading-6`}
            value={form.notes}
            onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
            placeholder="Warm intro details, venue access, availability, or payout expectations"
          />
        </label>

        {error ? (
          <div className="rounded-2xl border border-red-300/20 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-100">
            {error}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={submitting}
          className="inline-flex min-h-14 items-center justify-center gap-3 rounded-[20px] border border-yellow-200/30 bg-[linear-gradient(180deg,#ffe66f_0%,#f5c518_45%,#b97800_100%)] px-5 py-3 text-sm font-black uppercase tracking-[0.18em] text-black shadow-[0_18px_34px_rgba(245,197,24,0.22),inset_0_1px_0_rgba(255,255,255,0.6)] transition hover:-translate-y-[1px] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Route creator
        </button>
      </div>
    </form>
  );
}
