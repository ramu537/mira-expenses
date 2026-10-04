import { apiRequest } from "./client";

export const budgetApi = {
  list(month) {
    return apiRequest(`/budgets/plan?month=${encodeURIComponent(month)}`);
  },
  replace(month, plan) {
    return apiRequest(`/budgets/plan?month=${encodeURIComponent(month)}`, {
      method: "PUT",
      body: JSON.stringify(plan),
    });
  },
};

