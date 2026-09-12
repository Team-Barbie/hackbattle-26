import type { FormIssue } from "../formIssues";

/** Thigh elevation above this at the bottom of a counted rep is a shallow squat. */
export const SHALLOW_SQUAT_ELEVATION = 0.38;

/** Torso lean past this at the bottom is excessive forward lean. */
export const FORWARD_LEAN_DEGREES = 35;

export type SquatRepSample = {
  deepestElevation: number | null;
  maxTorsoLean: number | null;
};

/**
 * The detector returns structured issues only. Coaching copy lives elsewhere.
 */
export function analyzeSquatRep(sample: SquatRepSample): FormIssue[] {
  const issues: FormIssue[] = [];

  if (sample.deepestElevation !== null && sample.deepestElevation > SHALLOW_SQUAT_ELEVATION) {
    issues.push({ type: "SHALLOW_SQUAT", severity: "warning" });
  }

  if (sample.maxTorsoLean !== null && sample.maxTorsoLean > FORWARD_LEAN_DEGREES) {
    issues.push({ type: "FORWARD_LEAN", severity: "warning" });
  }

  return issues;
}
