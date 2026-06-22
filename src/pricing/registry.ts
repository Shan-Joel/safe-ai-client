import type { PricingRegistry } from "./types";

/**
 * Date of this pricing snapshot. Prices are ESTIMATES for convenience and may be
 * out of date. Always override `pricing` in `createGuard` for billing-critical use.
 */
export const PRICING_SNAPSHOT_DATE = "2026-06-22";

/**
 * Built-in estimated price snapshot (USD per 1k tokens). NOT authoritative.
 * Override per provider/model via `createGuard({ pricing })`.
 */
export const builtInPricing: PricingRegistry = {
  openai: {
    "gpt-4o": { inputPer1k: 0.0025, outputPer1k: 0.01 },
    "gpt-4o-mini": { inputPer1k: 0.00015, outputPer1k: 0.0006 },
    "gpt-4.1": { inputPer1k: 0.002, outputPer1k: 0.008 },
    "gpt-4.1-mini": { inputPer1k: 0.0004, outputPer1k: 0.0016 },
    "o3-mini": { inputPer1k: 0.0011, outputPer1k: 0.0044 },
  },
  anthropic: {
    "claude-opus-4": { inputPer1k: 0.015, outputPer1k: 0.075 },
    "claude-sonnet-4": { inputPer1k: 0.003, outputPer1k: 0.015 },
    "claude-haiku-3.5": { inputPer1k: 0.0008, outputPer1k: 0.004 },
  },
};
