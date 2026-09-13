import { describe, expect, it } from "vitest";
import { formatSessionLogMessage } from "./sessionLog";

describe("formatSessionLogMessage", () => {
  it("includes the patient name, clinic code, and exercise log", () => {
    const body = formatSessionLogMessage("Pranav", "123", {
      id: "session-1",
      date: "2026-09-13T10:00:00.000Z",
      planTitle: "Today's session",
      therapist: "Dr. Mehta",
      readiness: 3,
      durationMs: 125000,
      earlyExitReason: null,
      steps: [
        {
          exerciseId: "squat",
          targetReps: 10,
          reps: 8,
          goodReps: 6,
          flaggedReps: 2,
          mainIssue: "SHALLOW_SQUAT",
        },
      ],
    });

    expect(body).toContain("Patient: Pranav");
    expect(body).toContain("Code: 123");
    expect(body).toContain("8/10 reps");
    expect(body).toContain("Squat 8/10");
    expect(body).toContain("Shallow squat");
  });

  it("includes the patient's given reason when the session ended early", () => {
    const body = formatSessionLogMessage("Pranav", "123", {
      id: "session-2",
      date: "2026-09-13T10:00:00.000Z",
      planTitle: "Today's session",
      therapist: "Dr. Mehta",
      readiness: null,
      durationMs: 60000,
      earlyExitReason: "Pain or discomfort",
      steps: [
        { exerciseId: "squat", targetReps: 10, reps: 3, goodReps: 3, flaggedReps: 0, mainIssue: null },
      ],
    });

    expect(body).toContain("Stopped early: Pain or discomfort");
  });
});
