import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { budgetApi } from "../api/budgets";
import { expenseApi } from "../api/expenses";
import { currentMonth, monthBounds, shiftMonth } from "../lib/spending";

export function useExpenseManager(user = null) {
  const requestSequence = useRef(0);
  const analysisSequence = useRef(0);
  const [month, setMonth] = useState(currentMonth);
  const [expenses, setExpenses] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [analysis, setAnalysis] = useState(null);
  const [analysisError, setAnalysisError] = useState("");
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadedMonth, setLoadedMonth] = useState(null);
  const [loadError, setLoadError] = useState("");
  const view = `${user?.uid || ""}:${month}`;
  const activeView = useRef(view);
  activeView.current = view;

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
      if (requestId !== requestSequence.current || activeView.current !== view) return;
      setExpenses(Array.isArray(nextExpenses)
        ? nextExpenses.slice().sort((left, right) => right.spentOn.localeCompare(left.spentOn))
        : []);
      setBudgets(Array.isArray(nextBudgets) ? nextBudgets : []);
      setAnalysis(null);
      setLoadedMonth(view);
    } catch (error) {
      if (requestId !== requestSequence.current || activeView.current !== view) return;
      setLoadError(error.message);
    } finally {
      if (requestId === requestSequence.current && activeView.current === view) setLoading(false);
    }
  }, [user, month, view]);

  const refreshAnalysis = useCallback(async () => {
    if (!user || activeView.current !== view) return null;
    const sequence = ++analysisSequence.current;
    setAnalysisLoading(true);
    setAnalysis(null);
    setAnalysisError("");
    try {
      const next = await expenseApi.analyze(month);
      if (sequence !== analysisSequence.current || activeView.current !== view) return null;
      setAnalysis(next);
      setAnalysisError("");
      return next;
    } catch (error) {
      if (sequence !== analysisSequence.current || activeView.current !== view) return null;
      setAnalysisError(error.message);
      return null;
    } finally {
      if (sequence === analysisSequence.current && activeView.current === view) setAnalysisLoading(false);
    }
  }, [month, user, view]);

  useEffect(() => {
    if (user) {
      load();
    }
    return () => {
      requestSequence.current += 1;
      analysisSequence.current += 1;
    };
  }, [load, user]);

  // Data changes refresh analysis separately so a failed read cannot turn a saved expense into a failed write.
  useEffect(() => {
    if (loadedMonth === view && user) void refreshAnalysis();
    return () => { analysisSequence.current += 1; };
  }, [expenses, budgets, loadedMonth, view, user, refreshAnalysis]);

  // Pick up expenses logged by an assistant when returning to the dashboard.
  useEffect(() => {
    const refresh = () => { if (document.visibilityState === "visible") void load(); };
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [load]);

  const actions = useMemo(() => ({
    async saveExpense(expense, editingId = null) {
      const saved = editingId
        ? await expenseApi.update(editingId, expense)
        : await expenseApi.create(expense);
      if (activeView.current !== view) return saved;
      if (loadedMonth !== view) {
        void load();
        return saved;
      }
      requestSequence.current += 1;
      setLoading(false);
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
      if (activeView.current !== view) return deleted;
      if (loadedMonth !== view) {
        void load();
        return deleted;
      }
      requestSequence.current += 1;
      setLoading(false);
      setExpenses((current) => current.filter((expense) => expense.id !== id));
      return deleted;
    },
    async restoreExpense(id) {
      const restored = await expenseApi.restore(id);
      if (activeView.current !== view) return restored;
      if (loadedMonth !== view) {
        void load();
        return restored;
      }
      requestSequence.current += 1;
      setLoading(false);
      setExpenses((current) => {
        const withoutRestored = current.filter((item) => item.id !== restored.id);
        if (!restored.spentOn.startsWith(month)) return withoutRestored;
        return [...withoutRestored, restored].sort((left, right) => right.spentOn.localeCompare(left.spentOn));
      });
      return restored;
    },
    async saveBudgets(items) {
      const saved = await budgetApi.replace(month, items);
      if (activeView.current !== view) return;
      if (loadedMonth !== view) {
        void load();
        return;
      }
      requestSequence.current += 1;
      setLoading(false);
      setBudgets(Array.isArray(saved) ? saved : []);
    },
    async previousBudget() {
      return budgetApi.list(shiftMonth(month, -1));
    },
  }), [month, view, loadedMonth, load]);

  return {
    month,
    setMonth,
    expenses,
    budgets,
    analysis: analysis?.month === month && loadedMonth === view ? analysis : null,
    analysisError,
    analysisLoading,
    loading,
    ready: loadedMonth === view,
    loadError,
    retry: load,
    retryAnalysis: refreshAnalysis,
    actions,
  };
}
