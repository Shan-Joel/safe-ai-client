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
  // Set your model's per-1k token rates so cost can be tracked.
  pricing: {
    "your-provider": {
      "your-model": { inputPer1k: 0.001, outputPer1k: 0.002 },
    },
  },
});

const { data, usage } = await guard.run({
  provider: "your-provider", // a label you choose for your AI provider
  model: "your-model", //       a label you choose for the model
  execute: async () => {
    const res = await fetch("https://api.your-ai-provider.example/v1/chat/completions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        Authorization: `Bearer ${process.env.AI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "your-model",
        messages: [{ role: "user", content: "Hello!" }],
      }),
    });
    return res.json();
  },
});

console.log("This call cost ~$", usage.costUSD);
```

> `"your-provider"` and `"your-model"` are just **labels you choose** — swap in
> whatever names you like (they only need to match between `pricing` and `run`).
> Replace the URL and API key with your real provider's.

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
gateway. You supply `execute()`; the guard handles safety. It works with any AI
provider because *you* control the request.

```ts
const { data, usage } = await guard.run({
  provider: "your-provider",
  model: "your-model",
  execute: () => yourClient.createCompletion({ /* ... */ }), // any promise
});
```

Token usage is read automatically when the response includes a `usage` object in
either common shape — `{ prompt_tokens, completion_tokens }` or
`{ input_tokens, output_tokens }`. For any other shape, supply `extractUsage`:

```ts
await guard.run({
  provider: "your-provider",
  model: "your-model",
  execute: () => callYourModel(),
  extractUsage: (result) => ({ inputTokens: result.in, outputTokens: result.out }),
});
```

---

## 🧪 Even less boilerplate: `guardedFetch`

```ts
const { data, usage } = await guard.guardedFetch(
  "your-provider",
  "your-model",
  "https://api.your-ai-provider.example/v1/chat/completions",
  {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.AI_API_KEY}` },
    body: JSON.stringify({ model: "your-model", messages: [{ role: "user", content: "Hi" }] }),
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
  provider: "your-provider",
  model: "your-model",
  estimate: { inputTokens: 1200, outputTokens: 800 }, // checked before the call
  execute: () => callYourModel(),
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
  provider: "your-provider",
  model: "your-model",
  key: userId, // independent limits + budget per user
  execute: () => callYourModel(prompt),
});

await guard.getUsage(userId); // that user's usage only
await guard.reset(userId);    // clear a user's current-period counters
```

---

## 💰 Pricing (you set the rates)

To track cost, give each provider/model its **per-1k token rates**. No real provider
prices ship with the package — you supply your own, so the numbers are always accurate
and never go stale. Provider and model names are just labels you choose.

```ts
import { createGuard } from "safe-ai-client";

const guard = createGuard({
  pricing: {
    "your-provider": {
      "your-model": { inputPer1k: 0.001, outputPer1k: 0.002 },
      "your-cheaper-model": { inputPer1k: 0.0002, outputPer1k: 0.0006 },
    },
    "self-hosted": {
      "internal-model": { inputPer1k: 0, outputPer1k: 0 }, // free / internal
    },
  },
});
```

If a request's provider/model has no configured price, its cost is recorded as `0`
and the usage record is flagged `estimated: true`.

---

## 🔌 Pluggable storage

The built-in `memoryStorage()` is perfect for single-instance apps and the edge.
For distributed limits across instances, implement the small `Storage` interface
(four methods) backed by Redis or any key/value store — see
[`examples/redis-adapter.md`](examples/redis-adapter.md).

```ts
import type { Storage } from "safe-ai-client";

const guard = createGuard({ storage: myRedisStorage });
```

---

## 🏗️ Runs everywhere

- **Node.js 18+**
- **Edge and serverless runtimes** (zero Node built-ins in the core)
- Any bundler (ESM or CJS)

The core has **no runtime dependencies** and uses only `globalThis.crypto` and the
`Clock` you inject (default `Date.now`).

---

## ⚠️ Limitations

Read these before relying on it in production — they're scope boundaries of the
early releases, not bugs, and each is addressed by a roadmap item:

- **The built-in `memoryStorage()` is per-process.** On serverless / edge platforms
  every instance keeps its own counters, so rate limits and budgets are enforced
  **per instance, not globally**. For shared enforcement across instances, provide a
  distributed `Storage` adapter (e.g. Redis — see
  [`examples/redis-adapter.md`](examples/redis-adapter.md)). Memory state is also
  reset on process restart.
- **Rate limiting is approximate under high concurrency.** A limit is checked and then
  consumed across `await` points, so many simultaneous in-flight requests in the same
  process can slightly overshoot the configured limit. It is exact for sequential or
  modestly concurrent workloads; if you need hard atomic guarantees, back the guard
  with a store that enforces atomicity.
- **Streaming responses aren't auto-metered.** Token usage is parsed from non-streaming
  JSON bodies. For streamed responses, pass an `estimate` (and/or `extractUsage`) so
  budgets and cost tracking still apply.
- **Cost is calculated from the rates you configure.** No provider prices ship with
  the package — see the disclaimer below.

---

## ⚠️ Cost disclaimer

Cost figures are **estimates** computed from the per-1k rates **you** configure in
`pricing`. They may differ from your provider's actual billing (rounding, special
token types, tiered pricing, etc.). Always rely on your provider's official invoices
for billing decisions.

---

## 📛 Trademarks & affiliation

`safe-ai-client` is an independent, unofficial project and is **not affiliated with,
endorsed by, or sponsored by** any AI provider, platform, or other company. It calls
no provider directly — you supply your own request and credentials. All product names
and trademarks are the property of their respective owners.

---

## 🔒 Security & privacy

`safe-ai-client` never sees, stores, or transmits your API keys — you own the
`execute()` call. It makes no network calls of its own and sends no telemetry. See
[`SECURITY.md`](SECURITY.md) for the full set of design guarantees and how to
report a vulnerability.

---

## 🛣️ Roadmap

- [ ] Web framework middleware adapters
- [ ] First-class Redis / KV storage adapter
- [ ] Optional official SDK auto-wrapping
- [ ] Cheaper-model suggestions
- [ ] Webhook alerts and a usage dashboard

---

## 🤝 Contributing

PRs and ideas welcome — see [`CONTRIBUTING.md`](CONTRIBUTING.md).

## 📄 License

[MIT](LICENSE)

---

> _“If you can’t see it, you can’t control it.”_ safe-ai-client makes AI usage
> **visible**, **predictable**, and **enforceable**.
