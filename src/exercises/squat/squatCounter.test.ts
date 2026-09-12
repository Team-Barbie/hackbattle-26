import { describe, expect, it } from "vitest";
import { createSquatCounter } from "./squatCounter";

describe("createSquatCounter", () => {
  it("counts a held stand, bottom, stand cycle", () => {
    const counter = createSquatCounter();

    counter.update("UP", 0.92, 0);
    counter.update("UP", 0.92, 300);
    counter.update("DOWN", 0.45, 400);
    counter.update("DOWN", 0.4, 700);
    const completed = counter.update("UP", 0.9, 800);

    expect(completed?.index).toBe(1);
    expect(counter.count).toBe(1);
  });

  it("does not count a one-frame flicker through DOWN", () => {
    const counter = createSquatCounter();

    counter.update("UP", 0.92, 0);
    counter.update("UP", 0.92, 300);
    counter.update("DOWN", 0.4, 400);
    const completed = counter.update("UP", 0.9, 410);

    expect(completed).toBeNull();
    expect(counter.count).toBe(0);
  });
});
