import ThemeControl from "./ThemeControl";
import { BarChart3, List, LogOut, MoreHorizontal, Plus, Search, Sparkles, Target } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
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

export default function AppShell({ month, onMonthChange, onAdd, onOpenIntelligence, onOpenAiCapture, onOpenAiSearch, loading, user, onLogout, children }) {
  const initialLetter = (user?.displayName || user?.email || "U").charAt(0).toUpperCase();
  const [toolsOpen, setToolsOpen] = useState(false);
  const toolsRoot = useRef(null);
  const toolsTrigger = useRef(null);
  const toolsId = useId();
  useEffect(() => {
    if (!toolsOpen) return;
    const outside = (event) => { if (!toolsRoot.current?.contains(event.target)) setToolsOpen(false); };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [toolsOpen]);
  function openTool(action) { toolsTrigger.current?.focus(); setToolsOpen(false); action(); }

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
            <ThemeControl />
            <button className="button button--primary topbar-add" type="button" onClick={onOpenAiCapture} aria-label="Add expense with text or receipt">
              <Plus size={18} strokeWidth={2.4} />
              <span className="topbar-add__full">Add expense</span><span className="topbar-add__short" aria-hidden="true">Add</span>
            </button>
            <div className="expense-toolbar-tools" ref={toolsRoot} onKeyDown={(event) => { if (event.key === "Escape" && toolsOpen) { event.preventDefault(); setToolsOpen(false); toolsTrigger.current?.focus(); } }}>
              <button ref={toolsTrigger} className="icon-button" type="button" aria-label="More expense tools" aria-expanded={toolsOpen} aria-controls={toolsId} onClick={() => setToolsOpen((value) => !value)}><MoreHorizontal size={20} /></button>
              {toolsOpen && <div id={toolsId} className="expense-toolbar-tools__panel" role="group" aria-label="Expense tools"><button type="button" onClick={() => openTool(onAdd)}><Plus size={17} /> Manual entry</button><button type="button" onClick={() => openTool(onOpenIntelligence)}><Sparkles size={17} /> Spending insights</button><button type="button" onClick={() => openTool(onOpenAiSearch)}><Search size={17} /> Search memory <small>Ctrl/⌘ K</small></button><button type="button" onClick={() => openTool(onLogout)}><LogOut size={17} /> Sign out</button></div>}
            </div>
            {user && (
              <div className="topbar-user">
                {user.photoURL ? (
                  <img src={user.photoURL} alt={user.displayName || "User"} className="user-avatar user-avatar--sm" />
                ) : (
                  <div className="user-avatar user-avatar--fallback user-avatar--sm">{initialLetter}</div>
                )}
              </div>
            )}
          </div>
          {loading && <span className="route-progress" aria-label="Loading selected month" />}
        </header>

        <main className="main-content">{children}</main>
        <Navigation mobile />

      </div>
    </div>
  );
}
