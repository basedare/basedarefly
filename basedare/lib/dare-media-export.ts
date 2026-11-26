import { type DareProofTicket, isConsentedDareMedia } from './dare-proof-media';

export const BASEDARE_CLIP_GRANT_DAYS = 30;
export const BASEDARE_CLIP_CHANNEL = '1ba3b9da8b3d4bb7a5ffa920618d43c9';
export const BASEDARE_CLIP_DESTINATIONS = ['BaseDare', 'TikTok', 'YouTube', 'Instagram', 'X'] as const;

/** This is the existing BaseClips signed v1 payload, not a new processing protocol. */
export function dareClipPayload(input: { ticket: DareProofTicket; tenant: string; status: string; dareId: string; title: string; credit: string; now?: number }) {
  const { ticket } = input;
  if (!isConsentedDareMedia(ticket)) return null;
  const expiresAt = new Date(Date.parse(ticket.attachedAt!) + BASEDARE_CLIP_GRANT_DAYS * 86400000);
  if (input.status === 'REVOKED' || expiresAt.getTime() <= (input.now ?? Date.now())) return { action: 'revoke' as const, tenant_id: input.tenant, grant_id: ticket.ticket, version: 1 };
  if (input.status !== 'VERIFIED') return null;
  return {
    action: 'process' as const, tenant_id: input.tenant, request_id: ticket.ticket, channel_id: BASEDARE_CLIP_CHANNEL,
    target: { type: 'dare' as const, id: input.dareId, revision: 1 }, media_sha256: ticket.sha256!,
    grant: { id: ticket.ticket, version: 1, source_sha256: ticket.sha256!, processing: true, publication: ticket.consent.publication, evaluation: false, training: false, destinations: ticket.consent.publication ? [...BASEDARE_CLIP_DESTINATIONS] : [], expires_at: expiresAt.toISOString(), revoked: false, required_credit: input.credit },
    title: input.title.slice(0, 200), max_seconds: 60,
  };
}
