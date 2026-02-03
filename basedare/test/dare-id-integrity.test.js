/**
 * CUID → keccak256 → uint256 Integrity Test
 *
 * Verifies that the TypeScript derivation in lib/dare-id.ts produces
 * the exact same uint256 that the Solidity contract receives.
 * If these ever diverge, fundBounty and verifyAndPayout will target
 * different bounty slots — meaning the user's USDC gets stuck.
 *
 * lib/dare-id.ts uses: keccak256(toBytes(dbId)) from viem
 *   - toBytes(string) = UTF-8 encode
 *   - keccak256(bytes) = standard keccak256
 *
 * Ethers equivalent: keccak256(toUtf8Bytes(dbId))
 * Solidity equivalent: keccak256(abi.encodePacked(string))
 *   - abi.encodePacked(string) = raw UTF-8 bytes (no length prefix)
 */

const { expect } = require("chai");
const { ethers } = require("hardhat");

// Mirror of lib/dare-id.ts using ethers (same algorithm, different library)
function generateOnChainDareId(dbId) {
  const hash = ethers.keccak256(ethers.toUtf8Bytes(dbId));
  return BigInt(hash);
}

describe("CUID → keccak256 ID Mapping Integrity", function () {
  // Sample CUIDs that match Prisma's default format
  const TEST_CUIDS = [
    "cm5abc123def456gh789",
    "clxyz789abc012def345",
    "cm9xxxxxxxxxxxxxxxx",
    "a",                          // edge: single char
    "cm5abc123def456gh789012345",  // edge: longer string
  ];

  it("ethers keccak256(toUtf8Bytes(cuid)) is deterministic", function () {
    for (const cuid of TEST_CUIDS) {
      const first = generateOnChainDareId(cuid);
      const second = generateOnChainDareId(cuid);
      expect(first).to.equal(second);
    }
  });

  it("Different CUIDs produce different on-chain IDs (collision resistance)", function () {
    const ids = new Set();
    for (const cuid of TEST_CUIDS) {
      const id = generateOnChainDareId(cuid).toString();
      expect(ids.has(id)).to.be.false;
      ids.add(id);
    }
  });

  it("Solidity keccak256(abi.encodePacked(string)) matches TypeScript derivation", async function () {
    const HashHelper = await ethers.getContractFactory("HashHelper");
    const helper = await HashHelper.deploy();
    await helper.waitForDeployment();

    for (const cuid of TEST_CUIDS) {
      const tsResult = generateOnChainDareId(cuid);
      const solidityResult = await helper.hashString(cuid);

      expect(tsResult).to.equal(
        solidityResult,
        `TS/Solidity mismatch for "${cuid}": ts=${tsResult}, sol=${solidityResult}`
      );
    }
  });

  it("Frontend BigInt round-trips through DB string storage (Prisma)", function () {
    // Flow:
    //   1. Frontend: generateOnChainDareId(cuid) → bigint → fundBounty(dareId)
    //   2. DB: stored as dare.onChainDareId (String in Prisma)
    //   3. Backend: BigInt(dare.onChainDareId) → verifyAndPayout(dareId)
    const cuid = "cm5abc123def456gh789";
    const frontendId = generateOnChainDareId(cuid);

    // Simulate Prisma string storage
    const dbStored = frontendId.toString();

    // Backend retrieval (verify-proof/route.ts line 477)
    const backendId = BigInt(dbStored);

    expect(frontendId).to.equal(backendId);
  });

  it("Produces valid uint256 values (fits in 256 bits)", function () {
    const MAX_UINT256 = (1n << 256n) - 1n;
    for (const cuid of TEST_CUIDS) {
      const id = generateOnChainDareId(cuid);
      expect(id > 0n).to.be.true;
      expect(id <= MAX_UINT256).to.be.true;
    }
  });
});
