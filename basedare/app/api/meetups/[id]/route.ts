import { NextResponse } from 'next/server';

import { getMeetupPlan } from '@/lib/meetup-plan-server';
import { resolveViewerBaretag } from '@/lib/meetups-server';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const [{ id }, viewer] = await Promise.all([params, resolveViewerBaretag()]);
    const plan = await getMeetupPlan(id, { viewerBaretagId: viewer?.id });
    if (!plan) {
      return NextResponse.json({ success: false, error: 'Meetup not found.' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: { plan } });
  } catch (error) {
    console.error('[MEETUP_PLAN] GET failed:', error);
    return NextResponse.json({ success: false, error: 'Meetup unavailable.' }, { status: 500 });
  }
}
