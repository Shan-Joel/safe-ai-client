export interface RateDecision {
  allowed: boolean;
  /** Milliseconds until a slot frees up (0 when allowed). */
  retryAfterMs: number;
}

export interface RateLimiter {
  /** Would a request be allowed right now? Does not consume a slot. */
  check(key: string, now: number): Promise<RateDecision>;
  /** Record that a request happened. */
  consume(key: string, now: number): Promise<void>;
  /** Number of requests counted in the current window. */
  count(key: string, now: number): Promise<number>;
  /** Clear all state for a key. */
  reset(key: string): Promise<void>;
}
