/**
 * Minimal async key/value contract. The memory adapter ships in core; a Redis/KV
 * adapter implements the same interface (e.g. INCR for `increment`, ZSET for windows).
 */
export interface Storage {
  get<T>(key: string): Promise<T | undefined>;
  set<T>(key: string, value: T, ttlMs?: number): Promise<void>;
  /** Atomically add `by` to the numeric value at `key` (creating it at 0), returning the new value. */
  increment(key: string, by: number, ttlMs?: number): Promise<number>;
  delete(key: string): Promise<void>;
}
