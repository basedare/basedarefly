import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getDrop } from '@/lib/drops';
import { getDropWhatsappUrl, getRosterView } from '@/lib/drops-server';

export const dynamic = 'force-dynamic';

const RsvpSchema = z.object({
  handle: z.string().trim().min(1).max(40),
  contact: z.string().trim().min(3).max(80),
  gamePref: z.enum(['pool', 'darts', 'either']).default('either'),
  source: z.string().trim().max(40).optional(),
});

// Defense-in-depth: React escapes on render, but keep stored display text clean.
function clean(value: string): string {
  return value.replace(/[<>]/g, '').trim();
}

/** GET — public roster (count, spots left, handles only). Never returns contact. */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!getDrop(slug)) {
    return NextResponse.json({ success: false, error: 'Unknown drop' }, { status: 404 });
  }
  try {
    const roster = await getRosterView(slug);
    return NextResponse.json({ success: true, data: roster });
  } catch (error) {
    console.error('[DROP_RSVP] roster failed:', error);
    return NextResponse.json({ success: false, error: 'Could not load roster' }, { status: 500 });
  }
}

/** POST — claim a spot. Dedups by contact; fills to capacity then waitlists. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const drop = getDrop(slug);
  if (!drop) {
    return NextResponse.json({ success: false, error: 'Unknown drop' }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid request body' }, { status: 400 });
  }

  const parsed = RsvpSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'Please add your handle and a way to reach you.' }, { status: 400 });
  }

  const handle = clean(parsed.data.handle);
  const contact = clean(parsed.data.contact);
  const gamePref = parsed.data.gamePref;
  const source = parsed.data.source ? clean(parsed.data.source) : null;
  if (!handle || !contact) {
    return NextResponse.json({ success: false, error: 'Please add your handle and a way to reach you.' }, { status: 400 });
  }

  try {
    const existing = await prisma.dropRsvp.findUnique({
      where: { dropSlug_contact: { dropSlug: slug, contact } },
      select: { id: true, status: true },
    });

    let status: 'joined' | 'waitlist';
    if (existing) {
      // Already RSVP'd with this contact — update details, keep their spot.
      status = existing.status === 'waitlist' ? 'waitlist' : 'joined';
      await prisma.dropRsvp.update({
        where: { id: existing.id },
        data: { handle, gamePref, source: source ?? undefined },
      });
    } else {
      const joinedCount = await prisma.dropRsvp.count({ where: { dropSlug: slug, status: 'joined' } });
      status = joinedCount < drop.capacity ? 'joined' : 'waitlist';
      await prisma.dropRsvp.create({
        data: { dropSlug: slug, handle, contact, gamePref, source, status },
      });
    }

    const roster = await getRosterView(slug);
    return NextResponse.json({
      success: true,
      data: {
        status,
        whatsappUrl: getDropWhatsappUrl(), // revealed only here, after RSVP
        roster,
      },
    });
  } catch (error) {
    console.error('[DROP_RSVP] join failed:', error);
    return NextResponse.json({ success: false, error: 'Could not save your spot — try again.' }, { status: 500 });
  }
}
