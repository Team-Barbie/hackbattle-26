export type FormIssueType =
  | "SHALLOW_SQUAT"
  | "FORWARD_LEAN"
  | "SHALLOW_RAISE"
  | "SHALLOW_LATERAL"
  | "SHALLOW_CURL"
  | "SHALLOW_KNEE";

export type FormIssueSeverity = "warning" | "error";

export type FormIssue = {
  type: FormIssueType;
  severity: FormIssueSeverity;
};

export const ISSUE_LABELS: Record<FormIssueType, string> = {
  SHALLOW_SQUAT: "Shallow squat",
  FORWARD_LEAN: "Forward lean",
  SHALLOW_RAISE: "Limited overhead range",
  SHALLOW_LATERAL: "Limited arm lift",
  SHALLOW_CURL: "Incomplete curl",
  SHALLOW_KNEE: "Low knee lift",
};
