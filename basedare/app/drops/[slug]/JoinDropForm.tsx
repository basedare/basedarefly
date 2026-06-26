'use client';

import { useState, type FormEvent } from 'react';
import { ArrowRight, CheckCircle2, Loader2, Users } from 'lucide-react';

import { GAME_OPTIONS, type DropConfig, type GamePref, type RosterView } from '@/lib/drops';
import { trackClientEvent } from '@/lib/analytics';

type JoinResult = { status: 'joined' | 'waitlist'; whatsappUrl: string };

const inputClass =
  'w-full rounded-[16px] border border-white/10 bg-black/30 px-4 py-3 text-base font-bold text-white outline-none transition placeholder:text-white/28 focus:border-cyan-200/40 focus:bg-black/40';
const labelClass = 'mb-1.5 block text-[10px] font-black uppercase tracking-[0.22em] text-white/45';

const GAME_EMOJI: Record<GamePref, string> = { pool: '🎱', darts: '🎯', either: '🎲' };

function handleLabel(handle: string): string {
  return handle.startsWith('@') ? handle : `@${handle}`;
}

export default function JoinDropForm({
  slug,
  drop,
  initialRoster,
  src,
}: {
  slug: string;
  drop: DropConfig;
  initialRoster: RosterView;
  src: string;
}) {
  const [handle, setHandle] = useState('');
  const [contact, setContact] = useState('');
  const [gamePref, setGamePref] = useState<GamePref>('either');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<JoinResult | null>(null);
  const [roster, setRoster] = useState<RosterView>(initialRoster);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch(`/api/drops/${encodeURIComponent(slug)}/rsvp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ handle, contact, gamePref, source: src || undefined }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Could not save your spot.');
      }
      setResult({ status: data.data.status, whatsappUrl: data.data.whatsappUrl || '' });
      setRoster(data.data.roster as RosterView);
      trackClientEvent('drop_rsvp', { slug, status: data.data.status, src: src || 'direct', gamePref });
    } catch (submitError: unknown) {
      setError(submitError instanceof Error ? submitError.message : 'Could not save your spot.');
    } finally {
      setSubmitting(false);
    }
  }

  const full = roster.spotsLeft <= 0;

  return (
    <div className="relative overflow-hidden rounded-[26px] border border-white/[0.09] bg-[linear-gradient(180deg,rgba(255,255,255,0.07)_0%,rgba(255,255,255,0.02)_22%,rgba(9,8,18,0.94)_70%,rgba(5,5,12,0.98)_100%)] p-5 shadow-[0_28px_80px_rgba(0,0,0,0.42),inset_0_1px_0_rgba(255,255,255,0.1)] sm:p-6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_16%_0%,rgba(34,211,238,0.14),transparent_36%),radial-gradient(circle_at_88%_8%,rgba(245,197,24,0.12),transparent_34%)]" />

      {/* Live roster — the social proof that makes the night feel alive before it starts */}
      <div className="relative flex items-center justify-between gap-3">
        <span className="inline-flex items-center gap-2 text-sm font-black text-white">
          <Users className="h-4 w-4 text-cyan-200" />
          {roster.joined} joined
          <span className="text-white/40">·</span>
          <span className={full ? 'text-[#f8dd72]' : 'text-emerald-300'}>
            {full ? 'waitlist open' : `${roster.spotsLeft} spots left`}
          </span>
        </span>
        {roster.waitlist > 0 ? (
          <span className="text-[10px] font-black uppercase tracking-[0.16em] text-white/40">
            +{roster.waitlist} waiting
          </span>
        ) : null}
      </div>

      {roster.roster.length > 0 ? (
        <div className="relative mt-3 flex flex-wrap gap-1.5">
          {roster.roster.slice(0, 14).map((entry, index) => (
            <span
              key={`${entry.handle}-${index}`}
              className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-1 text-[11px] font-bold text-white/72"
            >
              <span>{GAME_EMOJI[entry.gamePref]}</span>
              {handleLabel(entry.handle)}
            </span>
          ))}
        </div>
      ) : (
        <p className="relative mt-3 text-xs font-semibold text-white/45">Be the first to claim a spot 👀</p>
      )}

      <div className="relative my-5 h-px bg-white/10" />

      {result ? (
        <div className="relative text-center">
          <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-300" />
          <h2 className="mt-3 text-2xl font-black tracking-tight text-white">
            {result.status === 'joined' ? "You're in! 🎉" : "You're on the waitlist"}
          </h2>
          <p className="mt-2 text-sm font-semibold leading-6 text-white/60">
            {result.status === 'joined'
              ? `See you at ${drop.venue}. Come solo — your crew gets sorted on arrival.`
              : "We're full, but spots open up. We'll reach out if one frees up."}
          </p>
          {result.whatsappUrl ? (
            <a
              href={result.whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 inline-flex min-h-13 w-full items-center justify-center gap-2 rounded-[16px] border border-emerald-300/30 bg-[linear-gradient(180deg,rgba(52,211,153,0.22),rgba(16,122,87,0.32))] px-5 py-3.5 text-sm font-black uppercase tracking-[0.14em] text-emerald-50 transition hover:-translate-y-[1px]"
            >
              Join the WhatsApp group
              <ArrowRight className="h-4 w-4" />
            </a>
          ) : (
            <p className="mt-5 rounded-[14px] border border-white/10 bg-black/25 px-4 py-3 text-xs font-bold text-white/55">
              You&apos;re on the list — the host will add you to the group chat shortly.
            </p>
          )}
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="relative grid gap-4">
          <label>
            <span className={labelClass}>Your handle</span>
            <input
              required
              className={inputClass}
              value={handle}
              onChange={(event) => setHandle(event.target.value)}
              placeholder="@yourname"
              autoComplete="off"
              maxLength={40}
            />
          </label>
          <label>
            <span className={labelClass}>WhatsApp or Instagram</span>
            <input
              required
              className={inputClass}
              value={contact}
              onChange={(event) => setContact(event.target.value)}
              placeholder="+63… or @insta (so we can reach you)"
              autoComplete="off"
              maxLength={80}
            />
          </label>
          <div>
            <span className={labelClass}>What do you want to play?</span>
            <div className="grid grid-cols-3 gap-2">
              {GAME_OPTIONS.map((option) => {
                const active = gamePref === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setGamePref(option.value)}
                    className={`min-h-12 rounded-[14px] border text-sm font-black uppercase tracking-[0.08em] transition ${
                      active
                        ? 'border-cyan-300/40 bg-cyan-300/[0.14] text-cyan-100'
                        : 'border-white/10 bg-white/[0.04] text-white/45 hover:text-white'
                    }`}
                  >
                    {GAME_EMOJI[option.value]} {option.label}
                  </button>
                );
              })}
            </div>
          </div>

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
            {full ? 'Join the waitlist' : 'Claim your spot'}
          </button>
        </form>
      )}
    </div>
  );
}
