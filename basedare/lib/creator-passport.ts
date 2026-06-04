import { prisma } from '@/lib/prisma';

/**
 * Creator Passport — onboarding radar tuning, availability, and Signal Points.
 *
 * Signal Points are reputation only (no token/cash value). To avoid double-award
 * drift, completion + points are RECOMPUTED on every read/write from:
 *   - passport fields (tune_radar, mission_pings, payout_ready)
 *   - real data (claim_signal, wake_spot, first_proof_drop)
 *   - explicit client-reported actions stored in completedMissions[] (open_grid, first_spark_applied)
 */

// Pure catalog + types live in a client-safe module; re-export the whole surface
// so existing importers of '@/lib/creator-passport' keep working.
export * from '@/lib/creator-passport-constants';

import {
  type MissionId,
  type ComposedPassport,
  STARTER_MISSIONS,
  EXPLICIT_MISSIONS,
  ROUTE_READY_MISSIONS,
  MIN_MISSION_STYLES,
} from '@/lib/creator-passport-constants';

function normalizeWallet(wallet: string): string {
  return wallet.trim().toLowerCase();
}

/** Query real data signals used by `data`-detected missions. */
async function detectDataSignals(wallet: string): Promise<{
  hasTag: boolean;
  hasProof: boolean;
  hasMark: boolean;
}> {
  const where = { walletAddress: { equals: wallet, mode: 'insensitive' as const } };

  const [tag, markCount] = await Promise.all([
    prisma.streamerTag.findFirst({
      where,
      select: { id: true, completedDares: true, status: true },
    }),
    prisma.placeTag.count({ where }),
  ]);

  return {
    hasTag: Boolean(tag && tag.status !== 'REVOKED'),
    hasProof: (tag?.completedDares ?? 0) > 0,
    hasMark: markCount > 0,
  };
}

type PassportRow = {
  walletAddress: string;
  homeZone: string | null;
  vibeLine: string | null;
  missionStyles: string[];
  availability: string[];
  radiusKm: number | null;
  pingsEnabled: boolean;
  completedMissions: string[];
};

function resolveMissionCompletion(
  passport: PassportRow,
  signals: { hasTag: boolean; hasProof: boolean; hasMark: boolean }
): Set<MissionId> {
  const complete = new Set<MissionId>();
  const explicit = new Set(passport.completedMissions);

  if (signals.hasTag) complete.add('claim_signal');
  if (signals.hasProof) complete.add('first_proof_drop');
  if (signals.hasMark) complete.add('wake_spot');

  if (passport.missionStyles.length >= MIN_MISSION_STYLES && (passport.radiusKm ?? 0) > 0) {
    complete.add('tune_radar');
  }
  if (passport.pingsEnabled) complete.add('mission_pings');
  // Payout ready: a connected wallet that owns this passport.
  complete.add('payout_ready');

  for (const id of EXPLICIT_MISSIONS) {
    if (explicit.has(id)) complete.add(id);
  }

  return complete;
}

function buildComposed(passport: PassportRow, completed: Set<MissionId>, hasTag: boolean): ComposedPassport {
  const signalPoints = STARTER_MISSIONS.reduce(
    (total, mission) => (completed.has(mission.id) ? total + mission.points : total),
    0
  );
  const routeReady = ROUTE_READY_MISSIONS.every((id) => completed.has(id));

  return {
    walletAddress: passport.walletAddress,
    homeZone: passport.homeZone,
    vibeLine: passport.vibeLine,
    missionStyles: passport.missionStyles,
    availability: passport.availability,
    radiusKm: passport.radiusKm,
    pingsEnabled: passport.pingsEnabled,
    signalPoints,
    routeReady,
    completedMissions: [...completed],
    missions: STARTER_MISSIONS.map((mission) => ({ ...mission, complete: completed.has(mission.id) })),
    hasTag,
  };
}

const PASSPORT_SELECT = {
  walletAddress: true,
  homeZone: true,
  vibeLine: true,
  missionStyles: true,
  availability: true,
  radiusKm: true,
  pingsEnabled: true,
  completedMissions: true,
} as const;

/** Read (creating if missing), recompute points/readiness, persist denormalized fields. */
export async function composePassport(walletInput: string): Promise<ComposedPassport> {
  const wallet = normalizeWallet(walletInput);

  const passport = await prisma.creatorPassport.upsert({
    where: { walletAddress: wallet },
    update: {},
    create: { walletAddress: wallet },
    select: PASSPORT_SELECT,
  });

  const signals = await detectDataSignals(wallet);
  const completed = resolveMissionCompletion(passport, signals);
  const composed = buildComposed(passport, completed, signals.hasTag);

  await prisma.creatorPassport.update({
    where: { walletAddress: wallet },
    data: { signalPoints: composed.signalPoints, routeReady: composed.routeReady },
  });

  return composed;
}

export type PassportPatch = {
  homeZone?: string | null;
  vibeLine?: string | null;
  missionStyles?: string[];
  availability?: string[];
  radiusKm?: number | null;
  pingsEnabled?: boolean;
};

export async function updatePassport(walletInput: string, patch: PassportPatch): Promise<ComposedPassport> {
  const wallet = normalizeWallet(walletInput);
  await prisma.creatorPassport.upsert({
    where: { walletAddress: wallet },
    update: patch,
    create: { walletAddress: wallet, ...patch },
  });
  return composePassport(wallet);
}

/** Record an explicit (client-reported) mission, then recompute. */
export async function recordExplicitMission(
  walletInput: string,
  missionId: MissionId
): Promise<ComposedPassport> {
  const wallet = normalizeWallet(walletInput);
  if (!EXPLICIT_MISSIONS.includes(missionId)) {
    // Non-explicit missions are derived; just recompute.
    return composePassport(wallet);
  }

  const existing = await prisma.creatorPassport.upsert({
    where: { walletAddress: wallet },
    update: {},
    create: { walletAddress: wallet },
    select: { completedMissions: true },
  });

  if (!existing.completedMissions.includes(missionId)) {
    await prisma.creatorPassport.update({
      where: { walletAddress: wallet },
      data: { completedMissions: { set: [...existing.completedMissions, missionId] } },
    });
  }

  return composePassport(wallet);
}
