import { describe, expect, it } from "vitest";
import {
  applyChatHistoryClears,
  mergeClinicInbox,
  normalizeClinicCode,
  parseChatSessionRow,
  parseClinicMessageRow,
  parseClinicPlanRow,
  parseClinicSessionRow,
  parseExerciseReferenceRow,
} from "./clinicCloud";

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
    expect(session?.clinicCode).toBe("mehta4");
    expect(session?.id).toBe("session-1");
    expect(session?.steps[0]?.reps).toBe(8);
  });
});

describe("parseExerciseReferenceRow", () => {
  it("reads a reusable therapist exercise reference", () => {
    const item = parseExerciseReferenceRow({
      id: "reference-1",
      therapist: "Dr. Mehta",
      created_at: "2026-09-13T10:00:00.000Z",
      reference: {
        version: 1,
        name: "Seated ankle rotation",
        recordedAt: "2026-09-13T09:59:00.000Z",
        durationMs: 1800,
        frames: [[0.5, 0.5, 0.8, 0.8]],
      },
    });

    expect(item?.reference.name).toBe("Seated ankle rotation");
    expect(item?.therapist).toBe("Dr. Mehta");
  });

  it("rejects malformed reference material", () => {
    expect(
      parseExerciseReferenceRow({
        id: "reference-2",
        therapist: "Dr. Mehta",
        created_at: "2026-09-13T10:00:00.000Z",
        reference: { name: "Missing pose frames" },
      }),
    ).toBeNull();
  });
});

describe("parseClinicMessageRow", () => {
  it("reads a clinic chat message", () => {
    const message = parseClinicMessageRow({
      id: "msg-1",
      clinic_code: "mehta4",
      patient_name: "Asha",
      sender: "patient",
      body: "  Knee felt sore today.  ",
      sent_at: "2026-09-13T10:05:00.000Z",
    });

    expect(message).toEqual({
      id: "msg-1",
      clinicCode: "mehta4",
      patientName: "Asha",
      sender: "patient",
      body: "Knee felt sore today.",
      sentAt: "2026-09-13T10:05:00.000Z",
    });
  });

  it("reads a chat row stored on clinic_sessions", () => {
    const message = parseChatSessionRow({
      id: "row-chat",
      clinic_code: "mehta4",
      patient_name: "Asha",
      recorded_at: "2026-09-13T10:06:00.000Z",
      payload: { kind: "chat_message", sender: "therapist", body: "Go a little deeper." },
    });

    expect(message?.body).toBe("Go a little deeper.");
    expect(message?.sender).toBe("therapist");
    expect(parseChatSessionRow({
      id: "row-1",
      clinic_code: "mehta4",
      patient_name: "Asha",
      recorded_at: "2026-09-13T10:00:00.000Z",
      payload: { id: "session-1", steps: [] },
    })).toBeNull();
  });

  it("rejects an empty or unknown sender", () => {
    expect(
      parseClinicMessageRow({
        id: "msg-2",
        clinic_code: "mehta4",
        patient_name: "Asha",
        sender: "admin",
        body: "Nope",
        sent_at: "2026-09-13T10:05:00.000Z",
      }),
    ).toBeNull();
  });
});

describe("applyChatHistoryClears", () => {
  it("drops messages at or before the latest clear for that patient", () => {
    const kept = applyChatHistoryClears(
      [
        {
          id: "old",
          clinicCode: "123",
          patientName: "Pranav",
          sender: "patient",
          body: "Hi sir",
          sentAt: "2026-09-13T04:00:00.000Z",
        },
        {
          id: "new",
          clinicCode: "123",
          patientName: "Pranav",
          sender: "patient",
          body: "After the wipe",
          sentAt: "2026-09-13T05:00:00.000Z",
        },
      ],
      [{ patientName: "pranav", clearedAt: "2026-09-13T04:30:00.000Z" }],
    );

    expect(kept.map((row) => row.id)).toEqual(["new"]);
  });
});

describe("mergeClinicInbox", () => {
  it("groups sessions and messages by patient, newest thread first", () => {
    const inbox = mergeClinicInbox(
      [
        {
          id: "session-1",
          date: "2026-09-12T10:00:00.000Z",
          planTitle: "Home plan",
          therapist: "Dr. Mehta",
          readiness: 3,
          durationMs: 120000,
          steps: [],
          patientName: "Asha",
          clinicCode: "mehta4",
        },
      ],
      [
        {
          id: "msg-old",
          clinicCode: "mehta4",
          patientName: "Asha",
          sender: "patient",
          body: "Earlier",
          sentAt: "2026-09-12T11:00:00.000Z",
        },
        {
          id: "msg-new",
          clinicCode: "mehta4",
          patientName: "Asha",
          sender: "therapist",
          body: "Go a little deeper.",
          sentAt: "2026-09-13T09:00:00.000Z",
        },
        {
          id: "msg-other",
          clinicCode: "mehta4",
          patientName: "Ravi",
          sender: "patient",
          body: "Starting today",
          sentAt: "2026-09-13T08:00:00.000Z",
        },
      ],
      ["Asha"],
    );

    expect(inbox.map((row) => row.patientName)).toEqual(["Asha", "Ravi"]);
    expect(inbox[0]?.sessionCount).toBe(1);
    expect(inbox[0]?.lastMessage?.body).toBe("Go a little deeper.");
    expect(inbox[1]?.sessionCount).toBe(0);
  });
});
