import assert from "node:assert/strict";
const wallet = "0x1111111111111111111111111111111111111111";
let rows: Record<string, unknown>[] = [];
const Module = require("node:module");
const original = Module._load;
Module._load = function (name: string, ...args: unknown[]) {
  if (name === "@/lib/prisma")
    return {
      prisma: {
        dare: { findMany: async () => rows },
        notification: { findMany: async () => [] },
      },
    };
  return original.call(this, name, ...args);
};
const { getActionCenter } = require("@/lib/action-center");
async function main() {
  const base = {
    id: "mission-1",
    shortId: "mission-1",
    title: "Film a local scene",
    bounty: 150,
    isSimulated: false,
    status: "PENDING",
    claimRequestStatus: "PENDING",
    claimRequestWallet: wallet,
    claimRequestedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    expiresAt: null,
    streamerHandle: "@open",
  };
  rows = [{ ...base, txHash: null, onChainDareId: null }];
  assert.equal((await getActionCenter(wallet)).items.length, 0);
  rows = [{ ...base, txHash: "0x" + "a".repeat(64), onChainDareId: "123" }];
  let result = await getActionCenter(wallet);
  assert.equal(result.items[0].statusLabel, "Requested");
  assert.equal(result.items[0].href, "/earn/mission-1");
  rows[0] = { ...rows[0], claimedBy: wallet, claimRequestStatus: "APPROVED" };
  result = await getActionCenter(wallet);
  assert.equal(result.items[0].category, "Ready for proof");
  assert.equal(result.items[0].href, "/dare/mission-1");
  rows[0].status = "PENDING_REVIEW";
  assert.equal(
    (await getActionCenter(wallet)).items[0].category,
    "Under review"
  );
  rows[0].status = "PENDING_PAYOUT";
  assert.equal(
    (await getActionCenter(wallet)).items[0].category,
    "Payout queued"
  );
  rows[0].status = "VERIFIED";
  assert.equal((await getActionCenter(wallet)).items[0].category, "Paid");
  console.log(
    "PASS: unfunded seed excluded; funded request, confirmation, submission, payout and paid history share correct mission links."
  );
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
