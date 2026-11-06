export const RETENTION_KINDS = [
  "PERSON",
  "VENUE",
  "STORY",
  "MOMENT",
  "ACTIVITY",
] as const;
export type RetentionKind = (typeof RETENTION_KINDS)[number];
export type SocialReference = { kind: RetentionKind; key: string };
export type SocialTarget = SocialReference & {
  title: string;
  summary: string;
  href: string;
  label: string;
  followable: boolean;
  latitude?: number;
  longitude?: number;
  at?: string;
};
export function referenceId(ref: SocialReference) {
  return `${ref.kind}:${ref.key}`;
}
export const SOCIAL_RELATION_LIMIT = 100;
