import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { monthLabel, shiftMonth } from "../lib/spending";

export default function MonthControl({ month, onChange }) {
  return (
    <div className="month-control" aria-label="Selected month">
      <button type="button" onClick={() => onChange(shiftMonth(month, -1))} aria-label="Previous month">
        <ChevronLeft size={18} />
      </button>
      <label>
        <CalendarDays size={16} aria-hidden="true" />
        <span>{monthLabel(month, true)}</span>
        <input
          type="month"
          value={month}
          onChange={(event) => event.target.value && onChange(event.target.value)}
          aria-label="Choose month"
        />
      </label>
      <button type="button" onClick={() => onChange(shiftMonth(month, 1))} aria-label="Next month">
        <ChevronRight size={18} />
      </button>
    </div>
  );
}

