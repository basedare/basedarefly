import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, MapPinned, ShieldCheck, Sparkles, UsersRound } from 'lucide-react';

import GradualBlurOverlay from '@/components/GradualBlurOverlay';
import LiquidBackground from '@/components/LiquidBackground';
import CreatorCaptainApplicationForm from './CreatorCaptainApplicationForm';

export const metadata: Metadata = {
  title: 'BaseDare Local Partners — Support Real-World Missions',
  description:
    'Apply as an optional BaseDare local partner for routes, gatherings, place handshakes, and other authorized on-the-ground support.',
  alternates: {
    canonical: '/hosts',
  },
};

const partnerSteps = [
  {
    icon: MapPinned,
    title: 'Know the ground',
    copy: 'Help with access details, place corrections, warm introductions, and the local context a remote mission cannot see.',
  },
  {
    icon: ShieldCheck,
    title: 'Strengthen the proof',
    copy: 'Support an authorized QR, merchant handshake, route check, or other higher-confidence proof when a mission needs it.',
  },
  {
    icon: UsersRound,
    title: 'Support optional formats',
    copy: 'Help a small route or gathering run safely when you have the local permission and practical ability to do it.',
  },
];

type LocalPartnersPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function firstParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] || '';
  return value || '';
}

export default async function LocalPartnersPage({ searchParams }: LocalPartnersPageProps) {
  const params = (await searchParams) || {};
  const scoutCode = firstParam(params.scout);
  const referredHandle = firstParam(params.creator || params.handle || params.streamer);
  const source = firstParam(params.source) || (scoutCode ? 'scout-referral' : 'local-partner-page');

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#05050b] text-white">
      <LiquidBackground />
      <div className="pointer-events-none fixed inset-0 z-10">
        <GradualBlurOverlay />
      </div>

      <div className="relative z-20 mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-24 sm:px-6 lg:py-28">
        <div>
          <Link
            href="/map"
            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.07)_0%,rgba(8,10,18,0.88)_100%)] px-4 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-white/72 shadow-[0_14px_28px_rgba(0,0,0,0.26),inset_0_1px_0_rgba(255,255,255,0.1),inset_0_-10px_16px_rgba(0,0,0,0.24)] transition hover:-translate-y-[1px] hover:border-cyan-300/28 hover:text-cyan-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/70"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Find paid missions
          </Link>
        </div>

        <section className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
          <div className="relative overflow-hidden rounded-[30px] border border-white/[0.09] bg-[linear-gradient(180deg,rgba(255,255,255,0.075)_0%,rgba(255,255,255,0.025)_18%,rgba(9,8,18,0.92)_62%,rgba(5,5,12,0.98)_100%)] p-5 shadow-[0_28px_90px_rgba(0,0,0,0.42),inset_0_1px_0_rgba(255,255,255,0.1)] sm:p-8">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(34,211,238,0.16),transparent_32%),radial-gradient(circle_at_85%_22%,rgba(245,197,24,0.14),transparent_34%),radial-gradient(circle_at_58%_100%,rgba(168,85,247,0.16),transparent_38%)]" />
            <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/28 to-transparent" />

            <div className="relative">
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/25 bg-cyan-300/[0.08] px-4 py-2 text-[11px] font-black uppercase tracking-[0.22em] text-cyan-100">
                <Sparkles className="h-4 w-4" />
                Optional local operator network
              </div>

              <h1 className="mt-6 text-4xl font-black tracking-tight text-white sm:text-6xl">
                Become a BaseDare local partner
              </h1>
              <p className="mt-5 max-w-xl text-base font-semibold leading-7 text-white/68">
                Help with the on-the-ground details that make selected routes, gatherings, and higher-proof missions work.
                This is an occasional operator role, not the way ordinary contributors enter BaseDare.
              </p>

              <div className="mt-5 rounded-[22px] border border-emerald-300/18 bg-emerald-300/[0.07] p-4 text-sm font-semibold leading-6 text-emerald-50/80">
                You do not need to apply here to complete normal missions. Open the map, choose a live paid mission, submit
                proof, and build reputation through completed work.
              </div>

              <div className="mt-7 grid gap-3">
                {partnerSteps.map((step) => (
                  <div
                    key={step.title}
                    className="rounded-[22px] border border-white/[0.08] bg-black/24 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.07)]"
                  >
                    <div className="flex gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-yellow-300/20 bg-yellow-300/[0.08] text-yellow-200">
                        <step.icon className="h-5 w-5" />
                      </div>
                      <div>
                        <h2 className="text-sm font-black uppercase tracking-[0.16em] text-white">{step.title}</h2>
                        <p className="mt-1 text-sm leading-6 text-white/60">{step.copy}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <p className="mt-6 text-xs font-semibold leading-5 text-white/48">
                Only offer work you are legally authorized and practically equipped to perform. BaseDare does not ask
                partners to conceal employment, ownership, permits, or local operations.
              </p>

              <div className="mt-7 flex flex-wrap gap-3">
                <Link
                  href="/map"
                  className="inline-flex min-h-11 items-center gap-2 rounded-full border border-yellow-300/24 bg-yellow-300/[0.09] px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-yellow-100 transition hover:border-yellow-300/42 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-200/70"
                >
                  Find paid missions
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
                <Link
                  href="/how-it-works"
                  className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-white/72 transition hover:border-cyan-300/30 hover:text-cyan-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/70"
                >
                  How BaseDare works
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          </div>

          <CreatorCaptainApplicationForm
            initialScoutCode={scoutCode}
            initialCreatorHandle={referredHandle}
            initialSource={source}
          />
        </section>
      </div>
    </main>
  );
}
