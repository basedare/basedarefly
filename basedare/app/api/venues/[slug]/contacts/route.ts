import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { authOptions } from '@/lib/auth-options';
import { authorizeAdminRequest } from '@/lib/admin-auth';
import { prisma } from '@/lib/prisma';
import {
  normalizeVenueContactRoute,
  VENUE_CONTACT_CHANNELS,
} from '@/lib/venue-contact-routes';

export const dynamic = 'force-dynamic';

type VenueContactSession = {
  token?: string | null;
  walletAddress?: string | null;
  user?: {
    walletAddress?: string | null;
  } | null;
};

const ContactRouteSchema = z.object({
  channel: z.enum(VENUE_CONTACT_CHANNELS),
  label: z.string().trim().min(1).max(48),
  purpose: z.string().trim().max(120).optional().nullable(),
  url: z.string().trim().min(1).max(600),
  responseHours: z.string().trim().max(80).optional().nullable(),
  isPersonal: z.boolean().optional().default(false),
  consentConfirmed: z.boolean().optional().default(false),
});

const ReplaceContactRoutesSchema = z.object({
  contacts: z.array(ContactRouteSchema).max(8),
});

function getSessionWallet(session: VenueContactSession | null) {
  return (session?.walletAddress ?? session?.user?.walletAddress ?? '').trim().toLowerCase();
}

function serializeContactRoute(route: {
  id: string;
  channel: string;
  label: string;
  purpose: string | null;
  url: string;
  responseHours: string | null;
  source: string;
  lastConfirmedAt: Date | null;
}) {
  return {
    id: route.id,
    channel: route.channel,
    label: route.label,
    purpose: route.purpose,
    url: route.url,
    responseHours: route.responseHours,
    source: route.source,
    lastConfirmedAt: route.lastConfirmedAt!.toISOString(),
  };
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const venue = await prisma.venue.findUnique({
      where: { slug },
      select: {
        name: true,
        contactRoutes: {
          where: {
            active: true,
            isPublic: true,
            verificationStatus: 'VERIFIED',
            lastConfirmedAt: { not: null },
          },
          orderBy: [{ sortOrder: 'asc' }, { lastConfirmedAt: 'desc' }],
          select: {
            id: true,
            channel: true,
            label: true,
            purpose: true,
            url: true,
            responseHours: true,
            source: true,
            lastConfirmedAt: true,
          },
        },
      },
    });

    if (!venue) {
      return NextResponse.json({ success: false, error: 'Venue not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        venueName: venue.name,
        contacts: venue.contactRoutes.map(serializeContactRoute),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[VENUE_CONTACTS] Read failed:', message);
    return NextResponse.json({ success: false, error: 'Failed to load venue contacts' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const body = await request.json();
    const parsed = ReplaceContactRoutesSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid contact routes' },
        { status: 400 }
      );
    }

    const normalizedContacts = parsed.data.contacts.map((contact) => normalizeVenueContactRoute(contact));
    const invalidIndex = normalizedContacts.findIndex((contact) => contact === null);
    if (invalidIndex >= 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Contact ${invalidIndex + 1} has an invalid channel URL or is missing personal-contact consent.`,
        },
        { status: 400 }
      );
    }

    const contacts = normalizedContacts.filter((contact): contact is NonNullable<typeof contact> => Boolean(contact));
    if (new Set(contacts.map((contact) => `${contact.channel}:${contact.url}`)).size !== contacts.length) {
      return NextResponse.json({ success: false, error: 'Duplicate contact route' }, { status: 400 });
    }

    const venue = await prisma.venue.findUnique({
      where: { slug },
      select: { id: true, claimedBy: true },
    });
    if (!venue) {
      return NextResponse.json({ success: false, error: 'Venue not found' }, { status: 404 });
    }

    const adminAuth = await authorizeAdminRequest(request);
    const adminHeaderAttempted = request.headers.has('x-admin-secret');
    if (adminHeaderAttempted && !adminAuth.authorized) {
      return NextResponse.json({ success: false, error: 'Invalid admin authorization' }, { status: 401 });
    }

    const session = (await getServerSession(authOptions)) as VenueContactSession | null;
    const walletAddress = getSessionWallet(session);
    const sessionToken = session?.token?.trim();
    const bearerToken = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim();
    const sessionTokenValid = !sessionToken || bearerToken === sessionToken;
    const ownerAuthorized = Boolean(
      session &&
      sessionTokenValid &&
      walletAddress &&
      venue.claimedBy?.toLowerCase() === walletAddress
    );

    if (!adminAuth.authorized && !ownerAuthorized) {
      return NextResponse.json(
        { success: false, error: 'Only the claimed venue wallet or a BaseDare moderator can edit official contacts' },
        { status: 403 }
      );
    }

    const actor = adminAuth.authorized ? adminAuth.walletAddress : walletAddress;
    const source = adminAuth.authorized ? 'BASEDARE_ADMIN_REVIEW' : 'VENUE_OWNER_SUBMISSION';
    const now = new Date();

    const savedContacts = await prisma.$transaction(async (tx) => {
      await tx.venueContactRoute.updateMany({
        where: { venueId: venue.id, active: true },
        data: { active: false, isPublic: false },
      });

      if (contacts.length === 0) return [];

      await tx.venueContactRoute.createMany({
        data: contacts.map((contact, index) => ({
          venueId: venue.id,
          channel: contact.channel,
          label: contact.label,
          purpose: contact.purpose,
          url: contact.url,
          responseHours: contact.responseHours,
          source,
          sourceUrl: null,
          consentBasis: contact.consentBasis,
          isPersonal: contact.isPersonal,
          isPublic: true,
          active: true,
          verificationStatus: 'VERIFIED',
          verifiedAt: now,
          verifiedBy: actor,
          lastConfirmedAt: now,
          sortOrder: index,
          createdBy: actor,
        })),
      });

      return tx.venueContactRoute.findMany({
        where: {
          venueId: venue.id,
          active: true,
          isPublic: true,
          verificationStatus: 'VERIFIED',
          lastConfirmedAt: { not: null },
        },
        orderBy: [{ sortOrder: 'asc' }, { lastConfirmedAt: 'desc' }],
        select: {
          id: true,
          channel: true,
          label: true,
          purpose: true,
          url: true,
          responseHours: true,
          source: true,
          lastConfirmedAt: true,
        },
      });
    });

    return NextResponse.json({
      success: true,
      data: { contacts: savedContacts.map(serializeContactRoute) },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[VENUE_CONTACTS] Update failed:', message);
    return NextResponse.json({ success: false, error: 'Failed to update venue contacts' }, { status: 500 });
  }
}
