'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { ArrowRight, CheckCircle2, Loader2 } from 'lucide-react';

import { displayHandle, normalizeHandle, type BoardRow, type ClaimResult } from '@/lib/pack';
import { trackClientEvent } from '@/lib/analytics';

const inputClass =
  'w-full rounded-[16px] border border-white/10 bg-black/30 px-4 py-3 text-base font-bold text-white outline-none transition placeholder:text-white/28 focus:border-cyan-200/40 focus:bg-black/40';
const labelClass = 'mb-1.5 block text-[10px] font-black uppercase tracking-[0.22em] text-white/45';
const cardClass =
  'relative overflow-hidden rounded-[26px] border border-white/[0.09] bg-[linear-gradient(180deg,rgba(255,255,255,0.07)_0%,rgba(255,255,255,0.02)_22%,rgba(9,8,18,0.94)_70%,rgba(5,5,12,0.98)_100%)] p-5 shadow-[0_28px_80px_rgba(0,0,0,0.42),inset_0_1px_0_rgba(255,255,255,0.1)] sm:p-6';

function BoardList({ board, meHandle }: { board: BoardRow[]; meHandle: string }) {
  return (
    <div className="mt-4 grid gap-1.5">
      {board.slice(0, 10).map((row) => {
        const me = row.handle === meHandle;
        return (
          <div
            key={row.handle + row.rank}
            className={`flex items-center justify-between rounded-[12px] border px-3 py-2 text-sm font-bold ${
              me ? 'border-[#f5c518]/45 bg-[#f5c518]/[0.12] text-[#f8dd72]' : 'border-white/8 bg-white/[0.04] text-white/72'
            }`}
          >
            <span className="flex items-center gap-2">
              <span className="w-6 text-white/40">#{row.rank}</span>
              {displayHandle(row.handle)}
            </span>
            <span>{row.points} pts</span>
          </div>
        );
      })}
    </div>
  );
}

export default function ClaimMarkFlow({
  packSlug,
  markSlug,
  markName,
  packName,
}: {
  packSlug: string;
  markSlug: string;
  markName: string;
  packName: string;
}) {
  const [handle, setHandle] = useState('');
  const [word, setWord] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ClaimResult | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/p/${encodeURIComponent(packSlug)}/m/${encodeURIComponent(markSlug)}/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ handle, word }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Could not claim.');
      setResult(data.data as ClaimResult);
      trackClientEvent('pack_claim', {
        pack: packSlug,
        mark: markSlug,
        rank: data.data.rank,
        alreadyClaimed: data.data.alreadyClaimed,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not claim.');
    } finally {
      setSubmitting(false);
    }
  }

  if (result) {
    return (
      <div className={cardClass}>
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_0%,rgba(245,197,24,0.14),transparent_36%),radial-gradient(circle_at_88%_8%,rgba(34,211,238,0.12),transparent_34%)]" />
        <div className="relative text-center">
          <CheckCircle2 className="mx-auto h-12 w-12 text-[#f8dd72]" />
          <h2 className="mt-3 text-2xl font-black tracking-tight text-white">
            {result.alreadyClaimed ? 'Already yours 🎯' : 'Claimed! 🎉'}
          </h2>
          <p className="mt-1.5 text-sm font-semibold leading-6 text-white/60">
            {displayHandle(result.handle)} · {markName} ·{' '}
            {result.alreadyClaimed ? 'no double points' : '+1 Pack Point'}
          </p>
          <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-[#f5c518]/35 bg-[#f5c518]/[0.12] px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-[#f8dd72]">
            {result.founding ? 'Founding Pack' : packName} · Rank #{result.rank} · {result.points} pts
          </div>

          <BoardList board={result.board} meHandle={result.handle} />

          <Link
            href="/drops/hideaway-games-night?src=pack-mark"
            className="mt-5 inline-flex min-h-13 w-full items-center justify-center gap-2 rounded-[16px] border border-emerald-300/30 bg-[linear-gradient(180deg,rgba(52,211,153,0.22),rgba(16,122,87,0.32))] px-5 py-3.5 text-sm font-black uppercase tracking-[0.14em] text-emerald-50 transition hover:-translate-y-[1px]"
          >
            Join Hideaway Games Night
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    );
  }

  const preview = handle ? displayHandle(normalizeHandle(handle)) : '@yourname';

  return (
    <form onSubmit={handleSubmit} className={cardClass}>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_16%_0%,rgba(34,211,238,0.14),transparent_36%),radial-gradient(circle_at_88%_8%,rgba(245,197,24,0.12),transparent_34%)]" />
      <div className="relative grid gap-4">
        <label>
          <span className={labelClass}>Claim your Baretag</span>
          <input
            required
            className={inputClass}
            value={handle}
            onChange={(event) => setHandle(event.target.value)}
            placeholder="@yourname"
            autoComplete="off"
            maxLength={40}
          />
          <span className="mt-1.5 block text-[11px] font-bold text-white/45">
            You&apos;ll be {preview} on the {packName} board.
          </span>
        </label>
        <label>
          <span className={labelClass}>The word on the card</span>
          <input
            required
            className={inputClass}
            value={word}
            onChange={(event) => setWord(event.target.value)}
            placeholder="secret word"
            autoComplete="off"
            maxLength={60}
          />
        </label>

        {error ? (
          <div className="rounded-[14px] border border-red-300/20 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-100">
            {error}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={submitting}
          className="inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-[16px] border border-yellow-200/30 bg-[linear-gradient(180deg,#ffe66f_0%,#f5c518_45%,#b97800_100%)] px-5 py-3 text-base font-black uppercase tracking-[0.12em] text-black shadow-[0_18px_34px_rgba(245,197,24,0.22),inset_0_1px_0_rgba(255,255,255,0.6)] transition hover:-translate-y-[1px] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
          Claim my spot
        </button>
      </div>
    </form>
  );
}
