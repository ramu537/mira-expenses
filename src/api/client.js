const API_URL = (import.meta?.env?.VITE_API_URL?.trim() || "/api").replace(/\/$/, "");

let accessTokenProvider = null;

/**
 * Registers the host application's token provider without coupling this app to
 * any authentication SDK. Passing null restores unauthenticated requests.
 */
export function configureAccessTokenProvider(provider) {
  if (provider !== null && typeof provider !== "function") {
    throw new TypeError("The access token provider must be a function or null.");
  }
  accessTokenProvider = provider;
}

async function responseBody(response) {
  if (response.status === 204) return null;

  const contentType = response.headers.get("content-type")?.toLowerCase() || "";
  if (contentType.includes("json")) return response.json();

  const text = await response.text();
  return text ? { message: text } : null;
}

export async function apiRequest(path, options = {}) {
  const token = accessTokenProvider ? await accessTokenProvider() : null;
  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;
  const headers = new Headers(options.headers);

  headers.set("Accept", "application/json");
  if (options.body && !isFormData) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  let response;
  try {
    response = await fetch(`${API_URL}${path}`, { ...options, headers });
  } catch {
    throw new Error("Unable to reach the expense service. Check your connection and try again.");
  }

  const body = await responseBody(response);
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("Your session has expired. Please sign in again.");
    }
    throw new Error(body?.detail || body?.message || "The request could not be completed. Please try again.");
  }

  return body;
}
