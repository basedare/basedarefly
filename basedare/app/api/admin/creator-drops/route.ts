import { Prisma } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { authorizeAdminRequest, unauthorizedAdminResponse } from '@/lib/admin-auth';
import {
  buildCreatorDropLandingHref,
  buildCreatorDropMetadata,
  buildCreatorDropShareText,
  parseCreatorDropMetadata,
} from '@/lib/creator-drops';
import {
  normalizeAttributionCode,
  normalizeTargetId,
  normalizeTargetType,
} from '@/lib/creator-attribution-policy';
import { prisma } from '@/lib/prisma';

const CreatorDropSchema = z.object({
  slug: z.string().min(1).max(64),
  creatorCode: z.string().min(1).max(64),
  contentCode: z.string().min(1).max(64),
  campaignCode: z.string().max(64).optional().nullable(),
  targetType: z.string().min(1).max(20),
  targetId: z.string().min(1).max(191),
  actionHref: z.string().min(1).max(1024),
  title: z.string().min(1).max(120),
  hook: z.string().min(1).max(260),
  category: z.string().min(1).max(40),
  actionLabel: z.string().max(40).optional().nullable(),
  rewardLabel: z.string().max(60).optional().nullable(),
  cityLabel: z.string().max(70).optional().nullable(),
  creatorBrief: z.string().max(360).optional().nullable(),
  suggestedCaption: z.string().max(420).optional().nullable(),
  proofPrompt: z.string().max(260).optional().nullable(),
  participationOwner: z.boolean().optional().default(false),
});

async function assertTargetExists(targetType: string, targetId: string) {
  if (targetType === 'DARE') {
    const dare = await prisma.dare.findUnique({ where: { id: targetId }, select: { id: true } });
    if (!dare) throw new Error('Tracked Dare target not found.');
  }

  if (targetType === 'MEETUP') {
    const meetup = await prisma.meetup.findUnique({ where: { id: targetId }, select: { id: true } });
    if (!meetup) throw new Error('Tracked meetup target not found.');
  }
}

async function summarizeCreatorDropLink(link: {
  id: string;
  slug: string;
  creatorCode: string;
  contentCode: string;
  campaignCode: string | null;
  targetType: string;
  targetId: string;
  targetHref: string;
  participationOwner: boolean;
  active: boolean;
  createdAt: Date;
  metadataJson: Prisma.JsonValue | null;
}) {
  const metadata = parseCreatorDropMetadata(link.metadataJson);
  if (!metadata) return null;

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
    id: link.id,
    slug: link.slug,
    creatorCode: link.creatorCode,
    contentCode: link.contentCode,
    campaignCode: link.campaignCode,
    targetType: link.targetType,
    targetId: link.targetId,
    landingPath: link.targetHref,
    actionHref: metadata.actionHref,
    publicPath: `/go/${link.slug}`,
    participationOwner: link.participationOwner,
    active: link.active,
    createdAt: link.createdAt.toISOString(),
    metadata,
    metrics: {
      touches,
      intents,
      missionPasses,
      verifiedCompletions,
    },
  };
}

export async function GET(request: NextRequest) {
  const auth = await authorizeAdminRequest(request);
  if (!auth.authorized) return unauthorizedAdminResponse(auth);

  const links = await prisma.creatorAttributionLink.findMany({
    where: {
      targetHref: { startsWith: '/drops/' },
    },
    orderBy: { createdAt: 'desc' },
    take: 80,
    select: {
      id: true,
      slug: true,
      creatorCode: true,
      contentCode: true,
      campaignCode: true,
      targetType: true,
      targetId: true,
      targetHref: true,
      participationOwner: true,
      active: true,
      createdAt: true,
      metadataJson: true,
    },
  });

  const drops = (await Promise.all(links.map(summarizeCreatorDropLink))).filter((drop): drop is NonNullable<typeof drop> => Boolean(drop));
  return NextResponse.json({ success: true, data: { generatedAt: new Date().toISOString(), drops } });
}

export async function POST(request: NextRequest) {
  const auth = await authorizeAdminRequest(request);
  if (!auth.authorized) return unauthorizedAdminResponse(auth);

  try {
    const body = CreatorDropSchema.parse(await request.json());
    const slug = normalizeAttributionCode(body.slug, 'drop slug');
    const creatorCode = normalizeAttributionCode(body.creatorCode, 'creatorCode');
    const contentCode = normalizeAttributionCode(body.contentCode, 'contentCode');
    const campaignCode = body.campaignCode ? normalizeAttributionCode(body.campaignCode, 'campaignCode') : null;
    const targetType = normalizeTargetType(body.targetType);
    const targetId = normalizeTargetId(body.targetId);
    const metadata = buildCreatorDropMetadata(body);
    const targetHref = buildCreatorDropLandingHref(slug);

    await assertTargetExists(targetType, targetId);

    if (body.participationOwner) {
      const existingOwner = await prisma.creatorAttributionLink.findFirst({
        where: {
          targetType,
          targetId,
          active: true,
          participationOwner: true,
        },
        select: { creatorCode: true, slug: true },
      });
      if (existingOwner) {
        return NextResponse.json(
          { success: false, error: `This target already has participation owner @${existingOwner.creatorCode} via /go/${existingOwner.slug}.` },
          { status: 409 }
        );
      }
    }

    const link = await prisma.creatorAttributionLink.create({
      data: {
        slug,
        creatorCode,
        contentCode,
        campaignCode,
        targetType,
        targetId,
        targetHref,
        metadataJson: metadata as Prisma.InputJsonValue,
        participationOwner: body.participationOwner,
        createdBy: auth.walletAddress,
      },
      select: {
        id: true,
        slug: true,
        creatorCode: true,
        contentCode: true,
        campaignCode: true,
        targetType: true,
        targetId: true,
        targetHref: true,
        participationOwner: true,
        active: true,
        createdAt: true,
        metadataJson: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          ...(await summarizeCreatorDropLink(link)),
          shareText: buildCreatorDropShareText({
            creatorCode,
            title: metadata.title,
            hook: metadata.hook,
            rewardLabel: metadata.rewardLabel,
          }),
        },
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unable to create creator drop.';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
