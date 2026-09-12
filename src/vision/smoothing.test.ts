import { describe, expect, it } from "vitest";
import { MetricFilter } from "./smoothing";

describe("MetricFilter", () => {
  it("ignores a single-frame spike", () => {
    const filter = new MetricFilter(0.2, 1, 3);
    expect(filter.push(0.9)).toBeCloseTo(0.9);
    expect(filter.push(0.2)).toBeCloseTo(0.9);
  });

  it("accepts sustained travel instead of freezing", () => {
    const filter = new MetricFilter(0.2, 1, 3);
    filter.push(0.9);
    filter.push(0.5);
    filter.push(0.4);
    expect(filter.push(0.3)).toBeCloseTo(0.3);
  });

  it("starts fresh after reset so a gap cannot lock the metric", () => {
    const filter = new MetricFilter(0.2, 1, 3);
    filter.push(0.9);
    filter.reset();
    expect(filter.push(0.2)).toBeCloseTo(0.2);
  });
});
