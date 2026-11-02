import 'server-only';
import { prisma } from './prisma';
import { contactHash, decryptEmail, digest, encryptEmail, equalHash, newToken } from './retention-crypto';
import { retentionAvailable, retentionOrigin, sendRetentionEmail } from './retention-email';
import { RETENTION_CONSENT, RETENTION_TOPICS, type RetentionTopic } from './retention-policy';
export const CONTACT = 'RETENTION_CONTACT', SEND = 'RETENTION_SEND', WEBHOOK = 'RETENTION_WEBHOOK';
type Contact = { emailCipher: string; unsubscribeCipher: string; unsubscribeHash: string; topics: RetentionTopic[]; pendingTopics: RetentionTopic[]; confirmationHash: string | null; expiresAt: string | null; consentVersion: string; requestedAt: string; confirmedAt?: string; activityId: string; runHash: string; ipHash: string };
export const meta = (value: unknown) => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
const contact = (value: unknown) => value as Contact;
export async function requestUpdates(input: { email: string; topics: RetentionTopic[]; activityId: string; runId: string; ip: string }) {
  if (!retentionAvailable()) throw Error('Updates are unavailable.');
  const key = contactHash(input.email), ipHash = contactHash('ip:' + input.ip), token = newToken();
  const prepared = await prisma.$transaction(async tx => {
    // A small global pilot budget is durable across server instances, including repeated addresses/IPs.
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext('retention-enrolment-budget'))::text`;
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${`retention:${key}`}))::text`;
    const existing = await tx.founderEvent.findUnique({ where: { dedupeKey: `retention-contact:${key}` } });
    if (existing?.status === 'SUPPRESSED') return null;
    const since = new Date(Date.now() - 3600000);
    if (existing && new Date(contact(existing.metadataJson).requestedAt) > since) return null;
    const [globalCount, ipCount] = await Promise.all([
      tx.founderEvent.count({ where: { eventType: SEND, source: 'confirmation', createdAt: { gte: since } } }),
      tx.founderEvent.count({ where: { eventType: SEND, source: 'confirmation', createdAt: { gte: since }, metadataJson: { path: ['ipHash'], equals: ipHash } } }),
    ]);
    if (globalCount >= 30 || ipCount >= 3) return null;
    const unsubscribe = existing ? decryptEmail(contact(existing.metadataJson).unsubscribeCipher) : newToken();
    const now = new Date();
    const data: Contact = { emailCipher: encryptEmail(input.email), unsubscribeCipher: encryptEmail(unsubscribe), unsubscribeHash: digest(unsubscribe), topics: existing?.status === 'CONFIRMED' ? contact(existing.metadataJson).topics : [], pendingTopics: input.topics, confirmationHash: digest(token), expiresAt: new Date(now.getTime() + 48 * 3600000).toISOString(), consentVersion: RETENTION_CONSENT, requestedAt: now.toISOString(), activityId: input.activityId, runHash: digest(input.runId), ipHash, ...(existing && contact(existing.metadataJson).confirmedAt ? { confirmedAt: contact(existing.metadataJson).confirmedAt } : {}) };
    const row = await tx.founderEvent.upsert({ where: { dedupeKey: `retention-contact:${key}` }, create: { eventType: CONTACT, dedupeKey: `retention-contact:${key}`, subjectType: 'retention', subjectId: key, status: 'PENDING', metadataJson: data }, update: { status: existing?.status === 'CONFIRMED' ? 'CONFIRMED' : 'PENDING', metadataJson: data } });
    const send = await tx.founderEvent.create({ data: { eventType: SEND, source: 'confirmation', subjectType: 'retention', subjectId: row.id, status: 'PREPARED', dedupeKey: `retention-confirm:${digest(token)}`, metadataJson: { ipHash } } });
    return { row, send, unsubscribe };
  });
  if (!prepared) return;
  await prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${`retention:${key}`}))::text`;
    const row = await tx.founderEvent.findUniqueOrThrow({ where: { id: prepared.row.id } });
    const current = contact(row.metadataJson);
    if (row.status === 'SUPPRESSED' || row.status === 'UNSUBSCRIBED' || !equalHash(current.confirmationHash, digest(token))) {
      await tx.founderEvent.update({ where: { id: prepared.send.id }, data: { status: 'CANCELLED' } });
      return;
    }
    try {
      const origin = retentionOrigin(), confirm = `${origin}/updates/confirm?token=${prepared.row.id}.${token}`;
      const providerId = await sendRetentionEmail({ to: input.email, subject: 'Your next BaseDare? You choose.', text: `You asked for occasional BaseDare emails about: ${input.topics.map(t => RETENTION_TOPICS[t]).join(', ')}. Confirm your choice:\n\n${confirm}\n\nThis confirmation expires in 48 hours. Playing or saving an activity never subscribes you. If this was not you, ignore this email or unsubscribe below.`, key: prepared.send.id, unsubscribeUrl: `${origin}/updates/unsubscribe?token=${prepared.row.id}.${prepared.unsubscribe}` });
      await tx.founderEvent.update({ where: { id: prepared.send.id }, data: { status: 'ACCEPTED', metadataJson: { ipHash, providerId, evidence: 'provider_accepted_not_inbox_delivery' } } });
    } catch {
      await tx.founderEvent.update({ where: { id: prepared.send.id }, data: { status: 'FAILED' } });
    }
  }, { timeout: 20000 });
  await reconcileDelivery(prepared.send.id);
  // Keep the public response neutral for cooldown/suppression and provider failure.
  // The private send ledger records FAILED; no inbox or subscription is promised.
}

function parseToken(value: string) {
  const parts = value.split('.');
  if (parts.length !== 2 || !/^[a-z0-9]{20,40}$/.test(parts[0]) || !/^[\w-]{43}$/.test(parts[1])) return null;
  return { id: parts[0], hash: digest(parts[1]) };
}
export async function updateConsent(value: string, action: 'confirm' | 'unsubscribe') {
  const token = parseToken(value); if (!token) return false;
  return prisma.$transaction(async tx => {
    const initial = await tx.founderEvent.findUnique({ where: { id: token.id } });
    if (initial?.eventType !== CONTACT) return false;
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${`retention:${initial.subjectId}`}))::text`;
    const row = await tx.founderEvent.findUniqueOrThrow({ where: { id: token.id } });
    const data = contact(row.metadataJson);
    if (action === 'unsubscribe') {
      if (!equalHash(data.unsubscribeHash, token.hash)) return false;
      await tx.founderEvent.update({ where: { id: row.id }, data: { status: row.status === 'SUPPRESSED' ? 'SUPPRESSED' : 'UNSUBSCRIBED', metadataJson: { ...data, topics: [], pendingTopics: [], confirmationHash: null, expiresAt: null } } });
      return true;
    }
    if (row.status === 'SUPPRESSED' || !equalHash(data.confirmationHash, token.hash) || !data.expiresAt || new Date(data.expiresAt).getTime() <= Date.now() || !data.pendingTopics.length) return false;
    await tx.founderEvent.update({ where: { id: row.id }, data: { status: 'CONFIRMED', metadataJson: { ...data, topics: data.pendingTopics, pendingTopics: [], confirmationHash: null, expiresAt: null, confirmedAt: new Date().toISOString() } } });
    return true;
  });
}
export async function sendUpdate(input: { contactId: string; campaign: string; topic: RetentionTopic; subject: string; text: string; href: string }) {
  if (!retentionAvailable() || process.env.RETENTION_SEND_ENABLED !== 'true') throw Error('Reviewed update sending is disabled.');
  const initial = await prisma.founderEvent.findUnique({ where: { id: input.contactId } });
  if (initial?.eventType !== CONTACT) return 'SKIPPED';
  const sendId = await prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext('retention-send-budget'))::text`;
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${`retention:${initial.subjectId}`}))::text`;
    const row = await tx.founderEvent.findUniqueOrThrow({ where: { id: initial.id } });
    const data = contact(row.metadataJson);
    if (row.status !== 'CONFIRMED' || data.consentVersion !== RETENTION_CONSENT || !data.topics.includes(input.topic)) return null;
    const dedupeKey = `retention-update:${input.campaign}:${row.id}`;
    if (await tx.founderEvent.findUnique({ where: { dedupeKey } })) return null;
    const since = new Date(Date.now() - 7 * 86400000);
    if (await tx.founderEvent.count({ where: { eventType: SEND, source: 'update', subjectId: row.id, createdAt: { gte: since } } }) >= 1) return null;
    if (await tx.founderEvent.count({ where: { eventType: SEND, source: 'update', createdAt: { gte: new Date(Date.now() - 86400000) } } }) >= 10) return null;
    const send = await tx.founderEvent.create({ data: { eventType: SEND, source: 'update', subjectType: 'retention', subjectId: row.id, dedupeKey, status: 'PREPARED', metadataJson: { campaign: input.campaign, topic: input.topic } } });
    // Serialize against unsubscribe/suppression. Provider acceptance is still not inbox delivery.
    try {
      const providerId = await sendRetentionEmail({ to: decryptEmail(data.emailCipher), subject: input.subject, text: `${input.text}\n\n${retentionOrigin()}${input.href}`, key: send.id, unsubscribeUrl: `${retentionOrigin()}/updates/unsubscribe?token=${row.id}.${decryptEmail(data.unsubscribeCipher)}` });
      await tx.founderEvent.update({ where: { id: send.id }, data: { status: 'ACCEPTED', metadataJson: { campaign: input.campaign, topic: input.topic, providerId, evidence: 'provider_accepted_not_inbox_delivery' } } });
    } catch { await tx.founderEvent.update({ where: { id: send.id }, data: { status: 'FAILED' } }); }
    return send.id;
  }, { timeout: 20000 });
  if (!sendId) return 'SKIPPED';
  await reconcileDelivery(sendId);
  return (await prisma.founderEvent.findUniqueOrThrow({ where: { id: sendId } })).status ?? 'UNKNOWN';
}
export async function reconcileDelivery(sendId: string) {
  const send = await prisma.founderEvent.findUnique({ where: { id: sendId } });
  const providerId = meta(send?.metadataJson).providerId;
  if (!send || send.eventType !== SEND || typeof providerId !== 'string' || !send.subjectId) return;
  const [suppressionCount, deliveredCount] = await Promise.all([
    prisma.founderEvent.count({ where: { eventType: WEBHOOK, subjectId: providerId, status: { in: ['email.complained', 'email.bounced', 'email.suppressed'] } } }),
    prisma.founderEvent.count({ where: { eventType: WEBHOOK, subjectId: providerId, status: 'email.delivered' } }),
  ]);
  const suppression = suppressionCount > 0, delivered = deliveredCount > 0;
  if (suppression) {
    const initial = await prisma.founderEvent.findUnique({ where: { id: send.subjectId } });
    if (initial?.eventType === CONTACT) await prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${`retention:${initial.subjectId}`}))::text`;
      const row = await tx.founderEvent.findUniqueOrThrow({ where: { id: initial.id } }), data = contact(row.metadataJson);
      await tx.founderEvent.update({ where: { id: row.id }, data: { status: 'SUPPRESSED', metadataJson: { ...data, topics: [], pendingTopics: [], confirmationHash: null, expiresAt: null } } });
    });
  }
  if (suppression || delivered) await prisma.founderEvent.updateMany({ where: { id: send.id, ...(suppression ? {} : { status: { not: 'SUPPRESSED' } }) }, data: { status: suppression ? 'SUPPRESSED' : 'DELIVERED' } });
}
