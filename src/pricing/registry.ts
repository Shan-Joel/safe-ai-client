import type { PricingRegistry } from "./types";

/**
 * Date of this pricing template. Prices here are illustrative PLACEHOLDERS, not real
 * provider rates. Always set `pricing` in `createGuard` with your own model rates.
 */
export const PRICING_SNAPSHOT_DATE = "2026-06-22";

/**
 * Illustrative placeholder pricing (USD per 1k tokens). These are NOT real rates for
 * any provider — they exist only so examples produce a non-zero number out of the box.
 *
 * Provide your own rates per provider/model via `createGuard({ pricing })`, e.g.:
 *
 *   pricing: { "your-provider": { "your-model": { inputPer1k: 0.001, outputPer1k: 0.002 } } }
 */
export const builtInPricing: PricingRegistry = {
  "your-provider": {
    "your-model": { inputPer1k: 0.001, outputPer1k: 0.002 },
  },
};
