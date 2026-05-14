'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Loader2, Send, Sparkles } from 'lucide-react';
import SquircleButton from '@/components/ui/SquircleButton';
import { buildActivationStoryBrief, type ActivationBrandMemoryInput } from '@/lib/activation-brand-memory';
import {
  getActivationFunnelAttribution,
  getActivationFunnelSessionKey,
  trackActivationFunnelEvent,
} from '@/lib/activation-funnel-client';

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
  routedCreator: string;
  routedVenueId: string;
  routedVenueSlug: string;
  routedSource: string;
  routedMissionType: string;
  routedMissionTitle: string;
  routedCreatorSlots: string;
  routedPayout: string;
  routedTimeWindow: string;
  routedProofRequired: string;
  routedContentRequired: string;
  routedGuestMission: string;
  routedPerkLabel: string;
  offerId: '' | 'first-spark';
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
  routedCreator: '',
  routedVenueId: '',
  routedVenueSlug: '',
  routedSource: '',
  routedMissionType: '',
  routedMissionTitle: '',
  routedCreatorSlots: '',
  routedPayout: '',
  routedTimeWindow: '',
  routedProofRequired: '',
  routedContentRequired: '',
  routedGuestMission: '',
  routedPerkLabel: '',
  offerId: '',
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
  'w-full rounded-[18px] border border-white/10 bg-black/28 px-4 py-3 text-sm font-bold text-white outline-none transition placeholder:text-white/24 focus:border-yellow-200/40 focus:bg-black/38';
const labelClass = 'mb-2 block text-[10px] font-black uppercase tracking-[0.22em] text-white/45';

const BUDGET_RANGE_LABELS: Record<IntakeState['budgetRange'], string> = {
  '500_1500': '$500-$1.5k',
  '1500_5000': '$1.5k-$5k',
  '5000_15000': '$5k-$15k',
  '15000_plus': '$15k+',
};

const PACKAGE_LABELS: Record<IntakeState['packageId'], string> = {
  'pilot-drop': 'Venue Spark Pilot',
  'local-signal': 'Always-On Spark',
  'city-takeover': 'Global Challenge Drop',
};

const GOAL_LABELS: Record<IntakeState['goal'], string> = {
  foot_traffic: 'Move people',
  ugc: 'Creator content',
  launch: 'Launch push',
  event: 'Event energy',
  repeat_visits: 'Repeat visits',
  other: 'Custom goal',
};

const SOURCE_LABELS: Record<string, string> = {
  venue: 'Venue page',
  'brand-portal': 'Brand portal',
  map: 'Map pin',
  'venue-console': 'Venue console',
  control: 'Control room',
  scout: 'Creator radar',
  'spark-audit': 'Spark audit generator',
  'venue-scout-command': 'Venue scout command',
  'creator-passport': 'Creator passport',
  'available-creators': 'Available creators',
  'home-ready-creators': 'Ready creators rail',
  'active-venues': 'Active venues',
  'venue-guest-mission': 'Venue guest mission',
};

function isBudgetRange(value: string | null | undefined): value is IntakeState['budgetRange'] {
  return value === '500_1500' || value === '1500_5000' || value === '5000_15000' || value === '15000_plus';
}

function isPackageId(value: string | null | undefined): value is IntakeState['packageId'] {
  return value === 'pilot-drop' || value === 'local-signal' || value === 'city-takeover';
}

function isGoal(value: string | null | undefined): value is IntakeState['goal'] {
  return value === 'foot_traffic' || value === 'ugc' || value === 'launch' || value === 'event' || value === 'repeat_visits' || value === 'other';
}

function isBuyerType(value: string | null | undefined): value is IntakeState['buyerType'] {
  return value === 'venue' || value === 'brand' || value === 'agency' || value === 'event' || value === 'other';
}

type ActivationIntakeFormProps = {
  routedCreator?: string | null;
  routedVenue?: string | null;
  routedVenueId?: string | null;
  routedVenueSlug?: string | null;
  routedCity?: string | null;
  routedSource?: string | null;
  routedBudgetRange?: string | null;
  routedPackageId?: string | null;
  routedGoal?: string | null;
  routedBuyerType?: string | null;
  routedOfferId?: string | null;
  routedAuditBrief?: string | null;
  routedMissionType?: string | null;
  routedMissionTitle?: string | null;
  routedCreatorSlots?: string | null;
  routedPayout?: string | null;
  routedTimeWindow?: string | null;
  routedProofRequired?: string | null;
  routedContentRequired?: string | null;
  routedGuestMission?: string | null;
  routedPerkLabel?: string | null;
};

