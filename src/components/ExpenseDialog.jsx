import { ChevronDown, History, Sparkles, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { categories, currency, defaultDateForMonth } from "../lib/spending";
import { moneyCents, validateExpense } from "../lib/expenseForms";

function emptyForm(month, date) {
  return { title: "", amount: "", category: "FOOD", spentOn: date || defaultDateForMonth(month), note: "" };
}
function normalized(value) { return value.trim().toLocaleLowerCase().replace(/\s+/g, " "); }
function suggestedCategory(title, expenses) {
  const search = normalized(title);
  if (search.length < 2) return null;
  return expenses.find((item) => normalized(item.title) === search)?.category || null;
}
function recentTemplates(expenses) {
  const seen = new Set();
  return expenses.filter((expense) => {
    const key = normalized(expense.title);
    if (!key || seen.has(key)) return false;
    seen.add(key); return true;
  }).slice(0, 4);
}

export default function ExpenseDialog({ open, expense, month, busy, recentExpenses = [], onClose, onSave }) {
  const dialogRef = useRef(null);
  const amountRef = useRef(null);
  const fieldRefs = useRef({});
  const writing = useRef(false);
  const restoreFocus = useRef(null);
  const [form, setForm] = useState(() => emptyForm(month));
  const [attempted, setAttempted] = useState(false);
  const [categoryTouched, setCategoryTouched] = useState(false);
  const [suggestion, setSuggestion] = useState(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState("");
  const templates = useMemo(() => recentTemplates(recentExpenses), [recentExpenses]);
  const disabled = busy || submitting;
  const errors = validateExpense(form);

  useEffect(() => {
    if (!open) return;
    setForm(expense ? { title: expense.title, amount: String(expense.amount), category: expense.category, spentOn: expense.spentOn, note: expense.note || "" } : emptyForm(month));
    setAttempted(false); setCategoryTouched(Boolean(expense)); setSuggestion(null); setError(""); setNotice("");
    const frame = window.requestAnimationFrame(() => amountRef.current?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [expense, month, open]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) { restoreFocus.current = document.activeElement; dialog.showModal(); }
    if (!open && dialog.open) { dialog.close(); restoreFocus.current?.focus?.(); }
  }, [open]);

  function update(field, value) {
    setError(""); setNotice("");
    if (field === "category") { setCategoryTouched(true); setSuggestion(null); }
    const inferred = field === "title" && !categoryTouched ? suggestedCategory(value, recentExpenses) : null;
    if (field === "title") setSuggestion(inferred);
    setForm((current) => ({ ...current, [field]: value, ...(inferred ? { category: inferred } : {}) }));
  }

  function repeat(template) {
    setForm((current) => ({ ...current, title: template.title, amount: String(template.amount), category: template.category, note: template.note || "" }));
    setCategoryTouched(true); setSuggestion(null); setError(""); setNotice("");
    window.requestAnimationFrame(() => amountRef.current?.select());
  }

  async function submit(event) {
    event.preventDefault();
    if (writing.current || disabled) return;
    setAttempted(true); setError(""); setNotice("");
    const firstInvalid = Object.keys(errors).find((key) => errors[key]);
    if (firstInvalid) {
      if (firstInvalid === "note") dialogRef.current.querySelector(".expense-details").open = true;
      (firstInvalid === "amount" ? amountRef.current : fieldRefs.current[firstInvalid])?.focus(); return;
    }
    const keepOpen = !expense && event.nativeEvent.submitter?.value === "another";
    writing.current = true; setSubmitting(true);
    try {
      const saved = await onSave({ title: form.title.trim(), amount: moneyCents(form.amount) / 100, category: form.category, spentOn: form.spentOn, note: form.note.trim() }, { keepOpen });
      if (keepOpen) {
        setForm(emptyForm(month, form.spentOn)); setAttempted(false); setCategoryTouched(false); setSuggestion(null);
        setNotice(`${saved.title} saved${saved.possibleDuplicate ? " · possible duplicate" : ""}. Ready for the next expense.`);
        window.requestAnimationFrame(() => amountRef.current?.focus());
      }
    } catch (err) {
      setError(err.message || "Could not save. Your entry is still here; try again.");
    } finally { writing.current = false; setSubmitting(false); }
  }

  function fieldError(key) {
    return attempted && errors[key] ? <small className="field-error" id={`expense-error-${key}`}>{errors[key]}</small> : null;
  }
  function accessibility(key) {
    return { "aria-invalid": attempted && Boolean(errors[key]), "aria-describedby": attempted && errors[key] ? `expense-error-${key}` : undefined };
  }

  return (
    <dialog ref={dialogRef} className="dialog expense-dialog" aria-labelledby="expense-form-title" onCancel={(event) => { event.preventDefault(); if (!disabled) onClose(); }} onClick={(event) => { if (event.target === dialogRef.current && !disabled) onClose(); }}>
      <form className="dialog-card expense-form" onSubmit={submit} noValidate>
        <header className="dialog-header"><div><h2 id="expense-form-title">{expense ? "Edit expense" : "Add an expense"}</h2><p>A few details. You're done.</p></div><button className="icon-button" type="button" disabled={disabled} onClick={onClose} aria-label="Close expense form"><X size={20} /></button></header>
        <div className="form-body">
          {error && <p className="inline-notice expense-error" role="alert">{error}</p>}
          {notice && <p className="inline-notice" role="status">{notice}</p>}
          <fieldset className="expense-fields" disabled={disabled}>
            <legend className="sr-only">Expense details</legend>
            <label className="field expense-amount"><span>Amount</span><span className="input-affix"><span aria-hidden="true">₹</span><input ref={amountRef} type="text" inputMode="decimal" autoComplete="off" placeholder="0.00" value={form.amount} onChange={(event) => update("amount", event.target.value)} {...accessibility("amount")} /></span>{fieldError("amount")}</label>
            <label className="field"><span>What was it for?</span><input ref={(node) => { fieldRefs.current.title = node; }} required maxLength={100} placeholder="Lunch, groceries, electricity bill…" value={form.title} onChange={(event) => update("title", event.target.value)} {...accessibility("title")} />{fieldError("title")}</label>
            <div className="expense-form-pair">
              <label className="field"><span>Category</span><select ref={(node) => { fieldRefs.current.category = node; }} value={form.category} onChange={(event) => update("category", event.target.value)} {...accessibility("category")}>{Object.entries(categories).map(([key, item]) => <option key={key} value={key}>{item.label}</option>)}</select>{fieldError("category")}</label>
              <label className="field"><span>Date</span><input ref={(node) => { fieldRefs.current.spentOn = node; }} required type="date" value={form.spentOn} onChange={(event) => update("spentOn", event.target.value)} {...accessibility("spentOn")} />{fieldError("spentOn")}</label>
            </div>
            {suggestion && <small className="expense-category-hint"><Sparkles size={13} /> Category from your previous entry. Change it anytime.</small>}
            <details className="expense-details" key={`${expense?.id || "new"}:${open}`}><summary><span>Add a note <small>Optional</small></span><ChevronDown size={16} /></summary><div className="expense-details__body"><label className="field"><span className="sr-only">Note</span><textarea ref={(node) => { fieldRefs.current.note = node; }} rows={2} maxLength={300} placeholder="Anything worth remembering?" value={form.note} onChange={(event) => update("note", event.target.value)} {...accessibility("note")} />{fieldError("note")}</label></div></details>
          </fieldset>
          {!expense && templates.length > 0 && <details className="expense-repeats"><summary><History size={15} /> Repeat a recent expense</summary><div>{templates.map((template) => <button key={template.id} type="button" disabled={disabled} onClick={() => repeat(template)}><span>{template.title}</span><small>{currency.format(template.amount)}</small></button>)}</div></details>}
        </div>
        <footer className="dialog-actions expense-form__actions"><button className="button button--ghost" type="button" onClick={onClose} disabled={disabled}>Cancel</button><button className="button button--primary" type="submit" value="save" disabled={disabled}>{disabled ? "Saving…" : expense ? "Save changes" : "Save expense"}</button>{!expense && <button className="button button--secondary" type="submit" value="another" disabled={disabled}>Save & add another</button>}</footer>
      </form>
    </dialog>
  );
}
