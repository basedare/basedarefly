const hre = require("hardhat");

// --- BASE SEPOLIA CONFIGURATION ---
// USDC on Base Sepolia (Circle's official testnet USDC)
const USDC_ADDRESS = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";

async function main() {
  const privateKey = process.env.DEPLOYER_PRIVATE_KEY || process.env.REFEREE_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error("No private key found. Set DEPLOYER_PRIVATE_KEY or REFEREE_PRIVATE_KEY in .env.local");
  }

  console.log("--- Starting BaseDareBounty Deployment on Base Sepolia ---");

  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  // Check deployer balance
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", hre.ethers.formatEther(balance), "ETH");

  if (balance === 0n) {
    throw new Error("Deployer has no ETH for gas. Fund the wallet first.");
  }

  // For testnet: use deployer as house wallet (change for mainnet!)
  const HOUSE_WALLET_ADDRESS = deployer.address;
  console.log("House wallet (testnet):", HOUSE_WALLET_ADDRESS);

  // Deploy BaseDareBounty
  console.log("\nDeploying BaseDareBounty...");
  const BaseDareBounty = await hre.ethers.getContractFactory("BaseDareBounty");
  const bounty = await BaseDareBounty.deploy(USDC_ADDRESS, HOUSE_WALLET_ADDRESS);

  await bounty.waitForDeployment();
  const deployedAddress = await bounty.getAddress();

  console.log("\n=======================================================");
  console.log("SUCCESS! BaseDareBounty deployed to:", deployedAddress);
  console.log("=======================================================");

  // Set the AI Referee Address (deployer is also the referee for testnet)
  console.log("\nSetting AI Referee Address...");
  const setRefereeTx = await bounty.setAIRefereeAddress(deployer.address);
  await setRefereeTx.wait();
  console.log("AI Referee set to:", deployer.address);

  console.log("\n--- DEPLOYMENT COMPLETE ---");
  console.log("Update your .env.local with:");
  console.log(`NEXT_PUBLIC_BOUNTY_CONTRACT_ADDRESS=${deployedAddress}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });







