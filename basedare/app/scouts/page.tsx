import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, BadgeDollarSign, Network, RadioTower, Search, ShieldCheck, Users } from 'lucide-react';

import GradualBlurOverlay from '@/components/GradualBlurOverlay';
import LiquidBackground from '@/components/LiquidBackground';
import { DEFAULT_SCOUT_REWARD_SHARE_PCT } from '@/lib/scout-creator-leads';
import ScoutCreatorLeadForm from './ScoutCreatorLeadForm';

export const metadata: Metadata = {
  title: 'BaseDare Scout Army - Recruit Creators, Earn on Proof',
  description:
    'Submit creator leads to BaseDare, generate attributed host invites, and help build the creator supply layer for real-world missions.',
  alternates: {
    canonical: '/scouts',
  },
};

type ScoutArmyPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function firstParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] || '';
  return value || '';
}

const loopSteps = [
  {
    icon: Search,
    title: 'Find creators',
    copy: 'Spot reliable locals who can show up and capture proof.',
  },
  {
    icon: RadioTower,
    title: 'Send invite',
    copy: 'Share one tracked link. BaseDare handles the application.',
  },
  {
    icon: BadgeDollarSign,
    title: 'Earn',
    copy: `${DEFAULT_SCOUT_REWARD_SHARE_PCT}% target reward after referred creators complete paid work.`,
  },
];

const rules = [
  'Warm intros only.',
  'No spam blasts.',
  'Rewards are tracked in the admin queue.',
];

export default async function ScoutArmyPage({ searchParams }: ScoutArmyPageProps) {
  const params = (await searchParams) || {};
  const initialScoutCode = firstParam(params.scout || params.code);
  const initialScoutHandle = firstParam(params.handle || params.scoutHandle);

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#05050b] text-white">
      <LiquidBackground />
      <div className="fixed inset-0 z-10 pointer-events-none">
        <GradualBlurOverlay />
      </div>

      <div className="relative z-20 mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-24 sm:px-6 lg:py-28">
        <section className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
          <div className="relative overflow-hidden rounded-[30px] border border-white/[0.09] bg-[linear-gradient(180deg,rgba(255,255,255,0.075)_0%,rgba(255,255,255,0.025)_18%,rgba(9,8,18,0.92)_62%,rgba(5,5,12,0.98)_100%)] p-5 shadow-[0_28px_90px_rgba(0,0,0,0.42),inset_0_1px_0_rgba(255,255,255,0.1)] sm:p-8">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(34,211,238,0.16),transparent_32%),radial-gradient(circle_at_84%_18%,rgba(245,197,24,0.14),transparent_34%),radial-gradient(circle_at_58%_100%,rgba(168,85,247,0.14),transparent_38%)]" />
            <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/28 to-transparent" />

            <div className="relative">
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/25 bg-cyan-300/[0.08] px-4 py-2 text-[11px] font-black uppercase tracking-[0.26em] text-cyan-100">
                <Network className="h-4 w-4" />
                Scout Army
              </div>

              <h1 className="mt-6 text-4xl font-black tracking-tight text-white sm:text-6xl">
                Recruit hosts. Earn on proof.
              </h1>
              <p className="mt-5 max-w-xl text-base font-semibold leading-7 text-white/62">
                Invite reliable creators and locals. BaseDare routes the best ones into venue missions.
              </p>

              <div className="mt-7 grid gap-3">
                {loopSteps.map((step) => (
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

              <div className="mt-7 rounded-[24px] border border-cyan-300/15 bg-cyan-300/[0.055] p-4">
                <div className="flex gap-3">
                  <ShieldCheck className="mt-1 h-5 w-5 shrink-0 text-cyan-100" />
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-100/62">
                      Rules
                    </p>
                    <div className="mt-3 grid gap-2">
                      {rules.map((rule) => (
                        <p key={rule} className="text-sm font-semibold leading-6 text-cyan-50/68">
                          {rule}
                        </p>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-7 flex flex-wrap gap-3">
                <Link
                  href="/hosts"
                  className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-white/72 transition hover:border-cyan-300/30 hover:text-cyan-100"
                >
                  Host form
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
                <Link
                  href="/scouts/dashboard"
                  className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-white/72 transition hover:border-yellow-300/30 hover:text-yellow-100"
                >
                  Creator radar
                  <Users className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          </div>

          <ScoutCreatorLeadForm initialScoutCode={initialScoutCode} initialScoutHandle={initialScoutHandle} />
        </section>
      </div>
    </main>
  );
}
