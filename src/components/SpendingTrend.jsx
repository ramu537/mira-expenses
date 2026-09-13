import { useId, useMemo } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { compactCurrency, currency } from "../lib/spending";

function TrendTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <span>Day {label}</span>
      <strong>{currency.format(payload[0].value)}</strong>
    </div>
  );
}

export default function SpendingTrend({ data }) {
  const gradientId = useId().replace(/:/g, "");
  const insight = useMemo(() => {
    const activeDays = data.filter((item) => item.amount > 0);
    const peak = activeDays.reduce((highest, item) => (
      item.amount > (highest?.amount || 0) ? item : highest
    ), null);
    if (!peak) return "Your daily pattern will appear after the first expense.";
    return `Highest day: ${currency.format(peak.amount)} on day ${peak.day}.`;
  }, [data]);

  return (
    <section className="panel chart-panel">
      <header className="panel-header">
        <div>
          <span className="eyebrow">Spending rhythm</span>
          <h2>Daily trend</h2>
        </div>
        <span className="panel-insight">{insight}</span>
      </header>

      <div className="trend-chart" role="img" aria-label={insight}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 12, right: 8, left: -14, bottom: 0 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.42} />
                <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="var(--border-subtle)" strokeDasharray="4 6" vertical={false} />
            <XAxis
              dataKey="day"
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
              tick={{ fill: "var(--text-tertiary)", fontSize: 12 }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              width={62}
              tickFormatter={(value) => compactCurrency.format(value)}
              tick={{ fill: "var(--text-tertiary)", fontSize: 12 }}
            />
            <Tooltip content={<TrendTooltip />} cursor={{ stroke: "var(--border-strong)", strokeDasharray: "3 3" }} />
            <Area
              type="monotone"
              dataKey="amount"
              stroke="var(--accent-strong)"
              strokeWidth={2.5}
              fill={`url(#${gradientId})`}
              activeDot={{ r: 5, fill: "var(--accent-strong)", stroke: "var(--surface-1)", strokeWidth: 3 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <details className="chart-data">
        <summary>View chart data</summary>
        <table>
          <thead><tr><th>Day</th><th>Amount</th></tr></thead>
          <tbody>
            {data.map((item) => <tr key={item.date}><td>{item.day}</td><td>{currency.format(item.amount)}</td></tr>)}
          </tbody>
        </table>
      </details>
    </section>
  );
}

