'use client';

import { Suspense, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';

import { ClaimTagModule } from '@/components/ClaimTagModule';
import { ControlChip } from '@/components/control/ControlChip';
import { controlPanel, controlInset, controlHairline } from '@/components/control/tokens';
import { MissionChecklist } from '@/components/creators/MissionChecklist';
import { CreatorPassportCard } from '@/components/creators/CreatorPassportCard';
import { SignalPointsBadge } from '@/components/creators/SignalPointsBadge';
import {
  STARTER_MISSIONS,
  MISSION_STYLE_OPTIONS,
  MISSION_STYLE_LABELS,
  AVAILABILITY_OPTIONS,
  AVAILABILITY_LABELS,
  MIN_MISSION_STYLES,
  MAX_MISSION_STYLES,
  type MissionId,
  type PassportMissionState,
} from '@/lib/creator-passport-constants';

/**
 * Creator Passport onboarding wizard (PREVIEW — local state only, not yet wired
 * to the live passport API; persistence ships once the DB migration is applied).
 */

const RADIUS_OPTIONS = [2, 5, 10, 25];
const STEPS = ['Claim Signal', 'Tune Radar', 'Availability', 'Unlock Missions'] as const;

function toggle<T>(list: T[], value: T, max?: number): T[] {
  if (list.includes(value)) return list.filter((item) => item !== value);
  if (max && list.length >= max) return list;
  return [...list, value];
}

export default function CreatorOnboardPage() {
  const [step, setStep] = useState(0);
  const [claimed, setClaimed] = useState(false);
  const [missionStyles, setMissionStyles] = useState<string[]>([]);
  const [availability, setAvailability] = useState<string[]>([]);
  const [radiusKm, setRadiusKm] = useState<number | null>(null);
  const [homeZone, setHomeZone] = useState('');
  const [vibeLine, setVibeLine] = useState('');
  const [pingsEnabled, setPingsEnabled] = useState(false);
  const [payoutReady, setPayoutReady] = useState(false);
  const [explicitDone, setExplicitDone] = useState<MissionId[]>([]);

  const completed = useMemo(() => {
    const set = new Set<MissionId>();
    if (claimed) set.add('claim_signal');
    if (missionStyles.length >= MIN_MISSION_STYLES && (radiusKm ?? 0) > 0) set.add('tune_radar');
    if (pingsEnabled) set.add('mission_pings');
    if (payoutReady) set.add('payout_ready');
    explicitDone.forEach((id) => set.add(id));
    return set;
  }, [claimed, missionStyles, radiusKm, pingsEnabled, payoutReady, explicitDone]);

  const missions: PassportMissionState[] = useMemo(
    () => STARTER_MISSIONS.map((mission) => ({ ...mission, complete: completed.has(mission.id) })),
    [completed]
  );

  const signalPoints = useMemo(
    () => STARTER_MISSIONS.reduce((total, mission) => (completed.has(mission.id) ? total + mission.points : total), 0),
    [completed]
  );
  const routeReady = completed.has('claim_signal') && completed.has('tune_radar') && completed.has('payout_ready');

  const markExplicit = (id: MissionId) => setExplicitDone((prev) => (prev.includes(id) ? prev : [...prev, id]));

  const canContinue =
    step === 0 ? claimed
    : step === 1 ? missionStyles.length >= MIN_MISSION_STYLES && (radiusKm ?? 0) > 0
    : true;

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#030305] px-4 py-8 text-white sm:px-6 lg:px-10 lg:py-10">
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(circle_at_1px_1px,rgba(185,127,255,0.1)_1px,transparent_0)] [background-size:112px_112px]" />
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(circle_at_14%_8%,rgba(255,213,74,0.12),transparent_34%),radial-gradient(circle_at_82%_8%,rgba(154,82,255,0.16),transparent_30%),linear-gradient(180deg,#05040a_0%,#07020f_48%,#000_100%)]" />

      <section className="relative z-10 mx-auto flex w-full max-w-3xl flex-col gap-6">
        <div className="flex items-center justify-between gap-3">
          <Link
            href="/creators"
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.045] px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-white/64 transition hover:bg-white/[0.08] hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Creators
          </Link>
          <SignalPointsBadge points={signalPoints} routeReady={routeReady} />
        </div>

        {/* Step progress */}
        <div className="grid grid-cols-4 gap-2">
          {STEPS.map((label, index) => (
            <div key={label} className="flex flex-col gap-1.5">
              <div
                className={`h-1.5 rounded-full transition ${
                  index <= step ? 'bg-yellow-300' : 'bg-white/10'
                }`}
              />
              <span className={`text-[9px] font-black uppercase tracking-[0.14em] ${index <= step ? 'text-white/70' : 'text-white/34'}`}>
                {label}
              </span>
            </div>
          ))}
        </div>

        <section className={`${controlPanel} p-5 sm:p-6 lg:p-7`}>
          <div className={controlHairline} />
          <div className="relative">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-yellow-100/70">
              Step {step + 1} of {STEPS.length}
            </p>

            {step === 0 ? (
              <div className="mt-3">
                <h1 className="text-3xl font-black uppercase italic tracking-[-0.05em] text-white">Claim your signal</h1>
                <p className="mt-2 text-sm font-bold leading-6 text-white/58">
                  Handle, avatar, base zone. This is how venues and brands find you.
                </p>
                <div className="mt-5">
                  <Suspense fallback={null}>
                    <ClaimTagModule />
                  </Suspense>
                </div>
                <label className="mt-4 flex items-center gap-3 text-sm font-bold text-white/70">
                  <input
                    type="checkbox"
                    checked={claimed}
                    onChange={(event) => setClaimed(event.target.checked)}
                    className="h-4 w-4 accent-yellow-400"
                  />
                  I&apos;ve claimed my tag — continue
                </label>
              </div>
            ) : null}

            {step === 1 ? (
              <div className="mt-3">
                <h1 className="text-3xl font-black uppercase italic tracking-[-0.05em] text-white">Tune your radar</h1>
                <p className="mt-2 text-sm font-bold leading-6 text-white/58">
                  Pick {MIN_MISSION_STYLES}–{MAX_MISSION_STYLES} mission styles and a radius. This sets your Dare DNA.
                </p>

                <div className="mt-5 flex flex-wrap gap-2">
                  {MISSION_STYLE_OPTIONS.map((style) => (
                    <ControlChip
                      key={style}
                      label={MISSION_STYLE_LABELS[style]}
                      active={missionStyles.includes(style)}
                      onClick={() => setMissionStyles((prev) => toggle(prev, style, MAX_MISSION_STYLES))}
                    />
                  ))}
                </div>

                <p className="mt-5 text-[10px] font-black uppercase tracking-[0.2em] text-white/44">Radius</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {RADIUS_OPTIONS.map((km) => (
                    <ControlChip key={km} label={`${km} km`} active={radiusKm === km} onClick={() => setRadiusKm(km)} />
                  ))}
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <input
                    value={homeZone}
                    onChange={(event) => setHomeZone(event.target.value)}
                    placeholder="Home zone (e.g. General Luna)"
                    className={`${controlInset} px-4 py-3 text-sm font-bold text-white outline-none placeholder:text-white/34`}
                  />
                  <input
                    value={vibeLine}
                    onChange={(event) => setVibeLine(event.target.value)}
                    placeholder="Vibe line (e.g. Night routes · beach chaos)"
                    className={`${controlInset} px-4 py-3 text-sm font-bold text-white outline-none placeholder:text-white/34`}
                  />
                </div>
              </div>
            ) : null}

            {step === 2 ? (
              <div className="mt-3">
                <h1 className="text-3xl font-black uppercase italic tracking-[-0.05em] text-white">Set availability</h1>
                <p className="mt-2 text-sm font-bold leading-6 text-white/58">When and how are you reachable for missions?</p>
                <div className="mt-5 flex flex-wrap gap-2">
                  {AVAILABILITY_OPTIONS.map((slot) => (
                    <ControlChip
                      key={slot}
                      label={AVAILABILITY_LABELS[slot]}
                      active={availability.includes(slot)}
                      onClick={() => setAvailability((prev) => toggle(prev, slot))}
                    />
                  ))}
                </div>
              </div>
            ) : null}

            {step === 3 ? (
              <div className="mt-3">
                <h1 className="text-3xl font-black uppercase italic tracking-[-0.05em] text-white">Unlock first missions</h1>
                <p className="mt-2 text-sm font-bold leading-6 text-white/58">
                  Each one makes you more discoverable, reachable, or route-ready. Signal Points are reputation only.
                </p>

                <div className="mt-5 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setPingsEnabled((value) => !value)}
                    className={`rounded-full border px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] transition ${pingsEnabled ? 'border-emerald-300/40 bg-emerald-400/[0.12] text-emerald-100' : 'border-white/12 bg-white/[0.05] text-white/60 hover:text-white'}`}
                  >
                    {pingsEnabled ? <Check className="mr-1 inline h-3 w-3" /> : null}Mission Pings
                  </button>
                  <button
                    type="button"
                    onClick={() => setPayoutReady((value) => !value)}
                    className={`rounded-full border px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] transition ${payoutReady ? 'border-emerald-300/40 bg-emerald-400/[0.12] text-emerald-100' : 'border-white/12 bg-white/[0.05] text-white/60 hover:text-white'}`}
                  >
                    {payoutReady ? <Check className="mr-1 inline h-3 w-3" /> : null}Payout Ready
                  </button>
                  <Link
                    href="/map?source=onboard"
                    onClick={() => markExplicit('open_grid')}
                    className="rounded-full border border-white/12 bg-white/[0.05] px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-white/60 transition hover:text-white"
                  >
                    Open the Grid
                  </Link>
                  <Link
                    href="/first-spark?source=onboard"
                    onClick={() => markExplicit('first_spark_applied')}
                    className="rounded-full border border-white/12 bg-white/[0.05] px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-white/60 transition hover:text-white"
                  >
                    Apply First Spark
                  </Link>
                </div>

                <div className="mt-5">
                  <MissionChecklist missions={missions} />
                </div>

                <div className="mt-6">
                  <CreatorPassportCard
                    displayTag="@your-tag"
                    homeZone={homeZone || null}
                    vibeLine={vibeLine || null}
                    missionStyles={missionStyles}
                    availability={availability}
                    signalPoints={signalPoints}
                    routeReady={routeReady}
                  />
                </div>

                <p className="mt-4 text-center text-[10px] font-black uppercase tracking-[0.2em] text-white/34">
                  Preview — not saved yet
                </p>
              </div>
            ) : null}

            {/* Step nav */}
            <div className="mt-7 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setStep((value) => Math.max(0, value - 1))}
                disabled={step === 0}
                className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-5 text-xs font-black uppercase tracking-[0.16em] text-white/60 transition hover:text-white disabled:opacity-30"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>
              {step < STEPS.length - 1 ? (
                <button
                  type="button"
                  onClick={() => canContinue && setStep((value) => Math.min(STEPS.length - 1, value + 1))}
                  disabled={!canContinue}
                  className="inline-flex min-h-11 items-center gap-2 rounded-full border border-yellow-300/30 bg-yellow-300 px-6 text-xs font-black uppercase tracking-[0.16em] text-black transition hover:bg-yellow-200 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Continue
                  <ArrowRight className="h-4 w-4" />
                </button>
              ) : (
                <Link
                  href="/dashboard"
                  className="inline-flex min-h-11 items-center gap-2 rounded-full border border-yellow-300/30 bg-yellow-300 px-6 text-xs font-black uppercase tracking-[0.16em] text-black transition hover:bg-yellow-200"
                >
                  Finish
                  <ArrowRight className="h-4 w-4" />
                </Link>
              )}
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}
