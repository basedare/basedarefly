import Link from 'next/link';

export const metadata = {
  title: 'Example Verified Field Sprint receipt | BaseDare',
  description: 'An illustrative BaseDare receipt showing four independent, proof-backed field checks.',
};

const checks = [
  { kind: 'YES', summary: 'The advertised service was available during the observed window.', evidence: 'HIGH', freshness: '2h' },
  { kind: 'NO', summary: 'A second contributor could not find the advertised service during an independent visit.', evidence: 'HIGH', freshness: '4h' },
  { kind: 'PARTIAL', summary: 'The service was available, but only under narrower conditions than the public listing suggested.', evidence: 'MEDIUM', freshness: '6h' },
  { kind: 'INCONCLUSIVE', summary: 'Presence was verified, but the observation window was not sufficient to answer confidently.', evidence: 'MEDIUM', freshness: '8h' },
] as const;

export default function ExampleFieldSprintReceiptPage() {
  return (
    <main className="min-h-screen bg-[#07070b] px-4 py-16 text-white sm:px-6">
      <div className="mx-auto max-w-5xl">
        <header className="rounded-3xl border border-[#ffe36a]/20 bg-gradient-to-br from-[#251d09]/70 to-[#101018] p-7">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#ffe36a]">Verified Field Sprint · Example receipt</p>
            <span className="rounded-full border border-amber-200/20 bg-amber-200/[0.08] px-3 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-amber-100">Illustrative · not a live result</span>
          </div>
          <h1 className="mt-4 text-3xl font-black sm:text-5xl">Is this place&apos;s public information accurate this week?</h1>
          <p className="mt-4 text-sm leading-6 text-white/50">Example buyer · compact venue area · four independent checks</p>
          <div className="mt-6 grid gap-3 sm:grid-cols-3"><Metric label="Managed service" value="$2,000" /><Metric label="Reward pool" value="$500" /><Metric label="Independent checks" value="4" /></div>
        </header>

        <section className="mt-6 grid gap-4 md:grid-cols-2">
          <Panel title="Observed answers"><div className="grid grid-cols-4 gap-2">{['YES', 'NO', 'PARTIAL', 'INCONCLUSIVE'].map((kind) => <Metric key={kind} label={kind} value="1" />)}</div><p className="mt-4 text-xs leading-5 text-white/40">The receipt preserves disagreement. It does not manufacture a positive answer for the buyer.</p></Panel>
          <Panel title="Evidence and delivery"><dl className="grid grid-cols-2 gap-3 text-sm"><Item label="High / medium / low" value="2 / 2 / 0" /><Item label="Contributor payouts" value="$480" /><Item label="Delivery window" value="7–10 days" /><Item label="Replacement attempts" value="1 disclosed" /></dl></Panel>
        </section>

        <section className="mt-6 grid gap-3 md:grid-cols-2">{checks.map((check, index) => <article key={check.kind} className="rounded-2xl border border-white/10 bg-white/[0.035] p-5">
          <div className="flex items-center justify-between gap-3"><p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#62efff]">Independent check {index + 1}</p><b>{check.kind}</b></div>
          <h2 className="mt-3 text-xl font-black">Example venue</h2>
          <p className="mt-3 text-sm leading-6 text-white/60">{check.summary}</p>
          <div className="mt-4 grid grid-cols-2 gap-2"><Metric label="Evidence" value={check.evidence} /><Metric label="Freshness" value={check.freshness} /></div>
        </article>)}</section>

        <section className="mt-6 grid gap-4 md:grid-cols-2">
          <Panel title="Rights boundary"><p className="text-xs leading-5 text-white/55">The receipt reports verified observations and privacy-safe evidence references. Sponsor commercial reuse of contributor media is not included without separate explicit consent.</p></Panel>
          <Panel title="What it does not claim"><p className="text-xs leading-5 text-white/55">No guaranteed traffic, purchase, conversion, publication, virality, or positive finding. Device location supports presence evidence; it is not proof of a purchase.</p></Panel>
        </section>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link href="/brands/portal" className="inline-flex min-h-12 flex-1 items-center justify-center rounded-2xl bg-[#f5c518] px-5 text-sm font-black uppercase tracking-[0.12em] text-[#15120c]">Scope a real Sprint</Link>
          <Link href="/how-it-works" className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-white/12 px-5 text-sm font-black text-white/70">How verification works</Link>
        </div>
      </div>
    </main>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) { return <section className="rounded-2xl border border-white/10 bg-white/[0.035] p-5"><h2 className="mb-4 text-lg font-black">{title}</h2>{children}</section>; }
function Metric({ label, value }: { label: string; value: string }) { return <div className="rounded-xl border border-white/8 bg-black/30 p-3"><b className="text-xl">{value}</b><p className="mt-1 text-[8px] font-black uppercase tracking-[0.12em] text-white/35">{label}</p></div>; }
function Item({ label, value }: { label: string; value: string }) { return <div><dt className="text-[9px] font-black uppercase tracking-[0.12em] text-white/35">{label}</dt><dd className="mt-1 font-bold">{value}</dd></div>; }
