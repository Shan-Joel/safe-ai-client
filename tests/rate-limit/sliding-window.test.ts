import { describe, expect, it } from "vitest";
import { memoryStorage } from "../../src/storage/memory";
import { slidingWindowLimiter } from "../../src/rate-limit/sliding-window";

const make = (now: () => number) =>
  slidingWindowLimiter({
    storage: memoryStorage(now),
    limit: 2,
    windowMs: 1000,
    prefix: "test",
  });

describe("slidingWindowLimiter", () => {
  it("allows up to `limit` requests within the window", async () => {
    const t = 0;
    const rl = make(() => t);
    expect((await rl.check("k", t)).allowed).toBe(true);
    await rl.consume("k", t);
    await rl.consume("k", t);
    const decision = await rl.check("k", t);
    expect(decision.allowed).toBe(false);
    expect(decision.retryAfterMs).toBe(1000); // oldest(0) + window(1000) - now(0)
  });

  it("frees slots as the window slides", async () => {
    let t = 0;
    const rl = make(() => t);
    await rl.consume("k", 0);
    await rl.consume("k", 500);
    t = 1001; // first timestamp (0) is now outside the 1000ms window
    expect((await rl.check("k", t)).allowed).toBe(true);
  });

  it("counts requests in the current window", async () => {
    const t = 0;
    const rl = make(() => t);
    await rl.consume("k", 0);
    await rl.consume("k", 100);
    expect(await rl.count("k", 200)).toBe(2);
    expect(await rl.count("k", 1101)).toBe(0);
  });

  it("isolates keys and supports reset", async () => {
    const rl = make(() => 0);
    await rl.consume("a", 0);
    expect(await rl.count("a", 0)).toBe(1);
    expect(await rl.count("b", 0)).toBe(0);
    await rl.reset("a");
    expect(await rl.count("a", 0)).toBe(0);
  });
});
