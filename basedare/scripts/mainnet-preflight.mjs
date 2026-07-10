#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';

import nextEnv from '@next/env';
import { decodeFunctionResult, encodeFunctionData, getAddress, isAddress } from 'viem';

const { loadEnvConfig } = nextEnv;

const rootDir = process.cwd();
loadEnvConfig(rootDir, true);

const BASE_MAINNET_RPC_URL = process.env.BASE_MAINNET_RPC_URL || 'https://mainnet.base.org';
const BASE_SEPOLIA_RPC_URL = process.env.BASE_SEPOLIA_RPC_URL || 'https://sepolia.base.org';
const BASE_MAINNET_USDC = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
const KNOWN_SEPOLIA_USDC = '0x036CbD53842c5426634e7929541eC2318f3dCF7e';
const DEFAULT_PLATFORM_WALLET = '0x60952546f6C6F092CA4866fC7cf6bf12269D002f';
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

const MONEY_RAILS_ABI = [
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
];

const publicEnvKeys = new Set([
  'NEXT_PUBLIC_NETWORK',
  'NEXT_PUBLIC_BOUNTY_CONTRACT_ADDRESS',
  'NEXT_PUBLIC_USDC_ADDRESS',
  'NEXT_PUBLIC_PLATFORM_WALLET_ADDRESS',
  'SIMULATE_BOUNTIES',
  'NEXT_PUBLIC_SIMULATE_BOUNTIES',
]);

const checks = [];

function record(severity, label, detail, nextAction) {
  checks.push({ severity, label, detail, nextAction });
  const marker = severity === 'block' ? 'BLOCK' : severity === 'warn' ? 'WARN' : 'PASS';
  console.log(`[${marker}] ${label}: ${detail}`);
  if (nextAction) console.log(`        next: ${nextAction}`);
}

function env(name) {
  const value = process.env[name];
  return value && value.trim() ? value.trim() : null;
}

