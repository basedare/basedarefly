'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAccount, useSignMessage } from 'wagmi';
import { Anchor, ArrowLeft, Check, Copy, LifeBuoy, MapPin, RefreshCw, ShipWheel, Waves } from 'lucide-react';

import { buildWalletActionAuthHeaders } from '@/lib/wallet-action-auth';
import { trackClientEvent } from '@/lib/analytics';
import PlanShareButton from '@/components/community/PlanShareButton';
import {
  BOAT_DESTINATIONS,
  BOAT_LAUNCHES,
  BOAT_TIME_WINDOWS,
  KANAWAY_BOAT_VENUE_SLUG,
  SURF_ABILITY_LANES,
  getAllowedBoatDays,
  getAvailableBoatDays,
  getAvailableBoatTimeWindows,
  getBoatCrewStatusCopy,
  getBoatCrewCountLabel,
  getBoatCrewInvitePath,
  getBoatCrewShareText,
  getBoatLaunch,
  getBoatLaunchDestinations,
  getOptionLabel,
  type BoatLaunchSlug,
  type BoatCommitment,
  type BoatCrewSummary,
  type BoatDestination,
  type BoatTimeWindow,
  type SurfAbilityLane,
} from '@/lib/surf-boat-board';

type CommunitySession = {
  token?: string;
  walletAddress?: string | null;
  user?: { walletAddress?: string | null } | null;
};

type SubmitState = { type: 'success' | 'error'; message: string } | null;

function dayLabel(day: string) {
  const [today, tomorrow] = getAllowedBoatDays();
  if (day === today) return 'Today';
  if (day === tomorrow) return 'Tomorrow';
  return day;
}

