'use client';

import { Gift, Loader2, Radio, ShieldCheck, Users } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { VERIFIED_VENUE_CHECK_IN_POINTS } from '@/lib/creator-passport-constants';
import { triggerHaptic } from '@/lib/mobile-haptics';

type VenueQrResponse = {
  success?: boolean;
  error?: string;
  data?: {
    qrValue?: string | null;
  };
};

export default function VenueCheckInButton({
  venueId,
  venueName,
  live,
  perkTitle,
}: {
  venueId: string;
  venueName: string;
  live: boolean;
  perkTitle?: string | null;
}) {
  const router = useRouter();
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openCheckIn = async () => {
    if (!live || opening) return;

    setOpening(true);
    setError(null);
    triggerHaptic('selection');

    try {
      const response = await fetch(`/api/venues/id/${encodeURIComponent(venueId)}/qr`, {
        cache: 'no-store',
      });
      const payload = (await response.json().catch(() => null)) as VenueQrResponse | null;

      if (!response.ok || !payload?.success || !payload.data?.qrValue) {
        throw new Error(payload?.error ?? 'The live venue pass is unavailable right now.');
      }

      const handshakeUrl = new URL(payload.data.qrValue, window.location.origin);
      router.push(`${handshakeUrl.pathname}${handshakeUrl.search}`);
    } catch (launchError) {
      setError(launchError instanceof Error ? launchError.message : 'Unable to open venue check-in.');
      setOpening(false);
      triggerHaptic('warning');
    }
  };

  return (
    <div className="grid gap-2">
      <button
        type="button"
        onClick={() => void openCheckIn()}
        disabled={!live || opening}
        aria-busy={opening}
        aria-label={live ? `Check in at ${venueName}` : `Venue check-in is not live at ${venueName}`}
        className="group relative min-h-[58px] w-full overflow-hidden rounded-[22px] border border-[#f8dd72]/30 bg-[radial-gradient(circle_at_14%_0%,rgba(248,221,114,0.22),transparent_34%),linear-gradient(180deg,rgba(245,197,24,0.2)_0%,rgba(34,211,238,0.11)_46%,rgba(6,10,18,0.96)_100%)] px-4 py-3 text-left shadow-[0_18px_32px_rgba(0,0,0,0.3),0_0_24px_rgba(245,197,24,0.09),inset_0_1px_0_rgba(255,255,255,0.16),inset_0_-14px_20px_rgba(0,0,0,0.25)] transition hover:-translate-y-px hover:border-[#f8dd72]/50 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0"
      >
        <span className="relative z-10 flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[16px] border border-[#f8dd72]/25 bg-[#f8dd72]/10 text-[#f8dd72] shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]">
            {opening ? <Loader2 className="h-5 w-5 animate-spin" /> : <ShieldCheck className="h-5 w-5" />}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-black uppercase tracking-[0.12em] text-white">
              {opening ? 'Opening venue pass…' : live ? 'Check in here' : 'Venue pass not live'}
            </span>
            <span className="mt-1 block text-xs leading-4 text-white/54">
              {live
                ? perkTitle
                  ? `Unlock ${perkTitle} + first-visit Signal Points.`
                  : `First QR + GPS visit earns ${VERIFIED_VENUE_CHECK_IN_POINTS} Signal Points.`
                : 'The venue must activate its rotating pass first.'}
            </span>
          </span>
          <Radio className="h-4 w-4 shrink-0 text-cyan-100/72" />
        </span>
      </button>

      {live ? (
        <div className="grid grid-cols-3 gap-1.5 text-center text-[9px] font-black uppercase tracking-[0.1em] text-white/45">
          <span className="rounded-xl border border-white/8 bg-black/20 px-1.5 py-2">
            <Users className="mx-auto mb-1 h-3.5 w-3.5 text-cyan-100/70" />
            Local room
          </span>
          <span className="rounded-xl border border-white/8 bg-black/20 px-1.5 py-2">
            <Radio className="mx-auto mb-1 h-3.5 w-3.5 text-[#f8dd72]/80" />
            Crossed paths
          </span>
          <span className="rounded-xl border border-white/8 bg-black/20 px-1.5 py-2">
            <Gift className="mx-auto mb-1 h-3.5 w-3.5 text-emerald-100/70" />
            Live perks
          </span>
        </div>
      ) : null}

      {error ? (
        <p aria-live="polite" className="rounded-2xl border border-rose-300/16 bg-rose-500/[0.07] px-3 py-2 text-xs leading-5 text-rose-100/82">
          {error}
        </p>
      ) : null}
    </div>
  );
}
