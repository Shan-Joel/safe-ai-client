# 🛡️ safe-ai-client

### Prevent surprise AI API bills before they happen.

**The missing safety layer for AI-powered apps.** Rate limiting, real-time cost
tracking, and budget enforcement in one lightweight, provider-agnostic wrapper.

<p>
  <a href="https://www.npmjs.com/package/safe-ai-client"><img alt="npm" src="https://img.shields.io/npm/v/safe-ai-client.svg"></a>
  <img alt="zero dependencies" src="https://img.shields.io/badge/dependencies-0-brightgreen">
  <img alt="types" src="https://img.shields.io/badge/types-included-blue">
  <img alt="license" src="https://img.shields.io/badge/license-MIT-green">
</p>

---

## ⚡ Why safe-ai-client exists

Most teams building with AI APIs hit the same problems:

- 💸 **Unexpected bills** at the end of the month
- 📈 **No real-time visibility** into per-user / per-model cost
- 🚨 **No hard caps** on token or request spikes
- 🧯 **Rate limiting is DIY**, inconsistent, and scattered
- 🤯 **Multi-provider usage** means zero unified control

`safe-ai-client` sits between your app and any AI API and gives you all of this in
one place — with **zero runtime dependencies** and an **edge-ready** core.

---

## 🚀 Install

```bash
npm install safe-ai-client
```

> Node 18+. Ships dual **ESM + CommonJS** builds and full TypeScript types.

---

## ⚡ Quick start

```ts
import { createGuard } from "safe-ai-client";

const guard = createGuard({
  limits: { requestsPerMinute: 60, requestsPerDay: 10_000 },
  budget: { dailyUSD: 5, monthlyUSD: 100, warnAt: [0.8, 0.9] },
  enforcement: "block",
});

const { data, usage } = await guard.run({
  provider: "openai",
  model: "gpt-4o",
  execute: async () => {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [{ role: "user", content: "Hello!" }],
      }),
    });
    return res.json();
  },
});

console.log("This call cost ~$", usage.costUSD);
```

`guard.run()` automatically:

- ✅ rate-limits the request (per minute / per day, per key)
- ✅ reads token usage from the provider response
- ✅ computes cost and tracks it against your daily / monthly budget
- ✅ fires hooks and throws typed errors when limits are hit

**Your API keys never leave your `execute()` function.** The library never sees,
stores, or logs credentials.

---

## 🔑 Provider-agnostic by design

`guard.run()` wraps **any** async call — `fetch`, an official SDK, your own
gateway. You supply `execute()`; the guard handles safety.

```ts
const { data, usage } = await guard.run({
  provider: "anthropic",
  model: "claude-sonnet-4",
  execute: () => anthropic.messages.create({ /* ... */ }), // any promise
});
```

Token usage is read automatically from OpenAI (`prompt_tokens` /
`completion_tokens`) and Anthropic (`input_tokens` / `output_tokens`) response
shapes. For anything else, supply `extractUsage`:

```ts
await guard.run({
  provider: "custom",
  model: "my-model",
  execute: () => callMyModel(),
  extractUsage: (result) => ({ inputTokens: result.in, outputTokens: result.out }),
});
```

---

## 🧪 Even less boilerplate: `guardedFetch`

```ts
const { data, usage } = await guard.guardedFetch(
  "openai",
  "gpt-4o",
  "https://api.openai.com/v1/chat/completions",
  {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    body: JSON.stringify({ model: "gpt-4o", messages: [{ role: "user", content: "Hi" }] }),
  },
);

const json = await data.json(); // body is untouched — we clone internally to read usage
```

`guardedFetch` parses non-streaming JSON responses for usage automatically. For
streaming responses, pass an `estimate` (5th argument) so budgets still apply.

---

## 💸 Real-time usage tracking

```ts
const snapshot = await guard.getUsage("user-123");
```

```jsonc
{
  "today":  { "costUSD": 2.34, "requests": 1200 },
  "month":  { "costUSD": 34.22, "requests": 18400, "remainingBudgetUSD": 65.78 },
  "window": { "requestsThisMinute": 4, "requestsToday": 1200 }
}
```

---

## 🚫 Budgets & enforcement

Set `enforcement` to choose how budgets behave (rate limits are **always** hard-enforced):

| Mode      | Behavior                                                                              |
| --------- | ------------------------------------------------------------------------------------- |
| `"block"` | (default) Reject **before** the call when an `estimate` would exceed the budget        |
| `"warn"`  | Never block; fire `onBudgetWarning` / `onBudgetExceeded` so you can react              |
| `"track"` | Silent accounting only — record cost and usage, take no action                         |

