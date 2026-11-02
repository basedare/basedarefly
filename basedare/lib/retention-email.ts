import 'server-only';
import { retentionSecret, resendWebhookKey } from './retention-crypto';
export function retentionOrigin() {
  const origin = process.env.RETENTION_SITE_URL ?? 'https://www.basedare.xyz';
  const url = new URL(origin);
  if (url.origin !== origin || !(origin === 'https://www.basedare.xyz' || origin === 'https://basedare.xyz' || (process.env.NODE_ENV !== 'production' && /^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(origin)))) throw Error('Invalid update origin.');
  return origin;
}
export function retentionAvailable() {
  try {
    retentionSecret(); retentionOrigin();
    return process.env.RETENTION_EMAIL_ENABLED === 'true' && !!process.env.RESEND_API_KEY?.trim() && /^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(process.env.RETENTION_FROM_EMAIL ?? '') && !!resendWebhookKey();
  } catch { return false; }
}
export async function sendRetentionEmail(input: { to: string; subject: string; text: string; key: string; unsubscribeUrl: string }) {
  if (!retentionAvailable()) throw Error('Updates are unavailable.');
  const response = await fetch('https://api.resend.com/emails', { method: 'POST', signal: AbortSignal.timeout(10000), headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json', 'Idempotency-Key': input.key }, body: JSON.stringify({ from: process.env.RETENTION_FROM_EMAIL, to: [input.to], subject: input.subject, text: `${input.text}\n\nBaseDare · You requested these updates.\nUnsubscribe: ${input.unsubscribeUrl}`, headers: { 'List-Unsubscribe': `<${input.unsubscribeUrl}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' } }) });
  if (!response.ok) throw Error('Email provider did not accept the request.');
  const body = await response.json();
  if (typeof body.id !== 'string' || body.id.length > 200 || !body.id) throw Error('No provider receipt.');
  return body.id as string;
}
