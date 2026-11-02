import 'server-only';
import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
export function retentionSecret() {
  const secret = process.env.RETENTION_SECRET;
  if (!secret || secret.length < 32) throw Error('Updates are unavailable.');
  return secret;
}
export const digest = (value: string) => createHash('sha256').update(value).digest('hex');
export const contactHash = (value: string) => createHmac('sha256', retentionSecret()).update('contact:' + value).digest('hex');
export const newToken = () => randomBytes(32).toString('base64url');
export function equalHash(left: unknown, right: string) {
  if (typeof left !== 'string') return false;
  const a = Buffer.from(left), b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}
export function encryptEmail(email: string) {
  const iv = randomBytes(12), cipher = createCipheriv('aes-256-gcm', createHash('sha256').update(retentionSecret()).digest(), iv);
  cipher.setAAD(Buffer.from('basedare-retention-v1'));
  const data = Buffer.concat([cipher.update(email, 'utf8'), cipher.final()]);
  return [iv, cipher.getAuthTag(), data].map(b => b.toString('base64url')).join('.');
}
export function decryptEmail(value: string) {
  const parts = value.split('.'); if (parts.length !== 3) throw Error('Invalid contact.');
  const [iv, tag, data] = parts.map(v => Buffer.from(v, 'base64url'));
  const cipher = createDecipheriv('aes-256-gcm', createHash('sha256').update(retentionSecret()).digest(), iv);
  cipher.setAAD(Buffer.from('basedare-retention-v1')); cipher.setAuthTag(tag);
  return Buffer.concat([cipher.update(data), cipher.final()]).toString('utf8');
}
export function resendWebhookKey() {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret || !/^whsec_[A-Za-z0-9+/]+={0,2}$/.test(secret)) return null;
  const key = Buffer.from(secret.slice(6), 'base64');
  return key.length >= 16 ? key : null;
}
export function verifyResendWebhook(raw: string, headers: Headers, now = Date.now()) {
  const key = resendWebhookKey();
  const id = headers.get('svix-id') ?? '', timestamp = headers.get('svix-timestamp') ?? '', signatures = headers.get('svix-signature') ?? '';
  if (!key || !/^[\w-]{1,150}$/.test(id) || !/^\d{10}$/.test(timestamp) || signatures.length > 2048 || Math.abs(now / 1000 - Number(timestamp)) > 300) return false;
  const expected = createHmac('sha256', key).update(`${id}.${timestamp}.${raw}`).digest('base64');
  return signatures.split(' ').some(value => value.startsWith('v1,') && equalHash(value.slice(3), expected));
}
