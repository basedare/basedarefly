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

/** Consecutive UTC days (ending today or yesterday) with >=1 verified proof.
 * Verified-only streaks can't be botted with posts — proof or it didn't count. */
function computeStreakDays(dates: Date[]): number {
  if (dates.length === 0) return 0;
  const days = new Set(dates.map((date) => Math.floor(date.getTime() / 86_400_000)));
  const today = Math.floor(Date.now() / 86_400_000);
  const anchor = days.has(today) ? today : days.has(today - 1) ? today - 1 : null;
  if (anchor === null) return 0;
  let streak = 0;
  while (days.has(anchor - streak)) streak += 1;
  return streak;
}

/** Query real data signals used by `data`-detected missions. */
async function detectDataSignals(wallet: string): Promise<{
  hasTag: boolean;
  hasProof: boolean;
  hasMark: boolean;
  streakDays: number;
}> {
  const where = { walletAddress: { equals: wallet, mode: 'insensitive' as const } };

  const [tag, markCount, recentMarks] = await Promise.all([
    prisma.streamerTag.findFirst({
      where,
      select: { id: true, completedDares: true, status: true },
    }),
    prisma.placeTag.count({ where }),
    prisma.placeTag.findMany({
      where: { ...where, status: 'APPROVED' },
      select: { submittedAt: true },
      orderBy: { submittedAt: 'desc' },
      take: 120,
    }),
  ]);

  return {
    hasTag: Boolean(tag && tag.status !== 'REVOKED'),
    hasProof: (tag?.completedDares ?? 0) > 0,
    hasMark: markCount > 0,
    streakDays: computeStreakDays(recentMarks.map((mark) => mark.submittedAt)),
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
  signals: { hasTag: boolean; hasProof: boolean; hasMark: boolean },
  hasRow: boolean
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
  // Payout ready: only once the wallet has actually engaged (a passport row
  // exists from an authenticated save) — never for an arbitrary read-only GET.
  if (hasRow) complete.add('payout_ready');

  for (const id of EXPLICIT_MISSIONS) {
    if (explicit.has(id)) complete.add(id);
  }

  return complete;
}

function buildComposed(
  passport: PassportRow,
  completed: Set<MissionId>,
  hasTag: boolean,
  ledgerPoints: number,
  streakDays: number
): ComposedPassport {
  const missionPoints = STARTER_MISSIONS.reduce(
    (total, mission) => (completed.has(mission.id) ? total + mission.points : total),
    0
  );
  const signalPoints = missionPoints + Math.max(0, ledgerPoints);
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
    streakDays,
  };
}

/** Sum of the Signal Points ledger (vault contributions etc.). Graceful if the
 * PointsEvent table isn't migrated yet — returns 0 instead of throwing. */
async function sumLedgerPoints(wallet: string): Promise<number> {
  try {
    const result = await prisma.pointsEvent.aggregate({
      where: { walletAddress: wallet },
      _sum: { points: true },
    });
    return result._sum.points ?? 0;
  } catch {
    return 0;
  }
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

/**
 * Compose a passport view. READ-ONLY by default — never creates or mutates a
 * row (so an unauthenticated GET can't spawn passports / award starter points
 * for arbitrary wallets). Pass `{ persist: true }` ONLY from authenticated
 * write paths to upsert the denormalized signalPoints/routeReady.
 */
export async function composePassport(
  walletInput: string,
  { persist = false }: { persist?: boolean } = {}
): Promise<ComposedPassport> {
  const wallet = normalizeWallet(walletInput);

  const existing = await prisma.creatorPassport.findUnique({
    where: { walletAddress: wallet },
    select: PASSPORT_SELECT,
  });
  const passport: PassportRow = existing ?? {
    walletAddress: wallet,
    homeZone: null,
    vibeLine: null,
    missionStyles: [],
    availability: [],
    radiusKm: null,
    pingsEnabled: false,
    completedMissions: [],
  };

  const signals = await detectDataSignals(wallet);
  const completed = resolveMissionCompletion(passport, signals, existing !== null);
  const ledgerPoints = await sumLedgerPoints(wallet);
  const composed = buildComposed(passport, completed, signals.hasTag, ledgerPoints, signals.streakDays);

  if (persist) {
    await prisma.creatorPassport.upsert({
      where: { walletAddress: wallet },
      update: { signalPoints: composed.signalPoints, routeReady: composed.routeReady },
      create: { walletAddress: wallet, signalPoints: composed.signalPoints, routeReady: composed.routeReady },
    });
  }

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
  return composePassport(wallet, { persist: true });
}

/** Record an explicit (client-reported) mission, then recompute. */
export async function recordExplicitMission(
  walletInput: string,
  missionId: MissionId
): Promise<ComposedPassport> {
  const wallet = normalizeWallet(walletInput);
  if (!EXPLICIT_MISSIONS.includes(missionId)) {
    // Non-explicit missions are derived; just recompute.
    return composePassport(wallet, { persist: true });
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

  return composePassport(wallet, { persist: true });
}
