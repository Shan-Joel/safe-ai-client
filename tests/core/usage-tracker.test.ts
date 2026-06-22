import { describe, expect, it } from "vitest";
import { memoryStorage } from "../../src/storage/memory";
import { createUsageTracker } from "../../src/core/usage-tracker";
import type { UsageRecord } from "../../src/types";

const rec = (over: Partial<UsageRecord>): UsageRecord => ({
  provider: "your-provider",
  model: "your-model",
  key: "u1",
  inputTokens: 100,
  outputTokens: 50,
  costUSD: 0.5,
  estimated: false,
  timestamp: Date.UTC(2026, 5, 22, 10),
  requestId: "r",
  ...over,
});

describe("usage-tracker", () => {
  it("accumulates cost and request counts per day and month", async () => {
    const tracker = createUsageTracker(memoryStorage());
    const now = Date.UTC(2026, 5, 22, 10);
    await tracker.record(rec({ costUSD: 0.5 }));
    await tracker.record(rec({ costUSD: 0.25 }));
    expect(await tracker.getDayCost("u1", now)).toBeCloseTo(0.75, 10);
    expect(await tracker.getDayRequests("u1", now)).toBe(2);
    expect(await tracker.getMonthCost("u1", now)).toBeCloseTo(0.75, 10);
    expect(await tracker.getMonthRequests("u1", now)).toBe(2);
  });

  it("separates different days within the same month", async () => {
    const tracker = createUsageTracker(memoryStorage());
    const day22 = Date.UTC(2026, 5, 22, 10);
    const day23 = Date.UTC(2026, 5, 23, 10);
    await tracker.record(rec({ timestamp: day22, costUSD: 1 }));
    await tracker.record(rec({ timestamp: day23, costUSD: 2 }));
    expect(await tracker.getDayCost("u1", day22)).toBeCloseTo(1, 10);
    expect(await tracker.getDayCost("u1", day23)).toBeCloseTo(2, 10);
    expect(await tracker.getMonthCost("u1", day23)).toBeCloseTo(3, 10);
  });

  it("returns zero for keys with no usage and supports reset", async () => {
    const tracker = createUsageTracker(memoryStorage());
    const now = Date.UTC(2026, 5, 22, 10);
    expect(await tracker.getDayCost("nobody", now)).toBe(0);
    await tracker.record(rec({ costUSD: 1 }));
    await tracker.reset("u1", now);
    expect(await tracker.getDayCost("u1", now)).toBe(0);
    expect(await tracker.getMonthCost("u1", now)).toBe(0);
  });
});
