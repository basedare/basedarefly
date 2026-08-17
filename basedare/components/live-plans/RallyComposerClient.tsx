'use client';

import Link from 'next/link';
import { Anchor, ArrowLeft, Loader2, MapPin, ShieldCheck, Users } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useAccount, useSignMessage } from 'wagmi';

import { buildWalletActionAuthHeaders } from '@/lib/wallet-action-auth';
import type { MeetupType } from '@/lib/meetups';

type CommunitySession = {
  token?: string;
  walletAddress?: string | null;
  user?: { walletAddress?: string | null } | null;
};

type RallyVenue = {
  id: string;
  slug: string;
  name: string;
  city: string | null;
  latitude: number;
  longitude: number;
};

const TEMPLATES: ReadonlyArray<{
  id: string;
  label: string;
  detail: string;
  type: MeetupType | 'boat';
  title: string;
  minimum: number;
}> = [
  { id: 'boat', label: 'Surf boat', detail: 'Fill a banca and split the ride', type: 'boat', title: 'Surf boat crew', minimum: 4 },
  { id: 'padel', label: 'Padel', detail: 'Find the missing players', type: 'padel', title: 'Padel match', minimum: 4 },
  { id: 'trivia', label: 'Trivia', detail: 'Build a team for tonight', type: 'trivia', title: 'Trivia team', minimum: 5 },
  { id: 'meet', label: 'Meet here', detail: 'Turn a place into a plan', type: 'custom', title: 'Meet here', minimum: 2 },
  { id: 'drinks', label: 'Drinks', detail: 'Choose a public first stop', type: 'drinks', title: 'Drinks crew', minimum: 2 },
  { id: 'surf', label: 'Surf together', detail: 'Find people for a beach session', type: 'surf', title: 'Social surf', minimum: 3 },
];

