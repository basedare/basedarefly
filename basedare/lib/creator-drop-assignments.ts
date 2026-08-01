import { z } from 'zod';

export const CREATOR_DROP_ASSIGNMENT_STATUSES = [
  'DRAFTED',
  'READY_TO_SEND',
  'SENT',
  'ACCEPTED',
  'POSTED',
  'INTENT_LOCKED',
  'VERIFIED',
  'REPEAT',
  'KILL',
] as const;

export type CreatorDropAssignmentStatus = (typeof CREATOR_DROP_ASSIGNMENT_STATUSES)[number];

export const CREATOR_DROP_CONTACT_CHANNELS = [
  'instagram',
  'tiktok',
  'whatsapp',
  'telegram',
  'discord',
  'email',
  'in_person',
  'manual',
] as const;

export type CreatorDropContactChannel = (typeof CREATOR_DROP_CONTACT_CHANNELS)[number];

const STATUS_SET = new Set<string>(CREATOR_DROP_ASSIGNMENT_STATUSES);
const CHANNEL_SET = new Set<string>(CREATOR_DROP_CONTACT_CHANNELS);
const CREATOR_CODE_PATTERN = /^[a-z0-9](?:[a-z0-9_-]{0,62}[a-z0-9])?$/;

export const CreatorDropAssignmentInputSchema = z.object({
  linkId: z.string().trim().min(1).max(191).optional().nullable(),
  linkSlug: z.string().trim().min(1).max(64).optional().nullable(),
  creatorCode: z.string().trim().min(1).max(64),
  creatorName: z.string().trim().max(80).optional().nullable(),
  contactChannel: z.string().trim().max(30).optional().nullable(),
  contactHandle: z.string().trim().max(120).optional().nullable(),
  status: z.string().trim().max(30).optional().nullable(),
  priority: z.coerce.number().int().min(0).max(5).optional().default(0),
  notes: z.string().trim().max(1000).optional().nullable(),
});

export const CreatorDropAssignmentUpdateSchema = z.object({
  id: z.string().trim().min(1).max(191),
  status: z.string().trim().max(30).optional().nullable(),
  notes: z.string().trim().max(1000).optional().nullable(),
  priority: z.coerce.number().int().min(0).max(5).optional().nullable(),
  markTouched: z.boolean().optional().default(false),
});

export type CreatorDropAssignmentInput = z.infer<typeof CreatorDropAssignmentInputSchema>;
export type CreatorDropAssignmentUpdateInput = z.infer<typeof CreatorDropAssignmentUpdateSchema>;

function optionalText(value: string | null | undefined, max: number): string | null {
  const normalized = value?.trim().replace(/\s+/g, ' ') ?? '';
  return normalized ? normalized.slice(0, max) : null;
}

export function normalizeCreatorAssignmentCode(value: string, field = 'creatorCode') {
  const normalized = value.trim().toLowerCase().replace(/^@/, '');
  if (!CREATOR_CODE_PATTERN.test(normalized)) {
    throw new Error(`${field} must be 1-64 lowercase letters, numbers, dashes, or underscores.`);
  }
  return normalized;
}

export function normalizeCreatorDropAssignmentStatus(
  value: string | null | undefined,
  fallback: CreatorDropAssignmentStatus = 'DRAFTED'
): CreatorDropAssignmentStatus {
  if (!value) return fallback;
  const normalized = value.trim().toUpperCase().replace(/[\s-]+/g, '_');
  if (!STATUS_SET.has(normalized)) {
    throw new Error('Unsupported creator drop assignment status.');
  }
  return normalized as CreatorDropAssignmentStatus;
}

export function normalizeCreatorDropContactChannel(value: string | null | undefined) {
  if (!value) return null;
  const normalized = value.trim().toLowerCase().replace(/[\s-]+/g, '_');
  if (!CHANNEL_SET.has(normalized)) {
    throw new Error('Unsupported creator contact channel.');
  }
  return normalized as CreatorDropContactChannel;
}

export function normalizeCreatorDropAssignmentInput(input: CreatorDropAssignmentInput) {
  return {
    linkId: optionalText(input.linkId, 191),
    linkSlug: input.linkSlug ? normalizeCreatorAssignmentCode(input.linkSlug, 'linkSlug') : null,
    creatorCode: normalizeCreatorAssignmentCode(input.creatorCode),
    creatorName: optionalText(input.creatorName, 80),
    contactChannel: normalizeCreatorDropContactChannel(input.contactChannel),
    contactHandle: optionalText(input.contactHandle, 120),
    status: normalizeCreatorDropAssignmentStatus(input.status),
    priority: input.priority,
    notes: optionalText(input.notes, 1000),
  };
}

export function creatorDropAssignmentStatusLabel(status: CreatorDropAssignmentStatus) {
  switch (status) {
    case 'DRAFTED':
      return 'Drafted';
    case 'READY_TO_SEND':
      return 'Ready to send';
    case 'SENT':
      return 'Sent';
    case 'ACCEPTED':
      return 'Accepted';
    case 'POSTED':
      return 'Posted';
    case 'INTENT_LOCKED':
      return 'Intent locked';
    case 'VERIFIED':
      return 'Verified';
    case 'REPEAT':
      return 'Repeat';
    case 'KILL':
      return 'Kill';
  }
}

export function nextCreatorDropAssignmentStatus(status: CreatorDropAssignmentStatus): CreatorDropAssignmentStatus {
  switch (status) {
    case 'DRAFTED':
      return 'READY_TO_SEND';
    case 'READY_TO_SEND':
      return 'SENT';
    case 'SENT':
      return 'ACCEPTED';
    case 'ACCEPTED':
      return 'POSTED';
    case 'POSTED':
      return 'INTENT_LOCKED';
    case 'INTENT_LOCKED':
      return 'VERIFIED';
    case 'VERIFIED':
      return 'REPEAT';
    case 'REPEAT':
    case 'KILL':
      return status;
  }
}

export function buildCreatorDropOutreachCopy(input: {
  creatorCode: string;
  creatorName?: string | null;
  title: string;
  hook: string;
  publicUrl: string;
  actionLabel?: string | null;
  rewardLabel?: string | null;
  creatorBrief?: string | null;
}) {
  const name = optionalText(input.creatorName, 80) ?? `@${normalizeCreatorAssignmentCode(input.creatorCode)}`;
  const actionLabel = optionalText(input.actionLabel, 36) ?? 'open it on BaseDare';
  const rewardLine = optionalText(input.rewardLabel, 80);
  const brief = optionalText(input.creatorBrief, 320);

  return [
    `Hey ${name} — I made you a BaseDare drop: ${input.title.trim()}.`,
    input.hook.trim(),
    rewardLine ? `Reward / status: ${rewardLine}.` : 'Reward / status: only accepted real-world actions count.',
    brief ? `What to film: ${brief}` : null,
    `Your link: ${input.publicUrl}`,
    `Simple ask: make this feel worth doing today, then tell people to ${actionLabel}.`,
    'No wallet explanation needed. No promised bonus. We track the path honestly and only verified actions count.',
  ].filter(Boolean).join('\n');
}

export function creatorDropAssignmentVerdict(input: {
  verifiedCompletions: number;
  intents: number;
  touches: number;
}): CreatorDropAssignmentStatus | null {
  if (input.verifiedCompletions > 0) return 'REPEAT';
  if (input.intents >= 5 && input.verifiedCompletions === 0) return 'KILL';
  if (input.touches > 0 || input.intents > 0) return 'INTENT_LOCKED';
  return null;
}
