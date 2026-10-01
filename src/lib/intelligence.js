export function analysisEngineLabel(analysis) {
  if (String(analysis?.engine || "").includes("GEMINI")) return "Gemini + calculated evidence";
  if (analysis?.engine === "EXTERNAL_MCP") return "Assistant + calculated evidence";
  return "Calculated from expenses and budgets";
}

export function freshnessLabel(value) {
  if (!value) return "Calculated when opened";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Calculated when opened" : `Updated ${new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(date)}`;
}
