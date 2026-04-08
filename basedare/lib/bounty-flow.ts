import { parseUnits } from 'viem';
import { BOUNTY_ABI, USDC_ABI } from '@/abis/BaseDareBounty';
import {
  BOUNTY_CONTRACT_ADDRESS,
  CONTRACT_VALIDATION,
  USDC_ADDRESS,
} from '@/lib/contracts';
import { getBountyModeSnapshot } from '@/lib/bounty-mode';

export type BountyApprovalStatus = 'idle' | 'approving' | 'funding' | 'verifying';

export type BountyCreationInput = {
  title: string;
  description?: string;
  amount: number;
  streamerTag?: string;
  streamId?: string;
  missionMode?: 'IRL' | 'STREAM';
  missionTag?: string;
  isNearbyDare?: boolean;
  latitude?: number;
  longitude?: number;
  locationLabel?: string;
  discoveryRadiusKm?: number;
  venueId?: string;
  creationContext?: 'MAP' | 'CREATE';
  imageUrl?: string;
  imageCid?: string;
  requireSentinel?: boolean;
  stakerAddress: string;
};

export type BountyCreationResult = {
  dareId: string;
  simulated: boolean;
  awaitingClaim?: boolean;
  inviteLink?: string | null;
  claimDeadline?: string | null;
  streamerTag?: string | null;
  shortId?: string;
  isOpenBounty?: boolean;
  isNearbyDare?: boolean;
  locationLabel?: string | null;
};

type PublicClientLike = {
  readContract: (...args: readonly unknown[]) => Promise<unknown>;
  waitForTransactionReceipt: (...args: readonly unknown[]) => Promise<unknown>;
};

type WriteContractAsyncLike = (...args: readonly unknown[]) => Promise<`0x${string}`>;

export async function submitBountyCreation(
  input: BountyCreationInput,
  options: {
    sessionToken?: string | null;
    isSimulationMode?: boolean;
    publicClient?: unknown;
    writeContractAsync?: unknown;
    onApprovalStatusChange?: (status: BountyApprovalStatus) => void;
  }
): Promise<BountyCreationResult> {
  const isSimulationMode = options.isSimulationMode ?? getBountyModeSnapshot().simulated;
  const jsonHeaders: HeadersInit = {
    'Content-Type': 'application/json',
    ...(options.sessionToken ? { Authorization: `Bearer ${options.sessionToken}` } : {}),
  };

  const requestBody: Record<string, unknown> = {
    title: input.title,
    description: input.description?.trim() || undefined,
    amount: input.amount,
    streamerTag: input.streamerTag?.trim() || undefined,
    streamId: input.streamId ?? 'dev-stream-001',
    missionMode: input.missionMode ?? 'IRL',
    missionTag: input.missionTag ?? 'nightlife',
    isNearbyDare: input.isNearbyDare ?? true,
    stakerAddress: input.stakerAddress,
    venueId: input.venueId,
    creationContext: input.creationContext ?? 'CREATE',
    imageUrl: input.imageUrl || undefined,
    imageCid: input.imageCid || undefined,
  };

  if (typeof input.requireSentinel === 'boolean') {
    requestBody.requireSentinel = input.requireSentinel;
  }

  if (requestBody.isNearbyDare) {
    requestBody.latitude = input.latitude;
    requestBody.longitude = input.longitude;
    requestBody.locationLabel = input.locationLabel || undefined;
    requestBody.discoveryRadiusKm = input.discoveryRadiusKm ?? 5;
  }

  if (isSimulationMode) {
    const response = await fetch('/api/bounties', {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify(requestBody),
    });
    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || 'Simulation failed');
    }

    return {
      dareId: result.data.dareId,
      simulated: true,
      awaitingClaim: result.data.awaitingClaim,
      inviteLink: result.data.inviteLink,
      claimDeadline: result.data.claimDeadline,
      streamerTag: result.data.streamerTag,
      shortId: result.data.shortId,
      isOpenBounty: result.data.isOpenBounty,
      isNearbyDare: result.data.isNearbyDare,
      locationLabel: result.data.locationLabel,
    };
  }

  if (!CONTRACT_VALIDATION.coreValid) {
    throw new Error(
      CONTRACT_VALIDATION.errors.join(' ') ||
        'Contract configuration missing. Set NEXT_PUBLIC_USDC_ADDRESS and NEXT_PUBLIC_BOUNTY_CONTRACT_ADDRESS.'
    );
  }

  if (!options.publicClient || !options.writeContractAsync) {
    throw new Error('Wallet not connected');
  }

  const publicClient = options.publicClient as PublicClientLike;
  const writeContractAsync = options.writeContractAsync as WriteContractAsyncLike;

  const initRes = await fetch('/api/bounties/init', {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify(requestBody),
  });
  const initData = await initRes.json();
  if (!initData.success) {
    throw new Error(initData.error || 'Failed to initialize dare');
  }

  const { dareId, onChainDareId, targetAddress, referrerAddress } = initData.data;
  const amountInUnits = parseUnits(input.amount.toString(), 6);
  const bountyContract = BOUNTY_CONTRACT_ADDRESS as `0x${string}`;

  const currentAllowance = (await publicClient.readContract({
    address: USDC_ADDRESS,
    abi: USDC_ABI,
    functionName: 'allowance',
    args: [input.stakerAddress as `0x${string}`, bountyContract],
  })) as bigint;

  if (currentAllowance < amountInUnits) {
    options.onApprovalStatusChange?.('approving');
    try {
      const approveTx = await writeContractAsync({
        address: USDC_ADDRESS,
        abi: USDC_ABI,
        functionName: 'approve',
        args: [bountyContract, amountInUnits],
      });
      await publicClient.waitForTransactionReceipt({ hash: approveTx });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes('User rejected') || message.includes('User denied')) {
        throw new Error('USDC approval canceled');
      }
      throw new Error(`Failed to approve USDC: ${message}`);
    }
  }

  options.onApprovalStatusChange?.('funding');
  let txHash: string;
  try {
    txHash = await writeContractAsync({
      address: bountyContract,
      abi: BOUNTY_ABI,
      functionName: 'fundBounty',
      args: [
        BigInt(onChainDareId),
        targetAddress as `0x${string}`,
        referrerAddress as `0x${string}`,
        amountInUnits,
      ],
    });
    await publicClient.waitForTransactionReceipt({ hash: txHash as `0x${string}` });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('User rejected') || message.includes('User denied')) {
      throw new Error('Dare creation canceled');
    }
    throw new Error(`Dare creation failed onchain: ${message}`);
  }

  options.onApprovalStatusChange?.('verifying');
  const regRes = await fetch('/api/bounties/register', {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify({ dareId, txHash }),
  });
  const regData = await regRes.json();

  if (!regData.success) {
    throw new Error(`Dare created onchain (tx: ${txHash}), sync pending - contact support`);
  }

  return {
    dareId: regData.data.id,
    simulated: false,
    awaitingClaim: regData.data.status === 'AWAITING_CLAIM',
    streamerTag: regData.data.streamerHandle,
    shortId: regData.data.shortId,
    isOpenBounty: !regData.data.streamerHandle,
    isNearbyDare: Boolean(requestBody.isNearbyDare),
    locationLabel: (requestBody.locationLabel as string | undefined) ?? null,
  };
}
