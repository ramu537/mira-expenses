import { useEffect, useState } from "react";
import { expenseApi } from "../api/expenses";
import { apiRequest } from "../api/client";

export default function ExpenseSource({ expense }) {
  const [source, setSource] = useState(null);
  const [capture, setCapture] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  useEffect(() => { setSource(null); setCapture(null); setError(""); }, [expense.id]);
  async function load() {
    if (loading || source) return;
    setLoading(true); setError("");
    try {
      const result = await expenseApi.source(expense.id);
      setSource(result);
      if (result.captureId) setCapture(await apiRequest(`/captures/${result.captureId}`));
    } catch (reason) { setSource(null); setError(reason.message); }
    finally { setLoading(false); }
  }
  async function download(file) {
    setError("");
    try {
      const blob = await apiRequest(`/captures/${source.captureId}/attachments/${file.id}`, { responseType: "blob" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url; link.download = file.fileName || "capture-image"; link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (reason) { setError(reason.message); }
  }
  return <details className="expense-details" onToggle={event => { if (event.currentTarget.open) void load(); }}>
    <summary>Source & saved record</summary>
    <div className="expense-details__body">
      <p>Expense #{expense.id} · {source?.source || expense.source || "Manual entry"}</p>
      {expense.mutationReceipt && <small>Receipt {expense.mutationReceipt.requestId} · {expense.mutationReceipt.replayed ? "Original save recovered" : "Saved"}</small>}
      {loading && <p role="status">Loading original source…</p>}
      {error && <p role="alert">{error} <button type="button" className="button button--ghost" onClick={load}>Retry</button></p>}
      {source?.captureId && <p>Capture #{source.captureId} · action receipt #{source.receiptId}</p>}
      {capture && <><p>Original input · {capture.capturedAt}</p><p style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{capture.text}</p>
        {capture.attachments?.map(file => <button key={file.id} type="button" className="button button--ghost" onClick={() => download(file)}>Download source: {file.fileName || "Image"}</button>)}
      </>}
      {source && !source.captureId && <small>This entry was logged directly, without a saved capture.</small>}
    </div>
  </details>;
}
