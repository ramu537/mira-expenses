import { useCallback, useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { auth, googleProvider, signInWithPopup, signOut } from "./config/firebase";
import { configureAccessTokenProvider } from "./api/client";
import AppShell from "./components/AppShell";
import ExpenseDialog from "./components/ExpenseDialog";
import LoginScreen from "./components/LoginScreen";
import { ErrorState, LoadingState } from "./components/PageState";
import Toast from "./components/Toast";
import { useExpenseManager } from "./hooks/useExpenseManager";
import BudgetPage from "./pages/BudgetPage";
import DashboardPage from "./pages/DashboardPage";
import EntriesPage from "./pages/EntriesPage";

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
        configureAccessTokenProvider(async () => currentUser.getIdToken());
        setUser(currentUser);
      } else if (import.meta.env.DEV && (window.location.search.includes("dev=true") || localStorage.getItem("mira-dev-user") === "true")) {
        configureAccessTokenProvider(async () => "dev-mock-token");
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

  const closeToast = useCallback(() => setToast(null), []);

  function openCreate() {
    setEditingExpense(null);
    setDialogOpen(true);
  }

  function openEdit(expense) {
    setEditingExpense(expense);
    setDialogOpen(true);
  }

  function closeDialog() {
    if (saving) return;
    setDialogOpen(false);
    setEditingExpense(null);
  }

  async function saveExpense(expense) {
    setSaving(true);
    try {
      await manager.actions.saveExpense(expense, editingExpense?.id);
      setToast({ tone: "success", message: editingExpense ? "Expense updated." : "Expense added." });
      setDialogOpen(false);
      setEditingExpense(null);
    } catch (error) {
      setToast({ tone: "error", message: error.message });
    } finally {
      setSaving(false);
    }
  }

  async function deleteExpense(id) {
    setDeletingId(id);
    try {
      await manager.actions.deleteExpense(id);
      setToast({ tone: "success", message: "Expense deleted." });
      return true;
    } catch (error) {
      setToast({ tone: "error", message: error.message });
      return false;
    } finally {
      setDeletingId(null);
    }
  }

  async function saveBudgets(items) {
    setBudgetSaving(true);
    try {
      await manager.actions.saveBudgets(items);
      setToast({ tone: "success", message: "Monthly budget saved." });
    } catch (error) {
      setToast({ tone: "error", message: error.message });
    } finally {
      setBudgetSaving(false);
    }
  }

  async function copyPreviousBudget() {
    try {
      return await manager.actions.previousBudget();
    } catch (error) {
      setToast({ tone: "error", message: error.message });
      return null;
    }
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
  if (!manager.ready && manager.loading) {
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
              month={manager.month}
              expenses={manager.expenses}
              budgets={manager.budgets}
              onAdd={openCreate}
              onEdit={openEdit}
            />
          )}
        />
        <Route
          path="/entries"
          element={(
            <EntriesPage
              month={manager.month}
              expenses={manager.expenses}
              deletingId={deletingId}
              onAdd={openCreate}
              onEdit={openEdit}
              onDelete={deleteExpense}
            />
          )}
        />
        <Route
          path="/budget"
          element={(
            <BudgetPage
              month={manager.month}
              expenses={manager.expenses}
              budgets={manager.budgets}
              saving={budgetSaving}
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
        loading={manager.loading}
        user={user}
        onLogout={logout}
      >
        {content}
      </AppShell>
      <ExpenseDialog
        open={dialogOpen}
        expense={editingExpense}
        month={manager.month}
        busy={saving}
        onClose={closeDialog}
        onSave={saveExpense}
      />
      <Toast toast={toast} onClose={closeToast} />
    </>
  );
}
