import { describe, expect, it } from "vitest";
import {
  createBicepCurlCounter,
  detectBicepCurlState,
} from "./bicepCurl";

describe("bicep curl detection", () => {
  it("recognizes realistic camera-space rest and curl angles", () => {
    expect(detectBicepCurlState(150)).toBe("ARMS_EXTENDED");
    expect(detectBicepCurlState(135, "ARMS_EXTENDED")).toBe("ARMS_EXTENDED");
    expect(detectBicepCurlState(120, "ARMS_EXTENDED")).toBe("ARMS_CURLED");
  });

  it("counts a controlled rest to curl to rest cycle", () => {
    const counter = createBicepCurlCounter();

    counter.update("REST", 150, 0);
    counter.update("REST", 150, 180);
    counter.update("ACTIVE", 120, 220);
    counter.update("ACTIVE", 115, 330);

    expect(counter.update("REST", 150, 420)).toBe(true);
    expect(counter.count).toBe(1);
  });

  it("does not count when the session starts in the curled position", () => {
    const counter = createBicepCurlCounter();

    counter.update("ACTIVE", 110, 0);
    counter.update("ACTIVE", 105, 150);

    expect(counter.update("REST", 150, 260)).toBe(false);
    expect(counter.count).toBe(0);
  });
});
