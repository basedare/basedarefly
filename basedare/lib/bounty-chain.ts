import {
  parseAbiItem,
  type Address,
  type Hash,
} from 'viem';

const payoutEvent = parseAbiItem(
  'event BountyPayout(uint256 indexed dareId, uint256 streamerAmount, uint256 platformFee, uint256 referrerFee)'
);
const refundEvent = parseAbiItem(
  'event BountyRefund(uint256 indexed dareId, address indexed refundRecipient, uint256 amount)'
);

export type BountySettlementEvent =
  | {
      type: 'PAYOUT';
      txHash: Hash;
      blockNumber: bigint;
    }
  | {
      type: 'REFUND';
      txHash: Hash;
      blockNumber: bigint;
    }
  | {
      type: 'NONE';
      txHash: null;
      blockNumber: null;
    };

type MinimalSettlementLog = {
  transactionHash: Hash;
  blockNumber: bigint;
};

type SettlementReader = {
  getTransactionReceipt: (args: { hash: Hash }) => Promise<{ blockNumber: bigint }>;
  getLogs: (args: {
    address: Address;
    event: typeof payoutEvent | typeof refundEvent;
    args: { dareId: bigint };
    fromBlock?: bigint;
  }) => Promise<MinimalSettlementLog[]>;
};

type ReceiptWaiter = {
  waitForTransactionReceipt: (args: { hash: Hash }) => Promise<{
    status: 'success' | 'reverted';
    blockNumber: bigint;
  }>;
};

function compareSettlements(
  left: { blockNumber: bigint; transactionHash: Hash },
  right: { blockNumber: bigint; transactionHash: Hash }
) {
  if (left.blockNumber === right.blockNumber) {
    return left.transactionHash > right.transactionHash ? left : right;
  }

  return left.blockNumber > right.blockNumber ? left : right;
}

async function getStartBlock(
  publicClient: SettlementReader,
  fundingTxHash?: string | null
): Promise<bigint | undefined> {
  if (!fundingTxHash || !fundingTxHash.startsWith('0x')) {
    return undefined;
  }

  try {
    const receipt = await publicClient.getTransactionReceipt({
      hash: fundingTxHash as Hash,
    });
    return receipt.blockNumber;
  } catch {
    return undefined;
  }
}

export async function findBountySettlementEvent(args: {
  publicClient: SettlementReader;
  contractAddress: Address;
  dareId: bigint;
  fundingTxHash?: string | null;
}): Promise<BountySettlementEvent> {
  const { publicClient, contractAddress, dareId, fundingTxHash } = args;
  const fromBlock = await getStartBlock(publicClient, fundingTxHash);

  const [payoutLogs, refundLogs] = await Promise.all([
    publicClient.getLogs({
      address: contractAddress,
      event: payoutEvent,
      args: { dareId },
      fromBlock,
    }),
    publicClient.getLogs({
      address: contractAddress,
      event: refundEvent,
      args: { dareId },
      fromBlock,
    }),
  ]);

  const latestPayout = payoutLogs.at(-1);
  const latestRefund = refundLogs.at(-1);

  if (!latestPayout && !latestRefund) {
    return { type: 'NONE', txHash: null, blockNumber: null };
  }

  if (latestPayout && !latestRefund) {
    return {
      type: 'PAYOUT',
      txHash: latestPayout.transactionHash,
      blockNumber: latestPayout.blockNumber,
    };
  }

  if (!latestPayout && latestRefund) {
    return {
      type: 'REFUND',
      txHash: latestRefund.transactionHash,
      blockNumber: latestRefund.blockNumber,
    };
  }

  const latestSettlement = compareSettlements(
    {
      blockNumber: latestPayout!.blockNumber,
      transactionHash: latestPayout!.transactionHash,
    },
    {
      blockNumber: latestRefund!.blockNumber,
      transactionHash: latestRefund!.transactionHash,
    }
  );

  if (latestSettlement.transactionHash === latestPayout!.transactionHash) {
    return {
      type: 'PAYOUT',
      txHash: latestPayout!.transactionHash,
      blockNumber: latestPayout!.blockNumber,
    };
  }

  return {
    type: 'REFUND',
    txHash: latestRefund!.transactionHash,
    blockNumber: latestRefund!.blockNumber,
  };
}

export async function waitForSuccessfulReceipt(args: {
  publicClient: ReceiptWaiter;
  hash: Hash;
  context: string;
}) {
  const receipt = await args.publicClient.waitForTransactionReceipt({
    hash: args.hash,
  });

  if (receipt.status !== 'success') {
    throw new Error(`${args.context} transaction reverted`);
  }

  return receipt;
}
