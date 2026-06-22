import type {
  BudgetConfig,
  EnforcementMode,
  Limits,
  TokenUsage,
  UsageRecord,
  UsageSnapshot,
} from "../types";
import type { PricingRegistry } from "../pricing/types";
import type { Storage } from "../storage/types";
import { type Clock, systemClock } from "../clock";
import { ConfigError, BudgetExceededError, RateLimitError } from "../errors";
import { memoryStorage } from "../storage/memory";
import { builtInPricing } from "../pricing/registry";
import { calculateCost, lookupPricing } from "./cost-engine";
import { createUsageTracker } from "./usage-tracker";
import { crossedThresholds, projectedExceeds, remaining } from "./budget-engine";
import { slidingWindowLimiter } from "../rate-limit/sliding-window";
import type { RateLimiter } from "../rate-limit/types";
import { type Hooks, safeInvoke } from "../hooks";
import { defaultExtractUsage } from "../internal/extract-usage";
import { newRequestId } from "../internal/request-id";
import { roundUSD } from "../internal/round";

const MINUTE_MS = 60_000;
const DAY_MS = 86_400_000;

export interface GuardConfig {
  limits?: Limits;
  budget?: BudgetConfig;
  pricing?: PricingRegistry;
  storage?: Storage;
  enforcement?: EnforcementMode;
  clock?: Clock;
  hooks?: Hooks;
}

export interface RunOptions<T> {
  provider: string;
  model: string;
  key?: string;
  estimate?: TokenUsage;
  execute: () => Promise<T>;
  extractUsage?: (result: T) => Partial<TokenUsage> | null | undefined;
}

export interface GuardedFetchOptions {
  key?: string;
  estimate?: TokenUsage;
}

export interface Guard {
  run<T>(opts: RunOptions<T>): Promise<{ data: T; usage: UsageRecord }>;
  guardedFetch(
    provider: string,
    model: string,
    input: string | URL | Request,
    init?: RequestInit,
    opts?: GuardedFetchOptions,
  ): Promise<{ data: Response; usage: UsageRecord }>;
  getUsage(key?: string): Promise<UsageSnapshot>;
  reset(key?: string): Promise<void>;
}

function assertPositive(value: number | undefined, name: string): void {
  if (value !== undefined && (!Number.isFinite(value) || value <= 0)) {
    throw new ConfigError(`${name} must be a positive number, got ${value}`);
  }
}

function validateConfig(config: GuardConfig): void {
  assertPositive(config.limits?.requestsPerMinute, "limits.requestsPerMinute");
  assertPositive(config.limits?.requestsPerDay, "limits.requestsPerDay");
  assertPositive(config.budget?.dailyUSD, "budget.dailyUSD");
  assertPositive(config.budget?.monthlyUSD, "budget.monthlyUSD");
  for (const ratio of config.budget?.warnAt ?? []) {
    if (!(ratio > 0 && ratio <= 1)) {
      throw new ConfigError(`budget.warnAt ratios must be in (0, 1], got ${ratio}`);
    }
  }
  if (config.enforcement && !["block", "warn", "track"].includes(config.enforcement)) {
    throw new ConfigError(`enforcement must be "block" | "warn" | "track"`);
  }
}