export default function ActivationIntakeForm({
  routedCreator,
  routedVenue,
  routedVenueId,
  routedVenueSlug,
  routedCity,
  routedSource,
  routedBudgetRange,
  routedPackageId,
  routedGoal,
  routedBuyerType,
  routedOfferId,
  routedAuditBrief,
  routedMissionType,
  routedMissionTitle,
  routedCreatorSlots,
  routedPayout,
  routedTimeWindow,
  routedProofRequired,
  routedContentRequired,
  routedGuestMission,
  routedPerkLabel,
}: ActivationIntakeFormProps) {
  const [form, setForm] = useState<IntakeState>(INITIAL_STATE);
  const [submitting, setSubmitting] = useState(false);
  const [submittedId, setSubmittedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const routedContextRef = useRef<string | null>(null);
  const formStartTrackedRef = useRef(false);
  const hasRoutedContext = Boolean(
    form.routedCreator ||
    form.routedVenueId ||
    form.routedVenueSlug ||
    form.routedSource ||
    form.routedMissionTitle ||
    form.routedGuestMission ||
    form.offerId ||
    routedVenue ||
    routedCity ||
    routedBudgetRange ||
    routedPackageId ||
    routedGoal ||
    routedBuyerType ||
    routedOfferId ||
    routedAuditBrief ||
    routedMissionType ||
    routedMissionTitle ||
    routedCreatorSlots ||
    routedPayout ||
    routedTimeWindow ||
    routedProofRequired ||
    routedContentRequired ||
    routedGuestMission ||
    routedPerkLabel
  );

  useEffect(() => {
    if (
      !routedCreator &&
      !routedVenue &&
      !routedVenueId &&
      !routedVenueSlug &&
      !routedCity &&
      !routedSource &&
      !routedBudgetRange &&
      !routedPackageId &&
      !routedGoal &&
      !routedBuyerType &&
      !routedOfferId &&
      !routedAuditBrief &&
      !routedMissionType &&
      !routedMissionTitle &&
      !routedCreatorSlots &&
      !routedPayout &&
      !routedTimeWindow &&
      !routedProofRequired &&
      !routedContentRequired &&
      !routedGuestMission &&
      !routedPerkLabel
    ) return;

    const normalizedCreator = routedCreator
      ? routedCreator.startsWith('@')
        ? routedCreator
        : `@${routedCreator}`
      : null;
    const normalizedVenue = routedVenue?.trim() || null;
    const normalizedVenueId = routedVenueId?.trim() || null;
    const normalizedVenueSlug = routedVenueSlug?.trim() || null;
    const normalizedCity = routedCity?.trim() || null;
    const normalizedSource = routedSource?.trim() || null;
    const budgetRange = isBudgetRange(routedBudgetRange) ? routedBudgetRange : null;
    const packageId = isPackageId(routedPackageId) ? routedPackageId : null;
    const goal = isGoal(routedGoal) ? routedGoal : null;
    const buyerType = isBuyerType(routedBuyerType) ? routedBuyerType : null;
    const offerId = routedOfferId === 'first-spark' ? 'first-spark' : null;
    const normalizedAuditBrief = routedAuditBrief?.trim() || null;
    const normalizedMissionType = routedMissionType?.trim() || null;
    const normalizedMissionTitle = routedMissionTitle?.trim() || null;
    const normalizedCreatorSlots = routedCreatorSlots?.trim() || null;
    const normalizedPayout = routedPayout?.trim() || null;
    const normalizedTimeWindow = routedTimeWindow?.trim() || null;
    const normalizedProofRequired = routedProofRequired?.trim() || null;
    const normalizedContentRequired = routedContentRequired?.trim() || null;
    const normalizedGuestMission = routedGuestMission?.trim() || null;
    const normalizedPerkLabel = routedPerkLabel?.trim() || null;
    const contextKey = [
      normalizedCreator,
      normalizedVenue,
      normalizedVenueId,
      normalizedVenueSlug,
      normalizedCity,
      normalizedSource,
      budgetRange,
      packageId,
      goal,
      buyerType,
      offerId,
      normalizedAuditBrief,
      normalizedMissionType,
      normalizedMissionTitle,
      normalizedCreatorSlots,
      normalizedPayout,
      normalizedTimeWindow,
      normalizedProofRequired,
      normalizedContentRequired,
      normalizedGuestMission,
      normalizedPerkLabel,
    ].filter(Boolean).join('|');
    if (routedContextRef.current === contextKey) return;

    routedContextRef.current = contextKey;
    setForm((current) => {
      return {
        ...current,
        city: current.city || normalizedCity || '',
        venue: current.venue || normalizedVenue || '',
        budgetRange: budgetRange ?? (offerId === 'first-spark' ? '500_1500' : current.budgetRange),
        timeline: offerId === 'first-spark' ? 'this_week' : current.timeline,
        packageId: packageId ?? (offerId === 'first-spark' ? 'pilot-drop' : current.packageId),
        goal: goal ?? (offerId === 'first-spark' ? 'foot_traffic' : current.goal),
        buyerType: buyerType ?? (offerId === 'first-spark' ? 'venue' : current.buyerType),
        routedCreator: normalizedCreator ?? current.routedCreator,
        routedVenueId: normalizedVenueId ?? current.routedVenueId,
        routedVenueSlug: normalizedVenueSlug ?? current.routedVenueSlug,
        routedSource: normalizedSource ?? current.routedSource,
        routedMissionType: normalizedMissionType ?? current.routedMissionType,
        routedMissionTitle: normalizedMissionTitle ?? current.routedMissionTitle,
        routedCreatorSlots: normalizedCreatorSlots ?? current.routedCreatorSlots,
        routedPayout: normalizedPayout ?? current.routedPayout,
        routedTimeWindow: normalizedTimeWindow ?? current.routedTimeWindow,
        routedProofRequired: normalizedProofRequired ?? current.routedProofRequired,
        routedContentRequired: normalizedContentRequired ?? current.routedContentRequired,
        routedGuestMission: normalizedGuestMission ?? current.routedGuestMission,
        routedPerkLabel: normalizedPerkLabel ?? current.routedPerkLabel,
        offerId: offerId ?? current.offerId,
        notes: [
          current.notes.trim(),
          offerId === 'first-spark'
            ? 'Offer: First Spark Pilot. Venue provides one perk or reward; BaseDare handles setup, creator routing, QR/check-in proof path, and recap. If no verified proof lands, review and rerun the route.'
            : null,
          normalizedCreator ? `Preferred creator: ${normalizedCreator}` : null,
          normalizedVenue ? `Target venue: ${normalizedVenue}` : null,
          normalizedCity ? `Target city: ${normalizedCity}` : null,
          normalizedMissionType ? `Mission type: ${normalizedMissionType}` : null,
          normalizedMissionTitle ? `Mission title: ${normalizedMissionTitle}` : null,
          normalizedCreatorSlots ? `Creator slots: ${normalizedCreatorSlots}` : null,
          normalizedPayout ? `Payout: ${normalizedPayout}` : null,
          normalizedTimeWindow ? `Time window: ${normalizedTimeWindow}` : null,
          normalizedProofRequired ? `Proof required: ${normalizedProofRequired}` : null,
          normalizedContentRequired ? `Content required: ${normalizedContentRequired}` : null,
          normalizedGuestMission ? `Guest mission: ${normalizedGuestMission}` : null,
          normalizedPerkLabel ? `Venue perk: ${normalizedPerkLabel}` : null,
          normalizedAuditBrief ? `Spark Audit:\n${normalizedAuditBrief}` : null,
          normalizedSource ? `Source: ${normalizedSource}` : 'Source: Control activation route',
        ]
          .filter(Boolean)
          .join('\n'),
      };
    });
  }, [
    routedBudgetRange,
    routedBuyerType,
    routedCity,
    routedCreator,
    routedGoal,
    routedPackageId,
    routedSource,
    routedVenue,
    routedVenueId,
    routedVenueSlug,
    routedOfferId,
    routedAuditBrief,
    routedMissionType,
    routedMissionTitle,
    routedCreatorSlots,
    routedPayout,
    routedTimeWindow,
    routedProofRequired,
    routedContentRequired,
    routedGuestMission,
    routedPerkLabel,
  ]);

  const trackFormStart = () => {
    if (formStartTrackedRef.current) return;
    formStartTrackedRef.current = true;
    void trackActivationFunnelEvent({
      eventType: 'ACTIVATION_FORM_START',
      target: 'activation-intake-form',
      channel: 'activation-intake',
      attribution: {
        source: form.routedSource || undefined,
        venueId: form.routedVenueId || undefined,
        venueSlug: form.routedVenueSlug || undefined,
        venueName: form.venue || undefined,
        creator: form.routedCreator || undefined,
        packageId: form.packageId,
        budgetRange: form.budgetRange,
        goal: form.goal,
        buyerType: form.buyerType,
        offerId: form.offerId || undefined,
      },
      metadata: {
        missionType: form.routedMissionType || undefined,
        missionTitle: form.routedMissionTitle || undefined,
        creatorSlots: form.routedCreatorSlots || undefined,
        guestMission: form.routedGuestMission || undefined,
      },
    });
  };

  const updateField = <Key extends keyof IntakeState>(key: Key, value: IntakeState[Key]) => {
    trackFormStart();
    setForm((current) => ({ ...current, [key]: value }));
  };

  const updateBrandMemory = <Key extends keyof IntakeState['brandMemory']>(
    key: Key,
    value: IntakeState['brandMemory'][Key]
  ) => {
    trackFormStart();
    setForm((current) => ({
      ...current,
      brandMemory: {
        ...current.brandMemory,
        [key]: value,
      },
    }));
  };

  const storyBrief = useMemo(() => buildActivationStoryBrief(form), [form]);
  const routeReceiptItems = useMemo(
    () =>
      [
        form.venue ? ['Target', form.venue] : null,
        form.city ? ['City', form.city] : null,
        form.routedCreator ? ['Creator route', form.routedCreator] : null,
        form.routedMissionTitle ? ['Mission', form.routedMissionTitle] : null,
        form.routedCreatorSlots ? ['Slots', form.routedCreatorSlots] : null,
        form.routedGuestMission ? ['Guest loop', form.routedGuestMission] : null,
        form.routedSource ? ['Source', SOURCE_LABELS[form.routedSource] || form.routedSource] : null,
        ['Budget lane', BUDGET_RANGE_LABELS[form.budgetRange]],
        ['Package', PACKAGE_LABELS[form.packageId]],
        ['Goal', GOAL_LABELS[form.goal]],
        form.offerId === 'first-spark' ? ['Offer', 'First Spark Pilot'] : null,
      ].filter((item): item is [string, string] => Boolean(item)),
    [
      form.budgetRange,
      form.city,
      form.goal,
      form.offerId,
      form.packageId,
      form.routedCreator,
      form.routedCreatorSlots,
      form.routedGuestMission,
      form.routedMissionTitle,
      form.routedSource,
      form.venue,
    ]
  );

  const missionBriefItems = useMemo(
    () =>
      [
        form.routedMissionType ? ['Type', form.routedMissionType] : null,
        form.routedCreatorSlots ? ['Creator slots', form.routedCreatorSlots] : null,
        form.routedPayout ? ['Payout', form.routedPayout] : null,
        form.routedTimeWindow ? ['Window', form.routedTimeWindow] : null,
        form.routedProofRequired ? ['Proof', form.routedProofRequired] : null,
        form.routedContentRequired ? ['Content', form.routedContentRequired] : null,
        form.routedGuestMission ? ['Guest mission', form.routedGuestMission] : null,
        form.routedPerkLabel ? ['Perk', form.routedPerkLabel] : null,
      ].filter((item): item is [string, string] => Boolean(item)),
    [
      form.routedContentRequired,
      form.routedCreatorSlots,
      form.routedGuestMission,
      form.routedMissionType,
      form.routedPayout,
      form.routedPerkLabel,
      form.routedProofRequired,
      form.routedTimeWindow,
    ]
  );

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      void trackActivationFunnelEvent({
        eventType: 'ACTIVATION_FORM_SUBMIT',
        target: 'activation-intake-form',
        channel: 'activation-intake',
        attribution: {
          source: form.routedSource || undefined,
          venueId: form.routedVenueId || undefined,
          venueSlug: form.routedVenueSlug || undefined,
          venueName: form.venue || undefined,
          creator: form.routedCreator || undefined,
          packageId: form.packageId,
          budgetRange: form.budgetRange,
          goal: form.goal,
          buyerType: form.buyerType,
          offerId: form.offerId || undefined,
        },
        metadata: {
          missionType: form.routedMissionType || undefined,
          missionTitle: form.routedMissionTitle || undefined,
          creatorSlots: form.routedCreatorSlots || undefined,
          payout: form.routedPayout || undefined,
          timeWindow: form.routedTimeWindow || undefined,
          guestMission: form.routedGuestMission || undefined,
          perkLabel: form.routedPerkLabel || undefined,
          hasBrandMemory: Boolean(
            form.brandMemory.originStory ||
            form.brandMemory.audience ||
            form.brandMemory.vibe ||
            form.brandMemory.rituals
          ),
        },
      });

      const response = await fetch('/api/activation-intake', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...form,
          funnelSessionKey: getActivationFunnelSessionKey(),
          activationAttribution: getActivationFunnelAttribution({
            source: form.routedSource || undefined,
            venueId: form.routedVenueId || undefined,
            venueSlug: form.routedVenueSlug || undefined,
            venueName: form.venue || undefined,
            creator: form.routedCreator || undefined,
            packageId: form.packageId,
            budgetRange: form.budgetRange,
            goal: form.goal,
            buyerType: form.buyerType,
            offerId: form.offerId || undefined,
          }),
        }),
      });
      const payload = await response.json();

      if (!response.ok || !payload.success) {
        throw new Error(payload.error || 'Failed to route activation request');
      }

      setSubmittedId(payload.data?.id || 'received');
      setForm(INITIAL_STATE);
      formStartTrackedRef.current = false;
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Failed to route activation request');
    } finally {
      setSubmitting(false);
    }
  };

  if (submittedId) {
    return (
      <div className="rounded-[30px] border border-emerald-300/18 bg-emerald-400/[0.07] p-6 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-emerald-200/22 bg-emerald-300/[0.12] text-2xl font-black text-emerald-100">
          OK
        </div>
        <h3 className="mt-4 text-2xl font-black tracking-[-0.04em] text-white">Activation signal received.</h3>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-white/58">
          We routed this into the operator queue. Next step is qualifying the city, venue, creator fit,
          proof target, and Spark Receipt before any paid campaign moves.
        </p>
        <p className="mx-auto mt-3 max-w-md rounded-2xl border border-white/10 bg-black/24 px-4 py-3 text-xs font-black uppercase tracking-[0.14em] text-yellow-100/75">
          BaseDare will reply with the cleanest activation route after review.
        </p>
        <p className="mx-auto mt-3 max-w-md rounded-2xl border border-emerald-200/12 bg-emerald-300/[0.06] px-4 py-3 text-[10px] font-black uppercase tracking-[0.16em] text-emerald-100/70">
          Reference: {submittedId === 'received' ? 'received' : submittedId}
        </p>
        <button
          type="button"
          onClick={() => setSubmittedId(null)}
          className="mt-5 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-white/68 transition hover:bg-white/[0.08]"
        >
          Submit another
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {hasRoutedContext ? (
        <div className="rounded-[28px] border border-yellow-200/16 bg-[radial-gradient(circle_at_14%_0%,rgba(250,204,21,0.16),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.018)_18%,rgba(7,6,14,0.82))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_18px_45px_rgba(0,0,0,0.24)] sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-yellow-100/72">Route receipt</p>
              <h3 className="mt-2 text-xl font-black tracking-[-0.04em] text-white">We already know where this should go.</h3>
              <p className="mt-2 max-w-xl text-sm leading-6 text-white/58">
                Confirm the buyer details below. BaseDare keeps the inferred venue, source, and activation lane attached to the operator queue.
              </p>
            </div>
            <div className="rounded-full border border-emerald-200/14 bg-emerald-300/[0.08] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-emerald-100/76">
              Prefilled
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {routeReceiptItems.map(([label, value]) => (
              <span
                key={`${label}-${value}`}
                className="rounded-full border border-white/[0.09] bg-black/28 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-white/58"
              >
                <span className="text-white/32">{label}:</span> {value}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {missionBriefItems.length > 0 ? (
        <div className="rounded-[26px] border border-cyan-200/16 bg-[radial-gradient(circle_at_12%_0%,rgba(34,211,238,0.14),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.055),rgba(255,255,255,0.018)_18%,rgba(7,6,14,0.82))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-100/72">Mission invite</p>
          <h3 className="mt-2 text-lg font-black leading-6 text-white">
            {form.routedMissionTitle || 'First Spark mission route'}
          </h3>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {missionBriefItems.map(([label, value]) => (
              <div
                key={`${label}-${value}`}
                className="rounded-[18px] border border-white/[0.08] bg-black/26 px-3 py-3"
              >
                <p className="text-[9px] font-black uppercase tracking-[0.18em] text-white/34">{label}</p>
                <p className="mt-1.5 text-xs font-bold leading-5 text-white/66">{value}</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {form.offerId === 'first-spark' ? (
        <div className="rounded-[26px] border border-emerald-200/16 bg-[radial-gradient(circle_at_12%_0%,rgba(16,185,129,0.14),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.055),rgba(255,255,255,0.018)_18%,rgba(7,6,14,0.82))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-emerald-100/72">Founding venue offer</p>
          <p className="mt-2 text-sm font-black leading-6 text-white">
            BaseDare runs setup, creator routing, QR/check-in proof, and recap. You approve the route and provide one perk.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {['venue page', 'creator mission', 'proof receipt', 'rerun review if no proof'].map((item) => (
              <span
                key={item}
                className="rounded-full border border-white/[0.09] bg-black/24 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.14em] text-white/52"
              >
                {item}
              </span>
            ))}
          </div>
        </div>
      ) : null}

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

      <div className="rounded-[28px] border border-purple-200/14 bg-[radial-gradient(circle_at_12%_0%,rgba(168,85,247,0.14),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.055),rgba(255,255,255,0.018)_16%,rgba(7,6,14,0.78))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_18px_40px_rgba(0,0,0,0.22)] sm:p-5">
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-purple-200/18 bg-purple-300/[0.1] text-purple-100">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-purple-100/70">Brand Memory</p>
            <p className="mt-1 text-sm leading-6 text-white/58">
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

        <div className="mt-4 rounded-[22px] border border-white/[0.08] bg-black/30 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-yellow-100/70">Activation brief preview</p>
          <p className="mt-2 text-sm font-black leading-6 text-white">{storyBrief.positioningLine}</p>
          <p className="mt-2 text-xs leading-5 text-white/52">{storyBrief.creatorBrief}</p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <div className="rounded-[18px] border border-cyan-200/[0.1] bg-cyan-300/[0.045] p-3">
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-cyan-100/62">Proof logic</p>
              <p className="mt-2 text-xs leading-5 text-white/54">{storyBrief.proofLogic}</p>
            </div>
            <div className="rounded-[18px] border border-yellow-200/[0.1] bg-yellow-300/[0.045] p-3">
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-yellow-100/66">Repeat trigger</p>
              <p className="mt-2 text-xs leading-5 text-white/54">{storyBrief.repeatMetric}</p>
            </div>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            {storyBrief.missionIdeas.map((mission) => (
              <div key={mission.title} className="rounded-[18px] border border-white/[0.07] bg-white/[0.035] p-3">
                <p className="text-xs font-black text-white">{mission.title}</p>
                <p className="mt-2 text-xs leading-5 text-white/50">{mission.detail}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {storyBrief.proofChecklist.slice(0, 4).map((item) => (
              <span
                key={item}
                className="rounded-full border border-white/[0.08] bg-white/[0.035] px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.14em] text-white/42"
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
        <div className="rounded-2xl border border-red-300/18 bg-red-500/[0.08] px-4 py-3 text-sm font-bold text-red-100">
          {error}
        </div>
      ) : null}

      <SquircleButton
        type="submit"
        disabled={submitting}
        tone="yellow"
        label={submitting ? 'Routing request' : 'Route activation request'}
        fullWidth
        height={48}
        className="w-full"
      >
        <span className="flex items-center justify-center gap-2 text-[0.76rem] font-black uppercase tracking-[0.1em] text-[#15120c] sm:text-[0.82rem]">
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          {submitting ? 'Routing request' : 'Route activation request'}
        </span>
      </SquircleButton>
    </form>
  );
}
