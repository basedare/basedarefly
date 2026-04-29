import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, BadgeDollarSign, BarChart3, CheckCircle2, MapPin, ShieldCheck, Sparkles, Users } from 'lucide-react';

import ActivationIntakeForm from './ActivationIntakeForm';
import LiquidBackground from '@/components/LiquidBackground';
import GradualBlurOverlay from '@/components/GradualBlurOverlay';

export const metadata: Metadata = {
  title: 'Paid Creator Activations | BaseDare',
  description:
    'Launch verified creator activations for venues, brands, and events with bounty-funded proof, payout rails, and repeatable reporting.',
};

const raisedPanelClass =
  'relative overflow-hidden rounded-[32px] border border-white/[0.09] bg-[linear-gradient(180deg,rgba(255,255,255,0.07)_0%,rgba(255,255,255,0.025)_14%,rgba(10,9,18,0.93)_58%,rgba(7,6,14,0.98)_100%)] shadow-[0_28px_90px_rgba(0,0,0,0.46),0_0_28px_rgba(168,85,247,0.08),inset_0_1px_0_rgba(255,255,255,0.1),inset_0_-18px_24px_rgba(0,0,0,0.24)]';
const softCardClass =
  'relative overflow-hidden rounded-[26px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(255,255,255,0.06)_0%,rgba(255,255,255,0.02)_12%,rgba(10,10,18,0.94)_100%)] shadow-[0_18px_30px_rgba(0,0,0,0.24),inset_0_1px_0_rgba(255,255,255,0.08),inset_0_-12px_18px_rgba(0,0,0,0.22)]';
const insetCardClass =
  'rounded-[22px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(4,5,10,0.72)_0%,rgba(11,11,18,0.92)_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.06),inset_0_-10px_16px_rgba(0,0,0,0.26)]';

const packages = [
  {
    id: 'pilot-drop',
    name: 'Pilot Drop',
    price: '$500-$1.5k',
    bestFor: 'First paid test',
    detail: 'One venue or event, one clear creator brief, one proof loop, and a compact result readout.',
    includes: ['1 venue target', '1-2 creator attempts', 'verified proof', 'operator recap'],
  },
  {
    id: 'local-signal',
    name: 'Local Signal',
    price: '$1.5k-$5k',
    bestFor: 'Repeatable local activation',
    detail: 'A stronger activation sprint with creator routing, venue memory, proof clips, and next-campaign recommendation.',
    includes: ['3-6 creator attempts', 'venue signal tracking', 'proof and payout ops', 'repeat playbook'],
    featured: true,
  },
  {
    id: 'city-takeover',
    name: 'City Takeover',
    price: '$5k+',
    bestFor: 'Launches and event pushes',
    detail: 'Multi-creator or multi-venue activation design for bigger moments where the result needs to be visible.',
    includes: ['custom challenge design', 'district or event route', 'creator shortlist', 'campaign report'],
  },
];

const proofLoop = [
  {
    title: 'Fund the challenge',
    detail: 'A venue, brand, or sponsor funds creator payouts plus the BaseDare activation fee.',
  },
  {
    title: 'Route the creator',
    detail: 'BaseDare matches the brief to creator identity, venue fit, and proof history.',
  },
  {
    title: 'Verify the output',
    detail: 'Proof, location context, moderation, and payout state live in the same loop.',
  },
  {
    title: 'Sell the repeat',
    detail: 'The buyer gets a result receipt: creators, proofs, check-ins, spend, and next move.',
  },
];

const buyerMetrics = [
  { label: 'Creator payout pool', value: '$500+' },
  { label: 'BaseDare fee', value: '25-35%' },
  { label: 'Best wedge', value: 'Venues' },
  { label: 'Output', value: 'Verified content' },
];

