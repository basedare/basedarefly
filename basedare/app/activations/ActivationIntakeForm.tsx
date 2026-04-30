'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Loader2, Send, Sparkles } from 'lucide-react';
import { buildActivationStoryBrief, type ActivationBrandMemoryInput } from '@/lib/activation-brand-memory';

type IntakeState = {
  company: string;
  contactName: string;
  email: string;
  buyerType: 'venue' | 'brand' | 'agency' | 'event' | 'other';
  city: string;
  venue: string;
  budgetRange: '500_1500' | '1500_5000' | '5000_15000' | '15000_plus';
  timeline: 'this_week' | 'this_month' | 'next_90_days' | 'exploring';
  goal: 'foot_traffic' | 'ugc' | 'launch' | 'event' | 'repeat_visits' | 'other';
  packageId: 'pilot-drop' | 'local-signal' | 'city-takeover';
  website: string;
  notes: string;
  companyWebsite: string;
  brandMemory: Required<ActivationBrandMemoryInput>;
};

const INITIAL_STATE: IntakeState = {
  company: '',
  contactName: '',
  email: '',
  buyerType: 'venue',
  city: '',
  venue: '',
  budgetRange: '1500_5000',
  timeline: 'this_month',
  goal: 'foot_traffic',
  packageId: 'local-signal',
  website: '',
  notes: '',
  companyWebsite: '',
  brandMemory: {
    originStory: '',
    audience: '',
    vibe: '',
    avoid: '',
    rituals: '',
    desiredFeeling: '',
  },
};

const inputClass =
  'w-full rounded-[14px] border border-zinc-200 bg-white px-4 py-3 text-sm font-bold text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-zinc-500 focus:bg-white';
const labelClass = 'mb-2 block text-[10px] font-black uppercase tracking-[0.22em] text-zinc-500';

type ActivationIntakeFormProps = {
  routedCreator?: string | null;
};

