import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { budgetApi } from "../api/budgets";
import { expenseApi } from "../api/expenses";
import { currentMonth, monthBounds, shiftMonth } from "../lib/spending";

export function useExpenseManager(user = null) {
  const requestSequence = useRef(0);
  const [month, setMonth] = useState(currentMonth);
  const [expenses, setExpenses] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadedMonth, setLoadedMonth] = useState(null);
  const [loadError, setLoadError] = useState("");

  const load = useCallback(async () => {
    if (!user) return;
    const requestId = requestSequence.current + 1;
    requestSequence.current = requestId;
    setLoading(true);
    setLoadError("");
    try {
      const { start, end } = monthBounds(month);
      const [nextExpenses, nextBudgets] = await Promise.all([
        expenseApi.list(start, end),
        budgetApi.list(month),
      ]);
      if (requestId !== requestSequence.current) return;
      setExpenses(Array.isArray(nextExpenses)
        ? nextExpenses.slice().sort((left, right) => right.spentOn.localeCompare(left.spentOn))
        : []);
      setBudgets(Array.isArray(nextBudgets) ? nextBudgets : []);
      setLoadedMonth(month);
    } catch (error) {
      if (requestId !== requestSequence.current) return;
      setLoadError(error.message);
    } finally {
      if (requestId === requestSequence.current) setLoading(false);
    }
  }, [user, month]);

  useEffect(() => {
    if (user) {
      load();
    }
    return () => {
      requestSequence.current += 1;
    };
  }, [load, user]);

  const actions = useMemo(() => ({
    async saveExpense(expense, editingId = null) {
      const saved = editingId
        ? await expenseApi.update(editingId, expense)
        : await expenseApi.create(expense);
      setExpenses((current) => {
        const withoutSaved = current.filter((item) => item.id !== saved.id);
        if (!saved.spentOn.startsWith(month)) return withoutSaved;
        return [...withoutSaved, saved].sort((left, right) => (
          right.spentOn.localeCompare(left.spentOn)
          || String(right.createdAt || "").localeCompare(String(left.createdAt || ""))
        ));
      });
      return saved;
    },
    async deleteExpense(id) {
      const deleted = await expenseApi.remove(id);
      setExpenses((current) => current.filter((expense) => expense.id !== id));
      return deleted;
    },
    async restoreExpense(id) {
      const restored = await expenseApi.restore(id);
      setExpenses((current) => {
        const withoutRestored = current.filter((item) => item.id !== restored.id);
        if (!restored.spentOn.startsWith(month)) return withoutRestored;
        return [...withoutRestored, restored].sort((left, right) => right.spentOn.localeCompare(left.spentOn));
      });
      return restored;
    },
    async saveBudgets(items) {
      const saved = await budgetApi.replace(month, items);
      setBudgets(Array.isArray(saved) ? saved : []);
    },
    async previousBudget() {
      return budgetApi.list(shiftMonth(month, -1));
    },
  }), [month]);

  return {
    month,
    setMonth,
    expenses,
    budgets,
    loading,
    ready: loadedMonth === month,
    loadError,
    retry: load,
    actions,
  };
}
