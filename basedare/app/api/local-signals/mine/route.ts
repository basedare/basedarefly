import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { socialWallet, socialError } from '@/lib/social-request';
export async function GET(request: NextRequest) {
  const wallet = await socialWallet(request, request.nextUrl.searchParams.get('wallet'), 'community-post:manage');
  if (!wallet) return socialError('Sign in to view your posts.', 401);
  try {
    const rows = await prisma.founderEvent.findMany({ where: { eventType: 'LOCAL_SIGNAL', subjectType: 'community_story', metadataJson: { path: ['authorWallet'], equals: wallet.toLowerCase() } }, orderBy: { createdAt: 'desc' }, take: 30 });
    return NextResponse.json({ success: true, data: rows.map(r => ({ id: r.id, title: r.title, status: r.status, href: '/community/posts/' + r.id, createdAt: r.createdAt })) }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch { return socialError('Your posts could not load. Retry.', 503); }
}
