import { NextRequest, NextResponse } from 'next/server';

import { authorizeAdminRequest, unauthorizedAdminResponse } from '@/lib/admin-auth';
import { ensureCuratedVenueRecords } from '@/lib/curated-venues';
import { WAKEPARK_SUNDAY_FUNDAY_RITUAL } from '@/lib/local-rituals';
import { getVenueRitualsBySlug } from '@/lib/local-rituals-server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  const auth = await authorizeAdminRequest(request);
  if (!auth.authorized) return unauthorizedAdminResponse(auth);
  try {
    const body = await request.json() as { preset?: string };
    if (body.preset !== 'WAKEPARK_SUNDAY_FUNDAY') {
      return NextResponse.json({ success: false, error: 'Unknown ritual preset.' }, { status: 400 });
    }
    const preset = WAKEPARK_SUNDAY_FUNDAY_RITUAL;
    await ensureCuratedVenueRecords([preset.venueSlug]);
    const venue = await prisma.venue.findUnique({
      where: { slug: preset.venueSlug },
      select: { id: true },
    });
    if (!venue) throw new Error('Wakepark venue record could not be created.');
    await prisma.venueRitual.upsert({
      where: { slug: preset.slug },
      update: {
        venueId: venue.id,
        title: preset.title,
        summary: preset.summary,
        weekday: preset.weekday,
        startLocalMinutes: preset.startLocalMinutes,
        endLocalMinutes: preset.endLocalMinutes,
        timezone: preset.timezone,
        sourceKind: preset.sourceKind,
        sourceLabel: preset.sourceLabel,
        sourceUrl: preset.sourceUrl,
        sourceLastConfirmedAt: preset.sourceLastConfirmedAt,
        freshnessExpiresAt: preset.freshnessExpiresAt,
        status: 'ACTIVE',
        permissionStatus: preset.permissionStatus,
        offerLabel: preset.offerLabel,
        createdBy: auth.walletAddress,
      },
      create: {
        venueId: venue.id,
        slug: preset.slug,
        title: preset.title,
        summary: preset.summary,
        weekday: preset.weekday,
        startLocalMinutes: preset.startLocalMinutes,
        endLocalMinutes: preset.endLocalMinutes,
        timezone: preset.timezone,
        sourceKind: preset.sourceKind,
        sourceLabel: preset.sourceLabel,
        sourceUrl: preset.sourceUrl,
        sourceLastConfirmedAt: preset.sourceLastConfirmedAt,
        freshnessExpiresAt: preset.freshnessExpiresAt,
        permissionStatus: preset.permissionStatus,
        offerLabel: preset.offerLabel,
        createdBy: auth.walletAddress,
      },
    });
    return NextResponse.json({
      success: true,
      data: { rituals: await getVenueRitualsBySlug(preset.venueSlug) },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to seed ritual.';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
