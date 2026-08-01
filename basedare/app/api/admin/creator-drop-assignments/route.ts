import { Prisma } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';

import { authorizeAdminRequest, unauthorizedAdminResponse } from '@/lib/admin-auth';
import {
  buildCreatorDropOutreachCopy,
  CreatorDropAssignmentInputSchema,
  CreatorDropAssignmentUpdateSchema,
  creatorDropAssignmentVerdict,
  nextCreatorDropAssignmentStatus,
  normalizeCreatorAssignmentCode,
  normalizeCreatorDropAssignmentInput,
  normalizeCreatorDropAssignmentStatus,
} from '@/lib/creator-drop-assignments';
import { parseCreatorDropMetadata } from '@/lib/creator-drops';
import { prisma } from '@/lib/prisma';

const noStoreHeaders = {
  'Cache-Control': 'private, no-store, max-age=0',
  'X-Robots-Tag': 'noindex, nofollow',
};

const linkSelect = {
  id: true,
  slug: true,
  creatorCode: true,
  contentCode: true,
  campaignCode: true,
  targetType: true,
  targetId: true,
  targetHref: true,
  active: true,
  metadataJson: true,
  createdAt: true,
} satisfies Prisma.CreatorAttributionLinkSelect;

const assignmentSelect = {
  id: true,
  linkId: true,
  creatorCode: true,
  creatorName: true,
  contactChannel: true,
  contactHandle: true,
  status: true,
  priority: true,
  notes: true,
  askText: true,
  followupText: true,
  lastTouchAt: true,
  acceptedAt: true,
  postedAt: true,
  createdBy: true,
  createdAt: true,
  updatedAt: true,
  link: { select: linkSelect },
} satisfies Prisma.CreatorDropAssignmentSelect;

type AssignmentRow = Prisma.CreatorDropAssignmentGetPayload<{ select: typeof assignmentSelect }>;
type LinkRow = NonNullable<AssignmentRow['link']>;

function json(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, {
    ...init,
    headers: {
      ...noStoreHeaders,
      ...(init?.headers ?? {}),
    },
  });
}

async function metricsForLink(link: LinkRow | null) {
  if (!link) {
    return {
      touches: 0,
      intents: 0,
      missionPasses: 0,
      verifiedCompletions: 0,
    };
  }

  const [touches, intents, missionPasses, verifiedCompletions] = await Promise.all([
    prisma.attributionTouch.count({ where: { linkId: link.id } }),
    prisma.actionIntent.count({ where: { targetType: link.targetType, targetId: link.targetId } }),
    prisma.missionPass.count({
      where: { actionIntent: { targetType: link.targetType, targetId: link.targetId } },
    }),
    prisma.attributionEvent.count({
      where: {
        eventType: 'PATH_VERIFIED_COMPLETION',
        creatorCode: link.creatorCode,
        contentCode: link.contentCode,
        targetType: link.targetType,
        targetId: link.targetId,
      },
    }),
  ]);

  return {
    touches,
    intents,
    missionPasses,
    verifiedCompletions,
  };
}

async function summarizeAssignment(row: AssignmentRow, origin: string) {
  const link = row.link;
  const metadata = parseCreatorDropMetadata(link?.metadataJson ?? null);
  const metrics = await metricsForLink(link);
  const status = normalizeCreatorDropAssignmentStatus(row.status);
  const suggestedVerdict = creatorDropAssignmentVerdict(metrics);
  const publicPath = link ? `/go/${link.slug}` : null;
  const publicUrl = publicPath ? `${origin}${publicPath}` : null;
  const activationCopy = metadata && publicUrl
    ? buildCreatorDropOutreachCopy({
        creatorCode: row.creatorCode,
        creatorName: row.creatorName,
        title: metadata.title,
        hook: metadata.hook,
        publicUrl,
        actionLabel: metadata.actionLabel,
        rewardLabel: metadata.rewardLabel,
        creatorBrief: metadata.creatorBrief,
      })
    : row.askText;

  return {
    id: row.id,
    creatorCode: row.creatorCode,
    creatorName: row.creatorName,
    contactChannel: row.contactChannel,
    contactHandle: row.contactHandle,
    status,
    nextStatus: nextCreatorDropAssignmentStatus(status),
    suggestedVerdict,
    priority: row.priority,
    notes: row.notes,
    activationCopy,
    followupText: row.followupText,
    lastTouchAt: row.lastTouchAt?.toISOString() ?? null,
    acceptedAt: row.acceptedAt?.toISOString() ?? null,
    postedAt: row.postedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    link: link && metadata
      ? {
          id: link.id,
          slug: link.slug,
          publicPath,
          publicUrl,
          targetType: link.targetType,
          targetId: link.targetId,
          targetHref: link.targetHref,
          active: link.active,
          metadata,
          createdAt: link.createdAt.toISOString(),
        }
      : null,
    metrics,
  };
}

function requestOrigin(request: NextRequest) {
  const origin = request.headers.get('origin');
  if (origin) return origin;
  const host = request.headers.get('host') ?? 'www.basedare.xyz';
  const proto = request.headers.get('x-forwarded-proto') ?? 'https';
  return `${proto}://${host}`;
}

