const { ethers } = require("hardhat");

async function main() {
  const BOUNTY = "0x01330B3E20f5440AA869a10BA44026fcd7444EA5";
  const USDC = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";

  const [signer] = await ethers.getSigners();
  console.log("Wallet:", signer.address);

  // Get contracts with proper interfaces
  const usdc = await ethers.getContractAt(
    "@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20",
    USDC,
    signer
  );

  const bounty = await ethers.getContractAt("BaseDareBounty", BOUNTY, signer);

  // Check current state
  const balance = await usdc.balanceOf(signer.address);
  const allowance = await usdc.allowance(signer.address, BOUNTY);

  console.log("\n=== Current State ===");
  console.log("USDC Balance:", ethers.formatUnits(balance, 6));
  console.log("Allowance to Bounty:", ethers.formatUnits(allowance, 6));

  // Fresh dare ID
  const dareId = Math.floor(Math.random() * 1000000000);
  const amount = ethers.parseUnits("5", 6);

  console.log("\n=== Test Parameters ===");
  console.log("Dare ID:", dareId);
  console.log("Amount: $5 USDC");

  // Check if bounty already exists
  try {
    const existing = await bounty.bounties(dareId);
    console.log("Existing bounty amount:", existing.amount.toString());
  } catch (e) {
    console.log("No existing bounty (good)");
  }

  // Ensure fresh approval
  console.log("\n=== Step 1: Approve USDC ===");
  if (allowance < amount) {
    const approveTx = await usdc.approve(BOUNTY, ethers.parseUnits("1000", 6));
    console.log("Approving... tx:", approveTx.hash);
    await approveTx.wait();
    console.log("Approved!");
  } else {
    console.log("Already approved");
  }

  // Double check allowance after approval
  const newAllowance = await usdc.allowance(signer.address, BOUNTY);
  console.log("New allowance:", ethers.formatUnits(newAllowance, 6));

  // Execute fundBounty
  console.log("\n=== Step 2: Fund Bounty ===");
  try {
    const tx = await bounty.fundBounty(
      dareId,
      signer.address, // streamer (self for test)
      ethers.ZeroAddress, // no referrer
      amount
    );
    console.log("TX sent:", tx.hash);

    const receipt = await tx.wait();
    console.log("Confirmed! Block:", receipt.blockNumber);
    console.log("Gas used:", receipt.gasUsed.toString());

    // Check bounty was created
    const created = await bounty.bounties(dareId);
    console.log("\n=== Bounty Created ===");
    console.log("Amount:", ethers.formatUnits(created.amount, 6), "USDC");
    console.log("Streamer:", created.streamer);
    console.log("Backer:", created.backer);

    // Now verify and payout
    console.log("\n=== Step 3: Verify & Payout ===");
    const payoutTx = await bounty.verifyAndPayout(dareId);
    console.log("Payout TX:", payoutTx.hash);
    const payoutReceipt = await payoutTx.wait();
    console.log("Payout confirmed! Block:", payoutReceipt.blockNumber);

    // Final balance
    const finalBalance = await usdc.balanceOf(signer.address);
    console.log("\n=== Final State ===");
    console.log("Final USDC Balance:", ethers.formatUnits(finalBalance, 6));
    console.log("Net change:", ethers.formatUnits(finalBalance - balance, 6), "USDC");

    console.log("\n=== SUCCESS! ===");
    console.log("View tx: https://sepolia.basescan.org/tx/" + payoutTx.hash);

  } catch (e) {
    console.log("\n=== FAILED ===");
    console.log("Error:", e.shortMessage || e.message);

    // Try to decode revert reason
    if (e.data) {
      console.log("Error data:", e.data);
    }
    if (e.reason) {
      console.log("Reason:", e.reason);
    }
    if (e.revert) {
      console.log("Revert:", e.revert);
    }
  }
}

main().catch(console.error);
