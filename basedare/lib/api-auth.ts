import { NextRequest, NextResponse } from 'next/server';

/**
 * Verify internal API key from Authorization header.
 * Fail-closed: if INTERNAL_API_SECRET env var is unset, reject all requests.
 * Returns null if authorized, or a NextResponse with 401/503 if not.
 */
export function verifyInternalApiKey(req: NextRequest): NextResponse | null {
  const secret = process.env.INTERNAL_API_SECRET;

  if (!secret) {
    console.error('[AUTH] INTERNAL_API_SECRET not configured — rejecting request (fail-closed)');
    return NextResponse.json(
      { success: false, error: 'Service unavailable' },
      { status: 503 }
    );
  }

  const authHeader = req.headers.get('Authorization');
  const token = authHeader?.replace('Bearer ', '');

  if (!token || token !== secret) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  return null;
}

/**
 * Verify cron secret from Authorization header.
 * Fail-closed: if CRON_SECRET env var is unset, reject all requests.
 * Returns null if authorized, or a NextResponse with 401/503 if not.
 */
export function verifyCronSecret(req: NextRequest): NextResponse | null {
  const secret = process.env.CRON_SECRET;

  if (!secret) {
    console.error('[AUTH] CRON_SECRET not configured — rejecting request (fail-closed)');
    return NextResponse.json(
      { success: false, error: 'Service unavailable' },
      { status: 503 }
    );
  }

  const authHeader = req.headers.get('Authorization');
  const token = authHeader?.replace('Bearer ', '');

  if (!token || token !== secret) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  return null;
}