export function createGuard(config: GuardConfig = {}): Guard {
  validateConfig(config);

  const clock = config.clock ?? systemClock;
  const storage = config.storage ?? memoryStorage(clock);
  const pricing = config.pricing ?? builtInPricing;
  const enforcement = config.enforcement ?? "block";
  const hooks = config.hooks ?? {};
  const budget = config.budget;
  const warnAt = budget?.warnAt ?? [0.8, 0.9];

  const minuteLimiter: RateLimiter | null =
    config.limits?.requestsPerMinute != null
      ? slidingWindowLimiter({
          storage,
          limit: config.limits.requestsPerMinute,
          windowMs: MINUTE_MS,
          prefix: "sac:rl:min",
        })
      : null;
  const dayLimiter: RateLimiter | null =
    config.limits?.requestsPerDay != null
      ? slidingWindowLimiter({
          storage,
          limit: config.limits.requestsPerDay,
          windowMs: DAY_MS,
          prefix: "sac:rl:day",
        })
      : null;

  const tracker = createUsageTracker(storage);

  function resolveTokens<T>(
    opts: RunOptions<T>,
    data: T,
  ): { tokens: TokenUsage; estimated: boolean } {
    if (opts.extractUsage) {
      const u = opts.extractUsage(data);
      if (u && (u.inputTokens != null || u.outputTokens != null)) {
        return {
          tokens: { inputTokens: u.inputTokens ?? 0, outputTokens: u.outputTokens ?? 0 },
          estimated: false,
        };
      }
    }
    const auto = defaultExtractUsage(data);
    if (auto) return { tokens: auto, estimated: false };
    if (opts.estimate) return { tokens: opts.estimate, estimated: true };
    return { tokens: { inputTokens: 0, outputTokens: 0 }, estimated: true };
  }

  async function checkLimiter(
    limiter: RateLimiter | null,
    scope: "minute" | "day",
    limit: number | undefined,
    key: string,
    now: number,
  ): Promise<void> {
    if (!limiter || limit == null) return;
    const decision = await limiter.check(key, now);
    if (!decision.allowed) {
      await safeInvoke(hooks.onLimitReached, {
        scope,
        limit,
        key,
        retryAfterMs: decision.retryAfterMs,
      });
      throw new RateLimitError(scope, limit, decision.retryAfterMs);
    }
  }

  async function evaluateBudget(
    scope: "daily" | "monthly",
    prevUSD: number,
    newUSD: number,
    limitUSD: number | undefined,
    key: string,
  ): Promise<void> {
    if (limitUSD == null) return;
    for (const ratio of crossedThresholds(prevUSD, newUSD, limitUSD, warnAt)) {
      await safeInvoke(hooks.onBudgetWarning, { scope, ratio, limitUSD, spentUSD: newUSD, key });
    }
    if (prevUSD <= limitUSD && newUSD > limitUSD) {
      await safeInvoke(hooks.onBudgetExceeded, {
        scope,
        limitUSD,
        spentUSD: newUSD,
        key,
        phase: "posthoc",
      });
    }
  }

  async function run<T>(opts: RunOptions<T>): Promise<{ data: T; usage: UsageRecord }> {
    const key = opts.key ?? "default";
    const startedAt = clock();
    const requestId = newRequestId();

    // 1. Rate limit checks (always hard enforced).
    await checkLimiter(minuteLimiter, "minute", config.limits?.requestsPerMinute, key, startedAt);
    await checkLimiter(dayLimiter, "day", config.limits?.requestsPerDay, key, startedAt);

    // 2. Pre-flight budget check (only with an estimate and "block" enforcement).
    if (opts.estimate && enforcement === "block" && budget) {
      const modelPricing = lookupPricing(pricing, opts.provider, opts.model);
      if (modelPricing) {
        const estCost = calculateCost(opts.estimate, modelPricing);
        const dayCost = await tracker.getDayCost(key, startedAt);
        const monthCost = await tracker.getMonthCost(key, startedAt);
        const dayProj = projectedExceeds(dayCost, estCost, budget.dailyUSD);
        const monthProj = projectedExceeds(monthCost, estCost, budget.monthlyUSD);
        const exceeded =
          dayProj != null
            ? { scope: "daily" as const, limitUSD: budget.dailyUSD!, projectedUSD: dayProj }
            : monthProj != null
              ? { scope: "monthly" as const, limitUSD: budget.monthlyUSD!, projectedUSD: monthProj }
              : null;
        if (exceeded) {
          await safeInvoke(hooks.onBudgetExceeded, {
            scope: exceeded.scope,
            limitUSD: exceeded.limitUSD,
            spentUSD: exceeded.projectedUSD,
            key,
            phase: "preflight",
          });
          throw new BudgetExceededError(exceeded.scope, exceeded.limitUSD, exceeded.projectedUSD);
        }
      }
    }

    // 3. Commit: consume rate-limit slots.
    if (minuteLimiter) await minuteLimiter.consume(key, startedAt);
    if (dayLimiter) await dayLimiter.consume(key, startedAt);

    // 4. Capture pre-spend for threshold detection.
    const prevDay = budget ? await tracker.getDayCost(key, startedAt) : 0;
    const prevMonth = budget ? await tracker.getMonthCost(key, startedAt) : 0;

    await safeInvoke(hooks.onRequestStart, {
      provider: opts.provider,
      model: opts.model,
      key,
      requestId,
      timestamp: startedAt,
      estimate: opts.estimate,
    });

    // 5. Run the caller-owned request.
    const data = await opts.execute();
    const endedAt = clock();

    // 6. Resolve usage + cost.
    const { tokens, estimated } = resolveTokens(opts, data);
    const modelPricing = lookupPricing(pricing, opts.provider, opts.model);
    const costUSD = modelPricing ? roundUSD(calculateCost(tokens, modelPricing)) : 0;
    const usage: UsageRecord = {
      provider: opts.provider,
      model: opts.model,
      key,
      inputTokens: tokens.inputTokens,
      outputTokens: tokens.outputTokens,
      costUSD,
      estimated: estimated || !modelPricing,
      timestamp: endedAt,
      requestId,
    };

    // 7. Record + observability.
    await tracker.record(usage);
    await safeInvoke(hooks.onCostCalculated, { usage });
    await safeInvoke(hooks.onRequestEnd, { usage, durationMs: endedAt - startedAt });

    // 8. Budget warnings + post-hoc exceed notifications.
    if (budget) {
      await evaluateBudget("daily", prevDay, prevDay + costUSD, budget.dailyUSD, key);
      await evaluateBudget("monthly", prevMonth, prevMonth + costUSD, budget.monthlyUSD, key);
    }

    return { data, usage };
  }

  async function guardedFetch(
    provider: string,
    model: string,
    input: string | URL | Request,
    init?: RequestInit,
    opts?: GuardedFetchOptions,
  ): Promise<{ data: Response; usage: UsageRecord }> {
    let parsedUsage: TokenUsage | null = null;
    return run<Response>({
      provider,
      model,
      key: opts?.key,
      estimate: opts?.estimate,
      execute: async () => {
        const res = await fetch(input, init);
        const contentType = res.headers.get("content-type") ?? "";
        if (contentType.includes("application/json")) {
          try {
            parsedUsage = defaultExtractUsage(await res.clone().json());
          } catch {
            // Unparseable body: fall back to estimate via resolveTokens.
          }
        }
        return res;
      },
      extractUsage: () => parsedUsage,
    });
  }

  async function getUsage(key = "default"): Promise<UsageSnapshot> {
    const now = clock();
    const [dayCost, monthCost, dayReq, monthReq] = await Promise.all([
      tracker.getDayCost(key, now),
      tracker.getMonthCost(key, now),
      tracker.getDayRequests(key, now),
      tracker.getMonthRequests(key, now),
    ]);
    const requestsThisMinute = minuteLimiter ? await minuteLimiter.count(key, now) : 0;
    return {
      today: { costUSD: roundUSD(dayCost), requests: dayReq },
      month: {
        costUSD: roundUSD(monthCost),
        requests: monthReq,
        remainingBudgetUSD: remaining(monthCost, budget?.monthlyUSD),
      },
      window: { requestsThisMinute, requestsToday: dayReq },
    };
  }

  async function reset(key = "default"): Promise<void> {
    const now = clock();
    await tracker.reset(key, now);
    if (minuteLimiter) await minuteLimiter.reset(key);
    if (dayLimiter) await dayLimiter.reset(key);
  }

  return { run, guardedFetch, getUsage, reset };
}
