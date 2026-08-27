export type CreatorLoopActionId = 'find' | 'show-up' | 'submit' | 'record';

export type CreatorLoopWorkItem = {
  category: string;
  href: string;
  role: string;
  title: string;
};

export type CreatorLoopAction = {
  id: CreatorLoopActionId;
  label: string;
  detail: string;
  href: string | null;
  state: 'ready' | 'locked' | 'checking';
};

type ResolveCreatorLoopActionsInput = {
  isConnected: boolean;
  isLoading: boolean;
  loadFailed: boolean;
  items: CreatorLoopWorkItem[];
  creatorTag?: string | null;
};

const ACTIVE_CREATOR_CATEGORIES = new Set([
  'Ready for proof',
  'Under review',
  'Payout queued',
]);

function shortenTitle(title: string) {
  const compact = title.trim();
  if (compact.length <= 42) return compact;
  return `${compact.slice(0, 39).trimEnd()}…`;
}

export function resolveCreatorLoopActions({
  isConnected,
  isLoading,
  loadFailed,
  items,
  creatorTag,
}: ResolveCreatorLoopActionsInput): CreatorLoopAction[] {
  const creatorItems = items.filter((item) => item.role === 'creator');
  const proofReady = creatorItems.find((item) => item.category === 'Ready for proof');
  const activeMission = creatorItems.find((item) => ACTIVE_CREATOR_CATEGORIES.has(item.category));
  const awaitingResponse = creatorItems.find((item) => item.category === 'Needs response');
  const normalizedTag = creatorTag?.replace(/^@/, '').trim() || null;

  let showUp: CreatorLoopAction;
  let submit: CreatorLoopAction;

  if (isLoading) {
    showUp = {
      id: 'show-up',
      label: 'Show up',
      detail: 'Checking your accepted missions…',
      href: null,
      state: 'checking',
    };
    submit = {
      id: 'submit',
      label: 'Submit proof',
      detail: 'Checking what is ready…',
      href: null,
      state: 'checking',
    };
  } else if (loadFailed && isConnected) {
    showUp = {
      id: 'show-up',
      label: 'Show up',
      detail: 'Mission status is unavailable. Check your dashboard.',
      href: '/dashboard',
      state: 'ready',
    };
    submit = {
      id: 'submit',
      label: 'Submit proof',
      detail: 'Open your dashboard to check your next action.',
      href: '/dashboard',
      state: 'ready',
    };
  } else if (activeMission) {
    showUp = {
      id: 'show-up',
      label: 'Show up',
      detail: `Continue: ${shortenTitle(activeMission.title)}`,
      href: '/dashboard',
      state: 'ready',
    };
    submit = proofReady
      ? {
          id: 'submit',
          label: 'Submit proof',
          detail: `Ready now: ${shortenTitle(proofReady.title)}`,
          href: proofReady.href,
          state: 'ready',
        }
      : {
          id: 'submit',
          label: 'Submit proof',
          detail: 'Finish the mission first. Proof unlocks when it is ready.',
          href: null,
          state: 'locked',
        };
  } else {
    const responseDetail = awaitingResponse
      ? `Accept ${shortenTitle(awaitingResponse.title)} to unlock this.`
      : 'Accept a paid mission to unlock this.';

    showUp = {
      id: 'show-up',
      label: 'Show up',
      detail: responseDetail,
      href: null,
      state: 'locked',
    };
    submit = {
      id: 'submit',
      label: 'Submit proof',
      detail: 'Accept and complete a mission first.',
      href: null,
      state: 'locked',
    };
  }

  return [
    {
      id: 'find',
      label: 'Find mission',
      detail: 'Browse open paid work and choose a clear brief.',
      href: '/earn?source=creators-loop',
      state: 'ready',
    },
    showUp,
    submit,
    {
      id: 'record',
      label: 'Build record',
      detail: normalizedTag
        ? `Open @${normalizedTag}'s work record.`
        : isConnected
          ? 'See your completed work and place history.'
          : 'Connect or sign in to see your work record.',
      href: normalizedTag
        ? `/creator/${encodeURIComponent(normalizedTag)}`
        : '/dashboard#your-trail',
      state: 'ready',
    },
  ];
}
