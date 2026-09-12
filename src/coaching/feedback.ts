import type { FormIssue, FormIssueType } from "../exercises/formIssues";
import { ISSUE_LABELS } from "../exercises/formIssues";

export type Correction = {
  headline: string;
  detail: string;
};

const CORRECTIONS: Record<FormIssueType, Correction> = {
  SHALLOW_SQUAT: {
    headline: "Go slightly deeper",
    detail: "Sit back until your thighs are about parallel on the next rep.",
  },
  FORWARD_LEAN: {
    headline: "Chest up",
    detail: "Keep your chest slightly more upright as you sit back.",
  },
  SHALLOW_RAISE: {
    headline: "Reach higher",
    detail: "Lift a little further overhead without shrugging.",
  },
  SHALLOW_LATERAL: {
    headline: "Lift to shoulder height",
    detail: "Raise both arms out until they are level with your shoulders.",
  },
  SHALLOW_CURL: {
    headline: "Finish the curl",
    detail: "Bring your hands closer to your shoulders before lowering.",
  },
  SHALLOW_KNEE: {
    headline: "Lift the knee higher",
    detail: "Bring the thigh closer to hip height while staying tall.",
  },
};

export function correctionFor(issue: FormIssue | FormIssueType): Correction {
  const type = typeof issue === "string" ? issue : issue.type;
  return CORRECTIONS[type];
}

export function issueLabel(issue: FormIssue | FormIssueType): string {
  const type = typeof issue === "string" ? issue : issue.type;
  return ISSUE_LABELS[type];
}
