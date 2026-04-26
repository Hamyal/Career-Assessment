/**
 * Normalize thrown values (Error, Postgrest/Storage-like objects, strings) for API responses.
 * Supabase often throws objects that are not `instanceof Error`.
 */
const MAX_LEN = 900;

export function toErrorMessage(err: unknown, fallback: string): string {
  if (typeof err === 'string') {
    const t = err.trim();
    return t ? t.slice(0, MAX_LEN) : fallback;
  }
  if (err instanceof Error) {
    const m = err.message?.trim();
    return m ? m.slice(0, MAX_LEN) : fallback;
  }
  if (err && typeof err === 'object') {
    const o = err as Record<string, unknown>;
    if (typeof o.message === 'string' && o.message.trim()) {
      return o.message.trim().slice(0, MAX_LEN);
    }
    if (typeof o.details === 'string' && o.details.trim()) {
      return o.details.trim().slice(0, MAX_LEN);
    }
    if (typeof o.hint === 'string' && o.hint.trim()) {
      return o.hint.trim().slice(0, MAX_LEN);
    }
  }
  try {
    const s = JSON.stringify(err);
    return (s.length > MAX_LEN ? `${s.slice(0, MAX_LEN)}…` : s) || fallback;
  } catch {
    return fallback;
  }
}