export default function ActivationIntakeForm({ routedCreator }: ActivationIntakeFormProps) {
  const [form, setForm] = useState<IntakeState>(INITIAL_STATE);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const routedCreatorRef = useRef<string | null>(null);

  useEffect(() => {
    if (!routedCreator) return;

    const normalizedCreator = routedCreator.startsWith('@') ? routedCreator : `@${routedCreator}`;
    if (routedCreatorRef.current === normalizedCreator) return;

    routedCreatorRef.current = normalizedCreator;
    setForm((current) => {
      if (current.notes.includes(normalizedCreator)) return current;

      return {
        ...current,
        notes: [
          current.notes.trim(),
          `Preferred creator: ${normalizedCreator}`,
          'Source: Creator Radar',
        ]
          .filter(Boolean)
          .join('\n'),
      };
    });
  }, [routedCreator]);

  const updateField = <Key extends keyof IntakeState>(key: Key, value: IntakeState[Key]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const updateBrandMemory = <Key extends keyof IntakeState['brandMemory']>(
    key: Key,
    value: IntakeState['brandMemory'][Key]
  ) => {
    setForm((current) => ({
      ...current,
      brandMemory: {
        ...current.brandMemory,
        [key]: value,
      },
    }));
  };

  const storyBrief = useMemo(() => buildActivationStoryBrief(form), [form]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/activation-intake', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(form),
      });
      const payload = await response.json();

      if (!response.ok || !payload.success) {
        throw new Error(payload.error || 'Failed to route activation request');
      }

      setSubmitted(true);
      setForm(INITIAL_STATE);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Failed to route activation request');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="rounded-[24px] border border-zinc-200 bg-white p-6 text-center shadow-[0_18px_50px_rgba(12,12,16,0.06)]">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-zinc-300 bg-zinc-100 text-2xl font-black text-zinc-800">
          OK
        </div>
        <h3 className="mt-4 text-2xl font-black tracking-[-0.04em] text-zinc-950">Activation signal received.</h3>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-zinc-600">
          We routed this into the operator loop. Next step is qualifying the city, venue, creator fit, proof target, and Spark Receipt.
        </p>
        <button
          type="button"
          onClick={() => setSubmitted(false)}
          className="mt-5 rounded-xl border border-zinc-300 bg-white px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-zinc-700 transition hover:border-zinc-400"
        >
          Submit another
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass}>Company / venue</label>
          <input
            required
            value={form.company}
            onChange={(event) => updateField('company', event.target.value)}
            className={inputClass}
            placeholder="Hideaway, Red Bull, event name"
          />
        </div>
        <div>
          <label className={labelClass}>Contact name</label>
          <input
            required
            value={form.contactName}
            onChange={(event) => updateField('contactName', event.target.value)}
            className={inputClass}
            placeholder="Your name"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass}>Work email</label>
          <input
            required
            type="email"
            value={form.email}
            onChange={(event) => updateField('email', event.target.value)}
            className={inputClass}
            placeholder="you@company.com"
          />
        </div>
        <div>
          <label className={labelClass}>Website / social</label>
          <input
            value={form.website}
            onChange={(event) => updateField('website', event.target.value)}
            className={inputClass}
            placeholder="https://..."
          />
        </div>
      </div>

      <input
        tabIndex={-1}
        autoComplete="off"
        value={form.companyWebsite}
        onChange={(event) => updateField('companyWebsite', event.target.value)}
        className="hidden"
        aria-hidden="true"
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass}>Buyer type</label>
          <select
            value={form.buyerType}
            onChange={(event) => updateField('buyerType', event.target.value as IntakeState['buyerType'])}
            className={inputClass}
          >
            <option className="bg-white" value="venue">Venue / local business</option>
            <option className="bg-white" value="brand">Brand</option>
            <option className="bg-white" value="agency">Agency</option>
            <option className="bg-white" value="event">Event organizer</option>
            <option className="bg-white" value="other">Other</option>
          </select>
        </div>
        <div>
          <label className={labelClass}>City</label>
          <input
            required
            value={form.city}
            onChange={(event) => updateField('city', event.target.value)}
            className={inputClass}
            placeholder="Siargao, London, NYC, Sydney"
          />
        </div>
      </div>

      <div>
        <label className={labelClass}>Target venue or event</label>
        <input
          value={form.venue}
          onChange={(event) => updateField('venue', event.target.value)}
          className={inputClass}
          placeholder="Specific venue, event, district, or leave open"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className={labelClass}>Budget range</label>
          <select
            value={form.budgetRange}
            onChange={(event) => updateField('budgetRange', event.target.value as IntakeState['budgetRange'])}
            className={inputClass}
          >
            <option className="bg-white" value="500_1500">$500-$1.5k</option>
            <option className="bg-white" value="1500_5000">$1.5k-$5k</option>
            <option className="bg-white" value="5000_15000">$5k-$15k</option>
            <option className="bg-white" value="15000_plus">$15k+</option>
          </select>
        </div>
        <div>
          <label className={labelClass}>Timeline</label>
          <select
            value={form.timeline}
            onChange={(event) => updateField('timeline', event.target.value as IntakeState['timeline'])}
            className={inputClass}
          >
            <option className="bg-white" value="this_week">This week</option>
            <option className="bg-white" value="this_month">This month</option>
            <option className="bg-white" value="next_90_days">Next 90 days</option>
            <option className="bg-white" value="exploring">Exploring</option>
          </select>
        </div>
        <div>
          <label className={labelClass}>Package</label>
          <select
            value={form.packageId}
            onChange={(event) => updateField('packageId', event.target.value as IntakeState['packageId'])}
            className={inputClass}
          >
            <option className="bg-white" value="pilot-drop">Venue Spark Pilot</option>
            <option className="bg-white" value="local-signal">Always-On Spark</option>
            <option className="bg-white" value="city-takeover">Global Challenge Drop</option>
          </select>
        </div>
      </div>

      <div>
        <label className={labelClass}>Primary goal</label>
        <select
          value={form.goal}
          onChange={(event) => updateField('goal', event.target.value as IntakeState['goal'])}
          className={inputClass}
        >
          <option className="bg-white" value="foot_traffic">Move people to a place</option>
          <option className="bg-white" value="ugc">Get verified creator content</option>
          <option className="bg-white" value="launch">Launch product / venue</option>
          <option className="bg-white" value="event">Drive event energy</option>
          <option className="bg-white" value="repeat_visits">Increase repeat visits</option>
          <option className="bg-white" value="other">Other</option>
        </select>
      </div>

      <div className="rounded-[24px] border border-zinc-200 bg-zinc-50/86 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.78)] sm:p-5">
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-zinc-300 bg-white text-zinc-700">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-zinc-500">Brand Memory</p>
            <p className="mt-1 text-sm leading-6 text-zinc-600">
              Give the activation a human story. AI proposes the brief, humans approve it, creators perform it, and the Grid remembers.
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className={labelClass}>Origin / positioning</label>
            <textarea
              value={form.brandMemory.originStory}
              onChange={(event) => updateBrandMemory('originStory', event.target.value)}
              className={`${inputClass} min-h-24 resize-none leading-6`}
              placeholder="What should people understand about this venue or brand that generic UGC would miss?"
            />
          </div>
          <div>
            <label className={labelClass}>Audience / tribe</label>
            <input
              value={form.brandMemory.audience}
              onChange={(event) => updateBrandMemory('audience', event.target.value)}
              className={inputClass}
              placeholder="surfers, founders, food obsessives, night crowd"
            />
          </div>
          <div>
            <label className={labelClass}>Vibe words</label>
            <input
              value={form.brandMemory.vibe}
              onChange={(event) => updateBrandMemory('vibe', event.target.value)}
              className={inputClass}
              placeholder="warm, rebellious, premium, island, chaotic"
            />
          </div>
          <div>
            <label className={labelClass}>Signature rituals / products</label>
            <input
              value={form.brandMemory.rituals}
              onChange={(event) => updateBrandMemory('rituals', event.target.value)}
              className={inputClass}
              placeholder="sunset shot, secret menu, surf check, first drink"
            />
          </div>
          <div>
            <label className={labelClass}>What to avoid</label>
            <input
              value={form.brandMemory.avoid}
              onChange={(event) => updateBrandMemory('avoid', event.target.value)}
              className={inputClass}
              placeholder="tourist cliches, cheap stunts, cold AI captions"
            />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Feeling to create</label>
            <input
              value={form.brandMemory.desiredFeeling}
              onChange={(event) => updateBrandMemory('desiredFeeling', event.target.value)}
              className={inputClass}
              placeholder="People should feel like they discovered a place worth returning to."
            />
          </div>
        </div>

        <div className="mt-4 rounded-[18px] border border-zinc-200 bg-white p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.82)]">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-500">Activation brief preview</p>
          <p className="mt-2 text-sm font-black leading-6 text-zinc-950">{storyBrief.positioningLine}</p>
          <p className="mt-2 text-xs leading-5 text-zinc-600">{storyBrief.creatorBrief}</p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <div className="rounded-[16px] border border-zinc-200 bg-zinc-50 p-3">
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500">Proof logic</p>
              <p className="mt-2 text-xs leading-5 text-zinc-600">{storyBrief.proofLogic}</p>
            </div>
            <div className="rounded-[16px] border border-zinc-200 bg-zinc-50 p-3">
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500">Repeat trigger</p>
              <p className="mt-2 text-xs leading-5 text-zinc-600">{storyBrief.repeatMetric}</p>
            </div>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            {storyBrief.missionIdeas.map((mission) => (
              <div key={mission.title} className="rounded-[16px] border border-zinc-200 bg-zinc-50 p-3">
                <p className="text-xs font-black text-zinc-950">{mission.title}</p>
                <p className="mt-2 text-xs leading-5 text-zinc-600">{mission.detail}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {storyBrief.proofChecklist.slice(0, 4).map((item) => (
              <span
                key={item}
                className="rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.14em] text-zinc-500"
              >
                {item}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div>
        <label className={labelClass}>What should the activation prove?</label>
        <textarea
          value={form.notes}
          onChange={(event) => updateField('notes', event.target.value)}
          className={`${inputClass} min-h-32 resize-none leading-6`}
          placeholder="Example: We want creators to visit this week, scan in, post proof, and show whether BaseDare can move real venue activity."
        />
      </div>

      {error ? (
        <div className="rounded-2xl border border-zinc-400 bg-zinc-100 px-4 py-3 text-sm font-bold text-zinc-900">
          {error}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={submitting}
        className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-zinc-950 px-5 text-sm font-black uppercase tracking-[0.12em] text-white shadow-[0_18px_34px_rgba(15,23,42,0.18)] transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <span className="flex items-center justify-center gap-2 text-[0.76rem] font-black uppercase tracking-[0.1em] sm:text-[0.82rem]">
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          {submitting ? 'Routing request' : 'Route activation request'}
        </span>
      </button>
    </form>
  );
}
