#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';

import nextEnv from '@next/env';
import { PrismaClient } from '@prisma/client';
import { createPublicClient, formatEther, formatUnits, http, isAddress } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base, baseSepolia } from 'viem/chains';

const { loadEnvConfig } = nextEnv;

const rootDir = process.cwd();
const envMode = process.env.BASEDARE_SMOKE_ENV || process.env.NODE_ENV || 'development';
loadEnvConfig(rootDir, envMode !== 'production');

const baseUrl =
  process.env.BASEDARE_SMOKE_URL ||
  process.env.BASEDARE_SAFETY_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  'http://localhost:3000';
const timeoutMs = Number(process.env.BASEDARE_SMOKE_TIMEOUT_MS || 35_000);
const smokeWallet = '0x000000000000000000000000000000000000dead';
const prisma = new PrismaClient();
const checks = [];

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
const BOUNTY_ABI = [
  {
    type: 'function',
    name: 'USDC',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'address' }],
  },
  {
    type: 'function',
    name: 'PLATFORM_WALLET',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'address' }],
  },
  {
    type: 'function',
    name: 'AI_REFEREE_ADDRESS',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'address' }],
  },
  {
    type: 'function',
    name: 'platformFeePercent',
    stateMutability: 'pure',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'referralFeePercent',
    stateMutability: 'pure',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'totalFeePercent',
    stateMutability: 'pure',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
];
const ERC20_ABI = [
  {
    type: 'function',
    name: 'decimals',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint8' }],
  },
  {
    type: 'function',
    name: 'balanceOf',
    stateMutability: 'view',
    inputs: [{ type: 'address' }],
    outputs: [{ type: 'uint256' }],
  },
];

function record(severity, label, detail, nextAction) {
  checks.push({ severity, label, detail, nextAction });
  const marker = severity === 'blocked' ? 'BLOCKED' : severity === 'warn' ? 'WARN' : 'PASS';
  console.log(`[${marker}] ${label}: ${detail}`);
  if (nextAction) {
    console.log(`        next: ${nextAction}`);
  }
}

function shortAddress(value) {
  if (!value || typeof value !== 'string' || !isAddress(value)) return 'unset';
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

function boolEnv(name) {
  const value = process.env[name];
  if (value === undefined) return null;
  return value.trim().toLowerCase() === 'true';
}

function requiredEnv(name, label = name) {
  const value = process.env[name];
  if (value && !/your_|placeholder|changeme/i.test(value)) {
    record('pass', label, 'configured');
    return true;
  }
  record('blocked', label, 'missing or placeholder', `Set ${name} before recruiting users into the live loop.`);
  return false;
}

function optionalEnv(name, label = name) {
  const value = process.env[name];
  if (value && !/your_|placeholder|changeme/i.test(value)) {
    record('pass', label, 'configured');
    return true;
  }
  record('warn', label, 'not configured');
  return false;
}

function addressEnv(name, severity = 'blocked') {
  const value = process.env[name];
  if (value && isAddress(value) && value.toLowerCase() !== ZERO_ADDRESS) {
    record('pass', name, shortAddress(value));
    return value;
  }
  record(
    severity,
    name,
    value ? 'invalid or zero address' : 'missing',
    `Set ${name} to the deployed address for the selected Base network.`
  );
  return null;
}

function normalizePrivateKey(rawValue) {
  if (!rawValue) return null;
  let normalized = rawValue.replace(/[\s\u200B-\u200D\uFEFF]+/g, '').trim();
  if (
    (normalized.startsWith('"') && normalized.endsWith('"')) ||
    (normalized.startsWith("'") && normalized.endsWith("'")) ||
    (normalized.startsWith('`') && normalized.endsWith('`'))
  ) {
    normalized = normalized.slice(1, -1).replace(/[\s\u200B-\u200D\uFEFF]+/g, '').trim();
  }
  if (/^[a-fA-F0-9]{64}$/.test(normalized)) normalized = `0x${normalized}`;
  return /^0x[a-fA-F0-9]{64}$/.test(normalized) ? normalized : null;
}

function getChain() {
  const network = (process.env.NEXT_PUBLIC_NETWORK || 'sepolia').trim().toLowerCase();
  const isMainnet = network === 'mainnet';
  const chain = isMainnet ? base : baseSepolia;
  const rpcUrl = isMainnet
    ? process.env.BASE_MAINNET_RPC_URL || process.env.NEXT_PUBLIC_RPC_URL || 'https://mainnet.base.org'
    : process.env.BASE_SEPOLIA_RPC_URL || process.env.NEXT_PUBLIC_RPC_URL || 'https://sepolia.base.org';

  return { network, isMainnet, chain, rpcUrl };
}

async function request(pathname, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const url = new URL(pathname, baseUrl);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'content-type': 'application/json',
        ...(options.headers || {}),
      },
    });
    const text = await response.text();
    let json = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      // Route checks often return HTML; status is the useful signal.
    }
    return { response, text, json };
  } finally {
    clearTimeout(timeout);
  }
}

