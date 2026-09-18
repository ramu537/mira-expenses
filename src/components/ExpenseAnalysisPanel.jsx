import { AlertTriangle, ArrowDownRight, ArrowRight, ArrowUpRight, CheckCircle2, RefreshCw, Sparkles } from "lucide-react";
import { categories, currency } from "../lib/spending";

const statusLabels = {
  NO_DATA: "Ready when you are",
  NO_BUDGET: "Needs a monthly plan",
  ON_TRACK: "On track",
  WATCH: "Watch your pace",
  OVER_BUDGET: "Over plan",
};

const statusTones = {
  NO_DATA: "neutral",
  NO_BUDGET: "neutral",
  ON_TRACK: "positive",
  WATCH: "warning",
  OVER_BUDGET: "danger",
};

function signedPercent(value) {
  const number = Number(value || 0);
  return `${number > 0 ? "+" : ""}${number.toLocaleString("en-IN", { maximumFractionDigits: 1 })}%`;
}

export function ExpenseAnalysisHero({ analysis, loading, error, onRetry }) {
  if (loading && !analysis) {
    return (
      <div className="analysis-pulse analysis-pulse--loading" aria-label="Refreshing Mira analysis">
        <span className="analysis-pulse__icon"><Sparkles size={17} /></span>
        <span>Mira analysis</span>
        <strong>Reading this month…</strong>
      </div>
    );
  }

  if (!analysis) {
    return (
      <button className="analysis-pulse analysis-pulse--error" type="button" onClick={onRetry}>
        <span className="analysis-pulse__icon"><RefreshCw size={17} /></span>
        <span>Mira analysis</span>
        <strong>{error || "Analysis is temporarily unavailable"}</strong>
        <small>Retry</small>
      </button>
    );
  }

  const insight = analysis.insights?.[0];
  const tone = statusTones[analysis.status] || "neutral";
  return (
    <a className={`analysis-pulse analysis-pulse--${tone}`} href="#monthly-analysis">
      <span className="analysis-pulse__topline">
        <span className="analysis-pulse__icon"><Sparkles size={17} /></span>
        <span>Mira analysis</span>
        <small>{statusLabels[analysis.status] || analysis.status}</small>
      </span>
      <strong>{insight?.title || analysis.headline}</strong>
      <span className="analysis-pulse__detail">{insight?.detail || analysis.headline}</span>
      <span className="analysis-pulse__footer">
        {analysis.projectedMonthEndSpend == null ? "Forecast unavailable" : `Month end ${currency.format(analysis.projectedMonthEndSpend)}`}
        <span>View analysis <ArrowRight size={14} /></span>
      </span>
    </a>
  );
}

