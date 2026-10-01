import assert from "node:assert/strict";
import test from "node:test";
import { analysisEngineLabel, freshnessLabel } from "../src/lib/intelligence.js";

test("expense intelligence clearly identifies calculated and AI-assisted results", () => {
  assert.equal(analysisEngineLabel({}), "Calculated from expenses and budgets");
  assert.equal(analysisEngineLabel({ engine: "GEMINI" }), "Gemini + calculated evidence");
});

test("expense intelligence has a safe freshness fallback", () => {
  assert.equal(freshnessLabel(), "Calculated when opened");
});
