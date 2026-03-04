import { getActiveChain } from './wallet';
// Note: You will need to export your actual ABI from your contracts directory once finalized.
// Temporary dummy ABI for compilation
export const DUMMY_ABI = [
    "function createBounty(address target, string title, uint256 amount) external",
    "function releaseBounty(uint256 dareId) external",
    "function refundBounty(uint256 dareId) external"
];

import { BOUNTY_CONTRACT_ADDRESS as CONTRACT_ADDRESS } from '../contracts';

/**
 * Pre-defined configuration for wagmi hooks 
 * Example usage in a React component:
 * 
 * const { writeContract } = useWriteContract();
 * writeContract(contractConfig.createBounty(targetWallet, title, amountWei));
 */
export const contractConfig = {

    createBounty: (targetAddress: `0x${string}`, title: string, amountWei: bigint) => ({
        address: CONTRACT_ADDRESS,
        abi: DUMMY_ABI, // Replace with actual ABI
        functionName: 'createBounty',
        args: [targetAddress, title, amountWei],
        chainId: getActiveChain().id,
    }),

    releaseBounty: (onChainDareId: bigint) => ({
        address: CONTRACT_ADDRESS,
        abi: DUMMY_ABI,
        functionName: 'releaseBounty',
        args: [onChainDareId],
        chainId: getActiveChain().id,
    }),

    refundBounty: (onChainDareId: bigint) => ({
        address: CONTRACT_ADDRESS,
        abi: DUMMY_ABI,
        functionName: 'refundBounty',
        args: [onChainDareId],
        chainId: getActiveChain().id,
    }),
};
