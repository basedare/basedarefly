import { NextResponse } from 'next/server';

import { getPushClientConfig } from '@/lib/web-push';

export const revalidate = 300;

export async function GET() {
  const config = getPushClientConfig();

  return NextResponse.json(
    {
      success: true,
      publicKey: config.publicKey,
      configured: config.configured,
      clientConfigured: config.clientConfigured,
      deliveryConfigured: config.deliveryConfigured,
      publicKeyConfigured: config.publicKeyConfigured,
      privateKeyConfigured: config.privateKeyConfigured,
      publicKeySource: config.publicKeySource,
      subject: config.subject,
    },
    {
      headers: {
        'Cache-Control': 'public, max-age=300, stale-while-revalidate=1800',
      },
    }
  );
}
