'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Loader2, MapPin, ShieldCheck, Sparkles } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

/**
 * Claim-by-presence — the host switch-on (spec: docs/specs/claim-by-presence.md).
 * Shows host controls ONLY when the signed-in wallet resolves to a host for this
 * venue (verified_owner or provisional_host) via /api/venues/[slug]/role. A
 * provisional host (on-site QR+GPS check-in + venue reputation, unclaimed venue)
 * can run a lightweight tonight loop — profile/QR/payouts stay owner-only.
 * Renders nothing for visitors/contributors, so the venue page is unchanged for them.
 */

type RoleData = {
  role: 'verified_owner' | 'provisional_host' | 'contributor' | 'visitor';
  canHost: boolean;
  provisional: boolean;
  onSiteWindowMinutes?: number;
};

type SessionShape = {
  token?: string | null;
  walletAddress?: string | null;
  user?: { walletAddress?: string | null } | null;
};

export default function VenueHostPanel({
  venueSlug,
  venueName,
}: {
  venueSlug: string;
  venueName: string;
}) {
  const { data: session } = useSession();
  const { toast } = useToast();
  const [role, setRole] = useState<RoleData | null>(null);
  const [starting, setStarting] = useState(false);
  const [started, setStarted] = useState(false);

  const sessionShape = session as unknown as SessionShape | null;
  const wallet = (sessionShape?.walletAddress ?? sessionShape?.user?.walletAddress ?? '').toLowerCase() || null;
  const token = sessionShape?.token ?? null;

  useEffect(() => {
    if (!wallet) {
      setRole(null);
      return;
    }
    let cancelled = false;
    fetch(`/api/venues/${encodeURIComponent(venueSlug)}/role?wallet=${encodeURIComponent(wallet)}`)
      .then((res) => res.json())
      .then((payload) => {
        if (!cancelled && payload?.success) setRole(payload.data as RoleData);
      })
      .catch(() => {
        if (!cancelled) setRole(null);
      });
    return () => {
      cancelled = true;
    };
  }, [wallet, venueSlug]);

  const startLoop = useCallback(async () => {
    setStarting(true);
    try {
      const now = new Date();
      const endsAt = new Date(now.getTime() + 6 * 60 * 60 * 1000);
      const res = await fetch(`/api/venues/${encodeURIComponent(venueSlug)}/spark-window`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          enabled: true,
          windowLabel: `Tonight at ${venueName}`.slice(0, 80),
          perkLabel: 'Welcome perk for checked-in guests',
          targetCheckIns: 20,
          startsAt: now.toISOString(),
          endsAt: endsAt.toISOString(),
        }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok || !payload?.success) {
        throw new Error(payload?.error || 'Could not start the loop');
      }
      setStarted(true);
      toast({
        title: 'Tonight’s loop is live',
        description: `${venueName} is running a Spark Window — check-ins and proof flow in now.`,
      });
    } catch (error) {
      toast({
        title: 'Could not start the loop',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setStarting(false);
    }
  }, [token, venueName, venueSlug, toast]);

  if (!wallet || !role?.canHost) return null;

  const isOwner = role.role === 'verified_owner';

  return (
    <div className="relative overflow-hidden rounded-[28px] border border-[#f5c518]/24 bg-[linear-gradient(180deg,rgba(245,197,24,0.1)_0%,rgba(13,10,22,0.92)_100%)] p-5 shadow-[0_24px_60px_rgba(0,0,0,0.34),inset_0_1px_0_rgba(255,255,255,0.1)] sm:p-6">
      <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-[#f8dd72]/40 to-transparent" />
      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#f5c518]/24 bg-[#f5c518]/[0.1] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.22em] text-[#f8dd72]">
            {isOwner ? <ShieldCheck className="h-4 w-4" /> : <MapPin className="h-4 w-4" />}
            {isOwner ? 'You own this venue' : 'You can host tonight'}
          </div>
          <h2 className="mt-3 text-xl font-black tracking-tight text-white sm:text-2xl">
            {started ? 'Tonight’s loop is live.' : `Run a Spark Window at ${venueName}.`}
          </h2>
          <p className="mt-1.5 max-w-xl text-sm font-semibold leading-6 text-white/58">
            {role.provisional
              ? 'Provisional host — you’re on-site, so you can run a lightweight loop here. Profile, QR, and payouts stay owner-only.'
              : 'Open a check-in + perk window so guests start proving presence.'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void startLoop()}
          disabled={starting || started}
          className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-full border border-[#f5c518]/30 bg-[linear-gradient(180deg,rgba(255,225,87,0.28)_0%,rgba(145,89,0,0.26)_100%)] px-5 text-xs font-black uppercase tracking-[0.16em] text-[#f8dd72] shadow-[0_16px_26px_rgba(0,0,0,0.24),inset_0_1px_0_rgba(255,255,255,0.14)] transition hover:-translate-y-[1px] hover:border-[#f8dd72]/50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {starting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {started ? 'Loop running' : starting ? 'Starting…' : 'Start tonight’s loop'}
        </button>
      </div>
    </div>
  );
}
