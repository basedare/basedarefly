import 'server-only';

import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import type { Prisma } from '@prisma/client';

import { prisma } from '@/lib/prisma';

import {
  deriveBoatCrewStatus,
  getProjectedSharePhp,
  type BoatCommitment,
  type BoatCrewStatus,
  type BoatCrewSummary,
  type BoatDestination,
  type BoatTimeWindow,
  type OperatorDestination,
  type SurfAbilityLane,
} from '@/lib/surf-boat-board';

export type BoatCrewWithMembers = Prisma.SurfBoatCrewGetPayload<{
  include: { members: true; venue: { select: { slug: true } } };
}>;

export function createOperatorToken() {
  const token = randomBytes(24).toString('base64url');
  return { token, hash: hashOperatorToken(token) };
}

export function hashOperatorToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

export function operatorTokenMatches(token: string, expectedHash: string | null) {
  if (!expectedHash) return false;
  const actual = Buffer.from(hashOperatorToken(token), 'hex');
  const expected = Buffer.from(expectedHash, 'hex');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function serializeBoatCrew(
  crew: BoatCrewWithMembers,
  options: { viewerBaretagId?: string | null; creatorTag?: string | null; now?: Date } = {},
): BoatCrewSummary {
  const confirmedMembers = crew.members.filter((member) => member.commitment === 'CONFIRMED');
  const interestedMembers = crew.members.filter((member) => member.commitment === 'INTERESTED');
  const acceptedMembers = confirmedMembers.filter(
    (member) => member.acceptedTermsVersion === crew.termsVersion && crew.termsVersion > 0,
  );
  const viewerMembership = options.viewerBaretagId
    ? crew.members.find((member) => member.baretagId === options.viewerBaretagId)
    : null;
  const totalPhp = crew.operatorConfirmedTotalPhp ?? crew.indicativeTotalPhp;
  const status = deriveBoatCrewStatus({
    persistedStatus: crew.status as BoatCrewStatus,
    confirmedCount: confirmedMembers.length,
    acceptedCount: acceptedMembers.length,
    minimumCrew: crew.minimumCrew,
    operatorConfirmedAt: crew.operatorConfirmedAt,
    departureAt: crew.operatorConfirmedDepartureAt,
    now: options.now,
  });
  const hasOperatorConfirmation = Boolean(
    crew.operatorName &&
      crew.operatorConfirmedDestination &&
      crew.operatorConfirmedTotalPhp &&
      crew.operatorConfirmedCapacity &&
      crew.operatorConfirmedDepartureAt &&
      crew.operatorConfirmedAt,
  );

  return {
    id: crew.id,
    venueSlug: crew.venue.slug,
    departureDay: crew.departureDay,
    timeWindow: crew.timeWindow as BoatTimeWindow,
    destination: crew.destination as BoatDestination,
    abilityLane: crew.abilityLane as SurfAbilityLane,
    minimumCrew: crew.minimumCrew,
    indicativeTotalPhp: crew.indicativeTotalPhp,
    status,
    confirmedCount: confirmedMembers.length,
    interestedCount: interestedMembers.length,
    boardCount: crew.members.filter((member) => member.needsBoard).length,
    acceptedCount: acceptedMembers.length,
    projectedSharePhp: getProjectedSharePhp(totalPhp, confirmedMembers.length, crew.minimumCrew),
    creatorTag: options.creatorTag ?? null,
    isCreator: crew.creatorBaretagId === options.viewerBaretagId,
    viewerMembership: viewerMembership
      ? {
          commitment: viewerMembership.commitment as BoatCommitment,
          needsBoard: viewerMembership.needsBoard,
          acceptedFinalDetails:
            crew.termsVersion > 0 && viewerMembership.acceptedTermsVersion === crew.termsVersion,
        }
      : null,
    operatorConfirmation: hasOperatorConfirmation
      ? {
          name: crew.operatorName as string,
          destination: crew.operatorConfirmedDestination as OperatorDestination,
          totalPhp: crew.operatorConfirmedTotalPhp as number,
          capacity: crew.operatorConfirmedCapacity as number,
          departureAt: (crew.operatorConfirmedDepartureAt as Date).toISOString(),
          note: crew.operatorNote,
          confirmedAt: (crew.operatorConfirmedAt as Date).toISOString(),
          sharePhp: getProjectedSharePhp(
            crew.operatorConfirmedTotalPhp as number,
            confirmedMembers.length,
            crew.minimumCrew,
          ),
        }
      : null,
  };
}

export async function getPublicBoatCrew(crewId: string, now = new Date()) {
  const crew = await prisma.surfBoatCrew.findFirst({
    where: {
      id: crewId,
      status: { not: 'CANCELLED' },
    },
    include: { members: true, venue: { select: { slug: true } } },
  });
  if (!crew) return null;

  const creator = await prisma.streamerTag.findUnique({
    where: { id: crew.creatorBaretagId },
    select: { tag: true },
  });

  return serializeBoatCrew(crew, {
    creatorTag: creator?.tag ?? null,
    now,
  });
}
