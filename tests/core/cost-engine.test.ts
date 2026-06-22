import { describe, expect, it } from "vitest";
import {
  calculateCost,
  estimateTokensFromText,
  lookupPricing,
} from "../../src/core/cost-engine";
import { builtInPricing } from "../../src/pricing/registry";

describe("cost-engine", () => {
  it("calculates cost from tokens and per-1k pricing", () => {
    const cost = calculateCost(
      { inputTokens: 1000, outputTokens: 2000 },
      { inputPer1k: 0.01, outputPer1k: 0.03 },
    );
    // 1*0.01 + 2*0.03 = 0.07
    expect(cost).toBeCloseTo(0.07, 10);
  });

  it("returns zero cost for zero tokens", () => {
    expect(
      calculateCost({ inputTokens: 0, outputTokens: 0 }, { inputPer1k: 1, outputPer1k: 1 }),
    ).toBe(0);
  });

  it("looks up pricing by provider and model", () => {
    expect(lookupPricing(builtInPricing, "openai", "gpt-4o-mini")).toEqual({
      inputPer1k: 0.00015,
      outputPer1k: 0.0006,
    });
    expect(lookupPricing(builtInPricing, "openai", "unknown-model")).toBeUndefined();
    expect(lookupPricing(builtInPricing, "unknown", "x")).toBeUndefined();
  });

  it("estimates tokens from text length", () => {
    expect(estimateTokensFromText("12345678")).toBe(2); // 8 chars / 4
    expect(estimateTokensFromText("abc")).toBe(1); // ceil(3/4)
    expect(estimateTokensFromText("")).toBe(0);
  });
});
