'use client';

import { Download, Loader2, Printer, RefreshCw } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useAccount } from 'wagmi';

import { useSessionAdminSecret } from '@/hooks/useSessionAdminSecret';

type Counts = Record<string, number>;
type StationLink = {
  id: string;
  active: boolean;
  slug: string;
  stationCode: string;
  contentCode: string;
  campaignCode: string | null;
  attentionMode: string;
  serial: string;
  publicPath: string;
  stationHostVenue: { name: string; slug: string; city: string | null } | null;
};
type Report = {
  generatedAt: string;
  periodDays: number;
  links: StationLink[];
  stationHostReceipts: Array<{
    stationCode: string;
    stationHostVenue: { name: string; slug: string } | null;
    contentCode: string | null;
    counts: Counts;
    timeToAction: { verifiedActions: number; medianMinutes: number } | null;
    entryPerformance: { samples: number; medianMs: number } | null;
    inventoryHealth: {
      targetedScans: number;
      fallbackScans: number;
      fallbackRate: number;
      lastHealthyAt: string | null;
    } | null;
    receiptMeaning: string;
  }>;
  creativeReceipts: Array<{ contentCode: string; counts: Counts }>;
  campaignReceipts: Array<{
    campaignCode: string;
    status: 'LEARNING' | 'NEEDS_FIX' | 'PASS_CANDIDATE';
    counts: {
      uniqueEntries: number;
      targetOpens: number;
      missionPasses: number;
      verifiedOutcomes: number;
    };
    rates: {
      healthyInventoryPercent: number | null;
      targetOpenPercent: number | null;
      medianRenderMs: number | null;
    };
    gates: Record<string, {
      status: 'PASS' | 'FAIL' | 'PENDING' | 'NOT_APPLICABLE';
      value: number | null;
      target: number;
      unit: 'count' | 'percent' | 'milliseconds';
      meaning: string;
    }>;
    humanDecisionMeaning: string;
  }>;
  pilotReadiness: {
    environment: {
      journeySecretConfigured: boolean;
      portableMissionPassReady: boolean;
      emailDeliveryConfigured: boolean;
      emailMeaning: string;
    };
    stations: Array<{
      linkId: string;
      stationCode: string | null;
      serial: string;
      campaignCode: string | null;
      contentCode: string;
      requestedAttention: string;
      status: 'READY' | 'DEGRADED' | 'BLOCKED';
      stationHostVenue: { name: string; slug: string } | null;
      issues: Array<{ severity: 'BLOCKER' | 'WARNING'; code: string; message: string }>;
      lanes: Array<{
        attention: string;
        qualifyingCount: number;
        minimumDensity: number;
        healthy: boolean;
        hasVerifiedOutcomePath: boolean;
        error: string | null;
        items: Array<{
          id: string;
          title: string;
          placeLabel: string;
          source: string;
          liveHandshake: boolean;
          verifiedOutcomePath: boolean;
        }>;
      }>;
    }>;
  };
  destinationVenueReceipts: Array<{
    venue: { id: string; slug: string | null; name: string };
    counts: Counts;
    receiptMeaning: string;
  }>;
};

const EMPTY_FORM = {
  slug: '',
  stationCode: '',
  stationHostVenueSlug: '',
  contentCode: '',
  campaignCode: 'siargao-design-partner-v1',
  attentionMode: 'ASK',
  fallbackAttentionMode: 'NEARBY',
  minimumDensity: 3,
  densityRadiusKm: 3,
  targetHref: '/board',
};

function count(counts: Counts, key: string) {
  return Number(counts[key] ?? 0);
}

function statusClass(status: string) {
  if (status === 'READY' || status === 'PASS' || status === 'PASS_CANDIDATE') return 'border-emerald-300/20 bg-emerald-300/10 text-emerald-100';
  if (status === 'BLOCKED' || status === 'FAIL' || status === 'NEEDS_FIX') return 'border-red-300/20 bg-red-300/10 text-red-100';
  return 'border-amber-300/20 bg-amber-300/10 text-amber-100';
}