function stripEnvQuotes(value) {
  return value
    .trim()
    .replace(/^export\s+/, '')
    .replace(/^['"`]|['"`]$/g, '')
    .trim();
}

async function readPublicEnvFile(relativePath) {
  const fullPath = path.join(rootDir, relativePath);
  const values = {};

  try {
    const content = await fs.readFile(fullPath, 'utf8');
    for (const line of content.split(/\r?\n/)) {
      const match = line.match(/^\s*(?:export\s+)?([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
      if (!match) continue;
      const [, key, rawValue] = match;
      if (publicEnvKeys.has(key)) values[key] = stripEnvQuotes(rawValue);
    }
  } catch (error) {
    if (error?.code !== 'ENOENT') {
      record('warn', `${relativePath} public env scan`, error instanceof Error ? error.message : String(error));
    }
  }

  return values;
}

function normalizeAddress(value) {
  if (!value || !isAddress(value)) return null;
  const checksummed = getAddress(value);
  return checksummed === ZERO_ADDRESS ? null : checksummed;
}

function shortAddress(value) {
  const normalized = normalizeAddress(value);
  return normalized ? `${normalized.slice(0, 6)}...${normalized.slice(-4)}` : 'unset';
}

function sameAddress(left, right) {
  const a = normalizeAddress(left);
  const b = normalizeAddress(right);
  return Boolean(a && b && a.toLowerCase() === b.toLowerCase());
}

function boolEnvValue(value) {
  if (value === null || value === undefined || value === '') return null;
  return String(value).trim().toLowerCase() === 'true';
}

async function rpc(url, method, params) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);

  try {
    const response = await fetch(url, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'content-type': 'application/json',
        'user-agent': 'basedare-mainnet-preflight/1.0',
      },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const payload = await response.json();
    if (payload.error) {
      throw new Error(payload.error.message || JSON.stringify(payload.error));
    }
    return payload.result;
  } finally {
    clearTimeout(timeout);
  }
}

async function getBytecode(url, address) {
  return rpc(url, 'eth_getCode', [address, 'latest']);
}

async function readContract(url, address, abi, functionName) {
  const data = encodeFunctionData({ abi, functionName });
  const result = await rpc(url, 'eth_call', [{ to: address, data }, 'latest']);
  return decodeFunctionResult({ abi, functionName, data: result });
}

async function checkStaticInputs(productionPublicEnv) {
  const deployScript = path.join(rootDir, 'scripts/deploy_mainnet_v2.js');
  const v2Contract = path.join(rootDir, 'contracts/BaseDareBountyV2.sol');

  for (const [label, filePath] of [
    ['Canonical V2 deploy script', deployScript],
    ['BaseDareBountyV2 source', v2Contract],
  ]) {
    try {
      await fs.access(filePath);
      record('pass', label, path.relative(rootDir, filePath));
    } catch {
      record('block', label, 'missing', 'Restore the canonical V2 deploy path before mainnet prep.');
    }
  }

  const platformWallet =
    normalizeAddress(env('MAINNET_PLATFORM_WALLET')) ||
    normalizeAddress(env('NEXT_PUBLIC_PLATFORM_WALLET_ADDRESS')) ||
    normalizeAddress(productionPublicEnv.NEXT_PUBLIC_PLATFORM_WALLET_ADDRESS) ||
    normalizeAddress(DEFAULT_PLATFORM_WALLET);
  const refereeAddress = normalizeAddress(env('MAINNET_REFEREE_ADDRESS'));

  if (platformWallet) {
    record('pass', 'Mainnet platform wallet', shortAddress(platformWallet));
  } else {
    record('block', 'Mainnet platform wallet', 'missing or invalid', 'Set MAINNET_PLATFORM_WALLET explicitly.');
  }

  if (refereeAddress) {
    record('pass', 'Mainnet referee address', shortAddress(refereeAddress));
  } else {
    record(
      'block',
      'Mainnet referee address',
      'missing',
      'Create a fresh referee wallet and pass MAINNET_REFEREE_ADDRESS=0x... to this preflight and the deploy command.'
    );
  }

  if (platformWallet && refereeAddress && sameAddress(platformWallet, refereeAddress)) {
    record('block', 'Wallet role separation', 'platform wallet equals referee address');
  } else if (platformWallet && refereeAddress) {
    record('pass', 'Wallet role separation', 'platform wallet and referee address differ');
  }

  const hasSigningEnv = Boolean(env('DEPLOYER_PRIVATE_KEY') || env('REFEREE_HOT_WALLET_PRIVATE_KEY') || env('REFEREE_PRIVATE_KEY'));
  record(
    hasSigningEnv ? 'pass' : 'warn',
    'Deployment signer env',
    hasSigningEnv ? 'present; value not inspected' : 'not present in this shell',
    hasSigningEnv ? undefined : 'Set DEPLOYER_PRIVATE_KEY in your shell before running the human-signed deploy.'
  );

  const serverSim = boolEnvValue(env('SIMULATE_BOUNTIES') ?? productionPublicEnv.SIMULATE_BOUNTIES);
  const clientSim = boolEnvValue(env('NEXT_PUBLIC_SIMULATE_BOUNTIES') ?? productionPublicEnv.NEXT_PUBLIC_SIMULATE_BOUNTIES);
  if (serverSim === false && clientSim === false) {
    record('pass', 'Simulation flags', 'SIMULATE_BOUNTIES=false and NEXT_PUBLIC_SIMULATE_BOUNTIES=false');
  } else if (serverSim === true || clientSim === true) {
    record('block', 'Simulation flags', 'simulation is enabled', 'Disable both simulation flags before accepting real USDC.');
  } else {
    record('warn', 'Simulation flags', 'one or both flags are missing', 'Set both flags to false for mainnet cutover.');
  }

  return { platformWallet, refereeAddress };
}

async function checkProductionLocalTrap(productionPublicEnv) {
  const network = productionPublicEnv.NEXT_PUBLIC_NETWORK;
  const bountyAddress = normalizeAddress(productionPublicEnv.NEXT_PUBLIC_BOUNTY_CONTRACT_ADDRESS);
  const usdcAddress = normalizeAddress(productionPublicEnv.NEXT_PUBLIC_USDC_ADDRESS);

  if (!network && !bountyAddress && !usdcAddress) {
    record('warn', '.env.production.local public config', 'no public production config found');
    return;
  }

  if (network === 'sepolia' && bountyAddress && usdcAddress && sameAddress(usdcAddress, KNOWN_SEPOLIA_USDC)) {
    try {
      const code = await getBytecode(BASE_SEPOLIA_RPC_URL, bountyAddress);
      record(
        code && code !== '0x' ? 'pass' : 'warn',
        '.env.production.local public config',
        code && code !== '0x'
          ? `coherent Sepolia config at ${shortAddress(bountyAddress)}`
          : `Sepolia config points at ${shortAddress(bountyAddress)} without bytecode`
      );
    } catch (error) {
      record('warn', '.env.production.local public config', error instanceof Error ? error.message : String(error));
    }
    return;
  }

  if (network === 'mainnet' && bountyAddress && usdcAddress && sameAddress(usdcAddress, BASE_MAINNET_USDC)) {
    try {
      const code = await getBytecode(BASE_MAINNET_RPC_URL, bountyAddress);
      if (code && code !== '0x') {
        record('pass', '.env.production.local bounty bytecode', `${shortAddress(bountyAddress)} on Base mainnet`);
      } else {
        record(
          'warn',
          '.env.production.local bounty bytecode',
          `${shortAddress(bountyAddress)} has no Base mainnet bytecode`,
          'Do not use .env.production.local for a mainnet build until the deployed V2 address is pasted in.'
        );
      }
    } catch (error) {
      record('warn', '.env.production.local bounty bytecode', error instanceof Error ? error.message : String(error));
    }
    return;
  }

  record(
    'warn',
    '.env.production.local public config',
    `network=${network || 'unset'}, bounty=${shortAddress(bountyAddress)}, usdc=${shortAddress(usdcAddress)}`,
    'Keep local production config coherent: mainnet requires mainnet USDC plus a bounty with mainnet bytecode.'
  );
}

async function checkMainnetConstants() {
  try {
    const [chainId, usdcCode, decimals] = await Promise.all([
      rpc(BASE_MAINNET_RPC_URL, 'eth_chainId', []),
      getBytecode(BASE_MAINNET_RPC_URL, BASE_MAINNET_USDC),
      readContract(BASE_MAINNET_RPC_URL, BASE_MAINNET_USDC, ERC20_ABI, 'decimals'),
    ]);

    record(chainId === '0x2105' ? 'pass' : 'block', 'Base mainnet RPC', `chainId=${chainId}`);
    record(usdcCode && usdcCode !== '0x' ? 'pass' : 'block', 'Base mainnet USDC bytecode', shortAddress(BASE_MAINNET_USDC));
    record(Number(decimals) === 6 ? 'pass' : 'block', 'Base mainnet USDC decimals', String(Number(decimals)));
  } catch (error) {
    record(
      'warn',
      'Base mainnet RPC',
      error instanceof Error ? error.message : String(error),
      'Set BASE_MAINNET_RPC_URL to a reliable provider if public RPC is unavailable.'
    );
  }
}

async function checkKnownSepoliaAddress() {
  const currentBounty = normalizeAddress(env('NEXT_PUBLIC_BOUNTY_CONTRACT_ADDRESS'));
  const currentUsdc = normalizeAddress(env('NEXT_PUBLIC_USDC_ADDRESS'));
  if (!currentBounty || !sameAddress(currentUsdc, KNOWN_SEPOLIA_USDC)) return;

  try {
    const [mainnetCode, sepoliaCode] = await Promise.all([
      getBytecode(BASE_MAINNET_RPC_URL, currentBounty),
      getBytecode(BASE_SEPOLIA_RPC_URL, currentBounty),
    ]);
    record(
      mainnetCode && mainnetCode !== '0x' ? 'warn' : 'pass',
      'Current local bounty on Base mainnet',
      mainnetCode && mainnetCode !== '0x'
        ? `${shortAddress(currentBounty)} unexpectedly has mainnet bytecode`
        : `${shortAddress(currentBounty)} has no mainnet bytecode`
    );
    record(
      sepoliaCode && sepoliaCode !== '0x' ? 'pass' : 'warn',
      'Current local bounty on Base Sepolia',
      sepoliaCode && sepoliaCode !== '0x'
        ? `${shortAddress(currentBounty)} has Sepolia bytecode`
        : `${shortAddress(currentBounty)} has no Sepolia bytecode`
    );
  } catch (error) {
    record('warn', 'Current local bounty chain check', error instanceof Error ? error.message : String(error));
  }
}

async function checkDeployedMainnetBounty(platformWallet, refereeAddress) {
  const mainnetBounty =
    normalizeAddress(env('MAINNET_BOUNTY_ADDRESS')) ||
    (env('NEXT_PUBLIC_NETWORK') === 'mainnet' ? normalizeAddress(env('NEXT_PUBLIC_BOUNTY_CONTRACT_ADDRESS')) : null);

  if (!mainnetBounty) {
    record(
      'warn',
      'Post-deploy bounty verification',
      'MAINNET_BOUNTY_ADDRESS not set',
      'After you deploy, rerun: MAINNET_BOUNTY_ADDRESS=0x... MAINNET_REFEREE_ADDRESS=0x... npm run mainnet:preflight'
    );
    return;
  }

  try {
    const code = await getBytecode(BASE_MAINNET_RPC_URL, mainnetBounty);
    if (!code || code === '0x') {
      record('block', 'Mainnet bounty bytecode', `${shortAddress(mainnetBounty)} has no Base mainnet bytecode`);
      return;
    }

    record('pass', 'Mainnet bounty bytecode', `${shortAddress(mainnetBounty)} on Base mainnet`);

    const [contractUsdc, contractPlatformWallet, contractReferee, platformFee, referralFee, totalFee] =
      await Promise.all([
        readContract(BASE_MAINNET_RPC_URL, mainnetBounty, MONEY_RAILS_ABI, 'USDC'),
        readContract(BASE_MAINNET_RPC_URL, mainnetBounty, MONEY_RAILS_ABI, 'PLATFORM_WALLET'),
        readContract(BASE_MAINNET_RPC_URL, mainnetBounty, MONEY_RAILS_ABI, 'AI_REFEREE_ADDRESS'),
        readContract(BASE_MAINNET_RPC_URL, mainnetBounty, MONEY_RAILS_ABI, 'platformFeePercent'),
        readContract(BASE_MAINNET_RPC_URL, mainnetBounty, MONEY_RAILS_ABI, 'referralFeePercent'),
        readContract(BASE_MAINNET_RPC_URL, mainnetBounty, MONEY_RAILS_ABI, 'totalFeePercent'),
      ]);

    record(
      sameAddress(String(contractUsdc), BASE_MAINNET_USDC) ? 'pass' : 'block',
      'Mainnet bounty USDC binding',
      `contract=${shortAddress(String(contractUsdc))}, expected=${shortAddress(BASE_MAINNET_USDC)}`
    );
    record(
      platformWallet && sameAddress(String(contractPlatformWallet), platformWallet) ? 'pass' : 'block',
      'Mainnet bounty platform wallet',
      `contract=${shortAddress(String(contractPlatformWallet))}, expected=${shortAddress(platformWallet)}`
    );
    record(
      refereeAddress && sameAddress(String(contractReferee), refereeAddress) ? 'pass' : 'block',
      'Mainnet bounty referee',
      `contract=${shortAddress(String(contractReferee))}, expected=${shortAddress(refereeAddress)}`
    );

    const feeMatches = Number(platformFee) === 4 && Number(referralFee) === 0 && Number(totalFee) === 4;
    record(
      feeMatches ? 'pass' : 'block',
      'Mainnet bounty fee schedule',
      `platform=${Number(platformFee)}%, referral=${Number(referralFee)}%, total=${Number(totalFee)}%`
    );
  } catch (error) {
    record('block', 'Mainnet bounty verification', error instanceof Error ? error.message : String(error));
  }
}

function printCommands(platformWallet) {
  const wallet = platformWallet || DEFAULT_PLATFORM_WALLET;

  console.log('\nHuman-signed deploy command');
  console.log('Replace 0xFRESH_REFEREE_ADDRESS with the address whose private key will live only in the server env.\n');
  console.log(`MAINNET_PLATFORM_WALLET=${wallet} \\`);
  console.log('MAINNET_REFEREE_ADDRESS=0xFRESH_REFEREE_ADDRESS \\');
  console.log(`NEXT_PUBLIC_USDC_ADDRESS=${BASE_MAINNET_USDC} \\`);
  console.log('npm run mainnet:deploy:v2');

  console.log('\nAfter deploy');
  console.log('1. Rerun this preflight with MAINNET_BOUNTY_ADDRESS=0xDEPLOYED_ADDRESS.');
  console.log('2. Set Vercel production env to the printed NEXT_PUBLIC_* values.');
  console.log('3. Set GitHub Actions variables to the same public values plus REFEREE_HOT_WALLET_ADDRESS.');
  console.log('4. Never put the referee private key in GitHub Actions.');
}

const productionPublicEnv = await readPublicEnvFile('.env.production.local');

console.log('\nBaseDare Base mainnet preflight\n');
const { platformWallet, refereeAddress } = await checkStaticInputs(productionPublicEnv);
await checkMainnetConstants();
await checkKnownSepoliaAddress();
await checkProductionLocalTrap(productionPublicEnv);
await checkDeployedMainnetBounty(platformWallet, refereeAddress);
printCommands(platformWallet);

const summary = checks.reduce(
  (acc, check) => {
    acc[check.severity] += 1;
    return acc;
  },
  { pass: 0, warn: 0, block: 0 }
);

console.log('\nSummary');
console.log(`PASS ${summary.pass} / WARN ${summary.warn} / BLOCK ${summary.block}`);

if (summary.block > 0) {
  process.exitCode = 1;
}
