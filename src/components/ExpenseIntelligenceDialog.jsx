import { RefreshCw, Sparkles, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { analysisEngineLabel, freshnessLabel } from "../lib/intelligence";
import ExpenseAnalysisPanel from "./ExpenseAnalysisPanel";

export default function ExpenseIntelligenceDialog({ contextKey, onScenario, open, analysis, loading, error, onRefresh, onPoll, onClose }) {
  const dialogRef = useRef(null);
  const returnFocusRef = useRef(null);
  const [scenario, setScenario] = useState({ plannedAmount: "", plannedFor: "", availableFunds: "", minimumReserve: "" });

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      returnFocusRef.current = document.activeElement;
      dialog.showModal();

    }
    if (!open && dialog.open) {
      dialog.close();
      returnFocusRef.current?.focus?.();
    }
  }, [open]);

  useEffect(() => { if (open) void onPoll?.(); }, [open, contextKey, onPoll]);
  useEffect(() => {
    if (!open || !onPoll) return undefined;
    const timer = window.setInterval(() => { if (document.visibilityState === 'visible' && !loading) void onPoll(); }, analysis?.intelligenceStatus === 'PENDING' ? 8000 : 30000);
    return () => window.clearInterval(timer);
  }, [analysis?.intelligenceStatus, onPoll, open, loading]);

  useEffect(() => {
    if (!open) return undefined;
    const sync = () => { if (document.visibilityState === "visible") void onPoll?.(); };
    window.addEventListener("focus", sync);
    document.addEventListener("visibilitychange", sync);
    return () => {
      window.removeEventListener("focus", sync);
      document.removeEventListener("visibilitychange", sync);
    };
  }, [open, onPoll]);

  return <dialog ref={dialogRef} className="dialog expense-intelligence-dialog" aria-labelledby="expense-intelligence-title" onCancel={(event) => { event.preventDefault(); onClose(); }} onClick={(event) => { if (event.target === dialogRef.current) onClose(); }}>
    <div className="dialog-card">
      <header className="dialog-header expense-intelligence-dialog__header">
        <div><span className="eyebrow">Grounded in your records</span><h2 id="expense-intelligence-title"><Sparkles size={19} /> Expense intelligence</h2><p>Review this month’s pace, budget pressure and unusual entries when you need them.</p></div>
        <div className="expense-intelligence-dialog__actions"><button className="icon-button" type="button" onClick={onRefresh} disabled={loading} aria-label="Refresh expense intelligence" title="Refresh"><RefreshCw className={loading ? "spin" : ""} size={18} /></button><button className="icon-button" type="button" onClick={onClose} aria-label="Close expense intelligence" title="Close"><X size={20} /></button></div>
      </header>
      <div className="expense-intelligence-dialog__body">
        {analysis ? <div className="expense-intelligence-meta"><span>{analysisEngineLabel(analysis)}</span><span>{freshnessLabel(analysis.assistantGeneratedAt || analysis.generatedAt)}</span><span>{analysis.intelligenceCoverage || analysis.dataQuality?.coverageLabel || `${analysis.transactionCount || 0} recorded expenses`}</span></div> : null}
        {error && <p role="alert">{error}</p>}
        {analysis?.interpretationStale && <p className="inline-notice" role="status">Previous interpretation · based on earlier records. {analysis.factsStale ? "Figures are also from the last successful load; refreshing them." : "Calculated figures below reflect the current ledger."}</p>}
        {analysis?.refreshStatus === "PENDING" && <p role="status">A fresh interpretation is queued. Your saved expenses are unaffected.</p>}
        {analysis?.refreshStatus === "FAILED" && <p role="status">Refresh failed. The last useful interpretation is retained; use Refresh to retry analysis, not the expense write.</p>}
        {analysis?.interpretationStale && analysis.assistantInterpretation && !analysis.intelligenceEvidence?.length && <p role="status">This older interpretation has no retained supporting snapshot. It is not evidence about your current spending.</p>}
        {analysis?.intelligenceError && <p role="status">{analysis.intelligenceError}</p>}
        {analysis?.assistantInterpretation ? <section className="expense-intelligence-interpretation"><span className="eyebrow">Assistant interpretation</span><p>{analysis.assistantInterpretation}</p>{analysis.intelligenceEvidence?.length ? <dl>{analysis.intelligenceEvidence.map((item) => <div key={item.key}><dt>{item.label}</dt><dd>{item.value}</dd></div>)}</dl> : null}</section> : null}
        <form className="expense-scenario" onSubmit={event => { event.preventDefault(); void onScenario({
          plannedAmount: Number(scenario.plannedAmount), plannedFor: scenario.plannedFor || "Planned purchase",
          availableFunds: scenario.availableFunds === "" ? null : Number(scenario.availableFunds),
          minimumReserve: scenario.minimumReserve === "" ? null : Number(scenario.minimumReserve),
        }); }}>
          <h3>Can this purchase fit my plan?</h3><p>Check a trip or purchase without logging an expense. A budget is not proof of cash available.</p>
          <label>What are you planning?<input value={scenario.plannedFor} maxLength={120} onChange={e => setScenario(s => ({ ...s, plannedFor: e.target.value }))} placeholder="Phone, trip…" /></label>
          <label>Expected cost (₹)<input type="number" min="0.01" step="0.01" required value={scenario.plannedAmount} onChange={e => setScenario(s => ({ ...s, plannedAmount: e.target.value }))} /></label>
          <label>Available funds (optional)<input type="number" min="0" step="0.01" value={scenario.availableFunds} onChange={e => setScenario(s => ({ ...s, availableFunds: e.target.value }))} /></label>
          <label>Keep in reserve (optional)<input type="number" min="0" step="0.01" value={scenario.minimumReserve} onChange={e => setScenario(s => ({ ...s, minimumReserve: e.target.value }))} /></label>
          <button className="button button--secondary" type="submit" disabled={loading}>Check my plan</button>
          {analysis?.scenario && <section aria-live="polite"><h4>{analysis.scenario.headline}</h4><ul>{analysis.scenario.reasons.map(reason => <li key={reason}>{reason}</li>)}</ul></section>}
        </form>
        <ExpenseAnalysisPanel analysis={analysis} loading={loading} error={error} onRetry={onRefresh} />
      </div>
    </div>
  </dialog>;
}
