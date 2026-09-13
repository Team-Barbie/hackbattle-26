import { describe, expect, it } from "vitest";
import {
  analyseRecordedMotion,
  jointExcursionDegrees,
  parseReferenceExercise,
  type PoseFeatureFrame,
} from "./referenceExercise";

describe("recorded exercise analysis", () => {
  it("names the dominant joint action and generates usable cues", () => {
    const frames: PoseFeatureFrame[] = [
      { leftElbowFlexion: 1, rightElbowFlexion: 1, leftShoulderElevation: 0.2, rightShoulderElevation: 0.2 },
      { leftElbowFlexion: 0.7, rightElbowFlexion: 0.72, leftShoulderElevation: 0.22, rightShoulderElevation: 0.21 },
      { leftElbowFlexion: 0.35, rightElbowFlexion: 0.38, leftShoulderElevation: 0.23, rightShoulderElevation: 0.22 },
      { leftElbowFlexion: 1, rightElbowFlexion: 1, leftShoulderElevation: 0.2, rightShoulderElevation: 0.2 },
    ];

    const profile = analyseRecordedMotion(frames);

    expect(profile.primary.label).toContain("elbow");
    expect(profile.primary.action).toBe("bend the elbow");
    expect(profile.cues.perform.headline).toBe("Bend the elbow");
    expect(profile.cues.adjust.detail).toContain("target range");
  });

  it("migrates legacy positional angle arrays into named joint frames", () => {
    const reference = parseReferenceExercise({
      version: 1,
      name: "Legacy curl",
      recordedAt: "2026-09-13T10:00:00.000Z",
      durationMs: 1200,
      frames: [
        [0.2, 0.2, 1, 1, 1, 1, 1, 1],
        [0.2, 0.2, 1, 1, 1, 1, 1, 1],
        [0.2, 0.2, 0.4, 0.4, 1, 1, 1, 1],
      ],
    });

    expect(reference?.id).toMatch(/^recorded-/);
    expect(reference?.frames[0]).toMatchObject({ leftElbowFlexion: 1 });
    expect(reference?.motionProfile?.primary.action).toBe("bend the elbow");
    expect(reference && jointExcursionDegrees(reference, "leftElbowFlexion")).toBeCloseTo(108);
    expect(reference && jointExcursionDegrees(reference, "leftKneeFlexion")).toBe(0);
  });
});
