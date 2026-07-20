'use client';

import { CheckCircle2, ExternalLink, Loader2, MapPin, RefreshCw, Search, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { useAccount } from 'wagmi';

import { useSessionAdminSecret } from '@/hooks/useSessionAdminSecret';

type Station = { id: string; active: boolean; stationCode: string | null; campaignCode: string | null; stationHostVenue: { name: string } | null };
type Mission = { id: string; ordinal: number; status: string; dareId: string | null; evidenceDecision: string | null; evidenceQuality: string | null; contributorPayoutUsd: number | null; reviewMinutes: number; reviewCostUsd: number; dare: { shortId: string | null; status: string; title: string } | null };
type MissionPlace = { id: string; name: string; slug: string; address: string | null };
type Sprint = {
  id: string; activationIntakeId: string | null; receiptCode: string; status: string; buyerName: string; buyerOrganization: string | null;
  buyerQuestion: string; areaLabel: string; freshnessWindowHours: number; campaignCode: string;
  serviceFeeConfirmedUsd: number | null; rewardPoolConfirmedUsd: number | null; designPartnerException: boolean;
  stations: Array<{ link: Station }>;
  missions: Mission[];
};

const EMPTY = { activationIntakeId: '', buyerName: '', buyerOrganization: '', buyerEmail: '', buyerQuestion: '', areaLabel: 'General Luna, Siargao', freshnessWindowHours: 6, campaignCode: '', stationLinkIds: [] as string[] };

export default function FieldSprintsAdminPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-[#07070b] px-4 pt-24 text-white"><p className="mx-auto max-w-7xl text-sm text-white/45">Loading Sprint Runner…</p></main>}>
      <FieldSprintsAdminContent />
    </Suspense>
  );
}

