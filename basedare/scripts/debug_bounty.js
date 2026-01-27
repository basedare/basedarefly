const { ethers } = require("hardhat");

async function main() {
  const BOUNTY = "0x01330B3E20f5440AA869a10BA44026fcd7444EA5";
  const USDC = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";

  const [signer] = await ethers.getSigners();
  console.log("Signer:", signer.address);

  // Get contracts
  const usdc = await ethers.getContractAt([
    "function transferFrom(address from, address to, uint256 amount) returns (bool)",
    "function allowance(address owner, address spender) view returns (uint256)",
    "function balanceOf(address) view returns (uint256)",
    "function approve(address spender, uint256 amount) returns (bool)"
  ], USDC, signer);

  const bounty = await ethers.getContractAt([
    "function USDC() view returns (address)",
    "function fundBounty(uint256 _dareId, address _streamer, address _referrer, uint256 _amount) external",
    "function bounties(uint256) view returns (uint256 amount, address streamer, address referrer, address backer, bool isVerified)"
  ], BOUNTY, signer);

  // Check basics
  console.log("\n--- DIAGNOSTICS ---");
  console.log("USDC Balance:", ethers.formatUnits(await usdc.balanceOf(signer.address), 6));
  console.log("Allowance:", ethers.formatUnits(await usdc.allowance(signer.address, BOUNTY), 6));
  console.log("Bounty USDC addr:", await bounty.USDC());

  // Test amount
  const amount = ethers.parseUnits("1", 6); // Just $1
  const dareId = 99999;

  // Step 1: Simulate transferFrom directly
  console.log("\n--- TEST 1: transferFrom simulation ---");
  try {
    const result = await usdc.transferFrom.staticCall(signer.address, BOUNTY, amount);
    console.log("Result:", result);
  } catch (e) {
    console.log("FAILED:", e.shortMessage || e.message);
  }

  // Step 2: Simulate fundBounty
  console.log("\n--- TEST 2: fundBounty simulation ---");
  try {
    await bounty.fundBounty.staticCall(dareId, signer.address, signer.address, amount);
    console.log("PASSED!");
  } catch (e) {
    console.log("FAILED:", e.shortMessage || e.message);

    // Try to get actual error
    if (e.info && e.info.error) {
      console.log("Inner error:", e.info.error);
    }
  }

  // Step 3: Try actual execution with low gas to see what happens
  console.log("\n--- TEST 3: Actual fundBounty execution ---");
  try {
    const tx = await bounty.fundBounty(dareId, signer.address, signer.address, amount, {
      gasLimit: 500000
    });
    console.log("TX sent:", tx.hash);
    const receipt = await tx.wait();
    console.log("SUCCESS! Block:", receipt.blockNumber);
  } catch (e) {
    console.log("FAILED:", e.shortMessage || e.message);
    if (e.receipt) {
      console.log("Receipt status:", e.receipt.status);
    }
  }
}

main().catch(console.error);