async function resolveCreatorDropLink(input: { linkId?: string | null; linkSlug?: string | null }) {
  if (input.linkId) {
    return prisma.creatorAttributionLink.findFirst({
      where: { id: input.linkId, targetHref: { startsWith: '/drops/' } },
      select: linkSelect,
    });
  }

  if (input.linkSlug) {
    const slug = normalizeCreatorAssignmentCode(input.linkSlug, 'linkSlug');
    return prisma.creatorAttributionLink.findFirst({
      where: { slug, targetHref: { startsWith: '/drops/' } },
      select: linkSelect,
    });
  }

  return null;
}

export async function GET(request: NextRequest) {
  const auth = await authorizeAdminRequest(request);
  if (!auth.authorized) return unauthorizedAdminResponse(auth);

  const assignments = await prisma.creatorDropAssignment.findMany({
    orderBy: [
      { priority: 'desc' },
      { updatedAt: 'desc' },
    ],
    take: 100,
    select: assignmentSelect,
  });

  const linkedIds = assignments.map((assignment) => assignment.linkId).filter(Boolean) as string[];
  const unassignedLinks = await prisma.creatorAttributionLink.findMany({
    where: {
      targetHref: { startsWith: '/drops/' },
      id: { notIn: linkedIds },
    },
    orderBy: { createdAt: 'desc' },
    take: 20,
    select: linkSelect,
  });

  const origin = requestOrigin(request);
  return json({
    success: true,
    data: {
      generatedAt: new Date().toISOString(),
      assignments: await Promise.all(assignments.map((assignment) => summarizeAssignment(assignment, origin))),
      unassignedDrops: unassignedLinks
        .map((link) => {
          const metadata = parseCreatorDropMetadata(link.metadataJson);
          if (!metadata) return null;
          return {
            id: link.id,
            slug: link.slug,
            creatorCode: link.creatorCode,
            publicPath: `/go/${link.slug}`,
            publicUrl: `${origin}/go/${link.slug}`,
            targetType: link.targetType,
            targetId: link.targetId,
            metadata,
          };
        })
        .filter(Boolean),
    },
  });
}

export async function POST(request: NextRequest) {
  const auth = await authorizeAdminRequest(request);
  if (!auth.authorized) return unauthorizedAdminResponse(auth);

  try {
    const input = normalizeCreatorDropAssignmentInput(CreatorDropAssignmentInputSchema.parse(await request.json()));
    const link = await resolveCreatorDropLink(input);

    if ((input.linkId || input.linkSlug) && !link) {
      return json({ success: false, error: 'Creator drop link not found.' }, { status: 404 });
    }

    const metadata = parseCreatorDropMetadata(link?.metadataJson ?? null);
    const publicUrl = link ? `${requestOrigin(request)}/go/${link.slug}` : null;
    const askText = metadata && publicUrl
      ? buildCreatorDropOutreachCopy({
          creatorCode: input.creatorCode,
          creatorName: input.creatorName,
          title: metadata.title,
          hook: metadata.hook,
          publicUrl,
          actionLabel: metadata.actionLabel,
          rewardLabel: metadata.rewardLabel,
          creatorBrief: metadata.creatorBrief,
        })
      : null;

    const assignment = await prisma.creatorDropAssignment.create({
      data: {
        linkId: link?.id ?? null,
        creatorCode: input.creatorCode,
        creatorName: input.creatorName,
        contactChannel: input.contactChannel,
        contactHandle: input.contactHandle,
        status: input.status,
        priority: input.priority,
        notes: input.notes,
        askText,
        createdBy: auth.walletAddress,
      },
      select: assignmentSelect,
    });

    return json(
      { success: true, data: await summarizeAssignment(assignment, requestOrigin(request)) },
      { status: 201 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unable to create creator drop assignment.';
    return json({ success: false, error: message }, { status: 400 });
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await authorizeAdminRequest(request);
  if (!auth.authorized) return unauthorizedAdminResponse(auth);

  try {
    const input = CreatorDropAssignmentUpdateSchema.parse(await request.json());
    const now = new Date();
    const status = input.status ? normalizeCreatorDropAssignmentStatus(input.status) : undefined;

    const assignment = await prisma.creatorDropAssignment.update({
      where: { id: input.id },
      data: {
        ...(status ? { status } : {}),
        ...(input.notes !== undefined ? { notes: input.notes?.trim() || null } : {}),
        ...(input.priority !== undefined && input.priority !== null ? { priority: input.priority } : {}),
        ...(input.markTouched || status === 'SENT' ? { lastTouchAt: now } : {}),
        ...(status === 'ACCEPTED' ? { acceptedAt: now } : {}),
        ...(status === 'POSTED' ? { postedAt: now } : {}),
      },
      select: assignmentSelect,
    });

    return json({ success: true, data: await summarizeAssignment(assignment, requestOrigin(request)) });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unable to update creator drop assignment.';
    return json({ success: false, error: message }, { status: 400 });
  }
}
