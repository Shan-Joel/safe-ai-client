import { describe, expect, it, vi } from "vitest";
import { createGuard } from "../../src/core/guard";
import { RateLimitError, BudgetExceededError, ConfigError } from "../../src/errors";
import { memoryStorage } from "../../src/storage/memory";

const pricing = { "your-provider": { "your-model": { inputPer1k: 0.01, outputPer1k: 0.03 } } };

const fakeClockGuard = (overrides = {}) => {
  let now = Date.UTC(2026, 5, 22, 10, 0, 0);
  const clock = () => now;
  const setNow = (t: number) => {
    now = t;
  };
  const guard = createGuard({
    clock,
    storage: memoryStorage(clock),
    pricing,
    ...overrides,
  });
  return { guard, setNow, clock };
};

describe("createGuard validation", () => {
  it("throws ConfigError on invalid limits", () => {
    expect(() => createGuard({ limits: { requestsPerMinute: 0 } })).toThrow(ConfigError);
    expect(() => createGuard({ limits: { requestsPerMinute: -1 } })).toThrow(ConfigError);
  });

  it("throws ConfigError on invalid warnAt ratios", () => {
    expect(() => createGuard({ budget: { dailyUSD: 5, warnAt: [1.5] } })).toThrow(ConfigError);
  });
});

describe("guard.run", () => {
  it("returns data and computed usage from response usage", async () => {
    const { guard } = fakeClockGuard();
    const { data, usage } = await guard.run({
      provider: "your-provider",
      model: "your-model",
      execute: async () => ({ ok: true, usage: { prompt_tokens: 1000, completion_tokens: 1000 } }),
    });
    expect(data).toEqual({ ok: true, usage: { prompt_tokens: 1000, completion_tokens: 1000 } });
    expect(usage.inputTokens).toBe(1000);
    expect(usage.outputTokens).toBe(1000);
    expect(usage.costUSD).toBeCloseTo(0.04, 10); // 1*0.01 + 1*0.03
    expect(usage.estimated).toBe(false);
  });

  it("enforces requests-per-minute and throws RateLimitError", async () => {
    const { guard } = fakeClockGuard({ limits: { requestsPerMinute: 1 } });
    const call = () =>
      guard.run({
        provider: "your-provider",
        model: "your-model",
        execute: async () => ({ usage: { prompt_tokens: 1, completion_tokens: 1 } }),
      });
    await call();
    await expect(call()).rejects.toBeInstanceOf(RateLimitError);
  });

  it("blocks pre-flight when an estimate would exceed the daily budget", async () => {
    const { guard } = fakeClockGuard({ budget: { dailyUSD: 0.01 }, enforcement: "block" });
    const execute = vi.fn(async () => ({ usage: { prompt_tokens: 1, completion_tokens: 1 } }));
    await expect(
      guard.run({
        provider: "your-provider",
        model: "your-model",
        estimate: { inputTokens: 1000, outputTokens: 1000 }, // est cost 0.04 > 0.01
        execute,
      }),
    ).rejects.toBeInstanceOf(BudgetExceededError);
    expect(execute).not.toHaveBeenCalled();
  });

  it("fires budget warning thresholds as cumulative spend crosses them", async () => {
    const onBudgetWarning = vi.fn();
    const { guard } = fakeClockGuard({
      budget: { dailyUSD: 0.08, warnAt: [0.5] }, // threshold at 0.04
      hooks: { onBudgetWarning },
    });
    await guard.run({
      provider: "your-provider",
      model: "your-model",
      execute: async () => ({ usage: { prompt_tokens: 1000, completion_tokens: 1000 } }), // cost 0.04
    });
    expect(onBudgetWarning).toHaveBeenCalledTimes(1);
    expect(onBudgetWarning.mock.calls[0]?.[0]).toMatchObject({ scope: "daily", ratio: 0.5 });
  });

  it("getUsage reports today/month cost, requests, and remaining budget", async () => {
    const { guard } = fakeClockGuard({ budget: { monthlyUSD: 1 } });
    await guard.run({
      provider: "your-provider",
      model: "your-model",
      key: "u1",
      execute: async () => ({ usage: { prompt_tokens: 1000, completion_tokens: 1000 } }),
    });
    const usage = await guard.getUsage("u1");
    expect(usage.today.requests).toBe(1);
    expect(usage.today.costUSD).toBeCloseTo(0.04, 10);
    expect(usage.month.remainingBudgetUSD).toBeCloseTo(0.96, 10);
  });

  it("reset clears tracked usage for a key", async () => {
    const { guard } = fakeClockGuard();
    await guard.run({
      provider: "your-provider",
      model: "your-model",
      key: "u1",
      execute: async () => ({ usage: { prompt_tokens: 10, completion_tokens: 10 } }),
    });
    await guard.reset("u1");
    const usage = await guard.getUsage("u1");
    expect(usage.today.requests).toBe(0);
    expect(usage.today.costUSD).toBe(0);
  });

  it("marks usage estimated when pricing is unknown", async () => {
    const { guard } = fakeClockGuard();
    const { usage } = await guard.run({
      provider: "your-provider",
      model: "no-such-model",
      execute: async () => ({ usage: { prompt_tokens: 10, completion_tokens: 10 } }),
    });
    expect(usage.costUSD).toBe(0);
    expect(usage.estimated).toBe(true);
  });

  it("does not block pre-flight under enforcement 'warn' even if estimate exceeds budget", async () => {
    const onBudgetExceeded = vi.fn();
    const { guard } = fakeClockGuard({
      budget: { dailyUSD: 0.01 },
      enforcement: "warn",
      hooks: { onBudgetExceeded },
    });
    const { usage } = await guard.run({
      provider: "your-provider",
      model: "your-model",
      estimate: { inputTokens: 1000, outputTokens: 1000 },
      execute: async () => ({ usage: { prompt_tokens: 1000, completion_tokens: 1000 } }),
    });
    expect(usage.costUSD).toBeCloseTo(0.04, 10); // call went through
    expect(onBudgetExceeded).toHaveBeenCalledWith(
      expect.objectContaining({ phase: "posthoc", scope: "daily" }),
    );
  });
});
