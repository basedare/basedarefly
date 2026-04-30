import { BellRing, Radio, Send } from 'lucide-react';

import { SIGNAL_ROOM_URL } from '@/lib/signal-room';

type SignalRoomCardProps = {
  className?: string;
  compact?: boolean;
};

export default function SignalRoomCard({ className = '', compact = false }: SignalRoomCardProps) {
  if (!SIGNAL_ROOM_URL) return null;

  return (
    <section
      className={`relative isolate overflow-hidden rounded-[28px] border border-yellow-200/18 bg-[linear-gradient(135deg,rgba(31,24,9,0.88)_0%,rgba(13,11,22,0.96)_52%,rgba(4,8,12,0.98)_100%)] p-4 shadow-[0_22px_50px_rgba(0,0,0,0.3),0_0_28px_rgba(250,204,21,0.07),inset_0_1px_0_rgba(255,255,255,0.1),inset_0_-16px_22px_rgba(0,0,0,0.22)] ${className}`}
    >
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_10%_0%,rgba(250,204,21,0.2),transparent_30%),radial-gradient(circle_at_88%_20%,rgba(34,211,238,0.12),transparent_28%),radial-gradient(circle_at_68%_100%,rgba(168,85,247,0.14),transparent_36%)]" />
      <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-yellow-100/45 to-transparent" />

      <div className={`flex gap-4 ${compact ? 'flex-col sm:flex-row sm:items-center sm:justify-between' : 'flex-col md:flex-row md:items-center md:justify-between'}`}>
        <div className="flex min-w-0 gap-3">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-yellow-200/25 bg-yellow-300/[0.1] text-yellow-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_0_22px_rgba(250,204,21,0.12)]">
            <Radio className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-yellow-200/20 bg-yellow-300/[0.08] px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.22em] text-yellow-100/80">
                Signal Room
              </span>
              <span className="rounded-full border border-cyan-200/20 bg-cyan-300/[0.08] px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.22em] text-cyan-100/70">
                Public feed
              </span>
            </div>
            <h3 className="mt-2 text-base font-black text-white sm:text-lg">
              Join the live BaseDare Telegram feed.
            </h3>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-white/56">
              Public activations, open dares, venue signals, and quick operator support. Private wallet alerts stay in
              browser push and the in-app bell.
            </p>
          </div>
        </div>

        <a
          href={SIGNAL_ROOM_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-full border border-yellow-200/28 bg-[linear-gradient(180deg,rgba(250,204,21,0.24)_0%,rgba(161,98,7,0.24)_100%)] px-5 text-xs font-black uppercase tracking-[0.18em] text-yellow-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_12px_28px_rgba(0,0,0,0.28)] transition hover:-translate-y-0.5 hover:bg-yellow-300/[0.18] active:translate-y-0"
        >
          <Send className="h-4 w-4" />
          Join Telegram
        </a>
      </div>

      <div className="mt-3 flex items-center gap-2 rounded-2xl border border-white/8 bg-black/18 px-3 py-2 text-[11px] font-semibold leading-5 text-white/45">
        <BellRing className="h-3.5 w-3.5 shrink-0 text-yellow-100/70" />
        Use this for public discovery. Use browser push for personalized wallet, proof, payout, and nearby alerts.
      </div>
    </section>
  );
}
