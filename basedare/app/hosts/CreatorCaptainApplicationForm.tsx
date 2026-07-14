'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { ArrowRight, CheckCircle2, Loader2, Send } from 'lucide-react';

import {
  CREATOR_CAPTAIN_AVAILABILITY,
  CREATOR_CAPTAIN_AVAILABILITY_LABELS,
  CREATOR_CAPTAIN_HELP_MODES,
  CREATOR_CAPTAIN_PAYOUT_LABELS,
  CREATOR_CAPTAIN_PAYOUTS,
  type CreatorCaptainAvailability,
  type CreatorCaptainHelpMode,
  type CreatorCaptainPayout,
} from '@/lib/creator-captains';

type FormState = {
  operatorName: string;
  email: string;
  city: string;
  contactHandle: string;
  helpModes: CreatorCaptainHelpMode[];
  localExperience: string;
  supportPlan: string;
  localAccess: string;
  availability: CreatorCaptainAvailability;
  expectedPayout: CreatorCaptainPayout;
  authorizationConfirmed: boolean;
  scoutCode: string;
  referredCreatorHandle: string;
  referralSource: string;
  companyWebsite: string;
};

const INITIAL_FORM: FormState = {
  operatorName: '',
  email: '',
  city: '',
  contactHandle: '',
  helpModes: ['venue_scout', 'proof_runner'],
  localExperience: '',
  supportPlan: '',
  localAccess: '',
  availability: 'this_month',
  expectedPayout: '150_300',
  authorizationConfirmed: false,
  scoutCode: '',
  referredCreatorHandle: '',
  referralSource: '',
  companyWebsite: '',
};

const CAPABILITY_LABELS: Record<CreatorCaptainHelpMode, string> = {
  venue_scout: 'Place scout',
  warm_intro: 'Local introduction',
  qr_setup: 'Venue handshake',
  crowd_starter: 'Small gathering',
  proof_runner: 'Proof support',
  recap_runner: 'Field recap',
};

const inputClass =
  'w-full rounded-[18px] border border-white/10 bg-black/28 px-4 py-3 text-sm font-bold text-white outline-none transition placeholder:text-white/30 focus:border-cyan-200/45 focus:bg-black/38 focus-visible:ring-2 focus-visible:ring-cyan-200/35';
const labelClass = 'mb-2 block text-[11px] font-black uppercase tracking-[0.18em] text-white/58';

type LocalPartnerApplicationFormProps = {
  initialScoutCode?: string;
  initialCreatorHandle?: string;
  initialSource?: string;
};

function toggleHelpMode(current: CreatorCaptainHelpMode[], helpMode: CreatorCaptainHelpMode) {
  if (current.includes(helpMode)) {
    return current.length === 1 ? current : current.filter((item) => item !== helpMode);
  }
  return [...current, helpMode].slice(0, 4);
}

function buildInitialForm(props: LocalPartnerApplicationFormProps): FormState {
  return {
    ...INITIAL_FORM,
    contactHandle: props.initialCreatorHandle || '',
    referredCreatorHandle: props.initialCreatorHandle || '',
    scoutCode: props.initialScoutCode || '',
    referralSource: props.initialSource || (props.initialScoutCode ? 'scout-referral' : 'local-partner-page'),
  };
}

