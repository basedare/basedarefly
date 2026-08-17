import 'server-only';

import { prisma } from '@/lib/prisma';
import { isHappeningNow, isMeetupExpired, type MeetupType } from '@/lib/meetups';
import type { MeetupPlanStatus, MeetupPlanSummary } from '@/lib/meetup-plan';

function deriveStatus(input: { status: string; startTime: Date }, now: Date): MeetupPlanStatus {
  if (input.status !== 'active') return 'CANCELLED';
  if (isMeetupExpired(input.startTime, now.getTime())) return 'ENDED';
  if (isHappeningNow(input.startTime, now.getTime())) return 'HAPPENING';
  return 'ACTIVE';
}

export async function getMeetupPlan(
  meetupId: string,
  options: { viewerBaretagId?: string | null; now?: Date } = {},
): Promise<MeetupPlanSummary | null> {
  const meetup = await prisma.meetup.findUnique({
    where: { id: meetupId },
    include: {
      rsvps: { select: { baretagId: true } },
    },
  });
  if (!meetup) return null;

  const [creator, venue] = await Promise.all([
    prisma.streamerTag.findUnique({
      where: { id: meetup.creatorBaretagId },
      select: { tag: true },
    }),
    meetup.venueId
      ? prisma.venue.findUnique({
          where: { id: meetup.venueId },
          select: { slug: true },
        })
      : Promise.resolve(null),
  ]);
  const now = options.now ?? new Date();

  return {
    id: meetup.id,
    title: meetup.title,
    type: meetup.type as MeetupType,
    placeLabel: meetup.placeLabel,
    venueId: meetup.venueId,
    venueSlug: venue?.slug ?? null,
    approxLat: meetup.approxLat,
    approxLng: meetup.approxLng,
    startTime: meetup.startTime.toISOString(),
    note: meetup.note,
    minimumPeople: meetup.minimumPeople,
    status: deriveStatus(meetup, now),
    creatorTag: creator?.tag ?? null,
    rsvpCount: meetup.rsvps.length,
    viewerRsvped: options.viewerBaretagId
      ? meetup.rsvps.some((rsvp) => rsvp.baretagId === options.viewerBaretagId)
      : false,
  };
}
