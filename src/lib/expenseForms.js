import { categories } from "./spending.js";
import { captureToday } from "./captureUi.js";

const MAX_CENTS = 999_999_999_999;
const plainAmount = /^(?:\d+(?:\.\d{0,2})?|\.\d{1,2})$/;
const groupedAmount = /^(?:\d{1,3}(?:,\d{3})+|\d{1,2}(?:,\d{2})*,\d{3})(?:\.\d{0,2})?$/;

export function moneyCents(value, allowEmpty = false) {
  const text = String(value ?? "").trim();
  if (!text) return allowEmpty ? 0 : null;
  if (!plainAmount.test(text) && !groupedAmount.test(text)) return null;
  const [whole, fraction = ""] = text.replaceAll(",", "").split(".");
  const cents = Number(whole || "0") * 100 + Number(fraction.padEnd(2, "0"));
  return Number.isSafeInteger(cents) && cents <= MAX_CENTS ? cents : null;
}

export function moneyError(value, allowZero = false) {
  const cents = moneyCents(value, allowZero);
  if (cents === null) return "Enter a valid amount with up to 10 digits and 2 decimal places.";
  if (!allowZero && cents === 0) return "Enter an amount above zero.";
  return "";
}

export function validDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function validateExpense(form) {
  return {
    amount: moneyError(form.amount),
    title: !form.title.trim() ? "Add a description." : form.title.trim().length > 100 ? "Use 100 characters or fewer." : "",
    category: categories[form.category] ? "" : "Choose a category.",
    spentOn: !validDate(form.spentOn) ? "Choose a valid date." : form.spentOn > captureToday() ? "Expenses cannot be dated in the future (India time)." : "",
    note: form.note.length <= 300 ? "" : "Use 300 characters or fewer.",
  };
}

export function budgetValues(budgets) {
  const items = Array.isArray(budgets) ? budgets : budgets?.items || [];
  return Object.fromEntries(Object.keys(categories).map((category) => {
    const amount = items.find((item) => item.category === category)?.amount;
    return [category, Number(amount) > 0 ? String(amount) : ""];
  }));
}

export function monthlyBudgetValue(plan) {
  const amount = plan?.monthlyAmount ?? (plan?.totalSource === "LEGACY_CATEGORIES" ? plan.effectiveTotal : null);
  if (Array.isArray(plan)) {
    const total = plan.reduce((sum, item) => sum + Math.round(Number(item.amount || 0) * 100), 0);
    return total > 0 ? String(total / 100) : "";
  }
  return Number(amount) > 0 ? String(amount) : "";
}

export function budgetPlanSignature(monthlyAmount, values) {
  return `${moneyCents(monthlyAmount, true) ?? `invalid:${monthlyAmount}`}|${budgetSignature(values)}`;
}

export function budgetSignature(values) {
  return Object.keys(categories).map((key) => `${key}:${moneyCents(values[key], true) ?? `invalid:${values[key]}`}`).join("|");
}

export function budgetItems(values) {
  return Object.keys(categories).map((category) => {
    const cents = moneyCents(values[category], true);
    if (cents === null) throw new Error("Check the highlighted budget amounts.");
    return { category, amount: cents / 100 };
  });
}
