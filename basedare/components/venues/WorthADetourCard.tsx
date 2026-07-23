'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Award, Loader2, MapPinned, Undo2 } from 'lucide-react';
import { useAccount, useSignMessage } from 'wagmi';

import { useToast } from '@/components/ui/use-toast';
import { buildWalletActionAuthHeaders } from '@/lib/wallet-action-auth';

type SessionShape = {
  token?: string | null;
  walletAddress?: string | null;
  user?: { walletAddress?: string | null } | null;
};

type EndorsementSnapshot = {
  count: number;
  recent: Array<{ id: string; tag: string | null; createdAt: string }>;
  eligibility: null | {
    eligible: boolean;
    reasons: string[];
    alreadyEndorsed: boolean;
    activeEndorsementCount: number;
    acceptedContributionCount: number;
    distinctContributionPlaces: number;
    placeHealth: string;
  };
};

function sessionFields(session: SessionShape | null | undefined) {
  const walletAddress = session?.walletAddress ?? session?.user?.walletAddress ?? null;
  return { token: session?.token ?? null, walletAddress: walletAddress?.toLowerCase() ?? null };
}

export default function WorthADetourCard({ venueSlug, venueName }: { venueSlug: string; venueName: string }) {
  const { data: session } = useSession();
  const { address } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const { toast } = useToast();
  const [snapshot, setSnapshot] = useState<EndorsementSnapshot | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fields = useMemo(() => sessionFields((session as SessionShape | null) ?? null), [session]);
  const walletAddress = address?.toLowerCase() ?? fields.walletAddress;

  const load = useCallback(async () => {
    try {
      const response = await fetch(`/api/venues/${encodeURIComponent(venueSlug)}/endorsement`, { cache: 'no-store' });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload.error || 'Unable to load endorsement signal.');
      setSnapshot(payload.data);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load endorsement signal.');
    }
  }, [venueSlug]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    setSnapshot((current) => current ? { ...current, eligibility: null } : current);
  }, [walletAddress]);

  const checkEligibility = async () => {
    if (!walletAddress) return;
    setBusy(true);
    setError(null);
    try {
      const headers = await buildWalletActionAuthHeaders({
        walletAddress,
        sessionToken: fields.token,
        sessionWallet: fields.walletAddress,
        action: 'place:worth-a-detour:check',
        resource: `venue:${venueSlug}:worth-a-detour`,
        signatureScope: 'action',
        forceFreshSignature: true,
        signMessageAsync,
      });
      const response = await fetch(`/api/venues/${encodeURIComponent(venueSlug)}/endorsement/eligibility`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ walletAddress }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload.error || 'Unable to check eligibility.');
      setSnapshot(payload.data);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to check eligibility.');
    } finally {
      setBusy(false);
    }
  };

  const act = async (mode: 'add' | 'retract') => {
    if (!walletAddress) return;
    setBusy(true);
    setError(null);
    try {
      const action = mode === 'add' ? 'place:worth-a-detour:add' : 'place:worth-a-detour:retract';
      const headers = await buildWalletActionAuthHeaders({
        walletAddress,
        sessionToken: fields.token,
        sessionWallet: fields.walletAddress,
        action,
        resource: `venue:${venueSlug}:worth-a-detour`,
        signatureScope: 'action',
        forceFreshSignature: true,
        signMessageAsync,
      });
      const response = await fetch(`/api/venues/${encodeURIComponent(venueSlug)}/endorsement`, {
        method: mode === 'add' ? 'POST' : 'DELETE',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ walletAddress }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload.error || 'Unable to update endorsement.');
      setSnapshot(payload.data);
      toast({
        title: mode === 'add' ? 'Worth a Detour marked' : 'Endorsement retracted',
        description: mode === 'add'
          ? `${venueName} now carries one of your scarce place signals.`
          : `Your signal was removed from ${venueName}.`,
      });
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Unable to update endorsement.';
      setError(message);
      toast({ title: 'Endorsement not changed', description: message, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const eligibility = snapshot?.eligibility;
  return (
    <section className="relative overflow-hidden rounded-[26px] border border-[#f5c518]/16 bg-[linear-gradient(145deg,rgba(245,197,24,0.08),rgba(12,11,20,0.94)_54%,rgba(34,211,238,0.05))] px-5 py-5 shadow-[0_18px_30px_rgba(0,0,0,0.24),inset_0_1px_0_rgba(255,255,255,0.08)]">
      <div className="pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-[#f8dd72]/45 to-transparent" />
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-[#f8dd72]">
            <Award className="h-4 w-4" /> Earned place signal
          </p>
          <h2 className="mt-2 text-xl font-black text-white">Worth a Detour</h2>
          <p className="mt-1 max-w-xl text-sm leading-6 text-white/55">
            A scarce endorsement from people with secure visits and useful contributions—not a public star rating.
          </p>
        </div>
        <div className="min-w-16 rounded-2xl border border-[#f5c518]/20 bg-black/35 px-3 py-2 text-center">
          <strong className="block text-2xl font-black text-[#f8dd72]">{snapshot?.count ?? '—'}</strong>
          <span className="text-[8px] font-black uppercase tracking-[0.16em] text-white/35">signals</span>
        </div>
      </div>

      {error ? <p className="mt-4 rounded-xl border border-rose-400/20 bg-rose-500/[0.08] px-3 py-2 text-xs text-rose-100">{error}</p> : null}

      {eligibility?.alreadyEndorsed ? (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-300/16 bg-emerald-500/[0.07] p-3">
          <p className="flex items-center gap-2 text-sm font-bold text-emerald-100"><MapPinned className="h-4 w-4" /> Your endorsement is active.</p>
          <button type="button" disabled={busy} onClick={() => void act('retract')} className="inline-flex h-9 items-center gap-2 rounded-full border border-white/10 bg-black/25 px-3 text-[9px] font-black uppercase tracking-[0.14em] text-white/55 transition hover:text-white disabled:opacity-40">
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Undo2 className="h-3.5 w-3.5" />} Retract
          </button>
        </div>
      ) : eligibility?.eligible ? (
        <button type="button" disabled={busy} onClick={() => void act('add')} className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-[#f5c518]/32 bg-[#f5c518]/[0.13] px-4 text-[10px] font-black uppercase tracking-[0.16em] text-[#fff1a8] shadow-[0_10px_24px_rgba(245,197,24,0.09),inset_0_1px_0_rgba(255,255,255,0.12)] transition hover:border-[#f8dd72]/55 hover:bg-[#f5c518]/[0.18] disabled:opacity-40">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Award className="h-4 w-4" />} Mark Worth a Detour
        </button>
      ) : walletAddress && eligibility ? (
        <details className="group mt-4 rounded-2xl border border-white/8 bg-black/20 px-4 py-3">
          <summary className="cursor-pointer list-none text-[10px] font-black uppercase tracking-[0.15em] text-white/50">How to earn this signal</summary>
          <ul className="mt-3 space-y-1 text-xs leading-5 text-white/48">
            {eligibility.reasons.map((reason) => <li key={reason}>• {reason}</li>)}
          </ul>
          <p className="mt-3 text-[10px] uppercase tracking-[0.1em] text-white/30">
            {eligibility.acceptedContributionCount}/3 contributions · {eligibility.distinctContributionPlaces}/2 places · {eligibility.activeEndorsementCount}/3 active
          </p>
        </details>
      ) : walletAddress ? (
        <button type="button" disabled={busy} onClick={() => void checkEligibility()} className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-white/12 bg-white/[0.045] px-4 text-[10px] font-black uppercase tracking-[0.16em] text-white/62 transition hover:border-[#f8dd72]/30 hover:text-[#fff1a8] disabled:opacity-40">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Award className="h-4 w-4" />} Check if you earned it
        </button>
      ) : (
        <p className="mt-4 rounded-2xl border border-white/8 bg-black/20 px-4 py-3 text-xs leading-5 text-white/45">
          Secure visits and useful place contributions unlock this signal. Explore first; BaseDare will show eligibility when you earn it.
        </p>
      )}
    </section>
  );
}
