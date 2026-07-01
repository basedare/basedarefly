import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isMeetupExpired } from '@/lib/meetups';
import { resolveSessionBaretag } from '@/lib/meetups-server';

// POST /api/meetups/[id]/rsvp — Baretag-gated, idempotent RSVP. No value released.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const baretag = await resolveSessionBaretag(request);
  if (!baretag) {
    return NextResponse.json(
      { success: false, error: 'Claim and verify a Baretag to RSVP.' },
      { status: 401 }
    );
  }

  try {
    const meetup = await prisma.meetup.findUnique({
      where: { id },
      select: { id: true, status: true, startTime: true },
    });
    if (!meetup) {
      return NextResponse.json({ success: false, error: 'Meetup not found' }, { status: 404 });
    }
    if (meetup.status !== 'active') {
      return NextResponse.json({ success: false, error: 'Meetup is not active' }, { status: 400 });
    }
    if (isMeetupExpired(meetup.startTime)) {
      return NextResponse.json({ success: false, error: 'This meetup has ended.' }, { status: 400 });
    }

    await prisma.meetupRsvp.upsert({
      where: { meetupId_baretagId: { meetupId: id, baretagId: baretag.id } },
      create: { meetupId: id, baretagId: baretag.id },
      update: {},
    });

    const count = await prisma.meetupRsvp.count({ where: { meetupId: id } });
    return NextResponse.json({ success: true, data: { rsvped: true, count } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[MEETUPS] RSVP failed:', message);
    return NextResponse.json({ success: false, error: 'Failed to RSVP' }, { status: 500 });
  }
}
