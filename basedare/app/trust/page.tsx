import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowRight,
  BadgeCheck,
  CircleDollarSign,
  Clock3,
  FileCheck2,
  Fingerprint,
  MapPin,
  RefreshCcw,
  ShieldCheck,
  Sparkles,
  WalletCards,
} from 'lucide-react';

import GradualBlurOverlay from '@/components/GradualBlurOverlay';
import LiquidBackground from '@/components/LiquidBackground';
import {
  controlHairline,
  controlInset,
  controlMicroLabel,
  controlPanel,
  controlSoftCard,
} from '@/components/control/tokens';

export const metadata: Metadata = {
  title: 'Trust & Safety | BaseDare',
  description:
    'How BaseDare reserves paid rewards, checks real-world evidence, handles review and appeals, and creates durable place updates.',
  alternates: { canonical: '/trust' },
};

const PAID_FLOW = [
  {
    title: 'Brief locked',
    body: 'The task, place, reward and evidence rule are visible before a contributor accepts.',
    icon: FileCheck2,
  },
  {
    title: 'Reward reserved',
    body: 'A live paid Dare reserves its reward before the work begins. Free plans never pretend to have a payout.',
    icon: WalletCards,
  },
  {
    title: 'Evidence checked',
    body: 'Location, time, media and prior trust can support a submission. Uncertainty goes to review.',
    icon: ShieldCheck,
  },
  {
    title: 'Outcome recorded',
    body: 'Approved work moves toward payout and becomes a durable receipt or place update.',
    icon: BadgeCheck,
  },
] as const;

const EVIDENCE_LAYERS = [
  {
    title: 'Who submitted it',
    body: 'A wallet signature binds the action to an account. A public creator tag is useful, but it is not required for first value.',
    icon: Fingerprint,
    accent: 'border-violet-200/20 bg-violet-300/[0.08] text-violet-100',
  },
  {
    title: 'Place and time',
    body: 'Device location, check-ins and venue handshakes support presence. They are evidence signals—not perfect truth on their own.',
    icon: MapPin,
    accent: 'border-cyan-200/20 bg-cyan-300/[0.08] text-cyan-100',
  },
  {
    title: 'Media and freshness',
    body: 'Server-pinned photos or clips, timestamps and duplicate checks help connect a fresh submission to the brief.',
    icon: Sparkles,
    accent: 'border-fuchsia-200/20 bg-fuchsia-300/[0.08] text-fuchsia-100',
  },
  {
    title: 'Review and appeal',
    body: 'Clear evidence can proceed. Missing or uncertain signals pause for review; rejected work keeps an appeal path.',
    icon: RefreshCcw,
    accent: 'border-yellow-200/20 bg-yellow-300/[0.08] text-yellow-100',
  },
] as const;

const MONEY_STATES = [
  {
    label: 'Reward reserved',
    body: 'Funding is attached to this paid Dare.',
    icon: CircleDollarSign,
    tone: 'text-yellow-200',
  },
  {
    label: 'In review',
    body: 'Evidence needs a decision. No payout yet.',
    icon: ShieldCheck,
    tone: 'text-violet-200',
  },
  {
    label: 'Payout queued',
    body: 'Work is approved and settlement is processing.',
    icon: WalletCards,
    tone: 'text-emerald-200',
  },
  {
    label: 'Refund path',
    body: 'Unclaimed or expired paid Dares remain trackable for refund.',
    icon: Clock3,
    tone: 'text-cyan-100',
  },
] as const;

const BOUNDARIES = [
  'GPS or a QR scan alone proves the whole outcome.',
  'An RSVP proves someone attended.',
  'Every activity on BaseDare is paid or onchain.',
  'A listed venue is a partner unless the page says so.',
  'Approved work guarantees commercial results for a buyer.',
] as const;