async function expectHttp(pathname, label, expectedStatuses = [200]) {
  try {
    const { response, json } = await request(pathname);
    if (expectedStatuses.includes(response.status)) {
      record('pass', label, `HTTP ${response.status}`);
      return { ok: true, response, json };
    }

    record(
      'blocked',
      label,
      `expected HTTP ${expectedStatuses.join('/')} but got HTTP ${response.status}`,
      `Start the app with npm run dev or set BASEDARE_SMOKE_URL to a healthy deploy.`
    );
    return { ok: false, response, json };
  } catch (error) {
    record(
      'blocked',
      label,
      error instanceof Error ? error.message : String(error),
      `Start the app with npm run dev or set BASEDARE_SMOKE_URL to a healthy deploy.`
    );
    return { ok: false, response: null, json: null };
  }
}

async function expectProtected(pathname, label, options, expectedStatuses = [401, 403]) {
  try {
    const { response } = await request(pathname, options);
    if (expectedStatuses.includes(response.status)) {
      record('pass', label, `protected with HTTP ${response.status}`);
      return;
    }

    record('blocked', label, `expected protected response, got HTTP ${response.status}`);
  } catch (error) {
    record('blocked', label, error instanceof Error ? error.message : String(error));
  }
}

function getCreatorsFromPayload(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.data?.creators)) return payload.data.creators;
  if (Array.isArray(payload?.creators)) return payload.creators;
  return [];
}

