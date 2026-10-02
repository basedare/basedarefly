import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';
import { ethers } from 'ethers';
import { prisma } from '@/lib/prisma';

const db = new URL(process.env.DATABASE_URL || '');
const rpc = new URL(process.env.PAYMENT_TEST_RPC || '');
if (db.hostname !== '127.0.0.1' || !db.pathname.includes('_test') || rpc.hostname !== '127.0.0.1') throw Error('Disposable local services required');

async function main() {
  const provider = new ethers.JsonRpcProvider(rpc.href);
  assert.equal((await provider.getNetwork()).chainId, 31337n);
  const [owner, backer, contributor, referee, other] = await Promise.all([0, 1, 2, 3, 4].map(i => provider.getSigner(i)));
  const tokenArtifact = require('../artifacts/contracts/mocks/MockUSDC.sol/MockUSDC.json');
  const bountyArtifact = require('../artifacts/contracts/BaseDareBountyV2.sol/BaseDareBountyV2.json');
  const token = await new ethers.ContractFactory(tokenArtifact.abi, tokenArtifact.bytecode, owner).deploy();
  await token.waitForDeployment();
  const deployed = await new ethers.ContractFactory(bountyArtifact.abi, bountyArtifact.bytecode, owner).deploy(await token.getAddress(), owner.address);
  await deployed.waitForDeployment();
  const bounty = new ethers.Contract(await deployed.getAddress(), bountyArtifact.abi, owner);
  const usdc = new ethers.Contract(await token.getAddress(), tokenArtifact.abi, owner);
  await (await bounty.setAIRefereeAddress(referee.address)).wait();
  await (await usdc.mint(backer.address, 100_000_000n)).wait();
  await (await (usdc.connect(backer) as ethers.Contract).approve(await bounty.getAddress(), 100_000_000n)).wait();
  process.env.NEXT_PUBLIC_BOUNTY_CONTRACT_ADDRESS = await bounty.getAddress();
  process.env.NEXT_PUBLIC_RPC_URL = rpc.href;
  process.env.NEXT_PUBLIC_NETWORK = 'sepolia'; // Route reads the local RPC; no public chain is contacted.
  let notifications = 0;
  const Module = require('node:module');
  const original = Module._load;
  Module._load = function(name: string, ...args: unknown[]) {
    if (name === '@/lib/dare-notifications') return { notifyTargetedDareReceived: async () => { notifications++; } };
    return original.call(this, name, ...args);
  };
  const { POST } = require('@/app/api/bounties/register/route');
  const register = (dareId: string, txHash: string) => POST(new NextRequest('https://test.local/api/bounties/register', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ dareId, txHash }),
  }));
  async function fund(amount = 5_000_000n, recipient = contributor.address) {
    const dare = await prisma.dare.create({ data: { title: 'Local payment recovery test', bounty: 5, status: 'FUNDING', isSimulated: false,
      stakerAddress: backer.address.toLowerCase(), targetWalletAddress: contributor.address.toLowerCase(), shortId: crypto.randomUUID().slice(0, 8) } });
    const id = BigInt(ethers.keccak256(ethers.toUtf8Bytes(dare.id)));
    await prisma.dare.update({ where: { id: dare.id }, data: { onChainDareId: id.toString() } });
    const tx = await (bounty.connect(backer) as ethers.Contract).fundBounty(id, recipient, ethers.ZeroAddress, amount);
    await tx.wait();
    return { dare, id, hash: tx.hash };
  }
  const valid = await fund();
  // Two callbacks arriving together produce one state transition/notification.
  const results = await Promise.all([register(valid.dare.id, valid.hash), register(valid.dare.id, valid.hash)]);
  assert.deepEqual(results.map(r => r.status), [200, 200]);
  assert.equal(notifications, 1);
  assert.equal((await prisma.dare.findUniqueOrThrow({ where: { id: valid.dare.id } })).status, 'PENDING_ACCEPTANCE');
  await (await (bounty.connect(referee) as ethers.Contract).verifyAndPayout(valid.id)).wait();
  assert.equal(await usdc.balanceOf(contributor.address), 4_800_000n);
  assert.equal(await usdc.balanceOf(owner.address), 200_000n);
  await prisma.dare.update({ where: { id: valid.dare.id }, data: { status: 'VERIFIED' } });
  assert.equal((await register(valid.dare.id, valid.hash)).status, 200);
  assert.equal((await prisma.dare.findUniqueOrThrow({ where: { id: valid.dare.id } })).status, 'VERIFIED');
  assert.equal(notifications, 1);
  for (const invalid of [await fund(1_000_000n), await fund(5_000_000n, other.address)]) {
    assert.ok((await register(invalid.dare.id, invalid.hash)).status >= 400);
    assert.equal((await prisma.dare.findUniqueOrThrow({ where: { id: invalid.dare.id } })).status, 'FUNDING');
    await (await (bounty.connect(referee) as ethers.Contract).refundBacker(invalid.id)).wait();
  }
  const refundable = await fund();
  assert.equal((await register(refundable.dare.id, valid.hash)).status, 400);
  assert.equal((await register(refundable.dare.id, refundable.hash)).status, 200);
  const beforeRefund = await usdc.balanceOf(backer.address);
  await (await (bounty.connect(referee) as ethers.Contract).refundBacker(refundable.id)).wait();
  assert.equal(await usdc.balanceOf(backer.address), beforeRefund + 5_000_000n);
  await prisma.dare.update({ where: { id: refundable.dare.id }, data: { status: 'REFUNDED' } });
  assert.equal((await register(refundable.dare.id, refundable.hash)).status, 200);
  assert.equal((await prisma.dare.findUniqueOrThrow({ where: { id: refundable.dare.id } })).status, 'REFUNDED');
  console.log('PASS: real local escrow + database registration, concurrent/repeated callbacks, exact 96/4 payout, wrong amount/recipient/receipt rejection, full refund and terminal-state preservation.');
  provider.destroy();
}
main().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
