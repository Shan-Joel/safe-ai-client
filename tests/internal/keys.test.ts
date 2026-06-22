import { describe, expect, it } from "vitest";
import { buildKey } from "../../src/internal/keys";
import { SafeAiError } from "../../src/errors";

describe("buildKey", () => {
  it("joins segments with colons", () => {
    expect(buildKey("sac", "cost", "user-1", 2026)).toBe("sac:cost:user-1:2026");
  });

  it("rejects prototype-polluting segments", () => {
    expect(() => buildKey("sac", "__proto__")).toThrow(SafeAiError);
    expect(() => buildKey("sac", "constructor")).toThrow(SafeAiError);
    expect(() => buildKey("sac", "prototype")).toThrow(SafeAiError);
  });
});
