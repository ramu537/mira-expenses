import { apiRequest } from "./client";

export const budgetApi = {
  list(month) {
    return apiRequest(`/budgets?month=${encodeURIComponent(month)}`);
  },
  replace(month, items) {
    return apiRequest(`/budgets?month=${encodeURIComponent(month)}`, {
      method: "PUT",
      body: JSON.stringify({ items }),
    });
  },
};