export default function TrustPage() {
  return (
    <main className="relative min-h-screen overflow-hidden px-4 pb-24 pt-8 text-white sm:px-6 md:pt-12">
      <LiquidBackground />
      <div className="pointer-events-none fixed inset-0 z-10 hidden md:block">
        <GradualBlurOverlay />
      </div>
      <div className="pointer-events-none absolute inset-0 z-[1] bg-[radial-gradient(circle_at_14%_6%,rgba(34,211,238,0.11),transparent_30%),radial-gradient(circle_at_84%_16%,rgba(168,85,247,0.15),transparent_34%)]" />

      <div className="relative z-20 mx-auto max-w-6xl">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/how-it-works"
            className="inline-flex min-h-10 items-center gap-2 rounded-full border border-white/12 bg-white/[0.045] px-4 text-[10px] font-black uppercase tracking-[0.15em] text-white/58 transition hover:border-white/22 hover:text-white"
          >
            How it works
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href="/terms"
              className="inline-flex min-h-10 items-center rounded-full border border-white/10 bg-white/[0.035] px-4 text-[10px] font-black uppercase tracking-[0.15em] text-white/48 transition hover:border-white/20 hover:text-white"
            >
              Terms
            </Link>
            <Link
              href="/privacy"
              className="inline-flex min-h-10 items-center rounded-full border border-white/10 bg-white/[0.035] px-4 text-[10px] font-black uppercase tracking-[0.15em] text-white/48 transition hover:border-white/20 hover:text-white"
            >
              Privacy
            </Link>
          </div>
        </div>

        <section className={`${controlPanel} px-6 py-10 text-center sm:px-10 md:py-14`}>
          <div className={controlHairline} />
          <p className={controlMicroLabel}>Trust &amp; safety</p>
          <h1 className="mx-auto mt-4 max-w-4xl text-4xl font-black leading-[0.96] sm:text-6xl md:text-7xl">
            Evidence before payout.<br />
            <span className="text-yellow-300">Receipts after.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base font-semibold leading-7 text-white/58 md:text-lg">
            Paid Dares lock the brief, reward and evidence rule before anyone accepts. BaseDare checks the submission, routes uncertainty to review, and records accepted work as useful place memory.
          </p>
          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href="/earn?source=trust"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-yellow-300 px-6 text-[11px] font-black uppercase tracking-[0.15em] text-black transition hover:bg-yellow-200"
            >
              Find paid missions <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link
              href="/create?sparkType=paid&source=trust"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-cyan-200/18 bg-cyan-300/[0.07] px-6 text-[11px] font-black uppercase tracking-[0.15em] text-cyan-100 transition hover:border-cyan-100/30 hover:bg-cyan-300/[0.1]"
            >
              Fund a Dare
            </Link>
          </div>
        </section>

        <section className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="Paid Dare trust flow">
          {PAID_FLOW.map((step, index) => (
            <article key={step.title} className={`${controlSoftCard} p-5`}>
              <div className={controlHairline} />
              <div className="flex items-center justify-between gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-2xl border border-yellow-200/18 bg-yellow-300/[0.07] text-yellow-100">
                  <step.icon className="h-4.5 w-4.5" aria-hidden="true" />
                </span>
                <span className="text-xs font-black text-white/22">0{index + 1}</span>
              </div>
              <h2 className="mt-4 text-lg font-black text-white">{step.title}</h2>
              <p className="mt-2 text-sm font-semibold leading-6 text-white/46">{step.body}</p>
            </article>
          ))}
        </section>

        <section className={`${controlPanel} mt-5 p-6 sm:p-8`} aria-labelledby="evidence-title">
          <div className={controlHairline} />
          <p className={controlMicroLabel}>Layered evidence</p>
          <div className="mt-3 grid gap-5 lg:grid-cols-[0.72fr_1.28fr] lg:items-end">
            <div>
              <h2 id="evidence-title" className="text-2xl font-black text-white sm:text-3xl">
                No single signal proves everything.
              </h2>
              <p className="mt-3 max-w-xl text-sm leading-6 text-white/46">
                BaseDare combines the signals the mission actually needs. Exact contributor location stays private; public receipts show the result, not a precise GPS trail.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {EVIDENCE_LAYERS.map((layer) => (
                <article key={layer.title} className={`${controlInset} flex gap-3 p-4`}>
                  <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl border ${layer.accent}`}>
                    <layer.icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <div>
                    <h3 className="text-sm font-black text-white/86">{layer.title}</h3>
                    <p className="mt-1 text-xs leading-5 text-white/42">{layer.body}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-5 grid gap-5 lg:grid-cols-[1.08fr_0.92fr]">
          <div className={`${controlPanel} p-6 sm:p-8`}>
            <div className={controlHairline} />
            <p className={controlMicroLabel}>Readable money states</p>
            <h2 className="mt-3 text-2xl font-black text-white sm:text-3xl">You should always know what happens next.</h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {MONEY_STATES.map((state) => (
                <div key={state.label} className={`${controlInset} flex gap-3 p-4`}>
                  <state.icon className={`mt-0.5 h-4 w-4 shrink-0 ${state.tone}`} aria-hidden="true" />
                  <div>
                    <h3 className="text-sm font-black text-white/84">{state.label}</h3>
                    <p className="mt-1 text-xs leading-5 text-white/42">{state.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className={`${controlSoftCard} p-6 sm:p-8`}>
            <div className={controlHairline} />
            <p className={controlMicroLabel}>Honest boundaries</p>
            <h2 className="mt-3 text-2xl font-black text-white sm:text-3xl">BaseDare does not claim that…</h2>
            <ul className="mt-5 space-y-3">
              {BOUNDARIES.map((boundary) => (
                <li key={boundary} className="flex gap-3 text-sm leading-6 text-white/52">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-fuchsia-300/80" />
                  {boundary}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="mt-5 flex flex-col items-start gap-5 rounded-[1.6rem] border border-cyan-200/16 bg-cyan-300/[0.055] p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="flex gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-cyan-100" aria-hidden="true" />
            <div>
              <h2 className="text-sm font-black text-white">Free plans stay light. Paid work earns stronger checks.</h2>
              <p className="mt-1 max-w-2xl text-xs leading-5 text-white/43">
                BaseDare asks for more trust only when money, safety or a durable receipt depends on it.
              </p>
            </div>
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <Link
              href="/map?source=trust"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-white/12 bg-white/[0.045] px-5 text-[10px] font-black uppercase tracking-[0.14em] text-white/64 transition hover:border-white/22 hover:text-white"
            >
              Explore the map
            </Link>
            <Link
              href="/faq"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-cyan-200/20 bg-cyan-300/[0.08] px-5 text-[10px] font-black uppercase tracking-[0.14em] text-cyan-100 transition hover:border-cyan-100/32"
            >
              Read the FAQ <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
