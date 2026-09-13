import { ArrowDownToLine, CheckCircle2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import CategoryIcon from "../components/CategoryIcon";
import { budgetAmountMap, buildSummary, categories, currency, monthLabel } from "../lib/spending";

export default function BudgetPage({ month, expenses, budgets, saving, onSave, onCopyPrevious }) {
  const stored = useMemo(() => budgetAmountMap(budgets), [budgets]);
  const spending = useMemo(() => buildSummary(expenses), [expenses]);
  const [draft, setDraft] = useState({});
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setDraft(Object.fromEntries(Object.keys(categories).map((key) => [key, stored[key] || 0])));
    setCopied(false);
  }, [month, stored]);

  const total = Object.values(draft).reduce((sum, value) => sum + Number(value || 0), 0);
  const remaining = total - spending.total;
  const used = total ? Math.round((spending.total / total) * 100) : 0;
  const changed = Object.keys(categories).some((key) => Number(draft[key] || 0) !== Number(stored[key] || 0));

  function update(category, value) {
    const next = Math.max(0, Number(value));
    setDraft((current) => ({ ...current, [category]: Number.isFinite(next) ? next : 0 }));
  }

  async function copyPrevious() {
    const previous = await onCopyPrevious();
    if (!previous) return;
    const previousMap = budgetAmountMap(previous);
    setDraft(Object.fromEntries(Object.keys(categories).map((key) => [key, previousMap[key] || 0])));
    setCopied(true);
  }

  function save() {
    return onSave(Object.keys(categories).map((category) => ({
      category,
      amount: Number(draft[category] || 0),
    })));
  }

  return (
    <div className="page-stack budget-page">
      <header className="page-heading page-heading--actions">
        <div>
          <span className="eyebrow">Plan with intention</span>
          <h1>Monthly budget</h1>
          <p>Set comfortable category limits for {monthLabel(month)}.</p>
        </div>
        <button className="button button--secondary" type="button" onClick={copyPrevious}>
          <ArrowDownToLine size={17} /> Copy previous month
        </button>
      </header>

      <section className="budget-overview">
        <div>
          <span>Monthly plan</span>
          <strong>{currency.format(total)}</strong>
          <small>{total ? `${used}% used` : "Start with the categories that matter"}</small>
        </div>
        <div>
          <span>{remaining >= 0 ? "Still available" : "Over plan"}</span>
          <strong className={remaining < 0 ? "text-danger" : ""}>{currency.format(Math.abs(remaining))}</strong>
          <small>{currency.format(spending.total)} spent</small>
        </div>
        <div className="budget-overview__meter">
          <span className={used > 100 ? "is-over" : ""} style={{ width: `${Math.min(used, 100)}%` }} />
        </div>
      </section>

      {copied && (
        <div className="inline-notice" role="status">
          <CheckCircle2 size={18} /> Previous month copied. Review the limits before saving.
        </div>
      )}

      <section className="budget-categories" aria-label="Category budgets">
        {Object.entries(categories).map(([key, item]) => {
          const spent = spending.byCategory[key] || 0;
          const limit = Number(draft[key] || 0);
          const usage = limit ? Math.round((spent / limit) * 100) : 0;
          const delta = limit - spent;
          return (
            <article className="budget-category" key={key}>
              <CategoryIcon category={key} />
              <div className="budget-category__main">
                <div className="budget-category__heading">
                  <span><strong>{item.label}</strong><small>{currency.format(spent)} spent</small></span>
                  <label className="budget-input">
                    <span className="sr-only">{item.label} budget</span>
                    <span aria-hidden="true">₹</span>
                    <input
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="100"
                      value={draft[key] ?? 0}
                      onChange={(event) => update(key, event.target.value)}
                    />
                  </label>
                </div>
                <div className="category-meter" aria-label={limit ? `${usage}% of ${item.label} budget used` : `No ${item.label} budget set`}>
                  <span
                    className={usage > 100 ? "is-over" : ""}
                    style={{ width: `${Math.min(usage, 100)}%`, "--category-color": item.color }}
                  />
                </div>
                <small className={usage > 100 ? "budget-category__status text-danger" : "budget-category__status"}>
                  {limit ? `${usage}% used · ${currency.format(Math.abs(delta))} ${delta >= 0 ? "left" : "over"}` : "No limit set"}
                </small>
              </div>
            </article>
          );
        })}
      </section>

      <div className="save-dock">
        <span>{changed ? "You have unsaved budget changes" : "Your budget is up to date"}</span>
        <button className="button button--primary" type="button" onClick={save} disabled={!changed || saving}>
          {saving ? "Saving…" : "Save budget"}
        </button>
      </div>
    </div>
  );
}

