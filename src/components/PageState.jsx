import { AlertCircle, LoaderCircle, RefreshCw } from "lucide-react";

export function LoadingState({ label = "Loading expenses" }) {
  return (
    <div className="page-state page-state--loading" role="status">
      <LoaderCircle className="spin" size={28} />
      <strong>{label}</strong>
      <span>Gathering the selected month.</span>
    </div>
  );
}

export function ErrorState({ message, onRetry }) {
  return (
    <div className="page-state" role="alert">
      <span className="state-icon"><AlertCircle size={24} /></span>
      <strong>We couldn’t load this month</strong>
      <span>{message}</span>
      <button className="button button--secondary" type="button" onClick={onRetry}>
        <RefreshCw size={17} />
        Try again
      </button>
    </div>
  );
}

