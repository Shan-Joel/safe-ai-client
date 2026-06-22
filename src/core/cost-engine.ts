import type { TokenUsage } from "../types";
import type { ModelPricing, PricingRegistry } from "../pricing/types";

/** Compute USD cost for a request given token counts and per-1k pricing. */
export function calculateCost(tokens: TokenUsage, pricing: ModelPricing): number {
  return (
    (tokens.inputTokens / 1000) * pricing.inputPer1k +
    (tokens.outputTokens / 1000) * pricing.outputPer1k
  );
}

/** Look up pricing for a provider+model, or undefined if unknown. */
export function lookupPricing(
  registry: PricingRegistry,
  provider: string,
  model: string,
): ModelPricing | undefined {
  return registry[provider]?.[model];
}

/** Rough heuristic token estimate (~4 chars/token) for callers lacking real counts. */
export function estimateTokensFromText(text: string): number {
  return Math.ceil(text.length / 4);
}
