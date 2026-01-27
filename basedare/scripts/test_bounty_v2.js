const { ethers } = require("hardhat");
const fs = require("fs");
require("dotenv").config({ path: '.env.local' });

// Load ABI from artifacts
const bountyArtifact = JSON.parse(
  fs.readFileSync("./artifacts/contracts/BaseDareBounty.sol/BaseDareBounty.json")
);

const BOUNTY_CONTRACT = process.env.NEXT_PUBLIC_BOUNTY_CONTRACT_ADDRESS;
const USDC_ADDRESS = process.env.NEXT_PUBLIC_USDC_ADDRESS;

const ERC20_ABI = [
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function balanceOf(address account) view returns (uint256)",
];

async function main() {
  console.log("\n=== BASEDARE LIVE TEST v2 ===\n");

  const [signer] = await ethers.getSigners();
  console.log("Wallet:", signer.address);

  // Use full ABI from artifacts
  const bounty = new ethers.Contract(BOUNTY_CONTRACT, bountyArtifact.abi, signer);
  const usdc = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, signer);

  // Check balances
  const balance = await usdc.balanceOf(signer.address);
  console.log("USDC Balance:", ethers.formatUnits(balance, 6));

  // Test parameters
  const dareId = Math.floor(Date.now() / 1000); // Use unix timestamp
  const amount = ethers.parseUnits("5", 6); // $5 USDC

  console.log("\nTest Dare ID:", dareId);
  console.log("Amount: $5 USDC");

  // Check allowance
  const allowance = await usdc.allowance(signer.address, BOUNTY_CONTRACT);
  console.log("Current allowance:", ethers.formatUnits(allowance, 6));

  if (allowance < amount) {
    console.log("\nApproving USDC...");
    const approveTx = await usdc.approve(BOUNTY_CONTRACT, ethers.parseUnits("100", 6));
    await approveTx.wait();
    console.log("Approved!");
  }

  // Try static call first
  console.log("\n--- Simulating fundBounty ---");
  try {
    await bounty.fundBounty.staticCall(
      dareId,
      signer.address, // streamer
      signer.address, // referrer
      amount
    );
    console.log("Static call PASSED - transaction should succeed");
  } catch (err) {
    console.log("Static call FAILED:");
    console.log("Reason:", err.reason || err.message);

    // Try to get more details
    if (err.data) {
      console.log("Error data:", err.data);
    }
    process.exit(1);
  }

  // Execute for real
  console.log("\n--- Executing fundBounty ---");
  const tx = await bounty.fundBounty(
    dareId,
    signer.address,
    signer.address,
    amount,
    { gasLimit: 300000 } // Set explicit gas limit
  );
  console.log("Tx hash:", tx.hash);

  const receipt = await tx.wait();
  console.log("Confirmed in block:", receipt.blockNumber);

  // Check bounty was created
  const createdBounty = await bounty.bounties(dareId);
  console.log("\n--- Bounty Created ---");
  console.log("Amount:", ethers.formatUnits(createdBounty.amount, 6), "USDC");
  console.log("Streamer:", createdBounty.streamer);
  console.log("Verified:", createdBounty.isVerified);

  // Now payout
  console.log("\n--- Executing verifyAndPayout ---");
  const payoutTx = await bounty.verifyAndPayout(dareId, { gasLimit: 300000 });
  console.log("Payout tx:", payoutTx.hash);

  const payoutReceipt = await payoutTx.wait();
  console.log("Confirmed in block:", payoutReceipt.blockNumber);

  // Final balance
  const finalBalance = await usdc.balanceOf(signer.address);
  console.log("\n--- Results ---");
  console.log("Final USDC:", ethers.formatUnits(finalBalance, 6));
  console.log("Net change:", ethers.formatUnits(finalBalance - balance, 6), "USDC");

  console.log("\n=== TEST COMPLETE ===");
  console.log("View tx: https://sepolia.basescan.org/tx/" + payoutTx.hash);
}

main().catch(console.error);
