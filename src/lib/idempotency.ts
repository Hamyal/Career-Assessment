/**
 * In-memory idempotency for submit API. Same key within TTL returns cached response.
 * For production at scale, use Redis or DB.
 */

const TTL_MS = 10 * 60 * 1000; // 10 minutes

type Entry = { response: unknown; status: number; timestamp: number };
const store = new Map<string, Entry>();

function prune(): void {
  const now = Date.now();
  for (const [k, v] of store.entries()) {
    if (now - v.timestamp > TTL_MS) store.delete(k);
  }
}

export function getIdempotencyKey(request: Request): string | null {
  return request.headers.get('idempotency-key')?.trim() || null;
}

export function getCachedResponse(key: string): { response: unknown; status: number } | null {
  prune();
  const entry = store.get(key);
  if (!entry || Date.now() - entry.timestamp > TTL_MS) return null;
  return { response: entry.response, status: entry.status };
}

export function setCachedResponse(key: string, response: unknown, status: number): void {
  prune();
  store.set(key, { response, status, timestamp: Date.now() });
}
