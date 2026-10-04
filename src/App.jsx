import FloatingAssistant from "./components/FloatingAssistant";
import { useCallback, useEffect, useRef, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { auth, googleProvider, signInWithPopup, signOut } from "./config/firebase";
import { configureAccessTokenProvider } from "./api/client";
import AppShell from "./components/AppShell";
import ExpenseDialog from "./components/ExpenseDialog";
import ExpenseIntelligenceDialog from "./components/ExpenseIntelligenceDialog";
import AiExpenseCaptureModal from "./components/AiExpenseCaptureModal";
import AiMemorySearchDialog from "./components/AiMemorySearchDialog";
import LoginScreen from "./components/LoginScreen";
import { ErrorState, LoadingState } from "./components/PageState";
import Toast from "./components/Toast";
import { useExpenseManager } from "./hooks/useExpenseManager";
import BudgetPage from "./pages/BudgetPage";
import DashboardPage from "./pages/DashboardPage";
import EntriesPage from "./pages/EntriesPage";
import { defaultDateForMonth } from "./lib/spending";

function loginMessage(error) {
  const code = error?.code || "";
  if (code === "auth/popup-closed-by-user") return "Sign-in was closed before it finished. Try again when you are ready.";
  if (code === "auth/popup-blocked") return "Your browser blocked the sign-in window. Allow pop-ups for Mira and try again.";
  if (code === "auth/network-request-failed") return "Could not reach Google authentication. Check your connection and try again.";
  return "Could not sign you in right now. Please try again.";
}

if (typeof window !== "undefined" && import.meta.env.DEV && window.location.search.includes("dev=true")) {
  localStorage.setItem("mira-dev-user", "true");
}

export default function App() {
  const [user, setUser] = useState(() => {
    if (import.meta.env.DEV && typeof window !== "undefined" && (window.location.search.includes("dev=true") || localStorage.getItem("mira-dev-user") === "true")) {
      return { uid: "dev-user", email: "mani@mira.app", displayName: "Mani", getIdToken: async () => "dev-mock-token" };
    }
    return null;
  });
  const [authReady, setAuthReady] = useState(() => {
    if (import.meta.env.DEV && typeof window !== "undefined" && (window.location.search.includes("dev=true") || localStorage.getItem("mira-dev-user") === "true")) {
      return true;
    }
    return false;
  });
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        configureAccessTokenProvider(async () => currentUser.getIdToken(), currentUser.uid);
        setUser(currentUser);
      } else if (import.meta.env.DEV && (window.location.search.includes("dev=true") || localStorage.getItem("mira-dev-user") === "true")) {
        configureAccessTokenProvider(async () => "dev-mock-token", "dev-mock-user");
        setUser({ uid: "dev-user", email: "mani@mira.app", displayName: "Mani", getIdToken: async () => "dev-mock-token" });
      } else {
        configureAccessTokenProvider(null);
        setUser(null);
      }
      setAuthReady(true);
    });
    return unsubscribe;
  }, []);

  async function login() {
    setAuthBusy(true);
    setAuthError("");
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      setAuthError(loginMessage(err));
    } finally {
      setAuthBusy(false);
    }
  }

  async function logout() {
    setAuthError("");
    try {
      localStorage.removeItem("mira-dev-user");
      await signOut(auth);
      configureAccessTokenProvider(null);
      setUser(null);
    } catch {
      setAuthError("Could not sign you out right now. Please try again.");
    }
  }

  const manager = useExpenseManager(user);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [saving, setSaving] = useState(false);
  const [budgetSaving, setBudgetSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [toast, setToast] = useState(null);
  const [intelligenceOpen, setIntelligenceOpen] = useState(false);
  const [aiCaptureOpen, setAiCaptureOpen] = useState(false);
  const [aiSearchOpen, setAiSearchOpen] = useState(false);
  const [budgetDrafts, setBudgetDrafts] = useState({});
  const expenseWrite = useRef(false);
  const budgetWrite = useRef(false);
  const deleteWrite = useRef(false);
  const savedInDialog = useRef(null);
  const activeUser = useRef(user?.uid);
  activeUser.current = user?.uid;

  useEffect(() => {
    setBudgetDrafts({}); setDialogOpen(false); setEditingExpense(null);
    setAiCaptureOpen(false); setAiSearchOpen(false); setIntelligenceOpen(false); setToast(null);
    savedInDialog.current = null;
  }, [user?.uid]);
  useEffect(() => {
    if (!Object.keys(budgetDrafts).length) return;
    function beforeUnload(event) { event.preventDefault(); event.returnValue = ""; }
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [budgetDrafts]);

  function changeBudgetDraft(month, draft) {
    setBudgetDrafts((current) => {
      const next = { ...current };
      if (draft) next[month] = draft;
      else delete next[month];
      return next;
    });
  }

  const closeToast = useCallback(() => setToast(null), []);

  useEffect(() => {
    function handleKeyDown(e) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (document.querySelector("dialog[open]")) return;
        setAiSearchOpen((prev) => !prev);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  function openCreate() {
    savedInDialog.current = null;
    setEditingExpense(null);
    setDialogOpen(true);
  }

  function openEdit(expense) {
    savedInDialog.current = null;
    setEditingExpense(expense);
    setDialogOpen(true);
  }

  function closeDialog() {
    if (saving || expenseWrite.current) return;
    setDialogOpen(false);
    setEditingExpense(null);
    if (savedInDialog.current && savedInDialog.current.slice(0, 7) !== manager.month) manager.setMonth(savedInDialog.current.slice(0, 7));
    savedInDialog.current = null;
  }

  async function saveExpense(expense, { keepOpen = false } = {}) {
    if (expenseWrite.current) throw new Error("An expense is already being saved.");
    expenseWrite.current = true;
    const owner = user.uid;
    setSaving(true);
    try {
      const saved = await manager.actions.saveExpense(expense, editingExpense?.id);
      if (activeUser.current !== owner) return saved;
      savedInDialog.current = saved.spentOn;
      setToast({
        tone: saved.possibleDuplicate ? "warning" : "success",
        message: saved.mutationReceipt?.replayed ? `${saved.title} already saved · original receipt recovered.` : editingExpense
          ? `${saved.title} updated.`
          : saved.possibleDuplicate
            ? `${saved.title} saved. This may match an existing expense.`
            : `${saved.title} · ₹${Number(saved.amount).toLocaleString("en-IN")} saved.`,
      });
      if (!keepOpen) {
        setDialogOpen(false);
        setEditingExpense(null);
        if (saved.spentOn.slice(0, 7) !== manager.month) manager.setMonth(saved.spentOn.slice(0, 7));
        savedInDialog.current = null;
      }
      return saved;
    } finally {
      expenseWrite.current = false;
      setSaving(false);
    }
  }

  async function deleteExpense(id) {
    if (deleteWrite.current) return false;
    deleteWrite.current = true;
    const owner = user.uid;
    setDeletingId(id);
    try {
      const deleted = await manager.actions.deleteExpense(id);
      if (activeUser.current !== owner) return true;
      setToast({
        tone: "success",
        message: `${deleted.title} deleted.`,
        actionLabel: "Undo",
        action: async () => {
          if (activeUser.current !== owner) return;
          try {
            const restored = await manager.actions.restoreExpense(deleted.id);
            if (activeUser.current !== owner) return;
            if (restored.spentOn.slice(0, 7) !== manager.month) manager.setMonth(restored.spentOn.slice(0, 7));
            setToast({ tone: "success", message: `${deleted.title} restored.` });
          } catch (error) {
            if (activeUser.current === owner) setToast({ tone: "error", message: error.message });
          }
        },
      });
      return true;
    } catch (error) {
      if (activeUser.current === owner) setToast({ tone: "error", message: error.message });
      return false;
    } finally {
      deleteWrite.current = false;
      setDeletingId(null);
    }
  }

  async function saveBudgets(items) {
    if (budgetWrite.current) throw new Error("Your budget is already being saved.");
    budgetWrite.current = true;
    const submittedMonth = manager.month;
    const submittedDraft = budgetDrafts[submittedMonth];
    const owner = user.uid;
    setBudgetSaving(true);
    try {
      const saved = await manager.actions.saveBudgets(items);
      if (activeUser.current !== owner) return saved;
      setBudgetDrafts((current) => {
        if (current[submittedMonth] !== submittedDraft) return current;
        const next = { ...current };
        delete next[submittedMonth];
        return next;
      });
      setToast({ tone: "success", message: "Monthly budget saved." });
      return saved;
    } finally {
      budgetWrite.current = false;
      setBudgetSaving(false);
    }
  }

  async function copyPreviousBudget() {
    return manager.actions.previousBudget();
  }

  if (!authReady) {
    return (
      <div className="auth-splash">
        <div className="brand-mark" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <div className="loading-dot" />
      </div>
    );
  }

  if (!user) {
    return <LoginScreen onLogin={login} error={authError} loading={authBusy} />;
  }

  let content;
  if (!manager.ready && !manager.loadError) {
    content = <LoadingState />;
  } else if (!manager.ready && manager.loadError) {
    content = <ErrorState message={manager.loadError} onRetry={manager.retry} />;
  } else {
    content = (
      <Routes>
        <Route
          path="/"
          element={(
            <DashboardPage
              key={manager.month}
              month={manager.month}
              expenses={manager.expenses}
              budgets={manager.budgets}
              onAdd={openCreate}
              onEdit={openEdit}
              onOpenAiCapture={() => setAiCaptureOpen(true)}
              onDelete={deleteExpense}
              deletingId={deletingId}
            />
          )}
        />
        <Route
          path="/entries"
          element={(
            <EntriesPage
              key={`${user.uid}:${manager.month}`}
              month={manager.month}
              expenses={manager.expenses}
              deletingId={deletingId}
              onAdd={() => setAiCaptureOpen(true)}
              onEdit={openEdit}
              onDelete={deleteExpense}
            />
          )}
        />
        <Route
          path="/budget"
          element={(
            <BudgetPage
              key={`${user.uid}:${manager.month}`}
              month={manager.month}
              expenses={manager.expenses}
              budgets={manager.budgets}
              saving={budgetSaving}
              draft={budgetDrafts[manager.month]}
              onDraftChange={(draft) => changeBudgetDraft(manager.month, draft)}
              onSave={saveBudgets}
              onCopyPrevious={copyPreviousBudget}
            />
          )}
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    );
  }

  return (
    <>
      <AppShell
        month={manager.month}
        onMonthChange={manager.setMonth}
        onAdd={openCreate}
        onOpenIntelligence={() => setIntelligenceOpen(true)}
        onOpenAiCapture={() => setAiCaptureOpen(true)}
        onOpenAiSearch={() => setAiSearchOpen(true)}
        loading={manager.loading}
        user={user}
        onLogout={logout}
      >
        {manager.ready && manager.loadError && <div className="inline-notice expense-error expense-refresh-error" role="alert"><span>Could not refresh your records: {manager.loadError} Showing the last loaded data.</span><button className="button button--secondary" type="button" disabled={manager.loading} onClick={manager.retry}>Retry</button></div>}
        {content}
      </AppShell>
      <ExpenseIntelligenceDialog userId={user.uid} date={manager.month + "-01"} contextKey={`${manager.month}:${manager.revision}`} onScenario={manager.analyzeScenario} open={intelligenceOpen} analysis={manager.analysis} loading={manager.analysisLoading} error={manager.analysisError} onRefresh={manager.retryAnalysis} onPoll={manager.pollAnalysis} onClose={() => setIntelligenceOpen(false)} />
      <ExpenseDialog
        open={dialogOpen}
        expense={editingExpense}
        month={manager.month}
        busy={saving}
        recentExpenses={manager.expenses}
        onClose={closeDialog}
        onSave={saveExpense}
      />
      <AiExpenseCaptureModal
        onManual={() => { setAiCaptureOpen(false); openCreate(); }}
        key={user.uid}
        open={aiCaptureOpen}
        initialDate={defaultDateForMonth(manager.month)}
        onClose={() => setAiCaptureOpen(false)}
        onSuccess={(msg) => {
          manager.retry();
          setToast({ tone: "success", message: msg });
        }}
      />
      <AiMemorySearchDialog
        open={aiSearchOpen}
        onClose={() => setAiSearchOpen(false)}
        onSelectDate={(date) => {
          if (date && date.length >= 7) {
            manager.setMonth(date.slice(0, 7));
          }
        }}
      />
      <FloatingAssistant domain={"expenses"} userId={user.uid} date={manager.month + "-01"} />
      <Toast toast={toast} onClose={closeToast} />
    </>
  );
}
