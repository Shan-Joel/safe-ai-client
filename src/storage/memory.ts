import { systemClock, type Clock } from "../clock";
import type { Storage } from "./types";

interface Entry {
  value: unknown;
  /** Epoch ms when this entry expires, or null for no expiry. */
  expiresAt: number | null;
}

/**
 * In-memory `Storage` adapter. TTL is enforced lazily on access (no timers),
 * which keeps it edge-runtime safe and leak-free.
 */
export function memoryStorage(clock: Clock = systemClock): Storage {
  const map = new Map<string, Entry>();

  const live = (key: string): Entry | undefined => {
    const entry = map.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt !== null && entry.expiresAt <= clock()) {
      map.delete(key);
      return undefined;
    }
    return entry;
  };

  const expiryFor = (ttlMs: number | undefined): number | null =>
    ttlMs != null ? clock() + ttlMs : null;

  return {
    async get<T>(key: string): Promise<T | undefined> {
      return live(key)?.value as T | undefined;
    },
    async set<T>(key: string, value: T, ttlMs?: number): Promise<void> {
      map.set(key, { value, expiresAt: expiryFor(ttlMs) });
    },
    async increment(key: string, by: number, ttlMs?: number): Promise<number> {
      const entry = live(key);
      const current = typeof entry?.value === "number" ? entry.value : 0;
      const next = current + by;
      map.set(key, {
        value: next,
        expiresAt: entry?.expiresAt ?? expiryFor(ttlMs),
      });
      return next;
    },
    async delete(key: string): Promise<void> {
      map.delete(key);
    },
  };
}
