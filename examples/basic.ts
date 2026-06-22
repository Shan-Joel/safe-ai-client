import { createGuard } from "safe-ai-client";

const guard = createGuard({
  limits: { requestsPerMinute: 60, requestsPerDay: 10_000 },
  budget: { dailyUSD: 5, monthlyUSD: 100, warnAt: [0.8, 0.9] },
  enforcement: "block",
  hooks: {
    onBudgetWarning: (e) => console.warn(`⚠️ ${e.scope} budget ${e.ratio * 100}% used`),
    onBudgetExceeded: (e) => console.error(`🛑 ${e.scope} budget exceeded ($${e.spentUSD})`),
  },
});

const { data, usage } = await guard.run({
  provider: "openai",
  model: "gpt-4o",
  estimate: { inputTokens: 1200, outputTokens: 800 },
  execute: () =>
    fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [{ role: "user", content: "Hello!" }],
      }),
    }).then((r) => r.json()),
});

console.log("cost USD:", usage.costUSD);
console.log("data:", data);
console.log("usage snapshot:", await guard.getUsage());
