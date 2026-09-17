import { CheckCircle2, X, XCircle } from "lucide-react";
import { useEffect } from "react";

export default function Toast({ toast, onClose }) {
  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(onClose, toast.action ? 7000 : 4200);
    return () => window.clearTimeout(timer);
  }, [toast, onClose]);

  if (!toast) return null;
  const Icon = toast.tone === "error" ? XCircle : CheckCircle2;

  return (
    <div className={`toast toast--${toast.tone}${toast.action ? " toast--actionable" : ""}`} role={toast.tone === "error" ? "alert" : "status"}>
      <Icon size={19} />
      <span>{toast.message}</span>
      {toast.action && (
        <button className="toast__action" type="button" onClick={toast.action}>
          {toast.actionLabel || "Undo"}
        </button>
      )}
      <button type="button" onClick={onClose} aria-label="Dismiss message"><X size={17} /></button>
    </div>
  );
}
