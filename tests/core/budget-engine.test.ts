import { describe, expect, it } from "vitest";
import {
  crossedThresholds,
  projectedExceeds,
  remaining,
} from "../../src/core/budget-engine";

describe("budget-engine", () => {
  it("projectedExceeds returns the projected total only when over the limit", () => {
    expect(projectedExceeds(4, 0.5, 5)).toBeNull();
    expect(projectedExceeds(4.8, 0.5, 5)).toBeCloseTo(5.3, 10);
    expect(projectedExceeds(4.8, 0.5, undefined)).toBeNull();
  });

  it("crossedThresholds reports ratios newly crossed this step", () => {
    // limit 10, ratios 80% (8) and 90% (9)
    expect(crossedThresholds(7, 8.5, 10, [0.8, 0.9])).toEqual([0.8]);
    expect(crossedThresholds(8.5, 9.1, 10, [0.8, 0.9])).toEqual([0.9]);
    expect(crossedThresholds(7, 9.5, 10, [0.8, 0.9])).toEqual([0.8, 0.9]);
    expect(crossedThresholds(9.1, 9.9, 10, [0.8, 0.9])).toEqual([]);
    expect(crossedThresholds(7, 9.5, undefined, [0.8])).toEqual([]);
  });

  it("remaining clamps at zero and returns null without a limit", () => {
    expect(remaining(3, 5)).toBe(2);
    expect(remaining(6, 5)).toBe(0);
    expect(remaining(6, undefined)).toBeNull();
  });
});