function ReceiptMetrics({ counts, destination = false }: { counts: Counts; destination?: boolean }) {
  const metrics = destination
    ? [
        ['Opened', count(counts, 'STATION_TARGET_OPENED')],
        ['Intents', count(counts, 'INTENT_LOCKED')],
        ['Arrived', count(counts, 'STATION_VERIFIED_ARRIVAL')],
        ['Completed', count(counts, 'PATH_VERIFIED_COMPLETION') + count(counts, 'DIRECT_VERIFIED_COMPLETION')],
      ]
    : [
        ['Scans', count(counts, 'STATION_SCAN')],
        ['Choices', count(counts, 'STATION_ATTENTION_SELECTED')],
        ['Opened', count(counts, 'STATION_TARGET_OPENED')],
        ['Passes', count(counts, 'MISSION_PASS_ISSUED')],
      ];
  return (
    <div className="mt-4 grid grid-cols-4 gap-2">
      {metrics.map(([label, value]) => (
        <div key={String(label)} className="rounded-xl border border-white/8 bg-black/25 p-3 text-center">
          <p className="text-lg font-black text-white">{value}</p>
          <p className="mt-1 text-[9px] font-black uppercase tracking-[0.12em] text-white/35">{label}</p>
        </div>
      ))}
    </div>
  );
}

