import { createPublicClient, createWalletClient, http, type Address, isAddress } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base } from 'viem/chains';
import { PROTOCOL_ABI, USDC_ABI } from '@/abis/BaseDareProtocol';

// ============================================================================
// CONTRACT ADDRESS VALIDATION
// ============================================================================

interface ContractValidationResult {
  isValid: boolean;
  address: Address | null;
  error?: string;
  errorCode?: string;
}

/**
 * Validates a contract address from environment variable
 * Returns clear error messages for debugging and user feedback
 */
function validateContractAddress(
  envValue: string | undefined,
  name: string
): ContractValidationResult {
  // Check if env var is defined
  if (!envValue) {
    return {
      isValid: false,
      address: null,
      error: `${name} not configured. Set ${name} in your .env file.`,
      errorCode: 'ENV_VAR_MISSING',
    };
  }

  // Check if it's a placeholder value (common mistake)
  if (
    envValue.includes('placeholder') ||
    envValue.includes('YOUR_') ||
    envValue.includes('xxx') ||
    envValue === '0x0000000000000000000000000000000000000000'
  ) {
    return {
      isValid: false,
      address: null,
      error: `${name} contains a placeholder value. Deploy contract and update .env with real address.`,
      errorCode: 'PLACEHOLDER_ADDRESS',
    };
  }

  // Check if it's a valid Ethereum address format
  if (!isAddress(envValue)) {
    return {
      isValid: false,
      address: null,
      error: `${name} is not a valid Ethereum address. Got: "${envValue.slice(0, 20)}..."`,
      errorCode: 'INVALID_ADDRESS_FORMAT',
    };
  }

  return {
    isValid: true,
    address: envValue as Address,
  };
}

// Validate all contract addresses
const protocolValidation = validateContractAddress(
  process.env.NEXT_PUBLIC_PROTOCOL_CONTRACT_ADDRESS,
  'NEXT_PUBLIC_PROTOCOL_CONTRACT_ADDRESS'
);

const bountyValidation = validateContractAddress(
  process.env.NEXT_PUBLIC_BOUNTY_CONTRACT_ADDRESS,
  'NEXT_PUBLIC_BOUNTY_CONTRACT_ADDRESS'
);

const usdcValidation = validateContractAddress(
  process.env.NEXT_PUBLIC_USDC_ADDRESS,
  'NEXT_PUBLIC_USDC_ADDRESS'
);

// Export validation results for components to check
export const CONTRACT_VALIDATION = {
  protocol: protocolValidation,
  bounty: bountyValidation,
  usdc: usdcValidation,
  allValid: protocolValidation.isValid && bountyValidation.isValid && usdcValidation.isValid,
  errors: [
    protocolValidation.error,
    bountyValidation.error,
    usdcValidation.error,
  ].filter(Boolean) as string[],
};

// Contract addresses (with fallback to zero address for type safety)
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' as Address;

export const PROTOCOL_CONTRACT_ADDRESS = protocolValidation.address || ZERO_ADDRESS;
export const BOUNTY_CONTRACT_ADDRESS = bountyValidation.address || ZERO_ADDRESS;
export const USDC_ADDRESS = usdcValidation.address || ZERO_ADDRESS;

// Helper to check if a specific contract is configured
export function isContractConfigured(contract: 'protocol' | 'bounty' | 'usdc'): boolean {
  switch (contract) {
    case 'protocol':
      return protocolValidation.isValid;
    case 'bounty':
      return bountyValidation.isValid;
    case 'usdc':
      return usdcValidation.isValid;
    default:
      return false;
  }
}

// Helper to get validation error for a specific contract
export function getContractError(contract: 'protocol' | 'bounty' | 'usdc'): string | null {
  switch (contract) {
    case 'protocol':
      return protocolValidation.error || null;
    case 'bounty':
      return bountyValidation.error || null;
    case 'usdc':
      return usdcValidation.error || null;
    default:
      return null;
  }
}

// ============================================================================
// VIEM CLIENTS
// ============================================================================

// Public client for reading contract state
export const publicClient = createPublicClient({
  chain: base,
  transport: http(process.env.NEXT_PUBLIC_RPC_URL || 'https://mainnet.base.org'),
});

// Wallet client factory (for write operations) - SERVER ONLY
export function getWalletClient() {
  const privateKey = process.env.REFEREE_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error('REFEREE_PRIVATE_KEY not configured. Set this in your .env file (server-side only).');
  }

  if (!privateKey.startsWith('0x') || privateKey.length !== 66) {
    throw new Error('REFEREE_PRIVATE_KEY has invalid format. Expected 0x-prefixed 64-character hex string.');
  }

  const account = privateKeyToAccount(privateKey as `0x${string}`);
  return createWalletClient({
    account,
    chain: base,
    transport: http(process.env.NEXT_PUBLIC_RPC_URL || 'https://mainnet.base.org'),
  });
}

// Contract ABIs
export { PROTOCOL_ABI, USDC_ABI };

