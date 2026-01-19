/**
 * Execute Test Stake: Creates a real bounty on Base Sepolia
 *
 * Prerequisites:
 * - Run test_stake_flow.js first to verify setup
 * - REFEREE wallet must have ≥$5 USDC
 *
 * Usage: node scripts/execute_test_stake.js
 */

require("dotenv").config({ path: '.env.local' });
const { createPublicClient, createWalletClient, http, formatUnits, parseUnits } = require('viem');
const { privateKeyToAccount } = require('viem/accounts');
const { baseSepolia } = require('viem/chains');

const BOUNTY_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_BOUNTY_CONTRACT_ADDRESS;
const USDC_ADDRESS = process.env.NEXT_PUBLIC_USDC_ADDRESS;
const REFEREE_PRIVATE_KEY = process.env.REFEREE_PRIVATE_KEY;

const BOUNTY_ABI = [
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
  {
    name: 'verifyAndPayout',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ type: 'uint256', name: '_dareId' }],
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
  console.log('  Execute Test Stake');
  console.log('  Network: Base Sepolia');
  console.log('========================================\n');

  const account = privateKeyToAccount(REFEREE_PRIVATE_KEY);
  console.log(`Referee Wallet: ${account.address}`);

  const publicClient = createPublicClient({
    chain: baseSepolia,
    transport: http(),
  });

  const walletClient = createWalletClient({
    account,
    chain: baseSepolia,
    transport: http(),
  });

  // Check USDC balance
  const usdcBalance = await publicClient.readContract({
    address: USDC_ADDRESS,
    abi: USDC_ABI,
    functionName: 'balanceOf',
    args: [account.address],
  });

  console.log(`USDC Balance: ${formatUnits(usdcBalance, 6)} USDC`);

  const stakeAmount = parseUnits('5', 6); // $5 USDC

  if (usdcBalance < stakeAmount) {
    console.error('\n❌ Insufficient USDC! Need at least $5');
    console.log('Get testnet USDC from: https://faucet.circle.com/');
    process.exit(1);
  }

  // Check allowance
  const allowance = await publicClient.readContract({
    address: USDC_ADDRESS,
    abi: USDC_ABI,
    functionName: 'allowance',
    args: [account.address, BOUNTY_CONTRACT_ADDRESS],
  });

  if (allowance < stakeAmount) {
    console.log('\n📝 Approving USDC spend...');
    const approveHash = await walletClient.writeContract({
      address: USDC_ADDRESS,
      abi: USDC_ABI,
      functionName: 'approve',
      args: [BOUNTY_CONTRACT_ADDRESS, parseUnits('1000000', 6)],
    });
    console.log(`Approval TX: ${approveHash}`);
    await publicClient.waitForTransactionReceipt({ hash: approveHash });
    console.log('✅ Approved!\n');
  }

  // Generate unique dare ID
  const dareId = BigInt(Date.now());
  const testStreamer = '0x1234567890123456789012345678901234567890'; // Mock streamer
  const noReferrer = '0x0000000000000000000000000000000000000000';

  console.log('\n📋 Test Stake Details:');
  console.log(`   Dare ID:   ${dareId}`);
  console.log(`   Amount:    5 USDC`);
  console.log(`   Streamer:  ${testStreamer}`);
  console.log(`   Staker:    ${account.address}`);

  // Execute stake
  console.log('\n⏳ Executing stakeBounty()...');
  const txHash = await walletClient.writeContract({
    address: BOUNTY_CONTRACT_ADDRESS,
    abi: BOUNTY_ABI,
    functionName: 'stakeBounty',
    args: [dareId, testStreamer, noReferrer, stakeAmount],
  });

  console.log(`TX Hash: ${txHash}`);
  console.log('⏳ Waiting for confirmation...');

  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });

  if (receipt.status === 'success') {
    console.log('\n✅ STAKE SUCCESSFUL!');
    console.log(`   Block: ${receipt.blockNumber}`);
    console.log(`   Gas Used: ${receipt.gasUsed}`);

    // Verify bounty was created
    const bounty = await publicClient.readContract({
      address: BOUNTY_CONTRACT_ADDRESS,
      abi: BOUNTY_ABI,
      functionName: 'bounties',
      args: [dareId],
    });

    console.log('\n📦 On-chain Bounty Data:');
    console.log(`   Amount:     ${formatUnits(bounty[0], 6)} USDC`);
    console.log(`   Streamer:   ${bounty[1]}`);
    console.log(`   Referrer:   ${bounty[2]}`);
    console.log(`   Staker:     ${bounty[3]}`);
    console.log(`   isVerified: ${bounty[4]}`);

    // Check new USDC balance
    const newBalance = await publicClient.readContract({
      address: USDC_ADDRESS,
      abi: USDC_ABI,
      functionName: 'balanceOf',
      args: [account.address],
    });
    console.log(`\n💵 New USDC Balance: ${formatUnits(newBalance, 6)} USDC`);

    console.log('\n========================================');
    console.log('  ✅ END-TO-END STAKE FLOW VERIFIED');
    console.log('========================================');
    console.log('\nNext: Test verifyAndPayout() with this dareId:', dareId.toString());

  } else {
    console.error('\n❌ STAKE FAILED!');
    console.log('   Status:', receipt.status);
  }
}

main().catch(console.error);
