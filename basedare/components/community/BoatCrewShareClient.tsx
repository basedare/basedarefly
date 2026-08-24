'use client';

import Link from 'next/link';
import { Anchor, ArrowLeft, Check, LifeBuoy, MapPin, ShipWheel, Users, Waves } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useCallback, useEffect, useState } from 'react';
import { useAccount, useSignMessage } from 'wagmi';

import PlanShareButton from '@/components/community/PlanShareButton';
import { IdentityButton } from '@/components/IdentityButton';
import {
  BOAT_DESTINATIONS,
  BOAT_TIME_WINDOWS,
  SURF_ABILITY_LANES,
  getBoatCrewCountLabel,
  getBoatCrewInvitePath,
  getBoatCrewShareText,
  getBoatCrewStatusCopy,
  getBoatLaunch,
  getOptionLabel,
  type BoatCommitment,
  type BoatCrewSummary,
} from '@/lib/surf-boat-board';
import { buildWalletActionAuthHeaders } from '@/lib/wallet-action-auth';
import { triggerHaptic } from '@/lib/mobile-haptics';

type CommunitySession = {
  token?: string;
  walletAddress?: string | null;
  user?: { walletAddress?: string | null } | null;
};

function formatDeparture(value: string) {
  return new Intl.DateTimeFormat('en-PH', {
    timeZone: 'Asia/Manila',
    weekday: 'short',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

export default function BoatCrewShareClient({ initialCrew }: { initialCrew: BoatCrewSummary }) {
  const { data: session } = useSession();
  const { address } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const sessionShape = session as CommunitySession | null;
  const sessionWallet = sessionShape?.walletAddress ?? sessionShape?.user?.walletAddress ?? null;
  const actorWallet = address ?? sessionWallet;
  const [crew, setCrew] = useState(initialCrew);
  const [needsBoard, setNeedsBoard] = useState(false);
  const [pending, setPending] = useState<BoatCommitment | null>(null);
  const [state, setState] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const refresh = useCallback(async () => {
    const response = await fetch(`/api/boat-crews?crewId=${encodeURIComponent(initialCrew.id)}`, { cache: 'no-store' });
    const payload = await response.json().catch(() => null);
    if (response.ok && payload?.success && payload.data?.crews?.[0]) {
      const next = payload.data.crews[0] as BoatCrewSummary;
      setCrew((current) => ({
        ...next,
        viewerMembership: next.viewerMembership ?? current.viewerMembership,
      }));
    }
  }, [initialCrew.id]);

  useEffect(() => {
    void refresh();
    const interval = window.setInterval(() => void refresh(), 20_000);
    return () => window.clearInterval(interval);
  }, [refresh]);

  const join = async (commitment: BoatCommitment) => {
    setState(null);
    if (!actorWallet) {
      setState({ type: 'error', message: 'Sign in from the top bar, then tap again. The crew link will stay here.' });
      return;
    }
    setPending(commitment);
    try {
      const headers = await buildWalletActionAuthHeaders({
        walletAddress: actorWallet,
        sessionToken: sessionShape?.token ?? null,
        sessionWallet,
        action: 'boat-crew:membership',
        resource: `crew:${crew.id}`,
        signMessageAsync,
      });
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
      if (!response.ok || !payload?.success) throw new Error(payload?.error || 'Could not join this crew.');
      const reachedMinimum = payload.data?.reachedMinimum === true;
      triggerHaptic(reachedMinimum ? 'success' : 'selection');
      setState({
        type: 'success',
        message: reachedMinimum
          ? 'Crew unlocked. The organizer can now confirm the real boat.'
          : commitment === 'CONFIRMED'
            ? 'You’re in. Share the crew to fill the boat.'
            : 'Marked maybe. Come back when you know.',
      });
      setCrew((current) => ({
        ...current,
        confirmedCount: current.confirmedCount + (commitment === 'CONFIRMED' ? 1 : 0),
        interestedCount: current.interestedCount + (commitment === 'INTERESTED' ? 1 : 0),
        viewerMembership: { commitment, needsBoard, acceptedFinalDetails: false },
      }));
      await refresh();
    } catch (error) {
      setState({ type: 'error', message: error instanceof Error ? error.message : 'Could not join this crew.' });
    } finally {
      setPending(null);
    }
  };

  const destination = getOptionLabel(BOAT_DESTINATIONS, crew.destination);
  const launch = getBoatLaunch(crew.venueSlug);
  const time = getOptionLabel(BOAT_TIME_WINDOWS, crew.timeWindow);
  const lane = getOptionLabel(SURF_ABILITY_LANES, crew.abilityLane);
  const closed = crew.status === 'DEPARTED' || crew.status === 'CANCELLED';

  return (
    <main className="relative min-h-screen overflow-hidden px-4 pb-24 pt-28 text-white sm:px-6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_72%_0%,rgba(34,211,238,0.15),transparent_34%),radial-gradient(circle_at_12%_28%,rgba(245,197,24,0.12),transparent_30%)]" />
      <div className="relative mx-auto max-w-2xl">
        <Link href={launch.boardPath} className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-white/48 hover:text-white">
          <ArrowLeft className="h-4 w-4" /> Siargao Boat Board
        </Link>

        <section className="mt-5 overflow-hidden rounded-[2rem] border border-cyan-200/18 bg-[linear-gradient(155deg,rgba(12,35,44,0.94),rgba(6,7,15,0.99))] p-5 shadow-[0_28px_90px_rgba(0,0,0,0.52),inset_0_1px_0_rgba(255,255,255,0.08)] sm:p-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.22em] text-cyan-200/68">Surf boat · {launch.mapLabel}</p>
              <h1 className="mt-3 text-4xl font-black leading-[0.95] sm:text-5xl">{destination}</h1>
            </div>
            <span className="rounded-2xl border border-[#f5c518]/22 bg-[#f5c518]/[0.09] px-3 py-2 text-center">
              <strong className="block text-2xl text-[#f8dd72]">{getBoatCrewCountLabel(crew)}</strong>
              <span className="block text-[8px] font-black uppercase tracking-[0.14em] text-white/40">going</span>
            </span>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
            <span className="rounded-2xl border border-white/9 bg-black/22 p-3"><Anchor className="h-4 w-4 text-cyan-200" /><strong className="mt-2 block">{time}</strong></span>
            <span className="rounded-2xl border border-white/9 bg-black/22 p-3"><Waves className="h-4 w-4 text-cyan-200" /><strong className="mt-2 block">{lane}</strong></span>
            <span className="rounded-2xl border border-white/9 bg-black/22 p-3"><Users className="h-4 w-4 text-[#f8dd72]" /><strong className="mt-2 block">{getBoatCrewStatusCopy(crew.status)}</strong></span>
            <span className="rounded-2xl border border-white/9 bg-black/22 p-3"><ShipWheel className="h-4 w-4 text-[#f8dd72]" /><strong className="mt-2 block">~₱{crew.projectedSharePhp} each</strong></span>
          </div>

          {crew.operatorConfirmation ? (
            <div className="mt-4 rounded-2xl border border-emerald-200/16 bg-emerald-300/[0.065] p-4 text-sm text-white/66">
              <p className="font-black text-emerald-100">Boat confirmed · {formatDeparture(crew.operatorConfirmation.departureAt)}</p>
              <p className="mt-1">{crew.operatorConfirmation.capacity} seats · ₱{crew.operatorConfirmation.totalPhp} total · {crew.operatorConfirmation.name}</p>
              {crew.operatorConfirmation.note ? <p className="mt-2 text-xs text-white/42">{crew.operatorConfirmation.note}</p> : null}
            </div>
          ) : (
            <p className="mt-4 text-xs leading-5 text-white/42">The final destination, time, capacity and price are confirmed by the real boat operator after the crew reaches four.</p>
          )}

          {!closed && !crew.viewerMembership && !actorWallet ? (
            <div className="mt-5 rounded-2xl border border-[#f5c518]/22 bg-[#f5c518]/[0.07] p-4">
              <p className="text-sm font-black text-white">Invited by a friend?</p>
              <p className="mt-1 text-xs leading-5 text-white/48">Join BaseDare here, then take a seat without losing this boat.</p>
              <div className="mt-3 max-w-48"><IdentityButton /></div>
            </div>
          ) : !closed && !crew.viewerMembership ? (
            <div className="mt-5">
              <label className="flex min-h-11 items-center gap-3 rounded-2xl border border-white/10 bg-black/24 px-4 text-sm font-bold text-white/64">
                <input type="checkbox" checked={needsBoard} onChange={(event) => setNeedsBoard(event.target.checked)} className="h-4 w-4 accent-[#f5c518]" /> I need a rental board
              </label>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button type="button" disabled={pending !== null} onClick={() => void join('INTERESTED')} className="min-h-12 rounded-full border border-white/12 bg-white/[0.045] text-[10px] font-black uppercase tracking-[0.14em] text-white/68 disabled:opacity-45">{pending === 'INTERESTED' ? 'Saving…' : 'Maybe'}</button>
                <button type="button" disabled={pending !== null} onClick={() => void join('CONFIRMED')} className="min-h-12 rounded-full bg-[#f5c518] text-[10px] font-black uppercase tracking-[0.14em] text-[#171006] disabled:opacity-45">{pending === 'CONFIRMED' ? 'Joining…' : 'I’m in'}</button>
              </div>
            </div>
          ) : crew.viewerMembership ? (
            <div className="mt-5 flex items-center gap-2 rounded-2xl border border-emerald-200/18 bg-emerald-300/[0.07] p-4 text-sm font-black text-emerald-100"><Check className="h-5 w-5" /> {crew.viewerMembership.commitment === 'CONFIRMED' ? 'You’re in this crew.' : 'You’re interested.'}</div>
          ) : null}

          {state ? <p role="status" className={`mt-4 rounded-2xl border p-3 text-xs font-bold ${state.type === 'success' ? 'border-emerald-200/20 bg-emerald-300/[0.08] text-emerald-100' : 'border-rose-200/20 bg-rose-300/[0.08] text-rose-100'}`}>{state.message}</p> : null}

          <PlanShareButton title={`Join the ${destination} surf boat`} text={getBoatCrewShareText(crew)} href={getBoatCrewInvitePath(crew.id)} label="Invite friends" className="mt-4 w-full" />
          <Link href={launch.mapPath} className="mt-3 inline-flex min-h-10 w-full items-center justify-center gap-2 text-[10px] font-black uppercase tracking-[0.14em] text-white/42 hover:text-white/72"><MapPin className="h-4 w-4" /> Open {launch.mapLabel} on map</Link>
        </section>

        <p className="mt-4 flex items-start gap-2 px-2 text-[10px] leading-4 text-white/34"><LifeBuoy className="mt-0.5 h-4 w-4 shrink-0" /> BaseDare coordinates the crew only. Pay the operator directly and check conditions, ability, equipment and safety locally.</p>
      </div>
    </main>
  );
}
