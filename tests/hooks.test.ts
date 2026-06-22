import { describe, expect, it, vi } from "vitest";
import { safeInvoke } from "../src/hooks";

describe("safeInvoke", () => {
  it("calls the hook with the event", async () => {
    const fn = vi.fn();
    await safeInvoke(fn, { a: 1 });
    expect(fn).toHaveBeenCalledWith({ a: 1 });
  });

  it("does nothing when the hook is undefined", async () => {
    await expect(safeInvoke(undefined, { a: 1 })).resolves.toBeUndefined();
  });

  it("swallows errors thrown by hooks", async () => {
    const fn = vi.fn(() => {
      throw new Error("observer boom");
    });
    await expect(safeInvoke(fn, {})).resolves.toBeUndefined();
  });

  it("swallows async rejections from hooks", async () => {
    const fn = vi.fn(async () => {
      throw new Error("async boom");
    });
    await expect(safeInvoke(fn, {})).resolves.toBeUndefined();
  });
});
