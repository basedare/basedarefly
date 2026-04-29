'use client';

import { useEffect, useMemo, useState } from 'react';
import { BellRing, Loader2, Radio, X } from 'lucide-react';

import { useWalletPushSubscription } from '@/hooks/useWalletPushSubscription';

type PushActivationCardProps = {
  className?: string;
  compact?: boolean;
};

const DISMISS_PREFIX = 'basedare:push-activation-dismissed';

function readDismissed(wallet: string) {
  if (typeof window === 'undefined') return true;

  try {
    return window.localStorage.getItem(`${DISMISS_PREFIX}:${wallet}`) === '1';
  } catch {
    return true;
  }
}

function writeDismissed(wallet: string) {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(`${DISMISS_PREFIX}:${wallet}`, '1');
  } catch {
    // Storage failures should not block the user from continuing.
  }
}

export default function PushActivationCard({ className = '', compact = false }: PushActivationCardProps) {
  const {
    address,
    permission,
    pushBusy,
    pushEnabled,
    pushMessage,
    pushSupported,
    syncPushSubscription,
    vapidPublicKey,
  } = useWalletPushSubscription();
  const walletKey = useMemo(() => address?.toLowerCase() ?? null, [address]);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    if (!walletKey) {
      setDismissed(true);
      return;
    }
    setDismissed(readDismissed(walletKey));
  }, [walletKey]);

  const dismiss = () => {
    if (walletKey) {
      writeDismissed(walletKey);
    }
    setDismissed(true);
  };

  if (!walletKey || !pushSupported || !vapidPublicKey || pushEnabled || dismissed) {
    return null;
  }

  const permissionBlocked = permission === 'denied';

  return (
    <section
      className={`relative isolate overflow-hidden rounded-[28px] border border-cyan-300/18 bg-[linear-gradient(135deg,rgba(8,22,30,0.92)_0%,rgba(13,11,25,0.96)_52%,rgba(6,6,12,0.98)_100%)] p-4 shadow-[0_22px_50px_rgba(0,0,0,0.34),0_0_28px_rgba(34,211,238,0.08),inset_0_1px_0_rgba(255,255,255,0.12),inset_0_-16px_22px_rgba(0,0,0,0.24)] ${className}`}
    >
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_8%_0%,rgba(34,211,238,0.22),transparent_30%),radial-gradient(circle_at_88%_20%,rgba(250,204,21,0.12),transparent_28%),radial-gradient(circle_at_68%_100%,rgba(168,85,247,0.14),transparent_36%)]" />
      <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-cyan-100/45 to-transparent" />

      <button
        type="button"
        onClick={dismiss}
        className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full border border-white/10 bg-black/20 text-white/45 transition hover:bg-white/10 hover:text-white"
        aria-label="Dismiss push alert setup"
      >
        <X className="h-4 w-4" />
      </button>

      <div className={`flex gap-4 ${compact ? 'flex-col sm:flex-row sm:items-center sm:justify-between' : 'flex-col md:flex-row md:items-center md:justify-between'}`}>
        <div className="flex min-w-0 gap-3 pr-8 sm:pr-0">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-cyan-200/25 bg-cyan-300/[0.1] text-cyan-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_0_22px_rgba(34,211,238,0.12)]">
            <BellRing className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-cyan-200/20 bg-cyan-300/[0.08] px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.22em] text-cyan-100/80">
                Live Alerts
              </span>
              <span className="rounded-full border border-yellow-200/20 bg-yellow-300/[0.08] px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.22em] text-yellow-100/70">
                This device
              </span>
            </div>
            <h3 className="mt-2 text-base font-black text-white sm:text-lg">
              Arm BaseDare alerts before you leave.
            </h3>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-white/56">
              Get wallet, proof, payout, campaign, and nearby venue signals without keeping the app open.
              One wallet signature may be requested to bind this device.
            </p>
            {pushMessage ? (
              <p className="mt-2 text-xs font-semibold text-cyan-100/80">{pushMessage}</p>
            ) : permissionBlocked ? (
              <p className="mt-2 text-xs font-semibold text-yellow-100/80">
                Browser notifications are blocked. Re-enable them in site settings to receive alerts.
              </p>
            ) : null}
          </div>
        </div>

        <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={() => void syncPushSubscription()}
            disabled={pushBusy || permissionBlocked}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-cyan-200/28 bg-[linear-gradient(180deg,rgba(103,232,249,0.22)_0%,rgba(8,145,178,0.22)_100%)] px-5 text-xs font-black uppercase tracking-[0.18em] text-cyan-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_12px_28px_rgba(0,0,0,0.28)] transition hover:-translate-y-0.5 hover:bg-cyan-300/[0.18] active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-45"
          >
            {pushBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Radio className="h-4 w-4" />}
            Arm alerts
          </button>
          <button
            type="button"
            onClick={dismiss}
            className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.035] px-4 text-xs font-bold uppercase tracking-[0.18em] text-white/55 transition hover:bg-white/[0.07] hover:text-white/75"
          >
            Not now
          </button>
        </div>
      </div>
    </section>
  );
}
