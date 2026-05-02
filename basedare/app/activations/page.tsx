import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, BadgeDollarSign, BarChart3, CheckCircle2, MapPin, ShieldCheck, Sparkles, Users } from 'lucide-react';

import ActivationIntakeForm from './ActivationIntakeForm';
import SparkAuditGenerator from './SparkAuditGenerator';
import SquircleLink from '@/components/ui/SquircleLink';

export const metadata: Metadata = {
  title: 'Grid Activation OS | BaseDare',
  description:
    'Connect venues, creators, fans, and brands with Brand Memory, venue-aware dares, proof verification, QR check-ins, payout rails, and ROI analytics.',
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
    name: 'Venue Spark Pilot',
    price: '$749+',
    bestFor: 'First venue proof',
    detail: 'One real venue, Brand Memory brief, venue-aware creator missions, QR/check-in tracking, proof media, and a simple result receipt.',
    includes: ['global venue target', 'Brand Memory brief', '3-5 creator missions', 'Spark receipt'],
  },
  {
    id: 'local-signal',
    name: 'Always-On Spark',
    price: '$1.5k-$5k/mo',
    bestFor: 'Recurring venue spend',
    detail: 'Ongoing creator missions, Brand Memory refinement, map visibility, monthly proof receipts, and repeat recommendations.',
    includes: ['priority venue visibility', 'creator routing', 'Brand Memory refinement', 'repeat playbook'],
    featured: true,
  },
  {
    id: 'city-takeover',
    name: 'Global Challenge Drop',
    price: '$5k+',
    bestFor: 'Brands, fans, events',
    detail: 'A bigger funded challenge across one venue, creator, island, district, event, or online community.',
    includes: ['custom challenge design', 'brand story layer', 'creator shortlist', 'campaign report'],
  },
];

const proofLoop = [
  {
    title: 'Fund the signal',
    detail: 'A venue, brand, sponsor, or fan funds creator payouts plus the BaseDare activation fee.',
  },
  {
    title: 'Move real people',
    detail: 'Creators get routed toward a place, brief, product moment, or fan-funded mission.',
  },
  {
    title: 'Verify the action',
    detail: 'Proof, QR/check-in signal, location context, moderation, and payout state live in the same loop.',
  },
  {
    title: 'Show the receipt',
    detail: 'The buyer gets a Spark Receipt: creators, proofs, check-ins, spend, content, and next move.',
  },
];

const buyerMetrics = [
  { label: 'Global surface', value: 'Any city' },
  { label: 'Best paid wedge', value: 'Venues' },
  { label: 'Other buyers', value: 'Fans + brands' },
  { label: 'Output', value: 'Proof receipt' },
];

const sparkReceipt = [
  ['Brand Memory', 'The buyer defines story, audience, rituals, forbidden vibes, and the feeling the activation should create.'],
  ['Creator output', 'Venue-aware dare prompts become approved proof clips, photos, and captions the venue can repost.'],
  ['Presence signal', 'QR scans, check-ins, proof timestamps, and venue memory activity.'],
  ['Map visibility', 'The venue lights up as an active place instead of a passive pin.'],
  ['Repeat decision', 'A clear next move: repeat, route creator, increase reward, or sponsor a bigger drop.'],
];

type ActivationsPageProps = {
  searchParams: Promise<{
    creator?: string;
    streamer?: string;
    venue?: string;
    venueName?: string;
    venueId?: string;
    venueSlug?: string;
    city?: string;
    source?: string;
    budgetRange?: string;
    packageId?: string;
    goal?: string;
    buyerType?: string;
    auditBrief?: string;
  }>;
};

