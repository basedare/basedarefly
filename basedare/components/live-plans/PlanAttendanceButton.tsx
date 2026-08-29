'use client';

import { Check, Loader2, Users } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useState } from 'react';
import { useAccount, useSignMessage } from 'wagmi';

import type { AttendancePlanType } from '@/lib/live-plan-retention';
import { triggerHaptic } from '@/lib/mobile-haptics';
import { buildWalletActionAuthHeaders } from '@/lib/wallet-action-auth';

type CommunitySession = {
  token?: string;
  walletAddress?: string | null;
  user?: { walletAddress?: string | null } | null;
};

export default function PlanAttendanceButton({ planType, planId }: { planType: AttendancePlanType; planId: string }) {
  const { data: session } = useSession();
  const { address } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const sessionShape = session as CommunitySession | null;
  const sessionWallet = sessionShape?.walletAddress ?? sessionShape?.user?.walletAddress ?? null;
  const actorWallet = address ?? sessionWallet;
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<{ count: number; completed: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const confirm = async () => {
    setError(null);
    if (!actorWallet) {
      setError('Sign in with the identity that joined this plan.');
      return;
    }
    setPending(true);
    try {
      const headers = await buildWalletActionAuthHeaders({
        walletAddress: actorWallet,
        sessionToken: sessionShape?.token ?? null,
        sessionWallet,
        action: 'live-plan:attendance',
        resource: `${planType}:${planId}`,
        signMessageAsync,
      });
      const response = await fetch(`/api/live-plans/${planType}/${encodeURIComponent(planId)}/attendance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ walletAddress: actorWallet }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.success) throw new Error(payload?.error || 'Could not confirm.');
      const next = {
        count: Number(payload.data?.attendanceCount) || 1,
        completed: payload.data?.completedTogether === true,
      };
      setResult(next);
      triggerHaptic(next.completed ? 'success' : 'selection');
    } catch (confirmError) {
      setError(confirmError instanceof Error ? confirmError.message : 'Could not confirm.');
    } finally {
      setPending(false);
    }
  };

  if (result) {
    return (
      <div className="rounded-2xl border border-emerald-200/18 bg-emerald-300/[0.07] p-4 text-emerald-100">
        <p className="flex items-center gap-2 text-sm font-black"><Check className="h-4 w-4" /> You marked: We went.</p>
        <p className="mt-1 text-xs leading-5 text-emerald-100/58">
          {result.completed ? `${result.count} crew members confirmed. This counts as a completed plan together.` : 'One more crewmate confirmation makes this a completed plan together.'}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-cyan-200/16 bg-cyan-300/[0.055] p-4">
      <p className="text-sm font-black text-white">Did you go?</p>
      <p className="mt-1 text-xs leading-5 text-white/42">Crew-reported attendance—not location proof. Two confirmations count the plan as completed together.</p>
      <button type="button" disabled={pending} onClick={() => void confirm()} className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-cyan-200 px-4 text-[10px] font-black uppercase tracking-[0.13em] text-[#052029] disabled:opacity-45">
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Users className="h-4 w-4" />} {pending ? 'Confirming…' : 'We went'}
      </button>
      {error ? <p role="status" className="mt-2 text-xs font-bold text-rose-200">{error}</p> : null}
    </div>
  );
}
