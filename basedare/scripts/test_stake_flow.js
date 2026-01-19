/**
 * Test Script: End-to-End Stake Flow on Base Sepolia
 *
 * This script verifies:
 * 1. Contract deployment status
 * 2. AI Referee configuration
 * 3. USDC balance of referee wallet
 * 4. Execute a test stake (optional)
 *
 * Usage: node scripts/test_stake_flow.js
 */

require("dotenv").config({ path: '.env.local' });
const { createPublicClient, createWalletClient, http, formatUnits, parseUnits } = require('viem');
const { privateKeyToAccount } = require('viem/accounts');
const { baseSepolia } = require('viem/chains');

// Contract addresses from .env.local
const BOUNTY_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_BOUNTY_CONTRACT_ADDRESS;
const USDC_ADDRESS = process.env.NEXT_PUBLIC_USDC_ADDRESS;
const REFEREE_PRIVATE_KEY = process.env.REFEREE_PRIVATE_KEY;

// Minimal ABIs for testing
const BOUNTY_ABI = [
  {
    name: 'AI_REFEREE_ADDRESS',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'address' }],
  },
  {
    name: 'HOUSE_WALLET',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'address' }],
  },
  {
    name: 'USDC',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'address' }],
  },
  {
    name: 'owner',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'address' }],
  },
  {
    name: 'bounties',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ type: 'uint256', name: '_dareId' }],
    outputs: [
      { type: 'uint256', name: 'amount' },
      { type: 'address', name: 'streamer' },
      { type: 'address', name: 'referrer' },
      { type: 'address', name: 'staker' },
      { type: 'bool', name: 'isVerified' },
    ],
  },
  {
    name: 'stakeBounty',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { type: 'uint256', name: '_dareId' },
      { type: 'address', name: '_streamer' },
      { type: 'address', name: '_referrer' },
      { type: 'uint256', name: '_amount' },
    ],
    outputs: [],
  },
];

const USDC_ABI = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ type: 'address', name: 'account' }],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'allowance',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { type: 'address', name: 'owner' },
      { type: 'address', name: 'spender' },
    ],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { type: 'address', name: 'spender' },
      { type: 'uint256', name: 'amount' },
    ],
    outputs: [{ type: 'bool' }],
  },
];

