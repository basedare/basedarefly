const hre = require("hardhat");
const readline = require("readline");

// =============================================================================
// BASE MAINNET DEPLOYMENT SCRIPT
// =============================================================================
// This script deploys BaseDareBounty to Base mainnet with safety checks.
// Run with: npx hardhat run scripts/deploy_mainnet.js --network base-mainnet
// =============================================================================

// --- BASE MAINNET CONFIGURATION ---
// Official USDC on Base mainnet (Circle)
const USDC_MAINNET = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

// Minimum ETH required for deployment (covers gas + buffer)
const MIN_ETH_REQUIRED = "0.005"; // ~$15 at $3000/ETH

async function confirmAction(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === "y" || answer.toLowerCase() === "yes");
    });
  });
}

async function main() {
  console.log("\n");
  console.log("=".repeat(70));
  console.log("  BASEDARE MAINNET DEPLOYMENT");
  console.log("  Network: Base Mainnet (Chain ID: 8453)");
  console.log("  THIS IS PRODUCTION - REAL MONEY INVOLVED");
  console.log("=".repeat(70));
  console.log("\n");

  // --- SAFETY CHECK 1: Verify we're on mainnet ---
  const network = await hre.ethers.provider.getNetwork();
  if (network.chainId !== 8453n) {
    console.error("ERROR: Not connected to Base mainnet!");
    console.error(`Current chain ID: ${network.chainId}`);
    console.error("Expected chain ID: 8453");
    console.error("\nRun with: npx hardhat run scripts/deploy_mainnet.js --network base-mainnet");
    process.exit(1);
  }
  console.log("Chain ID verified: 8453 (Base Mainnet)");

  // --- SAFETY CHECK 2: Get deployer info ---
  const [deployer] = await hre.ethers.getSigners();
  console.log("\nDeployer wallet:", deployer.address);

  // --- SAFETY CHECK 3: Check ETH balance ---
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  const balanceEth = hre.ethers.formatEther(balance);
  console.log("ETH balance:", balanceEth, "ETH");

  if (balance < hre.ethers.parseEther(MIN_ETH_REQUIRED)) {
    console.error(`\nERROR: Insufficient ETH for deployment!`);
    console.error(`Required: ${MIN_ETH_REQUIRED} ETH`);
    console.error(`Available: ${balanceEth} ETH`);
    console.error("\nFund your deployer wallet and try again.");
    process.exit(1);
  }
  console.log("ETH balance: SUFFICIENT");

  // --- SAFETY CHECK 4: Verify platform wallet ---
  const PLATFORM_WALLET = process.env.MAINNET_PLATFORM_WALLET || deployer.address;
  console.log("\nPlatform wallet (receives fees):", PLATFORM_WALLET);

  if (PLATFORM_WALLET === deployer.address) {
    console.log("WARNING: Using deployer as platform wallet. Set MAINNET_PLATFORM_WALLET for production.");
  }

  // --- SAFETY CHECK 5: Verify referee wallet ---
  const REFEREE_ADDRESS = process.env.MAINNET_REFEREE_ADDRESS || deployer.address;
  console.log("AI Referee address:", REFEREE_ADDRESS);

  if (REFEREE_ADDRESS === deployer.address) {
    console.log("WARNING: Using deployer as referee. Set MAINNET_REFEREE_ADDRESS for production.");
  }

  // --- DISPLAY DEPLOYMENT PARAMETERS ---
  console.log("\n" + "-".repeat(70));
  console.log("DEPLOYMENT PARAMETERS:");
  console.log("-".repeat(70));
  console.log("USDC Address:      ", USDC_MAINNET);
  console.log("Platform Wallet:   ", PLATFORM_WALLET);
  console.log("AI Referee:        ", REFEREE_ADDRESS);
  console.log("Deployer:          ", deployer.address);
  console.log("-".repeat(70));

  // --- CONFIRMATION ---
  console.log("\n");
  const confirmed = await confirmAction(
    "CONFIRM: Deploy BaseDareBounty to MAINNET? (yes/no): "
  );

  if (!confirmed) {
    console.log("Deployment cancelled.");
    process.exit(0);
  }

  // --- ESTIMATE GAS ---
  console.log("\nEstimating deployment gas...");
  const BaseDareBounty = await hre.ethers.getContractFactory("BaseDareBounty");
  const deployTx = await BaseDareBounty.getDeployTransaction(USDC_MAINNET, PLATFORM_WALLET);
  const estimatedGas = await hre.ethers.provider.estimateGas(deployTx);
  const feeData = await hre.ethers.provider.getFeeData();
  const gasPrice = feeData.gasPrice || hre.ethers.parseUnits("0.1", "gwei");
  const estimatedCost = estimatedGas * gasPrice;

  console.log("Estimated gas:", estimatedGas.toString());
  console.log("Gas price:", hre.ethers.formatUnits(gasPrice, "gwei"), "gwei");
  console.log("Estimated cost:", hre.ethers.formatEther(estimatedCost), "ETH");

  // --- DEPLOY ---
  console.log("\nDeploying BaseDareBounty...");
  const bounty = await BaseDareBounty.deploy(USDC_MAINNET, PLATFORM_WALLET);

  console.log("Transaction hash:", bounty.deploymentTransaction()?.hash);
  console.log("Waiting for confirmation...");

  await bounty.waitForDeployment();
  const deployedAddress = await bounty.getAddress();

  console.log("\n" + "=".repeat(70));
  console.log("SUCCESS! Contract deployed to:", deployedAddress);
  console.log("=".repeat(70));

  // --- SET AI REFEREE ---
  console.log("\nSetting AI Referee address...");
  const setRefereeTx = await bounty.setAIRefereeAddress(REFEREE_ADDRESS);
  await setRefereeTx.wait();
  console.log("AI Referee set to:", REFEREE_ADDRESS);

  // --- VERIFY ON BASESCAN (optional) ---
  console.log("\n" + "-".repeat(70));
  console.log("CONTRACT VERIFICATION");
  console.log("-".repeat(70));

  if (process.env.BASESCAN_API_KEY) {
    console.log("Waiting 30 seconds for block confirmations before verification...");
    await new Promise(resolve => setTimeout(resolve, 30000));

    try {
      await hre.run("verify:verify", {
        address: deployedAddress,
        constructorArguments: [USDC_MAINNET, PLATFORM_WALLET],
      });
      console.log("Contract verified on BaseScan!");
    } catch (error) {
      console.log("Verification failed (may already be verified):", error.message);
    }
  } else {
    console.log("BASESCAN_API_KEY not set. Manual verification required:");
    console.log(`https://basescan.org/address/${deployedAddress}#code`);
  }

  // --- OUTPUT SUMMARY ---
  console.log("\n" + "=".repeat(70));
  console.log("DEPLOYMENT COMPLETE - UPDATE YOUR .env.local:");
  console.log("=".repeat(70));
  console.log(`
# Base Mainnet Configuration
NEXT_PUBLIC_NETWORK=mainnet
NEXT_PUBLIC_BOUNTY_CONTRACT_ADDRESS=${deployedAddress}
NEXT_PUBLIC_USDC_ADDRESS=${USDC_MAINNET}
MAINNET_PLATFORM_WALLET=${PLATFORM_WALLET}
MAINNET_REFEREE_ADDRESS=${REFEREE_ADDRESS}
`);
  console.log("=".repeat(70));
  console.log("\nBaseScan:", `https://basescan.org/address/${deployedAddress}`);
  console.log("\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\nDEPLOYMENT FAILED:");
    console.error(error);
    process.exit(1);
  });
