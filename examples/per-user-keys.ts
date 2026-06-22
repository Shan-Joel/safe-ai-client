import { createGuard } from "safe-ai-client";

// Enforce per-user limits and budgets by passing a `key` per request.
const guard = createGuard({
  limits: { requestsPerMinute: 10 },
  budget: { dailyUSD: 1 },
});

async function handleUserRequest(userId: string, prompt: string) {
  return guard.run({
    provider: "openai",
    model: "gpt-4o-mini",
    key: userId, // each user gets their own rate-limit + budget bucket
    execute: () => callOpenAI(prompt),
  });
}

declare function callOpenAI(
  prompt: string,
): Promise<{ usage: { prompt_tokens: number; completion_tokens: number } }>;
void handleUserRequest;
