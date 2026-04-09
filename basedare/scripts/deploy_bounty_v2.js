const hre = require("hardhat");

// Base Mainnet USDC
const USDC_ADDRESS = process.env.NEXT_PUBLIC_USDC_ADDRESS || "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const PLATFORM_WALLET = process.env.NEXT_PUBLIC_PLATFORM_WALLET_ADDRESS;

async function main() {
  const privateKey = process.env.DEPLOYER_PRIVATE_KEY || process.env.REFEREE_HOT_WALLET_PRIVATE_KEY || process.env.REFEREE_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error("No private key found. Set DEPLOYER_PRIVATE_KEY or REFEREE_HOT_WALLET_PRIVATE_KEY in .env.local");
  }

  if (!PLATFORM_WALLET) {
    throw new Error("Missing NEXT_PUBLIC_PLATFORM_WALLET_ADDRESS");
  }

  const [deployer] = await hre.ethers.getSigners();
  const balance = await hre.ethers.provider.getBalance(deployer.address);

  console.log("--- Starting BaseDareBountyV2 Deployment ---");
  console.log("Deploying with account:", deployer.address);
  console.log("Account balance:", hre.ethers.formatEther(balance), "ETH");
  console.log("USDC:", USDC_ADDRESS);
  console.log("Platform wallet:", PLATFORM_WALLET);
  console.log("Fee split: 96% creator / 4% platform / 0% referral");

  if (balance === 0n) {
    throw new Error("Deployer has no ETH for gas. Fund the wallet first.");
  }

  const BaseDareBountyV2 = await hre.ethers.getContractFactory("BaseDareBountyV2");
  const bounty = await BaseDareBountyV2.deploy(USDC_ADDRESS, PLATFORM_WALLET);
  await bounty.waitForDeployment();

  const deployedAddress = await bounty.getAddress();

  console.log("\n=======================================================");
  console.log("SUCCESS! BaseDareBountyV2 deployed to:", deployedAddress);
  console.log("=======================================================");

  if (process.env.REFEREE_HOT_WALLET_ADDRESS) {
    console.log("\nSetting AI Referee Address...");
    const tx = await bounty.setAIRefereeAddress(process.env.REFEREE_HOT_WALLET_ADDRESS);
    await tx.wait();
    console.log("AI Referee set to:", process.env.REFEREE_HOT_WALLET_ADDRESS);
  } else {
    console.log("\nREFEREE_HOT_WALLET_ADDRESS not set. Run setAIRefereeAddress manually before payout/refund.");
  }

  console.log("\nUpdate deployment env when ready to cut over:");
  console.log(`NEXT_PUBLIC_BOUNTY_CONTRACT_ADDRESS=${deployedAddress}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
