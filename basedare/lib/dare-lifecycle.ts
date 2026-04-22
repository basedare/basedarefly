import { DARE_STATUS_DECLINED, DARE_STATUS_PENDING_ACCEPTANCE } from '@/lib/dare-status';

const OPEN_STREAMER_HANDLES = new Set(['@open', 'open', '@everyone', 'everyone']);

export type DareLifecycleType = 'open' | 'targeted';
export type DareTimelineSize = 'full' | 'compact';
export type DareTimelineStepKey =
  | 'funding'
  | 'liveOpen'
  | 'waitingCreator'
  | 'claimed'
  | 'proofSubmitted'
  | 'payoutQueued'
  | 'completed';

export type DareLifecycleInput = {
  status?: string | null;
  streamerHandle?: string | null;
  targetWalletAddress?: string | null;
  awaitingClaim?: boolean | null;
  claimRequestStatus?: string | null;
  claimRequestTag?: string | null;
  claimRequestedAt?: string | null;
  claimDeadline?: string | null;
  claimedBy?: string | null;
  claimedAt?: string | null;
  createdAt?: string | null;
  verifiedAt?: string | null;
  moderatedAt?: string | null;
  expiresAt?: string | null;
  videoUrl?: string | null;
};

export const DARE_STATUS_MAP = {
  FUNDING: { label: 'Funding' },
  AWAITING_CLAIM: { label: 'Waiting for creator' },
  PENDING_ACCEPTANCE: { label: 'Waiting for response' },
  PENDING: { label: 'Live' },
  PENDING_REVIEW: { label: 'Proof submitted' },
  PENDING_PAYOUT: { label: 'Payout queued' },
  VERIFIED: { label: 'Completed' },
  PAID: { label: 'Completed' },
  REFUNDED: { label: 'Refunded' },
  EXPIRED: { label: 'Expired' },
  FAILED: { label: 'Failed' },
  DECLINED: { label: 'Declined' },
  COMPLETED: { label: 'Completed' },
} as const;

const STEP_META: Record<
  DareTimelineStepKey,
  {
    label: string;
    compactLabel?: string;
    description: string;
  }
> = {
  funding: {
    label: 'Funding',
    description: 'Escrow is being initialized on Base.',
  },
  liveOpen: {
    label: 'Live - open',
    compactLabel: 'Open',
    description: 'Anyone eligible can claim this activation.',
  },
  waitingCreator: {
    label: 'Waiting for creator',
    compactLabel: 'Waiting',
    description: 'This dare is waiting on the assigned creator.',
  },
  claimed: {
    label: 'Claimed',
    description: 'A creator has the brief and can now complete it.',
  },
  proofSubmitted: {
    label: 'Proof submitted',
    compactLabel: 'Proof',
    description: 'Proof is in and review is underway.',
  },
  payoutQueued: {
    label: 'Payout queued',
    compactLabel: 'Queued',
    description: 'Approved and waiting for settlement on Base.',
  },
  completed: {
    label: 'Completed',
    description: 'Approved and settled from escrow.',
  },
};

type DareLifecycleStep = {
  key: DareTimelineStepKey;
  label: string;
  description: string;
  state: 'complete' | 'current' | 'upcoming';
};

function normalizeStatus(status: string | null | undefined) {
  return status?.toUpperCase() ?? 'PENDING';
}

function isOpenHandle(handle: string | null | undefined) {
  if (!handle) return true;
  return OPEN_STREAMER_HANDLES.has(handle.trim().toLowerCase());
}

export function getDareLifecycleType(input: DareLifecycleInput): DareLifecycleType {
  if (input.targetWalletAddress) return 'targeted';
  if (!isOpenHandle(input.streamerHandle)) return 'targeted';
  return 'open';
}

function getTerminalLabel(status: string) {
  if (status === DARE_STATUS_DECLINED) return 'Declined';
  if (status === 'FAILED') return 'Failed';
  if (status === 'REFUNDED') return 'Refunded';
  if (status === 'EXPIRED') return 'Expired';
  return DARE_STATUS_MAP[status as keyof typeof DARE_STATUS_MAP]?.label ?? 'Live';
}

function getCurrentStepKey(input: DareLifecycleInput): DareTimelineStepKey {
  const status = normalizeStatus(input.status);
  const dareType = getDareLifecycleType(input);

  if (status === 'FUNDING') return 'funding';
  if (status === 'PENDING_REVIEW') return 'proofSubmitted';
  if (status === 'PENDING_PAYOUT') return 'payoutQueued';
  if (status === 'VERIFIED' || status === 'PAID' || status === 'COMPLETED') return 'completed';
  if (status === DARE_STATUS_PENDING_ACCEPTANCE) return 'waitingCreator';
  if (status === 'AWAITING_CLAIM') return dareType === 'open' ? 'liveOpen' : 'waitingCreator';

  if (status === 'PENDING') {
    if (dareType === 'open') {
      if (input.claimedBy || input.claimRequestStatus === 'APPROVED') {
        return 'claimed';
      }
      return 'liveOpen';
    }
    return 'claimed';
  }

  if (status === DARE_STATUS_DECLINED) return 'waitingCreator';
  if (status === 'FAILED') return input.videoUrl ? 'proofSubmitted' : 'claimed';
  if (status === 'REFUNDED' || status === 'EXPIRED') {
    return dareType === 'open' ? 'liveOpen' : 'waitingCreator';
  }

  return dareType === 'open' ? 'liveOpen' : 'claimed';
}

