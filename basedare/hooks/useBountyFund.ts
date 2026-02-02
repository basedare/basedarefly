import { useWriteContract, useWaitForTransactionReceipt, usePublicClient } from 'wagmi';
import { parseUnits, isAddress, type Address } from 'viem';
import { BOUNTY_ABI, USDC_ABI } from '@/abis/BaseDareBounty';

const BOUNTY_ADDRESS = process.env.NEXT_PUBLIC_BOUNTY_CONTRACT_ADDRESS as `0x${string}`;
const USDC_ADDRESS = process.env.NEXT_PUBLIC_USDC_ADDRESS as `0x${string}`;
const PLATFORM_WALLET = process.env.NEXT_PUBLIC_PLATFORM_WALLET_ADDRESS as `0x${string}`;

export function useBountyFund() {
    const { writeContractAsync, data: hash } = useWriteContract();
    const publicClient = usePublicClient();

    const { isLoading: isConfirming, isSuccess: isConfirmed } =
        useWaitForTransactionReceipt({ hash });

    const fund = async (dareId: number, streamer: string, referrer: string, amount: string) => {
        try {
            const amountInUnits = parseUnits(amount, 6);

            // Validate referrer — substitute platform wallet if zero address or invalid
            const safeReferrer: Address = (referrer && isAddress(referrer) && referrer !== '0x0000000000000000000000000000000000000000')
                ? referrer as Address
                : PLATFORM_WALLET;

            // 1. APPROVE
            const approveHash = await writeContractAsync({
                address: USDC_ADDRESS,
                abi: USDC_ABI,
                functionName: 'approve',
                args: [BOUNTY_ADDRESS, amountInUnits],
            });

            // Wait for approve to confirm before funding
            if (publicClient) {
                await publicClient.waitForTransactionReceipt({ hash: approveHash });
            }

            // 2. FUND BOUNTY
            return await writeContractAsync({
                address: BOUNTY_ADDRESS,
                abi: BOUNTY_ABI,
                functionName: 'fundBounty',
                args: [BigInt(dareId), streamer as `0x${string}`, safeReferrer, amountInUnits],
            });
        } catch (err) {
            throw err;
        }
    };

    return { fund, hash, isConfirming, isConfirmed };
}
