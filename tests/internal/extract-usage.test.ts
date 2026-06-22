import { describe, expect, it } from "vitest";
import { defaultExtractUsage } from "../../src/internal/extract-usage";

describe("defaultExtractUsage", () => {
  it("reads OpenAI usage shape", () => {
    expect(
      defaultExtractUsage({ usage: { prompt_tokens: 12, completion_tokens: 8 } }),
    ).toEqual({ inputTokens: 12, outputTokens: 8 });
  });

  it("reads Anthropic usage shape", () => {
    expect(
      defaultExtractUsage({ usage: { input_tokens: 5, output_tokens: 9 } }),
    ).toEqual({ inputTokens: 5, outputTokens: 9 });
  });

  it("returns null for unknown shapes", () => {
    expect(defaultExtractUsage(null)).toBeNull();
    expect(defaultExtractUsage("string")).toBeNull();
    expect(defaultExtractUsage({ usage: {} })).toBeNull();
    expect(defaultExtractUsage({})).toBeNull();
  });
});
