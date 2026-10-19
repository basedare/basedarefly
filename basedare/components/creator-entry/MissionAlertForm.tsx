'use client';

import { ArrowRight, CheckCircle2, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

import { useDiscovery } from '@/components/DiscoveryProvider';
import { trackClientEvent } from '@/lib/analytics';
import type { CreatorMissionAlertLane } from '@/lib/creator-mission-alerts';

type FormState = {
  handleOrName: string;
  contact: string;
  workLane: CreatorMissionAlertLane;
  companyWebsite: string;
};

const initialState: FormState = {
  handleOrName: '',
  contact: '',
  workLane: 'anything',
  companyWebsite: '',
};

export function MissionAlertForm({
  autoFocus = false,
  defaultCity,
}: {
  autoFocus?: boolean;
  defaultCity?: string;
}) {
  const { area, hasArea, ready } = useDiscovery();
  const [form, setForm] = useState(initialState);
  const [cityOverride, setCityOverride] = useState<string | null>(null);
  const city = cityOverride ?? (defaultCity?.trim() || (ready && hasArea ? area.label : ''));
  const pendingRequest = useRef<AbortController | null>(null);
  useEffect(() => () => pendingRequest.current?.abort(), []);
  const [submitting, setSubmitting] = useState(false);
  const [submittedCity, setSubmittedCity] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const update = <Key extends keyof FormState>(key: Key, value: FormState[Key]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pendingRequest.current) return;
    const controller = new AbortController();
    pendingRequest.current = controller;
    const timeout = setTimeout(() => controller.abort(), 12_000);
    const submission = { ...form, city, applicationKind: 'mission_alert' };
    setSubmitting(true);
    setError(null);
    trackClientEvent('creator_mission_alert_started', { work_lane: form.workLane });

    try {
      const response = await fetch('/api/creator-captains', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submission),
        signal: controller.signal,
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || payload?.success !== true || payload?.data?.received !== true) {
        throw new Error(payload?.error || 'Could not save your mission alert.');
      }
      setSubmittedCity(submission.city);
      trackClientEvent('creator_mission_alert_submitted', {
        work_lane: form.workLane,
        city: submission.city,
      });
    } catch (submitError) {
      setError(controller.signal.aborted
        ? 'The request timed out. Try again; your details are still here.'
        : submitError instanceof Error ? submitError.message : 'Could not save your mission alert.');
    } finally {
      clearTimeout(timeout);
      pendingRequest.current = null;
      setSubmitting(false);
    }
  };

  if (submittedCity !== null) {
    return (
      <div className="rounded-[22px] border border-emerald-200/20 bg-emerald-300/[0.07] px-5 py-6 text-center">
        <CheckCircle2 className="mx-auto h-7 w-7 text-emerald-200" aria-hidden="true" />
        <h3 className="mt-3 text-xl font-black text-white">You&apos;re on the mission list</h3>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-white/52">
          We&apos;ll use your contact only to reach you when suitable paid work opens near {submittedCity}.
        </p>
      </div>
    );
  }

  const inputClass =
    'min-h-12 w-full rounded-2xl border border-white/10 bg-black/35 px-4 text-base font-semibold normal-case tracking-normal text-white outline-none transition placeholder:text-white/40 focus:border-cyan-200/35 focus:bg-black/48';

  return (
    <form onSubmit={submit} className="grid gap-3" aria-label="Get paid mission alerts">
      <div className="grid gap-3 md:grid-cols-3">
        <label className="grid gap-2 text-xs font-bold text-white/65">
          Name or handle
          <input
            autoFocus={autoFocus}
            required
            minLength={2}
            maxLength={120}
            value={form.handleOrName}
            onChange={(event) => update('handleOrName', event.target.value)}
            placeholder="Maya or @mayasurf"
            className={inputClass}
          />
        </label>
        <label className="grid gap-2 text-xs font-bold text-white/65">
          City
          <input
            required
            minLength={2}
            maxLength={140}
            value={city}
            onChange={(event) => setCityOverride(event.target.value)}
            placeholder="Your city"
            className={inputClass}
          />
        </label>
        <label className="grid gap-2 text-xs font-bold text-white/65">
          Email, WhatsApp or Telegram
          <input
            required
            minLength={3}
            maxLength={180}
            value={form.contact}
            onChange={(event) => update('contact', event.target.value)}
            placeholder="maya@email.com or @maya"
            className={inputClass}
          />
        </label>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <label className="hidden" aria-hidden="true">
          Company website
          <input
            tabIndex={-1}
            autoComplete="off"
            value={form.companyWebsite}
            onChange={(event) => update('companyWebsite', event.target.value)}
          />
        </label>

        <button
          type="submit"
          disabled={submitting}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-yellow-100/25 bg-[linear-gradient(180deg,#ffe46b,#e5a900)] px-6 text-[10px] font-black uppercase tracking-[0.15em] text-[#171108] shadow-[0_14px_30px_rgba(0,0,0,0.32),inset_0_1px_0_rgba(255,255,255,0.65)] transition hover:-translate-y-0.5 disabled:cursor-wait disabled:opacity-60"
        >
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
          Get mission alerts <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      {error ? <p role="alert" className="text-sm font-semibold text-red-300">{error}</p> : null}
      <p className="text-xs leading-5 text-white/55">
        No wallet, follower count or public profile required. We&apos;ll contact you about suitable work;
        signing up does not guarantee a paid mission.{' '}
        <Link href="/privacy" className="underline underline-offset-4 hover:text-white">Privacy</Link>
      </p>
    </form>
  );
}
