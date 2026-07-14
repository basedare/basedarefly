'use client';

import { ArrowRight, CheckCircle2, Compass, Loader2, Mail, ShieldCheck, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState, type FormEvent } from 'react';

import LiquidBackground from '@/components/LiquidBackground';

const missionPassEmailEnabled = process.env.NEXT_PUBLIC_MISSION_PASS_EMAIL_ENABLED === 'true';

type SavedMission = {
  id: string;
  targetType: string;
  targetId: string;
  targetHref: string;
  titleSnapshot: string | null;
  state: string;
  lockedAt: string;
  expiresAt: string;
  completedAt: string | null;
  primaryTouch: { creatorCode: string | null } | null;
};

function missionStateLabel(state: string) {
  if (state === 'COMPLETED') return 'Verified';
  if (state === 'BOUND') return 'Started';
  return 'Saved';
}

export default function MissionsClient() {
  const searchParams = useSearchParams();
  const passState = searchParams.get('state');
  const [missions, setMissions] = useState<SavedMission[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [forgetting, setForgetting] = useState(false);

  const loadMissions = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/mission-passes/missions', { cache: 'no-store' });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload.error || 'Unable to load missions.');
      setMissions(payload.data.missions);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load missions.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadMissions();
  }, [loadMissions]);

  const recover = async (event: FormEvent) => {
    event.preventDefault();
    setSending(true);
    setMessage(null);
    setError(null);
    try {
      const response = await fetch('/api/mission-passes/recover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload.error || 'Unable to send recovery pass.');
      setMessage(payload.data.message);
      setEmail('');
    } catch (recoverError) {
      setError(recoverError instanceof Error ? recoverError.message : 'Unable to send recovery pass.');
    } finally {
      setSending(false);
    }
  };

  const forget = async () => {
    if (!window.confirm('Forget all uncompleted Mission Passes on this device and email identity?')) return;
    setForgetting(true);
    setError(null);
    try {
      const response = await fetch('/api/mission-passes/missions', { method: 'DELETE' });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload.error || 'Unable to forget missions.');
      setMissions((current) => current.filter((mission) => mission.state === 'COMPLETED'));
      setMessage('Uncompleted Mission Passes were forgotten.');
    } catch (forgetError) {
      setError(forgetError instanceof Error ? forgetError.message : 'Unable to forget missions.');
    } finally {
      setForgetting(false);
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#07070b] px-4 pb-20 pt-24 text-white sm:px-6">
      <LiquidBackground />
      <div className="relative z-10 mx-auto max-w-3xl">
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#ffe36a]">Mission Pass</p>
        <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">Your missions, without the profile.</h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-white/55">
          Save something interesting, return from another browser or device, and keep exploring. A pass restores intent only—claims and rewards still require normal wallet approval.
        </p>

        {passState ? (
          <div className="mt-6 rounded-2xl border border-purple-300/20 bg-purple-500/[0.08] p-4 text-sm text-purple-100/75">
            {passState === 'expired'
              ? 'That private pass expired. Ask for a fresh one below, or browse live missions now.'
              : 'That Mission Pass could not be opened. It may have been revoked or mistyped.'}
          </div>
        ) : null}

        <section className="mt-8 rounded-[26px] border border-white/10 bg-black/30 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,.06)] sm:p-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-black">Saved on this journey</h2>
              <p className="mt-1 text-sm text-white/40">The list follows your private pass, not a public account.</p>
            </div>
            {missions.some((mission) => mission.state !== 'COMPLETED') ? (
              <button
                type="button"
                onClick={forget}
                disabled={forgetting}
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-[10px] font-black uppercase tracking-[0.12em] text-white/40 transition hover:text-red-200 disabled:opacity-50"
              >
                {forgetting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                Forget
              </button>
            ) : null}
          </div>

          {loading ? (
            <div className="grid min-h-40 place-items-center"><Loader2 className="h-6 w-6 animate-spin text-[#ffe36a]" /></div>
          ) : missions.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-dashed border-white/10 p-7 text-center">
              <Compass className="mx-auto h-7 w-7 text-cyan-300" />
              <h3 className="mt-3 font-black">Nothing saved here yet</h3>
              <p className="mt-1 text-sm text-white/40">Open the map and save the first mission that feels worth leaving the house for.</p>
              <Link href="/map" className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#f5c518] px-4 py-3 text-xs font-black uppercase tracking-[0.14em] text-[#15120c]">
                Explore the map <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          ) : (
            <div className="mt-6 space-y-3">
              {missions.map((mission) => (
                <Link
                  key={mission.id}
                  href={mission.targetHref}
                  className="group flex items-center justify-between gap-4 rounded-2xl border border-white/[0.08] bg-white/[0.035] p-4 transition hover:border-[#f5c518]/25 hover:bg-white/[0.06]"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="rounded-full border border-[#f5c518]/20 bg-[#f5c518]/10 px-2 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-[#ffe36a]">
                        {missionStateLabel(mission.state)}
                      </span>
                      {mission.primaryTouch?.creatorCode ? (
                        <span className="truncate text-[10px] text-white/30">via @{mission.primaryTouch.creatorCode}</span>
                      ) : null}
                    </div>
                    <h3 className="mt-2 truncate font-black text-white/90">
                      {mission.titleSnapshot || `${mission.targetType.toLowerCase()} mission`}
                    </h3>
                    <p className="mt-1 text-xs text-white/35">Saved {new Date(mission.lockedAt).toLocaleDateString()}</p>
                  </div>
                  {mission.state === 'COMPLETED'
                    ? <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-300" />
                    : <ArrowRight className="h-5 w-5 shrink-0 text-white/25 transition group-hover:translate-x-1 group-hover:text-[#ffe36a]" />}
                </Link>
              ))}
            </div>
          )}
        </section>

        {missionPassEmailEnabled ? (
          <section className="mt-5 rounded-[26px] border border-cyan-300/15 bg-cyan-400/[0.045] p-5 sm:p-7">
            <div className="flex gap-3">
              <Mail className="mt-1 h-5 w-5 shrink-0 text-cyan-300" />
              <div>
                <h2 className="font-black">Opened BaseDare somewhere else?</h2>
                <p className="mt-1 text-sm leading-6 text-white/45">Enter the same email. We will send a private, passwordless recovery pass without creating a BaseDare profile.</p>
              </div>
            </div>
            <form onSubmit={recover} className="mt-4 flex flex-col gap-2 sm:flex-row">
              <input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                className="min-h-12 flex-1 rounded-xl border border-white/10 bg-black/35 px-4 text-sm outline-none placeholder:text-white/25 focus:border-cyan-300/35"
              />
              <button
                type="submit"
                disabled={sending}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-cyan-300/25 bg-cyan-300/10 px-5 text-xs font-black uppercase tracking-[0.14em] text-cyan-100 disabled:opacity-50"
              >
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                Send pass
              </button>
            </form>
            {message ? <p className="mt-3 text-xs leading-5 text-emerald-200">{message}</p> : null}
            {error ? <p className="mt-3 text-xs leading-5 text-red-300">{error}</p> : null}
          </section>
        ) : null}

        <p className="mt-6 flex items-start gap-2 text-xs leading-5 text-white/30">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
          BaseDare stores a keyed email digest, not your raw email address. Completed receipts remain part of the verification ledger; “Forget” removes active saved missions and revokes their passes.
        </p>
      </div>
    </main>
  );
}
