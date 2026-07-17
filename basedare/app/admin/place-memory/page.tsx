'use client';

import { Loader2, RefreshCw, ShieldAlert } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useAccount } from 'wagmi';

import { useSessionAdminSecret } from '@/hooks/useSessionAdminSecret';

type Kind = 'OPENING_WINDOW' | 'ITEM_PRICE' | 'PAYMENT_METHOD';
type TargetDraft = {
  clientId: string;
  kind: Kind;
  subjectKey: string;
  label: string;
  helpText: string;
};
type ConflictObservation = {
  observation: {
    id: string;
    valueJson: unknown;
    observedAt: string;
    proofAttempt: {
      source: string;
      proximityDecision: string | null;
      proximityCode: string | null;
      distanceKm: number | null;
      allowedRadiusKm: number | null;
      accuracyM: number | null;
      verificationConfidence: number | null;
    };
  };
};
type Conflict = {
  id: string;
  status: 'OPEN' | 'NEEDS_CORROBORATION';
  reason: string;
  openedAt: string;
  assertion: {
    kind: Kind;
    subjectKey: string;
    venue: { slug: string; name: string };
    currentVersion: { id: string; valueJson: unknown; observedAt: string };
  };
  observations: ConflictObservation[];
};

const emptyTarget = (clientId: string): TargetDraft => ({
  clientId,
  kind: 'OPENING_WINDOW',
  subjectKey: 'friday',
  label: 'Friday opening hours',
  helpText: 'Check the posted hours and support the answer with one clear photo.',
});