export default function ActivationsPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-transparent px-4 py-24 sm:px-6 lg:py-28">
      <LiquidBackground veilOpacity={0.66} />
      <div className="fixed inset-0 z-10 hidden pointer-events-none md:block">
        <GradualBlurOverlay />
      </div>
      <div className="pointer-events-none absolute inset-0 z-[1] bg-[radial-gradient(circle_at_16%_4%,rgba(250,204,21,0.16),transparent_30%),radial-gradient(circle_at_88%_14%,rgba(34,211,238,0.13),transparent_28%),radial-gradient(circle_at_50%_100%,rgba(168,85,247,0.16),transparent_38%)]" />

      <div className="relative z-20 mx-auto max-w-7xl">
        <section className={`${raisedPanelClass} px-5 py-7 sm:px-8 lg:px-10 lg:py-10`}>
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.08),transparent_32%,rgba(0,0,0,0.22)_100%)]" />
          <div className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-white/35 to-transparent" />
          <div className="relative grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-yellow-200/20 bg-yellow-300/[0.08] px-4 py-2 text-[11px] font-black uppercase tracking-[0.24em] text-yellow-100">
                <BadgeDollarSign className="h-4 w-4" />
                Revenue mode
              </div>
              <h1 className="mt-5 max-w-4xl text-4xl font-black uppercase italic leading-[0.92] tracking-[-0.07em] text-white sm:text-6xl lg:text-7xl">
                Paid creator activations with proof attached.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-white/64 sm:text-lg">
                BaseDare turns a marketing budget into verified creator dares: people show up, create proof,
                get paid, and the buyer gets a repeatable result receipt instead of a vague influencer post.
              </p>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <a
                  href="#activation-intake"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-yellow-200/30 bg-[linear-gradient(180deg,rgba(250,204,21,0.95)_0%,rgba(202,138,4,0.96)_100%)] px-6 text-sm font-black uppercase tracking-[0.18em] text-black shadow-[0_16px_34px_rgba(0,0,0,0.34),inset_0_1px_0_rgba(255,255,255,0.38)] transition hover:-translate-y-0.5"
                >
                  Start paid activation
                  <ArrowRight className="h-4 w-4" />
                </a>
                <Link
                  href="/brands/portal"
                  className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] px-6 text-sm font-black uppercase tracking-[0.18em] text-white/70 transition hover:bg-white/[0.08] hover:text-white"
                >
                  Open brand portal
                </Link>
              </div>
            </div>

            <div className={`${softCardClass} p-5`}>
              <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/24 to-transparent" />
              <div className="grid gap-3 sm:grid-cols-2">
                {buyerMetrics.map((metric) => (
                  <div key={metric.label} className={`${insetCardClass} px-4 py-4`}>
                    <div className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">{metric.label}</div>
                    <div className="mt-2 text-2xl font-black text-white">{metric.value}</div>
                  </div>
                ))}
              </div>
              <div className={`${insetCardClass} mt-4 px-4 py-4`}>
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.22em] text-cyan-100/70">
                  <ShieldCheck className="h-4 w-4" />
                  Buyer receipt
                </div>
                <p className="mt-3 text-sm leading-6 text-white/62">
                  Every paid activation should end with the same core receipt: spend, creator output,
                  verified proof, venue or audience signal, payout state, and the next activation recommendation.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-8 grid gap-4 lg:grid-cols-3">
          {packages.map((activationPackage) => (
            <div
              key={activationPackage.id}
              className={`${softCardClass} p-5 ${activationPackage.featured ? 'border-yellow-200/20 shadow-[0_24px_54px_rgba(0,0,0,0.34),0_0_34px_rgba(250,204,21,0.09),inset_0_1px_0_rgba(255,255,255,0.1)]' : ''}`}
            >
              <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/22 to-transparent" />
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-[0.22em] text-white/40">{activationPackage.bestFor}</div>
                  <h2 className="mt-2 text-2xl font-black text-white">{activationPackage.name}</h2>
                </div>
                <div className="rounded-full border border-yellow-200/20 bg-yellow-300/[0.08] px-3 py-1 text-xs font-black text-yellow-100">
                  {activationPackage.price}
                </div>
              </div>
              <p className="mt-4 min-h-[72px] text-sm leading-6 text-white/58">{activationPackage.detail}</p>
              <div className="mt-5 space-y-2">
                {activationPackage.includes.map((item) => (
                  <div key={item} className="flex items-center gap-2 text-sm font-bold text-white/66">
                    <CheckCircle2 className="h-4 w-4 text-emerald-200" />
                    {item}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className={`${softCardClass} p-6`}>
            <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/24 to-transparent" />
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-200/18 bg-cyan-300/[0.07] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.22em] text-cyan-100/70">
              <BarChart3 className="h-4 w-4" />
              Monetization loop
            </div>
            <h2 className="mt-4 text-3xl font-black tracking-[-0.04em] text-white">What we sell.</h2>
            <p className="mt-3 text-sm leading-6 text-white/58">
              Not impressions. Not generic creator access. BaseDare sells a funded challenge loop where
              buyer spend becomes verified action, proof media, and a reason to run the next activation.
            </p>
            <div className="mt-5 grid gap-3">
              {[
                ['Venues', 'Measurable foot traffic, creator visits, repeat night energy.'],
                ['Brands', 'Competitive creator output tied to a product, event, or launch.'],
                ['Agencies', 'A proof-and-payout rail for local creator campaigns.'],
              ].map(([label, detail]) => (
                <div key={label} className={`${insetCardClass} px-4 py-4`}>
                  <div className="text-sm font-black text-white">{label}</div>
                  <div className="mt-1 text-sm leading-6 text-white/54">{detail}</div>
                </div>
              ))}
            </div>
          </div>

          <div className={`${softCardClass} p-6`}>
            <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/24 to-transparent" />
            <div className="inline-flex items-center gap-2 rounded-full border border-purple-200/18 bg-purple-300/[0.07] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.22em] text-purple-100/70">
              <Sparkles className="h-4 w-4" />
              Activation proof loop
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {proofLoop.map((step, index) => (
                <div key={step.title} className={`${insetCardClass} px-4 py-4`}>
                  <div className="flex items-center gap-2">
                    <div className="grid h-8 w-8 place-items-center rounded-full border border-white/10 bg-white/[0.04] text-xs font-black text-white">
                      {index + 1}
                    </div>
                    <div className="text-sm font-black text-white">{step.title}</div>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-white/54">{step.detail}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="activation-intake" className="mt-8 grid gap-6 lg:grid-cols-[0.84fr_1.16fr]">
          <div className={`${raisedPanelClass} p-6`}>
            <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/24 to-transparent" />
            <div className="inline-flex items-center gap-2 rounded-full border border-yellow-200/18 bg-yellow-300/[0.08] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.22em] text-yellow-100/78">
              <Users className="h-4 w-4" />
              Buyer qualification
            </div>
            <h2 className="mt-4 text-3xl font-black tracking-[-0.04em] text-white">Tell us what should happen.</h2>
            <p className="mt-3 text-sm leading-6 text-white/60">
              The fastest paid path is a narrow pilot: one buyer, one venue or event, one proof target,
              one budget, and one repeat decision after the receipt.
            </p>
            <div className="mt-5 space-y-3">
              {[
                ['Budget', 'Creator payout pool plus BaseDare activation fee.'],
                ['Place', 'A venue, district, event, or launch moment.'],
                ['Proof target', 'What action or content should be verified.'],
                ['Repeat trigger', 'The metric that makes the buyer fund the next one.'],
              ].map(([label, detail]) => (
                <div key={label} className="flex gap-3">
                  <MapPin className="mt-1 h-4 w-4 shrink-0 text-yellow-200" />
                  <div>
                    <div className="text-sm font-black text-white">{label}</div>
                    <div className="text-sm leading-6 text-white/50">{detail}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className={`${raisedPanelClass} p-5 sm:p-6`}>
            <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/24 to-transparent" />
            <ActivationIntakeForm />
          </div>
        </section>
      </div>
    </main>
  );
}
