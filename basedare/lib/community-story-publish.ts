import 'server-only';
import { createHash } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from './prisma';
import { resolveHostBaretag } from './meetups-server';
import { STORY_CONSENT, record } from './community-stories';
import { socialError } from './social-request';
const Body = z.object({ title: z.string().trim().min(3).max(140), notes: z.string().trim().min(3).max(700), venueSlug: z.string().regex(/^[a-z0-9-]{0,100}$/).default(''), walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/), submissionKey: z.string().uuid(), publicConsentVersion: z.literal(STORY_CONSENT), city: z.string().trim().min(2).max(100), latitude: z.number().min(-90).max(90), longitude: z.number().min(-180).max(180) });
export async function publishCommunityStory(request: NextRequest, raw: unknown) {
  const parsed = Body.safeParse(raw); if (!parsed.success) return socialError('Add a title, your experience, browsing area and permission to display it.');
  const input = parsed.data;
  const author = await resolveHostBaretag(request, input.walletAddress, { action: 'community-post:create', resource: `venue:${input.venueSlug}` });
  if (!author) return socialError('Sign in with your approved Baretag to share an experience.', 401);
  const currentAuthor = await prisma.streamerTag.findUnique({ where: { id: author.id }, select: { walletAddress: true, status: true, revokedAt: true } });
  if (!currentAuthor || currentAuthor.revokedAt || !['ACTIVE', 'VERIFIED'].includes(currentAuthor.status) || currentAuthor.walletAddress.toLowerCase() !== input.walletAddress.toLowerCase()) return socialError('Your account changed. Sign in again.', 401);
  const venue = input.venueSlug ? await prisma.venue.findUnique({ where: { slug: input.venueSlug }, select: { id: true, slug: true, name: true, city: true, latitude: true, longitude: true, status: true } }) : null;
  if (input.venueSlug && venue?.status !== 'ACTIVE') return socialError('Choose an available public place.');
  const fingerprint = createHash('sha256').update(JSON.stringify([input.title, input.notes, input.venueSlug, input.city, input.latitude, input.longitude])).digest('hex');
  const result = await prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${`story-author:${author.id}`}))::text`;
    const key = `community-story:${author.id}:${input.submissionKey}`;
    const previous = await tx.founderEvent.findUnique({ where: { dedupeKey: key } });
    if (previous) return record(previous.metadataJson).fingerprint === fingerprint ? previous : null;
    if (await tx.founderEvent.count({ where: { eventType: 'LOCAL_SIGNAL', subjectType: 'community_story', subjectId: author.id, createdAt: { gte: new Date(Date.now() - 86400000) } } }) >= 5) throw Error('STORY_LIMIT');
    return tx.founderEvent.create({ data: { eventType: 'LOCAL_SIGNAL', source: 'community', subjectType: 'community_story', subjectId: author.id, dedupeKey: key, title: input.title, status: 'NEW', actor: '@' + author.tag.replace(/^@/, ''), venueId: venue?.id, venueSlug: venue?.slug, metadataJson: { postType: 'story', category: 'community', title: input.title, notes: input.notes, authorTagId: author.id, authorWallet: input.walletAddress.toLowerCase(), publicConsentVersion: STORY_CONSENT, consentAt: new Date().toISOString(), fingerprint, venueName: venue?.name ?? '', city: venue?.city || input.city, latitude: venue?.latitude ?? Math.round(input.latitude * 100) / 100, longitude: venue?.longitude ?? Math.round(input.longitude * 100) / 100, startsAt: new Date().toISOString(), sourceAttribution: 'Community experience · self-reported', officialVenueUpdate: false } } });
  });
  if (!result) return socialError('This request code already belongs to different content. Start a new post.', 409);
  if (result.status === 'WITHDRAWN') return socialError('This post was withdrawn. Start a new post to share again.', 409);
  return NextResponse.json({ success: true, data: { id: result.id, status: result.status, href: '/community/posts/' + result.id } }, { headers: { 'Cache-Control': 'private, no-store' } });
}
