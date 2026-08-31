export type CreatorMissionActionState =
  | 'AVAILABLE'
  | 'REQUESTED'
  | 'READY_TO_SUBMIT'
  | 'RESUME_SUBMISSION'
  | 'UNDER_REVIEW'
  | 'PAYOUT_QUEUED'
  | 'PAID'
  | 'UNAVAILABLE';

type CreatorMissionActionInput = {
  walletAddress?: string | null;
  assignedWallet?: string | null;
  claimRequestWallet?: string | null;
  claimRequestStatus?: string | null;
  missionStatus: string;
  hasProof: boolean;
  isAvailable: boolean;
};

function walletsMatch(left?: string | null, right?: string | null) {
  return Boolean(left && right && left.toLowerCase() === right.toLowerCase());
}

export function getCreatorMissionActionState(
  input: CreatorMissionActionInput,
): CreatorMissionActionState {
  const isAssigned = walletsMatch(input.assignedWallet, input.walletAddress);

  if (isAssigned && input.missionStatus === 'PENDING') {
    return input.hasProof ? 'RESUME_SUBMISSION' : 'READY_TO_SUBMIT';
  }
  if (isAssigned && input.missionStatus === 'PENDING_REVIEW') return 'UNDER_REVIEW';
  if (isAssigned && input.missionStatus === 'PENDING_PAYOUT') return 'PAYOUT_QUEUED';
  if (isAssigned && input.missionStatus === 'VERIFIED') return 'PAID';

  if (
    input.claimRequestStatus === 'PENDING' &&
    walletsMatch(input.claimRequestWallet, input.walletAddress)
  ) {
    return 'REQUESTED';
  }

  return input.isAvailable ? 'AVAILABLE' : 'UNAVAILABLE';
}
