import { describe, expect, it } from "vitest";
import { memoryStorage } from "../../src/storage/memory";
import { tokenBucketLimiter } from "../../src/rate-limit/token-bucket";

describe("tokenBucketLimiter", () => {
  it("allows up to capacity then refills over time", async () => {
    // capacity 2, refill 1 token per 1000ms
    const rl = tokenBucketLimiter({
      storage: memoryStorage(() => 0),
      capacity: 2,
      refillPerMs: 1 / 1000,
      prefix: "tb",
    });
    await rl.consume("k", 0);
    await rl.consume("k", 0);
    expect((await rl.check("k", 0)).allowed).toBe(false);
    // after 1000ms one token has refilled
    expect((await rl.check("k", 1000)).allowed).toBe(true);
  });

  it("reports retryAfterMs until the next token", async () => {
    const rl = tokenBucketLimiter({
      storage: memoryStorage(() => 0),
      capacity: 1,
      refillPerMs: 1 / 1000,
      prefix: "tb",
    });
    await rl.consume("k", 0);
    const decision = await rl.check("k", 0);
    expect(decision.allowed).toBe(false);
    expect(decision.retryAfterMs).toBe(1000);
  });

  it("counts consumed tokens and supports reset", async () => {
    const rl = tokenBucketLimiter({
      storage: memoryStorage(() => 0),
      capacity: 3,
      refillPerMs: 1 / 1000,
      prefix: "tb",
    });
    await rl.consume("k", 0);
    await rl.consume("k", 0);
    expect(await rl.count("k", 0)).toBe(2);
    await rl.reset("k");
    expect(await rl.count("k", 0)).toBe(0);
  });
});
