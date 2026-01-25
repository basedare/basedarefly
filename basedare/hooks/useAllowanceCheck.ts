'use client';

import { useState, useCallback } from 'react';
import { createPublicClient, http, formatUnits, parseUnits, type Address } from 'viem';
import { base, baseSepolia } from 'viem/chains';
import { USDC_ABI } from '@/abis/BaseDareBounty';

// Network selection based on environment
const IS_MAINNET = process.env.NEXT_PUBLIC_NETWORK === 'mainnet';
const activeChain = IS_MAINNET ? base : baseSepolia;
const rpcUrl = IS_MAINNET ? 'https://mainnet.base.org' : 'https://sepolia.base.org';

// Contract addresses
const BOUNTY_CONTRACT = process.env.NEXT_PUBLIC_BOUNTY_CONTRACT_ADDRESS as Address;
const USDC_ADDRESS = process.env.NEXT_PUBLIC_USDC_ADDRESS as Address;
const REFEREE_WALLET = '0xC9ECB9407e8aD2618310DF9D4EFC494F3B90115E' as Address;

const MIN_ETH_FOR_GAS = 0.001; // Minimum ETH needed for gas

const publicClient = createPublicClient({
  chain: activeChain,
  transport: http(rpcUrl),
});

export interface AllowanceCheckResult {
  hasEnoughGas: boolean;
  hasEnoughAllowance: boolean;
  ethBalance: string;
  usdcAllowance: string;
  requiredAmount: string;
  needsApproval: boolean;
  error: string | null;
}

export function useAllowanceCheck() {
  const [isChecking, setIsChecking] = useState(false);
  const [checkResult, setCheckResult] = useState<AllowanceCheckResult | null>(null);

  const checkAllowance = useCallback(async (amountUSDC: number): Promise<AllowanceCheckResult> => {
    setIsChecking(true);

    try {
      // Convert USDC amount to units (6 decimals)
      const requiredAmount = parseUnits(amountUSDC.toString(), 6);

      // Check ETH balance for gas
      const ethBalance = await publicClient.getBalance({ address: REFEREE_WALLET });
      const ethBalanceFormatted = formatUnits(ethBalance, 18);
      const hasEnoughGas = parseFloat(ethBalanceFormatted) >= MIN_ETH_FOR_GAS;

      // Check USDC allowance
      const allowance = await publicClient.readContract({
        address: USDC_ADDRESS,
        abi: USDC_ABI,
        functionName: 'allowance',
        args: [REFEREE_WALLET, BOUNTY_CONTRACT],
      }) as bigint;

      const allowanceFormatted = formatUnits(allowance, 6);
      const hasEnoughAllowance = allowance >= requiredAmount;

      const result: AllowanceCheckResult = {
        hasEnoughGas,
        hasEnoughAllowance,
        ethBalance: parseFloat(ethBalanceFormatted).toFixed(6),
        usdcAllowance: allowanceFormatted,
        requiredAmount: amountUSDC.toString(),
        needsApproval: !hasEnoughAllowance,
        error: null,
      };

      setCheckResult(result);
      return result;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to check allowance';
      const errorResult: AllowanceCheckResult = {
        hasEnoughGas: false,
        hasEnoughAllowance: false,
        ethBalance: '0',
        usdcAllowance: '0',
        requiredAmount: amountUSDC.toString(),
        needsApproval: true,
        error: message,
      };
      setCheckResult(errorResult);
      return errorResult;
    } finally {
      setIsChecking(false);
    }
  }, []);

  const resetCheck = useCallback(() => {
    setCheckResult(null);
  }, []);

  return {
    checkAllowance,
    isChecking,
    checkResult,
    resetCheck,
  };
}
