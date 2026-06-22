export class SafeAiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

export class ConfigError extends SafeAiError {}

export class RateLimitError extends SafeAiError {
  readonly scope: "minute" | "day";
  readonly limit: number;
  readonly retryAfterMs: number;

  constructor(scope: "minute" | "day", limit: number, retryAfterMs: number) {
    super(`Rate limit exceeded (${scope}): limit ${limit}, retry after ${retryAfterMs}ms`);
    this.scope = scope;
    this.limit = limit;
    this.retryAfterMs = retryAfterMs;
  }
}

export class BudgetExceededError extends SafeAiError {
  readonly scope: "daily" | "monthly";
  readonly limitUSD: number;
  readonly projectedUSD: number;

  constructor(scope: "daily" | "monthly", limitUSD: number, projectedUSD: number) {
    super(`Budget exceeded (${scope}): limit $${limitUSD}, projected $${projectedUSD}`);
    this.scope = scope;
    this.limitUSD = limitUSD;
    this.projectedUSD = projectedUSD;
  }
}
