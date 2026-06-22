import type { Storage } from "../storage/types";
import type { RateDecision, RateLimiter } from "./types";
import { buildKey } from "../internal/keys";

export interface SlidingWindowOptions {
  storage: Storage;
  limit: number;
  windowMs: number;
  prefix: string;
}

/** Sliding-window log limiter: stores request timestamps and prunes by the injected `now`. */
export function slidingWindowLimiter(opts: SlidingWindowOptions): RateLimiter {
  const keyFor = (key: string) => buildKey(opts.prefix, key);

  const recent = async (key: string, now: number): Promise<number[]> => {
    const all = (await opts.storage.get<number[]>(keyFor(key))) ?? [];
    const cutoff = now - opts.windowMs;
    return all.filter((t) => t > cutoff);
  };

  return {
    async check(key: string, now: number): Promise<RateDecision> {
      const timestamps = await recent(key, now);
      if (timestamps.length < opts.limit) {
        return { allowed: true, retryAfterMs: 0 };
      }
      const oldest = timestamps[0]!;
      return { allowed: false, retryAfterMs: oldest + opts.windowMs - now };
    },
    async consume(key: string, now: number): Promise<void> {
      const timestamps = await recent(key, now);
      timestamps.push(now);
      await opts.storage.set(keyFor(key), timestamps, opts.windowMs);
    },
    async count(key: string, now: number): Promise<number> {
      return (await recent(key, now)).length;
    },
    async reset(key: string): Promise<void> {
      await opts.storage.delete(keyFor(key));
    },
  };
}
