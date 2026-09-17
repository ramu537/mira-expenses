export const categories = {
  FOOD: { label: "Food", icon: "Utensils", color: "var(--category-food)" },
  TRANSPORT: { label: "Transport", icon: "CarFront", color: "var(--category-transport)" },
  SHOPPING: { label: "Shopping", icon: "ShoppingBag", color: "var(--category-shopping)" },
  BILLS: { label: "Bills", icon: "ReceiptText", color: "var(--category-bills)" },
  HEALTH: { label: "Health", icon: "HeartPulse", color: "var(--category-health)" },
  ENTERTAINMENT: { label: "Entertainment", icon: "Sparkles", color: "var(--category-entertainment)" },
  EDUCATION: { label: "Education", icon: "BookOpen", color: "var(--category-education)" },
  OTHER: { label: "Other", icon: "Shapes", color: "var(--category-other)" },
};

export const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

export const compactCurrency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  notation: "compact",
  maximumFractionDigits: 1,
});

export function todayString() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

export function currentMonth() {
  return todayString().slice(0, 7);
}

export function monthBounds(month) {
  const [year, monthNumber] = month.split("-").map(Number);
  const end = new Date(year, monthNumber, 0).getDate();
  return { start: `${month}-01`, end: `${month}-${String(end).padStart(2, "0")}` };
}

export function shiftMonth(month, delta) {
  const [year, monthNumber] = month.split("-").map(Number);
  const date = new Date(year, monthNumber - 1 + delta, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function monthLabel(month, short = false) {
  const [year, monthNumber] = month.split("-").map(Number);
  return new Intl.DateTimeFormat("en-IN", {
    month: short ? "short" : "long",
    year: "numeric",
  }).format(new Date(year, monthNumber - 1, 1));
}

export function defaultDateForMonth(month) {
  return month === currentMonth() ? todayString() : `${month}-01`;
}

export function readableDate(date, includeYear = false) {
  return new Intl.DateTimeFormat("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    ...(includeYear ? { year: "numeric" } : {}),
  }).format(new Date(`${date}T00:00:00`));
}

export function buildSummary(expenses) {
  const total = expenses.reduce((sum, item) => sum + Number(item.amount), 0);
  const byCategory = expenses.reduce((result, item) => {
    result[item.category] = (result[item.category] || 0) + Number(item.amount);
    return result;
  }, {});
  const topCategory = Object.entries(byCategory).sort((left, right) => right[1] - left[1])[0]?.[0] || null;
  return {
    total,
    count: expenses.length,
    average: expenses.length ? total / expenses.length : 0,
    byCategory,
    topCategory,
  };
}

export function buildDailyData(expenses, month) {
  const dailyTotals = expenses.reduce((result, item) => {
    result[item.spentOn] = (result[item.spentOn] || 0) + Number(item.amount);
    return result;
  }, {});
  const dayCount = Number(monthBounds(month).end.slice(-2));
  return Array.from({ length: dayCount }, (_, index) => {
    const day = index + 1;
    const date = `${month}-${String(day).padStart(2, "0")}`;
    return { day, date, amount: dailyTotals[date] || 0 };
  });
}

export function buildCategoryData(expenses) {
  const { byCategory } = buildSummary(expenses);
  return Object.entries(byCategory)
    .filter(([key]) => categories[key])
    .map(([key, value]) => ({ key, name: categories[key].label, value }))
    .sort((left, right) => right.value - left.value);
}

export function budgetAmountMap(budgets) {
  return Object.fromEntries((budgets || []).map((item) => [item.category, Number(item.amount)]));
}

export function groupExpenses(expenses, order = "NEWEST") {
  const groups = new Map();
  expenses.forEach((expense) => {
    if (!groups.has(expense.spentOn)) groups.set(expense.spentOn, []);
    groups.get(expense.spentOn).push(expense);
  });

  return Array.from(groups, ([date, items]) => ({
    date,
    items,
    total: items.reduce((sum, item) => sum + Number(item.amount), 0),
  })).sort((left, right) => order === "OLDEST"
    ? left.date.localeCompare(right.date)
    : right.date.localeCompare(left.date));
}
