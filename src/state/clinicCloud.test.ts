import { describe, expect, it } from "vitest";
import { normalizeClinicCode, parseClinicPlanRow, parseClinicSessionRow } from "./clinicCloud";

describe("normalizeClinicCode", () => {
  it("trims, lowercases, and caps length", () => {
    expect(normalizeClinicCode(" MEHTA4 ")).toBe("mehta4");
    expect(normalizeClinicCode("Mehta 4")).toBe("mehta4");
    expect(normalizeClinicCode("")).toBe("");
    expect(normalizeClinicCode(undefined)).toBe("");
    expect(normalizeClinicCode("x".repeat(40))).toHaveLength(32);
  });
});

describe("parseClinicPlanRow", () => {
  it("reads a published plan from a clinic row", () => {
    const stored = parseClinicPlanRow({
      clinic_code: "mehta4",
      therapist: "Dr. Mehta",
      title: "Home plan",
      published_at: "2026-09-13T00:00:00.000Z",
      plan: {
        therapist: "Dr. Mehta",
        title: "Home plan",
        accessCode: "Mehta4",
        steps: [{ id: "step-1", exerciseId: "squat", targetReps: 10 }],
      },
    });

    expect(stored?.plan.title).toBe("Home plan");
    expect(stored?.plan.accessCode).toBe("Mehta4");
    expect(stored?.publishedAt).toBe("2026-09-13T00:00:00.000Z");
  });

  it("rejects a row with no valid steps", () => {
    expect(
      parseClinicPlanRow({
        clinic_code: "mehta4",
        therapist: "Dr. Mehta",
        title: "Empty",
        published_at: "2026-09-13T00:00:00.000Z",
        plan: { steps: [] },
      }),
    ).toBeNull();
  });
});

describe("parseClinicSessionRow", () => {
  it("keeps the patient name and session payload", () => {
    const session = parseClinicSessionRow({
      id: "row-1",
      clinic_code: "mehta4",
      patient_name: "Asha",
      recorded_at: "2026-09-13T10:00:00.000Z",
      payload: {
        id: "session-1",
        date: "2026-09-13T10:00:00.000Z",
        planTitle: "Today's session",
        therapist: "Dr. Mehta",
        readiness: 3,
        durationMs: 120000,
        steps: [{ exerciseId: "squat", targetReps: 10, reps: 8, goodReps: 6, flaggedReps: 2 }],
      },
    });

    expect(session?.patientName).toBe("Asha");
    expect(session?.id).toBe("session-1");
    expect(session?.steps[0]?.reps).toBe(8);
  });
});
