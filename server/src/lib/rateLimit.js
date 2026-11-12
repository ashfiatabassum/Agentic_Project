// Fixed-window, in-memory rate limiter (PRD §10 Q9). Counters live in this process only
// and reset when the server restarts — acceptable for a single-instance MVP.

export function createRateLimiter({ windowMs, max }) {
  const entries = new Map(); // key -> { count, resetAt }

  function entry(key, now) {
    let e = entries.get(key);
    if (!e || e.resetAt <= now) {
      e = { count: 0, resetAt: now + windowMs };
      entries.set(key, e);
    }
    return e;
  }

  function prune(now) {
    if (entries.size < 10_000) return;
    for (const [key, e] of entries) if (e.resetAt <= now) entries.delete(key);
  }

  return {
    /** True when `key` has already used up its allowance in the current window. */
    isLimited(key) {
      return entry(key, Date.now()).count >= max;
    },
    /** Records one counted attempt for `key`. */
    hit(key) {
      const now = Date.now();
      prune(now);
      entry(key, now).count += 1;
    },
    /** Gives back one attempt (for example after a successful login). */
    undo(key) {
      const e = entries.get(key);
      if (e && e.count > 0) e.count -= 1;
    },
    /** Seconds until the window for `key` resets (for the Retry-After header). */
    retryAfter(key) {
      const now = Date.now();
      return Math.max(1, Math.ceil((entry(key, now).resetAt - now) / 1000));
    },
  };
}
