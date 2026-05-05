import { notFound } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowRight,
  BadgeDollarSign,
  CalendarClock,
  CheckCircle2,
  Clock3,
  CreditCard,
  ExternalLink,
  FileText,
  Lock,
  MapPin,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

import GradualBlurOverlay from '@/components/GradualBlurOverlay';
import LiquidBackground from '@/components/LiquidBackground';
import { getActivationCloseRoomByToken } from '@/lib/activation-close-room';
import CloseRoomTracker from './CloseRoomTracker';

const raisedPanelClass =
  'relative overflow-hidden rounded-[32px] border border-white/[0.09] bg-[linear-gradient(180deg,rgba(255,255,255,0.07)_0%,rgba(255,255,255,0.025)_14%,rgba(10,9,18,0.93)_58%,rgba(7,6,14,0.98)_100%)] shadow-[0_28px_90px_rgba(0,0,0,0.46),0_0_28px_rgba(168,85,247,0.08),inset_0_1px_0_rgba(255,255,255,0.1),inset_0_-18px_24px_rgba(0,0,0,0.24)]';
const softCardClass =
  'relative overflow-hidden rounded-[26px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(255,255,255,0.06)_0%,rgba(255,255,255,0.02)_12%,rgba(10,10,18,0.94)_100%)] shadow-[0_18px_30px_rgba(0,0,0,0.24),inset_0_1px_0_rgba(255,255,255,0.08),inset_0_-12px_18px_rgba(0,0,0,0.22)]';
const insetCardClass =
  'rounded-[22px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(4,5,10,0.72)_0%,rgba(11,11,18,0.92)_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.06),inset_0_-10px_16px_rgba(0,0,0,0.26)]';

function statusTone(status: string) {
  if (status === 'PAYMENT_SENT') return 'border-orange-300/25 bg-orange-300/10 text-orange-100';
  if (status === 'PAID_CONFIRMED' || status === 'LAUNCHED') return 'border-emerald-300/25 bg-emerald-300/10 text-emerald-100';
  if (status === 'READY_TO_INVOICE') return 'border-fuchsia-300/25 bg-fuchsia-300/10 text-fuchsia-100';
  if (status === 'NEEDS_INFO') return 'border-yellow-300/25 bg-yellow-300/10 text-yellow-100';
  return 'border-cyan-300/25 bg-cyan-300/10 text-cyan-100';
}

function paymentLabel(status: string) {
  if (status === 'PAID_CONFIRMED' || status === 'LAUNCHED') return 'Payment confirmed';
  if (status === 'PAYMENT_SENT') return 'Payment packet sent';
  if (status === 'READY_TO_INVOICE') return 'Ready for payment';
  return 'Route in review';
}

