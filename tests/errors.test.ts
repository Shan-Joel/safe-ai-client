import { describe, expect, it } from "vitest";
import {
  BudgetExceededError,
  ConfigError,
  RateLimitError,
  SafeAiError,
} from "../src/errors";

describe("errors", () => {
  it("RateLimitError carries scope, limit, retryAfterMs and is a SafeAiError", () => {
    const err = new RateLimitError("minute", 60, 1500);
    expect(err).toBeInstanceOf(SafeAiError);
    expect(err.name).toBe("RateLimitError");
    expect(err.scope).toBe("minute");
    expect(err.limit).toBe(60);
    expect(err.retryAfterMs).toBe(1500);
  });

  it("BudgetExceededError carries scope, limitUSD, projectedUSD", () => {
    const err = new BudgetExceededError("daily", 5, 6.2);
    expect(err).toBeInstanceOf(SafeAiError);
    expect(err.scope).toBe("daily");
    expect(err.limitUSD).toBe(5);
    expect(err.projectedUSD).toBe(6.2);
  });

  it("ConfigError is a SafeAiError", () => {
    expect(new ConfigError("bad")).toBeInstanceOf(SafeAiError);
  });
});
