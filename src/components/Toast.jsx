import { AlertTriangle, CheckCircle2, X, XCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export default function Toast({ toast, onClose }) {
  const [paused, setPaused] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);
  const actionLock = useRef(false);
  useEffect(() => { setPaused(false); }, [toast]);
  useEffect(() => {
    if (!toast || paused || actionBusy || toast.tone === "error") return;
    const timer = window.setTimeout(onClose, toast.action ? 10000 : 4200);
    return () => window.clearTimeout(timer);
  }, [toast, onClose, paused, actionBusy]);

  if (!toast) return null;
  const Icon = toast.tone === "error" ? XCircle : toast.tone === "warning" ? AlertTriangle : CheckCircle2;
  async function runAction() {
    if (actionLock.current || !toast.action) return;
    actionLock.current = true;
    setActionBusy(true);
    try { await toast.action(); }
    finally { actionLock.current = false; setActionBusy(false); }
  }

  return (
    <div className={`toast toast--${toast.tone}${toast.action ? " toast--actionable" : ""}`}
      role={toast.tone === "error" ? "alert" : "status"}
      onPointerEnter={() => setPaused(true)} onPointerLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setPaused(false); }}>
      <Icon size={19} />
      <span>{toast.message}</span>
      {toast.action && <button className="toast__action" type="button" disabled={actionBusy} onClick={runAction}>{actionBusy ? "Restoring…" : toast.actionLabel || "Undo"}</button>}
      <button type="button" disabled={actionBusy} onClick={onClose} aria-label="Dismiss message"><X size={17} /></button>
    </div>
  );
}
