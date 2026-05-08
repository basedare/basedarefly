import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CheckCircle2, MapPin, ShieldCheck, Sparkles } from 'lucide-react';

import GradualBlurOverlay from '@/components/GradualBlurOverlay';
import LiquidBackground from '@/components/LiquidBackground';
import { getCaptainMissionByToken } from '@/lib/captain-missions-server';
import CaptainMissionProofForm from './CaptainMissionProofForm';

export const metadata: Metadata = {
  title: 'Captain Mission | BaseDare',
  description: 'Submit proof for a BaseDare Founding Captain venue scout mission.',
};

type CaptainMissionPageProps = {
  params: Promise<{ token: string }>;
};

export default async function CaptainMissionPage({ params }: CaptainMissionPageProps) {
  const { token } = await params;
  const mission = await getCaptainMissionByToken(token);

  if (!mission) {
    notFound();
  }

  const packet = mission.mission.packet;
  const creatorLabel = mission.creatorHandle || mission.creatorName || 'Captain';
  const city = mission.creatorCity || 'your city';

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#05050b] text-white">
      <LiquidBackground veilOpacity={0.72} />
      <div className="fixed inset-0 z-10 pointer-events-none">
        <GradualBlurOverlay />
      </div>

      <div className="relative z-20 mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-24 sm:px-6">
        <section className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
          <div className="relative overflow-hidden rounded-[30px] border border-white/[0.09] bg-[linear-gradient(180deg,rgba(255,255,255,0.075)_0%,rgba(255,255,255,0.025)_18%,rgba(9,8,18,0.92)_62%,rgba(5,5,12,0.98)_100%)] p-5 shadow-[0_28px_90px_rgba(0,0,0,0.42),inset_0_1px_0_rgba(255,255,255,0.1)] sm:p-8">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(34,211,238,0.16),transparent_32%),radial-gradient(circle_at_84%_18%,rgba(245,197,24,0.14),transparent_34%),radial-gradient(circle_at_58%_100%,rgba(168,85,247,0.14),transparent_38%)]" />
            <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/28 to-transparent" />

            <div className="relative">
              <div className="inline-flex items-center gap-2 rounded-full border border-yellow-300/25 bg-yellow-300/[0.08] px-4 py-2 text-[11px] font-black uppercase tracking-[0.26em] text-yellow-100">
                <Sparkles className="h-4 w-4" />
                Founding Captain Mission
              </div>

              <h1 className="mt-6 text-4xl font-black tracking-tight text-white sm:text-6xl">
                {packet.title || 'Venue Scout Mission'}
              </h1>
              <p className="mt-4 text-sm font-black uppercase tracking-[0.18em] text-cyan-100/60">
                {creatorLabel} · {city}
              </p>
              <p className="mt-5 max-w-xl text-base font-semibold leading-7 text-white/62">
                {packet.objective || `Scout 3 venues in ${city}, submit proof, and pick the strongest BaseDare drop.`}
              </p>

              <div className="mt-7 grid gap-3">
                {packet.prompts.map((prompt, index) => (
                  <div
                    key={prompt}
                    className="rounded-[22px] border border-white/[0.08] bg-black/24 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.07)]"
                  >
                    <div className="flex gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-cyan-300/20 bg-cyan-300/[0.08] text-cyan-100">
                        {index + 1}
                      </div>
                      <p className="text-sm font-semibold leading-6 text-white/62">{prompt}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-7 grid gap-3 sm:grid-cols-2">
                <div className="rounded-[24px] border border-cyan-300/15 bg-cyan-300/[0.055] p-4">
                  <div className="flex gap-3">
                    <MapPin className="mt-1 h-5 w-5 shrink-0 text-cyan-100" />
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-100/62">
                        Proof checklist
                      </p>
                      <div className="mt-3 grid gap-2">
                        {packet.proofChecklist.slice(0, 4).map((item) => (
                          <p key={item} className="text-sm font-semibold leading-6 text-cyan-50/68">
                            {item}
                          </p>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-[24px] border border-emerald-300/15 bg-emerald-300/[0.055] p-4">
                  <div className="flex gap-3">
                    <ShieldCheck className="mt-1 h-5 w-5 shrink-0 text-emerald-100" />
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-100/62">
                        Safety line
                      </p>
                      <div className="mt-3 grid gap-2">
                        {packet.safetyRules.slice(0, 3).map((item) => (
                          <p key={item} className="text-sm font-semibold leading-6 text-emerald-50/68">
                            {item}
                          </p>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {mission.mission.latestProof.bestVenueName ? (
                <div className="mt-7 rounded-[24px] border border-emerald-300/18 bg-emerald-300/[0.065] p-4">
                  <div className="flex gap-3">
                    <CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-emerald-100" />
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-100/62">
                        Latest proof
                      </p>
                      <p className="mt-2 text-sm font-semibold leading-6 text-emerald-50/70">
                        {mission.mission.latestProof.bestVenueName} · {mission.mission.latestProof.submittedAt}
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          <CaptainMissionProofForm token={token} creatorHandle={mission.creatorHandle} creatorCity={city} />
        </section>
      </div>
    </main>
  );
}
