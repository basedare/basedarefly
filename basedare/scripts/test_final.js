const { ethers } = require("hardhat");
require("dotenv").config({ path: '.env.local' });

async function main() {
  // Use NEW contract address from env
  const BOUNTY = process.env.NEXT_PUBLIC_BOUNTY_CONTRACT_ADDRESS;
  const USDC = process.env.NEXT_PUBLIC_USDC_ADDRESS;

  console.log("\n" + "=".repeat(60));
  console.log("  BASEDARE LIVE TEST - FRESH CONTRACT");
  console.log("=".repeat(60));
  console.log("\nBounty Contract:", BOUNTY);
  console.log("USDC:", USDC);

  const [signer] = await ethers.getSigners();
  console.log("Wallet:", signer.address);

  // Get contracts using artifact ABI
  const bounty = await ethers.getContractAt("BaseDareBounty", BOUNTY, signer);
  const usdc = await ethers.getContractAt(
    "@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20",
    USDC,
    signer
  );

  // Check balances
  const balance = await usdc.balanceOf(signer.address);
  console.log("\nUSDC Balance:", ethers.formatUnits(balance, 6));

  // Approve USDC for new contract
  console.log("\n--- Step 1: Approve USDC ---");
  const allowance = await usdc.allowance(signer.address, BOUNTY);
  console.log("Current allowance:", ethers.formatUnits(allowance, 6));

  if (allowance < ethers.parseUnits("10", 6)) {
    console.log("Approving 100 USDC...");
    const approveTx = await usdc.approve(BOUNTY, ethers.parseUnits("100", 6));
    await approveTx.wait();
    console.log("Approved!");
  }

  // Verify allowance
  const newAllowance = await usdc.allowance(signer.address, BOUNTY);
  console.log("New allowance:", ethers.formatUnits(newAllowance, 6));

  // Test parameters
  const dareId = Math.floor(Date.now() / 1000);
  const amount = ethers.parseUnits("5", 6);

  console.log("\n--- Step 2: Fund Bounty ---");
  console.log("Dare ID:", dareId);
  console.log("Amount: $5 USDC");
  console.log("Streamer:", signer.address);

  const balanceBefore = await usdc.balanceOf(signer.address);

  const fundTx = await bounty.fundBounty(
    dareId,
    signer.address, // streamer
    signer.address, // referrer (self for test - all fees come back)
    amount
  );
  console.log("TX sent:", fundTx.hash);

  const fundReceipt = await fundTx.wait();
  console.log("Confirmed! Block:", fundReceipt.blockNumber);

  // Check bounty was created
  const created = await bounty.bounties(dareId);
  console.log("\nBounty created:");
  console.log("  Amount:", ethers.formatUnits(created.amount, 6), "USDC");
  console.log("  Streamer:", created.streamer);
  console.log("  Verified:", created.isVerified);

  // Verify payout
  console.log("\n--- Step 3: Verify & Payout ---");
  const payoutTx = await bounty.verifyAndPayout(dareId);
  console.log("Payout TX:", payoutTx.hash);

  const payoutReceipt = await payoutTx.wait();
  console.log("Confirmed! Block:", payoutReceipt.blockNumber);

  // Parse events
  for (const log of payoutReceipt.logs) {
    try {
      const parsed = bounty.interface.parseLog(log);
      if (parsed && parsed.name === "BountyPayout") {
        console.log("\nPayout breakdown:");
        console.log("  Streamer gets:", ethers.formatUnits(parsed.args.streamerAmount, 6), "USDC (89%)");
        console.log("  Platform gets:", ethers.formatUnits(parsed.args.platformFee, 6), "USDC (10%)");
        console.log("  Referrer gets:", ethers.formatUnits(parsed.args.referrerFee, 6), "USDC (1%)");
      }
    } catch (e) {}
  }

  // Final balance
  const balanceAfter = await usdc.balanceOf(signer.address);
  console.log("\n--- Final State ---");
  console.log("USDC Balance:", ethers.formatUnits(balanceAfter, 6));
  console.log("Net change:", ethers.formatUnits(balanceAfter - balanceBefore, 6), "USDC");
  console.log("(Should be $0 since you're streamer + referrer + platform)");

  console.log("\n" + "=".repeat(60));
  console.log("  SUCCESS! BASEDARE IS WORKING!");
  console.log("=".repeat(60));
  console.log("\nView on BaseScan:");
  console.log("Fund TX: https://sepolia.basescan.org/tx/" + fundTx.hash);
  console.log("Payout TX: https://sepolia.basescan.org/tx/" + payoutTx.hash);
  console.log("");
}

main().catch(e => {
  console.error("\n=== TEST FAILED ===");
  console.error("Error:", e.shortMessage || e.message);
  process.exit(1);
});
