import { describe, expect, it, vi, afterEach } from "vitest";
import { createGuard } from "../../src/core/guard";
import { memoryStorage } from "../../src/storage/memory";

const pricing = { "your-provider": { "your-model": { inputPer1k: 0.01, outputPer1k: 0.03 } } };

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("guard.guardedFetch", () => {
  it("parses non-streaming JSON usage from the response without consuming the caller's body", async () => {
    const body = { id: "1", usage: { prompt_tokens: 1000, completion_tokens: 1000 } };
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(JSON.stringify(body), {
            headers: { "content-type": "application/json" },
          }),
      ),
    );

    const clock = () => Date.UTC(2026, 5, 22, 10);
    const guard = createGuard({ clock, storage: memoryStorage(clock), pricing });

    const { data, usage } = await guard.guardedFetch("your-provider", "your-model", "https://example.test");
    expect(usage.inputTokens).toBe(1000);
    expect(usage.costUSD).toBeCloseTo(0.04, 10);
    // Caller's body is still readable (we cloned for parsing).
    expect(await data.json()).toEqual(body);
  });

  it("falls back to estimate for non-JSON (streaming) responses", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response("data: ...", { headers: { "content-type": "text/event-stream" } }),
      ),
    );
    const clock = () => Date.UTC(2026, 5, 22, 10);
    const guard = createGuard({ clock, storage: memoryStorage(clock), pricing });

    const { usage } = await guard.guardedFetch(
      "your-provider",
      "your-model",
      "https://example.test",
      undefined,
      {
        estimate: { inputTokens: 100, outputTokens: 100 },
      },
    );
    expect(usage.estimated).toBe(true);
    expect(usage.inputTokens).toBe(100);
  });
});
