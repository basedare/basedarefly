import { NextRequest, NextResponse } from 'next/server';
import { isAddress } from 'viem';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { socialWallet, sameOrigin } from '@/lib/social-request';
import { canonicalPersonalProgress } from '@/lib/passport-progression';
import { getPassportEvidence } from '@/lib/passport-evidence-server';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import type { Prisma } from '@prisma/client';
export const dynamic = 'force-dynamic';
const reply = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'private, no-store', Vary: 'Cookie, Authorization' } });
const fail = (error: string, status: number) => reply({ success: false, error }, status);
const walletSchema = z.string().refine(isAddress).transform((v) => v.toLowerCase());
const bodySchema = z.object({ wallet: walletSchema, revision: z.number().int().min(0), progress: z.object({ runs: z.array(z.unknown()).max(30) }) });
export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams;
  const parsed = z.object({ lat: z.coerce.number().min(-90).max(90).default(9.791), lng: z.coerce.number().min(-180).max(180).default(126.158) }).safeParse(Object.fromEntries(query));
  if (!parsed.success) return fail('Choose a valid map area.', 400);
  if (!checkRateLimit(`passport-read:${getClientIp(req)}`, { limit: 60, windowMs: 60_000 }).allowed) return fail('Please wait before refreshing.', 429);
  try {
    const requested = query.get('wallet');
    const wallet = requested ? await socialWallet(req, requested, 'passport:read') : null;
    if (requested && !wallet) return fail('Verify your account to open its private Passport.', 401);
    const [journal, evidence] = await Promise.all([wallet ? prisma.adventureJournal.findUnique({ where: { walletAddress: wallet } }) : null, getPassportEvidence(wallet, parsed.data)]);
    return reply({ success: true, data: { journal: journal ? { revision: journal.revision, progress: canonicalPersonalProgress(journal.progressJson), updatedAt: journal.updatedAt.toISOString() } : null, evidence } });
  } catch { return fail('Your Passport could not load. Device memories are still available. Please retry.', 503); }
}
export async function PUT(req: NextRequest) {
  if (!sameOrigin(req)) return fail('Invalid origin.', 403);
  if (Number(req.headers.get('content-length')) > 64_000) return fail('Keep the latest 30 adventure runs.', 413);
  const body = await req.text();
  if (body.length > 64_000) return fail('Keep the latest 30 adventure runs.', 413);
  let input: unknown;
  try { input = JSON.parse(body); } catch { return fail('Invalid journal.', 400); }
  const parsed = bodySchema.safeParse(input);
  if (!parsed.success) return fail('A valid account, revision and up to 30 runs are required.', 400);
  try {
    const wallet = await socialWallet(req, parsed.data.wallet, 'passport:save');
    if (!wallet) return fail('Verify your account before saving.', 401);
    if (!checkRateLimit(`passport-save:${wallet}`, { limit: 40, windowMs: 60_000 }).allowed) return fail('Please wait before saving again.', 429);
    const progress = canonicalPersonalProgress(parsed.data.progress);
    if (progress.runs.length !== parsed.data.progress.runs.length) return fail('Some adventure runs are invalid. Export the device record before retrying.', 400);
    const result = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`passport:${wallet}`}))`;
      const old = await tx.adventureJournal.findUnique({ where: { walletAddress: wallet } });
      if ((old?.revision ?? 0) !== parsed.data.revision) return null;
      return tx.adventureJournal.upsert({ where: { walletAddress: wallet }, create: { walletAddress: wallet, revision: 1, progressJson: progress as unknown as Prisma.InputJsonObject }, update: { revision: { increment: 1 }, progressJson: progress as unknown as Prisma.InputJsonObject } });
    });
    if (!result) return fail('Your saved record changed on another device. Load and merge before saving again.', 409);
    return reply({ success: true, data: { revision: result.revision, progress, updatedAt: result.updatedAt.toISOString() } });
  } catch { return fail('Account saving failed. Your device record has not been removed.', 503); }
}
export async function DELETE(req: NextRequest) {
  if (!sameOrigin(req)) return fail('Invalid origin.', 403);
  const parsed = z.object({ wallet: walletSchema, revision: z.number().int().min(1) }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail('A valid account revision is required.', 400);
  try {
    const wallet = await socialWallet(req, parsed.data.wallet, 'passport:delete');
    if (!wallet) return fail('Verify your account before removing its saved journal.', 401);
    // Retain the revision tombstone so stale writes cannot revive cleared memories.
    const removed = await prisma.adventureJournal.updateMany({ where: { walletAddress: wallet, revision: parsed.data.revision }, data: { progressJson: { runs: [] }, revision: { increment: 1 } } });
    if (!removed.count) return fail('The saved record changed. Load it again before removing it.', 409);
    return reply({ success: true, data: { revision: parsed.data.revision + 1 } });
  } catch { return fail('The saved record could not be removed.', 503); }
}
