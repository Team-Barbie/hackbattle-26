import { describe, expect, it } from "vitest";
import { codesMatch } from "../exercises/prescription";
import { decodeSharedPlan, encodeSharedPlan, sanitisePrescription } from "./prescriptionStore";

describe("access codes", () => {
  it("treats an empty code as open access", () => {
    expect(codesMatch(undefined, "")).toBe(true);
    expect(codesMatch("", "anything")).toBe(true);
  });

  it("matches a published code case-insensitively", () => {
    expect(codesMatch("Mehta4", "mehta4")).toBe(true);
    expect(codesMatch("Mehta4", "wrong")).toBe(false);
  });
});

describe("shared plans", () => {
  it("round-trips a published plan", () => {
    const plan = sanitisePrescription({
      therapist: "Dr. Mehta",
      title: "Home plan",
      accessCode: "clinic",
      steps: [{ id: "step-1", exerciseId: "squat", targetReps: 10 }],
    });

    expect(plan).not.toBeNull();
    expect(decodeSharedPlan(encodeSharedPlan(plan!))).toEqual(plan);
  });
});
