import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, BadgeDollarSign, MapPinned, RadioTower, Sparkles } from 'lucide-react';

import GradualBlurOverlay from '@/components/GradualBlurOverlay';
import LiquidBackground from '@/components/LiquidBackground';
import CreatorCaptainApplicationForm from './CreatorCaptainApplicationForm';

export const metadata: Metadata = {
  title: 'BaseDare Founding Dare Captains — Get Paid for Real-World Missions',
  description:
    'Apply to become a BaseDare Founding Dare Captain and get routed into paid IRL creator missions, venue activations, and proof-backed content drops.',
  alternates: {
    canonical: '/captains',
  },
};

const signalSteps = [
  {
    icon: MapPinned,
    title: 'Real places',
    copy: 'We route missions into venues, landmarks, events, and city spots people can actually visit.',
  },
  {
    icon: BadgeDollarSign,
    title: 'Paid prompts',
    copy: 'The goal is funded missions, venue perks, sponsor drops, and repeat work once proof is visible.',
  },
  {
    icon: RadioTower,
    title: 'Proof loop',
    copy: 'Your completion becomes a map signal, venue proof, and a recap asset that can sell the next activation.',
  },
];

export default function CreatorCaptainsPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#05050b] text-white">
      <LiquidBackground />
      <div className="fixed inset-0 z-10 pointer-events-none">
        <GradualBlurOverlay />
      </div>

      <div className="relative z-20 mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-24 sm:px-6 lg:py-28">
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
                Become a BaseDare Dare Captain
              </h1>
              <p className="mt-5 max-w-xl text-base font-semibold leading-7 text-white/62">
                Get routed into real-world missions that create proof, clips, venue heat, and repeat paid work.
                BaseDare needs creators who can make the map feel alive.
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

          <CreatorCaptainApplicationForm />
        </section>
      </div>
    </main>
  );
}

