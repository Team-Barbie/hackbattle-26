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

  it("keeps a named therapist recording with its custom plan step", () => {
    const referenceExercise = {
      version: 1 as const,
      name: "Seated ankle rotation",
      recordedAt: "2026-09-13T00:00:00.000Z",
      durationMs: 1800,
      frames: [[0.5, 0.5, 0.8, 0.8]],
    };
    const plan = sanitisePrescription({
      therapist: "Dr. Mehta",
      title: "Ankle plan",
      steps: [
        {
          id: "step-custom",
          exerciseId: "custom",
          targetReps: 6,
          referenceExercise,
        },
      ],
    });

    expect(plan?.steps[0].referenceExercise?.name).toBe("Seated ankle rotation");
    expect(decodeSharedPlan(encodeSharedPlan(plan!))).toEqual(plan);
  });

  it("does not publish a custom step without a named recording", () => {
    expect(
      sanitisePrescription({
        steps: [{ id: "missing-reference", exerciseId: "custom", targetReps: 8 }],
      }),
    ).toBeNull();
  });
});
