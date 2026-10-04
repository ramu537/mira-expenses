// Store only opaque hashes and request IDs, never descriptions, amounts or files.
const memory = new Map();
const prefix = "mira:expense:pending:v1:";
export async function digest(value) {
  const bytes = typeof value === "string" ? new TextEncoder().encode(value) : value;
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash), byte => byte.toString(16).padStart(2, "0")).join("");
}
export async function mutationIntent(owner, method, path, fingerprint) {
  const key = prefix + await digest(JSON.stringify([owner, method, path, fingerprint]));
  let requestId = memory.get(key);
  try { requestId ||= sessionStorage.getItem(key); } catch { /* storage may be disabled */ }
  const retry = Boolean(requestId);
  requestId ||= crypto.randomUUID();
  memory.set(key, requestId);
  try { sessionStorage.setItem(key, requestId); } catch { /* memory protects this session */ }
  return { key, requestId, retry };
}
export function acknowledgeIntent(intent) {
  memory.delete(intent.key);
  try { sessionStorage.removeItem(intent.key); } catch { /* optional persistence */ }
}
export function withReceipt(body, receipt) {
  if (Array.isArray(body)) return body.map(item => ({ ...item, mutationReceipt: receipt }));
  return body && typeof body === "object" ? { ...body, mutationReceipt: receipt } : { mutationReceipt: receipt };
}
export function retainInterpretation(next, previous) {
  if (next.assistantInterpretation || !previous?.assistantInterpretation || next.month !== previous.month) return next;
  return { ...next, assistantInterpretation: previous.assistantInterpretation,
    assistantGeneratedAt: previous.assistantGeneratedAt, assistantEvidenceKeys: previous.assistantEvidenceKeys,
    intelligenceEvidence: previous.intelligenceEvidence, interpretationStale: true };
}