function JsonValue({ value }: { value: unknown }) {
  return (
    <pre className="mt-2 overflow-x-auto whitespace-pre-wrap rounded-xl border border-white/8 bg-black/35 p-3 text-[11px] leading-5 text-white/70">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

export default function PlaceMemoryAdminPage() {
  const { address } = useAccount();
  const { adminSecret, setAdminSecret, ensureAdminSession, hasAdminSession } = useSessionAdminSecret();
  const [dareId, setDareId] = useState('');
  const [targets, setTargets] = useState<TargetDraft[]>([emptyTarget('target-0')]);
  const nextTargetId = useRef(1);
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const headers = useMemo<Record<string, string>>(() => {
    const next: Record<string, string> = {};
    if (address) next['x-moderator-wallet'] = address;
    return next;
  }, [address]);

  const authenticate = useCallback(async () => {
    if (address || hasAdminSession) return true;
    return ensureAdminSession();
  }, [address, ensureAdminSession, hasAdminSession]);

  const loadConflicts = useCallback(async () => {
    if (!(await authenticate())) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/place-memory/conflicts', { headers, cache: 'no-store' });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload.hint || payload.error || 'Unable to load conflicts.');
      setConflicts(payload.data.conflicts ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load conflicts.');
    } finally {
      setLoading(false);
    }
  }, [authenticate, headers]);

  useEffect(() => {
    if (address || hasAdminSession) void loadConflicts();
  }, [address, hasAdminSession, loadConflicts]);

  const saveTargets = async (event: FormEvent) => {
    event.preventDefault();
    if (!(await authenticate())) return;
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch(`/api/admin/dares/${encodeURIComponent(dareId)}/assertion-targets`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({
          targets: targets.map((target) => ({
            kind: target.kind,
            subjectKey: target.subjectKey,
            required: true,
            display: {
              ...(target.label ? { label: target.label } : {}),
              ...(target.helpText ? { helpText: target.helpText } : {}),
              ...(target.kind === 'OPENING_WINDOW' ? { timezone: 'Asia/Manila' } : {}),
              ...(target.kind === 'ITEM_PRICE'
                ? { itemLabel: target.label || target.subjectKey, currency: 'PHP', minorUnitScale: 2 }
                : {}),
            },
          })),
        }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload.error || 'Unable to save targets.');
      setNotice(`${payload.data.length} structured target${payload.data.length === 1 ? '' : 's'} locked to this Dare.`);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save targets.');
    } finally {
      setSaving(false);
    }
  };

  const actOnConflict = async (
    conflict: Conflict,
    action: 'DISMISS_OBSERVATION' | 'ACCEPT_CORRECTION' | 'REQUEST_CORROBORATION',
    selectedObservationId?: string,
  ) => {
    if (!(await authenticate())) return;
    setSaving(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/place-memory/conflicts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({
          conflictId: conflict.id,
          action,
          ...(selectedObservationId ? { selectedObservationId } : {}),
        }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload.error || 'Conflict action failed.');
      setNotice(`Conflict ${payload.data.status.toLowerCase().replaceAll('_', ' ')}.`);
      await loadConflicts();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Conflict action failed.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#07070b] px-4 pb-24 pt-24 text-white sm:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-cyan-200">Sentinel · Stage 1</p>
            <h1 className="mt-2 text-3xl font-black">Place Memory</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/45">
              Configure bounded questions before proof starts. Resolve disagreements without deleting evidence or moving money.
            </p>
          </div>
          <button
            onClick={() => void loadConflicts()}
            className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/[0.04]"
            aria-label="Refresh Place Memory queue"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          </button>
        </div>

        {!address && !hasAdminSession ? (
          <section className="mt-8 max-w-lg rounded-2xl border border-white/10 bg-white/[0.04] p-5">
            <label htmlFor="place-memory-admin-secret" className="text-xs font-black uppercase tracking-[0.16em] text-white/50">Admin secret</label>
            <input
              id="place-memory-admin-secret"
              type="password"
              value={adminSecret}
              onChange={(event) => setAdminSecret(event.target.value)}
              className="mt-2 h-12 w-full rounded-xl border border-white/10 bg-black px-4 outline-none"
            />
            <button
              onClick={() => void loadConflicts()}
              className="mt-3 h-11 w-full rounded-xl bg-[#f5c518] text-xs font-black uppercase tracking-[0.16em] text-black"
            >
              Open Sentinel queue
            </button>
          </section>
        ) : null}

        {error ? <div className="mt-5 rounded-xl border border-red-400/20 bg-red-500/10 p-3 text-sm text-red-200">{error}</div> : null}
        {notice ? <div className="mt-5 rounded-xl border border-emerald-400/20 bg-emerald-500/10 p-3 text-sm text-emerald-100">{notice}</div> : null}

        <section className="mt-8 grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
          <form onSubmit={saveTargets} className="h-fit rounded-3xl border border-cyan-300/15 bg-cyan-400/[0.04] p-5 sm:p-6">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-200">Mission output contract</p>
            <h2 className="mt-2 text-xl font-black">Attach structured questions</h2>
            <p className="mt-2 text-xs leading-5 text-white/45">Only a pending Dare with a canonical venue and no proof attempts can be configured.</p>
            <label className="mt-5 block text-[10px] font-black uppercase tracking-[0.15em] text-white/45">
              Dare ID
              <input required value={dareId} onChange={(event) => setDareId(event.target.value)} className="mt-2 h-11 w-full rounded-xl border border-white/10 bg-black px-3 text-sm normal-case tracking-normal text-white" />
            </label>
            <div className="mt-4 space-y-3">
              {targets.map((target, index) => (
                <div key={target.clientId} className="rounded-2xl border border-white/8 bg-black/25 p-3">
                  <div className="grid gap-2 sm:grid-cols-2">
                    <select aria-label={`Question ${index + 1} type`} value={target.kind} onChange={(event) => setTargets((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, kind: event.target.value as Kind } : item))} className="h-10 rounded-lg border border-white/10 bg-black px-2 text-xs">
                      <option value="OPENING_WINDOW">Opening window</option>
                      <option value="ITEM_PRICE">Item price</option>
                      <option value="PAYMENT_METHOD">Payment method</option>
                    </select>
                    <input aria-label={`Question ${index + 1} subject key`} value={target.subjectKey} onChange={(event) => setTargets((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, subjectKey: event.target.value } : item))} placeholder="subject key" className="h-10 rounded-lg border border-white/10 bg-black px-3 text-xs" />
                  </div>
                  <input aria-label={`Question ${index + 1} label`} value={target.label} onChange={(event) => setTargets((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, label: event.target.value } : item))} placeholder="Question label" className="mt-2 h-10 w-full rounded-lg border border-white/10 bg-black px-3 text-xs" />
                  <input aria-label={`Question ${index + 1} contributor instruction`} value={target.helpText} onChange={(event) => setTargets((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, helpText: event.target.value } : item))} placeholder="Short contributor instruction" className="mt-2 h-10 w-full rounded-lg border border-white/10 bg-black px-3 text-xs" />
                  {targets.length > 1 ? <button type="button" onClick={() => setTargets((current) => current.filter((_, itemIndex) => itemIndex !== index))} className="mt-2 text-[10px] font-black uppercase tracking-[0.14em] text-red-200/70">Remove</button> : null}
                </div>
              ))}
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  const clientId = `target-${nextTargetId.current}`;
                  nextTargetId.current += 1;
                  setTargets((current) => [...current, emptyTarget(clientId)]);
                }}
                disabled={targets.length >= 24}
                className="h-11 rounded-xl border border-white/10 bg-white/[0.04] text-xs font-black"
              >
                Add question
              </button>
              <button type="submit" disabled={saving} className="h-11 rounded-xl bg-cyan-300 text-xs font-black uppercase tracking-[0.12em] text-black">{saving ? 'Saving…' : 'Lock targets'}</button>
            </div>
          </form>

          <div>
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-amber-200" />
              <h2 className="text-xl font-black">Conflicts</h2>
              <span className="rounded-full border border-white/10 px-2 py-1 text-[10px] text-white/45">{conflicts.length}</span>
            </div>
            <div className="mt-4 space-y-4">
              {conflicts.length === 0 ? (
                <div className="rounded-3xl border border-white/8 bg-white/[0.025] p-8 text-center text-sm text-white/35">No open Place Memory conflicts.</div>
              ) : conflicts.map((conflict) => (
                <article key={conflict.id} className="rounded-3xl border border-amber-300/15 bg-amber-400/[0.035] p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-200">{conflict.status.replaceAll('_', ' ')}</p>
                      <h3 className="mt-1 text-lg font-black">{conflict.assertion.venue.name}</h3>
                      <p className="text-xs text-white/45">{conflict.assertion.kind} · {conflict.assertion.subjectKey}</p>
                    </div>
                    <button onClick={() => void actOnConflict(conflict, 'REQUEST_CORROBORATION')} disabled={saving} className="rounded-xl border border-cyan-300/20 bg-cyan-400/[0.08] px-3 py-2 text-[10px] font-black uppercase tracking-[0.12em] text-cyan-100">Request proof draft</button>
                  </div>
                  <div className="mt-4 rounded-2xl border border-emerald-300/12 bg-emerald-400/[0.035] p-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.14em] text-emerald-200">Current fact</p>
                    <JsonValue value={conflict.assertion.currentVersion.valueJson} />
                  </div>
                  <div className="mt-3 space-y-3">
                    {conflict.observations.map(({ observation }) => (
                      <div key={observation.id} className="rounded-2xl border border-fuchsia-300/12 bg-fuchsia-400/[0.035] p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-fuchsia-200">Challenger · {new Date(observation.observedAt).toLocaleString()}</p>
                          <button onClick={() => void actOnConflict(conflict, 'ACCEPT_CORRECTION', observation.id)} disabled={saving} className="rounded-lg border border-fuchsia-300/20 px-3 py-1.5 text-[10px] font-black uppercase text-fuchsia-100">Accept correction</button>
                        </div>
                        <JsonValue value={observation.valueJson} />
                        <p className="mt-2 text-[10px] text-white/35">{observation.proofAttempt.source} · {observation.proofAttempt.proximityDecision ?? 'no proximity result'} · {observation.proofAttempt.distanceKm == null ? 'distance unavailable' : `${Math.round(observation.proofAttempt.distanceKm * 1000)}m`}</p>
                      </div>
                    ))}
                  </div>
                  <button onClick={() => void actOnConflict(conflict, 'DISMISS_OBSERVATION')} disabled={saving} className="mt-4 h-10 rounded-xl border border-white/10 px-4 text-[10px] font-black uppercase tracking-[0.13em] text-white/60">Keep current fact</button>
                </article>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
