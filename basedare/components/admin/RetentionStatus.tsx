'use client';
import { useEffect, useState } from 'react';
type Report = { enabled: boolean; sendingEnabled: boolean; contacts: Record<string, number>; sends: Record<string, number>; note: string };
export default function RetentionStatus({ headers }: { headers: Record<string, string> }) {
  const [report, setReport] = useState<Report>(), [error, setError] = useState(''), [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 10000);
    void fetch('/api/admin/retention', { headers, cache: 'no-store', signal: controller.signal }).then(async r => { const b = await r.json(); if (!r.ok || !b.success) throw Error(); if (!controller.signal.aborted) { setReport(b.data); setError(''); } }).catch(() => setError('Email status unavailable. No totals inferred.')).finally(() => clearTimeout(timer));
    return () => { controller.abort(); clearTimeout(timer); };
  }, [headers, retry]);
  return <section className="bd-well mt-6 p-5"><h3 className="text-xl font-black">Get your next dare · email readiness</h3>{report ? <><p className="mt-3 text-sm leading-6 text-white/70">Opt-in: {report.enabled ? 'Enabled by operator configuration' : 'Off'} · Reviewed sends: {report.sendingEnabled ? 'Enabled by operator configuration' : 'Off'}. Provider/domain and real inbox acceptance are separate operating checks.</p><div className="mt-4 grid gap-4 sm:grid-cols-2">{[['Contact consent records', report.contacts], ['Email records · last 30 days', report.sends]].map(([label, counts]) => <div key={String(label)}><p className="font-bold">{String(label)}</p>{Object.entries(counts as Record<string, number>).length ? Object.entries(counts as Record<string, number>).map(([k, n]) => <p className="mt-2 text-sm text-white/65" key={k}>{k}: {n}</p>) : <p className="mt-2 text-sm text-white/65">No records.</p>}</div>)}</div><p className="mt-3 text-sm leading-6 text-white/60">{report.note}</p></> : <p role="status" className="mt-3 text-sm text-white/65">{error || 'Reading email readiness…'}</p>}{error ? <button className="bd-action mt-3 min-h-11 !text-sm" onClick={() => setRetry(n => n + 1)}>Retry email status</button> : null}</section>;
}
