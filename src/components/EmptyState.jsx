import { Plus, Receipt } from "lucide-react";

export default function EmptyState({ filtered = false, onAdd }) {
  return (
    <div className="empty-state">
      <span className="empty-state__icon"><Receipt size={24} /></span>
      <h2>{filtered ? "No matching expenses" : "This month is wide open"}</h2>
      <p>
        {filtered
          ? "Try a different search or category filter."
          : "Add the first expense when it happens. Your overview will take shape from there."}
      </p>
      {!filtered && onAdd && (
        <button className="button button--secondary" type="button" onClick={onAdd}>
          <Plus size={17} />
          Add expense
        </button>
      )}
    </div>
  );
}

