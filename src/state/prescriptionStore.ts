import { isExerciseId } from "../exercises/exerciseCatalog";
import { parseReferenceExercise } from "../exercises/custom/referenceExercise";
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
const SHARE_PARAM = "plan";

function sanitiseAccessCode(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed.slice(0, 32) : undefined;
}

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

    const exerciseId = (step as PlanStep).exerciseId;
    const referenceExercise = parseReferenceExercise((step as PlanStep).referenceExercise);

    if (exerciseId === "custom" && !referenceExercise) {
      return [];
    }

    return [
      {
        id: typeof (step as PlanStep).id === "string" ? (step as PlanStep).id : `step-${index}`,
        exerciseId,
        targetReps: Number.isFinite(reps) ? Math.min(50, Math.max(1, Math.round(reps))) : 8,
        ...(referenceExercise ? { referenceExercise } : {}),
      },
    ];
  });
}

export function sanitisePrescription(plan: Partial<Prescription> | undefined): Prescription | null {
  const steps = sanitiseSteps(plan?.steps);

  if (steps.length === 0) {
    return null;
  }

  return {
    therapist: plan?.therapist?.trim() || DEFAULT_PRESCRIPTION.therapist,
    title: plan?.title?.trim() || DEFAULT_PRESCRIPTION.title,
    steps,
    accessCode: sanitiseAccessCode(plan?.accessCode),
  };
}

export function loadStoredPrescription(): StoredPrescription {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return { plan: clonePrescription(DEFAULT_PRESCRIPTION), publishedAt: null };
    }

    const parsed = JSON.parse(raw) as Partial<StoredPrescription>;
    const plan = sanitisePrescription(parsed.plan);

    if (!plan) {
      return { plan: clonePrescription(DEFAULT_PRESCRIPTION), publishedAt: null };
    }

    return {
      plan,
      publishedAt: typeof parsed.publishedAt === "string" ? parsed.publishedAt : null,
    };
  } catch {
    return { plan: clonePrescription(DEFAULT_PRESCRIPTION), publishedAt: null };
  }
}

export function saveStoredPrescription(stored: StoredPrescription): StoredPrescription {
  const sanitised = sanitisePrescription(stored.plan) ?? clonePrescription(DEFAULT_PRESCRIPTION);
  const next: StoredPrescription = {
    plan: sanitised,
    publishedAt: stored.publishedAt,
  };

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Still hand the plan to the running app even if it can't persist.
  }

  return next;
}

export function publishPrescription(plan: Prescription): StoredPrescription {
  return saveStoredPrescription({
    plan,
    publishedAt: new Date().toISOString(),
  });
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

export function encodeSharedPlan(plan: Prescription): string {
  const payload = JSON.stringify({ v: 1, plan: sanitisePrescription(plan) ?? plan });
  return btoa(unescape(encodeURIComponent(payload)));
}

export function decodeSharedPlan(raw: string): Prescription | null {
  try {
    const parsed = JSON.parse(decodeURIComponent(escape(atob(raw)))) as {
      v?: number;
      plan?: Partial<Prescription>;
    };
    return sanitisePrescription(parsed.plan);
  } catch {
    return null;
  }
}

export function sharedPlanUrl(plan: Prescription, origin = window.location.origin): string {
  const url = new URL(window.location.pathname, origin);
  url.searchParams.set(SHARE_PARAM, encodeSharedPlan(plan));
  return url.toString();
}

/** Import a plan from `?plan=` and strip the param so a refresh does not re-import. */
export function consumeSharedPlanFromUrl(): StoredPrescription | null {
  if (typeof window === "undefined") {
    return null;
  }

  const params = new URLSearchParams(window.location.search);
  const raw = params.get(SHARE_PARAM);

  if (!raw) {
    return null;
  }

  const plan = decodeSharedPlan(raw);

  if (!plan) {
    return null;
  }

  const stored = publishPrescription(plan);
  params.delete(SHARE_PARAM);
  const next = `${window.location.pathname}${params.toString() ? `?${params}` : ""}${window.location.hash}`;
  window.history.replaceState({}, "", next);
  return stored;
}
