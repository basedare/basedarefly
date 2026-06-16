import { prisma } from '@/lib/prisma';

/**
 * resolveVenueRole — build slice #1 of "claim-by-presence" (spec:
 * docs/specs/claim-by-presence.md).
 *
 * PURE, READ-ONLY. Grants nothing and is wired to nothing yet. It only derives
 * a wallet's permission level for a venue from signals that already exist
 * (check-ins, Signal Points, claim status). Endpoints that actually grant
 * provisional-host powers will import this once #1 is smoked + merged.
 *
 * Product principle (Codex): presence unlocks ACTION, not OWNERSHIP.
 *   verified_owner  > provisional_host > contributor > visitor
 *
 * On any error gathering signals it returns the least-privileged role (visitor)
 * — fail closed, never grant on uncertainty.
 */

export type VenueRole = 'verified_owner' | 'provisional_host' | 'contributor' | 'visitor';

// Tunable gates. Provisional host needs on-site-now presence AND a reputation
// signal (any one of the three) AND no existing verified owner.
export const VENUE_ROLE_CONFIG = {
  // "You're here now" — recent QR+GPS check-in qualifies for provisional host.
  onSiteWindowMs: 90 * 60 * 1000, // 90 min
  // A QR+GPS check-in within this window marks a known contributor.
  contributorWindowMs: 30 * 24 * 60 * 60 * 1000, // 30 days
  // Reputation gate — ANY one of these clears it.
  provisionalSignalPoints: 50,
  provisionalDistinctDays: 3,
  provisionalApprovedMarks: 3,
} as const;

export type VenueRoleSignals = {
  onSiteNow: boolean;
  hasQrGpsCheckIn: boolean;
  signalPoints: number;
  distinctCheckInDays: number;
  approvedMarksHere: number;
  reputationGatePassed: boolean;
};

export type VenueRoleResult = {
  role: VenueRole;
  isOwner: boolean;
  venueHasOwner: boolean;
  signals: VenueRoleSignals;
};

const EMPTY_SIGNALS: VenueRoleSignals = {
  onSiteNow: false,
  hasQrGpsCheckIn: false,
  signalPoints: 0,
  distinctCheckInDays: 0,
  approvedMarksHere: 0,
  reputationGatePassed: false,
};

function visitorResult(venueHasOwner = false): VenueRoleResult {
  return { role: 'visitor', isOwner: false, venueHasOwner, signals: { ...EMPTY_SIGNALS } };
}

export async function resolveVenueRole(
  walletAddressInput: string | null | undefined,
  venueId: string | null | undefined,
): Promise<VenueRoleResult> {
  const wallet = walletAddressInput?.trim().toLowerCase() || null;
  if (!wallet || !venueId) return visitorResult();

  let venueHasOwner = false;
  try {
    const venue = await prisma.venue.findUnique({
      where: { id: venueId },
      select: { claimedBy: true },
    });
    if (!venue) return visitorResult();

    venueHasOwner = Boolean(venue.claimedBy);
    const isOwner = venueHasOwner && venue.claimedBy?.toLowerCase() === wallet;

    const now = Date.now();
    const cfg = VENUE_ROLE_CONFIG;

    const [recentOnSite, anyQrGps, passport, approvedMarksHere, checkInDayRows] = await Promise.all([
      prisma.venueCheckIn.findFirst({
        where: {
          venueId,
          walletAddress: wallet,
          status: 'CONFIRMED',
          proofLevel: 'QR_AND_GPS',
          scannedAt: { gte: new Date(now - cfg.onSiteWindowMs) },
        },
        select: { id: true },
      }),
      prisma.venueCheckIn.findFirst({
        where: {
          venueId,
          walletAddress: wallet,
          status: 'CONFIRMED',
          proofLevel: 'QR_AND_GPS',
          scannedAt: { gte: new Date(now - cfg.contributorWindowMs) },
        },
        select: { id: true },
      }),
      prisma.creatorPassport
        .findUnique({ where: { walletAddress: wallet }, select: { signalPoints: true } })
        .catch(() => null),
      prisma.placeTag.count({
        where: { venueId, walletAddress: wallet, status: 'APPROVED' },
      }),
      prisma.venueCheckIn.findMany({
        where: { venueId, walletAddress: wallet, status: 'CONFIRMED', proofLevel: 'QR_AND_GPS' },
        select: { scannedAt: true },
        take: 200,
      }),
    ]);

    const distinctCheckInDays = new Set(
      checkInDayRows.map((row) => row.scannedAt.toISOString().slice(0, 10)),
    ).size;
    const signalPoints = passport?.signalPoints ?? 0;
    const reputationGatePassed =
      signalPoints >= cfg.provisionalSignalPoints ||
      distinctCheckInDays >= cfg.provisionalDistinctDays ||
      approvedMarksHere >= cfg.provisionalApprovedMarks;

    const signals: VenueRoleSignals = {
      onSiteNow: Boolean(recentOnSite),
      hasQrGpsCheckIn: Boolean(anyQrGps),
      signalPoints,
      distinctCheckInDays,
      approvedMarksHere,
      reputationGatePassed,
    };

    // Precedence: owner > provisional host > contributor > visitor.
    if (isOwner) {
      return { role: 'verified_owner', isOwner: true, venueHasOwner, signals };
    }
    // Provisional host: on-site now + reputation + venue not already owned.
    if (!venueHasOwner && signals.onSiteNow && reputationGatePassed) {
      return { role: 'provisional_host', isOwner: false, venueHasOwner, signals };
    }
    if (signals.hasQrGpsCheckIn) {
      return { role: 'contributor', isOwner: false, venueHasOwner, signals };
    }
    return { role: 'visitor', isOwner: false, venueHasOwner, signals };
  } catch (error) {
    console.error('[resolveVenueRole] Signal lookup failed; failing closed to visitor:', error);
    return visitorResult(venueHasOwner);
  }
}
