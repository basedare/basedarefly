import { keccak256, toBytes } from 'viem';

/**
 * Generate a deterministic on-chain dare ID from a database CUID.
 * Uses keccak256 hash truncated to uint256 for contract compatibility.
 */
export function generateOnChainDareId(dbId: string): bigint {
  const hash = keccak256(toBytes(dbId));
  return BigInt(hash);
}
