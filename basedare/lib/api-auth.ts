import { NextRequest, NextResponse } from 'next/server';

function timingSafeEqualStrings(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i += 1) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

/**
 * Non-throwing/internal convenience check.
 * Returns true when Authorization bearer token matches INTERNAL_API_SECRET.
 */
export function isInternalApiAuthorized(req: NextRequest): boolean {
  const secret = process.env.INTERNAL_API_SECRET || process.env.ADMIN_SECRET;
  if (!secret) return false;

  const authHeader = req.headers.get('Authorization');
  const token = authHeader?.replace(/^Bearer\s+/i, '').trim() || '';
  if (!token) return false;

  return timingSafeEqualStrings(token, secret);
}

/**
 * Verify internal API key from Authorization header.
 * Fail-closed: if INTERNAL_API_SECRET env var is unset, reject all requests.
 * Returns null if authorized, or a NextResponse with 401/503 if not.
 */
export function verifyInternalApiKey(req: NextRequest): NextResponse | null {
  const secret = process.env.INTERNAL_API_SECRET || process.env.ADMIN_SECRET;

  if (!secret) {
    console.error('[AUTH] INTERNAL_API_SECRET/ADMIN_SECRET not configured — rejecting request (fail-closed)');
    return NextResponse.json(
      { success: false, error: 'Service unavailable' },
      { status: 503 }
    );
  }

  if (!isInternalApiAuthorized(req)) {
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
