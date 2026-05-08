'use client';

import { useState, type FormEvent } from 'react';
import { ArrowRight, CheckCircle2, Loader2, Send } from 'lucide-react';

type MissionPitch = {
  headline: string;
  buyerPitch: string;
  outreachDraft: string;
  activationHref: string;
  receiptBullets: string[];
};

type CaptainMissionProofFormProps = {
  token: string;
  creatorHandle: string;
  creatorCity: string;
};

type FormState = {
  creatorHandle: string;
  bestVenueName: string;
  city: string;
  venueAddress: string;
  venueWebsite: string;
  venueInstagram: string;
  proofLinks: string;
  whyGoodFit: string;
  momentDescription: string;
  perkIdea: string;
  ownerIntroStatus: 'none' | 'can_intro' | 'owner_knows_me' | 'already_contacted';
  alternateVenues: string;
  safetyAccepted: boolean;
  companyWebsite: string;
};

const inputClass =
  'w-full rounded-[18px] border border-white/10 bg-black/30 px-4 py-3 text-sm font-bold text-white outline-none transition placeholder:text-white/24 focus:border-cyan-200/38 focus:bg-black/42';
const labelClass = 'mb-2 block text-[10px] font-black uppercase tracking-[0.22em] text-white/42';

export default function CaptainMissionProofForm({
  token,
  creatorHandle,
  creatorCity,
}: CaptainMissionProofFormProps) {
  const [form, setForm] = useState<FormState>({
    creatorHandle,
    bestVenueName: '',
    city: creatorCity,
    venueAddress: '',
    venueWebsite: '',
    venueInstagram: '',
    proofLinks: '',
    whyGoodFit: '',
    momentDescription: '',
    perkIdea: '',
    ownerIntroStatus: 'none',
    alternateVenues: '',
    safetyAccepted: false,
    companyWebsite: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pitch, setPitch] = useState<MissionPitch | null>(null);

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/captain-missions/${encodeURIComponent(token)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Mission proof failed');
      }
      setPitch(data.data.mission.pitchPacket);
    } catch (submitError: unknown) {
      setError(submitError instanceof Error ? submitError.message : 'Mission proof failed');
    } finally {
      setSubmitting(false);
    }
  }

  if (pitch) {
    return (
      <section className="relative overflow-hidden rounded-[30px] border border-emerald-300/20 bg-[linear-gradient(180deg,rgba(16,185,129,0.13)_0%,rgba(8,9,17,0.94)_48%,rgba(5,5,12,0.98)_100%)] p-5 shadow-[0_28px_90px_rgba(0,0,0,0.42),inset_0_1px_0_rgba(255,255,255,0.12)] sm:p-7">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_0%,rgba(52,211,153,0.2),transparent_34%),radial-gradient(circle_at_84%_100%,rgba(34,211,238,0.13),transparent_38%)]" />
        <div className="relative">
          <CheckCircle2 className="h-12 w-12 text-emerald-200" />
          <p className="mt-5 text-[11px] font-black uppercase tracking-[0.24em] text-emerald-100/64">
            Proof routed
          </p>
          <h2 className="mt-2 text-3xl font-black tracking-tight text-white">{pitch.headline}</h2>
          <div className="mt-5 rounded-[22px] border border-white/10 bg-black/28 p-4">
            <p className="whitespace-pre-wrap text-sm font-semibold leading-6 text-white/66">{pitch.buyerPitch}</p>
          </div>
          <a
            href={pitch.activationHref}
            className="mt-5 inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-yellow-300/25 bg-yellow-300/[0.12] px-5 py-3 text-xs font-black uppercase tracking-[0.16em] text-yellow-100"
          >
            Open First Spark route
            <ArrowRight className="h-4 w-4" />
          </a>
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
          <p className="text-[11px] font-black uppercase tracking-[0.26em] text-yellow-200/70">Venue proof</p>
          <h2 className="mt-2 text-3xl font-black tracking-tight text-white">Submit the best venue</h2>
        </div>

        <input
          className="hidden"
          tabIndex={-1}
          autoComplete="off"
          value={form.companyWebsite}
          onChange={(event) => updateField('companyWebsite', event.target.value)}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <label>
            <span className={labelClass}>Creator handle</span>
            <input
              className={inputClass}
              value={form.creatorHandle}
              onChange={(event) => updateField('creatorHandle', event.target.value)}
              placeholder="@creator"
            />
          </label>
          <label>
            <span className={labelClass}>City</span>
            <input
              required
              className={inputClass}
              value={form.city}
              onChange={(event) => updateField('city', event.target.value)}
              placeholder="City"
            />
          </label>
        </div>

        <label>
          <span className={labelClass}>Best venue</span>
          <input
            required
            className={inputClass}
            value={form.bestVenueName}
            onChange={(event) => updateField('bestVenueName', event.target.value)}
            placeholder="Venue name"
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-3">
          <label>
            <span className={labelClass}>Address</span>
            <input
              className={inputClass}
              value={form.venueAddress}
              onChange={(event) => updateField('venueAddress', event.target.value)}
              placeholder="Optional"
            />
          </label>
          <label>
            <span className={labelClass}>Website</span>
            <input
              className={inputClass}
              value={form.venueWebsite}
              onChange={(event) => updateField('venueWebsite', event.target.value)}
              placeholder="https://"
            />
          </label>
          <label>
            <span className={labelClass}>Instagram</span>
            <input
              className={inputClass}
              value={form.venueInstagram}
              onChange={(event) => updateField('venueInstagram', event.target.value)}
              placeholder="@venue or URL"
            />
          </label>
        </div>

        <label>
          <span className={labelClass}>Proof links</span>
          <textarea
            required
            className={`${inputClass} min-h-[108px] resize-none leading-6`}
            value={form.proofLinks}
            onChange={(event) => updateField('proofLinks', event.target.value)}
            placeholder="Paste clip/photo links, one per line"
          />
        </label>

        <label>
          <span className={labelClass}>Why this venue fits</span>
          <textarea
            required
            className={`${inputClass} min-h-[108px] resize-none leading-6`}
            value={form.whyGoodFit}
            onChange={(event) => updateField('whyGoodFit', event.target.value)}
            placeholder="Local energy, crowd, niche, timing, visual proof angle"
          />
        </label>

        <label>
          <span className={labelClass}>Mission moment</span>
          <textarea
            required
            className={`${inputClass} min-h-[92px] resize-none leading-6`}
            value={form.momentDescription}
            onChange={(event) => updateField('momentDescription', event.target.value)}
            placeholder="What would you film, scan, prove, or invite people to do here?"
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-[1fr_0.8fr]">
          <label>
            <span className={labelClass}>Venue perk idea</span>
            <input
              className={inputClass}
              value={form.perkIdea}
              onChange={(event) => updateField('perkIdea', event.target.value)}
              placeholder="Drink, table, merch, discount, ticket"
            />
          </label>
          <label>
            <span className={labelClass}>Intro status</span>
            <select
              className={inputClass}
              value={form.ownerIntroStatus}
              onChange={(event) => updateField('ownerIntroStatus', event.target.value as FormState['ownerIntroStatus'])}
            >
              <option value="none">No intro yet</option>
              <option value="can_intro">Can make intro</option>
              <option value="owner_knows_me">Owner knows me</option>
              <option value="already_contacted">Already contacted</option>
            </select>
          </label>
        </div>

        <label>
          <span className={labelClass}>Other venues scouted</span>
          <textarea
            className={`${inputClass} min-h-[82px] resize-none leading-6`}
            value={form.alternateVenues}
            onChange={(event) => updateField('alternateVenues', event.target.value)}
            placeholder="Optional: the other 2 venues and why they ranked lower"
          />
        </label>

        <label className="flex gap-3 rounded-[20px] border border-cyan-300/15 bg-cyan-300/[0.06] p-4 text-sm font-bold leading-6 text-cyan-50/70">
          <input
            type="checkbox"
            checked={form.safetyAccepted}
            onChange={(event) => updateField('safetyAccepted', event.target.checked)}
            className="mt-1 h-4 w-4 shrink-0 accent-cyan-300"
          />
          No reckless dares, no harassment, no private-customer filming without permission, truthful claims only.
        </label>

        {error ? (
          <div className="rounded-2xl border border-red-300/20 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-100">
            {error}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={submitting}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-yellow-300/25 bg-yellow-300/[0.12] px-5 py-3 text-xs font-black uppercase tracking-[0.16em] text-yellow-100 disabled:opacity-50"
        >
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Submit proof
        </button>
      </div>
    </form>
  );
}
