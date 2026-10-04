import test from "node:test";
import assert from "node:assert/strict";
import { mutationIntent, acknowledgeIntent, retainInterpretation, withReceipt } from "../src/lib/mutations.js";

test("unconfirmed writes retain an ID but acknowledged identical purchases are new actions", async () => {
  const first = await mutationIntent("ledger-test-user", "POST", "/expenses", "opaque-hash");
  const retry = await mutationIntent("ledger-test-user", "POST", "/expenses", "opaque-hash");
  assert.equal(retry.requestId, first.requestId);
  assert.equal(retry.retry, true);
  const otherOwner = await mutationIntent("other-test-user", "POST", "/expenses", "opaque-hash");
  assert.notEqual(otherOwner.requestId, first.requestId);
  const correction = await mutationIntent("ledger-test-user", "PUT", "/expenses/1", "opaque-hash");
  assert.notEqual(correction.requestId, first.requestId);
  acknowledgeIntent(first);
  const intentionalRepeat = await mutationIntent("ledger-test-user", "POST", "/expenses", "opaque-hash");
  assert.notEqual(intentionalRepeat.requestId, first.requestId);
  for (const intent of [intentionalRepeat, otherOwner, correction]) acknowledgeIntent(intent);
});

test("stale interpretation keeps its original evidence while totals update", () => {
  const prior = { month: "2026-08", totalSpent: 100, assistantInterpretation: "Earlier insight", assistantGeneratedAt: "2026-08-01T12:00:00Z", intelligenceEvidence: [{ key: "total", value: "100" }] };
  const next = retainInterpretation({ month: "2026-08", totalSpent: 200, assistantInterpretation: null }, prior);
  assert.equal(next.totalSpent, 200);
  assert.equal(next.assistantInterpretation, prior.assistantInterpretation);
  assert.equal(next.interpretationStale, true);
  assert.equal(next.intelligenceEvidence[0].value, "100");
  assert.equal(retainInterpretation({ month: "2026-09" }, prior).assistantInterpretation, undefined);
});

test("canonical receipts are additive on direct and batch results", () => {
  const receipt = { status: "SAVED", requestId: "receipt-id", replayed: true };
  assert.deepEqual(withReceipt({ id: 7 }, receipt), { id: 7, mutationReceipt: receipt });
  assert.equal(withReceipt([{ id: 7 }, { id: 8 }], receipt)[1].mutationReceipt, receipt);
});
