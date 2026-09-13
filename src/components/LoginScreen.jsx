import { BarChart3, Lock, ShieldCheck, Sparkles, Target, Wallet } from "lucide-react";

export default function LoginScreen({ onLogin, error, loading }) {
  const HIGHLIGHTS = [
    {
      icon: Wallet,
      title: "Real-time Expenses",
      desc: "Fast logging with instant categorization and daily groupings.",
      color: "oklch(0.67 0.16 42 / 18%)",
      border: "oklch(0.67 0.16 42 / 35%)",
    },
    {
      icon: Target,
      title: "Category Budgets",
      desc: "Set monthly targets, track pace, and copy from previous months.",
      color: "oklch(0.73 0.135 163 / 18%)",
      border: "oklch(0.73 0.135 163 / 35%)",
    },
    {
      icon: BarChart3,
      title: "Spending Trends",
      desc: "Visual curves and breakdown charts for actionable insight.",
      color: "oklch(0.62 0.11 220 / 18%)",
      border: "oklch(0.62 0.11 220 / 35%)",
    },
    {
      icon: ShieldCheck,
      title: "Private & Cloud-Synced",
      desc: "Zero tracking ads. Seamlessly shares your secure Mira backend.",
      color: "oklch(0.62 0.14 305 / 18%)",
      border: "oklch(0.62 0.14 305 / 35%)",
    },
  ];

  return (
    <main className="login-screen">
      {/* Ambient background decoration */}
      <div className="login-ambient" aria-hidden="true">
        <div className="login-glow login-glow--top" />
        <div className="login-glow login-glow--bottom" />
        <div className="login-grid-mesh" />
      </div>

      <div className="login-container">
        {/* Brand Header */}
        <header className="login-header">
          <div className="login-brand">
            <span className="brand-mark" aria-hidden="true">
              <span />
              <span />
              <span />
            </span>
            <span className="login-brand__name">Mira</span>
            <span className="login-badge-tag">Expenses</span>
          </div>

          <div className="login-badge">
            <Sparkles size={14} className="login-badge__sparkle" />
            <span>Dedicated Personal Finance Workspace</span>
          </div>

          <h1 className="login-title">
            Master your expenses with <span className="login-title__gradient">clarity & calm</span>.
          </h1>

          <p className="login-copy">
            A standalone, ultra-focused application for tracking spending, setting monthly category targets,
            and understanding your cashflow without clutter.
          </p>
        </header>

        {/* Highlight Features Grid */}
        <div className="login-features-grid" aria-label="Key features">
          {HIGHLIGHTS.map(({ icon: Icon, title, desc, color, border }) => (
            <div
              key={title}
              className="login-feature-card"
              style={{ backgroundColor: color, borderColor: border }}
            >
              <div className="login-feature-card__icon">
                <Icon size={20} strokeWidth={2.2} />
              </div>
              <div className="login-feature-card__content">
                <strong>{title}</strong>
                <small>{desc}</small>
              </div>
            </div>
          ))}
        </div>

        {/* Authentication Card */}
        <section className="login-card">
          <div className="login-card__header">
            <div className="login-lock-icon" aria-hidden="true">
              <Lock size={18} />
            </div>
            <h2>Sign in to continue</h2>
            <p>Access your private expenses and budgets securely.</p>
          </div>

          {error && (
            <div className="login-error-alert" role="alert">
              <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M8 15A7 7 0 1 0 8 1a7 7 0 0 0 0 14zm-.75-10a.75.75 0 0 1 1.5 0v4a.75.75 0 0 1-1.5 0V5zm.75 7.5a.875.875 0 1 1 0-1.75.875.875 0 0 1 0 1.75z" clipRule="evenodd" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          <button
            className="google-button"
            type="button"
            onClick={onLogin}
            disabled={loading}
            aria-label="Continue with Google"
          >
            <svg width="20" height="20" viewBox="0 0 18 18" aria-hidden="true">
              <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.91c1.7-1.57 2.69-3.88 2.69-6.62Z" />
              <path fill="#34A853" d="M9 18c2.43 0 4.47-.81 5.96-2.18l-2.91-2.26c-.81.54-1.84.86-3.05.86-2.34 0-4.33-1.58-5.04-3.71H.96v2.33A9 9 0 0 0 9 18Z" />
              <path fill="#FBBC05" d="M3.96 10.71A5.4 5.4 0 0 1 3.68 9c0-.59.1-1.17.28-1.71V4.96H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.04l3-2.33Z" />
              <path fill="#EA4335" d="M9 3.58c1.32 0 2.51.45 3.44 1.35l2.58-2.58A8.65 8.65 0 0 0 9 0 9 9 0 0 0 .96 4.96l3 2.33C4.67 5.16 6.66 3.58 9 3.58Z" />
            </svg>
            <span className="google-button__text">
              {loading ? "Connecting securely…" : "Continue with Google"}
            </span>
          </button>

          {import.meta.env.DEV && (
            <button
              type="button"
              className="dev-preview-button"
              onClick={() => {
                localStorage.setItem("mira-dev-user", "true");
                window.location.search = "?dev=true";
              }}
            >
              ⚡ Preview UI in Local Dev Mode
            </button>
          )}

          <p className="login-card__footer">
            By signing in, your data stays isolated, encrypted, and synced with your account.
          </p>
        </section>
      </div>
    </main>
  );
}
