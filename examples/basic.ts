import { createGuard } from "safe-ai-client";

// Replace "your-provider" / "your-model" / the URL / the API key env var with your
// real AI provider's values. `pricing` is where you set that model's per-1k rates.
const guard = createGuard({
  limits: { requestsPerMinute: 60, requestsPerDay: 10_000 },
  budget: { dailyUSD: 5, monthlyUSD: 100, warnAt: [0.8, 0.9] },
  enforcement: "block",
  pricing: {
    "your-provider": {
      "your-model": { inputPer1k: 0.001, outputPer1k: 0.002 }, // <-- your real rates
    },
  },
  hooks: {
    onBudgetWarning: (e) => console.warn(`⚠️ ${e.scope} budget ${e.ratio * 100}% used`),
    onBudgetExceeded: (e) => console.error(`🛑 ${e.scope} budget exceeded ($${e.spentUSD})`),
  },
});

const { data, usage } = await guard.run({
  provider: "your-provider",
  model: "your-model",
  estimate: { inputTokens: 1200, outputTokens: 800 },
  execute: () =>
    fetch("https://api.your-ai-provider.example/v1/chat/completions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        Authorization: `Bearer ${process.env.AI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "your-model",
        messages: [{ role: "user", content: "Hello!" }],
      }),
    }).then((r) => r.json()),
});

console.log("cost USD:", usage.costUSD);
console.log("data:", data);
console.log("usage snapshot:", await guard.getUsage());