async function checkEnv() {
  console.log(`\nBaseDare launch smoke`);
  console.log(`Target: ${baseUrl}`);
  console.log(`Env mode: ${envMode}\n`);

  const { network } = getChain();
  if (network === 'mainnet' || network === 'sepolia') {
    record('pass', 'NEXT_PUBLIC_NETWORK', network);
  } else {
    record('blocked', 'NEXT_PUBLIC_NETWORK', `unsupported value "${network}"`, 'Use mainnet or sepolia.');
  }

  const serverSim = boolEnv('SIMULATE_BOUNTIES');
  const clientSim = boolEnv('NEXT_PUBLIC_SIMULATE_BOUNTIES');
  if (serverSim === false && clientSim === false) {
    record('pass', 'Bounty simulation flags', 'SIMULATE_BOUNTIES=false and NEXT_PUBLIC_SIMULATE_BOUNTIES=false');
  } else if (serverSim === null || clientSim === null) {
    record('warn', 'Bounty simulation flags', 'one or both flags are missing; live mode defaults can be surprising');
  } else {
    record('blocked', 'Bounty simulation flags', 'simulation mode is enabled', 'Disable both flags for a real-wallet smoke.');
  }

  requiredEnv('DATABASE_URL');
  optionalEnv('DIRECT_URL');
  requiredEnv('PINATA_JWT', 'Proof media storage');
  optionalEnv('PINATA_GATEWAY', 'Proof media gateway');
  optionalEnv('ADMIN_SECRET', 'Admin safety endpoint');
  optionalEnv('CRON_SECRET', 'Cron routes');
  optionalEnv('TELEGRAM_BOT_TOKEN', 'Telegram alerts');
  optionalEnv('TELEGRAM_CHAT_ID', 'Telegram target chat');

  const refereeKey = process.env.REFEREE_HOT_WALLET_PRIVATE_KEY || process.env.REFEREE_PRIVATE_KEY;
  if (!process.env.REFEREE_HOT_WALLET_PRIVATE_KEY && process.env.REFEREE_PRIVATE_KEY) {
    record('warn', 'Referee hot wallet key', 'using legacy REFEREE_PRIVATE_KEY fallback');
  }
  if (normalizePrivateKey(refereeKey)) {
    record('pass', 'Referee hot wallet key', 'configured and parseable');
  } else if (/^0x[a-fA-F0-9]{40}$/.test((process.env.REFEREE_HOT_WALLET_ADDRESS || '').trim())) {
    // CI mode: the payout key must never live in CI secrets. An address-only
    // env proves the referee identity is configured without exposing the key.
    record('pass', 'Referee hot wallet key', 'address-only mode (REFEREE_HOT_WALLET_ADDRESS) — key not present in this environment');
  } else {
    record('blocked', 'Referee hot wallet key', 'missing or malformed', 'Set REFEREE_HOT_WALLET_PRIVATE_KEY (or REFEREE_HOT_WALLET_ADDRESS in CI).');
  }

  return {
    bountyAddress:
      addressEnv('NEXT_PUBLIC_BOUNTY_CONTRACT_ADDRESS') || addressEnv('NEXT_PUBLIC_CONTRACT_ADDRESS', 'warn'),
    usdcAddress: addressEnv('NEXT_PUBLIC_USDC_ADDRESS'),
    platformWallet: addressEnv('NEXT_PUBLIC_PLATFORM_WALLET_ADDRESS'),
    protocolAddress: addressEnv('NEXT_PUBLIC_PROTOCOL_ADDRESS', 'warn'),
  };
}

async function checkDatabase() {
  const tableChecks = [
    ['Venue', () => prisma.venue.count()],
    ['StreamerTag', () => prisma.streamerTag.count()],
    ['CreatorPassport', () => prisma.creatorPassport.count()],
    ['PointsEvent', () => prisma.pointsEvent.count()],
    ['VenueReview', () => prisma.venueReview.count()],
  ];

  for (const [label, countFn] of tableChecks) {
    try {
      const count = await countFn();
      record('pass', `DB table ${label}`, `${count} row${count === 1 ? '' : 's'}`);
    } catch (error) {
      record(
        'blocked',
        `DB table ${label}`,
        error instanceof Error ? error.message : String(error),
        'Run npx prisma db push against the current schema.'
      );
    }
  }
}

