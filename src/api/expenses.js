import { apiRequest } from "./client";

export const expenseApi = {
  source(id) { return apiRequest(`/expenses/${encodeURIComponent(id)}/source`); },
  list(start, end) {
    const params = new URLSearchParams({ start, end });
    return apiRequest(`/expenses?${params}`);
  },
  create(expense) {
    return apiRequest("/expenses", {
      method: "POST",
      body: JSON.stringify(expense),
    });
  },
  update(id, expense) {
    return apiRequest(`/expenses/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: JSON.stringify(expense),
    });
  },
  remove(id) {
    return apiRequest(`/expenses/${encodeURIComponent(id)}`, { method: "DELETE" });
  },
  restore(id) {
    return apiRequest(`/expenses/${encodeURIComponent(id)}/restore`, { method: "POST" });
  },
  async analyze(month, scenario = {}, regenerateIntelligence = true) {
    const analysisDate = `${month}-01`;
    const [analysisResult, intelligenceResult] = await Promise.allSettled([
      apiRequest("/expenses/analysis", {
        method: "POST",
        body: JSON.stringify({
          month,
          plannedAmount: scenario.plannedAmount ?? null,
          plannedFor: scenario.plannedFor ?? null,
          availableFunds: scenario.availableFunds ?? null,
          minimumReserve: scenario.minimumReserve ?? null,
        }),
      }),
      regenerateIntelligence
        ? apiRequest("/expenses/intelligence/refresh", {
            method: "POST",
            body: JSON.stringify({ date: analysisDate }),
          })
        : apiRequest(`/expenses/intelligence?${new URLSearchParams({ date: analysisDate })}`),
    ]);
    if (analysisResult.status === "rejected") throw analysisResult.reason;
    const analysis = analysisResult.value;
    const intelligence = intelligenceResult.status === "fulfilled" ? intelligenceResult.value : null;
    return {
      ...analysis,
      generatedAt: intelligence?.generatedAt || analysis.generatedAt,
      intelligenceError: intelligenceResult.status === 'rejected' ? intelligenceResult.reason?.message : intelligence?.providerMessage,
      intelligenceStatus: intelligence?.status || "UNAVAILABLE",
      interpretationStale: intelligence?.interpretationStale || false,
      refreshStatus: intelligence?.refreshStatus || "UNAVAILABLE",
      engine: intelligence?.engine || "CALCULATED",
      assistantInterpretation: intelligence?.assistantInterpretation,
      assistantGeneratedAt: intelligence?.assistantGeneratedAt,
      intelligenceCoverage: intelligence?.coverage,
      assistantEvidenceKeys: intelligence?.assistantEvidenceKeys || [],
      intelligenceEvidence: intelligence?.assistantEvidence || intelligence?.evidence || [],
      intelligenceAssumptions: intelligence?.assumptions || [],
      intelligenceSafetyNotices: intelligence?.safetyNotices || [],
    };
  },
};
