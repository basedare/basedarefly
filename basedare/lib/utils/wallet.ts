import { getBaseChain } from '@/lib/base-chain';

/**
 * Utility to truncate an EVM wallet address for display.
 * @param address The full wallet address.
 * @returns Truncated address (e.g., 0x12...34yz)
 */
export function truncateAddress(address?: string | null): string {
    if (!address || address.length !== 42) return '0x...';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * Utility to determine the current active chain based on environment.
 * @returns viem Chain object (baseSepolia for dev, base for prod)
 */
export function getActiveChain() {
    return getBaseChain();
}

/**
 * Simple helper to format raw USDC amounts (6 decimals typically) into UI-friendly numbers.
 */
export function formatUsdc(rawAmount: bigint | number): string {
    if (typeof rawAmount === 'number') return rawAmount.toLocaleString();

    // Assumes USDC has 6 decimals
    const formatted = Number(rawAmount) / 1_000_000;
    return formatted.toLocaleString();
}
