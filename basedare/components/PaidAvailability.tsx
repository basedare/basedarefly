'use client';
import Link from '@/components/DiscoveryLink';
import { usePaymentReadiness } from '@/hooks/usePaymentReadiness';
export default function PaidAvailability() {
  const { state, refresh } = usePaymentReadiness();
  if (state === 'ready') return <p className="mt-4 text-xs leading-5 text-emerald-100">Payment setup checked. Fund the dare first; the reward is paid after approved proof.</p>;
  return <div className="bd-well my-5 p-4 text-sm leading-6 text-amber-100" role="status">
    <p className="font-bold">{state === 'checking' ? 'Checking dare funding…' : 'Paid dare funding is temporarily unavailable.'}</p>
    <p className="mt-1 text-white/70">You can prepare your dare now. Funding stays locked until the payment setup passes its checks. No payment has been requested.</p>
    <div className="mt-3 flex flex-wrap gap-4"><Link className="inline-flex min-h-11 items-center font-bold text-cyan-100" href="/adventures">Find a free adventure →</Link>{state === 'unavailable' ? <button type="button" className="min-h-11 underline" onClick={refresh}>Check again</button> : null}</div>
  </div>;
}
