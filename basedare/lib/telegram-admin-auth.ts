import 'server-only';

import { NextRequest, NextResponse } from 'next/server';

const TELEGRAM_ADMIN_SECRET = process.env.TELEGRAM_ADMIN_SECRET;

export function hasValidTelegramAdminSecret(req: NextRequest): boolean {
  if (!TELEGRAM_ADMIN_SECRET || TELEGRAM_ADMIN_SECRET.length < 32) {
    return false;
  }

  const authHeader = req.headers.get('authorization');
  const bearerToken = authHeader?.startsWith('Bearer ')
    ? authHeader.slice('Bearer '.length).trim()
    : null;
  const headerSecret = req.headers.get('x-telegram-admin-secret');
  const candidate = bearerToken || headerSecret;

  if (!candidate || candidate.length !== TELEGRAM_ADMIN_SECRET.length) {
    return false;
  }

  let mismatch = 0;
  for (let index = 0; index < candidate.length; index += 1) {
    mismatch |= candidate.charCodeAt(index) ^ TELEGRAM_ADMIN_SECRET.charCodeAt(index);
  }

  return mismatch === 0;
}

export function forbiddenTelegramAdminResponse() {
  return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
}
