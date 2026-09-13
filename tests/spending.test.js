import assert from "node:assert/strict";
import test from "node:test";
import {
  budgetAmountMap,
  buildCategoryData,
  buildDailyData,
  buildSummary,
  groupExpenses,
  monthBounds,
  shiftMonth,
} from "../src/lib/spending.js";

const expenses = [
  { id: "3", title: "Train", amount: 250, category: "TRANSPORT", spentOn: "2026-09-12" },
  { id: "2", title: "Lunch", amount: 450, category: "FOOD", spentOn: "2026-09-12" },
  { id: "1", title: "Groceries", amount: 1300, category: "FOOD", spentOn: "2026-09-03" },
];

test("monthBounds handles leap years", () => {
  assert.deepEqual(monthBounds("2028-02"), { start: "2028-02-01", end: "2028-02-29" });
});

test("shiftMonth crosses year boundaries", () => {
  assert.equal(shiftMonth("2026-01", -1), "2025-12");
  assert.equal(shiftMonth("2026-12", 1), "2027-01");
});

test("buildSummary calculates totals and leading category", () => {
  assert.deepEqual(buildSummary(expenses), {
    total: 2000,
    count: 3,
    average: 2000 / 3,
    byCategory: { TRANSPORT: 250, FOOD: 1750 },
    topCategory: "FOOD",
  });
});

test("daily and category data remain deterministic", () => {
  const daily = buildDailyData(expenses, "2026-09");
  assert.equal(daily.length, 30);
  assert.equal(daily[2].amount, 1300);
  assert.equal(daily[11].amount, 700);
  assert.deepEqual(buildCategoryData(expenses), [
    { key: "FOOD", name: "Food", value: 1750 },
    { key: "TRANSPORT", name: "Transport", value: 250 },
  ]);
});

test("expenses are grouped newest-first with daily totals", () => {
  assert.deepEqual(groupExpenses(expenses), [
    { date: "2026-09-12", items: expenses.slice(0, 2), total: 700 },
    { date: "2026-09-03", items: expenses.slice(2), total: 1300 },
  ]);
});

test("budgetAmountMap normalizes amounts to numbers", () => {
  assert.deepEqual(
    budgetAmountMap([{ category: "FOOD", amount: "2500" }]),
    { FOOD: 2500 },
  );
});
