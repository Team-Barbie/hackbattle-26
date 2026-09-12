import { describe, expect, it } from "vitest";
import { combineArmReadings } from "./armMetrics";

const left = { value: 0.2, degrees: 40, confidence: 0.8 };
const right = { value: 0.9, degrees: 150, confidence: 0.8 };

describe("combineArmReadings", () => {
  it("keeps the working arm when sides disagree", () => {
    expect(combineArmReadings(left, right, 28, "higher").degrees).toBe(150);
    expect(combineArmReadings(left, right, 28, "lower").degrees).toBe(40);
  });

  it("can still reject disagreement when asked", () => {
    expect(combineArmReadings(left, right, 28, "null").degrees).toBeNull();
  });
});
