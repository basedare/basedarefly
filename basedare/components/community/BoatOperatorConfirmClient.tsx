'use client';

import { useEffect, useState } from 'react';
import { Anchor, CheckCircle2, ShieldCheck } from 'lucide-react';

import {
  BOAT_DESTINATIONS,
  BOAT_TIME_WINDOWS,
  OPERATOR_DESTINATIONS,
  getOptionLabel,
  type BoatCrewSummary,
  type OperatorDestination,
} from '@/lib/surf-boat-board';

export default function BoatOperatorConfirmClient({ crewId, token }: { crewId: string; token: string }) {
  const [crew, setCrew] = useState<BoatCrewSummary | null>(null);
  const [operatorName, setOperatorName] = useState('');
  const [destination, setDestination] = useState<OperatorDestination>('rock-island');
  const [totalPhp, setTotalPhp] = useState(1200);
  const [capacity, setCapacity] = useState(4);
  const [departureAt, setDepartureAt] = useState('');
  const [note, setNote] = useState('');
  const [acknowledgment, setAcknowledgment] = useState(false);
  const [pending, setPending] = useState(false);
  const [state, setState] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    void fetch(`/api/boat-crews?crewId=${encodeURIComponent(crewId)}`, { cache: 'no-store' })
      .then(async (response) => {
        const payload = await response.json().catch(() => null);
        if (!response.ok || !payload?.success || !payload.data?.crews?.[0]) throw new Error('This boat call is unavailable.');
        const nextCrew = payload.data.crews[0] as BoatCrewSummary;
        setCrew(nextCrew);
        setCapacity(Math.max(4, nextCrew.confirmedCount));
        const initialDestination = OPERATOR_DESTINATIONS.find((option) => option.value === nextCrew.destination)?.value;
        if (initialDestination) setDestination(initialDestination);
        setDepartureAt(`${nextCrew.departureDay}T07:00`);
      })
      .catch((error) => setState({ type: 'error', message: error instanceof Error ? error.message : 'Boat call unavailable.' }));
  }, [crewId]);

  const submit = async () => {
    setPending(true);
    setState(null);
    try {
      const response = await fetch(`/api/boat-crews/${encodeURIComponent(crewId)}/operator-confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          operatorName,
          destination,
          totalPhp,
          capacity,
          departureAt: new Date(`${departureAt}:00+08:00`).toISOString(),
          note,
          acknowledgment,
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.success) throw new Error(payload?.error || 'Could not confirm the boat.');
      setState({ type: 'success', message: 'Boat confirmed. The surfers can now accept your final details.' });
    } catch (error) {
      setState({ type: 'error', message: error instanceof Error ? error.message : 'Could not confirm the boat.' });
    } finally {
      setPending(false);
    }
  };

  return (
    <main className="relative min-h-screen px-4 pb-24 pt-28 text-white sm:px-6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(34,211,238,0.13),transparent_35%)]" />
      <div className="relative mx-auto max-w-xl">
        <section className="rounded-[2rem] border border-cyan-200/16 bg-[linear-gradient(155deg,rgba(13,34,42,0.92),rgba(5,7,14,0.98))] p-5 sm:p-7">
          <Anchor className="h-8 w-8 text-cyan-200" />
          <p className="mt-4 text-[9px] font-black uppercase tracking-[0.22em] text-cyan-200/68">Private operator confirmation</p>
          <h1 className="mt-2 text-3xl font-black">Confirm the actual boat details</h1>
          {crew ? (
            <p className="mt-3 text-sm text-white/52">
              {crew.confirmedCount} surfers · {getOptionLabel(BOAT_TIME_WINDOWS, crew.timeWindow)} · requested {getOptionLabel(BOAT_DESTINATIONS, crew.destination)}
            </p>
          ) : null}

          {state?.type === 'success' ? (
            <div className="mt-6 rounded-2xl border border-emerald-200/20 bg-emerald-300/[0.08] p-5 text-emerald-100">
              <CheckCircle2 className="h-6 w-6" />
              <p className="mt-3 font-black">{state.message}</p>
            </div>
          ) : (
            <form onSubmit={(event) => { event.preventDefault(); void submit(); }} className="mt-6 space-y-4">
              <Field label="Operator or boat name"><input required minLength={2} maxLength={80} value={operatorName} onChange={(event) => setOperatorName(event.target.value)} className="boat-operator-input" placeholder="Your name or boat" /></Field>
              <Field label="Confirmed destination"><select value={destination} onChange={(event) => setDestination(event.target.value as OperatorDestination)} className="boat-operator-input">{OPERATOR_DESTINATIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Total price · PHP"><input required type="number" min={1} max={50000} value={totalPhp} onChange={(event) => setTotalPhp(Number(event.target.value))} className="boat-operator-input" /></Field>
                <Field label="Capacity"><input required type="number" min={Math.max(4, crew?.confirmedCount ?? 4)} max={12} value={capacity} onChange={(event) => setCapacity(Number(event.target.value))} className="boat-operator-input" /></Field>
              </div>
              <Field label="Departure · Philippine time"><input required type="datetime-local" value={departureAt} onChange={(event) => setDepartureAt(event.target.value)} className="boat-operator-input" /></Field>
              <Field label="Useful note · optional"><textarea maxLength={240} value={note} onChange={(event) => setNote(event.target.value)} className="boat-operator-input min-h-20 resize-none" placeholder="Meeting point, boards, return plan…" /></Field>
              <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-[#f5c518]/15 bg-[#f5c518]/[0.055] p-4 text-xs leading-relaxed text-white/58">
                <input type="checkbox" checked={acknowledgment} onChange={(event) => setAcknowledgment(event.target.checked)} className="mt-0.5 h-4 w-4 accent-[#f5c518]" />
                <span>I am the operator or authorized to confirm this boat. These are the final price, capacity, destination and departure details.</span>
              </label>
              {state?.type === 'error' ? <p role="alert" className="rounded-2xl border border-rose-200/20 bg-rose-300/[0.08] p-3 text-sm font-bold text-rose-100">{state.message}</p> : null}
              <button type="submit" disabled={pending || !token || !acknowledgment || !crew} className="min-h-12 w-full rounded-full bg-[#f5c518] px-5 text-[11px] font-black uppercase tracking-[0.15em] text-[#171006] disabled:opacity-45">
                {pending ? 'Confirming…' : 'Confirm boat details'}
              </button>
            </form>
          )}
        </section>
        <p className="mt-4 flex items-start gap-2 px-2 text-[11px] leading-relaxed text-white/34"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" /> BaseDare only coordinates the crew. Payment stays directly between surfers and operator.</p>
      </div>
      <style jsx>{`.boat-operator-input { min-height: 3rem; width: 100%; border-radius: 1rem; border: 1px solid rgba(255,255,255,.1); background: rgba(0,0,0,.3); padding: .75rem 1rem; color: white; outline: none; } .boat-operator-input:focus { border-color: rgba(165,243,252,.3); }`}</style>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block text-[9px] font-black uppercase tracking-[0.15em] text-white/44">{label}<span className="mt-2 block normal-case tracking-normal">{children}</span></label>;
}
