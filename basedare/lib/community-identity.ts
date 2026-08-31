export type CommunityIdentityTag = {
  tag?: string | null;
  status?: string | null;
  isPrimary?: boolean | null;
};

export type CommunityIdentityState = {
  status: 'ready' | 'pending' | 'missing';
  tag: string | null;
};

const READY_STATUSES = new Set(['ACTIVE', 'VERIFIED']);
const PENDING_STATUSES = new Set(['PENDING', 'PENDING_REVIEW']);

function normalizeTag(tag?: string | null) {
  const normalized = tag?.trim().replace(/^@+/, '');
  return normalized ? `@${normalized}` : null;
}

function selectTag(tags: CommunityIdentityTag[], statuses: Set<string>) {
  return [...tags]
    .filter((tag) => statuses.has((tag.status || '').toUpperCase()) && normalizeTag(tag.tag))
    .sort((left, right) => Number(Boolean(right.isPrimary)) - Number(Boolean(left.isPrimary)))[0] ?? null;
}

export function resolveCommunityIdentity(tags: CommunityIdentityTag[]): CommunityIdentityState {
  const ready = selectTag(tags, READY_STATUSES);
  if (ready) return { status: 'ready', tag: normalizeTag(ready.tag) };

  const pending = selectTag(tags, PENDING_STATUSES);
  if (pending) return { status: 'pending', tag: normalizeTag(pending.tag) };

  return { status: 'missing', tag: null };
}
