/**
 * Simple in-memory circuit breaker for OpenAI calls.
 * After too many failures in a window, skip OpenAI and use fallback until cooldown.
 */

const MAX_FAILURES = 3;
const COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes

let failureCount = 0;
let lastFailureAt = 0;

export function isOpenAICircuitOpen(): boolean {
  const now = Date.now();
  if (now - lastFailureAt > COOLDOWN_MS) {
    failureCount = 0;
    return false;
  }
  return failureCount >= MAX_FAILURES;
}

export function recordOpenAIFailure(): void {
  failureCount += 1;
  lastFailureAt = Date.now();
}

export function recordOpenAISuccess(): void {
  failureCount = 0;
}
