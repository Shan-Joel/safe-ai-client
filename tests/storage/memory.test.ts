import { describe, expect, it } from "vitest";
import { memoryStorage } from "../../src/storage/memory";

describe("memoryStorage", () => {
  it("sets and gets values", async () => {
    const s = memoryStorage();
    await s.set("a", 42);
    expect(await s.get<number>("a")).toBe(42);
    expect(await s.get("missing")).toBeUndefined();
  });

  it("increments a missing key from zero and accumulates", async () => {
    const s = memoryStorage();
    expect(await s.increment("c", 1.5)).toBe(1.5);
    expect(await s.increment("c", 2)).toBe(3.5);
    expect(await s.get<number>("c")).toBe(3.5);
  });

  it("expires values lazily using the injected clock", async () => {
    let now = 1000;
    const s = memoryStorage(() => now);
    await s.set("x", "v", 100); // expires at 1100
    now = 1099;
    expect(await s.get("x")).toBe("v");
    now = 1100;
    expect(await s.get("x")).toBeUndefined();
  });

  it("deletes values", async () => {
    const s = memoryStorage();
    await s.set("d", 1);
    await s.delete("d");
    expect(await s.get("d")).toBeUndefined();
  });
});
