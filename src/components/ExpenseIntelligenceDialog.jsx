import { RefreshCw, Sparkles, X } from "lucide-react";
import { useEffect, useRef } from "react";
import { analysisEngineLabel, freshnessLabel } from "../lib/intelligence";
import ExpenseAnalysisPanel from "./ExpenseAnalysisPanel";

export default function ExpenseIntelligenceDialog({ open, analysis, loading, error, onRefresh, onPoll, onClose }) {
  const dialogRef = useRef(null);
  const returnFocusRef = useRef(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      returnFocusRef.current = document.activeElement;
      dialog.showModal();
      void onRefresh();
    }
    if (!open && dialog.open) {
      dialog.close();
      returnFocusRef.current?.focus?.();
    }
  }, [open, onRefresh]);

  useEffect(() => {
    if (!open || analysis?.intelligenceStatus !== "PENDING" || !onPoll) return undefined;
    const timer = window.setInterval(() => void onPoll(), 8000);
    return () => window.clearInterval(timer);
  }, [analysis?.intelligenceStatus, onPoll, open]);

  useEffect(() => {
    if (!open) return undefined;
    const sync = () => { if (document.visibilityState === "visible") void onRefresh(); };
    window.addEventListener("focus", sync);
    document.addEventListener("visibilitychange", sync);
    return () => {
      window.removeEventListener("focus", sync);
      document.removeEventListener("visibilitychange", sync);
    };
  }, [open, onRefresh]);

  return <dialog ref={dialogRef} className="dialog expense-intelligence-dialog" aria-labelledby="expense-intelligence-title" onCancel={(event) => { event.preventDefault(); onClose(); }} onClick={(event) => { if (event.target === dialogRef.current) onClose(); }}>
    <div className="dialog-card">
      <header className="dialog-header expense-intelligence-dialog__header">
        <div><span className="eyebrow">Grounded in your records</span><h2 id="expense-intelligence-title"><Sparkles size={19} /> Expense intelligence</h2><p>Review this month’s pace, budget pressure and unusual entries when you need them.</p></div>
        <div className="expense-intelligence-dialog__actions"><button className="icon-button" type="button" onClick={onRefresh} disabled={loading} aria-label="Refresh expense intelligence" title="Refresh"><RefreshCw className={loading ? "spin" : ""} size={18} /></button><button className="icon-button" type="button" onClick={onClose} aria-label="Close expense intelligence" title="Close"><X size={20} /></button></div>
      </header>
      <div className="expense-intelligence-dialog__body">
        {analysis ? <div className="expense-intelligence-meta"><span>{analysisEngineLabel(analysis)}</span><span>{freshnessLabel(analysis.generatedAt)}</span><span>{analysis.dataQuality?.coverageLabel || `${analysis.transactionCount || 0} recorded expenses`}</span></div> : null}
        {analysis?.assistantInterpretation ? <section className="expense-intelligence-interpretation"><span className="eyebrow">Assistant interpretation</span><p>{analysis.assistantInterpretation}</p>{analysis.intelligenceEvidence?.length ? <dl>{analysis.intelligenceEvidence.map((item) => <div key={item.key}><dt>{item.label}</dt><dd>{item.value}</dd></div>)}</dl> : null}</section> : null}
        <ExpenseAnalysisPanel analysis={analysis} loading={loading} error={error} onRetry={onRefresh} />
      </div>
    </div>
  </dialog>;
}
