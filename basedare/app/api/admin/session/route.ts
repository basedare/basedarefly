import { NextRequest, NextResponse } from 'next/server';

import {
  ADMIN_SESSION_COOKIE_NAME,
  ADMIN_SESSION_TTL_SECONDS,
  createAdminSessionCookieValue,
  isValidAdminSecretCandidate,
} from '@/lib/admin-auth';

export async function POST(request: NextRequest) {
  let adminSecret = '';

  try {
    const body = await request.json();
    adminSecret = typeof body?.adminSecret === 'string' ? body.adminSecret.trim() : '';
  } catch {
    adminSecret = '';
  }

  if (!isValidAdminSecretCandidate(adminSecret)) {
    return NextResponse.json(
      {
        success: false,
        error: 'Unauthorized',
        hint: 'Enter a valid admin secret to start an admin session.',
      },
      { status: 401 }
    );
  }

  const cookieValue = createAdminSessionCookieValue();
  if (!cookieValue) {
    return NextResponse.json(
      {
        success: false,
        error: 'Admin session signing is not configured',
        hint: 'Set ADMIN_SESSION_SECRET, INTERNAL_API_SECRET, or a valid ADMIN_SECRET.',
      },
      { status: 500 }
    );
  }

  const response = NextResponse.json({
    success: true,
    data: {
      expiresInSeconds: ADMIN_SESSION_TTL_SECONDS,
    },
  });

  response.cookies.set(ADMIN_SESSION_COOKIE_NAME, cookieValue, {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: ADMIN_SESSION_TTL_SECONDS,
  });

  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.set(ADMIN_SESSION_COOKIE_NAME, '', {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  });
  return response;
}
