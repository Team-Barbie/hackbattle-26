import type { FormIssue, FormIssueType } from "../exercises/formIssues";

const PRIORITY: readonly FormIssueType[] = [
  "FORWARD_LEAN",
  "SHALLOW_SQUAT",
  "SHALLOW_RAISE",
  "SHALLOW_LATERAL",
  "SHALLOW_CURL",
  "SHALLOW_KNEE",
];

/** One correction at a time — the highest-priority detected issue. */
export function rankIssues(issues: FormIssue[]): FormIssue | null {
  if (issues.length === 0) {
    return null;
  }

  return [...issues].sort((a, b) => PRIORITY.indexOf(a.type) - PRIORITY.indexOf(b.type))[0] ?? null;
}

export function mostCommonIssue(counts: Partial<Record<FormIssueType, number>>): FormIssueType | null {
  let best: FormIssueType | null = null;
  let bestCount = 0;

  for (const type of PRIORITY) {
    const count = counts[type] ?? 0;

    if (count > bestCount) {
      best = type;
      bestCount = count;
    }
  }

  return best;
}
