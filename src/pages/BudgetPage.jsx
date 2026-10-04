import { ArrowDownToLine, RotateCcw } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import CategoryIcon from "../components/CategoryIcon";
import { buildSummary, categories, currency, monthLabel } from "../lib/spending";
import { budgetItems, budgetSignature, budgetPlanSignature, budgetValues, monthlyBudgetValue, moneyCents, moneyError } from "../lib/expenseForms";

export default function BudgetPage({ month, expenses, budgets, draft, saving, onDraftChange, onSave, onCopyPrevious }) {
  const stored = useMemo(() => budgetValues(budgets), [budgets]);
  const storedAmount = monthlyBudgetValue(budgets);
  const storedSignature = budgetPlanSignature(storedAmount, stored);
  const monthlyAmount = draft?.monthlyAmount ?? storedAmount;
  const values = draft?.values || stored;
  const spending = useMemo(() => buildSummary(expenses), [expenses]);
  const changed = budgetPlanSignature(monthlyAmount, values) !== storedSignature;
  const remoteChanged = changed && draft && draft.baseSignature !== storedSignature;
  const [attempted, setAttempted] = useState(false);
  const [working, setWorking] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [optionalOpen, setOptionalOpen] = useState(false);
  const lock = useRef(false);
  const mounted = useRef(false);
  const inputRefs = useRef({});
  const optionalRef = useRef(null);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const disabled = saving || Boolean(working);
  const errors = Object.fromEntries(Object.keys(categories).map((key) => [key, moneyError(values[key], true)]));
  const invalid = Object.keys(categories).find((key) => errors[key]);
  const monthlyError = String(monthlyAmount).trim() ? moneyError(monthlyAmount) : "";
  const total = (moneyCents(monthlyAmount, true) ?? 0) / 100;
  const savedTotal = (moneyCents(storedAmount, true) ?? 0) / 100;
  const remaining = total - spending.total;

  function update(key, value) {
    setError(""); setNotice("");
    const next = { ...values, [key]: value };
    onDraftChange(budgetPlanSignature(monthlyAmount, next) === storedSignature ? null : { monthlyAmount, values: next, baseSignature: draft?.baseSignature || storedSignature });
  }

  function updateMonthly(value) {
    setError(""); setNotice("");
    onDraftChange(budgetPlanSignature(value, values) === storedSignature ? null : { monthlyAmount: value, values, baseSignature: draft?.baseSignature || storedSignature });
  }

  async function copyPrevious() {
    if (lock.current || disabled) return;
    lock.current = true; setWorking("copy"); setError(""); setNotice("");
    try {
      const previous = await onCopyPrevious();
      if (!mounted.current) return;
      const copied = budgetValues(previous || []);
      const copiedAmount = monthlyBudgetValue(previous);
      if (!copiedAmount && !Object.values(copied).some((value) => Number(value) > 0)) {
        setNotice("No budget was set last month. Your current amounts have been kept."); return;
      }
      onDraftChange(budgetPlanSignature(copiedAmount, copied) === storedSignature ? null : { monthlyAmount: copiedAmount, values: copied, baseSignature: storedSignature });
      setAttempted(false); setNotice("Last month copied. Review these amounts, then save.");
    } catch (err) {
      if (mounted.current) setError(err.message || "Could not copy last month's budget. Try again.");
    } finally {
      lock.current = false;
      if (mounted.current) setWorking("");
    }
  }

  async function save(event) {
    event.preventDefault();
    if (lock.current || disabled || !changed) return;
    setAttempted(true); setError(""); setNotice("");
    if (monthlyError) { inputRefs.current.monthly?.focus(); return; }
    if (invalid) { if (optionalRef.current) optionalRef.current.open = true; inputRefs.current[invalid]?.focus(); return; }
    lock.current = true; setWorking("save");
    try {
      await onSave({ monthlyAmount: total > 0 ? total : null,
        ...(budgetSignature(values) !== budgetSignature(stored) ? { items: budgetItems(values) } : {}) });
      if (mounted.current) setNotice("Your monthly budget has been saved.");
    } catch (err) {
      if (mounted.current) setError(err.message || "Could not save. Your amounts are still here; try again.");
    } finally {
      lock.current = false;
      if (mounted.current) setWorking("");
    }
  }

  return (
    <form className="page-stack expense-budget-page" onSubmit={save} noValidate onKeyDown={event => { if ((event.ctrlKey || event.metaKey) && event.key === "Enter") { event.preventDefault(); event.currentTarget.requestSubmit(); } }}>
      <header className="expense-page-heading"><div><span className="eyebrow">{monthLabel(month)}</span><h1>Your monthly budget</h1><p>One amount. Everything else is optional.</p></div><button className="button button--secondary" type="button" disabled={disabled} onClick={copyPrevious}><ArrowDownToLine size={17} /> {working === "copy" ? "Copying…" : "Copy last month"}</button></header>
      <section className="panel expense-monthly-budget" aria-label="Set monthly budget">
        <label className="field" htmlFor="monthly-budget"><span>How much do you want to spend this month?</span><span className="input-affix"><span aria-hidden="true">₹</span><input id="monthly-budget" ref={node => { inputRefs.current.monthly = node; }} type="text" inputMode="decimal" autoComplete="off" autoFocus placeholder="e.g. 30,000" value={monthlyAmount} disabled={disabled} onChange={event => updateMonthly(event.target.value)} aria-invalid={attempted && Boolean(monthlyError)} aria-describedby={attempted && monthlyError ? "monthly-budget-help monthly-budget-error" : "monthly-budget-help"} /></span><small id="monthly-budget-help">No category breakdown needed. Clear the amount to remove your monthly budget.</small>{attempted && monthlyError && <small className="field-error" id="monthly-budget-error">{monthlyError}</small>}</label>
        <div className="expense-monthly-budget__actions"><button className="button button--primary" type="submit" disabled={!changed || disabled}>{working === "save" || saving ? "Saving…" : "Save budget"}</button>{monthlyAmount && <button className="button button--ghost" type="button" disabled={disabled} onClick={() => updateMonthly("")}>Remove monthly limit</button>}{draft && <button className="button button--ghost" type="button" disabled={disabled} onClick={() => { onDraftChange(null); setError(""); setNotice(""); setAttempted(false); }}><RotateCcw size={16} /> Discard changes</button>}</div>
      </section>
      <section className="expense-budget-summary" aria-label="Budget summary">
        <div><span>{changed ? "Draft monthly budget" : "Monthly budget"}</span><strong>{monthlyError ? "Check amount" : total ? currency.format(total) : "Not set"}</strong><small>{changed ? `Saved budget: ${savedTotal ? currency.format(savedTotal) : "not set"}` : "Your overall spending limit"}</small></div>
        <div><span>Spent this month</span><strong>{currency.format(spending.total)}</strong><small>{spending.count} recorded expenses</small></div>
        <div><span>{remaining < 0 && total ? "Over budget" : "Left in budget"}</span><strong className={remaining < 0 && total ? "text-danger" : ""}>{total && !monthlyError ? currency.format(Math.abs(remaining)) : "—"}</strong><small>A spending limit, not your bank balance</small></div>
      </section>
      {remoteChanged && <p className="inline-notice" role="status">The saved budget changed while you were editing. Your draft is kept. Save to replace it, or discard to use the latest saved amounts.</p>}
      {error && <p className="inline-notice expense-error" role="alert">{error}</p>}
      {notice && <p className="inline-notice" role="status">{notice}</p>}
      <details className="panel expense-budget-optional" ref={optionalRef} onToggle={event => setOptionalOpen(event.currentTarget.open)}>
        <summary>Category limits <small>Optional · no split required</small></summary>
        <p>Set a limit only where it helps. These are separate guardrails within your monthly budget, not extra money. They do not need to add up to it.</p>
      <section className="expense-budget-table" aria-label="Category limits">
        <div className="expense-budget-table__head" aria-hidden="true"><span>Category</span><span>Spent</span><span>Monthly limit</span><span>Left / over</span></div>
        {Object.entries(categories).map(([key, item]) => {
          const spent = spending.byCategory[key] || 0;
          const cents = moneyCents(values[key], true);
          const delta = (cents || 0) / 100 - spent;
          return <div className="expense-budget-table__row" key={key}>
            <label className="expense-budget-category" htmlFor={`budget-${key}`}><CategoryIcon category={key} size="small" /><strong>{item.label}</strong></label>
            <span className="expense-budget-spent"><small>Spent</small>{currency.format(spent)}</span>
            <div className="expense-budget-limit"><label className="input-affix" htmlFor={`budget-${key}`}><span aria-hidden="true">₹</span><span className="sr-only">{item.label} monthly limit</span><input ref={(node) => { inputRefs.current[key] = node; }} id={`budget-${key}`} type="text" inputMode="decimal" autoComplete="off" placeholder="Not set" value={values[key] ?? ""} disabled={disabled} onChange={(event) => update(key, event.target.value)} aria-invalid={attempted && Boolean(errors[key])} aria-describedby={attempted && errors[key] ? `budget-error-${key}` : undefined} /></label>{attempted && errors[key] && <small id={`budget-error-${key}`} className="field-error">{errors[key]}</small>}</div>
            <span className={`expense-budget-remaining${cents && delta < 0 ? " text-danger" : ""}`}>{cents ? `${currency.format(Math.abs(delta))} ${delta < 0 ? "over" : "left"}` : "No limit"}</span>
          </div>;
        })}
      </section>
      </details>
      {optionalOpen && <footer className="expense-budget-save"><span role="status">{changed ? "Unsaved changes" : "All changes saved"}</span><button className="button button--primary" type="submit" disabled={!changed || disabled}>{working === "save" || saving ? "Saving…" : "Save budget"}</button></footer>}
    </form>
  );
}

