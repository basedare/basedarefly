import { z } from 'zod';

export const DARE_PROOF_TICKET = 'dare_proof_upload_ticket_v1';
export const DARE_PROOF_TICKET_SECONDS = 15 * 60;
export const DARE_MEDIA_CONSENT_VERSION = 'dare-media-v1';
export const DARE_VIDEO_MAX_BYTES = 120 * 1024 * 1024;
export const DARE_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-matroska', 'video/3gpp', 'video/3gpp2'] as const;
const cidSchema = z.string().regex(/^(?:Qm[1-9A-HJ-NP-Za-km-z]{44}|b[a-z2-7]{20,120})$/);

export const DareProofConsentSchema = z.object({
  processing: z.boolean(), publication: z.boolean(), rightsConfirmed: z.boolean(),
}).strict().refine(value => (!value.processing && !value.publication) || (value.processing && value.rightsConfirmed), 'Clip processing and publication require confirmed media rights.');

export const DareProofPrepareSchema = z.object({
  action: z.literal('prepare'), dareId: z.string().regex(/^[A-Za-z0-9_-]{1,191}$/),
  name: z.string().min(1).max(240), mime: z.enum(DARE_VIDEO_TYPES), size: z.number().int().positive().max(DARE_VIDEO_MAX_BYTES),
  sha256: z.string().regex(/^[a-f0-9]{64}$/).nullable(), consent: DareProofConsentSchema,
}).strict().refine(value => !value.consent.processing || value.sha256 !== null, 'Processing requires the exact original file hash.');

export const DareProofCompleteSchema = z.object({
  action: z.literal('complete'), dareId: z.string().regex(/^[A-Za-z0-9_-]{1,191}$/), ticket: z.string().regex(/^[a-f0-9]{32}$/), cid: cidSchema,
}).strict();

export const DareProofTicketSchema = z.object({
  ticket: z.string().regex(/^[a-f0-9]{32}$/), name: z.string(), mime: z.enum(DARE_VIDEO_TYPES), size: z.number().int().positive().max(DARE_VIDEO_MAX_BYTES),
  sha256: z.string().regex(/^[a-f0-9]{64}$/).nullable(), consent: DareProofConsentSchema, version: z.literal(DARE_MEDIA_CONSENT_VERSION), expiresAt: z.string().datetime(),
  cid: cidSchema.optional(), fileId: z.string().optional(), attachedAt: z.string().datetime().optional(),
  clipTitle: z.string().max(200).optional(), requiredCredit: z.string().max(200).optional(),
}).strict();
export type DareProofTicket = z.infer<typeof DareProofTicketSchema>;

/** Verify the storage provider's own metadata, not an arbitrary client URL or CID. */
export function matchingDareProofFile(file: { id: string; cid: string; size: number; number_of_files: number; mime_type: string; keyvalues: Record<string,string> }, ticket: DareProofTicket, dareId: string, cid: string) {
  return file.id.length > 0 && file.cid === cid && file.size === ticket.size && file.number_of_files === 1 && file.mime_type === ticket.mime && file.keyvalues?.basedareDare === dareId && file.keyvalues?.basedareTicket === ticket.ticket;
}

export function dareProofTicketKey(ticket: string) { return `dare-proof-upload:${ticket}`; }

/** Consent is independent from payout or verification. No third-party reuse implied. */
export function isConsentedDareMedia(ticket: DareProofTicket) {
  return Boolean(ticket.cid && ticket.fileId && ticket.attachedAt && ticket.sha256 && ticket.consent.processing && ticket.consent.rightsConfirmed);
}