async function main() {
  console.log('\n========================================');
  console.log('  BaseDare Stake Flow Test');
  console.log('  Network: Base Sepolia');
  console.log('========================================\n');

  // Validate environment
  if (!BOUNTY_CONTRACT_ADDRESS) {
    console.error('❌ NEXT_PUBLIC_BOUNTY_CONTRACT_ADDRESS not set');
    process.exit(1);
  }
  if (!USDC_ADDRESS) {
    console.error('❌ NEXT_PUBLIC_USDC_ADDRESS not set');
    process.exit(1);
  }
  if (!REFEREE_PRIVATE_KEY) {
    console.error('❌ REFEREE_PRIVATE_KEY not set');
    process.exit(1);
  }

  console.log('📋 Configuration:');
  console.log(`   Bounty Contract: ${BOUNTY_CONTRACT_ADDRESS}`);
  console.log(`   USDC Address:    ${USDC_ADDRESS}`);

  // Create clients
  const account = privateKeyToAccount(REFEREE_PRIVATE_KEY);
  console.log(`   Referee Wallet:  ${account.address}`);

  const publicClient = createPublicClient({
    chain: baseSepolia,
    transport: http(),
  });

  const walletClient = createWalletClient({
    account,
    chain: baseSepolia,
    transport: http(),
  });

  // Check ETH balance (for gas)
  const ethBalance = await publicClient.getBalance({ address: account.address });
  console.log(`\n💰 ETH Balance: ${formatUnits(ethBalance, 18)} ETH`);
  if (ethBalance === 0n) {
    console.error('❌ No ETH for gas! Get testnet ETH from https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet');
    process.exit(1);
  }

  // Check USDC balance
  const usdcBalance = await publicClient.readContract({
    address: USDC_ADDRESS,
    abi: USDC_ABI,
    functionName: 'balanceOf',
    args: [account.address],
  });
  console.log(`💵 USDC Balance: ${formatUnits(usdcBalance, 6)} USDC`);

  // Check contract state
  console.log('\n📝 Contract State:');

  try {
    const owner = await publicClient.readContract({
      address: BOUNTY_CONTRACT_ADDRESS,
      abi: BOUNTY_ABI,
      functionName: 'owner',
    });
    console.log(`   Owner:           ${owner}`);

    const referee = await publicClient.readContract({
      address: BOUNTY_CONTRACT_ADDRESS,
      abi: BOUNTY_ABI,
      functionName: 'AI_REFEREE_ADDRESS',
    });
    console.log(`   AI Referee:      ${referee}`);

    const houseWallet = await publicClient.readContract({
      address: BOUNTY_CONTRACT_ADDRESS,
      abi: BOUNTY_ABI,
      functionName: 'HOUSE_WALLET',
    });
    console.log(`   House Wallet:    ${houseWallet}`);

    const usdcInContract = await publicClient.readContract({
      address: BOUNTY_CONTRACT_ADDRESS,
      abi: BOUNTY_ABI,
      functionName: 'USDC',
    });
    console.log(`   USDC Token:      ${usdcInContract}`);

    // Verify referee is set correctly
    if (referee.toLowerCase() === account.address.toLowerCase()) {
      console.log('\n✅ Referee wallet matches AI_REFEREE_ADDRESS');
    } else if (referee === '0x0000000000000000000000000000000000000000') {
      console.log('\n⚠️  AI_REFEREE_ADDRESS not set! Run setAIRefereeAddress()');
    } else {
      console.log(`\n⚠️  Referee mismatch! Contract expects: ${referee}`);
    }

  } catch (error) {
    console.error('❌ Failed to read contract state:', error.message);
    console.log('   Contract may not be deployed or address is wrong');
    process.exit(1);
  }

  // Check USDC allowance
  const allowance = await publicClient.readContract({
    address: USDC_ADDRESS,
    abi: USDC_ABI,
    functionName: 'allowance',
    args: [account.address, BOUNTY_CONTRACT_ADDRESS],
  });
  console.log(`\n🔐 USDC Allowance: ${formatUnits(allowance, 6)} USDC`);

  // Summary
  console.log('\n========================================');
  console.log('  Summary');
  console.log('========================================');

  const hasEth = ethBalance > 0n;
  const hasUsdc = usdcBalance >= parseUnits('5', 6); // Minimum $5 USDC
  const hasAllowance = allowance >= parseUnits('5', 6);

  console.log(`   ✅ ETH for gas:     ${hasEth ? 'YES' : 'NO'}`);
  console.log(`   ${hasUsdc ? '✅' : '❌'} USDC balance ≥$5: ${hasUsdc ? 'YES' : 'NO'}`);
  console.log(`   ${hasAllowance ? '✅' : '⚠️ '} USDC allowance:   ${hasAllowance ? 'YES' : 'Need to approve'}`);

  if (!hasUsdc) {
    console.log('\n⚠️  Need testnet USDC. Get it from:');
    console.log('   https://faucet.circle.com/ (select Base Sepolia)');
  }

  if (hasUsdc && !hasAllowance) {
    console.log('\n📝 Approving USDC spend...');
    const approveHash = await walletClient.writeContract({
      address: USDC_ADDRESS,
      abi: USDC_ABI,
      functionName: 'approve',
      args: [BOUNTY_CONTRACT_ADDRESS, parseUnits('1000000', 6)], // Approve 1M USDC
    });
    console.log(`   Approval TX: ${approveHash}`);
    await publicClient.waitForTransactionReceipt({ hash: approveHash });
    console.log('   ✅ Approved!');
  }

  // Ready check
  if (hasEth && hasUsdc) {
    console.log('\n✅ Ready for stake flow test!');
    console.log('\nTo test the full flow:');
    console.log('1. Set SIMULATE_BOUNTIES=false in .env.local');
    console.log('2. Start dev server: npm run dev');
    console.log('3. Create a bounty from the UI');
    console.log('4. Check this wallet for the staked USDC');
  } else {
    console.log('\n❌ Not ready - fix the issues above first');
  }

  console.log('\n');
}

main().catch(console.error);
