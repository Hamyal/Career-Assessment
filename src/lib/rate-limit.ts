/**
 * In-memory rate limit for submit API. Per-IP, per window.
 * For production at scale, use Redis or similar.
 */

const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_SUBMITS_PER_IP = 10;

const hits = new Map<string, { count: number; resetAt: number }>();

function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  const real = request.headers.get('x-real-ip');
  if (real) return real;
  return 'unknown';
}

export function checkSubmitRateLimit(request: Request): { ok: true } | { ok: false; status: number; body: { error: string } } {
  const ip = getClientIp(request);
  const now = Date.now();
  let entry = hits.get(ip);
  if (!entry || now > entry.resetAt) {
    entry = { count: 1, resetAt: now + WINDOW_MS };
    hits.set(ip, entry);
    return { ok: true };
  }
  entry.count += 1;
  if (entry.count > MAX_SUBMITS_PER_IP) {
    return {
      ok: false,
      status: 429,
      body: { error: 'Too many submissions. Please try again later.' },
    };
  }
  return { ok: true };
}

const CHAT_WINDOW_MS = 15 * 60 * 1000;
const MAX_CHAT_TRANSITION_PER_IP = 60;
const chatHits = new Map<string, { count: number; resetAt: number }>();

export function checkChatTransitionRateLimit(request: Request): { ok: true } | { ok: false; status: number; body: { error: string } } {
  const ip = getClientIp(request);
  const now = Date.now();
  let entry = chatHits.get(ip);
  if (!entry || now > entry.resetAt) {
    entry = { count: 1, resetAt: now + CHAT_WINDOW_MS };
    chatHits.set(ip, entry);
    return { ok: true };
  }
  entry.count += 1;
  if (entry.count > MAX_CHAT_TRANSITION_PER_IP) {
    return {
      ok: false,
      status: 429,
      body: { error: 'Too many requests. Please slow down.' },
    };
  }
  return { ok: true };
}
