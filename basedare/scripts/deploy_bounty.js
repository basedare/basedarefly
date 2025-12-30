const hre = require("hardhat");

// --- IMPORTANT CONFIGURATION ---
// PASTE YOUR SECURE HOUSE WALLET ADDRESS HERE (10% rake recipient)
const HOUSE_WALLET_ADDRESS = "0xYourSecureHouseWalletAddressHere"; 
const USDC_ADDRESS = "0x833589fCD6eDb6E08f4C7C32D4f71b54bDA02913"; 

// PASTE THE PUBLIC ADDRESS OF YOUR AI REFEREE SERVER WALLET HERE
// This address must match the one associated with the private key in your REFEREE_PRIVATE_KEY env var later.
const AI_REFEREE_SERVER_WALLET = "0xYourRefereeServerWalletAddress"; 

async function main() {
  if (!process.env.DEPLOYER_PRIVATE_KEY) {
      throw new Error("DEPLOYER_PRIVATE_KEY not set in .env file.");
  }

  console.log("--- Starting Deployment Protocol on Base Mainnet ---");

  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contract with the account:", deployer.address);

  const BaseDareBounty = await hre.ethers.getContractFactory("BaseDareBounty");

  // Deploy the contract, passing the constructor arguments
  const bounty = await BaseDareBounty.deploy(USDC_ADDRESS, HOUSE_WALLET_ADDRESS);

  await bounty.waitForDeployment();

  const deployedAddress = await bounty.getAddress();

  console.log("\n-------------------------------------------------------");
  console.log("SUCCESS! BaseDareBounty deployed to:", deployedAddress);
  console.log("-------------------------------------------------------");

  // --- CRITICAL STEP: Set the AI Referee Address ---
  console.log("Setting AI Referee Address (Security Lock)...");
  const setRefereeTx = await bounty.setAIRefereeAddress(AI_REFEREE_SERVER_WALLET);
  await setRefereeTx.wait();

  console.log(`AI Referee set to: ${AI_REFEREE_SERVER_WALLET}`);
  console.log("DEPLOYMENT AND SETUP COMPLETE. ADDRESS READY FOR .env.local.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });







