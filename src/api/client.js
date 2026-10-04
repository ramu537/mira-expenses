import { acknowledgeIntent, digest, mutationIntent, withReceipt } from "../lib/mutations.js";
const API_URL = (import.meta?.env?.VITE_API_URL?.trim() || "/api").replace(/\/$/, "");
let accessTokenProvider = null;
let ownerId = "anonymous";
const inFlight = new Map();

export function configureAccessTokenProvider(provider, owner = "anonymous") {
  if (provider !== null && typeof provider !== "function") throw new TypeError("The access token provider must be a function or null.");
  accessTokenProvider = provider;
  ownerId = owner;
}

export class RequestError extends Error {
  constructor(message, status = 0, requestId = null, uncertain = false) {
    super(message); this.status = status; this.requestId = requestId; this.uncertain = uncertain;
  }
}
async function responseBody(response) {
  if (response.status === 204) return null;
  if (response.headers.get("content-type")?.toLowerCase().includes("json")) return response.json();
  const text = await response.text();
  return text ? { message: text } : null;
}
const ledgerWrite = (path, method) => /^(POST|PUT|DELETE|PATCH)$/.test(method) &&
  /^\/(expenses(?:\/batch|\/\d+(?:\/restore)?)?|budgets(?:\/plan)?|captures(?:\/with-attachments|\/\d+(?:\/organize|\/archive|\/organization\/(?:confirm|undo))?)?)(?:\?.*)?$/.test(path);

async function fingerprint(body) {
  if (!(typeof FormData !== "undefined" && body instanceof FormData)) return digest(body || "");
  const parts = [];
  for (const [key, value] of body.entries()) {
    parts.push([key, typeof value === "string" ? value : [value.name || "", value.type, value.size, await digest(await value.arrayBuffer())]]);
  }
  return digest(JSON.stringify(parts));
}

export async function apiRequest(path, options = {}) {
  const method = (options.method || "GET").toUpperCase();
  const owner = ownerId;
  const intent = ledgerWrite(path, method) ? await mutationIntent(owner, method, path, await fingerprint(options.body)) : null;
  if (intent && inFlight.has(intent.key)) return inFlight.get(intent.key);
  const operation = perform(path, options, intent, owner);
  if (intent) inFlight.set(intent.key, operation);
  try { return await operation; } finally { if (intent) inFlight.delete(intent.key); }
}

async function perform(path, options, intent, owner) {
  const token = accessTokenProvider ? await accessTokenProvider() : null;
  if (owner !== ownerId) throw new RequestError("Your account changed. Please try again.");
  const headers = new Headers(options.headers);
  headers.set("Accept", "application/json");
  if (options.body && !(typeof FormData !== "undefined" && options.body instanceof FormData)) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (intent) headers.set("Idempotency-Key", intent.requestId);

  // Recovery never replays another payload: a matching, owner-scoped, committed receipt is authoritative.
  if (intent?.retry) {
    try {
      const recovered = await fetch(`${API_URL}/mutation-receipts/${encodeURIComponent(intent.requestId)}`, { headers, cache: "no-store", signal: options.signal });
      if (recovered.ok) {
        const saved = await responseBody(recovered);
        if (owner !== ownerId) throw new RequestError("Your account changed. The receipt belongs to the previous account.", 0, intent.requestId, true);
        if (saved.method === (options.method || "GET").toUpperCase() && saved.path === `/api${path}`) {
          acknowledgeIntent(intent);
          return withReceipt(saved.result, { requestId: intent.requestId, replayed: true, recovered: true, status: "SAVED", savedAt: saved.savedAt });
        }
      } else if (recovered.status !== 404) {
        throw new RequestError("Could not check the previous save. Retry this entry when connected.", recovered.status, intent.requestId, true);
      }
    } catch (error) {
      if (error instanceof RequestError) throw error;
      // A transport failure may still be retried using the SAME key. The server serializes duplicates.
    }
  }
  let response;
  try { response = await fetch(`${API_URL}${path}`, { ...options, headers, cache: "no-store" }); }
  catch {
    throw new RequestError(intent ? "Save not confirmed. Your entry may already be saved. Retry this same entry to recover its receipt; do not add a second copy." : "Unable to reach the expense service. Check your connection and try again.", 0, intent?.requestId, Boolean(intent));
  }
  let body;
  try { body = response.ok && options.responseType === "blob" ? await response.blob() : await responseBody(response); }
  catch { throw new RequestError("Response could not be read. Retry this same entry to check its saved receipt.", response.status, intent?.requestId, Boolean(intent)); }
  if (owner !== ownerId) throw new RequestError("Your account changed. Sign back into the previous account to check this receipt.", 0, intent?.requestId, Boolean(intent));
  if (!response.ok) {
    const uncertain = Boolean(intent && response.status >= 500);
    if (intent && !uncertain) acknowledgeIntent(intent);
    throw new RequestError(response.status === 401 ? "Your session has expired. Please sign in again." : body?.detail || body?.message || "The request could not be completed. Please try again.", response.status, intent?.requestId, uncertain);
  }
  if (!intent) return body;
  const receiptId = response.headers.get("X-Mutation-Receipt");
  if (!receiptId || response.headers.get("Idempotency-Applied") !== "true") {
    // Older servers cannot promise reliable recovery: don't silently claim ledger confidence.
    throw new RequestError("Save received, but its receipt could not be verified. Retry this same entry to check before adding another.", response.status, intent.requestId, true);
  }
  acknowledgeIntent(intent);
  return withReceipt(body, { requestId: receiptId, replayed: response.headers.get("Idempotency-Replayed") === "true", status: "SAVED" });
}
