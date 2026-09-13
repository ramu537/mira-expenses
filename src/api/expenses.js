import { apiRequest } from "./client";

export const expenseApi = {
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
};

