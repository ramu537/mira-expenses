import { ArrowRight, CheckCircle2, Plus, ReceiptText, TrendingDown, TriangleAlert, WalletCards } from "lucide-react";
import { useMemo } from "react";
import { Link } from "react-router-dom";
import CategoryBreakdown from "../components/CategoryBreakdown";
import EmptyState from "../components/EmptyState";
import ExpenseRow from "../components/ExpenseRow";
import SpendingTrend from "../components/SpendingTrend";
import {
  budgetAmountMap,
  buildCategoryData,
  buildDailyData,
  buildSummary,
  categories,
  currency,
  monthLabel,
} from "../lib/spending";

export default function DashboardPage({ month, expenses, budgets, onAdd, onEdit }) {
  const summary = useMemo(() => buildSummary(expenses), [expenses]);
  const dailyData = useMemo(() => buildDailyData(expenses, month), [expenses, month]);
  const categoryData = useMemo(() => buildCategoryData(expenses), [expenses]);
  const budgetTotal = Object.values(budgetAmountMap(budgets)).reduce((sum, value) => sum + value, 0);
  const remaining = budgetTotal - summary.total;
  const used = budgetTotal ? Math.round((summary.total / budgetTotal) * 100) : 0;
  const paceTone = !budgetTotal ? "neutral" : used > 100 ? "danger" : used > 80 ? "warning" : "positive";
  const topCategory = summary.topCategory ? categories[summary.topCategory].label : "No activity";
  const categoryBudgets = budgetAmountMap(budgets);
  const overspent = Object.entries(categoryBudgets)
    .map(([key, limit]) => ({ key, limit, spent: summary.byCategory[key] || 0 }))
    .filter((item) => item.limit > 0 && item.spent > item.limit)
    .sort((left, right) => (right.spent - right.limit) - (left.spent - left.limit));
  const largestExpense = expenses.reduce((largest, item) => (
    !largest || Number(item.amount) > Number(largest.amount) ? item : largest
  ), null);

  return (
    <div className="page-stack">
      <header className="page-heading">
        <div>
          <span className="eyebrow">Your money, clearly</span>
          <h1>{monthLabel(month)} overview</h1>
          <p>See the month’s direction, then act on what matters.</p>
        </div>
      </header>

      <section className="spend-hero">
        <div className="spend-hero__glow" aria-hidden="true" />
        <div className="spend-hero__main">
          <span className="hero-label">Spent this month</span>
          <strong className="hero-amount">{currency.format(summary.total)}</strong>
          <span className={`pace-badge pace-badge--${paceTone}`}>
            <span />
            {budgetTotal
              ? remaining >= 0
                ? `${currency.format(remaining)} left in your plan`
                : `${currency.format(Math.abs(remaining))} over your plan`
              : "Add a budget to see your pace"}
          </span>
        </div>

        <div className="budget-pulse">
          <div className="budget-pulse__header">
            <span>Monthly budget</span>
            <strong>{budgetTotal ? `${used}%` : "Not set"}</strong>
          </div>
          <div className="budget-pulse__track" aria-label={budgetTotal ? `${used}% of budget used` : "No budget set"}>
            <span className={used > 100 ? "is-over" : ""} style={{ width: `${Math.min(used, 100)}%` }} />
          </div>
          <div className="budget-pulse__footer">
            <span>{budgetTotal ? `${currency.format(summary.total)} of ${currency.format(budgetTotal)}` : "Give each category a comfortable limit."}</span>
            <Link to="/budget">{budgetTotal ? "Review" : "Set budget"}<ArrowRight size={15} /></Link>
          </div>
        </div>

        <button className="button button--light hero-add" type="button" onClick={onAdd}>
          <Plus size={18} /> Add expense
        </button>
      </section>

      <section className="metric-grid" aria-label="Monthly summary">
        <article className="metric-card">
          <span className="metric-icon"><ReceiptText size={18} /></span>
          <span>Transactions</span>
          <strong>{summary.count}</strong>
          <small>recorded this month</small>
        </article>
        <article className="metric-card">
          <span className="metric-icon"><TrendingDown size={18} /></span>
          <span>Average expense</span>
          <strong>{currency.format(summary.average)}</strong>
          <small>per transaction</small>
        </article>
        <article className="metric-card">
          <span className="metric-icon"><WalletCards size={18} /></span>
          <span>Top category</span>
          <strong className="metric-card__text">{topCategory}</strong>
          <small>{summary.topCategory ? currency.format(summary.byCategory[summary.topCategory]) : "nothing recorded yet"}</small>
        </article>
      </section>

      <section className="analytics-grid">
        <SpendingTrend data={dailyData} />
        <CategoryBreakdown data={categoryData} total={summary.total} />
      </section>

      {(expenses.length > 0 || budgetTotal > 0) && (
        <section className={`attention-panel ${overspent.length ? "attention-panel--warning" : ""}`}>
          <span className="attention-panel__icon">
            {overspent.length ? <TriangleAlert size={19} /> : <CheckCircle2 size={19} />}
          </span>
          <div>
            <span className="eyebrow">{overspent.length ? "Needs attention" : "This month"}</span>
            <strong>
              {overspent.length
                ? `${categories[overspent[0].key]?.label || overspent[0].key} is ${currency.format(overspent[0].spent - overspent[0].limit)} over budget`
                : budgetTotal ? "Your tracked categories are within budget" : "Your spending record is up to date"}
            </strong>
            <small>
              {overspent.length > 1
                ? `${overspent.length - 1} more categories also need review.`
                : largestExpense
                  ? `Largest entry: ${largestExpense.title} at ${currency.format(largestExpense.amount)}.`
                  : "Keep capturing expenses to make this view useful."}
            </small>
          </div>
          <Link to={overspent.length ? "/budget" : "/entries"}>Review <ArrowRight size={15} /></Link>
        </section>
      )}

      <section className="panel recent-panel">
        <header className="panel-header">
          <div>
            <span className="eyebrow">Latest activity</span>
            <h2>Recent expenses</h2>
          </div>
          {expenses.length > 0 && <Link className="text-link" to="/entries">View all <ArrowRight size={16} /></Link>}
        </header>
        {expenses.length ? (
          <div className="recent-list">
            {expenses.slice(0, 5).map((expense) => (
              <ExpenseRow key={expense.id} expense={expense} onEdit={onEdit} compact />
            ))}
          </div>
        ) : <EmptyState onAdd={onAdd} />}
      </section>
    </div>
  );
}
