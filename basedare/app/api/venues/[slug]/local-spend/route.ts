import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';
import { activeLocalSpendPilot, PilotConfigSchema, PilotRecordSchema } from '@/lib/local-spend-pilot';

type Session = { token?: string; walletAddress?: string | null; user?: { walletAddress?: string | null } | null };
async function context(slug: string) {
  const [venue, session] = await Promise.all([prisma.venue.findUnique({ where: { slug }, select: { id: true, name: true, claimedBy: true, metadataJson: true } }), getServerSession(authOptions) as Promise<Session | null>]);
  const wallet = (session?.walletAddress ?? session?.user?.walletAddress ?? '').toLowerCase();
  return { venue, session, wallet, owner: Boolean(wallet && venue?.claimedBy?.toLowerCase() === wallet) };
}
function root(value: unknown): Record<string, unknown> { return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}; }
export async function GET(_request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { venue, owner } = await context((await params).slug);
    if (!venue) return NextResponse.json({ success: false }, { status: 404 });
    const records = owner ? await prisma.founderEvent.findMany({ where: { venueId: venue.id, eventType: 'local_spend_pilot' }, orderBy: { occurredAt: 'desc' }, take: 30, select: { id: true, status: true, metadataJson: true, occurredAt: true } }) : [];
    return NextResponse.json({ success: true, data: { active: activeLocalSpendPilot(venue.metadataJson), config: owner ? root(venue.metadataJson).localSpendPilot ?? null : undefined, records } }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch { return NextResponse.json({ success: false, error: 'Pilot details could not load.' }, { status: 500 }); }
}
export async function POST(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const { venue, owner, session, wallet } = await context(slug);
    if (!venue || !owner) return NextResponse.json({ success: false, error: 'Sign in as the venue owner to manage this pilot.' }, { status: 403 });
    if (session?.token && request.headers.get('authorization') !== 'Bearer ' + session.token) return NextResponse.json({ success: false, error: 'Invalid session token.' }, { status: 401 });
    const body = await request.json();
    if (body.action === 'configure') {
      const parsed = PilotConfigSchema.safeParse(body.config);
      if (!parsed.success) return NextResponse.json({ success: false, error: parsed.error.issues[0].message }, { status: 400 });
      await prisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT id FROM "Venue" WHERE id = ${venue.id} FOR UPDATE`;
        const latest = await tx.venue.findUniqueOrThrow({ where: { id: venue.id }, select: { metadataJson: true, claimedBy: true } });
        if (latest.claimedBy?.toLowerCase() !== wallet) throw new Error('Owner changed');
        await tx.venue.update({ where: { id: venue.id }, data: { metadataJson: { ...root(latest.metadataJson), localSpendPilot: parsed.data } as Prisma.InputJsonObject } });
      });
    } else if (body.action === 'record') {
      const parsed = PilotRecordSchema.safeParse(body.record);
      if (!parsed.success) return NextResponse.json({ success: false, error: parsed.error.issues[0].message }, { status: 400 });
      if (!activeLocalSpendPilot(venue.metadataJson)) return NextResponse.json({ success: false, error: 'Configure a current tested pilot first.' }, { status: 409 });
      const record = parsed.data;
      await prisma.founderEvent.upsert({
        where: { dedupeKey: `local-spend:${venue.id}:${record.recordId}` }, update: {},
        create: { eventType: 'local_spend_pilot', source: 'venue-operator', dedupeKey: `local-spend:${venue.id}:${record.recordId}`,
          title: venue.name, venueId: venue.id, venueSlug: slug, actor: wallet, status: record.evidence,
          metadataJson: { ...record, confirmationMethod: 'manual_operator_entry', provider: 'YODL' }, },
      });
    } else return NextResponse.json({ success: false, error: 'Unknown action.' }, { status: 400 });
    return NextResponse.json({ success: true });
  } catch { return NextResponse.json({ success: false, error: 'Pilot update failed. Please retry.' }, { status: 500 }); }
}
