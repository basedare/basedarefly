const hre = require("hardhat");

// Base Mainnet USDC (Circle official)
const USDC_MAINNET = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

async function main() {
  console.log("\n=== BASEDARE MAINNET DEPLOYMENT ===\n");

  const network = await hre.ethers.provider.getNetwork();
  if (network.chainId !== 8453n) {
    throw new Error("Not on Base mainnet!");
  }
  console.log("✓ Network: Base Mainnet (8453)");

  const [deployer] = await hre.ethers.getSigners();
  console.log("✓ Deployer:", deployer.address);

  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("✓ Balance:", hre.ethers.formatEther(balance), "ETH");

  // Platform wallet = deployer for now (you can change later)
  const PLATFORM_WALLET = deployer.address;
  const REFEREE_ADDRESS = deployer.address;

  console.log("\n--- Deploying BaseDareBounty ---");
  console.log("USDC:", USDC_MAINNET);
  console.log("Platform Wallet:", PLATFORM_WALLET);

  const BaseDareBounty = await hre.ethers.getContractFactory("BaseDareBounty");
  const bounty = await BaseDareBounty.deploy(USDC_MAINNET, PLATFORM_WALLET);

  console.log("TX sent:", bounty.deploymentTransaction()?.hash);
  console.log("Waiting for confirmation...");

  await bounty.waitForDeployment();
  const address = await bounty.getAddress();

  console.log("\n✓ CONTRACT DEPLOYED:", address);

  // Set AI Referee
  console.log("\n--- Setting AI Referee ---");
  const tx = await bounty.setAIRefereeAddress(REFEREE_ADDRESS);
  await tx.wait();
  console.log("✓ AI Referee set to:", REFEREE_ADDRESS);

  // Final balance
  const finalBalance = await hre.ethers.provider.getBalance(deployer.address);
  const gasUsed = balance - finalBalance;

  console.log("\n=== DEPLOYMENT COMPLETE ===");
  console.log("Contract:", address);
  console.log("Gas cost:", hre.ethers.formatEther(gasUsed), "ETH");
  console.log("Remaining:", hre.ethers.formatEther(finalBalance), "ETH");
  console.log("\nBaseScan: https://basescan.org/address/" + address);
  console.log("\n--- UPDATE .env.local ---");
  console.log("NEXT_PUBLIC_BOUNTY_CONTRACT_ADDRESS=" + address);
  console.log("NEXT_PUBLIC_USDC_ADDRESS=" + USDC_MAINNET);
  console.log("NEXT_PUBLIC_NETWORK=mainnet");
}

main().catch((e) => {
  console.error("\nDEPLOYMENT FAILED:", e.message);
  process.exit(1);
});
