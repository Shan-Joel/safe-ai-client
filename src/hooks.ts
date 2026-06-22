import type { TokenUsage, UsageRecord } from "./types";

export interface RequestStartEvent {
  provider: string;
  model: string;
  key: string;
  requestId: string;
  timestamp: number;
  estimate?: TokenUsage;
}

export interface RequestEndEvent {
  usage: UsageRecord;
  durationMs: number;
}

export interface CostEvent {
  usage: UsageRecord;
}

export interface LimitEvent {
  scope: "minute" | "day";
  limit: number;
  key: string;
  retryAfterMs: number;
}

export interface BudgetWarningEvent {
  scope: "daily" | "monthly";
  ratio: number;
  limitUSD: number;
  spentUSD: number;
  key: string;
}

export interface BudgetExceededEvent {
  scope: "daily" | "monthly";
  limitUSD: number;
  spentUSD: number;
  key: string;
  phase: "preflight" | "posthoc";
}

export interface Hooks {
  onRequestStart?(event: RequestStartEvent): void | Promise<void>;
  onRequestEnd?(event: RequestEndEvent): void | Promise<void>;
  onCostCalculated?(event: CostEvent): void | Promise<void>;
  onLimitReached?(event: LimitEvent): void | Promise<void>;
  onBudgetWarning?(event: BudgetWarningEvent): void | Promise<void>;
  onBudgetExceeded?(event: BudgetExceededEvent): void | Promise<void>;
}

/**
 * Invoke an observer hook without ever letting its failure break the guard path.
 * Observers are for side effects (logging/metrics); they must not affect control flow.
 */
export async function safeInvoke<T>(
  fn: ((event: T) => void | Promise<void>) | undefined,
  event: T,
): Promise<void> {
  if (!fn) return;
  try {
    await fn(event);
  } catch {
    // Intentionally swallowed: observer errors must not affect enforcement.
  }
}