async function checkChain(addresses) {
  const { chain, rpcUrl, isMainnet } = getChain();
  const client = createPublicClient({ chain, transport: http(rpcUrl) });

  if (!addresses.bountyAddress || !addresses.usdcAddress) {
    record('blocked', 'Chain contract reads', 'skipped because contract env is invalid');
    return;
  }

  const safeRead = async (label, readFn) => {
    try {
      return await readFn();
    } catch (error) {
      record(
        'blocked',
        label,
        error instanceof Error ? error.shortMessage || error.message : String(error)
      );
      return null;
    }
  };

  try {
    const [bountyBytecode, usdcBytecode] = await Promise.all([
      client.getBytecode({ address: addresses.bountyAddress }),
      client.getBytecode({ address: addresses.usdcAddress }),
    ]);

    record(
      bountyBytecode && bountyBytecode !== '0x' ? 'pass' : 'blocked',
      'Bounty contract bytecode',
      `${shortAddress(addresses.bountyAddress)} on ${chain.name}`
    );
    record(
      usdcBytecode && usdcBytecode !== '0x' ? 'pass' : 'blocked',
      'USDC contract bytecode',
      `${shortAddress(addresses.usdcAddress)} on ${chain.name}`
    );

    const [contractUsdc, platformWallet, refereeAddress, platformFee, referralFee, totalFee, usdcDecimals] =
      await Promise.all([
        safeRead('Bounty USDC metadata', () =>
          client.readContract({ address: addresses.bountyAddress, abi: BOUNTY_ABI, functionName: 'USDC' })
        ),
        safeRead('Bounty platform wallet metadata', () =>
          client.readContract({ address: addresses.bountyAddress, abi: BOUNTY_ABI, functionName: 'PLATFORM_WALLET' })
        ),
        safeRead('Bounty referee metadata', () =>
          client.readContract({ address: addresses.bountyAddress, abi: BOUNTY_ABI, functionName: 'AI_REFEREE_ADDRESS' })
        ),
        safeRead('Bounty platform fee metadata', () =>
          client.readContract({ address: addresses.bountyAddress, abi: BOUNTY_ABI, functionName: 'platformFeePercent' })
        ),
        safeRead('Bounty referral fee metadata', () =>
          client.readContract({ address: addresses.bountyAddress, abi: BOUNTY_ABI, functionName: 'referralFeePercent' })
        ),
        safeRead('Bounty total fee metadata', () =>
          client.readContract({ address: addresses.bountyAddress, abi: BOUNTY_ABI, functionName: 'totalFeePercent' })
        ),
        safeRead('USDC decimals metadata', () =>
          client.readContract({ address: addresses.usdcAddress, abi: ERC20_ABI, functionName: 'decimals' })
        ),
      ]);

    if (contractUsdc && usdcDecimals !== null) {
      const usdcMatches = String(contractUsdc).toLowerCase() === addresses.usdcAddress.toLowerCase();
      record(
        usdcMatches && Number(usdcDecimals) === 6 ? 'pass' : 'blocked',
        'Bounty USDC binding',
        `contract ${shortAddress(String(contractUsdc))}; env ${shortAddress(addresses.usdcAddress)}; decimals ${Number(
          usdcDecimals
        )}`
      );
    }

    if (platformWallet) {
      const platformMatches =
        addresses.platformWallet && String(platformWallet).toLowerCase() === addresses.platformWallet.toLowerCase();
      record(
        platformMatches ? 'pass' : 'blocked',
        'Bounty platform wallet',
        `contract ${shortAddress(String(platformWallet))}; env ${shortAddress(addresses.platformWallet)}`
      );
    }

    if (platformFee !== null && referralFee !== null && totalFee !== null) {
      const feeMatches = Number(platformFee) === 4 && Number(referralFee) === 0 && Number(totalFee) === 4;
      record(
        feeMatches ? 'pass' : 'blocked',
        'Bounty fee schedule',
        `platform ${Number(platformFee)}%, referral ${Number(referralFee)}%, total ${Number(totalFee)}%`
      );
    } else {
      record(
        'blocked',
        'Bounty fee schedule',
        'V2 fee metadata is not readable',
        'Point NEXT_PUBLIC_BOUNTY_CONTRACT_ADDRESS at BaseDareBountyV2, or update the smoke expectations if this contract is intentional.'
      );
    }

    const key = normalizePrivateKey(process.env.REFEREE_HOT_WALLET_PRIVATE_KEY || process.env.REFEREE_PRIVATE_KEY);
    if (key && refereeAddress) {
      const account = privateKeyToAccount(key);
      const refereeMatches = String(refereeAddress).toLowerCase() === account.address.toLowerCase();
      record(
        refereeMatches ? 'pass' : 'blocked',
        'Referee contract authority',
        `contract ${shortAddress(String(refereeAddress))}; key derives ${shortAddress(account.address)}`
      );

      if (addresses.platformWallet && account.address.toLowerCase() === addresses.platformWallet.toLowerCase()) {
        record('blocked', 'Referee wallet isolation', 'referee key equals platform wallet');
      } else {
        record('pass', 'Referee wallet isolation', 'dedicated wallet address');
      }

      const ethBalance = await client.getBalance({ address: account.address });
      if (ethBalance === 0n) {
        record('blocked', 'Referee ETH balance', '0 ETH', 'Fund a small amount of gas before payout/refund smoke.');
      } else if (ethBalance > 50_000_000_000_000_000n) {
        record(
          'warn',
          'Referee ETH balance',
          `${formatEther(ethBalance)} ETH`,
          'Keep the hot wallet low-balance; it only needs gas.'
        );
      } else {
        record('pass', 'Referee ETH balance', `${formatEther(ethBalance)} ETH`);
      }

      try {
        const usdcBalance = await client.readContract({
          address: addresses.usdcAddress,
          abi: ERC20_ABI,
          functionName: 'balanceOf',
          args: [account.address],
        });
        record('warn', 'Referee USDC balance', `${formatUnits(usdcBalance, 6)} USDC (not required for payout)`);
      } catch (error) {
        record('warn', 'Referee USDC balance', error instanceof Error ? error.message : String(error));
      }
    }

    if (isMainnet) {
      record('warn', 'Real-money smoke target', 'mainnet selected', 'Run the first full loop on Base Sepolia first.');
    } else {
      record('pass', 'Real-money smoke target', 'Base Sepolia selected');
    }
  } catch (error) {
    record('blocked', 'Chain contract reads', error instanceof Error ? error.message : String(error));
  }
}

