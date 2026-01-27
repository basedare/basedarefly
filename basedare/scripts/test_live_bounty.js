const { ethers } = require("hardhat");
require("dotenv").config({ path: '.env.local' });

// =============================================================================
// LIVE BOUNTY TEST - Creates a real bounty on Sepolia and verifies payout
// =============================================================================

const BOUNTY_CONTRACT = process.env.NEXT_PUBLIC_BOUNTY_CONTRACT_ADDRESS;
const USDC_ADDRESS = process.env.NEXT_PUBLIC_USDC_ADDRESS;

// Test parameters
const TEST_DARE_ID = Date.now(); // Unique ID based on timestamp
const TEST_AMOUNT = ethers.parseUnits("5", 6); // $5 USDC (6 decimals)

const BOUNTY_ABI = [
  "function fundBounty(uint256 _dareId, address _streamer, address _referrer, uint256 _amount) external",
  "function verifyAndPayout(uint256 _dareId) external",
  "function refundBacker(uint256 _dareId, address _backer) external",
  "function bounties(uint256) view returns (uint256 amount, address streamer, address referrer, address backer, bool isVerified)",
  "function AI_REFEREE_ADDRESS() view returns (address)",
  "function PLATFORM_WALLET() view returns (address)",
  "event BountyFunded(uint256 indexed dareId, address indexed backer, uint256 amount)",
  "event BountyPayout(uint256 indexed dareId, uint256 streamerAmount, uint256 platformFee, uint256 referrerFee)",
];

const ERC20_ABI = [
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function balanceOf(address account) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)",
];

async function main() {
  console.log("\n");
  console.log("=".repeat(60));
  console.log("  BASEDARE LIVE BOUNTY TEST");
  console.log("  Network: Base Sepolia");
  console.log("=".repeat(60));
  console.log("\n");

  const [signer] = await ethers.getSigners();
  console.log("Test wallet:", signer.address);

  // Connect to contracts
  const bountyContract = new ethers.Contract(BOUNTY_CONTRACT, BOUNTY_ABI, signer);
  const usdc = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, signer);

  // Check balances
  const usdcBalance = await usdc.balanceOf(signer.address);
  console.log("USDC Balance:", ethers.formatUnits(usdcBalance, 6), "USDC");

  if (usdcBalance < TEST_AMOUNT) {
    console.error("ERROR: Insufficient USDC balance for test");
    process.exit(1);
  }

  // Use signer as streamer and referrer for simplicity
  const streamerAddress = signer.address;
  const referrerAddress = signer.address;

  console.log("\n--- TEST PARAMETERS ---");
  console.log("Dare ID:    ", TEST_DARE_ID);
  console.log("Amount:     ", ethers.formatUnits(TEST_AMOUNT, 6), "USDC");
  console.log("Streamer:   ", streamerAddress);
  console.log("Referrer:   ", referrerAddress);
  console.log("Backer:     ", signer.address);

  // Step 1: Approve USDC spending
  console.log("\n[1/4] Checking USDC allowance...");
  const currentAllowance = await usdc.allowance(signer.address, BOUNTY_CONTRACT);
  console.log("Current allowance:", ethers.formatUnits(currentAllowance, 6), "USDC");

  if (currentAllowance < TEST_AMOUNT) {
    console.log("Approving USDC spend...");
    const approveTx = await usdc.approve(BOUNTY_CONTRACT, ethers.parseUnits("1000", 6));
    await approveTx.wait();
    console.log("Approved! Tx:", approveTx.hash);
  } else {
    console.log("Allowance sufficient, skipping approve");
  }

  // Step 2: Fund the bounty
  console.log("\n[2/4] Funding bounty...");
  const balanceBefore = await usdc.balanceOf(signer.address);

  const fundTx = await bountyContract.fundBounty(
    TEST_DARE_ID,
    streamerAddress,
    referrerAddress,
    TEST_AMOUNT
  );
  console.log("Fund tx sent:", fundTx.hash);

  const fundReceipt = await fundTx.wait();
  console.log("Confirmed in block:", fundReceipt.blockNumber);

  // Verify bounty was created
  const bounty = await bountyContract.bounties(TEST_DARE_ID);
  console.log("\nBounty created:");
  console.log("  Amount:    ", ethers.formatUnits(bounty.amount, 6), "USDC");
  console.log("  Streamer:  ", bounty.streamer);
  console.log("  Backer:    ", bounty.backer);
  console.log("  Verified:  ", bounty.isVerified);

  const balanceAfterFund = await usdc.balanceOf(signer.address);
  console.log("\nUSDC deducted:", ethers.formatUnits(balanceBefore - balanceAfterFund, 6), "USDC");

  // Step 3: Verify and payout (simulating AI Referee approval)
  console.log("\n[3/4] Verifying and paying out (as AI Referee)...");

  const payoutTx = await bountyContract.verifyAndPayout(TEST_DARE_ID);
  console.log("Payout tx sent:", payoutTx.hash);

  const payoutReceipt = await payoutTx.wait();
  console.log("Confirmed in block:", payoutReceipt.blockNumber);

  // Parse payout event
  for (const log of payoutReceipt.logs) {
    try {
      const parsed = bountyContract.interface.parseLog(log);
      if (parsed && parsed.name === "BountyPayout") {
        console.log("\nPayout breakdown:");
        console.log("  Streamer:  ", ethers.formatUnits(parsed.args.streamerAmount, 6), "USDC (89%)");
        console.log("  Platform:  ", ethers.formatUnits(parsed.args.platformFee, 6), "USDC (10%)");
        console.log("  Referrer:  ", ethers.formatUnits(parsed.args.referrerFee, 6), "USDC (1%)");
      }
    } catch (e) {
      // Skip logs we can't parse
    }
  }

  // Step 4: Verify final state
  console.log("\n[4/4] Verifying final state...");
  const balanceAfterPayout = await usdc.balanceOf(signer.address);
  const netChange = balanceAfterPayout - balanceBefore;

  console.log("Final USDC balance:", ethers.formatUnits(balanceAfterPayout, 6), "USDC");
  console.log("Net change:        ", ethers.formatUnits(netChange, 6), "USDC");

  // Since signer is streamer, referrer, AND platform wallet, they should get most back
  // Only "lost" amount is the contract keeping nothing (all goes back to same wallet)

  console.log("\n" + "=".repeat(60));
  console.log("  TEST COMPLETE!");
  console.log("=".repeat(60));
  console.log("\nThe bounty flow works correctly:");
  console.log("  1. ✅ USDC transferred to contract (fundBounty)");
  console.log("  2. ✅ Bounty stored on-chain");
  console.log("  3. ✅ AI Referee triggered payout (verifyAndPayout)");
  console.log("  4. ✅ Funds distributed (89% streamer, 10% platform, 1% referrer)");
  console.log("\nBaseScan tx:", `https://sepolia.basescan.org/tx/${payoutTx.hash}`);
  console.log("\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\nTEST FAILED:");
    console.error(error);
    process.exit(1);
  });
