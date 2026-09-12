import { EXERCISES, type ExerciseId } from "./exerciseCatalog";

export type PlanStep = {
  id: string;
  exerciseId: ExerciseId;
  targetReps: number;
};

export type Prescription = {
  therapist: string;
  title: string;
  steps: PlanStep[];
  /** Optional clinic code. When set, patient sign-in must match it. */
  accessCode?: string;
};

export type StepStatus = "done" | "now" | "queued";

export const DEFAULT_PRESCRIPTION: Prescription = {
  therapist: "Dr. Mehta",
  title: "Today's session",
  steps: [
    { id: "step-squat", exerciseId: "squat", targetReps: 10 },
    { id: "step-knee", exerciseId: "knee-raise", targetReps: 8 },
    { id: "step-lateral", exerciseId: "lateral-raise", targetReps: 8 },
    { id: "step-curl", exerciseId: "bicep-curl", targetReps: 8 },
  ],
};

export function createPlanStep(exerciseId: ExerciseId = EXERCISES[0].id, targetReps = 8): PlanStep {
  return {
    id: `step-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    exerciseId,
    targetReps,
  };
}

export function clonePrescription(plan: Prescription): Prescription {
  return {
    ...plan,
    accessCode: plan.accessCode,
    steps: plan.steps.map((step) => ({ ...step })),
  };
}

export function codesMatch(expected: string | undefined, given: string): boolean {
  const want = expected?.trim();

  if (!want) {
    return true;
  }

  return want.toLowerCase() === given.trim().toLowerCase();
}

export function stepStatus(
  index: number,
  stepIndex: number,
  lastStepDone: boolean,
): StepStatus {
  if (index < stepIndex) {
    return "done";
  }

  if (index === stepIndex) {
    return lastStepDone ? "done" : "now";
  }

  return "queued";
}
