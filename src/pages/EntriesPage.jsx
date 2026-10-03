import { Search, SlidersHorizontal, X } from "lucide-react";
import { useMemo, useState } from "react";
import ConfirmDialog from "../components/ConfirmDialog";
import EmptyState from "../components/EmptyState";
import ExpenseRow from "../components/ExpenseRow";
import { moneyCents } from "../lib/expenseForms";
import { categories, currency, groupExpenses, monthLabel, readableDate } from "../lib/spending";

export default function EntriesPage({ month, expenses, deletingId, onAdd, onEdit, onDelete }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("ALL");
  const [minimumAmount, setMinimumAmount] = useState("");
  const [maximumAmount, setMaximumAmount] = useState("");
  const [sortOrder, setSortOrder] = useState("NEWEST");
  const [pendingDelete, setPendingDelete] = useState(null);
  const min = minimumAmount.trim() ? moneyCents(minimumAmount, true) : null;
  const max = maximumAmount.trim() ? moneyCents(maximumAmount, true) : null;
  const rangeError = minimumAmount.trim() && min === null || maximumAmount.trim() && max === null ? "Enter valid amounts with up to 2 decimal places." : min !== null && max !== null && min > max ? "Minimum cannot be more than maximum." : "";
  const filtered = useMemo(() => {
    const search = query.trim().toLocaleLowerCase();
    return expenses.filter((expense) => {
      const item = categories[expense.category] || categories.OTHER;
      const amount = Math.round(Number(expense.amount) * 100);
      return (category === "ALL" || expense.category === category)
        && (!search || `${expense.title} ${expense.note || ""} ${item.label}`.toLocaleLowerCase().includes(search))
        && (rangeError || (min === null || amount >= min) && (max === null || amount <= max));
    }).sort((left, right) => {
      const dateOrder = left.spentOn.localeCompare(right.spentOn);
      const timeOrder = String(left.createdAt || "").localeCompare(String(right.createdAt || ""));
      return sortOrder === "OLDEST" ? dateOrder || timeOrder : -dateOrder || -timeOrder;
    });
  }, [category, expenses, max, min, query, rangeError, sortOrder]);
  const groups = useMemo(() => groupExpenses(filtered, sortOrder), [filtered, sortOrder]);
  const total = filtered.reduce((sum, expense) => sum + Math.round(Number(expense.amount) * 100), 0) / 100;
  const filteredState = Boolean(query.trim()) || category !== "ALL" || Boolean(minimumAmount.trim()) || Boolean(maximumAmount.trim());
  const advancedCount = Number(Boolean(minimumAmount.trim())) + Number(Boolean(maximumAmount.trim())) + Number(sortOrder !== "NEWEST");
  function clearFilters() { setQuery(""); setCategory("ALL"); setMinimumAmount(""); setMaximumAmount(""); setSortOrder("NEWEST"); }

  return (
    <div className="page-stack expense-entries">
      <header className="expense-page-heading"><div><h1>Expenses</h1><p>{monthLabel(month)} · {expenses.length} {expenses.length === 1 ? "expense" : "expenses"}</p></div></header>
      <section className="expense-entry-tools" aria-label="Expense filters">
        <div className="expense-entry-tools__primary"><label className="search-field"><Search size={18} aria-hidden="true" /><span className="sr-only">Search expenses</span><input type="search" placeholder="Search a purchase or note" value={query} onChange={(event) => setQuery(event.target.value)} />{query && <button type="button" onClick={() => setQuery("")} aria-label="Clear search"><X size={17} /></button>}</label><label className="field"><span className="sr-only">Category filter</span><select value={category} onChange={(event) => setCategory(event.target.value)}><option value="ALL">All categories</option>{Object.entries(categories).map(([key, item]) => <option key={key} value={key}>{item.label}</option>)}</select></label></div>
        <details className="expense-advanced-filters"><summary><SlidersHorizontal size={16} /> Amount & order{advancedCount > 0 && <small>{advancedCount} active</small>}</summary><div><label className="field"><span>Minimum (₹)</span><input type="text" inputMode="decimal" placeholder="Any" value={minimumAmount} onChange={(event) => setMinimumAmount(event.target.value)} aria-invalid={Boolean(rangeError)} aria-describedby={rangeError ? "expense-range-error" : undefined} /></label><label className="field"><span>Maximum (₹)</span><input type="text" inputMode="decimal" placeholder="Any" value={maximumAmount} onChange={(event) => setMaximumAmount(event.target.value)} aria-invalid={Boolean(rangeError)} aria-describedby={rangeError ? "expense-range-error" : undefined} /></label><label className="field"><span>Order</span><select value={sortOrder} onChange={(event) => setSortOrder(event.target.value)}><option value="NEWEST">Newest first</option><option value="OLDEST">Oldest first</option></select></label></div></details>
        {rangeError && <p id="expense-range-error" className="field-error" role="alert">{rangeError} Amount filters are not applied until corrected.</p>}
      </section>
      <div className="expense-result-summary" aria-live="polite"><span>{filtered.length} {filtered.length === 1 ? "expense" : "expenses"}{filteredState && <button className="text-link" type="button" onClick={clearFilters}>Clear filters</button>}</span><strong>{currency.format(total)}</strong></div>
      {groups.length ? <div className="entry-groups">{groups.map((group) => <section className="entry-group" key={group.date}><header><span>{readableDate(group.date, true)}</span><strong>{currency.format(group.total)}</strong></header><div className="entry-group__card">{group.items.map((expense) => <ExpenseRow key={expense.id} expense={expense} onEdit={onEdit} onDelete={setPendingDelete} />)}</div></section>)}</div> : <EmptyState filtered={filteredState && expenses.length > 0} onAdd={onAdd} />}
      <ConfirmDialog open={Boolean(pendingDelete)} expense={pendingDelete} busy={Boolean(deletingId)} onCancel={() => setPendingDelete(null)} onConfirm={async () => { if (pendingDelete && await onDelete(pendingDelete.id)) setPendingDelete(null); }} />
    </div>
  );
}
