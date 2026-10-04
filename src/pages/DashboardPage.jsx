import { ArrowRight, Plus, Sparkles, Target } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import CategoryBreakdown from "../components/CategoryBreakdown";
import ConfirmDialog from "../components/ConfirmDialog";
import ExpenseRow from "../components/ExpenseRow";
import SpendingTrend from "../components/SpendingTrend";
import { effectiveBudgetTotal, buildCategoryData, buildDailyData, buildSummary, currency, monthLabel } from "../lib/spending";

export default function DashboardPage({ month, expenses, budgets, onAdd, onOpenAiCapture, onEdit, onDelete, deletingId, deleteError }) {
  const summary = useMemo(() => buildSummary(expenses), [expenses]);
  const dailyData = useMemo(() => buildDailyData(expenses, month), [expenses, month]);
  const categoryData = useMemo(() => buildCategoryData(expenses), [expenses]);
  const budgetTotal = effectiveBudgetTotal(budgets);
  const remaining = budgetTotal - summary.total;
  const used = budgetTotal ? Math.round(summary.total / budgetTotal * 100) : 0;
  const [pendingDelete, setPendingDelete] = useState(null);

  return (
    <div className="page-stack expense-overview">
      <header className="expense-page-heading">
        <div><span className="eyebrow">Your spending</span><h1>{monthLabel(month)}</h1><p>Log a purchase. See where your money went.</p></div>
        <Link className="button button--secondary" to="/budget"><Target size={18} /> {budgetTotal ? "Edit budget" : "Set budget"}</Link>
      </header>
      <section className="expense-summary" aria-label="Monthly spending and budget">
        <div className="expense-summary__spent">
          <span>Spent this month</span><strong>{currency.format(summary.total)}</strong>
          <small>{summary.count ? `${summary.count} ${summary.count === 1 ? "expense" : "expenses"} · ${currency.format(summary.average)} average` : "No expenses recorded for this month yet"}</small>
        </div>
        <div className="expense-summary__budget">
          <div><span>Monthly budget</span><strong>{budgetTotal ? currency.format(budgetTotal) : "Not set"}</strong></div>
          {budgetTotal > 0 ? <>
            <div className={`expense-budget-track${used > 100 ? " is-over" : ""}`} role="progressbar" aria-label="Monthly budget used" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.min(used, 100)} aria-valuetext={`${used}% used`}><span style={{ width: `${Math.min(used, 100)}%` }} /></div>
            <div className="expense-summary__budget-footer"><span className={remaining < 0 ? "text-danger" : ""}>{currency.format(Math.abs(remaining))} {remaining < 0 ? "over budget" : "left in your budget"} · {used}% used</span><Link to="/budget">Review <ArrowRight size={16} /></Link></div>
          </> : <><p>One monthly amount is enough. Category limits are optional.</p><Link className="text-link" to="/budget">Set your monthly budget <ArrowRight size={16} /></Link></>}
        </div>
      </section>
      <section className="panel expense-recent">
        <header className="panel-header"><div><h2>{expenses.length ? "Recent expenses" : "Start with one expense"}</h2><p>{expenses.length ? "Select an entry to edit it." : "Use a quick form, or tell AI what you spent."}</p></div>{expenses.length > 0 && <Link className="text-link" to="/entries">View all <ArrowRight size={16} /></Link>}</header>
        {expenses.length ? <div>{expenses.slice(0, 6).map((expense) => <ExpenseRow key={expense.id} expense={expense} showDate onEdit={onEdit} onDelete={setPendingDelete} />)}</div> : <div className="expense-start"><div><strong>Your purchases, all in one place.</strong><p>For example: “Paid ₹280 for lunch today.” No budget setup required to start.</p></div><div><button className="button button--primary" type="button" onClick={onOpenAiCapture}><Sparkles size={18} /> Log first expense</button><button className="button button--secondary" type="button" onClick={onAdd}><Plus size={18} /> Manual entry</button></div></div>}
      </section>
      {expenses.length > 0 && <section className="analytics-grid"><SpendingTrend data={dailyData} /><CategoryBreakdown data={categoryData} total={summary.total} /></section>}
      <ConfirmDialog error={deleteError && deleteError.id === pendingDelete?.id ? deleteError.message : ""} open={Boolean(pendingDelete)} expense={pendingDelete} busy={Boolean(deletingId)} onCancel={() => setPendingDelete(null)} onConfirm={async () => { if (pendingDelete && await onDelete(pendingDelete.id)) setPendingDelete(null); }} />
    </div>
  );
}
