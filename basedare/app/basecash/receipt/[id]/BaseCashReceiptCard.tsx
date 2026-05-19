'use client';

import Link from 'next/link';
import { QRCodeSVG } from 'qrcode.react';
import { ArrowLeft, CheckCircle2, Clock3, CreditCard, ShieldCheck } from 'lucide-react';

import type { BaseCashCreditDTO } from '@/lib/basecash';
import { formatPhp } from '@/lib/basecash-shared';

function statusTone(paymentStatus: string, redemptionStatus: string) {
  if (redemptionStatus === 'REDEEMED') return 'border-emerald-300/24 bg-emerald-500/[0.1] text-emerald-100';
  if (paymentStatus === 'PAID' && redemptionStatus === 'ACTIVE') return 'border-cyan-300/24 bg-cyan-500/[0.1] text-cyan-100';
  if (paymentStatus === 'PENDING') return 'border-amber-300/24 bg-amber-500/[0.1] text-amber-100';
  return 'border-white/12 bg-white/[0.05] text-white/62';
}

function statusLabel(paymentStatus: string, redemptionStatus: string) {
  if (redemptionStatus === 'REDEEMED') return 'Redeemed';
  if (paymentStatus === 'PAID' && redemptionStatus === 'ACTIVE') return 'Active credit';
  if (paymentStatus === 'PENDING') return 'Awaiting payment confirmation';
  return redemptionStatus.toLowerCase();
}

export default function BaseCashReceiptCard({
  credit,
  receiptUrl,
}: {
  credit: BaseCashCreditDTO;
  receiptUrl: string;
}) {
  const expiresAt = new Date(credit.expiresAt);
  const redeemedAt = credit.redeemedAt ? new Date(credit.redeemedAt) : null;

  return (
    <main className="relative mx-auto flex min-h-screen max-w-4xl flex-col justify-center px-4 py-8 sm:px-6">
      <Link
        href={`/venues/${encodeURIComponent(credit.venueSlug)}`}
        className="mb-4 inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-[11px] font-black uppercase tracking-[0.2em] text-white/62 transition hover:border-white/18 hover:bg-white/[0.08] hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        Venue
      </Link>
      <section className="relative overflow-hidden rounded-[34px] border border-white/[0.1] bg-[linear-gradient(180deg,rgba(255,255,255,0.08)_0%,rgba(255,255,255,0.025)_16%,rgba(8,8,15,0.96)_100%)] p-5 shadow-[0_32px_100px_rgba(0,0,0,0.44),inset_0_1px_0_rgba(255,255,255,0.1)] sm:p-8">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_0%,rgba(245,197,24,0.12),transparent_32%),radial-gradient(circle_at_92%_100%,rgba(34,211,238,0.12),transparent_34%)]" />
        <div className="relative grid gap-6 lg:grid-cols-[0.92fr_1fr] lg:items-center">
          <div className="rounded-[28px] border border-white/10 bg-white/[0.035] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
            <div className="rounded-[22px] bg-white p-4">
              <QRCodeSVG value={receiptUrl} size={280} className="h-auto w-full" />
            </div>
            <p className="mt-4 text-center text-2xl font-black tracking-[0.12em] text-white">{credit.receiptCode}</p>
          </div>

          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#f5c518]/24 bg-[#f5c518]/[0.09] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.22em] text-[#f8dd72]">
              <CreditCard className="h-4 w-4" />
              BaseCash Venue Credit
            </div>
            <h1 className="mt-4 text-4xl font-black tracking-[-0.06em] text-white sm:text-5xl">
              {formatPhp(credit.denominationPhp)} at {credit.venueName}.
            </h1>
            <div className={`mt-4 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-black uppercase tracking-[0.16em] ${statusTone(credit.paymentStatus, credit.redemptionStatus)}`}>
              {credit.redemptionStatus === 'REDEEMED' ? <CheckCircle2 className="h-4 w-4" /> : <Clock3 className="h-4 w-4" />}
              {statusLabel(credit.paymentStatus, credit.redemptionStatus)}
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-[20px] border border-white/10 bg-black/28 p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/38">Valid until</p>
                <p className="mt-1 text-sm font-bold text-white">{expiresAt.toLocaleString()}</p>
              </div>
              <div className="rounded-[20px] border border-white/10 bg-black/28 p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/38">Redeemed</p>
                <p className="mt-1 text-sm font-bold text-white">{redeemedAt ? redeemedAt.toLocaleString() : 'Not yet'}</p>
              </div>
            </div>

            <div className="mt-5 rounded-[22px] border border-cyan-300/18 bg-cyan-500/[0.07] p-4 text-sm leading-6 text-cyan-50/74">
              <div className="mb-1 flex items-center gap-2 font-black text-cyan-50">
                <ShieldCheck className="h-4 w-4" />
                Staff check
              </div>
              Show this QR or code to staff. This credit can be redeemed once, only at {credit.venueName}. No cash-out and no change.
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
