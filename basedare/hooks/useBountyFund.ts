import { useState } from 'react';
import { useWriteContract, useWaitForTransactionReceipt, usePublicClient } from 'wagmi';
import { parseUnits, isAddress, type Address } from 'viem';
import { BOUNTY_ABI, USDC_ABI } from '@/abis/BaseDareBounty';

const BOUNTY_ADDRESS = process.env.NEXT_PUBLIC_BOUNTY_CONTRACT_ADDRESS as `0x${string}`;
const USDC_ADDRESS = process.env.NEXT_PUBLIC_USDC_ADDRESS as `0x${string}`;
const PLATFORM_WALLET = process.env.NEXT_PUBLIC_PLATFORM_WALLET_ADDRESS as `0x${string}`;

export type FundingStep = 'idle' | 'approving' | 'waiting-approval' | 'funding' | 'confirming' | 'done';

export interface FundError {
    code: 'USER_REJECTED' | 'INSUFFICIENT_ALLOWANCE' | 'CONTRACT_REVERT' | 'NETWORK_ERROR' | 'UNKNOWN';
    message: string;
    step: FundingStep;
}

function classifyError(err: unknown, step: FundingStep): FundError {
    const message = err instanceof Error ? err.message : String(err);
    const lower = message.toLowerCase();

    if (lower.includes('user rejected') || lower.includes('user denied') || lower.includes('rejected the request')) {
        return { code: 'USER_REJECTED', message: 'Transaction cancelled by user.', step };
    }
    if (lower.includes('insufficient allowance') || lower.includes('exceeds allowance')) {
        return { code: 'INSUFFICIENT_ALLOWANCE', message: 'USDC allowance insufficient. Please approve first.', step };
    }
    if (lower.includes('revert') || lower.includes('execution reverted')) {
        const revertReason = message.match(/reason="([^"]+)"/)?.[1]
            || message.match(/reverted with reason string '([^']+)'/)?.[1]
            || 'Contract call reverted';
        return { code: 'CONTRACT_REVERT', message: revertReason, step };
    }
    if (lower.includes('network') || lower.includes('timeout') || lower.includes('could not detect')) {
        return { code: 'NETWORK_ERROR', message: 'Network error. Check your connection and try again.', step };
    }

    return { code: 'UNKNOWN', message: message.slice(0, 200), step };
}

export function useBountyFund() {
    const { writeContractAsync, data: hash } = useWriteContract();
    const publicClient = usePublicClient();
    const [step, setStep] = useState<FundingStep>('idle');
    const [error, setError] = useState<FundError | null>(null);

    const { isLoading: isConfirming, isSuccess: isConfirmed } =
        useWaitForTransactionReceipt({ hash });

    const fund = async (dareId: number, streamer: string, referrer: string, amount: string) => {
        setError(null);
        setStep('idle');

        try {
            const amountInUnits = parseUnits(amount, 6);

            // Validate referrer — substitute platform wallet if zero address or invalid
            const safeReferrer: Address = (referrer && isAddress(referrer) && referrer !== '0x0000000000000000000000000000000000000000')
                ? referrer as Address
                : PLATFORM_WALLET;

            // 1. APPROVE
            setStep('approving');
            const approveHash = await writeContractAsync({
                address: USDC_ADDRESS,
                abi: USDC_ABI,
                functionName: 'approve',
                args: [BOUNTY_ADDRESS, amountInUnits],
            });

            // Wait for approve to confirm before funding
            setStep('waiting-approval');
            if (publicClient) {
                await publicClient.waitForTransactionReceipt({ hash: approveHash });
            }

            // 2. FUND BOUNTY
            setStep('funding');
            const fundHash = await writeContractAsync({
                address: BOUNTY_ADDRESS,
                abi: BOUNTY_ABI,
                functionName: 'fundBounty',
                args: [BigInt(dareId), streamer as `0x${string}`, safeReferrer, amountInUnits],
            });

            setStep('done');
            return fundHash;
        } catch (err) {
            const classified = classifyError(err, step);
            setError(classified);
            setStep('idle');
            throw classified;
        }
    };

    const reset = () => {
        setStep('idle');
        setError(null);
    };

    return { fund, hash, isConfirming, isConfirmed, step, error, reset };
}
