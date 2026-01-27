const { ethers } = require("hardhat");

async function main() {
  const BOUNTY = "0x01330B3E20f5440AA869a10BA44026fcd7444EA5";
  const USDC = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";

  const [signer] = await ethers.getSigners();
  console.log("Wallet:", signer.address);

  // Get USDC with explicit ABI
  const usdc = new ethers.Contract(USDC, [
    "function approve(address spender, uint256 amount) returns (bool)",
    "function allowance(address owner, address spender) view returns (uint256)",
    "function balanceOf(address) view returns (uint256)",
    "function name() view returns (string)",
    "function symbol() view returns (string)",
    "function decimals() view returns (uint8)"
  ], signer);

  // Get bounty with explicit ABI matching contract
  const bounty = new ethers.Contract(BOUNTY, [
    "function fundBounty(uint256 _dareId, address _streamer, address _referrer, uint256 _amount) external",
    "function USDC() view returns (address)",
    "function PLATFORM_WALLET() view returns (address)"
  ], signer);

  // Check USDC details
  console.log("\n=== USDC Token ===");
  try {
    console.log("Name:", await usdc.name());
    console.log("Symbol:", await usdc.symbol());
    console.log("Decimals:", await usdc.decimals());
  } catch (e) {
    console.log("Could not read token details");
  }

  // Check balances
  const balance = await usdc.balanceOf(signer.address);
  console.log("\nBalance:", ethers.formatUnits(balance, 6), "USDC");

  // Reset approval pattern (some tokens require this)
  console.log("\n=== Reset Approval ===");
  const resetTx = await usdc.approve(BOUNTY, 0);
  await resetTx.wait();
  console.log("Reset to 0");

  const approveTx = await usdc.approve(BOUNTY, ethers.parseUnits("100", 6));
  await approveTx.wait();
  console.log("Approved 100 USDC");

  // Verify
  const allowance = await usdc.allowance(signer.address, BOUNTY);
  console.log("Verified allowance:", ethers.formatUnits(allowance, 6));

  // Check bounty contract settings
  console.log("\n=== Bounty Contract ===");
  console.log("USDC addr:", await bounty.USDC());
  console.log("Platform wallet:", await bounty.PLATFORM_WALLET());

  // Test with trace
  const dareId = Math.floor(Math.random() * 1000000000);
  const amount = ethers.parseUnits("5", 6);

  console.log("\n=== Fund Bounty ===");
  console.log("Dare ID:", dareId);
  console.log("Amount:", ethers.formatUnits(amount, 6));
  console.log("Streamer:", signer.address);
  console.log("Referrer: 0x0 (none)");

  try {
    // Try with debug trace
    const tx = await bounty.fundBounty(
      dareId,
      signer.address,
      ethers.ZeroAddress,
      amount
    );
    console.log("\nTX sent:", tx.hash);
    console.log("Waiting for confirmation...");

    const receipt = await tx.wait();
    console.log("Status:", receipt.status);
    console.log("Gas used:", receipt.gasUsed.toString());

    if (receipt.status === 1) {
      console.log("\n=== SUCCESS! ===");
    } else {
      console.log("\n=== TRANSACTION REVERTED ===");
    }

  } catch (e) {
    console.log("\n=== ERROR ===");
    console.log("Message:", e.message);

    // Try to extract more info
    if (e.transaction) {
      console.log("TX data:", e.transaction.data?.slice(0, 100) + "...");
    }
    if (e.receipt) {
      console.log("Receipt status:", e.receipt.status);
      console.log("Gas used:", e.receipt.gasUsed?.toString());
    }
    if (e.error) {
      console.log("Inner error:", e.error);
    }
  }
}

main().catch(e => {
  console.error("Fatal:", e.message);
});
