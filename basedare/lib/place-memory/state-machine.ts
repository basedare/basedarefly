export type AssertionMemoryState = 'UNKNOWN' | 'CURRENT' | 'STALE' | 'CONFLICTED';

export type AssertionTransition =
  | 'CREATE_FIRST_VERSION'
  | 'CONFIRM_CURRENT_VERSION'
  | 'CREATE_SUCCESSOR_VERSION'
  | 'OPEN_CONFLICT'
  | 'JOIN_ACTIVE_CONFLICT';

export type ReceiptContribution = 'MEMORY_CONFIRMED' | 'MEMORY_UPDATED' | 'CONFLICT_OPENED';

export type AssertionTransitionInput = {
  state: AssertionMemoryState;
  currentVersionHash: string | null;
  observationValueHash: string;
  refreshDue: boolean;
  hasActiveConflict: boolean;
};

export type AssertionTransitionPlan = {
  transition: AssertionTransition;
  nextState: AssertionMemoryState;
  replaceCurrentVersion: boolean;
  closePriorSystemInterval: boolean;
  openOrJoinConflict: boolean;
  receiptContribution: ReceiptContribution;
};

export function planAssertionTransition(input: AssertionTransitionInput): AssertionTransitionPlan {
  if (!input.currentVersionHash) {
    return {
      transition: 'CREATE_FIRST_VERSION',
      nextState: 'CURRENT',
      replaceCurrentVersion: true,
      closePriorSystemInterval: false,
      openOrJoinConflict: false,
      receiptContribution: 'MEMORY_UPDATED',
    };
  }

  if (input.currentVersionHash === input.observationValueHash) {
    return {
      transition: 'CONFIRM_CURRENT_VERSION',
      nextState: input.hasActiveConflict || input.state === 'CONFLICTED' ? 'CONFLICTED' : 'CURRENT',
      replaceCurrentVersion: false,
      closePriorSystemInterval: false,
      openOrJoinConflict: false,
      receiptContribution: 'MEMORY_CONFIRMED',
    };
  }

  if (input.hasActiveConflict || input.state === 'CONFLICTED') {
    return {
      transition: 'JOIN_ACTIVE_CONFLICT',
      nextState: 'CONFLICTED',
      replaceCurrentVersion: false,
      closePriorSystemInterval: false,
      openOrJoinConflict: true,
      receiptContribution: 'CONFLICT_OPENED',
    };
  }

  if (input.refreshDue || input.state === 'STALE') {
    return {
      transition: 'CREATE_SUCCESSOR_VERSION',
      nextState: 'CURRENT',
      replaceCurrentVersion: true,
      closePriorSystemInterval: true,
      openOrJoinConflict: false,
      receiptContribution: 'MEMORY_UPDATED',
    };
  }

  return {
    transition: 'OPEN_CONFLICT',
    nextState: 'CONFLICTED',
    replaceCurrentVersion: false,
    closePriorSystemInterval: false,
    openOrJoinConflict: true,
    receiptContribution: 'CONFLICT_OPENED',
  };
}

export function aggregateReceiptOutcome(contributions: ReceiptContribution[]): ReceiptContribution {
  if (contributions.includes('CONFLICT_OPENED')) return 'CONFLICT_OPENED';
  if (contributions.includes('MEMORY_UPDATED')) return 'MEMORY_UPDATED';
  return 'MEMORY_CONFIRMED';
}
