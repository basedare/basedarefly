import { createPublicClient, createWalletClient, http, parseUnits } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { baseSepolia } from 'viem/chains';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

// Setup config
const BASE_URL = 'http://127.0.0.1:3001';
const PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY || process.env.REFEREE_HOT_WALLET_PRIVATE_KEY;
const account = privateKeyToAccount(PRIVATE_KEY);
const stakerAddress = account.address;
const USDC_ADDRESS = process.env.NEXT_PUBLIC_USDC_ADDRESS;
const BOUNTY_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_BOUNTY_CONTRACT_ADDRESS;

if (!USDC_ADDRESS || !BOUNTY_CONTRACT_ADDRESS) {
  throw new Error("Missing contract addresses in .env.local");
}

// ABI for USDC and BOUNTY fund calls
const USDC_ABI = [
  {"inputs":[{"internalType":"address","name":"spender","type":"address"},{"internalType":"uint256","name":"value","type":"uint256"}],"name":"approve","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"internalType":"address","name":"account","type":"address"}],"name":"balanceOf","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"}
];

const BOUNTY_ABI = [
  {"inputs":[{"internalType":"uint256","name":"bountyId","type":"uint256"},{"internalType":"address","name":"targetBountyUser","type":"address"},{"internalType":"address","name":"referrer","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"fundBounty","outputs":[],"stateMutability":"nonpayable","type":"function"}
];

const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(process.env.NEXT_PUBLIC_RPC_URL || 'https://sepolia.base.org'),
});

const walletClient = createWalletClient({
  account,
  chain: baseSepolia,
  transport: http(process.env.NEXT_PUBLIC_RPC_URL || 'https://sepolia.base.org'),
});

const defaultHeaders = { 
    "Content-Type": "application/json",
    "Authorization": `Bearer ${process.env.ADMIN_SECRET}`
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  console.log(`Starting Brand Portal Smoke Test on Sepolia using wallet: ${stakerAddress}`);

  // 1. Initial balance check
  const balance = await publicClient.readContract({
    address: USDC_ADDRESS,
    abi: USDC_ABI,
    functionName: 'balanceOf',
    args: [stakerAddress]
  });
  console.log(`Initial USDC Balance: ${balance.toString()} (Needs >= 1000000 units for $1)`);
  if (balance < 1000000n) {
    throw new Error("Insufficient USDC balance on wallet to perform testing.");
  }
  
  // 2. Fetch a nearby venue via App API
  console.log("\n2. Fetching place for campaign (e.g. searching 'Coffee')");
  console.log(`GET ${BASE_URL}/api/places/search?q=Coffee`);
  const placesRes = await fetch(`${BASE_URL}/api/places/search?q=Coffee`, { headers: defaultHeaders });
  const placesData = await placesRes.json();
  if (!placesData.success || placesData.data.results.length === 0) {
    throw new Error("Could not find a place for testing.");
  }
  const place = placesData.data.results[0];
  console.log(`Found place: ${place.name} (Place ID: ${place.placeId || place.id})`);

  // We need to resolve the place internally first
  console.log(`POST ${BASE_URL}/api/places/resolve-or-create`);
  const resolveRes = await fetch(`${BASE_URL}/api/places/resolve-or-create`, {
    method: 'POST',
    headers: defaultHeaders,
    body: JSON.stringify({
      name: place.name,
      latitude: place.latitude,
      longitude: place.longitude,
      address: place.address || place.displayName,
      city: place.city,
      country: place.country,
      placeSource: place.placeSource || 'OSM_NOMINATIM',
      externalPlaceId: place.externalPlaceId || place.id
    })
  });
  const resolvePayload = await resolveRes.json();
  const resolvedVenueId = resolvePayload.data?.place?.id;
  if (!resolvedVenueId) throw new Error("Could not resolve venue ID.");

  // 3. Get Creator direct from DB
  console.log("\n3. Fetching targeted creator data direct from Prisma");
  const { PrismaClient } = await import('@prisma/client');
  const prisma = new PrismaClient();
  const dbCreator = await prisma.streamerTag.findUnique({ where: { tag: '@smokeTest' } });
  if (!dbCreator) throw new Error("Target creator @smokeTest not found in DB.");
  const chosenCreator = {
      creator: { id: dbCreator.id, tag: dbCreator.tag }
  };
  console.log(`Chosen creator: ${chosenCreator.creator.tag} (${chosenCreator.creator.id})`);
  await prisma.$disconnect();

  // 4. Initialize Bounty on Backend
  const dareAmount = 1; // 1 USDC
  console.log(`\n4. Initializing Escrow Dare (${dareAmount} USDC) targeting ${chosenCreator.creator.tag}`);
  const reqObject = {
      title: "Brand Smoke Test Autocreate",
      amount: dareAmount,
      streamerTag: chosenCreator.creator.tag,
      streamId: `brand:${Date.now()}`,
      missionMode: 'IRL',
      missionTag: 'brand-campaign',
      isNearbyDare: true,
      latitude: place.latitude,
      longitude: place.longitude,
      locationLabel: place.name || place.displayName,
      discoveryRadiusKm: 0.5,
      venueId: resolvedVenueId,
      creationContext: 'MAP',
      stakerAddress,
  };
  
  const initRes = await fetch(`${BASE_URL}/api/bounties/init`, {
      method: "POST",
      headers: defaultHeaders,
      body: JSON.stringify(reqObject)
  });
  const initData = await initRes.json();
  if (!initData.success) throw new Error("Bounty Init Failed: " + JSON.stringify(initData));
  
  const { dareId, onChainDareId, targetAddress, referrerAddress } = initData.data;
  console.log(`Dare DB record created: ${dareId} (OnChain ID pending: ${onChainDareId})`);

  // 5. Approve USDC
  console.log("\n5. Approving USDC on Contract");
  const amountInUnits = parseUnits(dareAmount.toString(), 6);
  const approveTx = await walletClient.writeContract({
    address: USDC_ADDRESS,
    abi: USDC_ABI,
    functionName: 'approve',
    args: [BOUNTY_CONTRACT_ADDRESS, amountInUnits]
  });
  console.log(`Approve TX Hash: ${approveTx}`);
  await publicClient.waitForTransactionReceipt({ hash: approveTx });

  // 6. Fund Bounty on Contract
  console.log("\n6. Funding Bounty On-Chain");
  const fundTx = await walletClient.writeContract({
    address: BOUNTY_CONTRACT_ADDRESS,
    abi: BOUNTY_ABI,
    functionName: 'fundBounty',
    args: [BigInt(onChainDareId), targetAddress, referrerAddress, amountInUnits]
  });
  console.log(`Fund TX Hash: ${fundTx}`);
  await publicClient.waitForTransactionReceipt({ hash: fundTx });

  // 7. Register/Finalize Dare via Backend
  console.log("\n7. Registering TX over API");
  const regRes = await fetch(`${BASE_URL}/api/bounties/register`, {
      method: "POST",
      headers: defaultHeaders,
      body: JSON.stringify({ dareId, txHash: fundTx })
  });
  const regData = await regRes.json();
  if (!regData.success) throw new Error("Bounty Register Failed: " + JSON.stringify(regData));
  console.log("Dare successfully verified and LIVE.");

  // 8. Launch the Brand Campaign
  console.log("\n8. Launching Brand Portal Campaign connecting the Live Dare");
  const campaignPayload = {
      brandWallet: stakerAddress,
      type: 'PLACE',
      tier: 'SIP_SHILL',
      title: 'Automated Brand Campaign Smoke Test',
      description: 'End to end payment rail validation',
      creatorCountTarget: 1,
      payoutPerCreator: dareAmount,
      venueId: resolvedVenueId,
      selectedCreatorId: chosenCreator.creator.id,
      linkedDareId: dareId,
      verificationCriteria: { hashtagsRequired: [], minDurationSeconds: 30 },
      targetingCriteria: { location: 'anywhere', platforms: [], niche: '', minFollowers: 0 }
  };
  
  const campaignRes = await fetch(`${BASE_URL}/api/campaigns`, {
      method: "POST",
      headers: defaultHeaders,
      body: JSON.stringify(campaignPayload)
  });
  const campaignData = await campaignRes.json();
  
  if (!campaignData.success) {
      console.log(campaignData);
      throw new Error("Brand Campaign Launch Failed: " + (campaignData.error || campaignData.message));
  }
  
  console.log(`\n✅ SMOKE TEST PASSED: Successfully created Campaign ${campaignData.data.id} attached to Funded Dare ${dareId}`);
}

main().catch(console.error);
