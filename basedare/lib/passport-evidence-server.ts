import 'server-only';
import { prisma } from '@/lib/prisma';
import { getPublicVenueTagWhere } from '@/lib/public-venue-evidence';
import { getVenuePerkSnapshot } from '@/lib/venue-perks';
import { LIVE_PLAN_ATTENDANCE_EVENT } from '@/lib/live-plan-retention';
import { destinationWeek, type PassportAchievement, type PassportEvidenceSnapshot, type PassportMemory, type PlaceStamp } from '@/lib/passport-progression';

export async function getPassportEvidence(wallet: string | null, area: { lat: number; lng: number }, now = new Date()): Promise<PassportEvidenceSnapshot> {
  const week = destinationWeek(now);
  const weekStart = new Date(`${week}T00:00:00+08:00`);
  const publicTags = await getPublicVenueTagWhere();
  const communityWhere = { AND: [publicTags, { status: 'APPROVED', reviewedAt: { gte: weekStart, lte: now }, venue: { status: 'ACTIVE', latitude: { gte: area.lat - .2, lte: area.lat + .2 }, longitude: { gte: area.lng - .2, lte: area.lng + .2 } } }] };
  const accepted = await prisma.placeTag.count({ where: communityWhere });
  const result: PassportEvidenceSnapshot = { stamps: [], achievements: [], memories: [], perks: [], publicName: null, community: { accepted, yours: 0, target: 5, week }, asOf: now.toISOString() };
  if (!wallet) return result;
  const [checkIns, posts, tags, identities, mine] = await Promise.all([
    prisma.venueCheckIn.findMany({ where: { walletAddress: { equals: wallet, mode: 'insensitive' }, status: 'CONFIRMED', proofLevel: 'QR_AND_GPS', source: 'VENUE_QR', venueSessionId: { not: null }, qrTokenHash: { not: null }, geoDistanceMeters: { not: null }, NOT: { id: { startsWith: 'seed-' } }, scannedAt: { lte: now }, venue: { status: 'ACTIVE' } }, orderBy: { scannedAt: 'desc' }, take: 500, select: { id: true, venueId: true, scannedAt: true, metadataJson: true, venue: { select: { slug: true, name: true } } } }),
    prisma.adventureSubmission.findMany({ where: { wallet: { equals: wallet, mode: 'insensitive' }, status: 'APPROVED', reviewedAt: { not: null, lte: now }, venue: { status: 'ACTIVE' } }, orderBy: { reviewedAt: 'asc' }, take: 100, select: { id: true, activityId: true, caption: true, reviewedAt: true, venue: { select: { name: true, slug: true } } } }),
    prisma.placeTag.findMany({ where: { AND: [publicTags, { walletAddress: { equals: wallet, mode: 'insensitive' }, status: 'APPROVED', reviewedAt: { not: null, lte: now }, venue: { status: 'ACTIVE' } }] }, orderBy: { reviewedAt: 'asc' }, take: 100, select: { id: true, reviewedAt: true } }),
    prisma.streamerTag.findMany({ where: { walletAddress: { equals: wallet, mode: 'insensitive' }, status: { in: ['ACTIVE', 'VERIFIED'] }, revokedAt: null }, select: { id: true, tag: true }, take: 10 }),
    prisma.placeTag.count({ where: { AND: [communityWhere, { walletAddress: { equals: wallet, mode: 'insensitive' } }] } }),
  ]);
  result.publicName = identities[0]?.tag ?? null;
  result.community.yours = mine;
  const stamps = new Map<string, PlaceStamp>();
  for (const row of checkIns) {
    // Ascending replacement picks the first retained confirmed evidence per place.
    stamps.set(row.venueId, { id: `place:${row.venueId}`, venueId: row.venueId, slug: row.venue.slug, name: row.venue.name, earnedAt: row.scannedAt.toISOString(), evidenceId: row.id, proof: 'QR_AND_GPS' });
    const perk = getVenuePerkSnapshot(row.metadataJson);
    if (perk && perk.checkInId === row.id && !perk.redeemedAt && Date.parse(perk.expiresAt) > now.getTime()) result.perks.push({ checkInId: row.id, slug: row.venue.slug, place: row.venue.name, title: perk.title, conditions: perk.conditions || perk.description || 'Show this existing check-in offer to venue staff. Their stated conditions apply.', expiresAt: perk.expiresAt, redeemedAt: perk.redeemedAt, code: perk.redemptionCode });
  }
  result.stamps = [...stamps.values()].sort((a, b) => Date.parse(b.earnedAt) - Date.parse(a.earnedAt));
  const achievement = (id: string, title: string, rule: string, evidence: PassportAchievement['evidence'], sources: { id: string; at: Date }[], count: number): PassportAchievement => ({ id, title, rule, evidence, earnedAt: sources.length >= count ? sources[count - 1].at.toISOString() : null, sourceIds: sources.slice(0, count).map((s) => s.id) });
  result.achievements.push(achievement('storyteller', 'Storyteller', 'One adventure photo or clip currently approved for public display. This is contribution recognition, not attendance proof.', 'contribution', posts.map((p) => ({ id: p.id, at: p.reviewedAt! })), 1));
  result.achievements.push(achievement('pathfinder', 'Pathfinder', 'Confirmed QR + GPS visits at three different places.', 'visit', [...result.stamps].sort((a,b) => Date.parse(a.earnedAt)-Date.parse(b.earnedAt)).map((p) => ({ id: p.evidenceId, at: new Date(p.earnedAt) })), 3));
  result.achievements.push(achievement('helpful-local', 'Helpful Local', 'Three currently approved, non-seeded place contributions.', 'contribution', tags.map((t) => ({ id: t.id, at: t.reviewedAt! })), 3));
  result.memories.push(...posts.map((post): PassportMemory => ({ id: post.id, title: 'An adventure you shared', place: post.venue.name, href: `/adventures/${encodeURIComponent(post.activityId)}?place=${encodeURIComponent(post.venue.slug)}`, occurredAt: post.reviewedAt!.toISOString(), evidence: 'contribution' })));

  const participantKeys = identities.map((tag) => `baretag:${tag.id}`);
  const own = participantKeys.length ? await prisma.attributionEvent.findMany({ where: { eventType: LIVE_PLAN_ATTENDANCE_EVENT, participantKey: { in: participantKeys }, occurredAt: { lte: now }, targetType: { in: ['MEETUP', 'SURF_BOAT_CREW'] } }, select: { targetId: true, targetType: true }, orderBy: { occurredAt: 'desc' }, take: 50 }) : [];
  const targets = own.filter((e) => e.targetId).map((e) => ({ targetId: e.targetId!, targetType: e.targetType! }));
  const attendance = targets.length ? await prisma.attributionEvent.findMany({ where: { eventType: LIVE_PLAN_ATTENDANCE_EVENT, OR: targets, occurredAt: { lte: now } }, select: { targetId: true, targetType: true, participantKey: true, occurredAt: true, metadataJson: true }, take: 1000, orderBy: { occurredAt: 'asc' } }) : [];
  // Distinct identities owned by the same wallet are one participant, not buddies.
  const peerIds = [...new Set(attendance.map((row) => row.participantKey?.replace(/^baretag:/, '')).filter((id): id is string => Boolean(id)))];
  const peers = peerIds.length ? await prisma.streamerTag.findMany({ where: { id: { in: peerIds }, revokedAt: null, status: { in: ['ACTIVE', 'VERIFIED'] } }, select: { id: true, walletAddress: true } }) : [];
  const peerOwners = new Map(peers.map((peer) => ['baretag:' + peer.id, peer.walletAddress.toLowerCase()]));
  const grouped = new Map<string, typeof attendance>();
  for (const row of attendance) {
    const meta = row.metadataJson as Record<string, unknown> | null;
    if (!row.participantKey || !peerOwners.has(row.participantKey) || meta?.evidence !== 'participant_self_attestation') continue;
    const key = `${row.targetType}:${row.targetId}`;
    grouped.set(key, [...(grouped.get(key) ?? []), row]);
  }
  const meetupIds = [...new Set(attendance.filter((row) => row.targetType === 'MEETUP').map((row) => row.targetId!))];
  const crewIds = [...new Set(attendance.filter((row) => row.targetType === 'SURF_BOAT_CREW').map((row) => row.targetId!))];
  const [meetups, crews] = await Promise.all([
    meetupIds.length ? prisma.meetup.findMany({ where: { id: { in: meetupIds }, status: 'active', startTime: { lte: now } }, select: { id: true, title: true, placeLabel: true } }) : [],
    crewIds.length ? prisma.surfBoatCrew.findMany({ where: { id: { in: crewIds }, status: { not: 'CANCELLED' } }, select: { id: true, venue: { select: { name: true } } } }) : [],
  ]);
  const meetupById = new Map(meetups.map((plan) => [plan.id, plan]));
  const crewById = new Map(crews.map((plan) => [plan.id, plan]));
  const shared: { id: string; at: Date }[] = [];
  for (const rows of grouped.values()) {
    if (new Set(rows.map((r) => peerOwners.get(r.participantKey!))).size < 2 || !rows.some((r) => participantKeys.includes(r.participantKey!))) continue;
    const row = rows[0];
    if (row.targetType === 'MEETUP') {
      const plan = meetupById.get(row.targetId!);
      if (!plan) continue;
      result.memories.push({ id: `meetup:${row.targetId}`, title: plan.title, place: plan.placeLabel, href: `/community/meet/${row.targetId}`, occurredAt: rows.at(-1)!.occurredAt.toISOString(), evidence: 'crew' });
    } else {
      const plan = crewById.get(row.targetId!);
      if (!plan) continue;
      result.memories.push({ id: `boat:${row.targetId}`, title: 'A crew outing', place: plan.venue?.name || 'Boat crew', href: `/community/boat/${row.targetId}`, occurredAt: rows.at(-1)!.occurredAt.toISOString(), evidence: 'crew' });
    }
    shared.push({ id: `${row.targetType}:${row.targetId}`, at: rows.at(-1)!.occurredAt });
  }
  result.achievements.push(achievement('together', 'Went together', 'Two distinct joined participants confirmed the same outing. Crew-reported, not GPS-verified attendance.', 'crew', shared.sort((a,b) => a.at.getTime()-b.at.getTime()), 1));
  result.memories.sort((a,b) => Date.parse(b.occurredAt)-Date.parse(a.occurredAt));
  result.perks = result.perks.slice(0, 20);
  return result;
}
