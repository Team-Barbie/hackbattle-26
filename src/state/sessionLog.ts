import { issueLabel } from "../coaching/feedback";
import { formatDuration, shortExerciseName } from "../content/exerciseMeta";
import {
  READINESS_LABELS,
  sessionReps,
  sessionTarget,
  type SessionRecord,
} from "./patientProfile";

const MESSAGE_MAX_LENGTH = 1000;

/** Plain-text session receipt sent to the therapist inbox. */
export function formatSessionLogMessage(
  patientName: string,
  clinicCode: string,
  record: SessionRecord,
): string {
  const name = patientName.trim() || "Patient";
  const code = clinicCode.trim() || "—";
  const lines = [
    "Session log",
    `Patient: ${name}`,
    `Code: ${code}`,
    `${record.planTitle || "Session"} · ${sessionReps(record)}/${sessionTarget(record)} reps · ${formatDuration(record.durationMs)}`,
  ];

  if (record.readiness !== null && READINESS_LABELS[record.readiness]) {
    lines.push(`Felt ${READINESS_LABELS[record.readiness].toLowerCase()}`);
  }

  if (record.earlyExitReason) {
    lines.push(`Stopped early: ${record.earlyExitReason}`);
  }

  for (const step of record.steps) {
    const label = step.exerciseName ?? shortExerciseName(step.exerciseId);
    const parts = [`${label} ${step.reps}/${step.targetReps}`];

    if (step.flaggedReps > 0) {
      parts.push(`${step.flaggedReps} flagged`);
    }

    if (step.mainIssue) {
      parts.push(issueLabel(step.mainIssue));
    }

    lines.push(parts.join(" · "));
  }

  return lines.join("\n").slice(0, MESSAGE_MAX_LENGTH);
}