export default async function ActivationsPage({ searchParams }: ActivationsPageProps) {
  const resolvedSearchParams = await searchParams;
  const routedCreator = resolvedSearchParams.creator || resolvedSearchParams.streamer || null;
  const routedVenue = resolvedSearchParams.venueName || resolvedSearchParams.venue || null;
  const routedVenueId = resolvedSearchParams.venueId || null;
  const routedVenueSlug = resolvedSearchParams.venueSlug || null;
  const routedCity = resolvedSearchParams.city || null;
  const routedSource = resolvedSearchParams.source || null;

  return (
    <main className="fixed inset-0 z-[100] overflow-y-auto bg-[#030305] px-4 py-10 grayscale saturate-0 contrast-125 sm:px-6 lg:py-12">
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.12)_1px,transparent_0)] [background-size:112px_112px]" />
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(circle_at_20%_0%,rgba(255,255,255,0.08),transparent_32%),radial-gradient(circle_at_82%_12%,rgba(255,255,255,0.06),transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.04)_0%,rgba(0,0,0,0)_26%,rgba(0,0,0,0.82)_100%)]" />
      <div className="pointer-events-none fixed inset-x-0 top-0 z-0 h-44 border-b border-white/[0.06] bg-black/70 md:bg-black/55 md:backdrop-blur-2xl" />

      <div className="relative z-20 mx-auto max-w-7xl">
        <div className="mb-5 flex items-center justify-between gap-3">
          <Link
            href="/?mode=control"
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.045] px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-white/64 transition hover:bg-white/[0.08] hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Control
          </Link>
          <Link
            href="/brands/portal"
            className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/[0.035] px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-white/52 transition hover:text-white sm:inline-flex"
          >
            Brand Portal
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <section className={`${raisedPanelClass} px-5 py-7 sm:px-8 lg:px-10 lg:py-10`}>
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.08),transparent_32%,rgba(0,0,0,0.22)_100%)]" />
          <div className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-white/35 to-transparent" />
          <div className="relative grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-yellow-200/20 bg-yellow-300/[0.08] px-4 py-2 text-[11px] font-black uppercase tracking-[0.24em] text-yellow-100">
                <BadgeDollarSign className="h-4 w-4" />
                Grid Activation OS
              </div>
              <h1 className="mt-5 max-w-4xl text-4xl font-black uppercase italic leading-[0.92] tracking-[-0.07em] text-white sm:text-6xl lg:text-7xl">
                Own the grid. Prove the movement.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-white/64 sm:text-lg">
                BaseDare connects venues, creators, fans, and brands through Brand Memory, smart dares,
                proof verification, payout rails, and analytics that show whether real-world action actually happened.
              </p>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <div className="w-full sm:w-[284px]">
                  <SquircleLink href="#activation-intake" tone="yellow" label="Launch Grid Activation" fullWidth height={44}>
                    <span className="flex items-center justify-center gap-2 text-[0.78rem] tracking-[0.08em] text-[#15120c]">
                      Launch Grid Activation
                      <ArrowRight className="h-4 w-4" />
                    </span>
                  </SquircleLink>
                </div>
                <Link
                  href="/brands/portal"
                  className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] px-6 text-sm font-black uppercase tracking-[0.18em] text-white/70 transition hover:bg-white/[0.08] hover:text-white"
                >
                  Open Brand Portal
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
                  Venue Spark Receipt
                </div>
                <p className="mt-3 text-sm leading-6 text-white/62">
                  This is the killer product for venues: their story turns into real creator missions, people come in,
                  proof gets captured, and the next marketing spend has a reason to exist.
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
              Venue ROI layer
            </div>
            <h2 className="mt-4 text-3xl font-black tracking-[-0.04em] text-white">The wedge is venues. The network stays open.</h2>
            <p className="mt-3 text-sm leading-6 text-white/58">
              We are not shrinking BaseDare into a local venue SaaS. The global challenge network stays open:
              fans can fund creators, brands can sponsor missions, and venues are the cleanest recurring buyer
              because they need proof their marketing moved real-world behavior.
            </p>
            <div className="mt-5 grid gap-3">
              {[
                ['Venues', 'Buy measurable creator visits, QR/check-in signal, owned UGC, and repeat traffic.'],
                ['Fans', 'Fund creator dares and make favorite creators move, film, compete, or prove something.'],
                ['Brands', 'Sponsor real-world creator output tied to a product, event, launch, or territory.'],
                ['Creators', 'Earn from approved proof and build a venue reputation graph that follows them globally.'],
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
              What venues actually receive
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {sparkReceipt.map(([label, detail], index) => (
                <div key={label} className={`${insetCardClass} px-4 py-4`}>
                  <div className="flex items-center gap-2">
                    <div className="grid h-8 w-8 place-items-center rounded-full border border-white/10 bg-white/[0.04] text-xs font-black text-white">
                      {index + 1}
                    </div>
                    <div className="text-sm font-black text-white">{label}</div>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-white/54">{detail}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {proofLoop.map((step, index) => (
            <div key={step.title} className={`${softCardClass} p-5`}>
              <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
              <div className="grid h-9 w-9 place-items-center rounded-full border border-yellow-200/16 bg-yellow-300/[0.08] text-xs font-black text-yellow-100">
                {index + 1}
              </div>
              <h3 className="mt-4 text-lg font-black text-white">{step.title}</h3>
              <p className="mt-2 text-sm leading-6 text-white/54">{step.detail}</p>
            </div>
          ))}
        </section>

        <SparkAuditGenerator />

        <section id="activation-intake" className="mt-8 grid gap-6 lg:grid-cols-[0.84fr_1.16fr]">
          <div className={`${raisedPanelClass} p-6`}>
            <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/24 to-transparent" />
            <div className="inline-flex items-center gap-2 rounded-full border border-yellow-200/18 bg-yellow-300/[0.08] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.22em] text-yellow-100/78">
              <Users className="h-4 w-4" />
              Pilot qualification
            </div>
            <h2 className="mt-4 text-3xl font-black tracking-[-0.04em] text-white">Tell us what should happen anywhere.</h2>
            <p className="mt-3 text-sm leading-6 text-white/60">
              The fastest paid path is a narrow pilot: one buyer, one venue or event, one Brand Memory, one proof target,
              one budget, and one repeat decision after the Spark Receipt. Siargao, Sydney, London, NYC: the
              model is the same.
            </p>
            <div className="mt-5 space-y-3">
              {[
                ['Budget', 'Creator payout pool plus BaseDare activation fee.'],
                ['Place', 'A venue, district, event, or launch moment.'],
                ['Brand Memory', 'Story, audience, rituals, vibe, and what creators should avoid.'],
                ['Proof target', 'What action or content should be verified.'],
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
            <ActivationIntakeForm
              routedCreator={routedCreator}
              routedVenue={routedVenue}
              routedVenueId={routedVenueId}
              routedVenueSlug={routedVenueSlug}
              routedCity={routedCity}
              routedSource={routedSource}
              routedBudgetRange={resolvedSearchParams.budgetRange || null}
              routedPackageId={resolvedSearchParams.packageId || null}
              routedGoal={resolvedSearchParams.goal || null}
              routedBuyerType={resolvedSearchParams.buyerType || null}
              routedAuditBrief={resolvedSearchParams.auditBrief || null}
            />
          </div>
        </section>
      </div>
    </main>
  );
}
