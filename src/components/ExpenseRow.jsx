import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { categories, currency } from "../lib/spending";
import CategoryIcon from "./CategoryIcon";

export default function ExpenseRow({ expense, onEdit, onDelete, compact = false }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const category = categories[expense.category] || categories.OTHER;

  useEffect(() => {
    if (!menuOpen) return undefined;
    function close(event) {
      if (!menuRef.current?.contains(event.target)) setMenuOpen(false);
    }
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [menuOpen]);

  return (
    <article className={compact ? "expense-row expense-row--compact" : "expense-row"}>
      <CategoryIcon category={expense.category} />
      <button className="expense-row__main" type="button" onClick={() => onEdit(expense)}>
        <strong>{expense.title}</strong>
        <small>{category.label}{expense.note ? ` · ${expense.note}` : ""}</small>
      </button>
      <strong className="expense-row__amount">−{currency.format(expense.amount)}</strong>
      {!compact && (
        <div className="row-menu" ref={menuRef}>
          <button
            className="icon-button"
            type="button"
            aria-label={`Actions for ${expense.title}`}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((current) => !current)}
          >
            <MoreHorizontal size={19} />
          </button>
          {menuOpen && (
            <div className="row-menu__popover">
              <button type="button" onClick={() => { setMenuOpen(false); onEdit(expense); }}>
                <Pencil size={16} /> Edit
              </button>
              <button className="danger-action" type="button" onClick={() => { setMenuOpen(false); onDelete(expense); }}>
                <Trash2 size={16} /> Delete
              </button>
            </div>
          )}
        </div>
      )}
    </article>
  );
}