function defaultStartValue(hoursFromNow = 1) {
  const date = new Date(Date.now() + hoursFromNow * 60 * 60 * 1000);
  date.setMinutes(Math.ceil(date.getMinutes() / 15) * 15, 0, 0);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

export default function RallyComposerClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const { address } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const sessionShape = session as CommunitySession | null;
  const sessionWallet = sessionShape?.walletAddress ?? sessionShape?.user?.walletAddress ?? null;
  const actorWallet = address ?? sessionWallet;

  const initialTemplate = TEMPLATES.find((item) => item.id === searchParams.get('template')) ?? TEMPLATES[1];
  const [templateId, setTemplateId] = useState(initialTemplate.id);
  const template = TEMPLATES.find((item) => item.id === templateId) ?? TEMPLATES[1];
  const [venues, setVenues] = useState<RallyVenue[]>([]);
  const [venueId, setVenueId] = useState(searchParams.get('venueId') ?? '');
  const [title, setTitle] = useState(searchParams.get('title') ?? initialTemplate.title);
  const [minimumPeople, setMinimumPeople] = useState(Number(searchParams.get('minimum')) || initialTemplate.minimum);
  const [startTime, setStartTime] = useState(defaultStartValue());
  const [note, setNote] = useState('');
  const [loadingVenues, setLoadingVenues] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [state, setState] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const query = new URLSearchParams({ lat: '9.803', lng: '126.159', radiusMeters: '25000', limit: '30' });
    void fetch(`/api/venues/nearby?${query.toString()}`, { signal: controller.signal })
      .then(async (response) => {
        const payload = await response.json().catch(() => null);
        if (!response.ok || !payload?.success || !Array.isArray(payload.data?.venues)) throw new Error('Places unavailable.');
        setVenues(payload.data.venues.map((venue: RallyVenue) => ({
          id: venue.id,
          slug: venue.slug,
          name: venue.name,
          city: venue.city,
          latitude: venue.latitude,
          longitude: venue.longitude,
        })));
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        setState({ type: 'error', message: 'Could not load public places. Try again shortly.' });
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadingVenues(false);
      });
    return () => controller.abort();
  }, []);

  const selectedVenue = useMemo(
    () => venues.find((venue) => venue.id === venueId) ?? null,
    [venueId, venues],
  );

  const selectTemplate = (id: string) => {
    const next = TEMPLATES.find((item) => item.id === id);
    if (!next) return;
    setTemplateId(next.id);
    setTitle(next.id === 'meet' && selectedVenue ? `Meet at ${selectedVenue.name}` : next.title);
    setMinimumPeople(next.minimum);
    setState(null);
  };

  const selectVenue = (id: string) => {
    setVenueId(id);
    const venue = venues.find((item) => item.id === id);
    if (template.id === 'meet' && venue) setTitle(`Meet at ${venue.name}`);
  };

  const submit = async () => {
    setState(null);
    if (!actorWallet) {
      setState({ type: 'error', message: 'Sign in, then start your Rally again.' });
      return;
    }
    if (!selectedVenue) {
      setState({ type: 'error', message: 'Choose a public place.' });
      return;
    }
    const parsedStart = new Date(startTime);
    if (!Number.isFinite(parsedStart.getTime())) {
      setState({ type: 'error', message: 'Choose a valid time.' });
      return;
    }
    setSubmitting(true);
    try {
      const headers = await buildWalletActionAuthHeaders({
        walletAddress: actorWallet,
        sessionToken: sessionShape?.token ?? null,
        sessionWallet,
        action: 'meetups:host',
        resource: 'meetups:host',
        signMessageAsync,
      });
      const response = await fetch('/api/meetups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({
          walletAddress: actorWallet,
          title: title.trim(),
          type: template.type,
          venueId: selectedVenue.id,
          venueSlug: selectedVenue.slug,
          placeLabel: selectedVenue.name,
          approxLat: selectedVenue.latitude,
          approxLng: selectedVenue.longitude,
          startTime: parsedStart.toISOString(),
          note: note.trim() || undefined,
          minimumPeople,
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.success || !payload.data?.shareHref) throw new Error(payload?.error || 'Could not start this Rally.');
      setState({ type: 'success', message: 'Rally live. Opening the invite…' });
      router.push(payload.data.shareHref);
    } catch (error) {
      setState({ type: 'error', message: error instanceof Error ? error.message : 'Could not start this Rally.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden px-4 pb-24 pt-28 text-white sm:px-6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_5%,rgba(139,92,246,0.15),transparent_32%),radial-gradient(circle_at_82%_18%,rgba(34,211,238,0.12),transparent_34%)]" />
      <div className="relative mx-auto max-w-3xl">
        <Link href="/now" className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.15em] text-white/44 hover:text-white"><ArrowLeft className="h-4 w-4" /> Live Plans</Link>
        <section className="mt-5 rounded-[2rem] border border-white/10 bg-[linear-gradient(150deg,rgba(25,20,44,0.94),rgba(5,7,14,0.99))] p-5 shadow-[0_28px_80px_rgba(0,0,0,0.48),inset_0_1px_0_rgba(255,255,255,0.09)] sm:p-8">
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-violet-200/70">Start a Rally</p>
          <h1 className="mt-3 text-4xl font-black leading-[0.96] sm:text-5xl">Start something. Fill the crew.</h1>
          <p className="mt-3 text-sm text-white/48">Pick the move, place and time. Share the live link. No full-page manual.</p>

          <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {TEMPLATES.map((item) => (
              <button key={item.id} type="button" onClick={() => selectTemplate(item.id)} aria-pressed={template.id === item.id} className={`min-h-20 rounded-2xl border p-3 text-left transition ${template.id === item.id ? 'border-[#f5c518]/34 bg-[#f5c518]/[0.1]' : 'border-white/9 bg-black/22'}`}>
                <strong className={`block text-sm ${template.id === item.id ? 'text-[#fff0a8]' : 'text-white/78'}`}>{item.label}</strong>
                <span className="mt-1 block text-[10px] leading-4 text-white/36">{item.detail}</span>
              </button>
            ))}
          </div>

          {template.type === 'boat' ? (
            <div className="mt-6 rounded-2xl border border-cyan-200/18 bg-cyan-300/[0.06] p-5">
              <Anchor className="h-6 w-6 text-cyan-100" />
              <h2 className="mt-3 text-xl font-black">Boat crews need surf-specific details.</h2>
              <p className="mt-2 text-sm leading-6 text-white/48">Choose launch, break, ability and board needs on the Boat Board. Operator confirmation stays intact.</p>
              <Link href="/community/boat/kanaway" className="mt-4 inline-flex min-h-11 items-center rounded-full bg-[#f5c518] px-5 text-[10px] font-black uppercase tracking-[0.14em] text-[#171006]">Start boat crew</Link>
            </div>
          ) : (
            <>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <label className="block text-[9px] font-black uppercase tracking-[0.16em] text-white/44">What
                  <input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={120} className="mt-2 min-h-12 w-full rounded-2xl border border-white/10 bg-black/28 px-4 text-sm font-bold normal-case tracking-normal text-white outline-none focus:border-violet-200/32" />
                </label>
                <label className="block text-[9px] font-black uppercase tracking-[0.16em] text-white/44">Where
                  <select value={venueId} onChange={(event) => selectVenue(event.target.value)} disabled={loadingVenues} className="mt-2 min-h-12 w-full rounded-2xl border border-white/10 bg-[#080a12] px-4 text-sm font-bold normal-case tracking-normal text-white outline-none focus:border-cyan-200/32">
                    <option value="">{loadingVenues ? 'Loading places…' : 'Choose a public place'}</option>
                    {venues.map((venue) => <option key={venue.id} value={venue.id}>{venue.name}{venue.city ? ` · ${venue.city}` : ''}</option>)}
                  </select>
                </label>
                <label className="block text-[9px] font-black uppercase tracking-[0.16em] text-white/44">When
                  <input type="datetime-local" value={startTime} onChange={(event) => setStartTime(event.target.value)} className="mt-2 min-h-12 w-full rounded-2xl border border-white/10 bg-black/28 px-4 text-sm font-bold normal-case tracking-normal text-white outline-none focus:border-violet-200/32" />
                </label>
                <label className="block text-[9px] font-black uppercase tracking-[0.16em] text-white/44">People to unlock
                  <input type="number" min={2} max={50} value={minimumPeople} onChange={(event) => setMinimumPeople(Math.min(50, Math.max(2, Number(event.target.value) || 2)))} className="mt-2 min-h-12 w-full rounded-2xl border border-white/10 bg-black/28 px-4 text-sm font-bold normal-case tracking-normal text-white outline-none focus:border-amber-200/32" />
                </label>
              </div>
              <label className="mt-4 block text-[9px] font-black uppercase tracking-[0.16em] text-white/44">One useful detail
                <textarea value={note} onChange={(event) => setNote(event.target.value)} maxLength={500} placeholder="Optional: ability, what to bring, or where to meet." className="mt-2 min-h-24 w-full resize-none rounded-2xl border border-white/10 bg-black/28 px-4 py-3 text-sm font-bold normal-case tracking-normal text-white outline-none placeholder:text-white/23 focus:border-violet-200/32" />
              </label>

              <div className="mt-4 flex items-start gap-3 rounded-2xl border border-amber-200/14 bg-amber-300/[0.05] p-4 text-xs leading-5 text-white/46"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-amber-100" /> Public places only. Everyone opts in. BaseDare coordinates the plan; it does not host or supervise it.</div>
              {state ? <p role="status" className={`mt-4 rounded-2xl border p-3 text-xs font-bold ${state.type === 'success' ? 'border-emerald-200/20 bg-emerald-300/[0.08] text-emerald-100' : 'border-rose-200/20 bg-rose-300/[0.08] text-rose-100'}`}>{state.message}</p> : null}
              <button type="button" onClick={() => void submit()} disabled={submitting || loadingVenues || title.trim().length < 2} className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[#f5c518] px-5 text-[11px] font-black uppercase tracking-[0.15em] text-[#171006] disabled:opacity-45">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Users className="h-4 w-4" />}
                {submitting ? 'Starting…' : `Start Rally · 1/${minimumPeople}`}
              </button>
              {!actorWallet ? <p className="mt-3 text-center text-[10px] text-white/34">You can choose everything first. Sign in is required only when you start it.</p> : null}
            </>
          )}
        </section>
        <p className="mt-4 flex items-center justify-center gap-2 text-[10px] text-white/30"><MapPin className="h-3.5 w-3.5" /> Place-native · time-bound · mutual opt-in</p>
      </div>
    </main>
  );
}
