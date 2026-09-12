import { isExerciseId } from "../exercises/exerciseCatalog";
import {
  DEFAULT_PRESCRIPTION,
  clonePrescription,
  type PlanStep,
  type Prescription,
} from "../exercises/prescription";

export type StoredPrescription = {
  plan: Prescription;
  /** ISO timestamp for when the therapist last published this plan. */
  publishedAt: string | null;
};

const STORAGE_KEY = "physioloop.prescription";

function sanitiseSteps(steps: unknown): PlanStep[] {
  if (!Array.isArray(steps)) {
    return [];
  }

  return steps.flatMap((step, index): PlanStep[] => {
    if (
      !step ||
      typeof step !== "object" ||
      typeof (step as PlanStep).exerciseId !== "string" ||
      !isExerciseId((step as PlanStep).exerciseId)
    ) {
      return [];
    }

    const reps = Number((step as PlanStep).targetReps);

    return [
      {
        id: typeof (step as PlanStep).id === "string" ? (step as PlanStep).id : `step-${index}`,
        exerciseId: (step as PlanStep).exerciseId,
        targetReps: Number.isFinite(reps) ? Math.min(50, Math.max(1, Math.round(reps))) : 8,
      },
    ];
  });
}

export function loadStoredPrescription(): StoredPrescription {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return { plan: clonePrescription(DEFAULT_PRESCRIPTION), publishedAt: null };
    }

    const parsed = JSON.parse(raw) as Partial<StoredPrescription>;
    const steps = sanitiseSteps(parsed.plan?.steps);

    if (steps.length === 0) {
      return { plan: clonePrescription(DEFAULT_PRESCRIPTION), publishedAt: null };
    }

    return {
      plan: {
        therapist: parsed.plan?.therapist?.trim() || DEFAULT_PRESCRIPTION.therapist,
        title: parsed.plan?.title?.trim() || DEFAULT_PRESCRIPTION.title,
        steps,
      },
      publishedAt: typeof parsed.publishedAt === "string" ? parsed.publishedAt : null,
    };
  } catch {
    return { plan: clonePrescription(DEFAULT_PRESCRIPTION), publishedAt: null };
  }
}

export function publishPrescription(plan: Prescription): StoredPrescription {
  const stored: StoredPrescription = {
    plan: {
      therapist: plan.therapist.trim() || "Therapist",
      title: plan.title.trim() || "Today's session",
      steps: plan.steps.length > 0 ? plan.steps : clonePrescription(DEFAULT_PRESCRIPTION).steps,
    },
    publishedAt: new Date().toISOString(),
  };

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
  } catch {
    // Still hand the plan to the running app even if it can't persist.
  }

  return stored;
}

export function resetPrescription(): StoredPrescription {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }

  return { plan: clonePrescription(DEFAULT_PRESCRIPTION), publishedAt: null };
}

export function totalPrescribedReps(plan: Prescription): number {
  return plan.steps.reduce((total, step) => total + step.targetReps, 0);
}
