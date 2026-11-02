import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { boundedRequestBytes } from '@/lib/bounded-request';
import { sameOrigin, socialError } from '@/lib/social-request';
import { updateConsent } from '@/lib/retention';
export async function POST(request: NextRequest) {
  if (!sameOrigin(request) || !request.headers.get('origin')) return socialError('Invalid origin.', 403);
  try {
    const body = z.object({ token: z.string().max(100), action: z.enum(['confirm', 'unsubscribe']) }).parse(JSON.parse(new TextDecoder().decode(await boundedRequestBytes(request, 1024))));
    const done = await updateConsent(body.token, body.action);
    return NextResponse.json({ success: done, message: done ? body.action === 'confirm' ? 'Confirmed. Your chosen updates are on.' : 'You’re unsubscribed. Your adventures stay yours.' : 'This link is invalid, expired or has already been used.' }, { status: done ? 200 : 400, headers: { 'Cache-Control': 'private, no-store' } });
  } catch { return socialError('Could not update your preference. Try again.', 503); }
}
