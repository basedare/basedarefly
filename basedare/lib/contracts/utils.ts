import { publicClient, PROTOCOL_CONTRACT_ADDRESS, PROTOCOL_ABI } from '../contracts';
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
export function extractDareIdFromReceipt(receipt: any): bigint | null {
  try {
    // Look for DareCreated event
    // Adjust based on your actual event signature
    for (const log of receipt.logs || []) {
      try {
        const decoded = decodeEventLog({
          abi: PROTOCOL_ABI,
          data: log.data,
          topics: log.topics,
        });
        
        // Check if this is a DareCreated event
        if (decoded.eventName === 'DareCreated' && decoded.args) {
          // Adjust field name based on your event structure
          return (decoded.args as any).dareId || (decoded.args as any).id;
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
  try {
    const [protocolFee, referralFee, oracleAddress, accumulatedFees] = await Promise.all([
      publicClient.readContract({
        address: PROTOCOL_CONTRACT_ADDRESS,
        abi: PROTOCOL_ABI,
        functionName: 'protocolFee',
      }),
      publicClient.readContract({
        address: PROTOCOL_CONTRACT_ADDRESS,
        abi: PROTOCOL_ABI,
        functionName: 'referralFee',
      }),
      publicClient.readContract({
        address: PROTOCOL_CONTRACT_ADDRESS,
        abi: PROTOCOL_ABI,
        functionName: 'oracleAddress',
      }),
      publicClient.readContract({
        address: PROTOCOL_CONTRACT_ADDRESS,
        abi: PROTOCOL_ABI,
        functionName: 'accumulatedFees',
      }),
    ]);

    return {
      protocolFee: Number(protocolFee),
      referralFee: Number(referralFee),
      oracleAddress: oracleAddress as Address,
      accumulatedFees,
    };
  } catch (error) {
    console.error('Error fetching protocol config:', error);
    throw error;
  }
}



