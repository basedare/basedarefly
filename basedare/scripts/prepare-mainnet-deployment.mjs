#!/usr/bin/env node
// Read-only: no signer, private-key loading or transaction broadcasting.
import fs from 'node:fs/promises';
import { Contract, ContractFactory, ZeroAddress, formatEther, getAddress, getCreateAddress, keccak256, parseEther } from 'ethers';
import { ReadOnlyRpcProvider } from './mainnet-rpc.mjs';

const USDC = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
function address(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Set ${name} to a public wallet address. Never pass private keys to this command.`);
  if (!/^0x[0-9a-fA-F]{40}$/.test(value.trim())) throw new Error(`${name} must be a public wallet address.`);
  let parsed;
  try { parsed = getAddress(value.trim()); } catch { throw new Error(`${name} has an invalid address checksum.`); }
  if (parsed === ZeroAddress) throw new Error(`${name} cannot be zero.`);
  return parsed;
}
async function main() {
  const deployer = address('MAINNET_DEPLOYER_ADDRESS');
  const platform = address('MAINNET_PLATFORM_WALLET');
  const referee = address('MAINNET_REFEREE_ADDRESS');
  if (referee === platform || referee === deployer) throw new Error('Use a separate referee wallet from both the owner and platform treasury.');
  const provider = new ReadOnlyRpcProvider(process.env.BASE_MAINNET_RPC_URL || 'https://mainnet.base.org');
  try {
    if ((await provider.getNetwork()).chainId !== 8453n) throw new Error('RPC is not Base mainnet (8453).');
    const artifact = JSON.parse(await fs.readFile(new URL('../artifacts/contracts/BaseDareBountyV2.sol/BaseDareBountyV2.json', import.meta.url), 'utf8'));
    const token = new Contract(USDC, ['function decimals() view returns (uint8)'], provider);
    if (await provider.getCode(USDC) === '0x' || await token.decimals() !== 6n) throw new Error('Canonical USDC code/decimals check failed.');
    const transaction = await new ContractFactory(artifact.abi, artifact.bytecode).getDeployTransaction(USDC, platform);
    const [nonce, balance, fees, deploymentGas, refereeBalance, observedBlock] = await Promise.all([
      provider.getTransactionCount(deployer, 'pending'), provider.getBalance(deployer), provider.getFeeData(),
      provider.estimateGas({ ...transaction, from: deployer }), provider.getBalance(referee), provider.getBlockNumber(),
    ]);
    const gasPrice = fees.maxFeePerGas ?? fees.gasPrice;
    if (gasPrice === null) throw new Error('RPC did not return a gas price.');
    const paddedGas = (deploymentGas * 120n) / 100n;
    const reserve = parseEther('0.005');
    console.log(JSON.stringify({
      mode: 'READ_ONLY_PLAN', generatedAt: new Date().toISOString(), observedBlock,
      chainId: 8453, contract: 'BaseDareBountyV2', deployerAndOwner: deployer,
      platformWallet: platform, refereeWallet: referee, usdc: USDC, creatorPercent: 96, platformPercent: 4,
      creationBytecodeHash: keccak256(artifact.bytecode), deploymentDataHash: keccak256(transaction.data),
      pendingNonce: nonce, predictedAddress: getCreateAddress({ from: deployer, nonce }),
      deployerEth: formatEther(balance), refereeEth: formatEther(refereeBalance),
      deployerReserveEth: '0.005', deployerReserveMet: balance >= reserve,
      deployerReserveShortfallEth: formatEther(balance < reserve ? reserve - balance : 0n),
      estimatedDeploymentGas: deploymentGas.toString(), deploymentGasWith20PercentMargin: paddedGas.toString(),
      estimatedL2DeploymentFeeEth: formatEther(paddedGas * gasPrice),
      feeNote: 'Estimate only; excludes Base L1 data fee and the separate referee-configuration transaction. Refresh before signing.',
      next: 'Review wallet roles and artifact hash. The human operator signs deployment and referee setup, then verifies the deployed contract before runtime cutover.',
    }, null, 2));
  } finally {
    provider.destroy();
  }
}
main().catch(error => {
  // Ethers decoding errors can contain the untrusted RPC body or endpoint.
  const code = typeof error?.code === 'string' && /^[A-Z_0-9]{1,40}$/.test(error.code) ? error.code : null;
  console.error(code ? `Read-only deployment plan failed (${code}). Check RPC and compiled artifacts.` : error.message);
  process.exitCode = 1;
});
