import { z } from 'zod';

export const CREATOR_DROP_METADATA_KIND = 'creator_drop_v1';

const ATTRIBUTION_TARGET_TYPES = ['DARE', 'MEETUP', 'DROP', 'PAGE'] as const;
type AttributionTargetType = (typeof ATTRIBUTION_TARGET_TYPES)[number];
const TARGET_TYPE_SET = new Set<string>(ATTRIBUTION_TARGET_TYPES);
const CODE_PATTERN = /^[a-z0-9](?:[a-z0-9_-]{0,62}[a-z0-9])?$/;

export const CREATOR_DROP_CATEGORIES = [
  'tonight',
  'mystery',
  'social',
  'action_sports',
  'food',
  'wellness',
  'impact',
  'free_play',
] as const;

export type CreatorDropCategory = (typeof CREATOR_DROP_CATEGORIES)[number];

export const CreatorDropMetadataSchema = z.object({
  kind: z.literal(CREATOR_DROP_METADATA_KIND),
  title: z.string().trim().min(3).max(90),
  hook: z.string().trim().min(8).max(220),
  category: z.enum(CREATOR_DROP_CATEGORIES),
  actionHref: z.string().trim().min(1).max(1024),
  actionLabel: z.string().trim().min(2).max(36).default('Open on BaseDare'),
  rewardLabel: z.string().trim().max(50).optional().nullable(),
  cityLabel: z.string().trim().max(60).optional().nullable(),
  creatorBrief: z.string().trim().max(320).optional().nullable(),
  suggestedCaption: z.string().trim().max(360).optional().nullable(),
  proofPrompt: z.string().trim().max(220).optional().nullable(),
  createdAt: z.string().datetime().optional(),
});

export type CreatorDropMetadata = z.infer<typeof CreatorDropMetadataSchema>;

export type CreatorDropInput = {
  title: string;
  hook: string;
  category: string;
  actionHref: string;
  actionLabel?: string | null;
  rewardLabel?: string | null;
  cityLabel?: string | null;
  creatorBrief?: string | null;
  suggestedCaption?: string | null;
  proofPrompt?: string | null;
};

function optionalText(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function requiredText(value: string, field: string, max = 160): string {
  const normalized = value.trim().replace(/\s+/g, ' ');
  if (!normalized) throw new Error(`${field} is required.`);
  return normalized.slice(0, max);
}

function normalizeAttributionCode(value: string, field: string): string {
  const normalized = value.trim().toLowerCase().replace(/^@/, '');
  if (!CODE_PATTERN.test(normalized)) {
    throw new Error(`${field} must be 1-64 lowercase letters, numbers, dashes, or underscores.`);
  }
  return normalized;
}

function normalizeTargetType(value: string): AttributionTargetType {
  const normalized = value.trim().toUpperCase();
  if (!TARGET_TYPE_SET.has(normalized)) {
    throw new Error('Unsupported attribution target type.');
  }
  return normalized as AttributionTargetType;
}

function normalizeTargetId(value: string): string {
  const normalized = value.trim();
  if (!normalized || normalized.length > 191 || /[\u0000-\u001f]/.test(normalized)) {
    throw new Error('Invalid attribution target.');
  }
  return normalized;
}

function normalizeTargetHref(value: string): string {
  const normalized = value.trim();
  if (!normalized.startsWith('/') || normalized.startsWith('//') || normalized.length > 1024) {
    throw new Error('Mission links must use a local BaseDare path.');
  }

  const parsed = new URL(normalized, 'https://basedare.local');
  if (parsed.origin !== 'https://basedare.local' || parsed.pathname.startsWith('/api/')) {
    throw new Error('Mission links must use a public BaseDare path.');
  }

  return `${parsed.pathname}${parsed.search}${parsed.hash}`;
}

export function buildCreatorDropMetadata(input: CreatorDropInput): CreatorDropMetadata {
  return CreatorDropMetadataSchema.parse({
    kind: CREATOR_DROP_METADATA_KIND,
    title: requiredText(input.title, 'Drop title', 90),
    hook: requiredText(input.hook, 'Drop hook', 220),
    category: input.category,
    actionHref: normalizeTargetHref(input.actionHref),
    actionLabel: optionalText(input.actionLabel) ?? 'Open on BaseDare',
    rewardLabel: optionalText(input.rewardLabel),
    cityLabel: optionalText(input.cityLabel),
    creatorBrief: optionalText(input.creatorBrief),
    suggestedCaption: optionalText(input.suggestedCaption),
    proofPrompt: optionalText(input.proofPrompt),
    createdAt: new Date().toISOString(),
  });
}

export function parseCreatorDropMetadata(value: unknown): CreatorDropMetadata | null {
  const parsed = CreatorDropMetadataSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

export function buildCreatorDropLandingHref(slug: string): string {
  const normalized = normalizeAttributionCode(slug, 'drop slug');
  return `/drops/${encodeURIComponent(normalized)}`;
}

export function normalizeCreatorDropTarget(input: {
  targetType: string;
  targetId: string;
}) {
  return {
    targetType: normalizeTargetType(input.targetType),
    targetId: normalizeTargetId(input.targetId),
  };
}

export function buildCreatorDropShareText(input: {
  creatorCode: string;
  title: string;
  hook: string;
  rewardLabel?: string | null;
}): string {
  const reward = input.rewardLabel ? `\n${input.rewardLabel}` : '';
  return `${input.title}\n${input.hook}${reward}\n\nOpen it through @${input.creatorCode} on BaseDare.`;
}

export function creatorDropCategoryLabel(category: CreatorDropCategory): string {
  switch (category) {
    case 'action_sports':
      return 'Action sports';
    case 'free_play':
      return 'Free play';
    case 'tonight':
      return 'Tonight';
    case 'mystery':
      return 'Mystery';
    case 'social':
      return 'Social';
    case 'food':
      return 'Food';
    case 'wellness':
      return 'Wellness';
    case 'impact':
      return 'Impact';
  }
}