async function checkRoutes() {
  const routeChecks = ['/', '/map', '/creators/onboard', '/first-spark', '/brands/portal'];
  for (const route of routeChecks) {
    await expectHttp(route, `Route ${route}`);
  }
}

async function checkCreatorsApi() {
  const result = await expectHttp('/api/creators', 'GET /api/creators');
  if (!result.ok) return;

  const creators = getCreatorsFromPayload(result.json);
  if (creators.length === 0) {
    record('warn', '/api/creators shape', 'no creators returned; cannot inspect signalPoints/routeReady');
    return;
  }

  const hasSignalFields = creators.every(
    (creator) => Object.hasOwn(creator, 'signalPoints') && Object.hasOwn(creator, 'routeReady')
  );
  record(
    hasSignalFields ? 'pass' : 'blocked',
    '/api/creators shape',
    hasSignalFields
      ? `signalPoints and routeReady present on ${creators.length} creator(s)`
      : 'missing signalPoints or routeReady on at least one creator'
  );
}

async function checkPassportApi() {
  let beforeCount = null;
  try {
    beforeCount = await prisma.creatorPassport.count({ where: { walletAddress: smokeWallet } });
  } catch (error) {
    record('blocked', 'Passport row preflight', error instanceof Error ? error.message : String(error));
  }

  await expectProtected(
    '/api/creators/passport',
    'PATCH /api/creators/passport unauth',
    {
      method: 'PATCH',
      body: JSON.stringify({
        walletAddress: smokeWallet,
        missionStyles: [],
        availability: [],
        radiusKm: 5,
      }),
    },
    [401]
  );

  const result = await expectHttp(`/api/creators/passport?wallet=${smokeWallet}`, 'GET cold creator passport');
  if (result.ok) {
    const data = result.json?.data;
    const cold =
      result.json?.success === true &&
      data?.walletAddress?.toLowerCase() === smokeWallet &&
      Number(data?.signalPoints ?? -1) === 0 &&
      data?.routeReady === false;
    record(
      cold ? 'pass' : 'blocked',
      'Cold passport shape',
      cold ? '0 signal points, routeReady=false' : 'unexpected cold passport payload'
    );
  }

  if (beforeCount !== null) {
    try {
      const afterCount = await prisma.creatorPassport.count({ where: { walletAddress: smokeWallet } });
      record(
        afterCount === beforeCount ? 'pass' : 'blocked',
        'Cold passport GET side effects',
        afterCount === beforeCount
          ? `no row created (${afterCount} existing smoke row${afterCount === 1 ? '' : 's'})`
          : `row count changed from ${beforeCount} to ${afterCount}`
      );
    } catch (error) {
      record('blocked', 'Cold passport GET side effects', error instanceof Error ? error.message : String(error));
    }
  }
}

