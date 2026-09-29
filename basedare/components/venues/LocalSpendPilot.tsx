'use client';
import { useCallback, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { trackClientEvent } from '@/lib/analytics';
import type { PilotConfig } from '@/lib/local-spend-pilot';

const initial: PilotConfig = { enabled: false, merchantQrTested: false, merchantReceiptConfirmed: false, testedAt: null, testReference: '' };
const input = 'mt-1 min-h-11 w-full rounded-xl border border-white/15 bg-black/30 px-3 text-sm text-white';
export default function LocalSpendPilot({ slug, manage = false }: { slug: string; manage?: boolean }) {
  const { data: session } = useSession();
  const token = (session as { token?: string } | null)?.token;
  const [active, setActive] = useState<{ testedAt: string } | null>(null);
  const [config, setConfig] = useState<PilotConfig>(initial);
  const [records, setRecords] = useState<Array<{ id: string; status: string; occurredAt: string; metadataJson: { outcome: string; stablecoin: string; amountSpent: string; phpReceived?: string; elapsedSeconds: number } }>>([]);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [recordId, setRecordId] = useState('');
  const load = useCallback(async () => {
    try {
      const response = await fetch(`/api/venues/${encodeURIComponent(slug)}/local-spend`, { cache: 'no-store' });
      const body = await response.json(); if (!response.ok) throw new Error();
      setActive(body.data.active); setConfig(body.data.config || initial); setRecords(body.data.records || []);
    } catch { if (manage) setMessage('Pilot details could not load. Retry before changing settings.'); }
  }, [slug, manage]);
  useEffect(() => { void load(); }, [load, token]);
  const save = async (body: unknown) => {
    setBusy(true); setMessage('');
    try {
      const response = await fetch(`/api/venues/${encodeURIComponent(slug)}/local-spend`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) }, body: JSON.stringify(body) });
      const result = await response.json(); if (!response.ok) throw new Error(result.error);
      setMessage('Saved.'); await load(); return true;
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not save.'); return false; }
    finally { setBusy(false); }
  };
  if (!manage && !active) return null;
  return <section className="my-5 rounded-3xl border border-cyan-200/15 bg-[#0b1020] p-5 text-white">
    <p className="text-[10px] font-black uppercase tracking-widest text-cyan-100">Spend locally · pilot</p>
    <h3 className="mt-2 text-lg font-black">Pay with stablecoins using Yodl</h3>
    {active ? <><p className="mt-2 text-sm leading-6 text-white/60">The venue reports a successful merchant QR test on {new Date(active.testedAt).toLocaleDateString()}. Use Yodl’s app to scan at the counter and review its quote. Staff should confirm PHP receipt before you leave.</p>
      <a href="https://yodl.me/get" target="_blank" rel="noopener noreferrer" onClick={() => trackClientEvent('local_spend_opened', { venue_slug: slug, source: 'venue_page' })} className="mt-3 inline-flex min-h-11 items-center rounded-full border border-cyan-200/20 px-5 text-xs font-bold text-cyan-100">Get or open Yodl →</a>
      <p className="mt-3 text-xs text-white/45">Payment takes place outside BaseDare. Fees, rates and availability are shown by Yodl. Opening the app does not confirm a purchase. This is separate from BaseCash venue credit.</p></> : <p className="mt-2 text-sm text-white/55">Hidden from visitors until this venue’s merchant QR has been tested.</p>}
    {manage ? <>
      <details className="mt-5"><summary className="min-h-11 cursor-pointer text-sm font-bold">Pilot setup</summary>
        <div className="grid gap-3 text-xs text-white/70">
          {(['enabled', 'merchantQrTested', 'merchantReceiptConfirmed'] as const).map((key) => <label key={key} className="flex min-h-11 items-center gap-3"><input type="checkbox" checked={config[key]} onChange={(e) => setConfig((c) => ({ ...c, [key]: e.target.checked }))} />{key === 'enabled' ? 'Show this option to visitors' : key === 'merchantQrTested' ? 'I tested this venue’s actual merchant QR using Yodl' : 'The merchant confirmed receiving the PHP payment'}</label>)}
          <label>Successful test date (UTC)<input className={input} type="date" value={config.testedAt?.slice(0, 10) || ''} onChange={(e) => setConfig((c) => ({ ...c, testedAt: e.target.value ? new Date(e.target.value + 'T00:00:00Z').toISOString() : null }))} /></label>
          <label>Test receipt reference (private)<input className={input} value={config.testReference} maxLength={100} onChange={(e) => setConfig((c) => ({ ...c, testReference: e.target.value }))} /></label>
          <button type="button" disabled={busy} className={input} onClick={() => void save({ action: 'configure', config })}>Save pilot setup</button>
        </div>
      </details>
      {active ? <details className="mt-3"><summary className="min-h-11 cursor-pointer text-sm font-bold">Record a pilot purchase</summary>
        <form className="grid gap-3 text-xs text-white/65 sm:grid-cols-2" onSubmit={async (e) => {
          e.preventDefault(); const form = e.currentTarget; const values = new FormData(form);
          const id = recordId || crypto.randomUUID(); setRecordId(id);
          const record = { recordId: id, consent: values.get('consent') === 'on', outcome: values.get('outcome'), evidence: values.get('evidence'), stablecoin: values.get('stablecoin'), amountSpent: values.get('amountSpent'),
            phpReceived: values.get('phpReceived') || null, quotedPhp: values.get('quotedPhp') || null, elapsedSeconds: Number(values.get('elapsedSeconds')), planReference: values.get('planReference'), receiptReference: values.get('receiptReference'), notes: values.get('notes') };
          if (await save({ action: 'record', record })) { form.reset(); setRecordId(''); }
        }}>
          <label>Outcome<select name="outcome" className={input}><option>COMPLETED</option><option>PENDING</option><option>FAILED</option><option>CANCELLED</option></select></label>
          <label>Evidence<select name="evidence" className={input}><option value="PARTICIPANT_REPORTED">Participant reported</option><option value="MERCHANT_CONFIRMED">Merchant confirmed to me</option></select></label>
          <label>Stablecoin<select name="stablecoin" className={input}><option>USDC</option><option>USDT</option></select></label>
          <label>Stablecoins spent<input name="amountSpent" required inputMode="decimal" className={input} /></label>
          <label>PHP received<input name="phpReceived" inputMode="decimal" className={input} /></label>
          <label>PHP quoted<input name="quotedPhp" inputMode="decimal" className={input} /></label>
          <label>Time to outcome (seconds)<input name="elapsedSeconds" required min={0} max={86400} type="number" className={input} /></label>
          <label>Plan reference (optional)<input name="planReference" maxLength={120} className={input} /></label>
          <label>Receipt reference<input name="receiptReference" maxLength={100} className={input} /></label>
          <label>Fees, problems or refund follow-up<textarea name="notes" maxLength={300} className={input} /></label>
          <label className="flex min-h-11 items-center gap-3 sm:col-span-2"><input name="consent" type="checkbox" required />The participant agreed to this pilot record. Do not enter names, wallet keys or personal contact details.</label>
          <button disabled={busy} className={input + ' sm:col-span-2'}>Save purchase record</button>
        </form>
      </details> : null}
      <p className="mt-4 text-xs text-white/45">Manual pilot evidence only. These records do not trigger rewards, record BaseDare revenue or prove that BaseDare caused a purchase.</p>
      {records.length ? <ul className="mt-3 space-y-3">{records.map((r) => <li className="border-t border-white/10 pt-3 text-xs text-white/65" key={r.id}>{r.metadataJson.outcome} · {r.status === 'MERCHANT_CONFIRMED' ? 'Merchant confirmed · manual' : 'Participant reported'}<br />{r.metadataJson.amountSpent} {r.metadataJson.stablecoin} · {r.metadataJson.phpReceived ? '₱' + r.metadataJson.phpReceived : 'PHP receipt unknown'} · {r.metadataJson.elapsedSeconds}s</li>)}</ul> : null}
      {message ? <p role="status" className="mt-3 text-sm text-cyan-100">{message}</p> : null}
    </> : null}
  </section>;
}
