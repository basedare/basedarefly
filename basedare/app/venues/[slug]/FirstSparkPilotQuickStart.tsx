'use client';

import Link from 'next/link';
import { useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { ArrowRight, CheckCircle2, Loader2, Send, Sparkles } from 'lucide-react';

import {
  getActivationFunnelAttribution,
  getActivationFunnelSessionKey,
  trackActivationFunnelEvent,
} from '@/lib/activation-funnel-client';

type PilotTimeline = 'this_week' | 'this_month';

type FirstSparkPilotQuickStartProps = {
  venueId: string;
  venueSlug: string;
  venueName: string;
  city: string | null;
  fullIntakeHref: string;
  className?: string;
};

type QuickStartForm = {
  contactName: string;
  email: string;
  perk: string;
  timeline: PilotTimeline;
  website: string;
  companyWebsite: string;
};

const INITIAL_FORM: QuickStartForm = {
  contactName: '',
  email: '',
  perk: '',
  timeline: 'this_week',
  website: '',
  companyWebsite: '',
};

const inputClass =
  'w-full rounded-[16px] border border-white/10 bg-black/28 px-3.5 py-2.5 text-sm font-bold text-white outline-none transition placeholder:text-white/24 focus:border-[#f5c518]/42 focus:bg-black/38';
const labelClass = 'mb-1.5 block text-[9px] font-black uppercase tracking-[0.2em] text-white/38';

export default function FirstSparkPilotQuickStart({
  venueId,
  venueSlug,
  venueName,
  city,
  fullIntakeHref,
  className = '',
}: FirstSparkPilotQuickStartProps) {
  const [form, setForm] = useState<QuickStartForm>(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [submittedId, setSubmittedId] = useState<string | null>(null);
  const [submittedCloseRoomHref, setSubmittedCloseRoomHref] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const startTrackedRef = useRef(false);
  const cityLabel = (city?.trim() || 'Local venue').slice(0, 140);
  const intakeCompanyName = venueName.slice(0, 140);
  const intakeVenueName = venueName.slice(0, 180);
  const routeAttribution = useMemo(
    () => ({
      source: 'venue-quick-start',
      routedSource: 'venue-quick-start',
      venueId,
      venueSlug,
      venueName,
      packageId: 'pilot-drop',
      budgetRange: '500_1500',
      goal: 'foot_traffic',
      buyerType: 'venue',
      offerId: 'first-spark',
    }),
    [venueId, venueName, venueSlug]
  );

  const trackStart = () => {
    if (startTrackedRef.current) return;
    startTrackedRef.current = true;
    void trackActivationFunnelEvent({
      eventType: 'ACTIVATION_FORM_START',
      target: 'first-spark-quick-start',
      channel: 'venue-page',
      attribution: routeAttribution,
      metadata: {
        quickStart: true,
      },
    });
  };

  const updateField = <Key extends keyof QuickStartForm>(key: Key, value: QuickStartForm[Key]) => {
    trackStart();
    setForm((current) => ({ ...current, [key]: value }));
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const perk = form.perk.trim();
    const contactName = form.contactName.trim();
    const email = form.email.trim().toLowerCase();
    const website = form.website.trim();

    try {
      void trackActivationFunnelEvent({
        eventType: 'ACTIVATION_FORM_SUBMIT',
        target: 'first-spark-quick-start',
        channel: 'venue-page',
        attribution: routeAttribution,
        metadata: {
          quickStart: true,
          hasPerk: Boolean(perk),
        },
      });

      const notes = [
        'First Spark quick approval.',
        `Venue perk or reward: ${perk.slice(0, 240)}`,
        'Offer: BaseDare sets up the venue page, creator mission, QR/check-in proof path, and recap.',
        'Risk reversal: if no verified proof lands, review and rerun the operator route.',
        `Preferred timing: ${form.timeline === 'this_week' ? 'this week' : 'this month'}.`,
        'Source: venue quick-start form.',
      ].join('\n');

      const response = await fetch('/api/activation-intake', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          company: intakeCompanyName,
          contactName,
          email,
          buyerType: 'venue',
          city: cityLabel,
          venue: intakeVenueName,
          budgetRange: '500_1500',
          timeline: form.timeline,
          goal: 'foot_traffic',
          packageId: 'pilot-drop',
          website,
          notes,
          companyWebsite: form.companyWebsite,
          routedVenueId: venueId,
          routedVenueSlug: venueSlug,
          routedSource: 'venue-quick-start',
          offerId: 'first-spark',
          funnelSessionKey: getActivationFunnelSessionKey(),
          activationAttribution: getActivationFunnelAttribution(routeAttribution),
          brandMemory: {
            originStory: `${venueName} wants to test whether BaseDare can move verified creator activity into the venue.`,
            audience: 'local customers, visiting creators, and venue regulars',
            vibe: 'live, social, proof-backed',
            avoid: 'generic ad buy, vague influencer post, no-show activation',
            rituals: perk,
            desiredFeeling: 'People should feel like they found a live venue worth showing up for.',
          },
        }),
      });
      const payload = (await response.json().catch(() => null)) as
        | {
            success?: boolean;
            error?: string;
            data?: { id?: string; closeRoomHref?: string };
          }
        | null;

      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || 'Could not route the pilot yet.');
      }

      setSubmittedId(payload.data?.id || 'received');
      setSubmittedCloseRoomHref(payload.data?.closeRoomHref || null);
      setForm(INITIAL_FORM);
      startTrackedRef.current = false;
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Could not route the pilot yet.');
    } finally {
      setSubmitting(false);
    }
  };

  if (submittedId) {
    return (
      <div className={`${className} px-4 py-4`}>
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-[16px] border border-emerald-200/20 bg-emerald-300/[0.1] text-emerald-100">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-100/72">Pilot routed</p>
            <p className="mt-1.5 text-lg font-black text-white">BaseDare has the first route.</p>
          </div>
        </div>
        <p className="mt-3 text-xs leading-5 text-white/56">
          {submittedCloseRoomHref
            ? 'The buyer close room is ready with the venue, offer, perk, proof path, and payment reference attached.'
            : 'This landed in the activation operator queue with the venue, offer, perk, and proof path attached.'}
        </p>
        <p className="mt-3 rounded-[16px] border border-emerald-200/12 bg-emerald-300/[0.06] px-3 py-2 text-[9px] font-black uppercase tracking-[0.14em] text-emerald-100/70">
          Ref: {submittedId}
        </p>
        <div className="mt-3 grid gap-2">
          {submittedCloseRoomHref ? (
            <Link
              href={submittedCloseRoomHref}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-yellow-300/25 bg-yellow-300 px-4 py-2.5 text-[10px] font-black uppercase tracking-[0.16em] text-black shadow-[0_6px_0_rgba(118,74,0,0.6)] transition hover:-translate-y-0.5"
            >
              Open close room
              <ArrowRight className="h-4 w-4" />
            </Link>
          ) : null}
          <button
            type="button"
            onClick={() => {
              setSubmittedId(null);
              setSubmittedCloseRoomHref(null);
            }}
            className="inline-flex w-full items-center justify-center rounded-full border border-white/10 bg-white/[0.04] px-4 py-2.5 text-[10px] font-black uppercase tracking-[0.16em] text-white/62 transition hover:border-white/18 hover:bg-white/[0.08] hover:text-white"
          >
            Route another contact
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className={`${className} px-4 py-4`}>
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-[16px] border border-[#f5c518]/20 bg-[#f5c518]/[0.1] text-[#f8dd72]">
          <Sparkles className="h-5 w-5" />
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/35">Venue gives</p>
          <p className="mt-1.5 text-lg font-black text-white">One perk + approval</p>
          <p className="mt-2 text-xs leading-5 text-white/50">
            BaseDare handles setup, creator route, proof flow, and the recap.
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-3">
        <div>
          <label className={labelClass}>Contact</label>
          <input
            required
            maxLength={120}
            value={form.contactName}
            onChange={(event) => updateField('contactName', event.target.value)}
            className={inputClass}
            placeholder="Your name"
          />
        </div>
        <div>
          <label className={labelClass}>Work email</label>
          <input
            required
            type="email"
            maxLength={180}
            value={form.email}
            onChange={(event) => updateField('email', event.target.value)}
            className={inputClass}
            placeholder="you@venue.com"
          />
        </div>
        <div>
          <label className={labelClass}>Perk or reward</label>
          <input
            required
            maxLength={220}
            value={form.perk}
            onChange={(event) => updateField('perk', event.target.value)}
            className={inputClass}
            placeholder="free round, table, discount, merch"
          />
        </div>
        <div>
          <label className={labelClass}>Timing</label>
          <select
            value={form.timeline}
            onChange={(event) => updateField('timeline', event.target.value as PilotTimeline)}
            className={inputClass}
          >
            <option className="bg-[#080814]" value="this_week">This week</option>
            <option className="bg-[#080814]" value="this_month">This month</option>
          </select>
        </div>
        <div>
          <label className={labelClass}>Website / Instagram</label>
          <input
            maxLength={240}
            value={form.website}
            onChange={(event) => updateField('website', event.target.value)}
            className={inputClass}
            placeholder="https://..."
          />
        </div>
        <input
          tabIndex={-1}
          autoComplete="off"
          value={form.companyWebsite}
          onChange={(event) => updateField('companyWebsite', event.target.value)}
          className="hidden"
          aria-hidden="true"
        />
      </div>

      {error ? (
        <p className="mt-3 rounded-[16px] border border-rose-300/18 bg-rose-500/[0.08] px-3 py-2 text-xs font-bold leading-5 text-rose-100">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={submitting}
        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full border border-[#f5c518]/24 bg-[#f5c518]/[0.13] px-4 py-3 text-xs font-black uppercase tracking-[0.16em] text-[#f8dd72] shadow-[0_16px_28px_rgba(0,0,0,0.22),inset_0_1px_0_rgba(255,255,255,0.1)] transition hover:-translate-y-[1px] hover:border-[#f5c518]/42 hover:bg-[#f5c518]/[0.17] disabled:cursor-wait disabled:opacity-60 disabled:hover:translate-y-0"
      >
        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        {submitting ? 'Routing pilot' : 'Approve pilot'}
      </button>
      <Link
        href={fullIntakeHref}
        className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2.5 text-[11px] font-black uppercase tracking-[0.16em] text-white/62 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition hover:-translate-y-[1px] hover:border-white/18 hover:bg-white/[0.08] hover:text-white"
      >
        Full brief
        <ArrowRight className="h-4 w-4" />
      </Link>
    </form>
  );
}
