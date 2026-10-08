#!/usr/bin/env node
// Read-only: no signer, private-key loading or transaction broadcasting.
import fs from 'node:fs/promises';
import { Contract, ContractFactory, JsonRpcProvider, ZeroAddress, formatEther, getAddress, getCreateAddress, keccak256 } from 'ethers';

const USDC = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
function address(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Set ${name} to a public wallet address. Never pass private keys to this command.`);
  const parsed = getAddress(value.trim());
  if (parsed === ZeroAddress) throw new Error(`${name} cannot be zero.`);
  return parsed;
}
async function main() {
  const deployer = address('MAINNET_DEPLOYER_ADDRESS');
  const platform = address('MAINNET_PLATFORM_WALLET');
  const referee = address('MAINNET_REFEREE_ADDRESS');
  if (referee === platform || referee === deployer) throw new Error('Use a separate referee wallet from both the owner and platform treasury.');
  const provider = new JsonRpcProvider(process.env.BASE_MAINNET_RPC_URL || 'https://mainnet.base.org');
  if ((await provider.getNetwork()).chainId !== 8453n) throw new Error('RPC is not Base mainnet (8453).');
  const artifact = JSON.parse(await fs.readFile(new URL('../artifacts/contracts/BaseDareBountyV2.sol/BaseDareBountyV2.json', import.meta.url), 'utf8'));
  const token = new Contract(USDC, ['function decimals() view returns (uint8)'], provider);
  if (await provider.getCode(USDC) === '0x' || await token.decimals() !== 6n) throw new Error('Canonical USDC code/decimals check failed.');
  const transaction = await new ContractFactory(artifact.abi, artifact.bytecode).getDeployTransaction(USDC, platform);
  const [nonce, balance, fees, deploymentGas, refereeBalance] = await Promise.all([
    provider.getTransactionCount(deployer, 'pending'), provider.getBalance(deployer), provider.getFeeData(),
    provider.estimateGas({ ...transaction, from: deployer }), provider.getBalance(referee),
  ]);
  const gasPrice = fees.maxFeePerGas ?? fees.gasPrice;
  if (gasPrice === null) throw new Error('RPC did not return a gas price.');
  const paddedGas = (deploymentGas * 120n) / 100n;
  console.log(JSON.stringify({
    mode: 'READ_ONLY_PLAN', chainId: 8453, contract: 'BaseDareBountyV2', deployerAndOwner: deployer,
    platformWallet: platform, refereeWallet: referee, usdc: USDC, creatorPercent: 96, platformPercent: 4,
    creationBytecodeHash: keccak256(artifact.bytecode), deploymentDataHash: keccak256(transaction.data),
    pendingNonce: nonce, predictedAddress: getCreateAddress({ from: deployer, nonce }),
    deployerEth: formatEther(balance), refereeEth: formatEther(refereeBalance),
    estimatedDeploymentGas: deploymentGas.toString(), deploymentGasWith20PercentMargin: paddedGas.toString(),
    estimatedL2DeploymentFeeEth: formatEther(paddedGas * gasPrice),
    feeNote: 'Estimate only; excludes Base L1 data fee and the separate referee-configuration transaction. Refresh before signing.',
    next: 'Review wallet roles and artifact hash. The human operator signs deployment and referee setup, then verifies the deployed contract before runtime cutover.',
  }, null, 2));
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
