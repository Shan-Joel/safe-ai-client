/** Token counts for a single request. */
export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
}

/** A recorded, cost-resolved usage event. */
export interface UsageRecord {
  provider: string;
  model: string;
  key: string;
  inputTokens: number;
  outputTokens: number;
  costUSD: number;
  /** True when cost was derived from an estimate/heuristic or unknown pricing, not real response usage. */
  estimated: boolean;
  timestamp: number;
  requestId: string;
}

/** How the guard reacts when a budget would be/was exceeded. Rate limits always hard-reject. */
export type EnforcementMode = "block" | "warn" | "track";

export interface Limits {
  requestsPerMinute?: number;
  requestsPerDay?: number;
}

export interface BudgetConfig {
  dailyUSD?: number;
  monthlyUSD?: number;
  /** Warning ratios in (0, 1]. Default [0.8, 0.9]. Each fires at most once per period. */
  warnAt?: number[];
}

export interface UsageSnapshot {
  today: { costUSD: number; requests: number };
  month: { costUSD: number; requests: number; remainingBudgetUSD: number | null };
  window: { requestsThisMinute: number; requestsToday: number };
}
