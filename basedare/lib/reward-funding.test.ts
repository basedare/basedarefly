import { test } from "node:test";
import assert from "node:assert/strict";
import { hasRecordedRewardFunding } from "./reward-funding.ts";
const funded = {
  isSimulated: false,
  txHash: "0x" + "a".repeat(64),
  onChainDareId: "123",
};
test("legacy pending seed without escrow evidence is not live paid work", () => {
  assert.equal(
    hasRecordedRewardFunding({
      isSimulated: false,
      txHash: null,
      onChainDareId: null,
    }),
    false
  );
});
test("requires real funding hash and positive escrow ID, including after settlement", () => {
  assert.equal(hasRecordedRewardFunding(funded), true);
  for (const patch of [
    { isSimulated: true },
    { txHash: "invoice-123" },
    { onChainDareId: "0" },
    { onChainDareId: null },
    { txHash: null },
  ]) {
    assert.equal(hasRecordedRewardFunding({ ...funded, ...patch }), false);
  }
});
