import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { normalizeHandle, type ClaimResult } from '@/lib/pack';
import { getPackBoard, hashMarkWord } from '@/lib/pack-server';

export const dynamic = 'force-dynamic';

const ClaimSchema = z.object({
  handle: z.string().trim().min(1).max(40),
  word: z.string().trim().min(1).max(60),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ pack: string; mark: string }> }) {
  const { pack: packSlug, mark: markSlug } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid request body' }, { status: 400 });
  }
  const parsed = ClaimSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'Pick a handle and enter the word.' }, { status: 400 });
  }
  const handle = normalizeHandle(parsed.data.handle);
  if (!handle) {
    return NextResponse.json({ success: false, error: "That handle won't work — letters and numbers only." }, { status: 400 });
  }

  try {
    const pack = await prisma.pack.findUnique({ where: { slug: packSlug }, select: { id: true } });
    if (!pack) return NextResponse.json({ success: false, error: 'Unknown pack' }, { status: 404 });

    const mark = await prisma.mark.findUnique({
      where: { packId_slug: { packId: pack.id, slug: markSlug } },
      select: { id: true, name: true, wordHash: true },
    });
    if (!mark) return NextResponse.json({ success: false, error: 'Unknown mark' }, { status: 404 });

    // Word check — hash compare only; plaintext is never stored or returned.
    if (hashMarkWord(parsed.data.word) !== mark.wordHash) {
      return NextResponse.json({ success: false, error: "That's not the word on the card — look again 👀" }, { status: 400 });
    }

    // Upsert member by (packId, handle). No auth in v0 — reuse if the handle exists.
    let member = await prisma.packMember.findUnique({
      where: { packId_handle: { packId: pack.id, handle } },
      select: { id: true },
    });
    if (!member) {
      try {
        member = await prisma.packMember.create({ data: { packId: pack.id, handle }, select: { id: true } });
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
          member = await prisma.packMember.findUnique({ where: { packId_handle: { packId: pack.id, handle } }, select: { id: true } });
        } else {
          throw error;
        }
      }
    }
    if (!member) return NextResponse.json({ success: false, error: 'Could not claim — try again.' }, { status: 500 });

    // Claim — idempotent via @@unique([packMemberId, markId, type]); P2002 = already claimed.
    let alreadyClaimed = false;
    try {
      await prisma.packClaim.create({
        data: { packId: pack.id, packMemberId: member.id, markId: mark.id, type: 'claimed', points: 1 },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') alreadyClaimed = true;
      else throw error;
    }

    const board = await getPackBoard(pack.id);
    const total = await prisma.packClaim.aggregate({ where: { packMemberId: member.id }, _sum: { points: true } });
    const myRow = board.find((row) => row.handle === handle);

    const result: ClaimResult = {
      handle,
      points: total._sum.points ?? 0,
      rank: myRow?.rank ?? board.length + 1,
      founding: myRow?.founding ?? true,
      alreadyClaimed,
      markName: mark.name,
      board,
    };
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('[PACK_CLAIM] failed:', error);
    return NextResponse.json({ success: false, error: 'Could not claim — try again.' }, { status: 500 });
  }
}
