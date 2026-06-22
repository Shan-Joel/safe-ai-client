// Factory + types
export { createGuard } from "./core/guard";
export type { GuardConfig, RunOptions, GuardedFetchOptions, Guard } from "./core/guard";

// Shared types
export type {
  TokenUsage,
  UsageRecord,
  UsageSnapshot,
  EnforcementMode,
  Limits,
  BudgetConfig,
} from "./types";

// Errors
export { SafeAiError, ConfigError, RateLimitError, BudgetExceededError } from "./errors";

// Clock
export { systemClock } from "./clock";
export type { Clock } from "./clock";

// Storage
export { memoryStorage } from "./storage/memory";
export type { Storage } from "./storage/types";

// Rate limiters (advanced)
export { slidingWindowLimiter } from "./rate-limit/sliding-window";
export { tokenBucketLimiter } from "./rate-limit/token-bucket";
export type { RateLimiter, RateDecision } from "./rate-limit/types";

// Pricing
export { builtInPricing, PRICING_SNAPSHOT_DATE } from "./pricing/registry";
export type { ModelPricing, ProviderPricing, PricingRegistry } from "./pricing/types";

// Cost helpers
export { calculateCost, lookupPricing, estimateTokensFromText } from "./core/cost-engine";

// Hooks + events
export type {
  Hooks,
  RequestStartEvent,
  RequestEndEvent,
  CostEvent,
  LimitEvent,
  BudgetWarningEvent,
  BudgetExceededEvent,
} from "./hooks";

/** Package version. */
export const VERSION = "0.1.0";
