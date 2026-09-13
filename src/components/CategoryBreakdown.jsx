import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { categories, currency } from "../lib/spending";

export default function CategoryBreakdown({ data, total }) {
  const largest = data[0];
  const summary = largest
    ? `${largest.name} leads at ${Math.round((largest.value / total) * 100)}% of this month.`
    : "Categories will appear after your first expense.";

  return (
    <section className="panel category-panel">
      <header className="panel-header">
        <div>
          <span className="eyebrow">Where it went</span>
          <h2>By category</h2>
        </div>
      </header>

      {data.length ? (
        <>
          <div className="category-visual" role="img" aria-label={summary}>
            <div className="donut-chart">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={data} dataKey="value" innerRadius={57} outerRadius={78} paddingAngle={3} stroke="none">
                    {data.map((item) => <Cell key={item.key} fill={categories[item.key].color} />)}
                  </Pie>
                  <Tooltip
                    formatter={(value) => currency.format(value)}
                    contentStyle={{
                      borderRadius: "var(--radius-sm)",
                      border: "1px solid var(--border-default)",
                      background: "var(--surface-1)",
                      color: "var(--text-primary)",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <span className="donut-label"><strong>{data.length}</strong><small>categories</small></span>
            </div>
            <p>{summary}</p>
          </div>

          <div className="category-ranking">
            {data.slice(0, 5).map((item) => {
              const share = Math.round((item.value / total) * 100);
              return (
                <div className="category-rank" key={item.key}>
                  <span className="category-dot" style={{ "--category-color": categories[item.key].color }} />
                  <span className="category-rank__name">{item.name}</span>
                  <span className="category-rank__value"><strong>{currency.format(item.value)}</strong><small>{share}%</small></span>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <div className="chart-empty"><span /><span /><span /><p>{summary}</p></div>
      )}
    </section>
  );
}

