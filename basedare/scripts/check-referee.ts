import { createPublicClient, http, formatEther } from 'viem';
import { baseSepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const USDC_ADDRESS = process.env.NEXT_PUBLIC_USDC_ADDRESS as `0x${string}`;
const REFEREE_PK = process.env.REFEREE_PRIVATE_KEY as `0x${string}`;

async function main() {
  if (!REFEREE_PK) throw new Error("Missing REFEREE_PRIVATE_KEY in .env.local");
  
  const account = privateKeyToAccount(REFEREE_PK);
  const client = createPublicClient({ chain: baseSepolia, transport: http() });

  console.log("--- Pre-flight Check ---");
  console.log(`Referee Address: ${account.address}`);

  const balance = await client.getBalance({ address: account.address });
  console.log(`ETH Balance: ${formatEther(balance)} ETH`);

  const usdcBalance = await client.readContract({
    address: USDC_ADDRESS,
    abi: [{ name: 'balanceOf', type: 'function', inputs: [{ name: 'account', type: 'address' }], outputs: [{ name: 'balance', type: 'uint256' }] }],
    functionName: 'balanceOf',
    args: [account.address],
  }) as bigint;
  
  console.log(`USDC Balance: ${Number(usdcBalance) / 1_000_000} USDC`);

  if (balance === 0n) console.warn("⚠️ WARNING: No ETH for gas!");
  if (usdcBalance === 0n) console.warn("⚠️ WARNING: No USDC for bounties!");
  console.log("------------------------");
}

main().catch(console.error);
