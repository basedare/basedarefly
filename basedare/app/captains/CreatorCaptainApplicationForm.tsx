'use client';

import { useMemo, useState, type FormEvent } from 'react';
import { CheckCircle2, Loader2, Send } from 'lucide-react';

import {
  CREATOR_CAPTAIN_AUDIENCE_LABELS,
  CREATOR_CAPTAIN_AUDIENCE_SIZES,
  CREATOR_CAPTAIN_AVAILABILITY,
  CREATOR_CAPTAIN_AVAILABILITY_LABELS,
  CREATOR_CAPTAIN_CATEGORIES,
  CREATOR_CAPTAIN_CATEGORY_LABELS,
  CREATOR_CAPTAIN_PLATFORM_LABELS,
  CREATOR_CAPTAIN_PLATFORMS,
  CREATOR_CAPTAIN_PAYOUT_LABELS,
  CREATOR_CAPTAIN_PAYOUTS,
  type CreatorCaptainAudienceSize,
  type CreatorCaptainAvailability,
  type CreatorCaptainCategory,
  type CreatorCaptainPlatform,
  type CreatorCaptainPayout,
} from '@/lib/creator-captains';

type FormState = {
  creatorName: string;
  email: string;
  city: string;
  primaryHandle: string;
  primaryPlatform: CreatorCaptainPlatform;
  socialLinks: string;
  categories: CreatorCaptainCategory[];
  audienceSize: CreatorCaptainAudienceSize;
  contentStyle: string;
  dareIdeas: string;
  availability: CreatorCaptainAvailability;
  expectedPayout: CreatorCaptainPayout;
  walletAddress: string;
  venueLead: string;
  referralSource: string;
  scoutCode: string;
  referredCreatorHandle: string;
  companyWebsite: string;
};

const INITIAL_FORM: FormState = {
  creatorName: '',
  email: '',
  city: '',
  primaryHandle: '',
  primaryPlatform: 'tiktok',
  socialLinks: '',
  categories: ['nightlife'],
  audienceSize: '10k_50k',
  contentStyle: '',
  dareIdeas: '',
  availability: 'this_month',
  expectedPayout: '150_300',
  walletAddress: '',
  venueLead: '',
  referralSource: '',
  scoutCode: '',
  referredCreatorHandle: '',
  companyWebsite: '',
};

const inputClass =
  'w-full rounded-[18px] border border-white/10 bg-black/28 px-4 py-3 text-sm font-bold text-white outline-none transition placeholder:text-white/24 focus:border-cyan-200/40 focus:bg-black/38';
const labelClass = 'mb-2 block text-[10px] font-black uppercase tracking-[0.22em] text-white/45';

type CreatorCaptainApplicationFormProps = {
  initialScoutCode?: string;
  initialCreatorHandle?: string;
  initialSource?: string;
};

function toggleCategory(current: CreatorCaptainCategory[], category: CreatorCaptainCategory) {
  if (current.includes(category)) {
    return current.length === 1 ? current : current.filter((item) => item !== category);
  }
  return [...current, category].slice(0, 4);
}

function buildInitialForm(props: CreatorCaptainApplicationFormProps): FormState {
  return {
    ...INITIAL_FORM,
    primaryHandle: props.initialCreatorHandle || '',
    referredCreatorHandle: props.initialCreatorHandle || '',
    scoutCode: props.initialScoutCode || '',
    referralSource: props.initialSource || (props.initialScoutCode ? 'scout-referral' : ''),
  };
}

