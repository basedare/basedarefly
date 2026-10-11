export type CommunityIdentityTag = {
  tag?: string | null;
  status?: string | null;
  isPrimary?: boolean | null;
};

export type CommunityIdentityState = {
  status: 'ready' | 'pending' | 'missing';
  tag: string | null;
};

export type CommunityIdentityCheckState = CommunityIdentityState | {
  status: 'disconnected' | 'checking' | 'unknown';
  tag: null;
};

/** A failed or unfinished lookup is never evidence that a name needs reclaiming. */
export function communityIdentityNotice(identity: CommunityIdentityCheckState) {
  switch (identity.status) {
    case 'ready': return { title: `Posting as ${identity.tag}`, detail: 'Your public name follows your post into the place room.', action: null } as const;
    case 'pending': return { title: `${identity.tag ?? 'Your Baretag'} is in review`, detail: 'Your name is saved. Posting unlocks after approval.', action: 'review' } as const;
    case 'checking': return { title: 'Checking your Baretag…', detail: 'Looking up the name linked to this account.', action: null } as const;
    case 'unknown': return { title: 'Your Baretag couldn’t load', detail: 'This doesn’t mean it was reset. Retry the lookup or let us check when you post.', action: 'retry' } as const;
    case 'disconnected': return { title: 'Sign in with your Baretag account', detail: 'Already have a name? Use the same account you claimed it with.', action: 'sign-in' } as const;
    case 'missing': return { title: 'No Baretag linked to this account', detail: 'Already claimed one? Check that you’re using the same wallet or passkey account.', action: 'claim' } as const;
  }
}

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