function formatDeparture(value: string) {
  return new Intl.DateTimeFormat('en-AU', {
    timeZone: 'Asia/Manila',
    weekday: 'short',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

export default function KanawayBoatBoardClient() {
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const { address } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const sessionShape = session as CommunitySession | null;
  const sessionWallet = sessionShape?.walletAddress ?? sessionShape?.user?.walletAddress ?? null;
  const actorWallet = address ?? sessionWallet;
  const [today, tomorrow] = getAllowedBoatDays();
  const repeatRequested = searchParams.get('repeat') === 'boat';
  const requestedLaunch = searchParams.get('launch');
  const initialLaunchSlug = BOAT_LAUNCHES.some((launch) => launch.value === requestedLaunch)
    ? requestedLaunch as BoatLaunchSlug
    : KANAWAY_BOAT_VENUE_SLUG;
  const requestedDestination = searchParams.get('destination');
  const initialDestination = getBoatLaunchDestinations(initialLaunchSlug).find(
    (option) => option.value === requestedDestination,
  )?.value ?? getBoatLaunchDestinations(initialLaunchSlug)[0]?.value ?? 'best-today';
  const requestedTimeWindow = searchParams.get('time');
  const initialTimeWindow = BOAT_TIME_WINDOWS.find((option) => option.value === requestedTimeWindow)?.value ?? 'early';
  const requestedAbility = searchParams.get('ability');
  const initialAbility = SURF_ABILITY_LANES.find((option) => option.value === requestedAbility)?.value ?? 'independent';

  const [crews, setCrews] = useState<BoatCrewSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(repeatRequested);
  const [launchSlug, setLaunchSlug] = useState<BoatLaunchSlug>(initialLaunchSlug);
  const [departureDay, setDepartureDay] = useState(repeatRequested ? tomorrow : today);
  const [timeWindow, setTimeWindow] = useState<BoatTimeWindow>(initialTimeWindow);
  const [destination, setDestination] = useState<BoatDestination>(initialDestination);
  const [abilityLane, setAbilityLane] = useState<SurfAbilityLane>(initialAbility);
  const [needsBoard, setNeedsBoard] = useState(searchParams.get('board') === '1');
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [submitState, setSubmitState] = useState<SubmitState>(null);
  const [operatorUrl, setOperatorUrl] = useState<string | null>(null);
  const [createdCrewId, setCreatedCrewId] = useState<string | null>(null);
  const [clockMs, setClockMs] = useState<number | null>(null);

  useEffect(() => {
    const updateClock = () => setClockMs(Date.now());
    updateClock();
    const interval = window.setInterval(updateClock, 60_000);
    return () => window.clearInterval(interval);
  }, []);

  const availableDays = useMemo(
    () => (clockMs === null ? [today, tomorrow] : getAvailableBoatDays(new Date(clockMs))),
    [clockMs, today, tomorrow],
  );
  const availableTimeWindows = useMemo(
    () => (clockMs === null ? BOAT_TIME_WINDOWS : getAvailableBoatTimeWindows(departureDay, new Date(clockMs))),
    [clockMs, departureDay],
  );

  useEffect(() => {
    if (clockMs === null) return;
    if (!availableDays.includes(departureDay)) {
      setDepartureDay(availableDays[0] ?? tomorrow);
      return;
    }
    if (!availableTimeWindows.some((window) => window.value === timeWindow)) {
      setTimeWindow(availableTimeWindows[0]?.value ?? 'early');
    }
  }, [availableDays, availableTimeWindows, clockMs, departureDay, timeWindow, tomorrow]);

  const loadCrews = useCallback(async () => {
    try {
      const query = actorWallet ? `?walletAddress=${encodeURIComponent(actorWallet)}` : '';
      const response = await fetch(`/api/boat-crews${query}`, { cache: 'no-store' });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.success) throw new Error(payload?.error || 'Boat board unavailable.');
      setCrews(Array.isArray(payload.data?.crews) ? payload.data.crews : []);
    } catch (error) {
      setSubmitState({ type: 'error', message: error instanceof Error ? error.message : 'Boat board unavailable.' });
    } finally {
      setLoading(false);
    }
  }, [actorWallet]);

  useEffect(() => {
    void loadCrews();
    const interval = window.setInterval(() => void loadCrews(), 20_000);
    return () => window.clearInterval(interval);
  }, [loadCrews]);

  const sortedCrews = useMemo(
    () => [...crews].sort((a, b) => b.confirmedCount - a.confirmedCount),
    [crews],
  );
  const createdCrew = createdCrewId ? crews.find((crew) => crew.id === createdCrewId) ?? null : null;
  const launchDestinations = useMemo(() => getBoatLaunchDestinations(launchSlug), [launchSlug]);

  const handleLaunchChange = (value: string) => {
    const nextLaunch = value as BoatLaunchSlug;
    setLaunchSlug(nextLaunch);
    setDestination(getBoatLaunchDestinations(nextLaunch)[0]?.value ?? 'best-today');
  };

  const authHeaders = async (action: string, resource: string) => {
    if (!actorWallet) throw new Error('Connect the wallet that owns your Baretag first.');
    return buildWalletActionAuthHeaders({
      walletAddress: actorWallet,
      sessionToken: sessionShape?.token ?? null,
      sessionWallet,
      action,
      resource,
      signMessageAsync,
    });
  };

  const createCrew = async () => {
    setPendingAction('create');
    setSubmitState(null);
    try {
      const headers = await authHeaders('boat-crew:create', `venue:${launchSlug}`);
      const response = await fetch('/api/boat-crews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({
          walletAddress: actorWallet,
          venueSlug: launchSlug,
          departureDay,
          timeWindow,
          destination,
          abilityLane,
          needsBoard,
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.success) throw new Error(payload?.error || 'Could not start this crew.');
      setCreatedCrewId(payload.data.id);
      setShowCreate(false);
      setSubmitState({ type: 'success', message: 'Boat call is live on the map.' });
      if (repeatRequested) {
        trackClientEvent('live_plan_repeat_started', { plan_type: 'boat' });
      }
      await loadCrews();
    } catch (error) {
      setSubmitState({ type: 'error', message: error instanceof Error ? error.message : 'Could not start this crew.' });
    } finally {
      setPendingAction(null);
    }
  };

  const updateMembership = async (
    crew: BoatCrewSummary,
    commitment: BoatCommitment | 'LEAVE',
  ) => {
    setPendingAction(`${crew.id}:${commitment}`);
    setSubmitState(null);
    try {
      const headers = await authHeaders('boat-crew:membership', `crew:${crew.id}`);
      const response = await fetch(`/api/boat-crews/${encodeURIComponent(crew.id)}/membership`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({
          walletAddress: actorWallet,
          commitment,
          abilityLane: crew.abilityLane,
          needsBoard,
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.success) throw new Error(payload?.error || 'Could not update your seat.');
      if (payload.data?.joinedConfirmedNow === true) {
        trackClientEvent('live_plan_joined', {
          plan_type: 'boat',
          crew_unlocked: payload.data?.reachedMinimum === true,
        });
      }
      await loadCrews();
    } catch (error) {
      setSubmitState({ type: 'error', message: error instanceof Error ? error.message : 'Could not update your seat.' });
    } finally {
      setPendingAction(null);
    }
  };

  const requestOperator = async (crew: BoatCrewSummary) => {
    setPendingAction(`${crew.id}:operator`);
    setSubmitState(null);
    try {
      const headers = await authHeaders('boat-crew:operator-link', `crew:${crew.id}`);
      const response = await fetch(`/api/boat-crews/${encodeURIComponent(crew.id)}/operator-link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ walletAddress: actorWallet }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.success) throw new Error(payload?.error || 'Could not create operator link.');
      setOperatorUrl(payload.data.operatorUrl);
      await navigator.clipboard.writeText(payload.data.operatorUrl).catch(() => undefined);
      setSubmitState({ type: 'success', message: 'Private operator link copied. Share it with the actual boat operator.' });
    } catch (error) {
      setSubmitState({ type: 'error', message: error instanceof Error ? error.message : 'Could not create operator link.' });
    } finally {
      setPendingAction(null);
    }
  };

  const acceptDetails = async (crew: BoatCrewSummary) => {
    setPendingAction(`${crew.id}:accept`);
    setSubmitState(null);
    try {
      const headers = await authHeaders('boat-crew:accept', `crew:${crew.id}`);
      const response = await fetch(`/api/boat-crews/${encodeURIComponent(crew.id)}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ walletAddress: actorWallet }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.success) throw new Error(payload?.error || 'Could not accept the details.');
      await loadCrews();
    } catch (error) {
      setSubmitState({ type: 'error', message: error instanceof Error ? error.message : 'Could not accept the details.' });
    } finally {
      setPendingAction(null);
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden px-4 pb-24 pt-28 text-white sm:px-6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_74%_0%,rgba(34,211,238,0.13),transparent_32%),radial-gradient(circle_at_18%_20%,rgba(245,197,24,0.12),transparent_30%)]" />
      <div className="relative mx-auto w-[calc(100vw-2rem)] min-w-0 max-w-5xl sm:w-full">
        <Link href="/map?source=boat-board" prefetch={false} className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-white/48 hover:text-white">
          <ArrowLeft className="h-4 w-4" /> Surf map
        </Link>

        <section className="mt-5 w-full min-w-0 overflow-hidden rounded-[2rem] border border-cyan-200/16 bg-[linear-gradient(155deg,rgba(12,35,44,0.86),rgba(7,8,18,0.96))] p-5 shadow-[0_28px_80px_rgba(0,0,0,0.45)] sm:p-8">
          <div className="flex items-start justify-between gap-5">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-200/72">Siargao Boat Board</p>
              <h1 className="mt-3 max-w-2xl text-4xl font-black leading-[0.95] sm:text-6xl">Find a boat crew. Split the ride. Go surf.</h1>
            </div>
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-[#f5c518]/25 bg-[#f5c518]/10 text-[#f5c518]">
              <ShipWheel className="h-7 w-7" aria-hidden="true" />
            </span>
          </div>
          <p className="mt-5 max-w-2xl text-sm leading-relaxed text-white/56">
            Kanaway for the northern reefs. Siargao Beach Club for Cemetery. Four surfers turns the usual ₱1,200 boat into about ₱300 each.
          </p>
          <div className="mt-5 grid min-w-0 grid-cols-2 gap-2 text-center sm:grid-cols-4">
            {['Pick', '4 surfers', 'Boat confirms', 'Go surf'].map((step, index) => (
              <div key={step} className="rounded-xl border border-white/8 bg-black/22 px-2 py-3">
                <span className="block text-[9px] font-black text-cyan-200/54">0{index + 1}</span>
                <span className="mt-1 block text-[9px] font-black uppercase tracking-[0.08em] text-white/64">{step}</span>
              </div>
            ))}
          </div>
          <button type="button" onClick={() => setShowCreate((value) => !value)} className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full border border-[#f8dd72]/30 bg-[#f5c518] px-5 text-[11px] font-black uppercase tracking-[0.16em] text-[#171006] transition hover:bg-[#f8dd72] sm:w-auto sm:min-w-56">
            <Anchor className="h-4 w-4" /> {showCreate ? 'Close' : 'Start a boat call'}
          </button>
        </section>

        {showCreate ? (
          <section className="mt-5 rounded-[1.75rem] border border-[#f5c518]/18 bg-black/40 p-5 sm:p-6">
            <h2 className="text-xl font-black">Your surf window</h2>
            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              <ChoiceGroup label="Launch" value={launchSlug} onChange={handleLaunchChange} options={BOAT_LAUNCHES} />
              <ChoiceGroup label="Day" value={departureDay} onChange={setDepartureDay} options={availableDays.map((day) => ({ value: day, label: day === today ? 'Today' : 'Tomorrow' }))} />
              <ChoiceGroup label="Time" value={timeWindow} onChange={(value) => setTimeWindow(value as BoatTimeWindow)} options={availableTimeWindows} />
              <ChoiceGroup label="Break" value={destination} onChange={(value) => setDestination(value as BoatDestination)} options={launchDestinations} />
              <ChoiceGroup label="Ability lane" value={abilityLane} onChange={(value) => setAbilityLane(value as SurfAbilityLane)} options={SURF_ABILITY_LANES} />
            </div>
            <label className="mt-5 flex min-h-12 cursor-pointer items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.035] px-4 text-sm font-bold text-white/70">
              <input type="checkbox" checked={needsBoard} onChange={(event) => setNeedsBoard(event.target.checked)} className="h-4 w-4 accent-[#f5c518]" />
              I need a rental board
            </label>
            <button type="button" onClick={() => void createCrew()} disabled={pendingAction === 'create'} className="mt-4 min-h-12 w-full rounded-full bg-cyan-200 px-5 text-[11px] font-black uppercase tracking-[0.16em] text-[#02171d] disabled:opacity-50">
              {pendingAction === 'create' ? 'Starting…' : 'Start confirmed · 1/4'}
            </button>
          </section>
        ) : null}

        {submitState ? (
          <div role="status" className={`mt-5 rounded-2xl border p-4 text-sm font-bold ${submitState.type === 'success' ? 'border-emerald-200/20 bg-emerald-300/[0.08] text-emerald-100' : 'border-rose-200/20 bg-rose-300/[0.08] text-rose-100'}`}>
            {submitState.message}
            {operatorUrl ? (
              <button type="button" onClick={() => void navigator.clipboard.writeText(operatorUrl)} className="ml-3 inline-flex items-center gap-1 text-[#f8dd72] underline">
                <Copy className="h-3.5 w-3.5" /> Copy again
              </button>
            ) : null}
            {createdCrew ? (
              <span className="mt-3 flex flex-wrap items-center gap-2 sm:ml-3 sm:mt-0 sm:inline-flex">
                <Link
                  href={getBoatLaunch(createdCrew.venueSlug).mapPath}
                  prefetch={false}
                  className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-cyan-200/24 bg-cyan-300/[0.09] px-3 text-[9px] font-black uppercase tracking-[0.12em] text-cyan-100"
                >
                  <MapPin className="h-3.5 w-3.5" /> Open boat on map
                </Link>
                <PlanShareButton
                  title={`Join my ${getBoatLaunch(createdCrew.venueSlug).label} surf boat`}
                  text={getBoatCrewShareText(createdCrew)}
                  href={getBoatCrewInvitePath(createdCrew.id)}
                  label="Share crew"
                  compact
                />
              </span>
            ) : null}
          </div>
        ) : null}

        <section className="mt-8">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.22em] text-cyan-200/62">Live calls</p>
              <h2 className="mt-1 text-2xl font-black">Who still needs crew?</h2>
            </div>
            <button type="button" onClick={() => void loadCrews()} aria-label="Refresh boat board" className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white/55">
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {sortedCrews.map((crew) => {
              const destinationLabel = getOptionLabel(BOAT_DESTINATIONS, crew.destination);
              const crewLaunch = getBoatLaunch(crew.venueSlug);
              const timeLabel = getOptionLabel(BOAT_TIME_WINDOWS, crew.timeWindow);
              const laneLabel = getOptionLabel(SURF_ABILITY_LANES, crew.abilityLane);
              const isPending = pendingAction?.startsWith(`${crew.id}:`) ?? false;
              return (
                <article key={crew.id} className="rounded-[1.6rem] border border-white/10 bg-[linear-gradient(160deg,rgba(17,23,35,0.92),rgba(4,7,13,0.96))] p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-[0.18em] text-cyan-200/62">{crewLaunch.label} · {dayLabel(crew.departureDay)} · {timeLabel}</p>
                      <h3 className="mt-2 text-2xl font-black">{destinationLabel}</h3>
                      <p className="mt-1 text-xs font-bold text-white/42">{laneLabel}{crew.boardCount ? ` · ${crew.boardCount} board ${crew.boardCount === 1 ? 'rental' : 'rentals'}` : ''}</p>
                    </div>
                    <div className="rounded-2xl border border-[#f5c518]/22 bg-[#f5c518]/8 px-3 py-2 text-center">
                      <span className="block text-xl font-black text-[#f8dd72]">{getBoatCrewCountLabel(crew)}</span>
                      <span className="block text-[8px] font-black uppercase tracking-[0.14em] text-white/40">going</span>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className="rounded-full border border-emerald-200/15 bg-emerald-300/[0.06] px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.1em] text-emerald-100/78">{getBoatCrewStatusCopy(crew.status)}</span>
                    <span className="rounded-full border border-white/9 bg-white/[0.035] px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.1em] text-white/50">~₱{crew.projectedSharePhp} each</span>
                    {crew.interestedCount ? <span className="rounded-full border border-white/9 bg-white/[0.035] px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.1em] text-white/50">+{crew.interestedCount} interested</span> : null}
                  </div>

                  {crew.operatorConfirmation ? (
                    <div className="mt-4 rounded-2xl border border-cyan-200/15 bg-cyan-300/[0.055] p-4 text-sm text-white/68">
                      <p className="font-black text-cyan-100">{formatDeparture(crew.operatorConfirmation.departureAt)} · {getOptionLabel(BOAT_DESTINATIONS, crew.operatorConfirmation.destination)}</p>
                      <p className="mt-1">₱{crew.operatorConfirmation.totalPhp} total · {crew.operatorConfirmation.capacity} seats · {crew.operatorConfirmation.name}</p>
                      {crew.operatorConfirmation.note ? <p className="mt-2 text-xs text-white/45">{crew.operatorConfirmation.note}</p> : null}
                      <p className="mt-2 text-[10px] font-bold text-white/36">{crew.acceptedCount}/{crew.confirmedCount} accepted final details</p>
                    </div>
                  ) : null}

                  <div className="mt-4 grid grid-cols-2 gap-2">
                    {!crew.viewerMembership ? (
                      <>
                        <button type="button" disabled={isPending} onClick={() => void updateMembership(crew, 'INTERESTED')} className="min-h-11 rounded-full border border-white/12 bg-white/[0.04] text-[10px] font-black uppercase tracking-[0.12em] text-white/62 disabled:opacity-40">Interested</button>
                        <button type="button" disabled={isPending} onClick={() => void updateMembership(crew, 'CONFIRMED')} className="min-h-11 rounded-full bg-[#f5c518] text-[10px] font-black uppercase tracking-[0.12em] text-[#171006] disabled:opacity-40">Confirm seat</button>
                      </>
                    ) : (
                      <>
                        <button type="button" disabled={isPending} onClick={() => void updateMembership(crew, crew.viewerMembership?.commitment === 'CONFIRMED' ? 'INTERESTED' : 'CONFIRMED')} className="min-h-11 rounded-full border border-white/12 bg-white/[0.04] text-[10px] font-black uppercase tracking-[0.12em] text-white/68 disabled:opacity-40">
                          {crew.viewerMembership.commitment === 'CONFIRMED' ? 'Switch to interested' : 'Confirm seat'}
                        </button>
                        <button type="button" disabled={isPending} onClick={() => void updateMembership(crew, 'LEAVE')} className="min-h-11 rounded-full border border-rose-200/12 bg-rose-300/[0.04] text-[10px] font-black uppercase tracking-[0.12em] text-rose-100/62 disabled:opacity-40">Leave</button>
                      </>
                    )}
                  </div>

                  <PlanShareButton
                    title={`Join the ${destinationLabel} surf boat`}
                    text={getBoatCrewShareText(crew)}
                    href={getBoatCrewInvitePath(crew.id)}
                    label="Share crew"
                    className="mt-2 w-full"
                  />

                  {crew.isCreator && crew.status === 'AWAITING_OPERATOR' ? (
                    <button type="button" disabled={isPending} onClick={() => void requestOperator(crew)} className="mt-2 min-h-11 w-full rounded-full border border-cyan-200/24 bg-cyan-300/[0.09] text-[10px] font-black uppercase tracking-[0.12em] text-cyan-100 disabled:opacity-40">
                      Copy private operator confirmation link
                    </button>
                  ) : null}
                  {crew.viewerMembership?.commitment === 'CONFIRMED' && crew.operatorConfirmation && !crew.viewerMembership.acceptedFinalDetails ? (
                    <button type="button" disabled={isPending} onClick={() => void acceptDetails(crew)} className="mt-2 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-emerald-300 text-[10px] font-black uppercase tracking-[0.12em] text-[#031c14] disabled:opacity-40">
                      <Check className="h-4 w-4" /> Accept final details
                    </button>
                  ) : null}
                  {crew.status === 'DEPARTED' ? (
                    <button type="button" onClick={() => { setLaunchSlug(crew.venueSlug as BoatLaunchSlug); setDepartureDay(tomorrow); setTimeWindow(crew.timeWindow); setDestination(crew.destination); setAbilityLane(crew.abilityLane); setShowCreate(true); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="mt-2 min-h-11 w-full rounded-full border border-[#f5c518]/20 bg-[#f5c518]/[0.07] text-[10px] font-black uppercase tracking-[0.12em] text-[#f8dd72]">
                      Same crew tomorrow?
                    </button>
                  ) : null}
                </article>
              );
            })}
          </div>
          {!loading && sortedCrews.length === 0 ? (
            <div className="mt-4 rounded-[1.6rem] border border-dashed border-white/14 bg-black/24 p-8 text-center">
              <Waves className="mx-auto h-7 w-7 text-cyan-200/62" />
              <p className="mt-3 font-black">No boat call yet.</p>
              <p className="mt-1 text-sm text-white/42">Start the first one and become `BOAT 1/4` on the map.</p>
            </div>
          ) : null}
        </section>

        <section className="mt-8 flex items-start gap-3 rounded-2xl border border-white/9 bg-white/[0.03] p-4 text-xs leading-relaxed text-white/42">
          <LifeBuoy className="mt-0.5 h-4 w-4 shrink-0 text-cyan-200/64" />
          <p>Coordination only. The actual operator confirms the boat, price, capacity, destination and departure. Pay the operator directly. Check conditions, ability, equipment and safety locally before leaving.</p>
        </section>
      </div>
    </main>
  );
}

function ChoiceGroup({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: ReadonlyArray<{ value: string; label: string }>;
}) {
  return (
    <fieldset>
      <legend className="text-[9px] font-black uppercase tracking-[0.18em] text-white/42">{label}</legend>
      <div className="mt-2 flex flex-wrap gap-2">
        {options.map((option) => (
          <button key={option.value} type="button" onClick={() => onChange(option.value)} aria-pressed={value === option.value} className={`min-h-10 rounded-full border px-3 text-[9px] font-black uppercase tracking-[0.1em] transition ${value === option.value ? 'border-cyan-100/35 bg-cyan-300/[0.12] text-cyan-100' : 'border-white/9 bg-white/[0.025] text-white/45'}`}>
            {option.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
