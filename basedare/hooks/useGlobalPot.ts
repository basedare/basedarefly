import { useBalance } from 'wagmi';

// These act as empty "slots" until you fill .env.local later
const BOUNTY_ADDRESS = process.env.NEXT_PUBLIC_BOUNTY_CONTRACT_ADDRESS as `0x${string}`;
const USDC_ADDRESS = process.env.NEXT_PUBLIC_USDC_ADDRESS as `0x${string}`;

export function useGlobalPot() {
    // This hook fetches the USDC balance directly from the Base blockchain
    const { data, isError, isLoading } = useBalance({
        address: BOUNTY_ADDRESS,
        token: USDC_ADDRESS,
        query: {
            refetchInterval: 2000, // The 2-second "Real-Time" heartbeat
        }
    });

    // Formats the raw blockchain data into a readable dollar amount (e.g., $5,000)
    const formattedBalance = data 
        ? new Intl.NumberFormat('en-US', { 
            style: 'currency', 
            currency: 'USD', 
            minimumFractionDigits: 0, 
            maximumFractionDigits: 0 
          }).format(parseFloat(data.formatted))
        : '$0';

    return {
        balance: formattedBalance,
        rawValue: data?.value || 0n,
        isLoading,
        isError
    };
}






