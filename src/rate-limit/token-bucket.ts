import type { Storage } from "../storage/types";
import type { RateDecision, RateLimiter } from "./types";
import { buildKey } from "../internal/keys";

export interface TokenBucketOptions {
  storage: Storage;
  capacity: number;
  /** Tokens refilled per millisecond. */
  refillPerMs: number;
  prefix: string;
}

interface BucketState {
  tokens: number;
  last: number;
}

/** Classic token-bucket limiter. Exported as an alternative to the sliding window. */
export function tokenBucketLimiter(opts: TokenBucketOptions): RateLimiter {
  const keyFor = (key: string) => buildKey(opts.prefix, key);

  const refill = (state: BucketState, now: number): BucketState => {
    const elapsed = Math.max(0, now - state.last);
    const tokens = Math.min(opts.capacity, state.tokens + elapsed * opts.refillPerMs);
    return { tokens, last: now };
  };

  const load = async (key: string, now: number): Promise<BucketState> => {
    const stored = await opts.storage.get<BucketState>(keyFor(key));
    return refill(stored ?? { tokens: opts.capacity, last: now }, now);
  };

  const ttlMs = Math.ceil(opts.capacity / opts.refillPerMs);

  return {
    async check(key: string, now: number): Promise<RateDecision> {
      const state = await load(key, now);
      if (state.tokens >= 1) return { allowed: true, retryAfterMs: 0 };
      const needed = 1 - state.tokens;
      return { allowed: false, retryAfterMs: Math.ceil(needed / opts.refillPerMs) };
    },
    async consume(key: string, now: number): Promise<void> {
      const state = await load(key, now);
      const next: BucketState = { tokens: Math.max(0, state.tokens - 1), last: now };
      await opts.storage.set(keyFor(key), next, ttlMs);
    },
    async count(key: string, now: number): Promise<number> {
      const state = await load(key, now);
      return Math.floor(opts.capacity - state.tokens);
    },
    async reset(key: string): Promise<void> {
      await opts.storage.delete(keyFor(key));
    },
  };
}
