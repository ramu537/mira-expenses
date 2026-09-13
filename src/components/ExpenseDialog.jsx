import { Check, X } from "lucide-react";
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

export default function ExpenseDialog({ open, expense, month, busy, onClose, onSave }) {
  const dialogRef = useRef(null);
  const [form, setForm] = useState(() => emptyForm(month));
  const [attempted, setAttempted] = useState(false);

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
            <h2>{expense ? "Edit expense" : "Add an expense"}</h2>
            <p>Keep it simple. You can always refine the details later.</p>
          </div>
          <button className="icon-button" type="button" onClick={onClose} disabled={busy} aria-label="Close expense form">
            <X size={20} />
          </button>
        </header>

        <div className="form-body">
          <label className="field field--wide">
            <span>What was it for?</span>
            <input
              autoFocus
              required
              maxLength="100"
              placeholder="Lunch, electricity bill, train…"
              value={form.title}
              onChange={(event) => update("title", event.target.value)}
              aria-invalid={attempted && !form.title.trim()}
            />
            {attempted && !form.title.trim() && <small className="field-error">Add a short description.</small>}
          </label>

          <div className="form-grid">
            <label className="field amount-input">
              <span>Amount</span>
              <span className="input-affix">
                <span aria-hidden="true">₹</span>
                <input
                  required
                  type="number"
                  inputMode="decimal"
                  min="0.01"
                  step="0.01"
                  placeholder="0"
                  value={form.amount}
                  onChange={(event) => update("amount", event.target.value)}
                  aria-invalid={attempted && !(Number(form.amount) > 0)}
                />
              </span>
              {attempted && !(Number(form.amount) > 0) && <small className="field-error">Enter an amount above zero.</small>}
            </label>
            <label className="field">
              <span>Date</span>
              <input
                required
                type="date"
                value={form.spentOn}
                onChange={(event) => update("spentOn", event.target.value)}
              />
            </label>
          </div>

          <fieldset className="category-fieldset">
            <legend>Category</legend>
            <div className="category-choices">
              {Object.entries(categories).map(([key, item]) => (
                <button
                  key={key}
                  type="button"
                  className={form.category === key ? "category-choice is-selected" : "category-choice"}
                  onClick={() => update("category", key)}
                  aria-pressed={form.category === key}
                >
                  <CategoryIcon category={key} size="small" />
                  <span>{item.label}</span>
                  {form.category === key && <Check className="category-check" size={14} />}
                </button>
              ))}
            </div>
          </fieldset>

          <label className="field field--wide">
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

        <footer className="dialog-actions expense-form__actions">
          <button className="button button--ghost" type="button" onClick={onClose} disabled={busy}>Cancel</button>
          <button className="button button--primary" type="submit" disabled={busy}>
            {busy ? "Saving…" : expense ? "Save changes" : "Save expense"}
          </button>
        </footer>
      </form>
    </dialog>
  );
}

