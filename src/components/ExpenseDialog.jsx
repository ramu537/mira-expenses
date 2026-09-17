import { Check, ChevronDown, History, Sparkles, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { categories, defaultDateForMonth } from "../lib/spending";
import CategoryIcon from "./CategoryIcon";

function emptyForm(month) {
  return {
    title: "",
    amount: "",
    category: "FOOD",
    spentOn: defaultDateForMonth(month),
    note: "",
  };
}

function normalized(value) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function suggestedCategory(title, expenses) {
  const search = normalized(title);
  if (search.length < 2) return null;
  const exact = expenses.find((item) => normalized(item.title) === search);
  if (exact) return exact.category;
  const partial = expenses.find((item) => {
    const candidate = normalized(item.title);
    return candidate.length > 2 && (candidate.includes(search) || search.includes(candidate));
  });
  return partial?.category || null;
}

function recentTemplates(expenses) {
  const seen = new Set();
  return expenses.filter((expense) => {
    const key = normalized(expense.title);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 4);
}

export default function ExpenseDialog({ open, expense, month, busy, recentExpenses = [], onClose, onSave }) {
  const dialogRef = useRef(null);
  const amountRef = useRef(null);
  const [form, setForm] = useState(() => emptyForm(month));
  const [attempted, setAttempted] = useState(false);
  const [categoryTouched, setCategoryTouched] = useState(false);
  const [suggestion, setSuggestion] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const templates = useMemo(() => recentTemplates(recentExpenses), [recentExpenses]);

  useEffect(() => {
    if (!open) return;
    setForm(expense ? {
      title: expense.title,
      amount: String(expense.amount),
      category: expense.category,
      spentOn: expense.spentOn,
      note: expense.note || "",
    } : emptyForm(month));
    setAttempted(false);
    setCategoryTouched(Boolean(expense));
    setSuggestion(null);
    setDetailsOpen(Boolean(expense));
    window.requestAnimationFrame(() => amountRef.current?.focus());
  }, [expense, month, open]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const valid = useMemo(() => (
    form.title.trim().length > 0
    && Number(form.amount) > 0
    && Boolean(form.spentOn)
    && Boolean(categories[form.category])
  ), [form]);

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function updateTitle(value) {
    const inferred = suggestedCategory(value, recentExpenses);
    setForm((current) => ({
      ...current,
      title: value,
      category: !categoryTouched && inferred ? inferred : current.category,
    }));
    setSuggestion(!categoryTouched ? inferred : null);
  }

  function selectCategory(category) {
    setCategoryTouched(true);
    setSuggestion(null);
    update("category", category);
  }

  function repeat(template) {
    setForm((current) => ({
      ...current,
      title: template.title,
      amount: String(template.amount),
      category: template.category,
      note: template.note || "",
    }));
    setCategoryTouched(true);
    setSuggestion(null);
    window.requestAnimationFrame(() => amountRef.current?.select());
  }

  async function submit(event) {
    event.preventDefault();
    setAttempted(true);
    if (!valid) return;
    await onSave({
      title: form.title.trim(),
      amount: Number(form.amount),
      category: form.category,
      spentOn: form.spentOn,
      note: form.note.trim(),
    });
  }

  return (
    <dialog
      ref={dialogRef}
      className="dialog expense-dialog"
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onClose();
      }}
      onClick={(event) => {
        if (event.target === dialogRef.current && !busy) onClose();
      }}
    >
      <form className="dialog-card expense-form" onSubmit={submit} noValidate>
        <header className="dialog-header">
          <div>
            <span className="eyebrow">{expense ? "Update entry" : "Quick capture"}</span>
            <h2>{expense ? "Edit expense" : "What did you spend?"}</h2>
            <p>Amount and description first. Press Enter to save when you are done.</p>
          </div>
          <button className="icon-button" type="button" onClick={onClose} disabled={busy} aria-label="Close expense form">
            <X size={20} />
          </button>
        </header>

        <div className="form-body">
          {!expense && templates.length > 0 && (
            <section className="recent-captures" aria-label="Repeat a recent expense">
              <span><History size={15} /> Repeat recent</span>
              <div>
                {templates.map((template) => (
                  <button key={template.id} type="button" onClick={() => repeat(template)}>
                    <span>{template.title}</span>
                    <small>₹{Number(template.amount).toLocaleString("en-IN")}</small>
                  </button>
                ))}
              </div>
            </section>
          )}

          <div className="quick-fields">
            <label className="field amount-input quick-amount">
              <span>Amount</span>
              <span className="input-affix">
                <span aria-hidden="true">₹</span>
                <input
                  ref={amountRef}
                  required
                  type="number"
                  inputMode="decimal"
                  min="0.01"
                  step="0.01"
                  placeholder="0.00"
                  value={form.amount}
                  onChange={(event) => update("amount", event.target.value)}
                  aria-invalid={attempted && !(Number(form.amount) > 0)}
                />
              </span>
              {attempted && !(Number(form.amount) > 0) && <small className="field-error">Enter an amount above zero.</small>}
            </label>

            <label className="field quick-description">
              <span>What was it for?</span>
              <input
                required
                maxLength="100"
                placeholder="KFC dinner, electricity bill, metro…"
                value={form.title}
                onChange={(event) => updateTitle(event.target.value)}
                aria-invalid={attempted && !form.title.trim()}
              />
              {attempted && !form.title.trim() && <small className="field-error">Add a clear description.</small>}
            </label>
          </div>

          <fieldset className="category-fieldset">
            <legend>
              Category
              {suggestion && <small className="category-suggestion"><Sparkles size={12} /> Suggested from similar entries</small>}
            </legend>
            <div className="category-choices">
              {Object.entries(categories).map(([key, item]) => (
                <button
                  key={key}
                  type="button"
                  className={form.category === key ? "category-choice is-selected" : "category-choice"}
                  onClick={() => selectCategory(key)}
                  aria-pressed={form.category === key}
                >
                  <CategoryIcon category={key} size="small" />
                  <span>{item.label}</span>
                  {form.category === key && <Check className="category-check" size={14} />}
                </button>
              ))}
            </div>
          </fieldset>

          <details
            className="expense-details"
            open={detailsOpen}
            onToggle={(event) => setDetailsOpen(event.currentTarget.open)}
          >
            <summary><span>Date & note</span><small>{form.spentOn}</small><ChevronDown size={16} /></summary>
            <div className="expense-details__body">
              <label className="field">
                <span>Date</span>
                <input required type="date" value={form.spentOn} onChange={(event) => update("spentOn", event.target.value)} />
              </label>
              <label className="field">
                <span>Note <small>Optional</small></span>
                <textarea
                  rows="3"
                  maxLength="300"
                  placeholder="Anything worth remembering?"
                  value={form.note}
                  onChange={(event) => update("note", event.target.value)}
                />
              </label>
            </div>
          </details>
        </div>

        <footer className="dialog-actions expense-form__actions">
          <span className="save-hint">Enter to save · Esc to close</span>
          <button className="button button--ghost" type="button" onClick={onClose} disabled={busy}>Cancel</button>
          <button className="button button--primary" type="submit" disabled={busy}>
            {busy ? "Saving…" : expense ? "Save changes" : "Save expense"}
          </button>
        </footer>
      </form>
    </dialog>
  );
}
