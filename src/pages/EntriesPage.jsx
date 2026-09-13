import { Search, SlidersHorizontal, X } from "lucide-react";
import { useMemo, useState } from "react";
import ConfirmDialog from "../components/ConfirmDialog";
import EmptyState from "../components/EmptyState";
import ExpenseRow from "../components/ExpenseRow";
import { categories, currency, groupExpenses, monthLabel, readableDate } from "../lib/spending";

export default function EntriesPage({ month, expenses, deletingId, onAdd, onEdit, onDelete }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("ALL");
  const [pendingDelete, setPendingDelete] = useState(null);

  const filtered = useMemo(() => {
    const search = query.trim().toLowerCase();
    return expenses.filter((expense) => {
      const item = categories[expense.category] || categories.OTHER;
      const matchesCategory = category === "ALL" || expense.category === category;
      const searchable = `${expense.title} ${expense.note || ""} ${item.label}`.toLowerCase();
      return matchesCategory && (!search || searchable.includes(search));
    });
  }, [category, expenses, query]);

  const groups = useMemo(() => groupExpenses(filtered), [filtered]);
  const total = filtered.reduce((sum, expense) => sum + Number(expense.amount), 0);
  const filteredState = Boolean(query.trim()) || category !== "ALL";

  async function confirmDelete() {
    if (!pendingDelete) return;
    const deleted = await onDelete(pendingDelete.id);
    if (deleted) setPendingDelete(null);
  }

  return (
    <div className="page-stack entries-page">
      <header className="page-heading">
        <div>
          <span className="eyebrow">Every detail</span>
          <h1>Expense history</h1>
          <p>{monthLabel(month)} · {expenses.length} {expenses.length === 1 ? "transaction" : "transactions"}</p>
        </div>
      </header>

      <section className="entry-tools" aria-label="Expense filters">
        <label className="search-field">
          <Search size={19} aria-hidden="true" />
          <span className="sr-only">Search expenses</span>
          <input
            type="search"
            placeholder="Search expenses"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          {query && (
            <button type="button" onClick={() => setQuery("")} aria-label="Clear search"><X size={17} /></button>
          )}
        </label>

        <div className="filter-label"><SlidersHorizontal size={17} /><span>Category</span></div>
        <div className="filter-chips" role="group" aria-label="Filter by category">
          <button className={category === "ALL" ? "is-active" : ""} type="button" onClick={() => setCategory("ALL")}>
            All
          </button>
          {Object.entries(categories).map(([key, item]) => (
            <button
              key={key}
              className={category === key ? "is-active" : ""}
              type="button"
              onClick={() => setCategory(key)}
              aria-pressed={category === key}
            >
              {item.label}
            </button>
          ))}
        </div>
      </section>

      <div className="result-summary" aria-live="polite">
        <span>{filtered.length} {filtered.length === 1 ? "result" : "results"}</span>
        <strong>{currency.format(total)}</strong>
      </div>

      {groups.length ? (
        <div className="entry-groups">
          {groups.map((group) => (
            <section className="entry-group" key={group.date}>
              <header>
                <span>{readableDate(group.date, true)}</span>
                <strong>{currency.format(group.total)}</strong>
              </header>
              <div className="entry-group__card">
                {group.items.map((expense) => (
                  <ExpenseRow
                    key={expense.id}
                    expense={expense}
                    onEdit={onEdit}
                    onDelete={setPendingDelete}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : <EmptyState filtered={filteredState && expenses.length > 0} onAdd={onAdd} />}

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        expense={pendingDelete}
        busy={deletingId === pendingDelete?.id}
        onCancel={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}

