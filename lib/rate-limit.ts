/**
 * In-memory rate limit. Простой sliding window per-key.
 * Достаточно для MVP: один процесс, один счётчик. На многопроцессном проде
 * заменить на Redis/Upstash.
 */
const buckets = new Map<string, number[]>();

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): { ok: boolean; remaining: number; retryAfterMs: number } {
  const now = Date.now();
  const arr = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (arr.length >= limit) {
    const oldest = arr[0] ?? now;
    return {
      ok: false,
      remaining: 0,
      retryAfterMs: Math.max(0, windowMs - (now - oldest)),
    };
  }
  arr.push(now);
  buckets.set(key, arr);
  return { ok: true, remaining: limit - arr.length, retryAfterMs: 0 };
}

export function llmHourLimit(): number {
  const raw = Number(process.env.LLM_REQUESTS_PER_HOUR ?? "30");
  return Number.isFinite(raw) && raw > 0 ? raw : 30;
}
