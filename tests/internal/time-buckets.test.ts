import { describe, expect, it } from "vitest";
import { dayBucket, monthBucket } from "../../src/internal/time-buckets";

describe("time-buckets", () => {
  it("derives UTC day and month buckets", () => {
    const ts = Date.UTC(2026, 5, 22, 13, 30); // 2026-06-22T13:30Z
    expect(dayBucket(ts)).toBe("2026-06-22");
    expect(monthBucket(ts)).toBe("2026-06");
  });
});