export default function ExpenseAnalysisPanel({ analysis, loading, error, onRetry }) {
  if (!analysis) {
    return (
      <section className="panel analysis-panel analysis-panel--empty" id="monthly-analysis">
        <span className="state-icon"><AlertTriangle size={21} /></span>
        <div role="status"><strong>{loading ? "Updating monthly analysis…" : "Monthly analysis unavailable"}</strong><small>{loading ? "Reading your latest expenses and budget." : error || "Try refreshing the analysis."}</small></div>
        <button className="button button--ghost" type="button" disabled={loading} onClick={onRetry}><RefreshCw size={15} /> Retry</button>
      </section>
    );
  }

  const topCategories = (analysis.categories || []).filter((item) => Number(item.spent) > 0).slice(0, 4);
  const paceUp = Number(analysis.paceChangePercent) > 0;
  const StatusIcon = analysis.status === "ON_TRACK" ? CheckCircle2 : AlertTriangle;

  return (
    <section className="panel analysis-panel" id="monthly-analysis">
      <header className="panel-header analysis-panel__header">
        <div>
          <span className="eyebrow">Mira intelligence</span>
          <h2>Monthly analysis</h2>
        </div>
        <span className={`analysis-status analysis-status--${statusTones[analysis.status] || "neutral"}`}>
          <StatusIcon size={15} /> {statusLabels[analysis.status] || analysis.status}
        </span>
      </header>

      <div className="analysis-summary">
        <div>
          <span>Projected month end</span>
          <strong>{analysis.projectedMonthEndSpend == null ? "Not available" : currency.format(analysis.projectedMonthEndSpend)}</strong>
          <small>{analysis.headline}</small>
        </div>
        <div>
          <span>Previous month</span>
          <strong>{currency.format(analysis.previousMonthSpent || 0)}</strong>
          <small className={analysis.paceChangePercent == null ? "" : paceUp ? "is-negative" : "is-positive"}>
            {analysis.paceChangePercent != null && (paceUp ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />)}
            {analysis.paceChangePercent == null ? "No comparable baseline" : `${signedPercent(analysis.paceChangePercent)} comparable pace`}
          </small>
        </div>
        <div>
          <span>Typical expense</span>
          <strong>{currency.format(analysis.medianExpense || 0)}</strong>
          <small>Median across {analysis.transactionCount || 0} entries</small>
        </div>
      </div>

      <details className="analysis-details">
        <summary>See the supporting numbers</summary>
        <dl className="analysis-facts">
          <div><dt>Average expense</dt><dd>{currency.format(analysis.averageExpense)}</dd></div>
          <div><dt>Previous comparable period</dt><dd>{currency.format(analysis.comparablePreviousPeriodSpent)}</dd></div>
          <div><dt>Preceding 7 days</dt><dd>{currency.format(analysis.precedingSevenDaySpent)}</dd></div>
          <div><dt>Largest entry</dt><dd>{analysis.largestExpense ? `${analysis.largestExpense.title} · ${currency.format(analysis.largestExpense.amount)}` : "No entries"}</dd></div>
          <div><dt>Highest-spending day</dt><dd>{analysis.highestSpendingDay ? `${analysis.highestSpendingDay.date} · ${currency.format(analysis.highestSpendingDay.amount)}` : "No entries"}</dd></div>
        </dl>
        <h3>Top descriptions</h3>
        <ul className="analysis-evidence-list">
          {(analysis.topMerchants || []).map((item) => (
            <li key={item.merchant}><span>{item.merchant} · {item.transactionCount} entries</span><strong>{currency.format(item.total)} · {item.percentOfSpend}%</strong></li>
          ))}
        </ul>
        {analysis.unusualExpenses?.length > 0 && <>
          <h3>Unusually large entries</h3>
          <ul className="analysis-evidence-list">{analysis.unusualExpenses.map((item) => (
            <li key={item.id}><span>{item.title} · {item.spentOn}</span><strong>{currency.format(item.amount)}</strong></li>
          ))}</ul>
        </>}
        <h3>How to read this analysis</h3>
        <ul className="analysis-assumptions">{(analysis.assumptions || []).map((item) => <li key={item}>{item}</li>)}</ul>
        {analysis.dataQuality?.warnings?.length > 0 && <ul className="analysis-assumptions">{analysis.dataQuality.warnings.map((item) => <li key={item}>{item}</li>)}</ul>}
      </details>

      <div className="analysis-content-grid">
        <div className="analysis-insights">
          <h3>What matters now</h3>
          {(analysis.insights || []).map((insight) => (
            <article className={`analysis-insight analysis-insight--${String(insight.tone).toLowerCase()}`} key={insight.code}>
              <span><Sparkles size={15} /></span>
              <div><strong>{insight.title}</strong><p>{insight.detail}</p></div>
            </article>
          ))}
        </div>

        <div className="analysis-categories">
          <h3>Category pressure</h3>
          {topCategories.length ? topCategories.map((item) => {
            const label = categories[item.category]?.label || item.category;
            const share = Math.min(Number(item.percentOfSpend || 0), 100);
            return (
              <div className="analysis-category" key={item.category}>
                <span><strong>{label}</strong><small>{currency.format(item.spent)}</small></span>
                <div><i style={{ width: `${share}%` }} /></div>
                <small>{Number(item.budget) > 0
                  ? item.overBudget
                    ? `${currency.format(Math.abs(Number(item.remaining)))} over budget`
                    : `${currency.format(item.remaining)} remaining`
                  : `${share.toFixed(0)}% of spending`}</small>
              </div>
            );
          }) : <p className="analysis-empty-copy">No category spending recorded for this month.</p>}
        </div>
      </div>

      <footer className="analysis-footnotes">
        <span>Weekdays <strong>{currency.format(analysis.weekdaySpent || 0)}</strong></span>
        <span>Weekends <strong>{currency.format(analysis.weekendSpent || 0)}</strong></span>
        <span>Last 7 days <strong>{currency.format(analysis.recentSevenDaySpent || 0)}</strong></span>
        {analysis.dataQuality?.warnings?.length > 0 && (
          <span className="analysis-footnotes__warning"><AlertTriangle size={13} /> {analysis.dataQuality.warnings[0]}</span>
        )}
      </footer>
    </section>
  );
}
