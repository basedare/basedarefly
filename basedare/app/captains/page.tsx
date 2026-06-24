import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, BadgeDollarSign, MapPinned, RadioTower, Sparkles } from 'lucide-react';

import GradualBlurOverlay from '@/components/GradualBlurOverlay';
import LiquidBackground from '@/components/LiquidBackground';
import CreatorCaptainApplicationForm from './CreatorCaptainApplicationForm';

export const metadata: Metadata = {
  title: 'BaseDare Founding Hosts — Get Paid for Real-World Missions',
  description:
    'Apply to become a BaseDare Founding Host and get routed into paid IRL creator missions, venue activations, and proof-backed content drops.',
  alternates: {
    canonical: '/captains',
  },
};

const signalSteps = [
  {
    icon: MapPinned,
    title: 'Scout the room',
    copy: 'Name real venues, warm intros, access points, and small local details that make a mission possible.',
  },
  {
    icon: BadgeDollarSign,
    title: 'Help the night run',
    copy: 'Creators make content. Guests create crowd energy. Hosts make the offline setup easier.',
  },
  {
    icon: RadioTower,
    title: 'Close the proof loop',
    copy: 'QR setup, proof capture, local routing, and recaps turn a good place into the next activation.',
  },
];

type CreatorCaptainsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function firstParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] || '';
  return value || '';
}

export default async function CreatorCaptainsPage({ searchParams }: CreatorCaptainsPageProps) {
  const params = (await searchParams) || {};
  const scoutCode = firstParam(params.scout);
  const routedCreatorHandle = firstParam(params.creator || params.handle || params.streamer);
  const source = firstParam(params.source) || (scoutCode ? 'scout-referral' : '');

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#05050b] text-white">
      <LiquidBackground />
      <div className="fixed inset-0 z-10 pointer-events-none">
        <GradualBlurOverlay />
      </div>

      <div className="relative z-20 mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-24 sm:px-6 lg:py-28">
        <div>
          <Link
            href="/creators"
            className="inline-flex min-h-10 items-center gap-2 rounded-full border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.07)_0%,rgba(8,10,18,0.88)_100%)] px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-white/68 shadow-[0_14px_28px_rgba(0,0,0,0.26),inset_0_1px_0_rgba(255,255,255,0.1),inset_0_-10px_16px_rgba(0,0,0,0.24)] transition hover:-translate-y-[1px] hover:border-cyan-300/28 hover:text-cyan-100"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to creators
          </Link>
        </div>

        <section className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
          <div className="relative overflow-hidden rounded-[30px] border border-white/[0.09] bg-[linear-gradient(180deg,rgba(255,255,255,0.075)_0%,rgba(255,255,255,0.025)_18%,rgba(9,8,18,0.92)_62%,rgba(5,5,12,0.98)_100%)] p-5 shadow-[0_28px_90px_rgba(0,0,0,0.42),inset_0_1px_0_rgba(255,255,255,0.1)] sm:p-8">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(34,211,238,0.16),transparent_32%),radial-gradient(circle_at_85%_22%,rgba(245,197,24,0.14),transparent_34%),radial-gradient(circle_at_58%_100%,rgba(168,85,247,0.16),transparent_38%)]" />
            <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/28 to-transparent" />

            <div className="relative">
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/25 bg-cyan-300/[0.08] px-4 py-2 text-[11px] font-black uppercase tracking-[0.26em] text-cyan-100">
                <Sparkles className="h-4 w-4" />
                Founding creator rail
              </div>

              <h1 className="mt-6 text-4xl font-black tracking-tight text-white sm:text-6xl">
                Become a BaseDare Host
              </h1>
              <p className="mt-5 max-w-xl text-base font-semibold leading-7 text-white/62">
                Get routed into real-world missions that create proof, clips, venue heat, and repeat paid work.
                BaseDare needs trusted local creators and operators who can make the offline world easier to activate.
              </p>

              <div className="mt-7 grid gap-3">
                {signalSteps.map((step) => (
                  <div
                    key={step.title}
                    className="rounded-[22px] border border-white/[0.08] bg-black/24 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.07)]"
                  >
                    <div className="flex gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-yellow-300/20 bg-yellow-300/[0.08] text-yellow-200">
                        <step.icon className="h-5 w-5" />
                      </div>
                      <div>
                        <h2 className="text-sm font-black uppercase tracking-[0.18em] text-white">{step.title}</h2>
                        <p className="mt-1 text-sm leading-6 text-white/52">{step.copy}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-7 flex flex-wrap gap-3">
                <Link
                  href="/creators"
                  className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-white/72 transition hover:border-cyan-300/30 hover:text-cyan-100"
                >
                  Creator board
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
                <Link
                  href="/map"
                  className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-white/72 transition hover:border-yellow-300/30 hover:text-yellow-100"
                >
                  Open map
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          </div>

          <CreatorCaptainApplicationForm
            initialScoutCode={scoutCode}
            initialCreatorHandle={routedCreatorHandle}
            initialSource={source}
          />
        </section>
      </div>
    </main>
  );
}