Pre-flight blocking requires you to pass an `estimate`:

```ts
await guard.run({
  provider: "openai",
  model: "gpt-4o",
  estimate: { inputTokens: 1200, outputTokens: 800 }, // checked before the call
  execute: () => callOpenAI(),
});
// → throws BudgetExceededError if this would push you over the cap (in "block" mode)
```

Warning thresholds (`warnAt`, default `[0.8, 0.9]`) fire at most once per period as
cumulative spend crosses each ratio.

---

## 🔔 Observability hooks

Every hook is optional and **cannot break your request** — observer errors are
swallowed so enforcement is never affected.

```ts
const guard = createGuard({
  budget: { dailyUSD: 5, warnAt: [0.8, 0.9] },
  hooks: {
    onRequestStart:   (e) => {},                       // { provider, model, key, requestId, timestamp, estimate? }
    onRequestEnd:     (e) => {},                       // { usage, durationMs }
    onCostCalculated: (e) => log(e.usage.costUSD),     // { usage }
    onLimitReached:   (e) => alert(e.scope, e.retryAfterMs), // { scope, limit, key, retryAfterMs }
    onBudgetWarning:  (e) => warn(`${e.ratio * 100}% of ${e.scope} budget`), // { scope, ratio, limitUSD, spentUSD, key }
    onBudgetExceeded: (e) => page(e),                  // { scope, limitUSD, spentUSD, key, phase }
  },
});
```

---

## 👥 Per-user / per-tenant limits

Pass a `key` to give each user, tenant, or API key its own rate-limit and budget bucket:

```ts
await guard.run({
  provider: "openai",
  model: "gpt-4o-mini",
  key: userId, // independent limits + budget per user
  execute: () => callOpenAI(prompt),
});

await guard.getUsage(userId); // that user's usage only
await guard.reset(userId);    // clear a user's current-period counters
```

---

## 💰 Custom pricing

Pricing is a **dated, overridable estimate snapshot**. Override or extend it for
your negotiated rates or self-hosted models:

```ts
import { createGuard, builtInPricing } from "safe-ai-client";

const guard = createGuard({
  pricing: {
    ...builtInPricing,
    openai: {
      ...builtInPricing.openai,
      "gpt-4o": { inputPer1k: 0.0025, outputPer1k: 0.01 },
    },
    "my-self-hosted": { "llama-3.1-70b": { inputPer1k: 0, outputPer1k: 0 } },
  },
});
```

---

## 🔌 Pluggable storage

The built-in `memoryStorage()` is perfect for single-instance apps and the edge.
For distributed limits across instances, implement the small `Storage` interface
(four methods) backed by Redis / Upstash / any KV — see
[`examples/redis-adapter.md`](examples/redis-adapter.md).

```ts
import type { Storage } from "safe-ai-client";

const guard = createGuard({ storage: myRedisStorage });
```

---

## 🏗️ Runs everywhere

- **Node.js 18+**
- **Vercel Edge** / **Cloudflare Workers** (zero Node built-ins in the core)
- Any bundler (ESM or CJS)

The core has **no runtime dependencies** and uses only `globalThis.crypto` and the
`Clock` you inject (default `Date.now`).

---

## ⚠️ Pricing disclaimer

Cost figures are **estimates** based on a static, overridable pricing snapshot
(`PRICING_SNAPSHOT_DATE`). They are provided for convenience only and may differ
from your provider's actual billing. Always rely on your provider's official
invoices for billing decisions.

---

## 🔒 Security & privacy

`safe-ai-client` never sees, stores, or transmits your API keys — you own the
`execute()` call. It makes no network calls of its own and sends no telemetry. See
[`SECURITY.md`](SECURITY.md) for the full set of design guarantees and how to
report a vulnerability.

---

## 🛣️ Roadmap

- [ ] Express / Next.js middleware adapters
- [ ] First-class Redis / Upstash storage adapter
- [ ] Optional provider-SDK auto-wrapping (`openai.chat.completions.create`)
- [ ] Cheaper-model suggestions
- [ ] Webhook alerts (Slack / Discord) and a usage dashboard

---

## 🤝 Contributing

PRs and ideas welcome — see [`CONTRIBUTING.md`](CONTRIBUTING.md).

## 📄 License

[MIT](LICENSE)

---

> _“If you can’t see it, you can’t control it.”_ safe-ai-client makes AI usage
> **visible**, **predictable**, and **enforceable**.
