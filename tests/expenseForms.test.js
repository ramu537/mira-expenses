import test from "node:test";
import assert from "node:assert/strict";
import { budgetItems, budgetSignature, budgetValues, moneyCents, moneyError, validDate, validateExpense } from "../src/lib/expenseForms.js";
import { buildDailyData, buildSummary, currency, groupExpenses } from "../src/lib/spending.js";

test("amounts accept paise and Indian or international digit grouping", () => {
  assert.equal(moneyCents("280.50"), 28050);
  assert.equal(moneyCents("1,23,456.78"), 12345678);
  assert.equal(moneyCents("123,456.78"), 12345678);
  assert.equal(moneyCents(".75"), 75);
  assert.equal(moneyCents(""), null);
  assert.equal(moneyCents("", true), 0);
  for (const amount of ["-1", "NaN", "Infinity", "1e3", "2.555", "12,34", "10000000000"]) {
    assert.equal(moneyCents(amount), null, amount);
  }
  assert.equal(moneyCents("9999999999.99"), 999999999999);
  assert.ok(moneyError("0"));
  assert.equal(moneyError("0", true), "");
});

test("expense validation follows the existing backend contract", () => {
  const form = { title: "Lunch", amount: "280.50", category: "FOOD", spentOn: "2026-10-03", note: "" };
  assert.ok(Object.values(validateExpense(form)).every((error) => !error));
  assert.ok(validateExpense({ ...form, title: "   " }).title);
  assert.ok(validateExpense({ ...form, category: "UNKNOWN" }).category);
  assert.ok(validateExpense({ ...form, note: "x".repeat(301) }).note);
  assert.equal(validDate("2026-02-30"), false);
  assert.equal(validDate("2024-02-29"), true);
  assert.equal(validDate("2026-02-29"), false);
  assert.equal(validDate("2026-2-3"), false);
});

test("budget drafts stay as text and normalize empty amounts only on save", () => {
  const values = budgetValues([{ category: "FOOD", amount: 2500.5 }]);
  assert.equal(values.FOOD, "2500.5");
  assert.equal(values.OTHER, "");
  assert.equal(budgetItems(values).length, 8);
  assert.deepEqual(budgetItems(values).find((item) => item.category === "FOOD"), { category: "FOOD", amount: 2500.5 });
  assert.equal(budgetSignature(values), budgetSignature({ ...values, FOOD: "2,500.50", OTHER: "0" }));
  assert.throws(() => budgetItems({ ...values, FOOD: "2.555" }));
});

test("expense displays retain paise instead of rounding the purchase", () => {
  assert.match(currency.format(280.5), /280\.5/);
  assert.match(currency.format(280), /280$/);
});

test("summary, chart and date group totals add paise exactly", () => {
  const records = [
    { id: "1", title: "First", amount: 0.1, category: "FOOD", spentOn: "2026-10-03" },
    { id: "2", title: "Second", amount: 0.2, category: "FOOD", spentOn: "2026-10-03" },
  ];
  assert.equal(buildSummary(records).total, 0.3);
  assert.equal(buildSummary(records).byCategory.FOOD, 0.3);
  assert.equal(buildDailyData(records, "2026-10")[2].amount, 0.3);
  assert.equal(groupExpenses(records)[0].total, 0.3);
});
