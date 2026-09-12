import { describe, expect, it } from "vitest";
import { currentStreak } from "./patientProfile";
import { localDay } from "./dates";

describe("localDay", () => {
  it("uses the local calendar instead of UTC", () => {
    const evening = new Date(2026, 8, 13, 22, 30, 0);
    expect(localDay(evening)).toBe("2026-09-13");
  });
});

describe("currentStreak", () => {
  it("counts consecutive local days walking back from today", () => {
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    const streak = currentStreak({
      name: "Ada",
      createdAt: today.toISOString(),
      sessions: [
        {
          id: "a",
          date: yesterday.toISOString(),
          planTitle: "Plan",
          therapist: "Dr",
          readiness: null,
          durationMs: 1000,
          steps: [
            {
              exerciseId: "squat",
              targetReps: 10,
              reps: 10,
              goodReps: 8,
              flaggedReps: 2,
              mainIssue: "SHALLOW_SQUAT",
            },
          ],
        },
        {
          id: "b",
          date: today.toISOString(),
          planTitle: "Plan",
          therapist: "Dr",
          readiness: null,
          durationMs: 1000,
          steps: [
            {
              exerciseId: "squat",
              targetReps: 8,
              reps: 8,
              goodReps: 8,
              flaggedReps: 0,
              mainIssue: null,
            },
          ],
        },
      ],
    });

    expect(streak).toBe(2);
  });
});