export default function CreatorCaptainApplicationForm(props: CreatorCaptainApplicationFormProps) {
  const { initialCreatorHandle = '', initialScoutCode = '', initialSource = '' } = props;
  const initialForm = useMemo(
    () => buildInitialForm({ initialCreatorHandle, initialScoutCode, initialSource }),
    [initialCreatorHandle, initialScoutCode, initialSource]
  );
  const [form, setForm] = useState<FormState>(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [submittedId, setSubmittedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/creator-captains', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Application failed');
      }
      setSubmittedId(data.data?.id || 'received');
      setForm(initialForm);
    } catch (submitError: unknown) {
      setError(submitError instanceof Error ? submitError.message : 'Application failed');
    } finally {
      setSubmitting(false);
    }
  }

  if (submittedId) {
    return (
      <section className="relative overflow-hidden rounded-[30px] border border-emerald-300/20 bg-[linear-gradient(180deg,rgba(16,185,129,0.12)_0%,rgba(8,9,17,0.94)_42%,rgba(4,5,10,0.98)_100%)] p-6 shadow-[0_28px_90px_rgba(0,0,0,0.42),inset_0_1px_0_rgba(255,255,255,0.12)] sm:p-8">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(52,211,153,0.18),transparent_34%),radial-gradient(circle_at_82%_100%,rgba(34,211,238,0.14),transparent_38%)]" />
        <div className="relative">
          <CheckCircle2 className="h-12 w-12 text-emerald-200" />
          <h2 className="mt-5 text-3xl font-black tracking-tight text-white">Application routed</h2>
          <p className="mt-3 text-sm font-semibold leading-6 text-white/58">
            Your Dare Captain application is in the operator queue. If it fits the first creator squad,
            BaseDare will route you toward a pilot mission or follow-up.
          </p>
          <p className="mt-4 rounded-2xl border border-white/10 bg-black/22 px-4 py-3 text-xs font-black uppercase tracking-[0.18em] text-white/50">
            Application ID: {submittedId}
          </p>
          <button
            type="button"
            onClick={() => setSubmittedId(null)}
            className="mt-5 rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-white/70 transition hover:border-cyan-300/30 hover:text-cyan-100"
          >
            Submit another creator
          </button>
        </div>
      </section>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="relative overflow-hidden rounded-[30px] border border-white/[0.09] bg-[linear-gradient(180deg,rgba(255,255,255,0.07)_0%,rgba(255,255,255,0.025)_18%,rgba(9,8,18,0.94)_64%,rgba(5,5,12,0.98)_100%)] p-5 shadow-[0_28px_90px_rgba(0,0,0,0.42),inset_0_1px_0_rgba(255,255,255,0.1)] sm:p-7"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_16%_0%,rgba(245,197,24,0.13),transparent_34%),radial-gradient(circle_at_88%_24%,rgba(168,85,247,0.16),transparent_34%)]" />
      <div className="relative grid gap-5">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.26em] text-yellow-200/70">Apply</p>
          <h2 className="mt-2 text-3xl font-black tracking-tight text-white">Founding Dare Captain</h2>
          <p className="mt-2 text-sm font-semibold leading-6 text-white/52">
            Tell us where you create, what you would actually do, and which venue lane you can unlock.
          </p>
        </div>

        {form.scoutCode ? (
          <div className="rounded-[20px] border border-cyan-300/18 bg-cyan-300/[0.06] p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-100/58">
              Scout referral attached
            </p>
            <p className="mt-2 text-sm font-bold leading-6 text-cyan-50/72">
              Scout code <span className="text-cyan-100">{form.scoutCode}</span>
              {form.referredCreatorHandle ? ` routed this captain invite for ${form.referredCreatorHandle}.` : ' routed this captain invite.'}
            </p>
          </div>
        ) : null}

        <input
          className="hidden"
          tabIndex={-1}
          autoComplete="off"
          value={form.companyWebsite}
          onChange={(event) => setForm((current) => ({ ...current, companyWebsite: event.target.value }))}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <label>
            <span className={labelClass}>Creator name</span>
            <input
              required
              className={inputClass}
              value={form.creatorName}
              onChange={(event) => setForm((current) => ({ ...current, creatorName: event.target.value }))}
              placeholder="Your name"
            />
          </label>
          <label>
            <span className={labelClass}>Email</span>
            <input
              required
              type="email"
              className={inputClass}
              value={form.email}
              onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
              placeholder="you@email.com"
            />
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-[1fr_0.78fr]">
          <label>
            <span className={labelClass}>Primary handle</span>
            <input
              required
              className={inputClass}
              value={form.primaryHandle}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  primaryHandle: event.target.value,
                  referredCreatorHandle: current.referredCreatorHandle || event.target.value,
                }))
              }
              placeholder="@handle"
            />
          </label>
          <label>
            <span className={labelClass}>Main platform</span>
            <select
              className={inputClass}
              value={form.primaryPlatform}
              onChange={(event) =>
                setForm((current) => ({ ...current, primaryPlatform: event.target.value as CreatorCaptainPlatform }))
              }
            >
              {CREATOR_CAPTAIN_PLATFORMS.map((platform) => (
                <option key={platform} value={platform}>
                  {CREATOR_CAPTAIN_PLATFORM_LABELS[platform]}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label>
            <span className={labelClass}>City</span>
            <input
              required
              className={inputClass}
              value={form.city}
              onChange={(event) => setForm((current) => ({ ...current, city: event.target.value }))}
              placeholder="Manila, Miami, Austin..."
            />
          </label>
          <label>
            <span className={labelClass}>Audience</span>
            <select
              className={inputClass}
              value={form.audienceSize}
              onChange={(event) =>
                setForm((current) => ({ ...current, audienceSize: event.target.value as CreatorCaptainAudienceSize }))
              }
            >
              {CREATOR_CAPTAIN_AUDIENCE_SIZES.map((size) => (
                <option key={size} value={size}>
                  {CREATOR_CAPTAIN_AUDIENCE_LABELS[size]}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label>
          <span className={labelClass}>Creator lane</span>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {CREATOR_CAPTAIN_CATEGORIES.map((category) => {
              const active = form.categories.includes(category);
              return (
                <button
                  key={category}
                  type="button"
                  onClick={() =>
                    setForm((current) => ({ ...current, categories: toggleCategory(current.categories, category) }))
                  }
                  className={`rounded-2xl border px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] transition ${
                    active
                      ? 'border-cyan-300/35 bg-cyan-300/[0.12] text-cyan-100'
                      : 'border-white/10 bg-white/[0.035] text-white/42 hover:text-white'
                  }`}
                >
                  {CREATOR_CAPTAIN_CATEGORY_LABELS[category]}
                </button>
              );
            })}
          </div>
        </label>

        <label>
          <span className={labelClass}>Other social links</span>
          <input
            className={inputClass}
            value={form.socialLinks}
            onChange={(event) => setForm((current) => ({ ...current, socialLinks: event.target.value }))}
            placeholder="TikTok, Instagram, YouTube, X..."
          />
        </label>

        <label>
          <span className={labelClass}>What kind of content do you actually make?</span>
          <textarea
            required
            className={`${inputClass} min-h-[108px] resize-none leading-6`}
            value={form.contentStyle}
            onChange={(event) => setForm((current) => ({ ...current, contentStyle: event.target.value }))}
            placeholder="Nightlife clips, street interviews, food missions, challenges, travel finds..."
          />
        </label>

        <label>
          <span className={labelClass}>What dares would you actually do?</span>
          <textarea
            required
            className={`${inputClass} min-h-[108px] resize-none leading-6`}
            value={form.dareIdeas}
            onChange={(event) => setForm((current) => ({ ...current, dareIdeas: event.target.value }))}
            placeholder="Give us 2-3 missions that would be fun, filmable, and safe to verify."
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label>
            <span className={labelClass}>Availability</span>
            <select
              className={inputClass}
              value={form.availability}
              onChange={(event) =>
                setForm((current) => ({ ...current, availability: event.target.value as CreatorCaptainAvailability }))
              }
            >
              {CREATOR_CAPTAIN_AVAILABILITY.map((value) => (
                <option key={value} value={value}>
                  {CREATOR_CAPTAIN_AVAILABILITY_LABELS[value]}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className={labelClass}>Expected mission payout</span>
            <select
              className={inputClass}
              value={form.expectedPayout}
              onChange={(event) =>
                setForm((current) => ({ ...current, expectedPayout: event.target.value as CreatorCaptainPayout }))
              }
            >
              {CREATOR_CAPTAIN_PAYOUTS.map((value) => (
                <option key={value} value={value}>
                  {CREATOR_CAPTAIN_PAYOUT_LABELS[value]}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label>
          <span className={labelClass}>Venue you could activate</span>
          <input
            className={inputClass}
            value={form.venueLead}
            onChange={(event) => setForm((current) => ({ ...current, venueLead: event.target.value }))}
            placeholder="A bar, beach club, gym, food spot, event, or city place you know"
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label>
            <span className={labelClass}>Wallet address</span>
            <input
              className={inputClass}
              value={form.walletAddress}
              onChange={(event) => setForm((current) => ({ ...current, walletAddress: event.target.value }))}
              placeholder="Optional for now"
            />
          </label>
          <label>
            <span className={labelClass}>Referral source</span>
            <input
              className={inputClass}
              value={form.referralSource}
              onChange={(event) => setForm((current) => ({ ...current, referralSource: event.target.value }))}
              placeholder="Scout, X, friend, venue, Base..."
            />
          </label>
        </div>

        <input type="hidden" value={form.scoutCode} name="scoutCode" />
        <input type="hidden" value={form.referredCreatorHandle} name="referredCreatorHandle" />

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
          Apply as captain
        </button>
      </div>
    </form>
  );
}
