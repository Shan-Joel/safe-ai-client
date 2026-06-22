import type { Storage } from "../storage/types";
import type { UsageRecord } from "../types";
import { buildKey } from "../internal/keys";
import { dayBucket, monthBucket } from "../internal/time-buckets";

const DAY_TTL_MS = 2 * 24 * 60 * 60 * 1000; // 2 days
const MONTH_TTL_MS = 32 * 24 * 60 * 60 * 1000; // 32 days

export interface UsageTracker {
  record(rec: UsageRecord): Promise<void>;
  getDayCost(key: string, now: number): Promise<number>;
  getMonthCost(key: string, now: number): Promise<number>;
  getDayRequests(key: string, now: number): Promise<number>;
  getMonthRequests(key: string, now: number): Promise<number>;
  reset(key: string, now: number): Promise<void>;
}

export function createUsageTracker(storage: Storage): UsageTracker {
  const costDayKey = (key: string, ts: number) =>
    buildKey("sac", "cost", "day", key, dayBucket(ts));
  const costMonthKey = (key: string, ts: number) =>
    buildKey("sac", "cost", "month", key, monthBucket(ts));
  const reqDayKey = (key: string, ts: number) =>
    buildKey("sac", "req", "day", key, dayBucket(ts));
  const reqMonthKey = (key: string, ts: number) =>
    buildKey("sac", "req", "month", key, monthBucket(ts));

  const read = async (key: string): Promise<number> => (await storage.get<number>(key)) ?? 0;

  return {
    async record(r: UsageRecord): Promise<void> {
      await storage.increment(costDayKey(r.key, r.timestamp), r.costUSD, DAY_TTL_MS);
      await storage.increment(costMonthKey(r.key, r.timestamp), r.costUSD, MONTH_TTL_MS);
      await storage.increment(reqDayKey(r.key, r.timestamp), 1, DAY_TTL_MS);
      await storage.increment(reqMonthKey(r.key, r.timestamp), 1, MONTH_TTL_MS);
    },
    getDayCost: (key, now) => read(costDayKey(key, now)),
    getMonthCost: (key, now) => read(costMonthKey(key, now)),
    getDayRequests: (key, now) => read(reqDayKey(key, now)),
    getMonthRequests: (key, now) => read(reqMonthKey(key, now)),
    async reset(key, now): Promise<void> {
      await storage.delete(costDayKey(key, now));
      await storage.delete(costMonthKey(key, now));
      await storage.delete(reqDayKey(key, now));
      await storage.delete(reqMonthKey(key, now));
    },
  };
}
