import {
  publicClient,
  PROTOCOL_CONTRACT_ADDRESS,
  PROTOCOL_ABI,
  BOUNTY_CONTRACT_ADDRESS,
  BOUNTY_ABI,
  USDC_ADDRESS,
  CONTRACT_VALIDATION,
  NETWORK_CONFIG,
} from '../contracts';
import { decodeEventLog, type Address } from 'viem';

/**
 * Utility functions for interacting with smart contracts
 */

/**
 * Get a dare from the on-chain contract
 */
export async function getOnchainDare(dareId: bigint | number) {
  try {
    const dareIdBigInt = typeof dareId === 'number' ? BigInt(dareId) : dareId;
    
    const dare = await publicClient.readContract({
      address: PROTOCOL_CONTRACT_ADDRESS,
      abi: PROTOCOL_ABI,
      functionName: 'dares',
      args: [dareIdBigInt],
    });

    return dare;
  } catch (error) {
    console.error('Error fetching on-chain dare:', error);
    throw error;
  }
}

/**
 * Get the next dare ID (current count)
 */
export async function getNextDareId() {
  try {
    const nextId = await publicClient.readContract({
      address: PROTOCOL_CONTRACT_ADDRESS,
      abi: PROTOCOL_ABI,
      functionName: 'nextDareId',
    });

    return nextId;
  } catch (error) {
    console.error('Error fetching next dare ID:', error);
    throw error;
  }
}

/**
 * Extract dare ID from transaction receipt events
 */
type ReceiptLog = {
  data: `0x${string}`;
  topics: readonly `0x${string}`[];
};

type MinimalReceipt = {
  logs?: ReceiptLog[];
};

export function extractDareIdFromReceipt(receipt: MinimalReceipt): bigint | null {
  try {
    // Look for DareCreated event
    // Adjust based on your actual event signature
    for (const log of receipt.logs || []) {
      try {
        if (!log.topics.length) continue;
        const topics = [...log.topics] as [`0x${string}`, ...`0x${string}`[]];
        const decoded = decodeEventLog({
          abi: PROTOCOL_ABI,
          data: log.data,
          topics,
        });
        
        // Check if this is a DareCreated event
        if (decoded.eventName === 'DareCreated' && decoded.args) {
          const args = decoded.args as Record<string, unknown>;
          const dareId = args.dareId ?? args.id;
          return typeof dareId === 'bigint' ? dareId : null;
        }
      } catch {
        // Skip logs that don't match
        continue;
      }
    }
    return null;
  } catch (error) {
    console.error('Error extracting dare ID from receipt:', error);
    return null;
  }
}

/**
 * Get protocol configuration
 */
export async function getProtocolConfig() {
  const readErrors: string[] = [];

  async function safeRead<T>(
    label: string,
    reader: () => Promise<T>
  ): Promise<T | null> {
    try {
      return await reader();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      readErrors.push(`${label}: ${message}`);
      return null;
    }
  }

  const protocolReads = CONTRACT_VALIDATION.protocol.isValid
    ? await Promise.all([
        safeRead('protocolFee', () =>
          publicClient.readContract({
            address: PROTOCOL_CONTRACT_ADDRESS,
            abi: PROTOCOL_ABI,
            functionName: 'protocolFee',
          })
        ),
        safeRead('referralFee', () =>
          publicClient.readContract({
            address: PROTOCOL_CONTRACT_ADDRESS,
            abi: PROTOCOL_ABI,
            functionName: 'referralFee',
          })
        ),
        safeRead('oracleAddress', () =>
          publicClient.readContract({
            address: PROTOCOL_CONTRACT_ADDRESS,
            abi: PROTOCOL_ABI,
            functionName: 'oracleAddress',
          })
        ),
        safeRead('accumulatedFees', () =>
          publicClient.readContract({
            address: PROTOCOL_CONTRACT_ADDRESS,
            abi: PROTOCOL_ABI,
            functionName: 'accumulatedFees',
          })
        ),
      ])
    : [null, null, null, null];

  const [protocolFee, referralFee, oracleAddress, accumulatedFees] = protocolReads;

  const bountyReads = CONTRACT_VALIDATION.bounty.isValid
    ? await Promise.all([
        safeRead('bounty.USDC', () =>
          publicClient.readContract({
            address: BOUNTY_CONTRACT_ADDRESS,
            abi: BOUNTY_ABI,
            functionName: 'USDC',
          })
        ),
        safeRead('bounty.PLATFORM_WALLET', () =>
          publicClient.readContract({
            address: BOUNTY_CONTRACT_ADDRESS,
            abi: BOUNTY_ABI,
            functionName: 'PLATFORM_WALLET',
          })
        ),
        safeRead('bounty.AI_REFEREE_ADDRESS', () =>
          publicClient.readContract({
            address: BOUNTY_CONTRACT_ADDRESS,
            abi: BOUNTY_ABI,
            functionName: 'AI_REFEREE_ADDRESS',
          })
        ),
        safeRead('bounty.owner', () =>
          publicClient.readContract({
            address: BOUNTY_CONTRACT_ADDRESS,
            abi: BOUNTY_ABI,
            functionName: 'owner',
          })
        ),
      ])
    : [null, null, null, null];

  const [bountyUsdcAddress, platformWallet, aiRefereeAddress, bountyOwner] = bountyReads;

  const protocolAvailable = [protocolFee, referralFee, oracleAddress, accumulatedFees].some(
    (value) => value !== null
  );
  const bountyAvailable = [bountyUsdcAddress, platformWallet, aiRefereeAddress, bountyOwner].some(
    (value) => value !== null
  );

  return {
    network: NETWORK_CONFIG,
    protocolFee: typeof protocolFee === 'bigint' ? Number(protocolFee) : null,
    referralFee: typeof referralFee === 'bigint' ? Number(referralFee) : null,
    oracleAddress: (oracleAddress as Address | null) ?? null,
    accumulatedFees,
    protocol: {
      configured: CONTRACT_VALIDATION.protocol.isValid,
      available: protocolAvailable,
      address: CONTRACT_VALIDATION.protocol.isValid ? PROTOCOL_CONTRACT_ADDRESS : null,
      protocolFee: typeof protocolFee === 'bigint' ? Number(protocolFee) : null,
      referralFee: typeof referralFee === 'bigint' ? Number(referralFee) : null,
      oracleAddress: (oracleAddress as Address | null) ?? null,
      accumulatedFees,
    },
    bounty: {
      configured: CONTRACT_VALIDATION.bounty.isValid,
      available: bountyAvailable,
      address: CONTRACT_VALIDATION.bounty.isValid ? BOUNTY_CONTRACT_ADDRESS : null,
      usdcAddress: (bountyUsdcAddress as Address | null) ?? USDC_ADDRESS ?? null,
      platformWallet: (platformWallet as Address | null) ?? null,
      aiRefereeAddress: (aiRefereeAddress as Address | null) ?? null,
      owner: (bountyOwner as Address | null) ?? null,
    },
    warnings: [...CONTRACT_VALIDATION.warnings],
    readErrors,
  };
}
