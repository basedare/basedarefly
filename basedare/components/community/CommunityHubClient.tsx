'use client';

import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useEffect, useMemo, useState } from 'react';
import { useAccount, useSignMessage } from 'wagmi';
import { HandHeart, Map, MessageCircle, Plus, ShieldCheck, ShipWheel, Sparkles, Store } from 'lucide-react';

import CommunityActivityCard from '@/components/community/CommunityActivityCard';
import LivePlanCard from '@/components/live-plans/LivePlanCard';
import { getLocalPostMapHref, type LocalPostType } from '@/lib/community-around-policy';
import type { LivePlan } from '@/lib/live-plans';
import { buildWalletActionAuthHeaders } from '@/lib/wallet-action-auth';

type CommunitySession = {
  token?: string;
  walletAddress?: string | null;
  user?: { walletAddress?: string | null } | null;
};

type VenueChoice = {
  slug: string;
  name: string;
  area: string;
  primaryHref: string;
};

type LocalActivity = {
  id: string;
  title: string;
  postType: LocalPostType;
  category: string;
  venueSlug: string;
  venueName: string;
  city: string;
  notes: string;
  sourceUrl: string;
  startsAt: string | null;
  submittedBy: string;
};

function postTypeLabel(postType: 'ask' | 'offer') {
  return postType === 'ask' ? 'Ask nearby' : 'Offer nearby';
}