export default async function ActivationCloseRoomPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const closeRoom = await getActivationCloseRoomByToken(token);

  if (!closeRoom) {
    notFound();
  }

  const target = closeRoom.venue || closeRoom.company || 'your activation';
  const mission = closeRoom.missionIdeas[0];
  const paymentReady = Boolean(closeRoom.paymentLink);
  const steps = [
    {
      label: 'Route',
      detail: closeRoom.positioningLine || `${target} gets a venue-aware creator mission and a proof receipt.`,
      ready: true,
    },
    {
      label: 'Payment',
      detail: paymentLabel(closeRoom.status),
      ready: closeRoom.status === 'PAYMENT_SENT' || closeRoom.status === 'PAID_CONFIRMED' || closeRoom.status === 'LAUNCHED',
    },
    {
      label: 'Launch',
      detail: closeRoom.status === 'LAUNCHED' ? 'Activation launched' : 'Launch waits for payment and scope confirmation.',
      ready: closeRoom.status === 'LAUNCHED',
    },
  ];

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#030305] px-4 py-8 text-white sm:px-6 lg:px-10 lg:py-10">
      <CloseRoomTracker token={token} />
      <LiquidBackground />
      <GradualBlurOverlay />

      <section className="relative z-10 mx-auto flex max-w-6xl flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/activations"
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.045] px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-white/64 transition hover:bg-white/[0.08] hover:text-white"
          >
            <ArrowRight className="h-4 w-4 rotate-180" />
            Activations
          </Link>
          <span className={`rounded-full border px-4 py-2 text-xs font-black uppercase tracking-[0.18em] ${statusTone(closeRoom.status)}`}>
            {closeRoom.statusLabel}
          </span>
        </div>

        <section className={`${raisedPanelClass} p-5 sm:p-7 lg:p-8`}>
          <div className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-white/35 to-transparent" />
          <div className="relative grid gap-7 lg:grid-cols-[1.08fr_0.92fr] lg:items-start">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-yellow-200/20 bg-yellow-300/[0.08] px-4 py-2 text-[10px] font-black uppercase tracking-[0.24em] text-yellow-100/78">
                <Sparkles className="h-4 w-4" />
                BaseDare Close Room
              </div>
              <h1 className="mt-5 max-w-3xl text-4xl font-black uppercase italic leading-[0.94] tracking-[-0.06em] text-white sm:text-6xl">
                {target}
              </h1>
              <p className="mt-4 max-w-2xl text-sm font-bold leading-6 text-white/60 sm:text-base">
                One buyer-approved place for the Spark route, proof logic, payment reference, and launch gates.
                BaseDare does not launch public commitments until payment and scope are confirmed.
              </p>

              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                {[
                  { label: 'Package', value: closeRoom.packageLabel, icon: BadgeDollarSign },
                  { label: 'Budget', value: closeRoom.budgetLabel, icon: CreditCard },
                  { label: 'Timeline', value: closeRoom.timelineLabel, icon: CalendarClock },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.label} className={insetCardClass}>
                      <div className="flex items-center gap-2 px-4 pt-4 text-[10px] font-black uppercase tracking-[0.2em] text-white/40">
                        <Icon className="h-4 w-4 text-yellow-100/70" />
                        {item.label}
                      </div>
                      <p className="px-4 pb-4 pt-2 text-lg font-black text-white">{item.value}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className={`${softCardClass} p-5`}>
              <div className="inline-flex items-center gap-2 rounded-full border border-orange-200/18 bg-orange-300/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-orange-100">
                <CreditCard className="h-3.5 w-3.5" />
                Payment
              </div>
              <p className="mt-4 text-2xl font-black tracking-[-0.04em] text-white">
                {paymentLabel(closeRoom.status)}
              </p>
              <div className="mt-4 rounded-[1.3rem] border border-white/10 bg-black/34 p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/38">
                  Reference
                </p>
                <p className="mt-2 text-lg font-black text-white">{closeRoom.paymentReference}</p>
              </div>
              <p className="mt-4 text-xs font-bold leading-5 text-white/50">
                {closeRoom.paymentInstructions}
              </p>

              <div className="mt-5 grid gap-2">
                {paymentReady ? (
                  <a
                    href={closeRoom.paymentLink}
                    target="_blank"
                    rel="noreferrer"
                    data-close-room-track="payment"
                    data-close-room-target="payment-link"
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-yellow-300/30 bg-yellow-300 px-5 text-xs font-black uppercase tracking-[0.16em] text-black shadow-[0_7px_0_rgba(118,74,0,0.75)] transition hover:-translate-y-0.5"
                  >
                    Open payment
                    <ExternalLink className="h-4 w-4" />
                  </a>
                ) : (
                  <a
                    href={closeRoom.replyHref}
                    data-close-room-track="reply"
                    data-close-room-target="payment-path"
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-yellow-300/25 bg-yellow-300/12 px-5 text-xs font-black uppercase tracking-[0.16em] text-yellow-100 transition hover:bg-yellow-300/18"
                  >
                    Confirm payment path
                    <ArrowRight className="h-4 w-4" />
                  </a>
                )}
                <a
                  href={closeRoom.callHref}
                  data-close-room-track="reply"
                  data-close-room-target="call"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.055] px-5 text-xs font-black uppercase tracking-[0.16em] text-white/72 transition hover:bg-white/[0.09] hover:text-white"
                >
                  Book 12-min call
                  <Clock3 className="h-4 w-4" />
                </a>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          {steps.map((step) => (
            <div key={step.label} className={`${softCardClass} p-5`}>
              <div className="flex items-center gap-3">
                <div className={`grid h-10 w-10 place-items-center rounded-2xl border ${
                  step.ready ? 'border-emerald-300/22 bg-emerald-300/10 text-emerald-100' : 'border-white/10 bg-white/[0.04] text-white/45'
                }`}>
                  {step.ready ? <CheckCircle2 className="h-5 w-5" /> : <Lock className="h-5 w-5" />}
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/36">{step.label}</p>
                  <p className="mt-1 text-sm font-black leading-5 text-white/80">{step.detail}</p>
                </div>
              </div>
            </div>
          ))}
        </section>

        <section className="grid gap-5 lg:grid-cols-[1fr_0.92fr]">
          <div className={`${softCardClass} p-5 sm:p-6`}>
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-200/18 bg-cyan-300/[0.07] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.22em] text-cyan-100/70">
              <MapPin className="h-4 w-4" />
              Spark route
            </div>
            <h2 className="mt-4 text-2xl font-black tracking-[-0.04em] text-white">
              {closeRoom.positioningLine || `${target} gets one proof-backed creator activation.`}
            </h2>
            <div className="mt-5 grid gap-3">
              {(closeRoom.missionIdeas.length ? closeRoom.missionIdeas : [
                {
                  title: mission?.title || 'Signature proof mission',
                  detail: 'Creator captures the venue, action, story cue, and timestamp-worthy proof signal.',
                  proofMetric: closeRoom.proofLogic,
                },
              ]).slice(0, 4).map((missionIdea, index) => (
                <div key={`${missionIdea.title}-${index}`} className={insetCardClass}>
                  <div className="flex gap-3 px-4 py-4">
                    <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-white/10 bg-white/[0.04] text-xs font-black text-white">
                      {index + 1}
                    </div>
                    <div>
                      <p className="text-sm font-black text-white">{missionIdea.title}</p>
                      <p className="mt-1 text-sm font-bold leading-6 text-white/54">{missionIdea.detail}</p>
                      {missionIdea.proofMetric ? (
                        <p className="mt-2 text-[10px] font-black uppercase tracking-[0.16em] text-yellow-100/58">
                          Proof: {missionIdea.proofMetric}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className={`${softCardClass} p-5 sm:p-6`}>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200/18 bg-emerald-300/[0.07] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.22em] text-emerald-100/70">
              <ShieldCheck className="h-4 w-4" />
              Launch gates
            </div>
            <div className="mt-5 space-y-3">
              {[
                ['Scope', `${closeRoom.packageLabel} for ${target}${closeRoom.city ? ` in ${closeRoom.city}` : ''}.`],
                ['Proof', closeRoom.proofLogic || 'Creator proof must show the place, action, story cue, and timestamp-worthy signal.'],
                ['Repeat', closeRoom.repeatMetric || 'Repeat only if the Spark Receipt shows output worth compounding.'],
              ].map(([label, detail]) => (
                <div key={label} className={insetCardClass}>
                  <div className="flex gap-3 px-4 py-4">
                    <FileText className="mt-1 h-4 w-4 shrink-0 text-emerald-100/68" />
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/38">{label}</p>
                      <p className="mt-1 text-sm font-bold leading-6 text-white/58">{detail}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}
