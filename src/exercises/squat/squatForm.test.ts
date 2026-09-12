import { describe, expect, it } from "vitest";
import { rankIssues } from "../../coaching/issueRanking";
import { analyzeSquatRep } from "./squatForm";

describe("analyzeSquatRep", () => {
  it("returns no issues for a deep upright squat", () => {
    expect(analyzeSquatRep({ deepestElevation: 0.22, maxTorsoLean: 18 })).toEqual([]);
  });

  it("flags a shallow squat", () => {
    const issues = analyzeSquatRep({ deepestElevation: 0.5, maxTorsoLean: 12 });
    expect(issues.map((issue) => issue.type)).toContain("SHALLOW_SQUAT");
  });

  it("flags forward lean", () => {
    const issues = analyzeSquatRep({ deepestElevation: 0.2, maxTorsoLean: 42 });
    expect(issues.map((issue) => issue.type)).toContain("FORWARD_LEAN");
  });

  it("ranks forward lean above shallow squat", () => {
    const issues = analyzeSquatRep({ deepestElevation: 0.5, maxTorsoLean: 40 });
    expect(rankIssues(issues)?.type).toBe("FORWARD_LEAN");
  });
});
