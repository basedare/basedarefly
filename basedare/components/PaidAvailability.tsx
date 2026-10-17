'use client';
import Link from 'next/link';
import { usePaymentReadiness } from '@/hooks/usePaymentReadiness';
export default function PaidAvailability() {
  const { state, refresh } = usePaymentReadiness();
  if (state === 'ready') return <p className="mt-4 text-xs leading-5 text-emerald-100">Payment setup checked. Each paid dare still needs a funded brief and approved evidence.</p>;
  return <div className="bd-well my-5 p-4 text-sm leading-6 text-amber-100" role="status">
    <p className="font-bold">{state === 'checking' ? 'Checking paid-dare availability…' : 'Paid dares are temporarily unavailable.'}</p>
    <p className="mt-1 text-white/70">Explore free adventures or prepare a draft. Funding stays locked until the payment setup passes its checks.</p>
    <div className="mt-3 flex flex-wrap gap-4"><Link className="inline-flex min-h-11 items-center font-bold text-cyan-100" href="/adventures">Find a free adventure →</Link>{state === 'unavailable' ? <button type="button" className="min-h-11 underline" onClick={refresh}>Check again</button> : null}</div>
  </div>;
}