async function findSmokeVenueSlug() {
  try {
    const venue = await prisma.venue.findFirst({
      where: { status: 'ACTIVE' },
      orderBy: { createdAt: 'asc' },
      select: { slug: true, name: true },
    });
    if (venue?.slug) {
      record('pass', 'Smoke venue', `${venue.name} (${venue.slug})`);
      return venue.slug;
    }

    record('blocked', 'Smoke venue', 'no ACTIVE venue found');
    return null;
  } catch (error) {
    record('blocked', 'Smoke venue', error instanceof Error ? error.message : String(error));
    return null;
  }
}

async function checkVaultApi() {
  const slug = await findSmokeVenueSlug();
  if (!slug) return;

  await expectHttp(`/api/venues/${encodeURIComponent(slug)}/vault`, 'GET venue vault snapshot');
  await expectProtected(
    `/api/venues/${encodeURIComponent(slug)}/reviews`,
    'POST venue review unauth',
    {
      method: 'POST',
      body: JSON.stringify({
        walletAddress: smokeWallet,
        verdict: 'worth_it',
        note: 'smoke',
      }),
    },
    [401]
  );
}

async function checkPayoutConfigFiles() {
  try {
    const [verifyProofRoute, bountyContract] = await Promise.all([
      fs.readFile(path.join(rootDir, 'app/api/verify-proof/route.ts'), 'utf8'),
      fs.readFile(path.join(rootDir, 'contracts/BaseDareBountyV2.sol'), 'utf8'),
    ]);
    const appMatches =
      /STREAMER_FEE_PERCENT\s*=\s*96/.test(verifyProofRoute) && /HOUSE_FEE_PERCENT\s*=\s*4/.test(verifyProofRoute);
    const contractMatches =
      /PLATFORM_FEE_PERCENT\s*=\s*4/.test(bountyContract) && /REFERRAL_FEE_PERCENT\s*=\s*0/.test(bountyContract);

    record(
      appMatches ? 'pass' : 'blocked',
      'App payout split constants',
      appMatches ? 'creator 96%, platform 4%' : 'verify-proof split does not match 96/4'
    );
    record(
      contractMatches ? 'pass' : 'blocked',
      'Bounty V2 fee constants',
      contractMatches ? 'platform 4%, referral 0%' : 'contract fee constants do not match V2 expectation'
    );
  } catch (error) {
    record('blocked', 'Payout config files', error instanceof Error ? error.message : String(error));
  }
}

async function main() {
  const addresses = await checkEnv();
  await checkDatabase();
  await checkChain(addresses);
  await checkPayoutConfigFiles();
  await checkRoutes();
  await checkCreatorsApi();
  await checkPassportApi();
  await checkVaultApi();

  const summary = checks.reduce(
    (acc, check) => {
      acc[check.severity] += 1;
      return acc;
    },
    { pass: 0, warn: 0, blocked: 0 }
  );

  console.log('\nSummary');
  console.log(`PASS ${summary.pass} / WARN ${summary.warn} / BLOCKED ${summary.blocked}`);

  if (summary.blocked > 0) {
    process.exitCode = 1;
  }
}

main()
  .catch((error) => {
    console.error('[BLOCKED] Launch smoke crashed:', error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect().catch(() => {});
  });