function getStepSequence(dareType: DareLifecycleType): DareTimelineStepKey[] {
  return dareType === 'open'
    ? ['funding', 'liveOpen', 'claimed', 'proofSubmitted', 'payoutQueued', 'completed']
    : ['funding', 'waitingCreator', 'claimed', 'proofSubmitted', 'payoutQueued', 'completed'];
}

function getNextActionCopy(input: DareLifecycleInput, currentStep: DareTimelineStepKey) {
  const status = normalizeStatus(input.status);
  const dareType = getDareLifecycleType(input);

  if (status === 'FUNDING') {
    return 'Escrow is being initialized on Base. Once confirmed, this dare goes live.';
  }

  if (status === 'AWAITING_CLAIM') {
    return dareType === 'targeted'
      ? 'This dare is waiting for the target creator to finish claiming their tag or wallet before work can begin.'
      : 'This activation is live and waiting for the first eligible creator to claim it.';
  }

  if (status === DARE_STATUS_PENDING_ACCEPTANCE) {
    return 'The targeted creator still needs to accept or decline this dare before proof can be submitted.';
  }

  if (status === 'PENDING' && dareType === 'open') {
    if (input.claimRequestStatus === 'PENDING') {
      return input.claimRequestTag
        ? `${input.claimRequestTag} has requested this activation. A moderator is deciding who gets the brief.`
        : 'A claim request is in. A moderator is reviewing who should get the brief.';
    }

    if (input.claimedBy) {
      return 'This open activation has been claimed. The creator can now complete it and submit proof.';
    }

    return 'This dare is live and open. The first approved claimant can take it on.';
  }

  if (status === 'PENDING') {
    return 'The creator can now complete the mission and submit proof when ready.';
  }

  if (status === 'PENDING_REVIEW') {
    return 'Proof received. Human review usually lands within 4 hours. Nothing else is needed from the creator right now.';
  }

  if (status === 'PENDING_PAYOUT') {
    return 'Approved. Settlement is queued on Base and the funds are not lost. This usually clears automatically once the payout worker retries.';
  }

  if (status === 'VERIFIED' || status === 'PAID' || status === 'COMPLETED') {
    return 'Proof approved and payout sent from escrow.';
  }

  if (status === DARE_STATUS_DECLINED) {
    return 'The targeted creator declined this dare. It will need a new target or a new launch path.';
  }

  if (status === 'REFUNDED') {
    return 'This dare closed without a completion and the escrowed funds were returned.';
  }

  if (status === 'EXPIRED') {
    return 'This dare expired before it was completed.';
  }

  if (status === 'FAILED') {
    return currentStep === 'proofSubmitted'
      ? 'The submitted proof was not approved, so the dare closed without payout.'
      : 'This dare closed without a successful completion.';
  }

  return 'This dare is live. The next action depends on who owns the brief and whether proof has been submitted.';
}

function getStatusTone(status: string) {
  if (status === 'VERIFIED' || status === 'PAID' || status === 'COMPLETED') {
    return 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300';
  }
  if (status === 'PENDING_PAYOUT') {
    return 'bg-amber-500/15 border-amber-500/30 text-amber-200';
  }
  if (status === 'PENDING_REVIEW') {
    return 'bg-yellow-500/15 border-yellow-500/30 text-yellow-300';
  }
  if (status === DARE_STATUS_PENDING_ACCEPTANCE || status === 'AWAITING_CLAIM') {
    return 'bg-fuchsia-500/15 border-fuchsia-500/30 text-fuchsia-200';
  }
  if (status === 'FUNDING') {
    return 'bg-sky-500/15 border-sky-500/30 text-sky-200';
  }
  if (status === DARE_STATUS_DECLINED || status === 'FAILED') {
    return 'bg-red-500/15 border-red-500/30 text-red-200';
  }
  if (status === 'REFUNDED' || status === 'EXPIRED') {
    return 'bg-white/[0.08] border-white/[0.12] text-white/60';
  }
  return 'bg-red-500/15 border-red-500/30 text-red-300';
}

export function getDareLifecycleModel(input: DareLifecycleInput) {
  const status = normalizeStatus(input.status);
  const dareType = getDareLifecycleType(input);
  const currentStep = getCurrentStepKey(input);
  const sequence = getStepSequence(dareType);
  const currentIndex = sequence.indexOf(currentStep);
  const terminal = [DARE_STATUS_DECLINED, 'FAILED', 'REFUNDED', 'EXPIRED'].includes(status);

  const steps: DareLifecycleStep[] = sequence.map((key, index) => {
    const meta = STEP_META[key];
    let state: DareLifecycleStep['state'] = 'upcoming';
    if (index < currentIndex || (index === currentIndex && terminal)) {
      state = 'complete';
    } else if (index === currentIndex) {
      state = 'current';
    }

    return {
      key,
      label: meta.label,
      description: meta.description,
      state,
    };
  });

  return {
    dareType,
    status,
    currentStep,
    currentStatusLabel:
      status === 'PENDING' && dareType === 'open' && !input.claimedBy && input.claimRequestStatus !== 'APPROVED'
        ? STEP_META.liveOpen.label
        : status === 'PENDING' && dareType === 'targeted'
          ? STEP_META.claimed.label
          : status === 'AWAITING_CLAIM' && dareType === 'open'
            ? STEP_META.liveOpen.label
            : getTerminalLabel(status),
    statusTone: getStatusTone(status),
    nextActionCopy: getNextActionCopy(input, currentStep),
    terminalLabel: terminal ? getTerminalLabel(status) : null,
    steps,
  };
}

