import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseUnits } from 'viem';
import { BOUNTY_ABI, USDC_ABI } from '@/abis/BaseDareBounty';

const BOUNTY_ADDRESS = process.env.NEXT_PUBLIC_BOUNTY_CONTRACT_ADDRESS as `0x${string}`;
const USDC_ADDRESS = process.env.NEXT_PUBLIC_USDC_ADDRESS as `0x${string}`;

export function useBountyStake() {
    const { writeContractAsync, data: hash } = useWriteContract();

    // This is the "Confirmation Watcher"
    const { isLoading: isConfirming, isSuccess: isConfirmed } = 
        useWaitForTransactionReceipt({ hash });

    const stake = async (dareId: number, streamer: string, referrer: string, amount: string) => {
        try {
            const amountInUnits = parseUnits(amount, 6);

            // 1. APPROVE
            await writeContractAsync({
                address: USDC_ADDRESS,
                abi: USDC_ABI,
                functionName: 'approve',
                args: [BOUNTY_ADDRESS, amountInUnits],
            });

            // 2. STAKE
            return await writeContractAsync({
                address: BOUNTY_ADDRESS,
                abi: BOUNTY_ABI,
                functionName: 'stakeBounty',
                args: [BigInt(dareId), streamer as `0x${string}`, referrer as `0x${string}`, amountInUnits],
            });
        } catch (err) {
            throw err;
        }
    };

    return { stake, hash, isConfirming, isConfirmed };
}






