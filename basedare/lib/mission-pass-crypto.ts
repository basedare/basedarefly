import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

export const JOURNEY_COOKIE_NAME = 'bd_journey';
export const PARTICIPANT_COOKIE_NAME = 'bd_mission_identity';
export const PARTICIPANT_SESSION_TTL_SECONDS = 30 * 24 * 60 * 60;

type ParticipantCookiePayload = {
  v: 1;
  participantKey: string;
  exp: number;
};

export function createOpaqueToken(): string {
  return randomBytes(32).toString('base64url');
}

export function hashOpaqueToken(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

export function hmacEmail(normalizedEmail: string, secret: string): string {
  return createHmac('sha256', secret).update(normalizedEmail).digest('hex');
}

export function getMissionPassSecret(): string {
  const secret = process.env.MISSION_PASS_HMAC_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('MISSION_PASS_HMAC_SECRET must be configured with at least 32 characters.');
  }
  return secret;
}

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

export function createParticipantCookieValue(
  participantKey: string,
  secret: string,
  nowSeconds = Math.floor(Date.now() / 1000)
): string {
  const payload: ParticipantCookiePayload = {
    v: 1,
    participantKey,
    exp: nowSeconds + PARTICIPANT_SESSION_TTL_SECONDS,
  };
  const encoded = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const signature = createHmac('sha256', secret).update(encoded).digest('base64url');
  return `${encoded}.${signature}`;
}

export function verifyParticipantCookieValue(
  value: string | null | undefined,
  secret: string,
  nowSeconds = Math.floor(Date.now() / 1000)
): string | null {
  if (!value) return null;
  const [encoded, signature, extra] = value.split('.');
  if (!encoded || !signature || extra !== undefined) return null;

  const expected = createHmac('sha256', secret).update(encoded).digest('base64url');
  if (!safeEqual(signature, expected)) return null;

  try {
    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as Partial<ParticipantCookiePayload>;
    if (
      payload.v !== 1 ||
      typeof payload.participantKey !== 'string' ||
      !payload.participantKey ||
      typeof payload.exp !== 'number' ||
      payload.exp <= nowSeconds
    ) {
      return null;
    }
    return payload.participantKey;
  } catch {
    return null;
  }
}
