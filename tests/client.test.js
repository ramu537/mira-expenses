import assert from "node:assert/strict";
import test from "node:test";
import { apiRequest, configureAccessTokenProvider } from "../src/api/client.js";

test("configureAccessTokenProvider accepts function or null", () => {
  assert.doesNotThrow(() => {
    configureAccessTokenProvider(() => "token-123");
  });

  assert.doesNotThrow(() => {
    configureAccessTokenProvider(null);
  });

  assert.throws(() => {
    configureAccessTokenProvider("invalid-provider");
  }, {
    name: "TypeError",
    message: "The access token provider must be a function or null.",
  });
});

test("lost write response recovers a receipt rather than logging twice", async () => {
  const original = globalThis.fetch;
  configureAccessTokenProvider(() => "test-token", "receipt-test-owner");
  let posts = 0;
  let key;
  globalThis.fetch = async (url, options) => {
    if (url.includes("/mutation-receipts/")) return new Response(JSON.stringify({
      method: "POST", path: "/api/expenses", result: { id: 7, title: "Lunch" }, savedAt: "2026-08-01T12:00:00Z",
    }), { status: 200, headers: { "Content-Type": "application/json" } });
    posts++;
    key = options.headers.get("Idempotency-Key");
    throw new TypeError("Connection lost after commit");
  };
  const options = { method: "POST", body: JSON.stringify({ title: "Lunch", amount: 100 }) };
  try {
    await assert.rejects(apiRequest("/expenses", options), error => error.uncertain && Boolean(error.requestId));
    const saved = await apiRequest("/expenses", options);
    assert.equal(posts, 1);
    assert.equal(saved.id, 7);
    assert.equal(saved.mutationReceipt.requestId, key);
    assert.equal(saved.mutationReceipt.recovered, true);
  } finally { globalThis.fetch = original; configureAccessTokenProvider(null); }
});

test("one-amount budget writes use durable receipts without requiring category items", async () => {
  const original = globalThis.fetch;
  configureAccessTokenProvider(() => "test-token", "budget-receipt-owner");
  let writes = 0, key;
  globalThis.fetch = async (url, options) => {
    if (url.includes("/mutation-receipts/")) return new Response(JSON.stringify({
      method: "PUT", path: "/api/budgets/plan?month=2026-10",
      result: { month: "2026-10", monthlyAmount: 30000, effectiveTotal: 30000, items: [] },
    }), { status: 200, headers: { "Content-Type": "application/json" } });
    writes++; key = options.headers.get("Idempotency-Key");
    assert.deepEqual(JSON.parse(options.body), { monthlyAmount: 30000 });
    throw new TypeError("Response lost after commit");
  };
  const options = { method: "PUT", body: JSON.stringify({ monthlyAmount: 30000 }) };
  try {
    await assert.rejects(apiRequest("/budgets/plan?month=2026-10", options), error => error.uncertain);
    const saved = await apiRequest("/budgets/plan?month=2026-10", options);
    assert.equal(writes, 1);
    assert.equal(saved.effectiveTotal, 30000);
    assert.equal(saved.mutationReceipt.requestId, key);
    assert.equal(saved.mutationReceipt.recovered, true);
  } finally { globalThis.fetch = original; configureAccessTokenProvider(null); }
});
