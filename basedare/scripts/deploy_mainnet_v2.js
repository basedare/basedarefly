const hre = require("hardhat");
const readline = require("readline");

// =============================================================================
// BASE MAINNET DEPLOYMENT — BaseDareBountyV2 (the LIVE 4%-fee contract)
// =============================================================================
// This is the canonical mainnet cutover script. It deploys BaseDareBountyV2
// (NOT the legacy 11%-fee BaseDareBounty that scripts/deploy_mainnet.js ships).
//
//   npx hardhat run scripts/deploy_mainnet_v2.js --network base-mainnet
//
// It REFUSES to run unless every production parameter is explicit and correct,
// because the repo's env is Sepolia-oriented (hardhat loads .env.local) and a
// silent-fallback deploy would wire a mainnet escrow to Sepolia USDC — a dead
// contract holding real money. Required env (set in shell, NOT .env.local):
//   MAINNET_PLATFORM_WALLET   — receives the 4% platform fee
//   MAINNET_REFEREE_ADDRESS   — signs verify/payout (address only; key stays off-repo)
// Optional: BASE_MAINNET_RPC_URL, BASESCAN_API_KEY (for auto-verify)
//
// Recommended command:
//   MAINNET_PLATFORM_WALLET=0x... \
//   MAINNET_REFEREE_ADDRESS=0x... \
//   NEXT_PUBLIC_USDC_ADDRESS=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913 \
//   npm run mainnet:deploy:v2
//
// The NEXT_PUBLIC_USDC_ADDRESS inline override is intentional: .env.local may
// stay Sepolia-oriented until the deployed mainnet address exists.
// =============================================================================

// Circle USDC on Base mainnet — hardcoded so .env.local drift can't substitute
// the Sepolia token (0x036CbD…). Anything else is a deploy-blocking error.
const USDC_MAINNET = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const MIN_ETH_REQUIRED = "0.005";

function requireAddress(label, value) {
  if (!value) {
    throw new Error(`Missing ${label}. Set it explicitly before a mainnet deploy — no silent fallback.`);
  }
  let checksummed;
  try {
    checksummed = hre.ethers.getAddress(value.trim());
  } catch {
    throw new Error(`${label} is not a valid address: ${value}`);
  }
  if (checksummed === hre.ethers.ZeroAddress) {
    throw new Error(`${label} must not be the zero address.`);
  }
  return checksummed;
}

function confirm(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function main() {
  console.log("\n" + "=".repeat(70));
  console.log("  BASEDARE MAINNET DEPLOYMENT — BaseDareBountyV2 (4% fee)");
  console.log("  Network: Base Mainnet (Chain ID: 8453)");
  console.log("  THIS IS PRODUCTION — REAL MONEY INVOLVED");
  console.log("=".repeat(70) + "\n");

  // Guard 1: really on mainnet.
  const network = await hre.ethers.provider.getNetwork();
  if (network.chainId !== 8453n) {
    throw new Error(
      `Not on Base mainnet (chainId ${network.chainId}). ` +
        `Run with --network base-mainnet.`,
    );
  }
  console.log("Chain ID verified: 8453 (Base mainnet)");

  // Guard 2: detect the Sepolia-USDC drift explicitly and refuse it.
  const envUsdc = process.env.NEXT_PUBLIC_USDC_ADDRESS;
  if (envUsdc && hre.ethers.getAddress(envUsdc.trim()) !== USDC_MAINNET) {
    throw new Error(
      `NEXT_PUBLIC_USDC_ADDRESS (${envUsdc}) is not mainnet USDC. ` +
        `.env.local can remain Sepolia-oriented before cutover, but this deploy ` +
        `must be run with NEXT_PUBLIC_USDC_ADDRESS=${USDC_MAINNET} in the shell.`,
    );
  }

  // Guard 3: explicit production wallets — no deployer fallback.
  const PLATFORM_WALLET = requireAddress("MAINNET_PLATFORM_WALLET", process.env.MAINNET_PLATFORM_WALLET);
  const REFEREE_ADDRESS = requireAddress("MAINNET_REFEREE_ADDRESS", process.env.MAINNET_REFEREE_ADDRESS);
  if (PLATFORM_WALLET.toLowerCase() === REFEREE_ADDRESS.toLowerCase()) {
    throw new Error("MAINNET_PLATFORM_WALLET and MAINNET_REFEREE_ADDRESS must be different wallets.");
  }

  const [deployer] = await hre.ethers.getSigners();
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  const balanceEth = hre.ethers.formatEther(balance);

  if (balance < hre.ethers.parseEther(MIN_ETH_REQUIRED)) {
    throw new Error(`Insufficient ETH: have ${balanceEth}, need ≥ ${MIN_ETH_REQUIRED}. Fund the deployer.`);
  }

  console.log("-".repeat(70));
  console.log("Contract:        BaseDareBountyV2 (96% creator / 4% platform / 0% referral)");
  console.log("Deployer:        ", deployer.address, `(${balanceEth} ETH)`);
  console.log("USDC:            ", USDC_MAINNET);
  console.log("Platform wallet: ", PLATFORM_WALLET);
  console.log("AI Referee:      ", REFEREE_ADDRESS);
  console.log("-".repeat(70) + "\n");

  const typed = await confirm('Type DEPLOY to deploy to MAINNET (anything else cancels): ');
  if (typed !== "DEPLOY") {
    console.log("Cancelled.");
    process.exit(0);
  }

  const BaseDareBountyV2 = await hre.ethers.getContractFactory("BaseDareBountyV2");
  const bounty = await BaseDareBountyV2.deploy(USDC_MAINNET, PLATFORM_WALLET);
  console.log("\nTx:", bounty.deploymentTransaction()?.hash, "— waiting for confirmation…");
  await bounty.waitForDeployment();
  const deployedAddress = await bounty.getAddress();

  console.log("\n" + "=".repeat(70));
  console.log("SUCCESS! BaseDareBountyV2 deployed to:", deployedAddress);
  console.log("=".repeat(70));

  console.log("\nSetting AI Referee…");
  await (await bounty.setAIRefereeAddress(REFEREE_ADDRESS)).wait();
  console.log("AI Referee set:", REFEREE_ADDRESS);

  if (process.env.BASESCAN_API_KEY) {
    console.log("\nWaiting 30s for confirmations before verification…");
    await new Promise((r) => setTimeout(r, 30000));
    try {
      await hre.run("verify:verify", {
        address: deployedAddress,
        constructorArguments: [USDC_MAINNET, PLATFORM_WALLET],
      });
      console.log("Verified on BaseScan.");
    } catch (error) {
      console.log("Verification skipped/failed:", error.message);
    }
  }

  console.log("\n" + "=".repeat(70));
  console.log("CUTOVER — update Vercel prod env + GitHub Actions, then redeploy:");
  console.log("=".repeat(70));
  console.log(`
NEXT_PUBLIC_NETWORK=mainnet
NEXT_PUBLIC_BOUNTY_CONTRACT_ADDRESS=${deployedAddress}
NEXT_PUBLIC_USDC_ADDRESS=${USDC_MAINNET}
NEXT_PUBLIC_PLATFORM_WALLET_ADDRESS=${PLATFORM_WALLET}
`);
  console.log("Reminders:");
  console.log("  • Update BOTH Vercel prod AND .env.local (source of truth for hardhat).");
  console.log("  • Point the CI smoke loop var at mainnet only after this address is live.");
  console.log("  • BaseScan:", `https://basescan.org/address/${deployedAddress}`);
  console.log("");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\nDEPLOYMENT FAILED:\n", error);
    process.exit(1);
  });
