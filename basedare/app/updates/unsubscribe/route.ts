import { NextRequest, NextResponse } from 'next/server';
import { updateConsent } from '@/lib/retention';
function screen(done = false) {
  return new NextResponse(`<!doctype html><html lang="en"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>BaseDare · Email preferences</title><body style="margin:0;background:#080a11;color:#f5f2ea;font:18px system-ui;min-height:100vh;display:grid;place-items:center"><main style="max-width:440px;padding:32px"><p style="color:#e6c34f">BASEDARE</p><h1>${done ? "You’re unsubscribed." : "Your inbox, your call."}</h1><p>${done ? "Optional email updates are off. Your adventures stay yours." : "Stop optional BaseDare updates. Your adventures and account stay yours."}</p>${done ? '<a href="/adventures" style="color:#a5e5ef;display:inline-block;padding:16px 0">Back to adventures →</a>' : '<form method="post"><button style="font:inherit;font-weight:700;background:#f5cb45;color:#15120c;border:0;border-radius:16px;padding:16px 24px;cursor:pointer">Unsubscribe</button></form>'}<p style="font-size:14px;line-height:1.6;color:#aaa">This affects optional updates, not an email you request to recover a mission.</p></main></body></html>`, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'private, no-store', 'Referrer-Policy': 'no-referrer', 'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'" } });
}
export function GET() { return screen(); }
// RFC 8058 one-click requests and the deliberate form action use the opaque bearer link.
// GET never changes consent, so link scanners cannot unsubscribe or subscribe someone.
export async function POST(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token') ?? '';
  if (token.length > 100) return new NextResponse('Invalid link.', { status: 400 });
  try {
    const done = await updateConsent(token, 'unsubscribe');
    return done ? screen(true) : new NextResponse('This link is invalid.', { status: 400, headers: { 'Cache-Control': 'private, no-store', 'Referrer-Policy': 'no-referrer' } });
  } catch { return new NextResponse('Could not save your preference. Please retry.', { status: 503 }); }
}
