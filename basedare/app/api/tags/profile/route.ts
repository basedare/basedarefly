import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getAuthorizedCreatorProfileWallet } from '@/lib/creator-profile-auth-server';

const UpdateTagProfileSchema = z.object({
  tagId: z.string().cuid(),
  bio: z
    .string()
    .max(280, 'Bio must be 280 characters or less.')
    .transform((value) => value.trim())
    .nullable()
    .optional(),
});

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = UpdateTagProfileSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { tagId, bio } = validation.data;
    const sessionWallet = await getAuthorizedCreatorProfileWallet(request, tagId);
    if (!sessionWallet) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const tag = await prisma.streamerTag.findUnique({
      where: { id: tagId },
      select: {
        id: true,
        walletAddress: true,
      },
    });

    if (!tag) {
      return NextResponse.json({ success: false, error: 'Creator tag not found.' }, { status: 404 });
    }

    if (tag.walletAddress.toLowerCase() !== sessionWallet) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const updated = await prisma.streamerTag.update({
      where: { id: tagId },
      data: {
        bio: bio && bio.length > 0 ? bio : null,
      },
      select: {
        id: true,
        tag: true,
        bio: true,
        pfpUrl: true,
        followerCount: true,
        totalEarned: true,
        completedDares: true,
        status: true,
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update creator profile';
    console.error('[TAG_PROFILE] Failed:', message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
