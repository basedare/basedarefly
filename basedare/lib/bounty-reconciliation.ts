import { parseAbiItem, parseUnits } from 'viem';
import { BOUNTY_ABI } from '@/abis/BaseDareBounty';
import { BOUNTY_CONTRACT_ADDRESS, CONTRACT_VALIDATION, publicClient } from '@/lib/contracts';
import { generateOnChainDareId } from '@/lib/dare-id';
import { prisma } from '@/lib/prisma';
import { getPostFundingDareStatus } from '@/lib/dare-status';

const bountyFundedEvent = parseAbiItem(
  'event BountyFunded(uint256 indexed dareId, address indexed backer, uint256 amount)'
);

type FundingReconciliationDare = {
  id: string;
  bounty: number;
  status: string;
  onChainDareId: string | null;
  txHash: string | null;
  stakerAddress: string | null;
  targetWalletAddress: string | null;
};

function toExpectedAmountUnits(bounty: number) {
  return parseUnits(bounty.toFixed(6), 6);
}

export async function reconcileFundingDare<T extends FundingReconciliationDare>(
  dare: T
): Promise<T> {
  if (dare.status !== 'FUNDING' || !CONTRACT_VALIDATION.bounty.isValid) {
    return dare;
  }

  const expectedOnChainDareId = dare.onChainDareId || generateOnChainDareId(dare.id).toString();

  try {
    const [amount, streamer, , backer] = (await publicClient.readContract({
      address: BOUNTY_CONTRACT_ADDRESS,
      abi: BOUNTY_ABI,
      functionName: 'bounties',
      args: [BigInt(expectedOnChainDareId)],
    })) as readonly [bigint, `0x${string}`, `0x${string}`, `0x${string}`, boolean];

    if (amount <= BigInt(0)) {
      return dare;
    }

    if (
      dare.targetWalletAddress &&
      streamer.toLowerCase() !== dare.targetWalletAddress.toLowerCase()
    ) {
      return dare;
    }

    if (
      dare.stakerAddress &&
      backer.toLowerCase() !== dare.stakerAddress.toLowerCase()
    ) {
      return dare;
    }

    const expectedAmount = toExpectedAmountUnits(dare.bounty);
    if (amount < expectedAmount) {
      return dare;
    }

    const fundingLogs = await publicClient.getLogs({
      address: BOUNTY_CONTRACT_ADDRESS,
      event: bountyFundedEvent,
      args: { dareId: BigInt(expectedOnChainDareId) },
    });

    const latestFunding = fundingLogs.at(-1);

    const reconciled = await prisma.dare.update({
      where: { id: dare.id },
      data: {
        status: getPostFundingDareStatus({
          isAwaitingClaim: false,
          targetWalletAddress: dare.targetWalletAddress,
        }),
        onChainDareId: expectedOnChainDareId,
        txHash: latestFunding?.transactionHash ?? dare.txHash ?? null,
      },
      select: {
        status: true,
        onChainDareId: true,
        txHash: true,
      },
    });

    return {
      ...dare,
      status: reconciled.status,
      onChainDareId: reconciled.onChainDareId,
      txHash: reconciled.txHash,
    };
  } catch (error) {
    console.warn('[BOUNTY_RECONCILE] Failed to reconcile funding state', {
      dareId: dare.id,
      error: error instanceof Error ? error.message : String(error),
    });
    return dare;
  }
}

export async function reconcileFundingDares<T extends FundingReconciliationDare>(
  dares: T[]
): Promise<T[]> {
  if (dares.length === 0) return dares;

  return Promise.all(dares.map((dare) => reconcileFundingDare(dare)));
}
