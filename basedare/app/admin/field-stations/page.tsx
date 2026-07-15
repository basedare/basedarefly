'use client';

import { Download, Loader2, Printer, RefreshCw } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useAccount } from 'wagmi';

import { useSessionAdminSecret } from '@/hooks/useSessionAdminSecret';

type Counts = Record<string, number>;
type StationLink = {
  id: string;
  slug: string;
  stationCode: string;
  contentCode: string;
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
    receiptMeaning: string;
  }>;
  creativeReceipts: Array<{ contentCode: string; counts: Counts }>;
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
  campaignCode: 'siargao-field-stations-v1',
  attentionMode: 'ASK',
  fallbackAttentionMode: 'NEARBY',
  minimumDensity: 3,
  densityRadiusKm: 3,
  targetHref: '/map',
};

function count(counts: Counts, key: string) {
  return Number(counts[key] ?? 0);
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
  const [error, setError] = useState<string | null>(null);
  const qrRef = useRef<SVGSVGElement>(null);
  const headers = useMemo<Record<string, string>>(() => {
    const next: Record<string, string> = {};
    if (address) next['x-moderator-wallet'] = address;
    return next;
  }, [address]);

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
    if (!qrRef.current || !created) return;
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

        <section className="mt-8 grid gap-5 lg:grid-cols-[1fr_0.8fr]">
          <form onSubmit={createStation} className="rounded-3xl border border-[#ffe36a]/15 bg-[linear-gradient(145deg,rgba(255,227,106,.08),rgba(255,255,255,.025))] p-5 sm:p-7">
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#ffe36a]">New immutable short link</p>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {[
                ['Station host venue slug', 'stationHostVenueSlug', 'catangnan-coffee'],
                ['Station code', 'stationCode', 'catangnan-01'],
                ['Short-link slug', 'slug', 'catangnan-tonight-a'],
                ['Creative code', 'contentCode', 'catangnan-tonight-a'],
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
                <div className="mt-4 flex justify-center gap-2">
                  <button onClick={downloadQr} className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/10 px-3 text-[10px] font-black uppercase tracking-[0.12em]"><Download className="h-4 w-4" /> SVG</button>
                  <button onClick={() => window.print()} className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/10 px-3 text-[10px] font-black uppercase tracking-[0.12em]"><Printer className="h-4 w-4" /> Print</button>
                </div>
                <p className="mt-4 text-xs leading-5 text-white/35">Level H correction · four-module quiet zone · no logo over the code.</p>
              </div>
            ) : <div className="mt-5 grid min-h-72 place-items-center rounded-2xl border border-dashed border-white/10 text-center text-sm text-white/30">Create a station to generate its serialized QR.</div>}
          </section>
        </section>

        {report ? (
          <div className="mt-10 grid gap-8 lg:grid-cols-2">
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
        ) : null}
      </div>
    </main>
  );
}
