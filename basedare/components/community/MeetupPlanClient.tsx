'use client';

import Link from 'next/link';
import { ArrowLeft, CalendarClock, Check, MapPin, Repeat2, ShieldCheck, Users, X } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useCallback, useEffect, useState } from 'react';
import { useAccount, useSignMessage } from 'wagmi';

import PlanShareButton from '@/components/community/PlanShareButton';
import PlanCalendarButton from '@/components/live-plans/PlanCalendarButton';
import { getMeetupSharePath, getMeetupShareText, getRepeatRallyHref, type MeetupPlanSummary } from '@/lib/meetup-plan';
import { triggerHaptic } from '@/lib/mobile-haptics';
import { buildWalletActionAuthHeaders } from '@/lib/wallet-action-auth';

type CommunitySession = {
  token?: string;
  walletAddress?: string | null;
  user?: { walletAddress?: string | null } | null;
};

function formatWhen(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

export default function MeetupPlanClient({ initialPlan }: { initialPlan: MeetupPlanSummary }) {
  const { data: session } = useSession();
  const { address } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const sessionShape = session as CommunitySession | null;
  const sessionWallet = sessionShape?.walletAddress ?? sessionShape?.user?.walletAddress ?? null;
  const actorWallet = address ?? sessionWallet;
  const [plan, setPlan] = useState(initialPlan);
  const [pending, setPending] = useState(false);
  const [state, setState] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const refresh = useCallback(async () => {
    const response = await fetch(`/api/meetups/${encodeURIComponent(initialPlan.id)}`, { cache: 'no-store' });
    const payload = await response.json().catch(() => null);
    if (response.ok && payload?.success && payload.data?.plan) {
      const next = payload.data.plan as MeetupPlanSummary;
      setPlan(next);
    }
  }, [initialPlan.id]);

  useEffect(() => {
    void refresh();
    const interval = window.setInterval(() => void refresh(), 20_000);
    return () => window.clearInterval(interval);
  }, [refresh]);

  const join = async () => {
    setState(null);
    if (!actorWallet) {
      setState({ type: 'error', message: 'Sign in from the top bar, then tap I’m going again.' });
      return;
    }
    setPending(true);
    try {
      const headers = await buildWalletActionAuthHeaders({
        walletAddress: actorWallet,
        sessionToken: sessionShape?.token ?? null,
        sessionWallet,
        action: 'meetup:rsvp',
        resource: `meetup:${plan.id}`,
        signMessageAsync,
      });
      const response = await fetch(`/api/meetups/${encodeURIComponent(plan.id)}/rsvp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ walletAddress: actorWallet }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.success) throw new Error(payload?.error || 'Could not join this plan.');
      const nextCount = Number(payload.data?.count) || plan.rsvpCount + 1;
      const unlockedNow = payload.data?.unlockedNow === true;
      const remaining = plan.minimumPeople ? Math.max(0, plan.minimumPeople - nextCount) : null;
      setPlan((current) => ({ ...current, viewerRsvped: true, rsvpCount: nextCount }));
      triggerHaptic(unlockedNow ? 'success' : 'selection');
      setState({
        type: 'success',
        message: unlockedNow
          ? 'Crew unlocked. This Rally has enough people.'
          : remaining
            ? `You’re in. ${remaining} more ${remaining === 1 ? 'makes it' : 'needed'}.`
            : 'You’re in. Add it to your calendar or invite a mate.',
      });
    } catch (error) {
      setState({ type: 'error', message: error instanceof Error ? error.message : 'Could not join this plan.' });
    } finally {
      setPending(false);
    }
  };

  const leave = async () => {
    setState(null);
    if (!actorWallet) {
      setState({ type: 'error', message: 'Sign in with the identity that joined this Rally.' });
      return;
    }
    setPending(true);
    try {
      const headers = await buildWalletActionAuthHeaders({
        walletAddress: actorWallet,
        sessionToken: sessionShape?.token ?? null,
        sessionWallet,
        action: 'meetup:rsvp:withdraw',
        resource: `meetup:${plan.id}`,
        signMessageAsync,
      });
      const response = await fetch(`/api/meetups/${encodeURIComponent(plan.id)}/rsvp`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ walletAddress: actorWallet }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.success) throw new Error(payload?.error || 'Could not leave this Rally.');
      setPlan((current) => ({
        ...current,
        viewerRsvped: false,
        rsvpCount: Math.max(1, Number(payload.data?.count) || current.rsvpCount - 1),
      }));
      setState({ type: 'success', message: 'You left this Rally.' });
    } catch (error) {
      setState({ type: 'error', message: error instanceof Error ? error.message : 'Could not leave this Rally.' });
    } finally {
      setPending(false);
    }
  };

  const active = plan.status === 'ACTIVE' || plan.status === 'HAPPENING';
  const spotsNeeded = plan.minimumPeople ? Math.max(0, plan.minimumPeople - plan.rsvpCount) : null;
  const unlocked = plan.minimumPeople != null && spotsNeeded === 0;
  const mapHref = plan.venueSlug
    ? `/map?place=${encodeURIComponent(plan.venueSlug)}&meetupId=${encodeURIComponent(plan.id)}&source=meet-share`
    : `/map?meetupId=${encodeURIComponent(plan.id)}&source=meet-share`;

  return (
    <main className="relative min-h-screen overflow-hidden px-4 pb-24 pt-28 text-white sm:px-6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_0%,rgba(139,92,246,0.16),transparent_34%),radial-gradient(circle_at_84%_28%,rgba(34,211,238,0.11),transparent_30%)]" />
      <div className="relative mx-auto max-w-xl">
        <Link href="/community" className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-white/48 hover:text-white"><ArrowLeft className="h-4 w-4" /> Community</Link>
        <section className="mt-5 overflow-hidden rounded-[2rem] border border-violet-200/18 bg-[linear-gradient(155deg,rgba(28,20,49,0.95),rgba(5,7,14,0.99))] p-5 shadow-[0_28px_90px_rgba(0,0,0,0.54),inset_0_1px_0_rgba(255,255,255,0.09)] sm:p-7">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[9px] font-black uppercase tracking-[0.22em] text-violet-200/68">Rally</p>
            {plan.minimumPeople ? <span className={`rounded-full border px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.12em] ${unlocked ? 'border-emerald-200/22 bg-emerald-300/[0.09] text-emerald-100' : 'border-[#f5c518]/25 bg-[#f5c518]/[0.08] text-[#fff0a8]'}`}>{unlocked ? 'Unlocked' : `${plan.rsvpCount}/${plan.minimumPeople}`}</span> : null}
          </div>
          <h1 className="mt-3 text-4xl font-black leading-[0.96] sm:text-5xl">{plan.title}</h1>
          <div className="mt-5 space-y-2 text-sm font-bold text-white/64">
            <p className="flex items-center gap-2"><MapPin className="h-4 w-4 text-cyan-200" /> {plan.placeLabel}</p>
            <p className="flex items-center gap-2"><CalendarClock className="h-4 w-4 text-[#f8dd72]" /> {formatWhen(plan.startTime)}</p>
            <p className="flex items-center gap-2"><Users className="h-4 w-4 text-violet-200" /> {Math.max(1, plan.rsvpCount)} going{spotsNeeded ? ` · ${spotsNeeded} more needed` : plan.minimumPeople ? ' · crew unlocked' : ''}</p>
            {plan.creatorTag ? <p className="text-xs text-white/38">Started by {plan.creatorTag}</p> : null}
          </div>
          {plan.note ? <p className="mt-5 rounded-2xl border border-white/9 bg-black/24 p-4 text-base font-bold leading-6 text-white/72">“{plan.note}”</p> : null}

          {!active ? (
            <p className="mt-5 rounded-2xl border border-white/10 bg-white/[0.035] p-4 text-sm font-bold text-white/48">This plan has ended.</p>
          ) : plan.viewerRsvped ? (
            <div className="mt-5 flex items-center gap-3 rounded-2xl border border-emerald-200/18 bg-emerald-300/[0.07] p-3 text-emerald-100">
              <Check className="h-5 w-5 shrink-0" />
              <span className="min-w-0 flex-1">
                <strong className="block text-sm">You’re in.</strong>
                <span className="mt-0.5 block text-[10px] font-bold text-emerald-100/55">
                  {spotsNeeded ? `${spotsNeeded} more ${spotsNeeded === 1 ? 'makes it' : 'needed'}.` : unlocked ? 'Crew unlocked.' : 'Time and place locked.'}
                </span>
              </span>
              <button type="button" disabled={pending} onClick={() => void leave()} className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-white/10 bg-black/18 px-3 text-[9px] font-black uppercase tracking-[0.11em] text-white/48 disabled:opacity-45"><X className="h-3.5 w-3.5" /> Leave</button>
            </div>
          ) : (
            <button type="button" disabled={pending} onClick={() => void join()} className="mt-5 min-h-12 w-full rounded-full bg-[#f5c518] px-5 text-[11px] font-black uppercase tracking-[0.16em] text-[#171006] disabled:opacity-45">{pending ? 'Joining…' : 'I’m going'}</button>
          )}

          {state ? <p role="status" className={`mt-3 rounded-2xl border p-3 text-xs font-bold ${state.type === 'success' ? 'border-emerald-200/20 bg-emerald-300/[0.08] text-emerald-100' : 'border-rose-200/20 bg-rose-300/[0.08] text-rose-100'}`}>{state.message}</p> : null}

          {active && plan.viewerRsvped ? (
            <div className="mt-3 grid grid-cols-2 gap-2">
              <PlanShareButton title={plan.title} text={getMeetupShareText(plan)} href={getMeetupSharePath(plan.id)} label={spotsNeeded === 1 ? 'Invite one more' : 'Invite mates'} />
              <PlanCalendarButton plan={{
                id: `meetup:${plan.id}`,
                title: plan.title,
                placeLabel: plan.placeLabel,
                startsAt: plan.startTime,
                href: getMeetupSharePath(plan.id),
                description: spotsNeeded ? `${plan.rsvpCount}/${plan.minimumPeople} going · ${spotsNeeded} more needed` : `${plan.rsvpCount} going`,
              }} label="Add to calendar" />
            </div>
          ) : active ? (
            <PlanShareButton title={plan.title} text={getMeetupShareText(plan)} href={getMeetupSharePath(plan.id)} label="Invite mates" className="mt-3 w-full" />
          ) : null}
          <Link href={mapHref} className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-[10px] font-black uppercase tracking-[0.14em] text-white/62"><MapPin className="h-4 w-4 text-cyan-200" /> Open on map</Link>
          {!active && plan.viewerRsvped ? (
            <div className="mt-3 rounded-2xl border border-violet-200/14 bg-violet-300/[0.055] p-4">
              <p className="text-[9px] font-black uppercase tracking-[0.16em] text-violet-100/48">Plan ended</p>
              <p className="mt-1 text-lg font-black text-white">Go again?</p>
              <p className="mt-1 text-xs leading-5 text-white/42">Start the same activity at this place with a fresh time and a fresh crew count.</p>
              <Link href={getRepeatRallyHref(plan)} className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl border border-violet-200/16 bg-black/18 px-4 text-[10px] font-black uppercase tracking-[0.14em] text-violet-100/78"><Repeat2 className="h-4 w-4" /> Run it again</Link>
            </div>
          ) : null}
        </section>
        <p className="mt-4 flex items-start gap-2 px-2 text-[10px] leading-4 text-white/34"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" /> Public-place meetup. BaseDare does not host, supervise or guarantee this plan. Keep it safe, legal and mutually agreed.</p>
      </div>
    </main>
  );
}
