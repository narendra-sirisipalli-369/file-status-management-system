/**
 * In-memory sliding-window rate limiter. Fine for this app's single-process
 * deployment (no Docker/cluster — see project notes); a multi-instance
 * deployment would need a shared store (e.g. Redis) instead, since each
 * process would otherwise track its own separate counts.
 */
const attempts = new Map<string, number[]>()

/** Returns true if `key` has hit `max` attempts within `windowMs`; also records this attempt. */
export function isRateLimited(key: string, max: number, windowMs: number): boolean {
  const now = Date.now()
  const recent = (attempts.get(key) ?? []).filter((t) => now - t < windowMs)
  recent.push(now)
  attempts.set(key, recent)
  return recent.length > max
}