export default function CommunityHubClient() {
  const { data: session } = useSession();
  const { address } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const sessionShape = session as CommunitySession | null;
  const sessionWallet = sessionShape?.walletAddress ?? sessionShape?.user?.walletAddress ?? null;
  const actorWallet = address ?? sessionWallet;

  const [livePlans, setLivePlans] = useState<LivePlan[]>([]);
  const [localActivities, setLocalActivities] = useState<LocalActivity[]>([]);
  const [venues, setVenues] = useState<VenueChoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [postType, setPostType] = useState<'ask' | 'offer'>('ask');
  const [venueSlug, setVenueSlug] = useState('');
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitState, setSubmitState] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    void Promise.all([
      fetch('/api/live-plans?lat=9.803&lng=126.159&radiusKm=12&horizonHours=72&limit=18', { cache: 'no-store', signal: controller.signal }),
      fetch('/api/local-signals?limit=20', { signal: controller.signal }),
      fetch('/api/venues/active', { signal: controller.signal }),
    ])
      .then(async ([livePlanResponse, localResponse, venueResponse]) => {
        const [livePlanPayload, localPayload, venuePayload] = await Promise.all([
          livePlanResponse.json(),
          localResponse.json(),
          venueResponse.json(),
        ]);
        if (livePlanResponse.ok && livePlanPayload?.success && Array.isArray(livePlanPayload.data?.plans)) {
          setLivePlans(livePlanPayload.data.plans);
        }
        if (localResponse.ok && localPayload?.success && Array.isArray(localPayload.data?.signals)) {
          setLocalActivities(localPayload.data.signals);
        }
        if (venueResponse.ok && venuePayload?.success && Array.isArray(venuePayload.data?.venues)) {
          setVenues(venuePayload.data.venues);
        }
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        console.error('[COMMUNITY_HUB] Activity load failed:', error);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);

  const visibleLocalActivities = useMemo(
    () => localActivities.filter((activity) => activity.postType !== 'signal' || activity.category === 'community'),
    [localActivities]
  );

  const submitPost = async () => {
    setSubmitState(null);
    if (!actorWallet) {
      setSubmitState({ type: 'error', message: 'Connect the wallet that owns your Baretag first.' });
      return;
    }
    if (!venueSlug || title.trim().length < 3) {
      setSubmitState({ type: 'error', message: 'Choose a place and add a clear short title.' });
      return;
    }

    setSubmitting(true);
    try {
      const authHeaders = await buildWalletActionAuthHeaders({
        walletAddress: actorWallet,
        sessionToken: sessionShape?.token ?? null,
        sessionWallet,
        action: 'community-post:create',
        resource: `venue:${venueSlug}`,
        signMessageAsync,
      });
      const response = await fetch('/api/local-signals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({
          postType,
          title: title.trim(),
          notes: notes.trim(),
          venueSlug,
          category: 'community',
          walletAddress: actorWallet,
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || 'Could not submit this post.');
      }
      setTitle('');
      setNotes('');
      setSubmitState({
        type: 'success',
        message: 'Sent to safety review. Approved posts stay live for 72 hours in this place room.',
      });
    } catch (error) {
      setSubmitState({
        type: 'error',
        message: error instanceof Error ? error.message : 'Could not submit this post.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden px-4 pb-24 pt-28 text-white sm:px-6 lg:px-10">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_10%,rgba(16,185,129,0.12),transparent_30%),radial-gradient(circle_at_85%_18%,rgba(139,92,246,0.14),transparent_34%)]" />
      <div className="relative mx-auto max-w-6xl">
        <section className="rounded-[2rem] border border-white/10 bg-[linear-gradient(155deg,rgba(28,24,48,0.78),rgba(5,7,14,0.94))] p-5 shadow-[0_24px_70px_rgba(0,0,0,0.42),inset_0_1px_0_rgba(255,255,255,0.08)] sm:p-8">
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-emerald-200/72">BaseDare community</p>
          <div className="mt-3 grid gap-7 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
            <div>
              <h1 className="max-w-3xl text-4xl font-black leading-[0.98] sm:text-6xl">See what&apos;s happening. Join in. Go together.</h1>
              <p className="mt-5 max-w-2xl text-sm leading-relaxed text-white/56 sm:text-base">
                Live plans, bounded crews and useful local posts—attached to a real place and time instead of another endless feed.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              {[
                { icon: Sparkles, label: 'Live Plans' },
                { icon: MessageCircle, label: 'Place rooms' },
                { icon: HandHeart, label: 'Ask / Offer' },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="rounded-2xl border border-white/9 bg-black/24 p-3">
                  <Icon className="mx-auto h-5 w-5 text-cyan-200" aria-hidden="true" />
                  <p className="mt-2 text-[9px] font-black uppercase tracking-[0.12em] text-white/48">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <Link href="/community/rally/new" className="flex items-center justify-between gap-4 rounded-[1.5rem] border border-[#f5c518]/20 bg-[linear-gradient(135deg,rgba(245,197,24,0.11),rgba(139,92,246,0.08),rgba(0,0,0,0.35))] p-4 transition hover:-translate-y-px hover:border-[#f8dd72]/35 sm:p-5">
            <span className="flex min-w-0 items-center gap-4"><span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[#f5c518]/20 bg-[#f5c518]/10 text-[#f8dd72]"><Plus className="h-6 w-6" /></span><span className="min-w-0"><strong className="block text-lg font-black text-white">Start a Rally</strong><span className="mt-1 block text-xs text-white/46">Choose a place, time and people needed.</span></span></span>
            <span className="shrink-0 rounded-full border border-[#f5c518]/20 px-3 py-2 text-[9px] font-black uppercase tracking-[0.12em] text-[#f8dd72]">Start</span>
          </Link>
          <Link href="/community/boat/kanaway" className="flex items-center justify-between gap-4 rounded-[1.5rem] border border-cyan-200/18 bg-[linear-gradient(135deg,rgba(34,211,238,0.09),rgba(0,0,0,0.35))] p-4 transition hover:-translate-y-px hover:border-cyan-100/32 sm:p-5">
            <span className="flex min-w-0 items-center gap-4"><span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-cyan-200/18 bg-cyan-300/[0.08] text-cyan-100"><ShipWheel className="h-6 w-6" /></span><span className="min-w-0"><strong className="block text-lg font-black text-white">Find a surf boat</strong><span className="mt-1 block text-xs text-white/46">Fill four seats, then confirm with the operator.</span></span></span>
            <span className="shrink-0 rounded-full border border-cyan-200/18 px-3 py-2 text-[9px] font-black uppercase tracking-[0.12em] text-cyan-100">Open</span>
          </Link>
        </div>

        <section className="mt-8">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.22em] text-[#f8dd72]"><Sparkles className="h-3.5 w-3.5" /> Live Plans</p>
              <h2 className="mt-1 text-2xl font-black">What can you join?</h2>
            </div>
            <Link href="/now" className="rounded-full border border-[#f5c518]/20 bg-[#f5c518]/[0.07] px-4 py-2.5 text-[9px] font-black uppercase tracking-[0.13em] text-[#f8dd72]">Open NOW</Link>
          </div>
          {livePlans.length ? <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{livePlans.slice(0, 6).map((plan) => <LivePlanCard key={plan.id} plan={plan} compact />)}</div> : !loading ? <div className="mt-4 rounded-2xl border border-dashed border-white/14 bg-black/20 p-5 text-sm text-white/42">Nothing is forming yet. Start the first Rally.</div> : null}
        </section>

        <section className="mt-8">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.22em] text-violet-200/64">Place-native community</p>
              <h2 className="mt-1 text-2xl font-black">Ask, offer, help</h2>
            </div>
            <Link href="/map?source=community-hub" prefetch={false} className="inline-flex min-h-10 items-center gap-2 rounded-full border border-cyan-200/20 bg-cyan-300/[0.08] px-4 text-[10px] font-black uppercase tracking-[0.12em] text-cyan-100">
              <Map className="h-4 w-4" aria-hidden="true" /> Map
            </Link>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {visibleLocalActivities.slice(0, 6).map((activity) => (
              <CommunityActivityCard
                key={activity.id}
                kind={activity.postType === 'ask' ? 'ask' : activity.postType === 'offer' ? 'offer' : 'hang'}
                title={activity.title}
                place={activity.venueName || activity.city}
                startsAt={activity.startsAt}
                note={activity.notes}
                author={activity.submittedBy}
                href={getLocalPostMapHref(activity)}
              />
            ))}
          </div>
          {!loading && visibleLocalActivities.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-dashed border-white/14 bg-black/20 p-6 text-center text-sm text-white/48">
              No local asks or offers yet. Open a place room to post something useful.
            </div>
          ) : null}
        </section>

        <section className="mt-10 grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-[1.75rem] border border-white/10 bg-black/28 p-5 sm:p-6">
            <p className="text-[9px] font-black uppercase tracking-[0.22em] text-cyan-200/64">Live place rooms</p>
            <h2 className="mt-2 text-2xl font-black">Talk where the plan happens</h2>
            <p className="mt-3 text-sm leading-relaxed text-white/48">
              Rooms are bounded to a venue and unlock through nearby presence or a verified check-in. Messages disappear after 24 hours.
            </p>
            <div className="mt-5 space-y-2">
              {venues.map((venue) => (
                <div key={venue.slug} className="flex min-h-16 items-center gap-3 rounded-2xl border border-white/9 bg-white/[0.035] px-4 py-2.5">
                  <span className="min-w-0 flex-1">
                    <strong className="block truncate text-sm text-white/88">{venue.name}</strong>
                    <span className="mt-0.5 block truncate text-[10px] text-white/38">{venue.area}</span>
                  </span>
                  <Link href={`${venue.primaryHref}&room=1`} prefetch={false} aria-label={`Open ${venue.name} place room`} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-cyan-200/14 bg-cyan-300/[0.06] text-cyan-200/72">
                    <MessageCircle className="h-4 w-4" aria-hidden="true" />
                  </Link>
                  <Link href={`/venues/${encodeURIComponent(venue.slug)}#meet-here`} prefetch={false} className="inline-flex min-h-10 shrink-0 items-center rounded-full border border-violet-200/18 bg-violet-300/[0.08] px-3 text-[9px] font-black uppercase tracking-[0.11em] text-violet-100/78">
                    Meet here
                  </Link>
                </div>
              ))}
            </div>
          </div>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              void submitPost();
            }}
            className="rounded-[1.75rem] border border-emerald-200/14 bg-[radial-gradient(circle_at_10%_0%,rgba(16,185,129,0.12),transparent_38%),rgba(5,10,13,0.72)] p-5 sm:p-6"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.22em] text-emerald-200/68">72-hour local post</p>
                <h2 className="mt-2 text-2xl font-black">Ask or offer something useful</h2>
              </div>
              <Store className="h-6 w-6 text-emerald-200/72" aria-hidden="true" />
            </div>

            <div className="mt-5 grid grid-cols-2 gap-2">
              {(['ask', 'offer'] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setPostType(value)}
                  className={`min-h-11 rounded-full border text-[10px] font-black uppercase tracking-[0.14em] transition ${postType === value ? 'border-emerald-200/34 bg-emerald-300/[0.12] text-emerald-100' : 'border-white/10 bg-black/24 text-white/42'}`}
                  aria-pressed={postType === value}
                >
                  {postTypeLabel(value)}
                </button>
              ))}
            </div>

            <label className="mt-4 block text-[10px] font-black uppercase tracking-[0.14em] text-white/46" htmlFor="community-place">Place</label>
            <select id="community-place" value={venueSlug} onChange={(event) => setVenueSlug(event.target.value)} className="mt-2 min-h-12 w-full rounded-2xl border border-white/10 bg-[#080b12] px-4 text-sm font-bold text-white outline-none focus:border-emerald-200/30">
              <option value="">Choose a public place</option>
              {venues.map((venue) => <option key={venue.slug} value={venue.slug}>{venue.name} · {venue.area}</option>)}
            </select>

            <label className="mt-4 block text-[10px] font-black uppercase tracking-[0.14em] text-white/46" htmlFor="community-title">Short title</label>
            <input id="community-title" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={140} placeholder={postType === 'ask' ? 'Anyone heading to Cloud 9 sunrise?' : 'Spare board bag available today'} className="mt-2 min-h-12 w-full rounded-2xl border border-white/10 bg-black/30 px-4 text-sm font-bold text-white outline-none placeholder:text-white/24 focus:border-emerald-200/30" />

            <label className="mt-4 block text-[10px] font-black uppercase tracking-[0.14em] text-white/46" htmlFor="community-notes">Useful detail</label>
            <textarea id="community-notes" value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={700} placeholder="Keep it specific, friendly, and easy to answer in the place room." className="mt-2 min-h-24 w-full resize-none rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm leading-relaxed text-white outline-none placeholder:text-white/24 focus:border-emerald-200/30" />

            <div className="mt-4 rounded-2xl border border-amber-200/14 bg-amber-300/[0.055] p-3 text-[11px] leading-relaxed text-amber-50/62">
              <p className="flex items-center gap-2 font-black text-amber-100/78"><ShieldCheck className="h-4 w-4" aria-hidden="true" /> Keep it safe and local</p>
              <p className="mt-1.5">No payments, shipping, prohibited goods, housing deals, or anonymous DMs. Meet in public; replies stay in the place room. Every post is reviewed.</p>
            </div>

            {submitState ? (
              <p className={`mt-4 rounded-2xl border p-3 text-xs font-bold ${submitState.type === 'success' ? 'border-emerald-200/20 bg-emerald-300/[0.08] text-emerald-100' : 'border-rose-200/20 bg-rose-300/[0.08] text-rose-100'}`} role="status">
                {submitState.message}
              </p>
            ) : null}

            <button type="submit" disabled={submitting || venues.length === 0} className="mt-4 inline-flex min-h-12 w-full items-center justify-center rounded-full border border-emerald-100/25 bg-emerald-300 px-5 text-[11px] font-black uppercase tracking-[0.16em] text-[#032018] transition hover:bg-emerald-200 disabled:cursor-not-allowed disabled:opacity-45">
              {submitting ? 'Sending for review…' : `Submit ${postType}`}
            </button>
            {!actorWallet ? <p className="mt-3 text-center text-[10px] text-white/38">Connect the wallet that owns your Baretag to post.</p> : null}
          </form>
        </section>
      </div>
    </main>
  );
}