function FieldSprintsAdminContent() {
  const searchParams = useSearchParams();
  const { address } = useAccount();
  const { adminSecret, setAdminSecret, ensureAdminSession, hasAdminSession } = useSessionAdminSecret();
  const [form, setForm] = useState(EMPTY);
  const [stations, setStations] = useState<Station[]>([]);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [missionDrafts, setMissionDrafts] = useState<Record<string, string>>({});
  const [missionPlaces, setMissionPlaces] = useState<Record<string, MissionPlace>>({});
  const [fundingDrafts, setFundingDrafts] = useState<Record<string, { service: string; pool: string; reference: string; exception: boolean }>>({});
  const [reviewDrafts, setReviewDrafts] = useState<Record<string, { minutes: string; cost: string }>>({});
  const headers = useMemo<Record<string, string>>(() => {
    const nextHeaders: Record<string, string> = {};
    if (address) nextHeaders['x-moderator-wallet'] = address;
    return nextHeaders;
  }, [address]);
  const authenticate = useCallback(async () => address || hasAdminSession || ensureAdminSession(), [address, ensureAdminSession, hasAdminSession]);

  const load = useCallback(async () => {
    if (!(await authenticate())) return;
    setBusy(true); setError(null);
    try {
      const [sprintResponse, stationResponse] = await Promise.all([
        fetch('/api/admin/field-sprints', { headers }),
        fetch('/api/admin/field-stations?periodDays=30', { headers }),
      ]);
      const [sprintPayload, stationPayload] = await Promise.all([sprintResponse.json(), stationResponse.json()]);
      if (!sprintResponse.ok || !sprintPayload.success) throw new Error(sprintPayload.error || 'Unable to load Sprints.');
      if (!stationResponse.ok || !stationPayload.success) throw new Error(stationPayload.error || 'Unable to load Field Stations.');
      setSprints(sprintPayload.data);
      setStations(stationPayload.data.links.filter((station: Station) => station.active && station.stationCode));
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to load Sprint Runner.'); }
    finally { setBusy(false); }
  }, [authenticate, headers]);

  useEffect(() => { if (address || hasAdminSession) void load(); }, [address, hasAdminSession, load]);

  useEffect(() => {
    const activationIntakeId = searchParams.get('activationIntakeId') ?? '';
    if (!activationIntakeId) return;
    setForm((current) => ({
      ...current,
      activationIntakeId,
      buyerName: searchParams.get('buyerName') || current.buyerName,
      buyerOrganization: searchParams.get('buyerOrganization') || current.buyerOrganization,
      buyerEmail: searchParams.get('buyerEmail') || current.buyerEmail,
      buyerQuestion: searchParams.get('buyerQuestion') || current.buyerQuestion,
      areaLabel: searchParams.get('areaLabel') || current.areaLabel,
      campaignCode: current.campaignCode || `field-sprint-${activationIntakeId.slice(0, 8).toLowerCase()}`,
    }));
  }, [searchParams]);

  const createSprint = async (event: FormEvent) => {
    event.preventDefault();
    if (!(await authenticate())) return;
    setBusy(true); setError(null); setMessage(null);
    try {
      const response = await fetch('/api/admin/field-sprints', { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify({ ...form, buyerOrganization: form.buyerOrganization || null, buyerEmail: form.buyerEmail || null }) });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload.error || 'Unable to start Sprint.');
      setMessage('Sprint compiled: four independent Field Truth contracts are ready for funding.');
      setForm(EMPTY); await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to start Sprint.'); }
    finally { setBusy(false); }
  };

  const act = async (body: Record<string, unknown>) => {
    if (!(await authenticate())) return;
    setBusy(true); setError(null); setMessage(null);
    try {
      const response = await fetch('/api/admin/field-sprints', { method: 'PATCH', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload.error || 'Sprint action failed.');
      setMessage(`${String(body.action).replaceAll('_', ' ')} complete.`); await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Sprint action failed.'); }
    finally { setBusy(false); }
  };

  return (
    <main className="min-h-screen bg-[#07070b] px-4 pb-24 pt-24 text-white sm:px-6">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div><p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#ffe36a]">Internal · Managed service</p><h1 className="mt-2 text-4xl font-black">Verified Field Sprint Runner</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-white/50">One buyer question. Four independent $125 Field Truth escrows. Accepted evidence becomes refreshable place memory; acquisition remains separate from verified outcomes.</p></div>
          <button onClick={() => void load()} disabled={busy} className="grid h-11 w-11 place-items-center rounded-xl border border-white/10 bg-white/[0.04]">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}</button>
        </header>

        {!address && !hasAdminSession ? <section className="mt-8 max-w-lg rounded-2xl border border-white/10 bg-white/[0.04] p-5"><label className="text-xs font-black uppercase tracking-[0.16em] text-white/50">Admin secret</label><input type="password" value={adminSecret} onChange={(event) => setAdminSecret(event.target.value)} className="mt-2 h-12 w-full rounded-xl border border-white/10 bg-black px-4" /><button onClick={() => void load()} className="mt-3 h-11 w-full rounded-xl bg-[#f5c518] text-xs font-black uppercase tracking-[0.16em] text-black">Open runner</button></section> : null}
        {error ? <p className="mt-5 rounded-xl border border-red-400/20 bg-red-500/10 p-3 text-sm text-red-100">{error}</p> : null}
        {message ? <p className="mt-5 rounded-xl border border-emerald-400/20 bg-emerald-500/10 p-3 text-sm text-emerald-100">{message}</p> : null}

        {(address || hasAdminSession) ? <form onSubmit={createSprint} className="mt-8 grid gap-4 rounded-3xl border border-[#ffe36a]/15 bg-gradient-to-br from-[#241d0b]/55 to-[#101018] p-5 md:grid-cols-2">
          <div className="md:col-span-2"><p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#ffe36a]">Start Sprint</p><h2 className="mt-2 text-2xl font-black">Compile the four contracts</h2>{form.activationIntakeId ? <p className="mt-2 text-xs text-emerald-200/70">Buyer-approved intake linked: {form.activationIntakeId}</p> : null}</div>
          <Field label="Buyer name" value={form.buyerName} onChange={(value) => setForm({ ...form, buyerName: value })} required />
          <Field label="Organization" value={form.buyerOrganization} onChange={(value) => setForm({ ...form, buyerOrganization: value })} />
          <Field label="Buyer email (internal)" value={form.buyerEmail} onChange={(value) => setForm({ ...form, buyerEmail: value })} type="email" />
          <Field label="Area" value={form.areaLabel} onChange={(value) => setForm({ ...form, areaLabel: value })} required />
          <label className="md:col-span-2"><span className="text-[10px] font-black uppercase tracking-[0.15em] text-white/45">One precise real-world question</span><textarea value={form.buyerQuestion} onChange={(event) => setForm({ ...form, buyerQuestion: event.target.value })} required className="mt-2 min-h-24 w-full rounded-xl border border-white/10 bg-black/50 p-3" /></label>
          <Field label="Campaign code (must match both stations)" value={form.campaignCode} onChange={(value) => setForm({ ...form, campaignCode: value })} required />
          <label><span className="text-[10px] font-black uppercase tracking-[0.15em] text-white/45">Freshness window</span><select value={form.freshnessWindowHours} onChange={(event) => setForm({ ...form, freshnessWindowHours: Number(event.target.value) })} className="mt-2 h-12 w-full rounded-xl border border-white/10 bg-black/50 px-3"><option value={3}>3 hours</option><option value={6}>6 hours</option><option value={12}>12 hours</option><option value={24}>24 hours</option></select></label>
          <fieldset className="md:col-span-2"><legend className="text-[10px] font-black uppercase tracking-[0.15em] text-white/45">Exactly two permissioned Field Stations</legend><div className="mt-2 grid gap-2 md:grid-cols-2">{stations.map((station) => <label key={station.id} className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/35 p-3"><input type="checkbox" checked={form.stationLinkIds.includes(station.id)} onChange={(event) => setForm({ ...form, stationLinkIds: event.target.checked ? [...form.stationLinkIds, station.id].slice(-2) : form.stationLinkIds.filter((id) => id !== station.id) })} /><span className="text-sm"><b>{station.stationCode}</b> · {station.stationHostVenue?.name ?? 'Unknown host'}<small className="block text-white/35">{station.campaignCode}</small></span></label>)}</div></fieldset>
          <div className="md:col-span-2 grid gap-2 rounded-xl border border-white/10 bg-black/35 p-4 text-sm sm:grid-cols-3"><b>$2,000 managed service</b><b>$500 reward pool</b><b>4 × $125 gross → $120 net</b></div>
          <button disabled={busy || form.stationLinkIds.length !== 2} className="md:col-span-2 h-12 rounded-xl bg-[#f5c518] text-xs font-black uppercase tracking-[0.16em] text-black disabled:opacity-40">Start Sprint</button>
        </form> : null}

        <section className="mt-10 space-y-5">{sprints.map((sprint) => {
          const funding = fundingDrafts[sprint.id] ?? { service: '2000', pool: '500', reference: '', exception: false };
          return <article key={sprint.id} className="rounded-3xl border border-white/10 bg-white/[0.035] p-5">
            <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#62efff]">{sprint.status} · {sprint.campaignCode}</p><h2 className="mt-2 text-2xl font-black">{sprint.buyerQuestion}</h2><p className="mt-2 text-sm text-white/45">{sprint.buyerOrganization || sprint.buyerName} · {sprint.areaLabel} · refresh every {sprint.freshnessWindowHours}h</p></div>{sprint.status === 'COMPLETE' ? <a href={`/field-sprints/${sprint.receiptCode}`} target="_blank" className="inline-flex items-center gap-2 rounded-xl border border-emerald-300/20 bg-emerald-300/10 px-4 py-3 text-xs font-black uppercase tracking-[0.12em] text-emerald-100">Receipt <ExternalLink className="h-4 w-4" /></a> : null}</div>
            <div className="mt-5 grid gap-2 sm:grid-cols-6">{['DRAFT','FUNDED','ROUTING','COLLECTING','REVIEW','COMPLETE'].map((state) => <div key={state} className={`rounded-lg border p-2 text-center text-[9px] font-black tracking-[0.1em] ${state === sprint.status ? 'border-[#ffe36a]/40 bg-[#ffe36a]/10 text-[#ffe36a]' : 'border-white/8 text-white/25'}`}>{state}</div>)}</div>
            {sprint.status === 'DRAFT' ? <div className="mt-5 grid gap-2 md:grid-cols-5"><Field label="Service confirmed" value={funding.service} onChange={(service) => setFundingDrafts({ ...fundingDrafts, [sprint.id]: { ...funding, service } })} type="number" /><Field label="Pool confirmed" value={funding.pool} onChange={(pool) => setFundingDrafts({ ...fundingDrafts, [sprint.id]: { ...funding, pool } })} type="number" /><Field label="Reference" value={funding.reference} onChange={(reference) => setFundingDrafts({ ...fundingDrafts, [sprint.id]: { ...funding, reference } })} /><label className="flex items-end gap-2 pb-3 text-xs"><input type="checkbox" checked={funding.exception} onChange={(event) => setFundingDrafts({ ...fundingDrafts, [sprint.id]: { ...funding, exception: event.target.checked } })} /> Design-partner exception</label><button onClick={() => void act({ action: 'CONFIRM_FUNDS', sprintId: sprint.id, serviceFeeConfirmedUsd: Number(funding.service), rewardPoolConfirmedUsd: Number(funding.pool), fundingReference: funding.reference, designPartnerException: funding.exception })} className="h-12 self-end rounded-xl bg-[#f5c518] text-xs font-black text-black">CONFIRM FUNDS</button></div> : null}
            {sprint.status === 'FUNDED' ? <Action onClick={() => void act({ action: 'START_ROUTING', sprintId: sprint.id })}>Start routing</Action> : null}
            <div className="mt-5 grid gap-3 lg:grid-cols-4">{sprint.missions.map((mission) => {
              const missionKey = `${sprint.id}:${mission.ordinal}`;
              const review = reviewDrafts[missionKey] ?? { minutes: String(mission.reviewMinutes), cost: String(mission.reviewCostUsd) };
              const selectedPlace = missionPlaces[missionKey];
              return <div key={mission.id} className="rounded-2xl border border-white/10 bg-black/35 p-4"><div className="flex items-center justify-between"><b>Mission {mission.ordinal}</b><span className="text-[9px] font-black text-[#62efff]">{mission.status}</span></div><p className="mt-2 text-xs text-white/40">$125 gross · $120 net · Field Truth v1</p>{mission.dare ? <p className="mt-3 text-xs text-white/65">{mission.dare.title}<small className="block text-white/30">{mission.dare.status} · {mission.dare.shortId || mission.dareId}</small></p> : sprint.status === 'ROUTING' ? <div className="mt-3"><MissionPlacePicker value={selectedPlace} onSelect={(place) => setMissionPlaces((current) => { const next = { ...current }; if (place) next[missionKey] = place; else delete next[missionKey]; return next; })} />{selectedPlace ? <Link href={buildMissionCreateHref(sprint, mission.ordinal, selectedPlace)} className="mt-2 flex h-10 w-full items-center justify-center rounded-lg bg-[#f5c518] text-[10px] font-black uppercase tracking-[0.12em] text-black">Fund this $125 mission</Link> : <div className="mt-2 flex h-10 items-center justify-center rounded-lg border border-white/10 text-[9px] font-black uppercase tracking-[0.1em] text-white/30">Choose the exact place first</div>}<details className="mt-2"><summary className="cursor-pointer text-[9px] font-black uppercase tracking-[0.1em] text-white/35">Repair an existing escrow link</summary><input placeholder="Real Dare database ID" value={missionDrafts[missionKey] ?? ''} onChange={(event) => setMissionDrafts({ ...missionDrafts, [missionKey]: event.target.value })} className="mt-2 h-10 w-full rounded-lg border border-white/10 bg-black px-3 text-xs" /><button onClick={() => void act({ action: 'LINK_MISSION', sprintId: sprint.id, ordinal: mission.ordinal, dareId: missionDrafts[missionKey] })} className="mt-2 h-9 w-full rounded-lg border border-[#62efff]/25 bg-[#62efff]/10 text-[10px] font-black text-[#9af5ff]">LINK EXISTING ESCROW</button></details></div> : null}{mission.evidenceQuality ? <p className="mt-3 text-xs">Evidence: <b>{mission.evidenceQuality}</b> · payout {mission.contributorPayoutUsd ?? 'pending'}</p> : null}{['COLLECTING','REVIEW'].includes(sprint.status) ? <div className="mt-3 grid grid-cols-2 gap-2"><input value={review.minutes} onChange={(event) => setReviewDrafts({ ...reviewDrafts, [missionKey]: { ...review, minutes: event.target.value } })} placeholder="minutes" className="h-9 rounded-lg border border-white/10 bg-black px-2 text-xs" /><input value={review.cost} onChange={(event) => setReviewDrafts({ ...reviewDrafts, [missionKey]: { ...review, cost: event.target.value } })} placeholder="$ cost" className="h-9 rounded-lg border border-white/10 bg-black px-2 text-xs" /><button onClick={() => void act({ action: 'RECORD_REVIEW_COST', sprintId: sprint.id, ordinal: mission.ordinal, reviewMinutes: Number(review.minutes), reviewCostUsd: Number(review.cost) })} className="col-span-2 h-8 rounded-lg border border-white/10 text-[9px] font-black">SAVE REVIEW COST</button></div> : null}</div>;
            })}</div>
            {sprint.status === 'ROUTING' && sprint.missions.every((mission) => mission.dareId) ? <Action onClick={() => void act({ action: 'START_COLLECTING', sprintId: sprint.id })}>Begin collection</Action> : null}
            {['COLLECTING','REVIEW'].includes(sprint.status) ? <div className="mt-4 flex gap-2"><Action onClick={() => void act({ action: 'SYNC', sprintId: sprint.id })}>Sync authoritative rails</Action>{sprint.status === 'REVIEW' ? <Action onClick={() => void act({ action: 'COMPLETE', sprintId: sprint.id })}>Close receipt</Action> : null}</div> : null}
            <div className="mt-4 flex items-center gap-2 text-xs text-white/35"><ShieldCheck className="h-4 w-4" /> Runner cannot fund, approve evidence, or pay contributors.</div>
          </article>;
        })}</section>
      </div>
    </main>
  );
}

function Field({ label, value, onChange, required = false, type = 'text' }: { label: string; value: string; onChange: (value: string) => void; required?: boolean; type?: string }) { return <label><span className="text-[10px] font-black uppercase tracking-[0.15em] text-white/45">{label}</span><input type={type} value={value} onChange={(event) => onChange(event.target.value)} required={required} className="mt-2 h-12 w-full rounded-xl border border-white/10 bg-black/50 px-3" /></label>; }
function Action({ children, onClick }: { children: React.ReactNode; onClick: () => void }) { return <button onClick={onClick} className="mt-4 inline-flex h-10 items-center gap-2 rounded-xl border border-[#62efff]/25 bg-[#62efff]/10 px-4 text-[10px] font-black uppercase tracking-[0.13em] text-[#9af5ff]"><CheckCircle2 className="h-4 w-4" />{children}</button>; }

function buildMissionCreateHref(sprint: Sprint, ordinal: number, place: MissionPlace) {
  const params = new URLSearchParams({
    mode: 'sprint-field-truth',
    source: 'field-sprint-runner',
    sprintId: sprint.id,
    sprintOrdinal: String(ordinal),
    title: `Field check ${ordinal}: ${sprint.buyerQuestion}`.slice(0, 100),
    amount: '125',
    buyerQuestion: sprint.buyerQuestion,
    maximumObservationAgeHours: String(sprint.freshnessWindowHours),
    venueId: place.id,
    venueName: place.name,
    venue: place.slug,
  });
  return `/create?${params.toString()}`;
}

function MissionPlacePicker({ value, onSelect }: { value?: MissionPlace; onSelect: (place: MissionPlace | null) => void }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<MissionPlace[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const search = query.trim();
    if (value || search.length < 2) {
      setResults([]);
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/places/search?q=${encodeURIComponent(search)}`, { signal: controller.signal });
        const payload = await response.json();
        const places = (payload.success ? payload.data?.results ?? [] : []) as Array<MissionPlace & { placeSource?: string }>;
        setResults(places.filter((place) => place.placeSource === 'BASEDARE_VENUE' && place.slug && place.id && place.name).slice(0, 5));
      } catch {
        if (!controller.signal.aborted) setResults([]);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 220);
    return () => { controller.abort(); window.clearTimeout(timer); };
  }, [query, value]);

  if (value) return <button type="button" onClick={() => { setQuery(value.name); onSelect(null); }} className="flex w-full items-center gap-2 rounded-lg border border-emerald-300/20 bg-emerald-300/10 p-2 text-left text-xs text-emerald-100"><MapPin className="h-4 w-4 shrink-0" /><span className="min-w-0"><b className="block truncate">{value.name}</b><small className="block truncate text-emerald-100/45">{value.address || value.slug} · change</small></span></button>;
  return <div className="relative"><label className="flex h-10 items-center gap-2 rounded-lg border border-white/10 bg-black px-3"><Search className="h-4 w-4 text-white/35" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search exact BaseDare place" className="min-w-0 flex-1 bg-transparent text-xs outline-none placeholder:text-white/25" />{loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}</label>{results.length ? <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-white/10 bg-[#0b0b12] shadow-2xl">{results.map((place) => <button key={place.id} type="button" onClick={() => { onSelect(place); setResults([]); }} className="block w-full border-b border-white/6 px-3 py-2 text-left text-xs last:border-0 hover:bg-white/[0.06]"><b className="block">{place.name}</b><small className="block truncate text-white/35">{place.address || place.slug}</small></button>)}</div> : null}</div>;
}
