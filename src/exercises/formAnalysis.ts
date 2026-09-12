import type { ExerciseId } from "./exerciseCatalog";
import type { FormIssue } from "./formIssues";
import { analyzeSquatRep } from "./squat/squatForm";

export type RepSample = {
  deepestElevation: number | null;
  maxTorsoLean: number | null;
  peakMetric: number | null;
};

export function analyzeCompletedRep(exerciseId: ExerciseId, sample: RepSample): FormIssue[] {
  switch (exerciseId) {
    case "squat":
      return analyzeSquatRep({
        deepestElevation: sample.deepestElevation,
        maxTorsoLean: sample.maxTorsoLean,
      });
    case "shoulder-raise":
      return sample.peakMetric !== null && sample.peakMetric < 140
        ? [{ type: "SHALLOW_RAISE", severity: "warning" }]
        : [];
    case "lateral-raise":
      return sample.peakMetric !== null && sample.peakMetric < 75
        ? [{ type: "SHALLOW_LATERAL", severity: "warning" }]
        : [];
    case "bicep-curl":
      return sample.peakMetric !== null && sample.peakMetric > 80
        ? [{ type: "SHALLOW_CURL", severity: "warning" }]
        : [];
    case "knee-raise":
      return sample.peakMetric !== null && sample.peakMetric > 0.38
        ? [{ type: "SHALLOW_KNEE", severity: "warning" }]
        : [];
    default:
      return [];
  }
}