export default function CreatorCaptainApplicationForm(props: LocalPartnerApplicationFormProps) {
  const [form, setForm] = useState<FormState>(() => buildInitialForm(props));
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
        body: JSON.stringify({
          applicationKind: 'local_partner',
          creatorName: form.operatorName,
          email: form.email,
          city: form.city,
          primaryHandle: form.contactHandle,
          primaryPlatform: 'other',
          socialLinks: '',
          categories: ['travel'],
          helpModes: form.helpModes,
          audienceSize: 'under_1k',
          contentStyle: form.localExperience,
          dareIdeas: form.supportPlan,
          availability: form.availability,
          expectedPayout: form.expectedPayout,
          walletAddress: '',
          venueLead: form.localAccess,
          referralSource: form.referralSource,
          scoutCode: form.scoutCode,
          referredCreatorHandle: form.referredCreatorHandle,
          authorizationConfirmed: form.authorizationConfirmed,
          companyWebsite: form.companyWebsite,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Application failed');
      }
      setSubmittedId(data.data?.id || 'received');
      setForm(buildInitialForm(props));
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
          <h2 className="mt-5 text-3xl font-black tracking-tight text-white">Local partner application received</h2>
          <p className="mt-3 text-sm font-semibold leading-6 text-white/66">
            BaseDare will contact you when an optional route, gathering, place handshake, or local operation matches what
            you can safely support. Ordinary paid missions remain available separately on the map.
          </p>
          <p className="mt-4 rounded-2xl border border-white/10 bg-black/22 px-4 py-3 text-xs font-black uppercase tracking-[0.16em] text-white/58">
            Application ID: {submittedId}
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/map"
              className="inline-flex min-h-11 items-center gap-2 rounded-full border border-yellow-300/28 bg-yellow-300/[0.1] px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-yellow-100 transition hover:border-yellow-300/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-200/70"
            >
              Find paid missions
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <button
              type="button"
              onClick={() => setSubmittedId(null)}
              className="min-h-11 rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-white/72 transition hover:border-cyan-300/30 hover:text-cyan-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/70"
            >
              Submit another application
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
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_16%_0%,rgba(245,197,24,0.13),transparent_34%),radial-gradient(circle_at_88%_24%,rgba(168,85,247,0.16),transparent_34%)]" />
      <div className="relative grid gap-5">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-yellow-200/78">Optional operator role</p>
          <h2 className="mt-2 text-3xl font-black tracking-tight text-white">Local partner application</h2>
          <p className="mt-2 text-sm font-semibold leading-6 text-white/60">
            Tell us where you can help and what you are equipped to support. Social reach is not a requirement.
          </p>
        </div>

        {form.scoutCode ? (
          <div className="rounded-[20px] border border-cyan-300/18 bg-cyan-300/[0.06] p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-100/66">Referral attached</p>
            <p className="mt-2 text-sm font-bold leading-6 text-cyan-50/76">
              Scout code <span className="text-cyan-100">{form.scoutCode}</span> is attached to this application.
            </p>
          </div>
        ) : null}

        <input
          className="hidden"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          value={form.companyWebsite}
          onChange={(event) => setForm((current) => ({ ...current, companyWebsite: event.target.value }))}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <label>
            <span className={labelClass}>Your name</span>
            <input
              required
              autoComplete="name"
              className={inputClass}
              value={form.operatorName}
              onChange={(event) => setForm((current) => ({ ...current, operatorName: event.target.value }))}
              placeholder="Your name"
            />
          </label>
          <label>
            <span className={labelClass}>Email</span>
            <input
              required
              type="email"
              autoComplete="email"
              className={inputClass}
              value={form.email}
              onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
              placeholder="you@email.com"
            />
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-[1fr_0.8fr]">
          <label>
            <span className={labelClass}>City or area</span>
            <input
              required
              autoComplete="address-level2"
              className={inputClass}
              value={form.city}
              onChange={(event) => setForm((current) => ({ ...current, city: event.target.value }))}
              placeholder="Siargao, Manila, Miami..."
            />
          </label>
          <label>
            <span className={labelClass}>Contact handle</span>
            <input
              className={inputClass}
              value={form.contactHandle}
              onChange={(event) => setForm((current) => ({ ...current, contactHandle: event.target.value }))}
              placeholder="Optional"
            />
          </label>
        </div>

        <fieldset>
          <legend className={labelClass}>What can you support?</legend>
          <p className="-mt-1 mb-3 text-xs font-semibold leading-5 text-white/50">
            Choose up to four. Only select work you can perform safely and legitimately.
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {CREATOR_CAPTAIN_HELP_MODES.map((helpMode) => {
              const active = form.helpModes.includes(helpMode);
              return (
                <button
                  key={helpMode}
                  type="button"
                  aria-pressed={active}
                  onClick={() =>
                    setForm((current) => ({ ...current, helpModes: toggleHelpMode(current.helpModes, helpMode) }))
                  }
                  className={`min-h-12 rounded-2xl border px-3 py-2 text-center text-[11px] font-black uppercase leading-tight tracking-[0.08em] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-200/70 ${
                    active
                      ? 'border-yellow-300/35 bg-yellow-300/[0.12] text-yellow-100'
                      : 'border-white/10 bg-white/[0.035] text-white/55 hover:text-white'
                  }`}
                >
                  {CAPABILITY_LABELS[helpMode]}
                </button>
              );
            })}
          </div>
        </fieldset>

        <label>
          <span className={labelClass}>Relevant local experience</span>
          <textarea
            required
            minLength={12}
            className={`${inputClass} min-h-[108px] resize-none leading-6`}
            value={form.localExperience}
            onChange={(event) => setForm((current) => ({ ...current, localExperience: event.target.value }))}
            placeholder="Tell us what you know locally and any similar work you have handled. No follower count needed."
          />
        </label>

        <label>
          <span className={labelClass}>What could you support safely?</span>
          <textarea
            required
            minLength={12}
            className={`${inputClass} min-h-[108px] resize-none leading-6`}
            value={form.supportPlan}
            onChange={(event) => setForm((current) => ({ ...current, supportPlan: event.target.value }))}
            placeholder="For example: verify a walking route, introduce a willing venue manager, or help set up an approved place handshake."
          />
        </label>

        <label>
          <span className={labelClass}>Useful local access</span>
          <input
            className={inputClass}
            value={form.localAccess}
            onChange={(event) => setForm((current) => ({ ...current, localAccess: event.target.value }))}
            placeholder="Optional: community, venue, route, or organization you can legitimately access"
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
            <span className={labelClass}>Expected operator fee</span>
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

        <label className="flex cursor-pointer gap-3 rounded-[20px] border border-white/10 bg-black/24 p-4">
          <input
            required
            type="checkbox"
            checked={form.authorizationConfirmed}
            onChange={(event) =>
              setForm((current) => ({ ...current, authorizationConfirmed: event.target.checked }))
            }
            className="mt-1 h-5 w-5 shrink-0 accent-[#f5c518]"
          />
          <span className="text-sm font-semibold leading-6 text-white/66">
            I will only accept work I am legally authorized, permitted, and practically equipped to perform. I understand
            that applying does not guarantee paid work.
          </span>
        </label>

        {error ? (
          <div role="alert" className="rounded-2xl border border-red-300/20 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-100">
            {error}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={submitting}
          className="inline-flex min-h-14 w-full items-center justify-center gap-3 rounded-[20px] border border-yellow-200/30 bg-[linear-gradient(180deg,#ffe66f_0%,#f5c518_45%,#b97800_100%)] px-5 py-3 text-center text-sm font-black uppercase tracking-[0.12em] text-black shadow-[0_18px_34px_rgba(245,197,24,0.22),inset_0_1px_0_rgba(255,255,255,0.6)] transition hover:-translate-y-[1px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Apply as local partner
        </button>
      </div>
    </form>
  );
}
