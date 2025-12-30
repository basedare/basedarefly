import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseUnits } from 'viem';
import { PROTOCOL_ABI, USDC_ABI } from '@/abis/BaseDareProtocol';

const PROTOCOL_ADDRESS = process.env.NEXT_PUBLIC_PROTOCOL_ADDRESS as `0x${string}`;
const USDC_ADDRESS = process.env.NEXT_PUBLIC_USDC_ADDRESS as `0x${string}`;

export function useBaseDare() {
  const { writeContractAsync, data: hash } = useWriteContract();

  // This is the "Confirmation Watcher"
  const { isLoading: isConfirming, isSuccess: isConfirmed } = 
    useWaitForTransactionReceipt({ hash });

  // --- 1. INJECT CAPITAL (The "Live Pot" Feature) ---
  const injectCapital = async (dareId: number, amount: string) => {
    try {
      // USDC has 6 decimals, not 18!
      const parsedAmount = parseUnits(amount, 6);

      // Step A: Approve Protocol to spend USDC
      console.log("1. Requesting USDC Approval...");
      const approveTx = await writeContractAsync({
        address: USDC_ADDRESS,
        abi: USDC_ABI,
        functionName: 'approve',
        args: [PROTOCOL_ADDRESS, parsedAmount],
      });
      
      // Step B: Call injectCapital
      console.log("2. Injecting Capital...");
      return await writeContractAsync({
        address: PROTOCOL_ADDRESS,
        abi: PROTOCOL_ABI,
        functionName: 'injectCapital',
        args: [BigInt(dareId), parsedAmount],
      });
    } catch (error) {
      console.error("Injection Failed:", error);
      throw error;
    }
  };

  // --- 2. CREATE DARE ---
  const createDare = async (
    streamerAddress: string, 
    amount: string, 
    referrerAddress: string = "0x0000000000000000000000000000000000000000"
  ) => {
    try {
      const parsedAmount = parseUnits(amount, 6);

      // Step A: Approve USDC
      console.log("1. Requesting USDC Approval...");
      const approveTx = await writeContractAsync({
        address: USDC_ADDRESS,
        abi: USDC_ABI,
        functionName: 'approve',
        args: [PROTOCOL_ADDRESS, parsedAmount],
      });

      // Step B: Create
      console.log("2. Creating Dare...");
      return await writeContractAsync({
        address: PROTOCOL_ADDRESS,
        abi: PROTOCOL_ABI,
        functionName: 'createDare',
        args: [streamerAddress as `0x${string}`, parsedAmount, referrerAddress as `0x${string}`],
      });
    } catch (error) {
      console.error("Create Failed:", error);
      throw error;
    }
  };

  return { 
    injectCapital, 
    createDare, 
    hash, 
    isConfirming, 
    isConfirmed 
  };
}

