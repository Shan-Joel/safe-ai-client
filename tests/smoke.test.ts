import { describe, expect, it } from "vitest";
import { VERSION } from "../src/index";

describe("package smoke test", () => {
  it("exposes a version string", () => {
    expect(VERSION).toBe("0.2.0");
  });
});
