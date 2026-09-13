import { BarChart3, List, LogOut, Plus, Target } from "lucide-react";
import { NavLink } from "react-router-dom";
import MonthControl from "./MonthControl";

const navigation = [
  { to: "/", label: "Overview", icon: BarChart3, end: true },
  { to: "/entries", label: "Entries", icon: List },
  { to: "/budget", label: "Budget", icon: Target },
];

function Brand() {
  return (
    <div className="brand" aria-label="Mira Expense Manager">
      <span className="brand-mark" aria-hidden="true">
        <span />
        <span />
        <span />
      </span>
      <span className="brand-copy">
        <strong>Mira</strong>
        <small>Expense manager</small>
      </span>
    </div>
  );
}

function Navigation({ mobile = false }) {
  return (
    <nav className={mobile ? "mobile-navigation" : "side-navigation"} aria-label="Expense manager">
      {navigation.map(({ to, label, icon: Icon, end }) => (
        <NavLink key={to} to={to} end={end}>
          <Icon size={mobile ? 20 : 18} strokeWidth={2} />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}

export default function AppShell({ month, onMonthChange, onAdd, loading, user, onLogout, children }) {
  const initialLetter = (user?.displayName || user?.email || "U").charAt(0).toUpperCase();

  return (
    <div className="app-frame">
      <aside className="sidebar">
        <Brand />
        <Navigation />

        <div className="sidebar-bottom">
          <div className="sidebar-note">
            <span className="status-dot" />
            <span>
              <strong>Expenses only</strong>
              <small>A focused money workspace</small>
            </span>
          </div>

          {user && (
            <div className="user-profile">
              <div className="user-profile__info">
                {user.photoURL ? (
                  <img src={user.photoURL} alt={user.displayName || "User"} className="user-avatar" />
                ) : (
                  <div className="user-avatar user-avatar--fallback">{initialLetter}</div>
                )}
                <div className="user-profile__text">
                  <span className="user-profile__name">{user.displayName || "User"}</span>
                  <span className="user-profile__email">{user.email || ""}</span>
                </div>
              </div>
              <button
                type="button"
                className="user-profile__logout"
                onClick={onLogout}
                title="Sign out"
                aria-label="Sign out"
              >
                <LogOut size={16} />
                <span>Sign out</span>
              </button>
            </div>
          )}
        </div>
      </aside>

      <div className="app-column">
        <header className="topbar">
          <div className="topbar-brand"><Brand /></div>
          <MonthControl month={month} onChange={onMonthChange} />
          <div className="topbar-actions">
            <button className="button button--primary topbar-add" type="button" onClick={onAdd}>
              <Plus size={18} strokeWidth={2.4} />
              <span>Add expense</span>
            </button>
            {user && (
              <div className="topbar-user">
                {user.photoURL ? (
                  <img src={user.photoURL} alt={user.displayName || "User"} className="user-avatar user-avatar--sm" />
                ) : (
                  <div className="user-avatar user-avatar--fallback user-avatar--sm">{initialLetter}</div>
                )}
                <button
                  type="button"
                  className="topbar-logout-btn"
                  onClick={onLogout}
                  title="Sign out"
                  aria-label="Sign out"
                >
                  <LogOut size={16} />
                </button>
              </div>
            )}
          </div>
          {loading && <span className="route-progress" aria-label="Loading selected month" />}
        </header>

        <main className="main-content">{children}</main>
        <Navigation mobile />

        <button className="mobile-add" type="button" onClick={onAdd} aria-label="Add expense">
          <Plus size={24} strokeWidth={2.4} />
        </button>
      </div>
    </div>
  );
}