export default function FieldStationsAdminPage() {
  const { address } = useAccount();
  const { adminSecret, setAdminSecret, ensureAdminSession, hasAdminSession } = useSessionAdminSecret();
  const [form, setForm] = useState(EMPTY_FORM);
  const [report, setReport] = useState<Report | null>(null);
  const [created, setCreated] = useState<(StationLink & { shortUrl: string }) | null>(null);
  const [periodDays, setPeriodDays] = useState(30);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [updatingLinkId, setUpdatingLinkId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const qrRef = useRef<SVGSVGElement>(null);
  const headers = useMemo<Record<string, string>>(() => {
    const next: Record<string, string> = {};
    if (address) next['x-moderator-wallet'] = address;
    return next;
  }, [address]);
  const createdReadiness = useMemo(
    () => created && report
      ? report.pilotReadiness.stations.find((station) => station.linkId === created.id) ?? null
      : null,
    [created, report]
  );
  const createdIsPrintable = createdReadiness !== null && createdReadiness.status !== 'BLOCKED';

  const authenticate = useCallback(async () => {
    if (address || hasAdminSession) return true;
    return ensureAdminSession();
  }, [address, ensureAdminSession, hasAdminSession]);

  const load = useCallback(async () => {
    if (!(await authenticate())) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/field-stations?periodDays=${periodDays}`, { headers });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload.hint || payload.error || 'Unable to load Field Stations.');
      setReport(payload.data);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load Field Stations.');
    } finally {
      setLoading(false);
    }
  }, [authenticate, headers, periodDays]);

  useEffect(() => { if (address || hasAdminSession) void load(); }, [address, hasAdminSession, load]);

  const createStation = async (event: FormEvent) => {
    event.preventDefault();
    if (!(await authenticate())) return;
    setSaving(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/field-stations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify(form),
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload.error || 'Unable to create Field Station.');
      setCreated(payload.data);
      setForm(EMPTY_FORM);
      await load();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to create Field Station.');
    } finally {
      setSaving(false);
    }
  };

  const downloadQr = () => {
    if (!qrRef.current || !created || !createdIsPrintable) return;
    const svg = new XMLSerializer().serializeToString(qrRef.current);
    const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${created.serial}-${created.stationCode}.svg`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const exportCsv = async () => {
    if (!(await authenticate())) return;
    const response = await fetch(`/api/admin/field-stations?periodDays=${periodDays}&format=csv`, { headers });
    if (!response.ok) return setError('Unable to export Field Station events.');
    const url = URL.createObjectURL(await response.blob());
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `basedare-field-stations-${periodDays}d.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const updateStationStatus = async (link: StationLink) => {
    if (!(await authenticate())) return;
    setUpdatingLinkId(link.id);
    setError(null);
    try {
      const response = await fetch('/api/admin/field-stations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ linkId: link.id, active: !link.active }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload.error || 'Unable to update Field Station.');
      }
      await load();
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'Unable to update Field Station.');
    } finally {
      setUpdatingLinkId(null);
    }
  };

  return (
    <main className="min-h-screen bg-[#07070b] px-4 pb-24 pt-24 text-white sm:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#ffe36a]">Internal · Physical onboarding</p>
            <h1 className="mt-2 text-3xl font-black">Field Stations</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/45">Create weatherproof acquisition QRs and read ground-truth receipts. These codes open discovery; they never prove presence, authorize a claim, or move money.</p>
          </div>
          <div className="flex gap-2">
            <select value={periodDays} onChange={(event) => setPeriodDays(Number(event.target.value))} className="h-10 rounded-xl border border-white/10 bg-black px-3 text-xs">
              <option value={7}>7 days</option><option value={30}>30 days</option><option value={90}>90 days</option>
            </select>
            <button onClick={() => void load()} className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/[0.04]" aria-label="Refresh report">{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}</button>
            <button onClick={() => void exportCsv()} className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 text-[10px] font-black uppercase tracking-[0.12em]"><Download className="h-4 w-4" /> CSV</button>
          </div>
        </div>

        {!address && !hasAdminSession ? (
          <section className="mt-8 max-w-lg rounded-2xl border border-white/10 bg-white/[0.04] p-5">
            <label className="text-xs font-black uppercase tracking-[0.16em] text-white/50">Admin secret</label>
            <input type="password" value={adminSecret} onChange={(event) => setAdminSecret(event.target.value)} className="mt-2 h-12 w-full rounded-xl border border-white/10 bg-black px-4 outline-none" />
            <button onClick={() => void load()} className="mt-3 h-11 w-full rounded-xl bg-[#f5c518] text-xs font-black uppercase tracking-[0.16em] text-black">Open stations</button>
          </section>
        ) : null}

        {error ? <div className="mt-5 rounded-xl border border-red-400/20 bg-red-500/10 p-3 text-sm text-red-200">{error}</div> : null}

        <section className="mt-8 grid gap-3 rounded-3xl border border-cyan-300/12 bg-cyan-300/[0.025] p-5 sm:grid-cols-3 sm:p-6">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-100/65">1 · Design partner</p>
            <p className="mt-2 text-sm font-bold text-white">The business learning from the Sprint</p>
            <p className="mt-1 text-xs leading-5 text-white/40">They receive the verified answers and decide whether the result is useful enough to repeat or buy.</p>
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-100/65">2 · Precise question</p>
            <p className="mt-2 text-sm font-bold text-white">One bounded decision written into the mission brief</p>
            <p className="mt-1 text-xs leading-5 text-white/40">Example: “Which Tuesday 6–8pm offer produces verified first-time arrivals?” The campaign code groups its receipts.</p>
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-100/65">3 · Station hosts</p>
            <p className="mt-2 text-sm font-bold text-white">Your two permissioned scan locations</p>
            <p className="mt-1 text-xs leading-5 text-white/40">They distribute the question. They do not need to be the design partner or the destination being measured.</p>
          </div>
        </section>

        <section className="mt-8 grid gap-5 lg:grid-cols-[1fr_0.8fr]">
          <form onSubmit={createStation} className="rounded-3xl border border-[#ffe36a]/15 bg-[linear-gradient(145deg,rgba(255,227,106,.08),rgba(255,255,255,.025))] p-5 sm:p-7">
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#ffe36a]">New immutable short link</p>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {[
                ['Station host venue slug', 'stationHostVenueSlug', 'catangnan-coffee'],
                ['Station code', 'stationCode', 'catangnan-01'],
                ['Short-link slug', 'slug', 'catangnan-tonight-a'],
                ['Creative code', 'contentCode', 'catangnan-tonight-a'],
                ['Campaign code', 'campaignCode', 'siargao-design-partner-v1'],
              ].map(([label, key, placeholder]) => (
                <label key={key} className="text-[10px] font-black uppercase tracking-[0.15em] text-white/45">{label}
                  <input required value={String(form[key as keyof typeof form])} placeholder={placeholder} onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))} className="mt-2 h-11 w-full rounded-xl border border-white/10 bg-black/60 px-3 text-sm normal-case tracking-normal text-white outline-none" />
                </label>
              ))}
              <label className="text-[10px] font-black uppercase tracking-[0.15em] text-white/45">Promise
                <select value={form.attentionMode} onChange={(event) => setForm((current) => ({ ...current, attentionMode: event.target.value }))} className="mt-2 h-11 w-full rounded-xl border border-white/10 bg-black/60 px-3 text-sm text-white">
                  <option value="ASK">Ask first</option><option value="TONIGHT">Tonight</option><option value="MYSTERY">Mystery</option><option value="SOCIAL">Meet people</option><option value="REWARD">Paid mission</option>
                </select>
              </label>
              <label className="text-[10px] font-black uppercase tracking-[0.15em] text-white/45">Minimum useful options
                <input type="number" min={1} max={20} value={form.minimumDensity} onChange={(event) => setForm((current) => ({ ...current, minimumDensity: Number(event.target.value) }))} className="mt-2 h-11 w-full rounded-xl border border-white/10 bg-black/60 px-3 text-sm text-white" />
              </label>
              <label className="text-[10px] font-black uppercase tracking-[0.15em] text-white/45">Search radius (km)
                <input type="number" min={0.2} max={15} step={0.1} value={form.densityRadiusKm} onChange={(event) => setForm((current) => ({ ...current, densityRadiusKm: Number(event.target.value) }))} className="mt-2 h-11 w-full rounded-xl border border-white/10 bg-black/60 px-3 text-sm text-white" />
              </label>
              <label className="text-[10px] font-black uppercase tracking-[0.15em] text-white/45">Truthful fallback
                <select value={form.fallbackAttentionMode} onChange={(event) => setForm((current) => ({ ...current, fallbackAttentionMode: event.target.value }))} className="mt-2 h-11 w-full rounded-xl border border-white/10 bg-black/60 px-3 text-sm text-white">
                  <option value="NEARBY">Nearby / answer first</option><option value="ASK">Ask first</option>
                </select>
              </label>
            </div>
            <button disabled={saving} className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#f5c518] text-xs font-black uppercase tracking-[0.17em] text-black disabled:opacity-50">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Create station QR</button>
          </form>

          <section className="rounded-3xl border border-white/10 bg-white/[0.035] p-5 sm:p-7">
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-cyan-200">Print-safe QR</p>
            {created ? (
              <div className="mt-5 text-center">
                <div className="mx-auto inline-block bg-white p-2">
                  <QRCodeSVG ref={qrRef} value={created.shortUrl} size={260} level="H" marginSize={4} bgColor="#ffffff" fgColor="#000000" />
                </div>
                <p className="mt-3 font-mono text-sm font-black text-[#ffe36a]">{created.serial}</p>
                <p className="mt-1 break-all text-xs text-white/45">{created.shortUrl}</p>
                {createdReadiness ? <p className={`mx-auto mt-3 w-fit rounded-full border px-3 py-1 text-[9px] font-black uppercase tracking-[0.12em] ${statusClass(createdReadiness.status)}`}>Preflight {createdReadiness.status}</p> : <p className="mt-3 text-[10px] text-amber-200">Waiting for live preflight…</p>}
                <div className="mt-4 flex justify-center gap-2">
                  <button disabled={!createdIsPrintable} onClick={downloadQr} className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/10 px-3 text-[10px] font-black uppercase tracking-[0.12em] disabled:cursor-not-allowed disabled:opacity-30"><Download className="h-4 w-4" /> SVG</button>
                  <button disabled={!createdIsPrintable} onClick={() => { if (createdIsPrintable) window.print(); }} className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/10 px-3 text-[10px] font-black uppercase tracking-[0.12em] disabled:cursor-not-allowed disabled:opacity-30"><Printer className="h-4 w-4" /> Print</button>
                </div>
                <p className="mt-4 text-xs leading-5 text-white/35">Level H correction · four-module quiet zone · no logo over the code.</p>
                {!createdIsPrintable ? <p className="mt-2 text-xs leading-5 text-red-200/70">Printing stays locked until the station has useful inventory, a verified-outcome path, and the Journey secret.</p> : null}
              </div>
            ) : <div className="mt-5 grid min-h-72 place-items-center rounded-2xl border border-dashed border-white/10 text-center text-sm text-white/30">Create a station to generate its serialized QR.</div>}
          </section>
        </section>

        {report ? (
          <div className="mt-10 space-y-10">
            <section>
              <h2 className="text-xl font-black">Station controls</h2>
              <p className="mt-1 text-sm text-white/40">Pause a code immediately if permission is withdrawn, the placement is damaged, or its promise becomes stale. Historical receipts stay intact.</p>
              <div className="mt-4 grid gap-3 xl:grid-cols-2">
                {report.links.length ? report.links.map((link) => (
                  <article key={link.id} className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.035] p-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-xs font-black text-white">{link.stationHostVenue?.name ?? link.stationCode}</p>
                        <span className={`rounded-full border px-2 py-1 text-[8px] font-black uppercase tracking-[0.12em] ${link.active ? statusClass('PASS') : 'border-white/10 bg-white/[0.04] text-white/40'}`}>{link.active ? 'Active' : 'Paused'}</span>
                      </div>
                      <p className="mt-1 truncate font-mono text-[10px] text-white/35">{link.serial} · {link.publicPath} · {link.contentCode}</p>
                    </div>
                    <button
                      type="button"
                      disabled={updatingLinkId === link.id}
                      onClick={() => void updateStationStatus(link)}
                      className="inline-flex h-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-black/30 px-3 text-[9px] font-black uppercase tracking-[0.12em] text-white/65 transition hover:border-white/25 hover:text-white disabled:cursor-wait disabled:opacity-40"
                    >
                      {updatingLinkId === link.id ? 'Saving…' : link.active ? 'Pause' : 'Activate'}
                    </button>
                  </article>
                )) : <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-white/30">No Field Station links yet.</div>}
              </div>
            </section>

            <section>
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2 className="text-xl font-black">Pilot preflight</h2>
                  <p className="mt-1 text-sm text-white/40">Live inventory and verified-outcome checks. Do not print a blocked station.</p>
                </div>
                <div className="flex flex-wrap gap-2 text-[10px] font-black uppercase tracking-[0.12em]">
                  <span className={`rounded-full border px-3 py-2 ${report.pilotReadiness.environment.journeySecretConfigured ? statusClass('PASS') : statusClass('FAIL')}`}>Journey secret {report.pilotReadiness.environment.journeySecretConfigured ? 'ready' : 'missing'}</span>
                  <span className={`rounded-full border px-3 py-2 ${report.pilotReadiness.environment.emailDeliveryConfigured ? statusClass('PASS') : statusClass('PENDING')}`}>Email Pass {report.pilotReadiness.environment.emailDeliveryConfigured ? 'ready' : 'optional'}</span>
                </div>
              </div>
              <p className="mt-3 text-xs text-white/35">{report.pilotReadiness.environment.emailMeaning}</p>
              <div className="mt-4 grid gap-4 xl:grid-cols-2">
                {report.pilotReadiness.stations.length ? report.pilotReadiness.stations.map((station) => (
                  <article key={station.linkId} className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-black text-white">{station.stationHostVenue?.name ?? station.stationCode}</p>
                        <p className="mt-1 font-mono text-[10px] text-white/35">{station.serial} · {station.campaignCode ?? 'no campaign'} · {station.requestedAttention}</p>
                      </div>
                      <span className={`rounded-full border px-2.5 py-1 text-[9px] font-black tracking-[0.12em] ${statusClass(station.status)}`}>{station.status}</span>
                    </div>
                    <div className="mt-4 grid gap-2 sm:grid-cols-2">
                      {station.lanes.map((lane) => (
                        <div key={lane.attention} className="rounded-xl border border-white/8 bg-black/25 p-3">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-[10px] font-black tracking-[0.12em] text-white/60">{lane.attention}</p>
                            <span className={lane.healthy ? 'text-[10px] font-bold text-emerald-200' : 'text-[10px] font-bold text-amber-200'}>{lane.qualifyingCount}/{lane.minimumDensity}</span>
                          </div>
                          <p className="mt-2 text-[10px] text-white/35">{lane.hasVerifiedOutcomePath ? 'Verified outcome path ready' : 'No funded mission or live handshake'}</p>
                          {lane.items.slice(0, 3).map((item) => <p key={item.id} className="mt-1 truncate text-[10px] text-white/55">{item.verifiedOutcomePath ? '✓' : '·'} {item.title}</p>)}
                          {lane.error ? <p className="mt-2 text-[10px] text-red-200">{lane.error}</p> : null}
                        </div>
                      ))}
                    </div>
                    {station.issues.length ? <div className="mt-3 space-y-1">{station.issues.map((issue) => <p key={issue.code} className={issue.severity === 'BLOCKER' ? 'text-[10px] text-red-200' : 'text-[10px] text-amber-200'}>{issue.severity}: {issue.message}</p>)}</div> : null}
                  </article>
                )) : <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-white/30">No active Field Stations.</div>}
              </div>
            </section>

            <section>
              <h2 className="text-xl font-black">Campaign decision gates</h2>
              <p className="mt-1 text-sm text-white/40">Qualified action, not scan volume. A passing scorecard still needs a human repeat/pay decision.</p>
              <div className="mt-4 grid gap-4 xl:grid-cols-2">
                {report.campaignReceipts.length ? report.campaignReceipts.map((campaign) => (
                  <article key={campaign.campaignCode} className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-mono text-xs font-black text-[#ffe36a]">{campaign.campaignCode}</p>
                      <span className={`rounded-full border px-2.5 py-1 text-[9px] font-black tracking-[0.12em] ${statusClass(campaign.status)}`}>{campaign.status}</span>
                    </div>
                    <div className="mt-4 grid grid-cols-4 gap-2 text-center">
                      {[['Entries', campaign.counts.uniqueEntries], ['Opened', campaign.counts.targetOpens], ['Passes', campaign.counts.missionPasses], ['Verified', campaign.counts.verifiedOutcomes]].map(([label, value]) => <div key={String(label)} className="rounded-xl border border-white/8 bg-black/25 p-3"><p className="text-lg font-black">{value}</p><p className="text-[9px] uppercase tracking-[0.1em] text-white/35">{label}</p></div>)}
                    </div>
                    <div className="mt-3 space-y-2">{Object.entries(campaign.gates).map(([name, gate]) => <div key={name} className="flex items-start justify-between gap-3 text-[10px]"><p className="text-white/45">{name.replace(/([A-Z])/g, ' $1')}</p><span className={`rounded-full border px-2 py-1 font-black ${statusClass(gate.status)}`}>{gate.status}{gate.value !== null ? ` · ${gate.value}${gate.unit === 'percent' ? '%' : gate.unit === 'milliseconds' ? 'ms' : ''}` : ''}</span></div>)}</div>
                    <p className="mt-3 text-[10px] leading-4 text-white/30">{campaign.humanDecisionMeaning}</p>
                  </article>
                )) : <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-white/30">No campaign activity yet.</div>}
              </div>
            </section>

            <div className="grid gap-8 lg:grid-cols-2">
            <section>
              <h2 className="text-xl font-black">Station-host receipts</h2>
              <p className="mt-1 text-sm text-white/40">What each physical placement started—not assumed visits to its host.</p>
              <div className="mt-4 space-y-3">
                {report.stationHostReceipts.length ? report.stationHostReceipts.map((receipt) => (
                  <article key={receipt.stationCode} className="rounded-2xl border border-[#ffe36a]/12 bg-[#ffe36a]/[0.035] p-4">
                    <p className="text-xs font-black text-[#ffe36a]">{receipt.stationHostVenue?.name ?? receipt.stationCode}</p>
                    <p className="mt-1 font-mono text-[10px] text-white/35">{receipt.stationCode} · {receipt.contentCode}</p>
                    <ReceiptMetrics counts={receipt.counts} />
                    {receipt.timeToAction ? <p className="mt-3 text-[10px] font-bold text-white/40">Median scan → verified action: <span className="text-white/70">{receipt.timeToAction.medianMinutes} min</span> · {receipt.timeToAction.verifiedActions} measured</p> : null}
                    {receipt.entryPerformance ? <p className="mt-2 text-[10px] font-bold text-white/40">Median scan page render: <span className={receipt.entryPerformance.medianMs <= 1500 ? 'text-emerald-200' : 'text-amber-200'}>{receipt.entryPerformance.medianMs}ms</span> · {receipt.entryPerformance.samples} measured</p> : null}
                    {receipt.inventoryHealth ? <p className="mt-2 text-[10px] font-bold text-white/40">Inventory fallback rate: <span className={receipt.inventoryHealth.fallbackRate > 40 ? 'text-amber-200' : 'text-emerald-200'}>{receipt.inventoryHealth.fallbackRate}%</span> · {receipt.inventoryHealth.fallbackScans}/{receipt.inventoryHealth.targetedScans} targeted scans{receipt.inventoryHealth.lastHealthyAt ? ` · last healthy ${new Date(receipt.inventoryHealth.lastHealthyAt).toLocaleString()}` : ''}</p> : null}
                  </article>
                )) : <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-white/30">No station scans yet.</div>}
              </div>
            </section>
            <section>
              <h2 className="text-xl font-black">Destination receipts</h2>
              <p className="mt-1 text-sm text-white/40">What people opened, intended, physically verified or completed there.</p>
              <div className="mt-4 space-y-3">
                {report.destinationVenueReceipts.length ? report.destinationVenueReceipts.map((receipt) => (
                  <article key={receipt.venue.id} className="rounded-2xl border border-cyan-300/12 bg-cyan-300/[0.025] p-4">
                    <p className="text-xs font-black text-cyan-100">{receipt.venue.name}</p>
                    <ReceiptMetrics counts={receipt.counts} destination />
                  </article>
                )) : <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-white/30">No destination outcomes yet.</div>}
              </div>
            </section>
            </div>
          </div>
        ) : null}
      </div>
    </main>
  );
}
