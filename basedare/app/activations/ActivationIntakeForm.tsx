'use client';

import { useState } from 'react';
import type { FormEvent } from 'react';
import { Loader2, Send } from 'lucide-react';

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
};

const inputClass =
  'w-full rounded-[18px] border border-white/10 bg-black/28 px-4 py-3 text-sm font-bold text-white outline-none transition placeholder:text-white/24 focus:border-yellow-200/40 focus:bg-black/38';
const labelClass = 'mb-2 block text-[10px] font-black uppercase tracking-[0.22em] text-white/45';

export default function ActivationIntakeForm() {
  const [form, setForm] = useState<IntakeState>(INITIAL_STATE);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateField = <Key extends keyof IntakeState>(key: Key, value: IntakeState[Key]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

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
      <div className="rounded-[30px] border border-emerald-300/18 bg-emerald-400/[0.07] p-6 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-emerald-200/22 bg-emerald-300/[0.12] text-2xl font-black text-emerald-100">
          OK
        </div>
        <h3 className="mt-4 text-2xl font-black tracking-[-0.04em] text-white">Activation signal received.</h3>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-white/58">
          We routed this into the operator loop. Next step is qualifying the city, venue, creator fit, proof target, and Spark Receipt.
        </p>
        <button
          type="button"
          onClick={() => setSubmitted(false)}
          className="mt-5 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-white/68 transition hover:bg-white/[0.08]"
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
            <option className="bg-[#080814]" value="venue">Venue / local business</option>
            <option className="bg-[#080814]" value="brand">Brand</option>
            <option className="bg-[#080814]" value="agency">Agency</option>
            <option className="bg-[#080814]" value="event">Event organizer</option>
            <option className="bg-[#080814]" value="other">Other</option>
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
            <option className="bg-[#080814]" value="500_1500">$500-$1.5k</option>
            <option className="bg-[#080814]" value="1500_5000">$1.5k-$5k</option>
            <option className="bg-[#080814]" value="5000_15000">$5k-$15k</option>
            <option className="bg-[#080814]" value="15000_plus">$15k+</option>
          </select>
        </div>
        <div>
          <label className={labelClass}>Timeline</label>
          <select
            value={form.timeline}
            onChange={(event) => updateField('timeline', event.target.value as IntakeState['timeline'])}
            className={inputClass}
          >
            <option className="bg-[#080814]" value="this_week">This week</option>
            <option className="bg-[#080814]" value="this_month">This month</option>
            <option className="bg-[#080814]" value="next_90_days">Next 90 days</option>
            <option className="bg-[#080814]" value="exploring">Exploring</option>
          </select>
        </div>
        <div>
          <label className={labelClass}>Package</label>
          <select
            value={form.packageId}
            onChange={(event) => updateField('packageId', event.target.value as IntakeState['packageId'])}
            className={inputClass}
          >
            <option className="bg-[#080814]" value="pilot-drop">Venue Spark Pilot</option>
            <option className="bg-[#080814]" value="local-signal">Always-On Spark</option>
            <option className="bg-[#080814]" value="city-takeover">Global Challenge Drop</option>
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
          <option className="bg-[#080814]" value="foot_traffic">Move people to a place</option>
          <option className="bg-[#080814]" value="ugc">Get verified creator content</option>
          <option className="bg-[#080814]" value="launch">Launch product / venue</option>
          <option className="bg-[#080814]" value="event">Drive event energy</option>
          <option className="bg-[#080814]" value="repeat_visits">Increase repeat visits</option>
          <option className="bg-[#080814]" value="other">Other</option>
        </select>
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
        <div className="rounded-2xl border border-red-300/18 bg-red-500/[0.08] px-4 py-3 text-sm font-bold text-red-100">
          {error}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={submitting}
        className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full border border-yellow-200/30 bg-[linear-gradient(180deg,rgba(250,204,21,0.95)_0%,rgba(202,138,4,0.96)_100%)] px-6 text-sm font-black uppercase tracking-[0.18em] text-black shadow-[0_16px_34px_rgba(0,0,0,0.34),inset_0_1px_0_rgba(255,255,255,0.38)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        Route activation request
      </button>
    </form>
  );
}
